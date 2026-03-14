/**
 * Routes du module Suivi de grossesse
 * Consultations prénatales, accouchements, suivi post-natal
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import { pageSkeleton, statsGrid, actionCard } from './dashboard'
import { alertHTML } from '../components/alert'

export const grossesseRoutes = new Hono()

// Middleware
grossesseRoutes.use('*', requireAuth)
grossesseRoutes.use('*', requireRole(['sage_femme', 'medecin', 'super_admin']))

/**
 * GET /grossesse
 * Dashboard suivi de grossesse
 */
grossesseRoutes.get('/', async (c) => {
  const supabase = c.get('supabase')
  const profil = c.get('profil')

  try {
    // Grossesses en cours
    const { data: enCours, error: err1 } = await supabase
      .from('medical_grossesses')
      .select(`
        id, patient_id, date_debut_grossesse, ddr, dpa, terme_semaines,
        statut, risque, nb_cpn, prochaine_cpn,
        patient:patient_id (nom, prenom, numero_national, date_naissance)
      `)
      .eq('structure_id', profil.structure_id!)
      .eq('statut', 'en_cours')
      .order('dpa', { ascending: true })
      .limit(20)

    if (err1) throw err1

    // Accouchements prévus ce mois
    const debut = new Date()
    debut.setDate(1)
    const fin = new Date(debut)
    fin.setMonth(fin.getMonth() + 1)

    const { data: accouchementsMois, error: err2 } = await supabase
      .from('medical_grossesses')
      .select('id')
      .eq('structure_id', profil.structure_id!)
      .eq('statut', 'en_cours')
      .gte('dpa', debut.toISOString())
      .lt('dpa', fin.toISOString())

    if (err2) throw err2

    // CPN du jour
    const aujourdhui = new Date().toISOString().split('T')[0]
    const { data: cpnJour, error: err3 } = await supabase
      .from('medical_grossesses')
      .select('id')
      .eq('structure_id', profil.structure_id!)
      .eq('statut', 'en_cours')
      .gte('prochaine_cpn', `${aujourdhui}T00:00:00`)
      .lte('prochaine_cpn', `${aujourdhui}T23:59:59`)

    if (err3) throw err3

    // Grossesses à risque
    const { data: aRisque, error: err4 } = await supabase
      .from('medical_grossesses')
      .select('id')
      .eq('structure_id', profil.structure_id!)
      .eq('statut', 'en_cours')
      .neq('risque', 'faible')

    if (err4) throw err4

    const stats = {
      enCours: enCours?.length || 0,
      accouchementsMois: accouchementsMois?.length || 0,
      cpnJour: cpnJour?.length || 0,
      aRisque: aRisque?.length || 0
    }

    const html = pageSkeleton(
      profil,
      'Suivi de grossesse',
      `
        <div class="max-w-7xl mx-auto">
          <!-- Statistiques -->
          ${statsGrid([
            { label: 'Grossesses en cours', value: stats.enCours.toString(), icon: '🤰', color: 'blue' },
            { label: 'Accouchements ce mois', value: stats.accouchementsMois.toString(), icon: '👶', color: 'green' },
            { label: "CPN aujourd'hui", value: stats.cpnJour.toString(), icon: '📅', color: 'orange' },
            { label: 'À risque', value: stats.aRisque.toString(), icon: '⚠️', color: 'red' }
          ])}

          <!-- Actions rapides -->
          <div class="grid md:grid-cols-4 gap-4 mb-8">
            ${actionCard('Nouvelle grossesse', '➕', '/grossesse/nouveau', 'blue')}
            ${actionCard('CPN du jour', '📋', '/grossesse/cpn-jour', 'green')}
            ${actionCard('Rechercher', '🔍', '/grossesse/recherche', 'gray')}
            ${actionCard('Accouchements', '👶', '/grossesse/accouchements', 'purple')}
          </div>

          <!-- Grossesses en cours -->
          <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🤰</span> Grossesses en cours
            </h2>
            ${enCours && enCours.length > 0 ? `
              <div class="overflow-x-auto">
                <table class="min-w-full">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-2 text-left">Patiente</th>
                      <th class="px-4 py-2 text-left">Âge</th>
                      <th class="px-4 py-2 text-left">Terme</th>
                      <th class="px-4 py-2 text-left">DPA</th>
                      <th class="px-4 py-2 text-left">CPN</th>
                      <th class="px-4 py-2 text-left">Prochaine CPN</th>
                      <th class="px-4 py-2 text-left">Risque</th>
                      <th class="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${enCours.map(g => {
                      const age = g.patient?.date_naissance 
                        ? Math.floor((Date.now() - new Date(g.patient.date_naissance).getTime()) / 31557600000)
                        : '—'
                      return `
                        <tr class="border-t hover:bg-gray-50">
                          <td class="px-4 py-3">${g.patient?.nom} ${g.patient?.prenom}</td>
                          <td class="px-4 py-3">${age} ans</td>
                          <td class="px-4 py-3">${g.terme_semaines || '—'} SA</td>
                          <td class="px-4 py-3">${g.dpa ? new Date(g.dpa).toLocaleDateString('fr-FR') : '—'}</td>
                          <td class="px-4 py-3">${g.nb_cpn || 0}</td>
                          <td class="px-4 py-3">${g.prochaine_cpn ? new Date(g.prochaine_cpn).toLocaleDateString('fr-FR') : '—'}</td>
                          <td class="px-4 py-3">
                            <span class="px-2 py-1 text-xs rounded ${
                              g.risque === 'eleve' ? 'bg-red-100 text-red-800' :
                              g.risque === 'moyen' ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }">
                              ${g.risque}
                            </span>
                          </td>
                          <td class="px-4 py-3">
                            <a href="/grossesse/dossier/${g.id}" 
                               class="text-blue-600 hover:underline text-sm">
                              Voir →
                            </a>
                          </td>
                        </tr>
                      `
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <p class="text-gray-500 text-center py-8">Aucune grossesse en cours</p>
            `}
          </div>
        </div>
      `
    )

    return c.html(html)
  } catch (error) {
    console.error('Erreur dashboard grossesse:', error)
    return c.html(pageSkeleton(
      profil,
      'Erreur',
      alertHTML('error', 'Erreur lors du chargement du dashboard')
    ))
  }
})

/**
 * GET /grossesse/nouveau
 * Déclaration d'une nouvelle grossesse
 */
grossesseRoutes.get('/nouveau', async (c) => {
  const profil = c.get('profil')
  
  const html = pageSkeleton(
    profil,
    'Nouvelle grossesse',
    `
      <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold mb-6">Déclaration de grossesse</h1>
        <form method="POST" action="/grossesse/nouveau">
          <!-- Recherche patiente -->
          <div class="mb-4">
            <label class="block font-semibold mb-2">Patiente *</label>
            <input type="text" 
                   name="patient_search" 
                   placeholder="Rechercher par nom, numéro national..."
                   class="w-full border rounded px-3 py-2" 
                   required>
          </div>

          <!-- DDR -->
          <div class="mb-4">
            <label class="block font-semibold mb-2">Date des dernières règles (DDR) *</label>
            <input type="date" 
                   name="ddr" 
                   class="w-full border rounded px-3 py-2" 
                   required>
          </div>

          <!-- Gestité / Parité -->
          <div class="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block font-semibold mb-2">Gestité (G)</label>
              <input type="number" 
                     name="gestitie" 
                     min="1" 
                     class="w-full border rounded px-3 py-2"
                     placeholder="Nombre de grossesses">
            </div>
            <div>
              <label class="block font-semibold mb-2">Parité (P)</label>
              <input type="number" 
                     name="parite" 
                     min="0" 
                     class="w-full border rounded px-3 py-2"
                     placeholder="Nombre d'accouchements">
            </div>
          </div>

          <!-- Niveau de risque -->
          <div class="mb-4">
            <label class="block font-semibold mb-2">Niveau de risque</label>
            <select name="risque" class="w-full border rounded px-3 py-2">
              <option value="faible">Faible</option>
              <option value="moyen">Moyen</option>
              <option value="eleve">Élevé</option>
            </select>
          </div>

          <!-- Antécédents -->
          <div class="mb-4">
            <label class="block font-semibold mb-2">Antécédents particuliers</label>
            <textarea name="antecedents" 
                      rows="3" 
                      class="w-full border rounded px-3 py-2"
                      placeholder="Césarienne, fausse couche, diabète gestationnel..."></textarea>
          </div>

          <div class="flex gap-4">
            <button type="submit" 
                    class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              Enregistrer
            </button>
            <a href="/grossesse" 
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
 * GET /grossesse/dossier/:id
 * Dossier complet d'une grossesse
 */
grossesseRoutes.get('/dossier/:id', async (c) => {
  const profil = c.get('profil')
  const id = c.req.param('id')
  
  const html = pageSkeleton(
    profil,
    'Dossier grossesse',
    `
      <div class="max-w-6xl mx-auto">
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 class="text-2xl font-bold mb-4">Dossier grossesse #${id}</h1>
          <p class="text-gray-500">TODO: Afficher toutes les CPN, examens, vaccinations</p>
        </div>
      </div>
    `
  )

  return c.html(html)
})

/**
 * GET /grossesse/cpn-jour
 * CPN programmées aujourd'hui
 */
grossesseRoutes.get('/cpn-jour', async (c) => {
  const profil = c.get('profil')
  
  const html = pageSkeleton(
    profil,
    'CPN du jour',
    `
      <div class="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold mb-4">Consultations prénatales du jour</h1>
        <p class="text-gray-500">TODO: Liste des CPN programmées</p>
      </div>
    `
  )

  return c.html(html)
})

/**
 * GET /grossesse/accouchements
 * Accouchements et suivi post-natal
 */
grossesseRoutes.get('/accouchements', async (c) => {
  const profil = c.get('profil')
  
  const html = pageSkeleton(
    profil,
    'Accouchements',
    `
      <div class="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold mb-4">Accouchements et suivi post-natal</h1>
        <p class="text-gray-500">TODO: Liste des accouchements récents et à venir</p>
      </div>
    `
  )

  return c.html(html)
})

/**
 * GET /grossesse/recherche
 * Recherche de dossiers de grossesse
 */
grossesseRoutes.get('/recherche', async (c) => {
  const profil = c.get('profil')
  
  const html = pageSkeleton(
    profil,
    'Recherche',
    `
      <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold mb-4">Rechercher un dossier de grossesse</h1>
        <p class="text-gray-500">TODO: Formulaire de recherche</p>
      </div>
    `
  )

  return c.html(html)
})
