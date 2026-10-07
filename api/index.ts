import { handle } from '@hono/node-server/vercel'

let app: any
let loadError: any = null

try {
    const mod = await import('./_server/app')
    app = mod.app
} catch (err: any) {
    loadError = {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
    }
}

export default async function handler(req: any, res: any) {
    if (loadError) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ type: 'MODULE_LOAD_ERROR', error: loadError }))
        return
    }

    try {
        const h = handle(app)
        return await h(req, res)
    } catch (err: any) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ type: 'HANDLER_ERROR', name: err?.name, message: err?.message, stack: err?.stack }))
    }
}
