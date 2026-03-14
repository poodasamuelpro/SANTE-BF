import { createMiddleware } from 'hono/factory'
import { getCookie, setCookie } from 'hono/cookie'
import { getSupabase, getProfil } from '../lib/supabase'
import type { Role } from '../lib/supabase'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }

export const requireAuth = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const token   = getCookie(c, 'sb_token')
  const refresh = getCookie(c, 'sb_refresh')

  if (!token && !refresh) return c.redirect('/auth/login')

  const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  let userId: string | null = null

  if (token) {
    const { data: { user } } = await sb.auth.getUser(token)
    if (user) userId = user.id
  }

  if (!userId && refresh) {
    const { data } = await sb.auth.refreshSession({ refresh_token: refresh })
    if (data?.user && data?.session) {
      userId = data.user.id
      const opts = {
        httpOnly: true, secure: true,
        sameSite: 'Lax' as const,
        maxAge: 604800, path: '/'
      }
      setCookie(c, 'sb_token',   data.session.access_token,  opts)
      setCookie(c, 'sb_refresh', data.session.refresh_token, opts)
    }
  }

  if (!userId) return c.redirect('/auth/login')

  const profil = await getProfil(sb, userId)
  if (!profil || !profil.est_actif) return c.redirect('/auth/login')

  c.set('profil'   as never, profil)
  c.set('supabase' as never, sb)
  await next()
})

export const requireRole = (...roles: Role[]) =>
  createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
    const profil = c.get('profil' as never) as { role: Role } | undefined
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
