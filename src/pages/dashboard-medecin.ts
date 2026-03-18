// src/pages/dashboard-medecin.ts
export function dashboardMedecinPage(profil: any, data: {
  rdvJour: any[]               // liste des RDV du jour
  consultationsJour: number     // nombre de consultations aujourd'hui
  ordonnancesActives: number    // ordonnances actives émises par ce médecin
  rdvAVenir: number             // nombre total de RDV à venir
  consultationsRecentes: any[]  // 5 dernières consultations
  nbPatientsConsentement: number // patients avec consentement actif
}): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Tableau de bord médical</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', sans-serif;
      background: #f5f7fb;
      color: #1e293b;
    }
    .layout {
      display: flex;
      min-height: 100vh;
    }
    /* SIDEBAR */
    .sidebar {
      width: 260px;
      background: #0b2b4f;
      color: white;
      position: fixed;
      height: 100vh;
      overflow-y: auto;
      transition: transform 0.3s;
      z-index: 200;
    }
    .sidebar-header {
      padding: 24px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .sidebar-header h2 {
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: -0.5px;
    }
    .sidebar-header p {
      font-size: 0.8rem;
      opacity: 0.7;
      margin-top: 4px;
    }
    .sidebar-nav {
      padding: 20px 12px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 10px;
      color: rgba(255,255,255,0.8);
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 500;
      margin-bottom: 4px;
      transition: all 0.2s;
    }
    .nav-item:hover {
      background: rgba(255,255,255,0.1);
      color: white;
    }
    .nav-item.active {
      background: rgba(255,255,255,0.2);
      color: white;
      font-weight: 600;
    }
    .nav-icon {
      font-size: 1.2rem;
      width: 24px;
      text-align: center;
    }
    .sidebar-footer {
      padding: 20px 16px;
      border-top: 1px solid rgba(255,255,255,0.1);
      position: absolute;
      bottom: 0;
      width: 100%;
    }
    .user-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255,255,255,0.1);
      padding: 12px;
      border-radius: 10px;
    }
    .user-avatar {
      width: 40px;
      height: 40px;
      background: #2a4a7a;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.1rem;
    }
    .user-info {
      flex: 1;
      min-width: 0;
    }
    .user-name {
      font-weight: 600;
      font-size: 0.9rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-role {
      font-size: 0.75rem;
      opacity: 0.7;
    }
    .logout-btn {
      background: rgba(255,255,255,0.15);
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      text-decoration: none;
      font-size: 1rem;
    }
    .logout-btn:hover {
      background: rgba(255,80,80,0.3);
    }
    /* MAIN */
    .main {
      margin-left: 260px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .topbar {
      height: 70px;
      background: white;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .menu-toggle {
      display: none;
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #1e293b;
    }
    .page-title {
      font-size: 1.2rem;
      font-weight: 600;
    }
    .date-badge {
      background: #e9f0fc;
      padding: 6px 16px;
      border-radius: 30px;
      font-size: 0.9rem;
      color: #0b2b4f;
    }
    .content {
      padding: 28px;
    }
    /* STATISTIQUES RAPIDES */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 24px 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      border: 1px solid #e2e8f0;
    }
    .stat-label {
      font-size: 0.85rem;
      font-weight: 500;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: #0b2b4f;
      line-height: 1.2;
    }
    .stat-detail {
      font-size: 0.85rem;
      color: #64748b;
      margin-top: 4px;
    }
    /* ACTIONS RAPIDES */
    .quick-actions {
      display: flex;
      gap: 12px;
      margin-bottom: 30px;
      flex-wrap: wrap;
    }
    .action-btn {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 30px;
      padding: 10px 20px;
      font-size: 0.95rem;
      font-weight: 500;
      color: #1e293b;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .action-btn:hover {
      background: #0b2b4f;
      color: white;
      border-color: #0b2b4f;
    }
    .action-btn:hover .action-icon {
      color: white;
    }
    .action-icon {
      font-size: 1.2rem;
    }
    /* GRILLE 2 COLONNES */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: white;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .card-header {
      padding: 16px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-header a {
      color: #0b2b4f;
      text-decoration: none;
      font-size: 0.9rem;
    }
    .rdv-list, .consult-list {
      max-height: 400px;
      overflow-y: auto;
    }
    .rdv-item, .consult-item {
      padding: 14px 20px;
      border-bottom: 1px solid #ecf0f5;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .rdv-item:last-child, .consult-item:last-child {
      border-bottom: none;
    }
    .rdv-time {
      font-weight: 600;
      color: #0b2b4f;
      min-width: 60px;
      font-size: 0.95rem;
    }
    .rdv-info {
      flex: 1;
    }
    .rdv-patient {
      font-weight: 600;
      font-size: 0.95rem;
    }
    .rdv-motif {
      font-size: 0.8rem;
      color: #64748b;
    }
    .rdv-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: 600;
    }
    .rdv-badge.planifie {
      background: #e9f0fc;
      color: #0b2b4f;
    }
    .rdv-badge.confirme {
      background: #e6f7e6;
      color: #2e7d32;
    }
    .rdv-badge.annule {
      background: #fee9e9;
      color: #c62828;
    }
    .rdv-badge.passe {
      background: #e2e8f0;
      color: #475569;
    }
    .consult-patient {
      font-weight: 600;
      font-size: 0.95rem;
    }
    .consult-date {
      font-size: 0.8rem;
      color: #64748b;
    }
    .consult-diagnostic {
      font-size: 0.85rem;
      color: #0b2b4f;
      margin-top: 2px;
    }
    .empty {
      padding: 40px;
      text-align: center;
      color: #94a3b8;
      font-style: italic;
    }
    .view-all {
      display: block;
      text-align: center;
      padding: 12px;
      font-size: 0.9rem;
      color: #0b2b4f;
      text-decoration: none;
      border-top: 1px solid #ecf0f5;
      font-weight: 500;
    }
    .view-all:hover {
      background: #f1f5f9;
    }
    /* RESPONSIVE */
    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
      }
      .sidebar.open {
        transform: translateX(0);
      }
      .main {
        margin-left: 0;
      }
      .menu-toggle {
        display: block;
      }
      .grid-2 {
        grid-template-columns: 1fr;
      }
      .content {
        padding: 16px;
      }
    }
    @media (max-width: 480px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
      .quick-actions {
        flex-direction: column;
      }
      .action-btn {
        width: 100%;
        justify-content: center;
      }
    }
    /* OVERLAY pour mobile */
    .overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.4);
      z-index: 150;
    }
    .overlay.open {
      display: block;
    }
  </style>
</head>
<body>
<div class="layout">

  <!-- Sidebar -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <h2>🏥 SantéBF</h2>
      <p>Espace médical</p>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-item active">
        <span class="nav-icon">📊</span> Tableau de bord
      </div>
      <div class="nav-item">
        <span class="nav-icon">👥</span> <a href="/medecin/patients" style="color:inherit; text-decoration:none; flex:1;">Patients</a>
      </div>
      <div class="nav-item">
        <span class="nav-icon">📅</span> <a href="/medecin/rdv" style="color:inherit; text-decoration:none; flex:1;">Rendez-vous</a>
      </div>
      <div class="nav-item">
        <span class="nav-icon">💊</span> <a href="/medecin/ordonnances" style="color:inherit; text-decoration:none; flex:1;">Ordonnances</a>
      </div>
      <div class="nav-item">
        <span class="nav-icon">🔬</span> <a href="/medecin/examens" style="color:inherit; text-decoration:none; flex:1;">Examens</a>
      </div>
      <div class="nav-item">
        <span class="nav-icon">🛏️</span> <a href="/medecin/hospitalisations" style="color:inherit; text-decoration:none; flex:1;">Hospitalisations</a>
      </div>
      <div class="nav-item">
        <span class="nav-icon">📄</span> <a href="/medecin/documents" style="color:inherit; text-decoration:none; flex:1;">Documents</a>
      </div>
      <div class="nav-item">
        <span class="nav-icon">⚙️</span> <a href="/medecin/profil" style="color:inherit; text-decoration:none; flex:1;">Mon profil</a>
      </div>
    </nav>
    <div class="sidebar-footer">
      <div class="user-card">
        <div class="user-avatar">${(profil.prenom?.[0] || '')}${(profil.nom?.[0] || '')}</div>
        <div class="user-info">
          <div class="user-name">Dr. ${profil.prenom || ''} ${profil.nom || ''}</div>
          <div class="user-role">${(profil.role || '').replace(/_/g, ' ')}</div>
        </div>
        <a href="/auth/logout" class="logout-btn" title="Déconnexion">⏻</a>
      </div>
    </div>
  </aside>

  <!-- Overlay mobile -->
  <div class="overlay" id="overlay" onclick="toggleSidebar()"></div>

  <!-- Contenu principal -->
  <div class="main">
    <header class="topbar">
      <div style="display:flex; align-items:center; gap:16px;">
        <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
        <span class="page-title">Bonjour, Dr. ${profil.prenom || ''}</span>
      </div>
      <div class="date-badge">
        <span>🕐 ${heure}</span> — <span>${date}</span>
      </div>
    </header>

    <div class="content">
      <!-- Statistiques -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Consultations aujourd'hui</div>
          <div class="stat-value">${data.consultationsJour}</div>
          <div class="stat-detail">dont ${data.consultationsRecentes.filter(c => c.type_consultation === 'urgence').length} urgences</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Ordonnances actives</div>
          <div class="stat-value">${data.ordonnancesActives}</div>
          <div class="stat-detail">émises par vous</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">RDV à venir</div>
          <div class="stat-value">${data.rdvAVenir}</div>
          <div class="stat-detail">prochains jours</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Patients actifs</div>
          <div class="stat-value">${data.nbPatientsConsentement}</div>
          <div class="stat-detail">avec consentement</div>
        </div>
      </div>

      <!-- Actions rapides -->
      <div class="quick-actions">
        <a href="/medecin/consultations/nouvelle" class="action-btn">
          <span class="action-icon">📋</span> Nouvelle consultation
        </a>
        <a href="/medecin/ordonnances/nouvelle" class="action-btn">
          <span class="action-icon">💊</span> Nouvelle ordonnance
        </a>
        <a href="/medecin/examens/nouveau" class="action-btn">
          <span class="action-icon">🔬</span> Prescrire examen
        </a>
        <a href="/medecin/rdv/nouveau" class="action-btn">
          <span class="action-icon">📅</span> Nouveau RDV
        </a>
        <a href="/medecin/patients" class="action-btn">
          <span class="action-icon">👥</span> Rechercher patient
        </a>
      </div>

      <!-- Rendez-vous du jour + Consultations récentes -->
      <div class="grid-2">
        <!-- RDV du jour -->
        <div class="card">
          <div class="card-header">
            <span>📅 Rendez-vous aujourd'hui (${data.rdvJour.length})</span>
            <a href="/medecin/rdv">Voir tout →</a>
          </div>
          <div class="rdv-list">
            ${data.rdvJour.length === 0
              ? '<div class="empty">Aucun rendez-vous aujourd’hui</div>'
              : data.rdvJour.map(rdv => `
                <div class="rdv-item">
                  <div class="rdv-time">${new Date(rdv.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div class="rdv-info">
                    <div class="rdv-patient">${rdv.patient_dossiers?.prenom || ''} ${rdv.patient_dossiers?.nom || ''}</div>
                    <div class="rdv-motif">${rdv.motif || 'Consultation'}</div>
                  </div>
                  <span class="rdv-badge ${rdv.statut}">${rdv.statut}</span>
                </div>`).join('')
            }
          </div>
          <a href="/medecin/rdv" class="view-all">Gérer les rendez-vous →</a>
        </div>

        <!-- Consultations récentes -->
        <div class="card">
          <div class="card-header">
            <span>📋 Consultations récentes</span>
            <a href="/medecin/consultations">Voir tout →</a>
          </div>
          <div class="consult-list">
            ${data.consultationsRecentes.length === 0
              ? '<div class="empty">Aucune consultation récente</div>'
              : data.consultationsRecentes.map(c => `
                <div class="consult-item">
                  <div style="flex:1;">
                    <div class="consult-patient">${c.patient_dossiers?.prenom || ''} ${c.patient_dossiers?.nom || ''}</div>
                    <div class="consult-date">${new Date(c.created_at).toLocaleDateString('fr-FR')} · ${c.type_consultation}</div>
                    ${c.diagnostic_principal ? `<div class="consult-diagnostic">→ ${c.diagnostic_principal}</div>` : ''}
                  </div>
                  <a href="/medecin/consultations/nouvelle?patient_id=${c.patient_dossiers?.id}" class="btn-sm" style="background:#0b2b4f; color:white; padding:4px 8px; border-radius:6px; text-decoration:none; font-size:0.8rem;">➕</a>
                </div>`).join('')
            }
          </div>
          <a href="/medecin/consultations" class="view-all">Voir toutes les consultations →</a>
        </div>
      </div>

      <!-- Rappels / Alertes (exemple si besoin) -->
      <!-- On peut ajouter une section pour les examens en attente, etc. -->
    </div>
  </div>
</div>

<script>
  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
  }
  // Fermer la sidebar si on clique sur un lien (mobile)
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', function() {
      if (window.innerWidth <= 768) {
        toggleSidebar();
      }
    });
  });
</script>
</body>
</html>`
}