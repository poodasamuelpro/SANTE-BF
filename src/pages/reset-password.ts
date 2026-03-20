/**
 * src/pages/reset-password.ts
 * SantéBF — Pages de réinitialisation de mot de passe
 *
 * Deux fonctions exportées :
 *   resetPasswordPage()  → page "Mot de passe oublié" (saisie email)
 *   resetConfirmPage()   → page "Nouveau mot de passe" (après clic sur lien email)
 *
 * Routes dans src/routes/auth.ts :
 *   GET  /auth/reset-password  → resetPasswordPage()
 *   POST /auth/reset-password  → envoie email de réinitialisation via Supabase
 *   GET  /auth/reset-confirm   → resetConfirmPage()
 *   POST /auth/reset-confirm   → enregistre le nouveau mot de passe
 */

// ── Page "Mot de passe oublié" ────────────────────────────────
export function resetPasswordPage(erreur?: string, succes?: boolean): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mot de passe oublié — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root{--vert:#1A6B3C;--vert-f:#0d4a2a;--vert-c:#e8f5ee;--rouge:#B71C1C;--rouge-c:#FFF5F5;--gris:#F7F8FA;--bordure:#E0E0E0;--texte:#1A1A2E;--soft:#6B7280;}
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:var(--gris);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
    .card{background:white;border-radius:16px;padding:40px;width:100%;max-width:420px;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
    .brand{display:flex;align-items:center;gap:12px;margin-bottom:28px;}
    .brand-icon{width:44px;height:44px;background:var(--vert);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;}
    .brand-name{font-family:'DM Serif Display',serif;font-size:22px;color:var(--texte);}
    .brand-sub{font-size:11px;color:var(--soft);letter-spacing:1px;text-transform:uppercase;}
    h1{font-family:'DM Serif Display',serif;font-size:24px;color:var(--texte);margin-bottom:6px;}
    .subtitle{font-size:13.5px;color:var(--soft);margin-bottom:24px;line-height:1.6;}
    .err-box{background:var(--rouge-c);border-left:4px solid var(--rouge);border-radius:9px;padding:12px 15px;margin-bottom:18px;font-size:13px;color:var(--rouge);}
    .ok-box{background:var(--vert-c);border-left:4px solid var(--vert);border-radius:9px;padding:12px 15px;margin-bottom:18px;font-size:13px;color:var(--vert-f);}
    .field{margin-bottom:18px;}
    label{display:block;font-size:12.5px;font-weight:700;color:var(--texte);margin-bottom:6px;}
    .input-wrap{position:relative;}
    .input-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;}
    input{width:100%;padding:12px 14px 12px 42px;border:1.5px solid var(--bordure);border-radius:10px;font-size:15px;font-family:inherit;color:var(--texte);background:#fafafa;outline:none;transition:border-color .2s;}
    input:focus{border-color:var(--vert);background:white;box-shadow:0 0 0 3px rgba(26,107,60,0.08);}
    .btn-submit{width:100%;background:var(--vert);color:white;border:none;padding:14px;border-radius:10px;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;margin-top:6px;}
    .btn-submit:hover{background:var(--vert-f);}
    .back-link{text-align:center;margin-top:20px;font-size:13px;color:var(--soft);}
    .back-link a{color:var(--vert);font-weight:700;text-decoration:none;}
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

    <h1>🔑 Mot de passe oublié</h1>
    <p class="subtitle">Entrez votre adresse email. Vous recevrez un lien pour réinitialiser votre mot de passe.</p>

    ${erreur ? `<div class="err-box">⚠️ ${erreur}</div>` : ''}
    ${succes ? `<div class="ok-box">✅ Email envoyé ! Vérifiez votre boîte mail et cliquez sur le lien pour réinitialiser votre mot de passe.<br><br>Le lien expire dans 1 heure.</div>` : ''}

    ${!succes ? `
    <form method="POST" action="/auth/reset-password">
      <div class="field">
        <label>Adresse email</label>
        <div class="input-wrap">
          <span class="input-icon">✉️</span>
          <input type="email" name="email"
            placeholder="votre@email.com"
            autocomplete="email" required>
        </div>
      </div>
      <button type="submit" class="btn-submit">📨 Envoyer le lien</button>
    </form>` : ''}

    <div class="back-link">
      <a href="/auth/login">← Retour à la connexion</a>
    </div>
  </div>
</body>
</html>`
}

// ── Page "Nouveau mot de passe" ───────────────────────────────
export function resetConfirmPage(erreur?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouveau mot de passe — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root{--vert:#1A6B3C;--vert-f:#0d4a2a;--rouge:#B71C1C;--rouge-c:#FFF5F5;--gris:#F7F8FA;--bordure:#E0E0E0;--texte:#1A1A2E;--soft:#6B7280;}
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:var(--gris);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
    .card{background:white;border-radius:16px;padding:40px;width:100%;max-width:420px;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
    .brand{display:flex;align-items:center;gap:12px;margin-bottom:28px;}
    .brand-icon{width:44px;height:44px;background:var(--vert);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;}
    .brand-name{font-family:'DM Serif Display',serif;font-size:22px;color:var(--texte);}
    .brand-sub{font-size:11px;color:var(--soft);letter-spacing:1px;text-transform:uppercase;}
    h1{font-family:'DM Serif Display',serif;font-size:24px;color:var(--texte);margin-bottom:6px;}
    .subtitle{font-size:13.5px;color:var(--soft);margin-bottom:24px;line-height:1.6;}
    .err-box{background:var(--rouge-c);border-left:4px solid var(--rouge);border-radius:9px;padding:12px 15px;margin-bottom:18px;font-size:13px;color:var(--rouge);}
    .field{margin-bottom:18px;}
    label{display:block;font-size:12.5px;font-weight:700;color:var(--texte);margin-bottom:6px;}
    .input-wrap{position:relative;}
    input{width:100%;padding:12px 42px 12px 14px;border:1.5px solid var(--bordure);border-radius:10px;font-size:15px;font-family:inherit;background:#fafafa;outline:none;transition:border-color .2s;}
    input:focus{border-color:var(--vert);background:white;box-shadow:0 0 0 3px rgba(26,107,60,0.08);}
    .toggle-btn{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:var(--soft);}
    .regle{display:flex;align-items:center;gap:6px;font-size:12px;padding:3px 0;color:var(--soft);}
    .regle.ok{color:var(--vert);}
    .regle::before{content:'○';font-size:10px;}
    .regle.ok::before{content:'✓';}
    .hint-err{font-size:12px;color:var(--rouge);margin-top:4px;display:none;}
    .btn-submit{width:100%;background:var(--vert);color:white;border:none;padding:14px;border-radius:10px;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;margin-top:6px;}
    .btn-submit:hover{background:var(--vert-f);}
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

    <h1>🔐 Nouveau mot de passe</h1>
    <p class="subtitle">Définissez votre nouveau mot de passe SantéBF.</p>

    ${erreur ? `<div class="err-box">⚠️ ${erreur}</div>` : ''}

    <form method="POST" action="/auth/reset-confirm" id="formReset">
      <!-- Le token d'accès est transmis via JavaScript depuis l'URL (#access_token=...) -->
      <input type="hidden" name="access_token" id="accessToken">

      <div class="field">
        <label>Nouveau mot de passe</label>
        <div class="input-wrap">
          <input type="password" name="password" id="pwd1"
            placeholder="Votre nouveau mot de passe" required>
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
            placeholder="Répéter le mot de passe" required>
          <button type="button" class="toggle-btn" onclick="toggle('pwd2',this)">👁️</button>
        </div>
        <div class="hint-err" id="matchErr">⚠️ Les mots de passe ne correspondent pas</div>
      </div>

      <button type="submit" class="btn-submit">✅ Enregistrer le nouveau mot de passe</button>
    </form>
  </div>

  <script>
    // Récupérer le token depuis le hash de l'URL
    // Supabase redirige vers /auth/reset-confirm#access_token=xxx&type=recovery
    (function() {
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const token = params.get('access_token')
      if (token) {
        document.getElementById('accessToken').value = token
      }
    })()

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
      check('r-len', v.length >= 8)
      check('r-maj', /[A-Z]/.test(v))
      check('r-num', /[0-9]/.test(v))
      check('r-spe', /[#@!$%]/.test(v))
      checkMatch()
    })
    pwd2.addEventListener('input', checkMatch)

    function check(id, ok) {
      document.getElementById(id).classList.toggle('ok', ok)
    }
    function checkMatch() {
      const diff = pwd2.value && pwd1.value !== pwd2.value
      matchErr.style.display = diff ? 'block' : 'none'
      pwd2.style.borderColor = diff ? '#B71C1C' : ''
    }

    document.getElementById('formReset').addEventListener('submit', (e) => {
      if (pwd1.value !== pwd2.value) {
        e.preventDefault()
        matchErr.style.display = 'block'
        pwd2.focus()
      }
    })
  </script>
</body>
</html>`
}
 