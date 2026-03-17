/**
 * src/pages/dashboard-patient.ts
 * Dashboard patient — mobile-first, responsive, complet
 */

// ── PAGE SANS DOSSIER (patient inscrit seul, pas encore lié à un hôpital)
export function dashboardPatientSansDossierPage(profil: any): string {
  const initiales = `${(profil.prenom||'?').charAt(0)}${(profil.nom||'?').charAt(0)}`
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mon espace — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
  <style>
    :root{--bleu:#1565C0;--bleu-clair:#e3f2fd;--vert:#1A6B3C;--vert-clair:#e8f5ee;--texte:#0f1923;--soft:#5a6a78;--bg:#f0f4f8;--blanc:#fff;--bordure:#dde3ea;--radius:16px;--radius-sm:10px;}
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);}
    .topbar{background:linear-gradient(135deg,#0d47a1,var(--bleu));padding:0 20px;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
    .brand{font-family:'Fraunces',serif;font-size:20px;color:white;text-decoration:none;}
    .topbar-right{display:flex;align-items:center;gap:10px;}
    .avatar-top{width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:white;}
    .name-top{font-size:13px;color:rgba(255,255,255,0.9);font-weight:600;}
    .btn-out{background:rgba(255,255,255,0.15);border:none;color:white;padding:7px 12px;border-radius:8px;font-size:12px;cursor:pointer;text-decoration:none;}
    .hero{background:linear-gradient(135deg,#0d47a1,var(--bleu));padding:32px 20px 70px;position:relative;}
    .hero::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:50px;background:var(--bg);border-radius:30px 30px 0 0;}
    .hero h1{font-family:'Fraunces',serif;font-size:26px;color:white;margin-bottom:6px;}
    .hero p{font-size:14px;color:rgba(255,255,255,0.75);}
    .content{padding:0 20px;max-width:560px;margin:0 auto;padding-bottom:40px;}
    .card{background:var(--blanc);border-radius:var(--radius);padding:24px;box-shadow:0 4px 20px rgba(0,0,0,0.08);margin-bottom:14px;}
    .card-first{margin-top:-30px;position:relative;z-index:1;}
    .card h2{font-family:'Fraunces',serif;font-size:18px;margin-bottom:14px;}
    .step{display:flex;align-items:flex-start;gap:14px;padding:12px 0;border-bottom:1px solid var(--bordure);}
    .step:last-child{border-bottom:none;}
    .step-num{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0;}
    .s-done{background:var(--vert);color:white;}
    .s-next{background:#f59e0b;color:white;}
    .s-wait{background:#e0e0e0;color:#888;}
    .step-text strong{display:block;font-size:14px;margin-bottom:2px;}
    .step-text span{font-size:12.5px;color:var(--soft);}
    .email-box{background:var(--bleu-clair);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:14px;font-size:13px;color:#1a3a6b;}
    .email-box strong{display:block;font-size:15px;color:var(--bleu);margin-top:4px;}
    .btn-out-full{display:block;text-align:center;background:var(--blanc);border:1.5px solid var(--bordure);color:var(--texte);padding:13px;border-radius:var(--radius-sm);font-size:14px;font-weight:600;text-decoration:none;font-family:inherit;}
  </style>
</head>
<body>
  <div class="topbar">
    <a href="/dashboard/patient" class="brand">🏥 SantéBF</a>
    <div class="topbar-right">
      <div class="name-top">${profil.prenom}</div>
      <div class="avatar-top">${initiales}</div>
      <a href="/auth/logout" class="btn-out">⏻ Déconnexion</a>
    </div>
  </div>

  <div class="hero">
    <h1>Bienvenue, ${profil.prenom} ! 👋</h1>
    <p>Votre compte est créé. Une dernière étape pour voir votre dossier médical.</p>
  </div>

  <div class="content">
    <div class="card card-first">
      <h2>📋 Comment accéder à votre dossier</h2>
      <div class="step">
        <div class="step-num s-done">✅</div>
        <div class="step-text">
          <strong>Compte créé</strong>
          <span>Votre compte SantéBF est actif — c'est fait !</span>
        </div>
      </div>
      <div class="step">
        <div class="step-num s-next">2</div>
        <div class="step-text">
          <strong>Aller à l'accueil d'une structure SantéBF</strong>
          <span>Présentez votre email à l'agent d'accueil d'un hôpital ou clinique SantéBF.</span>
        </div>
      </div>
      <div class="step">
        <div class="step-num s-wait">3</div>
        <div class="step-text">
          <strong>Accès à votre dossier médical</strong>
          <span>L'agent lie votre compte à votre dossier. Vos données apparaissent ici.</span>
        </div>
      </div>
    </div>

    <div class="email-box">
      ℹ️ Email à présenter à l'accueil :
      <strong>${profil.email || 'Non disponible'}</strong>
    </div>

    <a href="/auth/logout" class="btn-out-full">Se déconnecter</a>
  </div>
</body>
</html>`
}


// ── PAGE DASHBOARD PATIENT COMPLET
export function dashboardPatientPage(profil: any, data: {
  dossier: any
  prochainRdv: any
  ordonnancesActives: number
  consultationsTotal: number
  medecins?: any[]
  examens?: any[]
}): string {
  const { dossier, prochainRdv, ordonnancesActives, consultationsTotal } = data
  const medecins  = data.medecins  ?? []
  const examens   = data.examens   ?? []

  const heure = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })
  const initiales = `${(profil.prenom||'?').charAt(0)}${(profil.nom||'?').charAt(0)}`
  const avatarUrl = profil.avatar_url || ''
  const allergies: any[] = Array.isArray(dossier.allergies) ? dossier.allergies : []
  const maladies: any[]  = Array.isArray(dossier.maladies_chroniques) ? dossier.maladies_chroniques : []

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
      --or:#f59e0b;
      --texte:#0f1923;--soft:#5a6a78;--bg:#f0f4f8;--blanc:#fff;--bordure:#dde3ea;
      --shadow-sm:0 1px 4px rgba(0,0,0,0.06);
      --shadow-md:0 4px 20px rgba(0,0,0,0.09);
      --radius:16px;--radius-sm:10px;
    }
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    html{scroll-behavior:smooth;}
    body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);padding-bottom:90px;}

    /* TOPBAR */
    .topbar{background:linear-gradient(135deg,var(--bleu-fonce),var(--bleu));height:60px;padding:0 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200;box-shadow:0 2px 12px rgba(21,101,192,0.3);}
    .brand{font-family:'Fraunces',serif;font-size:20px;color:white;text-decoration:none;}
    .topbar-right{display:flex;align-items:center;gap:10px;}
    .topbar-name{font-size:13px;color:rgba(255,255,255,0.9);font-weight:600;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .topbar-avatar{width:36px;height:36px;border-radius:50%;border:2px solid rgba(255,255,255,0.35);overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.2);font-size:14px;font-weight:700;color:white;cursor:pointer;flex-shrink:0;}
    .topbar-avatar img{width:100%;height:100%;object-fit:cover;}
    .btn-logout{background:rgba(255,255,255,0.15);border:none;color:white;padding:7px 12px;border-radius:8px;font-size:12px;cursor:pointer;text-decoration:none;font-family:inherit;transition:background .2s;}
    .btn-logout:hover{background:rgba(255,255,255,0.25);}

    /* HERO */
    .hero{background:linear-gradient(135deg,var(--bleu-fonce),var(--bleu));padding:22px 20px 62px;position:relative;overflow:hidden;}
    .hero::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:52px;background:var(--bg);border-radius:30px 30px 0 0;}
    .hero-top{display:flex;align-items:center;gap:16px;}
    .hero-avatar{width:60px;height:60px;border-radius:50%;border:3px solid rgba(255,255,255,0.3);overflow:hidden;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:white;flex-shrink:0;cursor:pointer;}
    .hero-avatar img{width:100%;height:100%;object-fit:cover;}
    .hero-info{flex:1;}
    .hero-greeting{font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:2px;}
    .hero-name{font-family:'Fraunces',serif;font-size:22px;color:white;margin-bottom:2px;}
    .hero-date{font-size:11.5px;color:rgba(255,255,255,0.6);}
    .hero-num{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.15);border-radius:20px;padding:5px 12px;font-size:12px;color:rgba(255,255,255,0.9);margin-top:10px;font-family:monospace;}

    /* CONTENT */
    .content{padding:0 16px;max-width:640px;margin:0 auto;}

    /* BOUTON RETOUR */
    .back-btn{display:inline-flex;align-items:center;gap:7px;background:var(--blanc);border:1px solid var(--bordure);color:var(--texte);padding:8px 14px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;text-decoration:none;box-shadow:var(--shadow-sm);margin:16px 0 8px;transition:all .2s;}
    .back-btn:hover{background:var(--bleu-clair);border-color:var(--bleu);color:var(--bleu);}

    /* STATS */
    .stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0;}
    .stat-card{background:var(--blanc);border-radius:var(--radius-sm);padding:16px;box-shadow:var(--shadow-sm);text-align:center;}
    .stat-icon{font-size:24px;margin-bottom:6px;}
    .stat-val{font-family:'Fraunces',serif;font-size:30px;color:var(--bleu);}
    .stat-lbl{font-size:11.5px;color:var(--soft);margin-top:2px;}

    /* RDV CARD */
    .rdv-card{background:linear-gradient(135deg,var(--bleu),#1976d2);border-radius:var(--radius);padding:20px;color:white;margin:14px 0;box-shadow:0 4px 16px rgba(21,101,192,0.25);}
    .rdv-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:.7;margin-bottom:8px;}
    .rdv-date{font-size:17px;font-weight:700;margin-bottom:3px;}
    .rdv-medecin{font-size:14px;opacity:.9;margin-bottom:2px;}
    .rdv-motif{font-size:12px;opacity:.7;}
    .rdv-vide{font-size:14px;opacity:.8;text-align:center;padding:6px 0;}
    .btn-white{display:block;background:rgba(255,255,255,0.18);color:white;text-align:center;padding:10px;border-radius:var(--radius-sm);text-decoration:none;font-size:13px;font-weight:600;margin-top:14px;border:1px solid rgba(255,255,255,0.3);}

    /* SECTION TITLE */
    .sec-title{font-family:'Fraunces',serif;font-size:16px;color:var(--texte);margin:20px 0 10px;}

    /* ACTIONS GRID */
    .actions-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
    .action-card{background:var(--blanc);border-radius:var(--radius-sm);padding:18px 12px;text-align:center;text-decoration:none;color:var(--texte);box-shadow:var(--shadow-sm);transition:transform .2s,box-shadow .2s;display:flex;flex-direction:column;align-items:center;gap:7px;border-bottom:3px solid var(--bleu);}
    .action-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-md);}
    .action-icon{font-size:28px;}
    .action-lbl{font-size:12.5px;font-weight:700;}
    .action-count{font-size:11px;color:var(--soft);}

    /* CARD SECTION */
    .card-sec{background:var(--blanc);border-radius:var(--radius);padding:18px;margin-bottom:12px;box-shadow:var(--shadow-sm);}
    .card-sec-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
    .card-sec-title{font-size:14px;font-weight:700;display:flex;align-items:center;gap:7px;}
    .card-sec-link{font-size:12px;color:var(--bleu);text-decoration:none;font-weight:600;}

    /* MÉDECINS */
    .medecin-item{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--bordure);}
    .medecin-item:last-child{border-bottom:none;}
    .med-avatar{width:44px;height:44px;border-radius:50%;background:var(--vert-clair);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:var(--vert);flex-shrink:0;overflow:hidden;}
    .med-avatar img{width:100%;height:100%;object-fit:cover;}
    .med-info{flex:1;}
    .med-name{font-size:14px;font-weight:700;}
    .med-spec{font-size:12px;color:var(--soft);}
    .med-struct{font-size:11px;color:var(--bleu);margin-top:2px;}
    .badge-ok{background:var(--vert-clair);color:var(--vert);padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;}

    /* EXAMENS */
    .examen-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--bordure);}
    .examen-item:last-child{border-bottom:none;}
    .ex-icon{font-size:22px;width:30px;text-align:center;flex-shrink:0;}
    .ex-info{flex:1;}
    .ex-type{font-size:13px;font-weight:600;}
    .ex-date{font-size:11.5px;color:var(--soft);}
    .badge-dispo{background:var(--vert-clair);color:var(--vert);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;}
    .badge-wait{background:#fff8e6;color:#7a5500;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;}

    /* TAGS */
    .tags{display:flex;flex-wrap:wrap;gap:6px;}
    .tag-rouge{background:var(--rouge-clair);color:var(--rouge);border-radius:20px;padding:5px 12px;font-size:12px;font-weight:600;}
    .tag-or{background:#fff8e6;color:#7a5500;border-radius:20px;padding:5px 12px;font-size:12px;font-weight:600;}

    /* BOTTOM NAV */
    .bottom-nav{position:fixed;bottom:0;left:0;right:0;background:var(--blanc);border-top:1px solid var(--bordure);display:flex;z-index:150;box-shadow:0 -4px 16px rgba(0,0,0,0.07);padding-bottom:env(safe-area-inset-bottom);}
    .nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;padding:10px 4px 8px;text-decoration:none;color:var(--soft);font-size:10px;font-weight:600;gap:3px;border:none;background:none;cursor:pointer;font-family:inherit;transition:color .2s;}
    .nav-btn.active,.nav-btn:hover{color:var(--bleu);}
    .nav-icon{font-size:22px;}

    /* MODAL PHOTO */
    .modal-bg{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:500;align-items:flex-end;justify-content:center;}
    .modal-bg.open{display:flex;}
    .modal{background:var(--blanc);border-radius:20px 20px 0 0;padding:28px 22px;width:100%;max-width:480px;}
    .modal-title{font-family:'Fraunces',serif;font-size:20px;margin-bottom:5px;}
    .modal-sub{font-size:13px;color:var(--soft);margin-bottom:18px;}
    .ph-preview{width:80px;height:80px;border-radius:50%;background:var(--bleu-clair);margin:0 auto 16px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;color:var(--bleu);}
    .ph-preview img{width:100%;height:100%;object-fit:cover;}
    .file-zone{border:2px dashed var(--bordure);border-radius:var(--radius-sm);padding:16px;text-align:center;cursor:pointer;margin-bottom:14px;transition:all .2s;}
    .file-zone:hover{border-color:var(--bleu);background:var(--bleu-clair);}
    .file-zone input{display:none;}
    .fz-title{font-size:13px;font-weight:600;margin-bottom:2px;}
    .fz-sub{font-size:11.5px;color:var(--soft);}
    .pb{display:none;height:5px;background:var(--bordure);border-radius:10px;overflow:hidden;margin-bottom:14px;}
    .pb-fill{height:100%;background:var(--bleu);border-radius:10px;transition:width .3s;}
    .msg-ok{background:var(--vert-clair);color:var(--vert);border-radius:var(--radius-sm);padding:9px;font-size:13px;font-weight:600;display:none;margin-bottom:12px;text-align:center;}
    .msg-ko{background:var(--rouge-clair);color:var(--rouge);border-radius:var(--radius-sm);padding:9px;font-size:13px;display:none;margin-bottom:12px;}
    .modal-btns{display:flex;gap:10px;}
    .btn-cancel{flex:1;background:var(--bg);color:var(--texte);border:1px solid var(--bordure);padding:12px;border-radius:var(--radius-sm);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;}
    .btn-save{flex:2;background:var(--bleu);color:white;border:none;padding:12px;border-radius:var(--radius-sm);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;}
    .btn-save:disabled{opacity:.5;cursor:not-allowed;}

    /* RESPONSIVE DESKTOP */
    @media(min-width:640px){
      .content{padding:0 24px;}
      .stats-grid{grid-template-columns:repeat(4,1fr);}
      .actions-grid{grid-template-columns:repeat(3,1fr);}
      .bottom-nav{display:none;}
      body{padding-bottom:24px;}
      .modal{border-radius:var(--radius);}
      .modal-bg{align-items:center;padding:20px;}
    }
  </style>
</head>
<body>

  <!-- TOPBAR -->
  <div class="topbar">
    <a href="/dashboard/patient" class="brand">🏥 SantéBF</a>
    <div class="topbar-right">
      <div class="topbar-name">${profil.prenom}</div>
      <div class="topbar-avatar" onclick="ouvrirPhoto()" title="Changer ma photo">
        ${avatarUrl ? `<img src="${avatarUrl}" alt="Photo">` : initiales}
      </div>
      <a href="/auth/logout" class="btn-logout">⏻</a>
    </div>
  </div>

  <!-- HERO -->
  <div class="hero">
    <div class="hero-top">
      <div class="hero-avatar" onclick="ouvrirPhoto()">
        ${avatarUrl ? `<img src="${avatarUrl}" alt="Photo">` : initiales}
      </div>
      <div class="hero-info">
        <div class="hero-greeting">Bonjour 👋</div>
        <div class="hero-name">${profil.prenom} ${profil.nom}</div>
        <div class="hero-date">${date} · ${heure}</div>
      </div>
    </div>
    <div class="hero-num">🪪 ${dossier.numero_national || 'N/A'}</div>
  </div>

  <div class="content">

    <!-- STATS -->
    <div class="stats-grid">
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

    <!-- PROCHAIN RDV -->
    ${prochainRdv ? `
    <div class="rdv-card">
      <div class="rdv-label">📅 Prochain rendez-vous</div>
      <div class="rdv-date">${new Date(prochainRdv.date_heure).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})} à ${new Date(prochainRdv.date_heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
      <div class="rdv-medecin">Dr. ${prochainRdv.medecin?.prenom||''} ${prochainRdv.medecin?.nom||''}</div>
      ${prochainRdv.motif ? `<div class="rdv-motif">${prochainRdv.motif}</div>` : ''}
      <a href="/patient/rdv" class="btn-white">Voir tous mes rendez-vous →</a>
    </div>
    ` : `
    <div class="rdv-card">
      <div class="rdv-label">📅 Prochain rendez-vous</div>
      <div class="rdv-vide">Aucun rendez-vous programmé</div>
      <a href="/patient/rdv" class="btn-white">Prendre un rendez-vous →</a>
    </div>
    `}

    <!-- ACTIONS -->
    <div class="sec-title">Accès rapide</div>
    <div class="actions-grid">
      <a href="/patient/dossier" class="action-card">
        <span class="action-icon">📋</span>
        <span class="action-lbl">Mon dossier</span>
      </a>
      <a href="/patient-pdf/ordonnances" class="action-card">
        <span class="action-icon">💊</span>
        <span class="action-lbl">Ordonnances</span>
        ${ordonnancesActives > 0 ? `<span class="action-count">${ordonnancesActives} active(s)</span>` : ''}
      </a>
      <a href="/patient/rdv" class="action-card">
        <span class="action-icon">📅</span>
        <span class="action-lbl">Rendez-vous</span>
      </a>
      <a href="/patient-pdf/examens" class="action-card">
        <span class="action-icon">🧪</span>
        <span class="action-lbl">Mes examens</span>
      </a>
      <a href="/patient/vaccinations" class="action-card">
        <span class="action-icon">💉</span>
        <span class="action-lbl">Vaccinations</span>
      </a>
      <a href="/patient/consentements" class="action-card">
        <span class="action-icon">🔐</span>
        <span class="action-lbl">Consentements</span>
      </a>
    </div>

    <!-- EXAMENS RÉCENTS -->
    ${examens.length > 0 ? `
    <div class="card-sec">
      <div class="card-sec-hd">
        <div class="card-sec-title">🧪 Derniers examens</div>
        <a href="/patient-pdf/examens" class="card-sec-link">Tout voir →</a>
      </div>
      ${examens.slice(0,3).map((e:any)=>`
        <div class="examen-item">
          <div class="ex-icon">${e.type_categorie==='radiologie'?'🖼️':'🔬'}</div>
          <div class="ex-info">
            <div class="ex-type">${e.type_examen||e.nom_examen||'Examen'}</div>
            <div class="ex-date">${new Date(e.created_at).toLocaleDateString('fr-FR')}</div>
          </div>
          ${(e.statut==='resultat_disponible'||e.valide_par)?`<span class="badge-dispo">✅ Disponible</span>`:`<span class="badge-wait">⏳ En attente</span>`}
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- MES MÉDECINS -->
    ${medecins.length > 0 ? `
    <div class="sec-title">👨‍⚕️ Mes médecins autorisés</div>
    <div class="card-sec">
      ${medecins.map((m:any)=>`
        <div class="medecin-item">
          <div class="med-avatar">
            ${m.avatar_url?`<img src="${m.avatar_url}" alt="">`:`${(m.prenom||'?').charAt(0)}${(m.nom||'?').charAt(0)}`}
          </div>
          <div class="med-info">
            <div class="med-name">Dr. ${m.prenom} ${m.nom}</div>
            <div class="med-spec">${m.specialite||'Médecin généraliste'}</div>
            ${m.structure?`<div class="med-struct">${m.structure}</div>`:''}
          </div>
          <span class="badge-ok">✅ Autorisé</span>
        </div>
      `).join('')}
      <a href="/patient/consentements" style="display:block;text-align:center;margin-top:12px;font-size:13px;color:var(--bleu);text-decoration:none;font-weight:600;">Gérer les accès →</a>
    </div>
    ` : `
    <div class="sec-title">👨‍⚕️ Mes médecins autorisés</div>
    <div class="card-sec" style="text-align:center;color:var(--soft);font-size:13px;padding:24px;">
      Aucun médecin autorisé pour le moment.<br>
      <a href="/patient/consentements" style="color:var(--bleu);font-weight:600;">Gérer les autorisations →</a>
    </div>
    `}

    <!-- DONNÉES MÉDICALES -->
    ${allergies.length > 0 ? `
    <div class="card-sec">
      <div class="card-sec-hd"><div class="card-sec-title">⚠️ Mes allergies</div></div>
      <div class="tags">
        ${allergies.map((a:any)=>`<span class="tag-rouge">⚠️ ${a.substance||a}</span>`).join('')}
      </div>
    </div>
    ` : ''}

    ${maladies.length > 0 ? `
    <div class="card-sec">
      <div class="card-sec-hd"><div class="card-sec-title">🩺 Maladies chroniques</div></div>
      <div class="tags">
        ${maladies.map((m:any)=>`<span class="tag-or">💊 ${m.maladie||m}</span>`).join('')}
      </div>
    </div>
    ` : ''}

    <!-- GROUPE SANGUIN -->
    ${dossier.groupe_sanguin ? `
    <div class="card-sec" style="display:flex;align-items:center;gap:16px;">
      <div style="font-size:36px;">🩸</div>
      <div>
        <div style="font-size:12px;color:var(--soft);font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Groupe sanguin</div>
        <div style="font-size:28px;font-weight:700;color:var(--rouge);">${dossier.groupe_sanguin}${dossier.rhesus||''}</div>
      </div>
    </div>
    ` : ''}

  </div><!-- /content -->

  <!-- BOTTOM NAV MOBILE -->
  <nav class="bottom-nav">
    <a href="/dashboard/patient" class="nav-btn active">
      <span class="nav-icon">🏠</span>Accueil
    </a>
    <a href="/patient/dossier" class="nav-btn">
      <span class="nav-icon">📋</span>Dossier
    </a>
    <a href="/patient-pdf/ordonnances" class="nav-btn">
      <span class="nav-icon">💊</span>Ordonnances
    </a>
    <a href="/patient/rdv" class="nav-btn">
      <span class="nav-icon">📅</span>RDV
    </a>
    <button class="nav-btn" onclick="ouvrirPhoto()">
      <span class="nav-icon">👤</span>Profil
    </button>
  </nav>

  <!-- MODAL PHOTO -->
  <div class="modal-bg" id="modalPhoto">
    <div class="modal">
      <div class="modal-title">📷 Ma photo</div>
      <div class="modal-sub">Choisissez une photo claire de votre visage.</div>
      <div class="ph-preview" id="phPreview">
        ${avatarUrl?`<img src="${avatarUrl}" alt="">`:`${initiales}`}
      </div>
      <div class="msg-ok" id="msgOk">✅ Photo mise à jour !</div>
      <div class="msg-ko" id="msgKo">❌ Erreur. Réessayez.</div>
      <div class="file-zone" onclick="document.getElementById('fileInput').click()">
        <div class="fz-title">📁 Cliquer pour choisir</div>
        <div class="fz-sub">JPG, PNG ou WEBP · Max 5 Mo</div>
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
    let sel=null
    function ouvrirPhoto(){document.getElementById('modalPhoto').classList.add('open')}
    function fermerPhoto(){document.getElementById('modalPhoto').classList.remove('open');sel=null;document.getElementById('fileInput').value='';document.getElementById('btnSave').disabled=true;document.getElementById('msgOk').style.display='none';document.getElementById('msgKo').style.display='none'}
    document.getElementById('modalPhoto').addEventListener('click',e=>{if(e.target===document.getElementById('modalPhoto'))fermerPhoto()})

    function previewPhoto(input){
      const f=input.files[0];if(!f)return
      if(f.size>5*1024*1024){document.getElementById('msgKo').textContent='❌ Fichier trop lourd (max 5 Mo)';document.getElementById('msgKo').style.display='block';return}
      sel=f
      const r=new FileReader();r.onload=e=>{document.getElementById('phPreview').innerHTML='<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'}
      r.readAsDataURL(f)
      document.getElementById('btnSave').disabled=false
    }

    async function uploadPhoto(){
      if(!sel)return
      const btn=document.getElementById('btnSave'),pb=document.getElementById('pb'),fill=document.getElementById('pbFill')
      btn.disabled=true;btn.textContent='⏳ Envoi...'
      pb.style.display='block';fill.style.width='40%'
      try{
        const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(sel)})
        fill.style.width='75%'
        const resp=await fetch('/profil/avatar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fichier:b64,type:sel.type,nom:sel.name})})
        fill.style.width='100%'
        if(!resp.ok)throw new Error('Erreur')
        document.getElementById('msgOk').style.display='block'
        btn.textContent='✅ Enregistrée'
        setTimeout(()=>{fermerPhoto();window.location.reload()},1500)
      }catch(e){
        fill.style.width='0%';pb.style.display='none'
        document.getElementById('msgKo').style.display='block'
        btn.disabled=false;btn.textContent='⬆️ Réessayer'
      }
    }
  </script>
</body>
</html>`
}
