// Routes admin structure — Gestion personnel, lits, services, stats
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile } from '../lib/supabase'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
export const structureRoutes = new Hono<{ Bindings: Bindings }>()

structureRoutes.use('/*', requireAuth, requireRole('admin_structure')) 

// ── Liste du personnel ─────────────────────────────────────────
structureRoutes.get('/personnel', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: personnel } = await supabase
    .from('auth_profiles')
    .select('id, nom, prenom, role, est_actif, created_at')
    .eq('structure_id', profil.structure_id)
    .order('nom', { ascending: true })

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Personnel — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;padding:20px}
    .container{max-width:1100px;margin:0 auto}
    .back-link{display:inline-flex;align-items:center;gap:6px;color:#1565C0;text-decoration:none;font-size:14px;margin-bottom:16px;font-weight:600}
    .card{background:white;border-radius:16px;padding:28px 32px;box-shadow:0 2px 12px rgba(0,0,0,0.06)}
    h1{font-size:24px;color:#1A1A2E;margin-bottom:20px}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#F9FAFB}
    thead th{padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;border-bottom:2px solid #E5E7EB}
    tbody tr{border-bottom:1px solid #E5E7EB}
    tbody tr:hover{background:#F9FAFB}
    tbody td{padding:12px 16px;font-size:14px}
    .badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .badge.actif{background:#E8F5E9;color:#1A6B3C}
    .badge.inactif{background:#F3F4F6;color:#9E9E9E}
    .empty{text-align:center;padding:40px;color:#9CA3AF;font-style:italic}
  </style>
</head>
<body>
  <div class="container">
    <a href="/dashboard/structure" class="back-link">← Retour</a>
    <div class="card">
      <h1>Personnel de la structure (${personnel?.length || 0})</h1>
      ${personnel && personnel.length > 0
        ? `<table>
          <thead>
            <tr>
              <th>Nom complet</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Date création</th>
            </tr>
          </thead>
          <tbody>
            ${personnel.map((p: any) => `
              <tr>
                <td>${p.prenom} ${p.nom}</td>
                <td>${p.role.replace(/_/g, ' ')}</td>
                <td><span class="badge ${p.est_actif ? 'actif' : 'inactif'}">${p.est_actif ? 'Actif' : 'Inactif'}</span></td>
                <td>${new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
        : '<div class="empty">Aucun personnel enregistré</div>'
      }
    </div>
  </div>
</body>
</html>`)
})

// ── État des lits ──────────────────────────────────────────────
structureRoutes.get('/lits', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: lits } = await supabase
    .from('struct_lits')
    .select(`
      id, numero_lit, type_lit, statut,
      struct_services (nom)
    `)
    .eq('structure_id', profil.structure_id)
    .order('numero_lit', { ascending: true })

  const stats = {
    disponible: lits?.filter((l: any) => l.statut === 'disponible').length || 0,
    occupe: lits?.filter((l: any) => l.statut === 'occupe').length || 0,
    maintenance: lits?.filter((l: any) => l.statut === 'maintenance').length || 0,
    total: lits?.length || 0
  }

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>État des lits — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;padding:20px}
    .container{max-width:1100px;margin:0 auto}
    .back-link{display:inline-flex;align-items:center;gap:6px;color:#1565C0;text-decoration:none;font-size:14px;margin-bottom:16px;font-weight:600}
    .card{background:white;border-radius:16px;padding:28px 32px;box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-bottom:20px}
    h1{font-size:24px;color:#1A1A2E;margin-bottom:20px}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:28px}
    .stat-card{background:#F9FAFB;border-radius:12px;padding:20px;text-align:center;border-top:4px solid}
    .stat-card.disponible{border-top-color:#1A6B3C}
    .stat-card.occupe{border-top-color:#B71C1C}
    .stat-card.maintenance{border-top-color:#F9A825}
    .stat-val{font-size:32px;font-weight:700;margin-bottom:4px}
    .stat-label{font-size:13px;color:#6B7280}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#F9FAFB}
    thead th{padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;border-bottom:2px solid #E5E7EB}
    tbody tr{border-bottom:1px solid #E5E7EB}
    tbody tr:hover{background:#F9FAFB}
    tbody td{padding:12px 16px;font-size:14px}
    .badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .badge.disponible{background:#E8F5E9;color:#1A6B3C}
    .badge.occupe{background:#FFF5F5;color:#B71C1C}
    .badge.maintenance{background:#FFF8E1;color:#E65100}
    .empty{text-align:center;padding:40px;color:#9CA3AF;font-style:italic}
  </style>
</head>
<body>
  <div class="container">
    <a href="/dashboard/structure" class="back-link">← Retour</a>
    
    <div class="stats">
      <div class="stat-card disponible">
        <div class="stat-val" style="color:#1A6B3C">${stats.disponible}</div>
        <div class="stat-label">Lits disponibles</div>
      </div>
      <div class="stat-card occupe">
        <div class="stat-val" style="color:#B71C1C">${stats.occupe}</div>
        <div class="stat-label">Lits occupés</div>
      </div>
      <div class="stat-card maintenance">
        <div class="stat-val" style="color:#F9A825">${stats.maintenance}</div>
        <div class="stat-label">En maintenance</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:#1565C0">${stats.total}</div>
        <div class="stat-label">Total lits</div>
      </div>
    </div>

    <div class="card">
      <h1>Liste des lits</h1>
      ${lits && lits.length > 0
        ? `<table>
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Service</th>
              <th>Type</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${lits.map((l: any) => `
              <tr>
                <td><strong>${l.numero_lit}</strong></td>
                <td>${l.struct_services?.nom || 'N/A'}</td>
                <td>${l.type_lit || 'standard'}</td>
                <td><span class="badge ${l.statut}">${l.statut}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
        : '<div class="empty">Aucun lit enregistré</div>'
      }
    </div>
  </div>
</body>
</html>`)
})

// ── Services de la structure ───────────────────────────────────
structureRoutes.get('/services', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: services } = await supabase
    .from('struct_services')
    .select('id, nom, type, est_actif')
    .eq('structure_id', profil.structure_id)
    .order('nom', { ascending: true })

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Services — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;padding:20px}
    .container{max-width:900px;margin:0 auto}
    .back-link{display:inline-flex;align-items:center;gap:6px;color:#1565C0;text-decoration:none;font-size:14px;margin-bottom:16px;font-weight:600}
    .card{background:white;border-radius:16px;padding:28px 32px;box-shadow:0 2px 12px rgba(0,0,0,0.06)}
    h1{font-size:24px;color:#1A1A2E;margin-bottom:20px}
    .service-item{background:#F9FAFB;border-left:4px solid #1565C0;padding:16px;border-radius:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center}
    .service-nom{font-size:15px;font-weight:600;color:#1A1A2E}
    .service-type{font-size:12px;color:#6B7280;margin-top:2px}
    .badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .badge.actif{background:#E8F5E9;color:#1A6B3C}
    .badge.inactif{background:#F3F4F6;color:#9E9E9E}
    .empty{text-align:center;padding:40px;color:#9CA3AF;font-style:italic}
  </style>
</head>
<body>
  <div class="container">
    <a href="/dashboard/structure" class="back-link">← Retour</a>
    <div class="card">
      <h1>Services de la structure (${services?.length || 0})</h1>
      ${services && services.length > 0
        ? services.map((s: any) => `
          <div class="service-item">
            <div>
              <div class="service-nom">${s.nom}</div>
              <div class="service-type">${s.type || 'général'}</div>
            </div>
            <span class="badge ${s.est_actif ? 'actif' : 'inactif'}">${s.est_actif ? 'Actif' : 'Inactif'}</span>
          </div>
        `).join('')
        : '<div class="empty">Aucun service enregistré</div>'
      }
    </div>
  </div>
</body>
</html>`)
})

// ── Statistiques structure ─────────────────────────────────────
structureRoutes.get('/stats', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const today = new Date().toISOString().split('T')[0]

  const [consultations, ordonnances, factures] = await Promise.all([
    supabase.from('medical_consultations').select('id', { count: 'exact', head: true })
      .eq('structure_id', profil.structure_id)
      .gte('created_at', today + 'T00:00:00'),
    supabase.from('medical_ordonnances').select('id', { count: 'exact', head: true })
      .eq('structure_id', profil.structure_id)
      .gte('created_at', today + 'T00:00:00'),
    supabase.from('finance_factures').select('id', { count: 'exact', head: true })
      .eq('structure_id', profil.structure_id)
      .gte('created_at', today + 'T00:00:00'),
  ])

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Statistiques — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;padding:20px}
    .container{max-width:1100px;margin:0 auto}
    .back-link{display:inline-flex;align-items:center;gap:6px;color:#1565C0;text-decoration:none;font-size:14px;margin-bottom:16px;font-weight:600}
    .card{background:white;border-radius:16px;padding:28px 32px;box-shadow:0 2px 12px rgba(0,0,0,0.06)}
    h1{font-size:24px;color:#1A1A2E;margin-bottom:20px}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}
    .stat-card{background:#F9FAFB;border-radius:12px;padding:24px;text-align:center;border-top:4px solid #1565C0}
    .stat-icon{font-size:32px;margin-bottom:10px}
    .stat-val{font-size:36px;font-weight:700;color:#1565C0;margin-bottom:4px}
    .stat-label{font-size:13px;color:#6B7280}
  </style>
</head>
<body>
  <div class="container">
    <a href="/dashboard/structure" class="back-link">← Retour</a>
    <div class="card">
      <h1>Statistiques du jour</h1>
      <div class="stats">
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-val">${consultations.count || 0}</div>
          <div class="stat-label">Consultations</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💊</div>
          <div class="stat-val">${ordonnances.count || 0}</div>
          <div class="stat-label">Ordonnances</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-val">${factures.count || 0}</div>
          <div class="stat-label">Factures</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`)
})
