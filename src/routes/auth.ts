import { Hono } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { getSupabase, getProfil, redirectionParRole, type Bindings } from '../lib/supabase'
import { loginPage } from '../pages/login'
import { changerMdpPage } from '../pages/changer-mdp'
import { resetPasswordPage, resetConfirmPage } from '../pages/reset-password'

export const authRoutes = new Hono<{ Bindings: Bindings }>()

// ── GET /auth/login ────────────────────────────────────────
authRoutes.get('/login', async (c) => {
  try {
    const token = getCookie(c, 'sb_token')
    if (token) {
      const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
      const { data: { user } } = await sb.auth.getUser(token)
      if (user) {
        const profil = await getProfil(sb, user.id)
        if (profil?.est_actif) {
          const destination = profil.doit_changer_mdp ? '/auth/changer-mdp' : redirectionParRole(profil.role)
          return c.redirect(destination)
        }
      }
    }
    const reset = new URL(c.req.url).searchParams.get('reset')
    return c.html(loginPage(undefined, reset === 'ok'))
  } catch (err) {
    console.error('❌ Erreur GET /login:', err)
    return c.html(loginPage('Erreur serveur. Réessayez.'))
  }
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
      return c.html(loginPage('⚠️ Configuration du serveur incomplète. Contactez l\'administrateur.'))
    }

    const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
    
    // Test de connexion Supabase
    try {
      await sb.auth.getSession()
    } catch (err) {
      console.error('❌ Supabase client error:', err)
      return c.html(loginPage('❌ Erreur de connexion à la base de données.'))
    }

    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    console.log('Auth response - Success:', !!data.user, 'Error:', error?.message || 'none')

    if (error || !data.user || !data.session) {
      console.error('❌ Erreur d\'authentification:', error?.message)
      let msg = 'Email ou mot de passe incorrect.'
      if (error?.message?.includes('Too many'))       msg = 'Trop de tentatives. Réessayez dans 15 minutes.'
      if (error?.message?.includes('not confirmed'))  msg = "Compte non confirmé. Contactez l'administrateur."
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

    // Options de cookies avec toutes les sécurités
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax' as const,
      maxAge: 604800, // 7 jours
      path: '/'
    }

    // CORRECTION : Ne pas définir de cookie vide
    setCookie(c, 'sb_token', data.session.access_token, cookieOptions)
    
    if (data.session.refresh_token) {
      setCookie(c, 'sb_refresh', data.session.refresh_token, cookieOptions)
    } else {
      console.warn('⚠️ Pas de refresh token dans la session')
    }

    console.log('✅ Cookies configurés et session établie')

    // CORRECTION : Attendre un peu pour que les cookies soient bien définis
    await new Promise(resolve => setTimeout(resolve, 100))

    // Vérification douce des cookies
    const verifToken = getCookie(c, 'sb_token')
    console.log('🔍 Vérification cookie token:', !!verifToken)

    // Déterminer la destination
    const destination = profil.doit_changer_mdp ? '/auth/changer-mdp' : redirectionParRole(profil.role)
    console.log('➡️  Redirection vers:', destination)

    // CORRECTION : Redirection avec code 302 explicite
    return c.redirect(destination, 302)
    
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
  try {
    const token   = getCookie(c, 'sb_token')
    const refresh = getCookie(c, 'sb_refresh')
    
    if (!token) {
      console.error('❌ Token manquant pour changement mot de passe')
      return c.redirect('/auth/login')
    }

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
    
    const { error: sessionError } = await sb.auth.setSession({ 
      access_token: token, 
      refresh_token: refresh ?? '' 
    })
    
    if (sessionError) {
      console.error('❌ Erreur setSession:', sessionError)
      return c.html(changerMdpPage('Session expirée. Reconnectez-vous.'))
    }
    
    const { error } = await sb.auth.updateUser({ password: newPwd })
    
    if (error) {
      console.error('❌ Erreur updateUser:', error)
      return c.html(changerMdpPage('Erreur : ' + error.message))
    }

    const { data: { user } } = await sb.auth.getUser(token)
    if (user) {
      await sb.from('auth_profiles').update({ doit_changer_mdp: false }).eq('id', user.id)
      const profil = await getProfil(sb, user.id)
      if (profil) {
        return c.redirect(redirectionParRole(profil.role))
      }
    }
    return c.redirect('/auth/login')
  } catch (err) {
    console.error('❌ Erreur POST /changer-mdp:', err)
    return c.html(changerMdpPage('Erreur serveur. Réessayez.'))
  }
})

// ── GET /auth/reset-password ───────────────────────────────
authRoutes.get('/reset-password', (c) => c.html(resetPasswordPage()))

// ── POST /auth/reset-password ──────────────────────────────
authRoutes.post('/reset-password', async (c) => {
  try {
    const body  = await c.req.parseBody()
    const email = String(body.email ?? '').trim().toLowerCase()
    
    if (!email) return c.html(resetPasswordPage('Entrez votre adresse email.'))

    const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
    const baseUrl = new URL(c.req.url).origin

    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/reset-confirm`,
    })

    if (error) {
      console.error('❌ Erreur resetPasswordForEmail:', error.message)
    }

    return c.html(resetPasswordPage(undefined, true))
  } catch (err) {
    console.error('❌ Erreur POST /reset-password:', err)
    return c.html(resetPasswordPage('Erreur serveur. Réessayez.'))
  }
})

// ── GET /auth/reset-confirm ────────────────────────────────
authRoutes.get('/reset-confirm', async (c) => {
  return c.html(resetConfirmPage())
})

// ── POST /auth/reset-confirm ───────────────────────────────
authRoutes.post('/reset-confirm', async (c) => {
  try {
    const body    = await c.req.parseBody()
    const newPwd  = String(body.password ?? '')
    const confirm = String(body.confirm  ?? '')
    const token   = String(body.access_token ?? '').trim()

    if (newPwd !== confirm)
      return c.html(resetConfirmPage('Les mots de passe ne correspondent pas.'))
    if (newPwd.length < 8)
      return c.html(resetConfirmPage('Minimum 8 caractères.'))
    if (!/[A-Z]/.test(newPwd))
      return c.html(resetConfirmPage('Au moins 1 majuscule.'))
    if (!/[0-9]/.test(newPwd))
      return c.html(resetConfirmPage('Au moins 1 chiffre.'))
    if (!/[#@!$%]/.test(newPwd))
      return c.html(resetConfirmPage('Au moins 1 caractère spécial.'))

    if (!token) {
      console.error('❌ Token manquant')
      return c.html(resetConfirmPage('Session expirée. Refaites la demande.'))
    }

    const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

    const { error: sessionError } = await sb.auth.setSession({
      access_token: token,
      refresh_token: ''
    })

    if (sessionError) {
      console.error('❌ setSession failed:', sessionError.message)
      return c.html(resetConfirmPage('Lien expiré. Refaites la demande.'))
    }

    const { error: updateError } = await sb.auth.updateUser({ password: newPwd })
    
    if (updateError) {
      console.error('❌ updateUser failed:', updateError.message)
      return c.html(resetConfirmPage('Erreur: ' + updateError.message))
    }

    await sb.auth.signOut()
    return c.redirect('/auth/login?reset=ok')
  } catch (err) {
    console.error('❌ Exception:', err)
    return c.html(resetConfirmPage('Erreur serveur.'))
  }
})

// ── GET /auth/logout ───────────────────────────────────────
authRoutes.get('/logout', async (c) => {
  try {
    const token = getCookie(c, 'sb_token')
    if (token) {
      const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
      await sb.auth.signOut()
    }
  } catch (err) {
    console.error('❌ Erreur logout:', err)
  } finally {
    deleteCookie(c, 'sb_token',   { path: '/' })
    deleteCookie(c, 'sb_refresh', { path: '/' })
  }
  return c.redirect('/auth/login')
})