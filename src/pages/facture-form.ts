// Formulaire de facturation (caissier)
// Sélectionner actes du catalogue, calculer total, mode paiement

export function factureFormPage(patient: any, actes: any[]): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle facture — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',sans-serif; background:#F7F8FA; padding:20px; }
    .container { max-width:900px; margin:0 auto; }
    .back-link { display:inline-flex; align-items:center; gap:6px; color:#B71C1C; text-decoration:none; font-size:14px; margin-bottom:16px; font-weight:600; }
    .back-link:hover { text-decoration:underline; }
    .card { background:white; border-radius:16px; padding:32px; box-shadow:0 2px 12px rgba(0,0,0,0.06); margin-bottom:20px; }
    h1 { font-family:'DM Serif Display',serif; font-size:26px; color:#1A1A2E; margin-bottom:6px; }
    .subtitle { font-size:14px; color:#6B7280; margin-bottom:28px; }
    .form-group { margin-bottom:22px; }
    label { display:block; font-size:13px; font-weight:600; color:#1A1A2E; margin-bottom:7px; }
    label .required { color:#B71C1C; }
    input[type="text"], input[type="number"], select {
      width:100%; padding:12px 14px; border:1.5px solid #E5E7EB; border-radius:10px;
      font-size:15px; font-family:'DM Sans',sans-serif; color:#1A1A2E; background:#F9FAFB;
      outline:none; transition:border-color .2s, background .2s;
    }
    input:focus, select:focus { border-color:#B71C1C; background:white; box-shadow:0 0 0 4px rgba(183,28,28,0.08); }
    .section-title { font-size:14px; font-weight:700; text-transform:uppercase; color:#6B7280; letter-spacing:0.8px; margin:28px 0 16px; }
    .actes-list { margin-bottom:20px; }
    .acte-item {
      background:#F9FAFB; border:2px solid #E5E7EB; border-radius:12px;
      padding:16px; margin-bottom:12px; position:relative; display:flex; gap:12px; align-items:center;
    }
    .acte-num { background:#B71C1C; color:white; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; }
    .acte-body { flex:1; }
    .acte-grid { display:grid; grid-template-columns:3fr 1fr 1fr; gap:10px; }
    .btn-remove { background:#FEE2E2; color:#B71C1C; border:none; padding:6px 10px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; flex-shrink:0; }
    .btn-remove:hover { background:#FCA5A5; }
    .btn-add { background:#FEE2E2; color:#B71C1C; border:2px dashed #B71C1C; padding:12px; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; width:100%; transition:background .2s; }
    .btn-add:hover { background:#FCA5A5; }
    .total-box {
      background:linear-gradient(135deg, #B71C1C 0%, #C62828 100%);
      border-radius:12px; padding:24px; margin:28px 0;
      color:white; text-align:center;
    }
    .total-label { font-size:14px; opacity:0.9; margin-bottom:6px; }
    .total-value { font-size:42px; font-weight:900; }
    .total-devise { font-size:18px; opacity:0.9; }
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .btn-group { display:flex; gap:12px; margin-top:32px; }
    .btn { padding:14px 28px; border-radius:10px; font-size:15px; font-weight:600; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; transition:transform .1s; }
    .btn:hover { transform:scale(1.02); }
    .btn-primary { background:#B71C1C; color:white; box-shadow:0 4px 14px rgba(183,28,28,0.3); }
    .btn-secondary { background:#E5E7EB; color:#424242; }
    @media (max-width:768px) {
      .grid-2, .acte-grid { grid-template-columns:1fr; }
      body { padding:12px; }
      .card { padding:20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="/caissier/factures" class="back-link">← Retour</a>

    <div class="card">
      <h1>Nouvelle facture</h1>
      <p class="subtitle">
        ${patient ? `Patient : <strong>${patient.prenom} ${patient.nom}</strong> • ${patient.numero_national}` : 'Sélectionner un patient'}
      </p>

      <form method="POST" action="/caissier/facture/nouvelle" id="formFacture">
        ${patient ? `<input type="hidden" name="patient_id" value="${patient.id}">` : ''}

        <!-- Actes médicaux -->
        <div class="section-title">📋 Actes facturés</div>

        <div class="actes-list" id="actesList">
          <!-- Items ajoutés dynamiquement -->
        </div>

        <button type="button" class="btn-add" onclick="ajouterActe()">
          ➕ Ajouter un acte
        </button>

        <!-- Totaux -->
        <div class="total-box">
          <div class="total-label">Total à payer</div>
          <div class="total-value">
            <span id="totalAmount">0</span> <span class="total-devise">FCFA</span>
          </div>
        </div>

        <!-- Paiement -->
        <div class="section-title">💰 Informations de paiement</div>

        <div class="grid-2">
          <div class="form-group">
            <label>Mode de paiement <span class="required">*</span></label>
            <select name="mode_paiement" required>
              <option value="">-- Sélectionner --</option>
              <option value="especes">Espèces</option>
              <option value="orange_money">Orange Money</option>
              <option value="moov_money">Moov Money</option>
              <option value="carte_bancaire">Carte bancaire</option>
              <option value="virement">Virement</option>
              <option value="cheque">Chèque</option>
            </select>
          </div>

          <div class="form-group">
            <label>Prise en charge assurance (%)</label>
            <input type="number" name="prise_en_charge_assurance" value="0" min="0" max="100" id="assurancePercent" onchange="calculerTotal()">
          </div>
        </div>

        <input type="hidden" name="lignes_json" id="lignesJSON">

        <div class="btn-group">
          <button type="submit" class="btn btn-primary">
            ✅ Créer la facture
          </button>
          <a href="/caissier/factures" class="btn btn-secondary">
            Annuler
          </a>
        </div>
      </form>
    </div>
  </div>

  <script>
    let compteur = 0
    const catalogueActes = ${JSON.stringify(actes || [])}

    function ajouterActe() {
      compteur++
      const html = \`
        <div class="acte-item" id="acte_\${compteur}">
          <span class="acte-num">\${compteur}</span>
          <div class="acte-body">
            <div class="acte-grid">
              <div class="form-group">
                <label>Acte</label>
                <select class="acte-select" onchange="mettreAJourPrix(\${compteur})" required>
                  <option value="">-- Sélectionner un acte --</option>
                  \${catalogueActes.map(a => \`<option value="\${a.id}" data-prix="\${a.prix_unitaire}">\${a.nom} (\${a.prix_unitaire.toLocaleString()} FCFA)</option>\`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Quantité</label>
                <input type="number" class="acte-qte" value="1" min="1" onchange="calculerTotal()" required>
              </div>
              <div class="form-group">
                <label>Prix unitaire</label>
                <input type="number" class="acte-prix" value="0" min="0" readonly required>
              </div>
            </div>
          </div>
          <button type="button" class="btn-remove" onclick="supprimerActe(\${compteur})">🗑️</button>
        </div>
      \`
      document.getElementById('actesList').insertAdjacentHTML('beforeend', html)
    }

    function supprimerActe(id) {
      const elem = document.getElementById(\`acte_\${id}\`)
      if (elem) {
        elem.remove()
        calculerTotal()
      }
    }

    function mettreAJourPrix(id) {
      const item = document.getElementById(\`acte_\${id}\`)
      const select = item.querySelector('.acte-select')
      const prixInput = item.querySelector('.acte-prix')
      const selectedOption = select.options[select.selectedIndex]
      const prix = selectedOption.getAttribute('data-prix') || 0
      prixInput.value = prix
      calculerTotal()
    }

    function calculerTotal() {
      let total = 0
      document.querySelectorAll('.acte-item').forEach(item => {
        const prix = parseFloat(item.querySelector('.acte-prix').value) || 0
        const qte = parseFloat(item.querySelector('.acte-qte').value) || 1
        total += prix * qte
      })

      const assurancePercent = parseFloat(document.getElementById('assurancePercent').value) || 0
      const montantPatient = total * (1 - assurancePercent / 100)

      document.getElementById('totalAmount').textContent = Math.round(montantPatient).toLocaleString('fr-FR')
    }

    // Pré-ajouter 1 acte au chargement
    ajouterActe()

    document.getElementById('formFacture').addEventListener('submit', (e) => {
      const lignes = []
      document.querySelectorAll('.acte-item').forEach(item => {
        const select = item.querySelector('.acte-select')
        const prix = item.querySelector('.acte-prix').value
        const qte = item.querySelector('.acte-qte').value

        if (select.value && prix && qte) {
          lignes.push({
            acte_id: select.value,
            quantite: parseInt(qte),
            prix_unitaire: parseFloat(prix)
          })
        }
      })

      if (lignes.length === 0) {
        e.preventDefault()
        alert('⚠️ Ajoutez au moins un acte à la facture.')
        return
      }

      document.getElementById('lignesJSON').value = JSON.stringify(lignes)
    })
  </script>
</body>
</html>`
}
