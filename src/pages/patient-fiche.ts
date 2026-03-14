// Fiche patient complète (vue médecin)
// Affiche toutes les informations patient, constantes, historique consultations

import { calculerAge, formatDate } from '../utils/format'

export function fichePatientPage(patient: any, consultations: any[]): string {
  const age = patient?.date_naissance ? calculerAge(patient.date_naissance) : 0

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fiche patient — ${patient?.prenom} ${patient?.nom}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',sans-serif; background:#F7F8FA; padding:20px; }
    .container { max-width:1000px; margin:0 auto; }
    .back-link {
      display:inline-flex; align-items:center; gap:6px;
      color:#4A148C; text-decoration:none; font-size:14px;
      margin-bottom:16px; font-weight:600;
    }
    .back-link:hover { text-decoration:underline; }
    .card {
      background:white; border-radius:16px; padding:28px 32px;
      box-shadow:0 2px 12px rgba(0,0,0,0.06); margin-bottom:20px;
    }
    .patient-header {
      display:flex; align-items:flex-start; justify-content:space-between;
      border-bottom:2px solid #F3F4F6; padding-bottom:20px; margin-bottom:20px;
    }
    .patient-main h1 {
      font-family:'DM Serif Display',serif; font-size:28px;
      color:#1A1A2E; margin-bottom:4px;
    }
    .patient-main .meta {
      font-size:14px; color:#6B7280;
      display:flex; gap:16px; flex-wrap:wrap; align-items:center;
    }
    .badge {
      background:#F3F4F6; padding:4px 12px; border-radius:20px;
      font-size:12px; font-weight:600; color:#424242;
    }
    .badge.sanguin {
      background:#FEE2E2; color:#B71C1C; font-size:14px;
      padding:6px 14px; font-weight:700;
    }
    .patient-actions {
      display:flex; gap:10px;
    }
    .btn {
      padding:10px 18px; border-radius:10px; font-size:14px;
      font-weight:600; text-decoration:none; font-family:'DM Sans',sans-serif;
      transition:transform .1s;
    }
    .btn:hover { transform:scale(1.05); }
    .btn-primary { background:#4A148C; color:white; }
    .btn-secondary { background:#E5E7EB; color:#424242; }
    .section-title {
      font-size:13px; font-weight:700; text-transform:uppercase;
      letter-spacing:0.8px; color:#9CA3AF; margin-bottom:14px;
      display:flex; align-items:center; gap:8px;
    }
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .field-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #F3F4F6; }
    .field-label { font-size:13px; color:#6B7280; font-weight:500; }
    .field-value { font-size:14px; color:#1A1A2E; font-weight:600; }
    .allergie-item, .maladie-item {
      background:#FFF5F5; border-left:4px solid #B71C1C;
      padding:12px; border-radius:8px; margin-bottom:10px;
    }
    .maladie-item { background:#F3F4F6; border-left-color:#424242; }
    .item-titre { font-size:14px; font-weight:600; color:#1A1A2E; margin-bottom:2px; }
    .item-desc { font-size:12px; color:#6B7280; }
    .consult-item {
      background:#F9FAFB; border-left:4px solid #4A148C;
      padding:16px; border-radius:10px; margin-bottom:14px;
    }
    .consult-header { display:flex; justify-content:space-between; margin-bottom:10px; }
    .consult-date { font-size:12px; color:#9CA3AF; }
    .consult-motif { font-size:14px; font-weight:600; color:#1A1A2E; margin-bottom:8px; }
    .consult-diag { font-size:13px; color:#4A148C; }
    .empty { text-align:center; padding:32px; color:#9CA3AF; font-style:italic; }
    @media (max-width:768px) {
      .grid-2 { grid-template-columns:1fr; }
      .patient-header { flex-direction:column; gap:16px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="/medecin/patients" class="back-link">← Retour à la liste</a>

    <!-- Identité patient -->
    <div class="card">
      <div class="patient-header">
        <div class="patient-main">
          <h1>${patient?.prenom || ''} ${patient?.nom || ''}</h1>
          <div class="meta">
            <span>${patient?.sexe === 'M' ? '👨 Masculin' : '👩 Féminin'}</span>
            <span>📅 ${age} ans</span>
            <span>🆔 ${patient?.numero_national || 'N/A'}</span>
            <span class="badge sanguin">🩸 ${patient?.groupe_sanguin || '?'}${patient?.rhesus || ''}</span>
          </div>
        </div>
        <div class="patient-actions">
          <a href="/medecin/consultations/nouvelle?patient_id=${patient?.id}" class="btn btn-primary">📋 Nouvelle consultation</a>
          <a href="/medecin/ordonnances/nouvelle?patient_id=${patient?.id}" class="btn btn-secondary">💊 Ordonnance</a>
        </div>
      </div>

      <div class="grid-2">
        <div>
          <div class="field-row">
            <span class="field-label">Date de naissance</span>
            <span class="field-value">${patient?.date_naissance ? formatDate(patient.date_naissance) : 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Sexe</span>
            <span class="field-value">${patient?.sexe === 'M' ? 'Masculin' : 'Féminin'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Groupe sanguin</span>
            <span class="field-value">${patient?.groupe_sanguin || 'inconnu'}${patient?.rhesus || ''}</span>
          </div>
        </div>
        <div>
          <div class="field-row">
            <span class="field-label">Numéro national</span>
            <span class="field-value" style="font-family:monospace">${patient?.numero_national || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Date d'inscription</span>
            <span class="field-value">${patient?.created_at ? formatDate(patient.created_at) : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Allergies -->
    <div class="card">
      <div class="section-title">⚠️ Allergies connues</div>
      ${(patient?.allergies && patient.allergies.length > 0)
        ? patient.allergies.map((a: any) => `
          <div class="allergie-item">
            <div class="item-titre">${a.nom || a}</div>
            <div class="item-desc">${a.severite || 'Non spécifié'} ${a.reaction ? `— ${a.reaction}` : ''}</div>
          </div>
        `).join('')
        : '<div class="empty">Aucune allergie enregistrée</div>'
      }
    </div>

    <!-- Maladies chroniques -->
    <div class="card">
      <div class="section-title">🩺 Maladies chroniques</div>
      ${(patient?.maladies_chroniques && patient.maladies_chroniques.length > 0)
        ? patient.maladies_chroniques.map((m: any) => `
          <div class="maladie-item">
            <div class="item-titre">${m.nom || m}</div>
            <div class="item-desc">${m.date_diagnostic ? `Diagnostic: ${m.date_diagnostic}` : ''} ${m.traitement ? `— ${m.traitement}` : ''}</div>
          </div>
        `).join('')
        : '<div class="empty">Aucune maladie chronique enregistrée</div>'
      }
    </div>

    <!-- Consultations récentes -->
    <div class="card">
      <div class="section-title">📋 Historique des consultations (${consultations?.length || 0})</div>
      ${(consultations && consultations.length > 0)
        ? consultations.map((c: any) => `
          <div class="consult-item">
            <div class="consult-header">
              <span class="consult-date">${c.created_at ? formatDate(c.created_at) : ''}</span>
              <span class="badge">${c.type_consultation || 'normale'}</span>
            </div>
            <div class="consult-motif">${c.motif || 'N/A'}</div>
            ${c.diagnostic_principal ? `<div class="consult-diag">→ Diagnostic : ${c.diagnostic_principal}</div>` : ''}
          </div>
        `).join('')
        : '<div class="empty">Aucune consultation enregistrée</div>'
      }
    </div>
  </div>
</body>
</html>`
}
