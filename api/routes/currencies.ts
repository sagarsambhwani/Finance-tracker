import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { currencies } from '../db/schema'
import { getAuthUser } from './auth'

const router = new Hono()

router.use('*', async (c, next) => {
    const user = await getAuthUser(c)
    if (!user) return c.json({ message: 'Unauthorized' }, 401)
    await next()
})

// List currencies
router.get('/', async (c) => {
    const list = await db.select().from(currencies)
    return c.json({ data: list })
})

// Currency catalog
router.get('/catalog', async (c) => {
    return c.json({
        data: [
            { code: 'EUR', name: 'Euro', symbol: '€' },
            { code: 'USD', name: 'US Dollar', symbol: '$' },
            { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
            { code: 'GBP', name: 'British Pound', symbol: '£' },
            { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
            { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
            { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
            { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
            { code: 'BTC', name: 'Bitcoin', symbol: '₿' },
            { code: 'ETH', name: 'Ethereum', symbol: 'Ξ' },
        ],
    })
})

// Get currency by ID
router.get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const currency = (await db.select().from(currencies).where(eq(currencies.id, id)))[0]
    if (!currency) return c.json({ message: 'Currency not found' }, 404)
    return c.json(currency)
})

// Create currency
router.post('/', async (c) => {
    const body = await c.req.json()
    const now = new Date().toISOString()

    const [currency] = await db.insert(currencies).values({
        code: body.code.toUpperCase(),
        name: body.name,
        symbol: body.symbol,
        decimals: Number(body.decimals || 2),
        isBase: Boolean(body.is_base),
        rate: Number(body.rate || 1.0),
        createdAt: now,
        updatedAt: now,
    }).returning()

    return c.json(currency, 201)
})

// Update currency (PUT and PATCH)
const handleUpdate = async (c: any) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const now = new Date().toISOString()

    const updateData: any = { updatedAt: now }
    if (body.name !== undefined) updateData.name = body.name
    if (body.symbol !== undefined) updateData.symbol = body.symbol
    if (body.decimals !== undefined) updateData.decimals = Number(body.decimals)
    if (body.rate !== undefined) updateData.rate = Number(body.rate)

    const [updated] = await db.update(currencies).set(updateData).where(eq(currencies.id, id)).returning()
    if (!updated) return c.json({ message: 'Currency not found' }, 404)

    return c.json(updated)
}

router.put('/:id', handleUpdate)
router.patch('/:id', handleUpdate)

// Set base currency
router.post('/:id/set-base', async (c) => {
    const id = Number(c.req.param('id'))
    const now = new Date().toISOString()

    await db.update(currencies).set({ isBase: false, updatedAt: now })
    const [updated] = await db.update(currencies).set({ isBase: true, rate: 1.0, updatedAt: now }).where(eq(currencies.id, id)).returning()

    return c.json(updated)
})

// Delete currency
router.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await db.delete(currencies).where(eq(currencies.id, id))
    return c.json({ message: 'Currency deleted' })
})

export default router
