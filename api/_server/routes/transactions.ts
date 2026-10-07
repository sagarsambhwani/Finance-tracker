import { Hono } from 'hono'
import { eq, desc, and, gte, lte, sql, count } from 'drizzle-orm'
import { db } from '../db/client'
import { transactions, accounts, categories, currencies } from '../db/schema'
import { getAuthUser } from './auth'

const router = new Hono()

router.use('*', async (c, next) => {
    const user = await getAuthUser(c)
    if (!user) return c.json({ message: 'Unauthorized' }, 401)
    await next()
})

async function adjustBalance(accountId: number, delta: number) {
    await db.update(accounts)
        .set({ balance: sql`${accounts.balance} + ${delta}`, updatedAt: new Date().toISOString() })
        .where(eq(accounts.id, accountId))
}

async function getTransactionSummary() {
    const allTx = await db.select().from(transactions)
    const baseCurr = (await db.select().from(currencies).where(eq(currencies.isBase, true)))[0] || { symbol: '€', code: 'EUR', decimals: 2 }

    let income = 0
    let expense = 0

    for (const tx of allTx) {
        if (tx.type === 'income') income += Number(tx.amount)
        if (tx.type === 'expense') expense += Number(tx.amount)
    }

    return {
        income,
        expense,
        net: income - expense,
        currency: baseCurr.symbol,
        currency_code: baseCurr.code,
        decimals: baseCurr.decimals,
        transactions_count: allTx.length,
    }
}

// List transactions
router.get('/', async (c) => {
    const query = c.req.query()
    const conditions = []

    if (query.type) conditions.push(eq(transactions.type, query.type as any))
    if (query.account_id) conditions.push(eq(transactions.accountId, Number(query.account_id)))
    if (query.category_id) conditions.push(eq(transactions.categoryId, Number(query.category_id)))
    if (query.start_date) conditions.push(gte(transactions.date, query.start_date))
    if (query.end_date) conditions.push(lte(transactions.date, query.end_date))

    const page = Math.max(1, Number(query.page || 1))
    const perPage = Math.max(1, Number(query.per_page || 50))
    const offset = (page - 1) * perPage

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const totalCount = (await db.select({ val: count() }).from(transactions).where(whereClause))[0]?.val || 0

    const list = await db.select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        to_amount: transactions.toAmount,
        exchange_rate: transactions.exchangeRate,
        description: transactions.description,
        date: transactions.date,
        account_id: transactions.accountId,
        to_account_id: transactions.toAccountId,
        category_id: transactions.categoryId,
        account: accounts,
        category: categories,
        currency: currencies,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(currencies, eq(accounts.currencyId, currencies.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(whereClause)
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(perPage)
    .offset(offset)

    const mapped = list.map(tx => ({
        ...tx,
        amount: Number(tx.amount),
        account: tx.account ? {
            ...tx.account,
            currency: tx.currency || { symbol: '€', decimals: 2 },
        } : null,
    }))

    const response: any = {
        data: mapped,
        meta: {
            current_page: page,
            last_page: Math.ceil(totalCount / perPage) || 1,
            per_page: perPage,
            total: totalCount,
            from: offset + 1,
            to: Math.min(offset + perPage, totalCount),
        }
    }

    if (query.with_summary === 'true') {
        response.summary = await getTransactionSummary()
    }

    return c.json(response)
})

// Summary
router.get('/summary', async (c) => {
    return c.json(await getTransactionSummary())
})

// Get transaction by ID
router.get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const list = await db.select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        to_amount: transactions.toAmount,
        exchange_rate: transactions.exchangeRate,
        description: transactions.description,
        date: transactions.date,
        account_id: transactions.accountId,
        to_account_id: transactions.toAccountId,
        category_id: transactions.categoryId,
        account: accounts,
        category: categories,
        currency: currencies,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(currencies, eq(accounts.currencyId, currencies.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.id, id))

    if (list.length === 0) return c.json({ message: 'Transaction not found' }, 404)
    const tx = list[0]
    return c.json({
        ...tx,
        amount: Number(tx.amount),
        account: tx.account ? {
            ...tx.account,
            currency: tx.currency || { symbol: '€', decimals: 2 },
        } : null,
    })
})

// Create transaction
router.post('/', async (c) => {
    const body = await c.req.json()
    const now = new Date().toISOString()
    const amount = Number(body.amount)
    const type = body.type as 'income' | 'expense' | 'transfer'
    const accountId = Number(body.account_id)
    const toAccountId = body.to_account_id ? Number(body.to_account_id) : null
    const categoryId = body.category_id ? Number(body.category_id) : null

    const [tx] = await db.insert(transactions).values({
        type,
        accountId,
        toAccountId,
        categoryId,
        amount,
        toAmount: body.to_amount ? Number(body.to_amount) : amount,
        exchangeRate: body.exchange_rate ? Number(body.exchange_rate) : 1.0,
        description: body.description || '',
        date: body.date || now.split('T')[0],
        createdAt: now,
        updatedAt: now,
    }).returning()

    // Update account balances
    if (type === 'income') {
        await adjustBalance(accountId, amount)
    } else if (type === 'expense') {
        await adjustBalance(accountId, -amount)
    } else if (type === 'transfer' && toAccountId) {
        await adjustBalance(accountId, -amount)
        await adjustBalance(toAccountId, body.to_amount ? Number(body.to_amount) : amount)
    }

    return c.json(tx, 201)
})

// Duplicate transaction
router.post('/:id/duplicate', async (c) => {
    const id = Number(c.req.param('id'))
    const tx = (await db.select().from(transactions).where(eq(transactions.id, id)))[0]
    if (!tx) return c.json({ message: 'Transaction not found' }, 404)

    const now = new Date().toISOString()
    const [newTx] = await db.insert(transactions).values({
        type: tx.type,
        accountId: tx.accountId,
        toAccountId: tx.toAccountId,
        categoryId: tx.categoryId,
        amount: tx.amount,
        toAmount: tx.toAmount,
        exchangeRate: tx.exchangeRate,
        description: tx.description ? `${tx.description} (Copy)` : 'Copy',
        date: now.split('T')[0],
        createdAt: now,
        updatedAt: now,
    }).returning()

    if (tx.type === 'income') {
        await adjustBalance(tx.accountId, tx.amount)
    } else if (tx.type === 'expense') {
        await adjustBalance(tx.accountId, -tx.amount)
    } else if (tx.type === 'transfer' && tx.toAccountId) {
        await adjustBalance(tx.accountId, -tx.amount)
        await adjustBalance(tx.toAccountId, tx.toAmount || tx.amount)
    }

    return c.json(newTx, 201)
})

// Update transaction
const handleUpdate = async (c: any) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const now = new Date().toISOString()

    const oldTx = (await db.select().from(transactions).where(eq(transactions.id, id)))[0]
    if (!oldTx) return c.json({ message: 'Transaction not found' }, 404)

    // Revert old balances
    if (oldTx.type === 'income') {
        await adjustBalance(oldTx.accountId, -oldTx.amount)
    } else if (oldTx.type === 'expense') {
        await adjustBalance(oldTx.accountId, oldTx.amount)
    } else if (oldTx.type === 'transfer' && oldTx.toAccountId) {
        await adjustBalance(oldTx.accountId, oldTx.amount)
        await adjustBalance(oldTx.toAccountId, -(oldTx.toAmount || oldTx.amount))
    }

    const newAmount = body.amount !== undefined ? Number(body.amount) : oldTx.amount
    const newAccountId = body.account_id !== undefined ? Number(body.account_id) : oldTx.accountId
    const newToAccountId = body.to_account_id !== undefined ? (body.to_account_id ? Number(body.to_account_id) : null) : oldTx.toAccountId
    const newType = body.type || oldTx.type

    const [updated] = await db.update(transactions).set({
        type: newType,
        accountId: newAccountId,
        toAccountId: newToAccountId,
        categoryId: body.category_id !== undefined ? (body.category_id ? Number(body.category_id) : null) : oldTx.categoryId,
        amount: newAmount,
        toAmount: body.to_amount !== undefined ? Number(body.to_amount) : oldTx.toAmount,
        description: body.description !== undefined ? body.description : oldTx.description,
        date: body.date !== undefined ? body.date : oldTx.date,
        updatedAt: now,
    }).where(eq(transactions.id, id)).returning()

    // Apply new balances
    if (newType === 'income') {
        await adjustBalance(newAccountId, newAmount)
    } else if (newType === 'expense') {
        await adjustBalance(newAccountId, -newAmount)
    } else if (newType === 'transfer' && newToAccountId) {
        await adjustBalance(newAccountId, -newAmount)
        await adjustBalance(newToAccountId, body.to_amount ? Number(body.to_amount) : newAmount)
    }

    return c.json(updated)
}

router.put('/:id', handleUpdate)
router.patch('/:id', handleUpdate)

// Delete transaction
router.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const tx = (await db.select().from(transactions).where(eq(transactions.id, id)))[0]
    if (!tx) return c.json({ message: 'Transaction not found' }, 404)

    // Revert balance changes
    if (tx.type === 'income') {
        await adjustBalance(tx.accountId, -tx.amount)
    } else if (tx.type === 'expense') {
        await adjustBalance(tx.accountId, tx.amount)
    } else if (tx.type === 'transfer' && tx.toAccountId) {
        await adjustBalance(tx.accountId, tx.amount)
        await adjustBalance(tx.toAccountId, -(tx.toAmount || tx.amount))
    }

    await db.delete(transactions).where(eq(transactions.id, id))
    return c.json({ message: 'Transaction deleted' })
})

export default router
export { getTransactionSummary }
