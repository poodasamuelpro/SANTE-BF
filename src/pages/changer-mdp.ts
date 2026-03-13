export function changerMdpPage(erreur?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Changer le mot de passe</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
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
    p { font-size: 14px; color: #6B7280; margin-bottom: 28px; line-height: 1.6; }
    .alerte {
      background: #FFF5F5; border: 1px solid #FECACA;
      border-left: 4px solid #C62828; border-radius: 8px;
      padding: 12px 14px; margin-bottom: 20px;
      font-size: 13px; color: #C62828;
    }
    .field { margin-bottom: 18px; }
    .field label { display: block; font-size: 13px; font-weight: 600; color: #1A1A2E; margin-bottom: 7px; }
    .field input {
      width: 100%; padding: 12px 14px;
      font-family: 'DM Sans', sans-serif; font-size: 15px;
      border: 1.5px solid #E0E0E0; border-radius: 10px;
      background: #F7F8FA; color: #1A1A2E; outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .field input:focus {
      border-color: #1A6B3C; background: white;
      box-shadow: 0 0 0 4px rgba(26,107,60,0.08);
    }
    .regles {
      background: #F7F8FA; border-radius: 8px;
      padding: 12px 16px; margin-bottom: 24px;
      font-size: 12px; color: #6B7280;
    }
    .regles ul { margin-left: 16px; }
    .regles li { margin-bottom: 4px; }
    .btn {
      width: 100%; padding: 14px;
      background: #1A6B3C; color: white;
      font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600;
      border: none; border-radius: 10px; cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover { background: #2E8B57; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-top">🔑</div>
    <h2>Changer le mot de passe</h2>
    <p>Pour votre sécurité, vous devez définir un nouveau mot de passe avant de continuer.</p>

    ${erreur ? `<div class="alerte">⚠️ ${erreur}</div>` : ''}

    <form method="POST" action="/auth/changer-mdp">
      <div class="field">
        <label>Nouveau mot de passe</label>
        <input type="password" name="password" placeholder="Minimum 8 caractères" required>
      </div>
      <div class="field">
        <label>Confirmer le mot de passe</label>
        <input type="password" name="confirm" placeholder="Répétez le mot de passe" required>
      </div>
      <div class="regles">
        <strong>Règles :</strong>
        <ul>
          <li>Au moins 8 caractères</li>
          <li>Au moins 1 majuscule (A, B, C...)</li>
          <li>Au moins 1 chiffre (1, 2, 3...)</li>
          <li>Au moins 1 caractère spécial (# @ ! $)</li>
        </ul>
      </div>
      <button type="submit" class="btn">Enregistrer le mot de passe →</button>
    </form>
  </div>
</body>
</html>`
}
