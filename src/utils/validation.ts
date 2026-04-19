/**
 * src/utils/validation.ts
 * SantéBF — Utilitaires de validation et sécurité
 *
 * CORRECTIONS APPLIQUÉES :
 *   [S-09]  escapeHtml() — Protection XSS (innerHTML safe)
 *   [S-19]  sanitizeSearchQuery() — Injection PostgREST
 *   [QC-08] validateEmail() — Validation email dans admin.ts et routes
 *   [S-14]  RateLimiter — Rate limiting via KV (compatible Cloudflare Workers)
 *   NOUVEAU : validatePhone(), validatePassword(), validateUUID()
 *   NOUVEAU : sanitizeInput() — Nettoie les entrées utilisateur
 */

// ─── 1. Échappement HTML — protection XSS ─────────────────────────────────────
// [S-09] À utiliser avant TOUT innerHTML avec des données dynamiques

export function escapeHtml(str: string | null | undefined): string {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Version pour attributs HTML (plus stricte)
export function escapeAttr(str: string | null | undefined): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
}

// ─── 2. Sanitisation requête de recherche — protection PostgREST ──────────────
// [S-19] PostgREST interprète certains caractères spéciaux dans les filtres
// ilike, eq, etc. → nettoyer avant utilisation dans .ilike()

export function sanitizeSearchQuery(query: string | null | undefined): string {
  if (!query) return ''
  return String(query)
    .trim()
    // Retirer les caractères dangereux pour PostgREST
    .replace(/[%_\\'"`;]/g, '')
    // Limiter la longueur
    .substring(0, 100)
}

// Version pour ilike (garde % pour wildcard mais échappe les autres)
export function sanitizeForILike(query: string | null | undefined): string {
  if (!query) return ''
  return String(query)
    .trim()
    .replace(/[_\\'"`;]/g, '')  // Garde % mais retire les autres
    .substring(0, 100)
}

// ─── 3. Validation email ──────────────────────────────────────────────────────
// [QC-08] À utiliser dans admin.ts et toutes les routes qui créent des comptes

export function validateEmail(email: string | null | undefined): boolean {
  if (!email) return false
  // RFC 5322 simplifié — suffisant pour validation serveur
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
  return re.test(email.trim()) && email.length <= 254
}

// ─── 4. Validation téléphone burkinabè ───────────────────────────────────────
// Format : 7X XX XX XX ou 2X XX XX XX (avec ou sans indicatif +226)

export function validatePhone(phone: string | null | undefined): boolean {
  if (!phone) return false
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  // Avec indicatif +226
  if (cleaned.startsWith('+226')) {
    return /^\+226[27]\d{7}$/.test(cleaned)
  }
  // Sans indicatif : 8 chiffres commençant par 2, 5, 6, 7
  return /^[2567]\d{7}$/.test(cleaned)
}

// ─── 5. Validation mot de passe ──────────────────────────────────────────────

export interface PasswordValidationResult {
  valid:   boolean
  errors:  string[]
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  
  if (!password || password.length < 8) {
    errors.push('Minimum 8 caractères')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Au moins 1 lettre majuscule')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Au moins 1 lettre minuscule')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Au moins 1 chiffre')
  }
  if (!/[#@!$%\*\-_\+]/.test(password)) {
    errors.push('Au moins 1 caractère spécial (#@!$%*-_+)')
  }
  if (password.length > 128) {
    errors.push('Maximum 128 caractères')
  }
  
  return { valid: errors.length === 0, errors }
}

// ─── 6. Validation UUID ───────────────────────────────────────────────────────

export function validateUUID(uuid: string | null | undefined): boolean {
  if (!uuid) return false
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return re.test(uuid)
}

// ─── 7. Sanitisation générale input ──────────────────────────────────────────

export function sanitizeInput(
  value: string | null | undefined,
  maxLength: number = 500
): string {
  if (!value) return ''
  return String(value)
    .trim()
    .substring(0, maxLength)
    // Retirer les caractères de contrôle (sauf newline et tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

// ─── 8. Sanitisation pour SQL paramétré ──────────────────────────────────────
// Note : Supabase utilise déjà des requêtes paramétrées → ce helper est
// pour les rares cas où on construit des chaînes SQL manuellement

export function sanitizeSqlParam(value: string | null | undefined): string {
  if (!value) return ''
  return String(value)
    .replace(/'/g, "''")  // Escape simple quote SQL
    .replace(/;/g, '')    // Retire les point-virgules
    .replace(/--/g, '')   // Retire les commentaires SQL
    .substring(0, 1000)
}

// ─── 9. Rate Limiter — compatible Cloudflare Workers ─────────────────────────
// [S-14] Rate limiting sur /auth/login et /ia/*
// Utilise KV Cloudflare pour la persistance entre instances

export interface RateLimitConfig {
  windowMs:    number   // Fenêtre en millisecondes (ex: 15 * 60 * 1000 = 15 min)
  maxRequests: number   // Nombre max de requêtes dans la fenêtre
  keyPrefix:   string   // Préfixe de la clé KV (ex: 'rl_login_')
}

export interface RateLimitResult {
  allowed:     boolean
  remaining:   number
  resetAt:     number   // timestamp Unix
}

// Implémentation simple basée sur KV Cloudflare (sans KVNamespace type pour éviter dépendance)
// Usage : await checkRateLimit(kv, ip, { windowMs: 900000, maxRequests: 5, keyPrefix: 'rl_login_' })
export async function checkRateLimit(
  kv: any,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (!kv) {
    // KV non configuré → permettre toutes les requêtes (dégradé gracieux)
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: Date.now() + config.windowMs }
  }

  const key     = `${config.keyPrefix}${identifier}`
  const now     = Date.now()
  const resetAt = now + config.windowMs

  try {
    const stored = await kv.get(key, 'json')
    
    if (!stored || stored.resetAt < now) {
      // Nouveau compteur
      await kv.put(key, JSON.stringify({ count: 1, resetAt }), {
        expirationTtl: Math.ceil(config.windowMs / 1000)
      })
      return { allowed: true, remaining: config.maxRequests - 1, resetAt }
    }

    if (stored.count >= config.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: stored.resetAt }
    }

    // Incrémenter
    stored.count++
    await kv.put(key, JSON.stringify(stored), {
      expirationTtl: Math.ceil((stored.resetAt - now) / 1000)
    })
    
    return {
      allowed:   true,
      remaining: config.maxRequests - stored.count,
      resetAt:   stored.resetAt
    }
  } catch (err) {
    // En cas d'erreur KV → permettre la requête (fail open)
    console.warn('[RateLimit] Erreur KV, fail open:', err)
    return { allowed: true, remaining: 1, resetAt }
  }
}

// ─── 10. Validation date ──────────────────────────────────────────────────────

export function validateDate(
  dateStr: string | null | undefined,
  options?: { min?: string; max?: string; required?: boolean }
): boolean {
  if (!dateStr) return !(options?.required ?? false)
  
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return false
  
  if (options?.min && date < new Date(options.min)) return false
  if (options?.max && date > new Date(options.max)) return false
  
  return true
}

// ─── 11. Formatage sécurisé pour affichage ───────────────────────────────────

export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '—'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 8) {
    return `${cleaned.slice(0,2)} ${cleaned.slice(2,4)} ${cleaned.slice(4,6)} ${cleaned.slice(6,8)}`
  }
  if (cleaned.length === 11 && cleaned.startsWith('226')) {
    const local = cleaned.slice(3)
    return `+226 ${local.slice(0,2)} ${local.slice(2,4)} ${local.slice(4,6)} ${local.slice(6,8)}`
  }
  return phone
}

export function formatDateFr(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-BF', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    })
  } catch {
    return dateStr
  }
}

export function formatDateTimeFr(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleString('fr-BF', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}