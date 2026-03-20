/**
 * src/pages/dashboard-accueil.ts
 * SantéBF — Dashboard Agent d'Accueil
 *
 * Accessible au rôle agent_accueil
 * Route : GET /dashboard/accueil dans src/routes/dashboard.ts
 */

export function dashboardAccueilPage(profil: any, rdvJour: any[]): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const rdvRows = rdvJour.map((rdv: any) => {
    const patient = rdv.patient_dossiers as any
    const medecin = rdv.auth_profiles   as any
    const hRdv    = new Date(rdv.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const statBg  = rdv.statut === 'confirme' ? '#E8F5E9' : rdv.statut === 'annule' ? '#FFF5F5' : '#E3F2FD'
    const statCo  = rdv.statut === 'confirme' ? '#1A6B3C' : rdv.statut === 'annule' ? '#B71C1C' : '#1565C0'
    return `<tr>
      <td><strong>${hRdv}</strong></td>
      <td>${patient?.prenom||''} ${patient?.nom||''}</td>
      <td>Dr. ${medecin?.prenom||''} ${medecin?.nom||''}</td>
      <td>${rdv.motif||'—'}</td>
      <td><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${statBg};color:${statCo}">${rdv.statut}</span></td>
      <td>
        <a href="/accueil/patient/${rdv.patient_id}" style="color:#1565C0;font-size:12px;font-weight:700;text-decoration:none;">Dossier →</a>
      </td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Accueil</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root{--c:#1565C0;--bg:#F7F8FA;--brd:#E5E7EB;--tx:#1A1A2E;--soft:#6B7280}
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:var(--bg);min-height:100vh}
    header{background:var(--c);padding:0 24px;height:60px;display:flex;align-items:center;
      justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,.15);position:sticky;top:0;z-index:100}
    .hl{display:flex;align-items:center;gap:12px}
    .logo{width:34px;height:34px;background:white;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px}
    .ht{font-family:'DM Serif Display',serif;font-size:18px;color:white}
    .ht span{font-family:'DM Sans',sans-serif;font-size:12px;opacity:.7;display:block;margin-top:-2px}
    .hr{display:flex;align-items:center;gap:12px}
    .ub{background:rgba(255,255,255,.15);border-radius:8px;padding:6px 12px;font-size:13px;color:white}
    .ub strong{display:block;font-size:14px}
    .ub small{opacity:.75;font-size:11px}
    .logout{background:rgba(255,255,255,.2);color:white;border:none;padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
    .wrap{max-width:1100px;margin:0 auto;padding:24px 20px}
    .welcome h2{font-family:'DM Serif Display',serif;font-size:26px;color:var(--tx);margin-bottom:4px}
    .date-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    .date-header span{font-size:13px;color:var(--soft)}
    .date-header strong{font-size:13px;color:var(--tx)}
    .actions-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:28px}
    .action-card{background:white;border-radius:12px;padding:20px 16px;text-align:center;text-decoration:none;color:var(--tx);box-shadow:0 2px 8px rgba(0,0,0,.06);transition:transform .2s;display:flex;flex-direction:column;align-items:center;gap:10px;border-bottom:3px solid var(--c)}
    .action-card:hover{transform:translateY(-3px)}
    .ac-icon{font-size:32px}
    .ac-lbl{font-size:13px;font-weight:600}
    .table-wrap{background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)}
    table{width:100%;border-collapse:collapse}
    thead tr{background:var(--c)}
    thead th{padding:12px 16px;text-align:left;font-size:12px;color:white;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    tbody tr{border-bottom:1px solid var(--brd);transition:background .15s}
    tbody tr:hover{background:#F9FAFB}
    tbody td{padding:12px 16px;font-size:14px}
    tbody tr:last-child{border-bottom:none}
    .empty{text-align:center;color:var(--soft);font-style:italic}
    .section-title{font-family:'DM Serif Display',serif;font-size:20px;color:var(--tx);margin-bottom:14px}
    @media(max-width:640px){.wrap{padding:16px 12px}.actions-grid{grid-template-columns:repeat(2,1fr)}.table-wrap{overflow-x:auto}}
  </style>
</head>
<body>
  <header>
    <div class="hl">
      <div class="logo">🏥</div>
      <div class="ht">SantéBF<span>Accueil</span></div>
    </div>
    <div class="hr">
      <div class="ub">
        <strong>${profil.prenom} ${profil.nom}</strong>
        <small>Agent d'accueil</small>
      </div>
      <a href="/auth/logout" class="logout">Déconnexion</a>
    </div>
  </header>

  <div class="wrap">
    <div class="welcome" style="margin-bottom:24px;">
      <div class="date-header">
        <h2>Bonjour, ${profil.prenom} 👋</h2>
        <div><strong>${heure}</strong><span> — ${date}</span></div>
      </div>
      <p style="font-size:14px;color:var(--soft)">Bienvenue dans votre espace SantéBF</p>
    </div>

    <!-- Actions rapides -->
    <div class="actions-grid">
      <a href="/accueil/nouveau-patient" class="action-card">
        <span class="ac-icon">➕</span>
        <span class="ac-lbl">Nouveau patient</span>
      </a>
      <a href="/accueil/recherche" class="action-card">
        <span class="ac-icon">🔍</span>
        <span class="ac-lbl">Rechercher patient</span>
      </a>
      <a href="/accueil/rdv" class="action-card">
        <span class="ac-icon">📅</span>
        <span class="ac-lbl">Rendez-vous</span>
      </a>
      <a href="/accueil/rdv/nouveau" class="action-card">
        <span class="ac-icon">📋</span>
        <span class="ac-lbl">Nouveau RDV</span>
      </a>
    </div>

    <!-- RDV du jour -->
    <div class="section-title">📅 Rendez-vous du jour (${rdvJour.length})</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Heure</th>
            <th>Patient</th>
            <th>Médecin</th>
            <th>Motif</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rdvRows || `<tr><td colspan="6" class="empty">Aucun rendez-vous aujourd'hui</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`
}
