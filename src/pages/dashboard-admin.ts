export function dashboardAdminPage(profil: any, stats: {
  nbStructures: number
  nbComptes: number
  nbPatients: number
}): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })
  const avatar = profil.avatar_url
    ? `<img src="${profil.avatar_url}" alt="Photo" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`
    : `${profil.prenom.charAt(0)}${profil.nom.charAt(0)}`

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
      --radius:      16px;
      --radius-sm:   10px;
    }
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Plus Jakarta Sans',sans-serif; background:var(--bg); min-height:100vh; color:var(--texte); }
    .layout { display:flex; min-height:100vh; }

    /* ── SIDEBAR ── */
    .sidebar {
      width:260px; background:var(--vert-fonce);
      display:flex; flex-direction:column;
      position:fixed; top:0; left:0; height:100vh;
      z-index:200; transition:transform 0.3s;
    }
    .sidebar-brand { padding:24px 20px 18px; border-bottom:1px solid rgba(255,255,255,0.08); }
    .brand-logo { display:flex; align-items:center; gap:12px; margin-bottom:4px; }
    .brand-icon { width:38px; height:38px; background:var(--or); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; }
    .brand-name { font-family:'Fraunces',serif; font-size:20px; color:white; }
    .brand-sub { font-size:10px; color:rgba(255,255,255,0.4); letter-spacing:1.5px; text-transform:uppercase; padding-left:50px; }
    .sidebar-nav { flex:1; padding:14px 10px; overflow-y:auto; }
    .nav-label { font-size:10px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:rgba(255,255,255,0.3); padding:10px 12px 5px; }
    .nav-item { display:flex; align-items:center; gap:12px; padding:10px 13px; border-radius:var(--radius-sm); text-decoration:none; color:rgba(255,255,255,0.65); font-size:13.5px; font-weight:500; margin-bottom:2px; transition:all 0.2s; }
    .nav-item:hover { background:rgba(255,255,255,0.08); color:white; }
    .nav-item.active { background:var(--or); color:var(--texte); font-weight:600; }
    .nav-icon { font-size:15px; width:18px; text-align:center; }
    .sidebar-footer { padding:14px 10px; border-top:1px solid rgba(255,255,255,0.08); }
    .user-card { display:flex; align-items:center; gap:10px; padding:10px; border-radius:var(--radius-sm); background:rgba(255,255,255,0.06); cursor:pointer; transition:background 0.2s; }
    .user-card:hover { background:rgba(255,255,255,0.1); }
    .user-avatar {
      width:38px; height:38px; background:var(--or); border-radius:9px;
      display:flex; align-items:center; justify-content:center;
      font-size:13px; font-weight:700; color:var(--texte);
      flex-shrink:0; overflow:hidden; position:relative;
    }
    .user-avatar .edit-overlay {
      position:absolute; inset:0; background:rgba(0,0,0,0.5);
      display:none; align-items:center; justify-content:center;
      font-size:14px; border-radius:9px;
    }
    .user-card:hover .edit-overlay { display:flex; }
    .user-info { flex:1; min-width:0; }
    .user-name { font-size:12.5px; font-weight:600; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .user-role { font-size:10.5px; color:rgba(255,255,255,0.4); }
    .logout-btn { width:26px; height:26px; background:rgba(255,255,255,0.08); border:none; border-radius:6px; color:rgba(255,255,255,0.5); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; text-decoration:none; transition:all 0.2s; flex-shrink:0; }
    .logout-btn:hover { background:rgba(255,80,80,0.2); color:#ff8080; }

    /* ── MAIN ── */
    .main { margin-left:260px; flex:1; display:flex; flex-direction:column; }
    .topbar { height:62px; background:var(--blanc); border-bottom:1px solid var(--bordure); display:flex; align-items:center; justify-content:space-between; padding:0 24px; position:sticky; top:0; z-index:100; }
    .topbar-left h1 { font-family:'Fraunces',serif; font-size:19px; color:var(--texte); }
    .topbar-left p { font-size:12px; color:var(--texte-soft); margin-top:1px; }
    .topbar-right { display:flex; align-items:center; gap:10px; }
    .datetime-pill { background:var(--vert-clair); padding:5px 12px; border-radius:20px; font-size:12px; font-weight:600; color:var(--vert); }
    .menu-toggle { display:none; background:none; border:none; font-size:22px; cursor:pointer; color:var(--texte); padding:6px; }

    /* ── BOUTON RETOUR ── */
    .back-btn {
      display:inline-flex; align-items:center; gap:8px;
      background:var(--blanc); border:1px solid var(--bordure);
      color:var(--texte); padding:8px 14px; border-radius:var(--radius-sm);
      font-size:13px; font-weight:600; text-decoration:none;
      transition:all 0.2s; box-shadow:var(--shadow-sm);
    }
    .back-btn:hover { background:var(--vert-clair); border-color:var(--vert); color:var(--vert); }

    /* ── CONTENU ── */
    .content { padding:24px; }

    /* ── ALERTE ── */
    .alerte-box { background:#fff8e6; border:1px solid #f0c040; border-left:4px solid var(--or); border-radius:var(--radius-sm); padding:14px 18px; margin-bottom:24px; font-size:13.5px; color:#7a5500; display:flex; align-items:center; gap:10px; }

    /* ── STATS ── */
    .stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:28px; }
    .stat-card { background:var(--blanc); border-radius:var(--radius); padding:22px; box-shadow:var(--shadow-sm); border:1px solid var(--bordure); position:relative; overflow:hidden; transition:transform 0.2s, box-shadow 0.2s; }
    .stat-card:hover { transform:translateY(-2px); box-shadow:var(--shadow-md); }
    .stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,var(--vert),var(--or)); }
    .stat-card-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
    .stat-icon-wrap { width:46px; height:46px; background:var(--vert-clair); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:22px; }
    .stat-trend { font-size:11px; font-weight:600; padding:3px 8px; border-radius:6px; background:var(--vert-clair); color:var(--vert); }
    .stat-value { font-family:'Fraunces',serif; font-size:40px; font-weight:600; color:var(--texte); line-height:1; margin-bottom:5px; }
    .stat-label { font-size:13px; color:var(--texte-soft); font-weight:500; }

    /* ── SECTION ── */
    .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
    .section-title { font-family:'Fraunces',serif; font-size:17px; color:var(--texte); }
    .section-sub { font-size:12px; color:var(--texte-soft); margin-top:2px; }

    /* ── ACTIONS ── */
    .actions-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:28px; }
    .action-card { background:var(--blanc); border-radius:var(--radius); padding:20px; text-decoration:none; color:var(--texte); border:1px solid var(--bordure); display:flex; align-items:center; gap:14px; transition:all 0.2s; box-shadow:var(--shadow-sm); }
    .action-card:hover { border-color:var(--vert); box-shadow:0 0 0 3px var(--vert-glow), var(--shadow-md); transform:translateY(-1px); }
    .action-icon-wrap { width:44px; height:44px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
    .ac-vert  { background:var(--vert-clair); }
    .ac-or    { background:var(--or-clair); }
    .ac-bleu  { background:#e8f0fe; }
    .action-text { flex:1; }
    .action-label { font-size:13.5px; font-weight:600; margin-bottom:2px; }
    .action-desc { font-size:11.5px; color:var(--texte-soft); }
    .action-arrow { font-size:15px; color:var(--bordure); transition:color 0.2s; }
    .action-card:hover .action-arrow { color:var(--vert); }

    /* ── MODAL PHOTO ── */
    .modal-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:500; align-items:center; justify-content:center; padding:16px; }
    .modal-overlay.open { display:flex; }
    .modal { background:var(--blanc); border-radius:var(--radius); padding:28px; width:100%; max-width:420px; box-shadow:var(--shadow-md); }
    .modal h3 { font-family:'Fraunces',serif; font-size:20px; margin-bottom:6px; }
    .modal p { font-size:13px; color:var(--texte-soft); margin-bottom:20px; }
    .photo-preview { width:100px; height:100px; border-radius:12px; background:var(--vert-clair); margin:0 auto 20px; overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:700; color:var(--vert); border:3px solid var(--bordure); }
    .photo-preview img { width:100%; height:100%; object-fit:cover; }
    .file-zone { border:2px dashed var(--bordure); border-radius:var(--radius-sm); padding:20px; text-align:center; cursor:pointer; transition:all 0.2s; margin-bottom:16px; }
    .file-zone:hover, .file-zone.drag-over { border-color:var(--vert); background:var(--vert-clair); }
    .file-zone input[type=file] { display:none; }
    .file-zone-label { font-size:13px; color:var(--texte-soft); cursor:pointer; }
    .file-zone-label strong { display:block; font-size:14px; color:var(--texte); margin-bottom:4px; }
    .upload-progress { display:none; height:6px; background:var(--bordure); border-radius:10px; overflow:hidden; margin-bottom:16px; }
    .upload-progress-bar { height:100%; background:var(--vert); border-radius:10px; transition:width 0.3s; }
    .modal-actions { display:flex; gap:10px; justify-content:flex-end; }
    .btn-cancel { background:var(--bg); color:var(--texte); border:1px solid var(--bordure); padding:10px 18px; border-radius:var(--radius-sm); font-size:13px; font-weight:600; cursor:pointer; }
    .btn-upload { background:var(--vert); color:white; border:none; padding:10px 18px; border-radius:var(--radius-sm); font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; transition:background 0.2s; }
    .btn-upload:hover { background:var(--vert-fonce); }
    .btn-upload:disabled { opacity:0.5; cursor:not-allowed; }
    .msg-succes { background:var(--vert-clair); color:var(--vert); border-radius:var(--radius-sm); padding:10px 14px; font-size:13px; font-weight:600; display:none; margin-bottom:14px; }
    .msg-erreur { background:#fce8e8; color:#b71c1c; border-radius:var(--radius-sm); padding:10px 14px; font-size:13px; display:none; margin-bottom:14px; }

    /* ── OVERLAY SIDEBAR MOBILE ── */
    .overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:150; }
    .overlay.open { display:block; }

    /* ── RESPONSIVE ── */
    @media (max-width:1100px) {
      .actions-grid { grid-template-columns:repeat(2,1fr); }
    }
    @media (max-width:768px) {
      .sidebar { transform:translateX(-100%); }
      .sidebar.open { transform:translateX(0); }
      .main { margin-left:0; }
      .menu-toggle { display:flex; }
      .content { padding:16px; }
      .topbar { padding:0 16px; }
      .stats-grid { grid-template-columns:repeat(2,1fr); gap:12px; }
      .actions-grid { grid-template-columns:1fr; }
      .stat-value { font-size:32px; }
    }
    @media (max-width:480px) {
      .stats-grid { grid-template-columns:1fr; }
      .datetime-pill { display:none; }
    }
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
        <span class="nav-icon">👥</span> Comptes
      </a>
      <a href="/admin/stats" class="nav-item">
        <span class="nav-icon">📊</span> Statistiques
      </a>
      <a href="/admin/geo" class="nav-item">
        <span class="nav-icon">🗺️</span> Géographie
      </a>

      <div class="nav-label">Modules cliniques</div>
      <a href="/grossesse" class="nav-item">
        <span class="nav-icon">🤰</span> Grossesse
      </a>
      <a href="/infirmerie" class="nav-item">
        <span class="nav-icon">💉</span> Infirmerie
      </a>
      <a href="/radiologie" class="nav-item">
        <span class="nav-icon">🖼️</span> Radiologie
      </a>
      <a href="/export" class="nav-item">
        <span class="nav-icon">📤</span> Exports CSV
      </a>

      <div class="nav-label">Compte</div>
      <a href="#" class="nav-item" onclick="ouvrirModalPhoto(); closeSidebar(); return false;">
        <span class="nav-icon">📷</span> Ma photo
      </a>
      <a href="/parametres" class="nav-item">
        <span class="nav-icon">⚙️</span> Paramètres
      </a>
    </nav>

    <div class="sidebar-footer">
      <div class="user-card" onclick="ouvrirModalPhoto()" title="Changer ma photo">
        <div class="user-avatar">
          ${avatar}
          <div class="edit-overlay">📷</div>
        </div>
        <div class="user-info">
          <div class="user-name">${profil.prenom} ${profil.nom}</div>
          <div class="user-role">Super Admin</div>
        </div>
        <a href="/auth/logout" class="logout-btn" title="Déconnexion" onclick="event.stopPropagation()">⏻</a>
      </div>
    </div>
  </aside>

  <div class="overlay" id="overlay" onclick="closeSidebar()"></div>

  <!-- MAIN -->
  <div class="main">

    <!-- TOPBAR -->
    <header class="topbar">
      <div style="display:flex;align-items:center;gap:12px;">
        <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
        <div class="topbar-left">
          <h1>Bonjour, ${profil.prenom} 👋</h1>
          <p>Vue d'ensemble du système national</p>
        </div>
      </div>
      <div class="topbar-right">
        <div class="datetime-pill">🕐 ${heure} · ${date}</div>
        <button onclick="ouvrirModalPhoto()" style="background:var(--vert-clair);border:none;padding:8px 12px;border-radius:var(--radius-sm);font-size:12px;font-weight:600;color:var(--vert);cursor:pointer;display:flex;align-items:center;gap:6px;">
          📷 Ma photo
        </button>
      </div>
    </header>

    <!-- CONTENU -->
    <div class="content">

      ${stats.nbStructures === 0 ? `
      <div class="alerte-box">
        ⚠️ <strong>Démarrage :</strong> Aucune structure enregistrée. Commencez par ajouter les structures.
      </div>` : ''}

      <!-- STATS -->
      <div class="section-header" style="margin-bottom:14px">
        <div>
          <div class="section-title">Statistiques nationales</div>
          <div class="section-sub">Données en temps réel</div>
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
          <div class="action-text"><div class="action-label">Structures</div><div class="action-desc">Hôpitaux, cliniques, CSPS...</div></div>
          <span class="action-arrow">→</span>
        </a>
        <a href="/admin/structures/nouvelle" class="action-card">
          <div class="action-icon-wrap ac-or">➕</div>
          <div class="action-text"><div class="action-label">Ajouter structure</div><div class="action-desc">Nouvelle structure sanitaire</div></div>
          <span class="action-arrow">→</span>
        </a>
        <a href="/admin/comptes" class="action-card">
          <div class="action-icon-wrap ac-bleu">👥</div>
          <div class="action-text"><div class="action-label">Comptes</div><div class="action-desc">Médecins, infirmiers, admins...</div></div>
          <span class="action-arrow">→</span>
        </a>
        <a href="/admin/comptes/nouveau" class="action-card">
          <div class="action-icon-wrap ac-vert">👤</div>
          <div class="action-text"><div class="action-label">Créer un compte</div><div class="action-desc">Nouvel utilisateur SantéBF</div></div>
          <span class="action-arrow">→</span>
        </a>
        <a href="/admin/stats" class="action-card">
          <div class="action-icon-wrap ac-or">📊</div>
          <div class="action-text"><div class="action-label">Statistiques</div><div class="action-desc">Activité nationale</div></div>
          <span class="action-arrow">→</span>
        </a>
        <a href="/admin/geo" class="action-card">
          <div class="action-icon-wrap ac-bleu">🗺️</div>
          <div class="action-text"><div class="action-label">Géographie</div><div class="action-desc">Régions, provinces, villes</div></div>
          <span class="action-arrow">→</span>
        </a>
        <a href="/grossesse" class="action-card">
          <div class="action-icon-wrap" style="background:#fce4ec">🤰</div>
          <div class="action-text"><div class="action-label">Grossesse</div><div class="action-desc">Suivi prénatal, CPN</div></div>
          <span class="action-arrow">→</span>
        </a>
        <a href="/infirmerie" class="action-card">
          <div class="action-icon-wrap" style="background:#e1f5fe">💉</div>
          <div class="action-text"><div class="action-label">Infirmerie</div><div class="action-desc">Soins, surveillance</div></div>
          <span class="action-arrow">→</span>
        </a>
        <a href="/radiologie" class="action-card">
          <div class="action-icon-wrap" style="background:#e0f2f1">🖼️</div>
          <div class="action-text"><div class="action-label">Radiologie</div><div class="action-desc">Imagerie médicale</div></div>
          <span class="action-arrow">→</span>
        </a>
        <a href="/export" class="action-card">
          <div class="action-icon-wrap ac-or">📤</div>
          <div class="action-text"><div class="action-label">Exports CSV</div><div class="action-desc">Données et statistiques</div></div>
          <span class="action-arrow">→</span>
        </a>
        <a href="/parametres" class="action-card">
          <div class="action-icon-wrap ac-vert">⚙️</div>
          <div class="action-text"><div class="action-label">Paramètres</div><div class="action-desc">Notifications, calendrier</div></div>
          <span class="action-arrow">→</span>
        </a>
        <a href="#" onclick="ouvrirModalPhoto(); return false;" class="action-card">
          <div class="action-icon-wrap" style="background:#f3e8ff">📷</div>
          <div class="action-text"><div class="action-label">Ma photo de profil</div><div class="action-desc">Mettre à jour ma photo</div></div>
          <span class="action-arrow">→</span>
        </a>
      </div>

    </div>
  </div>
</div>

<!-- ── MODAL PHOTO DE PROFIL ── -->
<div class="modal-overlay" id="modalPhoto">
  <div class="modal">
    <h3>📷 Photo de profil</h3>
    <p>Choisissez une photo claire de votre visage. Elle sera visible dans la sidebar et sur votre profil.</p>

    <div class="photo-preview" id="photoPreview">
      ${profil.avatar_url
        ? `<img src="${profil.avatar_url}" alt="Photo actuelle" id="previewImg">`
        : `<span id="previewInitials">${profil.prenom.charAt(0)}${profil.nom.charAt(0)}</span>`
      }
    </div>

    <div class="msg-succes" id="msgSucces">✅ Photo mise à jour avec succès !</div>
    <div class="msg-erreur" id="msgErreur">❌ Erreur lors de l'envoi. Réessayez.</div>

    <div class="file-zone" id="fileZone" onclick="document.getElementById('fileInput').click()">
      <label class="file-zone-label">
        <strong>📁 Cliquez ou glissez votre photo ici</strong>
        JPG, PNG ou WEBP · Max 5 Mo
      </label>
      <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp" onchange="previewPhoto(this)">
    </div>

    <div class="upload-progress" id="uploadProgress">
      <div class="upload-progress-bar" id="progressBar" style="width:0%"></div>
    </div>

    <div class="modal-actions">
      <button class="btn-cancel" onclick="fermerModalPhoto()">Annuler</button>
      <button class="btn-upload" id="btnUpload" onclick="uploadPhoto()" disabled>
        <span>⬆️</span> Enregistrer la photo
      </button>
    </div>
  </div>
</div>

<script>
  // ── Sidebar mobile
  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open')
    document.getElementById('overlay').classList.toggle('open')
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open')
    document.getElementById('overlay').classList.remove('open')
  }

  // ── Modal photo
  function ouvrirModalPhoto() {
    document.getElementById('modalPhoto').classList.add('open')
    document.getElementById('msgSucces').style.display = 'none'
    document.getElementById('msgErreur').style.display = 'none'
  }
  function fermerModalPhoto() {
    document.getElementById('modalPhoto').classList.remove('open')
    selectedFile = null
    document.getElementById('fileInput').value = ''
    document.getElementById('btnUpload').disabled = true
    document.getElementById('uploadProgress').style.display = 'none'
    document.getElementById('progressBar').style.width = '0%'
  }

  // Fermer modal en cliquant dehors
  document.getElementById('modalPhoto').addEventListener('click', function(e) {
    if (e.target === this) fermerModalPhoto()
  })

  let selectedFile = null

  function previewPhoto(input) {
    const file = input.files[0]
    if (!file) return

    // Vérifier taille (5 Mo max)
    if (file.size > 5 * 1024 * 1024) {
      document.getElementById('msgErreur').textContent = '❌ Fichier trop volumineux (max 5 Mo)'
      document.getElementById('msgErreur').style.display = 'block'
      return
    }

    selectedFile = file

    // Prévisualisation
    const reader = new FileReader()
    reader.onload = function(e) {
      const preview = document.getElementById('photoPreview')
      preview.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;border-radius:9px">'
    }
    reader.readAsDataURL(file)

    document.getElementById('btnUpload').disabled = false
    document.getElementById('msgSucces').style.display = 'none'
    document.getElementById('msgErreur').style.display = 'none'
  }

  async function uploadPhoto() {
    if (!selectedFile) return

    const btn = document.getElementById('btnUpload')
    const progress = document.getElementById('uploadProgress')
    const bar = document.getElementById('progressBar')

    btn.disabled = true
    btn.innerHTML = '<span>⏳</span> Envoi en cours...'
    progress.style.display = 'block'
    bar.style.width = '30%'

    try {
      // 1. Lire le fichier en base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = e => resolve(e.target.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(selectedFile)
      })

      bar.style.width = '60%'

      // 2. Envoyer au serveur
      const response = await fetch('/profil/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fichier: base64,
          type: selectedFile.type,
          nom: selectedFile.name
        })
      })

      bar.style.width = '90%'

      if (!response.ok) {
        throw new Error('Erreur serveur: ' + response.status)
      }

      const result = await response.json()
      bar.style.width = '100%'

      if (result.url) {
        // Mettre à jour l'avatar dans la sidebar sans rechargement
        document.querySelectorAll('.user-avatar').forEach(el => {
          el.innerHTML = '<img src="' + result.url + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px"><div class="edit-overlay">📷</div>'
        })
      }

      document.getElementById('msgSucces').style.display = 'block'
      btn.innerHTML = '✅ Photo enregistrée'

      // Fermer après 2 secondes
      setTimeout(() => {
        fermerModalPhoto()
        // Recharger pour rafraîchir partout
        window.location.reload()
      }, 2000)

    } catch (err) {
      console.error('Erreur upload:', err)
      bar.style.width = '0%'
      progress.style.display = 'none'
      document.getElementById('msgErreur').textContent = '❌ Erreur lors de l\\'envoi. Réessayez.'
      document.getElementById('msgErreur').style.display = 'block'
      btn.disabled = false
      btn.innerHTML = '<span>⬆️</span> Réessayer'
    }
  }

  // Drag & drop
  const fileZone = document.getElementById('fileZone')
  fileZone.addEventListener('dragover', e => { e.preventDefault(); fileZone.classList.add('drag-over') })
  fileZone.addEventListener('dragleave', () => fileZone.classList.remove('drag-over'))
  fileZone.addEventListener('drop', e => {
    e.preventDefault()
    fileZone.classList.remove('drag-over')
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      const input = document.getElementById('fileInput')
      const dt = new DataTransfer()
      dt.items.add(file)
      input.files = dt.files
      previewPhoto(input)
    }
  })
</script>

</body>
</html>`
}
