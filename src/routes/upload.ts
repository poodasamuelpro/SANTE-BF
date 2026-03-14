/**
 * Routes pour l'upload de fichiers (logo structure, signature médecin)
 * Utilise Cloudflare R2 pour le stockage
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'

export const uploadRoutes = new Hono()

// Middleware auth
uploadRoutes.use('*', requireAuth)

/**
 * POST /upload/logo-structure
 * Upload logo de la structure sanitaire
 * Rôle: admin_structure uniquement
 */
uploadRoutes.post('/logo-structure', requireRole(['admin_structure', 'super_admin']), async (c) => {
  try {
    const profil = c.get('profil')
    const supabase = c.get('supabase')
    
    // Récupérer le fichier depuis le form-data
    const formData = await c.req.formData()
    const file = formData.get('logo') as File
    
    if (!file) {
      return c.json({ error: 'Aucun fichier fourni' }, 400)
    }
    
    // Validation type de fichier
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Format invalide. Acceptés: PNG, JPG, JPEG, WEBP' }, 400)
    }
    
    // Validation taille (max 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return c.json({ error: 'Fichier trop volumineux (max 2MB)' }, 400)
    }
    
    // Générer nom unique
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `logo-structure-${profil.structure_id}-${timestamp}.${extension}`
    
    // Upload vers Cloudflare R2 (via Supabase Storage)
    const fileBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('structures')
      .upload(filename, fileBuffer, {
        contentType: file.type,
        upsert: true
      })
    
    if (uploadError) {
      console.error('Erreur upload R2:', uploadError)
      return c.json({ error: 'Erreur lors de l\'upload' }, 500)
    }
    
    // Récupérer URL publique
    const { data: urlData } = supabase
      .storage
      .from('structures')
      .getPublicUrl(filename)
    
    const logo_url = urlData.publicUrl
    
    // Mettre à jour la structure dans la DB
    const { error: updateError } = await supabase
      .from('struct_structures')
      .update({ logo_url })
      .eq('id', profil.structure_id)
    
    if (updateError) {
      console.error('Erreur update DB:', updateError)
      return c.json({ error: 'Erreur mise à jour base de données' }, 500)
    }
    
    return c.json({
      success: true,
      logo_url,
      message: 'Logo uploadé avec succès'
    })
    
  } catch (error) {
    console.error('Erreur upload logo:', error)
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

/**
 * POST /upload/signature-medecin
 * Upload signature numérique du médecin
 * Rôle: medecin uniquement
 */
uploadRoutes.post('/signature-medecin', requireRole(['medecin', 'super_admin']), async (c) => {
  try {
    const profil = c.get('profil')
    const supabase = c.get('supabase')
    
    const formData = await c.req.formData()
    const file = formData.get('signature') as File
    
    if (!file) {
      return c.json({ error: 'Aucun fichier fourni' }, 400)
    }
    
    // Validation type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Format invalide. Acceptés: PNG, JPG, JPEG, WEBP' }, 400)
    }
    
    // Validation taille (max 1MB pour signature)
    const maxSize = 1 * 1024 * 1024 // 1MB
    if (file.size > maxSize) {
      return c.json({ error: 'Fichier trop volumineux (max 1MB)' }, 400)
    }
    
    // Générer nom unique
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `signature-medecin-${profil.id}-${timestamp}.${extension}`
    
    // Upload vers R2
    const fileBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('signatures')
      .upload(filename, fileBuffer, {
        contentType: file.type,
        upsert: true
      })
    
    if (uploadError) {
      console.error('Erreur upload signature:', uploadError)
      return c.json({ error: 'Erreur lors de l\'upload' }, 500)
    }
    
    // URL publique
    const { data: urlData } = supabase
      .storage
      .from('signatures')
      .getPublicUrl(filename)
    
    const signature_url = urlData.publicUrl
    
    // Mettre à jour le profil médecin
    const { error: updateError } = await supabase
      .from('auth_profiles')
      .update({ signature_url })
      .eq('id', profil.id)
    
    if (updateError) {
      console.error('Erreur update profil:', updateError)
      return c.json({ error: 'Erreur mise à jour profil' }, 500)
    }
    
    return c.json({
      success: true,
      signature_url,
      message: 'Signature uploadée avec succès'
    })
    
  } catch (error) {
    console.error('Erreur upload signature:', error)
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

/**
 * DELETE /upload/logo-structure
 * Supprimer logo structure
 */
uploadRoutes.delete('/logo-structure', requireRole(['admin_structure', 'super_admin']), async (c) => {
  try {
    const profil = c.get('profil')
    const supabase = c.get('supabase')
    
    // Récupérer l'URL actuelle
    const { data: structure } = await supabase
      .from('struct_structures')
      .select('logo_url')
      .eq('id', profil.structure_id)
      .single()
    
    if (!structure?.logo_url) {
      return c.json({ error: 'Aucun logo à supprimer' }, 404)
    }
    
    // Extraire filename de l'URL
    const filename = structure.logo_url.split('/').pop()
    
    // Supprimer de R2
    await supabase
      .storage
      .from('structures')
      .remove([filename!])
    
    // Mettre à jour DB
    await supabase
      .from('struct_structures')
      .update({ logo_url: null })
      .eq('id', profil.structure_id)
    
    return c.json({
      success: true,
      message: 'Logo supprimé avec succès'
    })
    
  } catch (error) {
    console.error('Erreur suppression logo:', error)
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

/**
 * DELETE /upload/signature-medecin
 * Supprimer signature médecin
 */
uploadRoutes.delete('/signature-medecin', requireRole(['medecin', 'super_admin']), async (c) => {
  try {
    const profil = c.get('profil')
    const supabase = c.get('supabase')
    
    // Récupérer l'URL actuelle
    const { data: profile } = await supabase
      .from('auth_profiles')
      .select('signature_url')
      .eq('id', profil.id)
      .single()
    
    if (!profile?.signature_url) {
      return c.json({ error: 'Aucune signature à supprimer' }, 404)
    }
    
    // Extraire filename
    const filename = profile.signature_url.split('/').pop()
    
    // Supprimer de R2
    await supabase
      .storage
      .from('signatures')
      .remove([filename!])
    
    // Mettre à jour DB
    await supabase
      .from('auth_profiles')
      .update({ signature_url: null })
      .eq('id', profil.id)
    
    return c.json({
      success: true,
      message: 'Signature supprimée avec succès'
    })
    
  } catch (error) {
    console.error('Erreur suppression signature:', error)
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})
