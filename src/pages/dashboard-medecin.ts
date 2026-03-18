/**
 * src/pages/dashboard-medecin.ts
 * SantéBF — Dashboard Médecin
 *
 * Fonctionnalités :
 * - Sidebar complète avec tous les modules
 * - Mode sombre (localStorage, CSS variables)
 * - 3 stats du jour (consultations, RDV à venir, ordonnances actives)
 * - RDV du jour avec statuts colorés
 * - Consultations récentes
 * - 6 actions rapides
 * - Bloc accès urgence
 * - Avatar profil
 * - Responsive mobile complet
 */

export function dashboardMedecinPage(
  profil: any,
  data: {
    rdvJour:          any[]
    consultations:    any[]
    stats: {
      consultationsJour:  number
      rdvAVenir:          number
      ordonnancesActives: number
    }
  }
): string {

  function esc(v: unknown): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
  }

  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR',  { weekday: 'long', day: 'numeric', month: 'long' })
  const inits = esc(profil.prenom.charAt(0)) + esc(profil.nom.charAt(0))
  const av    = profil.avatar_url ? esc(profil.avatar_url) : null

  // ── RDV ─────────────────────────────────────────────────
  const rdvItems = data.rdvJour.length === 0
    ? '<div class="sect-empty">Aucun rendez-vous aujourd&#x27;hui</div>'
    : data.rdvJour.map((r: any) => {
        const st  = esc(r.statut ?? '')
        const h   = new Date(r.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        return `<div class="rdv-row">
          <div class="rdv-h">${h}</div>
          <div class="rdv-info">
            <strong>${esc(r.patient_dossiers?.prenom ?? '')} ${esc(r.patient_dossiers?.nom ?? '')}</strong>
            <span>${esc(r.motif ?? 'Consultation')} &bull; ${r.duree_minutes ?? 30}&nbsp;min</span>
          </div>
          <span class="badge ${st}">${st}</span>
        </div>`
      }).join('')

  // ── Consultations ────────────────────────────────────────
  const consultItems = data.consultations.length === 0
    ? '<div class="sect-empty">Aucune consultation r&#xe9;cente</div>'
    : data.consultations.map((c: any) =>
        `<div class="ci-row">
          <div class="ci-top">
            <span class="ci-pt">${esc(c.patient_dossiers?.prenom ?? '')} ${esc(c.patient_dossiers?.nom ?? '')}</span>
            <span class="ci-dt">${new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
          <div class="ci-motif">${esc(c.motif ?? '')}</div>
          ${c.diagnostic_principal ? `<div class="ci-diag">&#x2192; ${esc(c.diagnostic_principal)}</div>` : ''}
        </div>`
      ).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tableau de bord | Sant&#xe9;BF</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&amp;family=Fraunces:ital,wght@0,300;0,600;1,300&amp;display=swap" rel="stylesheet">
  <style>
    /* ── Variables ── */
    :root {
      --v:   #4A148C; --v2: #6A1B9A; --vcl: #f3e8ff; --vgw: rgba(74,20,140,.12);
      --gr:  #1A6B3C; --bl: #1565C0; --rd: #B71C1C; --or: #E65100;
      --tx:  #0f1923; --tx2: #5a6a78; --tx3: #9BA3B8;
      --bg:  #f5f3f9; --sur: #ffffff; --brd: #e5e0ee;
      --sdw: 0 2px 8px rgba(0,0,0,.07);
      --r:   14px; --rs: 10px;
    }
    [data-theme="dark"] {
      --bg: #0e0f1a; --sur: #17192c; --brd: #2a2d45;
      --tx: #e4e4f0; --tx2: #8a93b0; --tx3: #555e80;
      --vcl: #231040; --vgw: rgba(106,27,154,.18);
    }
    /* ── Reset ── */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg);
           min-height: 100vh; color: var(--tx); transition: background .2s, color .2s; }

    /* ── Layout ── */
    .layout { display: flex; min-height: 100vh; }

    /* ══ SIDEBAR ══════════════════════════════════════════ */
    .sb {
      width: 252px; background: var(--v); position: fixed;
      top: 0; left: 0; height: 100vh; z-index: 300;
      display: flex; flex-direction: column; transition: transform .3s ease;
    }
    .sb-brand { padding: 20px 18px 15px; border-bottom: 1px solid rgba(255,255,255,.1); }
    .sb-brand-row { display: flex; align-items: center; gap: 9px; }
    .sb-icon { width: 34px; height: 34px; background: rgba(255,255,255,.2); border-radius: 8px;
               display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
    .sb-name { font-family: 'Fraunces', serif; font-size: 17px; color: white; }
    .sb-sub  { font-size: 9.5px; color: rgba(255,255,255,.38); letter-spacing: 1.2px;
               text-transform: uppercase; margin-top: 3px; padding-left: 43px; }
    .sb-nav  { flex: 1; padding: 10px 8px; overflow-y: auto; scrollbar-width: thin; }
    .sb-nav::-webkit-scrollbar { width: 4px; }
    .sb-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,.2); border-radius: 2px; }
    .sb-lbl  { font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase;
               color: rgba(255,255,255,.28); padding: 9px 10px 4px; }
    .sb-a { display: flex; align-items: center; gap: 10px; padding: 9px 11px;
            border-radius: var(--rs); text-decoration: none; color: rgba(255,255,255,.6);
            font-size: 13px; font-weight: 500; margin-bottom: 1px; transition: all .15s; }
    .sb-a:hover  { background: rgba(255,255,255,.1); color: white; }
    .sb-a.active { background: rgba(255,255,255,.18); color: white; font-weight: 600; }
    .sb-ico { font-size: 14px; width: 17px; text-align: center; flex-shrink: 0; }
    .sb-foot { padding: 11px 8px; border-top: 1px solid rgba(255,255,255,.1); }
    .sb-user { display: flex; align-items: center; gap: 9px; padding: 9px;
               border-radius: var(--rs); background: rgba(255,255,255,.08); }
    .sb-av { width: 32px; height: 32px; background: rgba(255,255,255,.2); border-radius: 8px;
             display: flex; align-items: center; justify-content: center;
             font-size: 12px; font-weight: 700; color: white; flex-shrink: 0; overflow: hidden; }
    .sb-av img { width: 100%; height: 100%; object-fit: cover; }
    .sb-nm { font-size: 12px; font-weight: 600; color: white; white-space: nowrap;
             overflow: hidden; text-overflow: ellipsis; }
    .sb-rl { font-size: 10px; color: rgba(255,255,255,.38); }
    .sb-out { width: 26px; height: 26px; background: rgba(255,255,255,.08); border: none;
              border-radius: 6px; color: rgba(255,255,255,.45); cursor: pointer;
              display: flex; align-items: center; justify-content: center; font-size: 13px;
              text-decoration: none; flex-shrink: 0; transition: all .15s; }
    .sb-out:hover { background: rgba(255,50,50,.25); color: #ff8080; }

    /* ══ MAIN ═════════════════════════════════════════════ */
    .main { margin-left: 252px; flex: 1; display: flex; flex-direction: column; min-width: 0; }

    /* ── Topbar ── */
    .topbar { height: 62px; background: var(--sur); border-bottom: 1px solid var(--brd);
              display: flex; align-items: center; justify-content: space-between;
              padding: 0 26px; position: sticky; top: 0; z-index: 100; gap: 10px; }
    .tb-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .tb-ttl  { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 600; color: var(--tx);
               white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tb-sub  { font-size: 11.5px; color: var(--tx2); margin-top: 1px; }
    .tb-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .dt-pill { background: var(--vcl); padding: 6px 14px; border-radius: 20px;
               font-size: 12px; font-weight: 600; color: var(--v); white-space: nowrap; }
    .menu-btn { display: none; background: none; border: none; font-size: 20px;
                cursor: pointer; color: var(--tx); padding: 4px; flex-shrink: 0; }
    .dark-btn { background: var(--vcl); border: none; width: 34px; height: 34px;
                border-radius: 8px; cursor: pointer; font-size: 15px;
                display: flex; align-items: center; justify-content: center; }

    /* ── Content ── */
    .content { padding: 26px; }

    /* ── Stats ── */
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 22px; }
    .stat  { background: var(--sur); border-radius: var(--r); padding: 18px 20px;
             border: 1px solid var(--brd); box-shadow: var(--sdw); }
    .stat .ico { font-size: 20px; margin-bottom: 8px; }
    .stat .num { font-family: 'Fraunces', serif; font-size: 30px; font-weight: 600; line-height: 1; }
    .stat .lbl { font-size: 12px; color: var(--tx2); margin-top: 5px; font-weight: 500; }
    .stat.v .num { color: var(--v); }
    .stat.g .num { color: var(--gr); }
    .stat.b .num { color: var(--bl); }

    /* ── Quick grid ── */
    .quick { display: grid; grid-template-columns: repeat(6, 1fr); gap: 11px; margin-bottom: 24px; }
    .qc { background: var(--sur); border-radius: var(--r); padding: 16px 10px;
          text-align: center; text-decoration: none; color: var(--tx);
          border: 1px solid var(--brd); box-shadow: var(--sdw); transition: all .18s; }
    .qc:hover { border-color: var(--v); box-shadow: 0 0 0 3px var(--vgw); transform: translateY(-2px); }
    .qc-i { font-size: 22px; margin-bottom: 7px; }
    .qc-l { font-size: 11.5px; font-weight: 600; color: var(--tx); }

    /* ── Grid 2 cols ── */
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .sect  { background: var(--sur); border-radius: var(--r); border: 1px solid var(--brd);
             overflow: hidden; box-shadow: var(--sdw); }
    .sect-hd { padding: 14px 18px; background: var(--v);
               display: flex; justify-content: space-between; align-items: center; }
    .sect-hd h3 { font-size: 13.5px; font-weight: 600; color: white; }
    .sect-hd a  { font-size: 12px; color: rgba(255,255,255,.7); text-decoration: none;
                  padding: 3px 9px; border-radius: 5px; background: rgba(255,255,255,.12); }
    .sect-hd a:hover { background: rgba(255,255,255,.22); color: white; }
    .sect-empty { padding: 22px; text-align: center; color: var(--tx3); font-size: 13px; font-style: italic; }
    .voir-plus  { display: block; text-align: center; padding: 11px; font-size: 12px;
                  color: var(--v); text-decoration: none; border-top: 1px solid var(--brd);
                  font-weight: 500; transition: background .15s; }
    .voir-plus:hover { background: var(--vcl); }

    /* ── RDV ── */
    .rdv-row { padding: 12px 18px; border-bottom: 1px solid var(--brd);
               display: flex; align-items: center; gap: 12px; }
    .rdv-row:last-of-type { border-bottom: none; }
    .rdv-h    { font-size: 14px; font-weight: 700; color: var(--v); min-width: 44px;
                font-family: 'Fraunces', serif; flex-shrink: 0; }
    .rdv-info { flex: 1; min-width: 0; }
    .rdv-info strong { display: block; font-size: 13px; font-weight: 600;
                       white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rdv-info span   { font-size: 11px; color: var(--tx2); }

    /* ── Consultations ── */
    .ci-row   { padding: 12px 18px; border-bottom: 1px solid var(--brd); }
    .ci-row:last-of-type { border-bottom: none; }
    .ci-top   { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3px; }
    .ci-pt    { font-size: 13px; font-weight: 600; }
    .ci-dt    { font-size: 11px; color: var(--tx2); flex-shrink: 0; margin-left: 6px; }
    .ci-motif { font-size: 12px; color: var(--tx2); }
    .ci-diag  { font-size: 12px; color: var(--v); margin-top: 2px; font-weight: 500; }

    /* ── Badges ── */
    .badge { padding: 3px 9px; border-radius: 20px; font-size: 10.5px; font-weight: 600;
             white-space: nowrap; flex-shrink: 0; }
    .badge.planifie  { background: #ede7f6; color: #4A148C; }
    .badge.confirme  { background: #e8f5e9; color: #1A6B3C; }
    .badge.passe     { background: #f5f5f5; color: #9e9e9e; }
    .badge.absent    { background: #fff3e0; color: #e65100; }
    .badge.annule    { background: #fce8e8; color: #b71c1c; }

    /* ── Urgence bloc ── */
    .urg-bloc { background: var(--sur); border-radius: var(--r); border: 1px solid var(--brd);
                padding: 18px 22px; box-shadow: var(--sdw); margin-top: 18px;
                display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .urg-bloc .ico { font-size: 26px; flex-shrink: 0; }
    .urg-txt h4 { font-size: 13.5px; font-weight: 700; color: var(--or); margin-bottom: 3px; }
    .urg-txt p  { font-size: 12px; color: var(--tx2); }
    .urg-btn { background: var(--or); color: white; padding: 10px 18px; border-radius: 9px;
               font-size: 13px; font-weight: 600; text-decoration: none; margin-left: auto;
               white-space: nowrap; }

    /* ── Overlay ── */
    .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 200; }
    .overlay.on { display: block; }

    /* ══ RESPONSIVE ══ */
    @media (max-width: 1200px) { .quick { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 900px)  { .grid2 { grid-template-columns: 1fr; }
                                 .stats { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 768px) {
      .sb { transform: translateX(-100%); }
      .sb.open { transform: translateX(0); }
      .main { margin-left: 0; }
      .menu-btn { display: flex; }
      .content { padding: 14px; }
      .quick { grid-template-columns: repeat(3, 1fr); }
      .dt-pill { display: none; }
    }
    @media (max-width: 480px) {
      .quick { grid-template-columns: repeat(2, 1fr); }
      .stats { grid-template-columns: 1fr; }
    }
  </style>
  <script>
    (function(){
      var t=localStorage.getItem('theme')||'light';
      document.documentElement.setAttribute('data-theme',t);
    })();
    function toggleDark(){
      var cur=document.documentElement.getAttribute('data-theme')||'light';
      var nx=cur==='dark'?'light':'dark';
      document.documentElement.setAttribute('data-theme',nx);
      localStorage.setItem('theme',nx);
      var b=document.getElementById('db');
      if(b)b.textContent=nx==='dark'?'\u2600\uFE0F':'\uD83C\uDF19';
    }
    function toggleSb(){
      document.getElementById('sb').classList.toggle('open');
      document.getElementById('ov').classList.toggle('on');
    }
    function closeSb(){
      document.getElementById('sb').classList.remove('open');
      document.getElementById('ov').classList.remove('on');
    }
  </script>
</head>
<body>
<div class="layout">

  <!-- ══ SIDEBAR ══ -->
  <aside class="sb" id="sb">
    <div class="sb-brand">
      <div class="sb-brand-row">
        <div class="sb-icon">&#x1F3E5;</div>
        <div class="sb-name">Sant&#xe9;BF</div>
      </div>
      <div class="sb-sub">Espace m&#xe9;dical</div>
    </div>

    <nav class="sb-nav">
      <div class="sb-lbl">Tableau de bord</div>
      <a href="/dashboard/medecin" class="sb-a active">
        <span class="sb-ico">&#x229E;</span> Accueil
      </a>

      <div class="sb-lbl">Patients</div>
      <a href="/medecin/patients"                   class="sb-a"><span class="sb-ico">&#x1F50D;</span> Mes patients</a>
      <a href="/medecin/consultations/nouvelle"      class="sb-a"><span class="sb-ico">&#x1F4CB;</span> Consultation</a>
      <a href="/medecin/ordonnances/nouvelle"        class="sb-a"><span class="sb-ico">&#x1F48A;</span> Ordonnance</a>
      <a href="/medecin/examens/nouveau"             class="sb-a"><span class="sb-ico">&#x1F9EA;</span> Examen</a>
      <a href="/medecin/certificat/nouveau"          class="sb-a"><span class="sb-ico">&#x1F4DC;</span> Certificat</a>

      <div class="sb-lbl">Agenda</div>
      <a href="/medecin/rdv"                         class="sb-a"><span class="sb-ico">&#x1F4C5;</span> Planning RDV</a>
      <a href="/medecin/rdv/nouveau"                 class="sb-a"><span class="sb-ico">&#x2795;</span> Nouveau RDV</a>

      <div class="sb-lbl">Clinique</div>
      <a href="/medecin/hospitalisations/nouvelle"   class="sb-a"><span class="sb-ico">&#x1F6CF;&#xFE0F;</span> Hospitaliser</a>
      <a href="/medecin/grossesse/nouvelle"          class="sb-a"><span class="sb-ico">&#x1FAC3;</span> Grossesse / CPN</a>
      <a href="/medecin/suivi-chronique/nouveau"     class="sb-a"><span class="sb-ico">&#x1F4C8;</span> Suivi chronique</a>

      <div class="sb-lbl">Documents</div>
      <a href="/medecin/documents/upload"            class="sb-a"><span class="sb-ico">&#x1F4C4;</span> Ajouter doc.</a>
      <a href="/laboratoire"                         class="sb-a"><span class="sb-ico">&#x1F52C;</span> Laboratoire</a>

      <div class="sb-lbl">Mon compte</div>
      <a href="/medecin/profil"                      class="sb-a"><span class="sb-ico">&#x1F464;</span> Mon profil</a>
      <a href="/profil/changer-mdp"                  class="sb-a"><span class="sb-ico">&#x1F512;</span> Mot de passe</a>
    </nav>

    <div class="sb-foot">
      <div class="sb-user">
        <div class="sb-av">
          ${av ? `<img src="${av}" alt="av">` : inits}
        </div>
        <div style="flex:1;min-width:0">
          <div class="sb-nm">Dr. ${esc(profil.prenom)} ${esc(profil.nom)}</div>
          <div class="sb-rl">${esc(profil.role.replace(/_/g, ' '))}</div>
        </div>
        <a href="/auth/logout" class="sb-out" title="D&#xe9;connexion">&#x23FB;</a>
      </div>
    </div>
  </aside>

  <div class="overlay" id="ov" onclick="closeSb()"></div>

  <!-- ══ MAIN ══ -->
  <div class="main">

    <header class="topbar">
      <div class="tb-left">
        <button class="menu-btn" onclick="toggleSb()">&#x2630;</button>
        <div>
          <div class="tb-ttl">Bonjour, Dr.&nbsp;${esc(profil.prenom)}&nbsp;&#x1F44B;</div>
          <div class="tb-sub">${data.rdvJour.length} rendez-vous aujourd&#x27;hui</div>
        </div>
      </div>
      <div class="tb-right">
        <button id="db" class="dark-btn" onclick="toggleDark()" title="Mode sombre">&#x1F319;</button>
        <div class="dt-pill">&#x1F550;&nbsp;${heure}&nbsp;&#x2014;&nbsp;${date}</div>
      </div>
    </header>

    <div class="content">

      <!-- STATS DU JOUR -->
      <div class="stats">
        <div class="stat v">
          <div class="ico">&#x1F4CB;</div>
          <div class="num">${data.stats.consultationsJour}</div>
          <div class="lbl">Consultations aujourd&#x27;hui</div>
        </div>
        <div class="stat g">
          <div class="ico">&#x1F4C5;</div>
          <div class="num">${data.stats.rdvAVenir}</div>
          <div class="lbl">RDV &#xe0; venir</div>
        </div>
        <div class="stat b">
          <div class="ico">&#x1F48A;</div>
          <div class="num">${data.stats.ordonnancesActives}</div>
          <div class="lbl">Ordonnances actives</div>
        </div>
      </div>

      <!-- ACTIONS RAPIDES -->
      <div class="quick">
        <a href="/medecin/patients"                class="qc"><div class="qc-i">&#x1F50D;</div><div class="qc-l">Patients</div></a>
        <a href="/medecin/consultations/nouvelle"  class="qc"><div class="qc-i">&#x1F4CB;</div><div class="qc-l">Consultation</div></a>
        <a href="/medecin/ordonnances/nouvelle"    class="qc"><div class="qc-i">&#x1F48A;</div><div class="qc-l">Ordonnance</div></a>
        <a href="/medecin/rdv"                     class="qc"><div class="qc-i">&#x1F4C5;</div><div class="qc-l">Planning</div></a>
        <a href="/medecin/examens/nouveau"         class="qc"><div class="qc-i">&#x1F9EA;</div><div class="qc-l">Examen</div></a>
        <a href="/medecin/certificat/nouveau"      class="qc"><div class="qc-i">&#x1F4DC;</div><div class="qc-l">Certificat</div></a>
      </div>

      <!-- RDV + CONSULTATIONS -->
      <div class="grid2">
        <div class="sect">
          <div class="sect-hd">
            <h3>&#x1F4C5;&nbsp;RDV aujourd&#x27;hui (${data.rdvJour.length})</h3>
            <a href="/medecin/rdv">Voir tout &#x2192;</a>
          </div>
          ${rdvItems}
          <a href="/medecin/rdv/nouveau" class="voir-plus">+ Nouveau rendez-vous</a>
        </div>
        <div class="sect">
          <div class="sect-hd">
            <h3>&#x1F4CB;&nbsp;Consultations r&#xe9;centes</h3>
            <a href="/medecin/consultations">Voir tout &#x2192;</a>
          </div>
          ${consultItems}
          <a href="/medecin/consultations/nouvelle" class="voir-plus">+ Nouvelle consultation</a>
        </div>
      </div>

      <!-- ACCÈS URGENCE -->
      <div class="urg-bloc">
        <div class="ico">&#x1F6A8;</div>
        <div class="urg-txt">
          <h4>Acc&#xe8;s urgence &#x2014; sans consentement</h4>
          <p>Utilisez le code urgence 6 chiffres du patient pour acc&#xe9;der aux donn&#xe9;es vitales</p>
        </div>
        <a href="/medecin/patients" class="urg-btn">&#x1F50D; Acc&#xe9;der</a>
      </div>

    </div><!-- /content -->
  </div><!-- /main -->
</div><!-- /layout -->

<script>
  // Sync dark icon on load
  (function(){
    var t=localStorage.getItem('theme')||'light';
    var b=document.getElementById('db');
    if(b)b.textContent=t==='dark'?'\u2600\uFE0F':'\uD83C\uDF19';
  })();
</script>
</body>
</html>`
}
