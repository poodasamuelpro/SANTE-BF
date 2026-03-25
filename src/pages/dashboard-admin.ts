/**
 * src/pages/dashboard-admin.ts
 * SantéBF — Dashboard Super Administrateur National
 *
 * Fonctionnalités :
 *   - Sidebar persistante avec tous les modules admin
 *   - Mode sombre (localStorage)
 *   - Photo profil dans le header
 *   - 6 stats globales : structures, comptes, patients, consultations, ordonnances, don sang
 *   - Alertes : structures expirant dans 30 jours
 *   - Statut système : IA / Email / FCM / Paiement (actif ou non)
 *   - Activité récente
 *   - Accès rapide à tous les modules
 *   - Section infos système mise à jour
 */

export function dashboardAdminPage(profil: any, data: {
  nbStructures:    number
  nbComptes:       number
  nbPatients:      number
  nbConsultations: number
  nbOrdonnances:   number
  nbDonneurs:      number
  expirantBientot: any[]
  activiteRecente: any[]
  iaActif:         boolean
  emailActif:      boolean
  fcmActif:        boolean
  paiementActif:   boolean
  iaModele:        string
}): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const av    = profil.photo_url || profil.avatar_url

  function badge(text: string, color: string): string {
    const colors: Record<string, string> = {
      vert:   'background:#E8F5E9;color:#1A6B3C',
      rouge:  'background:#FFF5F5;color:#B71C1C',
      bleu:   'background:#E3F2FD;color:#1565C0',
      orange: 'background:#FFF3E0;color:#E65100',
      gris:   'background:#F3F4F6;color:#9E9E9E',
      violet: 'background:#F3E5F5;color:#4A148C',
    }
    return `<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;${colors[color]||colors.gris}">${text}</span>`
  }

  function statusDot(ok: boolean): string {
    return ok
      ? '<span style="width:8px;height:8px;border-radius:50%;background:#1A6B3C;display:inline-block;margin-right:6px;flex-shrink:0"></span>'
      : '<span style="width:8px;height:8px;border-radius:50%;background:#B71C1C;display:inline-block;margin-right:6px;flex-shrink:0"></span>'
  }

  const alertesHtml = data.expirantBientot.length === 0 ? '' : `
  <div style="background:#FFF8E1;border-left:4px solid #F9A825;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
    <div style="font-size:13px;font-weight:700;color:#7a5500;margin-bottom:8px;">⏰ Abonnements expirant dans 30 jours</div>
    ${data.expirantBientot.map((s: any) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.06);font-size:13px;">
        <span><strong>${s.nom}</strong> — ${badge(s.plan_actif||'gratuit','orange')}</span>
        <a href="/admin/structures/${s.id}" style="color:#4A148C;font-weight:700;font-size:12px;text-decoration:none;">Renouveler →</a>
      </div>
    `).join('')}
  </div>`

  return `<!DOCTYPE html>
<html lang="fr" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Administration Nationale</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root{
      --c:#4A148C;--cl:#6A1B9A;--cc:#F3E5F5;
      --v:#1A6B3C;--vc:#E8F5EE;
      --b:#1565C0;--bc:#E3F2FD;
      --r:#B71C1C;--rc:#FFF5F5;
      --or:#E65100;--oc:#FFF3E0;
      --tx:#1A1A2E;--soft:#6B7280;
      --bg:#F7F8FA;--sur:#FFFFFF;--brd:#E5E7EB;
      --sh:0 2px 8px rgba(0,0,0,.06);
      --sdw:224px;
    }
    [data-theme="dark"]{
      --bg:#0F1117;--sur:#1A1B2E;--brd:#2E3047;
      --tx:#E8E8F0;--soft:#9BA3B8;--cc:#2A1550;
    }
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    html,body{height:100%}
    body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--tx);display:flex;min-height:100vh}

    /* ── SIDEBAR ─────────────────────────────── */
    .sidebar{
      width:var(--sdw);flex-shrink:0;background:var(--sur);
      border-right:1px solid var(--brd);
      display:flex;flex-direction:column;
      position:fixed;top:0;left:0;bottom:0;
      overflow-y:auto;z-index:200;
      transition:transform .3s;
    }
    .sb-header{
      background:var(--c);padding:18px 16px;
      display:flex;align-items:center;gap:10px;flex-shrink:0;
    }
    .sb-logo{
      width:36px;height:36px;background:rgba(255,255,255,.2);
      border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;
    }
    .sb-title{font-family:'DM Serif Display',serif;font-size:16px;color:white;line-height:1.2}
    .sb-sub{font-size:10px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.5px}
    .sb-section{padding:12px 12px 4px;font-size:10px;font-weight:700;
      text-transform:uppercase;letter-spacing:1px;color:var(--soft)}
    .sb-item{
      display:flex;align-items:center;gap:10px;
      padding:10px 16px;text-decoration:none;color:var(--tx);
      font-size:13px;font-weight:500;border-radius:8px;margin:1px 8px;
      transition:background .15s,color .15s;
    }
    .sb-item:hover{background:var(--cc);color:var(--c)}
    .sb-item.active{background:var(--c);color:white;font-weight:700}
    .sb-item .ico{font-size:16px;width:22px;text-align:center;flex-shrink:0}
    .sb-footer{margin-top:auto;padding:12px 8px;border-top:1px solid var(--brd)}
    .sb-footer a{
      display:flex;align-items:center;gap:8px;padding:9px 12px;
      text-decoration:none;color:var(--soft);font-size:13px;border-radius:8px;
    }
    .sb-footer a:hover{background:var(--rc);color:var(--r)}

    /* ── MAIN ───────────────────────────────── */
    .main{margin-left:var(--sdw);flex:1;display:flex;flex-direction:column;min-width:0}

    /* ── HEADER ──────────────────────────────── */
    header{
      background:var(--c);height:58px;
      display:flex;align-items:center;justify-content:space-between;
      padding:0 24px;position:sticky;top:0;z-index:100;
      box-shadow:0 2px 8px rgba(0,0,0,.2);flex-shrink:0;
    }
    .hdr-l{display:flex;align-items:center;gap:12px}
    .menu-btn{
      display:none;background:rgba(255,255,255,.15);border:none;
      width:34px;height:34px;border-radius:8px;font-size:16px;cursor:pointer;color:white;
    }
    .hdr-r{display:flex;align-items:center;gap:10px}
    .dk-btn{
      background:rgba(255,255,255,.12);border:none;width:32px;height:32px;
      border-radius:8px;cursor:pointer;font-size:15px;color:white;
      display:flex;align-items:center;justify-content:center;
    }
    .av-wrap{width:34px;height:34px;border-radius:50%;overflow:hidden;
      border:2px solid rgba(255,255,255,.3);flex-shrink:0}
    .av-img{width:100%;height:100%;object-fit:cover}
    .av-ini{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.2);
      display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:white}
    .ub{background:rgba(255,255,255,.12);border-radius:8px;padding:5px 10px;color:white}
    .ub strong{display:block;font-size:13px}.ub small{font-size:10px;opacity:.7}
    .logout-btn{
      background:rgba(255,255,255,.15);color:white;border:none;
      padding:7px 13px;border-radius:8px;font-size:13px;cursor:pointer;
      text-decoration:none;font-family:'DM Sans',sans-serif;
    }
    .logout-btn:hover{background:rgba(255,80,80,.3)}

    /* ── CONTENU ─────────────────────────────── */
    .content{padding:24px;flex:1}
    .page-title{font-family:'DM Serif Display',serif;font-size:24px;color:var(--tx);margin-bottom:4px}
    .page-sub{font-size:13px;color:var(--soft);margin-bottom:20px}

    /* ── STATS ───────────────────────────────── */
    .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:14px;margin-bottom:24px}
    .stat-card{
      background:var(--sur);border-radius:12px;padding:18px 16px;
      box-shadow:var(--sh);border:1px solid var(--brd);border-top:4px solid var(--c);
      text-align:center;
    }
    .stat-icon{font-size:26px;margin-bottom:8px}
    .stat-val{font-size:28px;font-weight:700;color:var(--c);line-height:1}
    .stat-lbl{font-size:11px;color:var(--soft);margin-top:6px;font-weight:500}

    /* ── GRILLE 2 COL ────────────────────────── */
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
    .card{background:var(--sur);border-radius:12px;padding:20px;box-shadow:var(--sh);border:1px solid var(--brd)}
    .card-title{font-size:14px;font-weight:700;color:var(--tx);margin-bottom:14px;
      display:flex;align-items:center;gap:8px}

    /* ── ACTIONS ─────────────────────────────── */
    .actions-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:24px}
    .action-card{
      background:var(--sur);border-radius:12px;padding:18px 14px;
      text-align:center;text-decoration:none;color:var(--tx);
      box-shadow:var(--sh);border:1px solid var(--brd);
      transition:transform .2s,box-shadow .2s;
      display:flex;flex-direction:column;align-items:center;gap:8px;
    }
    .action-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.1);border-color:var(--c)}
    .ac-icon{font-size:28px}
    .ac-lbl{font-size:12px;font-weight:600}

    /* ── SYSTÈME STATUS ──────────────────────── */
    .status-item{
      display:flex;align-items:center;justify-content:space-between;
      padding:10px 0;border-bottom:1px solid var(--brd);font-size:13px;
    }
    .status-item:last-child{border-bottom:none}
    .status-left{display:flex;align-items:center;gap:8px}
    .tag{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}

    /* ── ACTIVITÉ ────────────────────────────── */
    .feed-item{
      display:flex;align-items:flex-start;gap:10px;
      padding:10px 0;border-bottom:1px solid var(--brd);
    }
    .feed-item:last-child{border-bottom:none}
    .feed-ico{font-size:18px;flex-shrink:0;margin-top:2px}
    .feed-text{font-size:13px;color:var(--tx);flex:1}
    .feed-time{font-size:11px;color:var(--soft);flex-shrink:0}

    /* ── TABLE ───────────────────────────────── */
    .table-wrap{background:var(--sur);border-radius:12px;overflow:hidden;
      box-shadow:var(--sh);border:1px solid var(--brd)}
    table{width:100%;border-collapse:collapse}
    thead tr{background:var(--c)}
    thead th{padding:11px 14px;text-align:left;font-size:11px;color:white;
      font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    tbody tr{border-bottom:1px solid var(--brd);transition:background .12s}
    tbody tr:hover{background:var(--bg)}
    tbody td{padding:11px 14px;font-size:13px}
    tbody tr:last-child{border-bottom:none}
    .empty{text-align:center;padding:24px;color:var(--soft);font-style:italic;font-size:13px}

    /* ── RESPONSIVE ──────────────────────────── */
    @media(max-width:900px){
      .sidebar{transform:translateX(-100%)}
      .sidebar.open{transform:translateX(0)}
      .main{margin-left:0}
      .menu-btn{display:flex;align-items:center;justify-content:center}
      .grid2{grid-template-columns:1fr}
      .stats-grid{grid-template-columns:repeat(2,1fr)}
    }
    @media(max-width:480px){
      .stats-grid{grid-template-columns:repeat(2,1fr)}
      .actions-grid{grid-template-columns:repeat(2,1fr)}
      .content{padding:16px 12px}
    }
  </style>
</head>
<body>

  <!-- ══ SIDEBAR ══════════════════════════════ -->
  <aside class="sidebar" id="sidebar">
    <div class="sb-header">
      <div class="sb-logo">🏥</div>
      <div>
        <div class="sb-title">SantéBF</div>
        <div class="sb-sub">Administration</div>
      </div>
    </div>

    <div class="sb-section">Général</div>
    <a href="/dashboard/admin"  class="sb-item active"><span class="ico">🏠</span>Dashboard</a>
    <a href="/admin/stats"      class="sb-item"><span class="ico">📊</span>Statistiques</a>

    <div class="sb-section">Structures & Comptes</div>
    <a href="/admin/structures" class="sb-item"><span class="ico">🏥</span>Structures</a>
    <a href="/admin/comptes"    class="sb-item"><span class="ico">👥</span>Comptes</a>
    <a href="/admin/plans"      class="sb-item"><span class="ico">💳</span>Plans & Abonnements</a>

    <div class="sb-section">Modules</div>
    <a href="/ia/config"        class="sb-item"><span class="ico">🤖</span>Configuration IA</a>
    <a href="/admin/sang"       class="sb-item"><span class="ico">🩸</span>Don de Sang</a>
    <a href="/admin/paiements"  class="sb-item"><span class="ico">💰</span>Paiements</a>

    <div class="sb-section">Système</div>
    <a href="/admin/systeme"    class="sb-item"><span class="ico">⚙️</span>Statut Système</a>
    <a href="/admin/logs"       class="sb-item"><span class="ico">📋</span>Logs</a>

    <div class="sb-footer">
      <a href="/auth/logout">
        <span style="font-size:16px">⏻</span>Déconnexion
      </a>
    </div>
  </aside>

  <!-- ══ MAIN ═════════════════════════════════ -->
  <div class="main">

    <!-- HEADER -->
    <header>
      <div class="hdr-l">
        <button class="menu-btn" onclick="toggleSidebar()" id="menuBtn">☰</button>
        <span style="font-family:'DM Serif Display',serif;font-size:17px;color:white">
          SantéBF <span style="font-size:12px;opacity:.65;font-family:'DM Sans',sans-serif">— Administration</span>
        </span>
      </div>
      <div class="hdr-r">
        <button class="dk-btn" id="dkb" onclick="toggleDark()" title="Mode sombre">🌙</button>
        ${av
          ? `<div class="av-wrap"><img src="${av}" class="av-img" alt="Photo"></div>`
          : `<div class="av-ini">${(profil.prenom||'?').charAt(0)}${(profil.nom||'?').charAt(0)}</div>`
        }
        <div class="ub">
          <strong>${profil.prenom} ${profil.nom}</strong>
          <small>Super Admin</small>
        </div>
        <a href="/auth/logout" class="logout-btn">Déconnexion</a>
      </div>
    </header>

    <!-- CONTENU -->
    <div class="content">

      <!-- Titre + date -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:8px">
        <div>
          <h1 class="page-title">Bonjour, ${profil.prenom} 👋</h1>
          <p class="page-sub">${date} · ${heure}</p>
        </div>
        <a href="/admin/structures/nouvelle" style="background:var(--c);color:white;padding:10px 18px;border-radius:9px;font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap">➕ Nouvelle structure</a>
      </div>

      <!-- Alertes expirations -->
      ${alertesHtml}

      <!-- Stats globales -->
      <div class="stats-grid">
        <div class="stat-card" style="border-top-color:#4A148C">
          <div class="stat-icon">🏥</div>
          <div class="stat-val" style="color:#4A148C">${data.nbStructures}</div>
          <div class="stat-lbl">Structures</div>
        </div>
        <div class="stat-card" style="border-top-color:#1565C0">
          <div class="stat-icon">👥</div>
          <div class="stat-val" style="color:#1565C0">${data.nbComptes}</div>
          <div class="stat-lbl">Comptes utilisateurs</div>
        </div>
        <div class="stat-card" style="border-top-color:#1A6B3C">
          <div class="stat-icon">📂</div>
          <div class="stat-val" style="color:#1A6B3C">${data.nbPatients}</div>
          <div class="stat-lbl">Dossiers patients</div>
        </div>
        <div class="stat-card" style="border-top-color:#1565C0">
          <div class="stat-icon">🩺</div>
          <div class="stat-val" style="color:#1565C0">${data.nbConsultations}</div>
          <div class="stat-lbl">Consultations</div>
        </div>
        <div class="stat-card" style="border-top-color:#4A148C">
          <div class="stat-icon">💊</div>
          <div class="stat-val" style="color:#4A148C">${data.nbOrdonnances}</div>
          <div class="stat-lbl">Ordonnances</div>
        </div>
        <div class="stat-card" style="border-top-color:#B71C1C">
          <div class="stat-icon">🩸</div>
          <div class="stat-val" style="color:#B71C1C">${data.nbDonneurs}</div>
          <div class="stat-lbl">Donneurs sang</div>
        </div>
      </div>

      <!-- Accès rapides -->
      <div style="font-size:13px;font-weight:700;color:var(--soft);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">Accès rapides</div>
      <div class="actions-grid" style="margin-bottom:24px">
        <a href="/admin/structures"  class="action-card"><span class="ac-icon">🏥</span><span class="ac-lbl">Structures</span></a>
        <a href="/admin/comptes"     class="action-card"><span class="ac-icon">👥</span><span class="ac-lbl">Comptes</span></a>
        <a href="/admin/plans"       class="action-card"><span class="ac-icon">💳</span><span class="ac-lbl">Plans</span></a>
        <a href="/ia/config"         class="action-card"><span class="ac-icon">🤖</span><span class="ac-lbl">Config IA</span></a>
        <a href="/admin/paiements"   class="action-card"><span class="ac-icon">💰</span><span class="ac-lbl">Paiements</span></a>
        <a href="/admin/stats"       class="action-card"><span class="ac-icon">📊</span><span class="ac-lbl">Statistiques</span></a>
        <a href="/dashboard/cnts"    class="action-card"><span class="ac-icon">🩸</span><span class="ac-lbl">CNTS</span></a>
        <a href="/admin/systeme"     class="action-card"><span class="ac-icon">⚙️</span><span class="ac-lbl">Système</span></a>
      </div>

      <!-- Statut système + Activité récente -->
      <div class="grid2">

        <!-- Statut système -->
        <div class="card">
          <div class="card-title">⚙️ Statut système</div>
          <div class="status-item">
            <div class="status-left">${statusDot(true)}<span>Cloudflare Pages</span></div>
            <span class="tag" style="background:#E8F5E9;color:#1A6B3C">✅ En ligne</span>
          </div>
          <div class="status-item">
            <div class="status-left">${statusDot(true)}<span>Supabase DB</span></div>
            <span class="tag" style="background:#E8F5E9;color:#1A6B3C">✅ Connecté</span>
          </div>
          <div class="status-item">
            <div class="status-left">${statusDot(data.emailActif)}<span>Email (Resend/Brevo)</span></div>
            ${data.emailActif
              ? '<span class="tag" style="background:#E8F5E9;color:#1A6B3C">✅ Actif</span>'
              : '<span class="tag" style="background:#FFF5F5;color:#B71C1C">❌ Clé manquante</span>'}
          </div>
          <div class="status-item">
            <div class="status-left">${statusDot(data.fcmActif)}<span>Notifications Push (FCM)</span></div>
            ${data.fcmActif
              ? '<span class="tag" style="background:#E8F5E9;color:#1A6B3C">✅ Actif</span>'
              : '<span class="tag" style="background:#FFF5F5;color:#B71C1C">❌ Clé manquante</span>'}
          </div>
          <div class="status-item">
            <div class="status-left">${statusDot(data.iaActif)}<span>IA Médicale</span></div>
            ${data.iaActif
              ? `<span class="tag" style="background:#E3F2FD;color:#1565C0">✅ ${data.iaModele}</span>`
              : '<span class="tag" style="background:#FFF5F5;color:#B71C1C">❌ Aucune clé</span>'}
          </div>
          <div class="status-item">
            <div class="status-left">${statusDot(data.paiementActif)}<span>Paiement CinetPay</span></div>
            ${data.paiementActif
              ? '<span class="tag" style="background:#E8F5E9;color:#1A6B3C">✅ Configuré</span>'
              : '<span class="tag" style="background:#FFF3E0;color:#E65100">⏳ Non configuré</span>'}
          </div>
          <div style="margin-top:12px">
            <a href="/admin/systeme" style="font-size:12px;color:#4A148C;text-decoration:none;font-weight:600">Voir détails système →</a>
          </div>
        </div>

        <!-- Activité récente -->
        <div class="card">
          <div class="card-title">⚡ Activité récente</div>
          ${data.activiteRecente.length === 0
            ? '<div class="empty">Aucune activité récente</div>'
            : data.activiteRecente.map((a: any) => `
              <div class="feed-item">
                <span class="feed-ico">${a.ico || '📝'}</span>
                <span class="feed-text">${a.texte}</span>
                <span class="feed-time">${a.temps || ''}</span>
              </div>
            `).join('')
          }
          <div style="margin-top:12px">
            <a href="/admin/logs" style="font-size:12px;color:#4A148C;text-decoration:none;font-weight:600">Voir tous les logs →</a>
          </div>
        </div>

      </div>

      <!-- Infos système -->
      <div class="card">
        <div class="card-title">🖥️ Informations système</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
          ${[
            ['Version', 'SantéBF 2.0'],
            ['Déploiement', 'Cloudflare Pages'],
            ['Base de données', 'Supabase PostgreSQL'],
            ['URL production', 'santebf.izicardouaga.com'],
            ['IA active', data.iaActif ? data.iaModele : 'Non configurée'],
            ['Email', data.emailActif ? 'Configuré' : 'Non configuré'],
          ].map(([k, v]) => `
            <div class="status-item" style="padding:10px 8px;">
              <span style="color:var(--soft);font-size:13px">${k}</span>
              <span style="font-size:13px;font-family:${k==='URL production'?'monospace':'inherit'};font-size:12px">${v}</span>
            </div>
          `).join('')}
        </div>
      </div>

    </div><!-- /content -->
  </div><!-- /main -->

  <!-- Overlay mobile -->
  <div id="overlay" onclick="toggleSidebar()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:199"></div>

  <script>
  // ── Mode sombre ──────────────────────────────────────────
  (function(){
    var t=localStorage.getItem('santebf_theme')||'light';
    document.documentElement.setAttribute('data-theme',t);
    var b=document.getElementById('dkb');
    if(b)b.textContent=t==='dark'?'☀️':'🌙';
  })();
  function toggleDark(){
    var cur=document.documentElement.getAttribute('data-theme')||'light';
    var next=cur==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',next);
    localStorage.setItem('santebf_theme',next);
    var b=document.getElementById('dkb');
    if(b)b.textContent=next==='dark'?'☀️':'🌙';
  }

  // ── Sidebar mobile ───────────────────────────────────────
  function toggleSidebar(){
    var sb=document.getElementById('sidebar');
    var ov=document.getElementById('overlay');
    var open=sb.classList.toggle('open');
    ov.style.display=open?'block':'none';
  }
  </script>
</body>
</html>`
}
 