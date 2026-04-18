/**
 * src/utils/validation.ts
 * SantéBF — Utilitaires de validation et sécurité
 *
 * CORRECTIONS APPLIQUÉES :
 *   [S-09]  escapeHtml() — prévenir les attaques XSS via innerHTML
 *   [QC-08] validateEmail() — validation email robuste
 *   [S-19]  sanitizeSearchQuery() — sécuriser les recherches PostgREST
 *   [QC-03] genererCodeSecure() — codes sécurisés (urgence, etc.)
 */

// ─── Échapper le HTML (protection XSS) ────────────────────────────────────
// [S-09] À utiliser systématiquement avant tout innerHTML avec données dynamiques
export function escapeHtml(str: string | null | undefined): string {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// ─── Validation email ────────────────────────────────────────────────────
// [QC-08] Validation robuste pour admin.ts et accueil.ts
export function validateEmail(email: string): boolean {
  if (!email || email.length > 254) return false
  // RFC 5322 simplified
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  return re.test(email) && email.includes('.') && !email.endsWith('.')
}

// ─── Sanitiser les queries de recherche PostgREST ─────────────────────────
// [S-19] Éviter l'injection de métacaractères PostgREST dans les filtres .or()
// PostgREST métacaractères : % _ , ( ) | ! = . > < ~
export function sanitizeSearchQuery(query: string, maxLength: number = 100): string {
  if (!query) return ''
  return query
    .substring(0, maxLength)                    // Limiter la longueur
    .replace(/[()!|,~]/g, ' ')                  // Supprimer métacaractères PostgREST
    .replace(/[%_]/g, '\\$&')                   // Échapper les wildcards SQL
    .trim()
}

// ─── Générer un code numérique sécurisé ─────────────────────────────────
// [QC-03] Pour les codes d'urgence, OTP, etc.
// Math.random() → crypto.getRandomValues() (compatible Cloudflare Workers)
export function genererCodeNumerique(longueur: number = 6): string {
  const bytes = new Uint8Array(longueur)
  crypto.getRandomValues(bytes)
  let code = ''
  for (let i = 0; i < longueur; i++) {
    code += (bytes[i] % 10).toString()
  }
  return code
}

// ─── Générer un token UUID sécurisé ─────────────────────────────────────
export function genererToken(): string {
  // Utilise crypto.randomUUID() si disponible (Cloudflare Workers V8)
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // Fallback : token hex
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── Valider et nettoyer un numéro de téléphone burkinabè ────────────────
// Format Burkina Faso : 8 chiffres, commence par 2x, 5x, 6x, 7x
export function validateTelephone(tel: string): { valide: boolean; formate: string } {
  const cleaned = tel.replace(/[\s\-\+\.]/g, '').replace(/^00226/, '').replace(/^226/, '')
  const valid = /^[256][0-9]{7}$/.test(cleaned)
  return {
    valide:  valid,
    formate: valid ? `+226 ${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6)}` : tel
  }
}

// ─── Tronquer le texte avec ellipse ─────────────────────────────────────
export function truncate(str: string | null | undefined, max: number = 100): string {
  if (!str) return ''
  return str.length > max ? str.substring(0, max) + '…' : str
}

// ─── Valider une date ───────────────────────────────────────────────────
export function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return !isNaN(d.getTime())
}

// ─── Calculer l'âge depuis la date de naissance ──────────────────────────
export function calculerAge(dateNaissance: string): number {
  if (!dateNaissance) return 0
  const naissance = new Date(dateNaissance)
  const auj = new Date()
  let age = auj.getFullYear() - naissance.getFullYear()
  const m = auj.getMonth() - naissance.getMonth()
  if (m < 0 || (m === 0 && auj.getDate() < naissance.getDate())) {
    age--
  }
  return age
}

// ─── Valider un montant FCFA ─────────────────────────────────────────────
export function validateMontantFCFA(montant: any): number {
  const n = parseInt(String(montant ?? 0).replace(/\s/g, ''), 10)
  if (isNaN(n) || n < 0) return 0
  if (n > 100_000_000) return 0 // Plafond 100M FCFA
  return n
}