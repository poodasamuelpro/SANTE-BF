export function loginPage(erreur?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Connexion</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root {
      --vert:       #1A6B3C;
      --vert-clair: #E8F5E9;
      --vert-mid:   #2E8B57;
      --bleu:       #1565C0;
      --rouge:      #C62828;
      --gris:       #F7F8FA;
      --bordure:    #E0E0E0;
      --texte:      #1A1A2E;
      --texte-soft: #6B7280;
    }

    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--gris);
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    /* ── Panneau gauche ── */
    .left {
      background: var(--vert);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 48px;
      position: relative;
      overflow: hidden;
    }

    /* Cercles décoratifs */
    .left::before {
      content: '';
      position: absolute;
      width: 400px; height: 400px;
      border-radius: 50%;
      background: rgba(255,255,255,0.04);
      top: -100px; right: -100px;
    }
    .left::after {
      content: '';
      position: absolute;
      width: 300px; height: 300px;
      border-radius: 50%;
      background: rgba(255,255,255,0.04);
      bottom: -80px; left: -80px;
    }

    .logo-zone {
      display: flex;
      align-items: center;
      gap: 14px;
      position: relative;
      z-index: 1;
    }

    .logo-icon {
      width: 52px; height: 52px;
      background: white;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .logo-text h1 {
      font-family: 'DM Serif Display', serif;
      font-size: 28px;
      color: white;
      letter-spacing: -0.5px;
    }
    .logo-text span {
      font-size: 12px;
      color: rgba(255,255,255,0.65);
      letter-spacing: 0.5px;
    }

    .left-content {
      position: relative;
      z-index: 1;
    }

    .left-content h2 {
      font-family: 'DM Serif Display', serif;
      font-size: 42px;
      color: white;
      line-height: 1.2;
      margin-bottom: 20px;
    }

    .left-content p {
      font-size: 16px;
      color: rgba(255,255,255,0.72);
      line-height: 1.7;
      max-width: 380px;
    }

    .stats-row {
      display: flex;
      gap: 32px;
      position: relative;
      z-index: 1;
    }

    .stat {
      border-top: 1px solid rgba(255,255,255,0.2);
      padding-top: 16px;
    }

    .stat strong {
      display: block;
      font-size: 22px;
      font-weight: 600;
      color: white;
    }
    .stat span {
      font-size: 12px;
      color: rgba(255,255,255,0.6);
    }

    /* Croix médicale flottante */
    .croix {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 160px; height: 160px;
      opacity: 0.06;
      z-index: 0;
    }
    .croix::before, .croix::after {
      content: '';
      position: absolute;
      background: white;
      border-radius: 8px;
    }
    .croix::before {
      width: 40px; height: 100%;
      left: 50%; transform: translateX(-50%);
      top: 0;
    }
    .croix::after {
      height: 40px; width: 100%;
      top: 50%; transform: translateY(-50%);
      left: 0;
    }

    /* ── Panneau droit ── */
    .right {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px;
      background: white;
    }

    .form-box {
      width: 100%;
      max-width: 400px;
    }

    .form-header {
      margin-bottom: 40px;
    }

    .form-header h2 {
      font-family: 'DM Serif Display', serif;
      font-size: 30px;
      color: var(--texte);
      margin-bottom: 8px;
    }

    .form-header p {
      font-size: 15px;
      color: var(--texte-soft);
    }

    /* Alerte erreur */
    .alerte {
      background: #FFF5F5;
      border: 1px solid #FECACA;
      border-left: 4px solid var(--rouge);
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: var(--rouge);
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Champs */
    .field {
      margin-bottom: 20px;
    }

    .field label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--texte);
      margin-bottom: 8px;
      letter-spacing: 0.3px;
    }

    .input-wrap {
      position: relative;
    }

    .input-wrap .icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 17px;
      pointer-events: none;
    }

    .field input {
      width: 100%;
      padding: 13px 14px 13px 42px;
      font-family: 'DM Sans', sans-serif;
      font-size: 15px;
      border: 1.5px solid var(--bordure);
      border-radius: 10px;
      background: var(--gris);
      color: var(--texte);
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
      outline: none;
    }

    .field input:focus {
      border-color: var(--vert);
      background: white;
      box-shadow: 0 0 0 4px rgba(26,107,60,0.08);
    }

    .field input::placeholder {
      color: #BDBDBD;
    }

    /* Toggle mot de passe */
    .toggle-mdp {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 17px;
      color: var(--texte-soft);
      padding: 4px;
    }

    /* Lien mot de passe oublié */
    .mdp-oublie {
      display: block;
      text-align: right;
      font-size: 13px;
      color: var(--vert);
      text-decoration: none;
      margin-top: -12px;
      margin-bottom: 28px;
    }
    .mdp-oublie:hover { text-decoration: underline; }

    /* Bouton connexion */
    .btn-login {
      width: 100%;
      padding: 14px;
      background: var(--vert);
      color: white;
      font-family: 'DM Sans', sans-serif;
      font-size: 16px;
      font-weight: 600;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(26,107,60,0.25);
    }

    .btn-login:hover {
      background: var(--vert-mid);
      box-shadow: 0 6px 20px rgba(26,107,60,0.35);
    }

    .btn-login:active {
      transform: scale(0.99);
    }

    /* Spinner loading */
    .btn-login .spinner {
      display: none;
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Séparateur rôles */
    .roles-hint {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid var(--bordure);
    }

    .roles-hint p {
      font-size: 12px;
      color: var(--texte-soft);
      text-align: center;
      margin-bottom: 12px;
    }

    .roles-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: center;
    }

    .badge {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 500;
    }

    .badge.vert   { background: #E8F5E9; color: #1A6B3C; }
    .badge.bleu   { background: #E3F2FD; color: #1565C0; }
    .badge.violet { background: #F3E5F5; color: #6A1B9A; }
    .badge.orange { background: #FFF3E0; color: #E65100; }

    /* Footer */
    .footer-note {
      margin-top: 28px;
      text-align: center;
      font-size: 12px;
      color: #BDBDBD;
    }

    /* Responsive */
    @media (max-width: 768px) {
      body { grid-template-columns: 1fr; }
      .left { display: none; }
      .right { padding: 32px 24px; }
    }
  </style>
</head>
<body>

  <!-- ── PANNEAU GAUCHE ───────────────────────────────── -->
  <div class="left">
    <div class="croix"></div>

    <div class="logo-zone">
      <div class="logo-icon">🏥</div>
      <div class="logo-text">
        <h1>SantéBF</h1>
        <span>SYSTÈME NATIONAL DE SANTÉ</span>
      </div>
    </div>

    <div class="left-content">
      <h2>Le dossier médical<br>de chaque burkinabè,<br>partout, toujours.</h2>
      <p>Plateforme numérique unifiée pour les structures sanitaires du Burkina Faso. Consultations, ordonnances, examens et hospitalisations en un seul endroit sécurisé.</p>
    </div>

    <div class="stats-row">
      <div class="stat">
        <strong>17</strong>
        <span>Régions couvertes</span>
      </div>
      <div class="stat">
        <strong>47</strong>
        <span>Provinces</span>
      </div>
      <div class="stat">
        <strong>100%</strong>
        <span>Sécurisé</span>
      </div>
    </div>
  </div>

  <!-- ── PANNEAU DROIT ────────────────────────────────── -->
  <div class="right">
    <div class="form-box">

      <div class="form-header">
        <h2>Connexion</h2>
        <p>Entrez vos identifiants pour accéder à votre espace.</p>
      </div>

      ${erreur ? `
      <div class="alerte">
        <span>⚠️</span>
        <span>${erreur}</span>
      </div>
      ` : ''}

      <form method="POST" action="/auth/login" id="loginForm">

        <div class="field">
          <label for="email">Adresse email</label>
          <div class="input-wrap">
            <span class="icon">✉️</span>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="dr.exemple@santebf.bf"
              autocomplete="email"
              required
            >
          </div>
        </div>

        <div class="field">
          <label for="password">Mot de passe</label>
          <div class="input-wrap">
            <span class="icon">🔒</span>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••••"
              autocomplete="current-password"
              required
            >
            <button type="button" class="toggle-mdp" onclick="toggleMdp()" title="Afficher/masquer">
              👁️
            </button>
          </div>
        </div>

        <a href="/auth/reset-password" class="mdp-oublie">Mot de passe oublié ?</a>

        <button type="submit" class="btn-login" id="btnLogin">
          <div class="spinner" id="spinner"></div>
          <span id="btnText">Se connecter</span>
          <span>→</span>
        </button>

      </form>

      <div class="roles-hint">
        <p>Ce portail est réservé au personnel autorisé</p>
        <div class="roles-badges">
          <span class="badge vert">Médecin</span>
          <span class="badge vert">Infirmier</span>
          <span class="badge vert">Sage-femme</span>
          <span class="badge bleu">Admin</span>
          <span class="badge violet">Pharmacien</span>
          <span class="badge orange">Caissier</span>
        </div>
      </div>

      <div class="footer-note">
        🔐 Connexion sécurisée — SantéBF 2025
      </div>

    </div>
  </div>

  <script>
    // Toggle affichage mot de passe
    function toggleMdp() {
      const input = document.getElementById('password')
      const btn   = document.querySelector('.toggle-mdp')
      if (input.type === 'password') {
        input.type = 'text'
        btn.textContent = '🙈'
      } else {
        input.type = 'password'
        btn.textContent = '👁️'
      }
    }

    // Spinner au submit
    document.getElementById('loginForm').addEventListener('submit', function() {
      const btn     = document.getElementById('btnLogin')
      const spinner = document.getElementById('spinner')
      const text    = document.getElementById('btnText')
      btn.disabled        = true
      spinner.style.display = 'block'
      text.textContent    = 'Connexion...'
    })

    // Focus automatique sur email
    document.getElementById('email').focus()
  </script>

</body>
</html>`
}
