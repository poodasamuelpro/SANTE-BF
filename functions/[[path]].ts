/**
 * functions/[[path]].ts 
 * SantéBF — Point d'entrée Cloudflare Pages
 *
 * Corrections :
 *   1. onRequest() retourne une page HTML propre au lieu de texte brut (écran noir)
 *   2. RESEND_API_KEY + GOOGLE + CINETPAY ajoutés dans le type Env
 *   3. notFound retourne 404 HTML propre
 *   4. Gestion erreur détaillée en dev, générique en prod
 *
 * Nouveautés :
 *   5. Routes /sang et /cnts montées (module don de sang)
 *   6. GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET dans Env (Google Calendar)
 *   7. CINETPAY_SECRET dans Env (webhooks paiement — pour plus tard)
 */

import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { authRoutes }                       from '../src/routes/auth'
import { dashboardRoutes }                  from '../src/routes/dashboard'
import { publicRoutes }                     from '../src/routes/public'
import { adminRoutes }                      from '../src/routes/admin'
import { accueilRoutes }                    from '../src/routes/accueil'
import { medecinRoutes }                    from '../src/routes/medecin'
import { pharmacienRoutes }                 from '../src/routes/pharmacien'
import { caissierRoutes }                   from '../src/routes/caissier'
import { patientRoutes }                    from '../src/routes/patient'
import { structureRoutes }                  from '../src/routes/structure'
import { hospitalisationRoutes }            from '../src/routes/hospitalisations'
import { vaccinationRoutes }                from '../src/routes/vaccinations'
import { laboratoireRoutes }                from '../src/routes/laboratoire'
import { radiologieRoutes }                 from '../src/routes/radiologie'
import { grossesseRoutes }                  from '../src/routes/grossesse'
import { infirmerieRoutes }                 from '../src/routes/infirmerie'
import { uploadRoutes }                     from '../src/routes/upload'
import { parametresRoutes }                 from '../src/routes/parametres'
import { patientPdfRoutes }                 from '../src/routes/patient-pdf'
import { exportRoutes }                     from '../src/routes/export'
import { profilRoutes }                     from '../src/routes/profil'
import { sangPatientRoutes, cntsRoutes }    from '../src/routes/sang'
import { iaRoutes }                          from '../src/routes/ia'
import { contactRoutes }                     from '../src/routes/contact'
import { politiqueRoutes }                   from '../src/routes/politique-confidentialite'
import { plansRoutes }                       from '../src/routes/plans'

import { landingPage } from '../src/pages/landing'

// Paiements + abonnements — fichiers créés, décommenter quand clé API prête
// CINETPAY: ajouter CINETPAY_SITE_ID + CINETPAY_API_KEY + CINETPAY_SECRET dans Cloudflare Variables
import { webhookRoutes }     from '../src/routes/webhooks'
import { abonnementRoutes }  from '../src/routes/abonnement'

// ─── Type Env ────────────────────────────────────────────
type Env = {
  Bindings: {
    // ── Obligatoires ──────────────────────────────────────
    SUPABASE_URL:         string   // URL projet Supabase
    SUPABASE_ANON_KEY:    string   // Clé publique Supabase
    // ── Emails (Resend) ───────────────────────────────────
    RESEND_API_KEY:       string   // Envoi emails automatiques
    // ── IA médicale ────────────────────────────────────────
    ANTHROPIC_API_KEY?:   string   // IA Claude Haiku — console.anthropic.com
    GROK_API_KEY?:        string   // IA Grok (xAI) — xai.com/api
    GEMINI_API_KEY?:      string   // IA Gemini Flash-Lite GRATUIT — aistudio.google.com
    HUGGINGFACE_API_KEY?: string   // IA BioMistral médical GRATUIT — huggingface.co
    IA_MODEL?:            string   // Forcer un modèle : 'anthropic'|'gemini'|'biomistral'|'auto'
    // ── Notifications Push (FCM v1 — Service Account) ────
    FCM_PROJECT_ID?:      string   // sante-bf-64d92
    FCM_CLIENT_EMAIL?:    string   // firebase-adminsdk-fbsvc@sante-bf-64d92.iam.gserviceaccount.com
    FCM_PRIVATE_KEY?:     string   // Clé privée RSA complète (BEGIN PRIVATE KEY...)
    // ── Paiement CinetPay ────────────────────────────────
    CINETPAY_SITE_ID?:    string   // Site ID CinetPay
    CINETPAY_API_KEY?:    string   // Clé API CinetPay
    CINETPAY_SECRET?:     string   // Secret webhook CinetPay
    // ── Paiement DuniaPay (alternative) ──────────────────
    DUNIAPAY_API_KEY?:    string   // Clé API DuniaPay
    DUNIAPAY_SECRET?:     string   // Secret webhook DuniaPay
    // ── Email Brevo (alternative à Resend) ───────────────
    BREVO_API_KEY?:       string   // API Brevo/Sendinblue — alternative Resend
    // ── Google Calendar ───────────────────────────────────
    GOOGLE_CLIENT_ID?:    string   // Google Calendar OAuth2
    GOOGLE_CLIENT_SECRET?: string  // Google Calendar OAuth2
    // ── Environnement ─────────────────────────────────────
    ENVIRONMENT?:         string   // 'development' | 'production'
  }
}

// ─── App Hono ─────────────────────────────────────────────
const app = new Hono<Env>()

// Routes publiques (sans auth)
app.route('/public',    publicRoutes)
app.route('/auth',      authRoutes)

// Routes protégées
app.route('/dashboard',        dashboardRoutes)
app.route('/admin',            adminRoutes)
app.route('/accueil',          accueilRoutes)
app.route('/medecin',          medecinRoutes)
app.route('/pharmacien',       pharmacienRoutes)
app.route('/caissier',         caissierRoutes)
app.route('/patient',          patientRoutes)
app.route('/structure',        structureRoutes)
app.route('/hospitalisations', hospitalisationRoutes)
app.route('/vaccinations',     vaccinationRoutes)
app.route('/laboratoire',      laboratoireRoutes)
app.route('/radiologie',       radiologieRoutes)
app.route('/grossesse',        grossesseRoutes)
app.route('/infirmerie',       infirmerieRoutes)
app.route('/upload',           uploadRoutes)
app.route('/parametres',       parametresRoutes)
app.route('/patient-pdf',      patientPdfRoutes)
app.route('/export',           exportRoutes)
app.route('/profil',           profilRoutes)

// Module Don de Sang + CNTS
app.route('/sang',             sangPatientRoutes)
app.route('/cnts',             cntsRoutes)

// Module IA medicale
app.route('/ia',               iaRoutes)

// Page de contact publique
app.route('/contact',          contactRoutes)

// Politique de confidentialite
app.route('/politique-confidentialite', politiqueRoutes)

// Page abonnement publique (tarifs + paiement + inscription structure)
app.route('/plans',                  plansRoutes)

// Paiements — DÉCOMMENTER quand clé API passerelle prête
app.route('/webhooks',      webhookRoutes)
app.route('/abonnement',    abonnementRoutes)

// Racine → Landing page (servie directement, sans redirect)
app.get('/',        (c) => c.html(landingPage()))
app.get('/public',  (c) => c.html(landingPage()))

// ─── 404 — page propre ────────────────────────────────────
app.notFound((c) => {
  const path = new URL(c.req.url).pathname
  return c.html(pageErreur(
    '404 — Page introuvable',
    `La page <code>${path}</code> n&#x27;existe pas.`,
    '/dashboard/medecin'
  ), 404)
})

// ─── Handler Cloudflare Pages ──────────────────────────────
const honoHandler = handle(app)

export async function onRequest(context: any) {
  try {
    return await honoHandler(context)
  } catch (err: any) {
    console.error('ERREUR CRITIQUE SantéBF:', err)
    const isDev    = context?.env?.ENVIRONMENT === 'development'
    const msgDebug = isDev && err?.message ? String(err.message) : null

    const html = pageErreur(
      'Erreur serveur',
      msgDebug
        ? `D&#xe9;tail : <code style="font-size:12px">${escHtml(msgDebug)}</code>`
        : 'Une erreur inattendue s&#x27;est produite. Veuillez r&#xe9;essayer.',
      '/auth/login'
    )

    return new Response(html, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=UTF-8' },
    })
  }
}

// ─── Helper page d'erreur HTML ────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
         .replace(/"/g,'&quot;').replace(/'/g,'&#x27;')
}

function pageErreur(titre: string, message: string, retourUrl: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${titre} | Sant&#xe9;BF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;min-height:100vh;
      display:flex;align-items:center;justify-content:center;padding:20px}
    .box{text-align:center;padding:48px 40px;background:white;border-radius:16px;
      box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:480px;width:100%}
    .ico{font-size:56px;margin-bottom:18px}
    h1{font-family:'DM Serif Display',serif;font-size:28px;color:#B71C1C;margin-bottom:12px}
    p{color:#6B7280;font-size:15px;line-height:1.6;margin-bottom:28px}
    code{background:#F3F4F6;padding:2px 6px;border-radius:4px;font-size:13px;color:#374151}
    .actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
    .btn{padding:12px 24px;border-radius:9px;font-size:14px;font-weight:600;
      text-decoration:none;display:inline-block;font-family:'DM Sans',sans-serif}
    .btn-primary{background:#4A148C;color:white}
    .btn-secondary{background:#F3F4F6;color:#374151;border:1px solid #E0E0E0}
  </style>
</head>
<body>
  <div class="box">
    <div class="ico">&#x26A0;&#xFE0F;</div>
    <h1>${titre}</h1>
    <p>${message}</p>
    <div class="actions">
      <a href="${retourUrl}" class="btn btn-primary">&#x2190; Retour</a>
      <a href="/auth/logout" class="btn btn-secondary">Se d&#xe9;connecter</a>
    </div>
    <p style="margin-top:20px;font-size:12px;color:#9E9E9E">
      Sant&#xe9;BF &mdash; Syst&#xe8;me National de Sant&#xe9; Num&#xe9;rique
    </p>
  </div>
</body>
</html>`
}
