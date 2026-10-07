import { handle } from '@hono/node-server/vercel'
import { app } from './_server/app'

export default handle(app)
export { app }
