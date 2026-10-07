import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { budgets, categories, currencies, transactions } from '../db/schema'
import { getAuthUser } from './auth'

const router = new Hono()

router.use('*', async (c, next) => {
    const user = await getAuthUser(c)
    if (!user) return c.json({ message: 'Unauthorized' }, 401)
    await next()
})

// List budgets
router.get('/', async (c) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const list = await db.select({
        id: budgets.id,
        category_id: budgets.categoryId,
        currency_id: budgets.currencyId,
        amount: budgets.amount,
        period: budgets.period,
        category: categories,
        currency: currencies,
    })
    .from(budgets)
    .leftJoin(categories, eq(budgets.categoryId, categories.id))
    .leftJoin(currencies, eq(budgets.currencyId, currencies.id))

    const allExpenses = await db.select().from(transactions).where(eq(transactions.type, 'expense'))

    const mapped = list.map(b => {
        const amt = Number(b.amount)
        const spent = allExpenses
            .filter(t => t.categoryId === b.category_id && t.date >= startOfMonth && t.date <= endOfMonth)
            .reduce((sum, t) => sum + Number(t.amount), 0)

        const currency = b.currency || { id: 1, code: 'EUR', symbol: '€', decimals: 2 }
        const progress = {
            spent,
            remaining: Math.max(0, amt - spent),
            percent: amt > 0 ? (spent / amt) * 100 : 0,
            period_start: startOfMonth,
            period_end: endOfMonth,
            is_exceeded: spent > amt,
        }

        return {
            id: b.id,
            name: b.category?.name || 'Budget',
            amount: amt,
            currencyId: b.currency_id,
            currency,
            period: b.period || 'monthly',
            periodLabel: b.period === 'yearly' ? 'Yearly' : 'Monthly',
            startDate: startOfMonth,
            endDate: endOfMonth,
            isGlobal: false,
            notifyAtPercent: 80,
            isActive: true,
            categories: b.category ? [b.category] : [],
            tags: [],
            progress,
            // snake_case aliases
            category_id: b.category_id,
            currency_id: b.currency_id,
            is_global: false,
            is_active: true,
            category: b.category,
        }
    })

    return c.json({ data: mapped })
})

// Get budget by ID
router.get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const list = await db.select({
        id: budgets.id,
        category_id: budgets.categoryId,
        currency_id: budgets.currencyId,
        amount: budgets.amount,
        period: budgets.period,
        category: categories,
        currency: currencies,
    })
    .from(budgets)
    .leftJoin(categories, eq(budgets.categoryId, categories.id))
    .leftJoin(currencies, eq(budgets.currencyId, currencies.id))
    .where(eq(budgets.id, id))

    if (list.length === 0) return c.json({ message: 'Budget not found' }, 404)
    const b = list[0]
    const amt = Number(b.amount)
    return c.json({
        id: b.id,
        name: b.category?.name || 'Budget',
        amount: amt,
        currencyId: b.currency_id,
        currency: b.currency || { id: 1, code: 'EUR', symbol: '€', decimals: 2 },
        period: b.period,
        periodLabel: b.period === 'yearly' ? 'Yearly' : 'Monthly',
        isGlobal: false,
        isActive: true,
        categories: b.category ? [b.category] : [],
        tags: [],
        category_id: b.category_id,
        category: b.category,
    })
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
