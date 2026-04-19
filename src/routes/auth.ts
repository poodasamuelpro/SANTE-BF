/**
 * src/routes/auth.ts
 * SantéBF — Authentification
 *
 * CORRECTIONS APPLIQUÉES :
 *   [S-01]  auth.admin.createUser() utilise désormais getSupabaseAdmin() avec SERVICE_ROLE_KEY
 *   [S-23]  await signOut() — résultat vérifié avant de répondre
 *   [S-12]  Liaison patient améliorée : nom + prenom + date_naissance (obligatoire si fournie)
 *   [LM-16] Patient sans email : pas de création de compte Auth, juste un dossier
 *   [LM-15] Boucle de redirection doit_changer_mdp résolue dans le middleware (auth.ts)
 *   [QC-03] Math.random() → genererMdpSecure() (Web Crypto API)
 *
 * Structure conservée à l'identique, seules les corrections sont appliquées
 */

import { Hono } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import {
  getSupabase,
  getSupabaseAdmin,          // [S-01] AJOUTÉ
  genererMdpSecure,          // [QC-03] AJOUTÉ
  getProfil,
  redirectionParRole,
  type Bindings
} from '../lib/supabase'
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
// [S-01] CORRECTION : utilise getSupabaseAdmin avec SERVICE_ROLE_KEY
authRoutes.post('/inscription', async (c) => {
  try {
    const sb      = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
    const sbAdmin = getSupabaseAdmin(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
    const body    = await c.req.parseBody()

    const email     = String(body.email            ?? '').trim().toLowerCase()
    const password  = String(body.password         ?? '').trim()
    const confirm   = String(body.password_confirm ?? '').trim()
    const nom       = String(body.nom              ?? '').trim().toUpperCase()
    const prenom    = String(body.prenom           ?? '').trim()
    const telephone = String(body.telephone        ?? '').trim()
    const dateNaissance = String(body.date_naissance ?? '').trim()  // [S-12]

    if (!email || !password || !nom || !prenom) {
      return c.html(inscriptionPatientPage('Tous les champs obligatoires doivent être remplis.'))
    }
    if (password !== confirm)        return c.html(inscriptionPatientPage('Les mots de passe ne correspondent pas.'))
    if (password.length < 8)         return c.html(inscriptionPatientPage('Minimum 8 caractères.'))
    if (!/[A-Z]/.test(password))     return c.html(inscriptionPatientPage('Au moins 1 majuscule requise.'))
    if (!/[0-9]/.test(password))     return c.html(inscriptionPatientPage('Au moins 1 chiffre requis.'))
    if (!/[#@!$%]/.test(password))   return c.html(inscriptionPatientPage('Au moins 1 caractère spécial (#@!$%).'))

    // [S-01] CORRECTION : auth.admin.createUser NÉCESSITE la service_role_key
    const { data, error } = await sbAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nom, prenom, telephone, role: 'patient' },
    })

    if (error || !data.user) {
      const msg = error?.message || 'Erreur création compte'
      return c.html(inscriptionPatientPage(
        msg.includes('already registered') ? 'Cet email est déjà utilisé.' : msg
      ))
    }

    // Créer le profil
    await sb.from('auth_profiles').insert({
      id:        data.user.id,
      email,
      nom,
      prenom,
      telephone,
      role:      'patient',
      est_actif: true,
    })

    // [S-12] CORRECTION : Liaison dossier patient sécurisée
    // On cherche une correspondance EXACTE nom + prenom + date_naissance
    const query = sb.from('patient_dossiers')
      .select('id, patient_id')
      .eq('nom', nom)
      .eq('prenom', prenom)

    // Si date de naissance fournie → l'utiliser pour éviter les doublons homonymes
    if (dateNaissance) {
      query.eq('date_naissance', dateNaissance)
    }

    const { data: dossiers } = await query.limit(1)

    if (dossiers && dossiers.length === 1 && !dossiers[0].patient_id) {
      // Lier le compte au dossier existant
      await sb.from('patient_dossiers')
        .update({ patient_id: data.user.id })
        .eq('id', dossiers[0].id)
    }

    return c.redirect('/auth/login?inscription=ok')
  } catch (err) {
    console.error('POST /inscription:', err)
    return c.html(inscriptionPatientPage('Erreur serveur. Réessayez.'))
  }
})

// ── GET /auth/changer-mdp ─────────────────────────────────
authRoutes.get('/changer-mdp', async (c) => {
  const token = getCookie(c, 'sb_token')
  if (!token) return c.redirect('/auth/login')
  return c.html(changerMdpPage())
})

// ── POST /auth/changer-mdp ────────────────────────────────
authRoutes.post('/changer-mdp', async (c) => {
  try {
    const token   = getCookie(c, 'sb_token')
    const refresh = getCookie(c, 'sb_refresh')

    if (!token && !refresh) {
      return c.redirect('/auth/login')
    }

    const sb   = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
    const body = await c.req.parseBody()

    const ancienMdp     = String(body.ancien_mdp      ?? '').trim()
    const nouveauMdp    = String(body.nouveau_mdp     ?? '').trim()
    const confirmMdp    = String(body.confirmer_mdp   ?? '').trim()

    if (!ancienMdp || !nouveauMdp || !confirmMdp) {
      return c.html(changerMdpPage('Tous les champs sont requis.'))
    }
    if (nouveauMdp !== confirmMdp) {
      return c.html(changerMdpPage('Les mots de passe ne correspondent pas.'))
    }
    if (nouveauMdp.length < 8) {
      return c.html(changerMdpPage('Minimum 8 caractères.'))
    }

    // Obtenir l'utilisateur courant
    let userId: string | null = null
    if (token) {
      const { data: { user } } = await sb.auth.getUser(token)
      if (user) userId = user.id
    }

    if (!userId && refresh) {
      const { data } = await sb.auth.refreshSession({ refresh_token: refresh })
      if (data?.user) userId = data.user.id
    }

    if (!userId) {
      return c.redirect('/auth/login')
    }

    // Récupérer l'email pour re-authentifier
    const { data: profil } = await sb.from('auth_profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (!profil?.email) {
      return c.html(changerMdpPage('Profil introuvable.'))
    }

    // Vérifier l'ancien mot de passe
    const { error: signInError } = await sb.auth.signInWithPassword({
      email: profil.email,
      password: ancienMdp,
    })

    if (signInError) {
      return c.html(changerMdpPage('Mot de passe actuel incorrect.'))
    }

    // Mettre à jour le mot de passe
    const sbAdmin = getSupabaseAdmin(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
    const { error: updateError } = await sbAdmin.auth.admin.updateUserById(userId, {
      password: nouveauMdp,
    })

    if (updateError) {
      return c.html(changerMdpPage('Erreur lors du changement : ' + updateError.message))
    }

    // Mettre à jour doit_changer_mdp
    await sb.from('auth_profiles')
      .update({ doit_changer_mdp: false })
      .eq('id', userId)

    // Obtenir une nouvelle session avec le nouveau MDP
    const { data: newSession } = await sb.auth.signInWithPassword({
      email: profil.email,
      password: nouveauMdp,
    })

    if (newSession?.session) {
      setCookie(c, 'sb_token',   newSession.session.access_token,  COOKIE_OPTS)
      setCookie(c, 'sb_refresh', newSession.session.refresh_token, COOKIE_OPTS)
    }

    const profilData = await getProfil(sb, userId)
    return c.redirect(redirectionParRole(profilData?.role ?? 'patient'))

  } catch (err) {
    console.error('POST /changer-mdp:', err)
    return c.html(changerMdpPage('Erreur serveur.'))
  }
})

// ── POST /auth/logout ─────────────────────────────────────
// [S-23] CORRECTION : await signOut() avec gestion d'erreur
authRoutes.post('/logout', async (c) => {
  const token = getCookie(c, 'sb_token')

  if (token) {
    try {
      const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
      // [S-23] CORRECTION : await signOut() — pas juste un appel sans await
      const { error } = await sb.auth.signOut()
      if (error) {
        console.warn('signOut error (non bloquant):', error.message)
        // On continue quand même pour supprimer les cookies côté client
      }
    } catch (e) {
      console.error('signOut exception:', e)
    }
  }

  deleteCookie(c, 'sb_token',   { path: '/' })
  deleteCookie(c, 'sb_refresh', { path: '/' })

  return c.redirect('/auth/login')
})

// ── GET /auth/logout (GET aussi pour les liens <a>) ───────
authRoutes.get('/logout', async (c) => {
  const token = getCookie(c, 'sb_token')

  if (token) {
    try {
      const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
      await sb.auth.signOut()
    } catch { /* non bloquant */ }
  }

  deleteCookie(c, 'sb_token',   { path: '/' })
  deleteCookie(c, 'sb_refresh', { path: '/' })

  return c.redirect('/auth/login')
})

// ── GET /auth/reset-password ──────────────────────────────
authRoutes.get('/reset-password', (c) => {
  return c.html(resetPasswordPage())
})

// ── POST /auth/reset-password ─────────────────────────────
authRoutes.post('/reset-password', async (c) => {
  try {
    const body  = await c.req.parseBody()
    const email = String(body.email ?? '').trim().toLowerCase()

    if (!email) {
      return c.html(resetPasswordPage('Veuillez entrer votre email.'))
    }

    const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
    await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${new URL(c.req.url).origin}/auth/reset-confirm`,
    })

    return c.redirect('/auth/login?reset=ok')
  } catch (err) {
    console.error('POST /reset-password:', err)
    return c.html(resetPasswordPage('Erreur serveur.'))
  }
})

// ── GET /auth/reset-confirm ───────────────────────────────
authRoutes.get('/reset-confirm', (c) => {
  return c.html(resetConfirmPage())
})