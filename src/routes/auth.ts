import { Hono } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { getSupabase, getProfil, redirectionParRole } from '../lib/supabase'
import { loginPage } from '../pages/login'
import { changerMdpPage } from '../pages/changer-mdp'
import { resetPasswordPage, resetConfirmPage } from '../pages/reset-password'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
export const authRoutes = new Hono<{ Bindings: Bindings }>()

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'Lax' as const,
  maxAge: 604800,
  path: '/'
}

// ── GET /auth/login ────────────────────────────────────────
authRoutes.get('/login', async (c) => {
  const token = getCookie(c, 'sb_token')
  if (token) {
    const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
    const { data: { user } } = await sb.auth.getUser(token)
    if (user) {
      const profil = await getProfil(sb, user.id)
      if (profil?.est_actif) return c.redirect(redirectionParRole(profil.role))
    }
  }
  const reset = new URL(c.req.url).searchParams.get('reset')
  return c.html(loginPage(undefined, reset === 'ok'))
})

// ── POST /auth/login ───────────────────────────────────────
authRoutes.post('/login', async (c) => {
  try {
    console.log('🔐 Tentative de connexion...')
    const body     = await c.req.parseBody()
    const email    = String(body.email    ?? '').trim().toLowerCase()
    const password = String(body.password ?? '').trim()

    console.log('📧 Email:', email)

    if (!email || !password) {
      console.log('⚠️ Champs manquants')
      return c.html(loginPage('Veuillez remplir tous les champs.'))
    }

    // Vérifier que les variables d'environnement sont configurées
    if (!c.env.SUPABASE_URL || !c.env.SUPABASE_ANON_KEY) {
      console.error('❌ Variables d\'environnement Cloudflare manquantes')
      console.error('SUPABASE_URL:', c.env.SUPABASE_URL ? '✓' : '✗')
      console.error('SUPABASE_ANON_KEY:', c.env.SUPABASE_ANON_KEY ? '✓' : '✗')
      return c.html(loginPage('⚠️ Configuration du serveur incomplète. Contactez l\'administrateur.'))
    }

    console.log('✓ Variables d\'environnement OK')

    const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
    console.log('✓ Client Supabase créé')

    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    console.log('Auth response - Success:', !!data.user, 'Error:', error?.message || 'none')

  if (error || !data.user || !data.session) {
    console.error('❌ Erreur d\'authentification:', error?.message)
    let msg = 'Email ou mot de passe incorrect.'
    if (error?.message?.includes('Too many'))       msg = 'Trop de tentatives. Réessayez dans 15 minutes.'
    if (error?.message?.includes('not confirmed'))  msg = "Compte non confirmé. Contactez l'administrateur."
    if (error?.message?.includes('Invalid login'))  msg = 'Email ou mot de passe incorrect.'
    return c.html(loginPage(msg))
  }

  console.log('✓ Authentification réussie pour:', data.user.email)

  const profil = await getProfil(sb, data.user.id)
  console.log('Profil récupéré:', profil ? `${profil.nom} ${profil.prenom} (${profil.role})` : 'null')

  if (!profil) {
    console.error('❌ Profil introuvable pour user:', data.user.id)
    return c.html(loginPage("Profil introuvable. Contactez l'administrateur."))
  }
  if (!profil.est_actif) {
    console.warn('⚠️ Compte désactivé pour:', profil.email)
    return c.html(loginPage("Compte désactivé. Contactez l'administrateur."))
  }

  console.log('✓ Profil actif, configuration des cookies...')

  setCookie(c, 'sb_token',   data.session.access_token,        COOKIE_OPTS)
  setCookie(c, 'sb_refresh', data.session.refresh_token ?? '', COOKIE_OPTS)

  console.log('✓ Cookies configurés')

  const destination = profil.doit_changer_mdp ? '/auth/changer-mdp' : redirectionParRole(profil.role)
  console.log('✅ Redirection vers:', destination)

  if (profil.doit_changer_mdp) return c.redirect('/auth/changer-mdp')
  return c.redirect(redirectionParRole(profil.role))
  } catch (err) {
    console.error('❌ Erreur critique login:', err)
    console.error('Stack:', err instanceof Error ? err.stack : 'N/A')
    const message = err instanceof Error ? err.message : 'Erreur serveur inconnue'
    return c.html(loginPage(`❌ Erreur serveur: ${message}. Contactez l'administrateur si le problème persiste.`))
  }
})

// ── GET /auth/changer-mdp ──────────────────────────────────
authRoutes.get('/changer-mdp', (c) => c.html(changerMdpPage()))

// ── POST /auth/changer-mdp ─────────────────────────────────
authRoutes.post('/changer-mdp', async (c) => {
  const token   = getCookie(c, 'sb_token')
  const refresh = getCookie(c, 'sb_refresh')
  if (!token) return c.redirect('/auth/login')

  const body    = await c.req.parseBody()
  const newPwd  = String(body.password ?? '')
  const confirm = String(body.confirm  ?? '')

  if (newPwd !== confirm)
    return c.html(changerMdpPage('Les mots de passe ne correspondent pas.'))
  if (newPwd.length < 8)
    return c.html(changerMdpPage('Minimum 8 caractères.'))
  if (!/[A-Z]/.test(newPwd))
    return c.html(changerMdpPage('Au moins 1 majuscule requise.'))
  if (!/[0-9]/.test(newPwd))
    return c.html(changerMdpPage('Au moins 1 chiffre requis.'))
  if (!/[#@!$%]/.test(newPwd))
    return c.html(changerMdpPage('Au moins 1 caractère spécial (#@!$%).'))

  const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  await sb.auth.setSession({ access_token: token, refresh_token: refresh ?? '' })
  const { error } = await sb.auth.updateUser({ password: newPwd })
  if (error) return c.html(changerMdpPage('Erreur : ' + error.message))

  const { data: { user } } = await sb.auth.getUser(token)
  if (user) {
    await sb.from('auth_profiles').update({ doit_changer_mdp: false }).eq('id', user.id)
    const profil = await getProfil(sb, user.id)
    if (profil) return c.redirect(redirectionParRole(profil.role))
  }
  return c.redirect('/auth/login')
})

// ── GET /auth/reset-password ───────────────────────────────
authRoutes.get('/reset-password', (c) => c.html(resetPasswordPage()))

// ── POST /auth/reset-password ──────────────────────────────
// Supabase envoie l'email automatiquement — on appelle juste l'API
authRoutes.post('/reset-password', async (c) => {
  const body  = await c.req.parseBody()
  const email = String(body.email ?? '').trim().toLowerCase()
  if (!email) return c.html(resetPasswordPage('Entrez votre adresse email.'))

  const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  // IMPORTANT: redirectTo doit pointer vers la page /auth/reset-confirm de votre site
  const baseUrl = new URL(c.req.url).origin
  await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/reset-confirm`,
  })
  // Toujours afficher succès même si email inconnu (sécurité)
  return c.html(resetPasswordPage(undefined, true))
})

// ── GET /auth/reset-confirm ────────────────────────────────
// Supabase redirige ici après clic sur le lien dans l'email
// Le lien contient access_token et type=recovery dans l'URL (fragment #)
authRoutes.get('/reset-confirm', async (c) => {
  // Les tokens arrivent dans le fragment d'URL (#access_token=xxx&type=recovery)
  // On doit les extraire côté client avec JavaScript
  return c.html(resetConfirmPage())
})

// ── POST /auth/reset-confirm ───────────────────────────────
authRoutes.post('/reset-confirm', async (c) => {
  try {
    const body    = await c.req.parseBody()
    const newPwd  = String(body.password ?? '')
    const confirm = String(body.confirm  ?? '')
    const token   = String(body.access_token ?? '').trim() // Envoyé depuis le formulaire

    // Validation mot de passe
    if (newPwd !== confirm)
      return c.html(resetConfirmPage('Les mots de passe ne correspondent pas.'))
    if (newPwd.length < 8)
      return c.html(resetConfirmPage('Minimum 8 caractères.'))
    if (!/[A-Z]/.test(newPwd))
      return c.html(resetConfirmPage('Au moins 1 majuscule.'))
    if (!/[0-9]/.test(newPwd))
      return c.html(resetConfirmPage('Au moins 1 chiffre.'))
    if (!/[#@!$%]/.test(newPwd))
      return c.html(resetConfirmPage('Au moins 1 caractère spécial (#@!$%).'))

    // Vérifier le token de récupération
    if (!token)
      return c.html(resetConfirmPage('Session expirée. Refaites la demande de reset.'))

    const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
    
    // Valider le token et récupérer la session de récupération
    const { data: sessionData, error: sessionError } = await sb.auth.getUser(token)
    if (sessionError || !sessionData.user) {
      console.error('❌ Token invalide:', sessionError?.message)
      return c.html(resetConfirmPage('Lien expiré ou invalide. Refaites la demande.'))
    }

    // Établir la session avec le token de récupération
    const { error: setError } = await sb.auth.setSession({
      access_token: token,
      refresh_token: '' // Pas de refresh token pour recovery
    })
    if (setError) {
      console.error('❌ Erreur setSession:', setError.message)
      return c.html(resetConfirmPage('Erreur lors de la validation du lien.'))
    }

    // Mettre à jour le mot de passe
    const { error } = await sb.auth.updateUser({ password: newPwd })
    if (error) {
      console.error('❌ Erreur updateUser:', error.message)
      return c.html(resetConfirmPage('Impossible de changer le mot de passe. Refaites la demande.'))
    }

    // Déconnexion de la session de récupération
    await sb.auth.signOut()

    return c.redirect('/auth/login?reset=ok')
  } catch (err) {
    console.error('❌ Erreur reset-confirm:', err)
    return c.html(resetConfirmPage('Erreur serveur. Réessayez.'))
  }
})

// ── GET /auth/logout ───────────────────────────────────────
authRoutes.get('/logout', async (c) => {
  const token = getCookie(c, 'sb_token')
  if (token) {
    const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
    await sb.auth.signOut()
  }
  deleteCookie(c, 'sb_token',   { path: '/' })
  deleteCookie(c, 'sb_refresh', { path: '/' })
  return c.redirect('/auth/login')
})
