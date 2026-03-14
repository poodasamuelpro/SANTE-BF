/**
 * Page dashboard Caissier
 */

import { AuthProfile } from '../lib/supabase'
import { formatDate, formatFCFA } from '../utils/format'

interface CaissierData {
  factures: Array<{
    id: string
    numero_facture: string
    patient: { nom: string; prenom: string }
    montant_patient: number
    total_ttc: number
    statut: string
    created_at: string
  }>
  stats: {
    facturesJour: number
    impayees: number
    recetteJour: number
    attente: number
  }
}

export function dashboardCaissierPage(profil: AuthProfile, data: CaissierData): string {
  const now = new Date()
  const heureActuelle = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const dateActuelle = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Caisse - SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', sans-serif; 
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
    .logo { font-size: 28px; font-weight: 700; color: #10b981; }
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

    /* Factures */
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
    .facture-list { display: flex; flex-direction: column; gap: 15px; }
    .facture-item {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background 0.2s;
    }
    .facture-item:hover { background: #f9fafb; }
    .facture-info { flex: 1; }
    .facture-numero {
      font-weight: 600;
      font-size: 16px;
      color: #10b981;
      margin-bottom: 5px;
    }
    .facture-patient {
      font-weight: 600;
      color: #333;
      margin-bottom: 3px;
    }
    .facture-montant {
      font-size: 18px;
      font-weight: 700;
      color: #10b981;
      margin-bottom: 3px;
    }
    .facture-date {
      font-size: 12px;
      color: #999;
    }
    .facture-statut {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 15px;
    }
    .statut-impayee { background: #fef3c7; color: #92400e; }
    .statut-payee { background: #dcfce7; color: #166534; }
    .statut-partielle { background: #dbeafe; color: #1e40af; }
    .statut-annulee { background: #fee2e2; color: #991b1b; }
    .btn-action {
      background: #10b981;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      text-decoration: none;
      font-size: 14px;
    }
    .btn-action:hover { background: #059669; }

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
        <div class="logo">💵 SantéBF</div>
        <div class="time-info">
          <div class="time">${heureActuelle}</div>
          <div class="date">${dateActuelle}</div>
        </div>
      </div>
      <div class="header-right">
        <div class="user-info">
          <div class="user-name">${profil.prenom} ${profil.nom}</div>
          <div class="user-role">Caissier(ère)</div>
        </div>
        <a href="/auth/logout" class="btn-logout">Déconnexion</a>
      </div>
    </div>

    <!-- Statistiques -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-value">${data.stats.facturesJour}</div>
        <div class="stat-label">Factures aujourd'hui</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-value">${data.stats.impayees}</div>
        <div class="stat-label">Impayées</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-value">${formatFCFA(data.stats.recetteJour)}</div>
        <div class="stat-label">Recette du jour</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🕐</div>
        <div class="stat-value">${data.stats.attente}</div>
        <div class="stat-label">En attente</div>
      </div>
    </div>

    <!-- Actions rapides -->
    <div class="actions-grid">
      <a href="/caissier/encaissement" class="action-card">
        <div class="action-icon">💵</div>
        <div class="action-label">Nouvel encaissement</div>
      </a>
      <a href="/caissier/recherche" class="action-card">
        <div class="action-icon">🔍</div>
        <div class="action-label">Rechercher facture</div>
      </a>
      <a href="/caissier/cloture" class="action-card">
        <div class="action-icon">📊</div>
        <div class="action-label">Clôturer caisse</div>
      </a>
      <a href="/caissier/historique" class="action-card">
        <div class="action-icon">📜</div>
        <div class="action-label">Historique</div>
      </a>
    </div>

    <!-- Factures impayées -->
    <div class="section">
      <div class="section-title">
        <span>⏳</span> Factures impayées
      </div>
      ${data.factures && data.factures.length > 0 ? `
        <div class="facture-list">
          ${data.factures.map(fac => `
            <div class="facture-item">
              <div class="facture-info">
                <div class="facture-numero">${fac.numero_facture}</div>
                <div class="facture-patient">${fac.patient.nom} ${fac.patient.prenom}</div>
                <div class="facture-montant">${formatFCFA(fac.montant_patient)}</div>
                <div class="facture-date">${formatDate(fac.created_at)}</div>
              </div>
              <span class="facture-statut ${
                fac.statut === 'payee' ? 'statut-payee' :
                fac.statut === 'partiellement_payee' ? 'statut-partielle' :
                fac.statut === 'annulee' ? 'statut-annulee' :
                'statut-impayee'
              }">${fac.statut}</span>
              <a href="/caissier/facture/${fac.id}" class="btn-action">Encaisser</a>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-icon">💵</div>
          <p>Aucune facture impayée</p>
        </div>
      `}
    </div>
  </div>
</body>
</html>`
}
