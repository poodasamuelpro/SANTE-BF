/**
 * Routes du module Radiologie
 * Gestion des examens d'imagerie médicale
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import type { AuthProfile } from '../lib/supabase'
// Note: pageSkeleton, statsGrid, actionCard sont définis localement pour ce module
import { alertHTML } from '../components/alert'

export const radiologieRoutes = new Hono()

// Middleware : authentification requise
radiologieRoutes.use('*', requireAuth)
radiologieRoutes.use('*', requireRole(['radiologue', 'super_admin']))

/**
 * GET /radiologie
 * Dashboard du service de radiologie
 */
radiologieRoutes.get('/', async (c) => {
  const supabase = c.get('supabase')
  const profil = c.get('profil')

  try {
    // Récupérer les examens en attente
    const { data: enAttente, error: err1 } = await supabase
      .from('medical_examens_imagerie')
      .select(`
        id, numero_examen, patient_id, type_imagerie, statut, priorite, date_prevu,
        patient:patient_id (nom, prenom, numero_national)
      `)
      .eq('structure_id', profil.structure_id!)
      .eq('statut', 'en_attente')
      .order('date_prevu', { ascending: true })
      .limit(20)

    if (err1) throw err1

    // Examens en cours
    const { data: enCours, error: err2 } = await supabase
      .from('medical_examens_imagerie')
      .select('id, numero_examen, patient_id, type_imagerie, patient:patient_id (nom, prenom)')
      .eq('structure_id', profil.structure_id!)
      .eq('statut', 'en_cours')
      .order('created_at', { ascending: false })
      .limit(10)

    if (err2) throw err2

    // Examens du jour
    const aujourdhui = new Date().toISOString().split('T')[0]
    const { data: examensJour, error: err3 } = await supabase
      .from('medical_examens_imagerie')
      .select('id')
      .eq('structure_id', profil.structure_id!)
      .gte('created_at', `${aujourdhui}T00:00:00`)
      .lte('created_at', `${aujourdhui}T23:59:59`)

    if (err3) throw err3

    // À valider
    const { data: aValider, error: err4 } = await supabase
      .from('medical_examens_imagerie')
      .select('id')
      .eq('structure_id', profil.structure_id!)
      .eq('statut', 'cliche_disponible')
      .is('compte_rendu', null)

    if (err4) throw err4

    const stats = {
      enAttente: enAttente?.length || 0,
      enCours: enCours?.length || 0,
      examensJour: examensJour?.length || 0,
      aValider: aValider?.length || 0
    }

    const html = pageSkeleton(
      profil,
      'Radiologie',
      `
        <div class="max-w-7xl mx-auto">
          <!-- Statistiques -->
          ${statsGrid([
            { label: 'En attente', value: stats.enAttente.toString(), icon: '⏳', color: 'orange' },
            { label: 'En cours', value: stats.enCours.toString(), icon: '📷', color: 'blue' },
            { label: "Examens aujourd'hui", value: stats.examensJour.toString(), icon: '📊', color: 'green' },
            { label: 'À interpréter', value: stats.aValider.toString(), icon: '📝', color: 'red' }
          ])}

          <!-- Actions rapides -->
          <div class="grid md:grid-cols-3 gap-4 mb-8">
            ${actionCard('Nouvel examen', '🖼️', '/radiologie/nouveau', 'blue')}
            ${actionCard('Rechercher patient', '🔍', '/radiologie/recherche', 'gray')}
            ${actionCard('Historique', '📋', '/radiologie/historique', 'gray')}
          </div>

          <!-- Examens en attente -->
          <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
              <span>⏳</span> Examens en attente
            </h2>
            ${enAttente && enAttente.length > 0 ? `
              <div class="overflow-x-auto">
                <table class="min-w-full">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-2 text-left">N° Examen</th>
                      <th class="px-4 py-2 text-left">Patient</th>
                      <th class="px-4 py-2 text-left">Type d'imagerie</th>
                      <th class="px-4 py-2 text-left">Date prévue</th>
                      <th class="px-4 py-2 text-left">Priorité</th>
                      <th class="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${enAttente.map(ex => `
                      <tr class="border-t hover:bg-gray-50">
                        <td class="px-4 py-3 font-mono text-sm">${ex.numero_examen}</td>
                        <td class="px-4 py-3">${ex.patient?.nom} ${ex.patient?.prenom}</td>
                        <td class="px-4 py-3">${ex.type_imagerie}</td>
                        <td class="px-4 py-3">${ex.date_prevu ? new Date(ex.date_prevu).toLocaleDateString('fr-FR') : '—'}</td>
                        <td class="px-4 py-3">
                          <span class="px-2 py-1 text-xs rounded ${
                            ex.priorite === 'urgente' ? 'bg-red-100 text-red-800' :
                            ex.priorite === 'elevee' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }">
                            ${ex.priorite}
                          </span>
                        </td>
                        <td class="px-4 py-3">
                          <a href="/radiologie/examen/${ex.id}" 
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
              <p class="text-gray-500 text-center py-8">Aucun examen en attente</p>
            `}
          </div>

          <!-- Examens en cours -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
              <span>📷</span> Examens en cours
            </h2>
            ${enCours && enCours.length > 0 ? `
              <div class="grid md:grid-cols-2 gap-4">
                ${enCours.map(ex => `
                  <div class="border rounded-lg p-4 hover:shadow-md transition">
                    <div class="flex justify-between items-start mb-2">
                      <span class="font-mono text-sm text-gray-600">${ex.numero_examen}</span>
                      <span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">En cours</span>
                    </div>
                    <div class="font-semibold">${ex.patient?.nom} ${ex.patient?.prenom}</div>
                    <div class="text-sm text-gray-600">${ex.type_imagerie}</div>
                    <a href="/radiologie/examen/${ex.id}" 
                       class="inline-block mt-2 text-blue-600 hover:underline text-sm">
                      Saisir compte-rendu →
                    </a>
                  </div>
                `).join('')}
              </div>
            ` : `
              <p class="text-gray-500 text-center py-8">Aucun examen en cours</p>
            `}
          </div>
        </div>
      `
    )

    return c.html(html)
  } catch (error) {
    console.error('Erreur dashboard radiologie:', error)
    return c.html(pageSkeleton(
      profil,
      'Erreur',
      alertHTML('error', 'Erreur lors du chargement du dashboard')
    ))
  }
})

/**
 * GET /radiologie/nouveau
 * Formulaire de prescription d'examen d'imagerie
 */
radiologieRoutes.get('/nouveau', async (c) => {
  const profil = c.get('profil')
  
  const html = pageSkeleton(
    profil,
    'Nouvel examen',
    `
      <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold mb-6">Nouvel examen d'imagerie</h1>
        <form method="POST" action="/radiologie/nouveau">
          <!-- Recherche patient -->
          <div class="mb-4">
            <label class="block font-semibold mb-2">Patient *</label>
            <input type="text" 
                   name="patient_search" 
                   placeholder="Rechercher par nom, numéro national..."
                   class="w-full border rounded px-3 py-2" 
                   required>
          </div>

          <!-- Type d'imagerie -->
          <div class="mb-4">
            <label class="block font-semibold mb-2">Type d'imagerie *</label>
            <select name="type_imagerie" class="w-full border rounded px-3 py-2" required>
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

          <!-- Priorité -->
          <div class="mb-4">
            <label class="block font-semibold mb-2">Priorité</label>
            <select name="priorite" class="w-full border rounded px-3 py-2">
              <option value="normale">Normale</option>
              <option value="elevee">Élevée</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>

          <!-- Indication clinique -->
          <div class="mb-4">
            <label class="block font-semibold mb-2">Indication clinique *</label>
            <textarea name="indication_clinique" 
                      rows="3" 
                      class="w-full border rounded px-3 py-2"
                      placeholder="Motif de la demande d'examen..."
                      required></textarea>
          </div>

          <div class="flex gap-4">
            <button type="submit" 
                    class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              Enregistrer
            </button>
            <a href="/radiologie" 
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
 * GET /radiologie/examen/:id
 * Détail examen + saisie du compte-rendu
 */
radiologieRoutes.get('/examen/:id', async (c) => {
  const profil = c.get('profil')
  const id = c.req.param('id')
  
  const html = pageSkeleton(
    profil,
    'Détail examen',
    `
      <div class="max-w-4xl mx-auto">
        <div class="bg-white rounded-lg shadow-md p-6">
          <h1 class="text-2xl font-bold mb-4">Examen d'imagerie #${id}</h1>
          <p class="text-gray-500">TODO: Afficher clichés et saisir compte-rendu</p>
        </div>
      </div>
    `
  )

  return c.html(html)
})

/**
 * GET /radiologie/recherche
 * Recherche d'examens
 */
radiologieRoutes.get('/recherche', async (c) => {
  const profil = c.get('profil')
  
  const html = pageSkeleton(
    profil,
    'Recherche',
    `
      <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold mb-4">Rechercher un examen</h1>
        <p class="text-gray-500">TODO: Formulaire de recherche</p>
      </div>
    `
  )

  return c.html(html)
})

/**
 * GET /radiologie/historique
 * Historique des examens
 */
radiologieRoutes.get('/historique', async (c) => {
  const profil = c.get('profil')
  
  const html = pageSkeleton(
    profil,
    'Historique',
    `
      <div class="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold mb-4">Historique des examens</h1>
        <p class="text-gray-500">TODO: Liste avec filtres</p>
      </div>
    `
  )

  return c.html(html)
})
