/**
 * src/pages/consultation-form.ts
 * SantéBF — Formulaire nouvelle consultation
 *
 * Corrections vs version originale :
 *   1. tension_arterielle='120/80' → tension_sys + tension_dia séparés
 *      (medecin.ts POST lit body.tension_sys et body.tension_dia)
 *   2. examen_general + examen_physique → examen_clinique
 *      (medecin.ts lit body.examen_clinique)
 *   3. antecedents → champ anamnese étendu (pas de colonne antecedents en DB)
 *   4. Link retour vers /medecin/patients/:id si pid connu
 *   5. Mode sombre CSS variables compatible avec dashboard-medecin
 */

export function consultationFormPage(patient: any, erreur?: string): string {
  const pid   = patient?.id        ?? ''
  const pNom  = patient ? `${patient.prenom} ${patient.nom}` : ''
  const pNum  = patient?.numero_national ?? ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle consultation &#x2014; Sant&#xe9;BF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root{--v:#4A148C;--vl:#EDE7F6;--vg:rgba(74,20,140,.08);
      --bg:#F7F8FA;--sur:white;--brd:#E5E7EB;--tx:#1A1A2E;--tx2:#6B7280}
    [data-theme="dark"]{--bg:#0F1117;--sur:#1A1B2E;--brd:#2E3047;--tx:#E8E8F0;--tx2:#9BA3B8;--vl:#2A1550}
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:var(--bg);padding:24px;color:var(--tx);transition:background .2s,color .2s}
    .container{max-width:900px;margin:0 auto}
    .back-link{display:inline-flex;align-items:center;gap:6px;color:var(--v);
      text-decoration:none;font-size:14px;margin-bottom:16px;font-weight:600}
    .back-link:hover{text-decoration:underline}
    .card{background:var(--sur);border-radius:16px;padding:32px;
      box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:20px;border:1px solid var(--brd)}
    h1{font-family:'DM Serif Display',serif;font-size:26px;color:var(--tx);margin-bottom:6px}
    .subtitle{font-size:14px;color:var(--tx2);margin-bottom:28px}
    .alert-error{background:#FFF5F5;border-left:4px solid #B71C1C;
      padding:14px 18px;border-radius:8px;margin-bottom:24px;font-size:14px;color:#B71C1C}
    .fg{margin-bottom:20px}
    label{display:block;font-size:13px;font-weight:600;color:var(--tx);margin-bottom:7px}
    .req{color:#B71C1C}
    input,select,textarea{width:100%;padding:12px 14px;border:1.5px solid var(--brd);
      border-radius:10px;font-size:15px;font-family:'DM Sans',sans-serif;
      color:var(--tx);background:var(--bg);outline:none;transition:border-color .2s,background .2s}
    input:focus,select:focus,textarea:focus{border-color:var(--v);background:var(--sur);box-shadow:0 0 0 4px var(--vg)}
    textarea{resize:vertical;min-height:100px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
    .sep{border:0;height:2px;background:var(--brd);margin:28px 0}
    .sec-title{font-size:13px;font-weight:700;text-transform:uppercase;
      color:var(--tx2);letter-spacing:.8px;margin-bottom:16px;display:flex;align-items:center;gap:8px}
    .btn-row{display:flex;gap:12px;margin-top:32px;flex-wrap:wrap}
    .btn{padding:13px 26px;border-radius:10px;font-size:15px;font-weight:600;
      border:none;cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none;display:inline-block}
    .btn-p{background:var(--v);color:white;box-shadow:0 4px 14px rgba(74,20,140,.3)}
    .btn-p:hover{opacity:.9}
    .btn-s{background:var(--brd);color:var(--tx)}
    .helper{font-size:12px;color:var(--tx2);margin-top:5px;font-style:italic}
    .alerte-constante{display:none;background:#FFF3E0;border-left:4px solid #E65100;
      padding:10px 14px;border-radius:8px;margin-bottom:12px;font-size:12px;color:#E65100}
    .alerte-constante.show{display:block}
    @media(max-width:768px){.grid2,.grid3{grid-template-columns:1fr}body{padding:12px}.card{padding:20px}}
  </style>
  <script>(function(){var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t)})();</script>
</head>
<body>
  <div class="container">
    <a href="/medecin/patients${pid ? '/' + pid : ''}" class="back-link">&#x2190; Retour</a>

    <div class="card">
      <h1>Nouvelle consultation</h1>
      <p class="subtitle">
        ${patient
          ? `Patient : <strong>${pNom}</strong> &bull; <span style="font-family:monospace">${pNum}</span>`
          : 'S&#xe9;lectionner un patient'}
      </p>

      ${erreur ? `<div class="alert-error">&#x26A0;&#xFE0F; ${erreur}</div>` : ''}

      <form method="POST" action="/medecin/consultations/nouvelle">
        <input type="hidden" name="patient_id" value="${pid}">

        <!-- Infos générales -->
        <div class="sec-title">&#x1F4CB; Informations g&#xe9;n&#xe9;rales</div>
        <div class="grid2">
          <div class="fg">
            <label>Type de consultation <span class="req">*</span></label>
            <select name="type_consultation" required>
              <option value="normale">Consultation normale</option>
              <option value="urgence">Urgence</option>
              <option value="suivi">Suivi</option>
              <option value="teleconsultation">T&#xe9;l&#xe9;consultation</option>
              <option value="domicile">Visite &#xe0; domicile</option>
            </select>
          </div>
          <div class="fg">
            <label>Motif <span class="req">*</span></label>
            <input type="text" name="motif" placeholder="Ex : Douleurs abdominales depuis 3 jours" required>
          </div>
        </div>

        <hr class="sep">

        <!-- Anamnèse -->
        <div class="sec-title">&#x1F4DD; Anamn&#xe8;se</div>
        <div class="fg">
          <label>Histoire de la maladie + ant&#xe9;c&#xe9;dents pertinents</label>
          <textarea name="anamnese"
            placeholder="D&#xe9;but des sympt&#xf4;mes, &#xe9;volution, ant&#xe9;c&#xe9;dents m&#xe9;dicaux/chirurgicaux, traitements d&#xe9;j&#xe0; pris..."
            rows="5"></textarea>
          <div class="helper">Historique chronologique + ant&#xe9;c&#xe9;dents familiaux pertinents</div>
        </div>

        <hr class="sep">

        <!-- Examen clinique — champ UNIQUE correspondant à medecin.ts -->
        <div class="sec-title">&#x1FA7A; Examen clinique</div>
        <div class="fg">
          <label>Examen clinique complet</label>
          <textarea name="examen_clinique"
            placeholder="&#xc9;tat g&#xe9;n&#xe9;ral, conscience, examen cardiovasculaire, respiratoire, abdominal, neurologique..."
            rows="6"></textarea>
        </div>

        <hr class="sep">

        <!-- Diagnostic -->
        <div class="sec-title">&#x1F3AF; Diagnostic et prise en charge</div>
        <div class="fg">
          <label>Diagnostic principal <span class="req">*</span></label>
          <input type="text" name="diagnostic_principal"
            placeholder="Ex : Gastro-ent&#xe9;rite aigu&#xeb;" required>
        </div>
        <div class="fg">
          <label>Conclusion / Bilan</label>
          <textarea name="conclusion"
            placeholder="Synth&#xe8;se clinique, &#xe9;volution attendue..."></textarea>
        </div>
        <div class="fg">
          <label>Conduite &#xe0; tenir <span class="req">*</span></label>
          <textarea name="conduite_a_tenir"
            placeholder="Traitement prescrit, examens demand&#xe9;s, conseils hygi&#xe9;no-di&#xe9;t&#xe9;tiques..." required></textarea>
        </div>
        <div class="fg">
          <label>Notes confidentielles <small style="font-weight:400;color:var(--tx2)">(jamais visibles par le patient)</small></label>
          <textarea name="notes_confidentielles"
            placeholder="Observations priv&#xe9;es r&#xe9;serv&#xe9;es au m&#xe9;decin..." rows="3"></textarea>
        </div>

        <hr class="sep">

        <!-- Constantes vitales -->
        <div class="sec-title">&#x1F321;&#xFE0F; Constantes vitales <small style="font-size:11px;font-weight:400;text-transform:none">(optionnel)</small></div>

        <div id="alerteConstante" class="alerte-constante"></div>

        <!-- tension_sys + tension_dia SÉPARÉS pour correspondre à medecin.ts -->
        <div class="grid3">
          <div class="fg">
            <label>Tension syst. (mmHg)</label>
            <input type="number" name="tension_sys" id="ts"
              placeholder="120" min="60" max="250" oninput="checkConst()">
          </div>
          <div class="fg">
            <label>Tension diast. (mmHg)</label>
            <input type="number" name="tension_dia" id="td"
              placeholder="80" min="40" max="150" oninput="checkConst()">
          </div>
          <div class="fg">
            <label>Temp&#xe9;rature (&#xb0;C)</label>
            <input type="number" name="temperature" id="tt"
              placeholder="37.0" step="0.1" min="34" max="43" oninput="checkConst()">
          </div>
          <div class="fg">
            <label>Pouls (bpm)</label>
            <input type="number" name="pouls" placeholder="72" min="30" max="220">
          </div>
          <div class="fg">
            <label>SpO2 (%)</label>
            <input type="number" name="spo2" id="to"
              placeholder="98" min="50" max="100" oninput="checkConst()">
          </div>
          <div class="fg">
            <label>Glyc&#xe9;mie (g/L)</label>
            <input type="number" name="glycemie" id="tg"
              placeholder="0.95" step="0.01" oninput="checkConst()">
          </div>
          <div class="fg">
            <label>Poids (kg)</label>
            <input type="number" name="poids" placeholder="70.0" step="0.1" min="1" max="300">
          </div>
          <div class="fg">
            <label>Taille (cm)</label>
            <input type="number" name="taille" placeholder="170" min="30" max="250">
          </div>
        </div>

        <hr class="sep">

        <!-- RDV suivi optionnel -->
        <div class="sec-title">&#x1F4C5; RDV de suivi <small style="font-size:11px;font-weight:400;text-transform:none">(optionnel)</small></div>
        <div class="grid2">
          <div class="fg">
            <label>Date RDV</label>
            <input type="date" name="rdv_date">
          </div>
          <div class="fg">
            <label>Heure</label>
            <input type="time" name="rdv_heure">
          </div>
          <div class="fg" style="grid-column:1/-1">
            <label>Motif RDV</label>
            <input type="text" name="rdv_motif" placeholder="Ex : Contr&#xf4;le r&#xe9;sultats examens">
          </div>
        </div>

        <div class="btn-row">
          <button type="submit" class="btn btn-p">&#x2705; Enregistrer la consultation</button>
          <a href="/medecin/patients${pid ? '/' + pid : ''}" class="btn btn-s">Annuler</a>
        </div>
      </form>
    </div>
  </div>

<script>
function checkConst(){
  var s=parseFloat(document.getElementById('ts').value)||0;
  var d=parseFloat(document.getElementById('td').value)||0;
  var t=parseFloat(document.getElementById('tt').value)||0;
  var o=parseFloat(document.getElementById('to').value)||0;
  var g=parseFloat(document.getElementById('tg').value)||0;
  var msgs=[];
  if(s>=160) msgs.push('\u26a0\ufe0f Tension syst. '+s+' mmHg \u2014 CRITIQUE');
  else if(s>=140) msgs.push('\u26a0\ufe0f Tension syst. '+s+' mmHg \u2014 \u00e9lev\u00e9e');
  if(d>=100) msgs.push('\u26a0\ufe0f Tension diast. '+d+' mmHg \u2014 \u00e9lev\u00e9e');
  if(t>=39)  msgs.push('\u26a0\ufe0f Temp\u00e9rature '+t+'\u00b0C \u2014 fi\u00e8vre');
  if(t>0&&t<35) msgs.push('\u26a0\ufe0f Temp\u00e9rature '+t+'\u00b0C \u2014 hypoth\u00e9rmie');
  if(o>0&&o<94) msgs.push('\ud83d\udea8 SpO2 '+o+'% \u2014 hypox\u00e9mie');
  if(g>=2.0) msgs.push('\u26a0\ufe0f Glyc\u00e9mie '+g+' g/L \u2014 hyperglyc\u00e9mie');
  if(g>0&&g<0.5) msgs.push('\u26a0\ufe0f Glyc\u00e9mie '+g+' g/L \u2014 hypoglyc\u00e9mie');
  var el=document.getElementById('alerteConstante');
  if(msgs.length){el.innerHTML=msgs.join('<br>');el.classList.add('show');}
  else{el.innerHTML='';el.classList.remove('show');}
}
</script>
</body>
</html>`
}
