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
  const body     = await c.req.parseBody()
  const email    = String(body.email    ?? '').trim().toLowerCase()
  const password = String(body.password ?? '').trim()

  if (!email || !password)
    return c.html(loginPage('Veuillez remplir tous les champs.'))

  const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  const { data, error } = await sb.auth.signInWithPassword({ email, password })

  if (error || !data.user || !data.session) {
    let msg = 'Email ou mot de passe incorrect.'
    if (error?.message?.includes('Too many'))       msg = 'Trop de tentatives. Réessayez dans 15 minutes.'
    if (error?.message?.includes('not confirmed'))  msg = "Compte non confirmé. Contactez l'administrateur."
    if (error?.message?.includes('Invalid login'))  msg = 'Email ou mot de passe incorrect.'
    return c.html(loginPage(msg))
  }

  const profil = await getProfil(sb, data.user.id)
  if (!profil)
    return c.html(loginPage("Profil introuvable. Contactez l'administrateur."))
  if (!profil.est_actif)
    return c.html(loginPage("Compte désactivé. Contactez l'administrateur."))

  setCookie(c, 'sb_token',   data.session.access_token,        COOKIE_OPTS)
  setCookie(c, 'sb_refresh', data.session.refresh_token ?? '', COOKIE_OPTS)

  if (profil.doit_changer_mdp) return c.redirect('/auth/changer-mdp')
  return c.redirect(redirectionParRole(profil.role))
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
  await sb.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://santebf.izicardouaga.com/auth/reset-confirm',
  })
  // Toujours afficher succès même si email inconnu (sécurité)
  return c.html(resetPasswordPage(undefined, true))
})

// ── GET /auth/reset-confirm ────────────────────────────────
// Supabase redirige ici après clic sur le lien dans l'email
authRoutes.get('/reset-confirm', (c) => c.html(resetConfirmPage()))

// ── POST /auth/reset-confirm ───────────────────────────────
authRoutes.post('/reset-confirm', async (c) => {
  const body    = await c.req.parseBody()
  const newPwd  = String(body.password ?? '')
  const confirm = String(body.confirm  ?? '')

  if (newPwd !== confirm)
    return c.html(resetConfirmPage('Les mots de passe ne correspondent pas.'))
  if (newPwd.length < 8)
    return c.html(resetConfirmPage('Minimum 8 caractères.'))
  if (!/[A-Z]/.test(newPwd))
    return c.html(resetConfirmPage('Au moins 1 majuscule.'))
  if (!/[0-9]/.test(newPwd))
    return c.html(resetConfirmPage('Au moins 1 chiffre.'))

  const token   = getCookie(c, 'sb_token')
  const refresh = getCookie(c, 'sb_refresh')
  if (!token && !refresh)
    return c.html(resetConfirmPage('Session expirée. Refaites la demande de reset.'))

  const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  if (token && refresh) {
    await sb.auth.setSession({ access_token: token, refresh_token: refresh })
  }
  const { error } = await sb.auth.updateUser({ password: newPwd })
  if (error) return c.html(resetConfirmPage('Lien expiré ou invalide. Refaites la demande.'))

  return c.redirect('/auth/login?reset=ok')
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
