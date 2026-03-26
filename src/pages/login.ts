/**
 * src/pages/login.ts
 * SantéBF — Page de connexion
 *
 * Fonctionnalités :
 *   - Formulaire email + mot de passe
 *   - Messages d'erreur / succès (reset, inscription)
 *   - Lien mot de passe oublié
 *   - Lien politique de confidentialité
 *   - SEO basique
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
<meta name="description" content="Connexion à SantéBF — Plateforme de santé numérique pour les structures sanitaires du Burkina Faso.">
<meta name="robots" content="noindex, nofollow">
<title>Connexion — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:wght@600;700&display=swap" rel="stylesheet">
<style>
:root{--v:#1A6B3C;--vf:#0d4a2a;--vc:#e8f5ee;--b:#1565C0;--bc:#e3f2fd;--r:#b71c1c;--rc:#fff5f5;--or:#C9A84C;--tx:#0f1923;--soft:#5a6a78;--bg:#f0f7f3;--w:#fff;--bd:#e2e8e4}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
.page{width:100%;max-width:440px}
.logo-wrap{text-align:center;margin-bottom:28px}
.logo-ico{width:60px;height:60px;background:var(--v);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 12px}
.logo-name{font-family:'Fraunces',serif;font-size:26px;color:var(--tx)}
.logo-sub{font-size:13px;color:var(--soft);margin-top:4px}
.box{background:var(--w);border-radius:20px;padding:36px 32px;box-shadow:0 4px 32px rgba(0,0,0,.08);border:1px solid var(--bd)}
h2{font-family:'Fraunces',serif;font-size:22px;color:var(--tx);margin-bottom:6px}
.sub{font-size:14px;color:var(--soft);margin-bottom:24px}
.fg{margin-bottom:18px}
label{display:block;font-size:13px;font-weight:600;color:var(--tx);margin-bottom:6px}
input{width:100%;padding:12px 14px;font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;border:1.5px solid var(--bd);border-radius:11px;background:#fafcfa;color:var(--tx);outline:none;transition:border-color .2s}
input:focus{border-color:var(--v);background:var(--w)}
.forgot{font-size:12px;color:var(--v);text-decoration:none;float:right;margin-top:-2px;font-weight:600}
.btn{width:100%;padding:14px;background:var(--v);color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;margin-top:8px}
.btn:hover{background:var(--vf);transform:translateY(-1px);box-shadow:0 4px 16px rgba(26,107,60,.25)}
.err{background:var(--rc);border:1px solid #ffb3b3;border-radius:10px;padding:12px 14px;font-size:13px;color:var(--r);margin-bottom:16px;display:flex;align-items:flex-start;gap:8px}
.ok{background:var(--vc);border:1px solid #a5d6b7;border-radius:10px;padding:12px 14px;font-size:13px;color:var(--v);margin-bottom:16px;display:flex;align-items:center;gap:8px;font-weight:600}
.divider{text-align:center;color:var(--soft);font-size:13px;margin:20px 0;position:relative}
.divider::before{content:'';position:absolute;left:0;top:50%;width:42%;height:1px;background:var(--bd)}
.divider::after{content:'';position:absolute;right:0;top:50%;width:42%;height:1px;background:var(--bd)}
.link-btn{display:block;width:100%;padding:13px;background:var(--bg);border:1.5px solid var(--bd);border-radius:12px;font-size:14px;font-weight:600;color:var(--tx);text-align:center;text-decoration:none;transition:all .2s;margin-bottom:10px}
.link-btn:hover{border-color:var(--v);color:var(--v);background:var(--vc)}
.link-btn.struct{border-color:var(--b);color:var(--b)}
.link-btn.struct:hover{background:var(--bc)}
.footer-links{text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid var(--bd)}
.footer-links a{font-size:12px;color:var(--soft);text-decoration:none;margin:0 8px}
.footer-links a:hover{color:var(--v)}
.badge{display:inline-flex;align-items:center;gap:6px;background:var(--vc);color:var(--v);padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:20px}
@media(max-width:480px){.box{padding:28px 20px}}
</style>
</head>
<body>
<div class="page">
  <div class="logo-wrap">
    <a href="/" style="text-decoration:none">
      <div class="logo-ico">&#x1F3E5;</div>
      <div class="logo-name">Sant&#xe9;BF</div>
      <div class="logo-sub">Plateforme de Sant&#xe9; Num&#xe9;rique</div>
    </a>
  </div>

  <div class="box">
    <h2>Connexion</h2>
    <p class="sub">Acc&#xe9;dez &#xe0; votre espace sant&#xe9;</p>

    ${resetOk ? `<div class="ok">&#x2705; Mot de passe r&#xe9;initialis&#xe9; avec succ&#xe8;s. Connectez-vous avec votre nouveau mot de passe.</div>` : ''}
    ${inscriptionOk ? `<div class="ok">&#x2705; Compte cr&#xe9;&#xe9; avec succ&#xe8;s ! Vous pouvez maintenant vous connecter.</div>` : ''}
    ${erreur ? `<div class="err">&#x26A0;&#xFE0F; ${erreur}</div>` : ''}

    <form method="POST" action="/auth/login">
      <div class="fg">
        <label for="email">Adresse email</label>
        <input type="email" id="email" name="email" placeholder="medecin@structure.bf" required autocomplete="email">
      </div>
      <div class="fg">
        <label for="password">
          Mot de passe
          <a href="/auth/reset-password" class="forgot">Mot de passe oubli&#xe9; ?</a>
        </label>
        <input type="password" id="password" name="password" placeholder="••••••••" required autocomplete="current-password">
      </div>
      <button type="submit" class="btn">Se connecter &#x2192;</button>
    </form>

    <div class="divider">ou</div>

    <a href="/auth/inscription" class="link-btn">&#x1F464; Cr&#xe9;er un compte patient</a>
    <a href="/plans" class="link-btn struct">&#x1F3E5; Inscrire ma structure</a>

  </div>

  <div class="footer-links">
    <a href="/">&#x2190; Accueil</a>
    <a href="/contact">Contact</a>
    <a href="/politique-confidentialite">Confidentialit&#xe9;</a>
    <span style="color:#ddd">|</span>
    <span style="font-size:11px;color:var(--soft)">&#xa9; 2026 Sant&#xe9;BF</span>
  </div>
</div>
</body>
</html>`
}
