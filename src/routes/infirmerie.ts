/**
 * Routes du module Infirmerie
 * ✅ CORRECTION : Import des fonctions pageSkeleton, statsGrid, actionCard, alertHTML
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile } from '../lib/supabase'
import { pageSkeleton, statsGrid, actionCard, alertHTML } from './module-helpers'

export const infirmerieRoutes = new Hono()

infirmerieRoutes.use('*', requireAuth)
// ✅ CORRECTION : requireRole attend des args individuels, pas un tableau
infirmerieRoutes.use('*', requireRole('infirmier', 'sage_femme', 'medecin', 'super_admin'))

/**
 * GET /infirmerie — Dashboard infirmerie
 */
infirmerieRoutes.get('/', async (c) => {
  const supabase = c.get('supabase')
  const profil = c.get('profil') as AuthProfile

  try {
    const aujourdhui = new Date().toISOString().split('T')[0]

    const [soinsRes, surveillanceRes, pansementsRes, injectionsRes] = await Promise.all([
      supabase.from('medical_soins_infirmiers')
        .select(`id, patient_id, type_soin, horaire_prevu, statut, patient:patient_id (nom, prenom)`)
        .eq('structure_id', profil.structure_id!)
        .gte('horaire_prevu', `${aujourdhui}T00:00:00`)
        .lte('horaire_prevu', `${aujourdhui}T23:59:59`)
        .order('horaire_prevu', { ascending: true }),
      supabase.from('medical_surveillance')
        .select(`id, patient_id, type_surveillance, frequence, prochaine_mesure, patient:patient_id (nom, prenom)`)
        .eq('structure_id', profil.structure_id!)
        .eq('statut', 'active')
        .order('prochaine_mesure', { ascending: true })
        .limit(10),
      supabase.from('medical_soins_infirmiers').select('id')
        .eq('structure_id', profil.structure_id!)
        .eq('type_soin', 'pansement')
        .gte('horaire_prevu', `${aujourdhui}T00:00:00`)
        .lte('horaire_prevu', `${aujourdhui}T23:59:59`),
      supabase.from('medical_soins_infirmiers').select('id')
        .eq('structure_id', profil.structure_id!)
        .eq('type_soin', 'injection')
        .gte('horaire_prevu', `${aujourdhui}T00:00:00`)
        .lte('horaire_prevu', `${aujourdhui}T23:59:59`),
    ])

    const soins       = soinsRes.data ?? []
    const surveillance = surveillanceRes.data ?? []

    const stats = {
      soinsJour:    soins.length,
      surveillance: surveillance.length,
      pansements:   pansementsRes.data?.length || 0,
      injections:   injectionsRes.data?.length || 0,
    }

    const contenu = `
      ${statsGrid([
        { label: "Soins aujourd'hui", value: stats.soinsJour,    icon: '💉', color: 'blue'   },
        { label: 'Surveillance',      value: stats.surveillance, icon: '📊', color: 'green'  },
        { label: 'Pansements',        value: stats.pansements,   icon: '🩹', color: 'orange' },
        { label: 'Injections',        value: stats.injections,   icon: '💊', color: 'purple' },
      ])}

      <div class="actions-module">
        ${actionCard('Nouveau soin',  '➕', '/infirmerie/nouveau',       'blue' )}
        ${actionCard('Surveillance',  '📈', '/infirmerie/surveillance',  'green')}
        ${actionCard('Rechercher',    '🔍', '/infirmerie/recherche',     'gray' )}
        ${actionCard('Historique',    '📋', '/infirmerie/historique',    'gray' )}
      </div>

      <div class="section-box" style="margin-bottom:20px">
        <div class="section-header">
          <h2>💉 Soins du jour (${soins.length})</h2>
          <a href="/infirmerie/nouveau" style="font-size:12px;color:rgba(255,255,255,0.75);text-decoration:none;background:rgba(255,255,255,0.12);padding:4px 10px;border-radius:6px">+ Nouveau</a>
        </div>
        ${soins.length === 0
          ? '<div class="empty">Aucun soin programmé aujourd\'hui</div>'
          : `<table>
              <thead><tr><th>Heure</th><th>Patient</th><th>Type de soin</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                ${soins.map((s: any) => {
                  const statClass = s.statut === 'effectue' ? 'badge-ok' : s.statut === 'en_cours' ? 'badge-blue' : 'badge-neutral'
                  return `<tr>
                    <td><strong>${new Date(s.horaire_prevu).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</strong></td>
                    <td>${s.patient?.prenom || ''} ${s.patient?.nom || ''}</td>
                    <td>${s.type_soin}</td>
                    <td><span class="badge ${statClass}">${s.statut}</span></td>
                    <td><a href="/infirmerie/soin/${s.id}" style="color:#0288D1;font-size:13px">Voir →</a></td>
                  </tr>`
                }).join('')}
              </tbody>
            </table>`
        }
      </div>

      <div class="section-box">
        <div class="section-header"><h2>📊 Patients sous surveillance (${surveillance.length})</h2></div>
        ${surveillance.length === 0
          ? '<div class="empty">Aucun patient sous surveillance</div>'
          : `<table>
              <thead><tr><th>Patient</th><th>Type surveillance</th><th>Fréquence</th><th>Prochaine mesure</th><th>Actions</th></tr></thead>
              <tbody>
                ${surveillance.map((s: any) => `
                  <tr>
                    <td><strong>${s.patient?.prenom || ''} ${s.patient?.nom || ''}</strong></td>
                    <td>${s.type_surveillance}</td>
                    <td>${s.frequence}</td>
                    <td>${s.prochaine_mesure ? new Date(s.prochaine_mesure).toLocaleString('fr-FR') : '—'}</td>
                    <td><a href="/infirmerie/surveillance/${s.id}" style="color:#0288D1;font-size:13px">Voir →</a></td>
                  </tr>`).join('')}
              </tbody>
            </table>`
        }
      </div>`

    return c.html(pageSkeleton(profil, 'Infirmerie', '#0288D1', contenu))

  } catch (err) {
    console.error('Erreur dashboard infirmerie:', err)
    return c.html(pageSkeleton(profil, 'Erreur', '#0288D1', alertHTML('error', 'Erreur lors du chargement')))
  }
})

/**
 * GET /infirmerie/nouveau
 */
infirmerieRoutes.get('/nouveau', async (c) => {
  const profil = c.get('profil') as AuthProfile

  const contenu = `
    <div class="section-box" style="padding:28px">
      <h1 style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:20px">Enregistrer un soin</h1>
      <form method="POST" action="/infirmerie/nouveau">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
          <div style="grid-column:1/-1">
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Patient *</label>
            <input type="text" name="patient_search" placeholder="Rechercher par nom ou numéro..." style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit" required>
            <input type="hidden" name="patient_id">
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Type de soin *</label>
            <select name="type_soin" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit" required>
              <option value="">-- Sélectionner --</option>
              <option value="injection">Injection</option>
              <option value="perfusion">Perfusion</option>
              <option value="pansement">Pansement</option>
              <option value="prise_constantes">Prise de constantes</option>
              <option value="glycemie">Glycémie capillaire</option>
              <option value="ecg">ECG</option>
              <option value="sondage">Sondage</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Horaire prévu</label>
            <input type="datetime-local" name="horaire_prevu" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit">
          </div>
          <div style="grid-column:1/-1">
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Description</label>
            <textarea name="description" rows="3" placeholder="Détails du soin à réaliser..." style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;resize:vertical"></textarea>
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-top:24px;justify-content:flex-end">
          <a href="/infirmerie" style="background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Annuler</a>
          <button type="submit" style="background:#0288D1;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Enregistrer →</button>
        </div>
      </form>
    </div>`

  return c.html(pageSkeleton(profil, 'Nouveau soin', '#0288D1', contenu))
})

/**
 * GET /infirmerie/soin/:id
 */
infirmerieRoutes.get('/soin/:id', async (c) => {
  const profil = c.get('profil') as AuthProfile
  const id = c.req.param('id')

  const contenu = `
    <div class="section-box" style="padding:28px">
      <h1 style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:12px">Soin #${id}</h1>
      <p style="color:#6b7280">Détail du soin — Fonctionnalité en cours de développement</p>
      <a href="/infirmerie" style="display:inline-block;margin-top:16px;color:#0288D1;font-weight:600">← Retour</a>
    </div>`

  return c.html(pageSkeleton(profil, 'Détail soin', '#0288D1', contenu))
})

/**
 * GET /infirmerie/surveillance
 */
infirmerieRoutes.get('/surveillance', async (c) => {
  const profil = c.get('profil') as AuthProfile

  const contenu = `
    <div class="section-box" style="padding:28px">
      <h1 style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:12px">Surveillance des patients</h1>
      <p style="color:#6b7280">Fonctionnalité en cours de développement</p>
      <a href="/infirmerie" style="display:inline-block;margin-top:16px;color:#0288D1;font-weight:600">← Retour</a>
    </div>`

  return c.html(pageSkeleton(profil, 'Surveillance', '#0288D1', contenu))
})

/**
 * GET /infirmerie/recherche
 */
infirmerieRoutes.get('/recherche', async (c) => {
  const profil = c.get('profil') as AuthProfile

  const contenu = `
    <div class="section-box" style="padding:28px">
      <h1 style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:12px">Rechercher un soin</h1>
      <p style="color:#6b7280">Fonctionnalité en cours de développement</p>
      <a href="/infirmerie" style="display:inline-block;margin-top:16px;color:#0288D1;font-weight:600">← Retour</a>
    </div>`

  return c.html(pageSkeleton(profil, 'Recherche', '#0288D1', contenu))
})

/**
 * GET /infirmerie/historique
 */
infirmerieRoutes.get('/historique', async (c) => {
  const profil = c.get('profil') as AuthProfile
  const supabase = c.get('supabase')

  const { data: soins } = await supabase
    .from('medical_soins_infirmiers')
    .select(`id, type_soin, horaire_prevu, statut, patient:patient_id (nom, prenom)`)
    .eq('structure_id', profil.structure_id!)
    .order('horaire_prevu', { ascending: false })
    .limit(50)

  const contenu = `
    <div class="section-box">
      <div class="section-header"><h2>📋 Historique des soins</h2></div>
      ${!soins || soins.length === 0
        ? '<div class="empty">Aucun soin enregistré</div>'
        : `<table>
            <thead><tr><th>Date/Heure</th><th>Patient</th><th>Type</th><th>Statut</th></tr></thead>
            <tbody>
              ${soins.map((s: any) => {
                const statClass = s.statut === 'effectue' ? 'badge-ok' : s.statut === 'en_cours' ? 'badge-blue' : 'badge-neutral'
                return `<tr>
                  <td>${new Date(s.horaire_prevu).toLocaleString('fr-FR')}</td>
                  <td>${s.patient?.prenom || ''} ${s.patient?.nom || ''}</td>
                  <td>${s.type_soin}</td>
                  <td><span class="badge ${statClass}">${s.statut}</span></td>
                </tr>`
              }).join('')}
            </tbody>
          </table>`
      }
    </div>`

  return c.html(pageSkeleton(profil, 'Historique', '#0288D1', contenu))
})
