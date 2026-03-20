/**
 * src/routes/auth.ts
 * SantéBF — Authentification
 *
 * Corrections :
 *   1. POST /changer-mdp : après updateUser(), récupérer la NOUVELLE session
 *      pour avoir un token valide avant d'appeler getProfil()
 *      (l'ancien token est invalidé dès que le MDP change)
 *   2. POST /changer-mdp : si le profil vient du middleware (doit_changer_mdp),
 *      utiliser getSession() au lieu de getUser(ancien_token)
 */

import { Hono } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { getSupabase, getProfil, redirectionParRole, type Bindings } from '../lib/supabase'
import { loginPage }              from '../pages/login'
import { changerMdpPage }         from '../pages/changer-mdp'
import { resetPasswordPage, resetConfirmPage } from '../pages/reset-password'
import { inscriptionPatientPage } from '../pages/inscription-patient'
import { accueilPatientAppPage }  from '../pages/accueil-patient-app'

export const authRoutes = new Hono<{ Bindings: Bindings }>()

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   true,
  sameSite: 'Lax' as const,
  maxAge:   604800,
  path:     '/',
}


// ── GET /auth/welcome ─────────────────────────────────────
// Page d'accueil de l'application mobile patient
// Affiche : "J'ai déjà un compte" | "Créer mon compte"

authRoutes.get('/welcome', (c) => c.html(accueilPatientAppPage()))

// ── GET /auth/login ───────────────────────────────────────

authRoutes.get('/login', async (c) => {
  try {
    const token = getCookie(c, 'sb_token')
    if (token) {
      const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
      const { data: { user } } = await sb.auth.getUser(token)
      if (user) {
        const profil = await getProfil(sb, user.id)
        if (profil?.est_actif) {
          return c.redirect(
            profil.doit_changer_mdp ? '/auth/changer-mdp' : redirectionParRole(profil.role)
          )
        }
      }
    }
    const params      = new URL(c.req.url).searchParams
    const reset       = params.get('reset')
    const inscription = params.get('inscription')
    return c.html(loginPage(undefined, reset === 'ok', inscription === 'ok'))
  } catch (err) {
    console.error('GET /login:', err)
    return c.html(loginPage('Erreur serveur. Réessayez.'))
  }
})

// ── POST /auth/login ──────────────────────────────────────

authRoutes.post('/login', async (c) => {
  try {
    const body     = await c.req.parseBody()
    const email    = String(body.email    ?? '').trim().toLowerCase()
    const password = String(body.password ?? '').trim()

    if (!email || !password) {
      return c.html(loginPage('Veuillez remplir tous les champs.'))
    }
    if (!c.env.SUPABASE_URL || !c.env.SUPABASE_ANON_KEY) {
      return c.html(loginPage('Configuration serveur incomplète. Contactez l\'administrateur.'))
    }

    const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
    const { data, error } = await sb.auth.signInWithPassword({ email, password })

    if (error || !data.user || !data.session) {
      let msg = 'Email ou mot de passe incorrect.'
      if (error?.message?.includes('Too many'))      msg = 'Trop de tentatives. Réessayez dans 15 minutes.'
      if (error?.message?.includes('not confirmed')) msg = 'Compte non confirmé. Contactez l\'administrateur.'
      return c.html(loginPage(msg))
    }

    const profil = await getProfil(sb, data.user.id)
    if (!profil)           return c.html(loginPage('Profil introuvable. Contactez l\'administrateur.'))
    if (!profil.est_actif) return c.html(loginPage('Compte désactivé. Contactez l\'administrateur.'))

    setCookie(c, 'sb_token', data.session.access_token, COOKIE_OPTS)
    if (data.session.refresh_token) {
      setCookie(c, 'sb_refresh', data.session.refresh_token, COOKIE_OPTS)
    }

    // Sauvegarder le token FCM (notifications push app mobile)
    // Envoyé par l'app Capacitor dans le header X-FCM-Token
    const fcmToken    = c.req.header('X-FCM-Token')    || ''
    const fcmPlatform = c.req.header('X-FCM-Platform') || 'android'
    if (fcmToken) {
      await sb.from('auth_profiles')
        .update({ fcm_token: fcmToken, fcm_platform: fcmPlatform })
        .eq('id', data.user.id)
    }

    return c.redirect(
      profil.doit_changer_mdp ? '/auth/changer-mdp' : redirectionParRole(profil.role),
      302
    )
  } catch (err) {
    console.error('POST /login:', err)
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return c.html(loginPage('Erreur serveur : ' + msg))
  }
})

// ── GET /auth/inscription ─────────────────────────────────

authRoutes.get('/inscription', (c) => c.html(inscriptionPatientPage()))

// ── POST /auth/inscription ────────────────────────────────

authRoutes.post('/inscription', async (c) => {
  try {
    const sb   = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
    const body = await c.req.parseBody()

    const email     = String(body.email            ?? '').trim().toLowerCase()
    const password  = String(body.password         ?? '').trim()
    const confirm   = String(body.password_confirm ?? '').trim()
    const nom       = String(body.nom              ?? '').trim().toUpperCase()
    const prenom    = String(body.prenom           ?? '').trim()
    const telephone = String(body.telephone        ?? '').trim()

    if (!email || !password || !nom || !prenom) {
      return c.html(inscriptionPatientPage('Tous les champs obligatoires doivent être remplis.'))
    }
    if (password !== confirm)        return c.html(inscriptionPatientPage('Les mots de passe ne correspondent pas.'))
    if (password.length < 8)         return c.html(inscriptionPatientPage('Minimum 8 caractères.'))
    if (!/[A-Z]/.test(password))     return c.html(inscriptionPatientPage('Au moins 1 majuscule requise.'))
    if (!/[0-9]/.test(password))     return c.html(inscriptionPatientPage('Au moins 1 chiffre requis.'))
    if (!/[#@!$%]/.test(password))   return c.html(inscriptionPatientPage('Au moins 1 caractère spécial (#@!$%).'))

    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nom, prenom, role: 'patient', telephone },
    })

    if (error || !data?.user) {
      let msg = 'Erreur lors de la création du compte.'
      if (error?.message?.includes('already')) msg = 'Cet email est déjà utilisé.'
      return c.html(inscriptionPatientPage(msg))
    }

    await sb.from('auth_profiles').update({
      nom, prenom, role: 'patient', est_actif: true, doit_changer_mdp: false,
    }).eq('id', data.user.id)

    // ── LIAISON DOSSIER EXISTANT ──────────────────────────────
    // Si un médecin a déjà créé un dossier pour ce patient (profile_id = NULL),
    // on le lie au compte qui vient d'être créé en cherchant par nom + prénom.
    // Priorité : correspondance exacte nom + prénom + date_naissance si fournie.
    const ddn = String(body.date_naissance ?? '').trim() || null
    let query = sb.from('patient_dossiers')
      .select('id')
      .is('profile_id', null)
      .eq('nom',    nom)
      .eq('prenom', prenom)
    if (ddn) query = query.eq('date_naissance', ddn)
    const { data: dossiers } = await query.limit(1)
    if (dossiers && dossiers.length > 0) {
      await sb.from('patient_dossiers')
        .update({ profile_id: data.user.id })
        .eq('id', dossiers[0].id)
    }
    // ─────────────────────────────────────────────────────────

    return c.redirect('/auth/login?inscription=ok')
  } catch (err) {
    console.error('POST /inscription:', err)
    return c.html(inscriptionPatientPage('Erreur serveur. Réessayez.'))
  }
})

// ── GET /auth/changer-mdp ─────────────────────────────────

authRoutes.get('/changer-mdp', (c) => c.html(changerMdpPage()))

// ── POST /auth/changer-mdp ────────────────────────────────
// FIX CRITIQUE : après sb.auth.updateUser(), le token d'accès est
// invalidé par Supabase. Il faut rafraîchir la session pour obtenir
// un nouveau token avant d'appeler getProfil().

authRoutes.post('/changer-mdp', async (c) => {
  try {
    const token   = getCookie(c, 'sb_token')
    const refresh = getCookie(c, 'sb_refresh')

    if (!token) return c.redirect('/auth/login')

    const body    = await c.req.parseBody()
    const newPwd  = String(body.password ?? '')
    const confirm = String(body.confirm  ?? '')

    if (newPwd !== confirm)        return c.html(changerMdpPage('Les mots de passe ne correspondent pas.'))
    if (newPwd.length < 8)         return c.html(changerMdpPage('Minimum 8 caractères.'))
    if (!/[A-Z]/.test(newPwd))     return c.html(changerMdpPage('Au moins 1 majuscule requise.'))
    if (!/[0-9]/.test(newPwd))     return c.html(changerMdpPage('Au moins 1 chiffre requis.'))
    if (!/[#@!$%]/.test(newPwd))   return c.html(changerMdpPage('Au moins 1 caractère spécial (#@!$%).'))

    const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

    // Restaurer la session active avec le token actuel
    const { error: sessionError } = await sb.auth.setSession({
      access_token:  token,
      refresh_token: refresh ?? '',
    })
    if (sessionError) return c.html(changerMdpPage('Session expirée. Reconnectez-vous.'))

    // Changer le mot de passe
    const { error: updateError } = await sb.auth.updateUser({ password: newPwd })
    if (updateError) return c.html(changerMdpPage('Erreur : ' + updateError.message))

    // ── FIX : après updateUser(), obtenir la NOUVELLE session ──────
    // Supabase invalide l'ancien token quand le MDP change.
    // getSession() retourne la session courante mise à jour automatiquement.
    const { data: sessionData } = await sb.auth.getSession()
    const newSession = sessionData?.session

    if (!newSession?.user) {
      // Fallback : utiliser le refresh token pour recréer une session
      const { data: refreshData } = await sb.auth.refreshSession({
        refresh_token: refresh ?? '',
      })
      if (refreshData?.session) {
        setCookie(c, 'sb_token',   refreshData.session.access_token,  COOKIE_OPTS)
        setCookie(c, 'sb_refresh', refreshData.session.refresh_token, COOKIE_OPTS)

        await sb.from('auth_profiles')
          .update({ doit_changer_mdp: false })
          .eq('id', refreshData.user!.id)

        const profil = await getProfil(sb, refreshData.user!.id)
        return c.redirect(profil ? redirectionParRole(profil.role) : '/auth/login')
      }
      return c.redirect('/auth/login')
    }

    // Mettre les nouveaux cookies
    setCookie(c, 'sb_token',   newSession.access_token,  COOKIE_OPTS)
    setCookie(c, 'sb_refresh', newSession.refresh_token, COOKIE_OPTS)

    // Marquer doit_changer_mdp = false
    await sb.from('auth_profiles')
      .update({ doit_changer_mdp: false })
      .eq('id', newSession.user.id)

    // Charger le profil et rediriger
    const profil = await getProfil(sb, newSession.user.id)
    return c.redirect(profil ? redirectionParRole(profil.role) : '/auth/login')

  } catch (err) {
    console.error('POST /changer-mdp:', err)
    return c.html(changerMdpPage('Erreur serveur. Réessayez.'))
  }
})

// ── GET /auth/reset-password ──────────────────────────────

authRoutes.get('/reset-password', (c) => c.html(resetPasswordPage()))

// ── POST /auth/reset-password ─────────────────────────────

authRoutes.post('/reset-password', async (c) => {
  try {
    const body  = await c.req.parseBody()
    const email = String(body.email ?? '').trim().toLowerCase()

    if (!email) return c.html(resetPasswordPage('Entrez votre adresse email.'))

    const sb      = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
    const baseUrl = new URL(c.req.url).origin

    await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/reset-confirm`,
    })

    // Toujours afficher succès (ne pas révéler si l'email existe)
    return c.html(resetPasswordPage(undefined, true))
  } catch (err) {
    console.error('POST /reset-password:', err)
    return c.html(resetPasswordPage('Erreur serveur. Réessayez.'))
  }
})

// ── GET /auth/reset-confirm ───────────────────────────────

authRoutes.get('/reset-confirm', (c) => c.html(resetConfirmPage()))

// ── POST /auth/reset-confirm ──────────────────────────────

authRoutes.post('/reset-confirm', async (c) => {
  try {
    const body    = await c.req.parseBody()
    const newPwd  = String(body.password     ?? '')
    const confirm = String(body.confirm      ?? '')
    const token   = String(body.access_token ?? '').trim()

    if (newPwd !== confirm)        return c.html(resetConfirmPage('Les mots de passe ne correspondent pas.'))
    if (newPwd.length < 8)         return c.html(resetConfirmPage('Minimum 8 caractères.'))
    if (!/[A-Z]/.test(newPwd))     return c.html(resetConfirmPage('Au moins 1 majuscule.'))
    if (!/[0-9]/.test(newPwd))     return c.html(resetConfirmPage('Au moins 1 chiffre.'))
    if (!/[#@!$%]/.test(newPwd))   return c.html(resetConfirmPage('Au moins 1 caractère spécial.'))
    if (!token)                    return c.html(resetConfirmPage('Session expirée. Refaites la demande.'))

    const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

    const { error: sessionError } = await sb.auth.setSession({
      access_token:  token,
      refresh_token: '',
    })
    if (sessionError) return c.html(resetConfirmPage('Lien expiré. Refaites la demande.'))

    const { error: updateError } = await sb.auth.updateUser({ password: newPwd })
    if (updateError) return c.html(resetConfirmPage('Erreur : ' + updateError.message))

    await sb.auth.signOut()
    return c.redirect('/auth/login?reset=ok')
  } catch (err) {
    console.error('POST /reset-confirm:', err)
    return c.html(resetConfirmPage('Erreur serveur.'))
  }
})

// ── GET /auth/logout ──────────────────────────────────────

authRoutes.get('/logout', async (c) => {
  try {
    const token = getCookie(c, 'sb_token')
    if (token) {
      const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
      await sb.auth.signOut()
    }
  } catch (err) {
    console.error('GET /logout:', err)
  } finally {
    deleteCookie(c, 'sb_token',   { path: '/' })
    deleteCookie(c, 'sb_refresh', { path: '/' })
  }
  return c.redirect('/auth/login')
})
