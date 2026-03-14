export function dashboardAdminPage(profil: any, stats: {
  nbStructures: number
  nbComptes: number
  nbPatients: number
}): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Super Admin</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',sans-serif; background:#F7F8FA; min-height:100vh; }
    header {
      background:#1A6B3C; padding:0 24px; height:60px;
      display:flex; align-items:center; justify-content:space-between;
      box-shadow:0 2px 8px rgba(0,0,0,0.15);
      position:sticky; top:0; z-index:100;
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
    .logout {
      background:rgba(255,255,255,0.2); color:white; border:none;
      padding:8px 14px; border-radius:8px; font-size:13px;
      cursor:pointer; text-decoration:none; font-family:'DM Sans',sans-serif;
    }
    .logout:hover { background:rgba(255,255,255,0.3); }
    .container { max-width:1100px; margin:0 auto; padding:28px 20px; }
    .welcome { margin-bottom:28px; display:flex; justify-content:space-between; align-items:flex-start; }
    .welcome h2 { font-family:'DM Serif Display',serif; font-size:28px; color:#1A1A2E; }
    .welcome p  { font-size:14px; color:#6B7280; margin-top:4px; }
    .date-box   { text-align:right; font-size:13px; color:#6B7280; }
    .date-box strong { display:block; font-size:20px; color:#1A6B3C; }

    /* Stats */
    .stats { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px; margin-bottom:32px; }
    .sc {
      background:white; border-radius:14px; padding:24px 20px;
      box-shadow:0 2px 10px rgba(0,0,0,0.06);
      border-top:4px solid #1A6B3C;
      display:flex; flex-direction:column; align-items:center; text-align:center;
    }
    .sc-icon { font-size:32px; margin-bottom:10px; }
    .sc-val  { font-size:36px; font-weight:700; color:#1A6B3C; }
    .sc-lbl  { font-size:13px; color:#6B7280; margin-top:4px; }

    /* Section */
    .section-title {
      font-size:13px; font-weight:700; color:#9E9E9E;
      text-transform:uppercase; letter-spacing:.8px; margin-bottom:14px;
    }

    /* Actions */
    .actions { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px; margin-bottom:32px; }
    .ac {
      background:white; border-radius:14px; padding:24px 20px;
      text-align:center; text-decoration:none; color:#1A1A2E;
      box-shadow:0 2px 10px rgba(0,0,0,0.06);
      transition:transform .2s, box-shadow .2s;
      display:flex; flex-direction:column; align-items:center; gap:12px;
      border-bottom:3px solid #1A6B3C;
    }
    .ac:hover { transform:translateY(-4px); box-shadow:0 10px 24px rgba(0,0,0,0.1); }
    .ac-icon { font-size:36px; }
    .ac-lbl  { font-size:14px; font-weight:600; }
    .ac-desc { font-size:12px; color:#6B7280; }

    /* Alerte */
    .alerte-box {
      background:#FFF8E1; border-left:4px solid #F9A825;
      border-radius:10px; padding:16px 20px; margin-bottom:24px;
      font-size:14px; color:#E65100;
    }

    @media (max-width:640px) {
      .stats   { grid-template-columns:repeat(2,1fr); }
      .actions { grid-template-columns:repeat(2,1fr); }
      .welcome { flex-direction:column; gap:12px; }
      .container { padding:16px 12px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="hl">
      <div class="logo">🏥</div>
      <div class="ht">SantéBF <span>SUPER ADMINISTRATION</span></div>
    </div>
    <div class="hr">
      <div class="ub">
        <strong>${profil.prenom} ${profil.nom}</strong>
        <small>Super Admin</small>
      </div>
      <a href="/auth/logout" class="logout">Déconnexion</a>
    </div>
  </header>

  <div class="container">
    <div class="welcome">
      <div>
        <h2>Bonjour, ${profil.prenom} 👋</h2>
        <p>Tableau de bord national — Vue d'ensemble du système SantéBF</p>
      </div>
      <div class="date-box">
        <strong>${heure}</strong>
        ${date}
      </div>
    </div>

    ${stats.nbStructures === 0 ? `
    <div class="alerte-box">
      ⚠️ <strong>Démarrage :</strong> Aucune structure sanitaire enregistrée.
      Commencez par ajouter les structures puis les comptes utilisateurs.
    </div>` : ''}

    <!-- Stats nationales -->
    <div class="section-title">Statistiques nationales</div>
    <div class="stats">
      <div class="sc">
        <div class="sc-icon">🏥</div>
        <div class="sc-val">${stats.nbStructures}</div>
        <div class="sc-lbl">Structures sanitaires</div>
      </div>
      <div class="sc">
        <div class="sc-icon">👤</div>
        <div class="sc-val">${stats.nbComptes}</div>
        <div class="sc-lbl">Comptes utilisateurs</div>
      </div>
      <div class="sc">
        <div class="sc-icon">🗂️</div>
        <div class="sc-val">${stats.nbPatients}</div>
        <div class="sc-lbl">Dossiers patients</div>
      </div>
    </div>

    <!-- Actions -->
    <div class="section-title">Gestion du système</div>
    <div class="actions">
      <a href="/admin/structures" class="ac">
        <span class="ac-icon">🏥</span>
        <span class="ac-lbl">Structures</span>
        <span class="ac-desc">Hôpitaux, cliniques, CSPS...</span>
      </a>
      <a href="/admin/structures/nouvelle" class="ac">
        <span class="ac-icon">➕</span>
        <span class="ac-lbl">Ajouter structure</span>
        <span class="ac-desc">Enregistrer une nouvelle structure</span>
      </a>
      <a href="/admin/comptes" class="ac">
        <span class="ac-icon">👥</span>
        <span class="ac-lbl">Comptes</span>
        <span class="ac-desc">Médecins, infirmiers, admins...</span>
      </a>
      <a href="/admin/comptes/nouveau" class="ac">
        <span class="ac-icon">👤</span>
        <span class="ac-lbl">Créer un compte</span>
        <span class="ac-desc">Nouvel utilisateur SantéBF</span>
      </a>
      <a href="/admin/stats" class="ac">
        <span class="ac-icon">📊</span>
        <span class="ac-lbl">Statistiques</span>
        <span class="ac-desc">Activité nationale par région</span>
      </a>
      <a href="/admin/geo" class="ac">
        <span class="ac-icon">🗺️</span>
        <span class="ac-lbl">Géographie</span>
        <span class="ac-desc">Régions, provinces, villes</span>
      </a>
    </div>
  </div>
</body>
</html>`
}
