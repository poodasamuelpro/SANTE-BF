/**
 * Page détail examen de laboratoire avec saisie résultats
 */

import { AuthProfile } from '../lib/supabase'

interface ExamenLabo {
  id: string
  numero_examen: string
  type_examen: string
  statut: 'en_attente' | 'en_cours' | 'resultat_disponible' | 'valide'
  date_prescription: string
  date_prevu: string
  date_prelevement?: string
  date_resultat?: string
  priorite: 'normale' | 'elevee' | 'urgente'
  instructions?: string
  patient: {
    nom: string
    prenom: string
    numero_national: string
    date_naissance: string
    sexe: string
  }
  medecin_prescripteur?: {
    nom: string
    prenom: string
    specialite?: string
  }
  technicien_nom?: string
  resultats?: Array<{
    parametre: string
    valeur: string
    unite?: string
    valeurs_normales?: string
    interpretation?: 'normal' | 'anormal' | 'critique'
  }>
  conclusion?: string
}

export function examenLaboDetailPage(profil: AuthProfile, examen: ExamenLabo): string {
  const now = new Date()
  const heureActuelle = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  
  // Paramètres par type d'examen (NFS, Glycémie, etc.)
  const parametresParType: Record<string, Array<{ nom: string; unite: string; normales: string }>> = {
    'NFS': [
      { nom: 'Globules rouges', unite: 'M/μL', normales: '4.5-5.5' },
      { nom: 'Hémoglobine', unite: 'g/dL', normales: '13-17 (H) / 12-16 (F)' },
      { nom: 'Hématocrite', unite: '%', normales: '40-54 (H) / 37-47 (F)' },
      { nom: 'VGM', unite: 'fL', normales: '80-100' },
      { nom: 'TCMH', unite: 'pg', normales: '27-32' },
      { nom: 'CCMH', unite: 'g/dL', normales: '32-36' },
      { nom: 'Plaquettes', unite: 'G/L', normales: '150-400' },
      { nom: 'Globules blancs', unite: 'G/L', normales: '4-10' },
      { nom: 'Neutrophiles', unite: '%', normales: '40-75' },
      { nom: 'Lymphocytes', unite: '%', normales: '20-45' },
      { nom: 'Monocytes', unite: '%', normales: '2-10' },
      { nom: 'Éosinophiles', unite: '%', normales: '1-6' },
      { nom: 'Basophiles', unite: '%', normales: '0-2' }
    ],
    'Glycemie': [
      { nom: 'Glycémie à jeun', unite: 'g/L', normales: '0.70-1.10' },
      { nom: 'Glycémie post-prandiale', unite: 'g/L', normales: '<1.40' }
    ],
    'HbA1c': [
      { nom: 'HbA1c', unite: '%', normales: '<5.7 (normal) / 5.7-6.4 (pré-diabète) / ≥6.5 (diabète)' }
    ],
    'Creatinine': [
      { nom: 'Créatininémie', unite: 'mg/L', normales: '7-13 (H) / 6-11 (F)' },
      { nom: 'Clairance créatinine', unite: 'mL/min', normales: '>90' }
    ],
    'Bilan_hepatique': [
      { nom: 'ASAT (TGO)', unite: 'UI/L', normales: '<40' },
      { nom: 'ALAT (TGP)', unite: 'UI/L', normales: '<40' },
      { nom: 'GGT', unite: 'UI/L', normales: '<55 (H) / <38 (F)' },
      { nom: 'PAL', unite: 'UI/L', normales: '30-120' },
      { nom: 'Bilirubine totale', unite: 'mg/L', normales: '<12' },
      { nom: 'Bilirubine conjuguée', unite: 'mg/L', normales: '<2' }
    ],
    'Bilan_lipidique': [
      { nom: 'Cholestérol total', unite: 'g/L', normales: '<2.00' },
      { nom: 'HDL cholestérol', unite: 'g/L', normales: '>0.40 (H) / >0.50 (F)' },
      { nom: 'LDL cholestérol', unite: 'g/L', normales: '<1.60' },
      { nom: 'Triglycérides', unite: 'g/L', normales: '<1.50' }
    ]
  }
  
  const parametres = parametresParType[examen.type_examen] || []
  const resultatsExistants = examen.resultats || []

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Examen ${examen.numero_examen} - SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', sans-serif; 
      background: #f1f5f9;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    
    .header {
      background: white;
      border-radius: 12px;
      padding: 20px 30px;
      margin-bottom: 20px;
      display: flex;
      justify-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .header-left h1 { font-size: 24px; color: #1e293b; }
    .header-left .meta { font-size: 14px; color: #64748b; margin-top: 5px; }
    .badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
    }
    .badge-en-attente { background: #fef3c7; color: #92400e; }
    .badge-en-cours { background: #dbeafe; color: #1e40af; }
    .badge-resultat { background: #dcfce7; color: #166534; }
    .badge-urgente { background: #fee2e2; color: #991b1b; }
    
    .section {
      background: white;
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 20px;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
    }
    .info-value {
      font-size: 15px;
      color: #1e293b;
      font-weight: 500;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead {
      background: #f8fafc;
    }
    th {
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      border-bottom: 2px solid #e2e8f0;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    tr:hover { background: #fafafa; }
    
    input[type="text"], input[type="number"], textarea, select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-family: inherit;
      font-size: 14px;
    }
    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #3b82f6;
      color: white;
    }
    .btn-primary:hover { background: #2563eb; }
    .btn-success {
      background: #10b981;
      color: white;
    }
    .btn-success:hover { background: #059669; }
    .btn-secondary {
      background: #e2e8f0;
      color: #475569;
    }
    .btn-secondary:hover { background: #cbd5e1; }
    
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    
    .interpretation-select {
      width: 120px;
    }
    .interpretation-normal { color: #10b981; }
    .interpretation-anormal { color: #f59e0b; font-weight: 600; }
    .interpretation-critique { color: #ef4444; font-weight: 700; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <h1>Examen de laboratoire ${examen.numero_examen}</h1>
        <div class="meta">
          ${examen.type_examen} • ${heureActuelle}
        </div>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <span class="badge ${
          examen.statut === 'en_attente' ? 'badge-en-attente' :
          examen.statut === 'en_cours' ? 'badge-en-cours' :
          'badge-resultat'
        }">${examen.statut.replace('_', ' ')}</span>
        ${examen.priorite === 'urgente' ? '<span class="badge badge-urgente">URGENT</span>' : ''}
        <a href="/laboratoire" class="btn btn-secondary">← Retour</a>
      </div>
    </div>

    <!-- Informations patient -->
    <div class="section">
      <div class="section-title">👤 Informations patient</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Nom complet</div>
          <div class="info-value">${examen.patient.nom} ${examen.patient.prenom}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Numéro national</div>
          <div class="info-value">${examen.patient.numero_national}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Date de naissance</div>
          <div class="info-value">${examen.patient.date_naissance}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Sexe</div>
          <div class="info-value">${examen.patient.sexe === 'M' ? 'Masculin' : 'Féminin'}</div>
        </div>
      </div>
    </div>

    <!-- Informations examen -->
    <div class="section">
      <div class="section-title">🔬 Détails de l'examen</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Type d'examen</div>
          <div class="info-value">${examen.type_examen}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Prescrit par</div>
          <div class="info-value">Dr. ${examen.medecin_prescripteur?.nom || '—'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Date prescription</div>
          <div class="info-value">${new Date(examen.date_prescription).toLocaleDateString('fr-FR')}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Date prévue</div>
          <div class="info-value">${examen.date_prevu ? new Date(examen.date_prevu).toLocaleDateString('fr-FR') : '—'}</div>
        </div>
      </div>
      ${examen.instructions ? `
        <div style="margin-top: 15px; padding: 12px; background: #fef3c7; border-radius: 8px;">
          <div class="info-label" style="margin-bottom: 5px;">Instructions particulières</div>
          <div style="font-size: 14px; color: #92400e;">${examen.instructions}</div>
        </div>
      ` : ''}
    </div>

    <!-- Saisie résultats -->
    <form method="POST" action="/laboratoire/examen/${examen.id}/resultats">
      <div class="section">
        <div class="section-title">📊 Résultats d'analyse</div>
        
        ${examen.statut === 'en_attente' ? `
          <div style="margin-bottom: 20px;">
            <label class="info-label" style="margin-bottom: 8px; display: block;">Date et heure du prélèvement *</label>
            <input type="datetime-local" 
                   name="date_prelevement" 
                   value="${examen.date_prelevement || ''}"
                   required
                   style="max-width: 300px;">
          </div>
        ` : ''}
        
        <table>
          <thead>
            <tr>
              <th style="width: 30%;">Paramètre</th>
              <th style="width: 15%;">Valeur</th>
              <th style="width: 10%;">Unité</th>
              <th style="width: 20%;">Valeurs normales</th>
              <th style="width: 15%;">Interprétation</th>
              <th style="width: 10%;"></th>
            </tr>
          </thead>
          <tbody>
            ${parametres.map((p, index) => {
              const existant = resultatsExistants.find(r => r.parametre === p.nom)
              return `
                <tr>
                  <td>
                    <strong>${p.nom}</strong>
                    <input type="hidden" name="resultats[${index}][parametre]" value="${p.nom}">
                    <input type="hidden" name="resultats[${index}][unite]" value="${p.unite}">
                    <input type="hidden" name="resultats[${index}][valeurs_normales]" value="${p.normales}">
                  </td>
                  <td>
                    <input type="text" 
                           name="resultats[${index}][valeur]" 
                           value="${existant?.valeur || ''}"
                           placeholder="—"
                           ${examen.statut === 'valide' ? 'readonly' : ''}>
                  </td>
                  <td style="color: #64748b; font-size: 13px;">${p.unite}</td>
                  <td style="color: #64748b; font-size: 12px;">${p.normales}</td>
                  <td>
                    <select name="resultats[${index}][interpretation]" 
                            class="interpretation-select"
                            ${examen.statut === 'valide' ? 'disabled' : ''}>
                      <option value="normal" ${existant?.interpretation === 'normal' ? 'selected' : ''}>Normal</option>
                      <option value="anormal" ${existant?.interpretation === 'anormal' ? 'selected' : ''}>Anormal</option>
                      <option value="critique" ${existant?.interpretation === 'critique' ? 'selected' : ''}>Critique</option>
                    </select>
                  </td>
                  <td style="text-align: center; font-size: 18px;">
                    <span class="${
                      existant?.interpretation === 'critique' ? 'interpretation-critique' :
                      existant?.interpretation === 'anormal' ? 'interpretation-anormal' :
                      existant?.interpretation === 'normal' ? 'interpretation-normal' :
                      ''
                    }">
                      ${existant?.interpretation === 'critique' ? '⚠' : 
                        existant?.interpretation === 'anormal' ? '!' : 
                        existant?.interpretation === 'normal' ? '✓' : '—'}
                    </span>
                  </td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 20px;">
          <label class="info-label" style="margin-bottom: 8px; display: block;">Conclusion / Commentaires</label>
          <textarea name="conclusion" 
                    rows="4" 
                    placeholder="Conclusion générale de l'analyse..."
                    ${examen.statut === 'valide' ? 'readonly' : ''}>${examen.conclusion || ''}</textarea>
        </div>
        
        ${examen.statut !== 'valide' ? `
          <div style="margin-top: 20px;">
            <label class="info-label" style="margin-bottom: 8px; display: block;">Nom du technicien / biologiste</label>
            <input type="text" 
                   name="technicien_nom" 
                   value="${examen.technicien_nom || profil.prenom + ' ' + profil.nom}"
                   required
                   style="max-width: 400px;">
          </div>
        ` : ''}
      </div>

      <!-- Actions -->
      ${examen.statut !== 'valide' ? `
        <div class="actions">
          <button type="submit" name="action" value="enregistrer" class="btn btn-primary">
            💾 Enregistrer les résultats
          </button>
          <button type="submit" name="action" value="valider" class="btn btn-success">
            ✅ Valider et générer le bulletin
          </button>
          <a href="/laboratoire" class="btn btn-secondary">Annuler</a>
        </div>
      ` : `
        <div class="actions">
          <a href="/laboratoire/examen/${examen.id}/pdf" class="btn btn-success">
            📄 Télécharger le bulletin PDF
          </a>
          <a href="/laboratoire" class="btn btn-secondary">Retour</a>
        </div>
      `}
    </form>
  </div>
</body>
</html>`
}
