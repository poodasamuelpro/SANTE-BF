export function loginPage(erreur?: string, resetOk?: boolean): string {
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
      --vert-mid:   #2E8B57;
      --vert-clair: #E8F5E9;
      --bleu:       #1565C0;
      --rouge:      #C62828;
      --gris:       #F7F8FA;
      --bordure:    #E0E0E0;
      --texte:      #1A1A2E;
      --texte-soft: #6B7280;
    }
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--gris);
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    /* ── Panneau gauche ─────────────────────────── */
    .left {
      background: var(--vert);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 48px;
      position: relative;
      overflow: hidden;
    }
    .left::before {
      content: '';
      position: absolute;
      width: 450px; height: 450px;
      border-radius: 50%;
      background: rgba(255,255,255,0.04);
      top: -120px; right: -120px;
    }
    .left::after {
      content: '';
      position: absolute;
      width: 300px; height: 300px;
      border-radius: 50%;
      background: rgba(255,255,255,0.04);
      bottom: -80px; left: -80px;
    }
    .croix {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 200px; height: 200px;
      opacity: 0.05;
      z-index: 0;
    }
    .croix::before, .croix::after {
      content: '';
      position: absolute;
      background: white;
      border-radius: 10px;
    }
    .croix::before { width: 50px; height: 100%; left: 50%; transform: translateX(-50%); }
    .croix::after  { height: 50px; width: 100%; top: 50%; transform: translateY(-50%); }

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
      display: flex; align-items: center; justify-content: center;
      font-size: 26px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    .logo-text h1 {
      font-family: 'DM Serif Display', serif;
      font-size: 28px;
      color: white;
    }
    .logo-text span {
      font-size: 11px;
      color: rgba(255,255,255,0.6);
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .left-content {
      position: relative;
      z-index: 1;
    }
    .left-content h2 {
      font-family: 'DM Serif Display', serif;
      font-size: 40px;
      color: white;
      line-height: 1.2;
      margin-bottom: 20px;
    }
    .left-content p {
      font-size: 15px;
      color: rgba(255,255,255,0.7);
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
    .stat strong { display: block; font-size: 22px; font-weight: 600; color: white; }
    .stat span   { font-size: 12px; color: rgba(255,255,255,0.6); }

    /* ── Panneau droit ──────────────────────────── */
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
    .form-header { margin-bottom: 36px; }
    .form-header h2 {
      font-family: 'DM Serif Display', serif;
      font-size: 30px;
      color: var(--texte);
      margin-bottom: 6px;
    }
    .form-header p { font-size: 14px; color: var(--texte-soft); }

    /* Messages */
    .alerte {
      background: #FFF5F5;
      border: 1px solid #FECACA;
      border-left: 4px solid var(--rouge);
      border-radius: 8px;
      padding: 13px 16px;
      margin-bottom: 22px;
      font-size: 13px;
      color: var(--rouge);
      animation: fadeIn 0.3s ease;
    }
    .succes-msg {
      background: var(--vert-clair);
      border-left: 4px solid var(--vert);
      border-radius: 8px;
      padding: 13px 16px;
      margin-bottom: 22px;
      font-size: 13px;
      color: var(--vert);
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn {
      from { opacity:0; transform:translateY(-6px); }
      to   { opacity:1; transform:translateY(0); }
    }

    /* Champs */
    .field { margin-bottom: 20px; }
    .field label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--texte);
      margin-bottom: 7px;
    }
    .input-wrap { position: relative; }
    .input-icon {
      position: absolute;
      left: 14px; top: 50%;
      transform: translateY(-50%);
      font-size: 16px;
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
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    }
    .field input:focus {
      border-color: var(--vert);
      background: white;
      box-shadow: 0 0 0 4px rgba(26,107,60,0.08);
    }
    .field input::placeholder { color: #BDBDBD; }

    .toggle-mdp {
      position: absolute;
      right: 12px; top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: var(--texte-soft);
      padding: 4px;
    }
    .mdp-oublie {
      display: block;
      text-align: right;
      font-size: 12px;
      color: var(--vert);
      text-decoration: none;
      margin-top: -12px;
      margin-bottom: 26px;
    }
    .mdp-oublie:hover { text-decoration: underline; }

    /* Bouton */
    .btn-login {
      width: 100%;
      padding: 14px;
      background: var(--vert);
      color: white;
      font-family: 'DM Sans', sans-serif;
      font-size: 15px;
      font-weight: 600;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s, box-shadow 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(26,107,60,0.25);
    }
    .btn-login:hover { background: var(--vert-mid); box-shadow: 0 6px 20px rgba(26,107,60,0.35); }
    .btn-login:disabled { opacity: 0.7; cursor: not-allowed; }
    .spinner {
      display: none;
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.35);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Badges rôles */
    .roles-hint {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid var(--bordure);
    }
    .roles-hint p { font-size: 12px; color: var(--texte-soft); text-align: center; margin-bottom: 10px; }
    .roles-badges { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
    .badge {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 500;
    }
    .badge.v { background: #E8F5E9; color: #1A6B3C; }
    .badge.b { background: #E3F2FD; color: #1565C0; }
    .badge.p { background: #F3E5F5; color: #6A1B9A; }
    .badge.o { background: #FFF3E0; color: #E65100; }

    .footer-note { margin-top: 24px; text-align: center; font-size: 11px; color: #BDBDBD; }

    /* Responsive */
    @media (max-width: 768px) {
      body { grid-template-columns: 1fr; }
      .left { display: none; }
      .right { padding: 32px 24px; background: var(--gris); }
    }
  </style>
</head>
<body>

  <!-- Panneau gauche -->
  <div class="left">
    <div class="croix"></div>
    <div class="logo-zone">
      <div class="logo-icon">🏥</div>
      <div class="logo-text">
        <h1>SantéBF</h1>
        <span>Système National de Santé</span>
      </div>
    </div>
    <div class="left-content">
      <h2>Le dossier médical<br>de chaque burkinabè,<br>partout, toujours.</h2>
      <p>Plateforme numérique unifiée pour toutes les structures sanitaires du Burkina Faso. Consultations, ordonnances, examens et hospitalisations en un seul endroit sécurisé.</p>
    </div>
    <div class="stats-row">
      <div class="stat"><strong>17</strong><span>Régions</span></div>
      <div class="stat"><strong>47</strong><span>Provinces</span></div>
      <div class="stat"><strong>100%</strong><span>Sécurisé</span></div>
    </div>
  </div>

  <!-- Panneau droit -->
  <div class="right">
    <div class="form-box">
      <div class="form-header">
        <h2>Connexion</h2>
        <p>Accédez à votre espace SantéBF</p>
      </div>

      ${erreur ? `<div class="alerte">⚠️ ${erreur}</div>` : ''}
      ${resetOk ? `<div class="succes-msg">✅ Mot de passe modifié avec succès. Reconnectez-vous.</div>` : ''}

      <form method="POST" action="/auth/login" id="loginForm">
        <div class="field">
          <label for="email">Adresse email</label>
          <div class="input-wrap">
            <span class="input-icon">✉️</span>
            <input type="email" id="email" name="email"
              placeholder="dr.exemple@santebf.bf"
              autocomplete="email" required>
          </div>
        </div>

        <div class="field">
          <label for="password">Mot de passe</label>
          <div class="input-wrap">
            <span class="input-icon">🔒</span>
            <input type="password" id="password" name="password"
              placeholder="••••••••••"
              autocomplete="current-password" required>
            <button type="button" class="toggle-mdp" onclick="toggleMdp()" title="Afficher">👁️</button>
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
        <p>Portail réservé au personnel autorisé</p>
        <div class="roles-badges">
          <span class="badge v">Médecin</span>
          <span class="badge v">Infirmier</span>
          <span class="badge v">Sage-femme</span>
          <span class="badge b">Admin</span>
          <span class="badge p">Pharmacien</span>
          <span class="badge o">Caissier</span>
        </div>
      </div>

      <div class="footer-note">🔐 Connexion sécurisée — SantéBF 2025</div>
    </div>
  </div>

  <script>
    function toggleMdp() {
      const i = document.getElementById('password')
      const b = document.querySelector('.toggle-mdp')
      if (!i || !b) return
      i.type = i.type === 'password' ? 'text' : 'password'
      b.textContent = i.type === 'password' ? '👁️' : '🙈'
    }
    
    // SCRIPT AMÉLIORÉ
    let loginTimeout = null;
    
    const form = document.getElementById('loginForm')
    if (!form) {
      console.error('❌ Formulaire loginForm introuvable')
    } else {
      form.addEventListener('submit', (e) => {
        console.log('🔄 Soumission du formulaire de connexion')
        
        const btn = document.getElementById('btnLogin')
        const spinner = document.getElementById('spinner')
        const btnText = document.getElementById('btnText')
        
        if (!btn || !spinner || !btnText) {
          console.error('❌ Éléments du bouton introuvables')
          return // Laisser le formulaire se soumettre normalement
        }
        
        spinner.style.display = 'block'
        btnText.textContent = 'Connexion...'
        btn.disabled = true
        
        console.log('✓ Spinner activé, formulaire va se soumettre')
        
        // Timeout réduit à 15 secondes pour debug
        loginTimeout = setTimeout(() => {
          console.warn('⏱️ Timeout de 15s atteint')
          
          // Vérifier si la page a changé
          if (document.body.contains(btn)) {
            spinner.style.display = 'none'
            btnText.textContent = 'Se connecter'
            btn.disabled = false
            
            // Afficher une alerte d'erreur
            let alert = document.getElementById('timeoutAlert')
            if (!alert) {
              alert = document.createElement('div')
              alert.id = 'timeoutAlert'
              alert.className = 'alerte'
              alert.innerHTML = '⚠️ La connexion prend trop de temps. Vérifiez votre connexion internet et ouvrez la console développeur (F12) pour voir les erreurs.'
              form.parentElement.insertBefore(alert, form)
            }
          }
        }, 15000) // 15 secondes
      })
    }
    
    // Nettoyer le timeout si la page est déchargée
    window.addEventListener('beforeunload', () => {
      if (loginTimeout) clearTimeout(loginTimeout)
    })
    
    // Focus sur le champ email
    const emailInput = document.getElementById('email')
    if (emailInput) emailInput.focus()
    
    console.log('✅ Script de connexion chargé')
  </script>
</body>
</html>`
}