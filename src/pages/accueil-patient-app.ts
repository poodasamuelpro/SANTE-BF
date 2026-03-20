/**
 * src/pages/accueil-patient-app.ts
 * SantéBF — Page d'accueil de l'application patient
 *
 * Affichée quand l'app mobile s'ouvre :
 *   → "J'ai déjà un compte" → /auth/login
 *   → "Créer mon compte"   → /auth/inscription
 *
 * Route : GET /public/patient/welcome (public, sans auth)
 *         GET /auth/welcome (alias)
 *
 * Aucune mention état / ministère / gouvernement
 */

export function accueilPatientAppPage(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#1A6B3C">
  <title>SantéBF — Votre santé numérique</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:wght@600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --v: #1A6B3C;
      --vf: #0d4a2a;
      --vc: #e8f5ee;
      --b: #1565C0;
      --bc: #e3f2fd;
      --tx: #0f1923;
      --soft: #5a6a78;
      --bg: #f4f7f4;
      --w: #fff;
      --bd: #e0e8e0;
    }
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
      min-height: 100vh;
      min-height: 100svh;
      display: flex;
      flex-direction: column;
      color: var(--tx);
      overflow-x: hidden;
    }

    /* HEADER HERO */
    .hero {
      background: linear-gradient(160deg, var(--vf) 0%, var(--v) 60%, #2d8a52 100%);
      padding: env(safe-area-inset-top, 20px) 24px 60px;
      text-align: center;
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }
    .hero::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0; right: 0;
      height: 48px;
      background: var(--bg);
      clip-path: ellipse(55% 100% at 50% 100%);
    }
    .hero-logo {
      width: 72px; height: 72px;
      background: rgba(255,255,255,0.15);
      border-radius: 22px;
      border: 2px solid rgba(255,255,255,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 36px;
      margin: 32px auto 20px;
      backdrop-filter: blur(10px);
    }
    .hero h1 {
      font-family: 'Fraunces', serif;
      font-size: 30px;
      color: #fff;
      margin-bottom: 10px;
      line-height: 1.2;
    }
    .hero-sub {
      font-size: 15px;
      color: rgba(255,255,255,0.75);
      max-width: 320px;
      margin: 0 auto;
      line-height: 1.6;
    }

    /* CONTENU PRINCIPAL */
    .content {
      flex: 1;
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 440px;
      margin: 0 auto;
      width: 100%;
    }

    /* BOUTONS PRINCIPAUX */
    .btn-main {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--w);
      border: 2px solid var(--bd);
      border-radius: 16px;
      padding: 20px 22px;
      text-decoration: none;
      color: var(--tx);
      transition: all 0.2s;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    .btn-main:hover, .btn-main:active {
      border-color: var(--v);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(26,107,60,0.12);
    }
    .btn-main.primary {
      background: var(--v);
      border-color: var(--v);
      color: #fff;
    }
    .btn-main.primary:hover {
      background: var(--vf);
      border-color: var(--vf);
    }
    .btn-ico {
      width: 48px; height: 48px;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
    }
    .btn-main.primary .btn-ico { background: rgba(255,255,255,0.2); }
    .btn-main:not(.primary) .btn-ico { background: var(--vc); }
    .btn-text { flex: 1; }
    .btn-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 3px;
    }
    .btn-desc {
      font-size: 12.5px;
      opacity: 0.7;
      line-height: 1.4;
    }
    .btn-arrow {
      font-size: 18px;
      opacity: 0.5;
    }
    .btn-main.primary .btn-arrow { opacity: 0.7; }

    /* SÉPARATEUR */
    .sep {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--soft);
      font-size: 13px;
    }
    .sep::before, .sep::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--bd);
    }

    /* TUTORIEL */
    .tuto {
      background: var(--w);
      border-radius: 16px;
      padding: 22px;
      border: 1.5px solid var(--bd);
      margin-top: 8px;
    }
    .tuto-title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--tx);
    }
    .tuto-steps {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .tuto-step {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .step-num {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: var(--v);
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .step-text { flex: 1; }
    .step-title {
      font-size: 13.5px;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .step-desc {
      font-size: 12px;
      color: var(--soft);
      line-height: 1.5;
    }
    .step-done .step-num {
      background: var(--vc);
      color: var(--v);
    }

    /* INFO BOX */
    .info-box {
      background: var(--bc);
      border-left: 3px solid var(--b);
      border-radius: 10px;
      padding: 13px 15px;
      font-size: 13px;
      color: #1a3a6b;
      line-height: 1.6;
    }
    .info-box strong {
      display: block;
      margin-bottom: 4px;
      font-size: 13.5px;
    }

    /* FOOTER */
    .footer-note {
      text-align: center;
      font-size: 12px;
      color: var(--soft);
      padding: 16px 24px env(safe-area-inset-bottom, 16px);
    }
    .footer-note a {
      color: var(--v);
      text-decoration: none;
      font-weight: 600;
    }

    @media (min-width: 480px) {
      .hero { padding-top: 40px; }
      .hero h1 { font-size: 34px; }
    }
  </style>
</head>
<body>

  <!-- HERO -->
  <div class="hero">
    <div class="hero-logo">🏥</div>
    <h1>SantéBF</h1>
    <p class="hero-sub">Votre dossier médical numérique — accessible partout, à tout moment.</p>
  </div>

  <!-- CONTENU -->
  <div class="content">

    <!-- BOUTON : J'ai un compte -->
    <a href="/auth/login" class="btn-main primary">
      <div class="btn-ico">🔑</div>
      <div class="btn-text">
        <div class="btn-title">J'ai déjà un compte</div>
        <div class="btn-desc">Connexion à mon espace patient</div>
      </div>
      <span class="btn-arrow">→</span>
    </a>

    <div class="sep">ou</div>

    <!-- BOUTON : Créer un compte -->
    <a href="/auth/inscription" class="btn-main">
      <div class="btn-ico">✨</div>
      <div class="btn-text">
        <div class="btn-title">Créer mon compte</div>
        <div class="btn-desc">Nouveau sur SantéBF ? Inscrivez-vous gratuitement</div>
      </div>
      <span class="btn-arrow" style="color:var(--v)">→</span>
    </a>

    <!-- INFO BOX -->
    <div class="info-box">
      <strong>ℹ️ Comment ça fonctionne ?</strong>
      Créez votre compte, puis présentez-vous à l'accueil d'une structure partenaire SantéBF avec votre email. Votre dossier médical sera lié à votre compte.
    </div>

    <!-- TUTORIEL -->
    <div class="tuto">
      <div class="tuto-title">📋 En 3 étapes simples</div>
      <div class="tuto-steps">
        <div class="tuto-step step-done">
          <div class="step-num">1</div>
          <div class="step-text">
            <div class="step-title">Créez votre compte</div>
            <div class="step-desc">Inscription gratuite avec votre email et un mot de passe sécurisé.</div>
          </div>
        </div>
        <div class="tuto-step">
          <div class="step-num">2</div>
          <div class="step-text">
            <div class="step-title">Liez votre dossier médical</div>
            <div class="step-desc">Rendez-vous à l'accueil d'une structure SantéBF et donnez votre email. L'agent liera votre dossier à votre compte.</div>
          </div>
        </div>
        <div class="tuto-step">
          <div class="step-num">3</div>
          <div class="step-text">
            <div class="step-title">Accédez à vos données</div>
            <div class="step-desc">Consultez vos ordonnances, résultats d'examens, rendez-vous et historique médical depuis cette application.</div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- FOOTER -->
  <div class="footer-note">
    🔒 Connexion sécurisée — <a href="/public/">En savoir plus sur SantéBF</a>
  </div>

</body>
</html>`
}
