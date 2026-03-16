/**
 * Routes export Excel/CSV
 * ✅ CORRECTION : requireRole() attend des arguments individuels, pas un tableau
 * Ancienne version : requireRole(['admin_structure', 'medecin', ...])  ← ERREUR
 * Version corrigée : requireRole('admin_structure', 'medecin', ...)    ← CORRECT
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

exportRoutes.use('*', requireAuth)

// GET /export/patients
exportRoutes.get('/patients',
  requireRole('admin_structure', 'medecin', 'agent_accueil', 'super_admin'),
  async (c) => {
    const profil  = c.get('profil')
    const supabase = c.get('supabase')
    try {
      const csv = await exporterPatients(supabase, profil.structure_id, 'csv')
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="patients-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } catch (err) {
      console.error('Erreur export patients:', err)
      return c.json({ error: 'Erreur export' }, 500)
    }
  }
)

// GET /export/consultations
exportRoutes.get('/consultations',
  requireRole('admin_structure', 'medecin', 'super_admin'),
  async (c) => {
    const profil   = c.get('profil')
    const supabase = c.get('supabase')
    const dateDebut = c.req.query('debut')
    const dateFin   = c.req.query('fin')
    try {
      const csv = await exporterConsultations(supabase, profil.structure_id, dateDebut, dateFin, 'csv')
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="consultations-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } catch (err) {
      console.error('Erreur export consultations:', err)
      return c.json({ error: 'Erreur export' }, 500)
    }
  }
)

// GET /export/factures
exportRoutes.get('/factures',
  requireRole('admin_structure', 'caissier', 'super_admin'),
  async (c) => {
    const profil   = c.get('profil')
    const supabase = c.get('supabase')
    const dateDebut = c.req.query('debut')
    const dateFin   = c.req.query('fin')
    try {
      const csv = await exporterFactures(supabase, profil.structure_id, dateDebut, dateFin, 'csv')
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="factures-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } catch (err) {
      console.error('Erreur export factures:', err)
      return c.json({ error: 'Erreur export' }, 500)
    }
  }
)

// GET /export/ordonnances
exportRoutes.get('/ordonnances',
  requireRole('admin_structure', 'medecin', 'pharmacien', 'super_admin'),
  async (c) => {
    const profil   = c.get('profil')
    const supabase = c.get('supabase')
    const dateDebut = c.req.query('debut')
    const dateFin   = c.req.query('fin')
    try {
      const csv = await exporterOrdonnances(supabase, profil.structure_id, dateDebut, dateFin, 'csv')
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="ordonnances-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } catch (err) {
      console.error('Erreur export ordonnances:', err)
      return c.json({ error: 'Erreur export' }, 500)
    }
  }
)

// GET /export/examens-labo
exportRoutes.get('/examens-labo',
  requireRole('admin_structure', 'laborantin', 'super_admin'),
  async (c) => {
    const profil   = c.get('profil')
    const supabase = c.get('supabase')
    const dateDebut = c.req.query('debut')
    const dateFin   = c.req.query('fin')
    try {
      const csv = await exporterExamensLabo(supabase, profil.structure_id, dateDebut, dateFin, 'csv')
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="examens-laboratoire-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } catch (err) {
      console.error('Erreur export examens labo:', err)
      return c.json({ error: 'Erreur export' }, 500)
    }
  }
)

// GET /export/statistiques
exportRoutes.get('/statistiques',
  requireRole('admin_structure', 'super_admin'),
  async (c) => {
    const profil   = c.get('profil')
    const supabase = c.get('supabase')
    const mois  = parseInt(c.req.query('mois')  || String(new Date().getMonth() + 1))
    const annee = parseInt(c.req.query('annee') || String(new Date().getFullYear()))
    try {
      const csv = await exporterStatistiquesStructure(supabase, profil.structure_id, mois, annee, 'csv')
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="statistiques-${mois}-${annee}.csv"`
        }
      })
    } catch (err) {
      console.error('Erreur export stats:', err)
      return c.json({ error: 'Erreur export' }, 500)
    }
  }
)

// GET /export — Page d'accueil exports
exportRoutes.get('/',
  requireRole('admin_structure', 'medecin', 'caissier', 'laborantin', 'super_admin'),
  async (c) => {
    const profil = c.get('profil')
    const today = new Date().toISOString().split('T')[0]
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const dashboardHref = profil.role === 'admin_structure' ? '/dashboard/structure' : `/dashboard/${profil.role}`

    return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exports CSV — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
  <style>
    :root { --vert:#1A6B3C; --vert-clair:#e8f5ee; --texte:#0f1923; --soft:#5a6a78; --bg:#f4f6f4; --blanc:#fff; --bordure:#e2e8e4; }
    *,*::before,*::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Plus Jakarta Sans',sans-serif; background:var(--bg); padding:24px; color:var(--texte); }
    .container { max-width:1200px; margin:0 auto; }
    .back-link { display:inline-flex; align-items:center; gap:6px; color:var(--vert); text-decoration:none; font-size:14px; font-weight:600; margin-bottom:20px; }
    h1 { font-family:'Fraunces',serif; font-size:28px; margin-bottom:6px; }
    .sub { font-size:14px; color:var(--soft); margin-bottom:28px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:18px; }
    .card { background:var(--blanc); border-radius:14px; padding:22px; border:1px solid var(--bordure); }
    .card h3 { font-size:15px; font-weight:700; margin-bottom:8px; display:flex; align-items:center; gap:8px; }
    .card p { font-size:13px; color:var(--soft); margin-bottom:14px; }
    .form-group { margin-bottom:12px; }
    .form-group label { display:block; font-size:12px; font-weight:600; color:var(--soft); margin-bottom:4px; }
    .form-group input { width:100%; padding:9px 12px; border:1.5px solid var(--bordure); border-radius:8px; font-size:13px; font-family:inherit; }
    .btn-export { width:100%; background:var(--vert); color:white; border:none; padding:11px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
    .btn-export:hover { background:#15593a; }
    .tip-box { background:var(--blanc); border-radius:14px; padding:22px; border:1px solid var(--bordure); margin-top:20px; }
    .tip-box h3 { font-size:15px; font-weight:700; margin-bottom:10px; }
    .tip-box ul { color:var(--soft); line-height:2; font-size:13px; padding-left:18px; }
  </style>
</head>
<body>
  <div class="container">
    <a href="${dashboardHref}" class="back-link">← Retour au dashboard</a>
    <h1>📊 Exports CSV</h1>
    <p class="sub">Téléchargez vos données en format CSV pour Excel ou LibreOffice</p>

    <div class="grid">
      <div class="card">
        <h3>👥 Liste des patients</h3>
        <p>Export de tous les patients enregistrés dans votre structure</p>
        <button class="btn-export" onclick="window.location.href='/export/patients'">📥 Télécharger patients</button>
      </div>

      <div class="card">
        <h3>🩺 Consultations</h3>
        <form action="/export/consultations" method="GET">
          <div class="form-group"><label>Date début</label><input type="date" name="debut" value="${firstDayOfMonth}"></div>
          <div class="form-group"><label>Date fin</label><input type="date" name="fin" value="${today}"></div>
          <button type="submit" class="btn-export">📥 Télécharger consultations</button>
        </form>
      </div>

      <div class="card">
        <h3>💰 Factures</h3>
        <form action="/export/factures" method="GET">
          <div class="form-group"><label>Date début</label><input type="date" name="debut" value="${firstDayOfMonth}"></div>
          <div class="form-group"><label>Date fin</label><input type="date" name="fin" value="${today}"></div>
          <button type="submit" class="btn-export">📥 Télécharger factures</button>
        </form>
      </div>

      <div class="card">
        <h3>💊 Ordonnances</h3>
        <form action="/export/ordonnances" method="GET">
          <div class="form-group"><label>Date début</label><input type="date" name="debut" value="${firstDayOfMonth}"></div>
          <div class="form-group"><label>Date fin</label><input type="date" name="fin" value="${today}"></div>
          <button type="submit" class="btn-export">📥 Télécharger ordonnances</button>
        </form>
      </div>

      <div class="card">
        <h3>🧪 Examens laboratoire</h3>
        <form action="/export/examens-labo" method="GET">
          <div class="form-group"><label>Date début</label><input type="date" name="debut" value="${firstDayOfMonth}"></div>
          <div class="form-group"><label>Date fin</label><input type="date" name="fin" value="${today}"></div>
          <button type="submit" class="btn-export">📥 Télécharger examens</button>
        </form>
      </div>

      <div class="card">
        <h3>📈 Statistiques structure</h3>
        <form action="/export/statistiques" method="GET">
          <div class="form-group"><label>Mois</label><input type="number" name="mois" min="1" max="12" value="${new Date().getMonth() + 1}"></div>
          <div class="form-group"><label>Année</label><input type="number" name="annee" min="2020" max="2030" value="${new Date().getFullYear()}"></div>
          <button type="submit" class="btn-export">📥 Télécharger statistiques</button>
        </form>
      </div>
    </div>

    <div class="tip-box">
      <h3>💡 Comment utiliser les exports CSV</h3>
      <ul>
        <li>Les fichiers CSV peuvent être ouverts avec Excel, LibreOffice ou Google Sheets</li>
        <li>Les dates sont au format français (JJ/MM/AAAA)</li>
        <li>Les montants sont en FCFA</li>
        <li>Les exports respectent automatiquement les permissions de votre rôle</li>
      </ul>
    </div>
  </div>
</body>
</html>`)
  }
)
