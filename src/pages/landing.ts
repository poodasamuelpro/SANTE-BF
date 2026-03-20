/**
 * src/pages/landing.ts
 * SantéBF — Page d'accueil publique (marketing)
 * Route : GET / dans public.ts (route publique sans auth) 
 *
 * Design : responsive, moderne, professionnel
 * Sections : Hero, Stats, Fonctionnalités, Plans, Apps, Contact
 */
export function landingPage(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="SantéBF — Le système national de santé numérique du Burkina Faso. Dossier médical partagé, ordonnances numériques, téléconsultation.">
<title>SantéBF — Santé Numérique Burkina Faso</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">
<style>
:root{
  --vert:#1A6B3C;--vert-f:#0d4a2a;--vert-c:#e8f5ee;--vert-m:#2E8B57;
  --or:#C9A84C;--or-c:#fdf6e3;
  --texte:#0f1923;--soft:#5a6a78;--bg:#f8faf8;--blanc:#fff;--bordure:#e2e8e4;
  --sh:0 4px 24px rgba(0,0,0,.07);--r:16px;--rs:10px;
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html{scroll-behavior:smooth;}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--texte);line-height:1.6;}

/* ── NAV ──────────────────────────────────────────────────── */
nav{position:fixed;top:0;left:0;right:0;z-index:1000;background:rgba(255,255,255,.92);
  backdrop-filter:blur(12px);border-bottom:1px solid var(--bordure);
  height:64px;display:flex;align-items:center;padding:0 max(24px, calc(50% - 580px));}
.nav-inner{display:flex;align-items:center;justify-content:space-between;width:100%;max-width:1160px;margin:0 auto;}
.nav-brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.nav-logo{width:38px;height:38px;background:var(--vert);border-radius:10px;
  display:flex;align-items:center;justify-content:center;font-size:20px;}
.nav-name{font-family:'Fraunces',serif;font-size:20px;color:var(--texte);}
.nav-links{display:flex;align-items:center;gap:28px;}
.nav-links a{font-size:14px;font-weight:600;color:var(--soft);text-decoration:none;transition:color .2s;}
.nav-links a:hover{color:var(--vert);}
.nav-cta{display:flex;gap:10px;align-items:center;}
.btn-outline{padding:9px 18px;border:2px solid var(--vert);color:var(--vert);border-radius:var(--rs);
  font-size:14px;font-weight:700;text-decoration:none;transition:all .2s;}
.btn-outline:hover{background:var(--vert);color:white;}
.btn-solid{padding:9px 18px;background:var(--vert);color:white;border-radius:var(--rs);
  font-size:14px;font-weight:700;text-decoration:none;transition:background .2s;}
.btn-solid:hover{background:var(--vert-f);}
.menu-btn{display:none;background:none;border:none;font-size:24px;cursor:pointer;color:var(--texte);}

/* ── HERO ─────────────────────────────────────────────────── */
.hero{
  background:linear-gradient(135deg, var(--vert-f) 0%, var(--vert) 50%, var(--vert-m) 100%);
  min-height:100vh;display:flex;align-items:center;padding:100px max(24px, calc(50% - 580px)) 80px;
  position:relative;overflow:hidden;
}
.hero::before{content:'';position:absolute;width:600px;height:600px;border-radius:50%;
  background:rgba(255,255,255,.03);top:-200px;right:-200px;}
.hero::after{content:'';position:absolute;width:400px;height:400px;border-radius:50%;
  background:rgba(255,255,255,.03);bottom:-150px;left:-100px;}
.hero-inner{max-width:1160px;margin:0 auto;width:100%;display:grid;
  grid-template-columns:1fr 1fr;gap:60px;align-items:center;position:relative;z-index:1;}
.hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.15);
  color:white;padding:7px 14px;border-radius:20px;font-size:12px;font-weight:700;
  letter-spacing:.5px;text-transform:uppercase;margin-bottom:20px;}
.hero h1{font-family:'Fraunces',serif;font-size:clamp(32px, 5vw, 54px);color:white;
  line-height:1.15;margin-bottom:18px;}
.hero h1 em{font-style:italic;color:rgba(255,255,255,.75);}
.hero p{font-size:17px;color:rgba(255,255,255,.8);max-width:480px;margin-bottom:32px;line-height:1.7;}
.hero-btns{display:flex;gap:14px;flex-wrap:wrap;}
.hero-btn-main{padding:16px 28px;background:white;color:var(--vert);border-radius:var(--r);
  font-size:15px;font-weight:800;text-decoration:none;transition:all .2s;
  box-shadow:0 4px 16px rgba(0,0,0,.15);}
.hero-btn-main:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.2);}
.hero-btn-sec{padding:16px 28px;background:rgba(255,255,255,.15);color:white;
  border:2px solid rgba(255,255,255,.4);border-radius:var(--r);font-size:15px;font-weight:700;
  text-decoration:none;transition:all .2s;}
.hero-btn-sec:hover{background:rgba(255,255,255,.25);}

/* Hero image/mockup */
.hero-visual{display:flex;flex-direction:column;gap:14px;align-items:center;}
.mockup-card{background:white;border-radius:20px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.25);
  width:100%;max-width:320px;}
.mc-header{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.mc-av{width:40px;height:40px;border-radius:50%;background:var(--vert-c);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--vert);}
.mc-info{flex:1;}
.mc-name{font-size:13px;font-weight:700;color:var(--texte);}
.mc-sub{font-size:11px;color:var(--soft);}
.mc-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;
  border-bottom:1px solid #F0F0F0;font-size:13px;}
.mc-row:last-child{border-bottom:none;}
.mc-lbl{color:var(--soft);font-size:12px;}
.mc-val{font-weight:700;}
.badge-pill{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;
  background:var(--vert-c);color:var(--vert);}
.floating-notif{background:white;border-radius:12px;padding:12px 16px;
  box-shadow:0 8px 32px rgba(0,0,0,.15);display:flex;align-items:center;gap:10px;
  align-self:flex-end;margin-right:20px;max-width:280px;}
.fn-ico{font-size:20px;}
.fn-text{font-size:12px;font-weight:600;color:var(--texte);}
.fn-sub{font-size:11px;color:var(--soft);}

/* ── STATS ────────────────────────────────────────────────── */
.stats{background:white;padding:48px max(24px, calc(50% - 580px));border-bottom:1px solid var(--bordure);}
.stats-inner{max-width:1160px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:32px;}
.stat-item{text-align:center;}
.stat-num{font-family:'Fraunces',serif;font-size:42px;color:var(--vert);margin-bottom:4px;}
.stat-lbl{font-size:14px;color:var(--soft);font-weight:500;}

/* ── SECTIONS communes ────────────────────────────────────── */
section{padding:80px max(24px, calc(50% - 580px));}
.section-inner{max-width:1160px;margin:0 auto;}
.section-badge{display:inline-block;background:var(--vert-c);color:var(--vert);
  padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;
  letter-spacing:.5px;text-transform:uppercase;margin-bottom:14px;}
.section-title{font-family:'Fraunces',serif;font-size:clamp(26px, 4vw, 40px);
  margin-bottom:14px;line-height:1.2;}
.section-sub{font-size:16px;color:var(--soft);max-width:560px;line-height:1.7;}

/* ── FONCTIONNALITÉS ──────────────────────────────────────── */
.features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:48px;}
.feat-card{background:white;border-radius:var(--r);padding:28px;border:1px solid var(--bordure);
  box-shadow:var(--sh);transition:transform .2s,box-shadow .2s;}
.feat-card:hover{transform:translateY(-4px);box-shadow:0 12px 40px rgba(0,0,0,.1);}
.feat-ico{width:52px;height:52px;background:var(--vert-c);border-radius:14px;
  display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:16px;}
.feat-title{font-size:17px;font-weight:700;margin-bottom:8px;}
.feat-desc{font-size:14px;color:var(--soft);line-height:1.6;}
.feat-tag{display:inline-block;margin-top:12px;font-size:11px;font-weight:700;
  color:var(--vert);background:var(--vert-c);padding:3px 10px;border-radius:20px;}

/* ── POUR QUI ─────────────────────────────────────────────── */
.targets{background:linear-gradient(135deg, var(--vert-f), var(--vert));padding:80px max(24px, calc(50% - 580px));}
.targets-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:48px;}
.target-card{background:rgba(255,255,255,.1);backdrop-filter:blur(8px);
  border:1px solid rgba(255,255,255,.2);border-radius:var(--r);padding:28px;color:white;}
.target-ico{font-size:36px;margin-bottom:14px;}
.target-title{font-family:'Fraunces',serif;font-size:20px;margin-bottom:10px;}
.target-desc{font-size:14px;opacity:.8;line-height:1.6;}
.target-list{margin-top:14px;display:flex;flex-direction:column;gap:7px;}
.target-list li{font-size:13px;opacity:.9;display:flex;align-items:flex-start;gap:8px;}
.target-list li::before{content:'✓';color:rgba(255,255,255,.6);flex-shrink:0;margin-top:1px;}

/* ── PLANS ────────────────────────────────────────────────── */
.plans-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:48px;}
.plan-card{background:white;border-radius:var(--r);padding:28px;border:2px solid var(--bordure);
  position:relative;transition:border-color .2s;}
.plan-card.popular{border-color:var(--vert);box-shadow:0 8px 32px rgba(26,107,60,.15);}
.plan-badge-pop{position:absolute;top:-12px;left:50%;transform:translateX(-50%);
  background:var(--vert);color:white;padding:4px 16px;border-radius:20px;
  font-size:12px;font-weight:700;white-space:nowrap;}
.plan-name{font-size:16px;font-weight:700;margin-bottom:6px;}
.plan-price{font-family:'Fraunces',serif;font-size:32px;color:var(--vert);margin-bottom:4px;}
.plan-price span{font-size:14px;font-weight:500;color:var(--soft);}
.plan-cible{font-size:12px;color:var(--soft);margin-bottom:18px;padding-bottom:18px;
  border-bottom:1px solid var(--bordure);}
.plan-list{display:flex;flex-direction:column;gap:9px;}
.plan-list li{font-size:13px;color:var(--soft);display:flex;align-items:flex-start;gap:8px;}
.plan-list li.ok::before{content:'✓';color:var(--vert);font-weight:700;flex-shrink:0;}
.plan-list li.no{opacity:.4;}
.plan-list li.no::before{content:'✗';color:#999;flex-shrink:0;}
.plan-cta{display:block;margin-top:20px;padding:12px;background:var(--vert);color:white;
  border-radius:var(--rs);font-size:14px;font-weight:700;text-decoration:none;text-align:center;
  transition:background .2s;}
.plan-cta:hover{background:var(--vert-f);}
.plan-cta.sec{background:var(--bg);color:var(--vert);border:2px solid var(--vert);}
.plan-cta.sec:hover{background:var(--vert-c);}

/* ── APPS ─────────────────────────────────────────────────── */
.apps{background:var(--or-c);}
.apps-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;margin-top:48px;}
.app-card{background:white;border-radius:24px;padding:32px;border:1px solid var(--bordure);
  box-shadow:var(--sh);}
.app-ico{width:72px;height:72px;border-radius:20px;display:flex;align-items:center;
  justify-content:center;font-size:34px;margin-bottom:18px;}
.app-ico.patient{background:linear-gradient(135deg,#1565C0,#0d47a1);}
.app-ico.medecin{background:linear-gradient(135deg,var(--vert-f),var(--vert));}
.app-title{font-family:'Fraunces',serif;font-size:24px;margin-bottom:8px;}
.app-desc{font-size:14px;color:var(--soft);margin-bottom:20px;line-height:1.7;}
.app-features{display:flex;flex-direction:column;gap:8px;margin-bottom:24px;}
.app-feat{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--texte);}
.app-feat::before{content:'•';color:var(--vert);font-size:18px;font-weight:700;flex-shrink:0;}
.store-btns{display:flex;gap:10px;flex-wrap:wrap;}
.store-btn{display:flex;align-items:center;gap:8px;padding:11px 16px;border-radius:10px;
  font-size:13px;font-weight:700;text-decoration:none;border:2px solid;transition:all .2s;}
.store-btn.android{border-color:var(--vert);color:var(--vert);}
.store-btn.android:hover{background:var(--vert);color:white;}
.store-btn.ios{border-color:#1565C0;color:#1565C0;}
.store-btn.ios:hover{background:#1565C0;color:white;}
.store-btn.web{border-color:var(--or);color:var(--or);}
.store-btn.web:hover{background:var(--or);color:white;}

/* ── CONTACT ──────────────────────────────────────────────── */
.contact{background:var(--vert-f);color:white;}
.contact-inner{max-width:680px;margin:0 auto;text-align:center;}
.contact-title{font-family:'Fraunces',serif;font-size:36px;margin-bottom:14px;}
.contact-sub{font-size:16px;opacity:.8;margin-bottom:32px;}
.contact-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:36px;}
.cc{background:rgba(255,255,255,.1);border-radius:var(--r);padding:20px;border:1px solid rgba(255,255,255,.15);}
.cc-ico{font-size:28px;margin-bottom:8px;}
.cc-label{font-size:12px;opacity:.7;margin-bottom:4px;}
.cc-val{font-size:14px;font-weight:700;}
.btn-contact{display:inline-flex;align-items:center;gap:10px;background:white;color:var(--vert);
  padding:16px 32px;border-radius:var(--r);font-size:15px;font-weight:800;
  text-decoration:none;transition:all .2s;}
.btn-contact:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.2);}

/* ── FOOTER ───────────────────────────────────────────────── */
footer{background:#0a3320;padding:40px max(24px, calc(50% - 580px)) 24px;color:white;}
.footer-inner{max-width:1160px;margin:0 auto;}
.footer-top{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:40px;}
.footer-brand-name{font-family:'Fraunces',serif;font-size:22px;margin-bottom:8px;}
.footer-brand-desc{font-size:13px;opacity:.6;line-height:1.6;}
.footer-col h4{font-size:13px;font-weight:700;margin-bottom:14px;opacity:.7;
  text-transform:uppercase;letter-spacing:.5px;}
.footer-col a{display:block;font-size:13px;color:rgba(255,255,255,.6);text-decoration:none;
  margin-bottom:8px;transition:color .2s;}
.footer-col a:hover{color:white;}
.footer-bottom{border-top:1px solid rgba(255,255,255,.1);padding-top:20px;
  display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;}
.footer-bottom p{font-size:12px;opacity:.5;}

/* ── RESPONSIVE ───────────────────────────────────────────── */
@media(max-width:1024px){
  .hero-inner{grid-template-columns:1fr;text-align:center;}
  .hero-visual{display:none;}
  .hero p{max-width:100%;}
  .features-grid{grid-template-columns:1fr 1fr;}
  .targets-grid{grid-template-columns:1fr 1fr;}
  .plans-grid{grid-template-columns:1fr 1fr;}
  .footer-top{grid-template-columns:1fr 1fr;}
  .stats-inner{grid-template-columns:repeat(2,1fr);}
}
@media(max-width:768px){
  .nav-links,.nav-cta{display:none;}
  .menu-btn{display:block;}
  .hero{padding-top:80px;}
  .hero h1{font-size:32px;}
  .features-grid,.targets-grid,.plans-grid,.apps-grid{grid-template-columns:1fr;}
  .stats-inner{grid-template-columns:1fr 1fr;}
  .contact-cards{grid-template-columns:1fr;}
  .footer-top{grid-template-columns:1fr;}
  .footer-bottom{flex-direction:column;text-align:center;}
}
</style>
</head>
<body>

<!-- NAV -->
<nav>
  <div class="nav-inner">
    <a href="/" class="nav-brand">
      <div class="nav-logo">🏥</div>
      <span class="nav-name">SantéBF</span>
    </a>
    <div class="nav-links">
      <a href="#fonctionnalites">Fonctionnalités</a>
      <a href="#pour-qui">Pour qui</a>
      <a href="#plans">Tarifs</a>
      <a href="#apps">Applications</a>
      <a href="#contact">Contact</a>
    </div>
    <div class="nav-cta">
      <a href="/auth/login" class="btn-outline">Se connecter</a>
      <a href="#contact" class="btn-solid">Démo gratuite</a>
    </div>
    <button class="menu-btn" onclick="toggleMobileMenu()">☰</button>
  </div>
</nav>

<!-- HERO -->
<div class="hero">
  <div class="hero-inner">
    <div>
      <div class="hero-badge">🇧🇫 Système National de Santé Numérique</div>
      <h1>Le dossier médical de <em>chaque burkinabè</em>, partout, toujours.</h1>
      <p>SantéBF unifie les structures sanitaires du Burkina Faso autour d'un dossier médical partagé, sécurisé et accessible depuis n'importe quel appareil.</p>
      <div class="hero-btns">
        <a href="#contact" class="hero-btn-main">🚀 Démarrer gratuitement</a>
        <a href="#fonctionnalites" class="hero-btn-sec">Voir les fonctionnalités →</a>
      </div>
    </div>
    <div class="hero-visual">
      <div class="floating-notif">
        <div class="fn-ico">✅</div>
        <div><div class="fn-text">Résultats disponibles</div><div class="fn-sub">Glycémie · NFS · Créatinine</div></div>
      </div>
      <div class="mockup-card">
        <div class="mc-header">
          <div class="mc-av">AM</div>
          <div class="mc-info">
            <div class="mc-name">Aminata Moné</div>
            <div class="mc-sub">BF-2024-00847 · Groupe A+</div>
          </div>
          <span class="badge-pill">Actif</span>
        </div>
        <div class="mc-row"><span class="mc-lbl">Dernier RDV</span><span class="mc-val">Hier, 10h30</span></div>
        <div class="mc-row"><span class="mc-lbl">Ordonnances</span><span class="mc-val">2 actives</span></div>
        <div class="mc-row"><span class="mc-lbl">Vaccinations</span><span class="mc-val">À jour ✓</span></div>
        <div class="mc-row"><span class="mc-lbl">Médecin</span><span class="mc-val">Dr. Ouédraogo</span></div>
      </div>
      <div class="floating-notif" style="align-self:flex-start;margin-left:20px;">
        <div class="fn-ico">💊</div>
        <div><div class="fn-text">Nouvelle ordonnance</div><div class="fn-sub">Dr. Sawadogo · 3 médicaments</div></div>
      </div>
    </div>
  </div>
</div>

<!-- STATS -->
<div class="stats">
  <div class="stats-inner">
    <div class="stat-item"><div class="stat-num">45+</div><div class="stat-lbl">Provinces couvertes</div></div>
    <div class="stat-item"><div class="stat-num">12</div><div class="stat-lbl">Types de structures</div></div>
    <div class="stat-item"><div class="stat-num">100%</div><div class="stat-lbl">Confidentiel & sécurisé</div></div>
    <div class="stat-item"><div class="stat-num">24/7</div><div class="stat-lbl">Disponibilité</div></div>
  </div>
</div>

<!-- FONCTIONNALITÉS -->
<section id="fonctionnalites">
  <div class="section-inner">
    <div class="section-badge">Fonctionnalités</div>
    <h2 class="section-title">Tout ce dont votre structure a besoin</h2>
    <p class="section-sub">De la consultation au paiement, SantéBF couvre l'intégralité du parcours de soin.</p>
    <div class="features-grid">
      <div class="feat-card">
        <div class="feat-ico">📋</div>
        <div class="feat-title">Dossier médical partagé</div>
        <div class="feat-desc">Chaque patient dispose d'un dossier national accessible depuis toute structure SantéBF. Consultations, antécédents, allergies, tout en un seul endroit.</div>
        <span class="feat-tag">Tous les plans</span>
      </div>
      <div class="feat-card">
        <div class="feat-ico">💊</div>
        <div class="feat-title">Ordonnances numériques</div>
        <div class="feat-desc">Génération de PDF sécurisés avec QR code de vérification. Le patient reçoit son ordonnance par email instantanément.</div>
        <span class="feat-tag">Tous les plans</span>
      </div>
      <div class="feat-card">
        <div class="feat-ico">📅</div>
        <div class="feat-title">Gestion des rendez-vous</div>
        <div class="feat-desc">Planification des consultations, rappels automatiques par email et SMS, synchronisation Google Calendar optionnelle.</div>
        <span class="feat-tag">Tous les plans</span>
      </div>
      <div class="feat-card">
        <div class="feat-ico">🧪</div>
        <div class="feat-title">Laboratoire & Radiologie</div>
        <div class="feat-desc">Prescription et suivi des examens biologiques et d'imagerie. Résultats directement liés au dossier patient.</div>
        <span class="feat-tag">Tous les plans</span>
      </div>
      <div class="feat-card">
        <div class="feat-ico">💰</div>
        <div class="feat-title">Facturation & Caisse</div>
        <div class="feat-desc">Gestion des actes, facturation avec prise en charge assurance, suivi des paiements et export comptable CSV.</div>
        <span class="feat-tag">Plan Starter+</span>
      </div>
      <div class="feat-card">
        <div class="feat-ico">🤖</div>
        <div class="feat-title">Aide IA au diagnostic</div>
        <div class="feat-desc">Assistant intelligent pour l'aide au diagnostic, vérification des interactions médicamenteuses et résumé patient automatique.</div>
        <span class="feat-tag">Plan Standard+</span>
      </div>
      <div class="feat-card">
        <div class="feat-ico">🤰</div>
        <div class="feat-title">Suivi de grossesse CPN</div>
        <div class="feat-desc">Suivi complet des grossesses avec carnet CPN numérique, alertes risques, et synchronisation entre structures.</div>
        <span class="feat-tag">Tous les plans</span>
      </div>
      <div class="feat-card">
        <div class="feat-ico">🩸</div>
        <div class="feat-title">Don de sang / CNTS</div>
        <div class="feat-desc">Banque nationale de donneurs potentiels. Les agents CNTS peuvent rechercher des donneurs compatibles en urgence.</div>
        <span class="feat-tag">Gratuit</span>
      </div>
      <div class="feat-card">
        <div class="feat-ico">📊</div>
        <div class="feat-title">Statistiques & rapports</div>
        <div class="feat-desc">Tableaux de bord en temps réel, exports CSV, rapports mensuels automatiques et détection d'épidémies locale.</div>
        <span class="feat-tag">Plan Standard+</span>
      </div>
    </div>
  </div>
</section>

<!-- POUR QUI -->
<section id="pour-qui" class="targets">
  <div class="section-inner">
    <div class="section-badge" style="background:rgba(255,255,255,.15);color:white;">Pour qui ?</div>
    <h2 class="section-title" style="color:white;">Conçu pour toutes les structures sanitaires</h2>
    <p class="section-sub" style="color:rgba(255,255,255,.75);">De la clinique privée au CHU national, SantéBF s'adapte à chaque contexte.</p>
    <div class="targets-grid">
      <div class="target-card">
        <div class="target-ico">🏥</div>
        <div class="target-title">Hôpitaux & CHU</div>
        <div class="target-desc">Gestion complète multi-services, hospitalisations, urgences, bloc opératoire.</div>
        <ul class="target-list">
          <li>Gestion des lits en temps réel</li>
          <li>Hospitalisations et transferts</li>
          <li>Multi-services et multi-médecins</li>
          <li>Export données pour le DGISS</li>
        </ul>
      </div>
      <div class="target-card">
        <div class="target-ico">🏨</div>
        <div class="target-title">Cliniques privées</div>
        <div class="target-desc">Gestion professionnelle avec facturation, assurances et applications mobiles patient.</div>
        <ul class="target-list">
          <li>Facturation et prise en charge</li>
          <li>Application mobile patient incluse</li>
          <li>RDV en ligne pour les patients</li>
          <li>Rapports financiers automatiques</li>
        </ul>
      </div>
      <div class="target-card">
        <div class="target-ico">💊</div>
        <div class="target-title">Centres de santé & CMA</div>
        <div class="target-desc">Solution simple et efficace pour les structures de soins primaires en zone urbaine et rurale.</div>
        <ul class="target-list">
          <li>Dossier patient même hors-ligne</li>
          <li>Vaccinations et suivi grossesse</li>
          <li>Ordonnances PDF sécurisées</li>
          <li>Statistiques épidémiologiques</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- PLANS -->
<section id="plans" style="background:var(--bg);">
  <div class="section-inner">
    <div class="section-badge">Tarifs</div>
    <h2 class="section-title">Des prix adaptés à chaque structure</h2>
    <p class="section-sub">Commencez gratuitement. Évoluez selon vos besoins. Annulez à tout moment.</p>
    <div class="plans-grid">
      <div class="plan-card">
        <div class="plan-name">Gratuit</div>
        <div class="plan-price">0 <span>FCFA/mois</span></div>
        <div class="plan-cible">Lancement et test · 6 mois</div>
        <ul class="plan-list">
          <li class="ok">Dossier patient</li>
          <li class="ok">Consultations illimitées</li>
          <li class="ok">Rendez-vous</li>
          <li class="ok">Don de sang CNTS</li>
          <li class="no">PDF ordonnances</li>
          <li class="no">Pharmacien/Caissier</li>
          <li class="no">SMS rappels</li>
          <li class="no">IA médicale</li>
        </ul>
        <a href="#contact" class="plan-cta sec">Commencer</a>
      </div>
      <div class="plan-card">
        <div class="plan-name">Starter</div>
        <div class="plan-price">15 000 <span>FCFA/mois</span></div>
        <div class="plan-cible">Pharmacie · Cabinet médical</div>
        <ul class="plan-list">
          <li class="ok">Tout le plan Gratuit</li>
          <li class="ok">PDF ordonnances/examens</li>
          <li class="ok">Module pharmacien</li>
          <li class="ok">Module caissier</li>
          <li class="ok">Export CSV</li>
          <li class="no">SMS rappels</li>
          <li class="no">IA médicale</li>
          <li class="no">API publique</li>
        </ul>
        <a href="#contact" class="plan-cta sec">Démarrer</a>
      </div>
      <div class="plan-card popular">
        <div class="plan-badge-pop">🌟 Le plus populaire</div>
        <div class="plan-name">Standard</div>
        <div class="plan-price">40 000 <span>FCFA/mois</span></div>
        <div class="plan-cible">Clinique · Centre de santé</div>
        <ul class="plan-list">
          <li class="ok">Tout le plan Starter</li>
          <li class="ok">IA médicale (100/mois)</li>
          <li class="ok">SMS rappels (200/mois)</li>
          <li class="ok">Statistiques avancées</li>
          <li class="ok">Support prioritaire</li>
          <li class="ok">Rapport mensuel auto</li>
          <li class="no">IA illimitée</li>
          <li class="no">API publique</li>
        </ul>
        <a href="#contact" class="plan-cta">Choisir Standard</a>
      </div>
      <div class="plan-card">
        <div class="plan-name">Pro</div>
        <div class="plan-price">80 000 <span>FCFA/mois</span></div>
        <div class="plan-cible">Hôpital · CHU</div>
        <ul class="plan-list">
          <li class="ok">Tout le plan Standard</li>
          <li class="ok">IA médicale illimitée</li>
          <li class="ok">SMS illimités</li>
          <li class="ok">Support 24/7 dédié</li>
          <li class="ok">Onboarding sur site</li>
          <li class="ok">Formation équipes</li>
          <li class="ok">SLA 99.9%</li>
          <li class="ok">API publique</li>
        </ul>
        <a href="#contact" class="plan-cta">Nous contacter</a>
      </div>
    </div>
  </div>
</section>

<!-- APPLICATIONS MOBILES -->
<section id="apps" class="apps">
  <div class="section-inner">
    <div class="section-badge" style="background:var(--or-c);color:var(--or);">Applications mobiles</div>
    <h2 class="section-title">SantéBF dans votre poche</h2>
    <p class="section-sub">Deux applications dédiées — une pour les patients, une pour les professionnels de santé.</p>
    <div class="apps-grid">
      <div class="app-card">
        <div class="app-ico patient">👤</div>
        <div class="app-title">SantéBF Patient</div>
        <div class="app-desc">Permettez à vos patients d'accéder à leur dossier, ordonnances et résultats d'examens depuis leur téléphone.</div>
        <div class="app-features">
          <div class="app-feat">Dossier médical complet</div>
          <div class="app-feat">Ordonnances PDF téléchargeables</div>
          <div class="app-feat">Résultats d'examens</div>
          <div class="app-feat">Code d'urgence QR</div>
          <div class="app-feat">Carnet de vaccination</div>
          <div class="app-feat">Gestion des consentements</div>
        </div>
        <div class="store-btns">
          <a href="#" class="store-btn android">▶ Google Play</a>
          <a href="#" class="store-btn ios"> App Store</a>
          <a href="/patient/welcome" class="store-btn web">🌐 Web</a>
        </div>
      </div>
      <div class="app-card">
        <div class="app-ico medecin">👨‍⚕️</div>
        <div class="app-title">SantéBF Médecin</div>
        <div class="app-desc">Accédez au dossier de vos patients, rédigez vos ordonnances et suivez vos consultations depuis n'importe où.</div>
        <div class="app-features">
          <div class="app-feat">Dossier patient en mobilité</div>
          <div class="app-feat">Rédaction d'ordonnances</div>
          <div class="app-feat">Planning des consultations</div>
          <div class="app-feat">Résultats laboratoire</div>
          <div class="app-feat">Aide IA au diagnostic</div>
          <div class="app-feat">Signature numérique</div>
        </div>
        <div class="store-btns">
          <a href="#" class="store-btn android">▶ Google Play</a>
          <a href="#" class="store-btn ios"> App Store</a>
          <a href="/auth/login" class="store-btn web">🌐 Web</a>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- CONTACT -->
<section id="contact" class="contact">
  <div class="contact-inner">
    <div class="section-badge" style="background:rgba(255,255,255,.15);color:white;">Contact</div>
    <div class="contact-title">Prêt à digitaliser votre structure ?</div>
    <div class="contact-sub">Contactez notre équipe pour une démonstration gratuite et un accompagnement personnalisé.</div>
    <div class="contact-cards">
      <div class="cc"><div class="cc-ico">📧</div><div class="cc-label">Email</div><div class="cc-val">contact@santebf.bf</div></div>
      <div class="cc"><div class="cc-ico">📞</div><div class="cc-label">Téléphone</div><div class="cc-val">+226 25 XX XX XX</div></div>
      <div class="cc"><div class="cc-ico">📍</div><div class="cc-label">Localisation</div><div class="cc-val">Ouagadougou, BF</div></div>
    </div>
    <a href="mailto:contact@santebf.bf" class="btn-contact">✉️ Nous contacter</a>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="footer-inner">
    <div class="footer-top">
      <div>
        <div class="footer-brand-name">🏥 SantéBF</div>
        <div class="footer-brand-desc">Système National de Santé Numérique<br>Burkina Faso 🇧🇫<br><br>Conçu pour améliorer l'accès aux soins et faciliter le travail des professionnels de santé burkinabè.</div>
      </div>
      <div class="footer-col">
        <h4>Produit</h4>
        <a href="#fonctionnalites">Fonctionnalités</a>
        <a href="#pour-qui">Pour qui</a>
        <a href="#plans">Tarifs</a>
        <a href="#apps">Applications</a>
      </div>
      <div class="footer-col">
        <h4>Connexion</h4>
        <a href="/auth/login">Se connecter</a>
        <a href="/auth/inscription">Créer un compte</a>
        <a href="/patient/welcome">App Patient</a>
        <a href="/auth/reset-password">Mot de passe oublié</a>
      </div>
      <div class="footer-col">
        <h4>Légal</h4>
        <a href="/public/confidentialite">Confidentialité</a>
        <a href="/public/conditions">Conditions d'utilisation</a>
        <a href="/public/securite">Sécurité des données</a>
        <a href="#contact">Contact</a>
      </div>
    </div>
    <div class="footer-bottom">
      <p>© 2025 SantéBF — Tous droits réservés</p>
      <p>Fait avec ❤️ pour la santé au Burkina Faso</p>
    </div>
  </div>
</footer>

<script>
// Navigation mobile
function toggleMobileMenu() {
  // Implémentation simple — ouvre un menu overlay
  alert('Menu mobile — à implémenter avec un drawer')
}

// Animation scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.feat-card, .target-card, .plan-card, .app-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity .5s, transform .5s';
  observer.observe(el);
});

// Nav scroll
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (window.scrollY > 50) {
    nav.style.boxShadow = '0 4px 24px rgba(0,0,0,.1)';
  } else {
    nav.style.boxShadow = 'none';
  }
});
</script>
</body>
</html>`
}
