import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { getSupabase, getProfil, redirectionParRole } from '../lib/supabase'
import type { Env } from '../../functions/_middleware'
import type { Role } from '../lib/supabase'

// ── Middleware de protection — vérifie la session ──────────
export const requireAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const token   = getCookie(c, 'sb_token')
  const refresh = getCookie(c, 'sb_refresh')

  if (!token) {
    return c.redirect('/auth/login')
  }

  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

  // Vérifier le token
  let userId: string | null = null
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error && refresh) {
    // Token expiré → essayer de le renouveler avec le refresh token
    const { data: refreshData } = await supabase.auth.refreshSession({
      refresh_token: refresh,
    })
    if (refreshData?.user) {
      userId = refreshData.user.id
    } else {
      return c.redirect('/auth/login')
    }
  } else if (user) {
    userId = user.id
  } else {
    return c.redirect('/auth/login')
  }

  // Vérifier le profil
  const profil = await getProfil(supabase, userId)
  if (!profil || !profil.est_actif) {
    return c.redirect('/auth/login')
  }

  // Stocker le profil dans le contexte pour les routes suivantes
  c.set('profil' as never, profil)
  c.set('supabase' as never, supabase)

  await next()
})

// ── Middleware de vérification de rôle ────────────────────
export const requireRole = (...roles: Role[]) =>
  createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const profil = c.get('profil' as never) as { role: Role } | undefined
    if (!profil || !roles.includes(profil.role)) {
      return c.html(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px">
          <h2>⛔ Accès refusé</h2>
          <p>Vous n'avez pas les droits pour accéder à cette page.</p>
          <a href="/auth/logout">Se déconnecter</a>
        </body></html>
      `, 403)
    }
    await next()
  })
