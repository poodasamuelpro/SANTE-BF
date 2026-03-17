/**
 * src/pages/dashboard-admin.ts
 * Dashboard Super Admin — photo profil, mode sombre, géographie active, création super_admin
 */

export function dashboardAdminPage(profil: any, stats: {
  nbStructures: number
  nbComptes:    number
  nbPatients:   number
}): string {

  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const avatar = profil.avatar_url
    ? '<img src="' + profil.avatar_url + '" alt="Photo" style="width:100%;height:100%;object-fit:cover;border-radius:8px">'
    : profil.prenom.charAt(0) + profil.nom.charAt(0)

  const avatarPreview = profil.avatar_url
    ? '<img src="' + profil.avatar_url + '" alt="Photo actuelle" id="previewImg" style="width:100%;height:100%;object-fit:cover;border-radius:9px">'
    : '<span id="previewInitials">' + profil.prenom.charAt(0) + profil.nom.charAt(0) + '</span>'

  const alerteBox = stats.nbStructures === 0
    ? '<div class="alerte-box">&#9888; <strong>Démarrage :</strong> Aucune structure enregistrée. Commencez par ajouter les structures.</div>'
    : ''

  return `<!DOCTYPE html>
<html lang="fr" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Super Admin</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fraunces:ital,wght@0,300;0,600;1,300&display=swap" rel="stylesheet">
  <style>
    /* ── VARIABLES LIGHT ── */
    :root {
      --vert:#1A6B3C; --vert-f:#134d2c; --vert-c:#e8f5ee; --vert-g:rgba(26,107,60,0.15);
      --or:#C9A84C; --or-c:#fdf6e3;
      --bleu:#1565C0; --bleu-c:#e3f2fd;
      --texte:#0f1923; --soft:#5a6a78; --bg:#f4f6f4; --blanc:#ffffff; --bordure:#e2e8e4;
      --sh-sm:0 1px 4px rgba(0,0,0,0.06); --sh-md:0 4px 20px rgba(0,0,0,0.08);
      --r:16px; --rs:10px;
      --sb-bg:#134d2c; --sb-text:rgba(255,255,255,0.65); --sb-active:var(--or);
    }
    /* ── VARIABLES DARK ── */
    [data-theme="dark"] {
      --bg:#0f172a; --blanc:#1e293b; --bordure:#334155;
      --texte:#f1f5f9; --soft:#94a3b8;
      --vert-c:rgba(26,107,60,0.2); --or-c:rgba(201,168,76,0.15);
      --bleu-c:rgba(21,101,192,0.2);
      --sh-sm:0 1px 4px rgba(0,0,0,0.3); --sh-md:0 4px 20px rgba(0,0,0,0.4);
      --sb-bg:#020617;
    }
    *,*::before,*::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Plus Jakarta Sans',sans-serif; background:var(--bg); min-height:100vh; color:var(--texte); transition:background .3s,color .3s; }
    .layout { display:flex; min-height:100vh; }

    /* ── SIDEBAR ── */
    .sidebar { width:260px; background:var(--sb-bg); display:flex; flex-direction:column; position:fixed; top:0; left:0; height:100vh; z-index:200; transition:transform .3s; }
    .sb-brand { padding:22px 18px 16px; border-bottom:1px solid rgba(255,255,255,.08); }
    .sb-brand-row { display:flex; align-items:center; gap:12px; margin-bottom:4px; }
    .sb-icon { width:38px; height:38px; background:var(--or); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
    .sb-name { font-family:'Fraunces',serif; font-size:20px; color:white; }
    .sb-sub  { font-size:10px; color:rgba(255,255,255,.35); letter-spacing:1.5px; text-transform:uppercase; padding-left:50px; }
    .sb-nav  { flex:1; padding:12px 10px; overflow-y:auto; }
    .nav-lbl { font-size:10px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:rgba(255,255,255,.3); padding:10px 12px 5px; }
    .nav-item { display:flex; align-items:center; gap:12px; padding:10px 13px; border-radius:var(--rs); text-decoration:none; color:var(--sb-text); font-size:13.5px; font-weight:500; margin-bottom:2px; transition:all .2s; }
    .nav-item:hover { background:rgba(255,255,255,.08); color:white; }
    .nav-item.active { background:var(--or); color:#0f1923; font-weight:600; }
    .nav-ico { font-size:15px; width:18px; text-align:center; }
    .sb-footer { padding:14px 10px; border-top:1px solid rgba(255,255,255,.08); }
    .user-card { display:flex; align-items:center; gap:10px; padding:10px; border-radius:var(--rs); background:rgba(255,255,255,.06); cursor:pointer; transition:background .2s; }
    .user-card:hover { background:rgba(255,255,255,.1); }
    .user-av { width:38px; height:38px; background:var(--or); border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#0f1923; flex-shrink:0; overflow:hidden; position:relative; }
    .av-overlay { position:absolute; inset:0; background:rgba(0,0,0,.5); display:none; align-items:center; justify-content:center; font-size:14px; border-radius:9px; }
    .user-card:hover .av-overlay { display:flex; }
    .user-info { flex:1; min-width:0; }
    .user-name { font-size:12.5px; font-weight:600; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .user-role { font-size:10.5px; color:rgba(255,255,255,.4); }
    .logout-btn { width:26px; height:26px; background:rgba(255,255,255,.08); border:none; border-radius:6px; color:rgba(255,255,255,.5); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; text-decoration:none; transition:all .2s; flex-shrink:0; }
    .logout-btn:hover { background:rgba(255,80,80,.2); color:#ff8080; }

    /* ── MAIN ── */
    .main { margin-left:260px; flex:1; display:flex; flex-direction:column; min-width:0; }
    .topbar { height:62px; background:var(--blanc); border-bottom:1px solid var(--bordure); display:flex; align-items:center; justify-content:space-between; padding:0 24px; position:sticky; top:0; z-index:100; box-shadow:var(--sh-sm); }
    .topbar-l { display:flex; align-items:center; gap:12px; }
    .topbar-l h1 { font-family:'Fraunces',serif; font-size:19px; }
    .topbar-l p  { font-size:12px; color:var(--soft); margin-top:1px; }
    .topbar-r { display:flex; align-items:center; gap:8px; }
    .dt-pill { background:var(--vert-c); padding:5px 12px; border-radius:20px; font-size:12px; font-weight:600; color:var(--vert); white-space:nowrap; }
    .menu-btn { display:none; background:none; border:none; font-size:22px; cursor:pointer; color:var(--texte); padding:6px; }
    .dark-toggle { background:var(--blanc); border:1px solid var(--bordure); border-radius:8px; padding:6px 10px; cursor:pointer; font-size:16px; transition:all .2s; }
    .dark-toggle:hover { background:var(--vert-c); }
    .photo-btn { background:var(--vert-c); border:none; padding:8px 12px; border-radius:var(--rs); font-size:12px; font-weight:600; color:var(--vert); cursor:pointer; display:flex; align-items:center; gap:6px; }

    /* ── CONTENT ── */
    .content { padding:24px; }
    .alerte-box { background:#fff8e6; border:1px solid #f0c040; border-left:4px solid var(--or); border-radius:var(--rs); padding:14px 18px; margin-bottom:24px; font-size:13.5px; color:#7a5500; display:flex; align-items:center; gap:10px; }

    /* ── STATS ── */
    .stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:28px; }
    .stat-card { background:var(--blanc); border-radius:var(--r); padding:22px; box-shadow:var(--sh-sm); border:1px solid var(--bordure); position:relative; overflow:hidden; transition:transform .2s,box-shadow .2s; }
    .stat-card:hover { transform:translateY(-2px); box-shadow:var(--sh-md); }
    .stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,var(--vert),var(--or)); }
    .stat-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
    .stat-ico { width:46px; height:46px; background:var(--vert-c); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:22px; }
    .stat-trend { font-size:11px; font-weight:600; padding:3px 8px; border-radius:6px; background:var(--vert-c); color:var(--vert); }
    .stat-val { font-family:'Fraunces',serif; font-size:40px; font-weight:600; line-height:1; margin-bottom:5px; }
    .stat-lbl { font-size:13px; color:var(--soft); font-weight:500; }

    /* ── SECTION ── */
    .sec-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
    .sec-title { font-family:'Fraunces',serif; font-size:17px; }
    .sec-sub { font-size:12px; color:var(--soft); margin-top:2px; }

    /* ── ACTIONS ── */
    .actions-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:28px; }
    .ac { background:var(--blanc); border-radius:var(--r); padding:20px; text-decoration:none; color:var(--texte); border:1px solid var(--bordure); display:flex; align-items:center; gap:14px; transition:all .2s; box-shadow:var(--sh-sm); }
    .ac:hover { border-color:var(--vert); box-shadow:0 0 0 3px var(--vert-g),var(--sh-md); transform:translateY(-1px); }
    .ac-ico { width:44px; height:44px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
    .ico-v { background:var(--vert-c); }
    .ico-o { background:var(--or-c); }
    .ico-b { background:var(--bleu-c); }
    .ico-p { background:#fce4ec; }
    .ico-t { background:#e0f2f1; }
    .ico-e { background:#e1f5fe; }
    .ac-txt { flex:1; }
    .ac-lbl { font-size:13.5px; font-weight:600; margin-bottom:2px; }
    .ac-desc { font-size:11.5px; color:var(--soft); }
    .ac-arrow { font-size:15px; color:var(--bordure); transition:color .2s; }
    .ac:hover .ac-arrow { color:var(--vert); }

    /* ── MODAL ── */
    .modal-bg { display:none; position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:500; align-items:center; justify-content:center; padding:16px; }
    .modal-bg.open { display:flex; }
    .modal { background:var(--blanc); border-radius:var(--r); padding:28px; width:100%; max-width:420px; box-shadow:var(--sh-md); }
    .modal h3 { font-family:'Fraunces',serif; font-size:20px; margin-bottom:6px; }
    .modal p  { font-size:13px; color:var(--soft); margin-bottom:20px; }
    .ph-preview { width:100px; height:100px; border-radius:12px; background:var(--vert-c); margin:0 auto 20px; overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:700; color:var(--vert); border:3px solid var(--bordure); }
    .ph-preview img { width:100%; height:100%; object-fit:cover; }
    .file-zone { border:2px dashed var(--bordure); border-radius:var(--rs); padding:20px; text-align:center; cursor:pointer; transition:all .2s; margin-bottom:16px; }
    .file-zone:hover { border-color:var(--vert); background:var(--vert-c); }
    .fz-strong { display:block; font-size:14px; font-weight:600; margin-bottom:4px; }
    .fz-sub { font-size:12px; color:var(--soft); }
    .prog-wrap { display:none; height:6px; background:var(--bordure); border-radius:10px; overflow:hidden; margin-bottom:16px; }
    .prog-bar { height:100%; background:var(--vert); border-radius:10px; transition:width .3s; }
    .msg-ok { background:var(--vert-c); color:var(--vert); border-radius:var(--rs); padding:10px 14px; font-size:13px; font-weight:600; display:none; margin-bottom:14px; }
    .msg-ko { background:#fce8e8; color:#b71c1c; border-radius:var(--rs); padding:10px 14px; font-size:13px; display:none; margin-bottom:14px; }
    .modal-btns { display:flex; gap:10px; justify-content:flex-end; }
    .btn-cancel { background:var(--bg); color:var(--texte); border:1px solid var(--bordure); padding:10px 18px; border-radius:var(--rs); font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
    .btn-save { background:var(--vert); color:white; border:none; padding:10px 18px; border-radius:var(--rs); font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; transition:background .2s; font-family:inherit; }
    .btn-save:hover { background:var(--vert-f); }
    .btn-save:disabled { opacity:.5; cursor:not-allowed; }

    /* ── OVERLAY MOBILE ── */
    .sb-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:150; }
    .sb-overlay.open { display:block; }

    /* ── RESPONSIVE ── */
    @media(max-width:1100px){ .actions-grid { grid-template-columns:repeat(2,1fr); } }
    @media(max-width:768px){
      .sidebar { transform:translateX(-100%); }
      .sidebar.open { transform:translateX(0); }
      .main { margin-left:0; }
      .menu-btn { display:flex; }
      .content { padding:16px; }
      .topbar { padding:0 16px; }
      .stats-grid { grid-template-columns:repeat(2,1fr); gap:12px; }
      .actions-grid { grid-template-columns:1fr; }
      .stat-val { font-size:32px; }
    }
    @media(max-width:480px){
      .stats-grid { grid-template-columns:1fr; }
      .dt-pill { display:none; }
    }
  </style>
</head>
<body>
<div class="layout">

  <!-- SIDEBAR -->
  <aside class="sidebar" id="sidebar">
    <div class="sb-brand">
      <div class="sb-brand-row">
        <div class="sb-icon">&#127973;</div>
        <div class="sb-name">SantéBF</div>
      </div>
      <div class="sb-sub">Super Administration</div>
    </div>

    <nav class="sb-nav">
      <div class="nav-lbl">Principal</div>
      <a href="/dashboard/admin" class="nav-item active">
        <span class="nav-ico">&#8859;</span> Tableau de bord
      </a>

      <div class="nav-lbl">Gestion</div>
      <a href="/admin/structures" class="nav-item">
        <span class="nav-ico">&#127973;</span> Structures
      </a>
      <a href="/admin/comptes" class="nav-item">
        <span class="nav-ico">&#128101;</span> Comptes
      </a>
      <a href="/admin/comptes/nouveau" class="nav-item">
        <span class="nav-ico">&#10133;</span> Créer un compte
      </a>
      <a href="/admin/stats" class="nav-item">
        <span class="nav-ico">&#128202;</span> Statistiques
      </a>
      <a href="/admin/geo" class="nav-item">
        <span class="nav-ico">&#128506;</span> Géographie
      </a>

      <div class="nav-lbl">Modules cliniques</div>
      <a href="/grossesse" class="nav-item">
        <span class="nav-ico">&#129314;</span> Grossesse
      </a>
      <a href="/infirmerie" class="nav-item">
        <span class="nav-ico">&#128137;</span> Infirmerie
      </a>
      <a href="/radiologie" class="nav-item">
        <span class="nav-ico">&#128247;</span> Radiologie
      </a>
      <a href="/export" class="nav-item">
        <span class="nav-ico">&#128228;</span> Exports CSV
      </a>

      <div class="nav-lbl">Compte</div>
      <a href="#" class="nav-item" onclick="ouvrirPhoto(); closeSb(); return false;">
        <span class="nav-ico">&#128247;</span> Ma photo
      </a>
      <a href="/parametres" class="nav-item">
        <span class="nav-ico">&#9881;</span> Paramètres
      </a>
    </nav>

    <div class="sb-footer">
      <div class="user-card" onclick="ouvrirPhoto()" title="Changer ma photo">
        <div class="user-av">
          ${avatar}
          <div class="av-overlay">&#128247;</div>
        </div>
        <div class="user-info">
          <div class="user-name">${profil.prenom} ${profil.nom}</div>
          <div class="user-role">Super Admin</div>
        </div>
        <a href="/auth/logout" class="logout-btn" title="Déconnexion" onclick="event.stopPropagation()">&#9211;</a>
      </div>
    </div>
  </aside>

  <div class="sb-overlay" id="sbOverlay" onclick="closeSb()"></div>

  <!-- MAIN -->
  <div class="main">
    <header class="topbar">
      <div class="topbar-l">
        <button class="menu-btn" onclick="toggleSb()">&#9776;</button>
        <div>
          <h1>Bonjour, ${profil.prenom} &#128075;</h1>
          <p>Vue d'ensemble du système national</p>
        </div>
      </div>
      <div class="topbar-r">
        <div class="dt-pill">&#128336; ${heure} &middot; ${date}</div>
        <button class="dark-toggle" id="darkBtn" onclick="toggleDark()" title="Mode sombre">&#127769;</button>
        <button class="photo-btn" onclick="ouvrirPhoto()">&#128247; Ma photo</button>
      </div>
    </header>

    <div class="content">
      ${alerteBox}

      <!-- STATS -->
      <div class="sec-hd" style="margin-bottom:14px;">
        <div>
          <div class="sec-title">Statistiques nationales</div>
          <div class="sec-sub">Données en temps réel</div>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-top">
            <div class="stat-ico">&#127973;</div>
            <span class="stat-trend">Actif</span>
          </div>
          <div class="stat-val">${stats.nbStructures}</div>
          <div class="stat-lbl">Structures sanitaires</div>
        </div>
        <div class="stat-card">
          <div class="stat-top">
            <div class="stat-ico">&#128100;</div>
            <span class="stat-trend">Actif</span>
          </div>
          <div class="stat-val">${stats.nbComptes}</div>
          <div class="stat-lbl">Comptes utilisateurs</div>
        </div>
        <div class="stat-card">
          <div class="stat-top">
            <div class="stat-ico">&#128193;</div>
            <span class="stat-trend">Total</span>
          </div>
          <div class="stat-val">${stats.nbPatients}</div>
          <div class="stat-lbl">Dossiers patients</div>
        </div>
      </div>

      <!-- ACTIONS -->
      <div class="sec-hd">
        <div>
          <div class="sec-title">Gestion du système</div>
          <div class="sec-sub">Actions rapides d'administration</div>
        </div>
      </div>
      <div class="actions-grid">
        <a href="/admin/structures" class="ac">
          <div class="ac-ico ico-v">&#127973;</div>
          <div class="ac-txt"><div class="ac-lbl">Structures</div><div class="ac-desc">Hôpitaux, cliniques, CSPS...</div></div>
          <span class="ac-arrow">&#8594;</span>
        </a>
        <a href="/admin/structures/nouvelle" class="ac">
          <div class="ac-ico ico-o">&#10133;</div>
          <div class="ac-txt"><div class="ac-lbl">Ajouter structure</div><div class="ac-desc">Nouvelle structure sanitaire</div></div>
          <span class="ac-arrow">&#8594;</span>
        </a>
        <a href="/admin/comptes" class="ac">
          <div class="ac-ico ico-b">&#128101;</div>
          <div class="ac-txt"><div class="ac-lbl">Comptes</div><div class="ac-desc">Médecins, infirmiers, admins...</div></div>
          <span class="ac-arrow">&#8594;</span>
        </a>
        <a href="/admin/comptes/nouveau" class="ac">
          <div class="ac-ico ico-v">&#128100;</div>
          <div class="ac-txt"><div class="ac-lbl">Créer un compte</div><div class="ac-desc">Médecin, admin, super admin...</div></div>
          <span class="ac-arrow">&#8594;</span>
        </a>
        <a href="/admin/stats" class="ac">
          <div class="ac-ico ico-o">&#128202;</div>
          <div class="ac-txt"><div class="ac-lbl">Statistiques</div><div class="ac-desc">Activité nationale</div></div>
          <span class="ac-arrow">&#8594;</span>
        </a>
        <a href="/admin/geo" class="ac">
          <div class="ac-ico ico-b">&#128506;</div>
          <div class="ac-txt"><div class="ac-lbl">Géographie</div><div class="ac-desc">Régions, provinces, villes</div></div>
          <span class="ac-arrow">&#8594;</span>
        </a>
        <a href="/grossesse" class="ac">
          <div class="ac-ico ico-p">&#129314;</div>
          <div class="ac-txt"><div class="ac-lbl">Grossesse</div><div class="ac-desc">Suivi prénatal, CPN</div></div>
          <span class="ac-arrow">&#8594;</span>
        </a>
        <a href="/infirmerie" class="ac">
          <div class="ac-ico ico-e">&#128137;</div>
          <div class="ac-txt"><div class="ac-lbl">Infirmerie</div><div class="ac-desc">Soins, surveillance</div></div>
          <span class="ac-arrow">&#8594;</span>
        </a>
        <a href="/radiologie" class="ac">
          <div class="ac-ico ico-t">&#128247;</div>
          <div class="ac-txt"><div class="ac-lbl">Radiologie</div><div class="ac-desc">Imagerie médicale</div></div>
          <span class="ac-arrow">&#8594;</span>
        </a>
        <a href="/export" class="ac">
          <div class="ac-ico ico-o">&#128228;</div>
          <div class="ac-txt"><div class="ac-lbl">Exports CSV</div><div class="ac-desc">Données et statistiques</div></div>
          <span class="ac-arrow">&#8594;</span>
        </a>
        <a href="/parametres" class="ac">
          <div class="ac-ico ico-v">&#9881;</div>
          <div class="ac-txt"><div class="ac-lbl">Paramètres</div><div class="ac-desc">Notifications, calendrier</div></div>
          <span class="ac-arrow">&#8594;</span>
        </a>
        <a href="#" onclick="ouvrirPhoto(); return false;" class="ac">
          <div class="ac-ico" style="background:#f3e8ff;">&#128247;</div>
          <div class="ac-txt"><div class="ac-lbl">Ma photo de profil</div><div class="ac-desc">Mettre à jour ma photo</div></div>
          <span class="ac-arrow">&#8594;</span>
        </a>
      </div>

    </div><!-- /content -->
  </div><!-- /main -->
</div><!-- /layout -->

<!-- MODAL PHOTO -->
<div class="modal-bg" id="modalPhoto">
  <div class="modal">
    <h3>&#128247; Photo de profil</h3>
    <p>Choisissez une photo claire de votre visage. Elle sera visible dans la sidebar.</p>
    <div class="ph-preview" id="phPrev">${avatarPreview}</div>
    <div class="msg-ok" id="msgOk">&#10003; Photo mise à jour !</div>
    <div class="msg-ko" id="msgKo">&#10007; Erreur lors de l'envoi. Réessayez.</div>
    <div class="file-zone" id="fzZone" onclick="document.getElementById('fzInput').click()">
      <span class="fz-strong">&#128193; Cliquez ou glissez votre photo ici</span>
      <span class="fz-sub">JPG, PNG ou WEBP · Max 5 Mo</span>
      <input type="file" id="fzInput" accept="image/jpeg,image/png,image/webp" onchange="previewPh(this)" style="display:none;">
    </div>
    <div class="prog-wrap" id="progWrap"><div class="prog-bar" id="progBar" style="width:0%"></div></div>
    <div class="modal-btns">
      <button class="btn-cancel" onclick="fermerPhoto()">Annuler</button>
      <button class="btn-save" id="btnSave" onclick="uploadPh()" disabled>&#11014; Enregistrer</button>
    </div>
  </div>
</div>

<script>
// ── Sidebar mobile
function toggleSb(){ document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sbOverlay').classList.toggle('open'); }
function closeSb(){ document.getElementById('sidebar').classList.remove('open'); document.getElementById('sbOverlay').classList.remove('open'); }

// ── Mode sombre
function toggleDark(){
  var html = document.documentElement;
  var dark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', dark ? 'light' : 'dark');
  document.getElementById('darkBtn').textContent = dark ? '\u{1F319}' : '\u2600\uFE0F';
  localStorage.setItem('santebf-theme', dark ? 'light' : 'dark');
}
// Restaurer préférence au chargement
(function(){
  var t = localStorage.getItem('santebf-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if(t === 'dark'){
    document.documentElement.setAttribute('data-theme','dark');
    var b = document.getElementById('darkBtn');
    if(b) b.textContent = '\u2600\uFE0F';
  }
})();

// ── Modal photo
var selFile = null;
function ouvrirPhoto(){ document.getElementById('modalPhoto').classList.add('open'); }
function fermerPhoto(){
  document.getElementById('modalPhoto').classList.remove('open');
  selFile = null;
  document.getElementById('fzInput').value = '';
  document.getElementById('btnSave').disabled = true;
  document.getElementById('progWrap').style.display = 'none';
  document.getElementById('progBar').style.width = '0%';
  document.getElementById('msgOk').style.display = 'none';
  document.getElementById('msgKo').style.display = 'none';
}
document.getElementById('modalPhoto').addEventListener('click', function(e){ if(e.target===this) fermerPhoto(); });

function previewPh(input){
  var f = input.files[0]; if(!f) return;
  if(f.size > 5*1024*1024){
    document.getElementById('msgKo').textContent = 'Fichier trop volumineux (max 5 Mo)';
    document.getElementById('msgKo').style.display = 'block'; return;
  }
  selFile = f;
  var r = new FileReader();
  r.onload = function(e){ document.getElementById('phPrev').innerHTML = '<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:cover;border-radius:9px">'; };
  r.readAsDataURL(f);
  document.getElementById('btnSave').disabled = false;
  document.getElementById('msgOk').style.display = 'none';
  document.getElementById('msgKo').style.display = 'none';
}

async function uploadPh(){
  if(!selFile) return;
  var btn = document.getElementById('btnSave');
  var prog = document.getElementById('progWrap');
  var bar = document.getElementById('progBar');
  btn.disabled = true; btn.innerHTML = '&#9203; Envoi...';
  prog.style.display = 'block'; bar.style.width = '30%';
  try {
    var b64 = await new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(e){res(e.target.result.split(',')[1]);}; r.onerror=rej; r.readAsDataURL(selFile); });
    bar.style.width = '60%';
    var resp = await fetch('/profil/avatar',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({fichier:b64, type:selFile.type, nom:selFile.name}) });
    bar.style.width = '90%';
    if(!resp.ok) throw new Error('Erreur '+resp.status);
    var result = await resp.json();
    bar.style.width = '100%';
    if(result.url){
      document.querySelectorAll('.user-av').forEach(function(el){
        el.innerHTML = '<img src="'+result.url+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px"><div class="av-overlay">&#128247;</div>';
      });
    }
    document.getElementById('msgOk').style.display = 'block';
    btn.innerHTML = '&#10003; Enregistrée';
    setTimeout(function(){ fermerPhoto(); window.location.reload(); }, 2000);
  } catch(err){
    bar.style.width = '0%'; prog.style.display = 'none';
    document.getElementById('msgKo').textContent = 'Erreur lors de l\'envoi. Réessayez.';
    document.getElementById('msgKo').style.display = 'block';
    btn.disabled = false; btn.innerHTML = '&#11014; Réessayer';
  }
}

// Drag & drop
var fzZone = document.getElementById('fzZone');
fzZone.addEventListener('dragover', function(e){ e.preventDefault(); fzZone.style.borderColor='var(--vert)'; fzZone.style.background='var(--vert-c)'; });
fzZone.addEventListener('dragleave', function(){ fzZone.style.borderColor=''; fzZone.style.background=''; });
fzZone.addEventListener('drop', function(e){
  e.preventDefault(); fzZone.style.borderColor=''; fzZone.style.background='';
  var f = e.dataTransfer.files[0];
  if(f && f.type.startsWith('image/')){
    var inp = document.getElementById('fzInput');
    var dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files;
    previewPh(inp);
  }
});
</script>
</body>
</html>`
}
