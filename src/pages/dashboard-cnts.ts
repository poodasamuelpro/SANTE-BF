/**
 * src/pages/dashboard-cnts.ts
 * SantéBF — Dashboard CNTS (Centre National de Transfusion Sanguine)
 * Rôle : cnts_agent
 */
import type { AuthProfile } from '../lib/supabase'

interface CNTSData {
  stats: {
    donneursTotal:    number
    donneursDispos:   number
    urgencesEnCours:  number
    donsThisMonth:    number
  }
  parGroupe: Array<{ groupe: string; rhesus: string; count: number }>
}

export function dashboardCNTSPage(profil: AuthProfile, data: CNTSData): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const ini   = `${(profil.prenom||'?').charAt(0)}${(profil.nom||'?').charAt(0)}`

  const groupeCards = data.parGroupe.map(g => `
    <div style="background:linear-gradient(135deg,#7f0000,#B71C1C);border-radius:12px;
      padding:14px;text-align:center;color:white;cursor:pointer;"
      onclick="window.location='/cnts/recherche?gs=${g.groupe}&rh=${encodeURIComponent(g.rhesus)}'">
      <div style="font-family:'Fraunces',serif;font-size:28px;font-weight:900;">${g.groupe}${g.rhesus}</div>
      <div style="font-size:12px;opacity:.8;margin-top:4px;">${g.count} donneur${g.count>1?'s':''}</div>
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CNTS — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>
:root{
  --rouge:#B71C1C;--rouge-f:#7f0000;--rouge-c:#FFEBEE;
  --vert:#1A6B3C;--vert-c:#E8F5EE;
  --texte:#0f1923;--soft:#5a6a78;
  --bg:#FFF5F5;--blanc:#fff;--bordure:#FFCDD2;
  --sh:0 2px 10px rgba(0,0,0,.06);--r:16px;--rs:10px;
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);}
.layout{display:flex;min-height:100vh;}
.sidebar{width:250px;background:#3D0000;position:fixed;top:0;left:0;height:100vh;
  z-index:200;display:flex;flex-direction:column;transition:transform .3s;}
.sb-brand{padding:22px 18px 16px;border-bottom:1px solid rgba(255,255,255,.08);}
.sb-brand-row{display:flex;align-items:center;gap:10px;}
.sb-brand-ico{width:36px;height:36px;background:var(--rouge);border-radius:9px;
  display:flex;align-items:center;justify-content:center;font-size:17px;}
.sb-brand-name{font-family:'Fraunces',serif;font-size:16px;color:white;}
.sb-brand-sub{font-size:9px;color:rgba(255,255,255,.3);letter-spacing:1px;text-transform:uppercase;margin-top:3px;padding-left:46px;}
.sb-nav{flex:1;padding:10px 8px;overflow-y:auto;}
.sb-lbl{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,.25);padding:10px 10px 5px;}
.sb-link{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:var(--rs);text-decoration:none;color:rgba(255,255,255,.6);font-size:13.5px;font-weight:500;margin-bottom:2px;transition:all .2s;}
.sb-link:hover{background:rgba(255,255,255,.08);color:white;}
.sb-link.active{background:var(--rouge);color:white;font-weight:700;}
.sb-footer{padding:12px 8px;border-top:1px solid rgba(255,255,255,.08);}
.user-card{display:flex;align-items:center;gap:10px;padding:10px;border-radius:var(--rs);background:rgba(255,255,255,.06);}
.user-av{width:34px;height:34px;background:var(--rouge);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;flex-shrink:0;}
.user-name{font-size:12.5px;font-weight:600;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.user-role{font-size:10.5px;color:rgba(255,255,255,.35);}
.logout-a{width:26px;height:26px;background:rgba(255,255,255,.06);border-radius:6px;color:rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;font-size:13px;text-decoration:none;flex-shrink:0;}
.logout-a:hover{background:rgba(255,80,80,.2);color:#ff8080;}
.main{margin-left:250px;flex:1;display:flex;flex-direction:column;}
.topbar{height:60px;background:var(--blanc);border-bottom:1px solid var(--bordure);display:flex;align-items:center;justify-content:space-between;padding:0 26px;position:sticky;top:0;z-index:100;}
.topbar-left{display:flex;align-items:center;gap:14px;}
.menu-btn{display:none;background:none;border:none;font-size:22px;cursor:pointer;color:var(--texte);}
.topbar-title{font-family:'Fraunces',serif;font-size:19px;}
.topbar-sub{font-size:12px;color:var(--soft);margin-top:1px;}
.datetime-pill{background:var(--rouge-c);padding:6px 14px;border-radius:20px;font-size:12.5px;font-weight:600;color:var(--rouge-f);}
.content{padding:24px;}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px;}
.stat-card{background:var(--blanc);border-radius:var(--r);padding:18px;box-shadow:var(--sh);border:1px solid var(--bordure);text-align:center;position:relative;overflow:hidden;}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--rouge);}
.stat-ico{font-size:24px;margin-bottom:8px;}
.stat-val{font-family:'Fraunces',serif;font-size:32px;color:var(--rouge);}
.stat-lbl{font-size:12px;color:var(--soft);margin-top:3px;}
.actions-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px;}
.action-card{background:var(--blanc);border-radius:var(--r);padding:16px;text-align:center;text-decoration:none;color:var(--texte);border:1px solid var(--bordure);transition:all .2s;box-shadow:var(--sh);}
.action-card:hover{border-color:var(--rouge);transform:translateY(-1px);}
.ac-ico{font-size:26px;margin-bottom:7px;}
.ac-lbl{font-size:13px;font-weight:600;}
.card{background:var(--blanc);border-radius:var(--r);border:1px solid var(--bordure);overflow:hidden;box-shadow:var(--sh);margin-bottom:16px;}
.card-head{padding:14px 18px;border-bottom:1px solid var(--bordure);display:flex;justify-content:space-between;align-items:center;}
.card-head h3{font-family:'Fraunces',serif;font-size:16px;}
.card-body{padding:16px;}
.gs-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.sb-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:150;}
.sb-overlay.open{display:block;}
@media(max-width:1100px){.stats-grid,.actions-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:768px){.sidebar{transform:translateX(-100%);}.sidebar.open{transform:translateX(0);}.main{margin-left:0;}.menu-btn{display:flex;}.content{padding:14px;}.stats-grid,.actions-grid{grid-template-columns:1fr 1fr;}.gs-grid{grid-template-columns:repeat(2,1fr);}}
</style>
</head>
<body>
<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="sb-brand">
      <div class="sb-brand-row">
        <div class="sb-brand-ico">🩸</div>
        <div class="sb-brand-name">CNTS BF</div>
      </div>
      <div class="sb-brand-sub">Centre National Transfusion Sanguine</div>
    </div>
    <nav class="sb-nav">
      <div class="sb-lbl">Principal</div>
      <a href="/dashboard/cnts"  class="sb-link active"><span>⊞</span> Tableau de bord</a>
      <div class="sb-lbl">Donneurs</div>
      <a href="/cnts/donneurs"   class="sb-link"><span>👥</span> Liste donneurs</a>
      <a href="/cnts/recherche"  class="sb-link"><span>🔍</span> Rechercher</a>
      <div class="sb-lbl">Urgences</div>
      <a href="/cnts/urgence/nouvelle" class="sb-link"><span>🚨</span> Nouvelle urgence</a>
      <a href="/cnts/historique"       class="sb-link"><span>📋</span> Historique</a>
    </nav>
    <div class="sb-footer">
      <div class="user-card">
        <div class="user-av">${ini}</div>
        <div style="flex:1;min-width:0;">
          <div class="user-name">${profil.prenom} ${profil.nom}</div>
          <div class="user-role">Agent CNTS</div>
        </div>
        <a href="/auth/logout" class="logout-a">⏻</a>
      </div>
    </div>
  </aside>
  <div class="sb-overlay" id="sbOverlay" onclick="closeMenu()"></div>
  <div class="main">
    <div class="topbar">
      <div class="topbar-left">
        <button class="menu-btn" onclick="openMenu()">☰</button>
        <div>
          <div class="topbar-title">Bonjour, ${profil.prenom} 👋</div>
          <div class="topbar-sub">Centre National de Transfusion Sanguine</div>
        </div>
      </div>
      <span class="datetime-pill">🕐 ${heure} — ${date}</span>
    </div>
    <div class="content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-ico">🩸</div>
          <div class="stat-val">${data.stats.donneursTotal}</div>
          <div class="stat-lbl">Donneurs inscrits</div>
        </div>
        <div class="stat-card">
          <div class="stat-ico">✅</div>
          <div class="stat-val">${data.stats.donneursDispos}</div>
          <div class="stat-lbl">Disponibles</div>
        </div>
        <div class="stat-card">
          <div class="stat-ico">🚨</div>
          <div class="stat-val">${data.stats.urgencesEnCours}</div>
          <div class="stat-lbl">Urgences en cours</div>
        </div>
        <div class="stat-card">
          <div class="stat-ico">📅</div>
          <div class="stat-val">${data.stats.donsThisMonth}</div>
          <div class="stat-lbl">Dons ce mois</div>
        </div>
      </div>
      <div class="actions-grid">
        <a href="/cnts/urgence/nouvelle" class="action-card"><div class="ac-ico">🚨</div><div class="ac-lbl">Urgence</div></a>
        <a href="/cnts/recherche"        class="action-card"><div class="ac-ico">🔍</div><div class="ac-lbl">Rechercher</div></a>
        <a href="/cnts/donneurs"         class="action-card"><div class="ac-ico">👥</div><div class="ac-lbl">Donneurs</div></a>
        <a href="/cnts/historique"       class="action-card"><div class="ac-ico">📋</div><div class="ac-lbl">Historique</div></a>
      </div>
      <div class="card">
        <div class="card-head">
          <h3>🩸 Stock par groupe sanguin</h3>
          <a href="/cnts/recherche" style="font-size:12px;color:var(--rouge);font-weight:600;text-decoration:none;">Rechercher →</a>
        </div>
        <div class="card-body">
          ${data.parGroupe.length > 0
            ? `<div class="gs-grid">${groupeCards}</div>`
            : '<p style="text-align:center;color:var(--soft);font-style:italic;padding:20px;">Aucun donneur enregistré</p>'
          }
        </div>
      </div>
    </div>
  </div>
</div>
<script>
function openMenu(){document.getElementById('sidebar').classList.add('open');document.getElementById('sbOverlay').classList.add('open');}
function closeMenu(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sbOverlay').classList.remove('open');}
</script>
</body>
</html>`
}
