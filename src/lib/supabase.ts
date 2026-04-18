/**
 * src/lib/supabase.ts
 * SantéBF — Client Supabase + types partagés
 *
 * CORRECTIONS APPLIQUÉES :
 *   [QC-01] SUPABASE_SERVICE_ROLE_KEY ajouté aux Bindings
 *   [QC-06] Bindings centralisé et complet (ne pas redéfinir localement)
 *   [DB-08] UserSettings type rétabli (la table existe bien en DB)
 *   [S-01]  getSupabaseAdmin() utilise SERVICE_ROLE_KEY
 *   [DB-20] avatar_url gardé comme alias de photo_url (cohérence)
 *   [S-10]  Suppression du console.log qui exposait le token JWT
 *   [QC-03] genererMdpSecure() utilise crypto.getRandomValues() (Web Crypto API)
 */

import { createClient } from '@supabase/supabase-js'

// ─── Types rôles ──────────────────────────────────────────

export type Role =
  | 'super_admin'
  | 'admin_structure'
  | 'medecin'
  | 'infirmier'
  | 'sage_femme'
  | 'pharmacien'
  | 'laborantin'
  | 'radiologue'
  | 'caissier'
  | 'agent_accueil'
  | 'patient'
  | 'cnts_agent'

// ─── Profil utilisateur connecté ─────────────────────────

export type AuthProfile = {
  id:               string
  email?:           string | null
  nom:              string
  prenom:           string
  role:             Role
  structure_id:     string | null
  est_actif:        boolean
  doit_changer_mdp: boolean
  photo_url?:       string | null
  avatar_url?:      string | null   // alias pour compatibilité → photo_url
  signature_url?:   string | null
  numero_ordre?:    string | null
  specialite?:      string | null
  // [DB-01] medecin_id réel de auth_medecins (différent de id = profile_id)
  medecin_id?:      string | null
}

// ─── Type UserSettings (table user_settings en DB) ──────
// [DB-08] Rétabli : la table existe bien (1 ligne, 10 colonnes confirmées)

export type UserSettings = {
  id:                              string
  profile_id:                      string
  google_calendar_enabled:         boolean
  google_calendar_refresh_token?:  string | null
  google_calendar_access_token?:   string | null
  google_calendar_token_expires?:  string | null
  google_calendar_calendar_id?:    string | null
  theme:                           string
  langue:                          string
  notifications_email:             boolean
  created_at:                      string
  updated_at:                      string
}

// ─── Variables Hono context ───────────────────────────────

export type Variables = {
  profil:   AuthProfile
  supabase: ReturnType<typeof getSupabase>
}

// ─── Bindings Cloudflare (CENTRALISÉ — ne pas redéfinir localement) ───────
// [QC-06] Type unique partagé par tous les fichiers routes

export type Bindings = {
  SUPABASE_URL:              string
  SUPABASE_ANON_KEY:         string
  SUPABASE_SERVICE_ROLE_KEY: string   // [QC-01] CRITIQUE : pour auth.admin.*
  RESEND_API_KEY:            string
  GOOGLE_CLIENT_ID?:         string
  GOOGLE_CLIENT_SECRET?:     string
  CINETPAY_SECRET?:          string
  CINETPAY_SITE_ID?:         string   // [S-02] SITE_ID séparé du SECRET
  DUNIAPAY_SECRET?:          string
  FCM_SERVER_KEY?:            string
  ANTHROPIC_API_KEY?:        string
  GEMINI_API_KEY?:           string
  GROK_API_KEY?:             string
}

// ─── Client Supabase (ANON KEY — pour les opérations standard) ──────────

export function getSupabase(
  url:     string | undefined,
  anonKey: string | undefined
) {
  if (!url || !anonKey) {
    throw new Error('Variables Supabase manquantes (SUPABASE_URL ou SUPABASE_ANON_KEY)')
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession:   false,
      autoRefreshToken: false,
    },
  })
}

// ─── Client Supabase ADMIN (SERVICE_ROLE_KEY) ───────────────────────────
// [S-01] CORRECTION CRITIQUE : auth.admin.* NÉCESSITE la service_role_key

export function getSupabaseAdmin(
  url:            string | undefined,
  serviceRoleKey: string | undefined
) {
  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY manquante. ' +
      'Configurer dans Cloudflare Pages → Settings → Environment Variables'
    )
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession:   false,
      autoRefreshToken: false,
    },
  })
}

// ─── Récupérer le profil complet ──────────────────────────
// [DB-01] Charge aussi auth_medecins.id (medecin_id réel) pour les médecins

export async function getProfil(
  supabase: ReturnType<typeof getSupabase>,
  userId:   string
): Promise<AuthProfile | null> {
  try {
    const { data, error } = await supabase
      .from('auth_profiles')
      .select('id, email, nom, prenom, role, structure_id, est_actif, doit_changer_mdp, photo_url')
      .eq('id', userId)
      .single()

    if (error || !data) return null

    const profil: AuthProfile = {
      id:               data.id,
      email:            data.email,
      nom:              data.nom,
      prenom:           data.prenom,
      role:             data.role as Role,
      structure_id:     data.structure_id,
      est_actif:        data.est_actif,
      doit_changer_mdp: data.doit_changer_mdp,
      photo_url:        data.photo_url ?? null,
      avatar_url:       data.photo_url ?? null,   // alias
      signature_url:    null,
      numero_ordre:     null,
      specialite:       null,
      medecin_id:       null,                     // [DB-01] sera rempli si médecin
    }

    // [DB-01] Charger medecin_id réel (auth_medecins.id ≠ auth_profiles.id)
    if (['medecin', 'infirmier', 'sage_femme', 'laborantin', 'radiologue'].includes(data.role)) {
      const { data: med } = await supabase
        .from('auth_medecins')
        .select('id, signature_url, numero_ordre_national, specialite_principale')
        .eq('profile_id', userId)
        .single()

      if (med) {
        profil.medecin_id    = med.id                       // [DB-01] ID réel de auth_medecins
        profil.signature_url = med.signature_url ?? null
        profil.numero_ordre  = med.numero_ordre_national ?? null
        profil.specialite    = med.specialite_principale ?? null
      }
    }

    return profil
  } catch (e) {
    console.error('getProfil error:', e)
    return null
  }
}

// ─── Redirection selon rôle ───────────────────────────────

export function redirectionParRole(role: Role): string {
  const routes: Record<Role, string> = {
    super_admin:     '/dashboard/admin',
    admin_structure: '/dashboard/structure',
    medecin:         '/dashboard/medecin',
    infirmier:       '/dashboard/medecin',
    sage_femme:      '/dashboard/medecin',
    pharmacien:      '/dashboard/pharmacien',
    laborantin:      '/dashboard/medecin',
    radiologue:      '/dashboard/medecin',
    caissier:        '/dashboard/caissier',
    agent_accueil:   '/dashboard/accueil',
    patient:         '/dashboard/patient',
    cnts_agent:      '/dashboard/cnts',
  }
  return routes[role] ?? '/auth/login'
}

// ─── Générateur de MDP temporaire cryptographiquement sûr ────────────────
// [QC-03] CORRECTION : utilise Web Crypto API (compatible Cloudflare Workers)
// Math.random() est NON cryptographique → remplacé par crypto.getRandomValues()

export function genererMdpSecure(longueur: number = 12): string {
  const maj      = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const min      = 'abcdefghijklmnopqrstuvwxyz'
  const chiffres = '0123456789'
  const speciaux = '@#!$%'
  const tous     = maj + min + chiffres + speciaux

  const bytes = new Uint8Array(longueur + 10)
  crypto.getRandomValues(bytes)

  let mdp = ''
  // Garantir au moins 1 de chaque catégorie
  mdp += maj[bytes[0] % maj.length]
  mdp += chiffres[bytes[1] % chiffres.length]
  mdp += speciaux[bytes[2] % speciaux.length]

  for (let i = 3; i < longueur; i++) {
    mdp += tous[bytes[i] % tous.length]
  }

  // Mélanger avec crypto (pas Math.random)
  const shuffleBytes = new Uint8Array(mdp.length)
  crypto.getRandomValues(shuffleBytes)
  const arr = mdp.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }

  return arr.join('')
}

// ─── Utilitaire : résoudre le medecin_id réel depuis profile_id ─────────
// [DB-01] À utiliser dans les routes pour obtenir auth_medecins.id

export async function getMedecinId(
  supabase: ReturnType<typeof getSupabase>,
  profileId: string
): Promise<string | null> {
  try {
    // Essayer d'abord la table de mapping (créée par la migration 001)
    const { data: map } = await supabase
      .from('_medecin_id_map')
      .select('medecin_id')
      .eq('profile_id', profileId)
      .single()

    if (map?.medecin_id) return map.medecin_id

    // Fallback : auth_medecins directement
    const { data: med } = await supabase
      .from('auth_medecins')
      .select('id')
      .eq('profile_id', profileId)
      .single()

    return med?.id ?? null
  } catch {
    return null
  }
}

// ─── Utilitaire : échapper le HTML (protection XSS) ──────────────────────
// [S-09] À utiliser avant tout innerHTML avec des données dynamiques

export function escapeHtml(str: string | null | undefined): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}