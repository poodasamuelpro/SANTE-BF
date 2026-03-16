// functions/[[path]].ts - VERSION COMBINÉE (Middleware + Routes)
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

type Env = {
  Bindings: {
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
    RESEND_API_KEY: string
  }
}

// =====================================================
// MIDDLEWARE CLOUDFLARE INTÉGRÉ
// =====================================================
export async function onRequest(context: any) {
  console.log('\n' + '='.repeat(60))
  console.log('🌐 CLOUDFLARE MIDDLEWARE - DÉBUT')
  console.log('URL:', context.request.url)
  console.log('Method:', context.request.method)
  
  // Analyser les cookies
  const cookieHeader = context.request.headers.get('cookie')
  console.log('Cookies bruts:', cookieHeader || 'aucun')
  
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [key, val] = c.trim().split('=')
        return [key, val]
      })
    )
    console.log('Token présent:', !!cookies['sb_token'])
    console.log('Refresh présent:', !!cookies['sb_refresh'])
  }
  
  // Forcer les logs à s'afficher
  const originalLog = console.log
  console.log = (...args) => {
    args.forEach(arg => {
      if (typeof arg === 'object') {
        originalLog(JSON.stringify(arg, null, 2))
      } else {
        originalLog(arg)
      }
    })
  }

  try {
    // CRÉER L'APPLICATION HONO
    const app = new Hono<Env>()
    
    // Routes publiques
    app.route('/public', publicRoutes)
    
    // Authentification
    app.route('/auth', authRoutes)
    
    // Dashboards
    app.route('/dashboard', dashboardRoutes)
    
    // Modules métier
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
    
    // Services transverses
    app.route('/upload', uploadRoutes)
    app.route('/parametres', parametresRoutes)
    app.route('/patient-pdf', patientPdfRoutes)
    app.route('/export', exportRoutes)
    
    // Racine → login
    app.get('/', (c) => c.redirect('/auth/login'))
    
    // 404 → login
    app.notFound((c) => c.redirect('/auth/login'))

    // EXÉCUTER HONO
    const honoHandler = handle(app)
    const response = await honoHandler(context)
    
    // ANALYSER LA RÉPONSE
    console.log('RÉPONSE - Status:', response.status)
    console.log('RÉPONSE - Location:', response.headers.get('location'))
    console.log('RÉPONSE - Set-Cookie:', response.headers.get('set-cookie'))
    
    // Vérifier si c'est une redirection
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get('location')
      if (location) {
        console.log('🔄 REDIRECTION VERS:', location)
        // Forcer la redirection si nécessaire
        return Response.redirect(new URL(location, context.request.url), 302)
      }
    }
    
    console.log('🌐 CLOUDFLARE MIDDLEWARE - FIN')
    console.log('='.repeat(60) + '\n')
    
    return response
    
  } catch (err) {
    console.error('❌ ERREUR:', err)
    return new Response('Erreur serveur', { status: 500 })
  }
}