import { AuthProfile } from '../lib/supabase'
import { formatDate, formatFCFA } from '../utils/format'

// ═══════════════════════════════════════════════════════════
// DASHBOARD CAISSIER
// ═══════════════════════════════════════════════════════════

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
  const heure = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Caisse</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fraunces:wght@300;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --vert:        #1A6B3C;
      --vert-mid:    #2E8B57;
      --vert-clair:  #e8f5ee;
      --vert-glow:   rgba(26,107,60,0.12);
      --or:          #C9A84C;
      --or-clair:    #fdf6e3;
      --rouge:       #C62828;
      --rouge-clair: #fce8e8;
      --texte:       #0f1923;
      --texte-soft:  #5a6a78;
      --bg:          #f2f7f4;
      --blanc:       #ffffff;
      --bordure:     #daeae2;
      --shadow-sm:   0 1px 4px rgba(0,0,0,0.06);
      --shadow-md:   0 4px 20px rgba(0,0,0,0.08);
      --radius:      16px;
      --radius-sm:   10px;
    }
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Plus Jakarta Sans',sans-serif; background:var(--bg); min-height:100vh; color:var(--texte); }
    .layout { display:flex; min-height:100vh; }

    .sidebar { width:250px; background:var(--vert); position:fixed; top:0; left:0; height:100vh; z-index:200; display:flex; flex-direction:column; transition:transform 0.3s; }
    .sidebar-brand { padding:24px 20px 18px; border-bottom:1px solid rgba(255,255,255,0.1); }
    .brand-row { display:flex; align-items:center; gap:10px; }
    .brand-icon { width:36px; height:36px; background:var(--or); border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:17px; }
    .brand-name { font-family:'Fraunces',serif; font-size:18px; color:white; }
    .brand-sub { font-size:10px; color:rgba(255,255,255,0.4); letter-spacing:1.2px; text-transform:uppercase; margin-top:4px; padding-left:46px; }
    .sidebar-nav { flex:1; padding:12px 10px; overflow-y:auto; }
    .nav-label { font-size:10px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:rgba(255,255,255,0.3); padding:10px 10px 5px; }
    .nav-item { display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:var(--radius-sm); text-decoration:none; color:rgba(255,255,255,0.65); font-size:13.5px; font-weight:500; margin-bottom:2px; transition:all 0.2s; }
    .nav-item:hover { background:rgba(255,255,255,0.1); color:white; }
    .nav-item.active { background:rgba(255,255,255,0.18); color:white; font-weight:600; }
    .nav-icon { font-size:15px; width:18px; text-align:center; }
    .sidebar-footer { padding:14px 10px; border-top:1px solid rgba(255,255,255,0.1); }
    .user-card { display:flex; align-items:center; gap:10px; padding:10px; border-radius:var(--radius-sm); background:rgba(255,255,255,0.08); }
    .user-avatar { width:34px; height:34px; background:var(--or); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:var(--vert); flex-shrink:0; }
    .user-info { flex:1; min-width:0; }
    .user-name { font-size:12.5px; font-weight:600; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .user-role { font-size:10.5px; color:rgba(255,255,255,0.4); }
    .logout-btn { width:26px; height:26px; background:rgba(255,255,255,0.08); border:none; border-radius:6px; color:rgba(255,255,255,0.5); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; text-decoration:none; transition:all 0.2s; flex-shrink:0; }
    .logout-btn:hover { background:rgba(255,80,80,0.2); color:#ff8080; }

    .main { margin-left:250px; flex:1; display:flex; flex-direction:column; }
    .topbar { height:62px; background:var(--blanc); border-bottom:1px solid var(--bordure); display:flex; align-items:center; justify-content:space-between; padding:0 28px; position:sticky; top:0; z-index:100; }
    .topbar-title { font-family:'Fraunces',serif; font-size:19px; font-weight:600; }
    .topbar-sub { font-size:12px; color:var(--texte-soft); margin-top:1px; }
    .datetime-pill { background:var(--vert-clair); padding:6px 14px; border-radius:20px; font-size:12.5px; font-weight:600; color:var(--vert); }
    .menu-toggle { display:none; background:none; border:none; font-size:20px; cursor:pointer; color:var(--texte); }
    .content { padding:28px; }

    .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:28px; }
    .stat-card { background:var(--blanc); border-radius:var(--radius); padding:20px; box-shadow:var(--shadow-sm); border:1px solid var(--bordure); position:relative; overflow:hidden; }
    .stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; }
    .stat-card.c-vert::before { background:var(--vert); }
    .stat-card.c-or::before { background:var(--or); }
    .stat-card.c-rouge::before { background:var(--rouge); }
    .stat-icon { font-size:26px; margin-bottom:10px; }
    .stat-val { font-family:'Fraunces',serif; font-size:36px; font-weight:600; color:var(--texte); line-height:1; margin-bottom:4px; }
    .stat-lbl { font-size:12px; color:var(--texte-soft); font-weight:500; }
    .stat-val.or { color:var(--or); }

    .actions-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
    .action-card { background:var(--blanc); border-radius:var(--radius); padding:18px; text-align:center; text-decoration:none; color:var(--texte); border:1px solid var(--bordure); transition:all 0.2s; box-shadow:var(--shadow-sm); }
    .action-card:hover { border-color:var(--vert); box-shadow:0 0 0 3px var(--vert-glow), var(--shadow-md); transform:translateY(-2px); }
    .action-icon { font-size:28px; margin-bottom:8px; }
    .action-label { font-size:13px; font-weight:600; }

    .facture-list { display:flex; flex-direction:column; gap:10px; }
    .facture-item { background:var(--blanc); border-radius:var(--radius-sm); padding:16px 18px; border:1px solid var(--bordure); display:flex; align-items:center; gap:16px; box-shadow:var(--shadow-sm); transition:all 0.2s; }
    .facture-item:hover { box-shadow:var(--shadow-md); transform:translateX(2px); border-color:var(--vert); }
    .facture-num { font-family:'Fraunces',serif; font-size:14px; color:var(--vert); font-weight:600; }
    .facture-patient { font-size:14px; font-weight:600; }
    .facture-date { font-size:11px; color:var(--texte-soft); margin-top:2px; }
    .facture-montant { font-family:'Fraunces',serif; font-size:16px; font-weight:600; color:var(--vert); margin-left:auto; }
    .badge { padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600; }
    .badge-payee { background:var(--vert-clair); color:var(--vert); }
    .badge-impayee { background:var(--rouge-clair); color:var(--rouge); }
    .badge-attente { background:var(--or-clair); color:#7a5500; }
    .badge-partielle { background:#dbeafe; color:#1e40af; }
    .btn-sm { background:var(--vert); color:white; padding:6px 14px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:600; white-space:nowrap; }
    .section-title { font-family:'Fraunces',serif; font-size:17px; font-weight:600; margin-bottom:14px; }
    .empty { padding:32px; text-align:center; color:var(--texte-soft); font-style:italic; }

    .overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:150; }
    .overlay.open { display:block; }
    @media (max-width:1100px) { .stats-grid,.actions-grid { grid-template-columns:repeat(2,1fr); } }
    @media (max-width:768px) { .sidebar { transform:translateX(-100%); } .sidebar.open { transform:translateX(0); } .main { margin-left:0; } .menu-toggle { display:flex; } .content { padding:16px; } }
  </style>
</head>
<body>
<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-brand">
      <div class="brand-row"><div class="brand-icon">💵</div><div class="brand-name">SantéBF</div></div>
      <div class="brand-sub">Caisse</div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-label">Principal</div>
      <a href="/dashboard/caissier" class="nav-item active"><span class="nav-icon">⊞</span> Tableau de bord</a>
      <div class="nav-label">Facturation</div>
      <a href="/caissier/encaissement" class="nav-item"><span class="nav-icon">💵</span> Encaissement</a>
      <a href="/caissier/recherche" class="nav-item"><span class="nav-icon">🔍</span> Rechercher</a>
      <a href="/caissier/historique" class="nav-item"><span class="nav-icon">📜</span> Historique</a>
      <div class="nav-label">Rapport</div>
      <a href="/caissier/cloture" class="nav-item"><span class="nav-icon">📊</span> Clôture caisse</a>
    </nav>
    <div class="sidebar-footer">
      <div class="user-card">
        <div class="user-avatar">${profil.prenom.charAt(0)}${profil.nom.charAt(0)}</div>
        <div class="user-info"><div class="user-name">${profil.prenom} ${profil.nom}</div><div class="user-role">Caissier(ère)</div></div>
        <a href="/auth/logout" class="logout-btn" title="Déconnexion">⏻</a>
      </div>
    </div>
  </aside>
  <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
  <div class="main">
    <header class="topbar">
      <div style="display:flex;align-items:center;gap:14px;">
        <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
        <div><div class="topbar-title">Bonjour, ${profil.prenom} 👋</div><div class="topbar-sub">Gestion de la caisse</div></div>
      </div>
      <div class="datetime-pill">🕐 ${heure} — ${date}</div>
    </header>
    <div class="content">
      <div class="stats-grid">
        <div class="stat-card c-vert"><div class="stat-icon">📋</div><div class="stat-val">${data.stats.facturesJour}</div><div class="stat-lbl">Factures aujourd'hui</div></div>
        <div class="stat-card c-rouge"><div class="stat-icon">⏳</div><div class="stat-val">${data.stats.impayees}</div><div class="stat-lbl">Impayées</div></div>
        <div class="stat-card c-or"><div class="stat-icon">💰</div><div class="stat-val or">${formatFCFA(data.stats.recetteJour)}</div><div class="stat-lbl">Recette du jour</div></div>
        <div class="stat-card c-vert"><div class="stat-icon">🕐</div><div class="stat-val">${data.stats.attente}</div><div class="stat-lbl">En attente</div></div>
      </div>
      <div class="actions-grid">
        <a href="/caissier/encaissement" class="action-card"><div class="action-icon">💵</div><div class="action-label">Encaissement</div></a>
        <a href="/caissier/recherche" class="action-card"><div class="action-icon">🔍</div><div class="action-label">Rechercher</div></a>
        <a href="/caissier/cloture" class="action-card"><div class="action-icon">📊</div><div class="action-label">Clôture</div></a>
        <a href="/caissier/historique" class="action-card"><div class="action-icon">📜</div><div class="action-label">Historique</div></a>
      </div>
      <div class="section-title">⏳ Factures du jour</div>
      ${data.factures.length === 0
        ? '<div class="empty" style="background:white;border-radius:var(--radius);border:1px solid var(--bordure);">Aucune facture aujourd\'hui</div>'
        : `<div class="facture-list">
            ${data.factures.map((f: any) => `
              <div class="facture-item">
                <div>
                  <div class="facture-num">${f.numero_facture}</div>
                  <div class="facture-patient">${f.patient.prenom} ${f.patient.nom}</div>
                  <div class="facture-date">${new Date(f.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
                <div style="margin-left:auto;display:flex;align-items:center;gap:12px;">
                  <span class="badge ${
                    f.statut === 'payee' ? 'badge-payee' :
                    f.statut === 'impayee' ? 'badge-impayee' :
                    f.statut === 'en_attente' ? 'badge-attente' : 'badge-partielle'
                  }">${f.statut.replace(/_/g,' ')}</span>
                  <div class="facture-montant">${formatFCFA(f.total_ttc)}</div>
                  <a href="/caissier/facture/${f.id}" class="btn-sm">Encaisser</a>
                </div>
              </div>`).join('')}
           </div>`}
    </div>
  </div>
</div>
<script>
  function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('open'); }
  function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('open'); }
</script>
</body>
</html>`
}

