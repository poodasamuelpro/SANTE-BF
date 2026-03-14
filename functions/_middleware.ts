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
import { patientRoutes } from '../src/routes/patient'
import { structureRoutes } from '../src/routes/structure'
import { hospitalisationsRoutes } from '../src/routes/hospitalisations'
import { vaccinationsRoutes } from '../src/routes/vaccinations'
import { laboratoireRoutes } from '../src/routes/laboratoire'
import { radiologieRoutes } from '../src/routes/radiologie'
import { grossesseRoutes } from '../src/routes/grossesse'
import { infirmerieRoutes } from '../src/routes/infirmerie'

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
app.route('/admin',           adminRoutes)
app.route('/accueil',         accueilRoutes)
app.route('/medecin',         medecinRoutes)
app.route('/pharmacien',      pharmacienRoutes)
app.route('/caissier',        caissierRoutes)
app.route('/patient',         patientRoutes)
app.route('/structure',       structureRoutes)
app.route('/hospitalisations', hospitalisationsRoutes)
app.route('/vaccinations',    vaccinationsRoutes)
app.route('/laboratoire',     laboratoireRoutes)
app.route('/radiologie',      radiologieRoutes)
app.route('/grossesse',       grossesseRoutes)
app.route('/infirmerie',      infirmerieRoutes)

// Racine → login
app.get('/', (c) => c.redirect('/auth/login'))

// 404 → login
app.notFound((c) => c.redirect('/auth/login'))

export const onRequest = handle(app)
