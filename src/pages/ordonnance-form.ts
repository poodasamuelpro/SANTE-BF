// Formulaire de nouvelle ordonnance
// Ajouter médicaments dynamiquement, prévisualiser, générer PDF

export function ordonnanceFormPage(patient: any, erreur?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle ordonnance — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',sans-serif; background:#F7F8FA; padding:20px; }
    .container { max-width:900px; margin:0 auto; }
    .back-link { display:inline-flex; align-items:center; gap:6px; color:#4A148C; text-decoration:none; font-size:14px; margin-bottom:16px; font-weight:600; }
    .back-link:hover { text-decoration:underline; }
    .card { background:white; border-radius:16px; padding:32px; box-shadow:0 2px 12px rgba(0,0,0,0.06); margin-bottom:20px; }
    h1 { font-family:'DM Serif Display',serif; font-size:26px; color:#1A1A2E; margin-bottom:6px; }
    .subtitle { font-size:14px; color:#6B7280; margin-bottom:28px; }
    ${erreur ? `.alert-error { background:#FFF5F5; border-left:4px solid:#B71C1C; padding:14px 18px; border-radius:8px; margin-bottom:24px; font-size:14px; color:#B71C1C; }` : ''}
    .form-group { margin-bottom:22px; }
    label { display:block; font-size:13px; font-weight:600; color:#1A1A2E; margin-bottom:7px; }
    label .required { color:#B71C1C; }
    input[type="text"], input[type="number"], input[type="date"], select, textarea {
      width:100%; padding:12px 14px; border:1.5px solid #E5E7EB; border-radius:10px;
      font-size:15px; font-family:'DM Sans',sans-serif; color:#1A1A2E; background:#F9FAFB;
      outline:none; transition:border-color .2s, background .2s;
    }
    input:focus, select:focus, textarea:focus { border-color:#4A148C; background:white; box-shadow:0 0 0 4px rgba(74,20,140,0.08); }
    textarea { resize:vertical; min-height:80px; }
    .section-title { font-size:14px; font-weight:700; text-transform:uppercase; color:#6B7280; letter-spacing:0.8px; margin:28px 0 16px; }
    .medicaments-list { margin-bottom:20px; }
    .med-item {
      background:#F9FAFB; border:2px solid #E5E7EB; border-radius:12px;
      padding:16px; margin-bottom:12px; position:relative;
    }
    .med-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
    .med-num { background:#4A148C; color:white; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; }
    .btn-remove { background:#FEE2E2; color:#B71C1C; border:none; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; }
    .btn-remove:hover { background:#FCA5A5; }
    .med-grid { display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px; }
    .btn-add { background:#E8F5E9; color:#1A6B3C; border:2px dashed #1A6B3C; padding:12px; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; width:100%; transition:background .2s; }
    .btn-add:hover { background:#C8E6C9; }
    .btn-group { display:flex; gap:12px; margin-top:32px; }
    .btn { padding:14px 28px; border-radius:10px; font-size:15px; font-weight:600; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; transition:transform .1s; }
    .btn:hover { transform:scale(1.02); }
    .btn-primary { background:#4A148C; color:white; box-shadow:0 4px 14px rgba(74,20,140,0.3); }
    .btn-secondary { background:#E5E7EB; color:#424242; }
    @media (max-width:768px) {
      .med-grid { grid-template-columns:1fr; }
      body { padding:12px; }
      .card { padding:20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="/medecin/patients" class="back-link">← Retour</a>

    <div class="card">
      <h1>Nouvelle ordonnance</h1>
      <p class="subtitle">
        ${patient ? `Patient : <strong>${patient.prenom} ${patient.nom}</strong> • ${patient.numero_national}` : 'Sélectionner un patient'}
      </p>

      ${erreur ? `<div class="alert-error">⚠️ ${erreur}</div>` : ''}

      <form method="POST" action="/medecin/ordonnances/nouvelle" id="formOrdonnance">
        ${patient ? `<input type="hidden" name="patient_id" value="${patient.id}">` : ''}

        <!-- Diagnostic / Indications -->
        <div class="form-group">
          <label>Diagnostic / Indications <span class="required">*</span></label>
          <textarea name="diagnostic" placeholder="Ex : Infection respiratoire haute, fièvre" required></textarea>
        </div>

        <!-- Liste des médicaments -->
        <div class="section-title">💊 Médicaments prescrits</div>

        <div class="medicaments-list" id="medicamentsList">
          <!-- Items ajoutés dynamiquement -->
        </div>

        <button type="button" class="btn-add" onclick="ajouterMedicament()">
          ➕ Ajouter un médicament
        </button>

        <!-- Instructions générales -->
        <div class="section-title">📝 Instructions et recommandations</div>

        <div class="form-group">
          <label>Conseils au patient</label>
          <textarea name="conseils" placeholder="Ex : Bien s'hydrater, repos au lit, consulter si aggravation..."></textarea>
        </div>

        <div class="form-group">
          <label>Durée de validité (jours)</label>
          <input type="number" name="duree_validite" value="30" min="1" max="90">
        </div>

        <input type="hidden" name="lignes_json" id="lignesJSON">

        <div class="btn-group">
          <button type="submit" class="btn btn-primary">
            ✅ Créer l'ordonnance
          </button>
          <a href="/medecin/patients${patient ? `/${patient.id}` : ''}" class="btn btn-secondary">
            Annuler
          </a>
        </div>
      </form>
    </div>
  </div>

  <script>
    let compteur = 0

    function ajouterMedicament() {
      compteur++
      const html = \`
        <div class="med-item" id="med_\${compteur}">
          <div class="med-header">
            <span class="med-num">\${compteur}</span>
            <button type="button" class="btn-remove" onclick="supprimerMedicament(\${compteur})">🗑️ Supprimer</button>
          </div>
          <div class="med-grid">
            <div class="form-group">
              <label>Nom du médicament</label>
              <input type="text" class="med-nom" placeholder="Ex : Paracétamol 500mg" required>
            </div>
            <div class="form-group">
              <label>Posologie</label>
              <input type="text" class="med-posologie" placeholder="Ex : 1 cp x 3/j" required>
            </div>
            <div class="form-group">
              <label>Durée (jours)</label>
              <input type="number" class="med-duree" value="7" min="1" required>
            </div>
          </div>
          <div class="form-group">
            <label>Instructions spécifiques</label>
            <textarea class="med-instructions" placeholder="Ex : Prendre après les repas"></textarea>
          </div>
        </div>
      \`
      document.getElementById('medicamentsList').insertAdjacentHTML('beforeend', html)
    }

    function supprimerMedicament(id) {
      const elem = document.getElementById(\`med_\${id}\`)
      if (elem) elem.remove()
    }

    // Pré-ajouter 2 médicaments au chargement
    ajouterMedicament()
    ajouterMedicament()

    document.getElementById('formOrdonnance').addEventListener('submit', (e) => {
      const medicaments = []
      document.querySelectorAll('.med-item').forEach(item => {
        const nom = item.querySelector('.med-nom').value.trim()
        const posologie = item.querySelector('.med-posologie').value.trim()
        const duree = item.querySelector('.med-duree').value
        const instructions = item.querySelector('.med-instructions').value.trim()

        if (nom && posologie && duree) {
          medicaments.push({
            nom_medicament: nom,
            posologie,
            duree_jours: parseInt(duree),
            instructions: instructions || null
          })
        }
      })

      if (medicaments.length === 0) {
        e.preventDefault()
        alert('⚠️ Ajoutez au moins un médicament à l\'ordonnance.')
        return
      }

      document.getElementById('lignesJSON').value = JSON.stringify(medicaments)
    })
  </script>
</body>
</html>`
}
