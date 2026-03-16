import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import { pageSkeleton } from './dashboard'
import type { AuthProfile } from '../lib/supabase' 
import { alertHTML } from '../components/alert'

export const parametresRoutes = new Hono()

parametresRoutes.use('*', requireAuth)

/**
 * GET /parametres
 */
parametresRoutes.get('/', async (c) => {
  const profil = c.get('profil') as AuthProfile
  const supabase = c.get('supabase')

  try {
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', profil.id)
      .single()

    let userSettings = settings
    if (error || !settings) {
      const defaultSettings = {
        user_id: profil.id,
        email_notifications: true,
        email_rdv_rappel: true,
        email_resultats: true,
        email_ordonnances: true,
        google_calendar_enabled: false,
        google_calendar_refresh_token: null
      }
      const { data: newSettings } = await supabase
        .from('user_settings')
        .insert(defaultSettings)
        .select()
        .single()
      userSettings = newSettings || defaultSettings
    }

    // ✅ CORRECTION : pageSkeleton attend (profil, titre, couleur, contenu)
    // L'ancienne version appelait (profil, titre, contenu) — couleur manquante
    const couleur = '#1A6B3C'
    const html = pageSkeleton(profil, 'Paramètres', couleur, parametresContent(profil, userSettings))

    return c.html(html)
  } catch (err) {
    console.error('Erreur chargement paramètres:', err)
    return c.html(pageSkeleton(profil, 'Erreur', '#1A6B3C', alertHTML('error', 'Erreur lors du chargement des paramètres')))
  }
})

/**
 * POST /parametres/email
 */
parametresRoutes.post('/email', async (c) => {
  const profil = c.get('profil') as AuthProfile
  const supabase = c.get('supabase')

  try {
    const formData = await c.req.formData()
    const settings = {
      email_notifications: formData.get('email_notifications') === 'on',
      email_rdv_rappel:    formData.get('email_rdv_rappel') === 'on',
      email_resultats:     formData.get('email_resultats') === 'on',
      email_ordonnances:   formData.get('email_ordonnances') === 'on'
    }

    const { error } = await supabase.from('user_settings').upsert({
      user_id: profil.id,
      ...settings,
      updated_at: new Date().toISOString()
    })

    if (error) throw error
    return c.redirect('/parametres?success=email')
  } catch (err) {
    console.error('Erreur mise à jour email:', err)
    return c.redirect('/parametres?error=email')
  }
})

/**
 * POST /parametres/google-calendar/connect
 */
parametresRoutes.post('/google-calendar/connect', async (c) => {
  const profil = c.get('profil') as AuthProfile
  const redirectUri = `${c.req.url.split('/parametres')[0]}/parametres/google-calendar/callback`
  const scopes = 'https://www.googleapis.com/auth/calendar.events'
  const clientId = (c as any).env?.GOOGLE_CLIENT_ID

  if (!clientId) return c.redirect('/parametres?error=google_not_configured')

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('state', profil.id)

  return c.redirect(authUrl.toString())
})

/**
 * GET /parametres/google-calendar/callback
 */
parametresRoutes.get('/google-calendar/callback', async (c) => {
  const supabase = c.get('supabase')

  try {
    const code  = c.req.query('code')
    const state = c.req.query('state')
    const err   = c.req.query('error')

    if (err) return c.redirect('/parametres?error=google_denied')
    if (!code || !state) return c.redirect('/parametres?error=google_invalid')

    const clientId     = (c as any).env?.GOOGLE_CLIENT_ID
    const clientSecret = (c as any).env?.GOOGLE_CLIENT_SECRET
    const redirectUri  = `${c.req.url.split('/parametres')[0]}/parametres/google-calendar/callback`

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId!, client_secret: clientSecret!, redirect_uri: redirectUri, grant_type: 'authorization_code' })
    })

    const tokens = await tokenResponse.json()
    if (!tokens.refresh_token) return c.redirect('/parametres?error=google_no_token')

    const { error: updateError } = await supabase.from('user_settings').upsert({
      user_id: state,
      google_calendar_enabled: true,
      google_calendar_refresh_token: tokens.refresh_token,
      updated_at: new Date().toISOString()
    })

    if (updateError) throw updateError
    return c.redirect('/parametres?success=google_connected')
  } catch (err) {
    console.error('Erreur callback Google:', err)
    return c.redirect('/parametres?error=google_error')
  }
})

/**
 * POST /parametres/google-calendar/disconnect
 */
parametresRoutes.post('/google-calendar/disconnect', async (c) => {
  const profil = c.get('profil') as AuthProfile
  const supabase = c.get('supabase')

  try {
    const { error } = await supabase.from('user_settings').update({
      google_calendar_enabled: false,
      google_calendar_refresh_token: null,
      updated_at: new Date().toISOString()
    }).eq('user_id', profil.id)

    if (error) throw error
    return c.redirect('/parametres?success=google_disconnected')
  } catch (err) {
    console.error('Erreur déconnexion Google:', err)
    return c.redirect('/parametres?error=google_disconnect_error')
  }
})

// ── Contenu HTML de la page paramètres ────────────────────
function parametresContent(profil: AuthProfile, settings: any): string {
  const s = settings || {}
  return `
    <style>
      .param-card { background:white; border-radius:12px; padding:24px; margin-bottom:20px; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
      .param-card h2 { font-size:16px; font-weight:700; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
      .check-row { display:flex; align-items:flex-start; gap:12px; padding:10px 0; border-bottom:1px solid #F3F4F6; }
      .check-row:last-child { border-bottom:none; }
      .check-row input[type=checkbox] { width:18px; height:18px; margin-top:2px; accent-color:#1A6B3C; flex-shrink:0; }
      .check-label { font-size:14px; font-weight:600; color:#1A1A2E; margin-bottom:2px; }
      .check-sub { font-size:12px; color:#6B7280; }
      .btn-save { background:#1A6B3C; color:white; border:none; padding:10px 22px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; margin-top:16px; }
      .btn-disconnect { background:#fce8e8; color:#b71c1c; border:none; padding:10px 22px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; }
      .btn-connect { background:#1565C0; color:white; border:none; padding:10px 22px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; }
      .gcal-connected { background:#e8f5e9; border:1px solid #a5d6a7; border-radius:8px; padding:14px; margin-bottom:14px; }
      .gcal-info { background:#e8f0fe; border:1px solid #90caf9; border-radius:8px; padding:14px; margin-bottom:14px; font-size:13px; }
      .gcal-info ul { margin-left:16px; margin-top:8px; }
      .gcal-info li { margin-bottom:4px; }
      .info-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #F3F4F6; font-size:13px; }
      .info-row:last-child { border-bottom:none; }
      .info-label { color:#6B7280; }
      .info-val { font-weight:600; }
    </style>

    <!-- Notifications Email -->
    <div class="param-card">
      <h2>📧 Notifications par email</h2>
      <form method="POST" action="/parametres/email">
        <div class="check-row">
          <input type="checkbox" name="email_notifications" id="notif" ${s.email_notifications ? 'checked' : ''}>
          <div>
            <div class="check-label">Activer les notifications email</div>
            <div class="check-sub">Recevoir des emails pour les événements importants</div>
          </div>
        </div>
        <div style="margin-left:30px">
          <div class="check-row">
            <input type="checkbox" name="email_rdv_rappel" ${s.email_rdv_rappel ? 'checked' : ''}>
            <div><div class="check-label">Rappels de rendez-vous</div><div class="check-sub">1 jour avant le RDV</div></div>
          </div>
          <div class="check-row">
            <input type="checkbox" name="email_resultats" ${s.email_resultats ? 'checked' : ''}>
            <div><div class="check-label">Résultats d'examens disponibles</div></div>
          </div>
          <div class="check-row">
            <input type="checkbox" name="email_ordonnances" ${s.email_ordonnances ? 'checked' : ''}>
            <div><div class="check-label">Nouvelles ordonnances et certificats</div></div>
          </div>
        </div>
        <button type="submit" class="btn-save">Enregistrer</button>
      </form>
    </div>

    <!-- Google Calendar -->
    <div class="param-card">
      <h2>📅 Google Calendar</h2>
      ${s.google_calendar_enabled ? `
        <div class="gcal-connected">
          <strong style="color:#1A6B3C">✓ Connecté à Google Calendar</strong>
          <p style="font-size:13px;color:#2e7d32;margin-top:4px">Vos RDV médicaux sont synchronisés automatiquement.</p>
        </div>
        <form method="POST" action="/parametres/google-calendar/disconnect">
          <button type="submit" class="btn-disconnect">Déconnecter Google Calendar</button>
        </form>
      ` : `
        <div class="gcal-info">
          <strong>Synchronisez vos rendez-vous avec Google Calendar (Gratuit)</strong>
          <ul>
            <li>✓ Ajout automatique des nouveaux RDV</li>
            <li>✓ Rappels Google (1 jour + 1 heure avant)</li>
            <li>✓ Mise à jour si RDV modifié/annulé</li>
            <li>✓ 100% gratuit avec votre compte Google</li>
          </ul>
        </div>
        <form method="POST" action="/parametres/google-calendar/connect">
          <button type="submit" class="btn-connect">Connecter Google Calendar</button>
        </form>
      `}
      <p style="font-size:11px;color:#9E9E9E;margin-top:12px">Connexion OAuth2 sécurisée. Vous pouvez révoquer l'accès à tout moment.</p>
    </div>

    <!-- Informations personnelles -->
    <div class="param-card">
      <h2>👤 Informations personnelles</h2>
      <div class="info-row"><span class="info-label">Nom complet</span><span class="info-val">${profil.prenom} ${profil.nom}</span></div>
      <div class="info-row"><span class="info-label">Rôle</span><span class="info-val">${profil.role.replace(/_/g,' ')}</span></div>
      ${profil.structure_id ? `<div class="info-row"><span class="info-label">Structure</span><span class="info-val">#${profil.structure_id}</span></div>` : ''}
      <div style="margin-top:14px">
        <a href="/auth/changer-mdp" style="color:#1A6B3C;font-size:13px;font-weight:600">Changer mon mot de passe →</a>
      </div>
    </div>
  `
}
