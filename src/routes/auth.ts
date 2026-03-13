import { Hono } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { getSupabase, getProfil, redirectionParRole } from '../lib/supabase'
import { loginPage } from '../pages/login'
import { changerMdpPage } from '../pages/changer-mdp'
import type { Env } from '../../functions/_middleware'

export const authRoutes = new Hono<{ Bindings: Env }>()

// ── GET /auth/login — Affiche la page de connexion ─────────
authRoutes.get('/login', async (c) => {
  // Si déjà connecté → rediriger vers son dashboard
  const token = getCookie(c, 'sb_token')
  if (token) {
    const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) {
      const profil = await getProfil(supabase, user.id)
      if (profil?.est_actif) {
        return c.redirect(redirectionParRole(profil.role))
      }
    }
  }
  return c.html(loginPage())
})

// ── POST /auth/login — Traite la connexion ─────────────────
authRoutes.post('/login', async (c) => {
  const body = await c.req.parseBody()
  const email    = String(body.email    ?? '').trim().toLowerCase()
  const password = String(body.password ?? '').trim()

  // Validation basique
  if (!email || !password) {
    return c.html(loginPage('Veuillez remplir tous les champs.'))
  }

  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

  // ── Connexion Supabase Auth ────────────────────────────
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user || !data.session) {
    // Messages d'erreur clairs en français
    let msg = 'Email ou mot de passe incorrect.'
    if (error?.message?.includes('Email not confirmed')) {
      msg = 'Compte non confirmé. Contactez l\'administrateur.'
    } else if (error?.message?.includes('Invalid login')) {
      msg = 'Email ou mot de passe incorrect.'
    } else if (error?.message?.includes('Too many requests')) {
      msg = 'Trop de tentatives. Réessayez dans 15 minutes.'
    }
    return c.html(loginPage(msg))
  }

  // ── Récupérer le profil et vérifier les droits ─────────
  const profil = await getProfil(supabase, data.user.id)

  if (!profil) {
    return c.html(loginPage('Profil introuvable. Contactez l\'administrateur.'))
  }

  if (!profil.est_actif) {
    return c.html(loginPage('Compte désactivé. Contactez l\'administrateur.'))
  }

  // ── Stocker le token dans un cookie sécurisé ──────────
  setCookie(c, 'sb_token', data.session.access_token, {
    httpOnly: true,           // Inaccessible depuis JS (anti-XSS)
    secure: true,             // HTTPS uniquement
    sameSite: 'Lax',          // Anti-CSRF
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    path: '/',
  })

  // Stocker aussi le refresh token
  setCookie(c, 'sb_refresh', data.session.refresh_token ?? '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  // ── Forcer le changement de mot de passe si nécessaire ─
  if (profil.doit_changer_mdp) {
    return c.redirect('/auth/changer-mdp')
  }

  // ── Rediriger vers le bon dashboard selon le rôle ─────
  return c.redirect(redirectionParRole(profil.role))
})

// ── GET /auth/changer-mdp ──────────────────────────────────
authRoutes.get('/changer-mdp', (c) => {
  return c.html(changerMdpPage())
})

// ── POST /auth/changer-mdp ────────────────────────────────
authRoutes.post('/changer-mdp', async (c) => {
  const token = getCookie(c, 'sb_token')
  if (!token) return c.redirect('/auth/login')

  const body = await c.req.parseBody()
  const newPassword   = String(body.password ?? '')
  const confirmPassword = String(body.confirm ?? '')

  if (newPassword !== confirmPassword) {
    return c.html(changerMdpPage('Les mots de passe ne correspondent pas.'))
  }
  if (newPassword.length < 8) {
    return c.html(changerMdpPage('Le mot de passe doit faire au moins 8 caractères.'))
  }

  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  await supabase.auth.setSession({ access_token: token, refresh_token: getCookie(c, 'sb_refresh') ?? '' })

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    return c.html(changerMdpPage('Erreur lors du changement. Réessayez.'))
  }

  // Marquer doit_changer_mdp = false
  const { data: { user } } = await supabase.auth.getUser(token)
  if (user) {
    await supabase
      .from('auth_profiles')
      .update({ doit_changer_mdp: false })
      .eq('id', user.id)

    const profil = await getProfil(supabase, user.id)
    if (profil) return c.redirect(redirectionParRole(profil.role))
  }

  return c.redirect('/auth/login')
})

// ── GET /auth/logout — Déconnexion ────────────────────────
authRoutes.get('/logout', async (c) => {
  const token = getCookie(c, 'sb_token')
  if (token) {
    const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
    await supabase.auth.signOut()
  }
  deleteCookie(c, 'sb_token')
  deleteCookie(c, 'sb_refresh')
  return c.redirect('/auth/login')
})
