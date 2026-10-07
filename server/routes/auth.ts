import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from '../db/client'
import { users, authSessions } from '../db/schema'

const auth = new Hono()
const COOKIE_NAME = 'svy_session'

// Middleware to get current user
export async function getAuthUser(c: any) {
    const token = getCookie(c, COOKIE_NAME) || c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) return null

    const session = await db.query.authSessions?.findFirst({
        where: eq(authSessions.token, token),
    }) || (await db.select().from(authSessions).where(eq(authSessions.token, token)))[0]

    if (!session) return null

    const user = (await db.select().from(users).where(eq(users.id, session.userId)))[0]
    return user || null
}

// Check system status
auth.get('/status', async (c) => {
    const allUsers = await db.select().from(users).limit(1)
    return c.json({
        needs_registration: allUsers.length === 0,
        password_login_enabled: true,
    })
})

// Register initial user (Admin)
auth.post('/register', async (c) => {
    const countUsers = await db.select().from(users).limit(1)
    if (countUsers.length > 0) {
        return c.json({ message: 'Registration is closed. Please ask your administrator for an account.' }, 403)
    }

    const { name, email, password } = await c.req.json()
    if (!name || !email || !password || password.length < 6) {
        return c.json({ message: 'Valid name, email, and password (min 6 chars) are required.' }, 400)
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const now = new Date().toISOString()

    const [newUser] = await db.insert(users).values({
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
    }).returning()

    // Issue session
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await db.insert(authSessions).values({
        userId: newUser.id,
        token,
        lastUsedAt: now,
        expiresAt,
        createdAt: now,
        updatedAt: now,
    })

    setCookie(c, COOKIE_NAME, token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60,
        sameSite: 'Lax',
    })

    return c.json({
        user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
        },
    }, 201)
})

// Login
auth.post('/login', async (c) => {
    const { email, password } = await c.req.json()
    if (!email || !password) {
        return c.json({ message: 'Email and password are required.' }, 400)
    }

    const user = (await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())))[0]
    if (!user) {
        return c.json({ message: 'Invalid credentials.' }, 401)
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
        return c.json({ message: 'Invalid credentials.' }, 401)
    }

    const token = crypto.randomBytes(32).toString('hex')
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await db.insert(authSessions).values({
        userId: user.id,
        token,
        lastUsedAt: now,
        expiresAt,
        createdAt: now,
        updatedAt: now,
    })

    setCookie(c, COOKIE_NAME, token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60,
        sameSite: 'Lax',
    })

    return c.json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
    })
})

// Current user profile
auth.get('/me', async (c) => {
    const user = await getAuthUser(c)
    if (!user) {
        return c.json({ user: null })
    }

    return c.json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
    })
})

// Logout
auth.post('/logout', async (c) => {
    const token = getCookie(c, COOKIE_NAME)
    if (token) {
        await db.delete(authSessions).where(eq(authSessions.token, token))
    }
    deleteCookie(c, COOKIE_NAME, { path: '/' })
    return c.json({ message: 'Logged out.' })
})

// 2FA status
auth.get('/2fa/status', (c) => {
    return c.json({ enabled: false })
})

// WebAuthn credentials
auth.get('/webauthn/credentials', (c) => {
    return c.json({ credentials: [] })
})

// WebAuthn login options (for passkey sign-in / conditional autofill)
auth.post('/webauthn/login/options', async (c) => {
    const host = c.req.header('host')?.split(':')[0] || 'localhost'
    const challenge = crypto.randomBytes(32).toString('base64url')
    const token = crypto.randomBytes(32).toString('hex')
    return c.json({
        token,
        options: {
            challenge,
            timeout: 60000,
            rpId: host,
            allowCredentials: [],
            userVerification: 'preferred',
        },
    })
})

// WebAuthn registration options (for passkey setup)
auth.post('/webauthn/register/options', async (c) => {
    const user = await getAuthUser(c)
    if (!user) return c.json({ message: 'Unauthorized' }, 401)
    const host = c.req.header('host')?.split(':')[0] || 'localhost'
    const challenge = crypto.randomBytes(32).toString('base64url')
    const token = crypto.randomBytes(32).toString('hex')
    return c.json({
        token,
        options: {
            challenge,
            rp: { name: 'Savvy Finance Tracker', id: host },
            user: {
                id: Buffer.from(String(user.id)).toString('base64url'),
                name: user.email,
                displayName: user.name,
            },
            pubKeyCredParams: [
                { alg: -7, type: 'public-key' },
                { alg: -257, type: 'public-key' },
            ],
            timeout: 60000,
            attestation: 'none',
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
        },
    })
})

auth.post('/webauthn/login/verify', async (c) => {
    return c.json({ message: 'No registered passkeys found for this device.' }, 400)
})

auth.post('/webauthn/register/verify', async (c) => {
    return c.json({ message: 'Passkey registration requires origin credentials.' }, 400)
})

auth.patch('/webauthn/credentials/:id', (c) => c.json({ message: 'Updated' }))
auth.delete('/webauthn/credentials/:id', (c) => c.json({ message: 'Deleted' }))

// SSO providers
auth.get('/sso/providers', (c) => {
    return c.json([])
})

// SSO presets
auth.get('/sso/presets', (c) => {
    return c.json([])
})

export default auth
