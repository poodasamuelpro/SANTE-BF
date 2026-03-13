import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'

// ── Import des routes ──────────────────────────────────────
import { authRoutes } from '../src/routes/auth'
import { dashboardRoutes } from '../src/routes/dashboard'

// ── Types Cloudflare env ───────────────────────────────────
export type Env = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

// ── App principale ─────────────────────────────────────────
const app = new Hono<{ Bindings: Env }>()

// Routes auth (login, logout, callback)
app.route('/auth', authRoutes)

// Routes dashboards (protégées)
app.route('/dashboard', dashboardRoutes)

// Redirection racine vers login
app.get('/', (c) => c.redirect('/auth/login'))

export const onRequest = handle(app)
