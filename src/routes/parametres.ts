/**
 * src/routes/parametres.ts
 * SantéBF — Routes paramètres utilisateur + Google Calendar
 *
 * CORRECTIONS APPLIQUÉES :
 *   [LM-07] Callback OAuth Google Calendar implémenté correctement
 *   [LM-04] user_settings utilise user_id (pas profile_id) — corrigé
 *   [S-13]  google_calendar_refresh_token : note de sécurité ajoutée
 *   [QC-10] Déstructuration { data, error } + vérification
 *   [S-09]  escapeHtml() sur toutes les données HTML
 *   CONSERVÉ : Structure et logique existantes
 */

import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { requireAuth } from '../middleware/auth'
import { getSupabase, type Bindings, type Variables, escapeHtml } from '../lib/supabase'
import { validateEmail, sanitizeInput } from '../utils/validation'

export const parametresRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

parametresRoutes.use('/*', requireAuth)

// ── GET /parametres ───────────────────────────────────────────────────────────
parametresRoutes.get('/', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    // [LM-04] user_settings.user_id (pas profile_id — corrigé selon DB réelle)
    const { data: settings, error: settErr } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', profil.id)
      .single()

    if (settErr && settErr.code !== 'PGRST116') {
      console.warn('[parametres/] settings:', settErr.message)
    }

    // Google Calendar : vérifier si connecté
    const gcalConnected = !!(settings?.google_calendar_enabled && settings?.google_calendar_refresh_token)

    return c.html(pageParametres(profil, settings, gcalConnected))

  } catch (err) {
    console.error('[parametres/]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── POST /parametres/profil ───────────────────────────────────────────────────
parametresRoutes.post('/profil', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const body      = await c.req.parseBody()
    const telephone = sanitizeInput(String(body.telephone ?? ''), 20)
    const email     = String(body.email ?? '').trim().toLowerCase()

    if (email && !validateEmail(email)) {
      return c.json({ success: false, error: 'Email invalide' }, 400)
    }

    const updateData: any = {
      telephone:  telephone || null,
      updated_at: new Date().toISOString()
    }
    if (email) updateData.email = email

    const { error } = await supabase
      .from('auth_profiles')
      .update(updateData)
      .eq('id', profil.id)

    if (error) {
      console.error('[parametres/profil]', error.message)
      return c.json({ success: false, error: error.message }, 500)
    }

    return c.json({ success: true })

  } catch (err) {
    console.error('[parametres/profil]', err)
    return c.json({ success: false, error: 'Erreur serveur' }, 500)
  }
})

// ── POST /parametres/notifications ────────────────────────────────────────────
parametresRoutes.post('/notifications', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const body = await c.req.parseBody()

    const settings = {
      // [LM-04] user_id (pas profile_id)
      user_id:              profil.id,
      email_notifications:  body.email_notifications === 'on',
      email_rdv_rappel:     body.email_rdv_rappel === 'on',
      email_resultats:      body.email_resultats === 'on',
      email_ordonnances:    body.email_ordonnances === 'on',
      updated_at:           new Date().toISOString()
    }

    // [QC-10] Vérification erreur avec upsert
    const { error } = await supabase
      .from('user_settings')
      .upsert(settings, { onConflict: 'user_id' })

    if (error) {
      console.error('[parametres/notifications]', error.message)
      return c.json({ success: false, error: error.message }, 500)
    }

    return c.json({ success: true })

  } catch (err) {
    console.error('[parametres/notifications]', err)
    return c.json({ success: false, error: 'Erreur serveur' }, 500)
  }
})

// ── GET /parametres/google-calendar ───────────────────────────────────────────
// Lance le flux OAuth Google Calendar
parametresRoutes.get('/google-calendar', async (c) => {
  const clientId    = c.env.GOOGLE_CLIENT_ID
  const redirectUri = `${new URL(c.req.url).origin}/parametres/google-calendar/callback`

  if (!clientId) {
    return c.html(pageErreur('Google Calendar non configuré', 'GOOGLE_CLIENT_ID manquant dans les variables Cloudflare.'))
  }

  const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.events')
  const state = crypto.randomUUID()

  // Stocker le state dans un cookie pour vérification au callback
  setCookie(c, 'gcal_state', state, {
    httpOnly: true,
    secure:   true,
    sameSite: 'Lax',
    maxAge:   600,  // 10 minutes
    path:     '/'
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${scope}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=${state}`

  return c.redirect(authUrl)
})

// ── GET /parametres/google-calendar/callback ──────────────────────────────────
// [LM-07] CORRECTION : Callback OAuth Google Calendar implémenté correctement
parametresRoutes.get('/google-calendar/callback', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const url    = new URL(c.req.url)
    const code   = url.searchParams.get('code')
    const state  = url.searchParams.get('state')
    const error  = url.searchParams.get('error')
    const storedState = getCookie(c, 'gcal_state')

    // Gestion erreur OAuth
    if (error) {
      console.warn('[gcal/callback] OAuth error:', error)
      return c.redirect('/parametres?gcal=error&reason=' + encodeURIComponent(error))
    }

    // Vérification CSRF state
    if (!state || !storedState || state !== storedState) {
      console.warn('[gcal/callback] State mismatch — possible CSRF')
      return c.redirect('/parametres?gcal=error&reason=state_mismatch')
    }

    if (!code) {
      return c.redirect('/parametres?gcal=error&reason=no_code')
    }

    const clientId     = c.env.GOOGLE_CLIENT_ID
    const clientSecret = c.env.GOOGLE_CLIENT_SECRET
    const redirectUri  = `${url.origin}/parametres/google-calendar/callback`

    if (!clientId || !clientSecret) {
      return c.redirect('/parametres?gcal=error&reason=missing_config')
    }

    // Échanger le code contre les tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code'
      })
    })

    const tokenData = await tokenRes.json() as any

    if (tokenData.error || !tokenData.access_token) {
      console.error('[gcal/callback] token exchange:', tokenData.error, tokenData.error_description)
      return c.redirect('/parametres?gcal=error&reason=token_exchange')
    }

    // [S-13] Note : le refresh_token est stocké en clair pour l'instant
    // TODO : Chiffrer avec encrypt_google_token() (migration 010) avant production
    const { error: upsertErr } = await supabase
      .from('user_settings')
      .upsert({
        // [LM-04] user_id (pas profile_id — corrigé selon DB réelle)
        user_id:                         profil.id,
        google_calendar_enabled:         true,
        google_calendar_refresh_token:   tokenData.refresh_token ?? null,
        google_calendar_access_token:    tokenData.access_token,
        google_calendar_token_expires:   tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null,
        updated_at:                      new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (upsertErr) {
      console.error('[gcal/callback] upsert settings:', upsertErr.message)
      return c.redirect('/parametres?gcal=error&reason=db_error')
    }

    return c.redirect('/parametres?gcal=success')

  } catch (err) {
    console.error('[gcal/callback]', err)
    return c.redirect('/parametres?gcal=error&reason=server_error')
  }
})

// ── POST /parametres/google-calendar/deconnecter ──────────────────────────────
parametresRoutes.post('/google-calendar/deconnecter', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    // [LM-04] user_id (pas profile_id)
    const { error } = await supabase
      .from('user_settings')
      .update({
        google_calendar_enabled:       false,
        google_calendar_refresh_token: null,
        google_calendar_access_token:  null,
        google_calendar_token_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', profil.id)

    if (error) {
      console.error('[gcal/deconnecter]', error.message)
      return c.json({ success: false, error: error.message }, 500)
    }

    return c.json({ success: true })

  } catch (err) {
    console.error('[parametres/google-calendar/deconnecter]', err)
    return c.json({ success: false, error: 'Erreur serveur' }, 500)
  }
})

// ─── Pages HTML ───────────────────────────────────────────────────────────────

function pageParametres(profil: any, settings: any, gcalConnected: boolean): string {
  const url    = typeof globalThis !== 'undefined' ? null : null // Cloudflare Workers context
  const gcalOk = new URLSearchParams().get('gcal') === 'success'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Paramètres | SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;color:#1a1a2e}
    header{background:#4A148C;padding:14px 20px;color:white}
    .main{max-width:800px;margin:0 auto;padding:24px 16px}
    .card{background:white;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:16px}
    .card-title{font-weight:700;font-size:16px;margin-bottom:16px;color:#4A148C}
    label{display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:#374151}
    input,select{width:100%;padding:10px 12px;border:1px solid #E0E0E0;border-radius:8px;font-size:13px;margin-bottom:12px;font-family:inherit}
    .toggle{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F0F0F0;margin-bottom:8px}
    .toggle:last-child{border-bottom:none}
    input[type=checkbox]{width:auto;accent-color:#4A148C}
    .btn{padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;display:inline-block;text-decoration:none}
    .btn-primary{background:#4A148C;color:white}
    .btn-danger{background:#C62828;color:white}
    .btn-google{background:white;color:#374151;border:1px solid #E0E0E0;display:flex;align-items:center;gap:8px}
    .alert{padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px}
    .alert-success{background:#E8F5E9;color:#1B5E20}
    .alert-error{background:#FFEBEE;color:#C62828}
    .info-item{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F0F0F0}
    .info-label{font-size:13px;color:#6B7280}
    .info-value{font-size:14px;font-weight:600}
  </style>
</head>
<body>
<header>
  <div style="font-family:'DM Serif Display',serif;font-size:18px">⚙️ Paramètres SantéBF</div>
</header>
<main class="main">
  <h1 style="font-family:'DM Serif Display',serif;font-size:24px;color:#4A148C;margin-bottom:20px">Mes paramètres</h1>

  <script>
    // Gestion des messages URL params
    const params = new URLSearchParams(location.search)
    if (params.get('gcal') === 'success') {
      document.addEventListener('DOMContentLoaded', () => {
        const div = document.createElement('div')
        div.className = 'alert alert-success'
        div.textContent = '✅ Google Calendar connecté avec succès !'
        document.querySelector('.main').prepend(div)
      })
    } else if (params.get('gcal') === 'error') {
      document.addEventListener('DOMContentLoaded', () => {
        const div = document.createElement('div')
        div.className = 'alert alert-error'
        div.textContent = '❌ Erreur lors de la connexion Google Calendar : ' + (params.get('reason') || 'erreur inconnue')
        document.querySelector('.main').prepend(div)
      })
    }
  </script>

  <div class="card">
    <div class="card-title">👤 Mon profil</div>
    <div class="info-item">
      <div class="info-label">Nom complet</div>
      <div class="info-value">${escapeHtml(profil.prenom)} ${escapeHtml(profil.nom)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Email</div>
      <div class="info-value">${escapeHtml(profil.email) || '—'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Rôle</div>
      <div class="info-value">${escapeHtml(profil.role)}</div>
    </div>
    
    <form style="margin-top:16px" onsubmit="modifierProfil(event)">
      <label>Téléphone</label>
      <input type="tel" id="telephone" value="${escapeAttr(profil.telephone) || ''}">
      <button type="submit" class="btn btn-primary">Sauvegarder</button>
    </form>
  </div>

  <div class="card">
    <div class="card-title">🔔 Notifications email</div>
    <form onsubmit="sauveNotifs(event)">
      <div class="toggle">
        <input type="checkbox" id="email_notifications" name="email_notifications" ${settings?.email_notifications ? 'checked' : ''}>
        <label for="email_notifications">Activer les notifications email</label>
      </div>
      <div class="toggle">
        <input type="checkbox" id="email_rdv_rappel" name="email_rdv_rappel" ${settings?.email_rdv_rappel ? 'checked' : ''}>
        <label for="email_rdv_rappel">Rappels de rendez-vous</label>
      </div>
      <div class="toggle">
        <input type="checkbox" id="email_resultats" name="email_resultats" ${settings?.email_resultats ? 'checked' : ''}>
        <label for="email_resultats">Résultats d'examens disponibles</label>
      </div>
      <div class="toggle">
        <input type="checkbox" id="email_ordonnances" name="email_ordonnances" ${settings?.email_ordonnances ? 'checked' : ''}>
        <label for="email_ordonnances">Nouvelles ordonnances</label>
      </div>
      <button type="submit" class="btn btn-primary" style="margin-top:12px">Sauvegarder</button>
    </form>
  </div>

  <div class="card">
    <div class="card-title">📅 Google Calendar</div>
    ${gcalConnected ? `
    <div class="alert alert-success">✅ Google Calendar est connecté</div>
    <button onclick="deconnecterGcal()" class="btn btn-danger">Déconnecter Google Calendar</button>` : `
    <p style="color:#6B7280;font-size:14px;margin-bottom:16px">
      Connectez votre Google Calendar pour synchroniser automatiquement vos rendez-vous.
    </p>
    <a href="/parametres/google-calendar" class="btn btn-google">
      <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      Connecter Google Calendar
    </a>`}
  </div>

  <div class="card">
    <div class="card-title">🔐 Sécurité</div>
    <a href="/auth/changer-mdp" class="btn btn-primary">Changer mon mot de passe</a>
  </div>
</main>

<script>
  async function modifierProfil(e) {
    e.preventDefault()
    const res = await fetch('/parametres/profil', {
      method: 'POST',
      body: new FormData(e.target)
    })
    const d = await res.json()
    alert(d.success ? '✅ Profil mis à jour' : '❌ Erreur : ' + d.error)
  }
  
  async function sauveNotifs(e) {
    e.preventDefault()
    const data = new FormData(e.target)
    // Ajouter manuellement les checkboxes non cochées
    ;['email_notifications','email_rdv_rappel','email_resultats','email_ordonnances'].forEach(n => {
      if (!data.has(n)) data.append(n, 'off')
    })
    const res = await fetch('/parametres/notifications', { method:'POST', body: data })
    const d = await res.json()
    alert(d.success ? '✅ Paramètres sauvegardés' : '❌ Erreur : ' + d.error)
  }
  
  async function deconnecterGcal() {
    if (!confirm('Déconnecter Google Calendar ?')) return
    const res = await fetch('/parametres/google-calendar/deconnecter', { method:'POST' })
    const d = await res.json()
    if (d.success) location.reload()
    else alert('❌ Erreur : ' + d.error)
  }
</script>
</body>
</html>`
}

function escapeAttr(s: string | null | undefined): string {
  if (!s) return ''
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;')
}

function pageErreur(titre: string, message: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${escapeHtml(titre)}</title></head>
  <body style="font-family:sans-serif;padding:40px;text-align:center">
    <h1 style="color:#C62828">${escapeHtml(titre)}</h1>
    <p style="color:#6B7280;margin:16px 0">${escapeHtml(message)}</p>
    <a href="/parametres" style="background:#4A148C;color:white;padding:10px 20px;border-radius:8px;text-decoration:none">← Retour</a>
  </body></html>`
}