/**
 * src/pages/login.ts
 * SantéBF — Page de connexion
 *
 * Design original split 2 colonnes :
 *   GAUCHE : panneau vert foncé — logo SantéBF + tagline + features
 *   DROITE : fond blanc — formulaire email + mot de passe
 *
 * Signature : loginPage(erreur?, resetOk?, inscriptionOk?)
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
  <meta name="robots" content="noindex,nofollow">
  <title>Connexion — Sant&#xe9;BF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root {
      --v:#1A6B3C; --vf:#0d4a2a; --vc:#e8f5ee;
      --r:#B71C1C; --rc:#FFF5F5;
      --tx:#1A1A2E; --soft:#6B7280; --bd:#E0E0E0; --bg:#F7F8FA;
    }
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    html,body{height:100%}
    body{
      font-family:'DM Sans',sans-serif;
      display:flex;
      min-height:100vh;
    }

    /* ── GAUCHE ── */
    .left{
      width:420px;
      flex-shrink:0;
      background:linear-gradient(160deg,var(--vf) 0%,var(--v) 100%);
      display:flex;
      flex-direction:column;
      padding:56px 48px;
      position:relative;
      overflow:hidden;
    }
    .left::before{
      content:'';position:absolute;
      top:-100px;right:-100px;
      width:300px;height:300px;
      background:rgba(255,255,255,.05);
      border-radius:50%;
    }
    .left::after{
      content:'';position:absolute;
      bottom:-80px;left:-80px;
      width:240px;height:240px;
      background:rgba(255,255,255,.04);
      border-radius:50%;
    }

    .brand{
      display:flex;align-items:center;gap:14px;
      margin-bottom:52px;
      position:relative;z-index:1;
    }
    .brand-ico{
      width:50px;height:50px;
      background:rgba(255,255,255,.15);
      border:1px solid rgba(255,255,255,.2);
      border-radius:13px;
      display:flex;align-items:center;justify-content:center;
      font-size:24px;
    }
    .brand-name{
      font-family:'DM Serif Display',serif;
      font-size:25px;color:white;
      line-height:1.1;
    }
    .brand-sub{
      font-size:10.5px;
      color:rgba(255,255,255,.55);
      text-transform:uppercase;letter-spacing:.6px;
      margin-top:3px;
    }

    .tagline{
      font-family:'DM Serif Display',serif;
      font-size:28px;color:white;
      line-height:1.4;
      margin-bottom:36px;
      position:relative;z-index:1;
    }

    .feats{
      display:flex;flex-direction:column;gap:16px;
      position:relative;z-index:1;flex:1;
    }
    .feat{display:flex;align-items:flex-start;gap:13px;}
    .feat-ico{
      width:34px;height:34px;flex-shrink:0;
      background:rgba(255,255,255,.1);
      border-radius:9px;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;
    }
    .feat-txt{font-size:13.5px;color:rgba(255,255,255,.8);line-height:1.45;padding-top:6px;}

    .left-foot{
      margin-top:48px;
      font-size:11px;color:rgba(255,255,255,.35);
      position:relative;z-index:1;
    }
    .left-foot a{color:rgba(255,255,255,.45);text-decoration:none;}
    .left-foot a:hover{color:rgba(255,255,255,.8);}

    /* ── DROITE ── */
    .right{
      flex:1;
      background:white;
      display:flex;align-items:center;justify-content:center;
      padding:40px 24px;
    }
    .card{width:100%;max-width:400px;}

    .card h1{
      font-family:'DM Serif Display',serif;
      font-size:27px;color:var(--tx);
      margin-bottom:6px;
    }
    .card-sub{
      font-size:14px;color:var(--soft);
      margin-bottom:32px;line-height:1.5;
    }

    /* Messages */
    .msg-err{
      background:var(--rc);border-left:4px solid var(--r);
      border-radius:9px;padding:12px 14px;
      margin-bottom:20px;font-size:13px;color:var(--r);
    }
    .msg-ok{
      background:var(--vc);border-left:4px solid var(--v);
      border-radius:9px;padding:12px 14px;
      margin-bottom:20px;font-size:13px;color:var(--vf);
      font-weight:600;
    }

    /* Champs */
    .field{margin-bottom:20px;}
    .label-row{
      display:flex;justify-content:space-between;align-items:center;
      margin-bottom:7px;
    }
    label{
      display:block;font-size:12.5px;font-weight:700;color:var(--tx);
    }
    .forgot{font-size:12px;color:var(--v);text-decoration:none;font-weight:600;}
    .forgot:hover{text-decoration:underline;}

    .inp-wrap{position:relative;}
    .inp-ico{
      position:absolute;left:13px;top:50%;
      transform:translateY(-50%);
      font-size:15px;pointer-events:none;
    }
    input[type=email],input[type=password]{
      width:100%;
      padding:12px 14px 12px 40px;
      font-family:'DM Sans',sans-serif;font-size:14px;
      border:1.5px solid var(--bd);border-radius:10px;
      background:var(--bg);color:var(--tx);
      outline:none;transition:border-color .2s,background .2s;
    }
    input:focus{border-color:var(--v);background:white;}

    /* Bouton */
    .btn-submit{
      width:100%;padding:14px;
      background:var(--v);color:white;
      border:none;border-radius:10px;
      font-size:15px;font-weight:700;
      font-family:'DM Sans',sans-serif;
      cursor:pointer;
      transition:background .2s,transform .15s;
      margin-top:4px;
    }
    .btn-submit:hover{background:var(--vf);transform:translateY(-1px);}
    .btn-submit:active{transform:translateY(0);}

    /* Footer */
    .card-foot{
      margin-top:28px;padding-top:20px;
      border-top:1px solid var(--bd);
      text-align:center;
    }
    .card-foot a{
      font-size:12px;color:var(--soft);
      text-decoration:none;margin:0 8px;
    }
    .card-foot a:hover{color:var(--v);}

    /* Responsive */
    @media(max-width:768px){
      body{flex-direction:column;}
      .left{width:100%;padding:32px 24px;}
      .tagline{font-size:22px;margin-bottom:24px;}
      .feats{display:none;}
      .left-foot{margin-top:24px;}
    }
    @media(max-width:480px){
      .left{padding:24px 18px;}
      .right{padding:28px 16px;}
    }
  </style>
</head>
<body>

  <!-- GAUCHE -->
  <div class="left">
    <div class="brand">
      <div class="brand-ico">&#x1F3E5;</div>
      <div>
        <div class="brand-name">Sant&#xe9;BF</div>
        <div class="brand-sub">Plateforme de Sant&#xe9; Num&#xe9;rique</div>
      </div>
    </div>

    <div class="tagline">
      La sant&#xe9; num&#xe9;rique<br>
      au service du<br>
      Burkina Faso
    </div>

    <div class="feats">
      <div class="feat">
        <div class="feat-ico">&#x1F4CB;</div>
        <div class="feat-txt">Dossiers patients num&#xe9;riques s&#xe9;curis&#xe9;s</div>
      </div>
      <div class="feat">
        <div class="feat-ico">&#x1F4E7;</div>
        <div class="feat-txt">Ordonnances PDF avec QR code de v&#xe9;rification</div>
      </div>
      <div class="feat">
        <div class="feat-ico">&#x1F9EA;</div>
        <div class="feat-txt">Laboratoire, radiologie, grossesses &amp; CPN</div>
      </div>
      <div class="feat">
        <div class="feat-ico">&#x1F916;</div>
        <div class="feat-txt">Assistant IA m&#xe9;dical int&#xe9;gr&#xe9;</div>
      </div>
      <div class="feat">
        <div class="feat-ico">&#x1F4F1;</div>
        <div class="feat-txt">Application mobile patient incluse</div>
      </div>
    </div>

    <div class="left-foot">
      &#xa9; 2026 Sant&#xe9;BF &#x2014;
      <a href="/politique-confidentialite">Confidentialit&#xe9;</a> &#x2014;
      <a href="/contact">Contact</a> &#x2014;
      <a href="/">Accueil</a>
    </div>
  </div>

  <!-- DROITE -->
  <div class="right">
    <div class="card">
      <h1>Connexion</h1>
      <p class="card-sub">Acc&#xe9;dez &#xe0; votre espace m&#xe9;dical s&#xe9;curis&#xe9;</p>

      ${erreur       ? `<div class="msg-err">&#x26A0;&#xFE0F; ${erreur}</div>` : ''}
      ${resetOk      ? `<div class="msg-ok">&#x2705; Mot de passe r&#xe9;initialis&#xe9;. Connectez-vous.</div>` : ''}
      ${inscriptionOk ? `<div class="msg-ok">&#x2705; Compte cr&#xe9;&#xe9; ! Vous pouvez vous connecter.</div>` : ''}

      <form method="POST" action="/auth/login">

        <div class="field">
          <label for="email">Adresse email</label>
          <div class="inp-wrap">
            <span class="inp-ico">&#x2709;&#xFE0F;</span>
            <input
              type="email" id="email" name="email"
              placeholder="medecin@structure.bf"
              required autocomplete="email"
            >
          </div>
        </div>

        <div class="field">
          <div class="label-row">
            <label for="password">Mot de passe</label>
            <a href="/auth/reset-password" class="forgot">Mot de passe oubli&#xe9; ?</a>
          </div>
          <div class="inp-wrap">
            <span class="inp-ico">&#x1F512;</span>
            <input
              type="password" id="password" name="password"
              placeholder="••••••••"
              required autocomplete="current-password"
            >
          </div>
        </div>

        <button type="submit" class="btn-submit">
          Se connecter &#x2192;
        </button>

      </form>

      <div class="card-foot">
        <a href="/plans">Inscrire ma structure</a>
        <a href="/auth/inscription">App patient</a>
        <a href="/politique-confidentialite">Confidentialit&#xe9;</a>
      </div>

    </div>
  </div>

</body>
</html>`
}
