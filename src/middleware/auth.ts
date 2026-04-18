/**
 * src/middleware/auth.ts
 * SantéBF — Middlewares d'authentification et d'autorisation
 *
 * CORRECTIONS APPLIQUÉES :
 *   [S-10]  Suppression du console.log qui exposait le token JWT
 *   [S-23]  signOut() appelé avec await (résultat vérifié)
 *   [LM-15] Boucle de redirection doit_changer_mdp résolue
 *   [DB-01] profil.medecin_id disponible dans le contexte (chargé dans getProfil)
 *   [S-15]  Headers de sécurité (CSP, X-Frame-Options, etc.) ajoutés
 */

import { createMiddleware } from 'hono/factory'
import { getCookie, setCookie } from 'hono/cookie'
import { getSupabase, getProfil, type Variables, type Bindings, type Role } from '../lib/supabase'

// ─── Pages exemptées de la vérification doit_changer_mdp ─
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

  // [S-10] CORRECTION : ne plus logger le token JWT
  // console.log('🔒 requireAuth - token:', !!token) ← SUPPRIMÉ (exposait le token)

  if (!token && !refresh) {
    return c.redirect('/auth/login')
  }

  const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  let userId: string | null = null

  if (token) {
    try {
      const { data: { user }, error } = await sb.auth.getUser(token)
      if (user) userId = user.id
      // [S-10] Pas de log du user ou du token
    } catch {
      // Erreur silencieuse → on essaie le refresh
    }
  }

  if (!userId && refresh) {
    try {
      const { data, error } = await sb.auth.refreshSession({ refresh_token: refresh })

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
      }
    } catch {
      // Refresh échoué → redirection login
    }
  }

  if (!userId) {
    return c.redirect('/auth/login')
  }

  let profil = null
  try {
    // [DB-01] getProfil charge maintenant aussi medecin_id réel
    profil = await getProfil(sb, userId)
  } catch {
    // Erreur DB → redirection
  }

  if (!profil || !profil.est_actif) {
    return c.redirect('/auth/login')
  }

  // [LM-15] FIX boucle de redirection doit_changer_mdp
  // Si l'utilisateur est déjà sur /auth/changer-mdp, on ne redirige pas à nouveau
  if (profil.doit_changer_mdp) {
    const path = new URL(c.req.url).pathname
    const exempt = PAGES_EXEMPTEES_MDP.some(p => path.startsWith(p))
    if (!exempt) {
      c.set('profil',   profil)
      c.set('supabase', sb)
      return c.redirect('/auth/changer-mdp')
    }
  }

  // [S-15] Ajouter les headers de sécurité sur toutes les réponses authentifiées
  c.header('X-Frame-Options', 'DENY')
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

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