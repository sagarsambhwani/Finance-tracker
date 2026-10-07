import { Hono } from 'hono'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { categories, transactions, currencies } from '../db/schema'
import { getAuthUser } from './auth'

const router = new Hono()

router.use('*', async (c, next) => {
    const user = await getAuthUser(c)
    if (!user) return c.json({ message: 'Unauthorized' }, 401)
    await next()
})

// List categories
router.get('/', async (c) => {
    const type = c.req.query('type')
    const conditions = []
    if (type) conditions.push(eq(categories.type, type as any))

    const list = await db.select().from(categories).where(conditions.length > 0 ? and(...conditions) : undefined)
    return c.json({ data: list })
})

// Categories Summary by type
router.get('/summary', async (c) => {
    const type = c.req.query('type') || 'expense'
    const baseCurr = (await db.select().from(currencies).where(eq(currencies.isBase, true)))[0] || { symbol: '€' }

    const cats = await db.select().from(categories).where(eq(categories.type, type as any))
    const txs = await db.select().from(transactions).where(eq(transactions.type, type as any))

    const totalsByCat = new Map<number, number>()
    for (const t of txs) {
        if (t.categoryId) {
            totalsByCat.set(t.categoryId, (totalsByCat.get(t.categoryId) || 0) + Number(t.amount))
        }
    }

    let total = 0
    const data = cats.map(cat => {
        const amt = totalsByCat.get(cat.id) || 0
        total += amt
        return {
            ...cat,
            total_amount: amt,
            currency: baseCurr.symbol,
        }
    })

    return c.json({
        data,
        total,
        currency: baseCurr.symbol,
    })
})

// Category statistics
router.get('/:id/statistics', async (c) => {
    const id = Number(c.req.param('id'))
    const cat = (await db.select().from(categories).where(eq(categories.id, id)))[0]
    if (!cat) return c.json({ message: 'Category not found' }, 404)

    const catTx = await db.select().from(transactions).where(eq(transactions.categoryId, id))
    const totalAmount = catTx.reduce((sum, t) => sum + Number(t.amount), 0)

    return c.json({
        category_id: cat.id,
        category_name: cat.name,
        type: cat.type,
        transactions_count: catTx.length,
        total_amount: totalAmount,
    })
})

// Get category by ID
router.get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const category = (await db.select().from(categories).where(eq(categories.id, id)))[0]
    if (!category) return c.json({ message: 'Category not found' }, 404)
    return c.json(category)
})

// Create category
router.post('/', async (c) => {
    const body = await c.req.json()
    const now = new Date().toISOString()

    const [category] = await db.insert(categories).values({
        name: body.name,
        type: body.type || 'expense',
        icon: body.icon || 'tag',
        color: body.color || '#64748b',
        parentId: body.parent_id ? Number(body.parent_id) : null,
        createdAt: now,
        updatedAt: now,
    }).returning()

    return c.json(category, 201)
})

// Update category (PUT and PATCH)
const handleUpdate = async (c: any) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const now = new Date().toISOString()

    const updateData: any = { updatedAt: now }
    if (body.name !== undefined) updateData.name = body.name
    if (body.type !== undefined) updateData.type = body.type
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.color !== undefined) updateData.color = body.color
    if (body.parent_id !== undefined) updateData.parentId = body.parent_id ? Number(body.parent_id) : null

    const [updated] = await db.update(categories).set(updateData).where(eq(categories.id, id)).returning()
    if (!updated) return c.json({ message: 'Category not found' }, 404)

    return c.json(updated)
}

router.put('/:id', handleUpdate)
router.patch('/:id', handleUpdate)

// Delete category
router.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await db.delete(categories).where(eq(categories.id, id))
    return c.json({ message: 'Category deleted' })
})

export default router
