import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db/client'
import { recurringTransactions, accounts, categories } from '../db/schema'
import { getAuthUser } from './auth'

const router = new Hono()

router.use('*', async (c, next) => {
    const user = await getAuthUser(c)
    if (!user) return c.json({ message: 'Unauthorized' }, 401)
    await next()
})

function calculateNextDate(startDate: string, frequency: string, interval = 1): string {
    const d = new Date(startDate)
    if (frequency === 'daily') d.setDate(d.getDate() + interval)
    else if (frequency === 'weekly') d.setDate(d.getDate() + (7 * interval))
    else if (frequency === 'monthly') d.setMonth(d.getMonth() + interval)
    else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + interval)
    return d.toISOString().split('T')[0]
}

// List recurring transactions
router.get('/', async (c) => {
    const list = await db.select({
        id: recurringTransactions.id,
        type: recurringTransactions.type,
        amount: recurringTransactions.amount,
        to_amount: recurringTransactions.toAmount,
        description: recurringTransactions.description,
        frequency: recurringTransactions.frequency,
        interval: recurringTransactions.interval,
        next_run_date: recurringTransactions.nextRunDate,
        is_active: recurringTransactions.isActive,
        account_id: recurringTransactions.accountId,
        to_account_id: recurringTransactions.toAccountId,
        category_id: recurringTransactions.categoryId,
        account: accounts,
        category: categories,
    })
    .from(recurringTransactions)
    .leftJoin(accounts, eq(recurringTransactions.accountId, accounts.id))
    .leftJoin(categories, eq(recurringTransactions.categoryId, categories.id))
    .orderBy(desc(recurringTransactions.id))

    return c.json({ data: list })
})

// Upcoming projections for next 30 days
router.get('/upcoming', async (c) => {
    const list = await db.select({
        id: recurringTransactions.id,
        type: recurringTransactions.type,
        amount: recurringTransactions.amount,
        description: recurringTransactions.description,
        next_run_date: recurringTransactions.nextRunDate,
        frequency: recurringTransactions.frequency,
        account: accounts,
        category: categories,
    })
    .from(recurringTransactions)
    .leftJoin(accounts, eq(recurringTransactions.accountId, accounts.id))
    .leftJoin(categories, eq(recurringTransactions.categoryId, categories.id))
    .where(eq(recurringTransactions.isActive, true))

    return c.json({ data: list })
})

// Get recurring by ID
router.get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const list = await db.select({
        id: recurringTransactions.id,
        type: recurringTransactions.type,
        amount: recurringTransactions.amount,
        to_amount: recurringTransactions.toAmount,
        description: recurringTransactions.description,
        frequency: recurringTransactions.frequency,
        interval: recurringTransactions.interval,
        next_run_date: recurringTransactions.nextRunDate,
        is_active: recurringTransactions.isActive,
        account_id: recurringTransactions.accountId,
        to_account_id: recurringTransactions.toAccountId,
        category_id: recurringTransactions.categoryId,
        account: accounts,
        category: categories,
    })
    .from(recurringTransactions)
    .leftJoin(accounts, eq(recurringTransactions.accountId, accounts.id))
    .leftJoin(categories, eq(recurringTransactions.categoryId, categories.id))
    .where(eq(recurringTransactions.id, id))

    if (list.length === 0) return c.json({ message: 'Recurring transaction not found' }, 404)
    return c.json(list[0])
})

// Create recurring transaction
router.post('/', async (c) => {
    const body = await c.req.json()
    const now = new Date().toISOString()
    const startDate = body.start_date || now.split('T')[0]

    const [created] = await db.insert(recurringTransactions).values({
        type: body.type,
        accountId: Number(body.account_id),
        toAccountId: body.to_account_id ? Number(body.to_account_id) : null,
        categoryId: body.category_id ? Number(body.category_id) : null,
        amount: Number(body.amount),
        toAmount: body.to_amount ? Number(body.to_amount) : null,
        description: body.description || '',
        frequency: body.frequency || 'monthly',
        interval: Number(body.interval || 1),
        startDate,
        nextRunDate: startDate,
        isActive: true,
        createdAt: now,
        updatedAt: now,
    }).returning()

    return c.json(created, 201)
})

// Update recurring transaction (PUT and PATCH)
const handleUpdate = async (c: any) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const now = new Date().toISOString()

    const updateData: any = { updatedAt: now }
    if (body.type !== undefined) updateData.type = body.type
    if (body.account_id !== undefined) updateData.accountId = Number(body.account_id)
    if (body.to_account_id !== undefined) updateData.toAccountId = body.to_account_id ? Number(body.to_account_id) : null
    if (body.category_id !== undefined) updateData.categoryId = body.category_id ? Number(body.category_id) : null
    if (body.amount !== undefined) updateData.amount = Number(body.amount)
    if (body.to_amount !== undefined) updateData.toAmount = body.to_amount ? Number(body.to_amount) : null
    if (body.description !== undefined) updateData.description = body.description
    if (body.frequency !== undefined) updateData.frequency = body.frequency
    if (body.interval !== undefined) updateData.interval = Number(body.interval)
    if (body.is_active !== undefined) updateData.isActive = Boolean(body.is_active)

    const [updated] = await db.update(recurringTransactions).set(updateData).where(eq(recurringTransactions.id, id)).returning()
    if (!updated) return c.json({ message: 'Recurring transaction not found' }, 404)

    return c.json(updated)
}

router.put('/:id', handleUpdate)
router.patch('/:id', handleUpdate)

// Skip next occurrence
router.post('/:id/skip', async (c) => {
    const id = Number(c.req.param('id'))
    const item = (await db.select().from(recurringTransactions).where(eq(recurringTransactions.id, id)))[0]
    if (!item) return c.json({ message: 'Recurring transaction not found' }, 404)

    const nextDate = calculateNextDate(item.nextRunDate, item.frequency, item.interval)
    const [updated] = await db.update(recurringTransactions)
        .set({ nextRunDate: nextDate, updatedAt: new Date().toISOString() })
        .where(eq(recurringTransactions.id, id))
        .returning()

    return c.json(updated)
})

// Delete
router.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await db.delete(recurringTransactions).where(eq(recurringTransactions.id, id))
    return c.json({ message: 'Recurring transaction deleted' })
})

export default router
