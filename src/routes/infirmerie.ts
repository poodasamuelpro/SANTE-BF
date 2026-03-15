/**
 * Routes du module Infirmerie
 * Soins infirmiers, pansements, injections, surveillance
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import type { AuthProfile } from '../lib/supabase'
// Note: pageSkeleton, statsGrid, actionCard sont définis localement pour ce module
import { alertHTML } from '../components/alert'

export const infirmerieRoutes = new Hono()

// Middleware
infirmerieRoutes.use('*', requireAuth)
infirmerieRoutes.use('*', requireRole(['infirmier', 'super_admin']))

/**
 * GET /infirmerie
 * Dashboard infirmerie
 */
infirmerieRoutes.get('/', async (c) => {
  const supabase = c.get('supabase')
  const profil = c.get('profil')

  try {
    // Soins programmés aujourd'hui
    const aujourdhui = new Date().toISOString().split('T')[0]
    const { data: soinsJour, error: err1 } = await supabase
      .from('medical_soins_infirmiers')
      .select(`
        id, patient_id, type_soin, horaire_prevu, statut,
        patient:patient_id (nom, prenom, numero_national)
      `)
      .eq('structure_id', profil.structure_id!)
      .gte('horaire_prevu', `${aujourdhui}T00:00:00`)
      .lte('horaire_prevu', `${aujourdhui}T23:59:59`)
      .order('horaire_prevu', { ascending: true })

    if (err1) throw err1

    // Patients sous surveillance
    const { data: surveillance, error: err2 } = await supabase
      .from('medical_surveillance')
      .select(`
        id, patient_id, type_surveillance, frequence, prochaine_mesure,
        patient:patient_id (nom, prenom)
      `)
      .eq('structure_id', profil.structure_id!)
      .eq('statut', 'active')
      .order('prochaine_mesure', { ascending: true })
      .limit(10)

    if (err2) throw err2

    // Pansements du jour
    const { data: pansements, error: err3 } = await supabase
      .from('medical_soins_infirmiers')
      .select('id')
      .eq('structure_id', profil.structure_id!)
      .eq('type_soin', 'pansement')
      .gte('horaire_prevu', `${aujourdhui}T00:00:00`)
      .lte('horaire_prevu', `${aujourdhui}T23:59:59`)

    if (err3) throw err3

    // Injections du jour
    const { data: injections, error: err4 } = await supabase
      .from('medical_soins_infirmiers')
      .select('id')
      .eq('structure_id', profil.structure_id!)
      .eq('type_soin', 'injection')
      .gte('horaire_prevu', `${aujourdhui}T00:00:00`)
      .lte('horaire_prevu', `${aujourdhui}T23:59:59`)

    if (err4) throw err4

    const stats = {
      soinsJour: soinsJour?.length || 0,
      surveillance: surveillance?.length || 0,
      pansements: pansements?.length || 0,
      injections: injections?.length || 0
    }

    const html = pageSkeleton(
      profil,
      'Infirmerie',
      `
        <div class="max-w-7xl mx-auto">
          <!-- Statistiques -->
          ${statsGrid([
            { label: "Soins aujourd'hui", value: stats.soinsJour.toString(), icon: '💉', color: 'blue' },
            { label: 'Surveillance active', value: stats.surveillance.toString(), icon: '📊', color: 'green' },
            { label: 'Pansements', value: stats.pansements.toString(), icon: '🩹', color: 'orange' },
            { label: 'Injections', value: stats.injections.toString(), icon: '💊', color: 'purple' }
          ])}

          <!-- Actions rapides -->
          <div class="grid md:grid-cols-4 gap-4 mb-8">
            ${actionCard('Nouveau soin', '➕', '/infirmerie/nouveau', 'blue')}
            ${actionCard('Surveillance', '📈', '/infirmerie/surveillance', 'green')}
            ${actionCard('Rechercher', '🔍', '/infirmerie/recherche', 'gray')}
            ${actionCard('Historique', '📋', '/infirmerie/historique', 'gray')}
          </div>

          <!-- Soins du jour -->
          <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
              <span>💉</span> Soins programmés aujourd'hui
            </h2>
            ${soinsJour && soinsJour.length > 0 ? `
              <div class="overflow-x-auto">
                <table class="min-w-full">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-2 text-left">Heure</th>
                      <th class="px-4 py-2 text-left">Patient</th>
                      <th class="px-4 py-2 text-left">Type de soin</th>
                      <th class="px-4 py-2 text-left">Statut</th>
                      <th class="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${soinsJour.map(soin => `
                      <tr class="border-t hover:bg-gray-50">
                        <td class="px-4 py-3 font-semibold">
                          ${new Date(soin.horaire_prevu).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td class="px-4 py-3">${soin.patient?.nom} ${soin.patient?.prenom}</td>
                        <td class="px-4 py-3">${soin.type_soin}</td>
                        <td class="px-4 py-3">
                          <span class="px-2 py-1 text-xs rounded ${
                            soin.statut === 'effectue' ? 'bg-green-100 text-green-800' :
                            soin.statut === 'en_cours' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }">
                            ${soin.statut}
                          </span>
                        </td>
                        <td class="px-4 py-3">
                          <a href="/infirmerie/soin/${soin.id}" 
                             class="text-blue-600 hover:underline text-sm">
                            Voir →
                          </a>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <p class="text-gray-500 text-center py-8">Aucun soin programmé aujourd'hui</p>
            `}
          </div>

          <!-- Surveillance active -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
              <span>📊</span> Patients sous surveillance
            </h2>
            ${surveillance && surveillance.length > 0 ? `
              <div class="grid md:grid-cols-2 gap-4">
                ${surveillance.map(s => `
                  <div class="border rounded-lg p-4 hover:shadow-md transition">
                    <div class="flex justify-between items-start mb-2">
                      <span class="font-semibold">${s.patient?.nom} ${s.patient?.prenom}</span>
                      <span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        ${s.type_surveillance}
                      </span>
                    </div>
                    <div class="text-sm text-gray-600 mb-2">
                      Fréquence : ${s.frequence}
                    </div>
                    <div class="text-sm text-gray-600">
                      Prochaine mesure : ${s.prochaine_mesure ? new Date(s.prochaine_mesure).toLocaleString('fr-FR') : '—'}
                    </div>
                    <a href="/infirmerie/surveillance/${s.id}" 
                       class="inline-block mt-2 text-blue-600 hover:underline text-sm">
                      Voir détails →
                    </a>
                  </div>
                `).join('')}
              </div>
            ` : `
              <p class="text-gray-500 text-center py-8">Aucun patient sous surveillance</p>
            `}
          </div>
        </div>
      `
    )

    return c.html(html)
  } catch (error) {
    console.error('Erreur dashboard infirmerie:', error)
    return c.html(pageSkeleton(
      profil,
      'Erreur',
      alertHTML('error', 'Erreur lors du chargement du dashboard')
    ))
  }
})

/**
 * GET /infirmerie/nouveau
 * Formulaire de nouveau soin
 */
infirmerieRoutes.get('/nouveau', async (c) => {
  const profil = c.get('profil')
  
  const html = pageSkeleton(
    profil,
    'Nouveau soin',
    `
      <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold mb-6">Enregistrer un nouveau soin</h1>
        <form method="POST" action="/infirmerie/nouveau">
          <!-- Patient -->
          <div class="mb-4">
            <label class="block font-semibold mb-2">Patient *</label>
            <input type="text" 
                   name="patient_search" 
                   placeholder="Rechercher par nom, numéro national..."
                   class="w-full border rounded px-3 py-2" 
                   required>
          </div>

          <!-- Type de soin -->
          <div class="mb-4">
            <label class="block font-semibold mb-2">Type de soin *</label>
            <select name="type_soin" class="w-full border rounded px-3 py-2" required>
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

          <!-- Horaire prévu -->
          <div class="mb-4">
            <label class="block font-semibold mb-2">Horaire prévu</label>
            <input type="datetime-local" 
                   name="horaire_prevu" 
                   class="w-full border rounded px-3 py-2">
          </div>

          <!-- Description -->
          <div class="mb-4">
            <label class="block font-semibold mb-2">Description / Prescription</label>
            <textarea name="description" 
                      rows="3" 
                      class="w-full border rounded px-3 py-2"
                      placeholder="Détails du soin à réaliser..."></textarea>
          </div>

          <div class="flex gap-4">
            <button type="submit" 
                    class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              Enregistrer
            </button>
            <a href="/infirmerie" 
               class="bg-gray-200 text-gray-700 px-6 py-2 rounded hover:bg-gray-300">
              Annuler
            </a>
          </div>
        </form>
      </div>
    `
  )

  return c.html(html)
})

/**
 * GET /infirmerie/soin/:id
 * Détail d'un soin
 */
infirmerieRoutes.get('/soin/:id', async (c) => {
  const profil = c.get('profil')
  const id = c.req.param('id')
  
  const html = pageSkeleton(
    profil,
    'Détail soin',
    `
      <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold mb-4">Soin #${id}</h1>
        <p class="text-gray-500">TODO: Afficher et tracer le soin</p>
      </div>
    `
  )

  return c.html(html)
})

/**
 * GET /infirmerie/surveillance
 * Gestion de la surveillance
 */
infirmerieRoutes.get('/surveillance', async (c) => {
  const profil = c.get('profil')
  
  const html = pageSkeleton(
    profil,
    'Surveillance',
    `
      <div class="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold mb-4">Surveillance des patients</h1>
        <p class="text-gray-500">TODO: Liste et saisie des surveillances</p>
      </div>
    `
  )

  return c.html(html)
})

/**
 * GET /infirmerie/recherche
 */
infirmerieRoutes.get('/recherche', async (c) => {
  const profil = c.get('profil')
  
  const html = pageSkeleton(
    profil,
    'Recherche',
    `
      <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold mb-4">Rechercher un soin</h1>
        <p class="text-gray-500">TODO: Formulaire de recherche</p>
      </div>
    `
  )

  return c.html(html)
})

/**
 * GET /infirmerie/historique
 */
infirmerieRoutes.get('/historique', async (c) => {
  const profil = c.get('profil')
  
  const html = pageSkeleton(
    profil,
    'Historique',
    `
      <div class="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold mb-4">Historique des soins</h1>
        <p class="text-gray-500">TODO: Liste complète avec filtres</p>
      </div>
    `
  )

  return c.html(html)
})
