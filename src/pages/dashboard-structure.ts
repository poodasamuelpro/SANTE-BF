import { AuthProfile } from '../lib/supabase'
import { formatDate } from '../utils/format'

// ═══════════════════════════════════════════════════════════
// DASHBOARD STRUCTURE 
// ═══════════════════════════════════════════════════════════

interface StructureData {
  structure: { nom: string; type: string; niveau: number }
  stats: { personnel: number; patientsJour: number; litsOccupes: number; litsTotal: number; consultationsJour: number }
}

export function dashboardStructurePage(profil: AuthProfile, data: StructureData): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })
  const taux = data.stats.litsTotal > 0 ? Math.round((data.stats.litsOccupes / data.stats.litsTotal) * 100) : 0

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Administration Structure</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fraunces:wght@300;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --or:          #C9A84C;
      --or-fonce:    #a07a28;
      --or-clair:    #fdf6e3;
      --or-glow:     rgba(201,168,76,0.15);
      --vert:        #1A6B3C;
      --vert-clair:  #e8f5ee;
      --rouge:       #C62828;
      --texte:       #0f1923;
      --texte-soft:  #5a6a78;
      --bg:          #fdf9ee;
      --blanc:       #ffffff;
      --bordure:     #ede8d5;
      --shadow-sm:   0 1px 4px rgba(0,0,0,0.06);
      --shadow-md:   0 4px 20px rgba(0,0,0,0.08);
      --radius:      16px;
      --radius-sm:   10px;
    }
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Plus Jakarta Sans',sans-serif; background:var(--bg); min-height:100vh; color:var(--texte); }
    .layout { display:flex; min-height:100vh; }

    .sidebar { width:250px; background:#1a1400; position:fixed; top:0; left:0; height:100vh; z-index:200; display:flex; flex-direction:column; transition:transform 0.3s; }
    .sidebar-brand { padding:24px 20px 18px; border-bottom:1px solid rgba(255,255,255,0.08); }
    .brand-row { display:flex; align-items:center; gap:10px; }
    .brand-icon { width:36px; height:36px; background:var(--or); border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:17px; }
    .brand-name { font-family:'Fraunces',serif; font-size:18px; color:white; }
    .brand-sub { font-size:10px; color:rgba(255,255,255,0.35); letter-spacing:1.2px; text-transform:uppercase; margin-top:4px; padding-left:46px; }
    .sidebar-nav { flex:1; padding:12px 10px; overflow-y:auto; }
    .nav-label { font-size:10px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:rgba(255,255,255,0.25); padding:10px 10px 5px; }
    .nav-item { display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:var(--radius-sm); text-decoration:none; color:rgba(255,255,255,0.6); font-size:13.5px; font-weight:500; margin-bottom:2px; transition:all 0.2s; }
    .nav-item:hover { background:rgba(255,255,255,0.08); color:white; }
    .nav-item.active { background:var(--or); color:#1a1400; font-weight:600; }
    .nav-icon { font-size:15px; width:18px; text-align:center; }
    .sidebar-footer { padding:14px 10px; border-top:1px solid rgba(255,255,255,0.08); }
    .user-card { display:flex; align-items:center; gap:10px; padding:10px; border-radius:var(--radius-sm); background:rgba(255,255,255,0.06); }
    .user-avatar { width:34px; height:34px; background:var(--or); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#1a1400; flex-shrink:0; }
    .user-info { flex:1; min-width:0; }
    .user-name { font-size:12.5px; font-weight:600; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .user-role { font-size:10.5px; color:rgba(255,255,255,0.35); }
    .logout-btn { width:26px; height:26px; background:rgba(255,255,255,0.06); border:none; border-radius:6px; color:rgba(255,255,255,0.4); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; text-decoration:none; transition:all 0.2s; flex-shrink:0; }
    .logout-btn:hover { background:rgba(255,80,80,0.2); color:#ff8080; }

    .main { margin-left:250px; flex:1; display:flex; flex-direction:column; }
    .topbar { height:62px; background:var(--blanc); border-bottom:1px solid var(--bordure); display:flex; align-items:center; justify-content:space-between; padding:0 28px; position:sticky; top:0; z-index:100; }
    .topbar-title { font-family:'Fraunces',serif; font-size:19px; font-weight:600; }
    .topbar-sub { font-size:12px; color:var(--texte-soft); margin-top:1px; }
    .datetime-pill { background:var(--or-clair); padding:6px 14px; border-radius:20px; font-size:12.5px; font-weight:600; color:var(--or-fonce); }
    .menu-toggle { display:none; background:none; border:none; font-size:20px; cursor:pointer; color:var(--texte); }
    .content { padding:28px; }

    /* STRUCTURE BANNER */
    .structure-banner {
      background: linear-gradient(135deg, #1a1400, #3a2a00);
      border-radius: var(--radius);
      padding: 24px 28px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .structure-name { font-family:'Fraunces',serif; font-size:24px; color:white; font-weight:600; margin-bottom:4px; }
    .structure-meta { font-size:13px; color:rgba(255,255,255,0.6); }
    .structure-badge { background:var(--or); color:#1a1400; padding:8px 18px; border-radius:20px; font-size:12px; font-weight:700; white-space:nowrap; }

    .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
    .stat-card { background:var(--blanc); border-radius:var(--radius); padding:20px; box-shadow:var(--shadow-sm); border:1px solid var(--bordure); position:relative; overflow:hidden; }
    .stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--or); }
    .stat-icon { font-size:26px; margin-bottom:10px; }
    .stat-val { font-family:'Fraunces',serif; font-size:36px; font-weight:600; color:var(--texte); line-height:1; margin-bottom:4px; }
    .stat-lbl { font-size:12px; color:var(--texte-soft); font-weight:500; }

    /* PROGRESS */
    .progress-wrap { margin-top:8px; }
    .progress-bar { background:#ede8d5; border-radius:10px; height:8px; overflow:hidden; }
    .progress-fill { height:100%; border-radius:10px; background:var(--vert); transition:width 0.3s; }
    .progress-fill.warn { background:var(--or); }
    .progress-fill.danger { background:var(--rouge); }
    .progress-label { font-size:11px; color:var(--texte-soft); margin-top:4px; }

    .actions-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
    .action-card { background:var(--blanc); border-radius:var(--radius); padding:20px; text-decoration:none; color:var(--texte); border:1px solid var(--bordure); display:flex; align-items:center; gap:14px; transition:all 0.2s; box-shadow:var(--shadow-sm); }
    .action-card:hover { border-color:var(--or); box-shadow:0 0 0 3px var(--or-glow), var(--shadow-md); transform:translateY(-1px); }
    .action-icon-wrap { width:44px; height:44px; background:var(--or-clair); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
    .action-label { font-size:13px; font-weight:600; }

    .overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:150; }
    .overlay.open { display:block; }
    @media (max-width:1100px) { .stats-grid { grid-template-columns:repeat(2,1fr); } .actions-grid { grid-template-columns:repeat(2,1fr); } }
    @media (max-width:768px) { .sidebar { transform:translateX(-100%); } .sidebar.open { transform:translateX(0); } .main { margin-left:0; } .menu-toggle { display:flex; } .content { padding:16px; } .structure-banner { flex-direction:column; align-items:flex-start; } }
  </style>
</head>
<body>
<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-brand">
      <div class="brand-row"><div class="brand-icon">🏥</div><div class="brand-name">SantéBF</div></div>
      <div class="brand-sub">Administration</div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-label">Principal</div>
      <a href="/dashboard/structure" class="nav-item active"><span class="nav-icon">⊞</span> Tableau de bord</a>
      <div class="nav-label">Gestion</div>
      <a href="/dashboard/structure/personnel" class="nav-item"><span class="nav-icon">👥</span> Personnel</a>
      <a href="/dashboard/structure/services" class="nav-item"><span class="nav-icon">🏥</span> Services</a>
      <a href="/dashboard/structure/lits" class="nav-item"><span class="nav-icon">🛏️</span> Lits</a>
      <div class="nav-label">Rapports</div>
      <a href="/dashboard/structure/statistiques" class="nav-item"><span class="nav-icon">📊</span> Statistiques</a>
      <a href="/dashboard/structure/facturation" class="nav-item"><span class="nav-icon">💰</span> Facturation</a>
      <div class="nav-label">Système</div>
      <a href="/dashboard/structure/parametres" class="nav-item"><span class="nav-icon">⚙️</span> Paramètres</a>
    </nav>
    <div class="sidebar-footer">
      <div class="user-card">
        <div class="user-avatar">${profil.prenom.charAt(0)}${profil.nom.charAt(0)}</div>
        <div class="user-info"><div class="user-name">${profil.prenom} ${profil.nom}</div><div class="user-role">Admin structure</div></div>
        <a href="/auth/logout" class="logout-btn" title="Déconnexion">⏻</a>
      </div>
    </div>
  </aside>
  <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
  <div class="main">
    <header class="topbar">
      <div style="display:flex;align-items:center;gap:14px;">
        <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
        <div><div class="topbar-title">Bonjour, ${profil.prenom} 👋</div><div class="topbar-sub">${data.structure.nom}</div></div>
      </div>
      <div class="datetime-pill">🕐 ${heure} — ${date}</div>
    </header>
    <div class="content">
      <div class="structure-banner">
        <div>
          <div class="structure-name">${data.structure.nom}</div>
          <div class="structure-meta">${data.structure.type} — Niveau ${data.structure.niveau}</div>
        </div>
        <div class="structure-badge">Structure active ✓</div>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-val">${data.stats.personnel}</div><div class="stat-lbl">Agents de santé</div></div>
        <div class="stat-card"><div class="stat-icon">🩺</div><div class="stat-val">${data.stats.patientsJour}</div><div class="stat-lbl">Patients aujourd'hui</div></div>
        <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-val">${data.stats.consultationsJour}</div><div class="stat-lbl">Consultations</div></div>
        <div class="stat-card">
          <div class="stat-icon">🛏️</div>
          <div class="stat-val">${data.stats.litsOccupes}<span style="font-size:20px;color:var(--texte-soft)">/${data.stats.litsTotal}</span></div>
          <div class="stat-lbl">Lits occupés</div>
          <div class="progress-wrap">
            <div class="progress-bar"><div class="progress-fill ${taux >= 90 ? 'danger' : taux >= 75 ? 'warn' : ''}" style="width:${taux}%"></div></div>
            <div class="progress-label">Taux d'occupation : ${taux}%</div>
          </div>
        </div>
      </div>
      <div class="actions-grid">
        <a href="/dashboard/structure/personnel" class="action-card"><div class="action-icon-wrap">👥</div><div class="action-label">Gérer le personnel</div></a>
        <a href="/dashboard/structure/services" class="action-card"><div class="action-icon-wrap">🏥</div><div class="action-label">Services</div></a>
        <a href="/dashboard/structure/lits" class="action-card"><div class="action-icon-wrap">🛏️</div><div class="action-label">Gestion des lits</div></a>
        <a href="/dashboard/structure/statistiques" class="action-card"><div class="action-icon-wrap">📊</div><div class="action-label">Statistiques</div></a>
        <a href="/dashboard/structure/facturation" class="action-card"><div class="action-icon-wrap">💰</div><div class="action-label">Facturation</div></a>
        <a href="/dashboard/structure/parametres" class="action-card"><div class="action-icon-wrap">⚙️</div><div class="action-label">Paramètres</div></a>
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
