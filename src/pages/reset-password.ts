export function resetPasswordPage(erreur?: string, succes?: boolean): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Mot de passe oublié</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: #F7F8FA;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 48px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.08);
    }
    .icon-top {
      width: 64px; height: 64px;
      background: #E8F5E9;
      border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      font-size: 30px;
      margin-bottom: 24px;
    }
    h2 {
      font-family: 'DM Serif Display', serif;
      font-size: 26px;
      color: #1A1A2E;
      margin-bottom: 8px;
    }
    .desc {
      font-size: 14px;
      color: #6B7280;
      line-height: 1.65;
      margin-bottom: 28px;
    }
    .alerte {
      background: #FFF5F5;
      border-left: 4px solid #C62828;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #C62828;
    }
    .succes {
      background: #E8F5E9;
      border-left: 4px solid #1A6B3C;
      padding: 16px;
      border-radius: 8px;
      font-size: 14px;
      color: #1A6B3C;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .field { margin-bottom: 20px; }
    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #1A1A2E;
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
    input {
      width: 100%;
      padding: 13px 14px 13px 42px;
      font-family: 'DM Sans', sans-serif;
      font-size: 15px;
      border: 1.5px solid #E0E0E0;
      border-radius: 10px;
      background: #F7F8FA;
      color: #1A1A2E;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    input:focus {
      border-color: #1A6B3C;
      background: white;
      box-shadow: 0 0 0 4px rgba(26,107,60,0.08);
    }
    .btn {
      width: 100%;
      padding: 14px;
      background: #1A6B3C;
      color: white;
      font-family: 'DM Sans', sans-serif;
      font-size: 15px;
      font-weight: 600;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
      box-shadow: 0 4px 14px rgba(26,107,60,0.25);
    }
    .btn:hover { background: #2E8B57; }
    .retour {
      display: block;
      text-align: center;
      margin-top: 20px;
      font-size: 13px;
      color: #1A6B3C;
      text-decoration: none;
    }
    .retour:hover { text-decoration: underline; }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 32px;
    }
    .logo-icon {
      width: 36px; height: 36px;
      background: #1A6B3C;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .logo span {
      font-family: 'DM Serif Display', serif;
      font-size: 18px;
      color: #1A6B3C;
      font-weight: 400;
    }
  </style>
</head>
<body>
  <div class="card">

    <div class="logo">
      <div class="logo-icon">🏥</div>
      <span>SantéBF</span>
    </div>

    <div class="icon-top">🔑</div>
    <h2>Mot de passe oublié</h2>
    <p class="desc">
      Entrez votre adresse email. Si elle existe dans notre système,
      vous recevrez un lien pour réinitialiser votre mot de passe.
    </p>

    ${erreur ? `<div class="alerte">⚠️ ${erreur}</div>` : ''}

    ${succes ? `
      <div class="succes">
        ✅ <strong>Email envoyé !</strong><br>
        Si cette adresse est enregistrée dans SantéBF, vous recevrez
        un lien dans quelques minutes.<br><br>
        Vérifiez aussi vos <strong>spams</strong>.
      </div>
      <a href="/auth/login" class="retour">← Retour à la connexion</a>
    ` : `
      <form method="POST" action="/auth/reset-password">
        <div class="field">
          <label for="email">Adresse email</label>
          <div class="input-wrap">
            <span class="input-icon">✉️</span>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="votre@email.com"
              required
              autocomplete="email"
            >
          </div>
        </div>
        <button type="submit" class="btn">Envoyer le lien →</button>
      </form>
      <a href="/auth/login" class="retour">← Retour à la connexion</a>
    `}
  </div>
</body>
</html>`
}

export function resetConfirmPage(erreur?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Nouveau mot de passe</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: #F7F8FA;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 48px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.08);
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 32px;
    }
    .logo-icon {
      width: 36px; height: 36px;
      background: #1A6B3C;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .logo span {
      font-family: 'DM Serif Display', serif;
      font-size: 18px;
      color: #1A6B3C;
    }
    .icon-top {
      width: 64px; height: 64px;
      background: #E8F5E9;
      border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      font-size: 30px;
      margin-bottom: 24px;
    }
    h2 {
      font-family: 'DM Serif Display', serif;
      font-size: 26px;
      color: #1A1A2E;
      margin-bottom: 8px;
    }
    .desc {
      font-size: 14px;
      color: #6B7280;
      line-height: 1.65;
      margin-bottom: 28px;
    }
    .alerte {
      background: #FFF5F5;
      border-left: 4px solid #C62828;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #C62828;
    }
    .field { margin-bottom: 18px; }
    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #1A1A2E;
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
    input {
      width: 100%;
      padding: 13px 14px 13px 42px;
      font-family: 'DM Sans', sans-serif;
      font-size: 15px;
      border: 1.5px solid #E0E0E0;
      border-radius: 10px;
      background: #F7F8FA;
      color: #1A1A2E;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    input:focus {
      border-color: #1A6B3C;
      background: white;
      box-shadow: 0 0 0 4px rgba(26,107,60,0.08);
    }
    .regles {
      background: #F7F8FA;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #6B7280;
    }
    .regles ul { margin-left: 16px; }
    .regles li { margin-bottom: 4px; }
    .btn {
      width: 100%;
      padding: 14px;
      background: #1A6B3C;
      color: white;
      font-family: 'DM Sans', sans-serif;
      font-size: 15px;
      font-weight: 600;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
      box-shadow: 0 4px 14px rgba(26,107,60,0.25);
    }
    .btn:hover { background: #2E8B57; }
  </style>
</head>
<body>
  <div class="card">

    <div class="logo">
      <div class="logo-icon">🏥</div>
      <span>SantéBF</span>
    </div>

    <div class="icon-top">🔒</div>
    <h2>Nouveau mot de passe</h2>
    <p class="desc">
      Choisissez un nouveau mot de passe sécurisé pour votre compte SantéBF.
    </p>

    ${erreur ? `<div class="alerte">⚠️ ${erreur}</div>` : ''}

    <form method="POST" action="/auth/reset-confirm">
      <div class="field">
        <label>Nouveau mot de passe</label>
        <div class="input-wrap">
          <span class="input-icon">🔒</span>
          <input type="password" name="password" placeholder="••••••••" required>
        </div>
      </div>
      <div class="field">
        <label>Confirmer le mot de passe</label>
        <div class="input-wrap">
          <span class="input-icon">🔒</span>
          <input type="password" name="confirm" placeholder="••••••••" required>
        </div>
      </div>
      <div class="regles">
        <strong>Règles du mot de passe :</strong>
        <ul>
          <li>Au moins 8 caractères</li>
          <li>Au moins 1 majuscule (A, B, C...)</li>
          <li>Au moins 1 chiffre (1, 2, 3...)</li>
          <li>Au moins 1 caractère spécial (#  @  !  $  %)</li>
        </ul>
      </div>
      <button type="submit" class="btn">Enregistrer le mot de passe →</button>
    </form>

  </div>
</body>
</html>`
}
