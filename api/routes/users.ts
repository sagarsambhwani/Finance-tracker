import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '../db/client'
import { users } from '../db/schema'
import { getAuthUser } from './auth'

type Variables = {
    currentUser: any
}

const router = new Hono<{ Variables: Variables }>()

router.use('*', async (c, next) => {
    const user = await getAuthUser(c)
    if (!user) return c.json({ message: 'Unauthorized' }, 401)
    c.set('currentUser', user)
    await next()
})

// List all users (available to all logged in users)
router.get('/', async (c) => {
    const list = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
    }).from(users)

    return c.json({ data: list })
})

// Get user by ID
router.get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const list = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
    }).from(users).where(eq(users.id, id))

    if (list.length === 0) return c.json({ message: 'User not found' }, 404)
    return c.json(list[0])
})

// Admin check middleware for mutations
const requireAdmin = async (c: any, next: any) => {
    const currentUser = c.get('currentUser') as any
    if (currentUser.role !== 'admin') {
        return c.json({ message: 'Forbidden. Admin role required.' }, 403)
    }
    await next()
}

// Create user (Admin only)
router.post('/', requireAdmin, async (c) => {
    const body = await c.req.json()
    const { name, email, password, role } = body

    if (!name || !email || !password || password.length < 6) {
        return c.json({ message: 'Name, email, and password (min 6 chars) are required.' }, 400)
    }

    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1)
    if (existing.length > 0) {
        return c.json({ message: 'Email is already registered.' }, 400)
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const now = new Date().toISOString()

    const [newUser] = await db.insert(users).values({
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role || 'read-write',
        createdAt: now,
        updatedAt: now,
    }).returning()

    return c.json({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
    }, 201)
})

// Update user (Admin only)
const handleUpdate = async (c: any) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const now = new Date().toISOString()

    const updateData: any = { updatedAt: now }
    if (body.name) updateData.name = body.name
    if (body.role) updateData.role = body.role
    if (body.password && body.password.length >= 6) {
        updateData.password = await bcrypt.hash(body.password, 10)
    }

    const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning()
    if (!updated) return c.json({ message: 'User not found' }, 404)

    return c.json({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
    })
}

router.put('/:id', requireAdmin, handleUpdate)
router.patch('/:id', requireAdmin, handleUpdate)

// Delete user (Admin only)
router.delete('/:id', requireAdmin, async (c) => {
    const id = Number(c.req.param('id'))
    const currentUser = c.get('currentUser') as any

    if (currentUser.id === id) {
        return c.json({ message: 'You cannot delete your own account.' }, 400)
    }

    await db.delete(users).where(eq(users.id, id))
    return c.json({ message: 'User deleted.' })
})

export default router
