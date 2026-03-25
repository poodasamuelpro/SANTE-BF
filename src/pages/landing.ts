/**
 * src/pages/landing.ts
 * SantéBF — Page d'accueil publique
 * Route : GET /public/ via src/routes/public.ts
 */

export function landingPage(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="SantéBF — Plateforme numérique de gestion de santé pour les structures sanitaires. Dossiers patients, consultations, ordonnances, examens, hospitalisations.">
<title>SantéBF — Plateforme de Santé Numérique</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">
<style>
:root{--v:#1A6B3C;--vf:#0d4a2a;--vc:#e8f5ee;--vm:#2E8B57;--b:#1565C0;--bc:#e3f2fd;--or:#C9A84C;--oc:#fdf6e3;--r:#b71c1c;--rc:#fff5f5;--tx:#0f1923;--soft:#5a6a78;--bg:#f8faf8;--w:#fff;--bd:#e2e8e4}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'Plus Jakarta Sans',sans-serif;color:var(--tx);background:var(--bg)}

/* NAV */
nav{background:var(--w);border-bottom:1px solid var(--bd);padding:0 5%;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.nb{display:flex;align-items:center;gap:10px;font-family:'Fraunces',serif;font-size:22px;color:var(--tx);text-decoration:none}
.ni{width:38px;height:38px;background:var(--v);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px}
.nl{display:flex;align-items:center;gap:24px}
.nl a{font-size:14px;color:var(--soft);text-decoration:none;font-weight:500;transition:color .2s}
.nl a:hover{color:var(--v)}
.nc{background:var(--v);color:#fff!important;padding:10px 20px;border-radius:9px;font-weight:700!important}
.nc:hover{background:var(--vf)!important}
.mb{display:none;background:none;border:none;font-size:24px;cursor:pointer;color:var(--tx)}

/* HERO */
.hero{background:linear-gradient(135deg,var(--vf) 0%,var(--v) 60%,#2a7d4f 100%);padding:100px 5%;text-align:center;position:relative;overflow:hidden}
.hero::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:60px;background:var(--bg);clip-path:ellipse(55% 100% at 50% 100%)}
.hc{max-width:820px;margin:0 auto;position:relative;z-index:1}
.hbadge{display:inline-block;background:rgba(255,255,255,.15);color:#fff;padding:8px 20px;border-radius:30px;font-size:13px;font-weight:600;margin-bottom:24px;border:1px solid rgba(255,255,255,.2)}
.hero h1{font-family:'Fraunces',serif;font-size:clamp(34px,6vw,60px);color:#fff;line-height:1.15;margin-bottom:22px}
.hero h1 em{font-style:italic;opacity:.85}
.hsub{font-size:17px;color:rgba(255,255,255,.8);max-width:600px;margin:0 auto 40px;line-height:1.75}
.hbtns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:60px}
.btn1{background:#fff;color:var(--vf);padding:15px 30px;border-radius:11px;font-size:15px;font-weight:700;text-decoration:none;transition:all .2s}
.btn1:hover{background:var(--vc);transform:translateY(-2px)}
.btn2{background:rgba(255,255,255,.15);color:#fff;padding:15px 30px;border-radius:11px;font-size:15px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,.3);transition:all .2s}
.btn2:hover{background:rgba(255,255,255,.25)}
.hstats{display:flex;gap:48px;justify-content:center;flex-wrap:wrap}
.hs strong{display:block;font-family:'Fraunces',serif;font-size:38px;color:#fff;font-weight:700}
.hs span{font-size:13px;color:rgba(255,255,255,.65)}

/* SECTIONS COMMUNES */
section{padding:80px 5%}
.si{max-width:1100px;margin:0 auto}
.stag{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:var(--v);margin-bottom:12px}
.stitle{font-family:'Fraunces',serif;font-size:clamp(26px,4vw,40px);color:var(--tx);line-height:1.2;margin-bottom:14px}
.ssub{font-size:16px;color:var(--soft);max-width:580px;line-height:1.7;margin-bottom:48px}

/* POUR QUI */
.pourqui{background:var(--w)}
.pq-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px}
.pq-card{background:var(--bg);border-radius:14px;padding:24px;border:1.5px solid var(--bd);transition:all .2s;cursor:default}
.pq-card:hover{border-color:var(--v);box-shadow:0 8px 24px rgba(26,107,60,.1);transform:translateY(-2px)}
.pq-ico{font-size:34px;margin-bottom:14px}
.pq-card h3{font-size:16px;font-weight:700;margin-bottom:7px}
.pq-card p{font-size:13px;color:var(--soft);line-height:1.65}

/* MODULES */
.modules{background:var(--bg)}
.mod-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:32px}
.mod-tab{padding:9px 18px;border-radius:30px;font-size:13px;font-weight:600;border:1.5px solid var(--bd);background:var(--w);cursor:pointer;transition:all .2s;color:var(--soft)}
.mod-tab.active,.mod-tab:hover{background:var(--v);color:#fff;border-color:var(--v)}
.mod-panels{}
.mod-panel{display:none;background:var(--w);border-radius:16px;border:1.5px solid var(--bd);overflow:hidden}
.mod-panel.active{display:grid;grid-template-columns:1fr 1fr;gap:0}
.mod-info{padding:36px}
.mod-info h3{font-family:'Fraunces',serif;font-size:24px;margin-bottom:12px}
.mod-info p{font-size:14px;color:var(--soft);line-height:1.75;margin-bottom:20px}
.mod-features{display:flex;flex-direction:column;gap:9px}
.mf{display:flex;align-items:flex-start;gap:10px;font-size:13.5px}
.mf::before{content:'✓';color:var(--v);font-weight:700;flex-shrink:0;margin-top:1px}
.mod-visual{background:linear-gradient(135deg,var(--vc),var(--bc));display:flex;align-items:center;justify-content:center;font-size:80px;min-height:280px}

/* AVANTAGES */
.avantages{background:var(--vf)}
.avantages .stag{color:rgba(255,255,255,.5)}
.avantages .stitle{color:#fff}
.avantages .ssub{color:rgba(255,255,255,.7)}
.av-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
.av-card{background:rgba(255,255,255,.07);border-radius:14px;padding:24px;border:1px solid rgba(255,255,255,.1);transition:all .2s}
.av-card:hover{background:rgba(255,255,255,.12)}
.av-card h3{font-size:15px;font-weight:700;color:#fff;margin-bottom:8px}
.av-card p{font-size:13px;color:rgba(255,255,255,.65);line-height:1.65}

/* PLANS */
.plans{background:var(--w)}
.plans-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
.plan{border-radius:16px;padding:28px;border:2px solid var(--bd);position:relative;transition:all .2s}
.plan:hover{border-color:var(--v);transform:translateY(-2px)}
.plan.pop{border-color:var(--v);background:var(--vc)}
.pop-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--v);color:#fff;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap}
.plan-name{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--soft);margin-bottom:10px}
.plan-price{font-family:'Fraunces',serif;font-size:30px;font-weight:700;margin-bottom:4px}
.plan-period{font-size:12px;color:var(--soft);margin-bottom:14px}
.plan-list{display:flex;flex-direction:column;gap:7px;margin-bottom:20px}
.pl{font-size:12.5px;display:flex;gap:7px;align-items:flex-start}
.pl::before{content:'✓';color:var(--v);font-weight:700;flex-shrink:0}
.plan-btn{display:block;text-align:center;padding:11px;border-radius:9px;font-size:13px;font-weight:700;text-decoration:none;background:var(--v);color:#fff;transition:background .2s}
.plan-btn:hover{background:var(--vf)}
.plan-note{font-size:12px;color:var(--soft);text-align:center;margin-top:8px}

/* SECURITE */
.securite{background:var(--bg)}
.sec-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}
.sec-card{background:var(--w);border-radius:14px;padding:24px;border:1.5px solid var(--bd)}
.sec-icon{font-size:30px;margin-bottom:12px}
.sec-card h3{font-size:15px;font-weight:700;margin-bottom:8px}
.sec-card p{font-size:13px;color:var(--soft);line-height:1.65}

/* APPS */
.apps{background:var(--w)}
.apps-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.app-card{background:var(--bg);border-radius:16px;padding:32px;border:1.5px solid var(--bd);text-align:center}
.app-ico{font-size:52px;margin-bottom:16px}
.app-card h3{font-size:20px;font-weight:700;margin-bottom:10px}
.app-card p{font-size:14px;color:var(--soft);line-height:1.65;margin-bottom:20px}
.app-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.app-btn{display:inline-flex;align-items:center;gap:8px;background:var(--tx);color:#fff;padding:11px 18px;border-radius:9px;font-size:13px;font-weight:600;text-decoration:none;transition:background .2s}
.app-btn:hover{background:#374151}
.app-btn-label{display:block;font-size:9px;opacity:.6;font-weight:400}
.app-url{font-size:11px;color:var(--soft);margin-top:10px;font-family:monospace;background:var(--bd);padding:4px 10px;border-radius:6px;display:inline-block}

/* FAQ */
.faq{background:var(--bg)}
.faq-cats{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:32px}
.faq-cat{padding:8px 16px;border-radius:20px;font-size:13px;font-weight:600;border:1.5px solid var(--bd);background:var(--w);cursor:pointer;transition:all .2s;color:var(--soft)}
.faq-cat.active,.faq-cat:hover{background:var(--v);color:#fff;border-color:var(--v)}
.faq-group{display:none}
.faq-group.active{display:block}
.faq-item{background:var(--w);border-radius:12px;border:1.5px solid var(--bd);margin-bottom:10px;overflow:hidden;transition:border-color .2s}
.faq-item.open{border-color:var(--v)}
.faq-q{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;cursor:pointer;font-size:15px;font-weight:600;gap:12px}
.faq-q:hover{background:#f9fbf9}
.faq-ico{font-size:18px;transition:transform .3s;flex-shrink:0;color:var(--v)}
.faq-item.open .faq-ico{transform:rotate(45deg)}
.faq-a{display:none;padding:0 20px 18px;font-size:14px;color:var(--soft);line-height:1.75}
.faq-item.open .faq-a{display:block}
.faq-a strong{color:var(--tx)}
.faq-a ul{margin:8px 0 8px 18px}
.faq-a li{margin-bottom:5px}

/* CTA FINAL */
.cta{background:linear-gradient(135deg,var(--vf),var(--v));padding:80px 5%;text-align:center}
.cta h2{font-family:'Fraunces',serif;font-size:clamp(28px,5vw,44px);color:#fff;margin-bottom:16px}
.cta p{font-size:17px;color:rgba(255,255,255,.8);margin-bottom:36px;max-width:500px;margin-left:auto;margin-right:auto}
.cta-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}

/* FOOTER */
footer{background:var(--tx);padding:56px 5% 28px}
.fg{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;max-width:1100px;margin:0 auto 36px}
.fb h2{font-family:'Fraunces',serif;font-size:20px;color:#fff;margin-bottom:10px}
.fb p{font-size:13px;color:rgba(255,255,255,.45);line-height:1.7;max-width:260px}
.fc h4{font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px}
.fc a{display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px;transition:color .2s}
.fc a:hover{color:#fff}
.fbot{max-width:1100px;margin:0 auto;border-top:1px solid rgba(255,255,255,.08);padding-top:24px;display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,.3);flex-wrap:wrap;gap:8px}

/* RESPONSIVE */
@media(max-width:900px){
  .mod-panel.active{grid-template-columns:1fr}
  .mod-visual{display:none}
  .apps-grid{grid-template-columns:1fr}
  .fg{grid-template-columns:1fr 1fr}
}
@media(max-width:640px){
  .nl{display:none}
  .mb{display:block}
  section{padding:60px 5%}
  .hstats{gap:28px}
  .fg{grid-template-columns:1fr}
  .plans-grid{grid-template-columns:1fr}
}
</style>
</head>
<body>

<!-- NAV -->
<nav>
  <a href="/" class="nb"><div class="ni">🏥</div>SantéBF</a>
  <div class="nl">
    <a href="#modules">Modules</a>
    <a href="#securite">Sécurité</a>
    <a href="/abonnement/plans">Abonnement</a>
      <a href="#plans">Tarifs</a>
    <a href="#faq">FAQ</a>
    <a href="/abonnement/plans">Abonnement</a>
    <a href="/contact">Contact</a>
    <a href="/auth/login" class="nc">Connexion &#x2192;</a>
  </div>
  <button class="mb" onclick="toggleMenu()">☰</button>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="hc">
    <div class="hbadge">🏥 Plateforme de Santé Numérique — Burkina Faso</div>
    <h1>Gérez votre structure de santé<br><em>simplement, efficacement</em></h1>
    <p class="hsub">SantéBF connecte médecins, infirmiers, pharmaciens, laborantins et patients dans une seule plateforme sécurisée. Zéro papier, zéro perte de dossier.</p>
    <div class="hbtns">
      <a href="/auth/inscription" class="btn1">🚀 Essai gratuit 6 mois</a>
      <a href="/auth/login" class="btn2">Se connecter →</a>
    </div>
    <div class="hstats">
      <div class="hs"><strong>12+</strong><span>Modules intégrés</span></div>
      <div class="hs"><strong>100%</strong><span>Web, aucune installation</span></div>
      <div class="hs"><strong>24/7</strong><span>Disponible en ligne</span></div>
      <div class="hs"><strong>0 papier</strong><span>Tout numérique</span></div>
    </div>
  </div>
</section>

<!-- POUR QUI -->
<section class="pourqui" id="pourqui">
  <div class="si">
    <div class="stag">Pour qui ?</div>
    <h2 class="stitle">Adapté à chaque acteur de santé</h2>
    <p class="ssub">Que vous soyez une clinique privée, un cabinet médical ou un grand hôpital, SantéBF s'adapte à votre structure et à votre équipe.</p>
    <div class="pq-grid">
      <div class="pq-card"><div class="pq-ico">&#x1F3E5;</div><h3>H&#xf4;pitaux &amp; Cliniques</h3><p>G&#xe9;rez hospitalisations, personnel, lits, finances et statistiques depuis un seul outil accessible partout.</p></div>
      <div class="pq-card"><div class="pq-ico">&#x1F468;&#x200D;&#x2695;&#xFE0F;</div><h3>M&#xe9;decins &amp; Sp&#xe9;cialistes</h3><p>Acc&#xe9;dez &#xe0; l&#x27;historique complet de vos patients, r&#xe9;digez ordonnances et examens, suivez vos consultations.</p></div>
      <div class="pq-card"><div class="pq-ico">&#x1F4F1;</div><h3>Patients</h3><p>Consultez votre dossier, ordonnances et r&#xe9;sultats depuis votre t&#xe9;l&#xe9;phone. G&#xe9;rez vos acc&#xe8;s m&#xe9;decins et rendez-vous.</p></div>
      <div class="pq-card"><div class="pq-ico">&#x1F48A;</div><h3>Pharmaciens</h3><p>V&#xe9;rifiez et d&#xe9;livrez les ordonnances par QR code, contr&#xf4;lez les interactions m&#xe9;dicamenteuses en temps r&#xe9;el.</p></div>
      <div class="pq-card"><div class="pq-ico">&#x1F52C;</div><h3>Laborantins &amp; Radiologues</h3><p>Recevez les prescriptions, saisissez les r&#xe9;sultats et notifiez automatiquement le m&#xe9;decin prescripteur.</p></div>
      <div class="pq-card"><div class="pq-ico">&#x1F9EA;</div><h3>CNTS &#x2014; Don de Sang</h3><p>G&#xe9;rez les donneurs volontaires, recherchez des compatibilit&#xe9;s et traitez les demandes urgentes de transfusion.</p></div>
      <div class="pq-card"><div class="pq-ico">&#x1F930;</div><h3>Sages-femmes &amp; Maternit&#xe9;</h3><p>Suivez grossesses, CPN et accouchements avec un module enti&#xe8;rement d&#xe9;di&#xe9; &#xe0; la sant&#xe9; maternelle et n&#xe9;onatale.</p></div>
  </div>
</section>

<!-- MODULES -->
<section class="modules" id="modules">
  <div class="si">
    <div class="stag">Modules</div>
    <h2 class="stitle">Tout ce dont votre structure a besoin</h2>
    <p class="ssub">Cliquez sur un module pour voir le détail des fonctionnalités disponibles.</p>
    <div class="mod-tabs">
      <button class="mod-tab active" onclick="showMod('dossier',this)">📂 Dossier Patient</button>
      <button class="mod-tab" onclick="showMod('consult',this)">🩺 Consultations</button>
      <button class="mod-tab" onclick="showMod('hospit',this)">🛏️ Hospitalisations</button>
      <button class="mod-tab" onclick="showMod('pharma',this)">💊 Pharmacie</button>
      <button class="mod-tab" onclick="showMod('labo',this)">🔬 Labo / Radio</button>
      <button class="mod-tab" onclick="showMod('grossesse',this)">🤰 Grossesse</button>
      <button class="mod-tab" onclick="showMod('finance',this)">💰 Finances</button>
      <button class="mod-tab" onclick="showMod('sang',this)">🩸 Don de Sang</button>
      <button class="mod-tab" onclick="showMod('ia',this)">🤖 IA Médicale</button>
    </div>
    <div id="mod-dossier" class="mod-panel active">
      <div class="mod-info">
        <h3>Dossier Patient Partagé</h3>
        <p>Chaque patient dispose d'un dossier médical unique accessible depuis toutes les structures auxquelles il a donné son accord. Fini les dossiers perdus ou dupliqués.</p>
        <div class="mod-features">
          <div class="mf">Informations complètes : allergies, maladies chroniques, traitements permanents</div>
          <div class="mf">Historique de toutes les consultations, examens, ordonnances et hospitalisations</div>
          <div class="mf">Carnet de vaccination numérique</div>
          <div class="mf">QR code d'accès d'urgence — dossier accessible en 24h sans connexion obligatoire</div>
          <div class="mf">Consentement patient obligatoire avant tout partage de données</div>
          <div class="mf">Contacts d'urgence enregistrés</div>
        </div>
      </div>
      <div class="mod-visual">📂</div>
    </div>
    <div id="mod-consult" class="mod-panel">
      <div class="mod-info">
        <h3>Consultations & Ordonnances</h3>
        <p>Le médecin rédige sa consultation, prescrit des médicaments et des examens, et génère une ordonnance PDF avec QR code de vérification, directement depuis son téléphone.</p>
        <div class="mod-features">
          <div class="mf">Création de consultation avec motif, diagnostic, notes cliniques</div>
          <div class="mf">Ordonnances numériques avec QR code — vérifiable par tout pharmacien</div>
          <div class="mf">Prescription d'examens biologiques et d'imagerie</div>
          <div class="mf">Agenda et gestion des rendez-vous</div>
          <div class="mf">Constantes vitales (tension, température, pouls, SpO2, poids)</div>
          <div class="mf">Rappels automatiques par email avant les RDV</div>
        </div>
      </div>
      <div class="mod-visual">🩺</div>
    </div>
    <div id="mod-hospit" class="mod-panel">
      <div class="mod-info">
        <h3>Hospitalisations</h3>
        <p>Suivi en temps réel des patients hospitalisés. Gestion des lits par service, notes d'évolution et comptes rendus de sortie.</p>
        <div class="mod-features">
          <div class="mf">Admission rapide avec choix du lit disponible</div>
          <div class="mf">Tableau de bord des lits occupés / disponibles par service</div>
          <div class="mf">Notes d'évolution quotidienne</div>
          <div class="mf">Sortie du patient avec type (guéri, transféré, contre avis médical…)</div>
          <div class="mf">Rapport de sortie et instructions post-hospitalisation</div>
        </div>
      </div>
      <div class="mod-visual">🛏️</div>
    </div>
    <div id="mod-pharma" class="mod-panel">
      <div class="mod-info">
        <h3>Pharmacie</h3>
        <p>Le pharmacien scanne le QR code de l'ordonnance, vérifie les allergies du patient et délivre les médicaments ligne par ligne ou en une seule action.</p>
        <div class="mod-features">
          <div class="mf">Scan QR code ordonnance — accès immédiat au détail</div>
          <div class="mf">Alerte automatique si le patient a des allergies documentées</div>
          <div class="mf">Délivrance partielle ou totale des médicaments</div>
          <div class="mf">Mise à jour automatique du statut de l'ordonnance</div>
          <div class="mf">Historique de toutes les délivrances</div>
        </div>
      </div>
      <div class="mod-visual">💊</div>
    </div>
    <div id="mod-labo" class="mod-panel">
      <div class="mod-info">
        <h3>Laboratoire & Radiologie</h3>
        <p>Les examens prescrits arrivent directement dans le module laboratoire/radiologie. Le technicien saisit les résultats et le médecin prescripteur est notifié automatiquement.</p>
        <div class="mod-features">
          <div class="mf">Réception automatique des prescriptions d'examens</div>
          <div class="mf">Saisie des résultats biologiques avec valeurs numériques et interprétation</div>
          <div class="mf">Imagerie : compte rendu et indication des anomalies</div>
          <div class="mf">Gestion des urgences (marquage prioritaire)</div>
          <div class="mf">Résultats accessibles par le patient dans son dossier</div>
        </div>
      </div>
      <div class="mod-visual">🔬</div>
    </div>
    <div id="mod-grossesse" class="mod-panel">
      <div class="mod-info">
        <h3>Suivi de Grossesse & CPN</h3>
        <p>Module dédié aux sages-femmes et gynécologues pour le suivi complet de la grossesse, des consultations prénatales jusqu'à l'accouchement.</p>
        <div class="mod-features">
          <div class="mf">Déclaration de grossesse avec calcul automatique de la DPA</div>
          <div class="mf">Suivi des CPN avec constantes (poids, tension, hauteur utérine, FCF)</div>
          <div class="mf">Identification des grossesses à risque</div>
          <div class="mf">Planification des prochaines CPN</div>
          <div class="mf">Enregistrement des accouchements et données du nouveau-né</div>
        </div>
      </div>
      <div class="mod-visual">🤰</div>
    </div>
    <div id="mod-finance" class="mod-panel">
      <div class="mod-info">
        <h3>Facturation & Caisse</h3>
        <p>Le caissier crée les factures, enregistre les paiements et génère les rapports de recettes du jour par mode de paiement.</p>
        <div class="mod-features">
          <div class="mf">Création de factures avec actes du catalogue de tarifs</div>
          <div class="mf">Paiement immédiat ou différé</div>
          <div class="mf">Modes : espèces, Orange Money, Moov Money, virement</div>
          <div class="mf">Rapport des recettes du jour par mode de paiement</div>
          <div class="mf">Factures visibles par le patient dans son espace</div>
        </div>
      </div>
      <div class="mod-visual">💰</div>
    </div>
    <div id="mod-sang" class="mod-panel">
      <div class="mod-info">
        <h3>Don de Sang</h3>
        <p>Les patients volontaires s'inscrivent comme donneurs potentiels. En cas d'urgence, les agents peuvent rechercher et contacter rapidement des donneurs compatibles.</p>
        <div class="mod-features">
          <div class="mf">Inscription volontaire des patients comme donneurs</div>
          <div class="mf">Consentement explicite requis — révocable à tout moment</div>
          <div class="mf">Recherche par groupe sanguin et rhésus</div>
          <div class="mf">Gestion des demandes d'urgence</div>
          <div class="mf">Historique des contacts et des dons</div>
        </div>
      </div>
      <div class="mod-visual">🩸</div>
    </div>
    <div id="mod-ia" class="mod-panel">
      <div class="mod-info">
        <h3>IA Médicale (à venir)</h3>
        <p>Des outils d'assistance intelligente pour les médecins, basés sur les données du dossier patient. En cours de déploiement progressif selon le plan souscrit.</p>
        <div class="mod-features">
          <div class="mf">Aide au diagnostic différentiel</div>
          <div class="mf">Vérification des interactions médicamenteuses</div>
          <div class="mf">Résumé automatique du dossier patient</div>
          <div class="mf">Assistant médical conversationnel</div>
          <div class="mf">Aide au diagnostic diff&#xe9;rentiel</div>
          <div class="mf">V&#xe9;rification des interactions m&#xe9;dicamenteuses</div>
          <div class="mf">R&#xe9;sum&#xe9; automatique du dossier patient</div>
          <div class="mf">V&#xe9;rification de coh&#xe9;rence des ordonnances</div>
          <div class="mf">Plusieurs moteurs IA : Claude, Gemini, Grok (xAI)</div>
          <div class="mf" style="color:#6b7280;">Disponible selon le plan d&#x27;abonnement</div>
  </div>
</section>

<!-- AVANTAGES -->
<section class="avantages" id="avantages">
  <div class="si">
    <div class="stag">Avantages</div>
    <h2 class="stitle">Pourquoi choisir SantéBF ?</h2>
    <p class="ssub">Conçu pour les réalités du terrain au Burkina Faso. Simple à prendre en main, performant sur mobile, accessible avec une connexion basique.</p>
    <div class="av-grid">
      <div class="av-card"><h3>⚡ Zéro installation</h3><p>Tout fonctionne dans le navigateur web. Aucun logiciel à installer sur les postes. Accès immédiat depuis n'importe quel appareil.</p></div>
      <div class="av-card"><h3>📱 Optimisé mobile</h3><p>Interface conçue pour fonctionner sur smartphone Android. Vos équipes travaillent depuis leur téléphone, en salle ou en visite.</p></div>
      <div class="av-card"><h3>🌐 Connectivité réduite</h3><p>Pensé pour fonctionner même avec une connexion 3G. Pages légères, temps de chargement optimisés pour le réseau local.</p></div>
      <div class="av-card"><h3>👥 Multi-rôles</h3><p>Chaque membre de votre équipe a accès uniquement à ce qui le concerne. Médecin, infirmier, pharmacien, caissier — chacun son espace.</p></div>
      <div class="av-card"><h3>🔗 Dossier partagé</h3><p>Un patient vu dans plusieurs structures garde un dossier unique. Plus de duplication, plus de perte d'information entre établissements.</p></div>
      <div class="av-card"><h3>📊 Statistiques temps réel</h3><p>Tableaux de bord avec nombre de consultations, recettes du jour, lits occupés, RDV à venir — toujours à jour.</p></div>
      <div class="av-card"><h3>&#x1F510; S&#xe9;curit&#xe9; des donn&#xe9;es</h3><p>Acc&#xe8;s strictement contr&#xf4;l&#xe9; par r&#xf4;le et par consentement patient. Aucune donn&#xe9;e m&#xe9;dicale n&#x27;est accessible sans autorisation explicite.</p></div>
      <div class="av-card"><h3>&#x1F4C4; Dossier unique national</h3><p>Un patient, un dossier. Peu importe la structure visit&#xe9;e, l&#x27;historique m&#xe9;dical complet est disponible &#x2014; avec le consentement du patient.</p></div>
    </div>
  </div>
</section>

<!-- SÉCURITÉ -->
<section class="securite" id="securite">
  <div class="si">
    <div class="stag">Sécurité & Confidentialité</div>
    <h2 class="stitle">Vos données sont protégées</h2>
    <p class="ssub">La confidentialité des données médicales est au cœur de SantéBF. Chaque accès est contrôlé, tracé et soumis au consentement du patient.</p>
    <div class="sec-grid">
      <div class="sec-card"><div class="sec-icon">🔒</div><h3>Chiffrement de bout en bout</h3><p>Toutes les données transitent via HTTPS. Les données au repos sont chiffrées sur nos serveurs sécurisés. Aucune donnée médicale ne circule en clair.</p></div>
      <div class="sec-card"><div class="sec-icon">✅</div><h3>Consentement patient obligatoire</h3><p>Un médecin ne peut accéder au dossier complet d'un patient que si celui-ci a explicitement accordé son consentement depuis son espace personnel. Révocable à tout moment.</p></div>
      <div class="sec-card"><div class="sec-icon">👁️</div><h3>Traçabilité totale</h3><p>Chaque consultation, modification ou accès au dossier est enregistré avec la date, l'heure et l'identité du membre du personnel concerné.</p></div>
      <div class="sec-card"><div class="sec-icon">🔑</div><h3>Authentification sécurisée</h3><p>Connexion par email et mot de passe fort obligatoire. À la première connexion, chaque nouveau compte est forcé de changer son mot de passe temporaire.</p></div>
      <div class="sec-card"><div class="sec-icon">🏥</div><h3>Accès par structure</h3><p>Le personnel n'accède qu'aux dossiers des patients de sa structure. Aucun croisement de données entre structures sans consentement explicite.</p></div>
      <div class="sec-card"><div class="sec-icon">🆘</div><h3>Accès d'urgence QR</h3><p>En cas d'urgence médicale, un code QR permet un accès temporaire (24h) aux données vitales du patient — groupe sanguin, allergies, contacts — sans connexion.</p></div>
      <div class="sec-card"><div class="sec-icon">&#x1F512;</div><h3>Sessions s&#xe9;curis&#xe9;es</h3><p>Chaque session est valid&#xe9;e &#xe0; chaque requ&#xea;te. D&#xe8;s qu&#x27;un compte est d&#xe9;sactiv&#xe9;, l&#x27;acc&#xe8;s est imm&#xe9;diatement coup&#xe9; &#x2014; m&#xea;me en cours de session.</p></div>
      <div class="sec-card"><div class="sec-icon">&#x1F4CB;</div><h3>Donn&#xe9;es propri&#xe9;t&#xe9; de la structure</h3><p>Les donn&#xe9;es saisies vous appartiennent. Elles ne sont jamais analys&#xe9;es, revendues ou utilis&#xe9;es &#xe0; d&#x27;autres fins que le fonctionnement du service.</p></div>
    </div>
  </div>
</section>

<!-- PLANS -->
<section class="plans" id="plans">
  <div class="si">
    <div class="stag">Tarifs</div>
    <h2 class="stitle">Des plans adaptés à chaque structure</h2>
    <p class="ssub">Démarrez gratuitement pendant 6 mois. Aucune carte de crédit requise pour l'essai gratuit.</p>
    <div class="plans-grid">
      <!-- GRATUIT -->
      <div class="plan">
        <div class="plan-name">Gratuit</div>
        <div class="plan-price">0 FCFA</div>
        <div class="plan-period">6 premiers mois offerts</div>
        <div class="plan-list">
          <div class="pl">Dossiers patients illimit&#xe9;s</div>
          <div class="pl">Consultations &amp; ordonnances</div>
          <div class="pl">Agenda &amp; rendez-vous</div>
          <div class="pl">Tableau de bord</div>
          <div class="pl">Acc&#xe8;s web &amp; mobile</div>
          <div class="pl">Personnel m&#xe9;dical : acc&#xe8;s illimit&#xe9;</div>
        </div>
        <a href="/auth/inscription" class="plan-btn">D&#xe9;marrer gratuitement</a>
        <p class="plan-note">Sans carte bancaire requise</p>
      </div>

      <!-- STARTER -->
      <div class="plan">
        <div class="plan-name">Starter</div>
        <div class="plan-price">40 000 FCFA</div>
        <div class="plan-period">par mois</div>
        <div class="plan-list">
          <div class="pl">Tout du plan Gratuit</div>
          <div class="pl">Ordonnances num&#xe9;riques PDF + QR code</div>
          <div class="pl">Module pharmacien complet</div>
          <div class="pl">Notifications email patients &amp; m&#xe9;decins</div>
          <div class="pl">Acc&#xe8;s urgence QR code</div>
          <div class="pl">Jusqu&#x27;&#xe0; 7 personnels m&#xe9;dicaux</div>
        </div>
        <a href="/abonnement/plans" class="plan-btn">S&#x27;abonner</a>
        <p class="plan-note">Id&#xe9;al cabinet ou dispensaire</p>
      </div>

      <!-- STANDARD -->
      <div class="plan pop">
        <div class="pop-badge">&#x2B50; Le plus choisi</div>
        <div class="plan-name">Standard</div>
        <div class="plan-price">90 000 FCFA</div>
        <div class="plan-period">par mois</div>
        <div class="plan-list">
          <div class="pl">Tout du Starter</div>
          <div class="pl">Laboratoire &amp; Radiologie</div>
          <div class="pl">Grossesses &amp; CPN</div>
          <div class="pl">Facturation &amp; caisse</div>
          <div class="pl">Assistant IA m&#xe9;dical (acc&#xe8;s limit&#xe9;)</div>
          <div class="pl">Jusqu&#x27;&#xe0; 35 personnels m&#xe9;dicaux</div>
          <div class="pl">Statistiques avanc&#xe9;es</div>
        </div>
        <a href="/abonnement/plans" class="plan-btn">S&#x27;abonner</a>
        <p class="plan-note">Id&#xe9;al pharmacie priv&#xe9;e &amp; centre de sant&#xe9;</p>
      </div>

      <!-- PRO -->
      <div class="plan">
        <div class="plan-name">Pro</div>
        <div class="plan-price">120 000 FCFA</div>
        <div class="plan-period">par mois</div>
        <div class="plan-list">
          <div class="pl">Tout du Standard &amp; Starter</div>
          <div class="pl">Hospitalisations &amp; gestion des lits</div>
          <div class="pl">Facturation avanc&#xe9;e &amp; rapports</div>
          <div class="pl">IA m&#xe9;dicale illimit&#xe9;e</div>
          <div class="pl">SMS illimit&#xe9;s patients &amp; m&#xe9;decins</div>
          <div class="pl">Personnels m&#xe9;dicaux illimit&#xe9;s</div>
          <div class="pl">Support prioritaire d&#xe9;di&#xe9;</div>
        </div>
        <a href="/abonnement/plans" class="plan-btn">S&#x27;abonner</a>
        <p class="plan-note">Id&#xe9;al h&#xf4;pital r&#xe9;gional &amp; clinique</p>
      </div>

      <!-- ENTERPRISE -->
      <div class="plan">
        <div class="plan-name">Entreprise</div>
        <div class="plan-price">Sur devis</div>
        <div class="plan-period">tarif personnalis&#xe9;</div>
        <div class="plan-list">
          <div class="pl">Tout du Pro</div>
          <div class="pl">Multi-structures en r&#xe9;seau</div>
          <div class="pl">Onboarding &amp; formation sur site</div>
          <div class="pl">Int&#xe9;gration syst&#xe8;mes existants</div>
          <div class="pl">Accompagnement d&#xe9;di&#xe9;</div>
        </div>
        <a href="/contact" class="plan-btn">Demander un devis</a>
        <p class="plan-note">CHR, CHU, r&#xe9;seaux hospitaliers</p>
      </div>

    <p style="text-align:center;margin-top:20px;font-size:13px;color:var(--soft);">Remise de 20% pour un engagement annuel. Remise disponible pour plusieurs structures d&#x27;un m&#xea;me groupe.</p>
  </div>
</section>

<!-- APPS -->
<section class="apps" id="apps">
  <div class="si">
    <div class="stag">Applications mobiles</div>
    <h2 class="stitle">SantéBF dans votre poche</h2>
    <p class="ssub">Deux applications mobiles — une pour les patients, une pour le personnel médical. Aucune installation serveur requise.</p>
    <div class="apps-grid">
      <div class="app-card">
        <div class="app-ico">📱</div>
        <h3>SantéBF Patient</h3>
        <p>Consultez votre dossier médical, vos ordonnances, vos résultats d'examens et vos prochains rendez-vous depuis votre téléphone. Donnez votre consentement et gérez vos accès médecins.</p>
        <div class="app-btns">
          <a href="/public/patient/welcome" class="app-btn">🌐 <span><span class="app-btn-label">Accéder via</span>Application Web</span></a>
        </div>
        
      </div>
      <div class="app-card">
        <div class="app-ico">🏥</div>
        <h3>SantéBF Médecin</h3>
        <p>Accédez à vos consultations, dossiers patients, ordonnances et agenda depuis votre smartphone. Conçu pour fonctionner en mobilité dans les services hospitaliers.</p>
        <div class="app-btns">
          <a href="/auth/login" class="app-btn">🔑 <span><span class="app-btn-label">Accéder via</span>Connexion Médecin</span></a>
        </div>
        
      </div>
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="faq" id="faq">
  <div class="si">
    <div class="stag">Questions fréquentes</div>
    <h2 class="stitle">Vous avez des questions ? Nous avons les réponses.</h2>
    <p class="ssub">Retrouvez les réponses aux questions les plus posées sur la sécurité, la confidentialité, le fonctionnement et la connexion.</p>
    <div class="faq-cats">
      <button class="faq-cat active" onclick="showFaqCat('securite',this)">🔒 Sécurité</button>
      <button class="faq-cat" onclick="showFaqCat('confidentialite',this)">🛡️ Confidentialité</button>
      <button class="faq-cat" onclick="showFaqCat('consentement',this)">✅ Consentement</button>
      <button class="faq-cat" onclick="showFaqCat('connexion',this)">🔑 Connexion & Compte</button>
      <button class="faq-cat" onclick="showFaqCat('fonctionnement',this)">⚙️ Fonctionnement</button>
      <button class="faq-cat" onclick="showFaqCat('tarifs',this)">💳 Tarifs & Abonnement</button>
    </div>

    <!-- SÉCURITÉ -->
    <div id="faq-securite" class="faq-group active">
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Où sont hébergées les données de SantéBF ?<span class="faq-ico">+</span></div><div class="faq-a">Les données sont hébergées sur des serveurs sécurisés avec chiffrement complet au repos et en transit. L'infrastructure utilise des datacenters certifiés aux normes internationales de sécurité. Toutes les communications sont chiffrées et les sauvegardes sont automatiques.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Est-ce que les données médicales sont chiffrées ?<span class="faq-ico">+</span></div><div class="faq-a">Oui. Toutes les communications sont chiffrées via <strong>HTTPS</strong>. Les données stockées sont chiffrées au repos. Les mots de passe ne sont jamais stockés en clair — ils sont transformés de façon irréversible avant stockage.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Que se passe-t-il si un membre du personnel perd son téléphone ?<span class="faq-ico">+</span></div><div class="faq-a">L'accès est protégé par email et mot de passe. Si un appareil est perdu, l'administrateur de la structure peut <strong>immédiatement désactiver le compte</strong> depuis le tableau de bord administrateur. La session active est alors invalidée. Aucune donnée n'est stockée localement sur l'appareil.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Peut-on accéder à SantéBF depuis l'extérieur de la structure ?<span class="faq-ico">+</span></div><div class="faq-a">Oui, SantéBF est accessible depuis n'importe où via internet. L'accès est sécurisé par authentification obligatoire. Chaque connexion est enregistrée avec la date et l'heure. Un administrateur peut voir l'historique des connexions de son équipe.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Comment SantéBF est-il protégé contre les attaques informatiques ?<span class="faq-ico">+</span></div><div class="faq-a">SantéBF bénéficie d'une protection infrastructure qui inclut : protection contre les attaques, pare-feu applicatif, limitation de débit des requêtes. Les comptes sont automatiquement bloqués après plusieurs tentatives de connexion échouées.</div></div>
    </div>

    <!-- CONFIDENTIALITÉ -->
    <div id="faq-confidentialite" class="faq-group">
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Qui peut voir le dossier médical d'un patient ?<span class="faq-ico">+</span></div><div class="faq-a">Uniquement les personnels de santé auxquels le patient a <strong>explicitement accordé son consentement</strong>. Sans consentement, aucun médecin externe à la structure ne peut accéder au dossier. À l'intérieur d'une structure, l'accès est limité au personnel autorisé selon son rôle.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">SantéBF vend-il ou partage-t-il des données avec des tiers ?<span class="faq-ico">+</span></div><div class="faq-a"><strong>Non.</strong> SantéBF ne vend ni ne partage aucune donnée médicale ou personnelle avec des tiers, annonceurs ou partenaires commerciaux. Les données appartiennent à la structure de santé et au patient. Elles ne sont utilisées que pour le fonctionnement du service.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Un médecin d'une autre ville peut-il voir le dossier de mon patient ?<span class="faq-ico">+</span></div><div class="faq-a">Non, sauf si le patient a accordé un consentement à ce médecin ou à cette structure. Le partage de données entre structures est toujours soumis au <strong>consentement explicite du patient</strong>, qui peut le révoquer à tout moment depuis son espace personnel.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Le patient peut-il voir qui a consulté son dossier ?<span class="faq-ico">+</span></div><div class="faq-a">Oui. Chaque patient dispose d'une section <strong>"Historique des accès"</strong> dans son espace personnel. Il peut voir qui a consulté son dossier, quand et depuis quelle structure. Aucun accès n'est invisible.</div></div>
    </div>

    <!-- CONSENTEMENT -->
    <div id="faq-consentement" class="faq-group">
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Comment fonctionne le système de consentement ?<span class="faq-ico">+</span></div><div class="faq-a">Le consentement fonctionne à deux niveaux :<ul><li><strong>Consentement médecin</strong> : accordé à un médecin précis lors d'une visite. Il peut être révoqué à tout moment.</li><li><strong>Consentement structure</strong> : accordé à une structure complète, valable 3 mois, renouvelable, révocable immédiatement.</li></ul>Sans consentement actif, aucun accès extérieur n'est possible.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Un patient peut-il révoquer un consentement déjà accordé ?<span class="faq-ico">+</span></div><div class="faq-a"><strong>Oui, à tout moment.</strong> Depuis son espace "Consentements", le patient peut révoquer l'accès d'un médecin ou d'une structure en un clic. L'accès est immédiatement coupé, sans délai.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Que se passe-t-il en cas d'urgence médicale sans consentement ?<span class="faq-ico">+</span></div><div class="faq-a">Chaque patient peut obtenir un <strong>code QR d'urgence</strong>. Ce code permet un accès temporaire (24 heures) aux données vitales uniquement : groupe sanguin, allergies, maladies chroniques et contacts d'urgence. Cet accès est tracé et le patient en est informé.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Le consentement est-il obligatoire pour créer un dossier ?<span class="faq-ico">+</span></div><div class="faq-a">Non. L'agent d'accueil crée le dossier médical lors de la visite. Le consentement de partage n'est requis que pour donner l'accès à d'autres structures ou médecins. Le dossier existe et peut être utilisé par la structure d'accueil sans consentement de partage.</div></div>
    </div>

    <!-- CONNEXION -->
    <div id="faq-connexion" class="faq-group">
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Comment un médecin obtient-il ses accès ?<span class="faq-ico">+</span></div><div class="faq-a">L'administrateur de la structure crée le compte du médecin depuis le tableau de bord structure. Un <strong>mot de passe temporaire est généré automatiquement</strong> et envoyé par email au médecin. À sa première connexion, il est obligé de choisir un nouveau mot de passe personnel.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">J'ai oublié mon mot de passe, que faire ?<span class="faq-ico">+</span></div><div class="faq-a">Cliquez sur <strong>"Mot de passe oublié"</strong> sur la page de connexion. Un lien de réinitialisation vous sera envoyé par email. Ce lien est valable 1 heure. Si vous n'avez pas reçu l'email, vérifiez vos spams ou contactez l'administrateur de votre structure.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Mon compte a été bloqué. Que faire ?<span class="faq-ico">+</span></div><div class="faq-a">Après plusieurs tentatives de connexion échouées, le compte est temporairement bloqué pour des raisons de sécurité. Attendez 15 minutes ou contactez l'administrateur de votre structure pour un déblocage immédiat.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Un patient peut-il créer son propre compte ?<span class="faq-ico">+</span></div><div class="faq-a">Oui. Un patient peut créer son propre compte sur la page d'inscription depuis l'application mobile. Son dossier sera vide au départ. Il devra se présenter à l'accueil d'une structure SantéBF avec son email pour que son dossier existant lui soit lié.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Combien d'appareils peut-on utiliser simultanément ?<span class="faq-ico">+</span></div><div class="faq-a">Il n'y a pas de limite. Un médecin peut se connecter depuis son téléphone, sa tablette et son ordinateur en même temps. Chaque session est indépendante et sécurisée. La déconnexion d'une session n'affecte pas les autres.</div></div>
    </div>

    <!-- FONCTIONNEMENT -->
    <div id="faq-fonctionnement" class="faq-group">
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Faut-il une connexion internet en permanence ?<span class="faq-ico">+</span></div><div class="faq-a">Oui, SantéBF est une application web qui nécessite une connexion internet. Elle est cependant <strong>optimisée pour les connexions lentes</strong> (3G/4G). Les pages sont légères et les requêtes minimisées. Une connexion WiFi basique ou une 3G stable suffit pour utiliser toutes les fonctionnalités.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Peut-on utiliser SantéBF sur n'importe quel téléphone ?<span class="faq-ico">+</span></div><div class="faq-a">Oui. SantéBF fonctionne sur tout smartphone avec un navigateur web récent (Chrome, Firefox, Safari). Pas besoin de télécharger une application depuis un store. Il suffit d'ouvrir le navigateur et d'aller sur l'URL de la plateforme.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Comment se passe l'intégration pour une nouvelle structure ?<span class="faq-ico">+</span></div><div class="faq-a">C'est simple : <ul><li>1. Contact avec notre équipe</li><li>2. Création de votre structure dans le système</li><li>3. Création des comptes de votre équipe par votre administrateur</li><li>4. Formation rapide (1 à 2 heures) — la prise en main est intuitive</li><li>5. Début d'utilisation immédiat</li></ul>Aucune installation informatique requise de votre côté.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Que se passe-t-il si le service est temporairement indisponible ?<span class="faq-ico">+</span></div><div class="faq-a">SantéBF est hébergé sur une infrastructure fiable avec un taux de disponibilité élevé. En cas de maintenance planifiée, les utilisateurs sont prévenus à l'avance par notification.</div></div>
    </div>

    <!-- TARIFS -->
    <div id="faq-tarifs" class="faq-group">
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">L'essai gratuit inclut-il toutes les fonctionnalités ?<span class="faq-ico">+</span></div><div class="faq-a">L'essai gratuit de 6 mois inclut les fonctionnalités de base : dossiers patients, consultations, RDV, dashboard. Les modules avancés (pharmacie, laboratoire, facturation, IA) nécessitent un abonnement payant. Vous pouvez passer à un plan payant à tout moment.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Comment fonctionne le paiement de l'abonnement ?<span class="faq-ico">+</span></div><div class="faq-a">Le paiement de l'abonnement est actuellement géré manuellement pendant notre phase de lancement. Contactez-nous pour convenir des modalités (virement, Mobile Money). Un système de paiement en ligne automatisé est en cours d'intégration.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Peut-on changer de plan en cours d'abonnement ?<span class="faq-ico">+</span></div><div class="faq-a"><strong>Oui.</strong> Vous pouvez passer à un plan supérieur à tout moment. Le montant est calculé au prorata de la période restante. Contactez-nous pour toute modification de plan.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Y a-t-il une remise pour plusieurs structures du même groupe ?<span class="faq-ico">+</span></div><div class="faq-a">Oui. Des remises sont disponibles pour les groupes de structures et les engagements annuels. Contactez-nous pour obtenir un devis personnalis&#xe9; selon votre situation.</div></div>
    </div>
  </div>
</section>

<!-- CTA CONTACT -->
<section class="cta" id="contact">
  <div style="max-width:600px;margin:0 auto">
    <h2>Prêt à digitaliser votre structure ?</h2>
    <p>Contactez-nous pour une démonstration gratuite ou pour toute question sur SantéBF.</p>
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
      <a href="/auth/inscription" class="btn1" style="background:white;color:var(--vf)">🚀 Essai gratuit 6 mois</a>
      <a href="/contact" class="btn2" style="background:rgba(255,255,255,.15);color:white;border:1px solid rgba(255,255,255,.3)">&#x2709;&#xFE0F; Nous contacter</a>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="fg">
    <div class="fb">
      <h2>🏥 SantéBF</h2>
      <p>Plateforme numérique de gestion de santé pour les structures sanitaires du Burkina Faso.</p>
    </div>
    <div class="fc">
      <h4>Plateforme</h4>
      <a href="#modules">Modules</a>
      <a href="/abonnement/plans">Abonnement</a>
      <a href="#plans">Tarifs</a>
      <a href="#securite">Sécurité</a>
      <a href="#apps">Applications</a>
    </div>
    <div class="fc">
      <h4>Accès</h4>
      <a href="/auth/login">Connexion</a>
      <a href="/auth/inscription">Créer un compte</a>
      <a href="/public/patient/welcome">App Patient</a>
    </div>
    <div class="fc">
      <h4>Support</h4>
      <a href="#faq">FAQ</a>
      <a href="/contact">Nous contacter</a>
    </div>
  </div>
  <div class="fbot">
    <span>© 2026 SantéBF — Tous droits réservés</span>
    <span>Fait avec ❤️ au Burkina Faso</span>
  </div>
</footer>

<script>
// Modules tabs
function showMod(id, btn) {
  document.querySelectorAll('.mod-panel').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.mod-tab').forEach(t => t.classList.remove('active'))
  document.getElementById('mod-' + id).classList.add('active')
  btn.classList.add('active')
}

// FAQ categories
function showFaqCat(id, btn) {
  document.querySelectorAll('.faq-group').forEach(g => g.classList.remove('active'))
  document.querySelectorAll('.faq-cat').forEach(c => c.classList.remove('active'))
  document.getElementById('faq-' + id).classList.add('active')
  btn.classList.add('active')
}

// FAQ accordion
function toggleFaq(q) {
  const item = q.parentElement
  const wasOpen = item.classList.contains('open')
  // Fermer tous dans le même groupe
  const group = item.closest('.faq-group')
  group.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'))
  if (!wasOpen) item.classList.add('open')
}

// Nav mobile
function toggleMenu() {
  const nl = document.querySelector('.nl')
  if (nl.style.display === 'flex') {
    nl.style.display = ''
  } else {
    nl.style.cssText = 'display:flex;flex-direction:column;position:fixed;top:64px;left:0;right:0;background:white;padding:20px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:199;gap:16px;'
  }
}
</script>
</body>
</html>`
}
