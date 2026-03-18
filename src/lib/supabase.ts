/**
 * src/lib/supabase.ts 
 * SantéBF — Client Supabase + types partagés
 *
 * Corrections :
 *   1. Bindings : RESEND_API_KEY ajouté (cohérent avec functions/[[path]].ts)
 *   2. AuthProfile : signature_url ajouté (utilisé dans PDF médecin)
 *   3. AuthProfile : numero_ordre + specialite ajoutés (depuis auth_medecins)
 *   4. Variables : type complet avec supabase typé
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

// ─── Profil utilisateur connecté ─────────────────────────
// Correspond à auth_profiles + jointure auth_medecins si rôle médecin

export type AuthProfile = {
  id:               string
  email?:           string | null
  nom:              string
  prenom:           string
  role:             Role
  structure_id:     string | null
  est_actif:        boolean
  doit_changer_mdp: boolean
  // Depuis auth_profiles (ajouté via ALTER TABLE)
  avatar_url?:      string | null
  // Depuis auth_medecins (chargé si rôle = medecin)
  signature_url?:   string | null
  numero_ordre?:    string | null
  specialite?:      string | null
}

// ─── Variables Hono context ───────────────────────────────

export type Variables = {
  profil:   AuthProfile
  supabase: ReturnType<typeof getSupabase>
}

// ─── Bindings Cloudflare ──────────────────────────────────

export type Bindings = {
  SUPABASE_URL:     string
  SUPABASE_ANON_KEY: string
  RESEND_API_KEY:   string   // ← ajouté : cohérent avec functions/[[path]].ts
}

// ─── Client Supabase ──────────────────────────────────────

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

// ─── Récupérer le profil complet ──────────────────────────
// Charge auth_profiles + données auth_medecins si médecin

export async function getProfil(
  supabase: ReturnType<typeof getSupabase>,
  userId:   string
): Promise<AuthProfile | null> {
  try {
    const { data, error } = await supabase
      .from('auth_profiles')
      .select('id, email, nom, prenom, role, structure_id, est_actif, doit_changer_mdp, avatar_url')
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
      avatar_url:       data.avatar_url ?? null,
      signature_url:    null,
      numero_ordre:     null,
      specialite:       null,
    }

    // Charger les infos médicales si rôle médecin
    if (['medecin', 'infirmier', 'sage_femme', 'laborantin', 'radiologue'].includes(data.role)) {
      const { data: med } = await supabase
        .from('auth_medecins')
        .select('signature_url, numero_ordre_national, specialite_principale')
        .eq('profile_id', userId)
        .single()

      if (med) {
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
  }
  return routes[role] ?? '/auth/login'
}
