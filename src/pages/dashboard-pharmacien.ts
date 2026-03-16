import { AuthProfile } from '../lib/supabase'
import { formatDate, formatFCFA } from '../utils/format'

import { AuthProfile } from '../lib/supabase'
import { formatDate, formatFCFA } from '../utils/format'

// ═══════════════════════════════════════════════════════════
// DASHBOARD PHARMACIEN
// ═══════════════════════════════════════════════════════════

interface PharmacienData {
  ordonnances: Array<{
    id: string
    numero_ordonnance: string
    patient: { nom: string; prenom: string }
    medecin: { nom: string; prenom: string }
    statut: string
    created_at: string
  }>
  stats: {
    ordonnancesJour: number
    enAttente: number
    delivrees: number
    stockAlertes: number
  }
}

export function dashboardPharmacienPage(profil: AuthProfile, data: PharmacienData): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Pharmacie</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fraunces:wght@300;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --violet:       #5c35a8;
      --violet-clair: #f0ebff;
      --violet-glow:  rgba(92,53,168,0.12);
      --vert:         #1A6B3C;
      --vert-clair:   #e8f5ee;
      --texte:        #0f1923;
      --texte-soft:   #5a6a78;
      --bg:           #f5f3fb;
      --blanc:        #ffffff;
      --bordure:      #e4dff5;
      --shadow-sm:    0 1px 4px rgba(0,0,0,0.06);
      --shadow-md:    0 4px 20px rgba(0,0,0,0.08);
      --radius:       16px;
      --radius-sm:    10px;
    }
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Plus Jakarta Sans',sans-serif; background:var(--bg); min-height:100vh; color:var(--texte); }
    .layout { display:flex; min-height:100vh; }

    .sidebar { width:250px; background:var(--violet); position:fixed; top:0; left:0; height:100vh; z-index:200; display:flex; flex-direction:column; transition:transform 0.3s; }
    .sidebar-brand { padding:24px 20px 18px; border-bottom:1px solid rgba(255,255,255,0.1); }
    .brand-row { display:flex; align-items:center; gap:10px; }
    .brand-icon { width:36px; height:36px; background:rgba(255,255,255,0.2); border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:17px; }
    .brand-name { font-family:'Fraunces',serif; font-size:18px; color:white; }
    .brand-sub { font-size:10px; color:rgba(255,255,255,0.4); letter-spacing:1.2px; text-transform:uppercase; margin-top:4px; padding-left:46px; }
    .sidebar-nav { flex:1; padding:12px 10px; overflow-y:auto; }
    .nav-label { font-size:10px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:rgba(255,255,255,0.3); padding:10px 10px 5px; }
    .nav-item { display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:var(--radius-sm); text-decoration:none; color:rgba(255,255,255,0.65); font-size:13.5px; font-weight:500; margin-bottom:2px; transition:all 0.2s; }
    .nav-item:hover { background:rgba(255,255,255,0.1); color:white; }
    .nav-item.active { background:rgba(255,255,255,0.18); color:white; font-weight:600; }
    .nav-icon { font-size:15px; width:18px; text-align:center; }
    .sidebar-footer { padding:14px 10px; border-top:1px solid rgba(255,255,255,0.1); }
    .user-card { display:flex; align-items:center; gap:10px; padding:10px; border-radius:var(--radius-sm); background:rgba(255,255,255,0.08); }
    .user-avatar { width:34px; height:34px; background:rgba(255,255,255,0.2); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:white; flex-shrink:0; }
    .user-info { flex:1; min-width:0; }
    .user-name { font-size:12.5px; font-weight:600; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .user-role { font-size:10.5px; color:rgba(255,255,255,0.4); }
    .logout-btn { width:26px; height:26px; background:rgba(255,255,255,0.08); border:none; border-radius:6px; color:rgba(255,255,255,0.5); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; text-decoration:none; transition:all 0.2s; flex-shrink:0; }
    .logout-btn:hover { background:rgba(255,80,80,0.2); color:#ff8080; }

    .main { margin-left:250px; flex:1; display:flex; flex-direction:column; }
    .topbar { height:62px; background:var(--blanc); border-bottom:1px solid var(--bordure); display:flex; align-items:center; justify-content:space-between; padding:0 28px; position:sticky; top:0; z-index:100; }
    .topbar-title { font-family:'Fraunces',serif; font-size:19px; font-weight:600; }
    .topbar-sub { font-size:12px; color:var(--texte-soft); margin-top:1px; }
    .datetime-pill { background:var(--violet-clair); padding:6px 14px; border-radius:20px; font-size:12.5px; font-weight:600; color:var(--violet); }
    .menu-toggle { display:none; background:none; border:none; font-size:20px; cursor:pointer; color:var(--texte); }
    .content { padding:28px; }

    .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:28px; }
    .stat-card { background:var(--blanc); border-radius:var(--radius); padding:20px; box-shadow:var(--shadow-sm); border:1px solid var(--bordure); position:relative; overflow:hidden; }
    .stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,var(--violet),#9c6fde); }
    .stat-icon { font-size:26px; margin-bottom:10px; }
    .stat-val { font-family:'Fraunces',serif; font-size:36px; font-weight:600; color:var(--texte); line-height:1; margin-bottom:4px; }
    .stat-lbl { font-size:12px; color:var(--texte-soft); font-weight:500; }

    .actions-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
    .action-card { background:var(--blanc); border-radius:var(--radius); padding:18px; text-align:center; text-decoration:none; color:var(--texte); border:1px solid var(--bordure); transition:all 0.2s; box-shadow:var(--shadow-sm); }
    .action-card:hover { border-color:var(--violet); box-shadow:0 0 0 3px var(--violet-glow), var(--shadow-md); transform:translateY(-2px); }
    .action-icon { font-size:28px; margin-bottom:8px; }
    .action-label { font-size:13px; font-weight:600; }

    .table-wrap { background:var(--blanc); border-radius:var(--radius); border:1px solid var(--bordure); overflow:hidden; box-shadow:var(--shadow-sm); }
    .table-head { padding:16px 20px; border-bottom:1px solid var(--bordure); display:flex; justify-content:space-between; align-items:center; }
    .table-head h3 { font-family:'Fraunces',serif; font-size:16px; font-weight:600; }
    table { width:100%; border-collapse:collapse; }
    thead tr { background:#faf8ff; }
    th { padding:11px 16px; text-align:left; font-size:11px; font-weight:700; color:var(--texte-soft); text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid var(--bordure); }
    td { padding:14px 16px; font-size:13.5px; border-bottom:1px solid #f8f5ff; }
    tr:hover td { background:#fdfcff; }
    tr:last-child td { border-bottom:none; }
    .badge { padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600; }
    .badge-active { background:#dbeafe; color:#1e40af; }
    .badge-delivree { background:var(--vert-clair); color:var(--vert); }
    .badge-expiree { background:#fce8e8; color:#b71c1c; }
    .btn-sm { background:var(--violet); color:white; padding:6px 14px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:600; }
    .empty { padding:32px; text-align:center; color:var(--texte-soft); font-style:italic; }

    .overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:150; }
    .overlay.open { display:block; }
    @media (max-width:1100px) { .stats-grid,.actions-grid { grid-template-columns:repeat(2,1fr); } }
    @media (max-width:768px) { .sidebar { transform:translateX(-100%); } .sidebar.open { transform:translateX(0); } .main { margin-left:0; } .menu-toggle { display:flex; } .content { padding:16px; } }
  </style>
</head>
<body>
<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-brand">
      <div class="brand-row"><div class="brand-icon">💊</div><div class="brand-name">SantéBF</div></div>
      <div class="brand-sub">Pharmacie</div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-label">Principal</div>
      <a href="/dashboard/pharmacien" class="nav-item active"><span class="nav-icon">⊞</span> Tableau de bord</a>
      <div class="nav-label">Ordonnances</div>
      <a href="/pharmacien/delivrance" class="nav-item"><span class="nav-icon">💊</span> Délivrer</a>
      <a href="/pharmacien/historique" class="nav-item"><span class="nav-icon">📜</span> Historique</a>
      <div class="nav-label">Stock</div>
      <a href="/pharmacien/stock" class="nav-item"><span class="nav-icon">📦</span> Gérer stock</a>
      <a href="/pharmacien/alertes" class="nav-item"><span class="nav-icon">⚠️</span> Alertes</a>
    </nav>
    <div class="sidebar-footer">
      <div class="user-card">
        <div class="user-avatar">${profil.prenom.charAt(0)}${profil.nom.charAt(0)}</div>
        <div class="user-info"><div class="user-name">${profil.prenom} ${profil.nom}</div><div class="user-role">Pharmacien(ne)</div></div>
        <a href="/auth/logout" class="logout-btn" title="Déconnexion">⏻</a>
      </div>
    </div>
  </aside>
  <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
  <div class="main">
    <header class="topbar">
      <div style="display:flex;align-items:center;gap:14px;">
        <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
        <div><div class="topbar-title">Bonjour, ${profil.prenom} 👋</div><div class="topbar-sub">Espace pharmacie</div></div>
      </div>
      <div class="datetime-pill">🕐 ${heure} — ${date}</div>
    </header>
    <div class="content">
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-val">${data.stats.ordonnancesJour}</div><div class="stat-lbl">Ordonnances aujourd'hui</div></div>
        <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-val">${data.stats.enAttente}</div><div class="stat-lbl">En attente</div></div>
        <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-val">${data.stats.delivrees}</div><div class="stat-lbl">Délivrées</div></div>
        <div class="stat-card"><div class="stat-icon">⚠️</div><div class="stat-val">${data.stats.stockAlertes}</div><div class="stat-lbl">Alertes stock</div></div>
      </div>
      <div class="actions-grid">
        <a href="/pharmacien/delivrance" class="action-card"><div class="action-icon">💊</div><div class="action-label">Délivrer</div></a>
        <a href="/pharmacien/stock" class="action-card"><div class="action-icon">📦</div><div class="action-label">Stock</div></a>
        <a href="/pharmacien/recherche" class="action-card"><div class="action-icon">🔍</div><div class="action-label">Rechercher</div></a>
        <a href="/pharmacien/historique" class="action-card"><div class="action-icon">📜</div><div class="action-label">Historique</div></a>
      </div>
      <div class="table-wrap">
        <div class="table-head"><h3>💊 Ordonnances actives</h3></div>
        ${data.ordonnances.length === 0 ? '<div class="empty">Aucune ordonnance active</div>' : `
        <table>
          <thead><tr><th>N° Ordonnance</th><th>Patient</th><th>Médecin</th><th>Date</th><th>Statut</th><th>Action</th></tr></thead>
          <tbody>
            ${data.ordonnances.map((o: any) => `
              <tr>
                <td><strong style="color:var(--violet)">${o.numero_ordonnance}</strong></td>
                <td>${o.patient?.nom || ''} ${o.patient?.prenom || ''}</td>
                <td>Dr. ${o.medecin?.nom || ''}</td>
                <td>${new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
                <td><span class="badge ${o.statut === 'active' ? 'badge-active' : o.statut === 'delivree' ? 'badge-delivree' : 'badge-expiree'}">${o.statut}</span></td>
                <td><a href="/pharmacien/ordonnance/${o.id}" class="btn-sm">Délivrer</a></td>
              </tr>`).join('')}
          </tbody>
        </table>`}
      </div>
    </div>
  </div>
</div>
<script>
  function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('open'); }
  function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('open'); }
</script>
</body>
</html>`
}

