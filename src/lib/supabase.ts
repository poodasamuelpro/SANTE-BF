import { createClient } from '@supabase/supabase-js'

// ── Types ──────────────────────────────────────────────────
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

export type AuthProfile = {
  id: string
  nom: string
  prenom: string
  role: Role
  structure_id: string | null
  est_actif: boolean
  doit_changer_mdp: boolean
}

// ── Créer le client Supabase ───────────────────────────────
export function getSupabase(url: string, anonKey: string) {
  return createClient(url, anonKey, {
    auth: {
      persistSession: false, // Cloudflare Workers = sans état
    },
  })
}

// ── Récupérer le profil d'un utilisateur connecté ──────────
export async function getProfil(
  supabase: ReturnType<typeof getSupabase>,
  userId: string
): Promise<AuthProfile | null> {
  const { data, error } = await supabase
    .from('auth_profiles')
    .select('id, nom, prenom, role, structure_id, est_actif, doit_changer_mdp')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return data as AuthProfile
}

// ── Redirection selon le rôle ──────────────────────────────
export function redirectionParRole(role: Role): string {
  const routes: Record<Role, string> = {
    super_admin:      '/dashboard/admin',
    admin_structure:  '/dashboard/structure',
    medecin:          '/dashboard/medecin',
    infirmier:        '/dashboard/medecin',   // même dashboard pour l'instant
    sage_femme:       '/dashboard/medecin',
    pharmacien:       '/dashboard/pharmacien',
    laborantin:       '/dashboard/medecin',
    radiologue:       '/dashboard/medecin',
    caissier:         '/dashboard/caissier',
    agent_accueil:    '/dashboard/accueil',
    patient:          '/dashboard/patient',
  }
  return routes[role] ?? '/auth/login'
}
