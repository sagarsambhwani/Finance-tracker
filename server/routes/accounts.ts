import { Hono } from 'hono'
import { eq, desc, and, ne } from 'drizzle-orm'
import { db } from '../db/client'
import { accounts, currencies } from '../db/schema'
import { getAuthUser } from './auth'

const router = new Hono<{ Variables: { user: any } }>()

router.use('*', async (c, next) => {
    const user = await getAuthUser(c)
    if (!user) {
        return c.json({ message: 'Unauthorized' }, 401)
    }
    c.set('user', user)
    await next()
})

async function getAccountsSummary(userId?: number) {
    const conditions = [ne(accounts.type, 'debt'), eq(accounts.isActive, true)]
    if (userId !== undefined) {
        conditions.push(eq(accounts.userId, userId))
    }
    const list = await db.select().from(accounts).where(and(...conditions))
    const baseCurr = (await db.select().from(currencies).where(eq(currencies.isBase, true)))[0] || { symbol: '€', code: 'EUR', decimals: 2 }

    const totalBalance = list.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
    return {
        total_balance: totalBalance,
        currency: baseCurr.symbol,
        currency_code: baseCurr.code,
        decimals: baseCurr.decimals,
        accounts_count: list.length,
    }
}

// List accounts
router.get('/', async (c) => {
    const user = c.get('user')
    const withSummary = c.req.query('with_summary') === 'true'
    const excludeDebts = c.req.query('exclude_debts') === 'true'
    const activeOnly = c.req.query('active') === 'true'

    const conditions = [eq(accounts.userId, user.id)]
    if (excludeDebts) conditions.push(ne(accounts.type, 'debt'))
    if (activeOnly) conditions.push(eq(accounts.isActive, true))

    const list = await db.select({
        id: accounts.id,
        name: accounts.name,
        type: accounts.type,
        currency_id: accounts.currencyId,
        balance: accounts.balance,
        color: accounts.color,
        icon: accounts.icon,
        is_active: accounts.isActive,
        currency: currencies,
    })
    .from(accounts)
    .leftJoin(currencies, eq(accounts.currencyId, currencies.id))
    .where(and(...conditions))
    .orderBy(desc(accounts.id))

    const mapped = list.map(a => ({
        ...a,
        currencyId: a.currency_id,
        currentBalance: Number(a.balance) || 0,
        current_balance: Number(a.balance) || 0,
        initialBalance: Number(a.balance) || 0,
        initial_balance: Number(a.balance) || 0,
        isActive: Boolean(a.is_active),
    }))

    const res: any = { data: mapped }
    if (withSummary) {
        res.summary = await getAccountsSummary(user.id)
    }

    return c.json(res)
})

// Create account
router.post('/', async (c) => {
    const user = c.get('user')
    const body = await c.req.json()
    const now = new Date().toISOString()

    const [account] = await db.insert(accounts).values({
        userId: user.id,
        name: body.name,
        type: body.type || 'bank',
        currencyId: Number(body.currency_id || 1),
        balance: Number(body.balance || 0),
        color: body.color || '#3b82f6',
        icon: body.icon || 'landmark',
        isActive: true,
        createdAt: now,
        updatedAt: now,
    }).returning()

    return c.json(account, 201)
})

// Get account by ID
router.get('/:id', async (c) => {
    const user = c.get('user')
    const id = Number(c.req.param('id'))
    const account = (await db.select().from(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, user.id))))[0]
    if (!account) return c.json({ message: 'Account not found' }, 404)
    return c.json(account)
})

// Update account (PUT and PATCH)
const handleUpdate = async (c: any) => {
    const user = c.get('user')
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const now = new Date().toISOString()

    const updateData: any = { updatedAt: now }
    if (body.name !== undefined) updateData.name = body.name
    if (body.type !== undefined) updateData.type = body.type
    if (body.currency_id !== undefined) updateData.currencyId = Number(body.currency_id)
    if (body.balance !== undefined) updateData.balance = Number(body.balance)
    if (body.color !== undefined) updateData.color = body.color
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.is_active !== undefined) updateData.isActive = Boolean(body.is_active)

    const [updated] = await db.update(accounts).set(updateData).where(and(eq(accounts.id, id), eq(accounts.userId, user.id))).returning()
    if (!updated) return c.json({ message: 'Account not found' }, 404)

    return c.json(updated)
}

router.put('/:id', handleUpdate)
router.patch('/:id', handleUpdate)

// Delete account
router.delete('/:id', async (c) => {
    const user = c.get('user')
    const id = Number(c.req.param('id'))
    await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, user.id)))
    return c.json({ message: 'Account deleted' })
})

export default router
export { getAccountsSummary }
