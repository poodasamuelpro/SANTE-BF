/**
 * src/middleware/auth.ts
 * SantéBF — Middlewares d'authentification et d'autorisation
 *
 * Corrections : 
 *   1. BUG CRITIQUE : doit_changer_mdp=true → redirect /auth/changer-mdp
 *      Sans ce fix, un médecin avec MDP temporaire était redirigé vers /dashboard/medecin
 *      → dashboard plantait → écran noir "Erreur serveur"
 *   2. Page "Accès refusé" avec design cohérent SantéBF
 *   3. Logs console conservés pour debug Cloudflare Workers
 */

import { createMiddleware } from 'hono/factory'
import { getCookie, setCookie } from 'hono/cookie'
import { getSupabase, getProfil, type Variables, type Bindings, type Role } from '../lib/supabase'

// ─── Pages exemptées de la vérification doit_changer_mdp ─
// L'utilisateur doit pouvoir accéder à ces pages même avec MDP temporaire
const PAGES_EXEMPTEES_MDP = [
  '/auth/changer-mdp',
  '/auth/logout',
  '/auth/login',
]

// ─── requireAuth ──────────────────────────────────────────

export const requireAuth = createMiddleware<{
  Bindings: Bindings
  Variables: Variables
}>(async (c, next) => {
  const token   = getCookie(c, 'sb_token')
  const refresh = getCookie(c, 'sb_refresh')

  console.log('🔒 requireAuth - token:', !!token, 'refresh:', !!refresh)

  if (!token && !refresh) {
    console.log('❌ Aucun cookie → /auth/login')
    return c.redirect('/auth/login')
  }

  const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  let userId: string | null = null

  // 1. Vérifier le token d'accès
  if (token) {
    try {
      const { data: { user }, error } = await sb.auth.getUser(token)
      console.log('🔑 getUser:', !!user, error?.message ?? 'ok')
      if (user) userId = user.id
    } catch (err) {
      console.error('❌ getUser error:', err)
    }
  }

  // 2. Rafraîchir si token expiré
  if (!userId && refresh) {
    console.log('🔄 Rafraîchissement session...')
    try {
      const { data, error } = await sb.auth.refreshSession({ refresh_token: refresh })
      console.log('🔄 Refresh:', !!data?.user, error?.message ?? 'ok')

      if (data?.user && data?.session) {
        userId = data.user.id
        const opts = {
          httpOnly: true,
          secure:   true,
          sameSite: 'Lax' as const,
          maxAge:   604800,
          path:     '/',
        }
        setCookie(c, 'sb_token',   data.session.access_token,  opts)
        setCookie(c, 'sb_refresh', data.session.refresh_token, opts)
        console.log('✅ Cookies rafraîchis')
      }
    } catch (err) {
      console.error('❌ refreshSession error:', err)
    }
  }

  if (!userId) {
    console.error('❌ Utilisateur non validé → /auth/login')
    return c.redirect('/auth/login')
  }

  // 3. Charger le profil
  let profil = null
  try {
    profil = await getProfil(sb, userId)
    console.log('👤 Profil:', profil ? `${profil.prenom} ${profil.nom} (${profil.role})` : 'null')
  } catch (err) {
    console.error('❌ getProfil error:', err)
  }

  if (!profil || !profil.est_actif) {
    console.error('❌ Profil invalide ou inactif → /auth/login')
    return c.redirect('/auth/login')
  }

  // ── FIX CRITIQUE : doit_changer_mdp ──────────────────────
  // BUG ORIGINAL : Un médecin avec MDP temporaire était redirigé vers
  // /dashboard/medecin → dashboard.ts essayait de charger les données
  // → plantait si auth_medecins vide ou autre erreur → écran noir
  //
  // CORRECTION : Rediriger vers /auth/changer-mdp AVANT d'accéder
  // à n'importe quelle page protégée (sauf les pages exemptées)
  if (profil.doit_changer_mdp) {
    const path = new URL(c.req.url).pathname
    const exempt = PAGES_EXEMPTEES_MDP.some(p => path.startsWith(p))
    if (!exempt) {
      console.log('⚠️ doit_changer_mdp=true → /auth/changer-mdp')
      // Stocker le profil et supabase quand même pour que changer-mdp fonctionne
      c.set('profil',   profil)
      c.set('supabase', sb)
      return c.redirect('/auth/changer-mdp')
    }
  }

  console.log('✅ requireAuth OK pour:', profil.role)

  c.set('profil',   profil)
  c.set('supabase', sb)

  await next()
})

// ─── requireRole ──────────────────────────────────────────

export const requireRole = (...roles: Role[]) =>
  createMiddleware<{
    Bindings: Bindings
    Variables: Variables
  }>(async (c, next) => {
    const profil = c.get('profil')

    if (!profil || !roles.includes(profil.role)) {
      console.warn(`⛔ requireRole: rôle '${profil?.role}' non autorisé. Requis: [${roles.join(', ')}]`)
      return c.html(pageAccesRefuse(profil?.role ?? 'inconnu', roles), 403)
    }

    await next()
  })

// ─── Page Accès refusé ────────────────────────────────────

function pageAccesRefuse(roleActuel: string, rolesRequis: Role[]): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Acc&#xe8;s refus&#xe9; | Sant&#xe9;BF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;min-height:100vh;
      display:flex;align-items:center;justify-content:center;padding:20px}
    .box{text-align:center;padding:48px 40px;background:white;border-radius:16px;
      box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:420px;width:100%}
    .ico{font-size:56px;margin-bottom:18px}
    h1{font-family:'DM Serif Display',serif;font-size:28px;color:#B71C1C;margin-bottom:12px}
    p{color:#6B7280;font-size:14px;line-height:1.6;margin-bottom:8px}
    .role-chip{display:inline-block;background:#FFF5F5;color:#B71C1C;
      padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;margin:4px}
    .actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px}
    .btn{padding:12px 24px;border-radius:9px;font-size:14px;font-weight:600;
      text-decoration:none;display:inline-block}
    .btn-back{background:#4A148C;color:white}
    .btn-out{background:#F3F4F6;color:#374151;border:1px solid #E0E0E0}
  </style>
</head>
<body>
  <div class="box">
    <div class="ico">&#x26D4;</div>
    <h1>Acc&#xe8;s refus&#xe9;</h1>
    <p>Votre r&#xf4;le <strong>${roleActuel}</strong> ne permet pas d&#x27;acc&#xe9;der &#xe0; cette page.</p>
    <p style="margin-top:12px;font-size:12px;color:#9E9E9E">
      R&#xf4;les autoris&#xe9;s :<br>
      ${rolesRequis.map(r => `<span class="role-chip">${r}</span>`).join('')}
    </p>
    <div class="actions">
      <a href="javascript:history.back()" class="btn btn-back">&#x2190; Retour</a>
      <a href="/auth/logout" class="btn btn-out">Se d&#xe9;connecter</a>
    </div>
  </div>
</body>
</html>`
}
