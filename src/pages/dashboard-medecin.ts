export function dashboardMedecinPage(profil: any, data: {
  rdvJour: any[]
  consultations: any[]
}): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Espace Médical</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fraunces:ital,wght@0,300;0,600;1,300&display=swap" rel="stylesheet">
  <style>
    :root {
      --violet:       #4A148C;
      --violet-mid:   #6A1B9A;
      --violet-clair: #f3e8ff;
      --violet-glow:  rgba(74,20,140,0.12);
      --vert:         #1A6B3C;
      --texte:        #0f1923;
      --texte-soft:   #5a6a78;
      --bg:           #f6f4f9;
      --blanc:        #ffffff;
      --bordure:      #e5e0ee;
      --shadow-sm:    0 1px 4px rgba(0,0,0,0.06);
      --shadow-md:    0 4px 20px rgba(0,0,0,0.08);
      --radius:       16px;
      --radius-sm:    10px;
    }
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Plus Jakarta Sans',sans-serif; background:var(--bg); min-height:100vh; color:var(--texte); }

    .layout { display:flex; min-height:100vh; }

    /* SIDEBAR */
    .sidebar {
      width:250px; background:var(--violet); position:fixed;
      top:0; left:0; height:100vh; z-index:200;
      display:flex; flex-direction:column; transition:transform 0.3s;
    }
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

    /* MAIN */
    .main { margin-left:250px; flex:1; display:flex; flex-direction:column; }

    .topbar { height:62px; background:var(--blanc); border-bottom:1px solid var(--bordure); display:flex; align-items:center; justify-content:space-between; padding:0 28px; position:sticky; top:0; z-index:100; }
    .topbar-title { font-family:'Fraunces',serif; font-size:19px; font-weight:600; color:var(--texte); }
    .topbar-sub { font-size:12px; color:var(--texte-soft); margin-top:1px; }
    .datetime-pill { background:var(--violet-clair); padding:6px 14px; border-radius:20px; font-size:12.5px; font-weight:600; color:var(--violet); }
    .menu-toggle { display:none; background:none; border:none; font-size:20px; cursor:pointer; color:var(--texte); }

    .content { padding:28px; }

    /* QUICK ACTIONS */
    .quick-grid {
      display:grid;
      grid-template-columns:repeat(6,1fr);
      gap:12px;
      margin-bottom:28px;
    }
    .quick-card {
      background:var(--blanc);
      border-radius:var(--radius);
      padding:18px 12px;
      text-align:center;
      text-decoration:none;
      color:var(--texte);
      border:1px solid var(--bordure);
      transition:all 0.2s;
      box-shadow:var(--shadow-sm);
    }
    .quick-card:hover {
      border-color:var(--violet);
      box-shadow:0 0 0 3px var(--violet-glow), var(--shadow-md);
      transform:translateY(-2px);
    }
    .quick-icon { font-size:24px; margin-bottom:8px; }
    .quick-label { font-size:12px; font-weight:600; color:var(--texte); }

    /* GRID 2 COL */
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }

    .section-box { background:var(--blanc); border-radius:var(--radius); border:1px solid var(--bordure); overflow:hidden; box-shadow:var(--shadow-sm); }
    .section-head { padding:16px 20px; background:var(--violet); display:flex; justify-content:space-between; align-items:center; }
    .section-head h3 { font-size:14px; font-weight:600; color:white; }
    .section-head a { font-size:12px; color:rgba(255,255,255,0.7); text-decoration:none; padding:4px 10px; border-radius:6px; background:rgba(255,255,255,0.12); }
    .section-head a:hover { background:rgba(255,255,255,0.2); color:white; }

    /* RDV */
    .rdv-item { padding:14px 20px; border-bottom:1px solid #f5f0f9; display:flex; align-items:center; gap:14px; }
    .rdv-item:last-child { border-bottom:none; }
    .rdv-heure { font-size:14px; font-weight:700; color:var(--violet); min-width:44px; font-family:'Fraunces',serif; }
    .rdv-info strong { display:block; font-size:13px; font-weight:600; }
    .rdv-info span { font-size:11px; color:var(--texte-soft); }
    .rdv-badge { margin-left:auto; padding:3px 10px; border-radius:20px; font-size:10.5px; font-weight:600; white-space:nowrap; }
    .rdv-badge.planifie { background:#ede7f6; color:var(--violet); }
    .rdv-badge.confirme { background:#e8f5e9; color:var(--vert); }
    .rdv-badge.passe { background:#f5f5f5; color:#9e9e9e; }
    .rdv-badge.annule { background:#fce8e8; color:#b71c1c; }

    /* CONSULTATIONS */
    .consult-item { padding:14px 20px; border-bottom:1px solid #f5f0f9; }
    .consult-item:last-child { border-bottom:none; }
    .ci-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px; }
    .ci-patient { font-size:13px; font-weight:600; }
    .ci-date { font-size:11px; color:var(--texte-soft); }
    .ci-motif { font-size:12px; color:var(--texte-soft); }
    .ci-diag { font-size:12px; color:var(--violet); margin-top:3px; font-weight:500; }

    .empty { padding:24px; text-align:center; color:var(--texte-soft); font-size:13px; font-style:italic; }
    .voir-plus { display:block; text-align:center; padding:12px; font-size:12px; color:var(--violet); text-decoration:none; border-top:1px solid var(--bordure); font-weight:500; }
    .voir-plus:hover { background:var(--violet-clair); }

    .overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:150; }
    .overlay.open { display:block; }

    @media (max-width:1200px) { .quick-grid { grid-template-columns:repeat(3,1fr); } }
    @media (max-width:900px) { .grid2 { grid-template-columns:1fr; } }
    @media (max-width:768px) {
      .sidebar { transform:translateX(-100%); }
      .sidebar.open { transform:translateX(0); }
      .main { margin-left:0; }
      .menu-toggle { display:flex; }
      .content { padding:16px; }
      .quick-grid { grid-template-columns:repeat(3,1fr); }
    }
    @media (max-width:480px) { .quick-grid { grid-template-columns:repeat(2,1fr); } }
  </style>
</head>
<body>
<div class="layout">

  <aside class="sidebar" id="sidebar">
    <div class="sidebar-brand">
      <div class="brand-row">
        <div class="brand-icon">🏥</div>
        <div class="brand-name">SantéBF</div>
      </div>
      <div class="brand-sub">Espace médical</div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-label">Tableau de bord</div>
      <a href="/dashboard/medecin" class="nav-item active"><span class="nav-icon">⊞</span> Accueil</a>
      <div class="nav-label">Patients</div>
      <a href="/medecin/patients" class="nav-item"><span class="nav-icon">🔍</span> Mes patients</a>
      <a href="/medecin/consultations/nouvelle" class="nav-item"><span class="nav-icon">📋</span> Nouvelle consultation</a>
      <a href="/medecin/ordonnances/nouvelle" class="nav-item"><span class="nav-icon">💊</span> Ordonnance</a>
      <div class="nav-label">Agenda</div>
      <a href="/medecin/rdv" class="nav-item"><span class="nav-icon">📅</span> Planning RDV</a>
      <a href="/medecin/hospitalisations" class="nav-item"><span class="nav-icon">🛏️</span> Hospitalisés</a>
      <div class="nav-label">Examens</div>
      <a href="/medecin/examens" class="nav-item"><span class="nav-icon">🧪</span> Examens</a>
      <a href="/laboratoire" class="nav-item"><span class="nav-icon">🔬</span> Laboratoire</a>
    </nav>
    <div class="sidebar-footer">
      <div class="user-card">
        <div class="user-avatar">${profil.prenom.charAt(0)}${profil.nom.charAt(0)}</div>
        <div class="user-info">
          <div class="user-name">Dr. ${profil.prenom} ${profil.nom}</div>
          <div class="user-role">${profil.role.replace(/_/g,' ')}</div>
        </div>
        <a href="/auth/logout" class="logout-btn" title="Déconnexion">⏻</a>
      </div>
    </div>
  </aside>

  <div class="overlay" id="overlay" onclick="closeSidebar()"></div>

  <div class="main">
    <header class="topbar">
      <div style="display:flex;align-items:center;gap:14px;">
        <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
        <div>
          <div class="topbar-title">Bonjour, Dr. ${profil.prenom} 👋</div>
          <div class="topbar-sub">${data.rdvJour.length} rendez-vous aujourd'hui</div>
        </div>
      </div>
      <div class="datetime-pill">🕐 ${heure} — ${date}</div>
    </header>

    <div class="content">

      <!-- ACTIONS RAPIDES -->
      <div class="quick-grid">
        <a href="/medecin/patients" class="quick-card">
          <div class="quick-icon">🔍</div>
          <div class="quick-label">Mes patients</div>
        </a>
        <a href="/medecin/consultations/nouvelle" class="quick-card">
          <div class="quick-icon">📋</div>
          <div class="quick-label">Consultation</div>
        </a>
        <a href="/medecin/ordonnances/nouvelle" class="quick-card">
          <div class="quick-icon">💊</div>
          <div class="quick-label">Ordonnance</div>
        </a>
        <a href="/medecin/rdv" class="quick-card">
          <div class="quick-icon">📅</div>
          <div class="quick-label">Planning</div>
        </a>
        <a href="/medecin/examens" class="quick-card">
          <div class="quick-icon">🧪</div>
          <div class="quick-label">Examens</div>
        </a>
        <a href="/medecin/hospitalisations" class="quick-card">
          <div class="quick-icon">🛏️</div>
          <div class="quick-label">Hospitalisés</div>
        </a>
      </div>

      <!-- RDV + CONSULTATIONS -->
      <div class="grid2">
        <div class="section-box">
          <div class="section-head">
            <h3>📅 RDV aujourd'hui (${data.rdvJour.length})</h3>
            <a href="/medecin/rdv">Voir tout →</a>
          </div>
          ${data.rdvJour.length === 0
            ? '<div class="empty">Aucun rendez-vous aujourd\'hui</div>'
            : data.rdvJour.map((rdv: any) => `
              <div class="rdv-item">
                <div class="rdv-heure">${new Date(rdv.date_heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
                <div class="rdv-info">
                  <strong>${rdv.patient_dossiers?.prenom || ''} ${rdv.patient_dossiers?.nom || ''}</strong>
                  <span>${rdv.motif || 'Consultation'}</span>
                </div>
                <span class="rdv-badge ${rdv.statut}">${rdv.statut}</span>
              </div>`).join('')
          }
          <a href="/medecin/rdv" class="voir-plus">Gérer les rendez-vous →</a>
        </div>

        <div class="section-box">
          <div class="section-head">
            <h3>📋 Consultations récentes</h3>
            <a href="/medecin/consultations">Voir tout →</a>
          </div>
          ${data.consultations.length === 0
            ? '<div class="empty">Aucune consultation récente</div>'
            : data.consultations.map((c: any) => `
              <div class="consult-item">
                <div class="ci-top">
                  <span class="ci-patient">${c.patient_dossiers?.prenom || ''} ${c.patient_dossiers?.nom || ''}</span>
                  <span class="ci-date">${new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                <div class="ci-motif">${c.motif || ''}</div>
                ${c.diagnostic_principal ? `<div class="ci-diag">→ ${c.diagnostic_principal}</div>` : ''}
              </div>`).join('')
          }
          <a href="/medecin/consultations" class="voir-plus">Voir toutes les consultations →</a>
        </div>
      </div>

    </div>
  </div>
</div>

<script>
  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open')
    document.getElementById('overlay').classList.toggle('open')
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open')
    document.getElementById('overlay').classList.remove('open')
  }
</script>
</body>
</html>`
}
