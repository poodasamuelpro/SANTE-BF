/**
 * Page dashboard Patient
 */

import { AuthProfile } from '../lib/supabase'
import { formatDate } from '../utils/format'

interface PatientData {
  dossier: {
    numero_national: string
    groupe_sanguin: string
    rhesus: string
    allergies: string | null
    maladies_chroniques: string | null
  } | null
  prochainRdv: {
    date_heure: string
    medecin: { nom: string; prenom: string; specialite: string }
    motif: string
  } | null
  ordonnancesActives: number
  consultationsTotal: number
}

export function dashboardPatientPage(profil: AuthProfile, data: PatientData): string {
  const now = new Date()
  const heureActuelle = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const dateActuelle = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mon espace - SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', sans-serif; 
      background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    
    /* Header */
    .header {
      background: white;
      border-radius: 15px;
      padding: 20px 30px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header-left { display: flex; align-items: center; gap: 15px; }
    .logo { font-size: 28px; font-weight: 700; color: #3b82f6; }
    .time-info { display: flex; flex-direction: column; }
    .time { font-size: 24px; font-weight: 600; color: #333; }
    .date { font-size: 14px; color: #666; }
    .header-right { display: flex; align-items: center; gap: 20px; }
    .user-info { text-align: right; }
    .user-name { font-weight: 600; color: #333; }
    .user-role { font-size: 12px; color: #666; }
    .btn-logout {
      background: #ef4444;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      text-decoration: none;
      display: inline-block;
    }
    .btn-logout:hover { background: #dc2626; }

    /* Dossier médical */
    .dossier-card {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .dossier-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .info-label {
      font-size: 12px;
      color: #666;
      font-weight: 600;
      text-transform: uppercase;
    }
    .info-value {
      font-size: 16px;
      color: #333;
      font-weight: 500;
    }

    /* Prochain RDV */
    .rdv-card {
      background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
      border-radius: 12px;
      padding: 30px;
      color: white;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .rdv-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .rdv-date {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    .rdv-medecin {
      font-size: 18px;
      margin-bottom: 5px;
    }
    .rdv-motif {
      font-size: 14px;
      opacity: 0.9;
    }
    .no-rdv {
      text-align: center;
      padding: 40px 20px;
      opacity: 0.8;
    }

    /* Actions rapides */
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .action-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      text-decoration: none;
      color: inherit;
      display: block;
    }
    .action-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.15);
    }
    .action-icon { font-size: 48px; margin-bottom: 10px; }
    .action-label { font-weight: 600; color: #333; }
    .action-count {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="logo">🩺 SantéBF</div>
        <div class="time-info">
          <div class="time">${heureActuelle}</div>
          <div class="date">${dateActuelle}</div>
        </div>
      </div>
      <div class="header-right">
        <div class="user-info">
          <div class="user-name">${profil.prenom} ${profil.nom}</div>
          <div class="user-role">Patient(e)</div>
        </div>
        <a href="/auth/logout" class="btn-logout">Déconnexion</a>
      </div>
    </div>

    <!-- Prochain RDV -->
    <div class="rdv-card">
      <div class="rdv-title">
        <span>📅</span> Prochain rendez-vous
      </div>
      ${data.prochainRdv ? `
        <div class="rdv-date">${formatDate(data.prochainRdv.date_heure)}</div>
        <div class="rdv-medecin">Dr. ${data.prochainRdv.medecin.nom} ${data.prochainRdv.medecin.prenom}</div>
        <div class="rdv-medecin">${data.prochainRdv.medecin.specialite}</div>
        <div class="rdv-motif">${data.prochainRdv.motif}</div>
      ` : `
        <div class="no-rdv">
          <div style="font-size:48px;margin-bottom:10px;">📅</div>
          <p>Aucun rendez-vous programmé</p>
        </div>
      `}
    </div>

    <!-- Actions rapides -->
    <div class="actions-grid">
      <a href="/dashboard/patient/dossier" class="action-card">
        <div class="action-icon">📋</div>
        <div class="action-label">Mon dossier médical</div>
      </a>
      <a href="/dashboard/patient/ordonnances" class="action-card">
        <div class="action-icon">💊</div>
        <div class="action-label">Mes ordonnances</div>
        <div class="action-count">${data.ordonnancesActives} active(s)</div>
      </a>
      <a href="/dashboard/patient/rdv" class="action-card">
        <div class="action-icon">📅</div>
        <div class="action-label">Mes rendez-vous</div>
      </a>
      <a href="/dashboard/patient/examens" class="action-card">
        <div class="action-icon">🧪</div>
        <div class="action-label">Résultats examens</div>
      </a>
      <a href="/dashboard/patient/vaccinations" class="action-card">
        <div class="action-icon">💉</div>
        <div class="action-label">Vaccinations</div>
      </a>
      <a href="/dashboard/patient/consentements" class="action-card">
        <div class="action-icon">🔒</div>
        <div class="action-label">Consentements</div>
      </a>
    </div>

    <!-- Informations dossier -->
    ${data.dossier ? `
      <div class="dossier-card">
        <div class="dossier-title">
          <span>🩺</span> Informations médicales
        </div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Numéro national</div>
            <div class="info-value">${data.dossier.numero_national}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Groupe sanguin</div>
            <div class="info-value">${data.dossier.groupe_sanguin} ${data.dossier.rhesus}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Allergies</div>
            <div class="info-value">${data.dossier.allergies || 'Aucune'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Maladies chroniques</div>
            <div class="info-value">${data.dossier.maladies_chroniques || 'Aucune'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Consultations</div>
            <div class="info-value">${data.consultationsTotal} consultation(s)</div>
          </div>
        </div>
      </div>
    ` : ''}
  </div>
</body>
</html>`
}
