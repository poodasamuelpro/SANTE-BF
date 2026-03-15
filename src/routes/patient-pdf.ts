/**
 * Routes pour téléchargement PDF patient
 * Permet au patient de télécharger ses PDF (ordonnances, certificats, bulletins)
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { genererOrdonnancePDF, genererBulletinExamenPDF } from '../utils/pdf'

export const patientPdfRoutes = new Hono()

// Middleware auth
patientPdfRoutes.use('*', requireAuth)
patientPdfRoutes.use('*', requireRole(['patient']))

/**
 * GET /patient/ordonnances/:id/pdf
 * Télécharger ordonnance en PDF
 */
patientPdfRoutes.get('/ordonnances/:id/pdf', async (c) => {
  const profil = c.get('profil')
  const supabase = c.get('supabase')
  const ordonnanceId = c.req.param('id')

  try {
    // Récupérer le dossier patient
    const { data: dossier } = await supabase
      .from('patient_dossiers')
      .select('id')
      .eq('profile_id', profil.id)
      .single()

    if (!dossier) {
      return c.json({ error: 'Dossier patient non trouvé' }, 404)
    }

    // Récupérer l'ordonnance avec toutes les infos
    const { data: ordonnance, error } = await supabase
      .from('medical_ordonnances')
      .select(`
        *,
        patient:patient_dossiers(nom, prenom, date_naissance, sexe, numero_national),
        medecin:auth_profiles!medical_ordonnances_medecin_id_fkey(nom, prenom, specialite, ordre_numero, signature_url),
        structure:struct_structures(nom, type, adresse, telephone, logo_url),
        prescriptions:medical_prescriptions(medicament, posologie, duree, quantite)
      `)
      .eq('id', ordonnanceId)
      .eq('patient_id', dossier.id)
      .single()

    if (error || !ordonnance) {
      return c.json({ error: 'Ordonnance non trouvée' }, 404)
    }

    // Générer PDF
    const pdfBytes = await genererOrdonnancePDF({
      numero: ordonnance.numero_ordonnance,
      date: new Date(ordonnance.created_at),
      patient: {
        nom: ordonnance.patient.nom,
        prenom: ordonnance.patient.prenom,
        dateNaissance: ordonnance.patient.date_naissance,
        sexe: ordonnance.patient.sexe,
        numeroNational: ordonnance.patient.numero_national
      },
      medecin: {
        nom: ordonnance.medecin.nom,
        prenom: ordonnance.medecin.prenom,
        specialite: ordonnance.medecin.specialite || '',
        ordreNumero: ordonnance.medecin.ordre_numero || '',
        signatureUrl: ordonnance.medecin.signature_url || ''
      },
      structure: {
        nom: ordonnance.structure.nom,
        type: ordonnance.structure.type,
        adresse: ordonnance.structure.adresse || '',
        telephone: ordonnance.structure.telephone || '',
        logoUrl: ordonnance.structure.logo_url || ''
      },
      prescriptions: ordonnance.prescriptions.map((p: any) => ({
        medicament: p.medicament,
        posologie: p.posologie,
        duree: p.duree,
        quantite: p.quantite
      })),
      qrCode: ordonnance.qr_code_verification || ''
    })

    // Retourner PDF
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ordonnance-${ordonnance.numero_ordonnance}.pdf"`
      }
    })
  } catch (error) {
    console.error('Erreur génération PDF ordonnance:', error)
    return c.json({ error: 'Erreur génération PDF' }, 500)
  }
})

/**
 * GET /patient/examens/:id/bulletin
 * Télécharger bulletin d'examen en PDF
 */
patientPdfRoutes.get('/examens/:id/bulletin', async (c) => {
  const profil = c.get('profil')
  const supabase = c.get('supabase')
  const examenId = c.req.param('id')
  const typeExamen = c.req.query('type') || 'laboratoire' // laboratoire ou radiologie

  try {
    // Récupérer le dossier patient
    const { data: dossier } = await supabase
      .from('patient_dossiers')
      .select('id')
      .eq('profile_id', profil.id)
      .single()

    if (!dossier) {
      return c.json({ error: 'Dossier patient non trouvé' }, 404)
    }

    const table = typeExamen === 'laboratoire' ? 'medical_examens' : 'medical_examens_imagerie'

    // Récupérer l'examen
    const { data: examen, error } = await supabase
      .from(table)
      .select(`
        *,
        patient:patient_dossiers(nom, prenom, date_naissance, sexe, numero_national),
        medecin:auth_profiles!${table}_demandeur_id_fkey(nom, prenom, specialite),
        structure:struct_structures(nom, type, adresse, telephone, logo_url)
      `)
      .eq('id', examenId)
      .eq('patient_id', dossier.id)
      .single()

    if (error || !examen) {
      return c.json({ error: 'Examen non trouvé' }, 404)
    }

    // Vérifier que résultats sont disponibles
    if (examen.statut !== 'resultat_disponible' && !examen.valide_par) {
      return c.json({ error: 'Résultats pas encore disponibles' }, 400)
    }

    // Générer PDF bulletin
    const pdfBytes = await genererBulletinExamenPDF({
      typeExamen: examen.type_examen || typeExamen,
      date: new Date(examen.created_at),
      dateResultat: examen.date_resultat ? new Date(examen.date_resultat) : new Date(),
      patient: {
        nom: examen.patient.nom,
        prenom: examen.patient.prenom,
        dateNaissance: examen.patient.date_naissance,
        sexe: examen.patient.sexe,
        numeroNational: examen.patient.numero_national
      },
      medecin: {
        nom: examen.medecin.nom,
        prenom: examen.medecin.prenom,
        specialite: examen.medecin.specialite || ''
      },
      structure: {
        nom: examen.structure.nom,
        type: examen.structure.type,
        adresse: examen.structure.adresse || '',
        telephone: examen.structure.telephone || '',
        logoUrl: examen.structure.logo_url || ''
      },
      resultats: examen.resultats || {},
      conclusion: examen.conclusion || examen.compte_rendu || '',
      technicien: examen.technicien_nom || examen.radiologue_nom || ''
    })

    // Retourner PDF
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bulletin-${typeExamen}-${examenId}.pdf"`
      }
    })
  } catch (error) {
    console.error('Erreur génération bulletin PDF:', error)
    return c.json({ error: 'Erreur génération PDF' }, 500)
  }
})

/**
 * GET /patient/ordonnances
 * Liste ordonnances du patient avec boutons PDF
 */
patientPdfRoutes.get('/ordonnances', async (c) => {
  const profil = c.get('profil')
  const supabase = c.get('supabase')

  try {
    // Récupérer le dossier patient
    const { data: dossier } = await supabase
      .from('patient_dossiers')
      .select('id')
      .eq('profile_id', profil.id)
      .single()

    if (!dossier) {
      return c.text('Dossier patient non trouvé', 404)
    }

    // Récupérer ordonnances
    const { data: ordonnances } = await supabase
      .from('medical_ordonnances')
      .select(`
        *,
        medecin:auth_profiles!medical_ordonnances_medecin_id_fkey(nom, prenom, specialite)
      `)
      .eq('patient_id', dossier.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Page HTML avec liste et boutons PDF
    return c.html(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mes ordonnances - SantéBF</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui; background: #f3f4f6; padding: 20px; }
          .container { max-width: 1200px; margin: 0 auto; }
          .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .back-link { color: #3b82f6; text-decoration: none; }
          .ordonnance-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .ordonnance-info h3 { margin-bottom: 5px; color: #333; }
          .ordonnance-meta { color: #666; font-size: 14px; }
          .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
          }
          .badge-active { background: #dcfce7; color: #166534; }
          .badge-expiree { background: #fee2e2; color: #991b1b; }
          .btn-pdf {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
          }
          .btn-pdf:hover { background: #2563eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <a href="/dashboard/patient" class="back-link">← Retour au dashboard</a>
            <h1 style="margin-top: 15px;">💊 Mes ordonnances</h1>
          </div>

          ${ordonnances && ordonnances.length > 0 ? ordonnances.map((o: any) => `
            <div class="ordonnance-card">
              <div class="ordonnance-info">
                <h3>
                  Ordonnance N° ${o.numero_ordonnance}
                  <span class="badge ${o.statut === 'active' ? 'badge-active' : 'badge-expiree'}">
                    ${o.statut}
                  </span>
                </h3>
                <div class="ordonnance-meta">
                  Dr ${o.medecin?.nom} ${o.medecin?.prenom} •
                  ${new Date(o.created_at).toLocaleDateString('fr-FR')}
                  ${o.date_expiration ? ` • Expire le ${new Date(o.date_expiration).toLocaleDateString('fr-FR')}` : ''}
                </div>
              </div>
              <a href="/patient/ordonnances/${o.id}/pdf" class="btn-pdf">
                📥 Télécharger PDF
              </a>
            </div>
          `).join('') : '<p style="text-align:center;padding:40px;color:#666;">Aucune ordonnance</p>'}
        </div>
      </body>
      </html>
    `)
  } catch (error) {
    console.error('Erreur liste ordonnances:', error)
    return c.text('Erreur serveur', 500)
  }
})

/**
 * GET /patient/examens
 * Liste examens du patient avec boutons PDF
 */
patientPdfRoutes.get('/examens', async (c) => {
  const profil = c.get('profil')
  const supabase = c.get('supabase')

  try {
    // Récupérer le dossier patient
    const { data: dossier } = await supabase
      .from('patient_dossiers')
      .select('id')
      .eq('profile_id', profil.id)
      .single()

    if (!dossier) {
      return c.text('Dossier patient non trouvé', 404)
    }

    // Récupérer examens laboratoire
    const { data: examensLabo } = await supabase
      .from('medical_examens')
      .select(`
        *,
        medecin:auth_profiles!medical_examens_demandeur_id_fkey(nom, prenom)
      `)
      .eq('patient_id', dossier.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Récupérer examens radiologie
    const { data: examensRadio } = await supabase
      .from('medical_examens_imagerie')
      .select(`
        *,
        medecin:auth_profiles!medical_examens_imagerie_demandeur_id_fkey(nom, prenom)
      `)
      .eq('patient_id', dossier.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const examens = [
      ...(examensLabo || []).map((e: any) => ({ ...e, typeCategorie: 'laboratoire' })),
      ...(examensRadio || []).map((e: any) => ({ ...e, typeCategorie: 'radiologie' }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Page HTML
    return c.html(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mes examens - SantéBF</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui; background: #f3f4f6; padding: 20px; }
          .container { max-width: 1200px; margin: 0 auto; }
          .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .back-link { color: #3b82f6; text-decoration: none; }
          .examen-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .examen-info h3 { margin-bottom: 5px; color: #333; }
          .examen-meta { color: #666; font-size: 14px; }
          .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
          }
          .badge-disponible { background: #dcfce7; color: #166534; }
          .badge-attente { background: #fef3c7; color: #92400e; }
          .btn-pdf {
            background: #10b981;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
          }
          .btn-pdf:hover { background: #059669; }
          .btn-pdf:disabled { background: #d1d5db; cursor: not-allowed; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <a href="/dashboard/patient" class="back-link">← Retour au dashboard</a>
            <h1 style="margin-top: 15px;">🧪 Résultats d'examens</h1>
          </div>

          ${examens && examens.length > 0 ? examens.map((e: any) => `
            <div class="examen-card">
              <div class="examen-info">
                <h3>
                  ${e.type_examen || e.typeCategorie}
                  <span class="badge ${e.statut === 'resultat_disponible' ? 'badge-disponible' : 'badge-attente'}">
                    ${e.statut === 'resultat_disponible' ? 'Disponible' : 'En attente'}
                  </span>
                </h3>
                <div class="examen-meta">
                  Dr ${e.medecin?.nom} ${e.medecin?.prenom} •
                  ${new Date(e.created_at).toLocaleDateString('fr-FR')}
                  ${e.date_resultat ? ` • Résultat le ${new Date(e.date_resultat).toLocaleDateString('fr-FR')}` : ''}
                </div>
              </div>
              ${e.statut === 'resultat_disponible' ? `
                <a href="/patient/examens/${e.id}/bulletin?type=${e.typeCategorie}" class="btn-pdf">
                  📥 Télécharger bulletin
                </a>
              ` : `
                <button class="btn-pdf" disabled>En attente de résultats</button>
              `}
            </div>
          `).join('') : '<p style="text-align:center;padding:40px;color:#666;">Aucun examen</p>'}
        </div>
      </body>
      </html>
    `)
  } catch (error) {
    console.error('Erreur liste examens:', error)
    return c.text('Erreur serveur', 500)
  }
})
