/**
 * src/pages/dashboard-admin.ts
 * SantéBF — Dashboard Super Administrateur National
 *
 * Accessible uniquement au rôle super_admin
 * Route : GET /dashboard/admin dans src/routes/dashboard.ts
 */

export function dashboardAdminPage(profil: any, data: {
  nbStructures: number
  nbComptes:    number
  nbPatients:   number
}): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Administration Nationale</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root{--c:#4A148C;--bg:#F7F8FA;--brd:#E5E7EB;--tx:#1A1A2E;--soft:#6B7280}
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:var(--bg);min-height:100vh}
    header{background:var(--c);padding:0 24px;height:60px;display:flex;align-items:center;
      justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,.2);position:sticky;top:0;z-index:100}
    .hl{display:flex;align-items:center;gap:12px}
    .logo{width:34px;height:34px;background:white;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px}
    .ht{font-family:'DM Serif Display',serif;font-size:18px;color:white}
    .ht span{font-family:'DM Sans',sans-serif;font-size:12px;opacity:.7;display:block;margin-top:-2px}
    .hr{display:flex;align-items:center;gap:12px}
    .ub{background:rgba(255,255,255,.15);border-radius:8px;padding:6px 12px;font-size:13px;color:white}
    .ub strong{display:block;font-size:14px}
    .ub small{opacity:.75;font-size:11px}
    .logout{background:rgba(255,255,255,.2);color:white;border:none;padding:8px 14px;
      border-radius:8px;font-size:13px;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
    .wrap{max-width:1100px;margin:0 auto;padding:24px 20px}
    .welcome{margin-bottom:24px}
    .welcome h2{font-family:'DM Serif Display',serif;font-size:26px;color:var(--tx);margin-bottom:4px}
    .date-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    .date-header span{font-size:13px;color:var(--soft)}
    .date-header strong{font-size:13px;color:var(--tx)}
    .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;margin-bottom:28px}
    .stat-card{background:white;border-radius:12px;padding:20px;text-align:center;
      box-shadow:0 2px 8px rgba(0,0,0,.06);border-top:4px solid var(--c)}
    .stat-icon{font-size:28px;margin-bottom:8px}
    .stat-val{font-size:28px;font-weight:700;color:var(--c)}
    .stat-lbl{font-size:12px;color:var(--soft);margin-top:4px}
    .actions-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:28px}
    .action-card{background:white;border-radius:12px;padding:20px 16px;text-align:center;
      text-decoration:none;color:var(--tx);box-shadow:0 2px 8px rgba(0,0,0,.06);
      transition:transform .2s;display:flex;flex-direction:column;align-items:center;gap:10px;
      border-bottom:3px solid var(--c)}
    .action-card:hover{transform:translateY(-3px);box-shadow:0 8px 20px rgba(0,0,0,.1)}
    .ac-icon{font-size:32px}
    .ac-lbl{font-size:13px;font-weight:600}
    .info-card{background:white;border-radius:12px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:20px}
    .info-card h3{font-size:15px;font-weight:700;margin-bottom:12px;color:var(--tx)}
    .info-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--brd);font-size:14px}
    .info-row:last-child{border-bottom:none}
    .tag{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;background:#F3E5F5;color:#4A148C}
    @media(max-width:640px){header{padding:0 16px}.wrap{padding:16px 12px}
      .stats-grid{grid-template-columns:repeat(2,1fr)}.actions-grid{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <header>
    <div class="hl">
      <div class="logo">🏥</div>
      <div class="ht">SantéBF<span>Administration Nationale</span></div>
    </div>
    <div class="hr">
      <div class="ub">
        <strong>${profil.prenom} ${profil.nom}</strong>
        <small>Super Administrateur</small>
      </div>
      <a href="/auth/logout" class="logout">Déconnexion</a>
    </div>
  </header>

  <div class="wrap">
    <div class="welcome">
      <div class="date-header">
        <h2>Bonjour, ${profil.prenom} 👋</h2>
        <div><strong>${heure}</strong><span> — ${date}</span></div>
      </div>
      <p style="font-size:14px;color:var(--soft)">Tableau de bord administration nationale SantéBF</p>
    </div>

    <!-- Stats globales -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🏥</div>
        <div class="stat-val">${data.nbStructures}</div>
        <div class="stat-lbl">Structures enregistrées</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-val">${data.nbComptes}</div>
        <div class="stat-lbl">Comptes utilisateurs</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📂</div>
        <div class="stat-val">${data.nbPatients}</div>
        <div class="stat-lbl">Dossiers patients</div>
      </div>
    </div>

    <!-- Actions rapides -->
    <div class="actions-grid">
      <a href="/admin/structures" class="action-card">
        <span class="ac-icon">🏥</span>
        <span class="ac-lbl">Structures</span>
      </a>
      <a href="/admin/comptes" class="action-card">
        <span class="ac-icon">👥</span>
        <span class="ac-lbl">Comptes</span>
      </a>
      <a href="/admin/plans" class="action-card">
        <span class="ac-icon">💳</span>
        <span class="ac-lbl">Plans & Abonnements</span>
      </a>
      <a href="/admin/stats" class="action-card">
        <span class="ac-icon">📊</span>
        <span class="ac-lbl">Statistiques</span>
      </a>
      <a href="/admin/logs" class="action-card">
        <span class="ac-icon">📋</span>
        <span class="ac-lbl">Logs système</span>
      </a>
      <a href="/admin/cnts" class="action-card">
        <span class="ac-icon">🩸</span>
        <span class="ac-lbl">CNTS</span>
      </a>
    </div>

    <!-- Infos système -->
    <div class="info-card">
      <h3>⚙️ Informations système</h3>
      <div class="info-row">
        <span style="color:var(--soft)">Version</span>
        <span class="tag">SantéBF 2.0</span>
      </div>
      <div class="info-row">
        <span style="color:var(--soft)">Déploiement</span>
        <span>Cloudflare Pages</span>
      </div>
      <div class="info-row">
        <span style="color:var(--soft)">Base de données</span>
        <span>Supabase PostgreSQL</span>
      </div>
      <div class="info-row">
        <span style="color:var(--soft)">URL production</span>
        <span style="font-family:monospace;font-size:12px">santebf.izicardouaga.com</span>
      </div>
      <div class="info-row">
        <span style="color:var(--soft)">Module IA</span>
        <span class="tag" style="background:#FFF3E0;color:#E65100">En développement</span>
      </div>
      <div class="info-row">
        <span style="color:var(--soft)">Module paiement</span>
        <span class="tag" style="background:#FFF3E0;color:#E65100">En développement</span>
      </div>
    </div>
  </div>
</body>
</html>`
}
 