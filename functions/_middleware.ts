import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { authRoutes } from '../src/routes/auth'
import { dashboardRoutes } from '../src/routes/dashboard'
import { publicRoutes } from '../src/routes/public'
import { adminRoutes } from '../src/routes/admin'
import { accueilRoutes } from '../src/routes/accueil'
import { medecinRoutes } from '../src/routes/medecin'
import { pharmacienRoutes } from '../src/routes/pharmacien'
import { caissierRoutes } from '../src/routes/caissier'

type Env = {
  Bindings: {
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
  }
}

const app = new Hono<Env>()

// Routes publiques (QR code urgence, reset password)
app.route('/public',   publicRoutes)

// Authentification
app.route('/auth',     authRoutes)

// Dashboards (page d'accueil de chaque rôle)
app.route('/dashboard', dashboardRoutes)

// Modules métier
app.route('/admin',       adminRoutes)
app.route('/accueil',     accueilRoutes)
app.route('/medecin',     medecinRoutes)
app.route('/pharmacien',  pharmacienRoutes)
app.route('/caissier',    caissierRoutes)

// Racine → login
app.get('/', (c) => c.redirect('/auth/login'))

// 404 → login
app.notFound((c) => c.redirect('/auth/login'))

export const onRequest = handle(app)
