export function dashboardAccueilPage(profil: any, rdvJour: any[]): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Accueil</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',sans-serif; background:#F7F8FA; min-height:100vh; }
    header {
      background:#1565C0; padding:0 24px; height:60px;
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
    .date-box strong { display:block; font-size:20px; color:#1565C0; text-align:right; }
    .date-box span   { font-size:13px; color:#6B7280; }

    /* Recherche rapide */
    .search-bar {
      background:white;
      border-radius:14px;
      padding:20px;
      margin-bottom:24px;
      box-shadow:0 2px 8px rgba(0,0,0,0.06);
      display:flex; gap:12px; align-items:center;
    }
    .search-bar input {
      flex:1; padding:12px 16px;
      border:1.5px solid #E0E0E0;
      border-radius:10px; font-size:15px;
      font-family:'DM Sans',sans-serif;
      outline:none; transition:border-color .2s;
    }
    .search-bar input:focus { border-color:#1565C0; }
    .btn-search {
      background:#1565C0; color:white;
      border:none; padding:12px 20px;
      border-radius:10px; font-size:14px;
      font-weight:600; cursor:pointer;
      font-family:'DM Sans',sans-serif;
      white-space:nowrap;
    }

    /* Actions */
    .actions { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:14px; margin-bottom:28px; }
    .ac {
      background:white; border-radius:12px; padding:20px 16px;
      text-align:center; text-decoration:none; color:#1A1A2E;
      box-shadow:0 2px 8px rgba(0,0,0,0.06);
      transition:transform .2s;
      display:flex; flex-direction:column; align-items:center; gap:10px;
      border-bottom:3px solid #1565C0;
    }
    .ac:hover { transform:translateY(-3px); }
    .ac-icon { font-size:30px; }
    .ac-lbl  { font-size:13px; font-weight:600; }

    /* RDV liste */
    .rdv-box {
      background:white; border-radius:14px;
      box-shadow:0 2px 8px rgba(0,0,0,0.06); overflow:hidden;
    }
    .rdv-header {
      padding:14px 20px; background:#1565C0;
      display:flex; justify-content:space-between; align-items:center;
    }
    .rdv-header h3 { font-size:14px; font-weight:600; color:white; }
    .rdv-header a  { font-size:12px; color:rgba(255,255,255,.75); text-decoration:none; }
    .rdv-item {
      padding:14px 20px; border-bottom:1px solid #F5F5F5;
      display:flex; align-items:center; gap:14px;
    }
    .rdv-item:last-child { border-bottom:none; }
    .rdv-heure { font-size:16px; font-weight:700; color:#1565C0; min-width:48px; }
    .rdv-patient strong { display:block; font-size:14px; }
    .rdv-patient span   { font-size:12px; color:#9E9E9E; }
    .rdv-medecin { margin-left:auto; font-size:12px; color:#6B7280; text-align:right; }
    .rdv-statut { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
    .rdv-statut.planifie  { background:#E3F2FD; color:#1565C0; }
    .rdv-statut.confirme  { background:#E8F5E9; color:#1A6B3C; }
    .rdv-statut.passe     { background:#F5F5F5; color:#9E9E9E; }
    .rdv-statut.absent    { background:#FFF5F5; color:#B71C1C; }
    .empty { padding:24px; text-align:center; color:#9E9E9E; font-size:13px; font-style:italic; }

    @media (max-width:640px) {
      .actions { grid-template-columns:repeat(2,1fr); }
      .search-bar { flex-direction:column; }
      .top-row { flex-direction:column; gap:12px; }
      .container { padding:16px 12px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="hl">
      <div class="logo">🏥</div>
      <div class="ht">SantéBF <span>ACCUEIL</span></div>
    </div>
    <div class="hr">
      <div class="ub">
        <strong>${profil.prenom} ${profil.nom}</strong>
        <small>Agent d'accueil</small>
      </div>
      <a href="/auth/logout" class="logout">Déconnexion</a>
    </div>
  </header>

  <div class="container">
    <div class="top-row">
      <div class="welcome">
        <h2>Bonjour, ${profil.prenom} 👋</h2>
        <p>${rdvJour.length} rendez-vous planifiés aujourd'hui</p>
      </div>
      <div class="date-box">
        <strong>${heure}</strong>
        <span>${date}</span>
      </div>
    </div>

    <!-- Recherche rapide patient -->
    <form action="/accueil/recherche" method="GET" class="search-bar">
      <input
        type="text"
        name="q"
        placeholder="🔍  Rechercher un patient — nom, prénom ou numéro BF-XXXX-XXXXXX"
      >
      <button type="submit" class="btn-search">Rechercher</button>
    </form>

    <!-- Actions rapides -->
    <div class="actions">
      <a href="/accueil/nouveau-patient" class="ac">
        <span class="ac-icon">➕</span>
        <span class="ac-lbl">Nouveau patient</span>
      </a>
      <a href="/accueil/recherche" class="ac">
        <span class="ac-icon">🔍</span>
        <span class="ac-lbl">Rechercher</span>
      </a>
      <a href="/accueil/rdv" class="ac">
        <span class="ac-icon">📅</span>
        <span class="ac-lbl">Rendez-vous</span>
      </a>
      <a href="/accueil/rdv/nouveau" class="ac">
        <span class="ac-icon">📋</span>
        <span class="ac-lbl">Prendre RDV</span>
      </a>
    </div>

    <!-- RDV du jour -->
    <div class="rdv-box">
      <div class="rdv-header">
        <h3>📅 Rendez-vous d'aujourd'hui (${rdvJour.length})</h3>
        <a href="/accueil/rdv">Voir tout →</a>
      </div>
      ${rdvJour.length === 0
        ? '<div class="empty">Aucun rendez-vous planifié pour aujourd\'hui</div>'
        : rdvJour.map((r: any) => `
          <div class="rdv-item">
            <div class="rdv-heure">
              ${new Date(r.date_heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
            </div>
            <div class="rdv-patient">
              <strong>${r.patient_dossiers?.prenom || ''} ${r.patient_dossiers?.nom || ''}</strong>
              <span>${r.motif || 'Consultation'}</span>
            </div>
            <div class="rdv-medecin">
              Dr. ${r.auth_profiles?.prenom || ''} ${r.auth_profiles?.nom || ''}
            </div>
            <span class="rdv-statut ${r.statut}">${r.statut}</span>
          </div>`).join('')
      }
    </div>
  </div>
</body>
</html>`
}
