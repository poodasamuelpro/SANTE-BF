/**
 * src/pages/dashboard-pharmacien.ts
 * SantéBF — Dashboard Pharmacien
 *
 * CORRECTIONS vs version originale :
 *  1. Sidebar : /pharmacien/delivrance → /pharmacien/scanner (route réelle)
 *  2. Sidebar : /pharmacien/stock → retiré (pas dans le schéma DB v1)
 *  3. Sidebar : /pharmacien/alertes → /pharmacien/stats
 *  4. Actions : liens cohérents avec routes pharmacien.ts
 *  5. data.ordonnances → interface corrigée (o.patient.nom, o.medecin.nom)
 *  6. Couleur : orange E65100 (pharmacien) au lieu de violet
 *  7. Responsive complet + dark mode + retour arrière
 */
import { AuthProfile } from '../lib/supabase'

interface PharmacienData {
  ordonnances: Array<{
    id: string
    numero_ordonnance: string
    patient:  { nom: string; prenom: string }
    medecin:  { nom: string; prenom: string }
    statut:   string
    created_at: string
  }>
  stats: {
    ordonnancesJour: number
    enAttente:       number
    delivrees:       number
    stockAlertes:    number
  }
}

export function dashboardPharmacienPage(profil: AuthProfile, data: PharmacienData): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const ini   = `${(profil.prenom || '?').charAt(0)}${(profil.nom || '?').charAt(0)}`

  const statutBadge = (s: string) => {
    const m: Record<string,string> = {
      active:                 'background:#FFF3E0;color:#E65100',
      partiellement_delivree: 'background:#FFF9C4;color:#F57F17',
      delivree:               'background:#E8F5E9;color:#1A6B3C',
      expiree:                'background:#FFEBEE;color:#B71C1C',
      annulee:                'background:#F5F5F5;color:#9E9E9E',
    }
    return `<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;${m[s]||m.expiree}">${s.replace(/_/g,' ')}</span>`
  }

  const rows = data.ordonnances.map(o => {
    const dt = new Date(o.created_at).toLocaleDateString('fr-FR')
    return `<tr>
      <td><strong style="color:#E65100;font-size:13px;">${o.numero_ordonnance}</strong></td>
      <td><div style="font-weight:600;">${o.patient.prenom} ${o.patient.nom}</div></td>
      <td style="font-size:13px;color:#5a6a78;">Dr. ${o.medecin.prenom} ${o.medecin.nom}</td>
      <td style="font-size:12px;color:#9E9E9E;">${dt}</td>
      <td>${statutBadge(o.statut)}</td>
      <td>
        <a href="/pharmacien/ordonnances?qr=${o.id}" style="background:#E65100;color:white;
          padding:6px 12px;border-radius:7px;font-size:12px;font-weight:700;text-decoration:none;">
          💊 Délivrer
        </a>
      </td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>SantéBF — Pharmacie</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>
:root{
  --ph:#E65100;--ph-f:#BF360C;--ph-c:#FFF3E0;--ph-glow:rgba(230,81,0,0.12);
  --vert:#1A6B3C;--vert-c:#E8F5EE;
  --rouge:#B71C1C;--rouge-c:#FFEBEE;
  --texte:#0f1923;--soft:#5a6a78;
  --bg:#FFF8F2;--blanc:#fff;--bordure:#FCE4D6;
  --sh-sm:0 1px 4px rgba(0,0,0,.06);--sh-md:0 4px 20px rgba(0,0,0,.08);
  --r:16px;--rs:10px;
}
[data-theme=dark]{
  --bg:#1a0d00;--blanc:#221100;--bordure:#3a2000;
  --texte:#f0ebe0;--soft:#9a8a7a;
}
[data-theme=dark] .sidebar{background:#1a0500;}
[data-theme=dark] .topbar{background:var(--blanc);border-color:var(--bordure);}
[data-theme=dark] .stat-card,[data-theme=dark] .table-wrap,[data-theme=dark] .action-card{background:var(--blanc);border-color:var(--bordure);}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);}
.layout{display:flex;min-height:100vh;}
.sidebar{width:250px;background:#2D1200;position:fixed;top:0;left:0;height:100vh;
  z-index:200;display:flex;flex-direction:column;transition:transform .3s;}
.sb-brand{padding:22px 18px 16px;border-bottom:1px solid rgba(255,255,255,.08);}
.sb-brand-row{display:flex;align-items:center;gap:10px;}
.sb-brand-ico{width:36px;height:36px;background:var(--ph);border-radius:9px;
  display:flex;align-items:center;justify-content:center;font-size:17px;}
.sb-brand-name{font-family:'Fraunces',serif;font-size:18px;color:white;}
.sb-brand-sub{font-size:10px;color:rgba(255,255,255,.3);letter-spacing:1.2px;
  text-transform:uppercase;margin-top:4px;padding-left:46px;}
.sb-nav{flex:1;padding:10px 8px;overflow-y:auto;}
.sb-lbl{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;
  color:rgba(255,255,255,.25);padding:10px 10px 5px;}
.sb-link{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:var(--rs);
  text-decoration:none;color:rgba(255,255,255,.6);font-size:13.5px;font-weight:500;
  margin-bottom:2px;transition:all .2s;}
.sb-link:hover{background:rgba(255,255,255,.08);color:white;}
.sb-link.active{background:var(--ph);color:white;font-weight:700;}
.sb-ico{font-size:15px;width:18px;text-align:center;}
.sb-footer{padding:12px 8px;border-top:1px solid rgba(255,255,255,.08);}
.user-card{display:flex;align-items:center;gap:10px;padding:10px;
  border-radius:var(--rs);background:rgba(255,255,255,.06);}
.user-av{width:34px;height:34px;background:var(--ph);border-radius:8px;
  display:flex;align-items:center;justify-content:center;font-size:12px;
  font-weight:700;color:white;flex-shrink:0;}
.user-info{flex:1;min-width:0;}
.user-name{font-size:12.5px;font-weight:600;color:white;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.user-role{font-size:10.5px;color:rgba(255,255,255,.35);}
.logout-a{width:26px;height:26px;background:rgba(255,255,255,.06);border-radius:6px;
  color:rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;
  font-size:13px;text-decoration:none;transition:all .2s;flex-shrink:0;}
.logout-a:hover{background:rgba(255,80,80,.2);color:#ff8080;}
.main{margin-left:250px;flex:1;display:flex;flex-direction:column;}
.topbar{height:60px;background:var(--blanc);border-bottom:1px solid var(--bordure);
  display:flex;align-items:center;justify-content:space-between;padding:0 26px;
  position:sticky;top:0;z-index:100;}
.topbar-left{display:flex;align-items:center;gap:14px;}
.menu-btn{display:none;background:none;border:none;font-size:22px;cursor:pointer;color:var(--texte);}
.topbar-title{font-family:'Fraunces',serif;font-size:19px;font-weight:600;}
.topbar-sub{font-size:12px;color:var(--soft);margin-top:1px;}
.topbar-right{display:flex;align-items:center;gap:10px;}
.datetime-pill{background:var(--ph-c);padding:6px 14px;border-radius:20px;
  font-size:12.5px;font-weight:600;color:var(--ph-f);}
.dark-btn{background:none;border:1px solid var(--bordure);border-radius:8px;
  padding:5px 10px;font-size:16px;cursor:pointer;color:var(--texte);}
.content{padding:24px;}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px;}
.stat-card{background:var(--blanc);border-radius:var(--r);padding:18px;
  box-shadow:var(--sh-sm);border:1px solid var(--bordure);position:relative;overflow:hidden;}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--ph);}
.stat-ico{font-size:24px;margin-bottom:8px;}
.stat-val{font-family:'Fraunces',serif;font-size:34px;font-weight:600;line-height:1;margin-bottom:3px;}
.stat-lbl{font-size:12px;color:var(--soft);}
.actions-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px;}
.action-card{background:var(--blanc);border-radius:var(--r);padding:18px;text-align:center;
  text-decoration:none;color:var(--texte);border:1px solid var(--bordure);
  transition:all .2s;box-shadow:var(--sh-sm);}
.action-card:hover{border-color:var(--ph);box-shadow:0 0 0 3px var(--ph-glow),var(--sh-md);transform:translateY(-1px);}
.action-ico{font-size:26px;margin-bottom:7px;}
.action-lbl{font-size:13px;font-weight:600;}
.table-wrap{background:var(--blanc);border-radius:var(--r);border:1px solid var(--bordure);
  overflow:hidden;box-shadow:var(--sh-sm);}
.table-head{padding:14px 18px;border-bottom:1px solid var(--bordure);
  display:flex;justify-content:space-between;align-items:center;}
.table-head h3{font-family:'Fraunces',serif;font-size:16px;}
.table-head a{font-size:12px;color:var(--ph);font-weight:600;text-decoration:none;}
table{width:100%;border-collapse:collapse;}
thead tr{background:var(--ph-c);}
th{padding:10px 14px;text-align:left;font-size:11px;font-weight:700;
  color:var(--ph-f);text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid var(--bordure);}
td{padding:12px 14px;font-size:14px;border-bottom:1px solid var(--bordure);}
tr:hover td{background:#fff8f5;}
tr:last-child td{border-bottom:none;}
.empty{padding:32px;text-align:center;color:var(--soft);font-style:italic;}
.sb-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:150;}
.sb-overlay.open{display:block;}
@media(max-width:1100px){.stats-grid,.actions-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:768px){
  .sidebar{transform:translateX(-100%);}
  .sidebar.open{transform:translateX(0);}
  .main{margin-left:0;}
  .menu-btn{display:flex;}
  .content{padding:14px;}
  .stats-grid,.actions-grid{grid-template-columns:1fr 1fr;}
  th:nth-child(3),td:nth-child(3),
  th:nth-child(4),td:nth-child(4){display:none;}
}
</style>
</head>
<body>
<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="sb-brand">
      <div class="sb-brand-row">
        <div class="sb-brand-ico">💊</div>
        <div class="sb-brand-name">SantéBF</div>
      </div>
      <div class="sb-brand-sub">Pharmacie</div>
    </div>
    <nav class="sb-nav">
      <div class="sb-lbl">Principal</div>
      <a href="/dashboard/pharmacien" class="sb-link active"><span class="sb-ico">⊞</span> Tableau de bord</a>
      <div class="sb-lbl">Ordonnances</div>
      <a href="/pharmacien/scanner"   class="sb-link"><span class="sb-ico">📷</span> Scanner QR</a>
      <a href="/pharmacien/ordonnances" class="sb-link"><span class="sb-ico">💊</span> Liste active</a>
      <a href="/pharmacien/partielles"  class="sb-link"><span class="sb-ico">⏳</span> Partielles</a>
      <a href="/pharmacien/historique"  class="sb-link"><span class="sb-ico">📚</span> Historique</a>
      <div class="sb-lbl">Rapports</div>
      <a href="/pharmacien/stats" class="sb-link"><span class="sb-ico">📊</span> Statistiques</a>
    </nav>
    <div class="sb-footer">
      <div class="user-card">
        <div class="user-av">${ini}</div>
        <div class="user-info">
          <div class="user-name">${profil.prenom} ${profil.nom}</div>
          <div class="user-role">Pharmacien(ne)</div>
        </div>
        <a href="/auth/logout" class="logout-a" title="Déconnexion">⏻</a>
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
          <div class="topbar-sub">Espace pharmacie</div>
        </div>
      </div>
      <div class="topbar-right">
        <span class="datetime-pill">🕐 ${heure} — ${date}</span>
        <button class="dark-btn" id="darkBtn" onclick="toggleDark()">🌙</button>
      </div>
    </div>
    <div class="content">

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-ico">📋</div>
          <div class="stat-val">${data.stats.ordonnancesJour}</div>
          <div class="stat-lbl">Ordonnances du jour</div>
        </div>
        <div class="stat-card">
          <div class="stat-ico">⏳</div>
          <div class="stat-val">${data.stats.enAttente}</div>
          <div class="stat-lbl">En attente</div>
        </div>
        <div class="stat-card">
          <div class="stat-ico">✅</div>
          <div class="stat-val" style="color:var(--vert);">${data.stats.delivrees}</div>
          <div class="stat-lbl">Délivrées aujourd'hui</div>
        </div>
        <div class="stat-card">
          <div class="stat-ico">⚠️</div>
          <div class="stat-val">${data.stats.stockAlertes}</div>
          <div class="stat-lbl">Alertes</div>
        </div>
      </div>

      <!-- Actions rapides -->
      <div class="actions-grid">
        <a href="/pharmacien/scanner"    class="action-card"><div class="action-ico">📷</div><div class="action-lbl">Scanner QR</div></a>
        <a href="/pharmacien/ordonnances" class="action-card"><div class="action-ico">💊</div><div class="action-lbl">Ordonnances</div></a>
        <a href="/pharmacien/partielles"  class="action-card"><div class="action-ico">⏳</div><div class="action-lbl">Partielles</div></a>
        <a href="/pharmacien/stats"       class="action-card"><div class="action-ico">📊</div><div class="action-lbl">Statistiques</div></a>
      </div>

      <!-- Tableau ordonnances actives -->
      <div class="table-wrap">
        <div class="table-head">
          <h3>💊 Ordonnances actives (${data.ordonnances.length})</h3>
          <a href="/pharmacien/ordonnances">Voir tout →</a>
        </div>
        ${data.ordonnances.length === 0
          ? '<div class="empty">Aucune ordonnance active en ce moment</div>'
          : `<table>
              <thead><tr><th>N° Ordonnance</th><th>Patient</th><th>Médecin</th><th>Date</th><th>Statut</th><th>Action</th></tr></thead>
              <tbody>${rows}</tbody>
             </table>`
        }
      </div>

    </div>
  </div>
</div>
<script>
var _dk=localStorage.getItem('santebf-theme')||(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
document.documentElement.setAttribute('data-theme',_dk);
setTimeout(function(){var b=document.getElementById('darkBtn');if(b)b.textContent=_dk==='dark'?'☀️':'🌙';},0);
function toggleDark(){var h=document.documentElement,d=h.getAttribute('data-theme')==='dark';h.setAttribute('data-theme',d?'light':'dark');document.getElementById('darkBtn').textContent=d?'🌙':'☀️';localStorage.setItem('santebf-theme',d?'light':'dark');}
function openMenu(){document.getElementById('sidebar').classList.add('open');document.getElementById('sbOverlay').classList.add('open');}
function closeMenu(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sbOverlay').classList.remove('open');}
</script>
</body>
</html>`
}
