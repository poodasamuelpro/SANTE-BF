/**
 * Routes export Excel/CSV
 * Permet d'exporter des listes et statistiques en format CSV
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import {
  exporterPatients,
  exporterConsultations,
  exporterFactures,
  exporterOrdonnances,
  exporterExamensLabo,
  exporterStatistiquesStructure
} from '../utils/export'

export const exportRoutes = new Hono()

// Middleware auth
exportRoutes.use('*', requireAuth)

/**
 * GET /export/patients
 * Exporter liste patients (CSV)
 * Rôles: admin_structure, medecin, agent_accueil
 */
exportRoutes.get('/patients', requireRole(['admin_structure', 'medecin', 'agent_accueil', 'super_admin']), async (c) => {
  const profil = c.get('profil')
  const supabase = c.get('supabase')
  
  try {
    const csv = await exporterPatients(
      supabase,
      profil.structure_id,
      'csv'
    )

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="patients-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Erreur export patients:', error)
    return c.json({ error: 'Erreur export' }, 500)
  }
})

/**
 * GET /export/consultations
 * Exporter consultations (CSV)
 * Rôles: admin_structure, medecin
 */
exportRoutes.get('/consultations', requireRole(['admin_structure', 'medecin', 'super_admin']), async (c) => {
  const profil = c.get('profil')
  const supabase = c.get('supabase')
  const dateDebut = c.req.query('debut')
  const dateFin = c.req.query('fin')
  
  try {
    const csv = await exporterConsultations(
      supabase,
      profil.structure_id,
      dateDebut,
      dateFin,
      'csv'
    )

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="consultations-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Erreur export consultations:', error)
    return c.json({ error: 'Erreur export' }, 500)
  }
})

/**
 * GET /export/factures
 * Exporter factures (CSV)
 * Rôles: admin_structure, caissier
 */
exportRoutes.get('/factures', requireRole(['admin_structure', 'caissier', 'super_admin']), async (c) => {
  const profil = c.get('profil')
  const supabase = c.get('supabase')
  const dateDebut = c.req.query('debut')
  const dateFin = c.req.query('fin')
  
  try {
    const csv = await exporterFactures(
      supabase,
      profil.structure_id,
      dateDebut,
      dateFin,
      'csv'
    )

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="factures-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Erreur export factures:', error)
    return c.json({ error: 'Erreur export' }, 500)
  }
})

/**
 * GET /export/ordonnances
 * Exporter ordonnances (CSV)
 * Rôles: admin_structure, medecin, pharmacien
 */
exportRoutes.get('/ordonnances', requireRole(['admin_structure', 'medecin', 'pharmacien', 'super_admin']), async (c) => {
  const profil = c.get('profil')
  const supabase = c.get('supabase')
  const dateDebut = c.req.query('debut')
  const dateFin = c.req.query('fin')
  
  try {
    const csv = await exporterOrdonnances(
      supabase,
      profil.structure_id,
      dateDebut,
      dateFin,
      'csv'
    )

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ordonnances-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Erreur export ordonnances:', error)
    return c.json({ error: 'Erreur export' }, 500)
  }
})

/**
 * GET /export/examens-labo
 * Exporter examens laboratoire (CSV)
 * Rôles: admin_structure, laborantin
 */
exportRoutes.get('/examens-labo', requireRole(['admin_structure', 'laborantin', 'super_admin']), async (c) => {
  const profil = c.get('profil')
  const supabase = c.get('supabase')
  const dateDebut = c.req.query('debut')
  const dateFin = c.req.query('fin')
  
  try {
    const csv = await exporterExamensLabo(
      supabase,
      profil.structure_id,
      dateDebut,
      dateFin,
      'csv'
    )

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="examens-laboratoire-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Erreur export examens labo:', error)
    return c.json({ error: 'Erreur export' }, 500)
  }
})

/**
 * GET /export/statistiques
 * Exporter statistiques structure (CSV)
 * Rôles: admin_structure, super_admin
 */
exportRoutes.get('/statistiques', requireRole(['admin_structure', 'super_admin']), async (c) => {
  const profil = c.get('profil')
  const supabase = c.get('supabase')
  const mois = parseInt(c.req.query('mois') || new Date().getMonth() + 1 + '')
  const annee = parseInt(c.req.query('annee') || new Date().getFullYear() + '')
  
  try {
    const csv = await exporterStatistiquesStructure(
      supabase,
      profil.structure_id,
      mois,
      annee,
      'csv'
    )

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="statistiques-${mois}-${annee}.csv"`
      }
    })
  } catch (error) {
    console.error('Erreur export stats:', error)
    return c.json({ error: 'Erreur export' }, 500)
  }
})

/**
 * GET /export
 * Page d'accueil exports (formulaire)
 */
exportRoutes.get('/', requireRole(['admin_structure', 'medecin', 'caissier', 'laborantin', 'super_admin']), async (c) => {
  const profil = c.get('profil')
  
  const today = new Date().toISOString().split('T')[0]
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  return c.html(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Exports CSV - SantéBF</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui; background: #f3f4f6; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .back-link { color: #3b82f6; text-decoration: none; }
        .export-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 20px;
        }
        .export-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 2px solid #e5e7eb;
        }
        .export-card h3 {
          margin-bottom: 15px;
          color: #333;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .form-group {
          margin-bottom: 15px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
          color: #666;
          font-weight: 600;
        }
        .form-group input {
          width: 100%;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }
        .btn-export {
          width: 100%;
          background: #10b981;
          color: white;
          border: none;
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        .btn-export:hover { background: #059669; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <a href="/dashboard/${profil.role === 'admin_structure' ? 'structure' : profil.role}" class="back-link">← Retour au dashboard</a>
          <h1 style="margin-top: 15px;">📊 Exports CSV</h1>
          <p style="margin-top: 10px; color: #666;">Téléchargez vos données en format CSV pour Excel/LibreOffice</p>
        </div>

        <div class="export-grid">
          <!-- Export patients -->
          <div class="export-card">
            <h3>👥 Liste des patients</h3>
            <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
              Export de tous les patients enregistrés dans votre structure
            </p>
            <button class="btn-export" onclick="window.location.href='/export/patients'">
              📥 Télécharger liste patients
            </button>
          </div>

          <!-- Export consultations -->
          <div class="export-card">
            <h3>🩺 Consultations</h3>
            <form action="/export/consultations" method="GET">
              <div class="form-group">
                <label>Date début</label>
                <input type="date" name="debut" value="${firstDayOfMonth}">
              </div>
              <div class="form-group">
                <label>Date fin</label>
                <input type="date" name="fin" value="${today}">
              </div>
              <button type="submit" class="btn-export">📥 Télécharger consultations</button>
            </form>
          </div>

          <!-- Export factures -->
          <div class="export-card">
            <h3>💰 Factures</h3>
            <form action="/export/factures" method="GET">
              <div class="form-group">
                <label>Date début</label>
                <input type="date" name="debut" value="${firstDayOfMonth}">
              </div>
              <div class="form-group">
                <label>Date fin</label>
                <input type="date" name="fin" value="${today}">
              </div>
              <button type="submit" class="btn-export">📥 Télécharger factures</button>
            </form>
          </div>

          <!-- Export ordonnances -->
          <div class="export-card">
            <h3>💊 Ordonnances</h3>
            <form action="/export/ordonnances" method="GET">
              <div class="form-group">
                <label>Date début</label>
                <input type="date" name="debut" value="${firstDayOfMonth}">
              </div>
              <div class="form-group">
                <label>Date fin</label>
                <input type="date" name="fin" value="${today}">
              </div>
              <button type="submit" class="btn-export">📥 Télécharger ordonnances</button>
            </form>
          </div>

          <!-- Export examens labo -->
          <div class="export-card">
            <h3>🧪 Examens laboratoire</h3>
            <form action="/export/examens-labo" method="GET">
              <div class="form-group">
                <label>Date début</label>
                <input type="date" name="debut" value="${firstDayOfMonth}">
              </div>
              <div class="form-group">
                <label>Date fin</label>
                <input type="date" name="fin" value="${today}">
              </div>
              <button type="submit" class="btn-export">📥 Télécharger examens</button>
            </form>
          </div>

          <!-- Export statistiques -->
          <div class="export-card">
            <h3>📈 Statistiques structure</h3>
            <form action="/export/statistiques" method="GET">
              <div class="form-group">
                <label>Mois</label>
                <input type="number" name="mois" min="1" max="12" value="${new Date().getMonth() + 1}">
              </div>
              <div class="form-group">
                <label>Année</label>
                <input type="number" name="annee" min="2020" max="2030" value="${new Date().getFullYear()}">
              </div>
              <button type="submit" class="btn-export">📥 Télécharger statistiques</button>
            </form>
          </div>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
          <h3 style="margin-bottom: 10px;">💡 Comment utiliser les exports CSV</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li>Les fichiers CSV peuvent être ouverts avec Excel, LibreOffice Calc ou Google Sheets</li>
            <li>Les dates sont au format français (JJ/MM/AAAA)</li>
            <li>Les montants sont en FCFA</li>
            <li>Sélectionnez les dates pour filtrer les données à exporter</li>
            <li>Les exports respectent automatiquement les permissions de votre rôle</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `)
})
