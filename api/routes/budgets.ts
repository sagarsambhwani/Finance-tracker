import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { budgets, categories } from '../db/schema'
import { getAuthUser } from './auth'

const router = new Hono()

router.use('*', async (c, next) => {
    const user = await getAuthUser(c)
    if (!user) return c.json({ message: 'Unauthorized' }, 401)
    await next()
})

// List budgets
router.get('/', async (c) => {
    const list = await db.select({
        id: budgets.id,
        category_id: budgets.categoryId,
        amount: budgets.amount,
        period: budgets.period,
        category: categories,
    }).from(budgets).leftJoin(categories, eq(budgets.categoryId, categories.id))

    return c.json({ data: list })
})

// Get budget by ID
router.get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const list = await db.select({
        id: budgets.id,
        category_id: budgets.categoryId,
        amount: budgets.amount,
        period: budgets.period,
        category: categories,
    }).from(budgets).leftJoin(categories, eq(budgets.categoryId, categories.id)).where(eq(budgets.id, id))

    if (list.length === 0) return c.json({ message: 'Budget not found' }, 404)
    return c.json(list[0])
})

// Create budget
router.post('/', async (c) => {
    const body = await c.req.json()
    const now = new Date().toISOString()

    const [budget] = await db.insert(budgets).values({
        categoryId: Number(body.category_id),
        amount: Number(body.amount),
        period: body.period || 'monthly',
        createdAt: now,
        updatedAt: now,
    }).returning()

    return c.json(budget, 201)
})

// Update budget (PUT and PATCH)
const handleUpdate = async (c: any) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const now = new Date().toISOString()

    const [updated] = await db.update(budgets).set({
        categoryId: body.category_id ? Number(body.category_id) : undefined,
        amount: body.amount !== undefined ? Number(body.amount) : undefined,
        period: body.period,
        updatedAt: now,
    }).where(eq(budgets.id, id)).returning()

    if (!updated) return c.json({ message: 'Budget not found' }, 404)
    return c.json(updated)
}

router.put('/:id', handleUpdate)
router.patch('/:id', handleUpdate)

// Delete budget
router.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await db.delete(budgets).where(eq(budgets.id, id))
    return c.json({ message: 'Budget deleted' })
})

export default router
