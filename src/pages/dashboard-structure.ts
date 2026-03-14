/**
 * Page dashboard Admin structure sanitaire
 */

import { AuthProfile } from '../lib/supabase'
import { formatDate } from '../utils/format'

interface StructureData {
  structure: {
    nom: string
    type: string
    niveau: number
  }
  stats: {
    personnel: number
    patientsJour: number
    litsOccupes: number
    litsTotal: number
    consultationsJour: number
  }
}

export function dashboardStructurePage(profil: AuthProfile, data: StructureData): string {
  const now = new Date()
  const heureActuelle = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const dateActuelle = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  
  const tauxOccupation = data.stats.litsTotal > 0 
    ? Math.round((data.stats.litsOccupes / data.stats.litsTotal) * 100) 
    : 0

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Administration - SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', sans-serif; 
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    
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
    .logo { font-size: 28px; font-weight: 700; color: #f59e0b; }
    .time-info { display: flex; flex-direction: column; }
    .time { font-size: 24px; font-weight: 600; color: #333; }
    .date { font-size: 14px; color: #666; }
    .header-right { display: flex; align-items: center; gap: 20px; }
    .user-info { text-align: right; }
    .user-name { font-weight: 600; color: #333; }
    .user-role { font-size: 12px; color: #666; }
    .structure-name {
      font-size: 14px;
      color: #f59e0b;
      font-weight: 600;
    }
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

    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .stat-icon {
      font-size: 36px;
      margin-bottom: 10px;
    }
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #333;
      margin-bottom: 5px;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      font-weight: 500;
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

    /* Info structure */
    .info-card {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .info-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
      font-weight: 600;
    }

    /* Taux occupation */
    .progress-bar {
      background: #e5e7eb;
      border-radius: 10px;
      height: 20px;
      overflow: hidden;
      margin-top: 10px;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #059669 100%);
      border-radius: 10px;
      transition: width 0.3s;
    }
    .progress-fill.warning { background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); }
    .progress-fill.danger { background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%); }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="logo">🏥 SantéBF</div>
        <div class="time-info">
          <div class="time">${heureActuelle}</div>
          <div class="date">${dateActuelle}</div>
        </div>
      </div>
      <div class="header-right">
        <div class="user-info">
          <div class="user-name">${profil.prenom} ${profil.nom}</div>
          <div class="user-role">Administrateur structure</div>
          <div class="structure-name">${data.structure.nom}</div>
        </div>
        <a href="/auth/logout" class="btn-logout">Déconnexion</a>
      </div>
    </div>

    <!-- Info structure -->
    <div class="info-card">
      <div class="info-title">
        <span>🏥</span> Informations de la structure
      </div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Nom</div>
          <div class="info-value">${data.structure.nom}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Type</div>
          <div class="info-value">${data.structure.type}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Niveau</div>
          <div class="info-value">Niveau ${data.structure.niveau}</div>
        </div>
      </div>
    </div>

    <!-- Statistiques -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${data.stats.personnel}</div>
        <div class="stat-label">Agents de santé</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🩺</div>
        <div class="stat-value">${data.stats.patientsJour}</div>
        <div class="stat-label">Patients aujourd'hui</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-value">${data.stats.consultationsJour}</div>
        <div class="stat-label">Consultations</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🛏️</div>
        <div class="stat-value">${data.stats.litsOccupes} / ${data.stats.litsTotal}</div>
        <div class="stat-label">Lits occupés (${tauxOccupation}%)</div>
        <div class="progress-bar">
          <div class="progress-fill ${tauxOccupation >= 90 ? 'danger' : tauxOccupation >= 75 ? 'warning' : ''}" 
               style="width: ${tauxOccupation}%"></div>
        </div>
      </div>
    </div>

    <!-- Actions rapides -->
    <div class="actions-grid">
      <a href="/dashboard/structure/personnel" class="action-card">
        <div class="action-icon">👥</div>
        <div class="action-label">Gérer personnel</div>
      </a>
      <a href="/dashboard/structure/services" class="action-card">
        <div class="action-icon">🏥</div>
        <div class="action-label">Services</div>
      </a>
      <a href="/dashboard/structure/lits" class="action-card">
        <div class="action-icon">🛏️</div>
        <div class="action-label">Gestion lits</div>
      </a>
      <a href="/dashboard/structure/statistiques" class="action-card">
        <div class="action-icon">📊</div>
        <div class="action-label">Statistiques</div>
      </a>
      <a href="/dashboard/structure/facturation" class="action-card">
        <div class="action-icon">💰</div>
        <div class="action-label">Facturation</div>
      </a>
      <a href="/dashboard/structure/parametres" class="action-card">
        <div class="action-icon">⚙️</div>
        <div class="action-label">Paramètres</div>
      </a>
    </div>
  </div>
</body>
</html>`
}
