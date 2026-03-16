/**
 * Routes du module Radiologie
 * ✅ CORRECTION : Import des fonctions pageSkeleton, statsGrid, actionCard, alertHTML
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile } from '../lib/supabase'
import { pageSkeleton, statsGrid, actionCard, alertHTML } from './module-helpers'

export const radiologieRoutes = new Hono()

radiologieRoutes.use('*', requireAuth)
// ✅ CORRECTION : requireRole attend des args individuels, pas un tableau
radiologieRoutes.use('*', requireRole('radiologue', 'medecin', 'super_admin'))

/**
 * GET /radiologie — Dashboard radiologie
 */
radiologieRoutes.get('/', async (c) => {
  const supabase = c.get('supabase')
  const profil = c.get('profil') as AuthProfile

  try {
    const aujourdhui = new Date().toISOString().split('T')[0]

    const [enAttenteRes, enCoursRes, examJourRes, aValiderRes] = await Promise.all([
      supabase.from('medical_examens_imagerie')
        .select(`id, numero_examen, type_imagerie, priorite, date_prevu,
          patient:patient_id (nom, prenom, numero_national)`)
        .eq('structure_id', profil.structure_id!)
        .eq('statut', 'en_attente')
        .order('date_prevu', { ascending: true })
        .limit(20),
      supabase.from('medical_examens_imagerie')
        .select(`id, numero_examen, type_imagerie, patient:patient_id (nom, prenom)`)
        .eq('structure_id', profil.structure_id!)
        .eq('statut', 'en_cours')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('medical_examens_imagerie').select('id')
        .eq('structure_id', profil.structure_id!)
        .gte('created_at', `${aujourdhui}T00:00:00`)
        .lte('created_at', `${aujourdhui}T23:59:59`),
      supabase.from('medical_examens_imagerie').select('id')
        .eq('structure_id', profil.structure_id!)
        .eq('statut', 'cliche_disponible')
        .is('compte_rendu', null),
    ])

    const enAttente = enAttenteRes.data ?? []
    const enCours   = enCoursRes.data ?? []

    const stats = {
      enAttente:   enAttente.length,
      enCours:     enCours.length,
      examensJour: examJourRes.data?.length || 0,
      aValider:    aValiderRes.data?.length || 0,
    }

    const contenu = `
      ${statsGrid([
        { label: 'En attente',          value: stats.enAttente,   icon: '⏳', color: 'orange' },
        { label: 'En cours',            value: stats.enCours,     icon: '📷', color: 'blue'   },
        { label: "Examens aujourd'hui", value: stats.examensJour, icon: '📊', color: 'green'  },
        { label: 'À interpréter',       value: stats.aValider,    icon: '📝', color: 'red'    },
      ])}

      <div class="actions-module">
        ${actionCard('Nouvel examen',       '🖼️', '/radiologie/nouveau',    'blue')}
        ${actionCard('Rechercher patient',  '🔍', '/radiologie/recherche',  'gray')}
        ${actionCard('Historique',          '📋', '/radiologie/historique', 'gray')}
      </div>

      <div class="section-box" style="margin-bottom:20px">
        <div class="section-header">
          <h2>⏳ Examens en attente (${enAttente.length})</h2>
          <a href="/radiologie/nouveau" style="font-size:12px;color:rgba(255,255,255,0.75);text-decoration:none;background:rgba(255,255,255,0.12);padding:4px 10px;border-radius:6px">+ Nouveau</a>
        </div>
        ${enAttente.length === 0
          ? '<div class="empty">Aucun examen en attente</div>'
          : `<div style="overflow-x:auto">
              <table>
                <thead><tr>
                  <th>N° Examen</th><th>Patient</th><th>Type d'imagerie</th>
                  <th>Date prévue</th><th>Priorité</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  ${enAttente.map((ex: any) => {
                    const prioClass = ex.priorite === 'urgente' ? 'badge-danger' : ex.priorite === 'elevee' ? 'badge-warn' : 'badge-neutral'
                    return `<tr>
                      <td><code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:12px">${ex.numero_examen}</code></td>
                      <td><strong>${ex.patient?.prenom || ''} ${ex.patient?.nom || ''}</strong></td>
                      <td>${ex.type_imagerie}</td>
                      <td>${ex.date_prevu ? new Date(ex.date_prevu).toLocaleDateString('fr-FR') : '—'}</td>
                      <td><span class="badge ${prioClass}">${ex.priorite}</span></td>
                      <td><a href="/radiologie/examen/${ex.id}" style="color:#00838F;font-size:13px">Voir →</a></td>
                    </tr>`
                  }).join('')}
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
                ${enCours.map((ex: any) => `
                  <tr>
                    <td><code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:12px">${ex.numero_examen}</code></td>
                    <td><strong>${ex.patient?.prenom || ''} ${ex.patient?.nom || ''}</strong></td>
                    <td>${ex.type_imagerie}</td>
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
  const profil = c.get('profil') as AuthProfile

  const contenu = `
    <div class="section-box" style="padding:28px">
      <h1 style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:20px">Nouvel examen d'imagerie</h1>
      <form method="POST" action="/radiologie/nouveau">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
          <div style="grid-column:1/-1">
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Patient *</label>
            <input type="text" name="patient_search" placeholder="Rechercher par nom, numéro national..." style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit" required>
            <input type="hidden" name="patient_id">
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Type d'imagerie *</label>
            <select name="type_imagerie" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit" required>
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
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Priorité</label>
            <select name="priorite" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit">
              <option value="normale">Normale</option>
              <option value="elevee">Élevée</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <div style="grid-column:1/-1">
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Indication clinique *</label>
            <textarea name="indication_clinique" rows="3" placeholder="Motif de la demande d'examen..." style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;resize:vertical" required></textarea>
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-top:24px;justify-content:flex-end">
          <a href="/radiologie" style="background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Annuler</a>
          <button type="submit" style="background:#00838F;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Enregistrer →</button>
        </div>
      </form>
    </div>`

  return c.html(pageSkeleton(profil, 'Nouvel examen', '#00838F', contenu))
})

/**
 * GET /radiologie/examen/:id
 */
radiologieRoutes.get('/examen/:id', async (c) => {
  const profil = c.get('profil') as AuthProfile
  const supabase = c.get('supabase')
  const id = c.req.param('id')

  const { data: examen } = await supabase
    .from('medical_examens_imagerie')
    .select(`*, patient:patient_id (nom, prenom, numero_national, groupe_sanguin, rhesus)`)
    .eq('id', id)
    .single()

  if (!examen) {
    return c.html(pageSkeleton(profil, 'Introuvable', '#00838F', alertHTML('error', 'Examen introuvable')))
  }

  const patient = examen.patient as any
  const prioClass = examen.priorite === 'urgente' ? 'badge-danger' : examen.priorite === 'elevee' ? 'badge-warn' : 'badge-neutral'

  const contenu = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
      <div class="section-box" style="padding:22px">
        <h3 style="font-family:'Fraunces',serif;font-size:16px;margin-bottom:14px">👤 Patient</h3>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Nom</span><strong>${patient?.prenom || ''} ${patient?.nom || ''}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">N° national</span><strong>${patient?.numero_national || '—'}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Groupe sanguin</span><strong style="color:#b71c1c">${patient?.groupe_sanguin || '?'}${patient?.rhesus || ''}</strong></div>
        </div>
      </div>
      <div class="section-box" style="padding:22px">
        <h3 style="font-family:'Fraunces',serif;font-size:16px;margin-bottom:14px">🖼️ Examen</h3>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">N° examen</span><strong>${examen.numero_examen}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Type</span><strong>${examen.type_imagerie}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Priorité</span><span class="badge ${prioClass}">${examen.priorite}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Statut</span><span class="badge badge-blue">${examen.statut}</span></div>
        </div>
      </div>
    </div>

    ${examen.indication_clinique ? `
    <div class="section-box" style="padding:20px;margin-bottom:20px">
      <h3 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Indication clinique</h3>
      <p style="font-size:14px;line-height:1.7">${examen.indication_clinique}</p>
    </div>` : ''}

    ${examen.statut !== 'termine' ? `
    <div class="section-box" style="padding:22px">
      <h3 style="font-family:'Fraunces',serif;font-size:16px;margin-bottom:16px">📝 Saisir le compte-rendu</h3>
      <form method="POST" action="/radiologie/examen/${id}/compte-rendu">
        <div style="margin-bottom:14px">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Compte-rendu *</label>
          <textarea name="compte_rendu" rows="6" placeholder="Résultats et interprétation de l'examen..." style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;resize:vertical" required></textarea>
        </div>
        <div style="margin-bottom:14px">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Conclusion</label>
          <input type="text" name="conclusion" placeholder="Conclusion succincte..." style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit">
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end">
          <a href="/radiologie" style="background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Retour</a>
          <button type="submit" style="background:#00838F;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Valider le compte-rendu →</button>
        </div>
      </form>
    </div>` : `
    <div class="section-box" style="padding:20px">
      <h3 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Compte-rendu</h3>
      <p style="font-size:14px;line-height:1.7">${examen.compte_rendu || '—'}</p>
    </div>`}`

  return c.html(pageSkeleton(profil, 'Examen imagerie', '#00838F', contenu))
})

/**
 * POST /radiologie/examen/:id/compte-rendu
 */
radiologieRoutes.post('/examen/:id/compte-rendu', async (c) => {
  const supabase = c.get('supabase')
  const id = c.req.param('id')
  const body = await c.req.parseBody()

  await supabase.from('medical_examens_imagerie').update({
    compte_rendu: String(body.compte_rendu ?? ''),
    conclusion:   String(body.conclusion   ?? ''),
    statut:       'termine',
  }).eq('id', id)

  return c.redirect(`/radiologie/examen/${id}`)
})

/**
 * GET /radiologie/recherche
 */
radiologieRoutes.get('/recherche', async (c) => {
  const profil = c.get('profil') as AuthProfile
  const supabase = c.get('supabase')
  const q = String(c.req.query('q') ?? '').trim()

  let resultats: any[] = []
  if (q.length >= 2) {
    const { data } = await supabase
      .from('medical_examens_imagerie')
      .select(`id, numero_examen, type_imagerie, statut, created_at, patient:patient_id (nom, prenom, numero_national)`)
      .eq('structure_id', profil.structure_id!)
      .order('created_at', { ascending: false })
      .limit(30)
    resultats = (data ?? []).filter((ex: any) =>
      `${ex.patient?.nom} ${ex.patient?.prenom} ${ex.patient?.numero_national} ${ex.numero_examen}`
        .toLowerCase().includes(q.toLowerCase())
    )
  }

  const contenu = `
    <div style="margin-bottom:20px">
      <form action="/radiologie/recherche" method="GET" style="display:flex;gap:10px">
        <input type="text" name="q" value="${q}" placeholder="Nom, numéro patient ou N° examen..." style="flex:1;padding:12px 16px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;outline:none">
        <button type="submit" style="background:#00838F;color:white;border:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Rechercher</button>
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
                ${resultats.map((ex: any) => `
                  <tr>
                    <td><code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:11px">${ex.numero_examen}</code></td>
                    <td><strong>${ex.patient?.prenom || ''} ${ex.patient?.nom || ''}</strong></td>
                    <td>${ex.type_imagerie}</td>
                    <td>${new Date(ex.created_at).toLocaleDateString('fr-FR')}</td>
                    <td><span class="badge badge-blue">${ex.statut}</span></td>
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
  const profil = c.get('profil') as AuthProfile
  const supabase = c.get('supabase')

  const { data: examens } = await supabase
    .from('medical_examens_imagerie')
    .select(`id, numero_examen, type_imagerie, statut, priorite, created_at, patient:patient_id (nom, prenom)`)
    .eq('structure_id', profil.structure_id!)
    .order('created_at', { ascending: false })
    .limit(50)

  const contenu = `
    <div class="section-box">
      <div class="section-header"><h2>📋 Historique des examens</h2></div>
      ${!examens || examens.length === 0
        ? '<div class="empty">Aucun examen enregistré</div>'
        : `<div style="overflow-x:auto">
            <table>
              <thead><tr><th>N° Examen</th><th>Patient</th><th>Type</th><th>Priorité</th><th>Date</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                ${examens.map((ex: any) => {
                  const prioClass = ex.priorite === 'urgente' ? 'badge-danger' : ex.priorite === 'elevee' ? 'badge-warn' : 'badge-neutral'
                  return `<tr>
                    <td><code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:11px">${ex.numero_examen}</code></td>
                    <td>${ex.patient?.prenom || ''} ${ex.patient?.nom || ''}</td>
                    <td>${ex.type_imagerie}</td>
                    <td><span class="badge ${prioClass}">${ex.priorite}</span></td>
                    <td>${new Date(ex.created_at).toLocaleDateString('fr-FR')}</td>
                    <td><span class="badge badge-blue">${ex.statut}</span></td>
                    <td><a href="/radiologie/examen/${ex.id}" style="color:#00838F;font-size:13px">Voir →</a></td>
                  </tr>`
                }).join('')}
              </tbody>
            </table>
          </div>`
      }
    </div>`

  return c.html(pageSkeleton(profil, 'Historique radiologie', '#00838F', contenu))
})
