/**
 * src/pages/dashboard-patient.ts
 * Layout : sidebar fixe PC/tablette, bottom nav mobile
 * Zéro template literal imbriqué — syntaxe TypeScript stricte
 */

// ── CSS commun ─────────────────────────────────────────────────
const CSS = `
:root{--bleu:#1565C0;--bleu-f:#0d47a1;--bleu-c:#e3f2fd;--vert:#1A6B3C;--vert-c:#e8f5ee;--rouge:#b71c1c;--rouge-c:#fce8e8;--or:#f59e0b;--or-c:#fff8e6;--texte:#0f1923;--soft:#5a6a78;--bg:#f0f4f8;--blanc:#fff;--bordure:#dde3ea;--sh:0 2px 10px rgba(0,0,0,.07);--r:16px;--rs:10px;}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);}
[data-theme=dark]{--bg:#0f172a;--blanc:#1e293b;--bordure:#334155;--texte:#f1f5f9;--soft:#94a3b8;--sh:0 2px 10px rgba(0,0,0,.4);}
[data-theme=dark] .sidebar{background:linear-gradient(180deg,#020617,#0f172a);}
[data-theme=dark] .topbar{background:linear-gradient(135deg,#020617,#0f172a);}
[data-theme=dark] .hero-card{background:linear-gradient(135deg,#020617,#0d47a1);}
[data-theme=dark] .rdv-card{background:linear-gradient(135deg,#0d47a1,#1565C0);}
[data-theme=dark] .sb-drawer{background:linear-gradient(180deg,#020617,#0f172a);}
.layout{display:flex;min-height:100vh;}
.sidebar{width:250px;flex-shrink:0;background:linear-gradient(180deg,var(--bleu-f),var(--bleu));display:flex;flex-direction:column;padding:20px 14px;position:sticky;top:0;height:100vh;overflow-y:auto;}
.sb-brand{font-family:'Fraunces',serif;font-size:20px;color:white;text-decoration:none;display:flex;align-items:center;gap:8px;margin-bottom:22px;}
.sb-user{text-align:center;margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,.15);}
.sb-avatar{width:64px;height:64px;border-radius:50%;border:3px solid rgba(255,255,255,.3);overflow:hidden;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:white;margin:0 auto 10px;cursor:pointer;}
.sb-avatar:hover{border-color:rgba(255,255,255,.6);}
.sb-avatar img{width:100%;height:100%;object-fit:cover;}
.sb-name{font-size:14px;font-weight:700;color:white;margin-bottom:2px;}
.sb-num{font-size:11px;color:rgba(255,255,255,.55);font-family:monospace;}
.sb-nav{flex:1;display:flex;flex-direction:column;gap:2px;}
.sb-link{display:flex;align-items:center;gap:10px;padding:10px 13px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600;color:rgba(255,255,255,.75);transition:all .2s;}
.sb-link:hover,.sb-link.active{background:rgba(255,255,255,.15);color:white;}
.sb-ico{font-size:17px;width:20px;text-align:center;}
.sb-bottom{margin-top:auto;padding-top:14px;border-top:1px solid rgba(255,255,255,.12);}
.sb-logout{display:flex;align-items:center;gap:10px;padding:10px 13px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600;color:rgba(255,255,255,.6);transition:all .2s;}
.sb-logout:hover{background:rgba(255,80,80,.2);color:white;}
.main{flex:1;display:flex;flex-direction:column;min-width:0;}
.topbar{background:var(--blanc);border-bottom:1px solid var(--bordure);height:56px;padding:0 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 1px 4px rgba(0,0,0,.05);}
.topbar-left{display:flex;align-items:center;gap:12px;}
.menu-btn{display:none;background:none;border:none;font-size:22px;cursor:pointer;color:var(--texte);padding:4px;}
.topbar-title{font-size:15px;font-weight:700;}
.topbar-right{display:flex;align-items:center;gap:10px;}
.topbar-date{font-size:12px;color:var(--soft);}
.topbar-time{font-size:14px;font-weight:700;color:var(--bleu);}
.dark-btn{background:none;border:1px solid var(--bordure);border-radius:8px;padding:5px 10px;font-size:16px;cursor:pointer;color:var(--texte);}
.content{padding:24px 28px;flex:1;}
.grid-main{display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start;}
.col-l,.col-r{display:flex;flex-direction:column;gap:14px;}
.card{background:var(--blanc);border-radius:var(--r);padding:20px;box-shadow:var(--sh);}
.card-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.card-title{font-size:14px;font-weight:700;display:flex;align-items:center;gap:7px;}
.card-link{font-size:12px;color:var(--bleu);text-decoration:none;font-weight:600;}
.hero-card{background:linear-gradient(135deg,var(--bleu-f),var(--bleu));border-radius:var(--r);padding:24px;color:white;}
.hero-greeting{font-size:12px;opacity:.7;margin-bottom:3px;}
.hero-name{font-family:'Fraunces',serif;font-size:24px;margin-bottom:3px;}
.hero-date{font-size:12px;opacity:.6;}
.hero-num{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.15);border-radius:20px;padding:5px 12px;font-size:12px;font-family:monospace;margin-top:10px;}
.stats-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.stat-card{background:var(--blanc);border-radius:var(--rs);padding:16px;box-shadow:var(--sh);text-align:center;}
.stat-icon{font-size:22px;margin-bottom:5px;}
.stat-val{font-family:'Fraunces',serif;font-size:28px;color:var(--bleu);}
.stat-lbl{font-size:11.5px;color:var(--soft);margin-top:2px;}
.rdv-card{background:linear-gradient(135deg,var(--bleu),#1976d2);border-radius:var(--r);padding:20px;color:white;}
.rdv-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:.7;margin-bottom:8px;}
.rdv-date{font-size:16px;font-weight:700;margin-bottom:3px;}
.rdv-med{font-size:13px;opacity:.9;}
.rdv-motif{font-size:12px;opacity:.7;margin-top:2px;}
.rdv-vide{font-size:13px;opacity:.75;text-align:center;padding:6px 0;}
.btn-white{display:block;background:rgba(255,255,255,.18);color:white;text-align:center;padding:9px;border-radius:var(--rs);text-decoration:none;font-size:12px;font-weight:700;margin-top:12px;border:1px solid rgba(255,255,255,.3);}
.actions-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.action-card{background:var(--blanc);border-radius:var(--rs);padding:16px 10px;text-align:center;text-decoration:none;color:var(--texte);box-shadow:var(--sh);transition:transform .2s;display:flex;flex-direction:column;align-items:center;gap:6px;border-bottom:3px solid var(--bleu);}
.action-card:hover{transform:translateY(-2px);}
.action-icon{font-size:26px;}
.action-lbl{font-size:12px;font-weight:700;}
.action-count{font-size:10.5px;color:var(--soft);}
.med-item{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--bordure);}
.med-item:last-child{border-bottom:none;}
.med-av{width:40px;height:40px;border-radius:50%;background:var(--vert-c);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--vert);flex-shrink:0;overflow:hidden;}
.med-av img{width:100%;height:100%;object-fit:cover;}
.med-info{flex:1;min-width:0;}
.med-name{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.med-spec{font-size:11px;color:var(--soft);}
.med-struct{font-size:11px;color:var(--bleu);}
.badge-ok{background:var(--vert-c);color:var(--vert);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;}
.ex-item{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bordure);}
.ex-item:last-child{border-bottom:none;}
.ex-info{flex:1;}
.ex-type{font-size:13px;font-weight:600;}
.ex-date{font-size:11px;color:var(--soft);}
.badge-dispo{background:var(--vert-c);color:var(--vert);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;}
.badge-wait{background:var(--or-c);color:#7a5500;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;}
.tags{display:flex;flex-wrap:wrap;gap:6px;}
.tag-r{background:var(--rouge-c);color:var(--rouge);border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;}
.tag-o{background:var(--or-c);color:#7a5500;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;}
.modal-bg{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:500;align-items:center;justify-content:center;padding:20px;}
.modal-bg.open{display:flex;}
.modal{background:var(--blanc);border-radius:var(--r);padding:28px 24px;width:100%;max-width:420px;}
.modal-title{font-family:'Fraunces',serif;font-size:20px;margin-bottom:5px;}
.modal-sub{font-size:13px;color:var(--soft);margin-bottom:18px;}
.ph-preview{width:80px;height:80px;border-radius:50%;background:var(--bleu-c);margin:0 auto 16px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;color:var(--bleu);}
.ph-preview img{width:100%;height:100%;object-fit:cover;}
.file-zone{border:2px dashed var(--bordure);border-radius:var(--rs);padding:16px;text-align:center;cursor:pointer;margin-bottom:14px;}
.file-zone:hover{border-color:var(--bleu);background:var(--bleu-c);}
.pb{display:none;height:5px;background:var(--bordure);border-radius:10px;overflow:hidden;margin-bottom:14px;}
.pb-fill{height:100%;background:var(--bleu);border-radius:10px;transition:width .3s;}
.msg-ok{background:var(--vert-c);color:var(--vert);border-radius:var(--rs);padding:9px;font-size:13px;font-weight:600;display:none;margin-bottom:12px;text-align:center;}
.msg-ko{background:var(--rouge-c);color:var(--rouge);border-radius:var(--rs);padding:9px;font-size:13px;display:none;margin-bottom:12px;}
.modal-btns{display:flex;gap:10px;}
.btn-cancel{flex:1;background:var(--bg);color:var(--texte);border:1px solid var(--bordure);padding:12px;border-radius:var(--rs);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;}
.btn-save{flex:2;background:var(--bleu);color:white;border:none;padding:12px;border-radius:var(--rs);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;}
.btn-save:disabled{opacity:.5;cursor:not-allowed;}
.bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--blanc);border-top:1px solid var(--bordure);z-index:150;box-shadow:0 -2px 10px rgba(0,0,0,.07);}
.nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;padding:9px 4px 7px;text-decoration:none;color:var(--soft);font-size:10px;font-weight:600;gap:2px;border:none;background:none;cursor:pointer;font-family:inherit;}
.nav-btn.active,.nav-btn:hover{color:var(--bleu);}
.nav-icon{font-size:20px;}
.sb-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;}
.sb-overlay.open{display:block;}
.sb-drawer{position:fixed;left:0;top:0;bottom:0;width:260px;background:linear-gradient(180deg,var(--bleu-f),var(--bleu));z-index:201;padding:20px 14px;transform:translateX(-100%);transition:transform .28s ease;display:flex;flex-direction:column;}
.sb-drawer.open{transform:translateX(0);}
@media(min-width:769px) and (max-width:1024px){.sidebar{width:200px;}.content{padding:18px 20px;}.grid-main{grid-template-columns:1fr 280px;}.actions-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:768px){.sidebar{display:none;}.menu-btn{display:block;}.topbar{padding:0 16px;}.content{padding:14px;}.grid-main{grid-template-columns:1fr;gap:12px;}.col-r{order:-1;}.stats-row{grid-template-columns:1fr 1fr;}.actions-grid{grid-template-columns:repeat(3,1fr);}body{padding-bottom:72px;}.bottom-nav{display:flex;}}
@media(max-width:380px){.actions-grid{grid-template-columns:repeat(2,1fr);}}
`

function sbLinks(): string {
  return `
    <a href="/dashboard/patient"      class="sb-link active"><span class="sb-ico">&#127968;</span>Tableau de bord</a>
    <a href="/patient/dossier"        class="sb-link"><span class="sb-ico">&#128203;</span>Mon dossier</a>
    <a href="/patient-pdf/ordonnances" class="sb-link"><span class="sb-ico">&#128138;</span>Ordonnances</a>
    <a href="/patient/rdv"            class="sb-link"><span class="sb-ico">&#128197;</span>Rendez-vous</a>
    <a href="/patient-pdf/examens"    class="sb-link"><span class="sb-ico">&#129514;</span>Examens</a>
    <a href="/patient/vaccinations"   class="sb-link"><span class="sb-ico">&#128137;</span>Vaccinations</a>
    <a href="/patient/consentements"  class="sb-link"><span class="sb-ico">&#128274;</span>Consentements</a>
    <a href="/patient/profil"         class="sb-link"><span class="sb-ico">&#128100;</span>Mon profil</a>`
}

// ── PAGE SANS DOSSIER ──────────────────────────────────────────
export function dashboardPatientSansDossierPage(profil: any): string {
  const ini       = `${(profil.prenom || '?').charAt(0)}${(profil.nom || '?').charAt(0)}`
  const avatarUrl = profil.avatar_url || ''
  const avHtml    = avatarUrl ? `<img src="${avatarUrl}" alt="">` : ini

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mon espace — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="layout">
  <aside class="sidebar">
    <a href="/dashboard/patient" class="sb-brand">&#127973; SantéBF</a>
    <div class="sb-user">
      <div class="sb-avatar">${avHtml}</div>
      <div class="sb-name">${profil.prenom} ${profil.nom}</div>
    </div>
    <nav class="sb-nav">${sbLinks()}</nav>
    <div class="sb-bottom"><a href="/auth/logout" class="sb-logout"><span class="sb-ico">&#9211;</span>Déconnexion</a></div>
  </aside>
  <div class="main">
    <div class="topbar">
      <div class="topbar-left">
        <button class="menu-btn" onclick="toggleMenu()">&#9776;</button>
        <span class="topbar-title">Mon espace</span>
      </div>
      <div class="topbar-right">
        <button class="dark-btn" id="darkBtn" onclick="toggleDark()">&#127769;</button>
        <a href="/auth/logout" style="font-size:12px;color:var(--soft);text-decoration:none;">&#9211;</a>
      </div>
    </div>
    <div class="content">
      <div style="max-width:560px;">
        <div class="hero-card" style="margin-bottom:16px;">
          <div class="hero-greeting">Bienvenue &#128075;</div>
          <div class="hero-name">${profil.prenom} ${profil.nom}</div>
          <div class="hero-date">Votre compte SantéBF est actif</div>
        </div>
        <div class="card">
          <div style="font-size:15px;font-weight:700;margin-bottom:14px;">&#128203; Comment accéder à votre dossier</div>
          <div style="display:flex;align-items:flex-start;gap:14px;padding:12px 0;border-bottom:1px solid var(--bordure);"><div style="width:34px;height:34px;border-radius:50%;background:var(--vert);color:white;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0;">&#10003;</div><div><div style="font-size:14px;font-weight:700;">Compte créé</div><div style="font-size:12.5px;color:var(--soft);">Votre compte SantéBF est actif.</div></div></div>
          <div style="display:flex;align-items:flex-start;gap:14px;padding:12px 0;border-bottom:1px solid var(--bordure);"><div style="width:34px;height:34px;border-radius:50%;background:#f59e0b;color:white;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0;">2</div><div><div style="font-size:14px;font-weight:700;">Aller à l'accueil d'une structure SantéBF</div><div style="font-size:12.5px;color:var(--soft);">Donnez votre email à l'agent d'accueil.</div></div></div>
          <div style="display:flex;align-items:flex-start;gap:14px;padding:12px 0;"><div style="width:34px;height:34px;border-radius:50%;background:#e5e7eb;color:#888;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0;">3</div><div><div style="font-size:14px;font-weight:700;">Accès à votre dossier médical</div><div style="font-size:12.5px;color:var(--soft);">Vos données apparaissent ici.</div></div></div>
        </div>
        <div style="background:var(--bleu-c);border-left:4px solid var(--bleu);border-radius:var(--rs);padding:14px 16px;font-size:13px;color:#1a3a6b;">
          Email à communiquer : <strong style="font-size:15px;color:var(--bleu);display:block;margin-top:4px;">${profil.email || '—'}</strong>
        </div>
      </div>
    </div>
  </div>
</div>
<nav class="bottom-nav">
  <a href="/dashboard/patient" class="nav-btn active"><span class="nav-icon">&#127968;</span>Accueil</a>
  <a href="/patient/dossier" class="nav-btn"><span class="nav-icon">&#128203;</span>Dossier</a>
  <a href="/patient/rdv" class="nav-btn"><span class="nav-icon">&#128197;</span>RDV</a>
  <a href="/patient/profil" class="nav-btn"><span class="nav-icon">&#128100;</span>Profil</a>
</nav>
<div class="sb-overlay" id="overlay" onclick="toggleMenu()"></div>
<div class="sb-drawer" id="drawer">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><span style="font-family:'Fraunces',serif;font-size:18px;color:white;">&#127973; SantéBF</span><button onclick="toggleMenu()" style="background:none;border:none;color:white;font-size:22px;cursor:pointer;">&#10005;</button></div>
  <nav style="display:flex;flex-direction:column;gap:2px;flex:1;">${sbLinks()}</nav>
  <div style="padding-top:14px;border-top:1px solid rgba(255,255,255,.12);"><a href="/auth/logout" class="sb-logout"><span class="sb-ico">&#9211;</span>Déconnexion</a></div>
</div>
<script>
function toggleMenu(){document.getElementById('overlay').classList.toggle('open');document.getElementById('drawer').classList.toggle('open');}
function toggleDark(){var h=document.documentElement,d=h.getAttribute('data-theme')==='dark';h.setAttribute('data-theme',d?'light':'dark');document.getElementById('darkBtn').textContent=d?'\u{1F319}':'\u2600\uFE0F';localStorage.setItem('santebf-theme',d?'light':'dark');}
var t=localStorage.getItem('santebf-theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');setTimeout(function(){var b=document.getElementById('darkBtn');if(b)b.textContent='\u2600\uFE0F';},0);}
</script>
</body></html>`
}

// ── PAGE DASHBOARD COMPLET ─────────────────────────────────────
export function dashboardPatientPage(profil: any, data: {
  dossier: any
  prochainRdv: any
  ordonnancesActives: number
  consultationsTotal: number
  medecins?: any[]
  examens?: any[]
}): string {
  const { dossier, prochainRdv, ordonnancesActives, consultationsTotal } = data
  const medecins = data.medecins ?? []
  const examens  = data.examens  ?? []

  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const ini = `${(profil.prenom || '?').charAt(0)}${(profil.nom || '?').charAt(0)}`
  const avatarUrl = profil.avatar_url || ''
  const avHtml    = avatarUrl ? `<img src="${avatarUrl}" alt="">` : ini
  const allergies: any[] = Array.isArray(dossier.allergies) ? dossier.allergies : []
  const maladies:  any[] = Array.isArray(dossier.maladies_chroniques) ? dossier.maladies_chroniques : []

  // RDV
  let rdvHtml = ''
  if (prochainRdv) {
    const rdvDate = new Date(prochainRdv.date_heure).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    const rdvHr   = new Date(prochainRdv.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const rdvMed  = prochainRdv.medecin ? `Dr. ${prochainRdv.medecin.prenom || ''} ${prochainRdv.medecin.nom || ''}` : ''
    rdvHtml = `<div class="rdv-card"><div class="rdv-label">&#128197; Prochain rendez-vous</div><div class="rdv-date">${rdvDate}</div><div class="rdv-med">&#128336; ${rdvHr}${rdvMed ? (' &middot; ' + rdvMed) : ''}</div>${prochainRdv.motif ? ('<div class="rdv-motif">' + prochainRdv.motif + '</div>') : ''}<a href="/patient/rdv" class="btn-white">Voir tous mes rendez-vous &#8594;</a></div>`
  } else {
    rdvHtml = `<div class="rdv-card"><div class="rdv-label">&#128197; Prochain rendez-vous</div><div class="rdv-vide">Aucun rendez-vous programmé</div><a href="/patient/rdv" class="btn-white">Voir mes rendez-vous &#8594;</a></div>`
  }

  // Examens
  let exHtml = ''
  if (examens.length > 0) {
    const exItems = examens.slice(0, 3).map((e: any) => {
      const dispo = e.statut === 'resultat_disponible' || e.valide_par
      const dt = new Date(e.created_at).toLocaleDateString('fr-FR')
      return `<div class="ex-item"><span style="font-size:20px;">&#128300;</span><div class="ex-info"><div class="ex-type">${e.type_examen || 'Examen'}</div><div class="ex-date">${dt}</div></div>${dispo ? '<span class="badge-dispo">&#10003; Disponible</span>' : '<span class="badge-wait">&#8987; En attente</span>'}</div>`
    }).join('')
    exHtml = `<div class="card"><div class="card-hd"><div class="card-title">&#129514; Derniers examens</div><a href="/patient-pdf/examens" class="card-link">Voir tout &#8594;</a></div>${exItems}</div>`
  }

  // Médecins
  let medHtml = ''
  if (medecins.length > 0) {
    const medItems = medecins.slice(0, 4).map((m: any) => {
      const mavHtml = m.avatar_url ? `<img src="${m.avatar_url}" alt="">` : `${(m.prenom || '?').charAt(0)}${(m.nom || '?').charAt(0)}`
      return `<div class="med-item"><div class="med-av">${mavHtml}</div><div class="med-info"><div class="med-name">Dr. ${m.prenom || ''} ${m.nom || ''}</div><div class="med-spec">${m.specialite || 'Médecin généraliste'}</div>${m.structure ? ('<div class="med-struct">&#127973; ' + m.structure + '</div>') : ''}</div><span class="badge-ok">&#10003;</span></div>`
    }).join('')
    medHtml = `<div class="card"><div class="card-hd"><div class="card-title">&#128104;&#8205;&#9877; Mes médecins</div><a href="/patient/consentements" class="card-link">Gérer &#8594;</a></div>${medItems}</div>`
  } else {
    medHtml = `<div class="card" style="text-align:center;padding:20px;color:var(--soft);"><div style="font-size:28px;margin-bottom:8px;">&#128104;&#8205;&#9877;</div><div style="font-size:13px;font-weight:600;margin-bottom:6px;">Aucun médecin autorisé</div><a href="/patient/consentements" style="font-size:12px;color:var(--bleu);font-weight:700;text-decoration:none;">Gérer les accès &#8594;</a></div>`
  }

  // Groupe sanguin
  const gsHtml = dossier.groupe_sanguin
    ? `<div class="card" style="display:flex;align-items:center;gap:14px;"><div style="font-size:32px;">&#129784;</div><div><div style="font-size:11px;color:var(--soft);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Groupe sanguin</div><div style="font-size:26px;font-weight:700;color:var(--rouge);">${dossier.groupe_sanguin}${dossier.rhesus || ''}</div></div></div>`
    : ''

  // Allergies / Maladies
  const alHtml = allergies.length > 0
    ? `<div class="card"><div class="card-hd"><div class="card-title">&#9888; Allergies</div></div><div class="tags">${allergies.map((a: any) => { const s = a.substance || a.nom || String(a); return '<span class="tag-r">&#9888; ' + s + '</span>'; }).join('')}</div></div>`
    : ''
  const malHtml = maladies.length > 0
    ? `<div class="card"><div class="card-hd"><div class="card-title">&#129658; Maladies chroniques</div></div><div class="tags">${maladies.map((m: any) => { const s = m.maladie || m.nom || String(m); return '<span class="tag-o">&#128138; ' + s + '</span>'; }).join('')}</div></div>`
    : ''

  const ordCount = ordonnancesActives > 0 ? `<span class="action-count">${ordonnancesActives} active(s)</span>` : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Mon espace — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="layout">

  <!-- SIDEBAR PC/TABLETTE -->
  <aside class="sidebar">
    <a href="/dashboard/patient" class="sb-brand">&#127973; SantéBF</a>
    <div class="sb-user">
      <div class="sb-avatar" onclick="ouvrirPhoto()">${avHtml}<div style="position:absolute;bottom:0;right:0;background:var(--bleu);color:white;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;">&#128247;</div></div>
      <div class="sb-name">${profil.prenom} ${profil.nom}</div>
      <div class="sb-num">${dossier.numero_national || ''}</div>
    </div>
    <nav class="sb-nav">${sbLinks()}</nav>
    <div class="sb-bottom"><a href="/auth/logout" class="sb-logout"><span class="sb-ico">&#9211;</span>Déconnexion</a></div>
  </aside>

  <div class="main">
    <!-- TOPBAR -->
    <div class="topbar">
      <div class="topbar-left">
        <button class="menu-btn" onclick="toggleMenu()">&#9776;</button>
        <span class="topbar-title">Mon espace patient</span>
      </div>
      <div class="topbar-right">
        <span class="topbar-date">${date}</span>
        <span class="topbar-time">${heure}</span>
        <button class="dark-btn" id="darkBtn" onclick="toggleDark()">&#127769;</button>
      </div>
    </div>

    <div class="content">
      <div class="grid-main">

        <!-- COL GAUCHE -->
        <div class="col-l">
          <div class="hero-card">
            <div class="hero-greeting">Bonjour &#128075;</div>
            <div class="hero-name">${profil.prenom} ${profil.nom}</div>
            <div class="hero-date">${date}</div>
            <div class="hero-num">&#128282; ${dossier.numero_national || 'N/A'}</div>
          </div>

          <div class="stats-row">
            <div class="stat-card"><div class="stat-icon">&#128138;</div><div class="stat-val">${ordonnancesActives}</div><div class="stat-lbl">Ordonnances actives</div></div>
            <div class="stat-card"><div class="stat-icon">&#129658;</div><div class="stat-val">${consultationsTotal}</div><div class="stat-lbl">Consultations</div></div>
          </div>

          <div class="card">
            <div class="card-hd"><div class="card-title">&#9889; Accès rapide</div></div>
            <div class="actions-grid">
              <a href="/patient/dossier" class="action-card"><span class="action-icon">&#128203;</span><span class="action-lbl">Mon dossier</span></a>
              <a href="/patient-pdf/ordonnances" class="action-card"><span class="action-icon">&#128138;</span><span class="action-lbl">Ordonnances</span>${ordCount}</a>
              <a href="/patient/rdv" class="action-card"><span class="action-icon">&#128197;</span><span class="action-lbl">Rendez-vous</span></a>
              <a href="/patient-pdf/examens" class="action-card"><span class="action-icon">&#129514;</span><span class="action-lbl">Examens</span></a>
              <a href="/patient/vaccinations" class="action-card"><span class="action-icon">&#128137;</span><span class="action-lbl">Vaccinations</span></a>
              <a href="/patient/consentements" class="action-card"><span class="action-icon">&#128274;</span><span class="action-lbl">Consentements</span></a>
              <a href="/patient/documents" class="action-card"><span class="action-icon">&#128193;</span><span class="action-lbl">Documents</span></a>
              <a href="/patient/factures" class="action-card"><span class="action-icon">&#129534;</span><span class="action-lbl">Factures</span></a>
              <a href="/patient/profil" class="action-card" style="border-bottom-color:var(--soft);"><span class="action-icon">&#128100;</span><span class="action-lbl">Mon profil</span></a>
            </div>
          </div>

          ${exHtml}
          ${alHtml}
          ${malHtml}
        </div>

        <!-- COL DROITE -->
        <div class="col-r">
          ${rdvHtml}
          ${gsHtml}
          ${medHtml}
        </div>

      </div>
    </div>
  </div>
</div>

<!-- BOTTOM NAV MOBILE -->
<nav class="bottom-nav">
  <a href="/dashboard/patient" class="nav-btn active"><span class="nav-icon">&#127968;</span>Accueil</a>
  <a href="/patient/dossier" class="nav-btn"><span class="nav-icon">&#128203;</span>Dossier</a>
  <a href="/patient-pdf/ordonnances" class="nav-btn"><span class="nav-icon">&#128138;</span>Ordonnances</a>
  <a href="/patient/rdv" class="nav-btn"><span class="nav-icon">&#128197;</span>RDV</a>
  <button class="nav-btn" onclick="ouvrirPhoto()"><span class="nav-icon">&#128100;</span>Profil</button>
</nav>

<!-- SIDEBAR DRAWER MOBILE -->
<div class="sb-overlay" id="overlay" onclick="toggleMenu()"></div>
<div class="sb-drawer" id="drawer">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><span style="font-family:'Fraunces',serif;font-size:18px;color:white;">&#127973; SantéBF</span><button onclick="toggleMenu()" style="background:none;border:none;color:white;font-size:22px;cursor:pointer;">&#10005;</button></div>
  <nav style="display:flex;flex-direction:column;gap:2px;flex:1;">${sbLinks()}</nav>
  <div style="padding-top:14px;border-top:1px solid rgba(255,255,255,.12);"><a href="/auth/logout" class="sb-logout"><span class="sb-ico">&#9211;</span>Déconnexion</a></div>
</div>

<!-- MODAL PHOTO -->
<div class="modal-bg" id="modalPhoto">
  <div class="modal">
    <div class="modal-title">&#128247; Ma photo</div>
    <div class="modal-sub">Photo claire de votre visage. JPG/PNG/WEBP, max 5 Mo.</div>
    <div class="ph-preview" id="phPrev">${avHtml}</div>
    <div class="msg-ok" id="msgOk">&#10003; Photo mise à jour !</div>
    <div class="msg-ko" id="msgKo">&#10007; Erreur. Réessayez.</div>
    <div class="file-zone" onclick="document.getElementById('fileIn').click()"><div style="font-size:13px;font-weight:600;margin-bottom:4px;">&#128193; Cliquer pour choisir</div><div style="font-size:11.5px;color:var(--soft);">JPG, PNG ou WEBP · Max 5 Mo</div><input type="file" id="fileIn" accept="image/jpeg,image/png,image/webp" onchange="previewPh(this)" style="display:none;"></div>
    <div class="pb" id="pb"><div class="pb-fill" id="pbFill" style="width:0%"></div></div>
    <div class="modal-btns">
      <button class="btn-cancel" onclick="fermerPhoto()">Annuler</button>
      <button class="btn-save" id="btnSave" onclick="uploadPh()" disabled>&#11014; Enregistrer</button>
    </div>
  </div>
</div>

<script>
var sel=null;
function toggleMenu(){document.getElementById('overlay').classList.toggle('open');document.getElementById('drawer').classList.toggle('open');}
function toggleDark(){var h=document.documentElement,d=h.getAttribute('data-theme')==='dark';h.setAttribute('data-theme',d?'light':'dark');document.getElementById('darkBtn').textContent=d?'\u{1F319}':'\u2600\uFE0F';localStorage.setItem('santebf-theme',d?'light':'dark');}
var t=localStorage.getItem('santebf-theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');setTimeout(function(){var b=document.getElementById('darkBtn');if(b)b.textContent='\u2600\uFE0F';},0);}
function ouvrirPhoto(){document.getElementById('modalPhoto').classList.add('open');}
function fermerPhoto(){document.getElementById('modalPhoto').classList.remove('open');sel=null;document.getElementById('fileIn').value='';document.getElementById('btnSave').disabled=true;document.getElementById('msgOk').style.display='none';document.getElementById('msgKo').style.display='none';}
document.getElementById('modalPhoto').addEventListener('click',function(e){if(e.target===this)fermerPhoto();});
function previewPh(input){var f=input.files[0];if(!f)return;if(f.size>5*1024*1024){document.getElementById('msgKo').textContent='Fichier trop lourd (max 5 Mo)';document.getElementById('msgKo').style.display='block';return;}sel=f;var r=new FileReader();r.onload=function(e){document.getElementById('phPrev').innerHTML='<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';};r.readAsDataURL(f);document.getElementById('btnSave').disabled=false;document.getElementById('msgOk').style.display='none';document.getElementById('msgKo').style.display='none';}
async function uploadPh(){if(!sel)return;var btn=document.getElementById('btnSave'),pb=document.getElementById('pb'),fill=document.getElementById('pbFill');btn.disabled=true;btn.textContent='Envoi...';pb.style.display='block';fill.style.width='40%';try{var b64=await new Promise(function(res,rej){var r=new FileReader();r.onload=function(e){res(e.target.result.split(',')[1]);};r.onerror=rej;r.readAsDataURL(sel);});fill.style.width='75%';var resp=await fetch('/profil/avatar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fichier:b64,type:sel.type,nom:sel.name})});fill.style.width='100%';if(!resp.ok)throw new Error('Erreur');document.getElementById('msgOk').style.display='block';btn.textContent='Enregistrée';setTimeout(function(){fermerPhoto();window.location.reload();},1500);}catch(e){fill.style.width='0%';pb.style.display='none';document.getElementById('msgKo').style.display='block';btn.disabled=false;btn.textContent='Réessayer';}}
</script>
</body></html>`
}