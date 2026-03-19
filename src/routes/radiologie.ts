/**
 * src/routes/radiologie.ts
 * SantéBF — Module Radiologie
 *
 * CORRECTIONS vs original :
 *  1. import './module-helpers' → './dashboard'
 *  2. use('/*') au lieu de use('*')
 *  3. Bindings importé depuis supabase.ts
 *  4. actionCard([tableau]) au lieu de 4 args individuels
 *  5. FROM medical_examens_imagerie → medical_examens WHERE type_examen LIKE 'radio%'
 *     (medical_examens_imagerie n'existe pas dans le schéma DB)
 *  6. Colonnes correctes :
 *     numero_examen → id (affiché raccourci)
 *     type_imagerie → nom_examen
 *     priorite      → est_urgent (BOOLEAN)
 *     date_prevu    → date_prescription
 *     statut 'en_attente' → 'prescrit'
 *     statut 'cliche_disponible' → 'resultat_disponible'
 *     statut 'termine' → 'resultat_disponible'
 *     compte_rendu  → resultat_texte
 *     conclusion    → interpretation
 *     indication_clinique → description_demande
 *  7. INSERT dans medical_examens (pas medical_examens_imagerie)
 *  8. UPDATE compte-rendu corrigé
 *  9. c.get() avec cast explicite
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'
import { pageSkeleton, statsGrid, actionCard, alertHTML } from './dashboard'

export const radiologieRoutes = new Hono<{ Bindings: Bindings }>()

radiologieRoutes.use('/*', requireAuth)
radiologieRoutes.use('/*', requireRole('radiologue', 'medecin', 'super_admin'))

// Affichage court de l'ID
function idCourt(id: string) { return id.slice(0,8).toUpperCase() }

// Classe badge selon statut
function statutClass(statut: string) {
  return statut === 'prescrit' ? 'badge-warn'
       : statut === 'en_cours' ? 'badge-blue'
       : statut === 'resultat_disponible' ? 'badge-ok'
       : 'badge-neutral'
}

/**
 * GET /radiologie — Dashboard radiologie
 */
radiologieRoutes.get('/', async (c) => {
  const supabase = c.get('supabase' as never) as any
  const profil   = c.get('profil' as never) as AuthProfile

  try {
    const aujourdhui = new Date().toISOString().split('T')[0]

    // Tous les examens de radiologie = medical_examens WHERE type_examen LIKE 'radio%' OR 'echo%' etc.
    const typesRadio = ['Radio_', 'Echo_', 'Scanner_', 'IRM_', 'Mammographie', 'Doppler']
    const filtreType = typesRadio.map(t => `type_examen.ilike.${t}%`).join(',')

    const [prescritRes, enCoursRes, jourRes, interpreterRes] = await Promise.all([
      supabase.from('medical_examens')
        .select(`
          id, nom_examen, type_examen, est_urgent, date_prescription,
          patient:patient_dossiers(nom, prenom, numero_national)
        `)
        .eq('structure_id', profil.structure_id!)
        .eq('statut', 'prescrit')            // ← 'prescrit' au lieu de 'en_attente'
        .or(filtreType)
        .order('est_urgent', { ascending: false })
        .order('date_prescription', { ascending: true })
        .limit(20),

      supabase.from('medical_examens')
        .select(`id, nom_examen, type_examen, patient:patient_dossiers(nom, prenom)`)
        .eq('structure_id', profil.structure_id!)
        .eq('statut', 'en_cours')
        .or(filtreType)
        .order('created_at', { ascending: false })
        .limit(10),

      supabase.from('medical_examens')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', profil.structure_id!)
        .or(filtreType)
        .gte('created_at', `${aujourdhui}T00:00:00`)
        .lte('created_at', `${aujourdhui}T23:59:59`),

      // À interpréter = resultat_disponible mais pas encore d'interpretation
      supabase.from('medical_examens')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', profil.structure_id!)
        .eq('statut', 'resultat_disponible') // ← 'resultat_disponible' au lieu de 'cliche_disponible'
        .or(filtreType)
        .is('interpretation', null),
    ])

    const enAttente = prescritRes.data ?? []
    const enCours   = enCoursRes.data ?? []

    const stats = {
      enAttente:   enAttente.length,
      enCours:     enCours.length,
      examensJour: jourRes.count ?? 0,
      aValider:    interpreterRes.count ?? 0,
    }

    const contenu = `
      ${statsGrid([
        { label: 'En attente',          value: stats.enAttente,   icon: '⏳', color: '#E65100' },
        { label: 'En cours',            value: stats.enCours,     icon: '📷', color: '#1565C0' },
        { label: "Examens aujourd'hui", value: stats.examensJour, icon: '📊', color: '#1A6B3C' },
        { label: 'À interpréter',       value: stats.aValider,    icon: '📝', color: '#B71C1C' },
      ])}

      ${actionCard([
        { href: '/radiologie/nouveau',   icon: '🖼️', label: 'Nouvel examen',  colorClass: 'blue' },
        { href: '/radiologie/recherche', icon: '🔍', label: 'Rechercher',      colorClass: ''     },
        { href: '/radiologie/historique',icon: '📋', label: 'Historique',      colorClass: ''     },
      ])}

      <div class="section-box" style="margin-bottom:20px">
        <div class="section-header">
          <h2>⏳ Examens prescrits (${enAttente.length})</h2>
          <a href="/radiologie/nouveau" style="font-size:12px;color:rgba(255,255,255,0.75);text-decoration:none;background:rgba(255,255,255,0.12);padding:4px 10px;border-radius:6px">+ Nouveau</a>
        </div>
        ${enAttente.length === 0
          ? '<div class="empty">Aucun examen en attente</div>'
          : `<div style="overflow-x:auto">
              <table>
                <thead><tr><th>N° Examen</th><th>Patient</th><th>Type d'imagerie</th><th>Date prescription</th><th>Urgence</th><th>Actions</th></tr></thead>
                <tbody>
                  ${enAttente.map((ex: any) => `<tr>
                    <td><code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:12px">${idCourt(ex.id)}</code></td>
                    <td><strong>${ex.patient?.prenom||''} ${ex.patient?.nom||''}</strong></td>
                    <td>${ex.nom_examen||ex.type_examen}</td>
                    <td>${ex.date_prescription ? new Date(ex.date_prescription).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>${ex.est_urgent
                      ? '<span class="badge badge-danger">🚨 Urgent</span>'
                      : '<span class="badge badge-neutral">Normale</span>'}</td>
                    <td><a href="/radiologie/examen/${ex.id}" style="color:#00838F;font-size:13px">Voir →</a></td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>`
        }
      </div>

      <div class="section-box">
        <div class="section-header"><h2>📷 Examens en cours (${enCours.length})</h2></div>
        ${enCours.length === 0
          ? '<div class="empty">Aucun examen en cours</div>'
          : `<table>
              <thead><tr><th>N° Examen</th><th>Patient</th><th>Type</th><th>Actions</th></tr></thead>
              <tbody>
                ${enCours.map((ex: any) => `<tr>
                  <td><code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:12px">${idCourt(ex.id)}</code></td>
                  <td><strong>${ex.patient?.prenom||''} ${ex.patient?.nom||''}</strong></td>
                  <td>${ex.nom_examen||ex.type_examen}</td>
                  <td><a href="/radiologie/examen/${ex.id}" style="color:#00838F;font-size:13px">Saisir compte-rendu →</a></td>
                </tr>`).join('')}
              </tbody>
            </table>`
        }
      </div>`

    return c.html(pageSkeleton(profil, 'Radiologie', '#00838F', contenu))

  } catch (err) {
    console.error('Erreur dashboard radiologie:', err)
    return c.html(pageSkeleton(profil, 'Erreur', '#00838F', alertHTML('error', 'Erreur lors du chargement')))
  }
})

/**
 * GET /radiologie/nouveau
 */
radiologieRoutes.get('/nouveau', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile

  const contenu = `
    <div style="margin-bottom:14px;">
      <a href="/radiologie" style="background:white;border:1px solid #e2e8e4;color:#374151;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">← Retour</a>
    </div>
    <div class="section-box" style="padding:28px">
      <h1 style="font-family:'DM Serif Display',serif;font-size:22px;margin-bottom:20px">Nouvel examen d'imagerie</h1>
      <form method="POST" action="/radiologie/nouveau">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
          <div style="grid-column:1/-1">
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Patient *</label>
            <input type="text" name="patient_search" placeholder="Rechercher par nom, numéro national…" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit" required>
            <input type="hidden" name="patient_id">
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Type d'imagerie *</label>
            <select name="type_examen" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit" required>
              <option value="">-- Sélectionner --</option>
              <optgroup label="Radiographie">
                <option value="Radio_thorax">Radiographie thorax</option>
                <option value="Radio_abdomen">Radiographie abdomen</option>
                <option value="Radio_membre">Radiographie membre</option>
                <option value="Radio_rachis">Radiographie rachis</option>
              </optgroup>
              <optgroup label="Échographie">
                <option value="Echo_abdominale">Échographie abdominale</option>
                <option value="Echo_pelvienne">Échographie pelvienne</option>
                <option value="Echo_obstetricale">Échographie obstétricale</option>
                <option value="Echo_cardiaque">Échographie cardiaque</option>
              </optgroup>
              <optgroup label="Scanner">
                <option value="Scanner_cerebral">Scanner cérébral</option>
                <option value="Scanner_thorax">Scanner thorax</option>
                <option value="Scanner_abdomen">Scanner abdomen</option>
              </optgroup>
              <optgroup label="IRM">
                <option value="IRM_cerebrale">IRM cérébrale</option>
                <option value="IRM_rachis">IRM rachis</option>
                <option value="IRM_articulaire">IRM articulaire</option>
              </optgroup>
              <optgroup label="Autres">
                <option value="Mammographie">Mammographie</option>
                <option value="Doppler">Doppler vasculaire</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Urgence</label>
            <select name="est_urgent" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit">
              <option value="false">Non urgent</option>
              <option value="true">🚨 Urgent</option>
            </select>
          </div>
          <div style="grid-column:1/-1">
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Indication clinique *</label>
            <textarea name="description_demande" rows="3" placeholder="Motif de la demande d'examen…" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;resize:vertical" required></textarea>
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-top:24px;justify-content:flex-end">
          <a href="/radiologie" style="background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Annuler</a>
          <button type="submit" style="background:#00838F;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Enregistrer →</button>
        </div>
      </form>
    </div>`

  return c.html(pageSkeleton(profil, 'Nouvel examen', '#00838F', contenu))
})

/**
 * POST /radiologie/nouveau
 */
radiologieRoutes.post('/nouveau', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()

  const typeExamen = String(body.type_examen || '')
  // nom_examen = libellé lisible du type
  const nomExamen = typeExamen.replace(/_/g, ' ')

  const { error } = await supabase.from('medical_examens').insert({
    patient_id:          body.patient_id,
    structure_id:        profil.structure_id,
    prescripteur_id:     profil.id,
    type_examen:         typeExamen,         // ← colonne réelle (type_examen)
    nom_examen:          nomExamen,          // ← colonne réelle (nom_examen)
    est_urgent:          body.est_urgent === 'true',  // ← BOOLEAN (pas priorite texte)
    description_demande: body.description_demande || null, // ← colonne réelle
    statut:              'prescrit',         // ← valeur réelle ('prescrit' pas 'en_attente')
    date_prescription:   new Date().toISOString(),
  })

  if (error) {
    console.error('Erreur création examen radio:', error.message)
    return c.text('Erreur: ' + error.message, 500)
  }
  return c.redirect('/radiologie', 303)
})

/**
 * GET /radiologie/examen/:id
 */
radiologieRoutes.get('/examen/:id', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')

  const { data: examen } = await supabase
    .from('medical_examens')
    .select(`
      id, nom_examen, type_examen, est_urgent, statut,
      description_demande, resultat_texte, interpretation,
      date_prescription, realise_at, valide_at,
      patient:patient_dossiers(nom, prenom, numero_national, groupe_sanguin, rhesus)
    `)
    .eq('id', id)
    .single()

  if (!examen) {
    return c.html(pageSkeleton(profil, 'Introuvable', '#00838F', alertHTML('error', 'Examen introuvable')))
  }

  const patient    = examen.patient as any
  const estTermine = examen.statut === 'resultat_disponible'

  const contenu = `
    <div style="margin-bottom:14px;">
      <a href="/radiologie" style="background:white;border:1px solid #e2e8e4;color:#374151;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">← Retour</a>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
      <div class="section-box" style="padding:22px">
        <h3 style="font-family:'DM Serif Display',serif;font-size:16px;margin-bottom:14px">👤 Patient</h3>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Nom</span><strong>${patient?.prenom||''} ${patient?.nom||''}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">N° national</span><strong>${patient?.numero_national||'—'}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Groupe sanguin</span><strong style="color:#b71c1c">${patient?.groupe_sanguin||'?'}${patient?.rhesus||''}</strong></div>
        </div>
      </div>
      <div class="section-box" style="padding:22px">
        <h3 style="font-family:'DM Serif Display',serif;font-size:16px;margin-bottom:14px">🖼️ Examen</h3>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">N°</span><code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">${idCourt(examen.id)}</code></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Type</span><strong>${examen.nom_examen||examen.type_examen}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Urgence</span>${examen.est_urgent ? '<span class="badge badge-danger">🚨 Urgent</span>' : '<span class="badge badge-neutral">Normale</span>'}</div>
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Statut</span><span class="badge ${statutClass(examen.statut)}">${examen.statut.replace(/_/g,' ')}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Prescrit le</span>${examen.date_prescription ? new Date(examen.date_prescription).toLocaleDateString('fr-FR') : '—'}</div>
        </div>
      </div>
    </div>

    ${examen.description_demande ? `
    <div class="section-box" style="padding:20px;margin-bottom:20px">
      <h3 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Indication clinique</h3>
      <p style="font-size:14px;line-height:1.7">${examen.description_demande}</p>
    </div>` : ''}

    ${!estTermine ? `
    <div class="section-box" style="padding:22px">
      <h3 style="font-family:'DM Serif Display',serif;font-size:16px;margin-bottom:16px">📝 Saisir le compte-rendu</h3>
      <form method="POST" action="/radiologie/examen/${id}/compte-rendu">
        <div style="margin-bottom:14px">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Résultats / Compte-rendu *</label>
          <textarea name="resultat_texte" rows="6" placeholder="Résultats et description de l'examen…" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;resize:vertical" required></textarea>
        </div>
        <div style="margin-bottom:14px">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Interprétation / Conclusion</label>
          <input type="text" name="interpretation" placeholder="Interprétation succincte…" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit">
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end">
          <a href="/radiologie" style="background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Retour</a>
          <button type="submit" style="background:#00838F;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Valider le compte-rendu →</button>
        </div>
      </form>
    </div>` : `
    <div class="section-box" style="padding:22px">
      <h3 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Résultats</h3>
      <p style="font-size:14px;line-height:1.7;margin-bottom:12px">${examen.resultat_texte||'—'}</p>
      ${examen.interpretation ? `
      <h3 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;margin-top:14px">Interprétation</h3>
      <p style="font-size:14px;font-style:italic;color:#374151">${examen.interpretation}</p>` : ''}
    </div>`}
  `

  return c.html(pageSkeleton(profil, 'Examen imagerie', '#00838F', contenu))
})

/**
 * POST /radiologie/examen/:id/compte-rendu
 */
radiologieRoutes.post('/examen/:id/compte-rendu', async (c) => {
  const supabase = c.get('supabase' as never) as any
  const profil   = c.get('profil' as never) as AuthProfile
  const id       = c.req.param('id')
  const body     = await c.req.parseBody()

  await supabase.from('medical_examens').update({
    resultat_texte:  String(body.resultat_texte  ?? ''),  // ← colonne réelle (pas compte_rendu)
    interpretation:  String(body.interpretation  ?? ''),  // ← colonne réelle (pas conclusion)
    statut:          'resultat_disponible',                // ← valeur réelle (pas 'termine')
    valide_par:      profil.id,
    valide_at:       new Date().toISOString(),
  }).eq('id', id)

  return c.redirect(`/radiologie/examen/${id}`, 303)
})

/**
 * GET /radiologie/recherche
 */
radiologieRoutes.get('/recherche', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const q        = String(c.req.query('q') ?? '').trim()
  const typesRadio = ['Radio_', 'Echo_', 'Scanner_', 'IRM_', 'Mammographie', 'Doppler']
  const filtreType = typesRadio.map(t => `type_examen.ilike.${t}%`).join(',')

  let resultats: any[] = []
  if (q.length >= 2) {
    const { data } = await supabase
      .from('medical_examens')
      .select(`id, nom_examen, type_examen, statut, created_at, patient:patient_dossiers(nom, prenom, numero_national)`)
      .eq('structure_id', profil.structure_id!)
      .or(filtreType)
      .order('created_at', { ascending: false })
      .limit(30)

    resultats = (data ?? []).filter((ex: any) =>
      `${ex.patient?.nom} ${ex.patient?.prenom} ${ex.patient?.numero_national} ${ex.nom_examen}`
        .toLowerCase().includes(q.toLowerCase())
    )
  }

  const contenu = `
    <div style="margin-bottom:20px">
      <form action="/radiologie/recherche" method="GET" style="display:flex;gap:10px">
        <input type="text" name="q" value="${q}" placeholder="Nom, numéro patient ou type d'examen…" autofocus
          style="flex:1;padding:12px 16px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;outline:none">
        <button type="submit" style="background:#00838F;color:white;border:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Rechercher</button>
      </form>
    </div>
    ${q && resultats.length === 0
      ? '<div class="section-box"><div class="empty">Aucun résultat pour "' + q + '"</div></div>'
      : resultats.length > 0
        ? `<div class="section-box">
            <div class="section-header"><h2>Résultats (${resultats.length})</h2></div>
            <table>
              <thead><tr><th>N° Examen</th><th>Patient</th><th>Type</th><th>Date</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                ${resultats.map((ex: any) => `<tr>
                  <td><code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:11px">${idCourt(ex.id)}</code></td>
                  <td><strong>${ex.patient?.prenom||''} ${ex.patient?.nom||''}</strong></td>
                  <td>${ex.nom_examen||ex.type_examen}</td>
                  <td>${new Date(ex.created_at).toLocaleDateString('fr-FR')}</td>
                  <td><span class="badge ${statutClass(ex.statut)}">${ex.statut.replace(/_/g,' ')}</span></td>
                  <td><a href="/radiologie/examen/${ex.id}" style="color:#00838F;font-size:13px">Voir →</a></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`
        : ''
    }`

  return c.html(pageSkeleton(profil, 'Recherche radiologie', '#00838F', contenu))
})

/**
 * GET /radiologie/historique
 */
radiologieRoutes.get('/historique', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const typesRadio = ['Radio_', 'Echo_', 'Scanner_', 'IRM_', 'Mammographie', 'Doppler']
  const filtreType = typesRadio.map(t => `type_examen.ilike.${t}%`).join(',')

  const { data: examens } = await supabase
    .from('medical_examens')
    .select(`id, nom_examen, type_examen, statut, est_urgent, created_at, patient:patient_dossiers(nom, prenom)`)
    .eq('structure_id', profil.structure_id!)
    .or(filtreType)
    .order('created_at', { ascending: false })
    .limit(50)

  const contenu = `
    <div style="margin-bottom:14px;">
      <a href="/radiologie" style="background:white;border:1px solid #e2e8e4;color:#374151;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">← Retour</a>
    </div>
    <div class="section-box">
      <div class="section-header"><h2>📋 Historique des examens (${(examens??[]).length})</h2></div>
      ${!examens || examens.length === 0
        ? '<div class="empty">Aucun examen enregistré</div>'
        : `<div style="overflow-x:auto">
            <table>
              <thead><tr><th>N° Examen</th><th>Patient</th><th>Type</th><th>Urgence</th><th>Date</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                ${(examens as any[]).map(ex => `<tr>
                  <td><code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:11px">${idCourt(ex.id)}</code></td>
                  <td>${ex.patient?.prenom||''} ${ex.patient?.nom||''}</td>
                  <td>${ex.nom_examen||ex.type_examen}</td>
                  <td>${ex.est_urgent ? '<span class="badge badge-danger">🚨</span>' : '—'}</td>
                  <td>${new Date(ex.created_at).toLocaleDateString('fr-FR')}</td>
                  <td><span class="badge ${statutClass(ex.statut)}">${ex.statut.replace(/_/g,' ')}</span></td>
                  <td><a href="/radiologie/examen/${ex.id}" style="color:#00838F;font-size:13px">Voir →</a></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`
      }
    </div>`

  return c.html(pageSkeleton(profil, 'Historique radiologie', '#00838F', contenu))
})
