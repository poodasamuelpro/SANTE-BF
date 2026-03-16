// functions/[[path]].ts - VERSION CORRIGÉE + profilRoutes
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
import { hospitalisationRoutes } from '../src/routes/hospitalisations'
import { vaccinationRoutes } from '../src/routes/vaccinations'
import { laboratoireRoutes } from '../src/routes/laboratoire'
import { radiologieRoutes } from '../src/routes/radiologie'
import { grossesseRoutes } from '../src/routes/grossesse'
import { infirmerieRoutes } from '../src/routes/infirmerie'
import { uploadRoutes } from '../src/routes/upload'
import { parametresRoutes } from '../src/routes/parametres'
import { patientPdfRoutes } from '../src/routes/patient-pdf'
import { exportRoutes } from '../src/routes/export'
import { profilRoutes } from '../src/routes/profil'

type Env = {
  Bindings: {
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
    RESEND_API_KEY: string
  }
}

const app = new Hono<Env>()

app.route('/public', publicRoutes)
app.route('/auth', authRoutes)
app.route('/dashboard', dashboardRoutes)
app.route('/admin', adminRoutes)
app.route('/accueil', accueilRoutes)
app.route('/medecin', medecinRoutes)
app.route('/pharmacien', pharmacienRoutes)
app.route('/caissier', caissierRoutes)
app.route('/patient', patientRoutes)
app.route('/structure', structureRoutes)
app.route('/hospitalisations', hospitalisationRoutes)
app.route('/vaccinations', vaccinationRoutes)
app.route('/laboratoire', laboratoireRoutes)
app.route('/radiologie', radiologieRoutes)
app.route('/grossesse', grossesseRoutes)
app.route('/infirmerie', infirmerieRoutes)
app.route('/upload', uploadRoutes)
app.route('/parametres', parametresRoutes)
app.route('/patient-pdf', patientPdfRoutes)
app.route('/export', exportRoutes)
app.route('/profil', profilRoutes)  // ✅ NOUVEAU — photo de profil

app.get('/', (c) => c.redirect('/auth/login'))
app.notFound((c) => c.redirect('/auth/login'))

const honoHandler = handle(app)

export async function onRequest(context: any) {
  try {
    return await honoHandler(context)
  } catch (err) {
    console.error('❌ ERREUR CRITIQUE:', err)
    return new Response('Erreur serveur interne', { status: 500 })
  }
}
