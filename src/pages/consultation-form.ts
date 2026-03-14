// Formulaire de nouvelle consultation
// Champs : motif, anamnèse, examen clinique, diagnostic, conduite à tenir

export function consultationFormPage(patient: any, erreur?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle consultation — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',sans-serif; background:#F7F8FA; padding:20px; }
    .container { max-width:900px; margin:0 auto; }
    .back-link {
      display:inline-flex; align-items:center; gap:6px;
      color:#4A148C; text-decoration:none; font-size:14px;
      margin-bottom:16px; font-weight:600;
    }
    .back-link:hover { text-decoration:underline; }
    .card {
      background:white; border-radius:16px; padding:32px;
      box-shadow:0 2px 12px rgba(0,0,0,0.06); margin-bottom:20px;
    }
    h1 {
      font-family:'DM Serif Display',serif; font-size:26px;
      color:#1A1A2E; margin-bottom:6px;
    }
    .subtitle { font-size:14px; color:#6B7280; margin-bottom:28px; }
    ${erreur ? `
    .alert-error {
      background:#FFF5F5; border-left:4px solid:#B71C1C;
      padding:14px 18px; border-radius:8px; margin-bottom:24px;
      font-size:14px; color:#B71C1C;
    }
    ` : ''}
    .form-group { margin-bottom:22px; }
    label {
      display:block; font-size:13px; font-weight:600;
      color:#1A1A2E; margin-bottom:7px;
    }
    label .required { color:#B71C1C; }
    input[type="text"], input[type="date"], input[type="time"], select, textarea {
      width:100%; padding:12px 14px;
      border:1.5px solid #E5E7EB; border-radius:10px;
      font-size:15px; font-family:'DM Sans',sans-serif;
      color:#1A1A2E; background:#F9FAFB;
      outline:none; transition:border-color .2s, background .2s;
    }
    input:focus, select:focus, textarea:focus {
      border-color:#4A148C; background:white;
      box-shadow:0 0 0 4px rgba(74,20,140,0.08);
    }
    textarea { resize:vertical; min-height:100px; }
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .btn-group { display:flex; gap:12px; margin-top:32px; }
    .btn {
      padding:14px 28px; border-radius:10px; font-size:15px;
      font-weight:600; border:none; cursor:pointer;
      font-family:'DM Sans',sans-serif; transition:transform .1s;
    }
    .btn:hover { transform:scale(1.02); }
    .btn-primary {
      background:#4A148C; color:white;
      box-shadow:0 4px 14px rgba(74,20,140,0.3);
    }
    .btn-secondary { background:#E5E7EB; color:#424242; }
    .helper-text {
      font-size:12px; color:#9CA3AF; margin-top:5px;
      font-style:italic;
    }
    .section-separator {
      border:0; height:2px; background:#F3F4F6; margin:28px 0;
    }
    .section-title {
      font-size:14px; font-weight:700; text-transform:uppercase;
      color:#6B7280; letter-spacing:0.8px; margin-bottom:16px;
    }
    @media (max-width:768px) {
      .grid-2 { grid-template-columns:1fr; }
      body { padding:12px; }
      .card { padding:20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="/medecin/patients" class="back-link">← Retour</a>

    <div class="card">
      <h1>Nouvelle consultation</h1>
      <p class="subtitle">
        ${patient ? `Patient : <strong>${patient.prenom} ${patient.nom}</strong> • ${patient.numero_national}` : 'Sélectionner un patient'}
      </p>

      ${erreur ? `<div class="alert-error">⚠️ ${erreur}</div>` : ''}

      <form method="POST" action="/medecin/consultations/nouvelle">
        ${patient ? `<input type="hidden" name="patient_id" value="${patient.id}">` : ''}

        <!-- Type et motif -->
        <div class="section-title">📋 Informations générales</div>

        <div class="grid-2">
          <div class="form-group">
            <label>Type de consultation <span class="required">*</span></label>
            <select name="type_consultation" required>
              <option value="normale">Consultation normale</option>
              <option value="urgence">Urgence</option>
              <option value="suivi">Suivi</option>
              <option value="teleconsultation">Téléconsultation</option>
              <option value="domicile">Visite à domicile</option>
            </select>
          </div>

          <div class="form-group">
            <label>Date consultation</label>
            <input type="date" name="date_consultation" value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>

        <div class="form-group">
          <label>Motif de consultation <span class="required">*</span></label>
          <textarea name="motif" placeholder="Ex : Douleurs abdominales depuis 3 jours..." required></textarea>
          <div class="helper-text">Raison pour laquelle le patient consulte aujourd'hui</div>
        </div>

        <hr class="section-separator">

        <!-- Anamnèse -->
        <div class="section-title">📝 Anamnèse</div>

        <div class="form-group">
          <label>Histoire de la maladie actuelle</label>
          <textarea name="anamnese" placeholder="Début des symptômes, évolution, traitements déjà pris..."></textarea>
        </div>

        <div class="form-group">
          <label>Antécédents pertinents</label>
          <textarea name="antecedents" placeholder="Antécédents médicaux, chirurgicaux, familiaux pertinents..."></textarea>
        </div>

        <hr class="section-separator">

        <!-- Examen clinique -->
        <div class="section-title">🩺 Examen clinique</div>

        <div class="form-group">
          <label>Examen général</label>
          <textarea name="examen_general" placeholder="État général, conscience, hydratation, nutrition..."></textarea>
        </div>

        <div class="form-group">
          <label>Examen physique</label>
          <textarea name="examen_physique" placeholder="Cardiovasculaire, respiratoire, abdominal, neurologique..."></textarea>
        </div>

        <hr class="section-separator">

        <!-- Diagnostic et conduite -->
        <div class="section-title">🎯 Diagnostic et prise en charge</div>

        <div class="form-group">
          <label>Diagnostic principal <span class="required">*</span></label>
          <input type="text" name="diagnostic_principal" placeholder="Ex : Gastro-entérite aiguë" required>
        </div>

        <div class="form-group">
          <label>Diagnostics secondaires</label>
          <input type="text" name="diagnostics_secondaires" placeholder="Autres diagnostics (séparés par des virgules)">
        </div>

        <div class="form-group">
          <label>Conduite à tenir / Plan de traitement <span class="required">*</span></label>
          <textarea name="conduite_a_tenir" placeholder="Traitement prescrit, examens demandés, conseils..." required></textarea>
        </div>

        <div class="form-group">
          <label>Notes supplémentaires</label>
          <textarea name="notes" placeholder="Observations, instructions, rendez-vous de contrôle..."></textarea>
        </div>

        <hr class="section-separator">

        <!-- Constantes vitales (optionnel) -->
        <div class="section-title">🌡️ Constantes vitales (optionnel)</div>

        <div class="grid-2">
          <div class="form-group">
            <label>Température (°C)</label>
            <input type="text" name="temperature" placeholder="37.2">
          </div>
          <div class="form-group">
            <label>Fréquence cardiaque (bpm)</label>
            <input type="text" name="frequence_cardiaque" placeholder="75">
          </div>
          <div class="form-group">
            <label>Tension artérielle (mmHg)</label>
            <input type="text" name="tension_arterielle" placeholder="120/80">
          </div>
          <div class="form-group">
            <label>Saturation O₂ (%)</label>
            <input type="text" name="saturation_o2" placeholder="98">
          </div>
          <div class="form-group">
            <label>Poids (kg)</label>
            <input type="text" name="poids" placeholder="70">
          </div>
          <div class="form-group">
            <label>Taille (cm)</label>
            <input type="text" name="taille" placeholder="170">
          </div>
        </div>

        <div class="btn-group">
          <button type="submit" class="btn btn-primary">
            ✅ Enregistrer la consultation
          </button>
          <a href="/medecin/patients${patient ? `/${patient.id}` : ''}" class="btn btn-secondary">
            Annuler
          </a>
        </div>
      </form>
    </div>
  </div>
</body>
</html>`
}
