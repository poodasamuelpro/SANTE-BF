import { createMiddleware } from 'hono/factory'
import { getCookie, setCookie } from 'hono/cookie'
import { getSupabase, getProfil, type Variables, type Bindings } from '../lib/supabase'

export const requireAuth = createMiddleware<{
  Bindings: Bindings
  Variables: Variables
}>(async (c, next) => {
  const token   = getCookie(c, 'sb_token')
  const refresh = getCookie(c, 'sb_refresh')

  console.log('🔒 requireAuth - token présent:', !!token, 'refresh présent:', !!refresh)

  // Si aucun cookie, redirection login
  if (!token && !refresh) {
    console.log('❌ Aucun cookie, redirection vers /auth/login')
    return c.redirect('/auth/login')
  }

  const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  let userId: string | null = null

  // Essayer avec le token d'accès
  if (token) {
    try {
      const { data: { user }, error } = await sb.auth.getUser(token)
      console.log('🔑 Vérification token - user:', !!user, 'erreur:', error?.message || 'aucune')
      if (user) userId = user.id
    } catch (err) {
      console.error('❌ Erreur getUser:', err)
    }
  }

  // Sinon essayer de rafraîchir avec le refresh token
  if (!userId && refresh) {
    console.log('🔄 Tentative de rafraîchissement avec refresh_token')
    try {
      const { data, error } = await sb.auth.refreshSession({ refresh_token: refresh })
      console.log('🔄 Refresh result - success:', !!data?.user, 'erreur:', error?.message || 'aucune')

      if (data?.user && data?.session) {
        userId = data.user.id
        // Mettre à jour les cookies
        const cookieOpts = {
          httpOnly: true,
          secure: true,
          sameSite: 'Lax' as const,
          maxAge: 604800,
          path: '/'
        }
        setCookie(c, 'sb_token',   data.session.access_token,  cookieOpts)
        setCookie(c, 'sb_refresh', data.session.refresh_token, cookieOpts)
        console.log('✅ Cookies rafraîchis')
      }
    } catch (err) {
      console.error('❌ Erreur refreshSession:', err)
    }
  }

  // Si toujours pas d'utilisateur, redirection
  if (!userId) {
    console.error('❌ Impossible de valider l\'utilisateur, redirection')
    return c.redirect('/auth/login')
  }

  // Récupérer le profil avec timeout
  let profil = null
  try {
    profil = await getProfil(sb, userId)
    console.log('👤 Profil récupéré:', profil ? `${profil.nom} (${profil.role})` : 'null')
  } catch (err) {
    console.error('❌ Erreur getProfil:', err)
  }

  // Si pas de profil ou inactif, redirection
  if (!profil || !profil.est_actif) {
    console.error('❌ Profil invalide ou inactif')
    return c.redirect('/auth/login')
  }

  console.log('✅ requireAuth OK, accès autorisé pour:', profil.role)

  // CORRECTION : Plus de 'as never' - typage correct
  c.set('profil', profil)
  c.set('supabase', sb)
  
  await next()
})

export const requireRole = (...roles: Role[]) =>
  createMiddleware<{
    Bindings: Bindings
    Variables: Variables
  }>(async (c, next) => {
    const profil = c.get('profil')
    
    if (!profil || !roles.includes(profil.role)) {
      return c.html(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Accès refusé — SantéBF</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',sans-serif;background:#F7F8FA;min-height:100vh;
    display:flex;align-items:center;justify-content:center}
  .box{text-align:center;padding:48px;background:white;border-radius:16px;
    box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:380px;margin:20px}
  h2{color:#B71C1C;font-size:26px;margin-bottom:12px}
  p{color:#6B7280;margin-bottom:24px;font-size:15px}
  a{background:#1A6B3C;color:white;padding:12px 28px;border-radius:8px;
    text-decoration:none;font-weight:600;font-size:14px}
</style></head>
<body><div class="box">
  <div style="font-size:48px;margin-bottom:16px">⛔</div>
  <h2>Accès refusé</h2>
  <p>Vous n'avez pas les droits pour accéder à cette page.</p>
  <a href="/auth/logout">Se déconnecter</a>
</div></body></html>`, 403)
    }
    await next()
  })