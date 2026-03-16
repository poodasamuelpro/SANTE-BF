/**
 * Routes de gestion du profil utilisateur
 * - Upload photo de profil → Supabase Storage (bucket: avatars)
 * 
 * ✅ PRÉREQUIS SUPABASE :
 * 1. Créer un bucket "avatars" dans Storage → Public = true
 * 2. Ajouter cette policy RLS :
 *    INSERT : authenticated users can insert their own avatar
 *    UPDATE : authenticated users can update their own avatar
 *    Ou plus simple : bucket public avec policy "allow all authenticated"
 */

import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import type { AuthProfile, Bindings, Variables } from '../lib/supabase'

export const profilRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

profilRoutes.use('/*', requireAuth)

/**
 * POST /profil/avatar
 * Reçoit une image en base64, l'upload dans Supabase Storage
 * et met à jour auth_profiles.avatar_url
 */
profilRoutes.post('/avatar', async (c) => {
  const profil  = c.get('profil') as AuthProfile
  const supabase = c.get('supabase')

  try {
    const body = await c.req.json() as {
      fichier: string   // base64 sans le préfixe data:...
      type: string      // image/jpeg, image/png, image/webp
      nom: string       // nom du fichier original
    }

    if (!body.fichier || !body.type) {
      return c.json({ error: 'Fichier manquant' }, 400)
    }

    // Vérifier type autorisé
    const typesAutorises = ['image/jpeg', 'image/png', 'image/webp']
    if (!typesAutorises.includes(body.type)) {
      return c.json({ error: 'Type de fichier non autorisé' }, 400)
    }

    // Convertir base64 → Uint8Array
    const binaryStr = atob(body.fichier)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }

    // Vérifier taille (5 Mo max)
    if (bytes.length > 5 * 1024 * 1024) {
      return c.json({ error: 'Fichier trop volumineux (max 5 Mo)' }, 400)
    }

    // Générer nom unique : avatars/user-{id}-{timestamp}.jpg
    const extension = body.type === 'image/png' ? 'png' : body.type === 'image/webp' ? 'webp' : 'jpg'
    const chemin = `user-${profil.id}-${Date.now()}.${extension}`

    // Supprimer l'ancien avatar si existe
    if (profil.avatar_url) {
      try {
        const urlParts = profil.avatar_url.split('/avatars/')
        if (urlParts.length > 1) {
          const ancienChemin = urlParts[1].split('?')[0]
          await supabase.storage.from('avatars').remove([ancienChemin])
        }
      } catch (e) {
        // On ignore l'erreur de suppression de l'ancien
        console.warn('Impossible de supprimer l\'ancien avatar:', e)
      }
    }

    // Upload dans Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(chemin, bytes, {
        contentType: body.type,
        upsert: true,
      })

    if (uploadError || !uploadData) {
      console.error('Erreur upload Supabase Storage:', uploadError)
      return c.json({ error: 'Erreur upload: ' + (uploadError?.message ?? 'inconnue') }, 500)
    }

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(chemin)

    const publicUrl = urlData?.publicUrl
    if (!publicUrl) {
      return c.json({ error: 'Impossible de récupérer l\'URL publique' }, 500)
    }

    // Mettre à jour auth_profiles
    const { error: updateError } = await supabase
      .from('auth_profiles')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profil.id)

    if (updateError) {
      console.error('Erreur mise à jour profil:', updateError)
      return c.json({ error: 'Upload OK mais erreur mise à jour profil: ' + updateError.message }, 500)
    }

    return c.json({
      succes: true,
      url: publicUrl,
      message: 'Photo mise à jour avec succès',
    })

  } catch (err) {
    console.error('Erreur route /profil/avatar:', err)
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

/**
 * DELETE /profil/avatar
 * Supprime la photo de profil
 */
profilRoutes.delete('/avatar', async (c) => {
  const profil  = c.get('profil') as AuthProfile
  const supabase = c.get('supabase')

  try {
    if (profil.avatar_url) {
      const urlParts = profil.avatar_url.split('/avatars/')
      if (urlParts.length > 1) {
        const chemin = urlParts[1].split('?')[0]
        await supabase.storage.from('avatars').remove([chemin])
      }
    }

    await supabase
      .from('auth_profiles')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('id', profil.id)

    return c.json({ succes: true, message: 'Photo supprimée' })

  } catch (err) {
    console.error('Erreur suppression avatar:', err)
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})
