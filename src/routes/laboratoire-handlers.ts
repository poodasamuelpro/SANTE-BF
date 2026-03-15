/**
 * Handlers POST pour module Laboratoire
 * Créer examen, sauvegarder résultats, générer PDF
 */

import type { Context } from 'hono'
import { examenLaboDetailPage } from '../pages/examen-labo-detail'
import { genererBulletinExamenPDF } from '../utils/pdf'
import { envoyerEmail } from '../utils/email'

/**
 * GET /laboratoire/examen/:id
 * Page détail avec saisie résultats
 */
export async function getExamenDetail(c: Context) {
  const supabase = c.get('supabase')
  const profil = c.get('profil')
  const id = c.req.param('id')
  
  try {
    const { data: examen, error } = await supabase
      .from('medical_examens')
      .select(`
        *,
        patient:patient_id (nom, prenom, numero_national, date_naissance, sexe),
        medecin_prescripteur:medecin_prescripteur_id (nom, prenom, specialite)
      `)
      .eq('id', id)
      .eq('structure_id', profil.structure_id!)
      .single()
    
    if (error || !examen) {
      return c.html('<h1>Examen non trouvé</h1>', 404)
    }
    
    return c.html(examenLaboDetailPage(profil, examen))
    
  } catch (error) {
    console.error('Erreur chargement examen:', error)
    return c.html('<h1>Erreur serveur</h1>', 500)
  }
}

/**
 * POST /laboratoire/examen/:id/resultats
 * Enregistrer ou valider résultats
 */
export async function postResultats(c: Context) {
  const supabase = c.get('supabase')
  const profil = c.get('profil')
  const id = c.req.param('id')
  
  try {
    const formData = await c.req.formData()
    const action = formData.get('action') as string
    
    // Parser résultats
    const resultats: any[] = []
    let index = 0
    while (formData.has(`resultats[${index}][parametre]`)) {
      const valeur = formData.get(`resultats[${index}][valeur]`) as string
      if (valeur && valeur.trim()) {
        resultats.push({
          parametre: formData.get(`resultats[${index}][parametre]`),
          valeur: valeur.trim(),
          unite: formData.get(`resultats[${index}][unite]`),
          valeurs_normales: formData.get(`resultats[${index}][valeurs_normales]`),
          interpretation: formData.get(`resultats[${index}][interpretation]`)
        })
      }
      index++
    }
    
    const conclusion = formData.get('conclusion') as string
    const technicien_nom = formData.get('technicien_nom') as string
    const date_prelevement = formData.get('date_prelevement') as string
    
    // Déterminer nouveau statut
    const nouveauStatut = action === 'valider' ? 'valide' : 'resultat_disponible'
    
    // Mise à jour examen
    const updateData: any = {
      resultats,
      conclusion,
      technicien_nom,
      statut: nouveauStatut,
      date_resultat: new Date().toISOString()
    }
    
    if (date_prelevement) {
      updateData.date_prelevement = date_prelevement
    }
    
    if (action === 'valider') {
      updateData.valide_par = profil.id
      updateData.date_validation = new Date().toISOString()
    }
    
    const { error: updateError } = await supabase
      .from('medical_examens')
      .update(updateData)
      .eq('id', id)
    
    if (updateError) throw updateError
    
    // Si validation : générer PDF et envoyer email
    if (action === 'valider') {
      // Récupérer données complètes
      const { data: examen } = await supabase
        .from('medical_examens')
        .select(`
          *,
          patient:patient_id (*),
          medecin_prescripteur:medecin_prescripteur_id (*),
          structure:structure_id (nom, logo_url, adresse, telephone)
        `)
        .eq('id', id)
        .single()
      
      if (examen) {
        // Générer PDF
        try {
          const pdfBuffer = await genererBulletinExamenPDF({
            structure: {
              nom: examen.structure.nom,
              type: examen.structure.type || 'Laboratoire',
              adresse: examen.structure.adresse,
              telephone: examen.structure.telephone,
              logo_url: examen.structure.logo_url
            },
            medecin_prescripteur: {
              nom: examen.medecin_prescripteur.nom,
              prenom: examen.medecin_prescripteur.prenom,
              specialite: examen.medecin_prescripteur.specialite
            },
            patient: {
              nom: examen.patient.nom,
              prenom: examen.patient.prenom,
              date_naissance: examen.patient.date_naissance,
              numero_national: examen.patient.numero_national
            },
            examen: {
              numero: examen.numero_examen,
              type: 'laboratoire',
              date_prelevement: examen.date_prelevement,
              date_resultat: examen.date_resultat,
              type_examen: examen.type_examen,
              indication_clinique: examen.instructions
            },
            resultats: examen.resultats,
            conclusion: examen.conclusion,
            technicien_nom: examen.technicien_nom
          })
          
          // TODO: Upload PDF vers R2 et obtenir URL
          const pdfUrl = '#' // À implémenter
          
          // Vérifier si patient a activé notifications email
          const { data: settings } = await supabase
            .from('user_settings')
            .select('email_notifications, email_resultats')
            .eq('user_id', examen.patient.profile_id)
            .single()
          
          if (settings?.email_notifications && settings?.email_resultats) {
            // Envoyer email au patient
            await envoyerEmail({
              destinataire: examen.patient.email, // Besoin d'ajouter email dans patient_dossiers
              sujet: `Vos résultats d'examen sont disponibles - ${examen.numero_examen}`,
              type: 'resultats_examens',
              data: {
                patient_nom: `${examen.patient.prenom} ${examen.patient.nom}`,
                type_examen: examen.type_examen,
                date: new Date().toLocaleDateString('fr-FR'),
                structure_nom: examen.structure.nom,
                lien_resultats: `https://santebf.pages.dev/dashboard/patient/examens/${id}`,
                pdf_url: pdfUrl
              }
            })
          }
        } catch (pdfError) {
          console.error('Erreur génération PDF:', pdfError)
          // Ne pas bloquer si PDF échoue
        }
      }
    }
    
    return c.redirect(`/laboratoire/examen/${id}?success=true`)
    
  } catch (error) {
    console.error('Erreur sauvegarde résultats:', error)
    return c.redirect(`/laboratoire/examen/${id}?error=true`)
  }
}

/**
 * GET /laboratoire/examen/:id/pdf
 * Télécharger bulletin PDF
 */
export async function downloadPDF(c: Context) {
  const supabase = c.get('supabase')
  const profil = c.get('profil')
  const id = c.req.param('id')
  
  try {
    // Récupérer examen validé
    const { data: examen, error } = await supabase
      .from('medical_examens')
      .select(`
        *,
        patient:patient_id (*),
        medecin_prescripteur:medecin_prescripteur_id (*),
        structure:structure_id (nom, type, logo_url, adresse, telephone)
      `)
      .eq('id', id)
      .eq('statut', 'valide')
      .single()
    
    if (error || !examen) {
      return c.text('Examen non trouvé ou non validé', 404)
    }
    
    // Générer PDF
    const pdfBuffer = await genererBulletinExamenPDF({
      structure: {
        nom: examen.structure.nom,
        type: examen.structure.type,
        adresse: examen.structure.adresse,
        telephone: examen.structure.telephone,
        logo_url: examen.structure.logo_url
      },
      medecin_prescripteur: {
        nom: examen.medecin_prescripteur.nom,
        prenom: examen.medecin_prescripteur.prenom,
        specialite: examen.medecin_prescripteur.specialite
      },
      patient: {
        nom: examen.patient.nom,
        prenom: examen.patient.prenom,
        date_naissance: examen.patient.date_naissance,
        numero_national: examen.patient.numero_national
      },
      examen: {
        numero: examen.numero_examen,
        type: 'laboratoire',
        date_prelevement: examen.date_prelevement,
        date_resultat: examen.date_resultat,
        type_examen: examen.type_examen,
        indication_clinique: examen.instructions
      },
      resultats: examen.resultats,
      conclusion: examen.conclusion,
      technicien_nom: examen.technicien_nom
    })
    
    // Retourner PDF
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Bulletin_${examen.numero_examen}.pdf"`
      }
    })
    
  } catch (error) {
    console.error('Erreur génération PDF:', error)
    return c.text('Erreur génération PDF', 500)
  }
}
