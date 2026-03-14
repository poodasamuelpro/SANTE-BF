export function changerMdpPage(erreur?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Changer le mot de passe</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
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
      background: #FFF3E0;
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
    .info-box {
      background: #FFF8E1;
      border-left: 4px solid #F9A825;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      color: #E65100;
      margin-bottom: 24px;
    }
    .alerte {
      background: #FFF5F5;
      border-left: 4px solid #C62828;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #C62828;
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn {
      from { opacity:0; transform:translateY(-6px); }
      to   { opacity:1; transform:translateY(0); }
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
    .regles strong { display: block; margin-bottom: 6px; color: #424242; }
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

    <div class="icon-top">🔑</div>
    <h2>Changer le mot de passe</h2>
    <p class="desc">Pour votre sécurité, vous devez définir un nouveau mot de passe avant de continuer.</p>

    <div class="info-box">
      ⚠️ Cette action est obligatoire à la première connexion.
    </div>

    ${erreur ? `<div class="alerte">⚠️ ${erreur}</div>` : ''}

    <form method="POST" action="/auth/changer-mdp">
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
      <button type="submit" class="btn">Enregistrer et continuer →</button>
    </form>

  </div>
</body>
</html>`
}
