/**
 * src/pages/login.ts
 * SantéBF — Page de connexion
 *
 * Style original SantéBF : DM Sans, carte blanche, fond gris clair
 * Signature : loginPage(erreur?, resetOk?, inscriptionOk?)
 *
 * Pas de lien "créer compte structure" ici
 * Pas de lien "app patient" ici
 * Uniquement : connexion + mot de passe oublié + lien politique
 */

export function loginPage(
  erreur?: string,
  resetOk?: boolean,
  inscriptionOk?: boolean
): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="Connexion à SantéBF — Plateforme de santé numérique du Burkina Faso.">
  <meta name="robots" content="noindex, nofollow">
  <title>Connexion — Sant&#xe9;BF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root{
      --vert:#1A6B3C;--vert-f:#0d4a2a;--vert-c:#e8f5ee;
      --rouge:#B71C1C;--rouge-c:#FFF5F5;
      --gris:#F7F8FA;--bordure:#E0E0E0;--texte:#1A1A2E;--soft:#6B7280;
    }
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{
      font-family:'DM Sans',sans-serif;
      background:var(--gris);
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
    }
    .card{
      background:white;
      border-radius:16px;
      padding:40px;
      width:100%;
      max-width:440px;
      box-shadow:0 4px 24px rgba(0,0,0,0.08);
    }
    .brand{
      display:flex;
      align-items:center;
      gap:12px;
      margin-bottom:32px;
    }
    .brand-icon{
      width:44px;height:44px;
      background:var(--vert);
      border-radius:12px;
      display:flex;align-items:center;justify-content:center;
      font-size:22px;
      flex-shrink:0;
    }
    .brand-text{}
    .brand-name{
      font-family:'DM Serif Display',serif;
      font-size:22px;
      color:var(--texte);
      line-height:1.1;
    }
    .brand-sub{
      font-size:11px;
      color:var(--soft);
      letter-spacing:.5px;
      text-transform:uppercase;
      margin-top:2px;
    }
    h1{
      font-family:'DM Serif Display',serif;
      font-size:24px;
      color:var(--texte);
      margin-bottom:6px;
    }
    .subtitle{
      font-size:13.5px;
      color:var(--soft);
      margin-bottom:28px;
      line-height:1.6;
    }
    .err-box{
      background:var(--rouge-c);
      border-left:4px solid var(--rouge);
      border-radius:9px;
      padding:12px 15px;
      margin-bottom:18px;
      font-size:13px;
      color:var(--rouge);
    }
    .ok-box{
      background:var(--vert-c);
      border-left:4px solid var(--vert);
      border-radius:9px;
      padding:12px 15px;
      margin-bottom:18px;
      font-size:13px;
      color:var(--vert-f);
      font-weight:600;
    }
    .field{margin-bottom:20px;}
    label{
      display:block;
      font-size:12.5px;
      font-weight:700;
      color:var(--texte);
      margin-bottom:7px;
    }
    .label-row{
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:7px;
    }
    .forgot{
      font-size:12px;
      color:var(--vert);
      text-decoration:none;
      font-weight:600;
    }
    .forgot:hover{text-decoration:underline;}
    .input-wrap{position:relative;}
    .input-icon{
      position:absolute;
      left:14px;
      top:50%;
      transform:translateY(-50%);
      font-size:16px;
    }
    input{
      width:100%;
      padding:12px 14px 12px 42px;
      border:1.5px solid var(--bordure);
      border-radius:10px;
      font-size:15px;
      font-family:inherit;
      color:var(--texte);
      background:#fafafa;
      outline:none;
      transition:border-color .2s, box-shadow .2s;
    }
    input:focus{
      border-color:var(--vert);
      background:white;
      box-shadow:0 0 0 3px rgba(26,107,60,0.08);
    }
    .btn-submit{
      width:100%;
      background:var(--vert);
      color:white;
      border:none;
      padding:14px;
      border-radius:10px;
      font-size:15px;
      font-weight:700;
      font-family:inherit;
      cursor:pointer;
      margin-top:8px;
      transition:background .2s, transform .15s;
    }
    .btn-submit:hover{
      background:var(--vert-f);
      transform:translateY(-1px);
    }
    .footer-links{
      text-align:center;
      margin-top:24px;
      padding-top:20px;
      border-top:1px solid var(--bordure);
    }
    .footer-links a{
      font-size:12px;
      color:var(--soft);
      text-decoration:none;
      margin:0 8px;
    }
    .footer-links a:hover{color:var(--vert);}
    @media(max-width:480px){.card{padding:28px 20px;}}
  </style>
</head>
<body>
  <div class="card">

    <!-- MARQUE -->
    <div class="brand">
      <div class="brand-icon">&#x1F3E5;</div>
      <div class="brand-text">
        <div class="brand-name">Sant&#xe9;BF</div>
        <div class="brand-sub">Plateforme de Sant&#xe9; Num&#xe9;rique</div>
      </div>
    </div>

    <h1>Connexion</h1>
    <p class="subtitle">Acc&#xe9;dez &#xe0; votre espace m&#xe9;dical s&#xe9;curis&#xe9;</p>

    ${erreur    ? `<div class="err-box">&#x26A0;&#xFE0F; ${erreur}</div>` : ''}
    ${resetOk   ? '<div class="ok-box">&#x2705; Mot de passe r&#xe9;initialis&#xe9; avec succ&#xe8;s. Connectez-vous.</div>' : ''}
    ${inscriptionOk ? '<div class="ok-box">&#x2705; Compte cr&#xe9;&#xe9; ! Vous pouvez maintenant vous connecter.</div>' : ''}

    <form method="POST" action="/auth/login">

      <div class="field">
        <label for="email">Adresse email</label>
        <div class="input-wrap">
          <span class="input-icon">&#x2709;&#xFE0F;</span>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="medecin@structure.bf"
            required
            autocomplete="email"
          >
        </div>
      </div>

      <div class="field">
        <div class="label-row">
          <label for="password" style="margin-bottom:0">Mot de passe</label>
          <a href="/auth/reset-password" class="forgot">Mot de passe oubli&#xe9; ?</a>
        </div>
        <div class="input-wrap">
          <span class="input-icon">&#x1F512;</span>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="••••••••"
            required
            autocomplete="current-password"
          >
        </div>
      </div>

      <button type="submit" class="btn-submit">
        Se connecter &#x2192;
      </button>

    </form>

    <div class="footer-links">
      <a href="/">&#x2190; Accueil</a>
      <a href="/politique-confidentialite">Confidentialit&#xe9;</a>
      <a href="/contact">Contact</a>
    </div>

  </div>
</body>
</html>`
}
