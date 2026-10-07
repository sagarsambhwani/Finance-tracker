import { handle } from '@hono/node-server/vercel'

export default async function handler(req: any, res: any) {
    try {
        const { app } = await import('../server/app')
        const honoHandler = handle(app)
        return await honoHandler(req, res)
    } catch (err: any) {
        console.error('SERVERLESS_HANDLER_ERROR:', err)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
            error: err?.message || 'Unknown server error',
            name: err?.name,
            stack: err?.stack,
        }))
    }
}
