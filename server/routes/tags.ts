import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { tags } from '../db/schema'
import { getAuthUser } from './auth'

const router = new Hono()

router.use('*', async (c, next) => {
    const user = await getAuthUser(c)
    if (!user) return c.json({ message: 'Unauthorized' }, 401)
    await next()
})

// List tags
router.get('/', async (c) => {
    const list = await db.select().from(tags)
    return c.json({ data: list })
})

// Get tag by ID
router.get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const tag = (await db.select().from(tags).where(eq(tags.id, id)))[0]
    if (!tag) return c.json({ message: 'Tag not found' }, 404)
    return c.json(tag)
})

// Create tag
router.post('/', async (c) => {
    const { name } = await c.req.json()
    const cleanName = name.trim().toLowerCase()
    const existing = (await db.select().from(tags).where(eq(tags.name, cleanName)))[0]
    if (existing) {
        return c.json(existing, 200)
    }

    const now = new Date().toISOString()
    const [tag] = await db.insert(tags).values({
        name: cleanName,
        createdAt: now,
        updatedAt: now,
    }).returning()

    return c.json(tag, 201)
})

// Update tag (PUT and PATCH)
const handleUpdate = async (c: any) => {
    const id = Number(c.req.param('id'))
    const { name } = await c.req.json()
    const [updated] = await db.update(tags)
        .set({ name: name.trim().toLowerCase(), updatedAt: new Date().toISOString() })
        .where(eq(tags.id, id))
        .returning()

    if (!updated) return c.json({ message: 'Tag not found' }, 404)
    return c.json(updated)
}

router.put('/:id', handleUpdate)
router.patch('/:id', handleUpdate)

// Delete tag
router.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await db.delete(tags).where(eq(tags.id, id))
    return c.json({ message: 'Tag deleted' })
})

export default router
