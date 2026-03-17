export function dashboardMedecinPage(
  profil: any,
  data: {
    rdvJour:          any[]
    consultations:    any[]
    statsJour:        {
      consultationsJour:  number
      rdvAVenir:          number
      ordonnancesActives: number
    }
  }
): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  function esc(v: unknown): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
  }

  const initiales = esc(profil.prenom.charAt(0)) + esc(profil.nom.charAt(0))
  const avatarUrl = profil.avatar_url ? esc(profil.avatar_url) : null

  // ── RDV du jour ───────────────────────────────────────
  const rdvItems = data.rdvJour.length === 0
    ? '<div class="empty">Aucun rendez-vous aujourd&#x27;hui</div>'
    : data.rdvJour.map((r: any) => {
        const statut = esc(r.statut ?? '')
        const h = new Date(r.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        return `<div class="rdv-item">
          <div class="rdv-heure">${h}</div>
          <div class="rdv-info">
            <strong>${esc(r.patient_dossiers?.prenom ?? '')} ${esc(r.patient_dossiers?.nom ?? '')}</strong>
            <span>${esc(r.motif ?? 'Consultation')} &middot; ${r.duree_minutes ?? 30} min</span>
          </div>
          <span class="rdv-badge ${statut}">${statut}</span>
        </div>`
      }).join('')

  // ── Consultations récentes ────────────────────────────
  const consultItems = data.consultations.length === 0
    ? '<div class="empty">Aucune consultation r&#xe9;cente</div>'
    : data.consultations.map((c: any) =>
        `<div class="consult-item">
          <div class="ci-top">
            <span class="ci-patient">${esc(c.patient_dossiers?.prenom ?? '')} ${esc(c.patient_dossiers?.nom ?? '')}</span>
            <span class="ci-date">${new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
          <div class="ci-motif">${esc(c.motif ?? '')}</div>
          ${c.diagnostic_principal ? `<div class="ci-diag">&#x2192; ${esc(c.diagnostic_principal)}</div>` : ''}
        </div>`
      ).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sant&#xe9;BF &#x2014; Espace M&#xe9;dical</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&amp;family=Fraunces:ital,wght@0,300;0,600;1,300&amp;display=swap" rel="stylesheet">
  <style>
    :root {
      --violet:       #4A148C;
      --violet-mid:   #6A1B9A;
      --violet-clair: #f3e8ff;
      --violet-glow:  rgba(74,20,140,0.12);
      --vert:         #1A6B3C;
      --bleu:         #1565C0;
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

    /* ─── SIDEBAR ─── */
    .sidebar { width:256px; background:var(--violet); position:fixed; top:0; left:0; height:100vh;
               z-index:200; display:flex; flex-direction:column; transition:transform 0.3s; }
    .sidebar-brand { padding:22px 20px 16px; border-bottom:1px solid rgba(255,255,255,0.1); }
    .brand-row  { display:flex; align-items:center; gap:10px; }
    .brand-icon { width:36px; height:36px; background:rgba(255,255,255,0.2); border-radius:9px;
                  display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0; }
    .brand-name { font-family:'Fraunces',serif; font-size:18px; color:white; }
    .brand-sub  { font-size:10px; color:rgba(255,255,255,0.4); letter-spacing:1.2px;
                  text-transform:uppercase; margin-top:3px; padding-left:46px; }
    .sidebar-nav { flex:1; padding:12px 10px; overflow-y:auto; }
    .nav-label  { font-size:10px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase;
                  color:rgba(255,255,255,0.3); padding:10px 10px 5px; }
    .nav-item   { display:flex; align-items:center; gap:11px; padding:10px 12px;
                  border-radius:var(--radius-sm); text-decoration:none;
                  color:rgba(255,255,255,0.65); font-size:13.5px; font-weight:500;
                  margin-bottom:2px; transition:all 0.2s; }
    .nav-item:hover  { background:rgba(255,255,255,0.1); color:white; }
    .nav-item.active { background:rgba(255,255,255,0.18); color:white; font-weight:600; }
    .nav-icon   { font-size:15px; width:18px; text-align:center; flex-shrink:0; }
    .sidebar-footer { padding:12px 10px; border-top:1px solid rgba(255,255,255,0.1); }
    .user-card  { display:flex; align-items:center; gap:10px; padding:10px;
                  border-radius:var(--radius-sm); background:rgba(255,255,255,0.08); }
    .user-avatar { width:34px; height:34px; background:rgba(255,255,255,0.2); border-radius:8px;
                   display:flex; align-items:center; justify-content:center;
                   font-size:13px; font-weight:700; color:white; flex-shrink:0;
                   overflow:hidden; }
    .user-avatar img { width:100%; height:100%; object-fit:cover; }
    .user-info  { flex:1; min-width:0; }
    .user-name  { font-size:12.5px; font-weight:600; color:white;
                  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .user-role  { font-size:10.5px; color:rgba(255,255,255,0.4); }
    .logout-btn { width:28px; height:28px; background:rgba(255,255,255,0.08); border:none;
                  border-radius:6px; color:rgba(255,255,255,0.5); cursor:pointer;
                  display:flex; align-items:center; justify-content:center;
                  font-size:13px; text-decoration:none; transition:all 0.2s; flex-shrink:0; }
    .logout-btn:hover { background:rgba(255,80,80,0.2); color:#ff8080; }

    /* ─── MAIN ─── */
    .main    { margin-left:256px; flex:1; display:flex; flex-direction:column; }
    .topbar  { height:64px; background:var(--blanc); border-bottom:1px solid var(--bordure);
               display:flex; align-items:center; justify-content:space-between;
               padding:0 28px; position:sticky; top:0; z-index:100; gap:12px; }
    .topbar-left  { display:flex; align-items:center; gap:14px; }
    .topbar-title { font-family:'Fraunces',serif; font-size:19px; font-weight:600; color:var(--texte); }
    .topbar-sub   { font-size:12px; color:var(--texte-soft); margin-top:1px; }
    .datetime-pill { background:var(--violet-clair); padding:7px 16px; border-radius:22px;
                     font-size:12.5px; font-weight:600; color:var(--violet); white-space:nowrap; }
    .menu-toggle  { display:none; background:none; border:none; font-size:20px;
                    cursor:pointer; color:var(--texte); padding:4px; flex-shrink:0; }
    .content { padding:28px; }

    /* ─── STATS ─── */
    .stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:24px; }
    .stat-card  { background:var(--blanc); border-radius:var(--radius); padding:20px 22px;
                  border:1px solid var(--bordure); box-shadow:var(--shadow-sm); }
    .stat-val   { font-family:'Fraunces',serif; font-size:32px; font-weight:600; line-height:1; }
    .stat-lbl   { font-size:12px; color:var(--texte-soft); margin-top:6px; font-weight:500; }
    .stat-icon  { font-size:22px; margin-bottom:10px; }
    .stat-card.violet .stat-val { color:var(--violet); }
    .stat-card.vert   .stat-val { color:var(--vert); }
    .stat-card.bleu   .stat-val { color:var(--bleu); }

    /* ─── QUICK ACTIONS ─── */
    .quick-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; margin-bottom:28px; }
    .quick-card { background:var(--blanc); border-radius:var(--radius); padding:18px 12px;
                  text-align:center; text-decoration:none; color:var(--texte);
                  border:1px solid var(--bordure); transition:all 0.2s; box-shadow:var(--shadow-sm); }
    .quick-card:hover { border-color:var(--violet);
                        box-shadow:0 0 0 3px var(--violet-glow), var(--shadow-md);
                        transform:translateY(-2px); }
    .quick-icon  { font-size:24px; margin-bottom:8px; }
    .quick-label { font-size:12px; font-weight:600; color:var(--texte); }

    /* ─── GRID 2 COL ─── */
    .grid2       { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
    .section-box { background:var(--blanc); border-radius:var(--radius);
                   border:1px solid var(--bordure); overflow:hidden; box-shadow:var(--shadow-sm); }
    .section-head { padding:16px 20px; background:var(--violet);
                    display:flex; justify-content:space-between; align-items:center; }
    .section-head h3 { font-size:14px; font-weight:600; color:white; }
    .section-head a  { font-size:12px; color:rgba(255,255,255,0.7); text-decoration:none;
                       padding:4px 10px; border-radius:6px; background:rgba(255,255,255,0.12); }
    .section-head a:hover { background:rgba(255,255,255,0.22); color:white; }

    /* ─── RDV ─── */
    .rdv-item { padding:13px 20px; border-bottom:1px solid #f5f0f9;
                display:flex; align-items:center; gap:14px; }
    .rdv-item:last-child { border-bottom:none; }
    .rdv-heure { font-size:15px; font-weight:700; color:var(--violet); min-width:46px;
                 font-family:'Fraunces',serif; flex-shrink:0; }
    .rdv-info  { flex:1; min-width:0; }
    .rdv-info strong { display:block; font-size:13px; font-weight:600; white-space:nowrap;
                       overflow:hidden; text-overflow:ellipsis; }
    .rdv-info span   { font-size:11px; color:var(--texte-soft); }
    .rdv-badge { padding:3px 10px; border-radius:20px; font-size:10.5px; font-weight:600;
                 white-space:nowrap; flex-shrink:0; }
    .rdv-badge.planifie { background:#ede7f6; color:var(--violet); }
    .rdv-badge.confirme { background:#e8f5e9; color:var(--vert); }
    .rdv-badge.passe    { background:#f5f5f5; color:#9e9e9e; }
    .rdv-badge.absent   { background:#fff3e0; color:#e65100; }
    .rdv-badge.annule   { background:#fce8e8; color:#b71c1c; }

    /* ─── CONSULTATIONS ─── */
    .consult-item { padding:13px 20px; border-bottom:1px solid #f5f0f9; }
    .consult-item:last-child { border-bottom:none; }
    .ci-top     { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:3px; }
    .ci-patient { font-size:13px; font-weight:600; }
    .ci-date    { font-size:11px; color:var(--texte-soft); flex-shrink:0; margin-left:8px; }
    .ci-motif   { font-size:12px; color:var(--texte-soft); }
    .ci-diag    { font-size:12px; color:var(--violet); margin-top:3px; font-weight:500; }

    .empty     { padding:24px; text-align:center; color:var(--texte-soft); font-size:13px; font-style:italic; }
    .voir-plus { display:block; text-align:center; padding:12px; font-size:12px;
                 color:var(--violet); text-decoration:none; border-top:1px solid var(--bordure);
                 font-weight:500; transition:background .15s; }
    .voir-plus:hover { background:var(--violet-clair); }

    .overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:150; }
    .overlay.open { display:block; }

    @media (max-width:1200px) { .quick-grid { grid-template-columns:repeat(3,1fr); } }
    @media (max-width:900px)  { .grid2 { grid-template-columns:1fr; } .stats-grid { grid-template-columns:1fr 1fr; } }
    @media (max-width:768px) {
      .sidebar { transform:translateX(-100%); }
      .sidebar.open { transform:translateX(0); }
      .main { margin-left:0; }
      .menu-toggle { display:flex; }
      .content { padding:16px; }
      .quick-grid { grid-template-columns:repeat(3,1fr); }
      .stats-grid { grid-template-columns:1fr; }
      .datetime-pill { display:none; }
    }
    @media (max-width:480px) { .quick-grid { grid-template-columns:repeat(2,1fr); } }
  </style>
</head>
<body>
<div class="layout">

  <!-- ─── SIDEBAR ─── -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-brand">
      <div class="brand-row">
        <div class="brand-icon">&#x1F3E5;</div>
        <div class="brand-name">Sant&#xe9;BF</div>
      </div>
      <div class="brand-sub">Espace m&#xe9;dical</div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-label">Tableau de bord</div>
      <a href="/dashboard/medecin" class="nav-item active">
        <span class="nav-icon">&#x229E;</span> Accueil
      </a>

      <div class="nav-label">Patients</div>
      <a href="/medecin/patients" class="nav-item">
        <span class="nav-icon">&#x1F50D;</span> Mes patients
      </a>
      <a href="/medecin/consultations/nouvelle" class="nav-item">
        <span class="nav-icon">&#x1F4CB;</span> Nouvelle consultation
      </a>
      <a href="/medecin/ordonnances/nouvelle" class="nav-item">
        <span class="nav-icon">&#x1F48A;</span> Ordonnance
      </a>
      <a href="/medecin/examens/nouveau" class="nav-item">
        <span class="nav-icon">&#x1F9EA;</span> Prescrire examen
      </a>

      <div class="nav-label">Agenda</div>
      <a href="/medecin/rdv" class="nav-item">
        <span class="nav-icon">&#x1F4C5;</span> Planning RDV
      </a>
      <a href="/medecin/rdv/nouveau" class="nav-item">
        <span class="nav-icon">&#x2795;</span> Nouveau RDV
      </a>

      <div class="nav-label">Clinique</div>
      <a href="/medecin/hospitalisations/nouvelle" class="nav-item">
        <span class="nav-icon">&#x1F6CF;&#xFE0F;</span> Hospitaliser
      </a>
      <a href="/medecin/grossesse/nouvelle" class="nav-item">
        <span class="nav-icon">&#x1FAC3;</span> Grossesse / CPN
      </a>
      <a href="/medecin/suivi-chronique/nouveau" class="nav-item">
        <span class="nav-icon">&#x1F4C8;</span> Suivi chronique
      </a>

      <div class="nav-label">Documents</div>
      <a href="/medecin/documents/upload" class="nav-item">
        <span class="nav-icon">&#x1F4C4;</span> Ajouter document
      </a>
      <a href="/laboratoire" class="nav-item">
        <span class="nav-icon">&#x1F52C;</span> Laboratoire
      </a>

      <div class="nav-label">Mon compte</div>
      <a href="/medecin/profil" class="nav-item">
        <span class="nav-icon">&#x1F464;</span> Mon profil
      </a>
      <a href="/profil/changer-mdp" class="nav-item">
        <span class="nav-icon">&#x1F512;</span> Mot de passe
      </a>
    </nav>

    <div class="sidebar-footer">
      <div class="user-card">
        <div class="user-avatar">
          ${avatarUrl ? `<img src="${avatarUrl}" alt="avatar">` : initiales}
        </div>
        <div class="user-info">
          <div class="user-name">Dr. ${esc(profil.prenom)} ${esc(profil.nom)}</div>
          <div class="user-role">${esc(profil.role.replace(/_/g, ' '))}</div>
        </div>
        <a href="/auth/logout" class="logout-btn" title="D&#xe9;connexion">&#x23FB;</a>
      </div>
    </div>
  </aside>

  <div class="overlay" id="overlay" onclick="closeSidebar()"></div>

  <!-- ─── MAIN ─── -->
  <div class="main">

    <header class="topbar">
      <div class="topbar-left">
        <button class="menu-toggle" onclick="toggleSidebar()">&#x2630;</button>
        <div>
          <div class="topbar-title">Bonjour, Dr.&#xa0;${esc(profil.prenom)}&#xa0;&#x1F44B;</div>
          <div class="topbar-sub">${data.rdvJour.length} rendez-vous aujourd&#x27;hui</div>
        </div>
      </div>
      <div class="datetime-pill">&#x1F550;&#xa0;${heure}&#xa0;&#x2014;&#xa0;${date}</div>
    </header>

    <div class="content">

      <!-- STATS DU JOUR -->
      <div class="stats-grid">
        <div class="stat-card violet">
          <div class="stat-icon">&#x1F4CB;</div>
          <div class="stat-val">${data.statsJour.consultationsJour}</div>
          <div class="stat-lbl">Consultations aujourd&#x27;hui</div>
        </div>
        <div class="stat-card vert">
          <div class="stat-icon">&#x1F4C5;</div>
          <div class="stat-val">${data.statsJour.rdvAVenir}</div>
          <div class="stat-lbl">RDV &#xe0; venir</div>
        </div>
        <div class="stat-card bleu">
          <div class="stat-icon">&#x1F48A;</div>
          <div class="stat-val">${data.statsJour.ordonnancesActives}</div>
          <div class="stat-lbl">Ordonnances actives &#xe9;mises</div>
        </div>
      </div>

      <!-- ACTIONS RAPIDES -->
      <div class="quick-grid">
        <a href="/medecin/patients" class="quick-card">
          <div class="quick-icon">&#x1F50D;</div>
          <div class="quick-label">Mes patients</div>
        </a>
        <a href="/medecin/consultations/nouvelle" class="quick-card">
          <div class="quick-icon">&#x1F4CB;</div>
          <div class="quick-label">Consultation</div>
        </a>
        <a href="/medecin/ordonnances/nouvelle" class="quick-card">
          <div class="quick-icon">&#x1F48A;</div>
          <div class="quick-label">Ordonnance</div>
        </a>
        <a href="/medecin/rdv" class="quick-card">
          <div class="quick-icon">&#x1F4C5;</div>
          <div class="quick-label">Planning</div>
        </a>
        <a href="/medecin/examens/nouveau" class="quick-card">
          <div class="quick-icon">&#x1F9EA;</div>
          <div class="quick-label">Examen</div>
        </a>
        <a href="/medecin/grossesse/nouvelle" class="quick-card">
          <div class="quick-icon">&#x1FAC3;</div>
          <div class="quick-label">Grossesse</div>
        </a>
      </div>

      <!-- RDV + CONSULTATIONS -->
      <div class="grid2">

        <div class="section-box">
          <div class="section-head">
            <h3>&#x1F4C5;&#xa0;RDV aujourd&#x27;hui (${data.rdvJour.length})</h3>
            <a href="/medecin/rdv">Voir tout &#x2192;</a>
          </div>
          ${rdvItems}
          <a href="/medecin/rdv/nouveau" class="voir-plus">+ Nouveau rendez-vous</a>
        </div>

        <div class="section-box">
          <div class="section-head">
            <h3>&#x1F4CB;&#xa0;Consultations r&#xe9;centes</h3>
            <a href="/medecin/consultations">Voir tout &#x2192;</a>
          </div>
          ${consultItems}
          <a href="/medecin/consultations/nouvelle" class="voir-plus">+ Nouvelle consultation</a>
        </div>

      </div>

      <!-- ACCES RAPIDE URGENCE -->
      <div style="background:white;border-radius:var(--radius);border:1px solid var(--bordure);
        padding:20px 24px;box-shadow:var(--shadow-sm);margin-top:4px">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <span style="font-size:24px">&#x1F6A8;</span>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:700;color:#E65100">Acc&#xe8;s urgence sans consentement</div>
            <div style="font-size:12px;color:var(--texte-soft)">Utilisez le code urgence 6 chiffres du patient</div>
          </div>
          <a href="/medecin/patients" style="background:#E65100;color:white;padding:10px 20px;
            border-radius:10px;font-size:13px;font-weight:600;text-decoration:none">
            &#x1F50D; Acc&#xe9;der au formulaire
          </a>
        </div>
      </div>

    </div>
  </div>
</div>

<script>
  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
  }
</script>
</body>
</html>`
}
