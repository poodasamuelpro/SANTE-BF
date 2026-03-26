/**
 * src/pages/inscription-patient.ts
 * SantéBF — Page d'inscription patient
 *
 * Fonctionnalités :
 *   - Formulaire création compte patient
 *   - Validation mot de passe
 *   - Lien politique de confidentialité (obligatoire)
 *   - Lien retour login
 */

export function inscriptionPatientPage(erreur?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Créez votre compte patient SantéBF pour accéder à votre dossier médical numérique.">
<meta name="robots" content="noindex, nofollow">
<title>Cr&#xe9;er un compte patient — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:wght@600;700&display=swap" rel="stylesheet">
<style>
:root{--v:#1A6B3C;--vf:#0d4a2a;--vc:#e8f5ee;--b:#1565C0;--bc:#e3f2fd;--r:#b71c1c;--rc:#fff5f5;--tx:#0f1923;--soft:#5a6a78;--bg:#f0f7f3;--w:#fff;--bd:#e2e8e4}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
.page{width:100%;max-width:480px}
.logo-wrap{text-align:center;margin-bottom:24px}
.logo-ico{width:56px;height:56px;background:var(--v);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px}
.logo-name{font-family:'Fraunces',serif;font-size:24px;color:var(--tx)}
.logo-sub{font-size:13px;color:var(--soft);margin-top:3px}
.box{background:var(--w);border-radius:20px;padding:32px 28px;box-shadow:0 4px 32px rgba(0,0,0,.08);border:1px solid var(--bd)}
h2{font-family:'Fraunces',serif;font-size:21px;color:var(--tx);margin-bottom:5px}
.sub{font-size:13px;color:var(--soft);margin-bottom:22px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.fg{margin-bottom:16px}
label{display:block;font-size:12.5px;font-weight:600;color:var(--tx);margin-bottom:5px}
.req{color:var(--r)}
input{width:100%;padding:11px 13px;font-family:'Plus Jakarta Sans',sans-serif;font-size:13.5px;border:1.5px solid var(--bd);border-radius:10px;background:#fafcfa;color:var(--tx);outline:none;transition:border-color .2s}
input:focus{border-color:var(--v);background:var(--w)}
.pwd-rules{background:#f8faf8;border-radius:9px;padding:12px 14px;font-size:12px;color:var(--soft);margin-top:8px;line-height:1.7}
.pwd-rules strong{color:var(--tx)}
.btn{width:100%;padding:13px;background:var(--v);color:white;border:none;border-radius:11px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;margin-top:6px}
.btn:hover{background:var(--vf)}
.err{background:var(--rc);border:1px solid #ffb3b3;border-radius:9px;padding:11px 13px;font-size:13px;color:var(--r);margin-bottom:14px;display:flex;align-items:flex-start;gap:8px}
.consentement{display:flex;align-items:flex-start;gap:10px;margin:16px 0;font-size:13px;color:var(--soft);line-height:1.6}
.consentement input[type=checkbox]{width:18px;height:18px;flex-shrink:0;margin-top:1px;accent-color:var(--v)}
.consentement a{color:var(--v);font-weight:600}
.footer-links{text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid var(--bd)}
.footer-links a{font-size:12px;color:var(--soft);text-decoration:none;margin:0 6px}
.footer-links a:hover{color:var(--v)}
@media(max-width:480px){.box{padding:24px 18px}.grid2{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="page">
  <div class="logo-wrap">
    <a href="/" style="text-decoration:none">
      <div class="logo-ico">&#x1F3E5;</div>
      <div class="logo-name">Sant&#xe9;BF</div>
      <div class="logo-sub">Dossier M&#xe9;dical Num&#xe9;rique</div>
    </a>
  </div>

  <div class="box">
    <h2>Cr&#xe9;er mon compte patient</h2>
    <p class="sub">Acc&#xe9;dez &#xe0; votre dossier m&#xe9;dical, vos ordonnances et rendez-vous</p>

    ${erreur ? `<div class="err">&#x26A0;&#xFE0F; ${erreur}</div>` : ''}

    <form method="POST" action="/auth/inscription">
      <div class="grid2">
        <div class="fg" style="margin-bottom:0">
          <label>Pr&#xe9;nom <span class="req">*</span></label>
          <input type="text" name="prenom" placeholder="Aminata" required autocomplete="given-name">
        </div>
        <div class="fg" style="margin-bottom:0">
          <label>Nom <span class="req">*</span></label>
          <input type="text" name="nom" placeholder="TRAORE" required autocomplete="family-name">
        </div>
      </div>

      <div class="fg" style="margin-top:14px">
        <label>Date de naissance</label>
        <input type="date" name="date_naissance" autocomplete="bday">
      </div>

      <div class="fg">
        <label>Adresse email <span class="req">*</span></label>
        <input type="email" name="email" placeholder="votre@email.com" required autocomplete="email">
      </div>

      <div class="fg">
        <label>T&#xe9;l&#xe9;phone</label>
        <input type="tel" name="telephone" placeholder="+226 XX XX XX XX" autocomplete="tel">
      </div>

      <div class="fg">
        <label>Mot de passe <span class="req">*</span></label>
        <input type="password" name="password" placeholder="••••••••" required autocomplete="new-password" minlength="8">
        <div class="pwd-rules">
          Le mot de passe doit contenir au moins : <strong>8 caract&#xe8;res</strong>, <strong>1 majuscule</strong>, <strong>1 chiffre</strong>, <strong>1 caract&#xe8;re sp&#xe9;cial</strong> (#@!$%)
        </div>
      </div>

      <div class="fg">
        <label>Confirmer le mot de passe <span class="req">*</span></label>
        <input type="password" name="password_confirm" placeholder="••••••••" required autocomplete="new-password">
      </div>

      <div class="consentement">
        <input type="checkbox" name="consentement" id="consent" required>
        <label for="consent" style="margin-bottom:0;font-weight:400">
          J&#x27;accepte que mes donn&#xe9;es soient trait&#xe9;es conform&#xe9;ment &#xe0; la
          <a href="/politique-confidentialite" target="_blank">Politique de Confidentialit&#xe9;</a> de Sant&#xe9;BF.
          Mon dossier m&#xe9;dical ne sera partag&#xe9; qu&#x27;avec mon consentement explicite.
        </label>
      </div>

      <button type="submit" class="btn">Cr&#xe9;er mon compte &#x2192;</button>
    </form>
  </div>

  <div class="footer-links">
    <a href="/auth/login">&#x2190; D&#xe9;j&#xe0; un compte ? Se connecter</a>
    <a href="/politique-confidentialite">Confidentialit&#xe9;</a>
    <a href="/contact">Contact</a>
  </div>
</div>
</body>
</html>`
}
