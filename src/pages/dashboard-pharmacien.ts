/**
 * Page dashboard Pharmacien
 */

import { AuthProfile } from '../lib/supabase'
import { formatDate, formatFCFA } from '../utils/format'

interface PharmacienData {
  ordonnances: Array<{
    id: string
    numero_ordonnance: string
    patient: { nom: string; prenom: string }
    medecin: { nom: string; prenom: string }
    statut: string
    created_at: string
  }>
  stats: {
    ordonnancesJour: number
    enAttente: number
    delivrees: number
    stockAlertes: number
  }
}

export function dashboardPharmacienPage(profil: AuthProfile, data: PharmacienData): string {
  const now = new Date()
  const heureActuelle = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const dateActuelle = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pharmacie - SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
    .logo { font-size: 28px; font-weight: 700; color: #667eea; }
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

    /* Ordonnances */
    .section {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ordonnance-list { display: flex; flex-direction: column; gap: 15px; }
    .ordonnance-item {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background 0.2s;
    }
    .ordonnance-item:hover { background: #f9fafb; }
    .ordonnance-info { flex: 1; }
    .ordonnance-numero {
      font-weight: 600;
      font-size: 16px;
      color: #667eea;
      margin-bottom: 5px;
    }
    .ordonnance-patient {
      font-weight: 600;
      color: #333;
      margin-bottom: 3px;
    }
    .ordonnance-medecin {
      font-size: 14px;
      color: #666;
    }
    .ordonnance-date {
      font-size: 12px;
      color: #999;
    }
    .ordonnance-statut {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 15px;
    }
    .statut-active { background: #dbeafe; color: #1e40af; }
    .statut-delivree { background: #dcfce7; color: #166534; }
    .statut-expiree { background: #fee2e2; color: #991b1b; }
    .btn-action {
      background: #667eea;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      text-decoration: none;
      font-size: 14px;
    }
    .btn-action:hover { background: #5568d3; }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #999;
    }
    .empty-icon { font-size: 64px; margin-bottom: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="logo">💊 SantéBF</div>
        <div class="time-info">
          <div class="time">${heureActuelle}</div>
          <div class="date">${dateActuelle}</div>
        </div>
      </div>
      <div class="header-right">
        <div class="user-info">
          <div class="user-name">${profil.prenom} ${profil.nom}</div>
          <div class="user-role">Pharmacien(ne)</div>
        </div>
        <a href="/auth/logout" class="btn-logout">Déconnexion</a>
      </div>
    </div>

    <!-- Statistiques -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-value">${data.stats.ordonnancesJour}</div>
        <div class="stat-label">Ordonnances aujourd'hui</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-value">${data.stats.enAttente}</div>
        <div class="stat-label">En attente</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${data.stats.delivrees}</div>
        <div class="stat-label">Délivrées</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⚠️</div>
        <div class="stat-value">${data.stats.stockAlertes}</div>
        <div class="stat-label">Alertes stock</div>
      </div>
    </div>

    <!-- Actions rapides -->
    <div class="actions-grid">
      <a href="/pharmacien/delivrance" class="action-card">
        <div class="action-icon">💊</div>
        <div class="action-label">Délivrer ordonnance</div>
      </a>
      <a href="/pharmacien/stock" class="action-card">
        <div class="action-icon">📦</div>
        <div class="action-label">Gérer stock</div>
      </a>
      <a href="/pharmacien/recherche" class="action-card">
        <div class="action-icon">🔍</div>
        <div class="action-label">Rechercher</div>
      </a>
      <a href="/pharmacien/inventaire" class="action-card">
        <div class="action-icon">📊</div>
        <div class="action-label">Inventaire</div>
      </a>
    </div>

    <!-- Ordonnances en attente -->
    <div class="section">
      <div class="section-title">
        <span>⏳</span> Ordonnances en attente de délivrance
      </div>
      ${data.ordonnances && data.ordonnances.length > 0 ? `
        <div class="ordonnance-list">
          ${data.ordonnances.map(ord => `
            <div class="ordonnance-item">
              <div class="ordonnance-info">
                <div class="ordonnance-numero">${ord.numero_ordonnance}</div>
                <div class="ordonnance-patient">${ord.patient.nom} ${ord.patient.prenom}</div>
                <div class="ordonnance-medecin">Prescrit par Dr. ${ord.medecin.nom}</div>
                <div class="ordonnance-date">${formatDate(ord.created_at)}</div>
              </div>
              <span class="ordonnance-statut ${
                ord.statut === 'delivree' ? 'statut-delivree' :
                ord.statut === 'expiree' ? 'statut-expiree' :
                'statut-active'
              }">${ord.statut}</span>
              <a href="/pharmacien/ordonnance/${ord.id}" class="btn-action">Voir détails</a>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>Aucune ordonnance en attente</p>
        </div>
      `}
    </div>
  </div>
</body>
</html>`
}
