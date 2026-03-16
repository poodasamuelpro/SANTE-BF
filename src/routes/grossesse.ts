/**
 * Routes du module Suivi de grossesse
 * ✅ CORRECTION : Import des fonctions pageSkeleton, statsGrid, actionCard, alertHTML
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile } from '../lib/supabase'
import { pageSkeleton, statsGrid, actionCard, alertHTML } from './module-helpers'

export const grossesseRoutes = new Hono()

grossesseRoutes.use('*', requireAuth)
// ✅ CORRECTION : requireRole attend des args individuels, pas un tableau
grossesseRoutes.use('*', requireRole('sage_femme', 'medecin', 'super_admin'))

/**
 * GET /grossesse — Dashboard suivi de grossesse
 */
grossesseRoutes.get('/', async (c) => {
  const supabase = c.get('supabase')
  const profil = c.get('profil') as AuthProfile

  try {
    const aujourdhui = new Date().toISOString().split('T')[0]
    const debut = new Date(); debut.setDate(1)
    const fin = new Date(debut); fin.setMonth(fin.getMonth() + 1)

    const [enCoursRes, accMoisRes, cpnJourRes, aRisqueRes] = await Promise.all([
      supabase.from('medical_grossesses')
        .select(`id, patient_id, ddr, dpa, terme_semaines, statut, risque, nb_cpn, prochaine_cpn,
          patient:patient_id (nom, prenom, numero_national, date_naissance)`)
        .eq('structure_id', profil.structure_id!)
        .eq('statut', 'en_cours')
        .order('dpa', { ascending: true })
        .limit(20),
      supabase.from('medical_grossesses').select('id')
        .eq('structure_id', profil.structure_id!)
        .eq('statut', 'en_cours')
        .gte('dpa', debut.toISOString())
        .lt('dpa', fin.toISOString()),
      supabase.from('medical_grossesses').select('id')
        .eq('structure_id', profil.structure_id!)
        .eq('statut', 'en_cours')
        .gte('prochaine_cpn', `${aujourdhui}T00:00:00`)
        .lte('prochaine_cpn', `${aujourdhui}T23:59:59`),
      supabase.from('medical_grossesses').select('id')
        .eq('structure_id', profil.structure_id!)
        .eq('statut', 'en_cours')
        .neq('risque', 'faible'),
    ])

    const enCours = enCoursRes.data ?? []
    const stats = {
      enCours:           enCours.length,
      accouchementsMois: accMoisRes.data?.length || 0,
      cpnJour:           cpnJourRes.data?.length || 0,
      aRisque:           aRisqueRes.data?.length || 0,
    }

    const contenu = `
      ${statsGrid([
        { label: 'Grossesses en cours',    value: stats.enCours,           icon: '🤰', color: 'blue'   },
        { label: 'Accouchements ce mois',  value: stats.accouchementsMois, icon: '👶', color: 'green'  },
        { label: "CPN aujourd'hui",        value: stats.cpnJour,           icon: '📅', color: 'orange' },
        { label: 'À risque',               value: stats.aRisque,           icon: '⚠️', color: 'red'    },
      ])}

      <div class="actions-module">
        ${actionCard('Nouvelle grossesse', '➕', '/grossesse/nouveau',      'blue'  )}
        ${actionCard('CPN du jour',        '📋', '/grossesse/cpn-jour',     'green' )}
        ${actionCard('Rechercher',         '🔍', '/grossesse/recherche',    'gray'  )}
        ${actionCard('Accouchements',      '👶', '/grossesse/accouchements','purple')}
      </div>

      <div class="section-box">
        <div class="section-header">
          <h2>🤰 Grossesses en cours (${enCours.length})</h2>
        </div>
        ${enCours.length === 0
          ? '<div class="empty">Aucune grossesse en cours</div>'
          : `<div style="overflow-x:auto">
              <table>
                <thead><tr>
                  <th>Patiente</th><th>Âge</th><th>Terme</th><th>DPA</th>
                  <th>CPN</th><th>Prochaine CPN</th><th>Risque</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  ${enCours.map((g: any) => {
                    const age = g.patient?.date_naissance
                      ? Math.floor((Date.now() - new Date(g.patient.date_naissance).getTime()) / 31557600000)
                      : '—'
                    const risqueClass = g.risque === 'eleve' ? 'badge-danger' : g.risque === 'moyen' ? 'badge-warn' : 'badge-ok'
                    return `<tr>
                      <td><strong>${g.patient?.prenom || ''} ${g.patient?.nom || ''}</strong></td>
                      <td>${age} ans</td>
                      <td>${g.terme_semaines || '—'} SA</td>
                      <td>${g.dpa ? new Date(g.dpa).toLocaleDateString('fr-FR') : '—'}</td>
                      <td>${g.nb_cpn || 0}</td>
                      <td>${g.prochaine_cpn ? new Date(g.prochaine_cpn).toLocaleDateString('fr-FR') : '—'}</td>
                      <td><span class="badge ${risqueClass}">${g.risque}</span></td>
                      <td><a href="/grossesse/dossier/${g.id}" style="color:#1565C0;font-size:13px">Voir →</a></td>
                    </tr>`
                  }).join('')}
                </tbody>
              </table>
            </div>`
        }
      </div>`

    return c.html(pageSkeleton(profil, 'Suivi de grossesse', '#E91E63', contenu))

  } catch (err) {
    console.error('Erreur dashboard grossesse:', err)
    return c.html(pageSkeleton(profil, 'Erreur', '#E91E63', alertHTML('error', 'Erreur lors du chargement du dashboard')))
  }
})

/**
 * GET /grossesse/nouveau
 */
grossesseRoutes.get('/nouveau', async (c) => {
  const profil = c.get('profil') as AuthProfile

  const contenu = `
    <div class="section-box" style="padding:28px">
      <h1 style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:20px">Déclaration de grossesse</h1>
      <form method="POST" action="/grossesse/nouveau">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
          <div style="grid-column:1/-1">
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Patiente *</label>
            <input type="text" name="patient_search" placeholder="Rechercher par nom, numéro national..." style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit" required>
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Date des dernières règles (DDR) *</label>
            <input type="date" name="ddr" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit" required>
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Niveau de risque</label>
            <select name="risque" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit">
              <option value="faible">Faible</option>
              <option value="moyen">Moyen</option>
              <option value="eleve">Élevé</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Gestité (G)</label>
            <input type="number" name="gestitie" min="1" placeholder="Nb grossesses" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit">
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Parité (P)</label>
            <input type="number" name="parite" min="0" placeholder="Nb accouchements" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit">
          </div>
          <div style="grid-column:1/-1">
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Antécédents particuliers</label>
            <textarea name="antecedents" rows="3" placeholder="Césarienne, fausse couche, diabète gestationnel..." style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;resize:vertical"></textarea>
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-top:24px;justify-content:flex-end">
          <a href="/grossesse" style="background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Annuler</a>
          <button type="submit" style="background:#E91E63;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Enregistrer →</button>
        </div>
      </form>
    </div>`

  return c.html(pageSkeleton(profil, 'Nouvelle grossesse', '#E91E63', contenu))
})

/**
 * GET /grossesse/dossier/:id
 */
grossesseRoutes.get('/dossier/:id', async (c) => {
  const profil = c.get('profil') as AuthProfile
  const id = c.req.param('id')

  const contenu = `
    <div class="section-box" style="padding:28px">
      <h1 style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:12px">Dossier grossesse</h1>
      <p style="color:#6b7280">Dossier #${id} — Fonctionnalité en cours de développement</p>
      <a href="/grossesse" style="display:inline-block;margin-top:16px;color:#E91E63;font-weight:600">← Retour</a>
    </div>`

  return c.html(pageSkeleton(profil, 'Dossier grossesse', '#E91E63', contenu))
})

/**
 * GET /grossesse/cpn-jour
 */
grossesseRoutes.get('/cpn-jour', async (c) => {
  const profil = c.get('profil') as AuthProfile
  const supabase = c.get('supabase')
  const aujourdhui = new Date().toISOString().split('T')[0]

  const { data: cpns } = await supabase
    .from('medical_grossesses')
    .select(`id, prochaine_cpn, nb_cpn, patient:patient_id (nom, prenom)`)
    .eq('structure_id', profil.structure_id!)
    .eq('statut', 'en_cours')
    .gte('prochaine_cpn', `${aujourdhui}T00:00:00`)
    .lte('prochaine_cpn', `${aujourdhui}T23:59:59`)
    .order('prochaine_cpn', { ascending: true })

  const contenu = `
    <div class="section-box">
      <div class="section-header"><h2>📋 CPN du jour (${cpns?.length || 0})</h2></div>
      ${!cpns || cpns.length === 0
        ? '<div class="empty">Aucune CPN programmée aujourd\'hui</div>'
        : `<table>
            <thead><tr><th>Heure</th><th>Patiente</th><th>CPN n°</th><th>Actions</th></tr></thead>
            <tbody>
              ${cpns.map((c: any) => `
                <tr>
                  <td><strong>${c.prochaine_cpn ? new Date(c.prochaine_cpn).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '—'}</strong></td>
                  <td>${c.patient?.prenom || ''} ${c.patient?.nom || ''}</td>
                  <td>CPN ${(c.nb_cpn || 0) + 1}</td>
                  <td><a href="/grossesse/dossier/${c.id}" style="color:#E91E63;font-size:13px">Voir →</a></td>
                </tr>`).join('')}
            </tbody>
          </table>`}
    </div>`

  return c.html(pageSkeleton(profil, 'CPN du jour', '#E91E63', contenu))
})

/**
 * GET /grossesse/accouchements
 */
grossesseRoutes.get('/accouchements', async (c) => {
  const profil = c.get('profil') as AuthProfile

  const contenu = `
    <div class="section-box" style="padding:28px">
      <h1 style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:12px">Accouchements</h1>
      <p style="color:#6b7280">Fonctionnalité en cours de développement</p>
      <a href="/grossesse" style="display:inline-block;margin-top:16px;color:#E91E63;font-weight:600">← Retour</a>
    </div>`

  return c.html(pageSkeleton(profil, 'Accouchements', '#E91E63', contenu))
})

/**
 * GET /grossesse/recherche
 */
grossesseRoutes.get('/recherche', async (c) => {
  const profil = c.get('profil') as AuthProfile
  const supabase = c.get('supabase')
  const q = String(c.req.query('q') ?? '').trim()

  let resultats: any[] = []
  if (q.length >= 2) {
    const { data } = await supabase
      .from('medical_grossesses')
      .select(`id, statut, dpa, patient:patient_id (nom, prenom, numero_national)`)
      .eq('structure_id', profil.structure_id!)
      .order('dpa', { ascending: false })
      .limit(20)
    resultats = (data ?? []).filter((g: any) =>
      `${g.patient?.nom} ${g.patient?.prenom} ${g.patient?.numero_national}`.toLowerCase().includes(q.toLowerCase())
    )
  }

  const contenu = `
    <div style="margin-bottom:20px">
      <form action="/grossesse/recherche" method="GET" style="display:flex;gap:10px">
        <input type="text" name="q" value="${q}" placeholder="Nom, prénom ou numéro national..." style="flex:1;padding:12px 16px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;outline:none">
        <button type="submit" style="background:#E91E63;color:white;border:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Rechercher</button>
      </form>
    </div>
    ${q && resultats.length === 0
      ? '<div class="section-box"><div class="empty">Aucun résultat pour "' + q + '"</div></div>'
      : resultats.length > 0
        ? `<div class="section-box">
            <div class="section-header"><h2>Résultats (${resultats.length})</h2></div>
            <table>
              <thead><tr><th>Patiente</th><th>DPA</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                ${resultats.map((g: any) => `
                  <tr>
                    <td><strong>${g.patient?.prenom || ''} ${g.patient?.nom || ''}</strong></td>
                    <td>${g.dpa ? new Date(g.dpa).toLocaleDateString('fr-FR') : '—'}</td>
                    <td><span class="badge ${g.statut === 'en_cours' ? 'badge-blue' : 'badge-ok'}">${g.statut}</span></td>
                    <td><a href="/grossesse/dossier/${g.id}" style="color:#E91E63;font-size:13px">Voir →</a></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`
        : ''
    }`

  return c.html(pageSkeleton(profil, 'Recherche grossesse', '#E91E63', contenu))
})
