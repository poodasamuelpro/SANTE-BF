/**
 * src/routes/admin.ts
 * SantéBF — Routes Super Administrateur National
 *
 * Accessible uniquement au rôle super_admin
 * Monté sur /admin dans functions/[[path]].ts
 *
 * Toutes les sous-pages utilisent adminSkeleton() qui inclut :
 *   - Sidebar persistante (même menu que dashboard-admin.ts)
 *   - Bouton retour contextuel
 *   - Mode sombre synchronisé
 *   - Photo profil header
 *
 * Routes :
 *   GET  /admin/structures                   → Liste structures
 *   GET  /admin/structures/nouvelle          → Formulaire nouvelle structure
 *   POST /admin/structures/nouvelle          → Créer structure
 *   GET  /admin/structures/:id               → Détail + personnel + stats
 *   POST /admin/structures/:id/plan          → Modifier plan
 *   POST /admin/structures/:id/toggle        → Activer/Suspendre structure
 *   GET  /admin/comptes                      → Liste comptes (avec filtres)
 *   POST /admin/comptes/:id/toggle           → Activer/Suspendre compte
 *   GET  /admin/plans                        → Plans groupés
 *   GET  /admin/stats                        → Statistiques nationales
 *   GET  /admin/paiements                    → Historique paiements
 *   GET  /admin/systeme                      → Statut variables/services
 *   GET  /admin/sang                         → Redirection CNTS
 *   GET  /admin/ia                           → Redirection config IA
 *   GET  /admin/logs                         → Logs système
 *   GET  /admin/cnts                         → Redirection dashboard CNTS
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'

type AdminBindings = Bindings & {
  ANTHROPIC_API_KEY?:   string
  GEMINI_API_KEY?:      string
  HUGGINGFACE_API_KEY?: string
  IA_MODEL?:            string
  FCM_PROJECT_ID?:      string
  FCM_CLIENT_EMAIL?:    string
  FCM_PRIVATE_KEY?:     string
  BREVO_API_KEY?:       string
  CINETPAY_SITE_ID?:    string
  CINETPAY_API_KEY?:    string
  CINETPAY_SECRET?:     string
  DUNIAPAY_API_KEY?:    string
  ENVIRONMENT?:         string
}

export const adminRoutes = new Hono<{ Bindings: AdminBindings }>()

adminRoutes.use('/*', requireAuth)
adminRoutes.use('/*', requireRole('super_admin'))

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function esc(v: unknown): string {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;')
}

function badge(text: string, color: string): string {
  const colors: Record<string, string> = {
    vert:   'background:#E8F5E9;color:#1A6B3C',
    rouge:  'background:#FFF5F5;color:#B71C1C',
    bleu:   'background:#E3F2FD;color:#1565C0',
    orange: 'background:#FFF3E0;color:#E65100',
    gris:   'background:#F3F4F6;color:#9E9E9E',
    violet: 'background:#F3E5F5;color:#4A148C',
  }
  return `<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;${colors[color]||colors.gris}">${esc(text)}</span>`
}

function planColor(plan: string): string {
  const map: Record<string,string> = {
    pro: 'vert', standard: 'bleu', starter: 'orange',
    pilote: 'violet', suspendu: 'rouge', gratuit: 'gris',
  }
  return map[plan] || 'gris'
}

function fmtDate(d: string): string {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—'
}

// ── Layout principal des sous-pages admin ──────────────────────
// Sidebar persistante + header avec profil + dark mode
function adminSkeleton(
  profil: AuthProfile,
  titre:  string,
  contenu: string,
  retourUrl?: string,
  retourLabel?: string
): string {
  const av  = (profil as any).photo_url || (profil as any).avatar_url
  const ini = `${(profil.prenom||'?').charAt(0)}${(profil.nom||'?').charAt(0)}`

  return `<!DOCTYPE html>
<html lang="fr" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(titre)} | Sant&#xe9;BF Admin</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root{
      --c:#4A148C;--cl:#6A1B9A;--cc:#F3E5F5;
      --v:#1A6B3C;--vc:#E8F5EE;--b:#1565C0;--bc:#E3F2FD;
      --r:#B71C1C;--rc:#FFF5F5;--or:#E65100;--oc:#FFF3E0;
      --tx:#1A1A2E;--soft:#6B7280;--bg:#F7F8FA;--sur:#FFFFFF;--brd:#E5E7EB;
      --sh:0 2px 8px rgba(0,0,0,.06);--sdw:220px;
    }
    [data-theme="dark"]{--bg:#0F1117;--sur:#1A1B2E;--brd:#2E3047;--tx:#E8E8F0;--soft:#9BA3B8;--cc:#2A1550}
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    html,body{height:100%}
    body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--tx);display:flex;min-height:100vh}

    /* SIDEBAR */
    .sidebar{width:var(--sdw);flex-shrink:0;background:var(--sur);border-right:1px solid var(--brd);
      display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;overflow-y:auto;z-index:200;transition:transform .3s}
    .sb-hd{background:var(--c);padding:16px;display:flex;align-items:center;gap:10px;flex-shrink:0}
    .sb-logo{width:34px;height:34px;background:rgba(255,255,255,.2);border-radius:9px;
      display:flex;align-items:center;justify-content:center;font-size:17px}
    .sb-title{font-family:'DM Serif Display',serif;font-size:15px;color:white;line-height:1.2}
    .sb-sub{font-size:10px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.5px}
    .sb-sec{padding:12px 12px 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--soft)}
    .sb-item{display:flex;align-items:center;gap:9px;padding:9px 14px;text-decoration:none;color:var(--tx);
      font-size:13px;font-weight:500;border-radius:8px;margin:1px 6px;transition:background .15s,color .15s}
    .sb-item:hover{background:var(--cc);color:var(--c)}
    .sb-item .ico{font-size:15px;width:20px;text-align:center;flex-shrink:0}
    .sb-foot{margin-top:auto;padding:10px 6px;border-top:1px solid var(--brd)}
    .sb-foot a{display:flex;align-items:center;gap:8px;padding:9px 12px;text-decoration:none;color:var(--soft);
      font-size:13px;border-radius:8px;transition:background .15s}
    .sb-foot a:hover{background:var(--rc);color:var(--r)}

    /* MAIN */
    .main{margin-left:var(--sdw);flex:1;display:flex;flex-direction:column;min-width:0}

    /* HEADER */
    header{background:var(--c);height:56px;display:flex;align-items:center;justify-content:space-between;
      padding:0 22px;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.2);flex-shrink:0}
    .hd-l{display:flex;align-items:center;gap:10px}
    .menu-btn{display:none;background:rgba(255,255,255,.15);border:none;width:32px;height:32px;
      border-radius:7px;font-size:16px;cursor:pointer;color:white;align-items:center;justify-content:center}
    .pg-title{font-family:'DM Serif Display',serif;font-size:17px;color:white}
    .hd-r{display:flex;align-items:center;gap:8px}
    .dk-btn{background:rgba(255,255,255,.12);border:none;width:30px;height:30px;border-radius:7px;
      cursor:pointer;font-size:14px;color:white;display:flex;align-items:center;justify-content:center}
    .av{width:32px;height:32px;border-radius:50%;overflow:hidden;border:2px solid rgba(255,255,255,.3);flex-shrink:0}
    .av img{width:100%;height:100%;object-fit:cover}
    .av-ini{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);
      display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white}
    .ub{background:rgba(255,255,255,.12);border-radius:7px;padding:4px 10px;color:white}
    .ub strong{display:block;font-size:12.5px}.ub small{font-size:10px;opacity:.7}
    .logout-a{background:rgba(255,255,255,.15);color:white;border:none;padding:6px 12px;
      border-radius:7px;font-size:12px;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
    .logout-a:hover{background:rgba(255,80,80,.3)}

    /* CONTENT */
    .content{padding:22px;flex:1}
    .back-btn{display:inline-flex;align-items:center;gap:7px;background:var(--sur);
      border:1px solid var(--brd);color:var(--tx);padding:8px 14px;border-radius:8px;
      font-size:13px;font-weight:600;text-decoration:none;margin-bottom:16px;transition:background .15s}
    .back-btn:hover{background:var(--cc);color:var(--c)}
    .pg-h{font-family:'DM Serif Display',serif;font-size:22px;margin-bottom:4px}
    .pg-sub{font-size:13px;color:var(--soft);margin-bottom:20px}

    /* CARDS */
    .card{background:var(--sur);border-radius:12px;padding:20px;box-shadow:var(--sh);border:1px solid var(--brd);margin-bottom:16px}
    .card-title{font-size:14px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:16px}

    /* STATS */
    .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:20px}
    .stat-c{background:var(--sur);border-radius:12px;padding:16px;text-align:center;
      box-shadow:var(--sh);border:1px solid var(--brd);border-top:4px solid var(--c)}
    .stat-ico{font-size:24px;margin-bottom:6px}
    .stat-v{font-size:26px;font-weight:700;color:var(--c);line-height:1}
    .stat-l{font-size:11px;color:var(--soft);margin-top:5px}

    /* TABLE */
    .table-wrap{background:var(--sur);border-radius:12px;overflow:hidden;box-shadow:var(--sh);border:1px solid var(--brd);margin-bottom:20px}
    table{width:100%;border-collapse:collapse}
    thead tr{background:var(--c)}
    thead th{padding:10px 14px;text-align:left;font-size:11px;color:white;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    tbody tr{border-bottom:1px solid var(--brd);transition:background .12s}
    tbody tr:hover{background:var(--bg)}
    tbody td{padding:10px 14px;font-size:13px}
    tbody tr:last-child{border-bottom:none}
    .empty{text-align:center;padding:24px;color:var(--soft);font-style:italic;font-size:13px}

    /* FORMULAIRES */
    .fg{margin-bottom:14px}
    label{display:block;font-size:12px;font-weight:600;color:var(--tx);margin-bottom:5px}
    input,select,textarea{width:100%;padding:9px 12px;font-family:'DM Sans',sans-serif;font-size:13px;
      border:1.5px solid var(--brd);border-radius:9px;background:var(--bg);color:var(--tx);outline:none;transition:border-color .15s}
    input:focus,select:focus,textarea:focus{border-color:var(--c);background:var(--sur)}
    .btn{display:inline-block;background:var(--c);color:white;padding:9px 18px;border:none;
      border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
    .btn:hover{opacity:.88}
    .btn-g{background:#f3f4f6;color:var(--tx);border:1px solid var(--brd)}
    .btn-r{background:var(--r);color:white}
    .btn-v{background:var(--v);color:white}
    .btn-sm{display:inline-block;padding:4px 11px;border-radius:6px;font-size:12px;font-weight:600;
      text-decoration:none;cursor:pointer;border:none;font-family:'DM Sans',sans-serif}
    .fa{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:16px}
    .sep{height:1px;background:var(--brd);margin:16px 0}

    /* STATUS */
    .status-row{display:flex;align-items:center;justify-content:space-between;
      padding:10px 0;border-bottom:1px solid var(--brd);font-size:13px}
    .status-row:last-child{border-bottom:none}
    .sdot-on{width:8px;height:8px;border-radius:50%;background:#1A6B3C;display:inline-block;margin-right:6px}
    .sdot-off{width:8px;height:8px;border-radius:50%;background:#B71C1C;display:inline-block;margin-right:6px}

    /* ALERTS */
    .a-ok{background:#E8F5E9;border-left:4px solid #1A6B3C;padding:11px 15px;border-radius:8px;margin-bottom:16px;font-size:13px;color:#1A6B3C}
    .a-err{background:#FFF5F5;border-left:4px solid #B71C1C;padding:11px 15px;border-radius:8px;margin-bottom:16px;font-size:13px;color:#B71C1C}
    .a-warn{background:#FFF3E0;border-left:4px solid #E65100;padding:11px 15px;border-radius:8px;margin-bottom:16px;font-size:13px;color:#E65100}

    /* RESPONSIVE */
    @media(max-width:900px){
      .sidebar{transform:translateX(-100%)}
      .sidebar.open{transform:translateX(0)}
      .main{margin-left:0}
      .menu-btn{display:flex !important}
      .grid2,.grid3{grid-template-columns:1fr}
      .stats-grid{grid-template-columns:repeat(2,1fr)}
    }
    @media(max-width:480px){.content{padding:14px 12px}.stats-grid{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>

  <!-- SIDEBAR -->
  <aside class="sidebar" id="sidebar">
    <div class="sb-hd">
      <div class="sb-logo">🏥</div>
      <div><div class="sb-title">SantéBF</div><div class="sb-sub">Administration</div></div>
    </div>
    <div class="sb-sec">Général</div>
    <a href="/dashboard/admin"  class="sb-item"><span class="ico">🏠</span>Dashboard</a>
    <a href="/admin/stats"      class="sb-item"><span class="ico">📊</span>Statistiques</a>
    <div class="sb-sec">Structures & Comptes</div>
    <a href="/admin/structures" class="sb-item"><span class="ico">🏥</span>Structures</a>
    <a href="/admin/comptes"    class="sb-item"><span class="ico">👥</span>Comptes</a>
    <a href="/admin/plans"      class="sb-item"><span class="ico">💳</span>Plans & Abonnements</a>
    <div class="sb-sec">Modules</div>
    <a href="/ia/config"        class="sb-item"><span class="ico">🤖</span>Configuration IA</a>
    <a href="/admin/sang"       class="sb-item"><span class="ico">🩸</span>Don de Sang</a>
    <a href="/admin/paiements"  class="sb-item"><span class="ico">💰</span>Paiements</a>
    <div class="sb-sec">Système</div>
    <a href="/admin/systeme"    class="sb-item"><span class="ico">⚙️</span>Statut Système</a>
    <a href="/admin/logs"       class="sb-item"><span class="ico">📋</span>Logs</a>
    <div class="sb-foot">
      <a href="/auth/logout"><span style="font-size:15px">⏻</span>Déconnexion</a>
    </div>
  </aside>

  <!-- MAIN -->
  <div class="main">
    <header>
      <div class="hd-l">
        <button class="menu-btn" onclick="toggleSB()" style="display:flex">☰</button>
        <span class="pg-title">${esc(titre)}</span>
      </div>
      <div class="hd-r">
        <button class="dk-btn" id="dkb" onclick="toggleDark()">🌙</button>
        ${av
          ? `<div class="av"><img src="${esc(av)}" alt="av"></div>`
          : `<div class="av-ini">${esc(ini)}</div>`
        }
        <div class="ub">
          <strong>${esc(profil.prenom)} ${esc(profil.nom)}</strong>
          <small>Super Admin</small>
        </div>
        <a href="/auth/logout" class="logout-a">D&#xe9;connexion</a>
      </div>
    </header>

    <div class="content">
      ${retourUrl ? `<a href="${esc(retourUrl)}" class="back-btn">&#x2190; ${esc(retourLabel||'Retour')}</a>` : ''}
      ${contenu}
    </div>
  </div>

  <div id="ov" onclick="toggleSB()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:199"></div>

  <script>
  (function(){
    var t=localStorage.getItem('santebf_theme')||'light';
    document.documentElement.setAttribute('data-theme',t);
    var b=document.getElementById('dkb');
    if(b)b.textContent=t==='dark'?'☀️':'🌙';
  })();
  function toggleDark(){
    var c=document.documentElement.getAttribute('data-theme')||'light';
    var n=c==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',n);
    localStorage.setItem('santebf_theme',n);
    var b=document.getElementById('dkb');if(b)b.textContent=n==='dark'?'☀️':'🌙';
  }
  function toggleSB(){
    var sb=document.getElementById('sidebar'),ov=document.getElementById('ov');
    var o=sb.classList.toggle('open');ov.style.display=o?'block':'none';
  }
  </script>
</body>
</html>`
}

// ══════════════════════════════════════════════════════════════
// GET /admin/structures
// ══════════════════════════════════════════════════════════════
adminRoutes.get('/structures', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const sb       = c.get('supabase' as never) as any
  const q        = c.req.query('q') || ''
  const filtre   = c.req.query('plan') || ''
  const ok       = c.req.query('ok') || ''

  let query = sb.from('struct_structures')
    .select('id, nom, type, niveau, plan_actif, est_actif, created_at, abonnement_expire_at')
    .order('nom', { ascending: true })
    .limit(100)

  if (q.length >= 2) query = query.ilike('nom', `%${q}%`)
  if (filtre) query = query.eq('plan_actif', filtre)

  const { data: structures } = await query

  const lignes = (structures ?? []).map((s: any) => `<tr>
    <td><strong>${esc(s.nom)}</strong></td>
    <td style="font-size:12px;color:var(--soft)">${esc(s.type||'—')}</td>
    <td>Niv. ${s.niveau||1}</td>
    <td>${badge(s.plan_actif||'gratuit', planColor(s.plan_actif||'gratuit'))}</td>
    <td>${s.abonnement_expire_at ? `<span style="font-size:11px">${fmtDate(s.abonnement_expire_at)}</span>` : '—'}</td>
    <td>${s.est_actif ? badge('Actif','vert') : badge('Inactif','rouge')}</td>
    <td style="display:flex;gap:5px;flex-wrap:wrap">
      <a href="/admin/structures/${s.id}" class="btn-sm btn" style="font-size:11px">Gérer →</a>
      <form method="POST" action="/admin/structures/${s.id}/toggle" style="display:inline">
        <button type="submit" class="btn-sm" style="background:${s.est_actif?'#FFF5F5':'#E8F5E9'};color:${s.est_actif?'#B71C1C':'#1A6B3C'};padding:4px 10px;border-radius:6px;font-size:11px;border:none;cursor:pointer;font-family:inherit">
          ${s.est_actif?'Suspendre':'Activer'}
        </button>
      </form>
    </td>
  </tr>`).join('')

  const contenu = `
    ${ok==='toggle' ? '<div class="a-ok">&#x2705; Statut mis &#xe0; jour</div>' : ''}
    ${ok==='create' ? '<div class="a-ok">&#x2705; Structure cr&#xe9;&#xe9;e avec succ&#xe8;s</div>' : ''}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div>
        <h2 class="pg-h" style="margin-bottom:2px">&#x1F3E5; Structures sanitaires</h2>
        <p class="pg-sub" style="margin-bottom:0">${(structures??[]).length} structure(s) trouv&#xe9;e(s)</p>
      </div>
      <a href="/admin/structures/nouvelle" class="btn">&#x2795; Nouvelle structure</a>
    </div>
    <form method="GET" action="/admin/structures" style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      <input type="text" name="q" value="${esc(q)}" placeholder="Rechercher par nom..." style="flex:1;min-width:180px">
      <select name="plan" style="width:160px">
        <option value="">Tous les plans</option>
        ${['gratuit','pilote','starter','standard','pro','suspendu'].map(p =>
          `<option value="${p}" ${filtre===p?'selected':''}>${p.charAt(0).toUpperCase()+p.slice(1)}</option>`
        ).join('')}
      </select>
      <button type="submit" class="btn">&#x1F50D;</button>
      ${q||filtre ? `<a href="/admin/structures" class="btn btn-g">Effacer</a>` : ''}
    </form>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nom</th><th>Type</th><th>Niveau</th><th>Plan</th><th>Expiration</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          ${lignes || '<tr><td colspan="7" class="empty">Aucune structure trouv&#xe9;e</td></tr>'}
        </tbody>
      </table>
    </div>`

  return c.html(adminSkeleton(profil, 'Structures', contenu, '/dashboard/admin', 'Dashboard'))
})

// ══════════════════════════════════════════════════════════════
// GET /admin/structures/nouvelle
// ══════════════════════════════════════════════════════════════
adminRoutes.get('/structures/nouvelle', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  const err    = c.req.query('err') || ''

  const contenu = `
    ${err ? `<div class="a-err">&#x26A0; ${esc(decodeURIComponent(err))}</div>` : ''}
    <h2 class="pg-h">Nouvelle structure</h2>
    <p class="pg-sub">Cr&#xe9;er une nouvelle structure dans SantéBF</p>
    <div class="card">
      <form method="POST" action="/admin/structures/nouvelle">
        <div class="grid2">
          <div class="fg" style="grid-column:1/-1">
            <label>Nom de la structure <span style="color:#B71C1C">*</span></label>
            <input type="text" name="nom" placeholder="Ex: CHR de Ouagadougou" required>
          </div>
          <div class="fg">
            <label>Type <span style="color:#B71C1C">*</span></label>
            <select name="type" required>
              <option value="">-- S&#xe9;lectionner --</option>
              <option value="chu">CHU</option>
              <option value="chr">CHR</option>
              <option value="district">Centre de Sant&#xe9; District</option>
              <option value="csps">CSPS</option>
              <option value="clinique">Clinique priv&#xe9;e</option>
              <option value="cabinet">Cabinet m&#xe9;dical</option>
              <option value="pharmacie">Pharmacie</option>
              <option value="laboratoire">Laboratoire</option>
            </select>
          </div>
          <div class="fg">
            <label>Niveau</label>
            <select name="niveau">
              <option value="1">Niveau 1 — Local</option>
              <option value="2">Niveau 2 — District</option>
              <option value="3">Niveau 3 — R&#xe9;gional</option>
              <option value="4">Niveau 4 — National</option>
            </select>
          </div>
          <div class="fg">
            <label>Plan d'abonnement</label>
            <select name="plan_actif">
              <option value="gratuit">Gratuit (6 mois)</option>
              <option value="pilote">Pilote (acc&#xe8;s complet gratuit)</option>
              <option value="starter">Starter — 15 000 FCFA/mois</option>
              <option value="standard">Standard — 40 000 FCFA/mois</option>
              <option value="pro">Pro — 80 000 FCFA/mois</option>
            </select>
          </div>
          <div class="fg">
            <label>T&#xe9;l&#xe9;phone</label>
            <input type="tel" name="telephone" placeholder="70 12 34 56">
          </div>
          <div class="fg" style="grid-column:1/-1">
            <label>Email admin structure <span style="color:#B71C1C">*</span></label>
            <input type="email" name="email_admin" placeholder="admin@structure.bf" required>
            <div style="font-size:11px;color:var(--soft);margin-top:4px">Un compte admin_structure sera cr&#xe9;&#xe9; automatiquement avec cet email</div>
          </div>
        </div>
        <div class="fa">
          <a href="/admin/structures" class="btn btn-g">Annuler</a>
          <button type="submit" class="btn">Cr&#xe9;er la structure &#x2192;</button>
        </div>
      </form>
    </div>`

  return c.html(adminSkeleton(profil, 'Nouvelle structure', contenu, '/admin/structures', 'Structures'))
})

// ══════════════════════════════════════════════════════════════
// POST /admin/structures/nouvelle
// ══════════════════════════════════════════════════════════════
adminRoutes.post('/structures/nouvelle', async (c) => {
  const sb   = c.get('supabase' as never) as any
  const body = await c.req.parseBody()

  const nom        = String(body.nom        || '').trim()
  const type       = String(body.type       || '').trim()
  const niveau     = parseInt(String(body.niveau || '1'))
  const plan_actif = String(body.plan_actif || 'gratuit')
  const telephone  = String(body.telephone  || '').trim() || null

  if (!nom || !type) {
    return c.redirect('/admin/structures/nouvelle?err=Nom+et+type+obligatoires', 303)
  }

  const expire6m  = new Date(Date.now() + 6  * 30 * 24 * 60 * 60 * 1000).toISOString()
  const expire12m = new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: struct, error } = await sb.from('struct_structures').insert({
    nom, type, niveau, plan_actif, telephone, est_actif: true,
    est_pilote: plan_actif === 'pilote',
    abonnement_expire_at: plan_actif === 'gratuit' ? expire6m : expire12m,
  }).select('id').single()

  if (error || !struct) {
    return c.redirect('/admin/structures/nouvelle?err=' + encodeURIComponent(error?.message || 'Erreur'), 303)
  }

  return c.redirect('/admin/structures?ok=create', 303)
})

// ══════════════════════════════════════════════════════════════
// GET /admin/structures/:id
// ══════════════════════════════════════════════════════════════
adminRoutes.get('/structures/:id', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  const sb     = c.get('supabase' as never) as any
  const id     = c.req.param('id')
  const ok     = c.req.query('ok') || ''

  const [structRes, personnelRes, statsRes, abosRes] = await Promise.all([
    sb.from('struct_structures')
      .select('id, nom, type, niveau, plan_actif, abonnement_expire_at, est_actif, est_pilote, telephone, email, created_at')
      .eq('id', id).single(),
    sb.from('auth_profiles')
      .select('id, nom, prenom, role, est_actif, email')
      .eq('structure_id', id).order('role').limit(50),
    Promise.all([
      sb.from('patient_dossiers').select('*', { count: 'exact', head: true }).eq('structure_enregistrement_id', id),
      sb.from('medical_consultations').select('*', { count: 'exact', head: true }).eq('structure_id', id),
      sb.from('medical_ordonnances').select('*', { count: 'exact', head: true }).eq('structure_id', id),
    ]),
    sb.from('struct_abonnements')
      .select('plan, statut, date_debut, date_expiration, mode_paiement, notes')
      .eq('structure_id', id).order('date_debut', { ascending: false }).limit(5),
  ])

  const struct    = structRes.data
  const personnel = personnelRes.data ?? []
  const [patStat, consultStat, ordStat] = statsRes
  const abos = abosRes.data ?? []

  if (!struct) return c.redirect('/admin/structures', 303)

  const expire = struct.abonnement_expire_at
    ? new Date(struct.abonnement_expire_at).toLocaleDateString('fr-FR') : '—'
  const jRestants = struct.abonnement_expire_at
    ? Math.ceil((new Date(struct.abonnement_expire_at).getTime() - Date.now()) / (1000*60*60*24)) : null

  const contenu = `
    ${ok==='plan'   ? '<div class="a-ok">&#x2705; Plan mis &#xe0; jour</div>' : ''}
    ${ok==='toggle' ? '<div class="a-ok">&#x2705; Statut mis &#xe0; jour</div>' : ''}
    ${ok==='compte' ? '<div class="a-ok">&#x2705; Compte mis &#xe0; jour</div>' : ''}

    <!-- Titre + actions -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div>
        <h2 class="pg-h">${esc(struct.nom)}</h2>
        <p class="pg-sub">${esc(struct.type||'')} • Niveau ${struct.niveau} • Créée le ${fmtDate(struct.created_at)}</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <form method="POST" action="/admin/structures/${id}/toggle">
          <button type="submit" class="btn ${struct.est_actif?'btn-r':'btn-v'}">
            ${struct.est_actif?'⏸ Suspendre':'▶ Activer'}
          </button>
        </form>
      </div>
    </div>

    <!-- Stats structure -->
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
      <div class="stat-c" style="border-top-color:#1A6B3C">
        <div class="stat-ico">📂</div>
        <div class="stat-v" style="color:#1A6B3C">${patStat.count??0}</div>
        <div class="stat-l">Patients</div>
      </div>
      <div class="stat-c" style="border-top-color:#1565C0">
        <div class="stat-ico">🩺</div>
        <div class="stat-v" style="color:#1565C0">${consultStat.count??0}</div>
        <div class="stat-l">Consultations</div>
      </div>
      <div class="stat-c" style="border-top-color:#4A148C">
        <div class="stat-ico">💊</div>
        <div class="stat-v" style="color:#4A148C">${ordStat.count??0}</div>
        <div class="stat-l">Ordonnances</div>
      </div>
    </div>

    <div class="grid2">
      <!-- Infos structure -->
      <div class="card">
        <div class="card-title">&#x1F3E5; Informations</div>
        ${[
          ['Statut', struct.est_actif ? badge('Actif','vert') : badge('Inactif','rouge')],
          ['Plan', badge(struct.plan_actif||'gratuit', planColor(struct.plan_actif||'gratuit'))],
          ['Expiration', `${expire}${jRestants !== null ? ` <span style="font-size:11px;color:${jRestants<30?'#B71C1C':'#6B7280'}">(${jRestants>0?jRestants+' j. restants':'expiré'})</span>` : ''}`],
          ['T&#xe9;l.', esc(struct.telephone||'—')],
          ['Email', esc(struct.email||'—')],
        ].map(([k,v]) => `
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--brd);font-size:13px">
            <span style="color:var(--soft)">${k}</span><span>${v}</span>
          </div>
        `).join('')}
      </div>

      <!-- Modifier plan -->
      <div class="card">
        <div class="card-title">&#x1F4B3; Modifier le plan</div>
        <form method="POST" action="/admin/structures/${id}/plan">
          <div class="fg">
            <label>Plan</label>
            <select name="plan">
              ${['gratuit','pilote','starter','standard','pro','suspendu'].map(p =>
                `<option value="${p}" ${struct.plan_actif===p?'selected':''}>${p==='gratuit'?'Gratuit':p==='pilote'?'Pilote (accès complet)':p==='starter'?'Starter — 15 000 FCFA/mois':p==='standard'?'Standard — 40 000 FCFA/mois':p==='pro'?'Pro — 80 000 FCFA/mois':'Suspendu'}</option>`
              ).join('')}
            </select>
          </div>
          <div class="fg">
            <label>Dur&#xe9;e</label>
            <select name="duree">
              <option value="1m">1 mois</option>
              <option value="3m">3 mois</option>
              <option value="6m">6 mois</option>
              <option value="1a" selected>1 an</option>
              <option value="2a">2 ans</option>
            </select>
          </div>
          <button type="submit" class="btn" style="width:100%">&#x2705; Appliquer le plan</button>
        </form>
      </div>
    </div>

    <!-- Personnel -->
    <div class="table-wrap">
      <div style="padding:12px 16px;background:var(--c);display:flex;justify-content:space-between;align-items:center">
        <h3 style="font-size:13px;color:white;font-weight:600">&#x1F465; Personnel (${personnel.length})</h3>
      </div>
      <table>
        <thead><tr><th>Nom</th><th>R&#xf4;le</th><th>Email</th><th>Statut</th><th>Action</th></tr></thead>
        <tbody>
          ${personnel.length === 0 ? '<tr><td colspan="5" class="empty">Aucun personnel</td></tr>' :
            personnel.map((p: any) => `<tr>
              <td><strong>${esc(p.prenom)} ${esc(p.nom)}</strong></td>
              <td>${badge(esc(p.role.replace(/_/g,' ')), 'bleu')}</td>
              <td style="font-size:11px;font-family:monospace">${esc(p.email||'—')}</td>
              <td>${p.est_actif ? badge('Actif','vert') : badge('Inactif','rouge')}</td>
              <td>
                <form method="POST" action="/admin/comptes/${p.id}/toggle?retour=/admin/structures/${id}">
                  <button type="submit" class="btn-sm" style="background:${p.est_actif?'#FFF5F5':'#E8F5E9'};color:${p.est_actif?'#B71C1C':'#1A6B3C'};padding:3px 9px;border:none;cursor:pointer;border-radius:6px;font-size:11px;font-family:inherit">
                    ${p.est_actif?'Suspendre':'Activer'}
                  </button>
                </form>
              </td>
            </tr>`).join('')
          }
        </tbody>
      </table>
    </div>

    <!-- Historique abonnements -->
    ${abos.length > 0 ? `
    <div class="table-wrap">
      <div style="padding:12px 16px;background:var(--c)"><h3 style="font-size:13px;color:white;font-weight:600">📋 Historique abonnements</h3></div>
      <table>
        <thead><tr><th>Plan</th><th>D&#xe9;but</th><th>Fin</th><th>Mode</th><th>Statut</th><th>Notes</th></tr></thead>
        <tbody>
          ${abos.map((a: any) => `<tr>
            <td>${badge(a.plan||'—', planColor(a.plan||''))}</td>
            <td style="font-size:12px">${fmtDate(a.date_debut)}</td>
            <td style="font-size:12px">${fmtDate(a.date_expiration)}</td>
            <td style="font-size:12px">${esc(a.mode_paiement||'—')}</td>
            <td>${badge(a.statut||'—', a.statut==='actif'?'vert':a.statut==='suspendu'?'rouge':'gris')}</td>
            <td style="font-size:11px;color:var(--soft)">${esc(a.notes||'—')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}
  `

  return c.html(adminSkeleton(profil, struct.nom, contenu, '/admin/structures', 'Structures'))
})

// ══════════════════════════════════════════════════════════════
// POST /admin/structures/:id/plan
// ══════════════════════════════════════════════════════════════
adminRoutes.post('/structures/:id/plan', async (c) => {
  const sb   = c.get('supabase' as never) as any
  const id   = c.req.param('id')
  const body = await c.req.parseBody()

  const plan  = String(body.plan  || 'gratuit')
  const duree = String(body.duree || '1a')
  const mois: Record<string,number> = { '1m':1, '3m':3, '6m':6, '1a':12, '2a':24 }
  const expire = new Date(Date.now() + (mois[duree]||12) * 30 * 24 * 60 * 60 * 1000).toISOString()

  await sb.from('struct_structures').update({
    plan_actif: plan, abonnement_expire_at: expire, est_pilote: plan === 'pilote',
  }).eq('id', id)

  await sb.from('struct_abonnements').insert({
    structure_id: id, plan, statut: plan === 'suspendu' ? 'suspendu' : 'actif',
    date_debut: new Date().toISOString(), date_expiration: expire,
    mode_paiement: 'manuel', notes: 'Activé manuellement par super_admin',
  }).catch(() => {})

  return c.redirect(`/admin/structures/${id}?ok=plan`, 303)
})

// ══════════════════════════════════════════════════════════════
// POST /admin/structures/:id/toggle
// ══════════════════════════════════════════════════════════════
adminRoutes.post('/structures/:id/toggle', async (c) => {
  const sb = c.get('supabase' as never) as any
  const id = c.req.param('id')

  const { data: s } = await sb.from('struct_structures').select('est_actif').eq('id', id).single()
  if (s) await sb.from('struct_structures').update({ est_actif: !s.est_actif }).eq('id', id)

  const retour = c.req.header('referer') || `/admin/structures/${id}`
  return c.redirect(retour.includes('/structures/') ? `/admin/structures/${id}?ok=toggle` : '/admin/structures?ok=toggle', 303)
})

// ══════════════════════════════════════════════════════════════
// GET /admin/comptes
// ══════════════════════════════════════════════════════════════
adminRoutes.get('/comptes', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  const sb     = c.get('supabase' as never) as any
  const q      = c.req.query('q')    || ''
  const role   = c.req.query('role') || ''
  const ok     = c.req.query('ok')   || ''

  let query = sb.from('auth_profiles')
    .select('id, nom, prenom, email, role, est_actif, created_at, structure_id, struct_structures(nom)')
    .order('created_at', { ascending: false })
    .limit(80)

  if (q.length >= 2) query = query.or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,email.ilike.%${q}%`)
  if (role) query = query.eq('role', role)

  const { data: comptes } = await query

  const lignes = (comptes ?? []).map((u: any) => {
    const struct = u.struct_structures as any
    return `<tr>
      <td><strong>${esc(u.prenom)} ${esc(u.nom)}</strong></td>
      <td style="font-size:11px;font-family:monospace">${esc(u.email||'—')}</td>
      <td>${badge(esc(u.role.replace(/_/g,' ')), 'bleu')}</td>
      <td style="font-size:12px">${esc(struct?.nom||'—')}</td>
      <td>${u.est_actif ? badge('Actif','vert') : badge('Inactif','rouge')}</td>
      <td>
        <form method="POST" action="/admin/comptes/${u.id}/toggle?retour=/admin/comptes" style="display:inline">
          <button type="submit" class="btn-sm" style="background:${u.est_actif?'#FFF5F5':'#E8F5E9'};color:${u.est_actif?'#B71C1C':'#1A6B3C'};padding:3px 9px;border:none;cursor:pointer;border-radius:6px;font-size:11px;font-family:inherit">
            ${u.est_actif?'Suspendre':'Activer'}
          </button>
        </form>
      </td>
    </tr>`
  }).join('')

  const roles = ['medecin','infirmier','sage_femme','laborantin','radiologue','pharmacien',
    'caissier','agent_accueil','admin_structure','patient','super_admin']

  const contenu = `
    ${ok==='toggle' ? '<div class="a-ok">&#x2705; Statut compte mis &#xe0; jour</div>' : ''}
    <h2 class="pg-h">&#x1F465; Comptes utilisateurs</h2>
    <p class="pg-sub">${(comptes??[]).length} compte(s)</p>
    <form method="GET" action="/admin/comptes" style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      <input type="text" name="q" value="${esc(q)}" placeholder="Nom, pr&#xe9;nom ou email..." style="flex:1;min-width:180px">
      <select name="role" style="width:180px">
        <option value="">Tous les r&#xf4;les</option>
        ${roles.map(r => `<option value="${r}" ${role===r?'selected':''}>${r.replace(/_/g,' ')}</option>`).join('')}
      </select>
      <button type="submit" class="btn">&#x1F50D;</button>
      ${q||role ? `<a href="/admin/comptes" class="btn btn-g">Effacer</a>` : ''}
    </form>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nom</th><th>Email</th><th>R&#xf4;le</th><th>Structure</th><th>Statut</th><th>Action</th></tr></thead>
        <tbody>${lignes || '<tr><td colspan="6" class="empty">Aucun compte trouv&#xe9;</td></tr>'}</tbody>
      </table>
    </div>`

  return c.html(adminSkeleton(profil, 'Comptes', contenu, '/dashboard/admin', 'Dashboard'))
})

// ══════════════════════════════════════════════════════════════
// POST /admin/comptes/:id/toggle
// ══════════════════════════════════════════════════════════════
adminRoutes.post('/comptes/:id/toggle', async (c) => {
  const sb     = c.get('supabase' as never) as any
  const id     = c.req.param('id')
  const retour = c.req.query('retour') || '/admin/comptes'

  const { data: u } = await sb.from('auth_profiles').select('est_actif').eq('id', id).single()
  if (u) await sb.from('auth_profiles').update({ est_actif: !u.est_actif }).eq('id', id)

  return c.redirect(retour + '?ok=toggle', 303)
})

// ══════════════════════════════════════════════════════════════
// GET /admin/plans
// ══════════════════════════════════════════════════════════════
adminRoutes.get('/plans', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  const sb     = c.get('supabase' as never) as any

  const { data: structs } = await sb.from('struct_structures')
    .select('id, nom, plan_actif, abonnement_expire_at, est_actif')
    .order('nom').limit(100)

  const grouped: Record<string, any[]> = {}
  for (const s of structs || []) {
    const p = s.plan_actif || 'gratuit'
    if (!grouped[p]) grouped[p] = []
    grouped[p].push(s)
  }

  const ordre = ['pro','standard','starter','pilote','gratuit','suspendu']
  const pColors: Record<string,string> = {
    pro:'vert', standard:'bleu', starter:'orange', pilote:'violet', gratuit:'gris', suspendu:'rouge'
  }

  const now = Date.now()

  const sections = ordre
    .filter(p => grouped[p]?.length > 0)
    .map(p => {
      const list = grouped[p]
      const rows = list.map((s: any) => {
        const jR = s.abonnement_expire_at
          ? Math.ceil((new Date(s.abonnement_expire_at).getTime()-now)/(1000*60*60*24)) : null
        const alerte = jR !== null && jR < 30
        return `<tr>
          <td><strong>${esc(s.nom)}</strong></td>
          <td style="font-size:12px">${fmtDate(s.abonnement_expire_at)}${alerte?` <span style="color:#B71C1C;font-size:11px">(${jR>0?jR+' j.':'expiré'})</span>`:''}</td>
          <td>${s.est_actif ? badge('Actif','vert') : badge('Inactif','rouge')}</td>
          <td><a href="/admin/structures/${s.id}" style="color:#4A148C;font-size:13px;font-weight:700;text-decoration:none">Modifier →</a></td>
        </tr>`
      }).join('')
      return `
        <div style="margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <h3 style="font-size:15px;font-weight:700">${p.toUpperCase()}</h3>
            ${badge(`${list.length} structure(s)`, pColors[p]||'gris')}
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Structure</th><th>Expiration</th><th>Statut</th><th>Action</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>`
    }).join('')

  const contenu = `
    <h2 class="pg-h">&#x1F4B3; Plans &amp; Abonnements</h2>
    <p class="pg-sub">G&#xe9;rez les plans d'abonnement. Cliquez sur une structure pour modifier son plan.</p>
    ${sections || '<div class="empty">Aucune structure</div>'}`

  return c.html(adminSkeleton(profil, 'Plans', contenu, '/dashboard/admin', 'Dashboard'))
})

// ══════════════════════════════════════════════════════════════
// GET /admin/stats
// ══════════════════════════════════════════════════════════════
adminRoutes.get('/stats', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  const sb     = c.get('supabase' as never) as any

  const [stRes, cpRes, ptRes, csRes, ordRes, examRes, rdvRes, dongRes] = await Promise.all([
    sb.from('struct_structures').select('*', { count:'exact', head:true }),
    sb.from('auth_profiles').select('*', { count:'exact', head:true }),
    sb.from('patient_dossiers').select('*', { count:'exact', head:true }),
    sb.from('medical_consultations').select('*', { count:'exact', head:true }),
    sb.from('medical_ordonnances').select('*', { count:'exact', head:true }),
    sb.from('medical_examens').select('*', { count:'exact', head:true }),
    sb.from('medical_rendez_vous').select('*', { count:'exact', head:true }),
    sb.from('sang_donneurs').select('*', { count:'exact', head:true }).catch(() => ({ count: 0 })),
  ])

  // Top structures actives
  const { data: topStructs } = await sb.from('struct_structures')
    .select('id, nom, plan_actif').eq('est_actif', true).order('nom').limit(10)

  const contenu = `
    <h2 class="pg-h">&#x1F4CA; Statistiques nationales</h2>
    <p class="pg-sub">Vue globale de la plateforme SantéBF</p>
    <div class="stats-grid">
      <div class="stat-c" style="border-top-color:#4A148C"><div class="stat-ico">🏥</div><div class="stat-v" style="color:#4A148C">${stRes.count??0}</div><div class="stat-l">Structures</div></div>
      <div class="stat-c" style="border-top-color:#1565C0"><div class="stat-ico">👥</div><div class="stat-v" style="color:#1565C0">${cpRes.count??0}</div><div class="stat-l">Comptes</div></div>
      <div class="stat-c" style="border-top-color:#1A6B3C"><div class="stat-ico">📂</div><div class="stat-v" style="color:#1A6B3C">${ptRes.count??0}</div><div class="stat-l">Dossiers patients</div></div>
      <div class="stat-c" style="border-top-color:#1565C0"><div class="stat-ico">🩺</div><div class="stat-v" style="color:#1565C0">${csRes.count??0}</div><div class="stat-l">Consultations</div></div>
      <div class="stat-c" style="border-top-color:#4A148C"><div class="stat-ico">💊</div><div class="stat-v" style="color:#4A148C">${ordRes.count??0}</div><div class="stat-l">Ordonnances</div></div>
      <div class="stat-c" style="border-top-color:#1565C0"><div class="stat-ico">🔬</div><div class="stat-v" style="color:#1565C0">${examRes.count??0}</div><div class="stat-l">Examens</div></div>
      <div class="stat-c" style="border-top-color:#1A6B3C"><div class="stat-ico">📅</div><div class="stat-v" style="color:#1A6B3C">${rdvRes.count??0}</div><div class="stat-l">Rendez-vous</div></div>
      <div class="stat-c" style="border-top-color:#B71C1C"><div class="stat-ico">🩸</div><div class="stat-v" style="color:#B71C1C">${dongRes.count??0}</div><div class="stat-l">Donneurs sang</div></div>
    </div>
    <div class="table-wrap">
      <div style="padding:12px 16px;background:var(--c)"><h3 style="font-size:13px;color:white;font-weight:600">🏥 Structures actives</h3></div>
      <table>
        <thead><tr><th>Structure</th><th>Plan</th><th>Actions</th></tr></thead>
        <tbody>
          ${(topStructs??[]).map((s:any) => `<tr>
            <td>${esc(s.nom)}</td>
            <td>${badge(s.plan_actif||'gratuit', planColor(s.plan_actif||'gratuit'))}</td>
            <td><a href="/admin/structures/${s.id}" style="color:#4A148C;font-size:13px;font-weight:700;text-decoration:none">Voir →</a></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`

  return c.html(adminSkeleton(profil, 'Statistiques', contenu, '/dashboard/admin', 'Dashboard'))
})

// ══════════════════════════════════════════════════════════════
// GET /admin/paiements
// ══════════════════════════════════════════════════════════════
adminRoutes.get('/paiements', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  const sb     = c.get('supabase' as never) as any

  const { data: paiements } = await sb.from('struct_abonnements')
    .select('id, plan, statut, montant, mode_paiement, date_debut, date_expiration, notes, structure_id, struct_structures(nom)')
    .order('date_debut', { ascending: false })
    .limit(100)

  const lignes = (paiements ?? []).map((p: any) => {
    const struct = p.struct_structures as any
    return `<tr>
      <td><strong>${esc(struct?.nom||'—')}</strong></td>
      <td>${badge(p.plan||'—', planColor(p.plan||''))}</td>
      <td style="font-size:12px">${fmtDate(p.date_debut)}</td>
      <td style="font-size:12px">${fmtDate(p.date_expiration)}</td>
      <td style="font-size:12px">${esc(p.mode_paiement||'—')}</td>
      <td>${p.montant ? `${Number(p.montant).toLocaleString('fr-FR')} FCFA` : '—'}</td>
      <td>${badge(p.statut||'—', p.statut==='actif'?'vert':p.statut==='suspendu'?'rouge':p.statut==='en_attente'?'orange':'gris')}</td>
    </tr>`
  }).join('')

  const contenu = `
    <h2 class="pg-h">&#x1F4B0; Historique paiements</h2>
    <p class="pg-sub">${(paiements??[]).length} enregistrement(s)</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Structure</th><th>Plan</th><th>D&#xe9;but</th><th>Fin</th><th>Mode</th><th>Montant</th><th>Statut</th></tr></thead>
        <tbody>${lignes || '<tr><td colspan="7" class="empty">Aucun paiement enregistr&#xe9;</td></tr>'}</tbody>
      </table>
    </div>`

  return c.html(adminSkeleton(profil, 'Paiements', contenu, '/dashboard/admin', 'Dashboard'))
})

// ══════════════════════════════════════════════════════════════
// GET /admin/systeme
// ══════════════════════════════════════════════════════════════
adminRoutes.get('/systeme', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  const env    = c.env

  function ligne(nom: string, ok: boolean, valeur: string, lien?: string): string {
    return `
      <div class="status-row">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="${ok?'sdot-on':'sdot-off'}"></span>
          <div>
            <div style="font-size:13px;font-weight:600;font-family:monospace">${esc(nom)}</div>
            <div style="font-size:11px;color:var(--soft)">${esc(valeur)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${ok
            ? '<span style="background:#E8F5E9;color:#1A6B3C;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">✅ Configuré</span>'
            : '<span style="background:#FFF5F5;color:#B71C1C;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">❌ Manquant</span>'
          }
          ${lien ? `<a href="${esc(lien)}" target="_blank" style="font-size:11px;color:#1565C0">Obtenir →</a>` : ''}
        </div>
      </div>`
  }

  const iaActif = !!(env.ANTHROPIC_API_KEY || env.GEMINI_API_KEY || env.HUGGINGFACE_API_KEY)
  const iaModele = env.ANTHROPIC_API_KEY ? 'Claude Haiku' : env.GEMINI_API_KEY ? 'Gemini Flash-Lite' : env.HUGGINGFACE_API_KEY ? 'HuggingFace' : 'Aucun'

  const contenu = `
    <h2 class="pg-h">&#x2699;&#xFE0F; Statut syst&#xe8;me</h2>
    <p class="pg-sub">&#xc9;tat de toutes les variables d'environnement Cloudflare</p>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title">&#x1F5C4;&#xFE0F; Infrastructure</div>
      ${ligne('SUPABASE_URL', !!env.SUPABASE_URL, env.SUPABASE_URL ? 'Configuré' : 'Non configuré')}
      ${ligne('SUPABASE_ANON_KEY', !!env.SUPABASE_ANON_KEY, env.SUPABASE_ANON_KEY ? 'Configuré' : 'Non configuré')}
      ${ligne('ENVIRONMENT', !!(env as any).ENVIRONMENT, (env as any).ENVIRONMENT || 'Non défini')}
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title">&#x1F4E7; Emails</div>
      ${ligne('RESEND_API_KEY', !!(env as any).RESEND_API_KEY, (env as any).RESEND_API_KEY ? 'Configuré' : 'Non configuré', 'https://resend.com')}
      ${ligne('BREVO_API_KEY', !!(env as any).BREVO_API_KEY, (env as any).BREVO_API_KEY ? 'Configuré' : 'Non configuré (optionnel)', 'https://brevo.com')}
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title">&#x1F514; Notifications Push (FCM)</div>
      ${ligne('FCM_PROJECT_ID', !!env.FCM_PROJECT_ID, env.FCM_PROJECT_ID || 'Non configuré')}
      ${ligne('FCM_CLIENT_EMAIL', !!env.FCM_CLIENT_EMAIL, env.FCM_CLIENT_EMAIL || 'Non configuré')}
      ${ligne('FCM_PRIVATE_KEY', !!env.FCM_PRIVATE_KEY, env.FCM_PRIVATE_KEY ? 'Configuré (clé privée présente)' : 'Non configuré')}
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title">&#x1F916; IA M&#xe9;dicale ${iaActif ? `<span style="font-size:11px;color:#1565C0;margin-left:8px">Actif: ${iaModele}</span>` : ''}</div>
      ${ligne('ANTHROPIC_API_KEY', !!env.ANTHROPIC_API_KEY, env.ANTHROPIC_API_KEY ? 'Claude Haiku actif' : 'Non configuré', 'https://console.anthropic.com')}
      ${ligne('GEMINI_API_KEY', !!env.GEMINI_API_KEY, env.GEMINI_API_KEY ? 'Gemini Flash-Lite actif (gratuit)' : 'Non configuré', 'https://aistudio.google.com')}
      ${ligne('HUGGINGFACE_API_KEY', !!env.HUGGINGFACE_API_KEY, env.HUGGINGFACE_API_KEY ? 'HuggingFace actif' : 'Non configuré', 'https://huggingface.co')}
      ${ligne('IA_MODEL', !!(env as any).IA_MODEL, (env as any).IA_MODEL || 'auto (détection automatique)')}
      <div style="margin-top:12px"><a href="/ia/config" class="btn" style="font-size:12px;padding:7px 14px">Configurer l'IA →</a></div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title">&#x1F4B3; Paiement</div>
      ${ligne('CINETPAY_SITE_ID', !!env.CINETPAY_SITE_ID, env.CINETPAY_SITE_ID || 'Non configuré', 'https://cinetpay.com')}
      ${ligne('CINETPAY_API_KEY', !!env.CINETPAY_API_KEY, env.CINETPAY_API_KEY ? 'Configuré' : 'Non configuré')}
      ${ligne('CINETPAY_SECRET', !!env.CINETPAY_SECRET, env.CINETPAY_SECRET ? 'Configuré' : 'Non configuré')}
      ${ligne('DUNIAPAY_API_KEY', !!env.DUNIAPAY_API_KEY, env.DUNIAPAY_API_KEY ? 'Configuré' : 'Non configuré (optionnel)')}
    </div>

    <div style="background:#E3F2FD;border-left:4px solid #1565C0;border-radius:9px;padding:13px 16px;font-size:13px;color:#1a3a6b">
      &#x2139;&#xFE0F; Pour ajouter ou modifier des variables : aller dans <strong>Cloudflare Pages → sante-bf → Param&#xe8;tres → Variables et secrets</strong> puis <strong>Redéployer</strong>.
    </div>`

  return c.html(adminSkeleton(profil, 'Statut système', contenu, '/dashboard/admin', 'Dashboard'))
})

// ══════════════════════════════════════════════════════════════
// GET /admin/logs
// ══════════════════════════════════════════════════════════════
adminRoutes.get('/logs', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  const sb     = c.get('supabase' as never) as any

  // Logs IA si la table existe
  const { data: logsIA } = await sb.from('usage_ia_logs')
    .select('fonctionnalite, modele, tokens_approx, created_at, struct_structures(nom)')
    .order('created_at', { ascending: false })
    .limit(50)
    .catch(() => ({ data: [] }))

  const rows = (logsIA ?? []).map((l: any) => `<tr>
    <td style="font-size:11px">${l.created_at ? new Date(l.created_at).toLocaleString('fr-FR') : '—'}</td>
    <td>${esc(l.fonctionnalite||'—')}</td>
    <td style="font-size:12px">${esc(l.modele||'—')}</td>
    <td>${l.tokens_approx||'—'}</td>
    <td style="font-size:12px">${esc((l.struct_structures as any)?.nom||'—')}</td>
  </tr>`).join('')

  const contenu = `
    <h2 class="pg-h">&#x1F4CB; Logs syst&#xe8;me</h2>
    <p class="pg-sub">Activit&#xe9; de la plateforme</p>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title">&#x1F916; Utilisation IA (${(logsIA??[]).length} entr&#xe9;es r&#xe9;centes)</div>
      ${(logsIA??[]).length === 0
        ? '<div class="empty">Aucun log IA (table usage_ia_logs vide ou non créée)</div>'
        : `<div class="table-wrap" style="box-shadow:none;border:none">
          <table>
            <thead><tr><th>Date</th><th>Fonction</th><th>Modèle</th><th>Tokens ~</th><th>Structure</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`
      }
    </div>

    <div class="card">
      <div class="card-title">&#x2699;&#xFE0F; Logs Cloudflare</div>
      <p style="font-size:13px;color:var(--soft);margin-bottom:12px">Pour les logs d'erreurs serveur en temps r&#xe9;el :</p>
      <a href="https://dash.cloudflare.com" target="_blank" class="btn" style="font-size:12px">
        Ouvrir Cloudflare Dashboard →
      </a>
    </div>`

  return c.html(adminSkeleton(profil, 'Logs', contenu, '/dashboard/admin', 'Dashboard'))
})

// ══════════════════════════════════════════════════════════════
// Redirections
// ══════════════════════════════════════════════════════════════
adminRoutes.get('/cnts',  (c) => c.redirect('/dashboard/cnts', 302))
adminRoutes.get('/sang',  (c) => c.redirect('/dashboard/cnts', 302))
adminRoutes.get('/ia',    (c) => c.redirect('/ia/config', 302))
 