/**
 * src/pages/changer-mdp.ts
 * SantéBF — Page de changement de mot de passe obligatoire
 *
 * Affichée automatiquement quand doit_changer_mdp = true dans auth_profiles.
 * L'utilisateur ne peut PAS accéder à son dashboard tant qu'il n'a pas
 * changé son mot de passe temporaire.
 *
 * Route : GET /auth/changer-mdp dans src/routes/auth.ts
 */

export function changerMdpPage(erreur?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Changer mon mot de passe — SantéBF</title>
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
      margin-bottom:28px;
    }
    .brand-icon{
      width:44px;height:44px;
      background:var(--vert);
      border-radius:12px;
      display:flex;align-items:center;justify-content:center;
      font-size:22px;
    }
    .brand-name{
      font-family:'DM Serif Display',serif;
      font-size:22px;
      color:var(--texte);
    }
    .brand-sub{font-size:11px;color:var(--soft);letter-spacing:1px;text-transform:uppercase;}
    h1{font-family:'DM Serif Display',serif;font-size:24px;color:var(--texte);margin-bottom:6px;}
    .subtitle{font-size:13.5px;color:var(--soft);margin-bottom:24px;line-height:1.6;}
    .info-box{
      background:var(--vert-c);
      border-left:4px solid var(--vert);
      border-radius:9px;
      padding:13px 15px;
      margin-bottom:22px;
      font-size:13px;
      color:var(--vert-f);
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
    .field{margin-bottom:18px;}
    label{
      display:block;
      font-size:12.5px;
      font-weight:700;
      color:var(--texte);
      margin-bottom:6px;
    }
    .input-wrap{position:relative;}
    input[type="password"],input[type="text"]{
      width:100%;
      padding:12px 42px 12px 14px;
      border:1.5px solid var(--bordure);
      border-radius:10px;
      font-size:15px;
      font-family:inherit;
      color:var(--texte);
      background:#fafafa;
      outline:none;
      transition:border-color .2s,box-shadow .2s;
    }
    input:focus{
      border-color:var(--vert);
      background:white;
      box-shadow:0 0 0 3px rgba(26,107,60,0.08);
    }
    .toggle-btn{
      position:absolute;
      right:12px;top:50%;transform:translateY(-50%);
      background:none;border:none;cursor:pointer;
      font-size:16px;color:var(--soft);padding:4px;
    }
    .hint{font-size:11.5px;color:var(--soft);margin-top:5px;line-height:1.5;}
    .hint.match-error{color:var(--rouge);}
    .regle{
      display:flex;align-items:center;gap:6px;
      font-size:12px;padding:4px 0;
      color:var(--soft);
    }
    .regle.ok{color:var(--vert);}
    .regle::before{content:'○';font-size:10px;}
    .regle.ok::before{content:'✓';}
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
      transition:background .2s;
      margin-top:6px;
    }
    .btn-submit:hover{background:var(--vert-f);}
    .logout-link{
      text-align:center;
      margin-top:20px;
      font-size:13px;
      color:var(--soft);
    }
    .logout-link a{color:var(--rouge);font-weight:600;text-decoration:none;}
    @media(max-width:480px){.card{padding:28px 20px;}}
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <div class="brand-icon">🏥</div>
      <div>
        <div class="brand-name">SantéBF</div>
        <div class="brand-sub">Santé Numérique Burkina</div>
      </div>
    </div>

    <h1>🔐 Changer mon mot de passe</h1>
    <p class="subtitle">Votre compte a été créé avec un mot de passe temporaire.<br>Veuillez définir votre nouveau mot de passe pour continuer.</p>

    <div class="info-box">
      ⚠️ <strong>Obligatoire :</strong> Vous devez changer votre mot de passe temporaire avant d'accéder à votre espace SantéBF.
    </div>

    ${erreur ? `<div class="err-box">⚠️ ${erreur}</div>` : ''}

    <form method="POST" action="/auth/changer-mdp" id="formMdp">
      <div class="field">
        <label>Nouveau mot de passe</label>
        <div class="input-wrap">
          <input type="password" name="password" id="pwd1"
            placeholder="Votre nouveau mot de passe"
            autocomplete="new-password" required>
          <button type="button" class="toggle-btn" onclick="toggle('pwd1',this)">👁️</button>
        </div>
        <div style="margin-top:8px;">
          <div class="regle" id="r-len">8 caractères minimum</div>
          <div class="regle" id="r-maj">Au moins 1 majuscule</div>
          <div class="regle" id="r-num">Au moins 1 chiffre</div>
          <div class="regle" id="r-spe">Au moins 1 caractère spécial (#@!$%)</div>
        </div>
      </div>

      <div class="field">
        <label>Confirmer le mot de passe</label>
        <div class="input-wrap">
          <input type="password" name="confirm" id="pwd2"
            placeholder="Répéter le mot de passe"
            autocomplete="new-password" required>
          <button type="button" class="toggle-btn" onclick="toggle('pwd2',this)">👁️</button>
        </div>
        <div class="hint match-error" id="matchErr" style="display:none;">⚠️ Les mots de passe ne correspondent pas</div>
      </div>

      <button type="submit" class="btn-submit" id="btnSubmit">✅ Enregistrer mon mot de passe</button>
    </form>

    <div class="logout-link">
      <a href="/auth/logout">Se déconnecter</a>
    </div>
  </div>

  <script>
    function toggle(id, btn) {
      const i = document.getElementById(id)
      i.type = i.type === 'password' ? 'text' : 'password'
      btn.textContent = i.type === 'password' ? '👁️' : '🙈'
    }

    const pwd1 = document.getElementById('pwd1')
    const pwd2 = document.getElementById('pwd2')
    const matchErr = document.getElementById('matchErr')

    pwd1.addEventListener('input', () => {
      const v = pwd1.value
      setRegle('r-len', v.length >= 8)
      setRegle('r-maj', /[A-Z]/.test(v))
      setRegle('r-num', /[0-9]/.test(v))
      setRegle('r-spe', /[#@!$%]/.test(v))
      checkMatch()
    })

    pwd2.addEventListener('input', checkMatch)

    function setRegle(id, ok) {
      const el = document.getElementById(id)
      el.classList.toggle('ok', ok)
    }

    function checkMatch() {
      if (pwd2.value && pwd1.value !== pwd2.value) {
        matchErr.style.display = 'block'
        pwd2.style.borderColor = '#B71C1C'
      } else {
        matchErr.style.display = 'none'
        pwd2.style.borderColor = ''
      }
    }

    document.getElementById('formMdp').addEventListener('submit', (e) => {
      if (pwd1.value !== pwd2.value) {
        e.preventDefault()
        matchErr.style.display = 'block'
        pwd2.focus()
      }
    })
  </script>

  <div style="text-align:center;padding:12px;font-size:11px;color:var(--soft)">
    <a href="/politique-confidentialite" style="color:var(--soft);text-decoration:none">&#x1F512; Politique de confidentialit&#xe9;</a>
  </div>
</body>
</html>`
}
