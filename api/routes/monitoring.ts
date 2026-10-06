import { Hono } from 'hono'
import os from 'os'
import { getAuthUser } from './auth'

const router = new Hono()

router.use('*', async (c, next) => {
    const user = await getAuthUser(c)
    if (!user) return c.json({ message: 'Unauthorized' }, 401)
    await next()
})

router.get('/storage', (c) => {
    return c.json({
        volume: {
            disk: 'Cloud Serverless',
            path: '/',
            total_bytes: null,
            free_bytes: null,
            used_bytes: null,
            used_percent: null,
        },
        managed: {
            used_bytes: 0,
            objects: 0,
            pending_bytes: 0,
            buckets: [],
        },
        uploads: {
            total: 0,
            by_status: {},
        },
        imports: {
            total: 0,
            by_status: {},
        },
    })
})

router.get('/resources', (c) => {
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const memUsage = process.memoryUsage()

    return c.json({
        cpu: {
            cores: os.cpus().length,
            load: typeof os.loadavg === 'function' ? os.loadavg() : [0, 0, 0],
            load_percent: null,
        },
        memory: {
            total_bytes: totalMem,
            used_bytes: totalMem - freeMem,
            free_bytes: freeMem,
            used_percent: Math.round(((totalMem - freeMem) / totalMem) * 100),
            source: 'host',
        },
        process: {
            memory_bytes: memUsage.rss,
            peak_bytes: memUsage.heapTotal,
            limit_bytes: null,
        },
        queue: {
            pending: 0,
            reserved: 0,
            failed: 0,
        },
        runtime: {
            php_version: `TypeScript / Node.js ${process.version}`,
            laravel_version: 'Serverless Hono TS Engine',
            environment: process.env.NODE_ENV || 'development',
            uptime_seconds: Math.round(process.uptime()),
        },
    })
})

export default router
