/**
 * À AJOUTER dans src/routes/auth.ts
 * 
 * Ces 2 routes permettent à un patient de créer son propre compte
 * SANS passer par l'hôpital.
 * 
 * Résultat : compte créé MAIS dossier vide → pas accès aux données médicales
 * Pour avoir accès aux données, il doit aller à l'hôpital qui lie son dossier.
 */

// ── GET /auth/inscription ──────────────────────────────────────────────────
// authRoutes.get('/inscription', (c) => {
//   return c.html(inscriptionPatientPage())
// })

// ── POST /auth/inscription ─────────────────────────────────────────────────
// authRoutes.post('/inscription', async (c) => {
//   const supabase = c.get('supabase')
//   const body = await c.req.parseBody()
//
//   const email    = String(body.email    ?? '').trim().toLowerCase()
//   const password = String(body.password ?? '').trim()
//   const nom      = String(body.nom      ?? '').trim().toUpperCase()
//   const prenom   = String(body.prenom   ?? '').trim()
//   const telephone = String(body.telephone ?? '').trim()
//
//   if (!email || !password || !nom || !prenom) {
//     return c.html(inscriptionPatientPage('Tous les champs obligatoires doivent être remplis.'))
//   }
//
//   // Créer le compte Supabase Auth
//   const { data, error } = await supabase.auth.admin.createUser({
//     email,
//     password,
//     email_confirm: true,
//     user_metadata: { nom, prenom, role: 'patient', telephone }
//   })
//
//   if (error || !data?.user) {
//     return c.html(inscriptionPatientPage('Erreur : ' + (error?.message ?? 'Email déjà utilisé')))
//   }
//
//   // Mettre à jour le profil créé par le trigger
//   await supabase.from('auth_profiles').update({
//     nom, prenom, role: 'patient', est_actif: true, doit_changer_mdp: false
//   }).eq('id', data.user.id)
//
//   // Rediriger vers login avec message de succès
//   return c.redirect('/auth/login?inscription=ok')
// })


/**
 * PAGE D'INSCRIPTION PATIENT
 * À créer dans src/pages/inscription-patient.ts
 */
export function inscriptionPatientPage(erreur?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Créer mon compte — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
  <style>
    :root {
      --vert:#1A6B3C; --vert-fonce:#134d2c; --vert-clair:#e8f5ee;
      --bleu:#1565C0; --bleu-clair:#e8f0fe;
      --texte:#0f1923; --soft:#5a6a78; --bg:#f4f6f4;
      --blanc:#fff; --bordure:#e2e8e4;
      --radius:16px; --radius-sm:10px;
    }
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{
      font-family:'Plus Jakarta Sans',sans-serif;
      background:var(--bg);
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
    }

    .card{
      background:var(--blanc);
      border-radius:var(--radius);
      padding:40px;
      width:100%;
      max-width:480px;
      box-shadow:0 8px 40px rgba(0,0,0,0.08);
    }

    .logo{
      display:flex;
      align-items:center;
      gap:12px;
      margin-bottom:28px;
    }
    .logo-icon{
      width:44px;height:44px;
      background:var(--vert);
      border-radius:12px;
      display:flex;align-items:center;justify-content:center;
      font-size:22px;
    }
    .logo-text{
      font-family:'Fraunces',serif;
      font-size:22px;
      color:var(--texte);
    }
    .logo-sub{
      font-size:11px;
      color:var(--soft);
      letter-spacing:1px;
      text-transform:uppercase;
    }

    h1{
      font-family:'Fraunces',serif;
      font-size:24px;
      color:var(--texte);
      margin-bottom:6px;
    }
    .subtitle{
      font-size:13.5px;
      color:var(--soft);
      margin-bottom:28px;
      line-height:1.5;
    }

    .info-box{
      background:var(--bleu-clair);
      border-left:4px solid var(--bleu);
      border-radius:var(--radius-sm);
      padding:14px 16px;
      margin-bottom:24px;
      font-size:13px;
      color:#1a3a6b;
      line-height:1.6;
    }
    .info-box strong{display:block;margin-bottom:4px;}

    .err-box{
      background:#fce8e8;
      border-left:4px solid #b71c1c;
      border-radius:var(--radius-sm);
      padding:12px 16px;
      margin-bottom:20px;
      font-size:13px;
      color:#b71c1c;
    }

    .form-group{margin-bottom:18px;}
    label{
      display:block;
      font-size:13px;
      font-weight:600;
      color:var(--texte);
      margin-bottom:7px;
    }
    label .req{color:#b71c1c;}
    input{
      width:100%;
      padding:12px 14px;
      border:1.5px solid var(--bordure);
      border-radius:var(--radius-sm);
      font-size:14px;
      font-family:inherit;
      color:var(--texte);
      background:#fafafa;
      outline:none;
      transition:border-color .2s,box-shadow .2s;
    }
    input:focus{
      border-color:var(--vert);
      background:white;
      box-shadow:0 0 0 3px rgba(26,107,60,0.1);
    }
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}

    .password-hint{
      font-size:11.5px;
      color:var(--soft);
      margin-top:5px;
    }

    .btn-submit{
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
      transition:background .2s;
      margin-top:8px;
    }
    .btn-submit:hover{background:var(--vert-fonce);}

    .divider{
      text-align:center;
      margin:20px 0;
      position:relative;
      color:var(--soft);
      font-size:13px;
    }
    .divider::before,.divider::after{
      content:'';
      position:absolute;
      top:50%;
      width:42%;
      height:1px;
      background:var(--bordure);
    }
    .divider::before{left:0;}
    .divider::after{right:0;}

    .link-login{
      display:block;
      text-align:center;
      font-size:13.5px;
      color:var(--soft);
    }
    .link-login a{color:var(--vert);font-weight:600;text-decoration:none;}
    .link-login a:hover{text-decoration:underline;}

    .steps{
      display:flex;
      gap:8px;
      margin-bottom:24px;
    }
    .step{
      flex:1;
      text-align:center;
      padding:10px 8px;
      border-radius:var(--radius-sm);
      font-size:11.5px;
      font-weight:600;
    }
    .step-1{background:var(--vert);color:white;}
    .step-2,.step-3{background:#f0f0f0;color:var(--soft);}
    .step-num{display:block;font-size:16px;margin-bottom:2px;}

    @media(max-width:480px){
      .card{padding:28px 20px;}
      .form-row{grid-template-columns:1fr;}
    }
  </style>
</head>
<body>
  <div class="card">

    <div class="logo">
      <div class="logo-icon">🏥</div>
      <div>
        <div class="logo-text">SantéBF</div>
        <div class="logo-sub">Santé Numérique Burkina</div>
      </div>
    </div>

    <h1>Créer mon compte patient</h1>
    <p class="subtitle">Rejoignez SantéBF pour accéder à votre dossier médical numérique depuis n'importe quelle structure sanitaire.</p>

    <!-- Étapes -->
    <div class="steps">
      <div class="step step-1"><span class="step-num">1</span>Compte</div>
      <div class="step step-2"><span class="step-num">2</span>Hôpital lie dossier</div>
      <div class="step step-3"><span class="step-num">3</span>Accès données</div>
    </div>

    <div class="info-box">
      <strong>ℹ️ Important à savoir</strong>
      Après inscription, votre compte sera créé mais votre dossier médical sera vide.
      Pour accéder à vos données médicales, présentez-vous à l'accueil d'une structure
      sanitaire SantéBF avec votre email — ils lieront votre compte à votre dossier.
    </div>

    ${erreur ? `<div class="err-box">⚠️ ${erreur}</div>` : ''}

    <form method="POST" action="/auth/inscription">

      <div class="form-row">
        <div class="form-group">
          <label>Prénom <span class="req">*</span></label>
          <input type="text" name="prenom" placeholder="Ex: Aminata" required>
        </div>
        <div class="form-group">
          <label>Nom <span class="req">*</span></label>
          <input type="text" name="nom" placeholder="Ex: OUATTARA" required>
        </div>
      </div>

      <div class="form-group">
        <label>Adresse email <span class="req">*</span></label>
        <input type="email" name="email" placeholder="votreemail@exemple.com" required autocomplete="email">
      </div>

      <div class="form-group">
        <label>Numéro de téléphone</label>
        <input type="tel" name="telephone" placeholder="Ex: 70123456">
      </div>

      <div class="form-group">
        <label>Mot de passe <span class="req">*</span></label>
        <input type="password" name="password" placeholder="Minimum 8 caractères" required autocomplete="new-password">
        <div class="password-hint">8 caractères min · 1 majuscule · 1 chiffre · 1 caractère spécial (#@!$%)</div>
      </div>

      <div class="form-group">
        <label>Confirmer le mot de passe <span class="req">*</span></label>
        <input type="password" name="password_confirm" placeholder="Répétez votre mot de passe" required>
      </div>

      <button type="submit" class="btn-submit">✅ Créer mon compte</button>
    </form>

    <div class="divider">ou</div>

    <p class="link-login">
      Vous avez déjà un compte ? <a href="/auth/login">Se connecter →</a>
    </p>

  </div>
</body>
</html>`
}
