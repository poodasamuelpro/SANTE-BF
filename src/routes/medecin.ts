/**
 * src/routes/medecin.ts
 * SantéBF — Module Médecin complet
 * Cloudflare Pages / Hono — Compatible Workers (pas de Node.js APIs)
 *
 * Modules couverts :
 *  2  — Recherche patients + accès urgence (code 6 chiffres)
 *  3  — Consultation (constantes vitales, alertes, RDV suivi)
 *  4  — Ordonnances (PDF pdfmake, QR code, email Resend)
 *  5  — Examens
 *  6  — Rendez-vous (CRUD, statuts, rappel email)
 *  7  — Suivi maladies chroniques + bilans JSONB
 *  8  — Grossesse / CPN
 *  9  — Hospitalisations (lit auto, transfert)
 *  10 — Documents médicaux (upload Supabase Storage)
 *  11 — Profil médecin (avatar, structures, spécialité)
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import type { AuthProfile } from '../lib/supabase'

// ─── Types ───────────────────────────────────────────────
type Bindings = {
  SUPABASE_URL:    string
  SUPABASE_ANON_KEY: string
  RESEND_API_KEY:  string
}

export const medecinRoutes = new Hono<{ Bindings: Bindings }>()

medecinRoutes.use(
  '/*',
  requireAuth,
  requireRole('medecin', 'infirmier', 'sage_femme', 'laborantin', 'radiologue')
)

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
}

function age(ddn: string): number {
  return Math.floor((Date.now() - new Date(ddn).getTime()) / (365.25 * 24 * 3600 * 1000))
}

function fmtD(d: string): string {
  return d ? new Date(d).toLocaleDateString('fr-FR') : ''
}

function fmtDT(d: string): string {
  return d ? new Date(d).toLocaleString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  }) : ''
}

// Envoi email via Resend (Workers fetch — pas de SDK Node)
async function sendEmail(opts: {
  resendKey:    string
  to:           string
  subject:      string
  html:         string
}): Promise<void> {
  try {
    await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + opts.resendKey,
      },
      body: JSON.stringify({
        from:    'SantéBF <noreply@santebf.izicardouaga.com>',
        to:      [opts.to],
        subject: opts.subject,
        html:    opts.html,
      }),
    })
  } catch {
    // Ne pas faire crasher la route si l'email échoue
  }
}

// ═══════════════════════════════════════════════════════════
// CSS + HEADER COMMUNS
// ═══════════════════════════════════════════════════════════

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">`

const CSS_BASE = `<style>
/* ── Reset ── */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
/* ── Mode sombre ── */
:root{
  --bg:#F7F8FA;--surface:white;--surface2:#F3F4F6;--border:#E0E0E0;
  --text:#1A1A2E;--text2:#6B7280;--text3:#9E9E9E;
  --violet:#4A148C;--violet2:#6A1B9A;--violet-light:#EDE7F6;--violet-glow:rgba(74,20,140,.08);
  --vert:#1A6B3C;--vert-light:#E8F5E9;
  --bleu:#1565C0;--bleu-light:#E3F2FD;
  --rouge:#B71C1C;--rouge-light:#FFF5F5;
  --orange:#E65100;--orange-light:#FFF3E0;
}
[data-theme="dark"]{
  --bg:#0F1117;--surface:#1A1B2E;--surface2:#252637;--border:#2E3047;
  --text:#E8E8F0;--text2:#9BA3B8;--text3:#5A6080;
  --violet-light:#2A1550;--violet-glow:rgba(106,27,154,.15);
  --vert-light:#0A2E1A;--bleu-light:#0A1F3A;
  --rouge-light:#2A0A0A;--orange-light:#2A1500;
}
/* ── Base ── */
body{font-family:'DM Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--text);transition:background .2s,color .2s}
/* ── Header ── */
.hd{background:var(--violet);padding:0 24px;height:60px;display:flex;align-items:center;
  justify-content:space-between;position:sticky;top:0;z-index:200;box-shadow:0 2px 8px rgba(0,0,0,.2)}
.hd-left{display:flex;align-items:center;gap:12px}
.hd-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
.hd-icon{width:32px;height:32px;background:rgba(255,255,255,.2);border-radius:8px;
  display:flex;align-items:center;justify-content:center;font-size:16px}
.hd-title{font-family:'DM Serif Display',serif;font-size:17px;color:white}
.hd-sub{font-family:'DM Sans',sans-serif;font-size:10px;opacity:.65;display:block}
.hd-right{display:flex;align-items:center;gap:8px}
.hd-user{background:rgba(255,255,255,.12);border-radius:8px;padding:5px 11px}
.hd-user strong{display:block;font-size:12.5px;color:white}
.hd-user small{font-size:10.5px;color:rgba(255,255,255,.65)}
.hd-avatar{width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.3)}
.hd-avatar-init{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);
  display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white}
.hd-btn{background:rgba(255,255,255,.15);color:white;border:none;padding:7px 12px;border-radius:7px;
  font-size:12px;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;transition:background .15s}
.hd-btn:hover{background:rgba(255,255,255,.25)}
/* ── Dark toggle ── */
.dark-toggle{background:rgba(255,255,255,.12);border:none;width:32px;height:32px;border-radius:8px;
  cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:background .15s}
.dark-toggle:hover{background:rgba(255,255,255,.22)}
/* ── Layout ── */
.wrap{max-width:1100px;margin:0 auto;padding:28px 20px}
.page-title{font-family:'DM Serif Display',serif;font-size:26px;color:var(--text);margin-bottom:4px}
.breadcrumb{font-size:12px;color:var(--text2);margin-bottom:14px}
.breadcrumb a{color:var(--violet);text-decoration:none}
/* ── Alertes ── */
.alert-err{background:var(--rouge-light);border-left:4px solid var(--rouge);padding:11px 15px;
  border-radius:8px;margin-bottom:18px;font-size:13px;color:var(--rouge)}
.alert-ok{background:var(--vert-light);border-left:4px solid var(--vert);padding:11px 15px;
  border-radius:8px;margin-bottom:18px;font-size:13px;color:var(--vert)}
.alert-warn{background:var(--orange-light);border-left:4px solid var(--orange);padding:11px 15px;
  border-radius:8px;margin-bottom:18px;font-size:13px;color:var(--orange)}
/* ── Boutons ── */
.btn{display:inline-block;background:var(--violet);color:white;padding:10px 20px;border:none;
  border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;
  font-family:'DM Sans',sans-serif;transition:opacity .15s}
.btn:hover{opacity:.88}
.btn-v{display:inline-block;background:var(--vert);color:white;padding:10px 20px;border:none;
  border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
.btn-b{display:inline-block;background:var(--bleu);color:white;padding:10px 20px;border:none;
  border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
.btn-g{display:inline-block;background:var(--surface2);color:var(--text);padding:10px 20px;border:none;
  border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;border:1px solid var(--border)}
.btn-r{display:inline-block;background:var(--rouge-light);color:var(--rouge);padding:8px 14px;border:1px solid #FFCDD2;
  border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
.btn-sm{display:inline-block;background:var(--violet);color:white;padding:4px 11px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none}
.btn-sm-v{display:inline-block;background:var(--vert);color:white;padding:4px 11px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none}
/* ── Card ── */
.card{background:var(--surface);border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);
  overflow:hidden;margin-bottom:22px;border:1px solid var(--border)}
.card-body{padding:22px}
/* ── Table ── */
table{width:100%;border-collapse:collapse}
thead tr{background:var(--violet)}
thead th{padding:11px 15px;text-align:left;font-size:11px;color:white;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
tbody tr{border-bottom:1px solid var(--border);transition:background .12s}
tbody tr:hover{background:var(--surface2)}
tbody td{padding:11px 15px;font-size:14px;color:var(--text)}
tbody tr:last-child{border-bottom:none}
.empty{padding:30px;text-align:center;color:var(--text3);font-style:italic;font-size:13px}
/* ── Formulaires ── */
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.fg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.fg.full{grid-column:1/-1}
label{display:block;font-size:12.5px;font-weight:600;color:var(--text);margin-bottom:6px}
input,select,textarea{width:100%;padding:10px 13px;font-family:'DM Sans',sans-serif;font-size:14px;
  border:1.5px solid var(--border);border-radius:9px;background:var(--surface2);color:var(--text);
  outline:none;transition:border-color .18s,box-shadow .18s}
input:focus,select:focus,textarea:focus{border-color:var(--violet);background:var(--surface);box-shadow:0 0 0 4px var(--violet-glow)}
textarea{resize:vertical;min-height:88px}
.form-actions{display:flex;gap:10px;margin-top:26px;justify-content:flex-end;flex-wrap:wrap}
.sec-title{font-size:12px;font-weight:700;color:var(--violet);text-transform:uppercase;
  letter-spacing:.6px;margin:18px 0 12px;padding-top:18px;border-top:1px solid var(--border)}
/* ── Patient mini card ── */
.pt-mini{background:var(--violet-light);border-radius:10px;padding:13px 15px;margin-bottom:22px;
  display:flex;align-items:center;gap:14px;border-left:4px solid var(--violet);flex-wrap:wrap}
.pt-nom{font-size:15px;font-weight:700;color:var(--text)}
.pt-info{font-size:12px;color:var(--text2)}
.pt-tag{background:var(--surface);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;color:var(--violet)}
/* ── Badges ── */
.badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;display:inline-block}
.badge.active,.badge.confirme,.badge.en_cours,.badge.resultat_disponible{background:var(--vert-light);color:var(--vert)}
.badge.planifie,.badge.prescrit{background:var(--violet-light);color:var(--violet)}
.badge.expiree,.badge.passe,.badge.annule,.badge.absent,.badge.annulee{background:var(--surface2);color:var(--text3)}
.badge.delivree,.badge.arrive,.badge.accepte{background:var(--bleu-light);color:var(--bleu)}
.badge.grave,.badge.critique,.badge.refuse{background:var(--rouge-light);color:var(--rouge)}
.badge.stable{background:var(--vert-light);color:var(--vert)}
.badge.urgent{background:var(--orange-light);color:var(--orange)}
/* ── Search ── */
.search-wrap{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
.search-wrap input{flex:1;min-width:180px;padding:11px 15px;border:1.5px solid var(--border);
  border-radius:9px;font-size:14px;font-family:'DM Sans',sans-serif;background:var(--surface2);color:var(--text);outline:none}
.search-wrap input:focus{border-color:var(--violet);background:var(--surface)}
.search-wrap button{background:var(--violet);color:white;border:none;padding:11px 18px;border-radius:9px;
  font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap}
/* ── Numéro national ── */
.nn{font-family:monospace;background:var(--violet-light);color:var(--violet);padding:2px 7px;border-radius:4px;font-size:12.5px}
/* ── Ordonnance médicaments ── */
.med-bloc{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:15px;margin-bottom:11px;position:relative}
.med-g4{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:9px}
.med-g2{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:8px}
.btn-add-med{background:var(--vert-light);color:var(--vert);border:1.5px dashed var(--vert);
  padding:10px;border-radius:8px;width:100%;font-size:13px;font-weight:600;cursor:pointer;
  font-family:'DM Sans',sans-serif;margin-top:4px}
.btn-del-med{position:absolute;top:8px;right:8px;background:none;border:none;
  color:var(--text3);cursor:pointer;font-size:16px;line-height:1}
/* ── Constantes alerte ── */
.const-alert{background:var(--rouge-light);border-left:4px solid var(--rouge);padding:10px 14px;
  border-radius:8px;margin-bottom:12px;font-size:12px;color:var(--rouge);display:none}
.const-alert.show{display:block}
/* ── Stats cards ── */
.stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px}
.stat-c{background:var(--surface);border-radius:12px;padding:18px 20px;border:1px solid var(--border)}
.stat-c .num{font-family:'DM Serif Display',serif;font-size:30px;font-weight:600;line-height:1}
.stat-c .lbl{font-size:12px;color:var(--text2);margin-top:5px;font-weight:500}
.stat-c .ico{font-size:20px;margin-bottom:8px}
.stat-c.viol .num{color:var(--violet)}
.stat-c.vrt  .num{color:var(--vert)}
.stat-c.blu  .num{color:var(--bleu)}
/* ── Responsive ── */
@media(max-width:768px){
  .fg2,.fg3{grid-template-columns:1fr}
  .fg.full{grid-column:1}
  .med-g4{grid-template-columns:1fr 1fr}
  .wrap{padding:14px 12px}
  .stats-row{grid-template-columns:1fr 1fr}
}
@media(max-width:480px){
  .stats-row{grid-template-columns:1fr}
  .med-g4{grid-template-columns:1fr}
}
</style>`

// Script mode sombre (localStorage, compatible Workers car JS client-side)
const DARK_SCRIPT = `<script>
(function(){
  var t=localStorage.getItem('theme')||'light';
  document.documentElement.setAttribute('data-theme',t);
})();
function toggleDark(){
  var cur=document.documentElement.getAttribute('data-theme')||'light';
  var next=cur==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  localStorage.setItem('theme',next);
  var btn=document.getElementById('darkBtn');
  if(btn)btn.textContent=next==='dark'?'\u2600\uFE0F':'\uD83C\uDF19';
}
</script>`

function pageHead(title: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)} | Sant&#xe9;BF</title>
  ${FONTS}
  ${CSS_BASE}
  ${DARK_SCRIPT}
</head>
<body>`
}

function header(profil: AuthProfile): string {
  const av = (profil as any).avatar_url
  const avHtml = av
    ? `<img src="${esc(av)}" class="hd-avatar" alt="avatar">`
    : `<div class="hd-avatar-init">${esc(profil.prenom.charAt(0))}${esc(profil.nom.charAt(0))}</div>`
  return `<header class="hd">
  <div class="hd-left">
    <a href="/dashboard/medecin" class="hd-logo">
      <div class="hd-icon">&#x1F3E5;</div>
      <div class="hd-title">Sant&#xe9;BF <span class="hd-sub">ESPACE M&#xC9;DICAL</span></div>
    </a>
  </div>
  <div class="hd-right">
    <button id="darkBtn" class="dark-toggle" onclick="toggleDark()" title="Mode sombre">&#x1F319;</button>
    ${avHtml}
    <div class="hd-user">
      <strong>Dr. ${esc(profil.prenom)} ${esc(profil.nom)}</strong>
      <small>${esc(profil.role.replace(/_/g, ' '))}</small>
    </div>
    <a href="/medecin/profil" class="hd-btn">Profil</a>
    <a href="/auth/logout" class="hd-btn">D&#xe9;connexion</a>
  </div>
</header>`
}

function closePage(): string {
  return `<script>
// Sync dark toggle icon on load
(function(){
  var t=localStorage.getItem('theme')||'light';
  var btn=document.getElementById('darkBtn');
  if(btn)btn.textContent=t==='dark'?'\u2600\uFE0F':'\uD83C\uDF19';
})();
</script></body></html>`
}

// ═══════════════════════════════════════════════════════════
// MODULE 2A — LISTE PATIENTS + ACCÈS URGENCE
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/patients', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const q      = String(c.req.query('q') ?? '').trim()
  const err    = c.req.query('err') ?? ''

  let patients: any[] = []
  if (q.length >= 2) {
    const { data } = await sb
      .from('patient_dossiers')
      .select('id,numero_national,nom,prenom,date_naissance,sexe,groupe_sanguin,rhesus')
      .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,numero_national.ilike.%${q}%`)
      .limit(20)
    patients = data ?? []
  } else {
    const { data: cons } = await sb
      .from('patient_consentements')
      .select('patient_dossiers(id,numero_national,nom,prenom,date_naissance,sexe,groupe_sanguin,rhesus)')
      .eq('medecin_id', profil.id)
      .eq('est_actif', true)
    patients = (cons ?? []).map((r: any) => r.patient_dossiers).filter(Boolean)
  }

  const errMsg = err === 'code_invalide'
    ? '<div class="alert-err">&#x26A0; Code urgence invalide (6 chiffres requis) ou motif manquant.</div>'
    : err === 'code_introuvable'
    ? '<div class="alert-err">&#x26A0; Aucun patient trouv&#xe9; avec ce code urgence.</div>'
    : ''

  const lignes = patients.map((p: any) => `
  <tr>
    <td><span class="nn">${esc(p.numero_national)}</span></td>
    <td><strong>${esc(p.prenom)} ${esc(p.nom)}</strong></td>
    <td>${age(p.date_naissance)} ans</td>
    <td style="font-weight:700;color:var(--rouge)">${esc(p.groupe_sanguin)}${esc(p.rhesus)}</td>
    <td>
      <a href="/medecin/patients/${p.id}" class="btn-sm" style="margin-right:5px">Dossier</a>
      <a href="/medecin/consultations/nouvelle?pid=${p.id}" class="btn-sm-v" style="margin-right:5px">Consult.</a>
      <a href="/medecin/ordonnances/nouvelle?pid=${p.id}" class="btn-sm">&#x1F48A;</a>
    </td>
  </tr>`).join('')

  return c.html(pageHead('Mes patients') + header(profil) + `
<div class="wrap">
  <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> &#x2192; Patients</div>
  <div class="page-title">Mes patients</div>
  ${errMsg}

  <form action="/medecin/patients" method="GET" class="search-wrap">
    <input type="text" name="q" value="${esc(q)}"
      placeholder="Rechercher par nom, pr&#xe9;nom ou n&#xb0; BF-...">
    <button type="submit">&#x1F50D; Rechercher</button>
  </form>

  <!-- Accès urgence -->
  <div class="card card-body" style="background:var(--orange-light);border-left:4px solid var(--orange);margin-bottom:20px">
    <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
      <div style="font-size:28px">&#x1F6A8;</div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:700;color:var(--orange);margin-bottom:6px">
          Acc&#xe8;s urgence (sans consentement) &#x2014; code 6 chiffres
        </div>
        <form action="/medecin/urgence" method="POST"
          style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
          <div>
            <label style="font-size:11px;color:var(--orange)">Code urgence</label>
            <input type="text" name="code_urgence" placeholder="482916" maxlength="6"
              style="width:100px;font-family:monospace;font-size:18px;letter-spacing:5px;text-align:center;
                background:white;border-color:var(--orange)">
          </div>
          <div style="flex:1;min-width:180px">
            <label style="font-size:11px;color:var(--orange)">Motif (obligatoire)</label>
            <input type="text" name="motif_urgence" placeholder="Ex: Patient inconscient aux urgences"
              style="background:white;border-color:var(--orange)">
          </div>
          <button type="submit" style="background:var(--orange);color:white;border:none;
            padding:10px 18px;border-radius:8px;font-weight:600;cursor:pointer;
            font-family:'DM Sans',sans-serif;white-space:nowrap">Acc&#xe9;der</button>
        </form>
      </div>
    </div>
  </div>

  ${patients.length === 0 && !q ? `
  <div style="text-align:center;padding:50px;color:var(--text3)">
    <div style="font-size:48px;margin-bottom:12px">&#x1F465;</div>
    <p>Aucun patient avec consentement actif.</p>
    <p style="font-size:12px;margin-top:8px">Recherchez un patient ou demandez-lui d&#x27;accorder un consentement.</p>
  </div>` : ''}

  ${patients.length > 0 ? `
  <div class="card">
    <table>
      <thead><tr>
        <th>N&#xb0; national</th><th>Nom complet</th><th>&#xc2;ge</th>
        <th>Groupe sanguin</th><th>Actions</th>
      </tr></thead>
      <tbody>${lignes}</tbody>
    </table>
  </div>` : ''}
</div>
` + closePage())
})

// ── POST /medecin/urgence ─────────────────────────────────

medecinRoutes.post('/urgence', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const body   = await c.req.parseBody()

  const code   = String(body.code_urgence  ?? '').trim()
  const motif  = String(body.motif_urgence ?? '').trim()

  if (!/^\d{6}$/.test(code) || !motif) {
    return c.redirect('/medecin/patients?err=code_invalide')
  }

  const { data: pt } = await sb.from('patient_dossiers')
    .select('id').eq('code_urgence', code).single()

  if (!pt) return c.redirect('/medecin/patients?err=code_introuvable')

  const expAt = new Date()
  expAt.setHours(expAt.getHours() + 24)

  await sb.from('patient_acces_urgence').insert({
    patient_id:       pt.id,
    medecin_id:       profil.id,
    type_acces:       'code_urgence_6chiffres',
    motif_urgence:    motif,
    acces_expire_at:  expAt.toISOString(),
    valide_par_admin: false,
  })

  return c.redirect(`/medecin/patients/${pt.id}?urgence=1`)
})

// ═══════════════════════════════════════════════════════════
// MODULE 2B — DOSSIER PATIENT COMPLET
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/patients/:id', async (c) => {
  const sb      = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil  = c.get<AuthProfile>('profil')
  const id      = c.req.param('id')
  const urgence = c.req.query('urgence') === '1'

  // Vérifier accès
  const { data: consent } = await sb.from('patient_consentements')
    .select('est_actif,sections_autorisees')
    .eq('patient_id', id).eq('medecin_id', profil.id).eq('est_actif', true).single()

  const { data: urgLog } = urgence
    ? await sb.from('patient_acces_urgence')
        .select('acces_expire_at').eq('patient_id', id).eq('medecin_id', profil.id)
        .order('created_at', { ascending: false }).limit(1).single()
    : { data: null }

  const hasAccess = !!consent || (urgence && !!urgLog && new Date((urgLog as any).acces_expire_at) > new Date())

  const [ptRes, consultRes, ordRes, examRes, hospRes, chronRes] = await Promise.all([
    sb.from('patient_dossiers').select('*,patient_contacts_urgence(*)').eq('id', id).single(),
    hasAccess
      ? sb.from('medical_consultations')
          .select('id,created_at,motif,diagnostic_principal,type_consultation')
          .eq('patient_id', id).order('created_at', { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    hasAccess
      ? sb.from('medical_ordonnances')
          .select('id,numero_ordonnance,statut,created_at,date_expiration,qr_code_verification')
          .eq('patient_id', id).order('created_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    hasAccess
      ? sb.from('medical_examens')
          .select('id,nom_examen,type_examen,statut,created_at,est_urgent,est_anormal,fichier_url')
          .eq('patient_id', id).order('created_at', { ascending: false }).limit(6)
      : Promise.resolve({ data: [] }),
    hasAccess
      ? sb.from('medical_hospitalisations')
          .select('id,created_at,diagnostic_entree,etat_a_l_entree,statut,date_sortie_reelle,type_sortie')
          .eq('patient_id', id).order('created_at', { ascending: false }).limit(3)
      : Promise.resolve({ data: [] }),
    hasAccess
      ? sb.from('spec_suivi_chronique')
          .select('id,maladie,statut,objectifs_therapeutiques,prochain_controle')
          .eq('patient_id', id)
      : Promise.resolve({ data: [] }),
  ])

  const pt = ptRes.data
  if (!pt) return c.redirect('/medecin/patients')

  const ptAge     = age(pt.date_naissance)
  const allergies: any[] = Array.isArray(pt.allergies) ? pt.allergies : []
  const maladies:  any[] = Array.isArray(pt.maladies_chroniques) ? pt.maladies_chroniques : []
  const contacts:  any[] = Array.isArray((pt as any).patient_contacts_urgence)
    ? (pt as any).patient_contacts_urgence : []

  const bannerColor = urgence ? 'var(--orange)' : 'var(--violet)'

  const allerBadges = allergies.length === 0
    ? '<em style="color:var(--text3);font-size:13px">Aucune connue</em>'
    : allergies.map((a: any) =>
        `<span class="badge" style="background:var(--rouge-light);color:var(--rouge);border:1px solid #FFCDD2;margin:2px">${esc(a.substance ?? a)}</span>`
      ).join('')

  const maladieBadges = maladies.length === 0
    ? '<em style="color:var(--text3);font-size:13px">Aucune</em>'
    : maladies.map((m: any) =>
        `<span class="badge" style="background:var(--orange-light);color:var(--orange);border:1px solid #FFE0B2;margin:2px">${esc(m.maladie ?? m)}</span>`
      ).join('')

  function sectionHead(color: string, icon: string, title: string, link?: string, linkTxt?: string): string {
    return `<div style="padding:13px 18px;background:${color};display:flex;justify-content:space-between;align-items:center">
      <h3 style="font-size:13px;color:white;font-weight:600">${icon} ${title}</h3>
      ${link ? `<a href="${link}" style="font-size:12px;color:rgba(255,255,255,.75);text-decoration:none;
        padding:3px 9px;background:rgba(255,255,255,.15);border-radius:5px">${linkTxt}</a>` : ''}
    </div>`
  }

  const consultItems = (consultRes.data ?? []).length === 0
    ? '<div class="empty">Aucune consultation</div>'
    : (consultRes.data ?? []).map((r: any) => `
      <div style="padding:11px 16px;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;margin-bottom:2px">
          <span style="font-size:12px;font-weight:600;color:var(--violet)">${esc(r.type_consultation ?? '')}</span>
          <span style="font-size:11px;color:var(--text3)">${fmtD(r.created_at)}</span>
        </div>
        <div style="font-size:13px">${esc(r.motif ?? '')}</div>
        ${r.diagnostic_principal ? `<div style="font-size:12px;color:var(--violet)">&#x2192; ${esc(r.diagnostic_principal)}</div>` : ''}
      </div>`).join('')

  const ordItems = (ordRes.data ?? []).length === 0
    ? '<div class="empty">Aucune ordonnance</div>'
    : (ordRes.data ?? []).map((o: any) => `
      <div style="padding:11px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">
        <div>
          <div style="font-size:12px;font-family:monospace;color:var(--vert)">${esc(o.numero_ordonnance ?? '')}</div>
          <div style="font-size:11px;color:var(--text3)">Exp. ${fmtD(o.date_expiration)}</div>
        </div>
        <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
          <span class="badge ${esc(o.statut ?? '')}">${esc(o.statut ?? '')}</span>
          <a href="/medecin/ordonnances/${o.id}/pdf" class="btn-sm-v" style="font-size:11px">&#x1F4C4; PDF</a>
        </div>
      </div>`).join('')

  const examItems = (examRes.data ?? []).length === 0
    ? '<div class="empty">Aucun examen</div>'
    : (examRes.data ?? []).map((e: any) => `
      <div style="padding:11px 16px;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:3px">
          <div>
            <span style="font-size:13px;font-weight:600">${esc(e.nom_examen ?? '')}</span>
            ${e.est_urgent ? ' <span class="badge urgent" style="font-size:10px">URGENT</span>' : ''}
            ${e.est_anormal ? ' <span class="badge grave" style="font-size:10px">&#x26A0; Anormal</span>' : ''}
          </div>
          <span class="badge ${esc(e.statut ?? '')}">${esc(e.statut ?? '')}</span>
        </div>
        <div style="font-size:11px;color:var(--text3)">${esc(e.type_examen ?? '')} &middot; ${fmtD(e.created_at)}</div>
        ${e.fichier_url ? `<a href="${esc(e.fichier_url)}" target="_blank" class="btn-sm" style="font-size:11px;margin-top:5px">&#x1F4C4; R&#xe9;sultat</a>` : ''}
      </div>`).join('')

  const hospItems = (hospRes.data ?? []).length === 0
    ? '<div class="empty">Aucune hospitalisation</div>'
    : (hospRes.data ?? []).map((h: any) => `
      <div style="padding:11px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:5px">
        <div>
          <div style="font-size:13px;font-weight:600">${esc(h.diagnostic_entree ?? '')}</div>
          <div style="font-size:11px;color:var(--text3)">${fmtD(h.created_at)} ${h.date_sortie_reelle ? '&#x2192; ' + fmtD(h.date_sortie_reelle) : '(en cours)'}</div>
        </div>
        <span class="badge ${esc(h.etat_a_l_entree ?? '')}">${esc(h.etat_a_l_entree ?? '')}</span>
      </div>`).join('')

  const chronItems = (chronRes.data ?? []).length === 0
    ? '<div class="empty">Aucun suivi chronique</div>'
    : (chronRes.data ?? []).map((ch: any) => `
      <div style="padding:11px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--violet)">${esc(ch.maladie ?? '')}</div>
          ${ch.prochain_controle ? `<div style="font-size:11px;color:var(--vert)">Prochain : ${fmtD(ch.prochain_controle)}</div>` : ''}
        </div>
        <a href="/medecin/suivi-chronique/${ch.id}" class="btn-sm">Voir</a>
      </div>`).join('')

  const contactItems = contacts.length === 0
    ? '<em style="color:var(--text3);font-size:12px">Aucun contact renseign&#xe9;</em>'
    : contacts.map((ct: any) => `
      <div style="font-size:13px;padding:5px 0;border-bottom:1px solid var(--border)">
        <strong>${esc(ct.prenom ?? '')} ${esc(ct.nom ?? '')}</strong>
        <span style="font-size:11px;color:var(--text2);margin-left:6px">${esc(ct.lien ?? '')}</span>
        ${ct.telephone ? `<span style="font-size:12px;color:var(--violet);margin-left:8px">&#x1F4DE; ${esc(ct.telephone)}</span>` : ''}
      </div>`).join('')

  return c.html(pageHead(`${pt.prenom} ${pt.nom}`) + header(profil) + `
<div class="wrap">
  <div class="breadcrumb">
    <a href="/dashboard/medecin">Accueil</a> &#x2192;
    <a href="/medecin/patients">Patients</a> &#x2192;
    ${esc(pt.prenom)} ${esc(pt.nom)}
  </div>

  ${urgence ? '<div class="alert-warn">&#x1F6A8; Acc&#xe8;s urgence actif (24h). Acc&#xe8;s limit&#xe9; sans consentement du patient.</div>' : ''}
  ${!hasAccess && !urgence ? '<div class="alert-err">&#x26A0; Aucun consentement actif. Donn&#xe9;es limit&#xe9;es.</div>' : ''}

  <!-- Bandeau patient -->
  <div style="background:${bannerColor};border-radius:14px;padding:18px 22px;margin-bottom:22px;color:white">
    <div style="font-size:10.5px;opacity:.7;margin-bottom:3px">${esc(pt.numero_national)}</div>
    <div style="font-family:'DM Serif Display',serif;font-size:22px;margin-bottom:8px">${esc(pt.prenom)} ${esc(pt.nom)}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <span style="background:rgba(255,255,255,.2);padding:3px 11px;border-radius:20px;font-size:12px">${ptAge} ans</span>
      <span style="background:rgba(255,255,255,.2);padding:3px 11px;border-radius:20px;font-size:12px">${pt.sexe === 'M' ? '&#x2642; Homme' : '&#x2640; Femme'}</span>
      <span style="background:white;color:var(--rouge);padding:3px 11px;border-radius:20px;font-size:12px;font-weight:700">&#x1FA78; ${esc(pt.groupe_sanguin)}${esc(pt.rhesus)}</span>
      <span style="background:rgba(255,255,255,.2);padding:3px 11px;border-radius:20px;font-size:12px">N&#xe9; le ${fmtD(pt.date_naissance)}</span>
    </div>
  </div>

  <!-- Actions rapides -->
  <div style="display:flex;gap:8px;margin-bottom:22px;flex-wrap:wrap">
    <a href="/medecin/consultations/nouvelle?pid=${id}" class="btn">&#x1F4CB; Consultation</a>
    <a href="/medecin/ordonnances/nouvelle?pid=${id}" class="btn-v">&#x1F48A; Ordonnance</a>
    <a href="/medecin/examens/nouveau?pid=${id}" class="btn-b">&#x1F9EA; Examen</a>
    <a href="/medecin/rdv/nouveau?pid=${id}" class="btn-g">&#x1F4C5; RDV</a>
    <a href="/medecin/documents/upload?pid=${id}" class="btn-g">&#x1F4C4; Document</a>
    <a href="/medecin/hospitalisations/nouvelle?pid=${id}" class="btn-g">&#x1F6CF;&#xFE0F; Hospitaliser</a>
    <a href="/medecin/suivi-chronique/nouveau?pid=${id}" class="btn-g">&#x1F4C8; Chronique</a>
    <a href="/medecin/grossesse/nouvelle?pid=${id}" class="btn-g">&#x1FAC3; Grossesse</a>
  </div>

  <!-- Allergies + maladies + contacts -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:20px">
    <div class="card card-body">
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">&#x26A0;&#xFE0F; Allergies</div>
      ${allerBadges}
    </div>
    <div class="card card-body">
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">&#x1F3E5; Maladies chroniques</div>
      ${maladieBadges}
    </div>
    <div class="card card-body">
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">&#x1F4DE; Contacts urgence</div>
      ${contactItems}
    </div>
  </div>

  <!-- 4 blocs médicaux -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="card">
      ${sectionHead('var(--violet)', '&#x1F4CB;', 'Consultations r&#xe9;centes', `/medecin/consultations?pid=${id}`, 'Tout voir')}
      ${consultItems}
      <div style="padding:8px 14px"><a href="/medecin/consultations/nouvelle?pid=${id}" class="btn-sm">+ Nouvelle</a></div>
    </div>
    <div class="card">
      ${sectionHead('var(--vert)', '&#x1F48A;', 'Ordonnances', `/medecin/ordonnances?pid=${id}`, 'Tout voir')}
      ${ordItems}
      <div style="padding:8px 14px"><a href="/medecin/ordonnances/nouvelle?pid=${id}" class="btn-sm-v">+ Nouvelle</a></div>
    </div>
    <div class="card">
      ${sectionHead('var(--bleu)', '&#x1F9EA;', 'Examens', `/medecin/examens?pid=${id}`, 'Tout voir')}
      ${examItems}
    </div>
    <div class="card">
      ${sectionHead('#37474F', '&#x1F6CF;&#xFE0F;', 'Hospitalisations')}
      ${hospItems}
    </div>
  </div>

  <!-- Suivi chronique -->
  <div class="card" style="margin-top:0">
    ${sectionHead('var(--violet)', '&#x1F4C8;', 'Suivi maladies chroniques', `/medecin/suivi-chronique/nouveau?pid=${id}`, '+ Ouvrir')}
    ${chronItems}
  </div>
</div>
` + closePage())
})

// ═══════════════════════════════════════════════════════════
// MODULE 3 — CONSULTATION
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/consultations/nouvelle', async (c) => {
  const sb    = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const pid   = c.req.query('pid') ?? ''
  let patient: any = null
  if (pid) {
    const { data } = await sb.from('patient_dossiers')
      .select('id,nom,prenom,date_naissance,sexe,groupe_sanguin,rhesus,allergies').eq('id', pid).single()
    patient = data
  }
  return c.html(consultFormPage(profil, patient))
})

medecinRoutes.post('/consultations/nouvelle', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const body   = await c.req.parseBody()
  const pid    = String(body.patient_id ?? '').trim()
  if (!pid) return c.redirect('/medecin/patients')

  const { data: cons, error } = await sb.from('medical_consultations')
    .insert({
      patient_id:              pid,
      medecin_id:              profil.id,
      structure_id:            profil.structure_id,
      type_consultation:       String(body.type_consultation ?? 'normale'),
      motif:                   String(body.motif ?? ''),
      anamnese:                String(body.anamnese ?? '') || null,
      examen_clinique:         String(body.examen_clinique ?? '') || null,
      diagnostic_principal:    String(body.diagnostic_principal ?? '') || null,
      conclusion:              String(body.conclusion ?? '') || null,
      conduite_a_tenir:        String(body.conduite_a_tenir ?? '') || null,
      notes_confidentielles:   String(body.notes_confidentielles ?? '') || null,
      est_urgence:             body.type_consultation === 'urgence',
    })
    .select('id').single()

  if (error || !cons) {
    const { data: pt } = await sb.from('patient_dossiers')
      .select('id,nom,prenom,date_naissance,sexe,groupe_sanguin,rhesus,allergies').eq('id', pid).single()
    return c.html(consultFormPage(profil, pt, 'Erreur : ' + (error?.message ?? 'Inconnue')))
  }

  // Constantes vitales
  const tsys  = parseInt(String(body.tension_sys  ?? '')) || null
  const tdia  = parseInt(String(body.tension_dia  ?? '')) || null
  const temp  = parseFloat(String(body.temperature ?? '')) || null
  const pouls = parseInt(String(body.pouls        ?? '')) || null
  const spo2  = parseInt(String(body.spo2         ?? '')) || null
  const poids = parseFloat(String(body.poids      ?? '')) || null
  const tail  = parseFloat(String(body.taille     ?? '')) || null
  const glyc  = parseFloat(String(body.glycemie   ?? '')) || null

  if (tsys || tdia || temp || pouls || spo2 || poids || tail || glyc) {
    await sb.from('medical_constantes').insert({
      consultation_id: cons.id, patient_id: pid, prise_par: profil.id,
      tension_systolique: tsys, tension_diastolique: tdia, temperature: temp,
      pouls, saturation_o2: spo2, poids, taille: tail, glycemie: glyc,
      // imc GENERATED ALWAYS par la DB — ne pas l'insérer
    })
  }

  // RDV de suivi si demandé
  if (body.rdv_date && body.rdv_heure) {
    await sb.from('medical_rendez_vous').insert({
      patient_id: pid, medecin_id: profil.id, structure_id: profil.structure_id,
      date_heure: `${body.rdv_date}T${body.rdv_heure}:00`,
      motif:      String(body.rdv_motif ?? 'Suivi consultation'),
      statut:     'planifie', duree_minutes: 30, rappel_envoye: false,
    })
  }

  return c.redirect(`/medecin/patients/${pid}?consult=ok`)
})

// ═══════════════════════════════════════════════════════════
// MODULE 4 — ORDONNANCES + PDF (pdfmake-style HTML imprimable) + EMAIL
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/ordonnances/nouvelle', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const pid    = c.req.query('pid') ?? ''
  let patient: any = null
  if (pid) {
    const { data } = await sb.from('patient_dossiers')
      .select('id,nom,prenom,date_naissance,sexe,allergies').eq('id', pid).single()
    patient = data
  }
  return c.html(ordFormPage(profil, patient))
})

medecinRoutes.post('/ordonnances/nouvelle', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const body   = await c.req.parseBody()
  const pid    = String(body.patient_id ?? '').trim()
  if (!pid) return c.redirect('/medecin/patients')

  const dateExp = new Date()
  dateExp.setMonth(dateExp.getMonth() + 3)

  const { data: ord, error } = await sb.from('medical_ordonnances')
    .insert({
      patient_id: pid, medecin_id: profil.id, structure_id: profil.structure_id,
      statut: 'active', date_expiration: dateExp.toISOString(),
      // numero_ordonnance et qr_code_verification auto par trigger
    })
    .select('id,numero_ordonnance,qr_code_verification').single()

  if (error || !ord) return c.redirect(`/medecin/patients/${pid}?err=ord`)

  let meds: any[] = []
  try { meds = JSON.parse(String(body.medicaments ?? '[]')) } catch { meds = [] }

  if (meds.length > 0) {
    await sb.from('medical_ordonnance_lignes').insert(
      meds.map((m: any, i: number) => ({
        ordonnance_id:          ord.id,
        ordre:                  i + 1,
        medicament_nom:         String(m.nom ?? ''),
        medicament_forme:       String(m.forme ?? 'comprim\u00e9'),
        dosage:                 String(m.dosage ?? ''),
        frequence:              String(m.frequence ?? ''),
        duree:                  String(m.duree ?? ''),
        quantite:               parseInt(String(m.qte ?? '1')) || 1,
        instructions_speciales: m.instructions ? String(m.instructions) : null,
        est_delivre:            false,
      }))
    )
  }

  // Email au patient si email disponible
  const { data: ptData } = await sb.from('patient_dossiers')
    .select('prenom,nom,auth_profiles(email)').eq('id', pid).single()
  const ptEmail = (ptData as any)?.auth_profiles?.email
  if (ptEmail && c.env.RESEND_API_KEY) {
    const medsHtml = meds.map((m: any) =>
      `<li><strong>${esc(m.nom)}</strong> ${esc(m.dosage)} — ${esc(m.frequence)} pendant ${esc(m.duree)}</li>`
    ).join('')
    await sendEmail({
      resendKey: c.env.RESEND_API_KEY,
      to:        ptEmail,
      subject:   `Votre ordonnance ${ord.numero_ordonnance} — SantéBF`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#4A148C;color:white;padding:20px;border-radius:8px 8px 0 0">
          <h2>&#x1F48A; Nouvelle ordonnance</h2>
          <div>N&#xb0; ${esc(ord.numero_ordonnance ?? '')}</div>
        </div>
        <div style="background:#f9f9f9;padding:20px;border:1px solid #e0e0e0;border-top:none">
          <p>Bonjour ${esc((ptData as any)?.prenom ?? '')},</p>
          <p>Dr. ${esc(profil.prenom)} ${esc(profil.nom)} vous a prescrit :</p>
          <ul style="margin:12px 0">${medsHtml}</ul>
          <p><strong>Valide jusqu&#x27;au</strong> : ${fmtD(dateExp.toISOString())}</p>
          <p>Code QR de v&#xe9;rification : <code>${esc(ord.qr_code_verification ?? '')}</code></p>
          <p style="margin-top:16px;font-size:12px;color:#9e9e9e">
            V&#xe9;rifiable sur https://santebf.izicardouaga.com/public/ordonnance/${esc(ord.qr_code_verification ?? '')}
          </p>
        </div>
      </div>`,
    })
  }

  return c.redirect(`/medecin/patients/${pid}?ord=ok`)
})

// ── GET /medecin/ordonnances/:id/pdf ─────────────────────
// PDF imprimable HTML (window.print()) — pdfmake côté serveur
// nécessiterait un Worker avec pdfmake bundlé. Cette implémentation
// génère une page HTML optimisée @media print.

medecinRoutes.get('/ordonnances/:id/pdf', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const id     = c.req.param('id')

  const [ordRes, lignesRes, structRes] = await Promise.all([
    sb.from('medical_ordonnances')
      .select('*,patient_dossiers(nom,prenom,date_naissance,groupe_sanguin,rhesus,numero_national)')
      .eq('id', id).single(),
    sb.from('medical_ordonnance_lignes').select('*').eq('ordonnance_id', id).order('ordre'),
    sb.from('struct_structures').select('nom,type_structure,telephone,adresse')
      .eq('id', profil.structure_id).single(),
  ])

  const ord    = ordRes.data
  const lignes = lignesRes.data ?? []
  const struct = structRes.data
  if (!ord) return c.redirect('/medecin/patients')
  const pt = (ord as any).patient_dossiers

  const lignesHtml = lignes.map((l: any, i: number) => `
  <tr>
    <td style="padding:9px 12px;border-bottom:1px solid #eee">${i + 1}</td>
    <td style="padding:9px 12px;border-bottom:1px solid #eee">
      <strong>${esc(l.medicament_nom ?? '')}</strong><br>
      <small style="color:#6B7280">${esc(l.medicament_forme ?? '')} &bull; Qté ${l.quantite ?? 1}</small>
    </td>
    <td style="padding:9px 12px;border-bottom:1px solid #eee">${esc(l.dosage ?? '')}</td>
    <td style="padding:9px 12px;border-bottom:1px solid #eee">${esc(l.frequence ?? '')}</td>
    <td style="padding:9px 12px;border-bottom:1px solid #eee">${esc(l.duree ?? '')}</td>
    <td style="padding:9px 12px;border-bottom:1px solid #eee;font-size:12px;color:#6B7280">${esc(l.instructions_speciales ?? '')}</td>
  </tr>`).join('')

  return c.html(`<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8">
<title>Ordonnance ${esc(ord.numero_ordonnance ?? '')}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
<style>
body{font-family:'DM Sans',sans-serif;max-width:820px;margin:0 auto;padding:32px 20px;color:#1A1A2E}
.hd-ord{background:#4A148C;color:white;padding:18px 22px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:flex-start}
.hd-ord h1{font-family:'DM Serif Display',serif;font-size:20px;margin-bottom:3px}
table{width:100%;border-collapse:collapse}
thead th{background:#4A148C;color:white;padding:9px 12px;text-align:left;font-size:11px}
.no-print{margin-bottom:16px}
@media print{.no-print{display:none}body{padding:10px}}
</style>
</head>
<body>
<div class="no-print">
  <button onclick="window.print()" style="background:#4A148C;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;margin-right:8px">&#x1F5A8; Imprimer / Enregistrer PDF</button>
  <a href="/medecin/patients/${(ord as any).patient_id}" style="color:#4A148C">&#x2190; Retour dossier</a>
</div>

<div class="hd-ord">
  <div>
    <h1>&#x1F48A; Ordonnance M&#xe9;dicale</h1>
    <div style="font-size:14px;opacity:.85">${esc(ord.numero_ordonnance ?? '')}</div>
    <div style="font-size:12px;opacity:.7;margin-top:3px">
      ${struct ? esc(struct.nom) + ' &mdash; ' + esc(struct.telephone ?? '') : ''}
    </div>
  </div>
  <div style="text-align:right;font-size:12px;opacity:.85">
    <div>Date : ${fmtD(ord.created_at)}</div>
    <div>Expiration : ${fmtD(ord.date_expiration)}</div>
    <div>Dr. ${esc(profil.prenom)} ${esc(profil.nom)}</div>
  </div>
</div>

<div style="background:#F3E5F5;padding:13px 16px;border:1px solid #E0E0E0;border-top:none;margin-bottom:20px;border-radius:0 0 10px 10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
  <div>
    <strong style="font-size:15px">${esc(pt?.prenom ?? '')} ${esc(pt?.nom ?? '')}</strong>
    <span style="font-size:12px;color:#6B7280;margin-left:8px">${esc(pt?.numero_national ?? '')}</span>
    <span style="font-weight:700;color:#B71C1C;margin-left:8px">${esc(pt?.groupe_sanguin ?? '')}${esc(pt?.rhesus ?? '')}</span>
  </div>
  <div style="font-size:12px;color:#6B7280">N&#xe9; le ${fmtD(pt?.date_naissance ?? '')}</div>
</div>

<table>
  <thead><tr>
    <th>#</th><th>M&#xe9;dicament</th><th>Dosage</th><th>Fr&#xe9;quence</th><th>Dur&#xe9;e</th><th>Instructions</th>
  </tr></thead>
  <tbody>${lignesHtml}</tbody>
</table>

<div style="margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px">
  <div style="font-size:11px;color:#9E9E9E">
    V&#xe9;rifiable : https://santebf.izicardouaga.com/public/ordonnance/${esc(ord.qr_code_verification ?? '')}
  </div>
  <div style="text-align:right;border-top:2px solid #4A148C;padding-top:8px;min-width:200px">
    <div style="font-size:13px;font-weight:600">Dr. ${esc(profil.prenom)} ${esc(profil.nom)}</div>
    <div style="font-size:11px;color:#6B7280;margin-top:4px">Signature &amp; Cachet</div>
    <div style="height:50px"></div>
  </div>
</div>
</body></html>`)
})

// ═══════════════════════════════════════════════════════════
// MODULE 4B — CERTIFICAT MÉDICAL
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/certificat/nouveau', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const pid    = c.req.query('pid') ?? ''
  let patient: any = null
  if (pid) {
    const { data } = await sb.from('patient_dossiers')
      .select('id,nom,prenom,date_naissance,sexe').eq('id', pid).single()
    patient = data
  }
  return c.html(pageHead('Certificat m&#xe9;dical') + header(profil) + `
<div class="wrap">
  <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> &#x2192; Certificat m&#xe9;dical</div>
  <div class="page-title">G&#xe9;n&#xe9;rer un certificat m&#xe9;dical</div>
  ${patient ? `<div class="pt-mini">
    <div style="font-size:26px">&#x1F464;</div>
    <div><div class="pt-nom">${esc(patient.prenom)} ${esc(patient.nom)}</div>
    <div class="pt-info">${age(patient.date_naissance)} ans &middot; ${patient.sexe === 'M' ? 'Homme' : 'Femme'}</div></div>
  </div>` : ''}
  <div class="card card-body">
    <form method="POST" action="/medecin/certificat/nouveau">
      <input type="hidden" name="patient_id" value="${patient?.id ?? ''}">
      <div class="fg2">
        <div class="fg">
          <label>Type de certificat *</label>
          <select name="type_certif" required>
            <option value="aptitude">Certificat d&#x27;aptitude</option>
            <option value="inaptitude">Certificat d&#x27;inaptitude</option>
            <option value="arret_travail">Arr&#xea;t de travail</option>
            <option value="hospitalisation">Certificat d&#x27;hospitalisation</option>
            <option value="vaccination">Certificat de vaccination</option>
            <option value="deces">Certificat de d&#xe9;c&#xe8;s</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div class="fg">
          <label>Date d&#x27;&#xe9;mission</label>
          <input type="date" name="date_emission" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="fg full">
          <label>Contenu du certificat *</label>
          <textarea name="contenu" rows="6" required
            placeholder="Je soussign&#xe9; Dr. ... certifie avoir examin&#xe9; M./Mme ... ce jour..."></textarea>
        </div>
        <div class="fg">
          <label>Dur&#xe9;e (si arr&#xea;t de travail)</label>
          <input type="text" name="duree" placeholder="Ex : 3 jours, du 17/03 au 20/03/2026">
        </div>
      </div>
      <div class="form-actions">
        <a href="${patient ? '/medecin/patients/' + patient.id : '/medecin/patients'}" class="btn-g">Annuler</a>
        <button type="submit" class="btn">G&#xe9;n&#xe9;rer le certificat &#x2192;</button>
      </div>
    </form>
  </div>
</div>` + closePage())
})

medecinRoutes.post('/certificat/nouveau', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const body   = await c.req.parseBody()
  const pid    = String(body.patient_id ?? '').trim()

  const { data: pt } = await sb.from('patient_dossiers')
    .select('nom,prenom,date_naissance,sexe,numero_national').eq('id', pid).single()
  const { data: struct } = await sb.from('struct_structures')
    .select('nom,type_structure,telephone,adresse').eq('id', profil.structure_id).single()

  const typeCertif = String(body.type_certif ?? '')
  const contenu    = String(body.contenu ?? '')
  const duree      = String(body.duree ?? '')

  // Enregistrer dans medical_documents
  await sb.from('medical_documents').insert({
    patient_id:      pid,
    uploaded_par:    profil.id,
    structure_id:    profil.structure_id,
    type_document:   'certificat_medical',
    titre:           `Certificat ${typeCertif} — ${fmtD(new Date().toISOString())}`,
    est_confidentiel: false,
  })

  // Retourner page imprimable
  return c.html(`<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8">
<title>Certificat M&#xe9;dical</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
<style>
body{font-family:'DM Sans',sans-serif;max-width:800px;margin:0 auto;padding:32px 24px;color:#1A1A2E}
.no-print{margin-bottom:16px}
@media print{.no-print{display:none}body{padding:10px}}
</style>
</head>
<body>
<div class="no-print">
  <button onclick="window.print()" style="background:#4A148C;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer">&#x1F5A8; Imprimer / PDF</button>
  <a href="/medecin/patients/${pid}" style="margin-left:10px;color:#4A148C">&#x2190; Retour dossier</a>
</div>

<div style="text-align:center;border-bottom:3px solid #4A148C;padding-bottom:16px;margin-bottom:24px">
  <div style="font-size:13px;color:#6B7280;margin-bottom:4px">${struct ? esc(struct.nom) : ''}</div>
  <div style="font-family:'DM Serif Display',serif;font-size:24px;color:#4A148C">Certificat M&#xe9;dical</div>
  <div style="font-size:12px;color:#6B7280;margin-top:4px">${esc(typeCertif.replace(/_/g,' '))}</div>
</div>

<p style="margin-bottom:12px">Je soussign&#xe9;, <strong>Dr. ${esc(profil.prenom)} ${esc(profil.nom)}</strong>,
exerc&#xe7;ant &#xe0; ${struct ? esc(struct.nom) : 'l&#x27;&#xe9;tablissement'}, certifie avoir examin&#xe9; ce jour :</p>

<div style="background:#F3E5F5;border-radius:8px;padding:14px 16px;margin:16px 0;border-left:4px solid #4A148C">
  <strong>${esc(pt?.prenom ?? '')} ${esc(pt?.nom ?? '')}</strong>
  &mdash; N&#xb0; ${esc(pt?.numero_national ?? '')}
  &mdash; N&#xe9;(e) le ${fmtD(pt?.date_naissance ?? '')}
  &mdash; ${pt?.sexe === 'M' ? 'Homme' : 'Femme'}
</div>

<div style="margin:20px 0;line-height:1.7;white-space:pre-wrap">${esc(contenu)}</div>

${duree ? `<p>Dur&#xe9;e : <strong>${esc(duree)}</strong></p>` : ''}

<div style="margin-top:48px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:20px">
  <div style="font-size:12px;color:#9E9E9E">
    D&#xe9;livr&#xe9; &#xe0; ${struct ? esc((struct as any).ville ?? 'Ouagadougou') : 'Ouagadougou'},
    le ${fmtD(new Date().toISOString())}
  </div>
  <div style="text-align:right;border-top:2px solid #4A148C;padding-top:8px;min-width:200px">
    <div style="font-size:13px;font-weight:600">Dr. ${esc(profil.prenom)} ${esc(profil.nom)}</div>
    <div style="font-size:11px;color:#6B7280">Signature &amp; Cachet</div>
    <div style="height:60px"></div>
  </div>
</div>
</body></html>`)
})

// ═══════════════════════════════════════════════════════════
// MODULE 5 — EXAMENS
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/examens/nouveau', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const pid    = c.req.query('pid') ?? ''
  let patient: any = null
  if (pid) {
    const { data } = await sb.from('patient_dossiers').select('id,nom,prenom').eq('id', pid).single()
    patient = data
  }
  return c.html(examFormPage(profil, patient))
})

medecinRoutes.post('/examens/nouveau', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const body   = await c.req.parseBody()
  const pid    = String(body.patient_id ?? '').trim()
  await sb.from('medical_examens').insert({
    patient_id:           pid,
    prescrit_par:         profil.id,
    structure_id:         profil.structure_id,
    realise_structure_id: body.realise_structure_id ? String(body.realise_structure_id) : null,
    type_examen:          String(body.type_examen ?? 'autre'),
    nom_examen:           String(body.nom_examen ?? ''),
    motif:                String(body.motif ?? '') || null,
    est_urgent:           body.est_urgent === 'true',
    statut:               'prescrit',
    est_anormal:          false,
  })
  return c.redirect(`/medecin/patients/${pid}?exam=ok`)
})

// ═══════════════════════════════════════════════════════════
// MODULE 6 — RENDEZ-VOUS
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/rdv', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const today  = new Date().toISOString().split('T')[0]

  const { data: rdvs } = await sb.from('medical_rendez_vous')
    .select('id,date_heure,motif,statut,duree_minutes,patient_dossiers(nom,prenom,numero_national)')
    .eq('medecin_id', profil.id)
    .gte('date_heure', today + 'T00:00:00')
    .order('date_heure').limit(50)

  const lignes = (rdvs ?? []).length === 0
    ? '<tr><td colspan="6" class="empty">Aucun rendez-vous &#xe0; venir</td></tr>'
    : (rdvs ?? []).map((r: any) => `
    <tr>
      <td><strong style="color:var(--violet)">${fmtDT(r.date_heure)}</strong></td>
      <td>${esc(r.patient_dossiers?.prenom ?? '')} ${esc(r.patient_dossiers?.nom ?? '')}<br>
        <span style="font-size:11px;font-family:monospace;color:var(--text3)">${esc(r.patient_dossiers?.numero_national ?? '')}</span>
      </td>
      <td>${esc(r.motif ?? '&#x2014;')}</td>
      <td>${r.duree_minutes ?? 30} min</td>
      <td><span class="badge ${esc(r.statut ?? '')}">${esc(r.statut ?? '')}</span></td>
      <td>
        ${r.statut === 'planifie' ? `
        <form method="POST" action="/medecin/rdv/${r.id}/statut" style="display:inline">
          <input type="hidden" name="statut" value="confirme">
          <button type="submit" class="btn-sm-v" style="margin-right:3px">Confirmer</button>
        </form>
        <form method="POST" action="/medecin/rdv/${r.id}/statut" style="display:inline">
          <input type="hidden" name="statut" value="annule">
          <button type="submit" class="btn-r">Annuler</button>
        </form>` : ''}
        ${r.statut === 'confirme' ? `
        <form method="POST" action="/medecin/rdv/${r.id}/statut" style="display:inline">
          <input type="hidden" name="statut" value="passe">
          <button type="submit" class="btn-sm" style="margin-right:3px">Termin&#xe9;</button>
        </form>
        <form method="POST" action="/medecin/rdv/${r.id}/statut" style="display:inline">
          <input type="hidden" name="statut" value="absent">
          <button type="submit" class="btn-r">Absent</button>
        </form>` : ''}
      </td>
    </tr>`).join('')

  return c.html(pageHead('Planning') + header(profil) + `
<div class="wrap">
  <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> &#x2192; Planning</div>
  <div class="page-title">Mon planning</div>
  <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
    <a href="/medecin/rdv/nouveau" class="btn">+ Nouveau RDV</a>
  </div>
  <div class="card">
    <table>
      <thead><tr>
        <th>Date &amp; Heure</th><th>Patient</th><th>Motif</th>
        <th>Dur&#xe9;e</th><th>Statut</th><th>Actions</th>
      </tr></thead>
      <tbody>${lignes}</tbody>
    </table>
  </div>
</div>` + closePage())
})

medecinRoutes.post('/rdv/:id/statut', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const id     = c.req.param('id')
  const body   = await c.req.parseBody()
  const st     = String(body.statut ?? '')
  if (!['confirme','annule','passe','absent','reporte'].includes(st)) return c.redirect('/medecin/rdv')
  await sb.from('medical_rendez_vous').update({ statut: st }).eq('id', id)
  return c.redirect('/medecin/rdv')
})

medecinRoutes.get('/rdv/nouveau', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const pid    = c.req.query('pid') ?? ''
  let patient: any = null
  if (pid) {
    const { data } = await sb.from('patient_dossiers').select('id,nom,prenom').eq('id', pid).single()
    patient = data
  }
  return c.html(pageHead('Nouveau RDV') + header(profil) + `
<div class="wrap">
  <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> &#x2192; <a href="/medecin/rdv">Planning</a> &#x2192; Nouveau RDV</div>
  <div class="page-title">Nouveau rendez-vous</div>
  ${patient ? `<div class="pt-mini"><div style="font-size:26px">&#x1F464;</div>
    <div><div class="pt-nom">${esc(patient.prenom)} ${esc(patient.nom)}</div></div></div>` : ''}
  <div class="card card-body">
    <form method="POST" action="/medecin/rdv/nouveau">
      <input type="hidden" name="patient_id" value="${patient?.id ?? ''}">
      <div class="fg2">
        <div class="fg"><label>Date *</label><input type="date" name="rdv_date" required></div>
        <div class="fg"><label>Heure *</label><input type="time" name="rdv_heure" required></div>
        <div class="fg">
          <label>Dur&#xe9;e</label>
          <select name="duree">
            <option value="15">15 min</option><option value="30" selected>30 min</option>
            <option value="45">45 min</option><option value="60">1 heure</option>
          </select>
        </div>
        <div class="fg"><label>Motif</label>
          <input type="text" name="motif" placeholder="Ex : Suivi tension art&#xe9;rielle"></div>
      </div>
      <div class="form-actions">
        <a href="/medecin/rdv" class="btn-g">Annuler</a>
        <button type="submit" class="btn">Enregistrer &#x2192;</button>
      </div>
    </form>
  </div>
</div>` + closePage())
})

medecinRoutes.post('/rdv/nouveau', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const body   = await c.req.parseBody()
  const pid    = String(body.patient_id ?? '').trim()
  const d      = String(body.rdv_date  ?? '')
  const h      = String(body.rdv_heure ?? '')
  if (!pid || !d || !h) return c.redirect('/medecin/rdv')

  await sb.from('medical_rendez_vous').insert({
    patient_id: pid, medecin_id: profil.id, structure_id: profil.structure_id,
    date_heure: `${d}T${h}:00`,
    motif:      String(body.motif ?? '') || null,
    duree_minutes: parseInt(String(body.duree ?? '30')) || 30,
    statut: 'planifie', rappel_envoye: false,
  })

  // Email de confirmation au patient
  const { data: ptData } = await sb.from('patient_dossiers')
    .select('prenom,nom,auth_profiles(email)').eq('id', pid).single()
  const ptEmail = (ptData as any)?.auth_profiles?.email
  if (ptEmail && c.env.RESEND_API_KEY) {
    await sendEmail({
      resendKey: c.env.RESEND_API_KEY,
      to:        ptEmail,
      subject:   `Nouveau rendez-vous — SantéBF`,
      html: `<div style="font-family:sans-serif;max-width:600px">
        <div style="background:#4A148C;color:white;padding:18px;border-radius:8px 8px 0 0">
          <h2>&#x1F4C5; Nouveau rendez-vous</h2>
        </div>
        <div style="padding:18px;background:#f9f9f9;border:1px solid #e0e0e0;border-top:none">
          <p>Bonjour ${esc((ptData as any)?.prenom ?? '')},</p>
          <p>Dr. ${esc(profil.prenom)} ${esc(profil.nom)} vous a programm&#xe9; un rendez-vous :</p>
          <div style="background:white;border:1px solid #4A148C;border-radius:8px;padding:14px;margin:12px 0">
            <strong>&#x1F4C5; ${fmtDT(d + 'T' + h + ':00')}</strong><br>
            ${body.motif ? `<span style="color:#6B7280">${esc(String(body.motif))}</span>` : ''}
          </div>
          <p style="font-size:12px;color:#9e9e9e;margin-top:12px">
            Un rappel vous sera envoy&#xe9; 24h avant votre rendez-vous.
          </p>
        </div>
      </div>`,
    })
  }

  return c.redirect(`/medecin/patients/${pid}?rdv=ok`)
})

// ═══════════════════════════════════════════════════════════
// MODULE 7 — SUIVI MALADIES CHRONIQUES
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/suivi-chronique/nouveau', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const pid    = c.req.query('pid') ?? ''
  let patient: any = null
  if (pid) {
    const { data } = await sb.from('patient_dossiers').select('id,nom,prenom').eq('id', pid).single()
    patient = data
  }
  return c.html(pageHead('Suivi chronique') + header(profil) + `
<div class="wrap">
  <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> &#x2192; Suivi chronique</div>
  <div class="page-title">Ouvrir un dossier de suivi chronique</div>
  ${patient ? `<div class="pt-mini"><div style="font-size:26px">&#x1F464;</div>
    <div><div class="pt-nom">${esc(patient.prenom)} ${esc(patient.nom)}</div></div></div>` : ''}
  <div class="card card-body">
    <form method="POST" action="/medecin/suivi-chronique/nouveau">
      <input type="hidden" name="patient_id" value="${patient?.id ?? ''}">
      <div class="fg2">
        <div class="fg">
          <label>Maladie *</label>
          <select name="maladie" required>
            <option value="">-- S&#xe9;lectionner --</option>
            <option value="diabete_type1">Diab&#xe8;te type 1</option>
            <option value="diabete_type2">Diab&#xe8;te type 2</option>
            <option value="hypertension">Hypertension art&#xe9;rielle</option>
            <option value="asthme">Asthme</option>
            <option value="drepanocytose">Dr&#xe9;panocytose</option>
            <option value="vih_sida">VIH / SIDA</option>
            <option value="tuberculose">Tuberculose</option>
            <option value="insuffisance_renale">Insuffisance r&#xe9;nale</option>
            <option value="insuffisance_cardiaque">Insuffisance cardiaque</option>
            <option value="epilepsie">&#xc9;pilepsie</option>
            <option value="cancer">Cancer</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div class="fg"><label>Prochain contr&#xf4;le</label>
          <input type="date" name="prochain_controle"></div>
        <div class="fg full"><label>Traitement de fond</label>
          <input type="text" name="traitement_fond" placeholder="Ex : Metformine 500mg 2x/j, Amlodipine 5mg"></div>
        <div class="fg full"><label>Objectifs th&#xe9;rapeutiques</label>
          <input type="text" name="objectifs" placeholder="Ex : HbA1c &lt; 7%, Tension &lt; 130/80"></div>
      </div>
      <div class="form-actions">
        <a href="${patient ? '/medecin/patients/' + patient.id : '/medecin/patients'}" class="btn-g">Annuler</a>
        <button type="submit" class="btn">Ouvrir le dossier &#x2192;</button>
      </div>
    </form>
  </div>
</div>` + closePage())
})

medecinRoutes.post('/suivi-chronique/nouveau', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const body   = await c.req.parseBody()
  const pid    = String(body.patient_id ?? '').trim()
  await sb.from('spec_suivi_chronique').insert({
    patient_id:              pid,
    medecin_referent_id:     profil.id,
    structure_id:            profil.structure_id,
    maladie:                 String(body.maladie ?? ''),
    traitement_fond:         String(body.traitement_fond ?? '') || null,
    objectifs_therapeutiques: String(body.objectifs ?? '') || null,
    prochain_controle:       String(body.prochain_controle ?? '') || null,
    statut:                  'actif',
  })
  return c.redirect(`/medecin/patients/${pid}?chronique=ok`)
})

medecinRoutes.get('/suivi-chronique/:id', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const id     = c.req.param('id')

  const [suiviRes, bilansRes] = await Promise.all([
    sb.from('spec_suivi_chronique')
      .select('*,patient_dossiers(nom,prenom)').eq('id', id).single(),
    sb.from('spec_suivi_chronique_bilans')
      .select('*').eq('suivi_id', id).order('created_at', { ascending: false }).limit(20),
  ])

  const suivi  = suiviRes.data
  const bilans = bilansRes.data ?? []
  if (!suivi) return c.redirect('/medecin/patients')
  const pt = (suivi as any).patient_dossiers

  const bilanRows = bilans.length === 0
    ? '<tr><td colspan="3" class="empty">Aucun bilan</td></tr>'
    : bilans.map((b: any) => `
    <tr>
      <td>${fmtD(b.created_at)}</td>
      <td style="font-family:monospace;font-size:12px">${esc(JSON.stringify(b.valeurs ?? {}))}</td>
      <td>${esc(b.observations ?? '')}</td>
    </tr>`).join('')

  return c.html(pageHead('Suivi ' + suivi.maladie) + header(profil) + `
<div class="wrap">
  <div class="breadcrumb">
    <a href="/dashboard/medecin">Accueil</a> &#x2192;
    <a href="/medecin/patients/${(suivi as any).patient_id}">Patient</a> &#x2192;
    Suivi ${esc(suivi.maladie)}
  </div>
  <div class="page-title">Suivi : ${esc(suivi.maladie)}</div>

  <div class="pt-mini">
    <div style="font-size:26px">&#x1F464;</div>
    <div>
      <div class="pt-nom">${esc(pt?.prenom ?? '')} ${esc(pt?.nom ?? '')}</div>
      ${suivi.objectifs_therapeutiques ? `<div class="pt-info">${esc(suivi.objectifs_therapeutiques)}</div>` : ''}
    </div>
    ${suivi.prochain_controle ? `<span class="pt-tag" style="margin-left:auto">Prochain : ${fmtD(suivi.prochain_controle)}</span>` : ''}
  </div>

  ${suivi.traitement_fond ? `<div class="alert-ok">&#x1F48A; Traitement de fond : ${esc(suivi.traitement_fond)}</div>` : ''}

  <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
    <a href="/medecin/suivi-chronique/${id}/bilan" class="btn">+ Ajouter un bilan</a>
  </div>

  <div class="card">
    <table>
      <thead><tr><th>Date</th><th>Valeurs</th><th>Observations</th></tr></thead>
      <tbody>${bilanRows}</tbody>
    </table>
  </div>
</div>` + closePage())
})

medecinRoutes.get('/suivi-chronique/:id/bilan', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const id     = c.req.param('id')

  const { data: suivi } = await sb.from('spec_suivi_chronique')
    .select('*,patient_dossiers(nom,prenom)').eq('id', id).single()
  if (!suivi) return c.redirect('/medecin/patients')
  const pt = (suivi as any).patient_dossiers

  const champMap: Record<string, string[]> = {
    diabete_type1: ['hba1c','glycemie_a_jeun','poids'],
    diabete_type2: ['hba1c','glycemie_a_jeun','poids'],
    hypertension:  ['tension_sys','tension_dia','poids'],
    vih_sida:      ['cd4','charge_virale'],
    insuffisance_renale: ['creatinine','clairance','uree'],
    asthme:        ['debit_expiratoire','spo2'],
    drepanocytose: ['hemoglobine','ferritine'],
  }
  const champs = champMap[suivi.maladie] ?? ['valeur_principale']

  const champsHtml = champs.map((ch: string) => `
  <div class="fg">
    <label>${esc(ch.replace(/_/g, ' '))}</label>
    <input type="number" step="0.01" name="val_${esc(ch)}" placeholder="${esc(ch)}">
  </div>`).join('')

  return c.html(pageHead('Nouveau bilan') + header(profil) + `
<div class="wrap">
  <div class="breadcrumb">
    <a href="/medecin/suivi-chronique/${id}">Suivi ${esc(suivi.maladie)}</a> &#x2192; Nouveau bilan
  </div>
  <div class="page-title">Bilan &#x2014; ${esc(suivi.maladie)}</div>
  <div class="pt-mini"><div style="font-size:26px">&#x1F464;</div>
    <div><div class="pt-nom">${esc(pt?.prenom ?? '')} ${esc(pt?.nom ?? '')}</div></div></div>
  <div class="card card-body">
    <form method="POST" action="/medecin/suivi-chronique/${id}/bilan">
      <div class="fg2">${champsHtml}</div>
      <div class="fg full" style="margin-top:14px">
        <label>Observations</label>
        <textarea name="observations" placeholder="&#xc9;volution, ajustement traitement..."></textarea>
      </div>
      <div class="fg" style="margin-top:12px">
        <label>Prochain contr&#xf4;le</label>
        <input type="date" name="prochain_controle">
      </div>
      <div class="form-actions">
        <a href="/medecin/suivi-chronique/${id}" class="btn-g">Annuler</a>
        <button type="submit" class="btn">Enregistrer &#x2192;</button>
      </div>
    </form>
  </div>
</div>` + closePage())
})

medecinRoutes.post('/suivi-chronique/:id/bilan', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const id     = c.req.param('id')
  const body   = await c.req.parseBody()

  const valeurs: Record<string, number> = {}
  for (const [k, v] of Object.entries(body)) {
    if (k.startsWith('val_') && v) {
      const n = parseFloat(String(v))
      if (!isNaN(n)) valeurs[k.replace('val_', '')] = n
    }
  }

  await sb.from('spec_suivi_chronique_bilans').insert({
    suivi_id: id, pris_par: profil.id,
    valeurs, observations: String(body.observations ?? '') || null,
  })

  if (body.prochain_controle) {
    await sb.from('spec_suivi_chronique')
      .update({ prochain_controle: String(body.prochain_controle) }).eq('id', id)
  }

  return c.redirect(`/medecin/suivi-chronique/${id}?bilan=ok`)
})

// ═══════════════════════════════════════════════════════════
// MODULE 8 — GROSSESSE / CPN
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/grossesse/nouvelle', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const pid    = c.req.query('pid') ?? ''
  let patient: any = null
  if (pid) {
    const { data } = await sb.from('patient_dossiers').select('id,nom,prenom,sexe,rhesus').eq('id', pid).single()
    patient = data
  }
  return c.html(pageHead('Grossesse') + header(profil) + `
<div class="wrap">
  <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> &#x2192; Nouveau suivi grossesse</div>
  <div class="page-title">Ouvrir un suivi grossesse</div>
  ${patient ? `<div class="pt-mini"><div style="font-size:26px">&#x1FAC3;</div>
    <div><div class="pt-nom">${esc(patient.prenom)} ${esc(patient.nom)}</div>
    ${patient.rhesus === '-' ? '<div style="font-size:12px;color:var(--orange)">&#x26A0; Rh&#xe9;sus n&#xe9;gatif &#x2014; surveiller incompatibilit&#xe9;</div>' : ''}</div>
  </div>` : ''}
  <div class="card card-body">
    <form method="POST" action="/medecin/grossesse/nouvelle">
      <input type="hidden" name="patient_id" value="${patient?.id ?? ''}">
      <div class="fg2">
        <div class="fg"><label>Date derni&#xe8;res r&#xe8;gles (DDR) *</label>
          <input type="date" name="ddr" required></div>
        <div class="fg"><label>Date pr&#xe9;vue accouchement (DPA)</label>
          <input type="date" name="dpa" placeholder="Auto-calcul&#xe9;e si vide"></div>
        <div class="fg"><label>Gessit&#xe9; (total grossesses)</label>
          <input type="number" name="gestite" min="1" max="20" value="1"></div>
        <div class="fg"><label>Parit&#xe9; (accouchements)</label>
          <input type="number" name="parite" min="0" max="20" value="0"></div>
        <div class="fg"><label>Grossesse &#xe0; risque</label>
          <select name="a_risque"><option value="false">Non</option><option value="true">Oui &#x2014; haut risque</option></select>
        </div>
        <div class="fg"><label>Incompatibilit&#xe9; Rh&#xe9;sus</label>
          <select name="incompat_rh"><option value="false">Non</option><option value="true">Oui (m&#xe8;re Rh&#x2212; / p&#xe8;re Rh+)</option></select>
        </div>
      </div>
      <div class="form-actions">
        <a href="${patient ? '/medecin/patients/' + patient.id : '/medecin/patients'}" class="btn-g">Annuler</a>
        <button type="submit" class="btn">Ouvrir &#x2192;</button>
      </div>
    </form>
  </div>
</div>` + closePage())
})

medecinRoutes.post('/grossesse/nouvelle', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const body   = await c.req.parseBody()
  const pid    = String(body.patient_id ?? '').trim()
  let dpa      = String(body.dpa ?? '')
  if (!dpa && body.ddr) {
    const d = new Date(String(body.ddr))
    d.setDate(d.getDate() + 280)
    dpa = d.toISOString().split('T')[0]
  }
  await sb.from('spec_grossesses').insert({
    patient_id:               pid,
    medecin_referent_id:      profil.id,
    structure_id:             profil.structure_id,
    date_ddr:                 String(body.ddr ?? ''),
    date_prevue_accouchement: dpa || null,
    gestite:                  parseInt(String(body.gestite ?? '1')) || 1,
    parite:                   parseInt(String(body.parite  ?? '0')) || 0,
    grossesse_a_risque:       body.a_risque === 'true',
    incompatibilite_rhesus:   body.incompat_rh === 'true',
    statut:                   'en_cours',
  })
  return c.redirect(`/medecin/patients/${pid}?grossesse=ok`)
})

// ═══════════════════════════════════════════════════════════
// MODULE 9 — HOSPITALISATIONS
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/hospitalisations/nouvelle', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const pid    = c.req.query('pid') ?? ''
  let patient: any = null
  let lits:    any[] = []
  if (pid) {
    const [p, l] = await Promise.all([
      sb.from('patient_dossiers').select('id,nom,prenom').eq('id', pid).single(),
      sb.from('struct_lits')
        .select('id,numero_lit,struct_services(nom)')
        .eq('structure_id', profil.structure_id).eq('statut', 'libre').limit(40),
    ])
    patient = p.data
    lits    = l.data ?? []
  }
  const litsOpts = lits.map((l: any) =>
    `<option value="${l.id}">Lit ${esc(l.numero_lit)} &#x2014; ${esc((l as any).struct_services?.nom ?? '')}</option>`
  ).join('')

  return c.html(pageHead('Hospitalisation') + header(profil) + `
<div class="wrap">
  <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> &#x2192; Admettre patient</div>
  <div class="page-title">Admettre un patient</div>
  ${patient ? `<div class="pt-mini"><div style="font-size:26px">&#x1F6CF;&#xFE0F;</div>
    <div><div class="pt-nom">${esc(patient.prenom)} ${esc(patient.nom)}</div></div></div>` : ''}
  <div class="card card-body">
    <form method="POST" action="/medecin/hospitalisations/nouvelle">
      <input type="hidden" name="patient_id" value="${patient?.id ?? ''}">
      <div class="fg2">
        <div class="fg"><label>Diagnostic d&#x27;entr&#xe9;e *</label>
          <input type="text" name="diagnostic_entree" placeholder="Ex : Pneumonie s&#xe9;v&#xe8;re" required></div>
        <div class="fg"><label>&#xc9;tat &#xe0; l&#x27;entr&#xe9;e *</label>
          <select name="etat" required>
            <option value="stable">Stable</option>
            <option value="grave">Grave</option>
            <option value="critique">Critique</option>
            <option value="inconscient">Inconscient</option>
          </select>
        </div>
        <div class="fg full"><label>Lit (lits libres de la structure)</label>
          <select name="lit_id">
            <option value="">-- Sans lit assign&#xe9; --</option>
            ${litsOpts}
          </select>
        </div>
      </div>
      <div class="form-actions">
        <a href="${patient ? '/medecin/patients/' + patient.id : '/medecin/patients'}" class="btn-g">Annuler</a>
        <button type="submit" class="btn">Admettre &#x2192;</button>
      </div>
    </form>
  </div>
</div>` + closePage())
})

medecinRoutes.post('/hospitalisations/nouvelle', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const body   = await c.req.parseBody()
  const pid    = String(body.patient_id ?? '').trim()
  const litId  = String(body.lit_id ?? '').trim() || null
  await sb.from('medical_hospitalisations').insert({
    patient_id:             pid,
    medecin_responsable_id: profil.id,
    structure_id:           profil.structure_id,
    lit_id:                 litId,
    diagnostic_entree:      String(body.diagnostic_entree ?? ''),
    etat_a_l_entree:        String(body.etat ?? 'stable'),
    statut:                 'en_cours',
    notes_evolution:        [],
    // trigger DB met lit en "occupe" automatiquement
  })
  return c.redirect(`/medecin/patients/${pid}?hospit=ok`)
})

// ═══════════════════════════════════════════════════════════
// MODULE 10 — DOCUMENTS
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/documents/upload', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const pid    = c.req.query('pid') ?? ''
  let patient: any = null
  if (pid) {
    const { data } = await sb.from('patient_dossiers').select('id,nom,prenom').eq('id', pid).single()
    patient = data
  }
  return c.html(pageHead('Upload document') + header(profil) + `
<div class="wrap">
  <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> &#x2192; Ajouter document</div>
  <div class="page-title">Ajouter un document m&#xe9;dical</div>
  ${patient ? `<div class="pt-mini"><div style="font-size:26px">&#x1F4C4;</div>
    <div><div class="pt-nom">${esc(patient.prenom)} ${esc(patient.nom)}</div></div></div>` : ''}
  <div class="card card-body">
    <form method="POST" action="/medecin/documents/upload" enctype="multipart/form-data">
      <input type="hidden" name="patient_id" value="${patient?.id ?? ''}">
      <div class="fg2">
        <div class="fg"><label>Type *</label>
          <select name="type_doc" required>
            <option value="certificat_medical">Certificat m&#xe9;dical</option>
            <option value="radio">Radiographie</option>
            <option value="scanner">Scanner</option>
            <option value="irm">IRM</option>
            <option value="echo_image">&#xc9;chographie image</option>
            <option value="compte_rendu_op">Compte-rendu op&#xe9;ratoire</option>
            <option value="compte_rendu_hospit">Compte-rendu hospitalisation</option>
            <option value="resultats_labo">R&#xe9;sultats labo</option>
            <option value="bon_examen">Bon d&#x27;examen</option>
            <option value="courrier_medical">Courrier m&#xe9;dical</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div class="fg"><label>Titre *</label>
          <input type="text" name="titre" placeholder="Ex : Radio thorax 17/03/2026" required></div>
        <div class="fg full"><label>Fichier (PDF ou image) *</label>
          <input type="file" name="fichier" accept=".pdf,.jpg,.jpeg,.png,.webp" required
            style="padding:8px;background:var(--surface)"></div>
        <div class="fg"><label>Visibilit&#xe9;</label>
          <select name="confidentiel">
            <option value="false">Visible par le patient</option>
            <option value="true">Confidentiel (m&#xe9;decin uniquement)</option>
          </select>
        </div>
      </div>
      <div class="form-actions">
        <a href="${patient ? '/medecin/patients/' + patient.id : '/medecin/patients'}" class="btn-g">Annuler</a>
        <button type="submit" class="btn">Uploader &#x2192;</button>
      </div>
    </form>
  </div>
</div>` + closePage())
})

medecinRoutes.post('/documents/upload', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const body   = await c.req.parseBody()
  const pid    = String(body.patient_id ?? '').trim()
  const file   = body.fichier as File | undefined
  if (!file || !pid) return c.redirect(`/medecin/patients/${pid}?err=upload`)

  const ext  = file.name.split('.').pop() ?? 'pdf'
  const path = `med/${profil.id}/pt_${pid}/${Date.now()}.${ext}`
  const buf  = await file.arrayBuffer()

  const { error: upErr } = await sb.storage
    .from('documents').upload(path, buf, { contentType: file.type, upsert: false })

  if (upErr) return c.redirect(`/medecin/patients/${pid}?err=upload_fail`)

  const { data: urlData } = sb.storage.from('documents').getPublicUrl(path)

  await sb.from('medical_documents').insert({
    patient_id:      pid,
    uploaded_par:    profil.id,
    structure_id:    profil.structure_id,
    type_document:   String(body.type_doc ?? 'autre'),
    titre:           String(body.titre ?? ''),
    fichier_url:     urlData?.publicUrl ?? null,
    taille_fichier:  file.size,
    est_confidentiel: body.confidentiel === 'true',
  })

  return c.redirect(`/medecin/patients/${pid}?doc=ok`)
})

// ═══════════════════════════════════════════════════════════
// MODULE 11 — PROFIL MÉDECIN
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/profil', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')

  const [medRes, structRes] = await Promise.all([
    sb.from('auth_medecins')
      .select('specialite,numero_ordre,annee_diplome,universite_formation')
      .eq('id', profil.id).single(),
    sb.from('auth_medecin_structures')
      .select('type_poste,jours_presence,struct_structures(nom,type_structure)')
      .eq('medecin_id', profil.id),
  ])

  const med    = medRes.data
  const structs = structRes.data ?? []

  const structRows = structs.length === 0
    ? '<div class="empty">Aucune structure associ&#xe9;e</div>'
    : structs.map((s: any) => `
    <div style="padding:11px 15px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:13px;font-weight:600">${esc(s.struct_structures?.nom ?? '')}</div>
        <div style="font-size:11px;color:var(--text2)">${esc(s.struct_structures?.type_structure ?? '')} &bull; ${esc(s.type_poste ?? '')}</div>
        ${s.jours_presence?.length ? `<div style="font-size:11px;color:var(--violet)">${(s.jours_presence as string[]).join(', ')}</div>` : ''}
      </div>
    </div>`).join('')

  const av = (profil as any).avatar_url
  const avHtml = av
    ? `<img src="${esc(av)}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid var(--violet);margin-bottom:12px">`
    : `<div style="width:90px;height:90px;border-radius:50%;background:var(--violet);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:32px;font-weight:700;color:white">${esc(profil.prenom.charAt(0))}${esc(profil.nom.charAt(0))}</div>`

  return c.html(pageHead('Mon profil') + header(profil) + `
<div class="wrap">
  <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> &#x2192; Mon profil</div>
  <div class="page-title">Mon profil</div>
  <div style="display:grid;grid-template-columns:260px 1fr;gap:22px;align-items:start">
    <div class="card card-body" style="text-align:center">
      ${avHtml}
      <div style="font-family:'DM Serif Display',serif;font-size:17px">Dr. ${esc(profil.prenom)} ${esc(profil.nom)}</div>
      <div style="font-size:12px;color:var(--text2);margin-top:3px">${esc(profil.role.replace(/_/g,' '))}</div>
      ${med?.specialite ? `<div style="font-size:13px;color:var(--violet);font-weight:600;margin-top:5px">${esc(med.specialite)}</div>` : ''}
      ${med?.numero_ordre ? `<div style="font-size:11px;color:var(--text3);margin-top:3px">N&#xb0; Ordre : ${esc(med.numero_ordre)}</div>` : ''}
      <form method="POST" action="/profil/avatar" enctype="multipart/form-data" style="margin-top:16px">
        <input type="file" name="avatar" accept="image/*"
          style="font-size:12px;margin-bottom:8px;display:block;width:100%;background:var(--surface2)">
        <button type="submit" class="btn" style="width:100%;padding:8px 0">Changer la photo</button>
      </form>
    </div>
    <div>
      <div class="card card-body">
        <div class="sec-title" style="margin-top:0;padding-top:0;border-top:none">Informations professionnelles</div>
        <div class="fg2" style="gap:14px">
          <div><label style="font-size:11px;color:var(--text3)">Sp&#xe9;cialit&#xe9;</label>
            <p>${esc(med?.specialite ?? '&#x2014;')}</p></div>
          <div><label style="font-size:11px;color:var(--text3)">N&#xb0; Ordre</label>
            <p>${esc(med?.numero_ordre ?? '&#x2014;')}</p></div>
          <div><label style="font-size:11px;color:var(--text3)">Ann&#xe9;e dipl&#xf4;me</label>
            <p>${esc(String(med?.annee_diplome ?? '&#x2014;'))}</p></div>
          <div><label style="font-size:11px;color:var(--text3)">Universit&#xe9;</label>
            <p>${esc(med?.universite_formation ?? '&#x2014;')}</p></div>
        </div>
      </div>
      <div class="card">
        <div style="padding:13px 18px;background:var(--violet)">
          <h3 style="font-size:13px;color:white;font-weight:600">&#x1F3E5; Mes structures d&#x27;exercice</h3>
        </div>
        ${structRows}
      </div>
      <div class="card card-body">
        <a href="/profil/changer-mdp" class="btn-g">&#x1F512; Changer mon mot de passe</a>
      </div>
    </div>
  </div>
</div>` + closePage())
})

// ═══════════════════════════════════════════════════════════
// PAGES FORMULAIRES INTERNES
// ═══════════════════════════════════════════════════════════

function consultFormPage(profil: AuthProfile, patient: any, erreur?: string): string {
  const ptAge     = patient ? age(patient.date_naissance) : 0
  const allergies: any[] = patient && Array.isArray(patient.allergies) ? patient.allergies : []
  const allerStr  = allergies.map((a: any) => esc(a.substance ?? a)).join(', ')

  return pageHead('Nouvelle consultation') + header(profil) + `
<div class="wrap">
  <div class="breadcrumb">
    <a href="/dashboard/medecin">Accueil</a> &#x2192;
    <a href="/medecin/patients">Patients</a> &#x2192; Consultation
  </div>
  <div class="page-title">Nouvelle consultation</div>
  ${erreur ? `<div class="alert-err">&#x26A0; ${esc(erreur)}</div>` : ''}
  ${patient ? `
  <div class="pt-mini">
    <div style="font-size:26px">&#x1F464;</div>
    <div>
      <div class="pt-nom">${esc(patient.prenom)} ${esc(patient.nom)}</div>
      <div class="pt-info">${ptAge} ans &middot; ${patient.sexe === 'M' ? 'Homme' : 'Femme'}</div>
      ${allerStr ? `<div style="margin-top:3px;font-size:12px;color:var(--rouge)">&#x26A0; Allergies : ${allerStr}</div>` : ''}
    </div>
    <span class="pt-tag" style="margin-left:auto">&#x1FA78; ${esc(patient.groupe_sanguin)}${esc(patient.rhesus)}</span>
  </div>` : ''}
  <div class="card card-body">
    <form method="POST" action="/medecin/consultations/nouvelle">
      <input type="hidden" name="patient_id" value="${patient?.id ?? ''}">
      <div class="fg2">
        <div class="fg"><label>Type *</label>
          <select name="type_consultation" required>
            <option value="normale">Normale</option>
            <option value="urgence">Urgence</option>
            <option value="suivi">Suivi</option>
            <option value="teleconsultation">T&#xe9;l&#xe9;consultation</option>
            <option value="domicile">&#xe0; domicile</option>
          </select>
        </div>
        <div class="fg"><label>Motif *</label>
          <input type="text" name="motif" placeholder="Ex : Douleur thoracique depuis 3 jours" required>
        </div>
      </div>

      <div class="sec-title">&#x1F4CA; Constantes vitales (optionnel)</div>
      <div id="constAlerte" class="const-alert"></div>
      <div class="fg2">
        <div class="fg"><label>Tension sys / dia (mmHg)</label>
          <div style="display:flex;gap:7px">
            <input type="number" name="tension_sys" id="cs" placeholder="120" min="60" max="250"
              style="width:50%" oninput="chkConst()">
            <input type="number" name="tension_dia" id="cd" placeholder="80" min="40" max="150"
              style="width:50%" oninput="chkConst()">
          </div>
        </div>
        <div class="fg"><label>Temp&#xe9;rature (&#xb0;C)</label>
          <input type="number" name="temperature" id="ct" placeholder="37.0" step="0.1" min="34" max="43" oninput="chkConst()">
        </div>
        <div class="fg"><label>Pouls (bpm)</label>
          <input type="number" name="pouls" placeholder="72" min="30" max="200">
        </div>
        <div class="fg"><label>SpO2 (%)</label>
          <input type="number" name="spo2" id="co" placeholder="98" min="50" max="100" oninput="chkConst()">
        </div>
        <div class="fg"><label>Poids (kg)</label>
          <input type="number" name="poids" placeholder="70.0" step="0.1" min="1" max="300">
        </div>
        <div class="fg"><label>Taille (cm)</label>
          <input type="number" name="taille" placeholder="170" min="30" max="250">
        </div>
        <div class="fg"><label>Glyc&#xe9;mie (g/L)</label>
          <input type="number" name="glycemie" id="cg" placeholder="0.95" step="0.01" min="0" max="10" oninput="chkConst()">
        </div>
      </div>

      <div class="sec-title">&#x1F4CB; Anamn&#xe8;se et examen clinique</div>
      <div class="fg2">
        <div class="fg full"><label>Anamn&#xe8;se</label>
          <textarea name="anamnese" rows="4" placeholder="Histoire chronologique de la maladie..."></textarea>
        </div>
        <div class="fg full"><label>Examen clinique</label>
          <textarea name="examen_clinique" rows="3" placeholder="Auscultation, palpation, inspection..."></textarea>
        </div>
        <div class="fg full"><label>Diagnostic principal</label>
          <input type="text" name="diagnostic_principal" placeholder="Ex : Pneumonie J18, HTA non contr&#xf4;l&#xe9;e">
        </div>
        <div class="fg full"><label>Conduite &#xe0; tenir</label>
          <textarea name="conduite_a_tenir" rows="3" placeholder="Traitement, examens demand&#xe9;s, orientation..."></textarea>
        </div>
        <div class="fg full">
          <label>Notes confidentielles <small style="font-weight:400;color:var(--text3)">(jamais visibles par le patient)</small></label>
          <textarea name="notes_confidentielles" rows="2" placeholder="Notes priv&#xe9;es uniquement..."></textarea>
        </div>
      </div>

      <div class="sec-title">&#x1F4C5; RDV de suivi (optionnel)</div>
      <div class="fg2">
        <div class="fg"><label>Date RDV</label><input type="date" name="rdv_date"></div>
        <div class="fg"><label>Heure</label><input type="time" name="rdv_heure"></div>
        <div class="fg full"><label>Motif RDV</label>
          <input type="text" name="rdv_motif" placeholder="Ex : Contr&#xf4;le r&#xe9;sultats examens">
        </div>
      </div>

      <div class="form-actions">
        <a href="/medecin/patients${patient ? '/' + patient.id : ''}" class="btn-g">Annuler</a>
        <button type="submit" class="btn">Enregistrer &#x2192;</button>
      </div>
    </form>
  </div>
</div>

<script>
function chkConst(){
  var s=parseFloat(document.getElementById('cs').value)||0;
  var d=parseFloat(document.getElementById('cd').value)||0;
  var t=parseFloat(document.getElementById('ct').value)||0;
  var o=parseFloat(document.getElementById('co').value)||0;
  var g=parseFloat(document.getElementById('cg').value)||0;
  var msgs=[];
  if(s>=160) msgs.push('\u26a0\ufe0f Tension syst. '+s+' mmHg \u2014 CRITIQUE');
  else if(s>=140) msgs.push('\u26a0\ufe0f Tension syst. '+s+' mmHg \u2014 \u00e9lev\u00e9e');
  if(d>=100) msgs.push('\u26a0\ufe0f Tension diast. '+d+' mmHg \u2014 \u00e9lev\u00e9e');
  if(t>=39) msgs.push('\u26a0\ufe0f Temp\u00e9rature '+t+'\u00b0C \u2014 fi\u00e8vre');
  if(o>0&&o<94) msgs.push('\ud83d\udea8 SpO2 '+o+'% \u2014 hypox\u00e9mie');
  if(g>=2.0) msgs.push('\u26a0\ufe0f Glyc\u00e9mie '+g+' g/L \u2014 hyperglyc\u00e9mie');
  var el=document.getElementById('constAlerte');
  if(msgs.length){el.innerHTML=msgs.join('<br>');el.classList.add('show');}
  else{el.innerHTML='';el.classList.remove('show');}
}
</script>
` + closePage()
}

// ─────────────────────────────────────────────────────────

function ordFormPage(profil: AuthProfile, patient: any, erreur?: string): string {
  const allergies: any[] = patient && Array.isArray(patient.allergies) ? patient.allergies : []
  const allerStr = allergies.map((a: any) => esc(a.substance ?? a)).join(', ')

  return pageHead('Nouvelle ordonnance') + header(profil) + `
<div class="wrap">
  <div class="breadcrumb">
    <a href="/dashboard/medecin">Accueil</a> &#x2192;
    <a href="/medecin/patients">Patients</a> &#x2192; Ordonnance
  </div>
  <div class="page-title">Nouvelle ordonnance</div>
  ${erreur ? `<div class="alert-err">&#x26A0; ${esc(erreur)}</div>` : ''}
  ${patient ? `
  <div class="pt-mini">
    <div style="font-size:26px">&#x1F464;</div>
    <div>
      <div class="pt-nom">${esc(patient.prenom)} ${esc(patient.nom)}</div>
      ${allerStr ? `<div style="font-size:12px;color:var(--rouge);margin-top:3px">&#x26A0; Allergies : ${allerStr}</div>` : ''}
    </div>
  </div>` : ''}
  <div class="card card-body">
    <form method="POST" action="/medecin/ordonnances/nouvelle" id="ordF">
      <input type="hidden" name="patient_id"  value="${patient?.id ?? ''}">
      <input type="hidden" name="medicaments" id="medsJson" value="[]">
      <p style="font-size:13px;color:var(--text2);margin-bottom:14px">
        Num&#xe9;ro, QR code et email patient g&#xe9;n&#xe9;r&#xe9;s automatiquement apr&#xe8;s enregistrement.
      </p>
      <div id="lignes"></div>
      <button type="button" class="btn-add-med" onclick="addMed()">&#x2795; Ajouter un m&#xe9;dicament</button>
      <div class="form-actions">
        <a href="/medecin/patients${patient ? '/' + patient.id : ''}" class="btn-g">Annuler</a>
        <button type="submit" class="btn" onclick="buildJson()">Enregistrer &#x2192;</button>
      </div>
    </form>
  </div>
</div>

<script>
var cnt=0;
function addMed(){
  cnt++;
  var n=cnt;
  var d=document.createElement('div');
  d.className='med-bloc';
  d.id='m'+n;
  d.innerHTML=
    '<button type="button" class="btn-del-med" onclick="document.getElementById(\'m'+n+'\').remove()">\u00d7</button>'+
    '<div style="font-size:12px;font-weight:700;color:var(--violet);margin-bottom:9px">M\u00e9dicament\u00a0'+n+'</div>'+
    '<div class="med-g4">'+
      '<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Nom *</label>'+
        '<input class="mn" type="text" placeholder="Ex\u00a0: Amoxicilline 500mg"></div>'+
      '<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Dosage</label>'+
        '<input class="md" type="text" placeholder="500mg"></div>'+
      '<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Fr\u00e9quence</label>'+
        '<input class="mf" type="text" placeholder="3x/jour"></div>'+
      '<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Dur\u00e9e</label>'+
        '<input class="mdu" type="text" placeholder="7 jours"></div>'+
    '</div>'+
    '<div class="med-g2">'+
      '<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Forme</label>'+
        '<select class="mfm" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--text);font-family:inherit">'+
          '<option value="comprim\u00e9">Comprim\u00e9</option><option value="sirop">Sirop</option>'+
          '<option value="injection">Injection</option><option value="pommade">Pommade</option>'+
          '<option value="suppositoire">Suppositoire</option><option value="gouttes">Gouttes</option>'+
        '</select></div>'+
      '<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Qte</label>'+
        '<input class="mq" type="number" value="1" min="1" max="99"></div>'+
    '</div>'+
    '<div style="margin-top:8px"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Instructions sp\u00e9ciales</label>'+
      '<input class="mi" type="text" placeholder="Ex\u00a0: Prendre pendant le repas, \u00e9viter l\'alcool"></div>';
  document.getElementById('lignes').appendChild(d);
}
function buildJson(){
  var blocs=document.querySelectorAll('.med-bloc');
  var meds=[];
  for(var i=0;i<blocs.length;i++){
    var nm=blocs[i].querySelector('.mn').value;
    if(!nm)continue;
    meds.push({
      nom:nm,
      dosage:blocs[i].querySelector('.md').value,
      frequence:blocs[i].querySelector('.mf').value,
      duree:blocs[i].querySelector('.mdu').value,
      forme:blocs[i].querySelector('.mfm').value,
      qte:blocs[i].querySelector('.mq').value||'1',
      instructions:blocs[i].querySelector('.mi').value
    });
  }
  document.getElementById('medsJson').value=JSON.stringify(meds);
}
addMed();
</script>
` + closePage()
}

// ─────────────────────────────────────────────────────────

function examFormPage(profil: AuthProfile, patient: any): string {
  return pageHead('Prescrire examen') + header(profil) + `
<div class="wrap">
  <div class="breadcrumb">
    <a href="/dashboard/medecin">Accueil</a> &#x2192;
    <a href="/medecin/patients">Patients</a> &#x2192; Examen
  </div>
  <div class="page-title">Prescrire un examen</div>
  ${patient ? `<div class="pt-mini"><div style="font-size:26px">&#x1F9EA;</div>
    <div><div class="pt-nom">${esc(patient.prenom)} ${esc(patient.nom)}</div></div></div>` : ''}
  <div class="card card-body">
    <form method="POST" action="/medecin/examens/nouveau">
      <input type="hidden" name="patient_id" value="${patient?.id ?? ''}">
      <div class="fg2">
        <div class="fg"><label>Type d&#x27;examen *</label>
          <select name="type_examen" required>
            <option value="biologie">Biologie / Laboratoire</option>
            <option value="radiologie">Radiologie</option>
            <option value="echographie">&#xc9;chographie</option>
            <option value="ecg">ECG / Cardiologie</option>
            <option value="endoscopie">Endoscopie</option>
            <option value="anatomopathologie">Anatomopathologie</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div class="fg"><label>Nom de l&#x27;examen *</label>
          <input type="text" name="nom_examen" placeholder="Ex : NFS, Radio thorax, &#xc9;cho abdo" required>
        </div>
        <div class="fg full"><label>Motif / Indication clinique</label>
          <input type="text" name="motif" placeholder="Ex : Suspicion pneumonie, Bilan diab&#xe8;te">
        </div>
        <div class="fg"><label>Urgence</label>
          <select name="est_urgent">
            <option value="false">Non urgent</option>
            <option value="true">URGENT &#x2014; r&#xe9;sultat requis rapidement</option>
          </select>
        </div>
        <div class="fg"><label>Structure de r&#xe9;alisation (si externe)</label>
          <input type="text" name="realise_structure_id" placeholder="UUID structure destinataire">
        </div>
      </div>
      <div class="form-actions">
        <a href="/medecin/patients${patient ? '/' + patient.id : ''}" class="btn-g">Annuler</a>
        <button type="submit" class="btn">Prescrire &#x2192;</button>
      </div>
    </form>
  </div>
</div>` + closePage()
}
