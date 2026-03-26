/**
 * src/routes/export.ts
 * Sant&#xe9;BF &#x2014; Export CSV des donn&#xe9;es
 *
 * CORRECTIONS :
 *  - Supprim&#xe9; import pageSkeleton (n'existe pas dans dashboard.ts)
 *  - Supprim&#xe9; import alertHTML (composant inexistant)
 *  - exportRoutes.use('/*') au lieu de '*'
 *  - Page HTML inline (plus de d&#xe9;pendance externe)
 */
import { Hono } from 'hono'
import { requirePlan } from '../middleware/plan'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'
import {
  exporterPatients,
  exporterConsultations,
  exporterFactures,
  exporterOrdonnances,
  exporterExamensLabo,
  exporterStatistiquesStructure,
} from '../utils/export'

export const exportRoutes = new Hono<{ Bindings: Bindings }>()

exportRoutes.use('/*', requireAuth)
// Vérification plan — Export CSV — Pro minimum
exportRoutes.use('/*', requirePlan('pro', 'pilote'))

// GET /export/patients
exportRoutes.get('/patients',
  requireRole('admin_structure', 'medecin', 'agent_accueil', 'super_admin'),
  async (c) => {
    const profil   = c.get('profil' as never) as AuthProfile
    const supabase = c.get('supabase' as never) as any
    try {
      const csv = await exporterPatients(supabase, profil.structure_id!)
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="patients-${new Date().toISOString().split('T')[0]}.csv"`,
        },
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
    const profil   = c.get('profil' as never) as AuthProfile
    const supabase = c.get('supabase' as never) as any
    try {
      const csv = await exporterConsultations(supabase, profil.structure_id!, c.req.query('debut'), c.req.query('fin'))
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="consultations-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    } catch (err) { return c.json({ error: 'Erreur export' }, 500) }
  }
)

// GET /export/factures
exportRoutes.get('/factures',
  requireRole('admin_structure', 'caissier', 'super_admin'),
  async (c) => {
    const profil   = c.get('profil' as never) as AuthProfile
    const supabase = c.get('supabase' as never) as any
    try {
      const csv = await exporterFactures(supabase, profil.structure_id!, c.req.query('debut'), c.req.query('fin'))
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="factures-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    } catch (err) { return c.json({ error: 'Erreur export' }, 500) }
  }
)

// GET /export/ordonnances
exportRoutes.get('/ordonnances',
  requireRole('admin_structure', 'medecin', 'pharmacien', 'super_admin'),
  async (c) => {
    const profil   = c.get('profil' as never) as AuthProfile
    const supabase = c.get('supabase' as never) as any
    try {
      const csv = await exporterOrdonnances(supabase, profil.structure_id!, c.req.query('debut'), c.req.query('fin'))
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="ordonnances-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    } catch (err) { return c.json({ error: 'Erreur export' }, 500) }
  }
)

// GET /export/examens-labo
exportRoutes.get('/examens-labo',
  requireRole('admin_structure', 'laborantin', 'super_admin'),
  async (c) => {
    const profil   = c.get('profil' as never) as AuthProfile
    const supabase = c.get('supabase' as never) as any
    try {
      const csv = await exporterExamensLabo(supabase, profil.structure_id!, c.req.query('debut'), c.req.query('fin'))
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="examens-laboratoire-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    } catch (err) { return c.json({ error: 'Erreur export' }, 500) }
  }
)

// GET /export/statistiques
exportRoutes.get('/statistiques',
  requireRole('admin_structure', 'super_admin'),
  async (c) => {
    const profil   = c.get('profil' as never) as AuthProfile
    const supabase = c.get('supabase' as never) as any
    const mois  = parseInt(c.req.query('mois')  || String(new Date().getMonth() + 1))
    const annee = parseInt(c.req.query('annee') || String(new Date().getFullYear()))
    try {
      const csv = await exporterStatistiquesStructure(supabase, profil.structure_id!, mois, annee)
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="statistiques-${mois}-${annee}.csv"`,
        },
      })
    } catch (err) { return c.json({ error: 'Erreur export' }, 500) }
  }
)

// GET /export &#x2014; Page d'accueil exports
exportRoutes.get('/',
  requireRole('admin_structure', 'medecin', 'caissier', 'laborantin', 'super_admin'),
  async (c) => {
    const profil = c.get('profil' as never) as AuthProfile
    const today  = new Date().toISOString().split('T')[0]
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const dashHref = profil.role === 'admin_structure' ? '/dashboard/structure' : `/dashboard/${profil.role}`

    return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exports CSV &#x2014; Sant&#xe9;BF</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
  <style>
    :root{--vert:#1A6B3C;--vert-c:#e8f5ee;--texte:#0f1923;--soft:#5a6a78;--bg:#f4f6f4;--blanc:#fff;--bordure:#e2e8e4;--r:14px;--rs:10px;}
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);padding:24px;color:var(--texte);}
    .topbar{background:linear-gradient(135deg,#0d4a2a,var(--vert));height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;margin:-24px -24px 24px;position:sticky;top:-24px;z-index:100;}
    .tb-brand{font-family:'Fraunces',serif;font-size:17px;color:white;}
    .tb-btn{background:rgba(255,255,255,.15);color:white;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;}
    .container{max-width:1200px;margin:0 auto;}
    h1{font-family:'Fraunces',serif;font-size:26px;margin-bottom:6px;}
    .sub{font-size:14px;color:var(--soft);margin-bottom:24px;}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;}
    .card{background:var(--blanc);border-radius:var(--r);padding:20px;border:1px solid var(--bordure);}
    .card h3{font-size:15px;font-weight:700;margin-bottom:8px;}
    .card p{font-size:13px;color:var(--soft);margin-bottom:14px;}
    .form-group{margin-bottom:10px;}
    label{display:block;font-size:12px;font-weight:600;color:var(--soft);margin-bottom:4px;}
    input{width:100%;padding:9px 12px;border:1.5px solid var(--bordure);border-radius:var(--rs);font-size:13px;font-family:inherit;outline:none;}
    input:focus{border-color:var(--vert);}
    .btn-export{width:100%;background:var(--vert);color:white;border:none;padding:11px;border-radius:var(--rs);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;}
    .btn-export:hover{background:#15593a;}
    .tip-box{background:var(--blanc);border-radius:var(--r);padding:20px;border:1px solid var(--bordure);margin-top:16px;}
    .tip-box ul{color:var(--soft);line-height:2;font-size:13px;padding-left:18px;margin-top:8px;}
    @media(max-width:640px){.grid{grid-template-columns:1fr;}}
  </style>
</head>
<body>
  <div class="topbar">
    <span class="tb-brand">&#x1F4CA; Sant&#xe9;BF &#x2014; Exports CSV</span>
    <a href="${dashHref}" class="tb-btn">&#x2190; Dashboard</a>
  </div>
  <div class="container">
    <h1>&#x1F4CA; Exports CSV</h1>
    <p class="sub">T&#xe9;l&#xe9;chargez vos donn&#xe9;es au format CSV pour Excel ou LibreOffice</p>
    <div class="grid">
      <div class="card">
        <h3>&#128101; Patients</h3>
        <p>Tous les patients enregistr&#xe9;s dans votre structure</p>
        <button class="btn-export" onclick="window.location.href='/export/patients'">&#128229; T&#xe9;l&#xe9;charger</button>
      </div>
      <div class="card">
        <h3>&#129658; Consultations</h3>
        <form action="/export/consultations" method="GET">
          <div class="form-group"><label>Date d&#xe9;but</label><input type="date" name="debut" value="${firstDay}"></div>
          <div class="form-group"><label>Date fin</label><input type="date" name="fin" value="${today}"></div>
          <button type="submit" class="btn-export">&#128229; T&#xe9;l&#xe9;charger</button>
        </form>
      </div>
      <div class="card">
        <h3>&#128176; Factures</h3>
        <form action="/export/factures" method="GET">
          <div class="form-group"><label>Date d&#xe9;but</label><input type="date" name="debut" value="${firstDay}"></div>
          <div class="form-group"><label>Date fin</label><input type="date" name="fin" value="${today}"></div>
          <button type="submit" class="btn-export">&#128229; T&#xe9;l&#xe9;charger</button>
        </form>
      </div>
      <div class="card">
        <h3>&#128138; Ordonnances</h3>
        <form action="/export/ordonnances" method="GET">
          <div class="form-group"><label>Date d&#xe9;but</label><input type="date" name="debut" value="${firstDay}"></div>
          <div class="form-group"><label>Date fin</label><input type="date" name="fin" value="${today}"></div>
          <button type="submit" class="btn-export">&#128229; T&#xe9;l&#xe9;charger</button>
        </form>
      </div>
      <div class="card">
        <h3>&#129514; Examens laboratoire</h3>
        <form action="/export/examens-labo" method="GET">
          <div class="form-group"><label>Date d&#xe9;but</label><input type="date" name="debut" value="${firstDay}"></div>
          <div class="form-group"><label>Date fin</label><input type="date" name="fin" value="${today}"></div>
          <button type="submit" class="btn-export">&#128229; T&#xe9;l&#xe9;charger</button>
        </form>
      </div>
      <div class="card">
        <h3>&#128200; Statistiques</h3>
        <form action="/export/statistiques" method="GET">
          <div class="form-group"><label>Mois</label><input type="number" name="mois" min="1" max="12" value="${new Date().getMonth()+1}"></div>
          <div class="form-group"><label>Ann&#xe9;e</label><input type="number" name="annee" min="2020" max="2030" value="${new Date().getFullYear()}"></div>
          <button type="submit" class="btn-export">&#128229; T&#xe9;l&#xe9;charger</button>
        </form>
      </div>
    </div>
    <div class="tip-box">
      <strong>&#128161; Comment utiliser les exports CSV</strong>
      <ul>
        <li>Fichiers compatibles Excel, LibreOffice, Google Sheets</li>
        <li>Dates au format fran&#xe7;ais (JJ/MM/AAAA)</li>
        <li>Montants en FCFA</li>
        <li>Les exports respectent vos permissions de r&#xf4;le</li>
      </ul>
    </div>
  </div>
</body>
</html>`)
  }
)
