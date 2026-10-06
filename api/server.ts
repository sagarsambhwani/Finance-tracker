import { serve } from '@hono/node-server'
import { app } from './index'

const port = 3001
console.log(`🚀 Finance Tracker API running at http://localhost:${port}/api`)

serve({
    fetch: app.fetch,
    port,
})
