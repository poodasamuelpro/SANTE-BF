/**
 * src/pages/inscription-patient.ts
 * Page publique d'inscription pour les patients
 */
export function inscriptionPatientPage(erreur?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Créer mon compte — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
  <style>
    :root {
      --vert:#1A6B3C; --vert-fonce:#134d2c; --vert-clair:#e8f5ee;
      --bleu:#1565C0; --bleu-clair:#e3f2fd;
      --or:#C9A84C;
      --texte:#0f1923; --soft:#5a6a78; --bg:#f4f6f4;
      --blanc:#fff; --bordure:#e2e8e4;
      --radius:16px; --radius-sm:10px;
      --shadow:0 4px 24px rgba(0,0,0,0.08);
    }
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body {
      font-family:'Plus Jakarta Sans',sans-serif;
      background:var(--bg);
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
    }

    .card {
      background:var(--blanc);
      border-radius:var(--radius);
      padding:40px;
      width:100%;
      max-width:500px;
      box-shadow:var(--shadow);
    }

    /* Logo */
    .brand {
      display:flex;
      align-items:center;
      gap:12px;
      margin-bottom:28px;
      text-decoration:none;
    }
    .brand-icon {
      width:44px;height:44px;
      background:var(--vert);
      border-radius:12px;
      display:flex;align-items:center;justify-content:center;
      font-size:22px;
      flex-shrink:0;
    }
    .brand-name {
      font-family:'Fraunces',serif;
      font-size:22px;
      color:var(--texte);
    }
    .brand-sub {
      font-size:11px;
      color:var(--soft);
      letter-spacing:1px;
      text-transform:uppercase;
    }

    h1 {
      font-family:'Fraunces',serif;
      font-size:24px;
      color:var(--texte);
      margin-bottom:6px;
    }
    .subtitle {
      font-size:13.5px;
      color:var(--soft);
      margin-bottom:24px;
      line-height:1.6;
    }

    /* Étapes */
    .steps {
      display:flex;
      gap:6px;
      margin-bottom:22px;
    }
    .step {
      flex:1;
      text-align:center;
      padding:10px 6px;
      border-radius:var(--radius-sm);
      font-size:11px;
      font-weight:600;
      line-height:1.4;
    }
    .step-active { background:var(--vert); color:white; }
    .step-inactive { background:#f0f4f0; color:var(--soft); }
    .step-num { display:block; font-size:17px; margin-bottom:2px; }

    /* Info box */
    .info-box {
      background:var(--bleu-clair);
      border-left:4px solid var(--bleu);
      border-radius:var(--radius-sm);
      padding:13px 15px;
      margin-bottom:22px;
      font-size:12.5px;
      color:#1a3a6b;
      line-height:1.6;
    }
    .info-box strong { display:block; margin-bottom:3px; font-size:13px; }

    /* Erreur */
    .err-box {
      background:#fce8e8;
      border-left:4px solid #b71c1c;
      border-radius:var(--radius-sm);
      padding:12px 15px;
      margin-bottom:18px;
      font-size:13px;
      color:#b71c1c;
    }

    /* Formulaire */
    .form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .form-group { margin-bottom:16px; }
    label {
      display:block;
      font-size:12.5px;
      font-weight:700;
      color:var(--texte);
      margin-bottom:6px;
    }
    label .req { color:#b71c1c; }
    input {
      width:100%;
      padding:11px 14px;
      border:1.5px solid var(--bordure);
      border-radius:var(--radius-sm);
      font-size:14px;
      font-family:inherit;
      color:var(--texte);
      background:#fafafa;
      outline:none;
      transition:border-color .2s,box-shadow .2s,background .2s;
    }
    input:focus {
      border-color:var(--vert);
      background:white;
      box-shadow:0 0 0 3px rgba(26,107,60,0.1);
    }
    .hint {
      font-size:11.5px;
      color:var(--soft);
      margin-top:5px;
      line-height:1.4;
    }

    /* Bouton */
    .btn-submit {
      width:100%;
      background:var(--vert);
      color:white;
      border:none;
      padding:14px;
      border-radius:var(--radius-sm);
      font-size:15px;
      font-weight:700;
      font-family:inherit;
      cursor:pointer;
      transition:background .2s, transform .1s;
      margin-top:6px;
    }
    .btn-submit:hover { background:var(--vert-fonce); transform:translateY(-1px); }
    .btn-submit:active { transform:translateY(0); }

    /* Séparateur */
    .sep {
      display:flex;
      align-items:center;
      gap:12px;
      margin:20px 0;
      color:var(--soft);
      font-size:12.5px;
    }
    .sep::before,.sep::after {
      content:'';
      flex:1;
      height:1px;
      background:var(--bordure);
    }

    .lien-login {
      text-align:center;
      font-size:13.5px;
      color:var(--soft);
    }
    .lien-login a {
      color:var(--vert);
      font-weight:700;
      text-decoration:none;
    }
    .lien-login a:hover { text-decoration:underline; }

    /* Responsive */
    @media(max-width:520px){
      .card { padding:28px 20px; }
      .form-row { grid-template-columns:1fr; gap:0; }
    }
  </style>
</head>
<body>
  <div class="card">

    <a href="/auth/login" class="brand">
      <div class="brand-icon">🏥</div>
      <div>
        <div class="brand-name">SantéBF</div>
        <div class="brand-sub">Santé Numérique Burkina</div>
      </div>
    </a>

    <h1>Créer mon compte patient</h1>
    <p class="subtitle">Rejoignez SantéBF pour accéder à votre dossier médical depuis n'importe quelle structure sanitaire du pays.</p>

    <div class="steps">
      <div class="step step-active">
        <span class="step-num">1️⃣</span>
        Je crée<br>mon compte
      </div>
      <div class="step step-inactive">
        <span class="step-num">2️⃣</span>
        L'hôpital<br>lie mon dossier
      </div>
      <div class="step step-inactive">
        <span class="step-num">3️⃣</span>
        J'accède<br>à mes données
      </div>
    </div>

    <div class="info-box">
      <strong>ℹ️ Comment ça marche ?</strong>
      Après inscription, votre compte est créé mais votre dossier médical est vide.
      Pour y accéder, présentez-vous à l'accueil d'une structure SantéBF avec votre email —
      ils lieront votre dossier à votre compte.
    </div>

    ${erreur ? `<div class="err-box">⚠️ ${erreur}</div>` : ''}

    <form method="POST" action="/auth/inscription" id="formInscription">

      <div class="form-row">
        <div class="form-group">
          <label>Prénom <span class="req">*</span></label>
          <input type="text" name="prenom" placeholder="Ex: Aminata" required autocomplete="given-name">
        </div>
        <div class="form-group">
          <label>Nom <span class="req">*</span></label>
          <input type="text" name="nom" placeholder="Ex: OUATTARA" required autocomplete="family-name">
        </div>
      </div>

      <div class="form-group">
        <label>Adresse email <span class="req">*</span></label>
        <input type="email" name="email" placeholder="votreemail@exemple.com" required autocomplete="email">
      </div>

      <div class="form-group">
        <label>Téléphone</label>
        <input type="tel" name="telephone" placeholder="Ex: 70 12 34 56">
      </div>

      <div class="form-group">
        <label>Mot de passe <span class="req">*</span></label>
        <input type="password" name="password" id="pwd" placeholder="Créez un mot de passe sécurisé" required autocomplete="new-password">
        <div class="hint">8 caractères min · 1 majuscule · 1 chiffre · 1 caractère spécial (#@!$%)</div>
      </div>

      <div class="form-group">
        <label>Confirmer le mot de passe <span class="req">*</span></label>
        <input type="password" name="password_confirm" id="pwd2" placeholder="Répétez votre mot de passe" required>
        <div class="hint" id="matchHint" style="display:none;color:#b71c1c;">⚠️ Les mots de passe ne correspondent pas</div>
      </div>

      <button type="submit" class="btn-submit">✅ Créer mon compte</button>
    </form>

    <div class="sep">ou</div>

    <p class="lien-login">
      Vous avez déjà un compte ? <a href="/auth/login">Se connecter →</a>
    </p>

  </div>

  <script>
    // Vérification temps réel que les mots de passe correspondent
    const pwd  = document.getElementById('pwd')
    const pwd2 = document.getElementById('pwd2')
    const hint = document.getElementById('matchHint')

    pwd2.addEventListener('input', () => {
      if (pwd2.value && pwd.value !== pwd2.value) {
        hint.style.display = 'block'
        pwd2.style.borderColor = '#b71c1c'
      } else {
        hint.style.display = 'none'
        pwd2.style.borderColor = ''
      }
    })

    document.getElementById('formInscription').addEventListener('submit', (e) => {
      if (pwd.value !== pwd2.value) {
        e.preventDefault()
        hint.style.display = 'block'
        pwd2.focus()
      }
    })
  </script>
</body>
</html>`
}
