export function dashboardAdminPage(profil: any, stats: {
  nbStructures: number
  nbComptes: number
  nbPatients: number
}): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Super Admin</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fraunces:ital,wght@0,300;0,600;1,300&display=swap" rel="stylesheet">
  <style>
    :root {
      --vert:        #1A6B3C;
      --vert-fonce:  #134d2c;
      --vert-clair:  #e8f5ee;
      --vert-glow:   rgba(26,107,60,0.15);
      --or:          #C9A84C;
      --or-clair:    #fdf6e3;
      --texte:       #0f1923;
      --texte-soft:  #5a6a78;
      --bg:          #f4f6f4;
      --blanc:       #ffffff;
      --bordure:     #e2e8e4;
      --shadow-sm:   0 1px 4px rgba(0,0,0,0.06);
      --shadow-md:   0 4px 20px rgba(0,0,0,0.08);
      --shadow-lg:   0 12px 40px rgba(0,0,0,0.12);
      --radius:      16px;
      --radius-sm:   10px;
    }

    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
      min-height: 100vh;
      color: var(--texte);
    }

    /* ── SIDEBAR ── */
    .layout { display: flex; min-height: 100vh; }

    .sidebar {
      width: 260px;
      background: var(--vert-fonce);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0; left: 0;
      height: 100vh;
      z-index: 200;
      transition: transform 0.3s;
    }

    .sidebar-brand {
      padding: 28px 24px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .brand-logo {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 4px;
    }
    .brand-icon {
      width: 38px; height: 38px;
      background: var(--or);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .brand-name {
      font-family: 'Fraunces', serif;
      font-size: 20px;
      font-weight: 600;
      color: white;
      letter-spacing: -0.3px;
    }
    .brand-sub {
      font-size: 10px;
      color: rgba(255,255,255,0.45);
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding-left: 50px;
    }

    .sidebar-nav {
      flex: 1;
      padding: 16px 12px;
      overflow-y: auto;
    }

    .nav-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.3);
      padding: 12px 12px 6px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-radius: var(--radius-sm);
      text-decoration: none;
      color: rgba(255,255,255,0.65);
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 2px;
      transition: all 0.2s;
    }
    .nav-item:hover {
      background: rgba(255,255,255,0.08);
      color: white;
    }
    .nav-item.active {
      background: var(--or);
      color: var(--texte);
      font-weight: 600;
    }
    .nav-icon { font-size: 16px; width: 20px; text-align: center; }

    .sidebar-footer {
      padding: 16px 12px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .user-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: var(--radius-sm);
      background: rgba(255,255,255,0.06);
    }
    .user-avatar {
      width: 36px; height: 36px;
      background: var(--or);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      font-weight: 700;
      color: var(--texte);
      flex-shrink: 0;
    }
    .user-info { flex: 1; min-width: 0; }
    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: white;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-role {
      font-size: 11px;
      color: rgba(255,255,255,0.45);
    }
    .logout-btn {
      width: 28px; height: 28px;
      background: rgba(255,255,255,0.08);
      border: none;
      border-radius: 6px;
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      text-decoration: none;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .logout-btn:hover { background: rgba(255,80,80,0.2); color: #ff8080; }

    /* ── MAIN CONTENT ── */
    .main {
      margin-left: 260px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* ── TOPBAR ── */
    .topbar {
      height: 64px;
      background: var(--blanc);
      border-bottom: 1px solid var(--bordure);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .topbar-left h1 {
      font-family: 'Fraunces', serif;
      font-size: 20px;
      font-weight: 600;
      color: var(--texte);
    }
    .topbar-left p {
      font-size: 12px;
      color: var(--texte-soft);
      margin-top: 1px;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .datetime-pill {
      background: var(--vert-clair);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      color: var(--vert);
    }

    /* ── PAGE CONTENT ── */
    .content { padding: 32px; }

    /* ── ALERTE ── */
    .alerte-box {
      background: linear-gradient(135deg, #fff8e6, #fff3d0);
      border: 1px solid #f0c040;
      border-left: 4px solid var(--or);
      border-radius: var(--radius-sm);
      padding: 16px 20px;
      margin-bottom: 28px;
      font-size: 14px;
      color: #7a5500;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* ── STATS GRID ── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: var(--blanc);
      border-radius: var(--radius);
      padding: 24px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--bordure);
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    .stat-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--vert), var(--or));
    }
    .stat-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .stat-icon-wrap {
      width: 48px; height: 48px;
      background: var(--vert-clair);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
    }
    .stat-trend {
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      background: var(--vert-clair);
      color: var(--vert);
    }
    .stat-value {
      font-family: 'Fraunces', serif;
      font-size: 42px;
      font-weight: 600;
      color: var(--texte);
      line-height: 1;
      margin-bottom: 6px;
    }
    .stat-label {
      font-size: 13px;
      color: var(--texte-soft);
      font-weight: 500;
    }

    /* ── SECTION TITLE ── */
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .section-title {
      font-family: 'Fraunces', serif;
      font-size: 18px;
      font-weight: 600;
      color: var(--texte);
    }
    .section-sub {
      font-size: 12px;
      color: var(--texte-soft);
      margin-top: 2px;
    }

    /* ── ACTIONS GRID ── */
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }

    .action-card {
      background: var(--blanc);
      border-radius: var(--radius);
      padding: 22px;
      text-decoration: none;
      color: var(--texte);
      border: 1px solid var(--bordure);
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all 0.2s;
      box-shadow: var(--shadow-sm);
    }
    .action-card:hover {
      border-color: var(--vert);
      box-shadow: 0 0 0 3px var(--vert-glow), var(--shadow-md);
      transform: translateY(-1px);
    }
    .action-icon-wrap {
      width: 46px; height: 46px;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    .ac-vert  { background: var(--vert-clair); }
    .ac-or    { background: var(--or-clair); }
    .ac-bleu  { background: #e8f0fe; }
    .ac-rouge { background: #fce8e8; }

    .action-text { flex: 1; }
    .action-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--texte);
      margin-bottom: 3px;
    }
    .action-desc {
      font-size: 12px;
      color: var(--texte-soft);
    }
    .action-arrow {
      font-size: 16px;
      color: var(--bordure);
      transition: color 0.2s;
    }
    .action-card:hover .action-arrow { color: var(--vert); }

    /* ── MOBILE TOGGLE ── */
    .menu-toggle {
      display: none;
      background: none;
      border: none;
      font-size: 22px;
      cursor: pointer;
      color: var(--texte);
    }

    /* ── RESPONSIVE ── */
    @media (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .actions-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
      }
      .sidebar.open {
        transform: translateX(0);
      }
      .main { margin-left: 0; }
      .menu-toggle { display: flex; }
      .content { padding: 20px 16px; }
      .topbar { padding: 0 16px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .actions-grid { grid-template-columns: 1fr; }
      .stat-value { font-size: 32px; }
    }

    @media (max-width: 480px) {
      .stats-grid { grid-template-columns: 1fr; }
    }

    /* ── OVERLAY ── */
    .overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 150;
    }
    .overlay.open { display: block; }
  </style>
</head>
<body>

<div class="layout">

  <!-- SIDEBAR -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-brand">
      <div class="brand-logo">
        <div class="brand-icon">🏥</div>
        <div class="brand-name">SantéBF</div>
      </div>
      <div class="brand-sub">Super Administration</div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-label">Principal</div>
      <a href="/dashboard/admin" class="nav-item active">
        <span class="nav-icon">⊞</span> Tableau de bord
      </a>

      <div class="nav-label">Gestion</div>
      <a href="/admin/structures" class="nav-item">
        <span class="nav-icon">🏥</span> Structures
      </a>
      <a href="/admin/comptes" class="nav-item">
        <span class="nav-icon">👥</span> Comptes utilisateurs
      </a>
      <a href="/admin/stats" class="nav-item">
        <span class="nav-icon">📊</span> Statistiques
      </a>
      <a href="/admin/geo" class="nav-item">
        <span class="nav-icon">🗺️</span> Géographie
      </a>

      <div class="nav-label">Système</div>
      <a href="/parametres" class="nav-item">
        <span class="nav-icon">⚙️</span> Paramètres
      </a>
    </nav>

    <div class="sidebar-footer">
      <div class="user-card">
        <div class="user-avatar">${profil.prenom.charAt(0)}${profil.nom.charAt(0)}</div>
        <div class="user-info">
          <div class="user-name">${profil.prenom} ${profil.nom}</div>
          <div class="user-role">Super Admin</div>
        </div>
        <a href="/auth/logout" class="logout-btn" title="Déconnexion">⏻</a>
      </div>
    </div>
  </aside>

  <div class="overlay" id="overlay" onclick="closeSidebar()"></div>

  <!-- MAIN -->
  <div class="main">

    <!-- TOPBAR -->
    <header class="topbar">
      <div style="display:flex;align-items:center;gap:16px;">
        <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
        <div class="topbar-left">
          <h1>Bonjour, ${profil.prenom} 👋</h1>
          <p>Vue d'ensemble du système national SantéBF</p>
        </div>
      </div>
      <div class="topbar-right">
        <div class="datetime-pill">🕐 ${heure} — ${date}</div>
      </div>
    </header>

    <!-- CONTENT -->
    <div class="content">

      ${stats.nbStructures === 0 ? `
      <div class="alerte-box">
        ⚠️ <strong>Démarrage :</strong> Aucune structure sanitaire enregistrée. Commencez par ajouter les structures puis les comptes.
      </div>` : ''}

      <!-- STATS -->
      <div class="section-header" style="margin-bottom:16px;">
        <div>
          <div class="section-title">Statistiques nationales</div>
          <div class="section-sub">Données en temps réel du système</div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card-top">
            <div class="stat-icon-wrap">🏥</div>
            <span class="stat-trend">Actif</span>
          </div>
          <div class="stat-value">${stats.nbStructures}</div>
          <div class="stat-label">Structures sanitaires</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top">
            <div class="stat-icon-wrap">👤</div>
            <span class="stat-trend">Actif</span>
          </div>
          <div class="stat-value">${stats.nbComptes}</div>
          <div class="stat-label">Comptes utilisateurs</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top">
            <div class="stat-icon-wrap">🗂️</div>
            <span class="stat-trend">Total</span>
          </div>
          <div class="stat-value">${stats.nbPatients}</div>
          <div class="stat-label">Dossiers patients</div>
        </div>
      </div>

      <!-- ACTIONS -->
      <div class="section-header">
        <div>
          <div class="section-title">Gestion du système</div>
          <div class="section-sub">Actions rapides d'administration</div>
        </div>
      </div>

      <div class="actions-grid">
        <a href="/admin/structures" class="action-card">
          <div class="action-icon-wrap ac-vert">🏥</div>
          <div class="action-text">
            <div class="action-label">Structures sanitaires</div>
            <div class="action-desc">Hôpitaux, cliniques, CSPS...</div>
          </div>
          <span class="action-arrow">→</span>
        </a>
        <a href="/admin/structures/nouvelle" class="action-card">
          <div class="action-icon-wrap ac-or">➕</div>
          <div class="action-text">
            <div class="action-label">Ajouter une structure</div>
            <div class="action-desc">Enregistrer une nouvelle structure</div>
          </div>
          <span class="action-arrow">→</span>
        </a>
        <a href="/admin/comptes" class="action-card">
          <div class="action-icon-wrap ac-bleu">👥</div>
          <div class="action-text">
            <div class="action-label">Comptes utilisateurs</div>
            <div class="action-desc">Médecins, infirmiers, admins...</div>
          </div>
          <span class="action-arrow">→</span>
        </a>
        <a href="/admin/comptes/nouveau" class="action-card">
          <div class="action-icon-wrap ac-vert">👤</div>
          <div class="action-text">
            <div class="action-label">Créer un compte</div>
            <div class="action-desc">Nouvel utilisateur SantéBF</div>
          </div>
          <span class="action-arrow">→</span>
        </a>
        <a href="/admin/stats" class="action-card">
          <div class="action-icon-wrap ac-or">📊</div>
          <div class="action-text">
            <div class="action-label">Statistiques</div>
            <div class="action-desc">Activité nationale par région</div>
          </div>
          <span class="action-arrow">→</span>
        </a>
        <a href="/admin/geo" class="action-card">
          <div class="action-icon-wrap ac-bleu">🗺️</div>
          <div class="action-text">
            <div class="action-label">Géographie</div>
            <div class="action-desc">Régions, provinces, villes</div>
          </div>
          <span class="action-arrow">→</span>
        </a>
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
