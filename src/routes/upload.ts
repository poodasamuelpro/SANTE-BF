/**
 * src/routes/upload.ts
 * SantéBF — Upload fichiers (logo structure, signature médecin, avatar)
 *
 * Buckets Supabase Storage utilisés (à créer via SQL section 11.1 de la doc) :
 *   - avatars      (public)  — photos de profil
 *   - structures   (public)  — logos des structures sanitaires
 *   - signatures   (privé)   — signatures numériques des médecins
 *
 * Tables mises à jour :
 *   - struct_structures.logo_url
 *   - auth_medecins.signature_url   ← signature est dans auth_medecins, PAS auth_profiles
 *   - auth_profiles.photo_url (colonne réelle dans la DB)
 *
 * Corrections apportées vs version originale :
 *   1. requireRole() : spread args (pas array) — cohérent avec middleware/auth.ts
 *   2. signature_url → auth_medecins (pas auth_profiles)
 *   3. Types c.get<>() explicites
 *   4. SQL bucket 'structures' et 'signatures' ajoutés en commentaire
 *   5. Gestion fichier null robuste
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import type { AuthProfile } from '../lib/supabase'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }

export const uploadRoutes = new Hono<{ Bindings: Bindings }>()

uploadRoutes.use('/*', requireAuth)

// ─── Constantes ────────────────────────────────────────────
const IMAGE_TYPES  = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_LOGO_MB  = 2 * 1024 * 1024   // 2 Mo
const MAX_SIG_MB   = 1 * 1024 * 1024   // 1 Mo
const MAX_AVATAR_MB = 5 * 1024 * 1024  // 5 Mo (conforme bucket avatars doc)

// ─── Helper validation ──────────────────────────────────────
function validateImage(file: File | null, maxSize: number): string | null {
  if (!file || file.size === 0) return 'Aucun fichier fourni'
  if (!IMAGE_TYPES.includes(file.type)) return 'Format invalide. Accept\u00e9s : PNG, JPG, JPEG, WEBP'
  if (file.size > maxSize) return `Fichier trop volumineux (max ${maxSize / 1024 / 1024} Mo)`
  return null
}

// ═══════════════════════════════════════════════════════════
// POST /upload/logo-structure
// Rôles : admin_structure, super_admin
// Bucket : structures (public)
// Table  : struct_structures.logo_url
// ═══════════════════════════════════════════════════════════

uploadRoutes.post(
  '/logo-structure',
  requireRole('admin_structure', 'super_admin'),
  async (c) => {
    const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
    const profil = c.get<AuthProfile>('profil')

    const formData = await c.req.formData()
    const file     = formData.get('logo') as File | null

    const err = validateImage(file, MAX_LOGO_MB)
    if (err) return c.json({ error: err }, 400)

    const ext      = (file!.name.split('.').pop() ?? 'png').toLowerCase()
    const filename = `logo-${profil.structure_id}-${Date.now()}.${ext}`
    const buffer   = await file!.arrayBuffer()

    const { error: upErr } = await sb.storage
      .from('structures')
      .upload(filename, buffer, { contentType: file!.type, upsert: true })

    if (upErr) {
      console.error('Upload logo structure:', upErr.message)
      return c.json({ error: "Erreur lors de l'upload vers le stockage" }, 500)
    }

    const { data: urlData } = sb.storage.from('structures').getPublicUrl(filename)
    const logo_url = urlData.publicUrl

    const { error: dbErr } = await sb
      .from('struct_structures')
      .update({ logo_url })
      .eq('id', profil.structure_id)

    if (dbErr) {
      console.error('Update logo_url:', dbErr.message)
      return c.json({ error: 'Logo upload\u00e9 mais erreur mise \u00e0 jour base de donn\u00e9es' }, 500)
    }

    return c.json({ success: true, logo_url, message: 'Logo upload\u00e9 avec succ\u00e8s' })
  }
)

// ═══════════════════════════════════════════════════════════
// DELETE /upload/logo-structure
// ═══════════════════════════════════════════════════════════

uploadRoutes.delete(
  '/logo-structure',
  requireRole('admin_structure', 'super_admin'),
  async (c) => {
    const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
    const profil = c.get<AuthProfile>('profil')

    const { data: struct } = await sb
      .from('struct_structures')
      .select('logo_url')
      .eq('id', profil.structure_id)
      .single()

    if (!struct?.logo_url) {
      return c.json({ error: 'Aucun logo \u00e0 supprimer' }, 404)
    }

    // Extraire le nom de fichier depuis l'URL
    const parts    = struct.logo_url.split('/')
    const filename = parts[parts.length - 1]

    if (filename) {
      await sb.storage.from('structures').remove([filename])
    }

    await sb
      .from('struct_structures')
      .update({ logo_url: null })
      .eq('id', profil.structure_id)

    return c.json({ success: true, message: 'Logo supprim\u00e9 avec succ\u00e8s' })
  }
)

// ═══════════════════════════════════════════════════════════
// POST /upload/signature-medecin
// Rôles : medecin, super_admin
// Bucket : signatures (privé)
// Table  : auth_medecins.signature_url  ← CORRECTION vs version originale
// ═══════════════════════════════════════════════════════════

uploadRoutes.post(
  '/signature-medecin',
  requireRole('medecin', 'super_admin'),
  async (c) => {
    const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
    const profil = c.get<AuthProfile>('profil')

    const formData = await c.req.formData()
    const file     = formData.get('signature') as File | null

    const err = validateImage(file, MAX_SIG_MB)
    if (err) return c.json({ error: err }, 400)

    const ext      = (file!.name.split('.').pop() ?? 'png').toLowerCase()
    const filename = `sig-${profil.id}-${Date.now()}.${ext}`
    const buffer   = await file!.arrayBuffer()

    const { error: upErr } = await sb.storage
      .from('signatures')
      .upload(filename, buffer, { contentType: file!.type, upsert: true })

    if (upErr) {
      console.error('Upload signature:', upErr.message)
      return c.json({ error: "Erreur lors de l'upload" }, 500)
    }

    const { data: urlData } = sb.storage.from('signatures').getPublicUrl(filename)
    const signature_url = urlData.publicUrl

    // ⚠️ signature_url est dans auth_medecins, pas auth_profiles (cf. doc DB table 12)
    const { error: dbErr } = await sb
      .from('auth_medecins')
      .update({ signature_url })
      .eq('profile_id', profil.id)

    if (dbErr) {
      console.error('Update signature_url:', dbErr.message)
      return c.json({ error: 'Signature upload\u00e9e mais erreur mise \u00e0 jour profil' }, 500)
    }

    return c.json({ success: true, signature_url, message: 'Signature upload\u00e9e avec succ\u00e8s' })
  }
)

// ═══════════════════════════════════════════════════════════
// DELETE /upload/signature-medecin
// ═══════════════════════════════════════════════════════════

uploadRoutes.delete(
  '/signature-medecin',
  requireRole('medecin', 'super_admin'),
  async (c) => {
    const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
    const profil = c.get<AuthProfile>('profil')

    // Récupérer depuis auth_medecins (pas auth_profiles)
    const { data: med } = await sb
      .from('auth_medecins')
      .select('signature_url')
      .eq('profile_id', profil.id)
      .single()

    if (!med?.signature_url) {
      return c.json({ error: 'Aucune signature \u00e0 supprimer' }, 404)
    }

    const parts    = med.signature_url.split('/')
    const filename = parts[parts.length - 1]

    if (filename) {
      await sb.storage.from('signatures').remove([filename])
    }

    await sb
      .from('auth_medecins')
      .update({ signature_url: null })
      .eq('profile_id', profil.id)

    return c.json({ success: true, message: 'Signature supprim\u00e9e avec succ\u00e8s' })
  }
)

// ═══════════════════════════════════════════════════════════
// POST /upload/avatar
// Rôles : tous les utilisateurs authentifiés
// Bucket : avatars (public)
// Table  : auth_profiles.photo_url (colonne réelle DB)
// ═══════════════════════════════════════════════════════════

uploadRoutes.post('/avatar', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')

  const formData = await c.req.formData()
  const file     = formData.get('avatar') as File | null

  const err = validateImage(file, MAX_AVATAR_MB)
  if (err) return c.json({ error: err }, 400)

  const ext      = (file!.name.split('.').pop() ?? 'jpg').toLowerCase()
  const filename = `avatar-${profil.id}-${Date.now()}.${ext}`
  const buffer   = await file!.arrayBuffer()

  const { error: upErr } = await sb.storage
    .from('avatars')
    .upload(filename, buffer, { contentType: file!.type, upsert: true })

  if (upErr) {
    console.error('Upload avatar:', upErr.message)
    return c.json({ error: "Erreur lors de l'upload de l'avatar" }, 500)
  }

  const { data: urlData } = sb.storage.from('avatars').getPublicUrl(filename)
  const photo_url = urlData.publicUrl

  const { error: dbErr } = await sb
    .from('auth_profiles')
    .update({ photo_url })
    .eq('id', profil.id)

  if (dbErr) {
    console.error('Update photo_url:', dbErr.message)
    return c.json({ error: 'Avatar upload\u00e9 mais erreur mise \u00e0 jour profil' }, 500)
  }

  return c.json({ success: true, photo_url, message: 'Photo de profil mise \u00e0 jour' })
})

// ═══════════════════════════════════════════════════════════
// DELETE /upload/avatar
// ═══════════════════════════════════════════════════════════

uploadRoutes.delete('/avatar', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')

  const { data: profile } = await sb
    .from('auth_profiles')
    .select('photo_url')
    .eq('id', profil.id)
    .single()

  if (!profile?.photo_url) {
    return c.json({ error: 'Aucun avatar \u00e0 supprimer' }, 404)
  }

  const parts    = profile.photo_url.split('/')
  const filename = parts[parts.length - 1]

  if (filename) {
    await sb.storage.from('avatars').remove([filename])
  }

  await sb
    .from('auth_profiles')
    .update({ photo_url: null })
    .eq('id', profil.id)

  return c.json({ success: true, message: 'Avatar supprim\u00e9 avec succ\u00e8s' })
})

/*
 * ═══════════════════════════════════════════════════════════
 * SQL À EXÉCUTER dans Supabase → SQL Editor
 * (en complément de la section 11 de la documentation)
 * ═══════════════════════════════════════════════════════════
 *
 * -- Bucket logos structures (public)
 * INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
 * VALUES ('structures', 'structures', true, 2097152,
 *   ARRAY['image/jpeg','image/png','image/webp'])
 * ON CONFLICT (id) DO UPDATE SET public = true;
 *
 * -- Bucket signatures médecins (PRIVÉ)
 * INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
 * VALUES ('signatures', 'signatures', false, 1048576,
 *   ARRAY['image/jpeg','image/png','image/webp'])
 * ON CONFLICT (id) DO UPDATE SET public = false;
 *
 * -- Policies signatures (authentifié seulement)
 * CREATE POLICY IF NOT EXISTS "signatures_insert" ON storage.objects
 *   FOR INSERT TO authenticated WITH CHECK (bucket_id = 'signatures');
 * CREATE POLICY IF NOT EXISTS "signatures_select" ON storage.objects
 *   FOR SELECT TO authenticated USING (bucket_id = 'signatures');
 * CREATE POLICY IF NOT EXISTS "signatures_update" ON storage.objects
 *   FOR UPDATE TO authenticated USING (bucket_id = 'signatures');
 * CREATE POLICY IF NOT EXISTS "signatures_delete" ON storage.objects
 *   FOR DELETE TO authenticated USING (bucket_id = 'signatures');
 *
 * -- Policies structures (public read, authenticated write)
 * CREATE POLICY IF NOT EXISTS "structures_select" ON storage.objects
 *   FOR SELECT TO public USING (bucket_id = 'structures');
 * CREATE POLICY IF NOT EXISTS "structures_insert" ON storage.objects
 *   FOR INSERT TO authenticated WITH CHECK (bucket_id = 'structures');
 * CREATE POLICY IF NOT EXISTS "structures_update" ON storage.objects
 *   FOR UPDATE TO authenticated USING (bucket_id = 'structures');
 * CREATE POLICY IF NOT EXISTS "structures_delete" ON storage.objects
 *   FOR DELETE TO authenticated USING (bucket_id = 'structures');
 *
 * -- La colonne photo_url est déjà dans auth_profiles (vérifiée dans le schéma DB)
 * ═══════════════════════════════════════════════════════════
 */