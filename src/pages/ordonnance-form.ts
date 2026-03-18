/**
 * src/pages/ordonnance-form.ts
 * SantéBF — Formulaire nouvelle ordonnance
 *
 * CAUSE DU BUG "il ne se passe rien" :
 * ─────────────────────────────────────
 * Version originale :
 *   - Le champ caché s'appelait  name="lignes_json"
 *   - medecin.ts POST lisait      body.medicaments   ← NOM DIFFÉRENT
 *   → body.medicaments = undefined → JSON.parse('[]') = []
 *   → Ordonnance créée en DB sans aucun médicament
 *   → Pas d'erreur visible, redirect silencieux
 *   → Patient voit une ordonnance vide, médecin croit que ça n'a pas marché
 *
 * Corrections :
 *   1. name="lignes_json" → name="medicaments"  ← correspond à medecin.ts
 *   2. Structure médicament harmonisée :
 *      {nom_medicament, posologie, duree_jours} → {nom, dosage, frequence, duree, forme, qte}
 *   3. Formulaire plus complet : forme, fréquence, quantité
 *   4. Validation JS côté client robuste
 *   5. Mode sombre compatible dashboard
 *
 * Ce qui se passe après submit (côté serveur — medecin.ts) :
 *   1. Ordonnance créée dans medical_ordonnances (numéro ORD-... auto par trigger DB)
 *   2. Lignes médicaments dans medical_ordonnance_lignes
 *   3. Email Resend envoyé au patient si auth_profiles.email renseigné
 *   4. QR code généré automatiquement par trigger DB
 *   5. Redirect vers /medecin/patients/:pid?ord=ok
 *
 * Côté patient (dashboard-patient.ts) :
 *   - ordonnancesActives est compté via dashboard.ts (count medical_ordonnances statut=active)
 *   - Le patient voit le compteur augmenter à son prochain login
 *   - Il peut voir/télécharger via /patient/ordonnances (route à créer dans patient.ts)
 */

export function ordonnanceFormPage(patient: any, erreur?: string): string {
  const pid  = patient?.id ?? ''
  const pNom = patient ? `${patient.prenom} ${patient.nom}` : ''
  const pNum = patient?.numero_national ?? ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle ordonnance &#x2014; Sant&#xe9;BF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root{--v:#4A148C;--vl:#EDE7F6;--vg:rgba(74,20,140,.08);
      --bg:#F7F8FA;--sur:white;--brd:#E5E7EB;--tx:#1A1A2E;--tx2:#6B7280;--tx3:#9CA3AF}
    [data-theme="dark"]{--bg:#0F1117;--sur:#1A1B2E;--brd:#2E3047;--tx:#E8E8F0;--tx2:#9BA3B8;--vl:#2A1550}
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:var(--bg);padding:24px;color:var(--tx);transition:background .2s,color .2s}
    .container{max-width:900px;margin:0 auto}
    .back-link{display:inline-flex;align-items:center;gap:6px;color:var(--v);text-decoration:none;font-size:14px;margin-bottom:16px;font-weight:600}
    .back-link:hover{text-decoration:underline}
    .card{background:var(--sur);border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:20px;border:1px solid var(--brd)}
    h1{font-family:'DM Serif Display',serif;font-size:26px;color:var(--tx);margin-bottom:6px}
    .subtitle{font-size:14px;color:var(--tx2);margin-bottom:28px}
    .alert-err{background:#FFF5F5;border-left:4px solid #B71C1C;padding:14px 18px;border-radius:8px;margin-bottom:24px;font-size:14px;color:#B71C1C}
    .fg{margin-bottom:20px}
    label{display:block;font-size:13px;font-weight:600;color:var(--tx);margin-bottom:7px}
    .req{color:#B71C1C}
    input,select,textarea{width:100%;padding:11px 13px;border:1.5px solid var(--brd);
      border-radius:9px;font-size:14px;font-family:'DM Sans',sans-serif;
      color:var(--tx);background:var(--bg);outline:none;transition:border-color .2s,background .2s}
    input:focus,select:focus,textarea:focus{border-color:var(--v);background:var(--sur);box-shadow:0 0 0 4px var(--vg)}
    textarea{resize:vertical;min-height:80px}
    .sec-title{font-size:13px;font-weight:700;text-transform:uppercase;color:var(--tx2);letter-spacing:.8px;margin:28px 0 16px}
    .sep{border:0;height:2px;background:var(--brd);margin:28px 0}

    /* Bloc médicament */
    .med-bloc{background:var(--vl);border:1.5px solid var(--brd);border-radius:12px;padding:18px;margin-bottom:14px;position:relative}
    .med-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
    .med-num{background:var(--v);color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
    .btn-del{background:#FEE2E2;color:#B71C1C;border:none;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer}
    .btn-del:hover{background:#FCA5A5}
    .med-g4{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:10px}
    .med-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}

    .btn-add{background:#E8F5E9;color:#1A6B3C;border:2px dashed #1A6B3C;padding:13px;
      border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;width:100%;
      font-family:'DM Sans',sans-serif;transition:background .2s;margin-top:4px}
    .btn-add:hover{background:#C8E6C9}

    .btn-row{display:flex;gap:12px;margin-top:32px;flex-wrap:wrap}
    .btn{padding:13px 26px;border-radius:10px;font-size:15px;font-weight:600;
      border:none;cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none;display:inline-block}
    .btn-p{background:var(--v);color:white;box-shadow:0 4px 14px rgba(74,20,140,.3)}
    .btn-p:hover{opacity:.9}
    .btn-s{background:var(--brd);color:var(--tx)}

    .info-box{background:#E3F2FD;border-left:4px solid #1565C0;padding:11px 15px;border-radius:8px;font-size:13px;color:#1565C0;margin-bottom:20px}
    @media(max-width:768px){.med-g4{grid-template-columns:1fr 1fr}.med-g2{grid-template-columns:1fr}body{padding:12px}.card{padding:20px}}
  </style>
  <script>(function(){var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t)})();</script>
</head>
<body>
<div class="container">
  <a href="/medecin/patients${pid ? '/' + pid : ''}" class="back-link">&#x2190; Retour</a>

  <div class="card">
    <h1>Nouvelle ordonnance</h1>
    <p class="subtitle">
      ${patient
        ? `Patient : <strong>${pNom}</strong> &bull; <span style="font-family:monospace">${pNum}</span>`
        : 'S&#xe9;lectionner un patient'}
    </p>

    ${erreur ? `<div class="alert-err">&#x26A0;&#xFE0F; ${erreur}</div>` : ''}

    <div class="info-box">
      &#x1F4E7; Apr&#xe8;s enregistrement, un email est automatiquement envoy&#xe9; au patient
      avec le num&#xe9;ro d&#x27;ordonnance et le QR code de v&#xe9;rification.
    </div>

    <form method="POST" action="/medecin/ordonnances/nouvelle" id="ordF">
      <input type="hidden" name="patient_id" value="${pid}">

      <!-- ✅ FIX CRITIQUE : name="medicaments" correspond à ce que medecin.ts lit -->
      <!-- L'original avait name="lignes_json" → body.medicaments = undefined → meds=[] -->
      <input type="hidden" name="medicaments" id="medsJson" value="[]">

      <!-- Diagnostic -->
      <div class="fg">
        <label>Diagnostic / Indications cliniques</label>
        <textarea name="diagnostic"
          placeholder="Ex : Infection respiratoire haute, fi&#xe8;vre 38.5&#xb0;C" rows="3"></textarea>
      </div>

      <hr class="sep">

      <!-- Médicaments -->
      <div class="sec-title">&#x1F48A; M&#xe9;dicaments prescrits <span class="req">*</span></div>
      <div id="lignes"></div>
      <button type="button" class="btn-add" onclick="addMed()">&#x2795; Ajouter un m&#xe9;dicament</button>

      <hr class="sep">

      <!-- Conseils -->
      <div class="fg">
        <label>Conseils au patient</label>
        <textarea name="conseils"
          placeholder="Ex : Bien s&#x27;hydrater, repos au lit, consulter si aggravation..." rows="3"></textarea>
      </div>

      <div class="btn-row">
        <button type="submit" class="btn btn-p" onclick="return buildAndSubmit()">
          &#x2705; Cr&#xe9;er l&#x27;ordonnance
        </button>
        <a href="/medecin/patients${pid ? '/' + pid : ''}" class="btn btn-s">Annuler</a>
      </div>
    </form>
  </div>
</div>

<script>
var cnt = 0;

function addMed() {
  cnt++;
  var n = cnt;
  var d = document.createElement('div');
  d.className = 'med-bloc';
  d.id = 'med' + n;
  d.innerHTML =
    '<div class="med-head">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        '<div class="med-num">' + n + '</div>' +
        '<span style="font-size:13px;font-weight:600;color:var(--v)">M\u00e9dicament\u00a0' + n + '</span>' +
      '</div>' +
      '<button type="button" class="btn-del" onclick="document.getElementById(\'med' + n + '\').remove()">&#x1F5D1; Supprimer</button>' +
    '</div>' +
    '<div class="med-g4">' +
      '<div class="fg"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:5px">Nom du m\u00e9dicament *</label>' +
        '<input class="mn" type="text" placeholder="Ex\u00a0: Amoxicilline 500mg"></div>' +
      '<div class="fg"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:5px">Dosage</label>' +
        '<input class="md" type="text" placeholder="500mg"></div>' +
      '<div class="fg"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:5px">Fr\u00e9quence</label>' +
        '<input class="mf" type="text" placeholder="3\u00d7/jour"></div>' +
      '<div class="fg"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:5px">Dur\u00e9e</label>' +
        '<input class="mdu" type="text" placeholder="7 jours"></div>' +
    '</div>' +
    '<div class="med-g2">' +
      '<div class="fg"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:5px">Forme</label>' +
        '<select class="mfm" style="width:100%;padding:9px 11px;border:1.5px solid var(--brd);border-radius:8px;background:var(--bg);color:var(--tx);font-family:inherit">' +
          '<option value="comprim\u00e9">Comprim\u00e9</option>' +
          '<option value="g\u00e9lule">G\u00e9lule</option>' +
          '<option value="sirop">Sirop</option>' +
          '<option value="injection">Injection</option>' +
          '<option value="pommade">Pommade</option>' +
          '<option value="gouttes">Gouttes</option>' +
          '<option value="suppositoire">Suppositoire</option>' +
          '<option value="inhalateur">Inhalateur</option>' +
        '</select></div>' +
      '<div class="fg"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:5px">Quantit\u00e9</label>' +
        '<input class="mq" type="number" value="1" min="1" max="99"></div>' +
    '</div>' +
    '<div class="fg" style="margin-top:4px"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:5px">Instructions sp\u00e9cifiques</label>' +
      '<input class="mi" type="text" placeholder="Ex\u00a0: Prendre pendant le repas, \u00e9viter l\'alcool"></div>';
  document.getElementById('lignes').appendChild(d);
}

function buildAndSubmit() {
  // Construire le JSON des médicaments — structure attendue par medecin.ts
  var blocs = document.querySelectorAll('.med-bloc');
  var meds = [];
  for (var i = 0; i < blocs.length; i++) {
    var nom = blocs[i].querySelector('.mn').value.trim();
    if (!nom) continue;
    meds.push({
      nom:          nom,
      dosage:       blocs[i].querySelector('.md').value.trim(),
      frequence:    blocs[i].querySelector('.mf').value.trim(),
      duree:        blocs[i].querySelector('.mdu').value.trim(),
      forme:        blocs[i].querySelector('.mfm').value,
      qte:          blocs[i].querySelector('.mq').value || '1',
      instructions: blocs[i].querySelector('.mi').value.trim() || null
    });
  }
  if (meds.length === 0) {
    alert('\u26a0\ufe0f Ajoutez au moins un m\u00e9dicament \u00e0 l\'ordonnance.');
    return false;
  }
  // ✅ Stocker dans name="medicaments" — medecin.ts lit body.medicaments
  document.getElementById('medsJson').value = JSON.stringify(meds);
  return true;
}

// Pré-ajouter 1 médicament au chargement
addMed();
</script>
</body>
</html>`
}
