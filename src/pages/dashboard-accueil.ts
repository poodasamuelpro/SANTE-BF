// ═══════════════════════════════════════════════════════════
// DASHBOARD ACCUEIL
// ═══════════════════════════════════════════════════════════

export function dashboardAccueilPage(profil: any, rdvJour: any[]): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Accueil</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fraunces:wght@300;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bleu:        #1565C0;
      --bleu-mid:    #1976D2;
      --bleu-clair:  #e8f0fe;
      --bleu-glow:   rgba(21,101,192,0.12);
      --vert:        #1A6B3C;
      --vert-clair:  #e8f5ee;
      --texte:       #0f1923;
      --texte-soft:  #5a6a78;
      --bg:          #f0f4fb;
      --blanc:       #ffffff;
      --bordure:     #dce6f5;
      --shadow-sm:   0 1px 4px rgba(0,0,0,0.06);
      --shadow-md:   0 4px 20px rgba(0,0,0,0.08);
      --radius:      16px;
      --radius-sm:   10px;
    }
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Plus Jakarta Sans',sans-serif; background:var(--bg); min-height:100vh; color:var(--texte); }
    .layout { display:flex; min-height:100vh; }

    .sidebar { width:250px; background:var(--bleu); position:fixed; top:0; left:0; height:100vh; z-index:200; display:flex; flex-direction:column; transition:transform 0.3s; }
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
    .datetime-pill { background:var(--bleu-clair); padding:6px 14px; border-radius:20px; font-size:12.5px; font-weight:600; color:var(--bleu); }
    .menu-toggle { display:none; background:none; border:none; font-size:20px; cursor:pointer; color:var(--texte); }
    .content { padding:28px; }

    /* SEARCH */
    .search-wrap {
      background: var(--blanc);
      border-radius: var(--radius);
      padding: 20px;
      margin-bottom: 20px;
      border: 1px solid var(--bordure);
      box-shadow: var(--shadow-sm);
    }
    .search-label { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:var(--texte-soft); margin-bottom:10px; }
    .search-row { display:flex; gap:10px; }
    .search-input { flex:1; padding:12px 16px; border:1.5px solid var(--bordure); border-radius:var(--radius-sm); font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; outline:none; transition:border-color 0.2s; }
    .search-input:focus { border-color:var(--bleu); box-shadow:0 0 0 3px var(--bleu-glow); }
    .search-btn { background:var(--bleu); color:white; border:none; padding:12px 22px; border-radius:var(--radius-sm); font-size:14px; font-weight:600; cursor:pointer; white-space:nowrap; font-family:'Plus Jakarta Sans',sans-serif; }
    .search-btn:hover { background:var(--bleu-mid); }

    /* QUICK ACTIONS */
    .actions-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
    .action-card { background:var(--blanc); border-radius:var(--radius); padding:18px; text-align:center; text-decoration:none; color:var(--texte); border:1px solid var(--bordure); transition:all 0.2s; box-shadow:var(--shadow-sm); }
    .action-card:hover { border-color:var(--bleu); box-shadow:0 0 0 3px var(--bleu-glow), var(--shadow-md); transform:translateY(-2px); }
    .action-icon { font-size:28px; margin-bottom:8px; }
    .action-label { font-size:13px; font-weight:600; }

    /* RDV TABLE */
    .rdv-wrap { background:var(--blanc); border-radius:var(--radius); border:1px solid var(--bordure); overflow:hidden; box-shadow:var(--shadow-sm); }
    .rdv-head { padding:16px 20px; background:var(--bleu); display:flex; justify-content:space-between; align-items:center; }
    .rdv-head h3 { font-size:14px; font-weight:600; color:white; }
    .rdv-head a { font-size:12px; color:rgba(255,255,255,0.7); text-decoration:none; padding:4px 10px; border-radius:6px; background:rgba(255,255,255,0.12); }
    .rdv-head a:hover { background:rgba(255,255,255,0.2); color:white; }
    .rdv-item { padding:14px 20px; border-bottom:1px solid #eef2fd; display:flex; align-items:center; gap:14px; transition:background 0.15s; }
    .rdv-item:last-child { border-bottom:none; }
    .rdv-item:hover { background:#f7f9ff; }
    .rdv-heure { font-family:'Fraunces',serif; font-size:15px; font-weight:600; color:var(--bleu); min-width:46px; }
    .rdv-patient strong { display:block; font-size:13px; font-weight:600; }
    .rdv-patient span { font-size:11px; color:var(--texte-soft); }
    .rdv-medecin { margin-left:auto; font-size:12px; color:var(--texte-soft); text-align:right; }
    .badge { padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600; }
    .badge.planifie { background:var(--bleu-clair); color:var(--bleu); }
    .badge.confirme { background:var(--vert-clair); color:var(--vert); }
    .badge.passe { background:#f5f5f5; color:#9e9e9e; }
    .badge.absent { background:#fce8e8; color:#b71c1c; }
    .empty { padding:32px; text-align:center; color:var(--texte-soft); font-style:italic; }

    .overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:150; }
    .overlay.open { display:block; }
    @media (max-width:900px) { .actions-grid { grid-template-columns:repeat(2,1fr); } }
    @media (max-width:768px) { .sidebar { transform:translateX(-100%); } .sidebar.open { transform:translateX(0); } .main { margin-left:0; } .menu-toggle { display:flex; } .content { padding:16px; } .search-row { flex-direction:column; } }
  </style>
</head>
<body>
<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-brand">
      <div class="brand-row"><div class="brand-icon">🏥</div><div class="brand-name">SantéBF</div></div>
      <div class="brand-sub">Accueil</div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-label">Principal</div>
      <a href="/dashboard/accueil" class="nav-item active"><span class="nav-icon">⊞</span> Tableau de bord</a>
      <div class="nav-label">Patients</div>
      <a href="/accueil/nouveau-patient" class="nav-item"><span class="nav-icon">➕</span> Nouveau patient</a>
      <a href="/accueil/recherche" class="nav-item"><span class="nav-icon">🔍</span> Rechercher</a>
      <div class="nav-label">Agenda</div>
      <a href="/accueil/rdv" class="nav-item"><span class="nav-icon">📅</span> Rendez-vous</a>
      <a href="/accueil/rdv/nouveau" class="nav-item"><span class="nav-icon">📋</span> Prendre RDV</a>
    </nav>
    <div class="sidebar-footer">
      <div class="user-card">
        <div class="user-avatar">${profil.prenom.charAt(0)}${profil.nom.charAt(0)}</div>
        <div class="user-info"><div class="user-name">${profil.prenom} ${profil.nom}</div><div class="user-role">Agent d'accueil</div></div>
        <a href="/auth/logout" class="logout-btn" title="Déconnexion">⏻</a>
      </div>
    </div>
  </aside>
  <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
  <div class="main">
    <header class="topbar">
      <div style="display:flex;align-items:center;gap:14px;">
        <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
        <div><div class="topbar-title">Bonjour, ${profil.prenom} 👋</div><div class="topbar-sub">${rdvJour.length} rendez-vous planifiés aujourd'hui</div></div>
      </div>
      <div class="datetime-pill">🕐 ${heure} — ${date}</div>
    </header>
    <div class="content">
      <div class="search-wrap">
        <div class="search-label">🔍 Recherche rapide patient</div>
        <form action="/accueil/recherche" method="GET" class="search-row">
          <input class="search-input" type="text" name="q" placeholder="Nom, prénom ou numéro BF-XXXX-XXXXXX...">
          <button type="submit" class="search-btn">Rechercher</button>
        </form>
      </div>
      <div class="actions-grid">
        <a href="/accueil/nouveau-patient" class="action-card"><div class="action-icon">➕</div><div class="action-label">Nouveau patient</div></a>
        <a href="/accueil/recherche" class="action-card"><div class="action-icon">🔍</div><div class="action-label">Rechercher</div></a>
        <a href="/accueil/rdv" class="action-card"><div class="action-icon">📅</div><div class="action-label">Rendez-vous</div></a>
        <a href="/accueil/rdv/nouveau" class="action-card"><div class="action-icon">📋</div><div class="action-label">Prendre RDV</div></a>
      </div>
      <div class="rdv-wrap">
        <div class="rdv-head">
          <h3>📅 Rendez-vous d'aujourd'hui (${rdvJour.length})</h3>
          <a href="/accueil/rdv">Voir tout →</a>
        </div>
        ${rdvJour.length === 0
          ? '<div class="empty">Aucun rendez-vous planifié pour aujourd\'hui</div>'
          : rdvJour.map((r: any) => `
            <div class="rdv-item">
              <div class="rdv-heure">${new Date(r.date_heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
              <div class="rdv-patient">
                <strong>${r.patient_dossiers?.prenom || ''} ${r.patient_dossiers?.nom || ''}</strong>
                <span>${r.motif || 'Consultation'}</span>
              </div>
              <div class="rdv-medecin">Dr. ${r.auth_profiles?.prenom || ''} ${r.auth_profiles?.nom || ''}</div>
              <span class="badge ${r.statut}">${r.statut}</span>
            </div>`).join('')}
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

