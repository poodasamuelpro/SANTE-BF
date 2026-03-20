/**
 * src/pages/accueil-patient-app.ts
 * SantéBF — Page d'accueil de l'application patient (Capacitor)
 *
 * Affichée quand l'app s'ouvre :
 *   → "J'ai déjà un compte" → /auth/login
 *   → "Créer mon compte"    → /auth/inscription
 *
 * Design adapté mobile-first avec tutoriel en 3 étapes
 * Route : GET /patient/welcome (accessible sans auth)
 */
export function accueilPatientAppPage(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>SantéBF — Votre santé numérique</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:wght@600;700&display=swap" rel="stylesheet">
<style>
:root {
  --vert:#1A6B3C;--vert-f:#0d4a2a;--vert-c:#e8f5ee;
  --bleu:#1565C0;--bleu-c:#e3f2fd;
  --texte:#0f1923;--soft:#5a6a78;
  --blanc:#fff;--bg:#f4f9f6;
  --r:18px;--rs:12px;
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;overflow-x:hidden;}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;
  display:flex;flex-direction:column;color:var(--texte);}

/* ── HERO ──────────────────────────────────────────────────── */
.hero{
  background:linear-gradient(160deg, var(--vert-f) 0%, var(--vert) 60%, #2E8B57 100%);
  padding:env(safe-area-inset-top, 24px) 24px 0;
  display:flex;flex-direction:column;align-items:center;
  text-align:center;position:relative;overflow:hidden;
}
.hero::before{
  content:'';position:absolute;width:300px;height:300px;border-radius:50%;
  background:rgba(255,255,255,.04);top:-80px;right:-80px;
}
.hero::after{
  content:'';position:absolute;width:200px;height:200px;border-radius:50%;
  background:rgba(255,255,255,.04);bottom:-60px;left:-60px;
}
.hero-logo{
  width:80px;height:80px;background:white;border-radius:22px;
  display:flex;align-items:center;justify-content:center;font-size:38px;
  box-shadow:0 8px 32px rgba(0,0,0,.2);margin-bottom:18px;
  position:relative;z-index:1;margin-top:20px;
}
.hero-brand{font-family:'Fraunces',serif;font-size:32px;font-weight:700;color:white;
  position:relative;z-index:1;margin-bottom:4px;}
.hero-tagline{font-size:14px;color:rgba(255,255,255,.75);margin-bottom:24px;
  position:relative;z-index:1;line-height:1.5;max-width:280px;}

/* ── CAROUSEL ÉTAPES ──────────────────────────────────────── */
.carousel-wrap{position:relative;z-index:1;width:100%;overflow:hidden;padding-bottom:20px;}
.carousel{display:flex;transition:transform .35s cubic-bezier(.4,0,.2,1);width:100%;}
.slide{min-width:100%;padding:0 28px;display:flex;flex-direction:column;align-items:center;}
.slide-ico{width:80px;height:80px;border-radius:20px;background:rgba(255,255,255,.15);
  backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;
  font-size:36px;margin-bottom:14px;}
.slide-title{font-family:'Fraunces',serif;font-size:20px;color:white;margin-bottom:6px;}
.slide-desc{font-size:13px;color:rgba(255,255,255,.75);line-height:1.6;text-align:center;max-width:260px;}

/* Dots */
.dots{display:flex;gap:8px;margin:12px 0 6px;position:relative;z-index:1;}
.dot{width:8px;height:8px;border-radius:4px;background:rgba(255,255,255,.3);
  transition:all .3s;cursor:pointer;}
.dot.active{width:22px;background:white;}

/* ── CARTE PRINCIPALE ─────────────────────────────────────── */
.main-card{
  background:var(--blanc);border-radius:28px 28px 0 0;
  padding:28px 24px env(safe-area-inset-bottom, 24px);
  flex:1;box-shadow:0 -4px 24px rgba(0,0,0,.08);
  display:flex;flex-direction:column;gap:14px;
}
.card-title{font-family:'Fraunces',serif;font-size:20px;color:var(--texte);
  margin-bottom:4px;text-align:center;}
.card-sub{font-size:13px;color:var(--soft);text-align:center;margin-bottom:8px;line-height:1.5;}

/* Boutons principaux */
.btn-login{
  display:flex;align-items:center;justify-content:center;gap:10px;
  background:var(--vert);color:white;padding:17px 20px;
  border-radius:var(--r);font-size:16px;font-weight:700;
  text-decoration:none;border:none;cursor:pointer;
  box-shadow:0 4px 16px rgba(26,107,60,.3);
  transition:background .2s,transform .1s;font-family:inherit;
  width:100%;
}
.btn-login:hover{background:var(--vert-f);transform:translateY(-1px);}
.btn-login:active{transform:translateY(0);}

.btn-register{
  display:flex;align-items:center;justify-content:center;gap:10px;
  background:var(--blanc);color:var(--vert);padding:17px 20px;
  border-radius:var(--r);font-size:16px;font-weight:700;
  text-decoration:none;border:2px solid var(--vert);
  transition:background .2s,transform .1s;font-family:inherit;
  width:100%;cursor:pointer;
}
.btn-register:hover{background:var(--vert-c);}

/* Séparateur */
.sep{display:flex;align-items:center;gap:10px;color:var(--soft);font-size:12px;}
.sep::before,.sep::after{content:'';flex:1;height:1px;background:#E5E7EB;}

/* Features rapides */
.features{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px;}
.feature{background:var(--bg);border-radius:var(--rs);padding:14px;display:flex;
  flex-direction:column;align-items:center;gap:6px;text-align:center;}
.feature-ico{font-size:22px;}
.feature-lbl{font-size:11.5px;font-weight:600;color:var(--texte);}
.feature-desc{font-size:10.5px;color:var(--soft);}

/* Footer note */
.footer-note{text-align:center;font-size:11px;color:#BDBDBD;margin-top:8px;padding-top:8px;
  border-top:1px solid #F0F0F0;}
</style>
</head>
<body>

<!-- HERO avec carousel -->
<div class="hero">
  <div class="hero-logo">🏥</div>
  <div class="hero-brand">SantéBF</div>
  <div class="hero-tagline">Votre dossier médical, accessible partout au Burkina Faso</div>

  <div class="carousel-wrap">
    <div class="carousel" id="carousel">
      <div class="slide">
        <div class="slide-ico">📋</div>
        <div class="slide-title">Votre dossier partout</div>
        <div class="slide-desc">Accédez à vos consultations, ordonnances et examens depuis n'importe quelle structure SantéBF du pays.</div>
      </div>
      <div class="slide">
        <div class="slide-ico">💊</div>
        <div class="slide-title">Ordonnances numériques</div>
        <div class="slide-desc">Téléchargez vos ordonnances en PDF, vérifiables par QR code dans toute pharmacie partenaire.</div>
      </div>
      <div class="slide">
        <div class="slide-ico">🔒</div>
        <div class="slide-title">Données sécurisées</div>
        <div class="slide-desc">Vous choisissez qui accède à votre dossier. Révoquez l'accès à tout moment.</div>
      </div>
    </div>
    <div class="dots">
      <div class="dot active" onclick="goTo(0)"></div>
      <div class="dot" onclick="goTo(1)"></div>
      <div class="dot" onclick="goTo(2)"></div>
    </div>
  </div>
</div>

<!-- CARTE PRINCIPALE -->
<div class="main-card">
  <div>
    <div class="card-title">Bienvenue 👋</div>
    <div class="card-sub">Accédez à votre espace santé numérique</div>
  </div>

  <a href="/auth/login" class="btn-login">
    <span>🔑</span>
    <span>J'ai déjà un compte</span>
  </a>

  <div class="sep">ou</div>

  <a href="/auth/inscription" class="btn-register">
    <span>✨</span>
    <span>Créer mon compte</span>
  </a>

  <div class="features">
    <div class="feature">
      <div class="feature-ico">📅</div>
      <div class="feature-lbl">Rendez-vous</div>
      <div class="feature-desc">Voir mes RDV</div>
    </div>
    <div class="feature">
      <div class="feature-ico">🧪</div>
      <div class="feature-lbl">Examens</div>
      <div class="feature-desc">Résultats en ligne</div>
    </div>
    <div class="feature">
      <div class="feature-ico">💉</div>
      <div class="feature-lbl">Vaccinations</div>
      <div class="feature-desc">Carnet numérique</div>
    </div>
    <div class="feature">
      <div class="feature-ico">🚨</div>
      <div class="feature-lbl">Urgence</div>
      <div class="feature-desc">Code d'urgence</div>
    </div>
  </div>

  <div class="footer-note">🇧🇫 SantéBF — Ministère de la Santé · Burkina Faso</div>
</div>

<script>
let current = 0;
const total  = 3;
let timer    = null;

function goTo(n) {
  current = Math.max(0, Math.min(n, total - 1));
  document.getElementById('carousel').style.transform = 'translateX(-' + (current * 100) + '%)';
  document.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('active', i === current);
  });
}

function next() {
  goTo((current + 1) % total);
}

// Auto-défilement
function startTimer() {
  timer = setInterval(next, 3500);
}

// Arrêter si on tape
document.getElementById('carousel').addEventListener('touchstart', () => {
  clearInterval(timer);
}, { passive: true });

document.getElementById('carousel').addEventListener('touchend', () => {
  startTimer();
}, { passive: true });

// Swipe mobile
let startX = 0;
document.getElementById('carousel').addEventListener('touchstart', e => {
  startX = e.touches[0].clientX;
}, { passive: true });

document.getElementById('carousel').addEventListener('touchend', e => {
  const diff = startX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    diff > 0 ? goTo(current + 1) : goTo(current - 1);
  }
  startTimer();
}, { passive: true });

startTimer();
</script>
</body>
</html>`
}
