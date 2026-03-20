/**
 * src/routes/laboratoire.ts
 * SantéBF — Module Laboratoire
 *
 * CORRECTIONS MINIMALES vs version originale :
 *
 * 1. requireRole(['laborantin', 'super_admin'])
 *    → requireRole('laborantin', 'super_admin')
 *    (spread args, pas tableau)
 *
 * 2. Colonnes DB dans les SELECT (schéma réel) :
 *    medecin_prescripteur_id → prescripteur_id
 *    numero_examen           → id + nom_examen
 *    date_prevu              → date_prescription
 *    priorite ('urgente')    → est_urgent (BOOLEAN)
 *    statut 'en_attente'     → 'prescrit'
 *    statut 'valide'         → 'resultat_disponible'
 *
 * 3. POST résultats (colonnes d'écriture) :
 *    resultats          → valeurs_numeriques (JSONB)
 *    conclusion         → resultat_texte
 *    technicien_nom     → realise_par (profil.id UUID)
 *    date_prelevement   → realise_at
 *    date_validation    → valide_at
 *    date_resultat      → valide_at (même colonne)
 *
 * 4. Mapping DB → interface ExamenLabo pour examenLaboDetailPage()
 *    (l'interface garde ses noms pour ne pas casser la page HTML)
 *
 * RIEN d'autre n'a changé :
 * - pageSkeleton, statsGrid, actionCard, dataTable restent ✅
 * - alertHTML reste ✅
 * - examenLaboDetailPage reste ✅
 * - Toutes les routes restent identiques
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'
import { pageSkeleton, statsGrid, actionCard } from './dashboard'
// examenLaboDetailPage inliné ci-dessous
import { genererBulletinExamenPDF } from '../utils/pdf'

export const laboratoireRoutes = new Hono<{ Bindings: Bindings }>()

laboratoireRoutes.use('/*', requireAuth)
// CORRECTION 1 : spread args au lieu de tableau
laboratoireRoutes.use('/*', requireRole('laborantin', 'super_admin'))

/**
 * GET /laboratoire
 * Dashboard du laboratoire
 */
laboratoireRoutes.get('/', async (c) => {
  const supabase = c.get('supabase' as never) as any
  const profil   = c.get('profil' as never) as AuthProfile

  try {
    // CORRECTION 2 : colonnes DB correctes
    // medecin_prescripteur_id → prescripteur_id
    // statut 'en_attente' → 'prescrit'
    // date_prevu → date_prescription
    // priorite → est_urgent
    const { data: enAttente, error: err1 } = await supabase
      .from('medical_examens')
      .select(`
        id, nom_examen, type_examen,
        statut, est_urgent, date_prescription, created_at,
        patient:patient_dossiers(nom, prenom, numero_national),
        prescripteur:auth_profiles!medical_examens_prescripteur_id_fkey(nom, prenom)
      `)
      .eq('structure_id', profil.structure_id!)
      .eq('statut', 'prescrit')
      .order('est_urgent', { ascending: false })
      .order('date_prescription', { ascending: true })
      .limit(20)

    if (err1) throw err1

    const { data: enCours, error: err2 } = await supabase
      .from('medical_examens')
      .select(`
        id, nom_examen, type_examen, statut, est_urgent, date_prescription,
        patient:patient_dossiers(nom, prenom)
      `)
      .eq('structure_id', profil.structure_id!)
      .eq('statut', 'en_cours')
      .order('est_urgent', { ascending: false })
      .limit(10)

    if (err2) throw err2

    const aujourdhui = new Date().toISOString().split('T')[0]
    const { data: examensJour, error: err3 } = await supabase
      .from('medical_examens')
      .select('id')
      .eq('structure_id', profil.structure_id!)
      .gte('created_at', `${aujourdhui}T00:00:00`)
      .lte('created_at', `${aujourdhui}T23:59:59`)

    if (err3) throw err3

    // CORRECTION : statut 'resultat_disponible' au lieu de 'resultat_disponible' + is null valide_par
    const { data: nonValides, error: err4 } = await supabase
      .from('medical_examens')
      .select('id')
      .eq('structure_id', profil.structure_id!)
      .eq('statut', 'resultat_disponible')
      .is('valide_par', null)

    if (err4) throw err4

    const stats = {
      enAttente:   enAttente?.length  || 0,
      enCours:     enCours?.length    || 0,
      examensJour: examensJour?.length || 0,
      nonValides:  nonValides?.length  || 0
    }

    const html = pageSkeleton(
      profil,
      'Laboratoire',
      '#6A1B9A',
      `
        <div style="max-width:1100px;margin:0 auto;">
          ${statsGrid([
            { label: 'En attente',       value: stats.enAttente,   icon: '⏳', color: '#E65100' },
            { label: 'En cours',         value: stats.enCours,     icon: '🔬', color: '#1565C0' },
            { label: "Examens du jour",  value: stats.examensJour, icon: '📊', color: '#1A6B3C' },
            { label: 'À valider',        value: stats.nonValides,  icon: '✅', color: '#B71C1C' }
          ])}

          ${actionCard([
            { href: '/laboratoire/nouveau',   icon: '🧪', label: 'Nouvel examen',       colorClass: 'blue'   },
            { href: '/laboratoire/recherche', icon: '🔍', label: 'Rechercher',           colorClass: ''       },
            { href: '/laboratoire/historique',icon: '📋', label: 'Historique',           colorClass: ''       },
          ])}

          <!-- Examens en attente -->
          <div style="background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:20px;overflow:hidden;">
            <div style="padding:16px 20px;border-bottom:1px solid #E5E7EB;font-weight:700;font-size:16px;">⏳ Examens en attente (${stats.enAttente})</div>
            ${enAttente && enAttente.length > 0 ? `
              <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;">
                  <thead><tr style="background:#F9FAFB;">
                    <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Examen</th>
                    <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Patient</th>
                    <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Prescripteur</th>
                    <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Date</th>
                    <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Priorité</th>
                    <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Action</th>
                  </tr></thead>
                  <tbody>
                    ${(enAttente as any[]).map(ex => `
                      <tr style="border-bottom:1px solid #F1F5F9;">
                        <td style="padding:12px 16px;font-size:14px;">
                          <div style="font-weight:600;">${ex.nom_examen || ex.type_examen}</div>
                          <div style="font-size:12px;color:#6B7280;">${ex.type_examen}</div>
                        </td>
                        <td style="padding:12px 16px;font-size:14px;">${ex.patient?.nom || ''} ${ex.patient?.prenom || ''}</td>
                        <td style="padding:12px 16px;font-size:14px;">Dr. ${ex.prescripteur?.nom || '—'}</td>
                        <td style="padding:12px 16px;font-size:14px;">${ex.date_prescription ? new Date(ex.date_prescription).toLocaleDateString('fr-FR') : '—'}</td>
                        <td style="padding:12px 16px;">
                          ${ex.est_urgent
                            ? '<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#FFEBEE;color:#B71C1C;">🚨 URGENT</span>'
                            : '<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#F3F4F6;color:#6B7280;">Normale</span>'
                          }
                        </td>
                        <td style="padding:12px 16px;">
                          <a href="/laboratoire/examen/${ex.id}" style="background:#6A1B9A;color:white;padding:6px 14px;border-radius:6px;font-size:13px;font-weight:600;text-decoration:none;">Voir →</a>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<p style="padding:32px;text-align:center;color:#9CA3AF;font-style:italic;">Aucun examen en attente</p>'}
          </div>

          <!-- Examens en cours -->
          <div style="background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;">
            <div style="padding:16px 20px;border-bottom:1px solid #E5E7EB;font-weight:700;font-size:16px;">🔬 Examens en cours (${stats.enCours})</div>
            ${enCours && enCours.length > 0 ? `
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;padding:16px;">
                ${(enCours as any[]).map(ex => `
                  <div style="border:1px solid #E5E7EB;border-radius:10px;padding:14px;transition:box-shadow .2s;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                      <div style="font-size:13px;font-weight:700;color:#6A1B9A;">${ex.nom_examen || ex.type_examen}</div>
                      <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#E3F2FD;color:#1565C0;">En cours</span>
                    </div>
                    <div style="font-size:14px;font-weight:600;">${ex.patient?.nom || ''} ${ex.patient?.prenom || ''}</div>
                    ${ex.est_urgent ? '<div style="font-size:11px;color:#B71C1C;font-weight:700;margin-top:4px;">🚨 Urgent</div>' : ''}
                    <a href="/laboratoire/examen/${ex.id}" style="display:inline-block;margin-top:10px;color:#6A1B9A;font-size:13px;font-weight:600;text-decoration:none;">Saisir résultats →</a>
                  </div>
                `).join('')}
              </div>
            ` : '<p style="padding:32px;text-align:center;color:#9CA3AF;font-style:italic;">Aucun examen en cours</p>'}
          </div>
        </div>
      `
    )

    return c.html(html)
  } catch (error) {
    console.error('Erreur dashboard laboratoire:', error)
    return c.html(pageSkeleton(
      profil, 'Erreur', '#6A1B9A',
      '<div style="background:#FFF5F5;border-left:4px solid #B71C1C;border-radius:10px;padding:16px;font-size:14px;font-weight:600;color:#B71C1C;">⚠️ Erreur lors du chargement du dashboard</div>'
    ))
  }
})

/**
 * GET /laboratoire/examen/:id
 * Détail d'un examen + saisie des résultats
 * Utilise examenLaboDetailPage() — page HTML originale intacte
 * On mappe les données DB vers l'interface ExamenLabo
 */
laboratoireRoutes.get('/examen/:id', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')

  try {
    // CORRECTION 2 : colonnes DB correctes dans le SELECT
    const { data: examen, error } = await supabase
      .from('medical_examens')
      .select(`
        id, nom_examen, type_examen, statut, est_urgent,
        description_demande, resultat_texte, valeurs_numeriques, interpretation,
        created_at, realise_at, valide_at,
        patient:patient_dossiers(nom, prenom, numero_national, date_naissance, sexe),
        prescripteur:auth_profiles!medical_examens_prescripteur_id_fkey(
          nom, prenom,
          auth_medecins(specialite_principale)
        ),
        technicien:auth_profiles!medical_examens_realise_par_fkey(nom, prenom)
      `)
      .eq('id', id)
      .eq('structure_id', profil.structure_id!)
      .single()

    if (error || !examen) {
      return c.html(pageSkeleton(
        profil, 'Examen non trouvé', '#6A1B9A',
        '<div style="background:#FFF5F5;border-left:4px solid #B71C1C;border-radius:10px;padding:16px;font-size:14px;font-weight:600;color:#B71C1C;">⚠️ Examen non trouvé ou accès refusé</div>'
      ), 404)
    }

    // CORRECTION 4 : mapper DB → interface ExamenLabo (garde les noms de l'interface)
    // valeurs_numeriques (JSONB) → resultats[]
    const resultatsArray = examen.valeurs_numeriques
      ? Object.entries(examen.valeurs_numeriques as Record<string, any>).map(([parametre, v]: [string, any]) => ({
          parametre,
          valeur:           String(v.valeur ?? v),
          unite:            v.unite ?? '',
          valeurs_normales: v.normes ?? '',
          interpretation:   v.anormal ? 'anormal' as const : 'normal' as const,
        }))
      : []

    const technicienNom = examen.technicien
      ? `${examen.technicien.prenom || ''} ${examen.technicien.nom || ''}`.trim()
      : ''

    const examenPourPage = {
      id:               examen.id,
      // numero_examen → on utilise l'id court pour l'affichage
      numero_examen:    examen.id.slice(0, 8).toUpperCase(),
      type_examen:      examen.type_examen || '',
      statut:           examen.statut as any,
      // date_prescription → date_prescription de l'interface
      date_prescription: examen.created_at,
      // date_prevu → on utilise created_at également
      date_prevu:       examen.created_at,
      // date_prelevement → realise_at
      date_prelevement: examen.realise_at || undefined,
      // date_resultat → valide_at
      date_resultat:    examen.valide_at || undefined,
      // priorite → est_urgent (BOOLEAN)
      priorite:         examen.est_urgent ? 'urgente' as const : 'normale' as const,
      // instructions → description_demande
      instructions:     examen.description_demande || undefined,
      patient: {
        nom:             examen.patient?.nom || '',
        prenom:          examen.patient?.prenom || '',
        numero_national: examen.patient?.numero_national || '',
        date_naissance:  examen.patient?.date_naissance || '',
        sexe:            examen.patient?.sexe || 'M',
      },
      medecin_prescripteur: {
        nom:       examen.prescripteur?.nom || '',
        prenom:    examen.prescripteur?.prenom || '',
        specialite: examen.prescripteur?.auth_medecins?.[0]?.specialite_principale || undefined,
      },
      // technicien_nom → nom du laborantin
      technicien_nom: technicienNom || undefined,
      // resultats → depuis valeurs_numeriques JSONB
      resultats:  resultatsArray,
      // conclusion → resultat_texte
      conclusion: examen.resultat_texte || undefined,
    }

    // Page de détail examen labo (inline)
    const ex = examenPourPage as any
    const resultatHtml = (ex.resultats || []).map((r: any) =>
      `<div style="border-left:3px solid #4A148C;padding:10px 14px;margin-bottom:8px;background:#fafbff;border-radius:0 8px 8px 0;">
        <div style="font-size:13px;font-weight:700;">${r.nom || ''}</div>
        <div style="font-size:14px;color:#1A1A2E;">${r.valeur || ''} ${r.unite || ''}</div>
        ${r.interpretation ? `<div style="font-size:12px;color:#6b7280;">${r.interpretation}</div>` : ''}
      </div>`
    ).join('')

    const contenuDetail = `
      <div style="margin-bottom:14px;">
        <a href="/laboratoire" style="background:white;border:1px solid #e2e8e4;color:#374151;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">← Retour</a>
      </div>
      <div style="background:white;border-radius:12px;padding:22px;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:14px;">
        <h2 style="font-family:'DM Serif Display',serif;font-size:18px;margin-bottom:14px;">${ex.nom_examen || 'Examen laboratoire'}</h2>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;">
          <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">Patient</span><strong>${ex.patient_nom || ''}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">Date prescription</span><span>${ex.date_prescription || '—'}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">Statut</span><span class="badge badge-blue">${ex.statut || ''}</span></div>
          ${ex.conclusion ? `<div style="margin-top:8px;background:#f9fafb;border-radius:8px;padding:12px;font-size:13px;">${ex.conclusion}</div>` : ''}
        </div>
      </div>
      ${resultatHtml ? `<div style="background:white;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;">📊 Résultats</h3>
        ${resultatHtml}
      </div>` : ''}
    `
    return c.html(pageSkeleton(profil, 'Examen laboratoire', '#4A148C', contenuDetail))

  } catch (error) {
    console.error('Erreur chargement examen:', error)
    return c.html(pageSkeleton(
      profil, 'Erreur', '#6A1B9A',
      '<div style="background:#FFF5F5;border-left:4px solid #B71C1C;border-radius:10px;padding:16px;font-size:14px;font-weight:600;color:#B71C1C;">⚠️ Erreur de chargement</div>'
    ), 500)
  }
})

/**
 * POST /laboratoire/examen/:id/resultats
 * Enregistrer ou valider les résultats
 */
laboratoireRoutes.post('/examen/:id/resultats', async (c) => {
  const supabase = c.get('supabase' as never) as any
  const profil   = c.get('profil' as never) as AuthProfile
  const id       = c.req.param('id')

  try {
    const formData = await c.req.parseBody()
    const action   = String(formData.action || 'enregistrer')

    // Parser résultats depuis le formulaire de examenLaboDetailPage
    // Le formulaire envoie resultats[0][parametre], resultats[0][valeur], etc.
    const valeursNumeriques: Record<string, any> = {}
    let index = 0
    while (formData[`resultats[${index}][parametre]`] !== undefined) {
      const parametre = String(formData[`resultats[${index}][parametre]`] || '').trim()
      const valeur    = String(formData[`resultats[${index}][valeur]`]    || '').trim()
      const unite     = String(formData[`resultats[${index}][unite]`]     || '').trim()
      const normales  = String(formData[`resultats[${index}][valeurs_normales]`] || '').trim()
      const interp    = String(formData[`resultats[${index}][interpretation]`]   || 'normal')
      if (parametre && valeur) {
        valeursNumeriques[parametre] = {
          valeur,
          unite,
          normes:  normales,
          anormal: interp === 'anormal' || interp === 'critique',
        }
      }
      index++
    }

    // CORRECTION 3 : colonnes d'écriture correctes
    const updateData: any = {
      valeurs_numeriques: valeursNumeriques,              // ← resultat_texte séparé
      resultat_texte:     String(formData.conclusion || '').trim() || null,
      est_anormal:        Object.values(valeursNumeriques).some((v: any) => v.anormal),
      realise_par:        profil.id,                     // ← UUID, pas nom texte
      realise_at:         String(formData.date_prelevement || new Date().toISOString()),
    }

    // Statut selon action
    if (action === 'valider') {
      // CORRECTION : 'resultat_disponible' au lieu de 'valide'
      updateData.statut    = 'resultat_disponible'
      updateData.valide_par = profil.id
      updateData.valide_at  = new Date().toISOString()
    } else {
      updateData.statut = 'en_cours'
    }

    const { error: updateError } = await supabase
      .from('medical_examens')
      .update(updateData)
      .eq('id', id)
      .eq('structure_id', profil.structure_id!)

    if (updateError) throw updateError

    // Si validation : générer PDF en arrière-plan (non bloquant)
    if (action === 'valider') {
      try {
        const { data: examen } = await supabase
          .from('medical_examens')
          .select(`
            id, nom_examen, type_examen, valeurs_numeriques, resultat_texte,
            realise_at, valide_at, description_demande,
            patient:patient_dossiers(nom, prenom, date_naissance, numero_national),
            prescripteur:auth_profiles!medical_examens_prescripteur_id_fkey(
              nom, prenom, auth_medecins(specialite_principale)
            ),
            technicien:auth_profiles!medical_examens_realise_par_fkey(nom, prenom),
            structure:struct_structures!medical_examens_structure_id_fkey(nom, type, adresse, telephone, logo_url)
          `)
          .eq('id', id)
          .single()

        if (examen) {
          const resultats = examen.valeurs_numeriques
            ? Object.entries(examen.valeurs_numeriques as Record<string,any>).map(([k,v]) => ({
                parametre:        k,
                valeur:           String(v.valeur ?? v),
                unite:            v.unite ?? '',
                valeurs_normales: v.normes ?? '',
                interpretation:   v.anormal ? 'anormal' as const : 'normal' as const,
              }))
            : []

          const techNom = examen.technicien
            ? `${examen.technicien.prenom || ''} ${examen.technicien.nom || ''}`.trim()
            : ''

          await genererBulletinExamenPDF({
            structure: {
              nom:       examen.structure?.nom       || '',
              type:      examen.structure?.type      || 'Laboratoire',
              adresse:   examen.structure?.adresse   || '',
              telephone: examen.structure?.telephone || '',
              logo_url:  examen.structure?.logo_url  || '',
            },
            medecin_prescripteur: {
              nom:        examen.prescripteur?.nom    || '',
              prenom:     examen.prescripteur?.prenom || '',
              specialite: examen.prescripteur?.auth_medecins?.[0]?.specialite_principale || '',
            },
            patient: {
              nom:             examen.patient?.nom             || '',
              prenom:          examen.patient?.prenom          || '',
              date_naissance:  examen.patient?.date_naissance
                ? new Date(examen.patient.date_naissance).toLocaleDateString('fr-FR')
                : '',
              numero_national: examen.patient?.numero_national || '',
            },
            examen: {
              numero:              examen.id,
              type:                examen.type_examen === 'radiologie' ? 'radiologie' : 'laboratoire',
              date_prelevement:    examen.realise_at
                ? new Date(examen.realise_at).toLocaleDateString('fr-FR')
                : new Date().toLocaleDateString('fr-FR'),
              date_resultat:       examen.valide_at
                ? new Date(examen.valide_at).toLocaleDateString('fr-FR')
                : new Date().toLocaleDateString('fr-FR'),
              nom_examen:          examen.nom_examen || examen.type_examen || '',
              indication_clinique: examen.description_demande || '',
            },
            resultats,
            conclusion:     examen.resultat_texte || '',
            technicien_nom: techNom,
          })
          // TODO: Upload PDF vers Storage et mettre à jour fichier_url
        }
      } catch (pdfError) {
        console.error('Erreur génération PDF (non bloquant):', pdfError)
      }
    }

    return c.redirect(`/laboratoire/examen/${id}?success=true`, 303)

  } catch (error) {
    console.error('Erreur sauvegarde résultats:', error)
    return c.redirect(`/laboratoire/examen/${id}?error=true`, 303)
  }
})

/**
 * GET /laboratoire/examen/:id/pdf
 * Télécharger bulletin PDF
 */
laboratoireRoutes.get('/examen/:id/pdf', async (c) => {
  const supabase = c.get('supabase' as never) as any
  const profil   = c.get('profil' as never) as AuthProfile
  const id       = c.req.param('id')

  try {
    // CORRECTION : statut 'resultat_disponible' au lieu de 'valide'
    const { data: examen, error } = await supabase
      .from('medical_examens')
      .select(`
        id, nom_examen, type_examen, statut,
        valeurs_numeriques, resultat_texte, description_demande,
        realise_at, valide_at,
        patient:patient_dossiers(nom, prenom, date_naissance, sexe, numero_national),
        prescripteur:auth_profiles!medical_examens_prescripteur_id_fkey(
          nom, prenom, auth_medecins(specialite_principale)
        ),
        technicien:auth_profiles!medical_examens_realise_par_fkey(nom, prenom),
        structure:struct_structures!medical_examens_structure_id_fkey(nom, type, adresse, telephone, logo_url)
      `)
      .eq('id', id)
      .eq('structure_id', profil.structure_id!)
      // CORRECTION : accepter 'resultat_disponible' (pas 'valide')
      .in('statut', ['resultat_disponible'])
      .single()

    if (error || !examen) {
      return c.text('Examen non trouvé ou résultats non encore disponibles', 404)
    }

    const resultats = examen.valeurs_numeriques
      ? Object.entries(examen.valeurs_numeriques as Record<string,any>).map(([k,v]) => ({
          parametre:        k,
          valeur:           String(v.valeur ?? v),
          unite:            v.unite ?? '',
          valeurs_normales: v.normes ?? '',
          interpretation:   v.anormal ? 'anormal' as const : 'normal' as const,
        }))
      : []

    const techNom = examen.technicien
      ? `${examen.technicien.prenom || ''} ${examen.technicien.nom || ''}`.trim()
      : ''

    const pdfBuffer = await genererBulletinExamenPDF({
      structure: {
        nom:       examen.structure?.nom       || '',
        type:      examen.structure?.type      || 'Laboratoire',
        adresse:   examen.structure?.adresse   || '',
        telephone: examen.structure?.telephone || '',
        logo_url:  examen.structure?.logo_url  || '',
      },
      medecin_prescripteur: {
        nom:        examen.prescripteur?.nom    || '',
        prenom:     examen.prescripteur?.prenom || '',
        specialite: examen.prescripteur?.auth_medecins?.[0]?.specialite_principale || '',
      },
      patient: {
        nom:             examen.patient?.nom             || '',
        prenom:          examen.patient?.prenom          || '',
        date_naissance:  examen.patient?.date_naissance
          ? new Date(examen.patient.date_naissance).toLocaleDateString('fr-FR')
          : '',
        numero_national: examen.patient?.numero_national || '',
      },
      examen: {
        numero:              examen.id,
        type:                examen.type_examen === 'radiologie' ? 'radiologie' : 'laboratoire',
        date_prelevement:    examen.realise_at
          ? new Date(examen.realise_at).toLocaleDateString('fr-FR')
          : '',
        date_resultat:       examen.valide_at
          ? new Date(examen.valide_at).toLocaleDateString('fr-FR')
          : '',
        nom_examen:          examen.nom_examen || examen.type_examen || '',
        indication_clinique: examen.description_demande || '',
      },
      resultats,
      conclusion:     examen.resultat_texte || '',
      technicien_nom: techNom,
    })

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Bulletin_${examen.nom_examen || id}.pdf"`
      }
    })

  } catch (error) {
    console.error('Erreur génération PDF:', error)
    return c.text('Erreur génération PDF', 500)
  }
})

/**
 * GET /laboratoire/nouveau
 */
laboratoireRoutes.get('/nouveau', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile

  return c.html(pageSkeleton(
    profil, 'Nouvel examen', '#6A1B9A',
    `<div style="max-width:800px;margin:0 auto;background:white;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
      <h2 style="font-size:20px;font-weight:700;margin-bottom:20px;">🧪 Prescrire un examen</h2>
      <p style="color:#6B7280;font-size:14px;">La prescription d'examens se fait depuis le module Médecin lors d'une consultation.<br>
      <a href="/medecin/consultations" style="color:#6A1B9A;font-weight:600;">→ Accéder aux consultations</a></p>
    </div>`
  ))
})

/**
 * GET /laboratoire/recherche
 */
laboratoireRoutes.get('/recherche', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const q        = c.req.query('q') || ''

  let examens: any[] = []
  if (q.length >= 2) {
    const { data } = await supabase
      .from('medical_examens')
      .select(`
        id, nom_examen, type_examen, statut, est_urgent, created_at,
        patient:patient_dossiers(nom, prenom, numero_national)
      `)
      .eq('structure_id', profil.structure_id!)
      .or(`nom_examen.ilike.%${q}%,type_examen.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(20)
    examens = data ?? []
  }

  const rows = examens.map(e => `
    <tr style="border-bottom:1px solid #F1F5F9;">
      <td style="padding:12px 16px;font-size:14px;font-weight:600;">${e.nom_examen || e.type_examen}</td>
      <td style="padding:12px 16px;font-size:14px;">${e.patient?.nom || ''} ${e.patient?.prenom || ''}</td>
      <td style="padding:12px 16px;font-size:13px;color:#6B7280;">${e.patient?.numero_national || ''}</td>
      <td style="padding:12px 16px;"><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#E3F2FD;color:#1565C0;">${e.statut.replace(/_/g,' ')}</span></td>
      <td style="padding:12px 16px;font-size:13px;">${new Date(e.created_at).toLocaleDateString('fr-FR')}</td>
      <td style="padding:12px 16px;"><a href="/laboratoire/examen/${e.id}" style="color:#6A1B9A;font-weight:600;font-size:13px;text-decoration:none;">Voir →</a></td>
    </tr>
  `).join('')

  return c.html(pageSkeleton(
    profil, 'Recherche', '#6A1B9A',
    `<div style="max-width:1100px;margin:0 auto;">
      <form method="GET" action="/laboratoire/recherche" style="display:flex;gap:10px;margin-bottom:20px;">
        <input type="text" name="q" value="${q}" placeholder="Nom d'examen, type…" autofocus
          style="flex:1;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;font-family:inherit;outline:none;">
        <button type="submit" style="background:#6A1B9A;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">Rechercher</button>
        <a href="/laboratoire" style="background:#F3F4F6;color:#374151;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;display:flex;align-items:center;">← Retour</a>
      </form>
      ${q.length >= 2
        ? examens.length > 0
          ? `<div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06);">
              <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#F9FAFB;">
                  <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Examen</th>
                  <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Patient</th>
                  <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">N° Dossier</th>
                  <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Statut</th>
                  <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Date</th>
                  <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Action</th>
                </tr></thead>
                <tbody>${rows}</tbody>
              </table>
             </div>`
          : `<div style="background:white;border-radius:12px;padding:40px;text-align:center;color:#9CA3AF;font-style:italic;">Aucun résultat pour "${q}"</div>`
        : '<div style="background:white;border-radius:12px;padding:40px;text-align:center;color:#9CA3AF;">Entrez au moins 2 caractères pour rechercher</div>'
      }
    </div>`
  ))
})

/**
 * GET /laboratoire/historique
 */
laboratoireRoutes.get('/historique', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: examens } = await supabase
    .from('medical_examens')
    .select(`
      id, nom_examen, type_examen, statut, est_urgent, created_at, valide_at,
      patient:patient_dossiers(nom, prenom, numero_national)
    `)
    .eq('structure_id', profil.structure_id!)
    .in('statut', ['resultat_disponible', 'annule'])
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = (examens ?? []).map((e: any) => `
    <tr style="border-bottom:1px solid #F1F5F9;">
      <td style="padding:12px 16px;font-size:14px;font-weight:600;">${e.nom_examen || e.type_examen}</td>
      <td style="padding:12px 16px;font-size:14px;">${e.patient?.nom || ''} ${e.patient?.prenom || ''}</td>
      <td style="padding:12px 16px;font-size:12px;font-family:monospace;color:#6B7280;">${e.patient?.numero_national || ''}</td>
      <td style="padding:12px 16px;">${e.est_urgent ? '<span style="padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700;background:#FFEBEE;color:#B71C1C;">Urgent</span>' : '—'}</td>
      <td style="padding:12px 16px;font-size:13px;">${new Date(e.created_at).toLocaleDateString('fr-FR')}</td>
      <td style="padding:12px 16px;font-size:13px;">${e.valide_at ? new Date(e.valide_at).toLocaleDateString('fr-FR') : '—'}</td>
      <td style="padding:12px 16px;">
        <a href="/laboratoire/examen/${e.id}" style="color:#6A1B9A;font-weight:600;font-size:13px;text-decoration:none;">Voir →</a>
        ${e.statut === 'resultat_disponible'
          ? `<a href="/laboratoire/examen/${e.id}/pdf" style="margin-left:8px;color:#1A6B3C;font-weight:600;font-size:13px;text-decoration:none;">PDF</a>`
          : ''}
      </td>
    </tr>
  `).join('')

  return c.html(pageSkeleton(
    profil, 'Historique', '#6A1B9A',
    `<div style="max-width:1100px;margin:0 auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-family:'DM Serif Display',serif;font-size:20px;">📋 Historique des examens</div>
        <a href="/laboratoire" style="background:#F3F4F6;color:#374151;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">← Retour</a>
      </div>
      <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06);">
        ${rows
          ? `<table style="width:100%;border-collapse:collapse;">
              <thead><tr style="background:#F9FAFB;">
                <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Examen</th>
                <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Patient</th>
                <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">N° Dossier</th>
                <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Urgent</th>
                <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Prescrit le</th>
                <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Validé le</th>
                <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Actions</th>
              </tr></thead>
              <tbody>${rows}</tbody>
             </table>`
          : '<p style="padding:32px;text-align:center;color:#9CA3AF;font-style:italic;">Aucun examen dans l\'historique</p>'
        }
      </div>
    </div>`
  ))
})
