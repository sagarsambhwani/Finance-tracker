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

function formatRule(r: any) {
    let rawConditions: any = []
    try {
        rawConditions = JSON.parse(r.conditions || '[]')
    } catch {
        rawConditions = []
    }

    const conditions = Array.isArray(rawConditions)
        ? { match: 'all', conditions: rawConditions }
        : rawConditions || { match: 'all', conditions: [] }

    let actions = []
    try {
        actions = JSON.parse(r.actions || '[]')
    } catch {
        actions = []
    }

    const triggerType = r.triggerType || 'on_transaction_create'
    const triggerLabel = triggerType === 'on_transaction_update' ? 'On Transaction Update' : 'On Transaction Create'

    return {
        id: r.id,
        name: r.name,
        description: r.description || null,
        trigger_type: triggerType,
        trigger_label: triggerLabel,
        priority: Number(r.priority || 50),
        conditions,
        actions,
        is_active: Boolean(r.isActive),
        stop_processing: Boolean(r.stopProcessing),
        runs_count: Number(r.runsCount || 0),
        last_run_at: r.updatedAt,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
        // camelCase aliases
        isActive: Boolean(r.isActive),
        stopProcessing: Boolean(r.stopProcessing),
        runsCount: Number(r.runsCount || 0),
    }
}

// List automation rules
router.get('/', async (c) => {
    const list = await db.select().from(automationRules).orderBy(automationRules.priority)
    return c.json({ data: list.map(formatRule) })
})

// Supported triggers list
router.get('/triggers', async (c) => {
    return c.json({
        data: [
            { value: 'on_transaction_create', label: 'On Transaction Create', description: 'When transaction is created' },
            { value: 'on_transaction_update', label: 'On Transaction Update', description: 'When transaction is updated' },
        ],
    })
})

// Get rule by ID
router.get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const rule = (await db.select().from(automationRules).where(eq(automationRules.id, id)))[0]
    if (!rule) return c.json({ message: 'Rule not found' }, 404)
    return c.json(formatRule(rule))
})

// Create rule
router.post('/', async (c) => {
    const body = await c.req.json()
    const now = new Date().toISOString()

    const [rule] = await db.insert(automationRules).values({
        name: body.name,
        description: body.description || '',
        triggerType: body.trigger_type || 'on_transaction_create',
        priority: Number(body.priority || 50),
        conditions: JSON.stringify(body.conditions || []),
        actions: JSON.stringify(body.actions || []),
        isActive: true,
        stopProcessing: Boolean(body.stop_processing),
        runsCount: 0,
        createdAt: now,
        updatedAt: now,
    }).returning()

    return c.json(formatRule(rule), 201)
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

    return c.json(formatRule(updated))
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
