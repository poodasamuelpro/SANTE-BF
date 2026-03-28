// src/pages/inscription-structure.ts

export function inscriptionStructurePage(
  data: {
    structure_nom: string;
    structure_type: string;
    ville: string;
    prenom: string;
    nom: string;
    email: string;
    telephone: string;
    plan: string;
  },
  tx: string,
  erreur?: string
): string {
  function esc(s: string): string {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Inscription de votre structure — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:wght@600;700&display=swap" rel="stylesheet">
<style>
:root{--v:#1A6B3C;--vf:#0d4a2a;--vc:#e8f5ee;--b:#1565C0;--bc:#e3f2fd;--vio:#4A148C;--vioc:#F3E5F5;--r:#b71c1c;--rc:#fff5f5;--or:#C9A84C;--oc:#fdf6e3;--tx:#0f1923;--soft:#5a6a78;--bg:#f8faf8;--w:#fff;--bd:#e2e8e4}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'Plus Jakarta Sans',sans-serif;color:var(--tx);background:var(--bg);min-height:100vh}
nav{background:var(--w);border-bottom:1px solid var(--bd);padding:0 5%;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.nb{display:flex;align-items:center;gap:10px;font-family:'Fraunces',serif;font-size:22px;color:var(--tx);text-decoration:none}
.ni{width:38px;height:38px;background:var(--v);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px}
.nl{display:flex;align-items:center;gap:20px}
.nl a{font-size:14px;color:var(--soft);text-decoration:none;font-weight:500;transition:color .2s}
.nl a:hover{color:var(--v)}
.nc{background:var(--v);color:#fff!important;padding:10px 20px;border-radius:9px;font-weight:700!important}
.mb{display:none;background:none;border:none;font-size:24px;cursor:pointer;color:var(--tx)}
footer{background:var(--tx);padding:40px 5% 24px;margin-top:0}
@media(max-width:640px){.nl{display:none}.mb{display:block}}
.wrap{max-width:720px;margin:0 auto;padding:48px 5%}
.card{background:var(--w);border-radius:24px;padding:40px 32px;box-shadow:0 4px 32px rgba(0,0,0,.08);border:1px solid var(--bd)}
h1{font-family:'Fraunces',serif;font-size:28px;margin-bottom:8px}
.sub{font-size:14px;color:var(--soft);margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--bd)}
.ftitle{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--soft);margin:20px 0 12px;padding-top:20px;border-top:1px solid var(--bd)}
.ftitle:first-of-type{border-top:none;margin-top:0;padding-top:0}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.fg{margin-bottom:14px}
label.lbl{display:block;font-size:12.5px;font-weight:600;color:var(--tx);margin-bottom:5px}
.req{color:var(--r)}
input[type=text],input[type=email],input[type=tel],input[type=password],select{width:100%;padding:11px 13px;font-family:'Plus Jakarta Sans',sans-serif;font-size:13.5px;border:1.5px solid var(--bd);border-radius:10px;background:#fafcfa;color:var(--tx);outline:none;transition:border-color .2s}
input:focus,select:focus{border-color:var(--v);background:var(--w)}
.btn{display:block;width:100%;padding:14px;background:var(--v);color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;margin-top:16px}
.btn:hover{background:var(--vf)}
.err{background:var(--rc);border:1px solid #ffb3b3;border-radius:9px;padding:11px 13px;font-size:13px;color:var(--r);margin-bottom:16px}
.info{background:var(--bc);border-left:4px solid var(--b);border-radius:9px;padding:13px 15px;font-size:13px;color:#1a3a6b;margin-bottom:16px;line-height:1.7}
.back-link{font-size:13px;color:var(--v);text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:6px;margin-bottom:24px}
@media(max-width:500px){.grid2{grid-template-columns:1fr}.card{padding:32px 20px}}
</style>
</head>
<body>
<nav>
  <a href="/" class="nb"><div class="ni">🏥</div>SantéBF</a>
  <div class="nl">
    <a href="/#modules">Modules</a>
    <a href="/#securite">Sécurité</a>
    <a href="/plans">Abonnement</a>
    <a href="/contact">Contact</a>
    <a href="/auth/login" class="nc">Connexion →</a>
  </div>
  <button class="mb" onclick="toggleMenu()">☰</button>
</nav>

<div class="wrap">
  <a href="/plans" class="back-link">← Retour aux plans</a>
  <div class="card">
    <h1>Finalisez l'inscription de votre structure</h1>
    <div class="sub">Créez votre compte administrateur. Vous pourrez ensuite inviter vos collaborateurs.</div>
    
    ${erreur ? `<div class="err">⚠️ ${esc(erreur)}</div>` : ''}
    <div class="info">📌 Plan sélectionné : <strong>${esc(data.plan)}</strong>. Votre abonnement sera activé automatiquement après création du compte.</div>
    
    <form method="POST" action="/plans/inscription" id="inscForm">
      <input type="hidden" name="tx" value="${esc(tx)}">
      
      <div class="ftitle">Informations de la structure</div>
      <div class="fg">
        <label class="lbl">Nom de la structure <span class="req">*</span></label>
        <input type="text" name="structure_nom" value="${esc(data.structure_nom)}" required>
      </div>
      <div class="grid2">
        <div class="fg">
          <label class="lbl">Type <span class="req">*</span></label>
          <select name="structure_type" required>
            <option value="">Sélectionner...</option>
            <option value="chu" ${data.structure_type === 'chu' ? 'selected' : ''}>CHU / CHR</option>
            <option value="clinique" ${data.structure_type === 'clinique' ? 'selected' : ''}>Clinique privée</option>
            <option value="cabinet" ${data.structure_type === 'cabinet' ? 'selected' : ''}>Cabinet médical</option>
            <option value="csps" ${data.structure_type === 'csps' ? 'selected' : ''}>CSPS / Centre de santé</option>
            <option value="pharmacie" ${data.structure_type === 'pharmacie' ? 'selected' : ''}>Pharmacie</option>
            <option value="laboratoire" ${data.structure_type === 'laboratoire' ? 'selected' : ''}>Laboratoire</option>
            <option value="autre" ${data.structure_type === 'autre' ? 'selected' : ''}>Autre</option>
          </select>
        </div>
        <div class="fg">
          <label class="lbl">Ville <span class="req">*</span></label>
          <input type="text" name="ville" value="${esc(data.ville)}" required>
        </div>
      </div>
      <div class="fg">
        <label class="lbl">Téléphone structure (optionnel)</label>
        <input type="tel" name="structure_telephone" placeholder="+226 XX XX XX XX">
      </div>

      <div class="ftitle">Responsable (administrateur)</div>
      <div class="grid2">
        <div class="fg">
          <label class="lbl">Prénom <span class="req">*</span></label>
          <input type="text" name="prenom" value="${esc(data.prenom)}" required>
        </div>
        <div class="fg">
          <label class="lbl">Nom <span class="req">*</span></label>
          <input type="text" name="nom" value="${esc(data.nom)}" required>
        </div>
      </div>
      <div class="grid2">
        <div class="fg">
          <label class="lbl">Email <span class="req">*</span></label>
          <input type="email" name="email" value="${esc(data.email)}" required>
        </div>
        <div class="fg">
          <label class="lbl">Téléphone <span class="req">*</span></label>
          <input type="tel" name="telephone" value="${esc(data.telephone)}" required>
        </div>
      </div>

      <div class="ftitle">Sécurité</div>
      <div class="grid2">
        <div class="fg">
          <label class="lbl">Mot de passe <span class="req">*</span></label>
          <input type="password" name="password" required autocomplete="new-password">
          <div style="font-size:11px;color:var(--soft);margin-top:4px">8+ caractères, une majuscule, un chiffre, un caractère spécial (#@!$%)</div>
        </div>
        <div class="fg">
          <label class="lbl">Confirmer le mot de passe <span class="req">*</span></label>
          <input type="password" name="password_confirm" required autocomplete="new-password">
        </div>
      </div>

      <button type="submit" class="btn">Créer mon compte →</button>
    </form>
  </div>
</div>

<footer>
  <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:32px;padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,.08)">
    <div>
      <div style="font-family:'Fraunces',serif;font-size:20px;color:white;margin-bottom:10px">🏥 SantéBF</div>
      <p style="font-size:13px;color:rgba(255,255,255,.45);line-height:1.7;max-width:260px">Plateforme numérique de gestion de santé pour les structures sanitaires du Burkina Faso.</p>
    </div>
    <div>
      <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Plateforme</div>
      <a href="/#modules" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Modules</a>
      <a href="/plans" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Abonnement</a>
      <a href="/#securite" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Sécurité</a>
    </div>
    <div>
      <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Accès</div>
      <a href="/auth/login" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Connexion</a>
      <a href="/auth/inscription" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">App Patient</a>
    </div>
    <div>
      <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Support</div>
      <a href="/contact" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Contact</a>
      <a href="/#faq" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">FAQ</a>
      <a href="/politique-confidentialite" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Confidentialité</a>
    </div>
  </div>
  <div style="max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,.3);flex-wrap:wrap;gap:8px">
    <span>© 2026 SantéBF — Tous droits réservés</span>
    <span>Fait avec ❤️ au Burkina Faso</span>
  </div>
</footer>
<script>
function toggleMenu(){
  const nl=document.querySelector('.nl')
  if(nl.style.display==='flex'){nl.style.display=''}
  else{nl.style.cssText='display:flex;flex-direction:column;position:fixed;top:64px;left:0;right:0;background:white;padding:20px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:199;gap:16px;'}
}
document.getElementById('inscForm').onsubmit = function() {
  const btn = this.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Création en cours...';
};
</script>
</body>
</html>`;
}