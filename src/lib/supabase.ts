import { createClient } from '@supabase/supabase-js'

export type Role =
  | 'super_admin' | 'admin_structure' | 'medecin'
  | 'infirmier' | 'sage_femme' | 'pharmacien'
  | 'laborantin' | 'radiologue' | 'caissier'
  | 'agent_accueil' | 'patient'

export type AuthProfile = {
  id: string
  email?: string
  nom: string
  prenom: string
  role: Role
  structure_id: string | null
  est_actif: boolean
  doit_changer_mdp: boolean
  avatar_url?: string | null   // ← AJOUTÉ : photo de profil
}

// Type pour les variables de contexte Hono
export type Variables = {
  profil: AuthProfile
  supabase: ReturnType<typeof getSupabase>
}

export type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

export function getSupabase(url: string | undefined, anonKey: string | undefined) {
  if (!url || !anonKey) {
    throw new Error('Variables d\'environnement Supabase manquantes. Configurez SUPABASE_URL et SUPABASE_ANON_KEY dans Cloudflare Pages.')
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export async function getProfil(
  supabase: ReturnType<typeof getSupabase>,
  userId: string
): Promise<AuthProfile | null> {
  try {
    const { data, error } = await supabase
      .from('auth_profiles')
      .select('id, nom, prenom, role, structure_id, est_actif, doit_changer_mdp, avatar_url')
      // ↑ avatar_url ajouté ici
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('❌ getProfil error:', error?.message)
      return null
    }
    return data as AuthProfile
  } catch (err) {
    console.error('❌ getProfil exception:', err)
    return null
  }
}

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
