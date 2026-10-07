import { Hono } from 'hono'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { accounts, transactions, currencies } from '../db/schema'
import { getAuthUser } from './auth'

const router = new Hono()

router.use('*', async (c, next) => {
    const user = await getAuthUser(c)
    if (!user) return c.json({ message: 'Unauthorized' }, 401)
    await next()
})

async function getDebtsSummary() {
    const debts = await db.select().from(accounts).where(and(eq(accounts.type, 'debt'), eq(accounts.isPaidOff, false)))
    const baseCurr = (await db.select().from(currencies).where(eq(currencies.isBase, true)))[0] || { symbol: '€', decimals: 2 }

    let totalIOwe = 0
    let totalOwedToMe = 0

    for (const d of debts) {
        const remaining = (Number(d.targetAmount) || 0) - (Number(d.initialBalance) || 0)
        if (d.debtType === 'i_owe') totalIOwe += remaining
        if (d.debtType === 'owed_to_me') totalOwedToMe += remaining
    }

    return {
        total_i_owe: totalIOwe,
        total_owed_to_me: totalOwedToMe,
        net_debt: totalOwedToMe - totalIOwe,
        debts_count: debts.length,
        currency: baseCurr.symbol,
        decimals: baseCurr.decimals,
    }
}

function mapDebt(d: any) {
    const target = Number(d.target_amount ?? d.targetAmount) || 0
    const current = Number(d.current_balance ?? d.initialBalance) || 0
    const remaining = Math.max(0, target - current)
    const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0

    return {
        id: d.id,
        name: d.name,
        type: 'debt',
        debtType: d.debt_type ?? d.debtType,
        debt_type: d.debt_type ?? d.debtType,
        currencyId: d.currency_id ?? d.currencyId,
        currency_id: d.currency_id ?? d.currencyId,
        targetAmount: target,
        target_amount: target,
        currentBalance: current,
        current_balance: current,
        remainingDebt: remaining,
        remaining_debt: remaining,
        paymentProgress: progress,
        payment_progress: progress,
        dueDate: d.due_date ?? d.dueDate,
        due_date: d.due_date ?? d.dueDate,
        counterparty: d.counterparty,
        description: d.description ?? d.debtDescription,
        debt_description: d.description ?? d.debtDescription,
        isPaidOff: Boolean(d.is_paid_off ?? d.isPaidOff),
        is_paid_off: Boolean(d.is_paid_off ?? d.isPaidOff),
        isActive: Boolean(d.is_active ?? d.isActive),
        is_active: Boolean(d.is_active ?? d.isActive),
        currency: d.currency,
        createdAt: d.created_at ?? d.createdAt,
        created_at: d.created_at ?? d.createdAt,
    }
}

// List debts
router.get('/', async (c) => {
    const includeCompleted = c.req.query('include_completed') === 'true'
    const withSummary = c.req.query('with_summary') === 'true'

    const conditions = [eq(accounts.type, 'debt')]
    if (!includeCompleted) {
        conditions.push(eq(accounts.isPaidOff, false))
    }

    const list = await db.select({
        id: accounts.id,
        name: accounts.name,
        type: accounts.type,
        debtType: accounts.debtType,
        targetAmount: accounts.targetAmount,
        initialBalance: accounts.initialBalance,
        dueDate: accounts.dueDate,
        isPaidOff: accounts.isPaidOff,
        counterparty: accounts.counterparty,
        debtDescription: accounts.debtDescription,
        currencyId: accounts.currencyId,
        isActive: accounts.isActive,
        createdAt: accounts.createdAt,
        currency: currencies,
    })
    .from(accounts)
    .leftJoin(currencies, eq(accounts.currencyId, currencies.id))
    .where(and(...conditions))

    const mapped = list.map(mapDebt)

    const response: any = { data: mapped }
    if (withSummary) {
        response.summary = await getDebtsSummary()
    }

    return c.json(response)
})

// Summary
router.get('/summary', async (c) => {
    return c.json(await getDebtsSummary())
})

// Get debt by ID
router.get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const list = await db.select({
        id: accounts.id,
        name: accounts.name,
        type: accounts.type,
        debtType: accounts.debtType,
        targetAmount: accounts.targetAmount,
        initialBalance: accounts.initialBalance,
        dueDate: accounts.dueDate,
        isPaidOff: accounts.isPaidOff,
        counterparty: accounts.counterparty,
        debtDescription: accounts.debtDescription,
        currencyId: accounts.currencyId,
        isActive: accounts.isActive,
        createdAt: accounts.createdAt,
        currency: currencies,
    })
    .from(accounts)
    .leftJoin(currencies, eq(accounts.currencyId, currencies.id))
    .where(and(eq(accounts.id, id), eq(accounts.type, 'debt')))

    if (list.length === 0) return c.json({ message: 'Debt not found' }, 404)
    return c.json(mapDebt(list[0]))
})

// Create a debt
router.post('/', async (c) => {
    const body = await c.req.json()
    const now = new Date().toISOString()

    const [newDebt] = await db.insert(accounts).values({
        name: body.name,
        type: 'debt',
        debtType: body.debt_type || body.debtType,
        currencyId: Number(body.currency_id || body.currencyId || 1),
        initialBalance: 0,
        targetAmount: Number(body.amount || body.target_amount || body.targetAmount),
        dueDate: body.due_date || body.dueDate || null,
        counterparty: body.counterparty || '',
        debtDescription: body.description || body.debt_description || '',
        isPaidOff: false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
    }).returning()

    return c.json(mapDebt(newDebt), 201)
})

// Update debt
router.patch('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const now = new Date().toISOString()

    const updateData: any = { updatedAt: now }
    if (body.name !== undefined) updateData.name = body.name
    if (body.amount !== undefined || body.target_amount !== undefined) {
        updateData.targetAmount = Number(body.amount ?? body.target_amount)
    }
    if (body.due_date !== undefined || body.dueDate !== undefined) {
        updateData.dueDate = body.due_date ?? body.dueDate
    }
    if (body.counterparty !== undefined) updateData.counterparty = body.counterparty
    if (body.description !== undefined || body.debt_description !== undefined) {
        updateData.debtDescription = body.description ?? body.debt_description
    }
    if (body.currency_id !== undefined || body.currencyId !== undefined) {
        updateData.currencyId = Number(body.currency_id ?? body.currencyId)
    }

    const [updated] = await db.update(accounts).set(updateData).where(and(eq(accounts.id, id), eq(accounts.type, 'debt'))).returning()
    if (!updated) return c.json({ message: 'Debt not found' }, 404)

    return c.json(mapDebt(updated))
})

// Delete debt
router.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.type, 'debt')))
    return c.json({ message: 'Debt deleted' })
})

// Make a payment on a debt
router.post('/:id/payment', async (c) => {
    const debtId = Number(c.req.param('id'))
    const { account_id, accountId, amount, date, description } = await c.req.json()
    const sourceAccountId = Number(account_id || accountId)
    const paymentAmount = Number(amount)
    const now = new Date().toISOString()

    const debt = (await db.select().from(accounts).where(eq(accounts.id, debtId)))[0]
    if (!debt || debt.type !== 'debt') return c.json({ message: 'Debt account not found' }, 404)

    await db.update(accounts)
        .set({ balance: sql`${accounts.balance} - ${paymentAmount}`, updatedAt: now })
        .where(eq(accounts.id, sourceAccountId))

    const newPaidAmount = (debt.initialBalance || 0) + paymentAmount
    const isPaidOff = newPaidAmount >= (debt.targetAmount || 0)

    await db.update(accounts)
        .set({ initialBalance: newPaidAmount, isPaidOff, updatedAt: now })
        .where(eq(accounts.id, debtId))

    const [tx] = await db.insert(transactions).values({
        type: 'debt_payment',
        accountId: sourceAccountId,
        toAccountId: debtId,
        amount: paymentAmount,
        description: description || `Payment towards debt: ${debt.name}`,
        date: date || now.split('T')[0],
        createdAt: now,
        updatedAt: now,
    }).returning()

    return c.json(tx)
})

// Collect money received on a debt
router.post('/:id/collect', async (c) => {
    const debtId = Number(c.req.param('id'))
    const { account_id, accountId, amount, date, description } = await c.req.json()
    const targetAccountId = Number(account_id || accountId)
    const collectAmount = Number(amount)
    const now = new Date().toISOString()

    const debt = (await db.select().from(accounts).where(eq(accounts.id, debtId)))[0]
    if (!debt || debt.type !== 'debt') return c.json({ message: 'Debt account not found' }, 404)

    await db.update(accounts)
        .set({ balance: sql`${accounts.balance} + ${collectAmount}`, updatedAt: now })
        .where(eq(accounts.id, targetAccountId))

    const newCollectedAmount = (debt.initialBalance || 0) + collectAmount
    const isPaidOff = newCollectedAmount >= (debt.targetAmount || 0)

    await db.update(accounts)
        .set({ initialBalance: newCollectedAmount, isPaidOff, updatedAt: now })
        .where(eq(accounts.id, debtId))

    const [tx] = await db.insert(transactions).values({
        type: 'debt_collection',
        accountId: debtId,
        toAccountId: targetAccountId,
        amount: collectAmount,
        description: description || `Collected on debt: ${debt.name}`,
        date: date || now.split('T')[0],
        createdAt: now,
        updatedAt: now,
    }).returning()

    return c.json(tx)
})

// Reopen a completed debt
router.post('/:id/reopen', async (c) => {
    const debtId = Number(c.req.param('id'))
    const [reopened] = await db.update(accounts)
        .set({ isPaidOff: false, updatedAt: new Date().toISOString() })
        .where(eq(accounts.id, debtId))
        .returning()

    return c.json(mapDebt(reopened))
})

export default router
