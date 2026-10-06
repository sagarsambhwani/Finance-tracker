import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db/client'
import { automationRules, automationRuleLogs } from '../db/schema'
import { getAuthUser } from './auth'

const router = new Hono()

router.use('*', async (c, next) => {
    const user = await getAuthUser(c)
    if (!user) return c.json({ message: 'Unauthorized' }, 401)
    await next()
})

// List automation rules
router.get('/', async (c) => {
    const list = await db.select().from(automationRules).orderBy(automationRules.priority)
    const parsed = list.map(r => ({
        ...r,
        conditions: JSON.parse(r.conditions || '[]'),
        actions: JSON.parse(r.actions || '[]'),
    }))
    return c.json({ data: parsed })
})

// Supported triggers list
router.get('/triggers', async (c) => {
    return c.json({
        data: [
            { id: 'transaction_created', name: 'When transaction is created manually' },
            { id: 'transaction_imported', name: 'When transaction is imported from bank statement' },
        ],
    })
})

// Get rule by ID
router.get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const rule = (await db.select().from(automationRules).where(eq(automationRules.id, id)))[0]
    if (!rule) return c.json({ message: 'Rule not found' }, 404)
    return c.json({
        ...rule,
        conditions: JSON.parse(rule.conditions || '[]'),
        actions: JSON.parse(rule.actions || '[]'),
    })
})

// Create rule
router.post('/', async (c) => {
    const body = await c.req.json()
    const now = new Date().toISOString()

    const [rule] = await db.insert(automationRules).values({
        name: body.name,
        description: body.description || '',
        triggerType: body.trigger_type || 'transaction_created',
        priority: Number(body.priority || 50),
        conditions: JSON.stringify(body.conditions || []),
        actions: JSON.stringify(body.actions || []),
        isActive: true,
        stopProcessing: Boolean(body.stop_processing),
        runsCount: 0,
        createdAt: now,
        updatedAt: now,
    }).returning()

    return c.json({
        ...rule,
        conditions: JSON.parse(rule.conditions),
        actions: JSON.parse(rule.actions),
    }, 201)
})

// Update rule
router.patch('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const now = new Date().toISOString()

    const updateData: any = { updatedAt: now }
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.trigger_type !== undefined) updateData.triggerType = body.trigger_type
    if (body.priority !== undefined) updateData.priority = Number(body.priority)
    if (body.conditions !== undefined) updateData.conditions = JSON.stringify(body.conditions)
    if (body.actions !== undefined) updateData.actions = JSON.stringify(body.actions)
    if (body.is_active !== undefined) updateData.isActive = Boolean(body.is_active)
    if (body.stop_processing !== undefined) updateData.stopProcessing = Boolean(body.stop_processing)

    const [updated] = await db.update(automationRules).set(updateData).where(eq(automationRules.id, id)).returning()
    if (!updated) return c.json({ message: 'Rule not found' }, 404)

    return c.json({
        ...updated,
        conditions: JSON.parse(updated.conditions),
        actions: JSON.parse(updated.actions),
    })
})

// Toggle rule active status
router.post('/:id/toggle', async (c) => {
    const id = Number(c.req.param('id'))
    const rule = (await db.select().from(automationRules).where(eq(automationRules.id, id)))[0]
    if (!rule) return c.json({ message: 'Rule not found' }, 404)

    const [updated] = await db.update(automationRules)
        .set({ isActive: !rule.isActive, updatedAt: new Date().toISOString() })
        .where(eq(automationRules.id, id))
        .returning()

    return c.json(updated)
})

// Reorder rules
router.post('/reorder', async (c) => {
    const body = await c.req.json()
    const rules = body.rules || []
    for (const r of rules) {
        await db.update(automationRules)
            .set({ priority: Number(r.priority), updatedAt: new Date().toISOString() })
            .where(eq(automationRules.id, Number(r.id)))
    }
    return c.json({ success: true })
})

// Test rule
router.post('/:id/test', async (c) => {
    return c.json({
        conditions_match: true,
        would_execute: true,
        actions: [],
    })
})

// Rule execution logs
router.get('/:id/logs', async (c) => {
    const ruleId = Number(c.req.param('id'))
    const logs = await db.select()
        .from(automationRuleLogs)
        .where(eq(automationRuleLogs.ruleId, ruleId))
        .orderBy(desc(automationRuleLogs.createdAt))
        .limit(50)

    return c.json({ data: logs })
})

// Delete rule
router.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await db.delete(automationRules).where(eq(automationRules.id, id))
    return c.json({ message: 'Rule deleted' })
})

export default router
