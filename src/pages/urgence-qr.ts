// Page publique affichée quand un médecin scanne le QR code du bracelet patient
// Affiche : groupe sanguin, allergies, contacts urgence — SANS connexion
// Design optimisé mobile pour urgence

import { calculerAge } from '../utils/format'

export function urgencePage(patient: any): string {
  const age = patient?.date_naissance ? calculerAge(patient.date_naissance) : 0

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🚨 Urgence — ${patient?.prenom} ${patient?.nom}</title>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #B71C1C 0%, #C62828 100%);
      min-height: 100vh;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 20px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: #B71C1C;
      padding: 32px 24px;
      text-align: center;
      color: white;
    }
    .urgence-icon {
      font-size: 56px;
      animation: pulse 1.5s ease-in-out infinite;
      margin-bottom: 12px;
      display: block;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .header p {
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 28px 24px;
    }
    .patient-id {
      text-align: center;
      margin-bottom: 24px;
    }
    .patient-nom {
      font-size: 22px;
      font-weight: 700;
      color: #1A1A2E;
      margin-bottom: 4px;
    }
    .patient-info {
      font-size: 13px;
      color: #6B7280;
    }
    .patient-numero {
      font-family: 'Courier New', monospace;
      background: #F3F4F6;
      padding: 6px 12px;
      border-radius: 6px;
      display: inline-block;
      margin-top: 8px;
      font-size: 12px;
      color: #424242;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #9CA3AF;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .box {
      background: #F9FAFB;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      padding: 16px;
    }
    .box.urgent {
      background: #FFF5F5;
      border-color: #FEE2E2;
    }
    .sanguin {
      text-align: center;
      padding: 20px;
      background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
      border-radius: 12px;
      color: white;
    }
    .sanguin-value {
      font-size: 48px;
      font-weight: 900;
      margin-bottom: 4px;
      text-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .sanguin-label {
      font-size: 12px;
      opacity: 0.9;
    }
    .item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid #E5E7EB;
    }
    .item:last-child {
      border-bottom: none;
    }
    .item-icon {
      font-size: 20px;
      flex-shrink: 0;
    }
    .item-content {
      flex: 1;
    }
    .item-title {
      font-size: 13px;
      font-weight: 600;
      color: #1A1A2E;
      margin-bottom: 2px;
    }
    .item-desc {
      font-size: 12px;
      color: #6B7280;
    }
    .contact-urgence {
      background: #DBEAFE;
      border-left: 4px solid #2563EB;
      border-radius: 8px;
      padding: 14px;
      margin-top: 12px;
    }
    .contact-nom {
      font-size: 14px;
      font-weight: 700;
      color: #1E40AF;
      margin-bottom: 4px;
    }
    .contact-tel {
      font-size: 16px;
      font-weight: 700;
      color: #2563EB;
      font-family: 'Courier New', monospace;
    }
    .contact-lien {
      font-size: 11px;
      color: #64748B;
      margin-top: 2px;
    }
    .empty {
      text-align: center;
      color: #9CA3AF;
      font-size: 13px;
      padding: 16px;
      font-style: italic;
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 11px;
      color: #9CA3AF;
      border-top: 1px solid #E5E7EB;
    }
    .logo-footer {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      color: #1A6B3C;
      text-decoration: none;
      margin-top: 8px;
    }
    .alert-top {
      background: #FEF3C7;
      border: 2px solid #F59E0B;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 20px;
      font-size: 12px;
      color: #92400E;
      font-weight: 600;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="urgence-icon">🚨</span>
      <h1>URGENCE MÉDICALE</h1>
      <p>Informations patient — Accès QR</p>
    </div>

    <div class="content">
      <div class="alert-top">
        ⚠️ Informations d'urgence uniquement — Consultation complète requiert connexion
      </div>

      <div class="patient-id">
        <div class="patient-nom">${patient?.prenom || ''} ${patient?.nom || ''}</div>
        <div class="patient-info">
          ${patient?.sexe === 'M' ? '👨' : '👩'} ${age} ans • ${patient?.sexe === 'M' ? 'Masculin' : 'Féminin'}
        </div>
        <div class="patient-numero">${patient?.numero_national || 'N/A'}</div>
      </div>

      <!-- Groupe sanguin -->
      <div class="section">
        <div class="section-title">🩸 Groupe sanguin</div>
        <div class="sanguin">
          <div class="sanguin-value">
            ${patient?.groupe_sanguin || 'inconnu'}${patient?.rhesus || ''}
          </div>
          <div class="sanguin-label">Groupe sanguin & Rhésus</div>
        </div>
      </div>

      <!-- Allergies -->
      <div class="section">
        <div class="section-title">⚠️ Allergies connues</div>
        <div class="box urgent">
          ${(patient?.allergies && patient.allergies.length > 0)
            ? patient.allergies.map((a: any) => `
              <div class="item">
                <span class="item-icon">⚠️</span>
                <div class="item-content">
                  <div class="item-title">${a.nom || a}</div>
                  <div class="item-desc">${a.severite || 'Non spécifié'} ${a.reaction ? `— ${a.reaction}` : ''}</div>
                </div>
              </div>
            `).join('')
            : '<div class="empty">Aucune allergie enregistrée</div>'
          }
        </div>
      </div>

      <!-- Maladies chroniques -->
      <div class="section">
        <div class="section-title">🩺 Maladies chroniques</div>
        <div class="box">
          ${(patient?.maladies_chroniques && patient.maladies_chroniques.length > 0)
            ? patient.maladies_chroniques.map((m: any) => `
              <div class="item">
                <span class="item-icon">💊</span>
                <div class="item-content">
                  <div class="item-title">${m.nom || m}</div>
                  <div class="item-desc">${m.date_diagnostic ? `Diagnostic: ${m.date_diagnostic}` : ''}</div>
                </div>
              </div>
            `).join('')
            : '<div class="empty">Aucune maladie chronique enregistrée</div>'
          }
        </div>
      </div>

      <!-- Contacts urgence -->
      <div class="section">
        <div class="section-title">📞 Contacts d\'urgence</div>
        ${(patient?.contacts_urgence && patient.contacts_urgence.length > 0)
          ? patient.contacts_urgence.map((c: any) => `
            <div class="contact-urgence">
              <div class="contact-nom">${c.nom || 'Contact'}</div>
              <div class="contact-tel">☎️ ${c.telephone || 'N/A'}</div>
              <div class="contact-lien">${c.lien || ''}</div>
            </div>
          `).join('')
          : '<div class="box"><div class="empty">Aucun contact d\'urgence enregistré</div></div>'
        }
      </div>
    </div>

    <div class="footer">
      <p>🔐 Accès QR sécurisé — SantéBF</p>
      <a href="https://santebf.bf" class="logo-footer">
        <span>🏥</span>
        <span>SantéBF</span>
      </a>
    </div>
  </div>
</body>
</html>`
}
