export function dashboardMedecinPage(profil: any, data: {
  rdvJour: any[]
  consultations: any[]
}): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Espace Médical</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',sans-serif; background:#F7F8FA; min-height:100vh; }
    header {
      background:#4A148C; padding:0 24px; height:60px;
      display:flex; align-items:center; justify-content:space-between;
      position:sticky; top:0; z-index:100;
      box-shadow:0 2px 8px rgba(0,0,0,0.15);
    }
    .hl { display:flex; align-items:center; gap:12px; }
    .logo { width:34px; height:34px; background:white; border-radius:8px;
      display:flex; align-items:center; justify-content:center; font-size:18px; }
    .ht { font-family:'DM Serif Display',serif; font-size:18px; color:white; }
    .ht span { font-family:'DM Sans',sans-serif; font-size:11px; opacity:.7; display:block; }
    .hr { display:flex; align-items:center; gap:10px; }
    .ub { background:rgba(255,255,255,0.15); border-radius:8px; padding:6px 12px; }
    .ub strong { display:block; font-size:13px; color:white; }
    .ub small   { font-size:11px; color:rgba(255,255,255,0.7); }
    .logout { background:rgba(255,255,255,0.2); color:white; border:none;
      padding:8px 14px; border-radius:8px; font-size:13px;
      cursor:pointer; text-decoration:none; font-family:'DM Sans',sans-serif; }
    .container { max-width:1100px; margin:0 auto; padding:24px 20px; }
    .top-row { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
    .welcome h2 { font-family:'DM Serif Display',serif; font-size:26px; color:#1A1A2E; }
    .welcome p  { font-size:14px; color:#6B7280; margin-top:4px; }
    .date-box   { text-align:right; font-size:13px; color:#6B7280; }
    .date-box strong { display:block; font-size:20px; color:#4A148C; }

    /* Actions rapides */
    .quick { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:12px; margin-bottom:28px; }
    .qc {
      background:white; border-radius:12px; padding:18px 14px;
      text-align:center; text-decoration:none; color:#1A1A2E;
      box-shadow:0 2px 8px rgba(0,0,0,0.06);
      transition:transform .2s;
      border-bottom:3px solid #4A148C;
      display:flex; flex-direction:column; align-items:center; gap:8px;
    }
    .qc:hover { transform:translateY(-3px); }
    .qc-icon { font-size:28px; }
    .qc-lbl  { font-size:13px; font-weight:600; }

    /* Grille 2 colonnes */
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
    .section-box {
      background:white; border-radius:14px;
      box-shadow:0 2px 8px rgba(0,0,0,0.06);
      overflow:hidden;
    }
    .section-header {
      padding:14px 18px;
      background:#4A148C;
      display:flex; justify-content:space-between; align-items:center;
    }
    .section-header h3 { font-size:14px; font-weight:600; color:white; }
    .section-header a  { font-size:12px; color:rgba(255,255,255,0.75); text-decoration:none; }
    .section-header a:hover { color:white; }

    /* RDV */
    .rdv-item {
      padding:12px 18px;
      border-bottom:1px solid #F5F5F5;
      display:flex; align-items:center; gap:12px;
    }
    .rdv-item:last-child { border-bottom:none; }
    .rdv-heure { font-size:15px; font-weight:700; color:#4A148C; min-width:44px; }
    .rdv-info strong { display:block; font-size:13px; }
    .rdv-info span   { font-size:11px; color:#9E9E9E; }
    .rdv-badge { margin-left:auto; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
    .rdv-badge.planifie { background:#EDE7F6; color:#4A148C; }
    .rdv-badge.confirme { background:#E8F5E9; color:#1A6B3C; }
    .rdv-badge.passe    { background:#F5F5F5; color:#9E9E9E; }

    /* Consultations */
    .consult-item {
      padding:12px 18px;
      border-bottom:1px solid #F5F5F5;
    }
    .consult-item:last-child { border-bottom:none; }
    .ci-top { display:flex; justify-content:space-between; margin-bottom:4px; }
    .ci-patient { font-size:13px; font-weight:600; }
    .ci-date    { font-size:11px; color:#9E9E9E; }
    .ci-motif   { font-size:12px; color:#6B7280; }
    .ci-diag    { font-size:12px; color:#4A148C; margin-top:2px; }

    .empty { padding:20px; text-align:center; color:#9E9E9E; font-size:13px; font-style:italic; }
    .voir-plus { display:block; text-align:center; padding:10px; font-size:12px; color:#4A148C; text-decoration:none; border-top:1px solid #F5F5F5; }

    @media (max-width:768px) {
      .grid2 { grid-template-columns:1fr; }
      .top-row { flex-direction:column; gap:12px; }
      .quick { grid-template-columns:repeat(3,1fr); }
    }
    @media (max-width:480px) {
      .quick { grid-template-columns:repeat(2,1fr); }
      .container { padding:16px 12px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="hl">
      <div class="logo">🏥</div>
      <div class="ht">SantéBF <span>ESPACE MÉDICAL</span></div>
    </div>
    <div class="hr">
      <div class="ub">
        <strong>Dr. ${profil.prenom} ${profil.nom}</strong>
        <small>${profil.role.replace(/_/g,' ')}</small>
      </div>
      <a href="/auth/logout" class="logout">Déconnexion</a>
    </div>
  </header>

  <div class="container">
    <div class="top-row">
      <div class="welcome">
        <h2>Bonjour, Dr. ${profil.prenom} 👋</h2>
        <p>Vous avez <strong>${data.rdvJour.length}</strong> rendez-vous aujourd'hui</p>
      </div>
      <div class="date-box">
        <strong>${heure}</strong>
        ${date}
      </div>
    </div>

    <!-- Actions rapides -->
    <div class="quick">
      <a href="/medecin/patients" class="qc">
        <span class="qc-icon">🔍</span>
        <span class="qc-lbl">Mes patients</span>
      </a>
      <a href="/medecin/consultations/nouvelle" class="qc">
        <span class="qc-icon">📋</span>
        <span class="qc-lbl">Consultation</span>
      </a>
      <a href="/medecin/ordonnances/nouvelle" class="qc">
        <span class="qc-icon">💊</span>
        <span class="qc-lbl">Ordonnance</span>
      </a>
      <a href="/medecin/rdv" class="qc">
        <span class="qc-icon">📅</span>
        <span class="qc-lbl">Planning</span>
      </a>
      <a href="/medecin/examens" class="qc">
        <span class="qc-icon">🧪</span>
        <span class="qc-lbl">Examens</span>
      </a>
      <a href="/medecin/hospitalisations" class="qc">
        <span class="qc-icon">🛏️</span>
        <span class="qc-lbl">Hospitalisés</span>
      </a>
    </div>

    <!-- RDV + Consultations récentes -->
    <div class="grid2">

      <!-- RDV du jour -->
      <div class="section-box">
        <div class="section-header">
          <h3>📅 RDV d'aujourd'hui (${data.rdvJour.length})</h3>
          <a href="/medecin/rdv">Voir tout →</a>
        </div>
        ${data.rdvJour.length === 0
          ? '<div class="empty">Aucun rendez-vous aujourd\'hui</div>'
          : data.rdvJour.map((rdv: any) => `
            <div class="rdv-item">
              <div class="rdv-heure">${new Date(rdv.date_heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
              <div class="rdv-info">
                <strong>${rdv.patient_dossiers?.prenom} ${rdv.patient_dossiers?.nom}</strong>
                <span>${rdv.motif || 'Consultation'}</span>
              </div>
              <span class="rdv-badge ${rdv.statut}">${rdv.statut}</span>
            </div>`).join('')
        }
        <a href="/medecin/rdv" class="voir-plus">Gérer les RDV →</a>
      </div>

      <!-- Consultations récentes -->
      <div class="section-box">
        <div class="section-header">
          <h3>📋 Consultations récentes</h3>
          <a href="/medecin/consultations">Voir tout →</a>
        </div>
        ${data.consultations.length === 0
          ? '<div class="empty">Aucune consultation récente</div>'
          : data.consultations.map((c: any) => `
            <div class="consult-item">
              <div class="ci-top">
                <span class="ci-patient">${c.patient_dossiers?.prenom} ${c.patient_dossiers?.nom}</span>
                <span class="ci-date">${new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              <div class="ci-motif">${c.motif || ''}</div>
              ${c.diagnostic_principal ? `<div class="ci-diag">→ ${c.diagnostic_principal}</div>` : ''}
            </div>`).join('')
        }
        <a href="/medecin/consultations" class="voir-plus">Voir toutes les consultations →</a>
      </div>

    </div>
  </div>
</body>
</html>`
}
