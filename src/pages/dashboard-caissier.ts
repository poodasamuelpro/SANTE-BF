/**
 * src/pages/dashboard-caissier.ts
 * SantéBF — Dashboard Caissier
 *
 * CORRECTIONS vs version originale :
 *  1. Import formatFCFA depuis '../lib/format' (pas '../utils/format' qui n'existe pas)
 *  2. Sidebar : /caissier/encaissement → /caissier/facture/nouvelle (route réelle)
 *  3. Sidebar : /caissier/recherche   → /caissier/factures?statut=impayee
 *  4. Sidebar : /caissier/historique  → /caissier/factures?statut=all
 *  5. Sidebar : /caissier/cloture     → /caissier/rapport
 *  6. Actions : liens identiques sidebar
 *  7. Lien facture item → /caissier/factures/:id (pas /caissier/facture/:id)
 *  8. Couleur rouge B71C1C (caissier)
 *  9. Dark mode + responsive complet
 * 10. formatFCFA implémenté localement (pas de dépendance externe)
 */
import { AuthProfile } from '../lib/supabase'

interface CaissierData {
  factures: Array<{
    id:              string
    numero_facture:  string
    patient:         { nom: string; prenom: string }
    montant_patient: number
    total_ttc:       number
    statut:          string
    created_at:      string
  }>
  stats: {
    facturesJour: number
    impayees:     number
    recetteJour:  number
    attente:      number
  }
}

const fcfa = (n: number) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA'

export function dashboardCaissierPage(profil: AuthProfile, data: CaissierData): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const ini   = `${(profil.prenom || '?').charAt(0)}${(profil.nom || '?').charAt(0)}`

  const statutBadge = (s: string) => {
    const m: Record<string,string> = {
      payee:              'background:#E8F5E9;color:#1A6B3C',
      impayee:            'background:#FFEBEE;color:#B71C1C',
      partiellement_payee:'background:#FFF3E0;color:#E65100',
      annulee:            'background:#F5F5F5;color:#9E9E9E',
    }
    return `<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;${m[s]||m.impayee}">${s.replace(/_/g,' ')}</span>`
  }

  const items = data.factures.map(f => {
    const dt = new Date(f.created_at).toLocaleDateString('fr-FR')
    const btnEncaisser = f.statut === 'impayee'
      ? `<a href="/caissier/factures/${f.id}" style="background:#1A6B3C;color:white;padding:6px 12px;border-radius:7px;font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap;">💳 Encaisser</a>`
      : `<a href="/caissier/factures/${f.id}" style="background:#f0f4f8;color:#374151;padding:6px 12px;border-radius:7px;font-size:12px;font-weight:600;text-decoration:none;">Voir →</a>`
    return `<div style="background:var(--blanc);border-radius:12px;padding:14px 16px;
      border:1px solid var(--bordure);display:flex;align-items:center;gap:14px;
      box-shadow:var(--sh-sm);transition:all .2s;cursor:pointer;"
      onmouseover="this.style.borderColor='var(--cs)';this.style.transform='translateX(2px)'"
      onmouseout="this.style.borderColor='var(--bordure)';this.style.transform=''">
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Fraunces',serif;font-size:13px;color:var(--cs);font-weight:600;">${f.numero_facture}</div>
        <div style="font-size:14px;font-weight:600;margin-top:1px;">${f.patient.prenom} ${f.patient.nom}</div>
        <div style="font-size:11px;color:var(--soft);margin-top:1px;">${dt}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;">
        ${statutBadge(f.statut)}
        <div style="font-family:'Fraunces',serif;font-size:15px;font-weight:600;color:var(--vert);">${fcfa(f.total_ttc)}</div>
        ${btnEncaisser}
      </div>
    </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>SantéBF — Caisse</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>
:root{
  --cs:#B71C1C;--cs-f:#7f0000;--cs-c:#FFEBEE;--cs-glow:rgba(183,28,28,0.12);
  --vert:#1A6B3C;--vert-c:#E8F5EE;
  --or:#C9A84C;--or-c:#FDF6E3;
  --texte:#0f1923;--soft:#5a6a78;
  --bg:#FFF5F5;--blanc:#fff;--bordure:#FFCDD2;
  --sh-sm:0 1px 4px rgba(0,0,0,.06);--sh-md:0 4px 20px rgba(0,0,0,.08);
  --r:16px;--rs:10px;
}
[data-theme=dark]{
  --bg:#1a0000;--blanc:#220000;--bordure:#3a0000;
  --texte:#f0e8e8;--soft:#9a7a7a;
}
[data-theme=dark] .sidebar{background:#180000;}
[data-theme=dark] .topbar{background:var(--blanc);border-color:var(--bordure);}
[data-theme=dark] .stat-card,[data-theme=dark] .section-wrap{background:var(--blanc);border-color:var(--bordure);}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);}
.layout{display:flex;min-height:100vh;}
.sidebar{width:250px;background:#2D0000;position:fixed;top:0;left:0;height:100vh;
  z-index:200;display:flex;flex-direction:column;transition:transform .3s;}
.sb-brand{padding:22px 18px 16px;border-bottom:1px solid rgba(255,255,255,.08);}
.sb-brand-row{display:flex;align-items:center;gap:10px;}
.sb-brand-ico{width:36px;height:36px;background:var(--or);border-radius:9px;
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
.sb-link.active{background:var(--cs);color:white;font-weight:700;}
.sb-ico{font-size:15px;width:18px;text-align:center;}
.sb-footer{padding:12px 8px;border-top:1px solid rgba(255,255,255,.08);}
.user-card{display:flex;align-items:center;gap:10px;padding:10px;
  border-radius:var(--rs);background:rgba(255,255,255,.06);}
.user-av{width:34px;height:34px;background:var(--or);border-radius:8px;
  display:flex;align-items:center;justify-content:center;font-size:12px;
  font-weight:700;color:#2D0000;flex-shrink:0;}
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
.datetime-pill{background:var(--cs-c);padding:6px 14px;border-radius:20px;
  font-size:12.5px;font-weight:600;color:var(--cs-f);}
.dark-btn{background:none;border:1px solid var(--bordure);border-radius:8px;
  padding:5px 10px;font-size:16px;cursor:pointer;color:var(--texte);}
.content{padding:24px;}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px;}
.stat-card{background:var(--blanc);border-radius:var(--r);padding:18px;
  box-shadow:var(--sh-sm);border:1px solid var(--bordure);position:relative;overflow:hidden;}
.stat-card.c-cs::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--cs);}
.stat-card.c-or::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--or);}
.stat-card.c-vert::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--vert);}
.stat-ico{font-size:24px;margin-bottom:8px;}
.stat-val{font-family:'Fraunces',serif;font-size:30px;font-weight:600;line-height:1;margin-bottom:3px;}
.stat-val.or{color:var(--or);}
.stat-val.vert{color:var(--vert);}
.stat-val.rouge{color:var(--cs);}
.stat-lbl{font-size:12px;color:var(--soft);}
.actions-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px;}
.action-card{background:var(--blanc);border-radius:var(--r);padding:18px;text-align:center;
  text-decoration:none;color:var(--texte);border:1px solid var(--bordure);
  transition:all .2s;box-shadow:var(--sh-sm);}
.action-card:hover{border-color:var(--cs);box-shadow:0 0 0 3px var(--cs-glow),var(--sh-md);transform:translateY(-1px);}
.action-ico{font-size:26px;margin-bottom:7px;}
.action-lbl{font-size:13px;font-weight:600;}
.section-wrap{background:var(--blanc);border-radius:var(--r);border:1px solid var(--bordure);
  overflow:hidden;box-shadow:var(--sh-sm);}
.section-head{padding:14px 18px;border-bottom:1px solid var(--bordure);
  display:flex;justify-content:space-between;align-items:center;}
.section-head h3{font-family:'Fraunces',serif;font-size:16px;}
.section-head a{font-size:12px;color:var(--cs);font-weight:600;text-decoration:none;}
.section-body{padding:14px;}
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
  .stats-grid{grid-template-columns:1fr 1fr;}
  .actions-grid{grid-template-columns:1fr 1fr;}
  .stat-val{font-size:24px;}
}
</style>
</head>
<body>
<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="sb-brand">
      <div class="sb-brand-row">
        <div class="sb-brand-ico">💵</div>
        <div class="sb-brand-name">SantéBF</div>
      </div>
      <div class="sb-brand-sub">Caisse</div>
    </div>
    <nav class="sb-nav">
      <div class="sb-lbl">Principal</div>
      <a href="/dashboard/caissier"      class="sb-link active"><span class="sb-ico">⊞</span> Tableau de bord</a>
      <div class="sb-lbl">Facturation</div>
      <a href="/caissier/facture/nouvelle" class="sb-link"><span class="sb-ico">➕</span> Nouvelle facture</a>
      <a href="/caissier/factures"         class="sb-link"><span class="sb-ico">💵</span> Liste factures</a>
      <a href="/caissier/factures?statut=impayee" class="sb-link"><span class="sb-ico">⏳</span> Impayées</a>
      <a href="/caissier/factures?statut=all"     class="sb-link"><span class="sb-ico">📜</span> Historique</a>
      <div class="sb-lbl">Rapport</div>
      <a href="/caissier/rapport"          class="sb-link"><span class="sb-ico">📊</span> Clôture caisse</a>
    </nav>
    <div class="sb-footer">
      <div class="user-card">
        <div class="user-av">${ini}</div>
        <div class="user-info">
          <div class="user-name">${profil.prenom} ${profil.nom}</div>
          <div class="user-role">Caissier(ère)</div>
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
          <div class="topbar-sub">Gestion de la caisse</div>
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
        <div class="stat-card c-cs">
          <div class="stat-ico">📋</div>
          <div class="stat-val">${data.stats.facturesJour}</div>
          <div class="stat-lbl">Factures aujourd'hui</div>
        </div>
        <div class="stat-card c-cs">
          <div class="stat-ico">⏳</div>
          <div class="stat-val rouge">${data.stats.impayees}</div>
          <div class="stat-lbl">Impayées</div>
        </div>
        <div class="stat-card c-or">
          <div class="stat-ico">💰</div>
          <div class="stat-val or">${fcfa(data.stats.recetteJour)}</div>
          <div class="stat-lbl">Recette du jour</div>
        </div>
        <div class="stat-card c-vert">
          <div class="stat-ico">🕐</div>
          <div class="stat-val">${data.stats.attente}</div>
          <div class="stat-lbl">Paiements partiels</div>
        </div>
      </div>

      <!-- Actions rapides -->
      <div class="actions-grid">
        <a href="/caissier/facture/nouvelle"        class="action-card"><div class="action-ico">➕</div><div class="action-lbl">Nouvelle facture</div></a>
        <a href="/caissier/factures?statut=impayee" class="action-card"><div class="action-ico">⏳</div><div class="action-lbl">Impayées</div></a>
        <a href="/caissier/rapport"                 class="action-card"><div class="action-ico">📊</div><div class="action-lbl">Rapport</div></a>
        <a href="/caissier/factures?statut=all"     class="action-card"><div class="action-ico">📜</div><div class="action-lbl">Historique</div></a>
      </div>

      <!-- Factures du jour -->
      <div class="section-wrap">
        <div class="section-head">
          <h3>💳 Factures du jour (${data.factures.length})</h3>
          <a href="/caissier/factures">Voir tout →</a>
        </div>
        <div class="section-body">
          ${data.factures.length === 0
            ? '<div class="empty">Aucune facture aujourd\'hui</div>'
            : `<div style="display:flex;flex-direction:column;gap:10px;">${items}</div>`
          }
        </div>
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
