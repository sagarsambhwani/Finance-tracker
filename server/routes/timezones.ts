import { Hono } from 'hono'
import { getAuthUser } from './auth'

const router = new Hono()

router.use('*', async (c, next) => {
    const user = await getAuthUser(c)
    if (!user) return c.json({ message: 'Unauthorized' }, 401)
    await next()
})

router.get('/', (c) => {
    return c.json({
        timezones: [
            { name: 'UTC', offset: '+00:00', canonical: true },
            { name: 'Europe/Berlin', offset: '+01:00', canonical: true },
            { name: 'Europe/London', offset: '+00:00', canonical: true },
            { name: 'Europe/Paris', offset: '+01:00', canonical: true },
            { name: 'Asia/Kolkata', offset: '+05:30', canonical: true },
            { name: 'America/New_York', offset: '-05:00', canonical: true },
            { name: 'America/Chicago', offset: '-06:00', canonical: true },
            { name: 'America/Los_Angeles', offset: '-08:00', canonical: true },
            { name: 'Asia/Tokyo', offset: '+09:00', canonical: true },
            { name: 'Asia/Dubai', offset: '+04:00', canonical: true },
            { name: 'Asia/Singapore', offset: '+08:00', canonical: true },
            { name: 'Australia/Sydney', offset: '+11:00', canonical: true },
        ],
        current: 'UTC',
    })
})

export default router
