/**
 * src/routes/profil.ts
 * SantéBF — Upload photo de profil
 *
 * Reçoit l'image en base64 via JSON (compatible Cloudflare Workers).
 * Upload dans Supabase Storage bucket "avatars" (public).
 * Met à jour auth_profiles.avatar_url.
 *
 * Aucune modification fonctionnelle vs version originale — fichier déjà correct.
 * Correction mineure : typage Hono propre sans cast redondant.
 */

import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import type { Bindings, Variables } from '../lib/supabase'

export const profilRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

profilRoutes.use('/*', requireAuth)

// ── POST /profil/avatar ───────────────────────────────────

profilRoutes.post('/avatar', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const body = await c.req.json() as {
      fichier: string   // base64 sans préfixe data:...
      type:    string   // image/jpeg | image/png | image/webp
      nom:     string
    }

    if (!body.fichier || !body.type) {
      return c.json({ error: 'Fichier manquant' }, 400)
    }

    const typesAutorises = ['image/jpeg', 'image/png', 'image/webp']
    if (!typesAutorises.includes(body.type)) {
      return c.json({ error: 'Type non autorisé. Acceptés : JPEG, PNG, WEBP' }, 400)
    }

    // base64 → Uint8Array (Workers-compatible, pas de Buffer Node)
    const binaryStr = atob(body.fichier)
    const bytes     = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }

    if (bytes.length > 5 * 1024 * 1024) {
      return c.json({ error: 'Fichier trop volumineux (max 5 Mo)' }, 400)
    }

    const ext    = body.type === 'image/png' ? 'png' : body.type === 'image/webp' ? 'webp' : 'jpg'
    const chemin = `user-${profil.id}-${Date.now()}.${ext}`

    // Supprimer l'ancien avatar
    if (profil.avatar_url) {
      try {
        const parts    = profil.avatar_url.split('/avatars/')
        const ancienChemin = parts.length > 1 ? parts[1].split('?')[0] : null
        if (ancienChemin) {
          await supabase.storage.from('avatars').remove([ancienChemin])
        }
      } catch {
        // Suppression optionnelle — on continue même si ça échoue
      }
    }

    // Upload
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(chemin, bytes, { contentType: body.type, upsert: true })

    if (upErr) {
      console.error('Upload avatar:', upErr.message)
      return c.json({ error: 'Erreur upload : ' + upErr.message }, 500)
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(chemin)
    const publicUrl = urlData?.publicUrl
    if (!publicUrl) return c.json({ error: 'URL publique introuvable' }, 500)

    // Mettre à jour le profil
    const { error: dbErr } = await supabase
      .from('auth_profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', profil.id)

    if (dbErr) {
      console.error('Update avatar_url:', dbErr.message)
      return c.json({ error: 'Upload OK mais erreur mise à jour : ' + dbErr.message }, 500)
    }

    return c.json({ succes: true, url: publicUrl, message: 'Photo mise à jour avec succès' })

  } catch (err) {
    console.error('POST /profil/avatar:', err)
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// ── DELETE /profil/avatar ─────────────────────────────────

profilRoutes.delete('/avatar', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    if (profil.avatar_url) {
      const parts = profil.avatar_url.split('/avatars/')
      const chemin = parts.length > 1 ? parts[1].split('?')[0] : null
      if (chemin) {
        await supabase.storage.from('avatars').remove([chemin])
      }
    }

    await supabase
      .from('auth_profiles')
      .update({ avatar_url: null })
      .eq('id', profil.id)

    return c.json({ succes: true, message: 'Photo supprimée' })
  } catch (err) {
    console.error('DELETE /profil/avatar:', err)
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})
