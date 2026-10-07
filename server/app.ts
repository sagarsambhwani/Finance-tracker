import { Hono } from 'hono'
import auth from './routes/auth'
import accounts, { getAccountsSummary } from './routes/accounts'
import categories from './routes/categories'
import currencies from './routes/currencies'
import transactions, { getTransactionSummary } from './routes/transactions'
import budgets from './routes/budgets'
import reports from './routes/reports'
import importRouter from './routes/import'
import backups from './routes/backups'
import debts from './routes/debts'
import tags from './routes/tags'
import users from './routes/users'
import recurring from './routes/recurring'
import automation from './routes/automation'
import settings from './routes/settings'
import timezones from './routes/timezones'
import monitoring from './routes/monitoring'
import { initDatabase } from './db/client'

const app = new Hono().basePath('/api')

app.onError((err, c) => {
    console.error('API Error:', err)
    return c.json({
        message: err.message || 'Internal server error',
        name: err.name,
    }, 500)
})

// Ensure tables exist and initial currencies/categories are seeded on cold start
initDatabase()

// Mount sub-routes
app.route('/auth', auth)
app.route('/accounts', accounts)
app.route('/categories', categories)
app.route('/currencies', currencies)
app.route('/transactions', transactions)
app.route('/budgets', budgets)
app.route('/reports', reports)
app.route('/import', importRouter)
app.route('/transactions/import', importRouter)
app.route('/backups', backups)
app.route('/debts', debts)
app.route('/tags', tags)
app.route('/users', users)
app.route('/recurring', recurring)
app.route('/automation-rules', automation)
app.route('/settings', settings)
app.route('/timezones', timezones)
app.route('/monitoring', monitoring)

// Top-level aliases for frontend compatibility
app.get('/accounts-balance-history', (c) => c.json({ dates: [], series: [], currency: '€', decimals: 2 }))
app.get('/accounts-balance-comparison', (c) => c.json({ current: 0, previous: null, currency: '€', decimals: 2 }))
app.get('/categories-summary', async (c) => {
    // Forward to categories summary
    return c.redirect('/api/categories/summary')
})
app.get('/transactions-summary', async (c) => {
    return c.json(await getTransactionSummary())
})
app.get('/debts-summary', async (c) => {
    return c.redirect('/api/debts/summary')
})
app.get('/recurring-upcoming', async (c) => {
    return c.redirect('/api/recurring/upcoming')
})

// Identity provider admin fallback
app.get('/identity-providers', (c) => c.json({ data: [] }))
app.get('/identity-providers/:id', (c) => c.json({}))

// Direct S3 multipart fallback for file uploads
app.post('/s3/multipart', (c) => c.json({ uploadId: 'direct', key: 'file' }))
app.get('/s3/multipart/:id', (c) => c.json([]))
app.get('/s3/multipart/:id/:part', (c) => c.json({ url: '', partNumber: 1 }))
app.post('/s3/multipart/complete', (c) => c.json({ location: '', key: 'file', uploadId: 'direct' }))
app.delete('/s3/multipart/:id', (c) => c.json({}))

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

export { app }
export default app
