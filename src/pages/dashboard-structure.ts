/**
 * src/pages/dashboard-structure.ts
 * SantéBF — Dashboard Admin Structure
 *
 * CORRECTIONS vs version originale :
 *  1. Liens sidebar : /dashboard/structure/X → /structure/X (mount point réel)
 *  2. Liens actions rapides corrigés de même
 */
import { AuthProfile } from '../lib/supabase'

interface StructureData {
  structure: { nom: string; type: string; niveau: number }
  stats: {
    personnel:         number
    patientsJour:      number
    litsOccupes:       number
    litsTotal:         number
    consultationsJour: number
    recettesJour?:     number
    rdvJour?:          number
    hospitalisations?: number
  }
}

// ── CSS commun partagé ────────────────────────────────────────
const CSS = `
:root{
  --or:#C9A84C;--or-f:#a07a28;--or-c:#fdf6e3;--or-glow:rgba(201,168,76,0.15);
  --vert:#1A6B3C;--vert-c:#e8f5ee;
  --rouge:#B71C1C;--rouge-c:#fce8e8;
  --bleu:#1565C0;--bleu-c:#e3f2fd;
  --texte:#0f1923;--soft:#5a6a78;
  --bg:#fdf9ee;--blanc:#ffffff;--bordure:#ede8d5;
  --sh-sm:0 1px 4px rgba(0,0,0,.06);--sh-md:0 4px 20px rgba(0,0,0,.08);
  --r:16px;--rs:10px;
}
[data-theme=dark]{
  --bg:#0f1107;--blanc:#1a1c0e;--bordure:#2e3020;
  --texte:#f0efd8;--soft:#9a9a7a;--sh-sm:0 1px 4px rgba(0,0,0,.3);
}
[data-theme=dark] .sidebar{background:#0a0d00;}
[data-theme=dark] .topbar{background:var(--blanc);border-color:var(--bordure);}
[data-theme=dark] .stat-card{background:var(--blanc);border-color:var(--bordure);}
[data-theme=dark] .action-card{background:var(--blanc);border-color:var(--bordure);}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);}
.layout{display:flex;min-height:100vh;}

/* SIDEBAR */
.sidebar{width:250px;background:#1a1400;position:fixed;top:0;left:0;height:100vh;z-index:200;
  display:flex;flex-direction:column;transition:transform .3s;}
.sb-brand{padding:22px 18px 16px;border-bottom:1px solid rgba(255,255,255,.08);}
.sb-brand-row{display:flex;align-items:center;gap:10px;}
.sb-brand-icon{width:36px;height:36px;background:var(--or);border-radius:9px;
  display:flex;align-items:center;justify-content:center;font-size:17px;}
.sb-brand-name{font-family:'Fraunces',serif;font-size:18px;color:white;}
.sb-brand-sub{font-size:10px;color:rgba(255,255,255,.3);letter-spacing:1.2px;
  text-transform:uppercase;margin-top:4px;padding-left:46px;}
.sb-nav{flex:1;padding:10px 8px;overflow-y:auto;}
.sb-nav-label{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;
  color:rgba(255,255,255,.25);padding:10px 10px 5px;}
.sb-link{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:var(--rs);
  text-decoration:none;color:rgba(255,255,255,.6);font-size:13.5px;font-weight:500;
  margin-bottom:2px;transition:all .2s;}
.sb-link:hover{background:rgba(255,255,255,.08);color:white;}
.sb-link.active{background:var(--or);color:#1a1400;font-weight:700;}
.sb-ico{font-size:15px;width:18px;text-align:center;}
.sb-footer{padding:12px 8px;border-top:1px solid rgba(255,255,255,.08);}
.user-card{display:flex;align-items:center;gap:10px;padding:10px;
  border-radius:var(--rs);background:rgba(255,255,255,.06);}
.user-av{width:34px;height:34px;background:var(--or);border-radius:8px;
  display:flex;align-items:center;justify-content:center;font-size:13px;
  font-weight:700;color:#1a1400;flex-shrink:0;overflow:hidden;}
.user-av img{width:100%;height:100%;object-fit:cover;border-radius:8px;}
.user-info{flex:1;min-width:0;}
.user-name{font-size:12.5px;font-weight:600;color:white;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.user-role{font-size:10.5px;color:rgba(255,255,255,.35);}
.logout-a{width:26px;height:26px;background:rgba(255,255,255,.06);border-radius:6px;
  color:rgba(255,255,255,.4);cursor:pointer;display:flex;align-items:center;
  justify-content:center;font-size:13px;text-decoration:none;transition:all .2s;flex-shrink:0;}
.logout-a:hover{background:rgba(255,80,80,.2);color:#ff8080;}

/* MAIN */
.main{margin-left:250px;flex:1;display:flex;flex-direction:column;}
.topbar{height:60px;background:var(--blanc);border-bottom:1px solid var(--bordure);
  display:flex;align-items:center;justify-content:space-between;padding:0 26px;
  position:sticky;top:0;z-index:100;}
.topbar-left{display:flex;align-items:center;gap:14px;}
.menu-btn{display:none;background:none;border:none;font-size:22px;cursor:pointer;color:var(--texte);}
.topbar-title{font-family:'Fraunces',serif;font-size:19px;font-weight:600;}
.topbar-sub{font-size:12px;color:var(--soft);margin-top:1px;}
.topbar-right{display:flex;align-items:center;gap:10px;}
.datetime-pill{background:var(--or-c);padding:6px 14px;border-radius:20px;
  font-size:12.5px;font-weight:600;color:var(--or-f);}
.dark-btn{background:none;border:1px solid var(--bordure);border-radius:8px;
  padding:5px 10px;font-size:16px;cursor:pointer;color:var(--texte);}
.content{padding:26px;}

/* BANNER */
.structure-banner{background:linear-gradient(135deg,#1a1400,#3a2a00);
  border-radius:var(--r);padding:22px 26px;margin-bottom:22px;
  display:flex;align-items:center;justify-content:space-between;gap:16px;}
.structure-name{font-family:'Fraunces',serif;font-size:22px;color:white;margin-bottom:3px;}
.structure-meta{font-size:13px;color:rgba(255,255,255,.55);}
.structure-badge{background:var(--or);color:#1a1400;padding:7px 16px;
  border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;}

/* STATS */
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px;}
.stat-card{background:var(--blanc);border-radius:var(--r);padding:18px;
  box-shadow:var(--sh-sm);border:1px solid var(--bordure);position:relative;overflow:hidden;}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--or);}
.stat-icon{font-size:24px;margin-bottom:8px;}
.stat-val{font-family:'Fraunces',serif;font-size:34px;font-weight:600;color:var(--texte);line-height:1;margin-bottom:3px;}
.stat-val small{font-size:18px;color:var(--soft);}
.stat-lbl{font-size:12px;color:var(--soft);font-weight:500;}
.progress-wrap{margin-top:8px;}
.progress-bar{background:var(--bordure);border-radius:10px;height:7px;overflow:hidden;}
.progress-fill{height:100%;border-radius:10px;background:var(--vert);transition:width .3s;}
.progress-fill.warn{background:var(--or);}
.progress-fill.danger{background:var(--rouge);}
.progress-label{font-size:11px;color:var(--soft);margin-top:4px;}

/* ACTIONS */
.actions-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.action-card{background:var(--blanc);border-radius:var(--r);padding:18px;
  text-decoration:none;color:var(--texte);border:1px solid var(--bordure);
  display:flex;align-items:center;gap:14px;transition:all .2s;box-shadow:var(--sh-sm);}
.action-card:hover{border-color:var(--or);box-shadow:0 0 0 3px var(--or-glow),var(--sh-md);transform:translateY(-1px);}
.action-icon-wrap{width:44px;height:44px;background:var(--or-c);border-radius:10px;
  display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.action-label{font-size:13px;font-weight:600;}
.action-sub{font-size:11.5px;color:var(--soft);margin-top:2px;}

/* MOBILE */
.sb-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:150;}
.sb-overlay.open{display:block;}
@media(max-width:1100px){.stats-grid{grid-template-columns:repeat(2,1fr);}.actions-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:768px){
  .sidebar{transform:translateX(-100%);}
  .sidebar.open{transform:translateX(0);}
  .main{margin-left:0;}
  .menu-btn{display:flex;}
  .content{padding:14px;}
  .structure-banner{flex-direction:column;align-items:flex-start;}
  .stats-grid{grid-template-columns:1fr 1fr;}
  .actions-grid{grid-template-columns:1fr 1fr;}
}
`

function sbLinks(active = 'dashboard'): string {
  const links = [
    { href: '/dashboard/structure', ico: '⊞',  label: 'Tableau de bord', key: 'dashboard' },
    { href: '/structure/patients',   ico: '🧑‍⚕️', label: 'Patients',          key: 'patients'  },
    { href: '/structure/personnel',  ico: '👥', label: 'Personnel',        key: 'personnel' },
    { href: '/structure/services',   ico: '🏥', label: 'Services',         key: 'services'  },
    { href: '/structure/lits',       ico: '🛏️', label: 'Lits',             key: 'lits'      },
    { href: '/structure/hospitalisations', ico: '📋', label: 'Hospitalisations', key: 'hospit' },
    { href: '/structure/transferts', ico: '🔄', label: 'Transferts',       key: 'transferts'},
    { href: '/structure/statistiques', ico: '📊', label: 'Statistiques',   key: 'stats'     },
    { href: '/structure/finances',   ico: '💰', label: 'Finances',         key: 'finances'  },
    { href: '/structure/configuration', ico: '⚙️', label: 'Configuration', key: 'config'    },
    { href: '/structure/logs',       ico: '🔍', label: 'Logs d\'accès',    key: 'logs'      },
  ]
  const groups: [string, typeof links] = ['', []]
  const principal = links.slice(0, 1)
  const gestion   = links.slice(1, 6)
  const rapports  = links.slice(6, 8)
  const systeme   = links.slice(8)

  const render = (items: typeof links) =>
    items.map(l =>
      `<a href="${l.href}" class="sb-link${active === l.key ? ' active' : ''}">
        <span class="sb-ico">${l.ico}</span>${l.label}
      </a>`
    ).join('')

  return `
    <div class="sb-nav-label">Principal</div>
    ${render(principal)}
    <div class="sb-nav-label">Gestion</div>
    ${render(gestion)}
    <div class="sb-nav-label">Rapports</div>
    ${render(rapports)}
    <div class="sb-nav-label">Système</div>
    ${render(systeme)}
  `
}

const JS = `
var _dk=localStorage.getItem('santebf-theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
document.documentElement.setAttribute('data-theme',_dk);
setTimeout(function(){var b=document.getElementById('darkBtn');if(b)b.textContent=_dk==='dark'?'\u2600\uFE0F':'\uD83C\uDF19';},0);
function toggleDark(){var h=document.documentElement,d=h.getAttribute('data-theme')==='dark';h.setAttribute('data-theme',d?'light':'dark');document.getElementById('darkBtn').textContent=d?'\uD83C\uDF19':'\u2600\uFE0F';localStorage.setItem('santebf-theme',d?'light':'dark');}
function openMenu(){document.getElementById('sidebar').classList.add('open');document.getElementById('sbOverlay').classList.add('open');}
function closeMenu(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sbOverlay').classList.remove('open');}
`

// ── DASHBOARD PRINCIPAL ───────────────────────────────────────
export function dashboardStructurePage(profil: AuthProfile, data: StructureData): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const taux  = data.stats.litsTotal > 0
    ? Math.round((data.stats.litsOccupes / data.stats.litsTotal) * 100)
    : 0

  const ini    = `${(profil.prenom || '?').charAt(0)}${(profil.nom || '?').charAt(0)}`
  const avHtml = (profil as any).avatar_url
    ? `<img src="${(profil as any).avatar_url}" alt="">`
    : ini

  const fcfaFmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${data.structure.nom} — SantéBF Admin</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="layout">

  <aside class="sidebar" id="sidebar">
    <div class="sb-brand">
      <div class="sb-brand-row">
        <div class="sb-brand-icon">🏥</div>
        <div class="sb-brand-name">SantéBF</div>
      </div>
      <div class="sb-brand-sub">Administration</div>
    </div>
    <nav class="sb-nav">${sbLinks('dashboard')}</nav>
    <div class="sb-footer">
      <div class="user-card">
        <div class="user-av">${avHtml}</div>
        <div class="user-info">
          <div class="user-name">${profil.prenom} ${profil.nom}</div>
          <div class="user-role">Admin structure</div>
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
          <div class="topbar-sub">${data.structure.nom}</div>
        </div>
      </div>
      <div class="topbar-right">
        <span class="datetime-pill">🕐 ${heure} — ${date}</span>
        <button class="dark-btn" id="darkBtn" onclick="toggleDark()">🌙</button>
      </div>
    </div>

    <div class="content">

      <div class="structure-banner">
        <div>
          <div class="structure-name">${data.structure.nom}</div>
          <div class="structure-meta">${data.structure.type} — Niveau ${data.structure.niveau}</div>
        </div>
        <div class="structure-badge">✓ Structure active</div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-val">${data.stats.personnel}</div>
          <div class="stat-lbl">Personnel actif</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🩺</div>
          <div class="stat-val">${data.stats.patientsJour}</div>
          <div class="stat-lbl">Patients aujourd'hui</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-val">${data.stats.consultationsJour}</div>
          <div class="stat-lbl">Consultations</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🛏️</div>
          <div class="stat-val">${data.stats.litsOccupes}<small>/${data.stats.litsTotal}</small></div>
          <div class="stat-lbl">Lits occupés</div>
          <div class="progress-wrap">
            <div class="progress-bar">
              <div class="progress-fill ${taux >= 90 ? 'danger' : taux >= 75 ? 'warn' : ''}" style="width:${taux}%"></div>
            </div>
            <div class="progress-label">Taux d'occupation : ${taux}%</div>
          </div>
        </div>
        ${data.stats.recettesJour !== undefined ? `
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-val" style="font-size:22px;">${fcfaFmt(data.stats.recettesJour)}</div>
          <div class="stat-lbl">Recettes du jour</div>
        </div>` : ''}
        ${data.stats.rdvJour !== undefined ? `
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-val">${data.stats.rdvJour}</div>
          <div class="stat-lbl">RDV aujourd'hui</div>
        </div>` : ''}
        ${data.stats.hospitalisations !== undefined ? `
        <div class="stat-card">
          <div class="stat-icon">🏨</div>
          <div class="stat-val">${data.stats.hospitalisations}</div>
          <div class="stat-lbl">Hospitalisations en cours</div>
        </div>` : ''}
      </div>

      <div class="actions-grid">
        <a href="/structure/personnel" class="action-card">
          <div class="action-icon-wrap">👥</div>
          <div><div class="action-label">Personnel</div><div class="action-sub">Gérer les comptes</div></div>
        </a>
        <a href="/structure/services" class="action-card">
          <div class="action-icon-wrap">🏥</div>
          <div><div class="action-label">Services</div><div class="action-sub">Cardiologie, Urgences…</div></div>
        </a>
        <a href="/structure/lits" class="action-card">
          <div class="action-icon-wrap">🛏️</div>
          <div><div class="action-label">Lits</div><div class="action-sub">Occupation temps réel</div></div>
        </a>
        <a href="/structure/hospitalisations" class="action-card">
          <div class="action-icon-wrap">📋</div>
          <div><div class="action-label">Hospitalisations</div><div class="action-sub">En cours + alertes</div></div>
        </a>
        <a href="/structure/statistiques" class="action-card">
          <div class="action-icon-wrap">📊</div>
          <div><div class="action-label">Statistiques</div><div class="action-sub">Rapports & exports</div></div>
        </a>
        <a href="/structure/configuration" class="action-card">
          <div class="action-icon-wrap">⚙️</div>
          <div><div class="action-label">Configuration</div><div class="action-sub">Logo, tarifs, infos</div></div>
        </a>
      </div>
    </div>
  </div>
</div>

<script>${JS}</script>
</body>
</html>`
}

// ── PAGE LAYOUT PARTAGÉE ──────────────────────────────────────
// Utilisée par toutes les sous-pages (personnel, lits, services, etc.)
export function structureLayout(
  profil:   AuthProfile,
  titre:    string,
  activeKey: string,
  content:  string,
  succes?:  string,
  erreur?:  string
): string {
  const ini    = `${(profil.prenom || '?').charAt(0)}${(profil.nom || '?').charAt(0)}`
  const avHtml = (profil as any).avatar_url
    ? `<img src="${(profil as any).avatar_url}" alt="">`
    : ini

  const flashOk  = succes ? `<div class="flash-ok">✓ ${succes}</div>` : ''
  const flashErr = erreur ? `<div class="flash-err">⚠️ ${erreur}</div>` : ''

  const extraCSS = `
.wrap{max-width:1100px;margin:0 auto;}
.page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;}
.page-title{font-family:'Fraunces',serif;font-size:24px;}
.back-btn{display:inline-flex;align-items:center;gap:7px;color:var(--or-f);text-decoration:none;
  font-size:13px;font-weight:600;padding:8px 14px;background:var(--or-c);border-radius:var(--rs);}
.back-btn:hover{background:var(--or);color:#1a1400;}
.card{background:var(--blanc);border-radius:var(--r);padding:22px 26px;
  box-shadow:var(--sh-sm);border:1px solid var(--bordure);margin-bottom:14px;}
.card-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;}
.card-title{font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;}
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:var(--rs);
  font-size:13px;font-weight:700;text-decoration:none;border:none;cursor:pointer;font-family:inherit;}
.btn-or{background:var(--or);color:#1a1400;}
.btn-or:hover{background:var(--or-f);color:white;}
.btn-vert{background:var(--vert);color:white;}
.btn-rouge{background:var(--rouge-c);color:var(--rouge);}
.btn-soft{background:var(--bg);color:var(--texte);border:1px solid var(--bordure);}
table{width:100%;border-collapse:collapse;}
thead tr{background:var(--or-c);}
thead th{padding:11px 14px;text-align:left;font-size:11.5px;font-weight:700;
  color:var(--or-f);text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid var(--bordure);}
tbody tr{border-bottom:1px solid var(--bordure);}
tbody tr:hover{background:var(--or-c);}
tbody td{padding:11px 14px;font-size:14px;}
.badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;}
.b-vert{background:var(--vert-c);color:var(--vert);}
.b-rouge{background:var(--rouge-c);color:var(--rouge);}
.b-or{background:var(--or-c);color:var(--or-f);}
.b-gris{background:#f0f0f0;color:#666;}
.b-bleu{background:var(--bleu-c);color:var(--bleu);}
.empty{text-align:center;padding:36px;color:var(--soft);font-style:italic;font-size:13px;}
.flash-ok{background:var(--vert-c);color:var(--vert);border-radius:var(--rs);
  padding:11px 16px;margin-bottom:16px;font-weight:700;font-size:13px;}
.flash-err{background:var(--rouge-c);color:var(--rouge);border-radius:var(--rs);
  padding:11px 16px;margin-bottom:16px;font-size:13px;}
.form-group{margin-bottom:14px;}
.form-label{display:block;font-size:12px;font-weight:700;color:var(--texte);margin-bottom:5px;}
input,select,textarea{width:100%;padding:11px 14px;border:1.5px solid var(--bordure);
  border-radius:var(--rs);font-size:14px;font-family:inherit;outline:none;background:#fafaf5;}
input:focus,select:focus,textarea:focus{border-color:var(--or);background:white;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
.alert-box{background:var(--rouge-c);border-left:4px solid var(--rouge);border-radius:var(--rs);
  padding:12px 15px;margin-bottom:12px;font-size:13px;color:#7f1d1d;line-height:1.5;}
.info-box{background:var(--bleu-c);border-left:4px solid var(--bleu);border-radius:var(--rs);
  padding:12px 15px;margin-bottom:12px;font-size:13px;color:#1a3a6b;}
@media(max-width:640px){.grid2,.grid3{grid-template-columns:1fr;}}
`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titre} — SantéBF Admin</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>${CSS}${extraCSS}</style>
</head>
<body>
<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="sb-brand">
      <div class="sb-brand-row">
        <div class="sb-brand-icon">🏥</div>
        <div class="sb-brand-name">SantéBF</div>
      </div>
      <div class="sb-brand-sub">Administration</div>
    </div>
    <nav class="sb-nav">${sbLinks(activeKey)}</nav>
    <div class="sb-footer">
      <div class="user-card">
        <div class="user-av">${avHtml}</div>
        <div class="user-info">
          <div class="user-name">${profil.prenom} ${profil.nom}</div>
          <div class="user-role">Admin structure</div>
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
        <div><div class="topbar-title">${titre}</div></div>
      </div>
      <div class="topbar-right">
        <button class="dark-btn" id="darkBtn" onclick="toggleDark()">🌙</button>
        <a href="/auth/logout" style="font-size:12px;color:var(--soft);text-decoration:none;
          padding:6px 10px;border:1px solid var(--bordure);border-radius:8px;">⏻ Déco</a>
      </div>
    </div>
    <div class="content">
      <div class="wrap">
        ${flashOk}${flashErr}
        ${content}
      </div>
    </div>
  </div>
</div>
<script>${JS}</script>
</body>
</html>`
}
