/**
 * Service de notifications automatiques
 * Gère l'envoi automatique d'emails pour :
 * - Rappels RDV (J-1)
 * - Résultats examens disponibles
 * - Ordonnances prêtes
 */

import { sendEmail } from './email'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Interface notification email
 */
interface NotificationEmail {
  to: string
  subject: string
  htmlContent: string
}

/**
 * Vérifier si utilisateur a activé les notifications email
 */
async function canSendNotification(
  supabase: SupabaseClient,
  userId: string,
  notificationType: 'rdv' | 'resultats' | 'ordonnances'
): Promise<boolean> {
  const { data: settings } = await supabase
    .from('user_settings')
    .select('email_notifications, email_rdv_rappel, email_resultats, email_ordonnances')
    .eq('user_id', userId)
    .single()

  if (!settings || !settings.email_notifications) return false

  switch (notificationType) {
    case 'rdv':
      return settings.email_rdv_rappel
    case 'resultats':
      return settings.email_resultats
    case 'ordonnances':
      return settings.email_ordonnances
    default:
      return false
  }
}

/**
 * Envoyer notification RDV (rappel J-1)
 */
export async function envoyerRappelRDV(
  supabase: SupabaseClient,
  rdvId: string,
  resendApiKey: string
): Promise<boolean> {
  try {
    // Récupérer infos RDV
    const { data: rdv, error } = await supabase
      .from('rdv_appointments')
      .select(`
        *,
        patient:patient_dossiers(nom, prenom, email),
        medecin:auth_profiles!rdv_appointments_medecin_id_fkey(nom, prenom, specialite),
        structure:struct_structures(nom, adresse, telephone)
      `)
      .eq('id', rdvId)
      .single()

    if (error || !rdv || !rdv.patient) return false

    // Vérifier si patient a activé notifications RDV
    const { data: patientProfile } = await supabase
      .from('patient_dossiers')
      .select('profile_id')
      .eq('id', rdv.patient_id)
      .single()

    if (!patientProfile) return false

    const canSend = await canSendNotification(supabase, patientProfile.profile_id, 'rdv')
    if (!canSend) return false

    // Formater date/heure
    const dateRdv = new Date(rdv.date_rdv)
    const dateFormatee = dateRdv.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const heureFormatee = dateRdv.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })

    // Email HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .info-row { margin: 10px 0; }
          .label { font-weight: bold; color: #64748b; }
          .value { color: #1e293b; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Rappel de rendez-vous</h1>
          </div>
          <div class="content">
            <p>Bonjour ${rdv.patient.prenom} ${rdv.patient.nom},</p>
            
            <p>Nous vous rappelons que vous avez un rendez-vous médical demain :</p>
            
            <div class="card">
              <div class="info-row">
                <span class="label">📅 Date :</span>
                <span class="value">${dateFormatee}</span>
              </div>
              <div class="info-row">
                <span class="label">🕐 Heure :</span>
                <span class="value">${heureFormatee}</span>
              </div>
              <div class="info-row">
                <span class="label">👨‍⚕️ Médecin :</span>
                <span class="value">Dr ${rdv.medecin.nom} ${rdv.medecin.prenom}${rdv.medecin.specialite ? ` (${rdv.medecin.specialite})` : ''}</span>
              </div>
              <div class="info-row">
                <span class="label">🏥 Lieu :</span>
                <span class="value">${rdv.structure.nom}</span>
              </div>
              ${rdv.structure.adresse ? `
              <div class="info-row">
                <span class="label">📍 Adresse :</span>
                <span class="value">${rdv.structure.adresse}</span>
              </div>
              ` : ''}
              ${rdv.motif ? `
              <div class="info-row">
                <span class="label">💬 Motif :</span>
                <span class="value">${rdv.motif}</span>
              </div>
              ` : ''}
            </div>
            
            <p><strong>⚠️ Important :</strong></p>
            <ul>
              <li>Merci d'arriver 10 minutes avant l'heure du rendez-vous</li>
              <li>Apportez votre carte d'identité et votre carnet de santé</li>
              <li>En cas d'empêchement, merci de prévenir au plus tôt</li>
            </ul>
            
            ${rdv.structure.telephone ? `
            <p>Contact : ${rdv.structure.telephone}</p>
            ` : ''}
            
            <div class="footer">
              <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
              <p>SantéBF - Système National de Santé Numérique</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    // Envoyer email
    const emailEnvoye = await sendEmail({
      to: rdv.patient.email || '',
      subject: `Rappel : Rendez-vous médical demain à ${heureFormatee}`,
      html: htmlContent
    }, resendApiKey)

    return emailEnvoye
  } catch (error) {
    console.error('Erreur envoi rappel RDV:', error)
    return false
  }
}

/**
 * Envoyer notification résultat examen disponible
 */
export async function envoyerNotificationResultatExamen(
  supabase: SupabaseClient,
  examenId: string,
  typeExamen: 'laboratoire' | 'radiologie',
  resendApiKey: string
): Promise<boolean> {
  try {
    const table = typeExamen === 'laboratoire' ? 'medical_examens' : 'medical_examens_imagerie'
    
    // Récupérer infos examen
    const { data: examen, error } = await supabase
      .from(table)
      .select(`
        *,
        patient:patient_dossiers(nom, prenom, email, profile_id),
        structure:struct_structures(nom)
      `)
      .eq('id', examenId)
      .single()

    if (error || !examen || !examen.patient) return false

    // Vérifier si patient a activé notifications résultats
    const canSend = await canSendNotification(supabase, examen.patient.profile_id, 'resultats')
    if (!canSend) return false

    const typeExamenLabel = typeExamen === 'laboratoire' ? 'analyse biologique' : 'examen d\'imagerie'

    // Email HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Résultats d'examen disponibles</h1>
          </div>
          <div class="content">
            <p>Bonjour ${examen.patient.prenom} ${examen.patient.nom},</p>
            
            <p>Nous avons le plaisir de vous informer que les résultats de votre ${typeExamenLabel} sont maintenant disponibles.</p>
            
            <div class="card">
              <p><strong>📋 Type d'examen :</strong> ${examen.type_examen || typeExamenLabel}</p>
              <p><strong>🏥 Structure :</strong> ${examen.structure.nom}</p>
              <p><strong>📅 Date de l'examen :</strong> ${new Date(examen.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
            
            <p>Vous pouvez consulter vos résultats en vous connectant à votre espace patient :</p>
            
            <a href="https://santebf.pages.dev/patient/examens" class="button">Consulter mes résultats</a>
            
            <p style="margin-top: 30px;"><strong>⚠️ Important :</strong> Si vous avez des questions concernant vos résultats, n'hésitez pas à prendre rendez-vous avec votre médecin.</p>
            
            <div class="footer">
              <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
              <p>SantéBF - Système National de Santé Numérique</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    // Envoyer email
    const emailEnvoye = await sendEmail({
      to: examen.patient.email || '',
      subject: `Résultats d'examen disponibles - ${examen.structure.nom}`,
      html: htmlContent
    }, resendApiKey)

    return emailEnvoye
  } catch (error) {
    console.error('Erreur envoi notification résultat:', error)
    return false
  }
}

/**
 * Envoyer notification ordonnance prête
 */
export async function envoyerNotificationOrdonnance(
  supabase: SupabaseClient,
  ordonnanceId: string,
  resendApiKey: string
): Promise<boolean> {
  try {
    // Récupérer infos ordonnance
    const { data: ordonnance, error } = await supabase
      .from('medical_ordonnances')
      .select(`
        *,
        patient:patient_dossiers(nom, prenom, email, profile_id),
        medecin:auth_profiles!medical_ordonnances_medecin_id_fkey(nom, prenom),
        structure:struct_structures(nom, adresse, telephone)
      `)
      .eq('id', ordonnanceId)
      .single()

    if (error || !ordonnance || !ordonnance.patient) return false

    // Vérifier si patient a activé notifications ordonnances
    const canSend = await canSendNotification(supabase, ordonnance.patient.profile_id, 'ordonnances')
    if (!canSend) return false

    // Email HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💊 Nouvelle ordonnance disponible</h1>
          </div>
          <div class="content">
            <p>Bonjour ${ordonnance.patient.prenom} ${ordonnance.patient.nom},</p>
            
            <p>Une nouvelle ordonnance a été créée pour vous par le Dr ${ordonnance.medecin.nom} ${ordonnance.medecin.prenom}.</p>
            
            <div class="card">
              <p><strong>📄 N° ordonnance :</strong> ${ordonnance.numero_ordonnance}</p>
              <p><strong>👨‍⚕️ Médecin :</strong> Dr ${ordonnance.medecin.nom} ${ordonnance.medecin.prenom}</p>
              <p><strong>🏥 Structure :</strong> ${ordonnance.structure.nom}</p>
              <p><strong>📅 Date de création :</strong> ${new Date(ordonnance.created_at).toLocaleDateString('fr-FR')}</p>
              ${ordonnance.date_expiration ? `
              <p><strong>⏰ Valable jusqu'au :</strong> ${new Date(ordonnance.date_expiration).toLocaleDateString('fr-FR')}</p>
              ` : ''}
            </div>
            
            <p>Vous pouvez télécharger votre ordonnance en format PDF depuis votre espace patient :</p>
            
            <a href="https://santebf.pages.dev/patient/ordonnances" class="button">Télécharger mon ordonnance</a>
            
            <p style="margin-top: 30px;"><strong>💡 Bon à savoir :</strong></p>
            <ul>
              <li>Présentez cette ordonnance à la pharmacie pour obtenir vos médicaments</li>
              <li>Respectez les doses et durées de traitement prescrites</li>
              <li>En cas d'effets indésirables, contactez votre médecin</li>
            </ul>
            
            ${ordonnance.structure.telephone ? `
            <p>Contact : ${ordonnance.structure.telephone}</p>
            ` : ''}
            
            <div class="footer">
              <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
              <p>SantéBF - Système National de Santé Numérique</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    // Envoyer email
    const emailEnvoye = await sendEmail({
      to: ordonnance.patient.email || '',
      subject: `Nouvelle ordonnance disponible - ${ordonnance.structure.nom}`,
      html: htmlContent
    }, resendApiKey)

    return emailEnvoye
  } catch (error) {
    console.error('Erreur envoi notification ordonnance:', error)
    return false
  }
}

/**
 * Fonction helper pour déclencher notification depuis les routes
 */
export async function declencherNotification(
  type: 'rdv' | 'resultat_labo' | 'resultat_radio' | 'ordonnance',
  supabase: SupabaseClient,
  id: string,
  resendApiKey: string
): Promise<boolean> {
  switch (type) {
    case 'rdv':
      return await envoyerRappelRDV(supabase, id, resendApiKey)
    case 'resultat_labo':
      return await envoyerNotificationResultatExamen(supabase, id, 'laboratoire', resendApiKey)
    case 'resultat_radio':
      return await envoyerNotificationResultatExamen(supabase, id, 'radiologie', resendApiKey)
    case 'ordonnance':
      return await envoyerNotificationOrdonnance(supabase, id, resendApiKey)
    default:
      return false
  }
}
