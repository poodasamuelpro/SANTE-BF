/**
 * src/pages/dashboard-patient.ts
 * Layout : sidebar fixe sur PC/tablette, bottom nav sur mobile
 */

// ── PAGE SANS DOSSIER ──────────────────────────────────────────
export function dashboardPatientSansDossierPage(profil: any): string {
  const initiales = `${(profil.prenom||'?').charAt(0)}${(profil.nom||'?').charAt(0)}`
  const avatarUrl = profil.avatar_url || ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mon espace — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
  <style>
    :root{--bleu:#1565C0;--bleu-fonce:#0d47a1;--bleu-clair:#e3f2fd;--vert:#1A6B3C;--vert-clair:#e8f5ee;--texte:#0f1923;--soft:#5a6a78;--bg:#f0f4f8;--blanc:#fff;--bordure:#dde3ea;--radius:16px;--radius-sm:10px;}
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);}

    /* ── LAYOUT ── */
    .layout{display:flex;min-height:100vh;}

    /* ── SIDEBAR (PC/tablette) ── */
    .sidebar{width:240px;background:linear-gradient(180deg,var(--bleu-fonce),var(--bleu));display:flex;flex-direction:column;padding:24px 16px;flex-shrink:0;position:sticky;top:0;height:100vh;}
    .sb-brand{font-family:'Fraunces',serif;font-size:22px;color:white;margin-bottom:28px;display:flex;align-items:center;gap:10px;text-decoration:none;}
    .sb-avatar{width:64px;height:64px;border-radius:50%;border:3px solid rgba(255,255,255,0.3);overflow:hidden;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:white;margin:0 auto 10px;cursor:pointer;}
    .sb-avatar img{width:100%;height:100%;object-fit:cover;}
    .sb-name{text-align:center;font-size:14px;font-weight:700;color:white;margin-bottom:4px;}
    .sb-role{text-align:center;font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:24px;}
    .sb-nav{flex:1;display:flex;flex-direction:column;gap:4px;}
    .sb-link{display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600;color:rgba(255,255,255,0.8);transition:all .2s;}
    .sb-link:hover,.sb-link.active{background:rgba(255,255,255,0.15);color:white;}
    .sb-link .icon{font-size:18px;width:22px;text-align:center;}
    .sb-bottom{margin-top:auto;padding-top:16px;border-top:1px solid rgba(255,255,255,0.15);}
    .sb-logout{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);transition:all .2s;}
    .sb-logout:hover{background:rgba(255,0,0,0.15);color:white;}

    /* ── MAIN ── */
    .main{flex:1;display:flex;flex-direction:column;min-width:0;}
    .topbar{background:var(--blanc);border-bottom:1px solid var(--bordure);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 1px 4px rgba(0,0,0,0.06);}
    .topbar-left{display:flex;align-items:center;gap:12px;}
    .menu-btn{display:none;background:none;border:none;font-size:22px;cursor:pointer;padding:4px;}
    .topbar-title{font-size:15px;font-weight:700;color:var(--texte);}
    .topbar-right{display:flex;align-items:center;gap:12px;}
    .topbar-name{font-size:13px;font-weight:600;color:var(--soft);}
    .content{padding:28px;flex:1;}
    .content-inner{max-width:720px;}

    /* ── HERO SANS DOSSIER ── */
    .hero-card{background:linear-gradient(135deg,var(--bleu-fonce),var(--bleu));border-radius:var(--radius);padding:32px;color:white;margin-bottom:20px;}
    .hero-card h1{font-family:'Fraunces',serif;font-size:26px;margin-bottom:8px;}
    .hero-card p{font-size:14px;opacity:.85;line-height:1.6;}
    .steps-card{background:var(--blanc);border-radius:var(--radius);padding:24px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);}
    .step{display:flex;align-items:flex-start;gap:14px;padding:12px 0;border-bottom:1px solid var(--bordure);}
    .step:last-child{border-bottom:none;}
    .step-num{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;flex-shrink:0;}
    .s-done{background:var(--vert);color:white;}
    .s-next{background:#f59e0b;color:white;}
    .s-wait{background:#e5e7eb;color:#888;}
    .step strong{display:block;font-size:14px;margin-bottom:2px;}
    .step span{font-size:12.5px;color:var(--soft);}
    .email-box{background:var(--bleu-clair);border-left:4px solid var(--bleu);border-radius:var(--radius-sm);padding:14px 16px;font-size:13px;color:#1a3a6b;}
    .email-box strong{display:block;font-size:15px;color:var(--bleu);margin-top:4px;}

    /* ── MOBILE ── */
    @media(max-width:768px){
      .sidebar{display:none;}
      .topbar{padding:0 16px;}
      .topbar .topbar-title{font-size:14px;}
      .menu-btn{display:block;}
      .content{padding:16px;}
      body{padding-bottom:70px;}
      .bottom-nav{display:flex;}
    }
    .bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--blanc);border-top:1px solid var(--bordure);z-index:150;box-shadow:0 -2px 10px rgba(0,0,0,0.07);}
    .nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;padding:9px 4px 7px;text-decoration:none;color:var(--soft);font-size:10px;font-weight:600;gap:2px;border:none;background:none;cursor:pointer;font-family:inherit;}
    .nav-btn.active,.nav-btn:hover{color:var(--bleu);}
    .nav-icon{font-size:20px;}

    /* SIDEBAR MOBILE OVERLAY */
    .sb-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;}
    .sb-overlay.open{display:block;}
    .sb-mobile{position:fixed;left:0;top:0;bottom:0;width:260px;background:linear-gradient(180deg,var(--bleu-fonce),var(--bleu));z-index:201;padding:24px 16px;transform:translateX(-100%);transition:transform .3s;display:flex;flex-direction:column;}
    .sb-mobile.open{transform:translateX(0);}
  </style>
</head>
<body>
<div class="layout">

  <!-- SIDEBAR PC -->
  <aside class="sidebar">
    <a href="/dashboard/patient" class="sb-brand">🏥 SantéBF</a>
    <div class="sb-avatar" onclick="ouvrirPhoto()">
      ${avatarUrl ? `<img src="${avatarUrl}" alt="Photo">` : initiales}
    </div>
    <div class="sb-name">${profil.prenom} ${profil.nom}</div>
    <div class="sb-role">Patient</div>
    <nav class="sb-nav">
      <a href="/dashboard/patient" class="sb-link active"><span class="icon">🏠</span> Tableau de bord</a>
      <a href="/patient/dossier"   class="sb-link"><span class="icon">📋</span> Mon dossier</a>
      <a href="/patient-pdf/ordonnances" class="sb-link"><span class="icon">💊</span> Ordonnances</a>
      <a href="/patient/rdv"       class="sb-link"><span class="icon">📅</span> Rendez-vous</a>
      <a href="/patient-pdf/examens" class="sb-link"><span class="icon">🧪</span> Examens</a>
      <a href="/patient/vaccinations" class="sb-link"><span class="icon">💉</span> Vaccinations</a>
      <a href="/patient/consentements" class="sb-link"><span class="icon">🔐</span> Consentements</a>
      <a href="/patient/profil"    class="sb-link"><span class="icon">👤</span> Mon profil</a>
    </nav>
    <div class="sb-bottom">
      <a href="/auth/logout" class="sb-logout"><span class="icon">⏻</span> Déconnexion</a>
    </div>
  </aside>

  <!-- MAIN -->
  <div class="main">
    <div class="topbar">
      <div class="topbar-left">
        <button class="menu-btn" onclick="toggleMenu()">☰</button>
        <span class="topbar-title">Mon espace</span>
      </div>
      <div class="topbar-right">
        <span class="topbar-name">${profil.prenom} ${profil.nom}</span>
        <a href="/auth/logout" style="font-size:12px;color:var(--soft);text-decoration:none;">⏻</a>
      </div>
    </div>

    <div class="content">
      <div class="content-inner">
        <div class="hero-card">
          <h1>Bienvenue, ${profil.prenom} ! 👋</h1>
          <p>Votre compte SantéBF est créé. Il ne reste qu'une étape pour accéder à votre dossier médical complet.</p>
        </div>

        <div class="steps-card">
          <div style="font-size:15px;font-weight:700;margin-bottom:14px;">📋 Comment accéder à votre dossier</div>
          <div class="step"><div class="step-num s-done">✅</div><div><strong>Compte créé</strong><span>Votre compte SantéBF est actif.</span></div></div>
          <div class="step"><div class="step-num s-next">2</div><div><strong>Aller à l'accueil d'une structure SantéBF</strong><span>Donnez votre email à l'agent d'accueil.</span></div></div>
          <div class="step"><div class="step-num s-wait">3</div><div><strong>Accès à votre dossier médical</strong><span>L'agent lie votre compte. Vos données apparaissent ici.</span></div></div>
        </div>

        <div class="email-box">
          ℹ️ Email à communiquer à l'accueil :
          <strong>${profil.email || 'Non disponible'}</strong>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- BOTTOM NAV MOBILE -->
<nav class="bottom-nav">
  <a href="/dashboard/patient" class="nav-btn active"><span class="nav-icon">🏠</span>Accueil</a>
  <a href="/patient/dossier" class="nav-btn"><span class="nav-icon">📋</span>Dossier</a>
  <a href="/patient/rdv" class="nav-btn"><span class="nav-icon">📅</span>RDV</a>
  <a href="/patient/profil" class="nav-btn"><span class="nav-icon">👤</span>Profil</a>
</nav>

<!-- SIDEBAR MOBILE -->
<div class="sb-overlay" id="overlay" onclick="toggleMenu()"></div>
<div class="sb-mobile" id="sbMobile">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
    <span style="font-family:'Fraunces',serif;font-size:18px;color:white;">SantéBF</span>
    <button onclick="toggleMenu()" style="background:none;border:none;color:white;font-size:22px;cursor:pointer;">✕</button>
  </div>
  <nav style="display:flex;flex-direction:column;gap:4px;">
    <a href="/dashboard/patient" class="sb-link active"><span class="icon">🏠</span> Tableau de bord</a>
    <a href="/patient/dossier"   class="sb-link"><span class="icon">📋</span> Mon dossier</a>
    <a href="/patient-pdf/ordonnances" class="sb-link"><span class="icon">💊</span> Ordonnances</a>
    <a href="/patient/rdv"       class="sb-link"><span class="icon">📅</span> Rendez-vous</a>
    <a href="/patient-pdf/examens" class="sb-link"><span class="icon">🧪</span> Examens</a>
    <a href="/patient/vaccinations" class="sb-link"><span class="icon">💉</span> Vaccinations</a>
    <a href="/patient/consentements" class="sb-link"><span class="icon">🔐</span> Consentements</a>
    <a href="/patient/profil"    class="sb-link"><span class="icon">👤</span> Mon profil</a>
  </nav>
  <div style="margin-top:auto;padding-top:16px;border-top:1px solid rgba(255,255,255,0.15);">
    <a href="/auth/logout" class="sb-logout"><span class="icon">⏻</span> Déconnexion</a>
  </div>
</div>

<script>

  // Mode sombre
  function toggleDark(){
    const html = document.documentElement
    const isDark = html.getAttribute('data-theme') === 'dark'
    html.setAttribute('data-theme', isDark ? 'light' : 'dark')
    document.getElementById('darkBtn').textContent = isDark ? '🌙' : '☀️'
    localStorage.setItem('santebf-theme', isDark ? 'light' : 'dark')
  }
  // Restaurer préférence
  const savedTheme = localStorage.getItem('santebf-theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  if(savedTheme === 'dark'){
    document.documentElement.setAttribute('data-theme','dark')
    setTimeout(()=>{const b=document.getElementById('darkBtn');if(b)b.textContent='☀️'},0)
  }

  function toggleMenu(){
    document.getElementById('overlay').classList.toggle('open')
    document.getElementById('sbMobile').classList.toggle('open')
  }
</script>
</body></html>`
}


// ── PAGE DASHBOARD COMPLET ─────────────────────────────────────
export function dashboardPatientPage(profil: any, data: {
  dossier: any
  prochainRdv: any
  ordonnancesActives: number
  consultationsTotal: number
  medecins?: any[]
  examens?: any[]
}): string {
  const { dossier, prochainRdv, ordonnancesActives, consultationsTotal } = data
  const medecins = data.medecins ?? []
  const examens  = data.examens  ?? []

  const heure = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })
  const initiales = `${(profil.prenom||'?').charAt(0)}${(profil.nom||'?').charAt(0)}`
  const avatarUrl = profil.avatar_url || ''
  const allergies: any[] = Array.isArray(dossier.allergies) ? dossier.allergies : []
  const maladies:  any[] = Array.isArray(dossier.maladies_chroniques) ? dossier.maladies_chroniques : []

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Mon espace — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
  <style>
    :root{
      --bleu:#1565C0;--bleu-fonce:#0d47a1;--bleu-clair:#e3f2fd;
      --vert:#1A6B3C;--vert-clair:#e8f5ee;
      --rouge:#b71c1c;--rouge-clair:#fce8e8;
      --or:#f59e0b;--or-clair:#fff8e6;
      --texte:#0f1923;--soft:#5a6a78;--bg:#f0f4f8;--blanc:#fff;--bordure:#dde3ea;
      --shadow:0 2px 10px rgba(0,0,0,0.07);
      --radius:16px;--radius-sm:10px;
    }
    /* ══ MODE SOMBRE ══ */
    [data-theme="dark"] {
      --bg:#0f172a;--blanc:#1e293b;--bordure:#334155;
      --texte:#f1f5f9;--soft:#94a3b8;
      --shadow:0 2px 10px rgba(0,0,0,0.3);
    }
    [data-theme="dark"] .sidebar{background:linear-gradient(180deg,#020617,#0f172a);}
    [data-theme="dark"] .topbar{background:linear-gradient(135deg,#020617,#0f172a);}
    [data-theme="dark"] .hero-card{background:linear-gradient(135deg,#020617,#0d47a1);}
    [data-theme="dark"] .rdv-card{background:linear-gradient(135deg,#0d47a1,#1565C0);}
    [data-theme="dark"] .sb-drawer{background:linear-gradient(180deg,#020617,#0f172a);}

    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    html{scroll-behavior:smooth;}
    body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);}

    /* ══ LAYOUT PRINCIPAL ══ */
    .layout{display:flex;min-height:100vh;}

    /* ══ SIDEBAR (PC ≥ 769px) ══ */
    .sidebar{
      width:250px;flex-shrink:0;
      background:linear-gradient(180deg,var(--bleu-fonce) 0%,var(--bleu) 100%);
      display:flex;flex-direction:column;
      padding:20px 14px;
      position:sticky;top:0;height:100vh;
      overflow-y:auto;
    }
    .sb-brand{font-family:'Fraunces',serif;font-size:20px;color:white;text-decoration:none;display:flex;align-items:center;gap:8px;margin-bottom:24px;}
    .sb-user{text-align:center;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.15);}
    .sb-avatar{
      width:68px;height:68px;border-radius:50%;
      border:3px solid rgba(255,255,255,0.3);
      overflow:hidden;background:rgba(255,255,255,0.2);
      display:flex;align-items:center;justify-content:center;
      font-size:24px;font-weight:700;color:white;
      margin:0 auto 10px;cursor:pointer;
      transition:border-color .2s;
    }
    .sb-avatar:hover{border-color:rgba(255,255,255,0.6);}
    .sb-avatar img{width:100%;height:100%;object-fit:cover;}
    .sb-name{font-size:14px;font-weight:700;color:white;margin-bottom:2px;}
    .sb-num{font-size:11px;color:rgba(255,255,255,0.55);font-family:monospace;}
    .sb-nav{flex:1;display:flex;flex-direction:column;gap:2px;}
    .sb-link{
      display:flex;align-items:center;gap:10px;
      padding:10px 13px;border-radius:10px;
      text-decoration:none;font-size:13px;font-weight:600;
      color:rgba(255,255,255,0.75);
      transition:all .2s;
    }
    .sb-link:hover,.sb-link.active{background:rgba(255,255,255,0.15);color:white;}
    .sb-link .ico{font-size:17px;width:20px;text-align:center;}
    .sb-bottom{margin-top:auto;padding-top:14px;border-top:1px solid rgba(255,255,255,0.12);}
    .sb-logout{display:flex;align-items:center;gap:10px;padding:10px 13px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600;color:rgba(255,255,255,0.6);transition:all .2s;}
    .sb-logout:hover{background:rgba(255,80,80,0.2);color:white;}

    /* ══ MAIN ══ */
    .main{flex:1;display:flex;flex-direction:column;min-width:0;}

    /* ══ TOPBAR ══ */
    .topbar{
      background:var(--blanc);border-bottom:1px solid var(--bordure);
      height:56px;padding:0 24px;
      display:flex;align-items:center;justify-content:space-between;
      position:sticky;top:0;z-index:100;
      box-shadow:0 1px 4px rgba(0,0,0,0.05);
    }
    .topbar-left{display:flex;align-items:center;gap:12px;}
    .menu-btn{display:none;background:none;border:none;font-size:22px;cursor:pointer;color:var(--texte);padding:4px;}
    .topbar-title{font-size:15px;font-weight:700;color:var(--texte);}
    .topbar-right{display:flex;align-items:center;gap:10px;}
    .topbar-date{font-size:12px;color:var(--soft);}
    .topbar-time{font-size:14px;font-weight:700;color:var(--bleu);}

    /* ══ CONTENT ══ */
    .content{padding:24px 28px;flex:1;}

    /* ══ GRILLE 2 COLONNES SUR PC ══ */
    .grid-main{display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start;}
    .col-left{display:flex;flex-direction:column;gap:16px;}
    .col-right{display:flex;flex-direction:column;gap:16px;}

    /* ══ CARDS ══ */
    .card{background:var(--blanc);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow);}
    .card-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
    .card-title{font-size:14px;font-weight:700;display:flex;align-items:center;gap:7px;}
    .card-link{font-size:12px;color:var(--bleu);text-decoration:none;font-weight:600;}
    .card-link:hover{text-decoration:underline;}

    /* ══ HERO CARD ══ */
    .hero-card{
      background:linear-gradient(135deg,var(--bleu-fonce),var(--bleu));
      border-radius:var(--radius);padding:24px;color:white;
    }
    .hero-greeting{font-size:12px;opacity:.7;margin-bottom:3px;}
    .hero-name{font-family:'Fraunces',serif;font-size:24px;margin-bottom:3px;}
    .hero-date{font-size:12px;opacity:.6;}
    .hero-num{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.15);border-radius:20px;padding:5px 12px;font-size:12px;font-family:monospace;margin-top:10px;}

    /* ══ STATS ══ */
    .stats-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
    .stat-card{background:var(--blanc);border-radius:var(--radius-sm);padding:16px;box-shadow:var(--shadow);text-align:center;}
    .stat-icon{font-size:22px;margin-bottom:5px;}
    .stat-val{font-family:'Fraunces',serif;font-size:28px;color:var(--bleu);}
    .stat-lbl{font-size:11.5px;color:var(--soft);margin-top:2px;}

    /* ══ RDV CARD ══ */
    .rdv-card{background:linear-gradient(135deg,var(--bleu),#1976d2);border-radius:var(--radius);padding:20px;color:white;}
    .rdv-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:.7;margin-bottom:8px;}
    .rdv-date{font-size:16px;font-weight:700;margin-bottom:3px;}
    .rdv-medecin{font-size:13px;opacity:.9;}
    .rdv-motif{font-size:12px;opacity:.7;margin-top:2px;}
    .rdv-vide{font-size:13px;opacity:.75;text-align:center;padding:6px 0;}
    .btn-white{display:block;background:rgba(255,255,255,0.18);color:white;text-align:center;padding:9px;border-radius:var(--radius-sm);text-decoration:none;font-size:12px;font-weight:700;margin-top:12px;border:1px solid rgba(255,255,255,0.3);}

    /* ══ ACTIONS ══ */
    .actions-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
    .action-card{background:var(--blanc);border-radius:var(--radius-sm);padding:16px 10px;text-align:center;text-decoration:none;color:var(--texte);box-shadow:var(--shadow);transition:transform .2s,box-shadow .2s;display:flex;flex-direction:column;align-items:center;gap:6px;border-bottom:3px solid var(--bleu);}
    .action-card:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,0.1);}
    .action-icon{font-size:26px;}
    .action-lbl{font-size:12px;font-weight:700;}
    .action-count{font-size:10.5px;color:var(--soft);}

    /* ══ MÉDECINS ══ */
    .medecin-item{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--bordure);}
    .medecin-item:last-child{border-bottom:none;}
    .med-av{width:40px;height:40px;border-radius:50%;background:var(--vert-clair);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--vert);flex-shrink:0;overflow:hidden;}
    .med-av img{width:100%;height:100%;object-fit:cover;}
    .med-info{flex:1;min-width:0;}
    .med-name{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .med-spec{font-size:11px;color:var(--soft);}
    .med-struct{font-size:11px;color:var(--bleu);}
    .badge-ok{background:var(--vert-clair);color:var(--vert);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;white-space:nowrap;}

    /* ══ EXAMENS ══ */
    .examen-item{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bordure);}
    .examen-item:last-child{border-bottom:none;}
    .ex-info{flex:1;}
    .ex-type{font-size:13px;font-weight:600;}
    .ex-date{font-size:11px;color:var(--soft);}
    .badge-dispo{background:var(--vert-clair);color:var(--vert);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;}
    .badge-wait{background:var(--or-clair);color:#7a5500;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;}

    /* ══ TAGS MÉDICAUX ══ */
    .tags{display:flex;flex-wrap:wrap;gap:6px;}
    .tag-rouge{background:var(--rouge-clair);color:var(--rouge);border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;}
    .tag-or{background:var(--or-clair);color:#7a5500;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;}

    /* ══ MODAL PHOTO ══ */
    .modal-bg{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:500;align-items:center;justify-content:center;padding:20px;}
    .modal-bg.open{display:flex;}
    .modal{background:var(--blanc);border-radius:var(--radius);padding:28px 24px;width:100%;max-width:420px;}
    .modal-title{font-family:'Fraunces',serif;font-size:20px;margin-bottom:5px;}
    .modal-sub{font-size:13px;color:var(--soft);margin-bottom:18px;}
    .ph-preview{width:80px;height:80px;border-radius:50%;background:var(--bleu-clair);margin:0 auto 16px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;color:var(--bleu);}
    .ph-preview img{width:100%;height:100%;object-fit:cover;}
    .file-zone{border:2px dashed var(--bordure);border-radius:var(--radius-sm);padding:16px;text-align:center;cursor:pointer;margin-bottom:14px;transition:all .2s;}
    .file-zone:hover{border-color:var(--bleu);background:var(--bleu-clair);}
    .file-zone input{display:none;}
    .pb{display:none;height:5px;background:var(--bordure);border-radius:10px;overflow:hidden;margin-bottom:14px;}
    .pb-fill{height:100%;background:var(--bleu);border-radius:10px;transition:width .3s;}
    .msg-ok{background:var(--vert-clair);color:var(--vert);border-radius:var(--radius-sm);padding:9px;font-size:13px;font-weight:600;display:none;margin-bottom:12px;text-align:center;}
    .msg-ko{background:var(--rouge-clair);color:var(--rouge);border-radius:var(--radius-sm);padding:9px;font-size:13px;display:none;margin-bottom:12px;}
    .modal-btns{display:flex;gap:10px;}
    .btn-cancel{flex:1;background:var(--bg);color:var(--texte);border:1px solid var(--bordure);padding:12px;border-radius:var(--radius-sm);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;}
    .btn-save{flex:2;background:var(--bleu);color:white;border:none;padding:12px;border-radius:var(--radius-sm);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;}
    .btn-save:disabled{opacity:.5;cursor:not-allowed;}

    /* ══ RESPONSIVE ══ */

    /* Tablette 769–1024px */
    @media(min-width:769px) and (max-width:1024px){
      .sidebar{width:200px;}
      .content{padding:18px 20px;}
      .grid-main{grid-template-columns:1fr 280px;}
      .actions-grid{grid-template-columns:repeat(2,1fr);}
    }

    /* Mobile ≤ 768px */
    @media(max-width:768px){
      .sidebar{display:none;}
      .menu-btn{display:block;}
      .topbar{padding:0 16px;}
      .content{padding:14px;}
      .grid-main{grid-template-columns:1fr;gap:12px;}
      .col-right{order:-1;}
      .stats-row{grid-template-columns:1fr 1fr;}
      .actions-grid{grid-template-columns:repeat(3,1fr);}
      body{padding-bottom:72px;}
      .bottom-nav{display:flex;}
    }

    /* Petit mobile ≤ 380px */
    @media(max-width:380px){
      .actions-grid{grid-template-columns:repeat(2,1fr);}
    }

    /* ══ BOTTOM NAV (mobile uniquement) ══ */
    .bottom-nav{
      display:none;
      position:fixed;bottom:0;left:0;right:0;
      background:var(--blanc);border-top:1px solid var(--bordure);
      z-index:150;box-shadow:0 -2px 10px rgba(0,0,0,0.07);
      padding-bottom:env(safe-area-inset-bottom);
    }
    .nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;padding:9px 4px 7px;text-decoration:none;color:var(--soft);font-size:10px;font-weight:600;gap:2px;border:none;background:none;cursor:pointer;font-family:inherit;transition:color .2s;}
    .nav-btn.active,.nav-btn:hover{color:var(--bleu);}
    .nav-icon{font-size:20px;}

    /* ══ SIDEBAR MOBILE (drawer) ══ */
    .sb-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;}
    .sb-overlay.open{display:block;}
    .sb-drawer{
      position:fixed;left:0;top:0;bottom:0;width:260px;
      background:linear-gradient(180deg,var(--bleu-fonce),var(--bleu));
      z-index:201;padding:20px 14px;
      transform:translateX(-100%);transition:transform .28s ease;
      display:flex;flex-direction:column;
    }
    .sb-drawer.open{transform:translateX(0);}
  </style>
</head>
<body>
<div class="layout">

  <!-- ══ SIDEBAR PC/TABLETTE ══ -->
  <aside class="sidebar">
    <a href="/dashboard/patient" class="sb-brand">🏥 SantéBF</a>
    <div class="sb-user">
      <div class="sb-avatar" onclick="ouvrirPhoto()">
        ${avatarUrl ? `<img src="${avatarUrl}" alt="Photo">` : initiales}
      </div>
      <div class="sb-name">${profil.prenom} ${profil.nom}</div>
      <div class="sb-num">${dossier.numero_national || ''}</div>
    </div>
    <nav class="sb-nav">
      <a href="/dashboard/patient"     class="sb-link active"><span class="ico">🏠</span>Tableau de bord</a>
      <a href="/patient/dossier"        class="sb-link"><span class="ico">📋</span>Mon dossier</a>
      <a href="/patient-pdf/ordonnances" class="sb-link"><span class="ico">💊</span>Ordonnances</a>
      <a href="/patient/rdv"            class="sb-link"><span class="ico">📅</span>Rendez-vous</a>
      <a href="/patient-pdf/examens"    class="sb-link"><span class="ico">🧪</span>Examens</a>
      <a href="/patient/vaccinations"   class="sb-link"><span class="ico">💉</span>Vaccinations</a>
      <a href="/patient/consentements"  class="sb-link"><span class="ico">🔐</span>Consentements</a>
      <a href="/patient/profil"         class="sb-link"><span class="ico">👤</span>Mon profil</a>
    </nav>
    <div class="sb-bottom">
      <a href="/auth/logout" class="sb-logout"><span class="ico">⏻</span>Déconnexion</a>
    </div>
  </aside>

  <!-- ══ MAIN ══ -->
  <div class="main">

    <!-- TOPBAR -->
    <div class="topbar">
      <div class="topbar-left">
        <button class="menu-btn" onclick="toggleMenu()">☰</button>
        <span class="topbar-title">Mon espace patient</span>
      </div>
      <div class="topbar-right">
        <span class="topbar-date">${date}</span>
        <span class="topbar-time">${heure}</span>
        <button onclick="toggleDark()" id="darkBtn" title="Mode sombre" style="background:none;border:1px solid var(--bordure);border-radius:8px;padding:5px 10px;font-size:16px;cursor:pointer;color:var(--texte);">🌙</button>
      </div>
    </div>

    <!-- CONTENT -->
    <div class="content">
      <div class="grid-main">

        <!-- COL GAUCHE -->
        <div class="col-left">

          <!-- Hero -->
          <div class="hero-card">
            <div class="hero-greeting">Bonjour 👋</div>
            <div class="hero-name">${profil.prenom} ${profil.nom}</div>
            <div class="hero-date">${date}</div>
            <div class="hero-num">🪪 ${dossier.numero_national || 'N/A'}</div>
          </div>

          <!-- Stats -->
          <div class="stats-row">
            <div class="stat-card">
              <div class="stat-icon">💊</div>
              <div class="stat-val">${ordonnancesActives}</div>
              <div class="stat-lbl">Ordonnances actives</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🩺</div>
              <div class="stat-val">${consultationsTotal}</div>
              <div class="stat-lbl">Consultations</div>
            </div>
          </div>

          <!-- Actions -->
          <div class="card">
            <div class="card-hd"><div class="card-title">⚡ Accès rapide</div></div>
            <div class="actions-grid">
              <a href="/patient/dossier" class="action-card">
                <span class="action-icon">📋</span><span class="action-lbl">Mon dossier</span>
              </a>
              <a href="/patient-pdf/ordonnances" class="action-card">
                <span class="action-icon">💊</span><span class="action-lbl">Ordonnances</span>
                ${ordonnancesActives > 0 ? `<span class="action-count">${ordonnancesActives} active(s)</span>` : ''}
              </a>
              <a href="/patient/rdv" class="action-card">
                <span class="action-icon">📅</span><span class="action-lbl">Rendez-vous</span>
              </a>
              <a href="/patient-pdf/examens" class="action-card">
                <span class="action-icon">🧪</span><span class="action-lbl">Examens</span>
              </a>
              <a href="/patient/vaccinations" class="action-card">
                <span class="action-icon">💉</span><span class="action-lbl">Vaccinations</span>
              </a>
              <a href="/patient/consentements" class="action-card">
                <span class="action-icon">🔐</span><span class="action-lbl">Consentements</span>
              </a>
              <a href="/patient/documents" class="action-card">
                <span class="action-icon">📁</span><span class="action-lbl">Documents</span>
              </a>
              <a href="/patient/factures" class="action-card">
                <span class="action-icon">🧾</span><span class="action-lbl">Factures</span>
              </a>
              <a href="/patient/profil" class="action-card" style="border-bottom-color:var(--soft);">
                <span class="action-icon">👤</span><span class="action-lbl">Mon profil</span>
              </a>
            </div>
          </div>

          <!-- Examens récents -->
          ${examens.length > 0 ? `
          <div class="card">
            <div class="card-hd">
              <div class="card-title">🧪 Derniers examens</div>
              <a href="/patient-pdf/examens" class="card-link">Voir tout →</a>
            </div>
            ${examens.slice(0,3).map((e:any) => `
              <div class="examen-item">
                <span style="font-size:20px;">${e.type_categorie==='radiologie'?'🖼️':'🔬'}</span>
                <div class="ex-info">
                  <div class="ex-type">${e.type_examen||e.nom_examen||'Examen'}</div>
                  <div class="ex-date">${new Date(e.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
                ${(e.statut==='resultat_disponible'||e.valide_par)
                  ? `<span class="badge-dispo">✅ Disponible</span>`
                  : `<span class="badge-wait">⏳ En attente</span>`}
              </div>`).join('')}
          </div>` : ''}

          <!-- Allergies & Maladies -->
          ${allergies.length > 0 ? `
          <div class="card">
            <div class="card-hd"><div class="card-title">⚠️ Allergies</div></div>
            <div class="tags">${allergies.map((a:any)=>`<span class="tag-rouge">⚠️ ${a.substance||a.nom||a}</span>`).join('')}</div>
          </div>` : ''}

          ${maladies.length > 0 ? `
          <div class="card">
            <div class="card-hd"><div class="card-title">🩺 Maladies chroniques</div></div>
            <div class="tags">${maladies.map((m:any)=>`<span class="tag-or">💊 ${m.maladie||m.nom||m}</span>`).join('')}</div>
          </div>` : ''}

        </div><!-- /col-left -->

        <!-- COL DROITE -->
        <div class="col-right">

          <!-- Prochain RDV -->
          ${prochainRdv ? `
          <div class="rdv-card">
            <div class="rdv-label">📅 Prochain rendez-vous</div>
            <div class="rdv-date">${new Date(prochainRdv.date_heure).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div>
            <div class="rdv-medecin">🕐 ${new Date(prochainRdv.date_heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})} · Dr. ${prochainRdv.medecin?.prenom||''} ${prochainRdv.medecin?.nom||''}</div>
            ${prochainRdv.motif ? `<div class="rdv-motif">${prochainRdv.motif}</div>` : ''}
            <a href="/patient/rdv" class="btn-white">Voir tous mes rendez-vous →</a>
          </div>` : `
          <div class="rdv-card">
            <div class="rdv-label">📅 Prochain rendez-vous</div>
            <div class="rdv-vide">Aucun rendez-vous programmé</div>
            <a href="/patient/rdv" class="btn-white">Voir mes rendez-vous →</a>
          </div>`}

          <!-- Groupe sanguin -->
          ${dossier.groupe_sanguin ? `
          <div class="card" style="display:flex;align-items:center;gap:14px;">
            <div style="font-size:32px;">🩸</div>
            <div>
              <div style="font-size:11px;color:var(--soft);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Groupe sanguin</div>
              <div style="font-size:26px;font-weight:700;color:var(--rouge);">${dossier.groupe_sanguin}${dossier.rhesus||''}</div>
            </div>
          </div>` : ''}

          <!-- Mes médecins -->
          ${medecins.length > 0 ? `
          <div class="card">
            <div class="card-hd">
              <div class="card-title">👨‍⚕️ Mes médecins</div>
              <a href="/patient/consentements" class="card-link">Gérer →</a>
            </div>
            ${medecins.slice(0,4).map((m:any) => `
              <div class="medecin-item">
                <div class="med-av">
                  ${m.avatar_url ? `<img src="${m.avatar_url}" alt="">` : `${(m.prenom||'?').charAt(0)}${(m.nom||'?').charAt(0)}`}
                </div>
                <div class="med-info">
                  <div class="med-name">Dr. ${m.prenom} ${m.nom}</div>
                  <div class="med-spec">${m.specialite||'Médecin généraliste'}</div>
                  ${m.structure ? `<div class="med-struct">🏥 ${m.structure}</div>` : ''}
                </div>
                <span class="badge-ok">✅</span>
              </div>`).join('')}
          </div>` : `
          <div class="card" style="text-align:center;padding:24px;color:var(--soft);">
            <div style="font-size:32px;margin-bottom:8px;">👨‍⚕️</div>
            <div style="font-size:13px;font-weight:600;margin-bottom:6px;">Aucun médecin autorisé</div>
            <a href="/patient/consentements" style="font-size:12px;color:var(--bleu);font-weight:700;text-decoration:none;">Gérer les accès →</a>
          </div>`}

        </div><!-- /col-right -->

      </div><!-- /grid-main -->
    </div><!-- /content -->
  </div><!-- /main -->
</div><!-- /layout -->

<!-- ══ BOTTOM NAV MOBILE ══ -->
<nav class="bottom-nav">
  <a href="/dashboard/patient" class="nav-btn active"><span class="nav-icon">🏠</span>Accueil</a>
  <a href="/patient/dossier" class="nav-btn"><span class="nav-icon">📋</span>Dossier</a>
  <a href="/patient-pdf/ordonnances" class="nav-btn"><span class="nav-icon">💊</span>Ordonnances</a>
  <a href="/patient/rdv" class="nav-btn"><span class="nav-icon">📅</span>RDV</a>
  <button class="nav-btn" onclick="ouvrirPhoto()"><span class="nav-icon">👤</span>Profil</button>
</nav>

<!-- ══ SIDEBAR DRAWER MOBILE ══ -->
<div class="sb-overlay" id="overlay" onclick="toggleMenu()"></div>
<div class="sb-drawer" id="drawer">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
    <span style="font-family:'Fraunces',serif;font-size:18px;color:white;">🏥 SantéBF</span>
    <button onclick="toggleMenu()" style="background:none;border:none;color:white;font-size:22px;cursor:pointer;">✕</button>
  </div>
  <div style="text-align:center;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.15);">
    <div style="width:56px;height:56px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);overflow:hidden;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:white;margin:0 auto 8px;">
      ${avatarUrl ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" alt="">` : initiales}
    </div>
    <div style="font-size:14px;font-weight:700;color:white;">${profil.prenom} ${profil.nom}</div>
  </div>
  <nav style="display:flex;flex-direction:column;gap:2px;flex:1;">
    <a href="/dashboard/patient"     class="sb-link active"><span class="ico">🏠</span>Tableau de bord</a>
    <a href="/patient/dossier"        class="sb-link"><span class="ico">📋</span>Mon dossier</a>
    <a href="/patient-pdf/ordonnances" class="sb-link"><span class="ico">💊</span>Ordonnances</a>
    <a href="/patient/rdv"            class="sb-link"><span class="ico">📅</span>Rendez-vous</a>
    <a href="/patient-pdf/examens"    class="sb-link"><span class="ico">🧪</span>Examens</a>
    <a href="/patient/vaccinations"   class="sb-link"><span class="ico">💉</span>Vaccinations</a>
    <a href="/patient/consentements"  class="sb-link"><span class="ico">🔐</span>Consentements</a>
    <a href="/patient/profil"         class="sb-link"><span class="ico">👤</span>Mon profil</a>
  </nav>
  <div style="padding-top:14px;border-top:1px solid rgba(255,255,255,0.12);">
    <a href="/auth/logout" class="sb-logout"><span class="ico">⏻</span>Déconnexion</a>
  </div>
</div>

<!-- ══ MODAL PHOTO ══ -->
<div class="modal-bg" id="modalPhoto">
  <div class="modal">
    <div class="modal-title">📷 Ma photo de profil</div>
    <div class="modal-sub">Choisissez une photo claire de votre visage.</div>
    <div class="ph-preview" id="phPreview">
      ${avatarUrl ? `<img src="${avatarUrl}" alt="">` : initiales}
    </div>
    <div class="msg-ok" id="msgOk">✅ Photo mise à jour !</div>
    <div class="msg-ko" id="msgKo">❌ Erreur. Réessayez.</div>
    <div class="file-zone" onclick="document.getElementById('fileInput').click()">
      <div style="font-size:13px;font-weight:600;margin-bottom:4px;">📁 Cliquer pour choisir une photo</div>
      <div style="font-size:11.5px;color:var(--soft);">JPG, PNG ou WEBP · Max 5 Mo</div>
      <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp" onchange="previewPhoto(this)">
    </div>
    <div class="pb" id="pb"><div class="pb-fill" id="pbFill" style="width:0%"></div></div>
    <div class="modal-btns">
      <button class="btn-cancel" onclick="fermerPhoto()">Annuler</button>
      <button class="btn-save" id="btnSave" onclick="uploadPhoto()" disabled>⬆️ Enregistrer</button>
    </div>
  </div>
</div>

<script>
  let sel = null

  // Menu drawer mobile
  function toggleMenu(){
    document.getElementById('overlay').classList.toggle('open')
    document.getElementById('drawer').classList.toggle('open')
  }

  // Modal photo
  function ouvrirPhoto(){ document.getElementById('modalPhoto').classList.add('open') }
  function fermerPhoto(){
    document.getElementById('modalPhoto').classList.remove('open')
    sel = null
    document.getElementById('fileInput').value = ''
    document.getElementById('btnSave').disabled = true
    document.getElementById('msgOk').style.display = 'none'
    document.getElementById('msgKo').style.display = 'none'
  }
  document.getElementById('modalPhoto').addEventListener('click', e => {
    if(e.target === document.getElementById('modalPhoto')) fermerPhoto()
  })

  function previewPhoto(input){
    const f = input.files[0]
    if(!f) return
    if(f.size > 5*1024*1024){
      document.getElementById('msgKo').textContent = '❌ Fichier trop lourd (max 5 Mo)'
      document.getElementById('msgKo').style.display = 'block'
      return
    }
    sel = f
    const r = new FileReader()
    r.onload = e => {
      document.getElementById('phPreview').innerHTML = '<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
    }
    r.readAsDataURL(f)
    document.getElementById('btnSave').disabled = false
    document.getElementById('msgOk').style.display = 'none'
    document.getElementById('msgKo').style.display = 'none'
  }

  async function uploadPhoto(){
    if(!sel) return
    const btn = document.getElementById('btnSave')
    const pb  = document.getElementById('pb')
    const fill= document.getElementById('pbFill')
    btn.disabled = true
    btn.textContent = '⏳ Envoi...'
    pb.style.display = 'block'
    fill.style.width = '40%'
    try {
      const b64 = await new Promise((res,rej) => {
        const r = new FileReader()
        r.onload = e => res(e.target.result.split(',')[1])
        r.onerror = rej
        r.readAsDataURL(sel)
      })
      fill.style.width = '75%'
      const resp = await fetch('/profil/avatar', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({fichier: b64, type: sel.type, nom: sel.name})
      })
      fill.style.width = '100%'
      if(!resp.ok) throw new Error('Erreur '+resp.status)
      document.getElementById('msgOk').style.display = 'block'
      btn.textContent = '✅ Enregistrée'
      setTimeout(() => { fermerPhoto(); window.location.reload() }, 1500)
    } catch(e){
      fill.style.width = '0%'
      pb.style.display = 'none'
      document.getElementById('msgKo').style.display = 'block'
      btn.disabled = false
      btn.textContent = '⬆️ Réessayer'
    }
  }
</script>
</body></html>`
}
