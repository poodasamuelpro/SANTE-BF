/**
 * src/pages/inscription-structure.ts
 * SantéBF — Page de création de compte structure
 *
 * Affichée APRÈS validation du paiement (depuis plans.ts)
 * Signature : inscriptionStructurePage(opts)
 */

export function inscriptionStructurePage(opts: {
  tx:        string
  planNom:   string
  planId:    string
  planBg:    string
  planColor: string
  prenom?:   string
  nom?:      string
  email?:    string
  telephone?: string
  structure_nom?:  string
  structure_type?: string
  ville?:    string
  erreur?:   string
  csrf:      string
}): string {
  const {
    tx, planNom, planId, planBg, planColor,
    prenom = '', nom = '', email = '', telephone = '',
    structure_nom = '', structure_type = '', ville = '',
    erreur = '', csrf,
  } = opts

  const typeOptions = [
    ['chu', 'CHU — Centre Hospitalier Universitaire'],
    ['chr', 'CHR — Centre Hospitalier Régional'],
    ['chd', 'CHD — Centre Hospitalier de District'],
    ['clinique', 'Clinique privée'],
    ['cabinet', 'Cabinet médical'],
    ['csps', 'CSPS — Centre de Santé et Promotion Sociale'],
    ['cma', 'CMA — Centre Médical avec Antène Chirurgicale'],
    ['pharmacie', 'Pharmacie'],
    ['laboratoire', 'Laboratoire d\'analyses'],
    ['cnts', 'CNTS — Centre de Transfusion Sanguine'],
    ['maternite', 'Maternité'],
    ['autre', 'Autre'],
  ].map(([v, l]) => `<option value="${v}" ${structure_type === v ? 'selected' : ''}>${l}</option>`).join('')

  const regions = [
    'Boucle du Mouhoun','Cascades','Centre','Centre-Est',
    'Centre-Nord','Centre-Ouest','Centre-Sud','Est',
    'Hauts-Bassins','Nord','Plateau Central','Sahel','Sud-Ouest',
  ].map(r => `<option value="${r}">${r}</option>`).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Créer votre compte structure — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:wght@600;700&display=swap" rel="stylesheet">
<style>
:root{--v:#1A6B3C;--vf:#0d4a2a;--vc:#e8f5ee;--r:#b71c1c;--rc:#fff5f5;--or:#E65100;--oc:#FFF3E0;--tx:#0f1923;--soft:#5a6a78;--bg:#f8faf8;--w:#fff;--bd:#e2e8e4}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--tx);min-height:100vh}
nav{background:var(--v);height:56px;display:flex;align-items:center;padding:0 5%;justify-content:space-between}
.nl{font-family:'Fraunces',serif;font-size:18px;color:white;text-decoration:none;display:flex;align-items:center;gap:10px}
.ni{width:34px;height:34px;background:rgba(255,255,255,.15);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px}
.wrap{max-width:760px;margin:0 auto;padding:48px 5%}
.head{text-align:center;margin-bottom:36px}
.plan-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:20px;font-size:13px;font-weight:700;margin-bottom:16px}
.head h1{font-family:'Fraunces',serif;font-size:28px;margin-bottom:8px}
.head p{font-size:14px;color:var(--soft);max-width:520px;margin:0 auto;line-height:1.6}
.notice{background:var(--oc);border-left:4px solid var(--or);border-radius:12px;padding:16px 18px;margin-bottom:28px;display:flex;gap:14px;align-items:flex-start}
.notice-ico{font-size:22px;flex-shrink:0}
.notice h3{font-size:14px;font-weight:700;color:var(--or);margin-bottom:5px}
.notice p{font-size:13px;color:#7a5500;line-height:1.6}
.card{background:var(--w);border-radius:20px;padding:36px;box-shadow:0 4px 24px rgba(0,0,0,.07);border:1px solid var(--bd);margin-bottom:20px}
.stitle{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--soft);margin:28px 0 16px;padding-top:28px;border-top:1px solid var(--bd)}
.stitle:first-child{border-top:none;margin-top:0;padding-top:0}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.fg{margin-bottom:14px}
label{display:block;font-size:12.5px;font-weight:600;color:var(--tx);margin-bottom:6px}
.req{color:var(--r)}
.opt{font-size:10px;font-weight:400;color:var(--soft);margin-left:4px}
input[type=text],input[type=email],input[type=tel],input[type=password],select{width:100%;padding:11px 13px;font-family:'Plus Jakarta Sans',sans-serif;font-size:13.5px;border:1.5px solid var(--bd);border-radius:10px;background:#fafcfa;color:var(--tx);outline:none;transition:border-color .2s}
input:focus,select:focus{border-color:var(--v);background:white}
.fnote{font-size:11px;color:var(--soft);margin-top:5px;line-height:1.5}
.autobox{background:var(--vc);border:1.5px solid #a5d6b7;border-radius:12px;padding:18px;margin-bottom:6px}
.autobox label{color:var(--vf)}
.autobox input{background:white;margin-top:8px}
.autohint{font-size:12px;color:#2d6a4f;margin-top:8px;line-height:1.6;display:flex;gap:7px}
.pwdbar{height:4px;border-radius:2px;background:#e0e0e0;margin-top:8px;overflow:hidden}
.pwdfill{height:100%;border-radius:2px;transition:width .3s,background .3s;width:0}
.pwdlist{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:8px;font-size:11px}
.pr{display:flex;align-items:center;gap:5px;color:var(--soft);transition:color .2s}
.pr.ok{color:var(--v);font-weight:600}
.prdot{width:6px;height:6px;border-radius:50%;background:var(--bd);flex-shrink:0;transition:background .2s}
.pr.ok .prdot{background:var(--v)}
.consent{display:flex;align-items:flex-start;gap:10px;margin:18px 0;font-size:13px;color:var(--soft);line-height:1.6}
.consent input{width:18px;height:18px;flex-shrink:0;margin-top:1px;accent-color:var(--v)}
.consent a{color:var(--v);font-weight:600}
.msg-err{background:var(--rc);border:1.5px solid #ffb3b3;border-radius:11px;padding:14px 16px;font-size:13px;color:var(--r);margin-bottom:20px}
.btnsubmit{width:100%;padding:15px;background:var(--v);color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;margin-top:8px}
.btnsubmit:hover{background:var(--vf)}
.btnsubmit:disabled{opacity:.6;cursor:not-allowed}
.btnnote{font-size:11px;color:var(--soft);text-align:center;margin-top:10px;line-height:1.5}
.foot{text-align:center;padding:20px;font-size:11px;color:var(--soft)}
.foot a{color:var(--soft);text-decoration:none;margin:0 6px}
.foot a:hover{color:var(--v)}
@media(max-width:600px){.g2,.g3{grid-template-columns:1fr}.card{padding:24px 18px}.pwdlist{grid-template-columns:1fr}}
</style>
</head>
<body>
<nav>
  <a href="/" class="nl"><div class="ni">&#x1F3E5;</div>SantéBF</a>
  <span style="font-size:12px;color:rgba(255,255,255,.6)">Création de compte</span>
</nav>

<div class="wrap">
  <div class="head">
    <div class="plan-badge" style="background:${planBg};color:${planColor}">&#x1F3E5; Plan ${planNom} sélectionné</div>
    <h1>Créez le compte de votre structure</h1>
    <p>Renseignez les informations de votre structure et du responsable légal. Votre compte sera activé après vérification <strong>(72h maximum)</strong>.</p>
  </div>

  <div class="notice">
    <div class="notice-ico">&#x26A0;&#xFE0F;</div>
    <div>
      <h3>Vérification obligatoire sous 72h</h3>
      <p>Nous vérifions l'existence légale de chaque structure avant activation. Votre numéro d'autorisation ministérielle sera contrôlé. En cas de non-conformité, votre abonnement est remboursé intégralement.</p>
    </div>
  </div>

  <div class="card">
    ${erreur ? `<div class="msg-err">&#x26A0;&#xFE0F; ${erreur}</div>` : ''}
    <form method="POST" action="/plans/inscription" id="inscForm">
      <input type="hidden" name="_csrf" value="${csrf}">
      <input type="hidden" name="tx" value="${tx}">
      <input type="hidden" name="plan" value="${planId}">

      <!-- STRUCTURE -->
      <div class="stitle">&#x1F3E5; Informations de la structure</div>
      <div class="fg">
        <label>Nom officiel de la structure <span class="req">*</span></label>
        <input type="text" name="structure_nom" value="${structure_nom}" placeholder="Ex: Clinique Sainte Marie de Ouagadougou" required maxlength="200">
        <div class="fnote">Tel que mentionné dans votre autorisation ministérielle</div>
      </div>
      <div class="g2">
        <div class="fg" style="margin-bottom:0">
          <label>Type de structure <span class="req">*</span></label>
          <select name="structure_type" required>${typeOptions}</select>
        </div>
        <div class="fg" style="margin-bottom:0">
          <label>Niveau</label>
          <select name="niveau">
            <option value="1">Niveau 1 — Local / CSPS</option>
            <option value="2">Niveau 2 — District</option>
            <option value="3">Niveau 3 — Régional</option>
            <option value="4">Niveau 4 — National</option>
          </select>
        </div>
      </div>
      <div class="g3" style="margin-top:14px">
        <div class="fg" style="margin-bottom:0">
          <label>Ville <span class="req">*</span></label>
          <input type="text" name="ville" value="${ville}" placeholder="Ouagadougou" required>
        </div>
        <div class="fg" style="margin-bottom:0">
          <label>Région <span class="req">*</span></label>
          <select name="region" required><option value="">Sélectionner...</option>${regions}</select>
        </div>
        <div class="fg" style="margin-bottom:0">
          <label>Téléphone structure</label>
          <input type="tel" name="structure_telephone" placeholder="+226 25 XX XX XX">
        </div>
      </div>
      <div class="fg" style="margin-top:14px">
        <label>Adresse complète <span class="opt">(facultatif)</span></label>
        <input type="text" name="adresse" placeholder="Secteur 15, Avenue de la République">
      </div>

      <!-- AUTORISATION -->
      <div class="stitle">&#x1F4DC; Autorisation ministérielle</div>
      <div class="autobox">
        <label>Numéro d'autorisation ministérielle <span class="req">*</span></label>
        <input type="text" name="numero_autorisation" placeholder="Ex: MS/SG/DGAS/2024/0123" required maxlength="100">
        <div class="autohint">
          <span>&#x2139;&#xFE0F;</span>
          <span>Délivré par le <strong>Ministère de la Santé du Burkina Faso</strong>. Sera vérifié dans un délai de 72h ouvrables auprès des autorités compétentes.</span>
        </div>
      </div>

      <!-- RESPONSABLE -->
      <div class="stitle">&#x1F464; Responsable légal de la structure</div>
      <p style="font-size:13px;color:var(--soft);margin-bottom:16px">Directeur(trice) ou médecin chef responsable devant les autorités.</p>
      <div class="g2">
        <div class="fg" style="margin-bottom:0">
          <label>Prénom <span class="req">*</span></label>
          <input type="text" name="responsable_prenom" value="${prenom}" required>
        </div>
        <div class="fg" style="margin-bottom:0">
          <label>Nom <span class="req">*</span></label>
          <input type="text" name="responsable_nom" value="${nom}" required>
        </div>
      </div>
      <div class="g2" style="margin-top:14px">
        <div class="fg" style="margin-bottom:0">
          <label>Fonction <span class="req">*</span></label>
          <select name="responsable_fonction" required>
            <option value="">Sélectionner...</option>
            <option value="directeur">Directeur(trice)</option>
            <option value="medecin_chef">Médecin Chef</option>
            <option value="pharmacien_chef">Pharmacien(ne) Chef</option>
            <option value="administrateur">Administrateur(trice)</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div class="fg" style="margin-bottom:0">
          <label>Téléphone <span class="req">*</span></label>
          <input type="tel" name="responsable_telephone" value="${telephone}" required placeholder="+226 XX XX XX XX">
        </div>
      </div>

      <!-- COMPTE ADMIN -->
      <div class="stitle">&#x1F511; Compte administrateur principal</div>
      <p style="font-size:13px;color:var(--soft);margin-bottom:16px">Ce compte aura accès complet à la gestion de la structure. Vous pourrez créer d'autres comptes après connexion.</p>
      <div class="fg">
        <label>Email professionnel <span class="req">*</span></label>
        <input type="email" name="email" value="${email}" required placeholder="direction@votre-structure.bf">
        <div class="fnote">Sera votre identifiant de connexion à SantéBF.</div>
      </div>
      <div class="g2">
        <div class="fg" style="margin-bottom:0">
          <label>Mot de passe <span class="req">*</span></label>
          <input type="password" name="password" id="pwdI" required minlength="8" oninput="checkPwd(this.value)">
          <div class="pwdbar"><div class="pwdfill" id="pwdFill"></div></div>
          <div class="pwdlist">
            <div class="pr" id="pr-len"><div class="prdot"></div>8 caractères min.</div>
            <div class="pr" id="pr-maj"><div class="prdot"></div>1 majuscule</div>
            <div class="pr" id="pr-num"><div class="prdot"></div>1 chiffre</div>
            <div class="pr" id="pr-spe"><div class="prdot"></div>1 spécial (#@!$%)</div>
          </div>
        </div>
        <div class="fg" style="margin-bottom:0">
          <label>Confirmer <span class="req">*</span></label>
          <input type="password" name="password_confirm" id="pwdC" required oninput="checkMatch()">
          <div id="matchMsg" style="font-size:11px;margin-top:8px"></div>
        </div>
      </div>

      <!-- CONSENTEMENT -->
      <div class="consent">
        <input type="checkbox" id="con" name="consent" required>
        <label for="con" style="margin-bottom:0;font-weight:400;cursor:pointer">Je certifie que les informations fournies sont exactes et que j'ai le mandat pour enregistrer cette structure. J'accepte les <a href="/politique-confidentialite" target="_blank">conditions d'utilisation et la politique de confidentialité</a>.</label>
      </div>

      <button type="submit" class="btnsubmit" id="subBtn" onclick="return handleSub()">
        Soumettre la demande d'inscription &#x2192;
      </button>
      <p class="btnnote">&#x1F512; Données chiffrées et protégées. Notre équipe vérifie votre dossier sous 72h.</p>
    </form>
  </div>

  <div class="foot">
    <a href="/politique-confidentialite">Confidentialité</a>
    <a href="/contact">Contact</a>
    <a href="/">Accueil</a>
  </div>
</div>

<script>
function checkPwd(v) {
  const rules = {len:v.length>=8,maj:/[A-Z]/.test(v),num:/[0-9]/.test(v),spe:/[#@!$%]/.test(v)}
  let s = Object.values(rules).filter(Boolean).length
  const f = document.getElementById('pwdFill')
  f.style.width = (s*25)+'%'
  f.style.background = ['#e0e0e0','#e53935','#fb8c00','#fdd835','#43a047'][s]
  for (const [k,ok] of Object.entries(rules)) {
    const el = document.getElementById('pr-'+k)
    if (el) el.className = 'pr'+(ok?' ok':'')
  }
  checkMatch()
}
function checkMatch() {
  const p = document.getElementById('pwdI').value
  const c = document.getElementById('pwdC').value
  const m = document.getElementById('matchMsg')
  if (!c) { m.textContent=''; return }
  if (c===p) { m.style.color='var(--v)'; m.textContent='✅ Identiques' }
  else { m.style.color='var(--r)'; m.textContent='⚠️ Différents' }
}
function handleSub() {
  const p = document.getElementById('pwdI').value
  const c = document.getElementById('pwdC').value
  if (p!==c) { alert('Les mots de passe ne correspondent pas'); return false }
  document.getElementById('subBtn').disabled = true
  document.getElementById('subBtn').textContent = 'Envoi en cours...'
  return true
}
</script>
</body>
</html>`
}
