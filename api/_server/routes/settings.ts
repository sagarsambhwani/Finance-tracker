import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { settings } from '../db/schema'
import { getAuthUser } from './auth'

const router = new Hono()

router.use('*', async (c, next) => {
    const user = await getAuthUser(c)
    if (!user) return c.json({ message: 'Unauthorized' }, 401)
    await next()
})

const DEFAULT_SETTINGS: Record<string, any> = {
    auto_update_currencies: false,
    sso_allow_signup: false,
    password_login_enabled: true,
    sso_require_verified_email: true,
    timezone: 'UTC',
}

// Get all settings
router.get('/', async (c) => {
    const rows = await db.select().from(settings)
    const current = { ...DEFAULT_SETTINGS }
    for (const r of rows) {
        try {
            current[r.key] = JSON.parse(r.value || 'null')
        } catch {
            current[r.key] = r.value
        }
    }
    return c.json(current)
})

// Update settings
router.patch('/', async (c) => {
    const body = await c.req.json()

    for (const [key, value] of Object.entries(body)) {
        const valStr = JSON.stringify(value)
        const existing = (await db.select().from(settings).where(eq(settings.key, key)))[0]
        if (existing) {
            await db.update(settings).set({ value: valStr }).where(eq(settings.key, key))
        } else {
            await db.insert(settings).values({ key, value: valStr })
        }
    }

    const rows = await db.select().from(settings)
    const current = { ...DEFAULT_SETTINGS }
    for (const r of rows) {
        try {
            current[r.key] = JSON.parse(r.value || 'null')
        } catch {
            current[r.key] = r.value
        }
    }

    return c.json(current)
})

export default router
