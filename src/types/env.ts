/**
 * src/types/env.ts
 * SantéBF — Types des variables d'environnement Cloudflare
 *
 * Correction : RESEND_API_KEY ajouté (cohérent avec functions/[[path]].ts)
 */

export type Env = {
  SUPABASE_URL:     string
  SUPABASE_ANON_KEY: string
  RESEND_API_KEY:   string   // ← ajouté
}
