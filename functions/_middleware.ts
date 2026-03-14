import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { authRoutes } from '../src/routes/auth'
import { dashboardRoutes } from '../src/routes/dashboard'
import { publicRoutes } from '../src/routes/public'

type Env = {
  Bindings: {
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
  }
}

const app = new Hono<Env>()

app.route('/public',    publicRoutes)
app.route('/auth',      authRoutes)
app.route('/dashboard', dashboardRoutes)
app.get('/', (c) => c.redirect('/auth/login'))
app.notFound((c) => c.redirect('/auth/login'))

export const onRequest = handle(app)
