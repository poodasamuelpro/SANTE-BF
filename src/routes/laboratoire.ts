/**
 * Routes du module Laboratoire
 * Gestion des examens, résultats, analyses biologiques
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import type { AuthProfile } from '../lib/supabase'
// Note: pageSkeleton, statsGrid, actionCard, dataTable sont définis localement pour ce module
import { alertHTML } from '../components/alert'

export const laboratoireRoutes = new Hono()

// Middleware : authentification requise pour toutes les routes
laboratoireRoutes.use('*', requireAuth)
laboratoireRoutes.use('*', requireRole(['laborantin', 'super_admin']))

/**
 * GET /laboratoire
 * Dashboard du laboratoire
 */
laboratoireRoutes.get('/', async (c) => {
  const supabase = c.get('supabase')
  const profil = c.get('profil')

  try {
    // Récupérer les examens en attente
    const { data: enAttente, error: err1 } = await supabase
      .from('medical_examens')
      .select(`
        id, numero_examen, patient_id, medecin_prescripteur_id, type_examen,
        statut, date_prescription, date_prevu, priorite, created_at,
        patient:patient_id (nom, prenom, numero_national),
        medecin:medecin_prescripteur_id (nom, prenom)
      `)
      .eq('structure_id', profil.structure_id!)
      .eq('statut', 'en_attente')
      .order('date_prevu', { ascending: true })
      .limit(20)

    if (err1) throw err1

    // Récupérer les examens en cours
    const { data: enCours, error: err2 } = await supabase
      .from('medical_examens')
      .select(`
        id, numero_examen, patient_id, type_examen, statut, date_prevu,
        patient:patient_id (nom, prenom)
      `)
      .eq('structure_id', profil.structure_id!)
      .eq('statut', 'en_cours')
      .order('date_prevu', { ascending: true })
      .limit(10)

    if (err2) throw err2

    // Récupérer les examens du jour
    const aujourdhui = new Date().toISOString().split('T')[0]
    const { data: examensJour, error: err3 } = await supabase
      .from('medical_examens')
      .select('id')
      .eq('structure_id', profil.structure_id!)
      .gte('created_at', `${aujourdhui}T00:00:00`)
      .lte('created_at', `${aujourdhui}T23:59:59`)

    if (err3) throw err3

    // Récupérer les résultats non validés
    const { data: nonValides, error: err4 } = await supabase
      .from('medical_examens')
      .select('id')
      .eq('structure_id', profil.structure_id!)
      .eq('statut', 'resultat_disponible')
      .is('valide_par', null)

    if (err4) throw err4

    const stats = {
      enAttente: enAttente?.length || 0,
      enCours: enCours?.length || 0,
      examensJour: examensJour?.length || 0,
      nonValides: nonValides?.length || 0
    }

    const html = pageSkeleton(
      profil,
      'Laboratoire',
      `
        <div class="max-w-7xl mx-auto">
          <!-- Statistiques -->
          ${statsGrid([
            { label: 'En attente', value: stats.enAttente.toString(), icon: '⏳', color: 'orange' },
            { label: 'En cours', value: stats.enCours.toString(), icon: '🔬', color: 'blue' },
            { label: "Examens aujourd'hui", value: stats.examensJour.toString(), icon: '📊', color: 'green' },
            { label: 'À valider', value: stats.nonValides.toString(), icon: '✅', color: 'red' }
          ])}

          <!-- Actions rapides -->
          <div class="grid md:grid-cols-3 gap-4 mb-8">
            ${actionCard('Nouvel examen', '🧪', '/laboratoire/nouveau', 'blue')}
            ${actionCard('Rechercher patient', '🔍', '/laboratoire/recherche', 'gray')}
            ${actionCard('Historique', '📋', '/laboratoire/historique', 'gray')}
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
                      <th class="px-4 py-2 text-left">Type</th>
                      <th class="px-4 py-2 text-left">Prescripteur</th>
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
                        <td class="px-4 py-3">${ex.type_examen}</td>
                        <td class="px-4 py-3">${ex.medecin?.nom || '—'}</td>
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
                          <a href="/laboratoire/examen/${ex.id}" 
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
              <span>🔬</span> Examens en cours
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
                    <div class="text-sm text-gray-600">${ex.type_examen}</div>
                    <a href="/laboratoire/examen/${ex.id}" 
                       class="inline-block mt-2 text-blue-600 hover:underline text-sm">
                      Saisir résultats →
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
    console.error('Erreur dashboard laboratoire:', error)
    return c.html(pageSkeleton(
      profil,
      'Erreur',
      alertHTML('error', 'Erreur lors du chargement du dashboard')
    ))
  }
})

/**
 * GET /laboratoire/nouveau
 * Formulaire de prescription d'examen (si accès direct)
 */
laboratoireRoutes.get('/nouveau', async (c) => {
  const profil = c.get('profil')
  
  const html = pageSkeleton(
    profil,
    'Nouvel examen',
    `
      <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold mb-6">Nouvel examen</h1>
        <form method="POST" action="/laboratoire/nouveau">
          <!-- Recherche patient -->
          <div class="mb-4">
            <label class="block font-semibold mb-2">Patient *</label>
            <input type="text" 
                   name="patient_search" 
                   placeholder="Rechercher par nom, numéro national..."
                   class="w-full border rounded px-3 py-2" 
                   required>
          </div>

          <!-- Type d'examen -->
          <div class="mb-4">
            <label class="block font-semibold mb-2">Type d'examen *</label>
            <select name="type_examen" class="w-full border rounded px-3 py-2" required>
              <option value="">-- Sélectionner --</option>
              <optgroup label="Hématologie">
                <option value="NFS">NFS (Numération Formule Sanguine)</option>
                <option value="Hemogramme">Hémogramme complet</option>
                <option value="VS">VS (Vitesse de Sédimentation)</option>
                <option value="Groupage_sanguin">Groupage sanguin</option>
              </optgroup>
              <optgroup label="Biochimie">
                <option value="Glycemie">Glycémie</option>
                <option value="HbA1c">HbA1c</option>
                <option value="Creatinine">Créatinine</option>
                <option value="Uree">Urée</option>
                <option value="Bilan_hepatique">Bilan hépatique</option>
                <option value="Bilan_lipidique">Bilan lipidique</option>
              </optgroup>
              <optgroup label="Sérologie">
                <option value="HIV">Test HIV</option>
                <option value="Hepatite_B">Hépatite B</option>
                <option value="Hepatite_C">Hépatite C</option>
              </optgroup>
              <optgroup label="Microbiologie">
                <option value="ECBU">ECBU</option>
                <option value="Coproculture">Coproculture</option>
                <option value="GE_paludisme">Goutte épaisse (paludisme)</option>
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

          <!-- Instructions -->
          <div class="mb-4">
            <label class="block font-semibold mb-2">Instructions particulières</label>
            <textarea name="instructions" 
                      rows="3" 
                      class="w-full border rounded px-3 py-2"
                      placeholder="À jeun, prélèvement spécifique..."></textarea>
          </div>

          <div class="flex gap-4">
            <button type="submit" 
                    class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              Enregistrer
            </button>
            <a href="/laboratoire" 
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
 * POST /laboratoire/nouveau
 * Création d'un nouvel examen
 */
laboratoireRoutes.post('/nouveau', async (c) => {
  // TODO: Implémenter la création d'examen
  return c.redirect('/laboratoire')
})

/**
 * GET /laboratoire/examen/:id
 * Détail d'un examen + saisie des résultats
 */
laboratoireRoutes.get('/examen/:id', async (c) => {
  const profil = c.get('profil')
  const id = c.req.param('id')
  
  const html = pageSkeleton(
    profil,
    'Détail examen',
    `
      <div class="max-w-4xl mx-auto">
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 class="text-2xl font-bold mb-4">Examen #${id}</h1>
          <p class="text-gray-500">TODO: Afficher détails et saisir résultats</p>
        </div>
      </div>
    `
  )

  return c.html(html)
})

/**
 * GET /laboratoire/recherche
 * Recherche d'examens
 */
laboratoireRoutes.get('/recherche', async (c) => {
  const profil = c.get('profil')
  
  const html = pageSkeleton(
    profil,
    'Recherche',
    `
      <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold mb-4">Rechercher un examen</h1>
        <p class="text-gray-500">TODO: Formulaire de recherche multi-critères</p>
      </div>
    `
  )

  return c.html(html)
})

/**
 * GET /laboratoire/historique
 * Historique des examens
 */
laboratoireRoutes.get('/historique', async (c) => {
  const profil = c.get('profil')
  
  const html = pageSkeleton(
    profil,
    'Historique',
    `
      <div class="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold mb-4">Historique des examens</h1>
        <p class="text-gray-500">TODO: Liste complète avec filtres et pagination</p>
      </div>
    `
  )

  return c.html(html)
})
