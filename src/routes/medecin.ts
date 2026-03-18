/**
 * src/routes/medecin.ts
 * SantéBF — Module Médecin COMPLET
 *
 * Nouveautés vs version précédente :
 *   1. GET /medecin/patients/nouveau + POST → créer dossier patient directement
 *   2. GET /medecin/api/recherche-patient?q= → API JSON autocomplete
 *   3. TOUS les formulaires ont un champ recherche/autocomplete patient
 *   4. Consentement auto-créé quand médecin crée ou lie un patient
 *   5. Messages succès/erreur lus depuis query params dans fiche patient
 *   6. ordFormPage() JS sans backticks imbriqués → bouton "Ajouter médicament" fonctionne
 *   7. Login.ts : 3ème param inscriptionOk ajouté
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import type { AuthProfile } from '../lib/supabase'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string; RESEND_API_KEY: string }

export const medecinRoutes = new Hono<{ Bindings: Bindings }>()

medecinRoutes.use('/*', requireAuth,
  requireRole('medecin', 'infirmier', 'sage_femme', 'laborantin', 'radiologue'))

// ─── Helpers ─────────────────────────────────────────────

function esc(v: unknown): string {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#x27;')
}
function age(ddn: string): number {
  return Math.floor((Date.now() - new Date(ddn).getTime()) / (365.25*24*3600*1000))
}
function fmtD(d: string): string {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—'
}
function fmtDT(d: string): string {
  return d ? new Date(d).toLocaleString('fr-FR',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'
}
async function sendEmail(opts:{resendKey:string;to:string;subject:string;html:string}): Promise<void> {
  if (!opts.to || !opts.resendKey) return
  try {
    await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+opts.resendKey},
      body: JSON.stringify({from:'SantéBF <noreply@santebf.izicardouaga.com>',to:[opts.to],subject:opts.subject,html:opts.html})
    })
  } catch {}
}

// ─── CSS + JS communs ─────────────────────────────────────

const FONTS = '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">'

const CSS = `<style>
:root{--v:#4A148C;--v2:#6A1B9A;--vcl:#EDE7F6;--vg:rgba(74,20,140,.08);
  --gr:#1A6B3C;--bl:#1565C0;--rd:#B71C1C;--or:#E65100;
  --tx:#1A1A2E;--tx2:#6B7280;--tx3:#9E9E9E;
  --bg:#F7F8FA;--sur:white;--brd:#E0E0E0;--sdw:0 2px 8px rgba(0,0,0,.07)}
[data-theme="dark"]{--bg:#0F1117;--sur:#1A1B2E;--brd:#2E3047;--tx:#E8E8F0;--tx2:#9BA3B8;--tx3:#5A6080;--vcl:#2A1550;--vg:rgba(106,27,154,.15)}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--tx);min-height:100vh;transition:background .2s,color .2s}
/* Header */
.hd{background:var(--v);height:60px;padding:0 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200;box-shadow:0 2px 8px rgba(0,0,0,.2)}
.hd-l{display:flex;align-items:center;gap:12px}
.hd-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
.hd-ico{width:32px;height:32px;background:rgba(255,255,255,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px}
.hd-t{font-family:'DM Serif Display',serif;font-size:17px;color:white}
.hd-s{font-size:10px;opacity:.65;display:block;font-family:'DM Sans',sans-serif}
.hd-r{display:flex;align-items:center;gap:8px}
.hd-av{width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.3)}
.hd-av-i{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white}
.hd-u{background:rgba(255,255,255,.12);border-radius:8px;padding:5px 11px}
.hd-u strong{display:block;font-size:12.5px;color:white}.hd-u small{font-size:10.5px;color:rgba(255,255,255,.65)}
.hd-btn{background:rgba(255,255,255,.15);color:white;border:none;padding:7px 12px;border-radius:7px;font-size:12px;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
.hd-btn:hover{background:rgba(255,255,255,.25)}
.dk-btn{background:rgba(255,255,255,.12);border:none;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center}
/* Layout */
.wrap{max-width:1100px;margin:0 auto;padding:26px 20px}
.pg-t{font-family:'DM Serif Display',serif;font-size:26px;color:var(--tx);margin-bottom:4px}
.bread{font-size:12px;color:var(--tx2);margin-bottom:14px}.bread a{color:var(--v);text-decoration:none}
/* Alertes */
.a-ok{background:#E8F5E9;border-left:4px solid var(--gr);padding:11px 15px;border-radius:8px;margin-bottom:16px;font-size:13px;color:var(--gr)}
.a-err{background:#FFF5F5;border-left:4px solid var(--rd);padding:11px 15px;border-radius:8px;margin-bottom:16px;font-size:13px;color:var(--rd)}
.a-warn{background:#FFF3E0;border-left:4px solid var(--or);padding:11px 15px;border-radius:8px;margin-bottom:16px;font-size:13px;color:var(--or)}
/* Boutons */
.btn{display:inline-block;background:var(--v);color:white;padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
.btn:hover{opacity:.88}
.btn-v{display:inline-block;background:var(--gr);color:white;padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
.btn-b{display:inline-block;background:var(--bl);color:white;padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
.btn-g{display:inline-block;background:var(--brd);color:var(--tx);padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
.btn-sm{display:inline-block;background:var(--v);color:white;padding:4px 11px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none}
.btn-sm-v{display:inline-block;background:var(--gr);color:white;padding:4px 11px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none}
.btn-sm-r{display:inline-block;background:#FFF5F5;color:var(--rd);padding:4px 11px;border-radius:6px;font-size:12px;font-weight:600;border:1px solid #FFCDD2;text-decoration:none}
/* Cards */
.card{background:var(--sur);border-radius:14px;box-shadow:var(--sdw);overflow:hidden;margin-bottom:22px;border:1px solid var(--brd)}
.cb{padding:22px}
/* Table */
table{width:100%;border-collapse:collapse}
thead tr{background:var(--v)}
thead th{padding:11px 15px;text-align:left;font-size:11px;color:white;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
tbody tr{border-bottom:1px solid var(--brd);transition:background .12s}
tbody tr:hover{background:var(--bg)}
tbody td{padding:11px 15px;font-size:14px}
tbody tr:last-child{border-bottom:none}
.empty{padding:28px;text-align:center;color:var(--tx3);font-style:italic;font-size:13px}
/* Formulaires */
.fg{margin-bottom:18px}
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.fg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
label{display:block;font-size:12.5px;font-weight:600;color:var(--tx);margin-bottom:6px}
input,select,textarea{width:100%;padding:10px 13px;font-family:'DM Sans',sans-serif;font-size:14px;border:1.5px solid var(--brd);border-radius:9px;background:var(--bg);color:var(--tx);outline:none;transition:border-color .18s}
input:focus,select:focus,textarea:focus{border-color:var(--v);background:var(--sur);box-shadow:0 0 0 4px var(--vg)}
textarea{resize:vertical;min-height:85px}
.fa{display:flex;gap:10px;margin-top:24px;justify-content:flex-end;flex-wrap:wrap}
.sep{border:0;height:2px;background:var(--brd);margin:22px 0}
.st{font-size:12px;font-weight:700;color:var(--v);text-transform:uppercase;letter-spacing:.6px;margin:16px 0 10px;padding-top:16px;border-top:1px solid var(--brd)}
/* Patient mini */
.pt-mini{background:var(--vcl);border-radius:10px;padding:13px 15px;margin-bottom:20px;display:flex;align-items:center;gap:12px;border-left:4px solid var(--v);flex-wrap:wrap}
.pt-n{font-size:15px;font-weight:700;color:var(--tx)}
.pt-i{font-size:12px;color:var(--tx2)}
.nn{font-family:monospace;background:var(--vcl);color:var(--v);padding:2px 7px;border-radius:4px;font-size:12.5px}
/* Badges */
.badge{padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;display:inline-block}
.badge.planifie{background:var(--vcl);color:var(--v)}
.badge.confirme,.badge.active,.badge.en_cours{background:#E8F5E9;color:var(--gr)}
.badge.passe,.badge.expiree,.badge.annule{background:var(--bg);color:var(--tx3)}
.badge.urgent,.badge.absent{background:#FFF3E0;color:var(--or)}
.badge.grave,.badge.critique{background:#FFF5F5;color:var(--rd)}
/* Recherche patient autocomplete */
.search-pt{position:relative}
.search-pt input{padding-right:40px}
.search-pt-ico{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:16px;pointer-events:none;color:var(--tx3)}
.pt-results{position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--sur);border:1.5px solid var(--v);border-radius:10px;z-index:100;max-height:220px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.12);display:none}
.pt-results.show{display:block}
.pt-result-item{padding:11px 14px;cursor:pointer;border-bottom:1px solid var(--brd);transition:background .12s}
.pt-result-item:hover{background:var(--vcl)}
.pt-result-item:last-child{border-bottom:none}
.pt-result-nom{font-size:13px;font-weight:600;color:var(--tx)}
.pt-result-info{font-size:11px;color:var(--tx2)}
/* Médicaments */
.med-bloc{background:var(--vcl);border:1.5px solid var(--brd);border-radius:12px;padding:16px;margin-bottom:12px;position:relative}
.med-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.med-num{background:var(--v);color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
.btn-del{background:#FEE2E2;color:var(--rd);border:none;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer}
.med-g4{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:9px}
.med-g2{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:8px}
.btn-add-med{background:#E8F5E9;color:var(--gr);border:2px dashed var(--gr);padding:11px;border-radius:9px;width:100%;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;margin-top:4px}
/* Stats */
.stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px}
.stat-c{background:var(--sur);border-radius:12px;padding:16px 18px;border:1px solid var(--brd)}
.stat-c .num{font-family:'DM Serif Display',serif;font-size:28px;font-weight:600;line-height:1}
.stat-c .lbl{font-size:12px;color:var(--tx2);margin-top:4px}
.stat-c.viol .num{color:var(--v)}.stat-c.vrt .num{color:var(--gr)}.stat-c.blu .num{color:var(--bl)}
/* Constantes alertes */
.c-alert{background:#FFF3E0;border-left:4px solid var(--or);padding:9px 13px;border-radius:7px;margin-bottom:11px;font-size:12px;color:var(--or);display:none}
.c-alert.show{display:block}
/* Responsive */
@media(max-width:768px){.fg2,.fg3{grid-template-columns:1fr}.med-g4{grid-template-columns:1fr 1fr}.wrap{padding:14px 12px}.stats-row{grid-template-columns:1fr 1fr}}
@media(max-width:480px){.stats-row{grid-template-columns:1fr}.med-g4{grid-template-columns:1fr}}
</style>`

const DARK_SCRIPT = `<script>
(function(){var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t)})();
function toggleDark(){var c=document.documentElement.getAttribute('data-theme')||'light';var n=c==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',n);localStorage.setItem('theme',n);var b=document.getElementById('dkb');if(b)b.textContent=n==='dark'?'\u2600\uFE0F':'\uD83C\uDF19';}
</script>`

function pageHead(title: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Sant&#xe9;BF</title>${FONTS}${CSS}${DARK_SCRIPT}</head><body>`
}

function header(profil: AuthProfile): string {
  const av = (profil as any).avatar_url
  const avHtml = av
    ? `<img src="${esc(av)}" class="hd-av" alt="av">`
    : `<div class="hd-av-i">${esc(profil.prenom.charAt(0))}${esc(profil.nom.charAt(0))}</div>`
  return `<header class="hd">
  <div class="hd-l"><a href="/dashboard/medecin" class="hd-logo">
    <div class="hd-ico">&#x1F3E5;</div>
    <div class="hd-t">Sant&#xe9;BF<span class="hd-s">ESPACE M&#xC9;DICAL</span></div>
  </a></div>
  <div class="hd-r">
    <button id="dkb" class="dk-btn" onclick="toggleDark()" title="Mode sombre">&#x1F319;</button>
    ${avHtml}
    <div class="hd-u"><strong>Dr. ${esc(profil.prenom)} ${esc(profil.nom)}</strong><small>${esc(profil.role.replace(/_/g,' '))}</small></div>
    <a href="/medecin/profil" class="hd-btn">Profil</a>
    <a href="/auth/logout" class="hd-btn">D&#xe9;connexion</a>
  </div>
</header>`
}

function closePage(): string {
  return `<script>(function(){var t=localStorage.getItem('theme')||'light';var b=document.getElementById('dkb');if(b)b.textContent=t==='dark'?'\u2600\uFE0F':'\uD83C\uDF19'})();</script></body></html>`
}

// ─── Widget recherche patient (autocomplete) ──────────────
// Utilisé dans TOUS les formulaires pour chercher ou choisir un patient

function searchPatientWidget(currentPatient: any | null, required = true): string {
  const pid  = currentPatient?.id ?? ''
  const pLabel = currentPatient
    ? `${esc(currentPatient.prenom)} ${esc(currentPatient.nom)} — ${esc(currentPatient.numero_national ?? '')}`
    : ''

  return `
<div class="fg" id="ptSearchWrap">
  <label>Patient <span style="color:#B71C1C">*</span></label>
  ${currentPatient ? `
  <div class="pt-mini">
    <div style="font-size:22px">&#x1F464;</div>
    <div>
      <div class="pt-n">${esc(currentPatient.prenom)} ${esc(currentPatient.nom)}</div>
      <div class="pt-i">
        <span class="nn">${esc(currentPatient.numero_national ?? '')}</span>
        ${currentPatient.date_naissance ? ` &bull; ${age(currentPatient.date_naissance)} ans` : ''}
        ${currentPatient.groupe_sanguin ? ` &bull; <span style="color:#B71C1C;font-weight:700">${esc(currentPatient.groupe_sanguin)}${esc(currentPatient.rhesus??'')}</span>` : ''}
      </div>
    </div>
    <a href="?pid=" style="margin-left:auto;font-size:12px;color:var(--tx2);text-decoration:underline;cursor:pointer">Changer</a>
  </div>
  <input type="hidden" name="patient_id" id="ptId" value="${esc(pid)}">
  ` : `
  <div class="search-pt">
    <input type="text" id="ptSearch" placeholder="Rechercher par nom, pr&#xe9;nom ou n&#xb0; BF-..."
      autocomplete="off" oninput="searchPt(this.value)" onblur="setTimeout(hidePtR,200)"
      ${required ? 'required' : ''}>
    <span class="search-pt-ico">&#x1F50D;</span>
    <div class="pt-results" id="ptResults"></div>
  </div>
  <input type="hidden" name="patient_id" id="ptId" value="">
  <div id="ptSelected" style="display:none;margin-top:8px" class="pt-mini">
    <div style="font-size:22px">&#x1F464;</div>
    <div><div class="pt-n" id="ptSelNom"></div><div class="pt-i" id="ptSelInfo"></div></div>
    <button type="button" onclick="clearPt()" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:12px;color:var(--tx2);text-decoration:underline">Changer</button>
  </div>
  <div style="margin-top:8px;font-size:12px;color:var(--tx2)">
    Patient absent ? <a href="/medecin/patients/nouveau" class="btn-sm" style="font-size:11px" target="_blank">+ Cr&#xe9;er un dossier patient</a>
  </div>
  `}
</div>

<script>
function searchPt(q){
  if(q.length<2){document.getElementById('ptResults').classList.remove('show');return;}
  fetch('/medecin/api/recherche-patient?q='+encodeURIComponent(q))
    .then(function(r){return r.json();})
    .then(function(data){
      var box=document.getElementById('ptResults');
      if(!data||data.length===0){box.innerHTML='<div class="pt-result-item" style="color:var(--tx3);font-style:italic">Aucun r\u00e9sultat</div>';box.classList.add('show');return;}
      box.innerHTML=data.map(function(p){
        return '<div class="pt-result-item" onclick="selectPt('+JSON.stringify(p).replace(/</g,'\\u003c')+')">'+
          '<div class="pt-result-nom">'+p.prenom+' '+p.nom+'</div>'+
          '<div class="pt-result-info">'+p.numero_national+(p.date_naissance?' \u2022 '+calcAge(p.date_naissance)+' ans':'')+'</div>'+
        '</div>';
      }).join('');
      box.classList.add('show');
    }).catch(function(){});
}
function calcAge(d){return Math.floor((Date.now()-new Date(d).getTime())/(365.25*24*3600*1000));}
function selectPt(p){
  document.getElementById('ptId').value=p.id;
  document.getElementById('ptSearch').value='';
  document.getElementById('ptResults').classList.remove('show');
  document.getElementById('ptSelected').style.display='flex';
  document.getElementById('ptSelNom').textContent=p.prenom+' '+p.nom;
  document.getElementById('ptSelInfo').textContent=p.numero_national+(p.date_naissance?' \u2022 '+calcAge(p.date_naissance)+' ans':'');
}
function clearPt(){
  document.getElementById('ptId').value='';
  document.getElementById('ptSelected').style.display='none';
  document.getElementById('ptSearch').value='';
}
function hidePtR(){var b=document.getElementById('ptResults');if(b)b.classList.remove('show');}
</script>`
}

// ─── Messages succès depuis query params ──────────────────

function successMsg(params: URLSearchParams): string {
  const msgs: Record<string, string> = {
    consult:  '&#x2705; Consultation enregistr&#xe9;e avec succ&#xe8;s',
    ord:      '&#x2705; Ordonnance cr&#xe9;&#xe9;e et email envoy&#xe9; au patient',
    exam:     '&#x2705; Examen prescrit',
    rdv:      '&#x2705; Rendez-vous programm&#xe9; — email de confirmation envoy&#xe9;',
    doc:      '&#x2705; Document ajout&#xe9;',
    hospit:   '&#x2705; Patient hospitalis&#xe9;',
    chronique:'&#x2705; Suivi chronique ouvert',
    grossesse:'&#x2705; Suivi grossesse ouvert',
    bilan:    '&#x2705; Bilan enregistr&#xe9;',
    urgence:  '&#x26A0;&#xFE0F; Acc&#xe8;s urgence activ&#xe9; (24h)',
    patient:  '&#x2705; Patient cr&#xe9;&#xe9; et li&#xe9; &#xe0; votre compte',
  }
  for (const [k, v] of Object.entries(msgs)) {
    if (params.get(k) === 'ok') return `<div class="a-ok">${v}</div>`
  }
  return ''
}

// ═══════════════════════════════════════════════════════════
// API RECHERCHE PATIENT (JSON)
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/api/recherche-patient', async (c) => {
  const sb = c.get<ReturnType<typeof getSupabase>>('supabase')
  const q  = String(c.req.query('q') ?? '').trim()
  if (q.length < 2) return c.json([])

  const { data } = await sb.from('patient_dossiers')
    .select('id,nom,prenom,date_naissance,numero_national,groupe_sanguin,rhesus')
    .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,numero_national.ilike.%${q}%`)
    .limit(10)

  return c.json(data ?? [])
})

// ═══════════════════════════════════════════════════════════
// CRÉER / LIER UN PATIENT
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/patients/nouveau', async (c) => {
  const profil = c.get<AuthProfile>('profil')
  return c.html(pageHead('Nouveau patient') + header(profil) + `
<div class="wrap">
  <div class="bread"><a href="/dashboard/medecin">Accueil</a> &#x2192; <a href="/medecin/patients">Patients</a> &#x2192; Nouveau patient</div>
  <div class="pg-t">Cr&#xe9;er un dossier patient</div>
  <p style="font-size:13px;color:var(--tx2);margin-bottom:20px">
    Cr&#xe9;ez le dossier m&#xe9;dical d&#x27;un patient. Un lien sera &#xe9;tabli avec votre compte automatiquement.
    Le patient pourra cr&#xe9;er son compte plus tard et acc&#xe9;der &#xe0; son dossier.
  </p>
  <div class="card cb">
    <form method="POST" action="/medecin/patients/nouveau">
      <div class="st" style="margin-top:0;padding-top:0;border-top:none">&#x1F464; Identit&#xe9; civile</div>
      <div class="fg2">
        <div class="fg"><label>Nom <span style="color:#B71C1C">*</span></label>
          <input type="text" name="nom" placeholder="SAWADOGO" required style="text-transform:uppercase"></div>
        <div class="fg"><label>Pr&#xe9;nom <span style="color:#B71C1C">*</span></label>
          <input type="text" name="prenom" placeholder="Aminata" required></div>
        <div class="fg"><label>Date de naissance <span style="color:#B71C1C">*</span></label>
          <input type="date" name="date_naissance" required></div>
        <div class="fg"><label>Sexe <span style="color:#B71C1C">*</span></label>
          <select name="sexe" required>
            <option value="">-- S&#xe9;lectionner --</option>
            <option value="M">Masculin</option>
            <option value="F">F&#xe9;minin</option>
          </select></div>
        <div class="fg"><label>T&#xe9;l&#xe9;phone</label>
          <input type="text" name="telephone" placeholder="+226 XX XX XX XX"></div>
        <div class="fg"><label>Email (optionnel — pour notifications)</label>
          <input type="email" name="email" placeholder="patient@exemple.bf"></div>
      </div>
      <div class="sep"></div>
      <div class="st">&#x1FA78; Informations m&#xe9;dicales</div>
      <div class="fg3">
        <div class="fg"><label>Groupe sanguin</label>
          <select name="groupe_sanguin">
            <option value="inconnu">Inconnu</option>
            <option value="A">A</option><option value="B">B</option>
            <option value="AB">AB</option><option value="O">O</option>
          </select></div>
        <div class="fg"><label>Rh&#xe9;sus</label>
          <select name="rhesus">
            <option value="inconnu">Inconnu</option>
            <option value="+">Positif (+)</option>
            <option value="-">N&#xe9;gatif (-)</option>
          </select></div>
      </div>
      <div class="fg"><label>Allergies connues</label>
        <input type="text" name="allergies" placeholder="Ex : P&#xe9;nicilline, arachides — s&#xe9;parer par virgule"></div>
      <div class="fa">
        <a href="/medecin/patients" class="btn-g">Annuler</a>
        <button type="submit" class="btn">Cr&#xe9;er le dossier &#x2192;</button>
      </div>
    </form>
  </div>
</div>` + closePage())
})

medecinRoutes.post('/patients/nouveau', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const body   = await c.req.parseBody()

  const nom      = String(body.nom    ?? '').trim().toUpperCase()
  const prenom   = String(body.prenom ?? '').trim()
  const ddn      = String(body.date_naissance ?? '').trim()
  const sexe     = String(body.sexe   ?? 'M')
  const tel      = String(body.telephone ?? '').trim() || null
  const email    = String(body.email ?? '').trim() || null
  const gSang    = String(body.groupe_sanguin ?? 'inconnu')
  const rhesus   = String(body.rhesus ?? 'inconnu')
  const allerStr = String(body.allergies ?? '').trim()

  if (!nom || !prenom || !ddn) {
    return c.html(pageHead('Nouveau patient') + header(profil) +
      '<div class="wrap"><div class="a-err">&#x26A0; Nom, pr&#xe9;nom et date de naissance obligatoires.</div></div>' + closePage(), 400)
  }

  const allergies = allerStr
    ? allerStr.split(',').map((a: string) => ({ substance: a.trim() })).filter((a: any) => a.substance)
    : []

  const { data: pt, error } = await sb.from('patient_dossiers').insert({
    nom, prenom, date_naissance: ddn, sexe,
    groupe_sanguin: gSang, rhesus, allergies,
    maladies_chroniques: [], traitements_permanents: [],
    // numero_national auto-généré par trigger DB
    // code_urgence auto-généré par trigger DB
  }).select('id').single()

  if (error || !pt) {
    return c.html(pageHead('Nouveau patient') + header(profil) +
      `<div class="wrap"><div class="a-err">&#x26A0; Erreur cr&#xe9;ation : ${esc(error?.message ?? 'inconnue')}</div></div>` + closePage(), 500)
  }

  // Créer un consentement automatique entre ce médecin et ce patient
  await sb.from('patient_consentements').insert({
    patient_id:           pt.id,
    medecin_id:           profil.id,
    accorde_par:          'patient',
    type_acces:           'permanent',
    sections_autorisees:  ['consultations','ordonnances','examens','hospitalisations'],
    est_actif:            true,
  })

  return c.redirect(`/medecin/patients/${pt.id}?patient=ok`)
})

// ═══════════════════════════════════════════════════════════
// LISTE PATIENTS + ACCÈS URGENCE
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/patients', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const q      = String(c.req.query('q') ?? '').trim()
  const err    = c.req.query('err') ?? ''

  let patients: any[] = []
  if (q.length >= 2) {
    const { data } = await sb.from('patient_dossiers')
      .select('id,numero_national,nom,prenom,date_naissance,sexe,groupe_sanguin,rhesus')
      .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,numero_national.ilike.%${q}%`).limit(20)
    patients = data ?? []
  } else {
    const { data: cons } = await sb.from('patient_consentements')
      .select('patient_dossiers(id,numero_national,nom,prenom,date_naissance,sexe,groupe_sanguin,rhesus)')
      .eq('medecin_id', profil.id).eq('est_actif', true)
    patients = (cons ?? []).map((r: any) => r.patient_dossiers).filter(Boolean)
  }

  const errMsg = err === 'code_invalide' ? '<div class="a-err">&#x26A0; Code urgence invalide (6 chiffres requis).</div>'
    : err === 'code_introuvable' ? '<div class="a-err">&#x26A0; Aucun patient trouv&#xe9; avec ce code.</div>' : ''

  const lignes = patients.map((p: any) => `<tr>
    <td><span class="nn">${esc(p.numero_national??'')}</span></td>
    <td><strong>${esc(p.prenom)} ${esc(p.nom)}</strong></td>
    <td>${p.date_naissance ? age(p.date_naissance)+' ans' : '—'}</td>
    <td style="font-weight:700;color:var(--rd)">${esc(p.groupe_sanguin??'')}${esc(p.rhesus??'')}</td>
    <td>
      <a href="/medecin/patients/${p.id}" class="btn-sm" style="margin-right:4px">Dossier</a>
      <a href="/medecin/consultations/nouvelle?pid=${p.id}" class="btn-sm-v" style="margin-right:4px">Consult.</a>
      <a href="/medecin/ordonnances/nouvelle?pid=${p.id}" class="btn-sm">&#x1F48A;</a>
    </td>
  </tr>`).join('')

  return c.html(pageHead('Mes patients') + header(profil) + `
<div class="wrap">
  <div class="bread"><a href="/dashboard/medecin">Accueil</a> &#x2192; Patients</div>
  <div class="pg-t">Mes patients</div>
  ${errMsg}
  <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
    <form action="/medecin/patients" method="GET" style="display:flex;gap:8px;flex:1;min-width:240px">
      <input type="text" name="q" value="${esc(q)}" placeholder="Rechercher par nom, pr&#xe9;nom, n&#xb0; BF-..." style="flex:1">
      <button type="submit" class="btn">&#x1F50D;</button>
    </form>
    <a href="/medecin/patients/nouveau" class="btn-v">+ Nouveau patient</a>
  </div>

  <!-- Accès urgence -->
  <div style="background:#FFF3E0;border-left:4px solid var(--or);border-radius:10px;padding:14px 16px;margin-bottom:18px">
    <div style="font-size:13px;font-weight:700;color:var(--or);margin-bottom:8px">&#x1F6A8; Acc&#xe8;s urgence (code 6 chiffres du bracelet)</div>
    <form action="/medecin/urgence" method="POST" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
      <div>
        <label style="font-size:11px;color:var(--or);display:block;margin-bottom:4px">Code urgence</label>
        <input type="text" name="code_urgence" placeholder="482916" maxlength="6" style="width:90px;font-family:monospace;font-size:18px;letter-spacing:4px;text-align:center;border-color:var(--or);background:white">
      </div>
      <div style="flex:1;min-width:160px">
        <label style="font-size:11px;color:var(--or);display:block;margin-bottom:4px">Motif <span style="color:#B71C1C">*</span></label>
        <input type="text" name="motif_urgence" placeholder="Patient inconscient aux urgences" style="border-color:var(--or);background:white">
      </div>
      <button type="submit" style="background:var(--or);color:white;border:none;padding:10px 16px;border-radius:8px;font-weight:600;cursor:pointer;white-space:nowrap">Acc&#xe9;der</button>
    </form>
  </div>

  ${patients.length === 0 && !q ? `
  <div style="text-align:center;padding:50px;color:var(--tx3)">
    <div style="font-size:48px;margin-bottom:12px">&#x1F465;</div>
    <p>Aucun patient li&#xe9; &#xe0; votre compte.</p>
    <a href="/medecin/patients/nouveau" class="btn" style="margin-top:14px;display:inline-block">+ Cr&#xe9;er un premier patient</a>
  </div>` : ''}

  ${patients.length > 0 ? `<div class="card">
    <table>
      <thead><tr><th>N&#xb0; national</th><th>Nom</th><th>&#xc2;ge</th><th>Groupe</th><th>Actions</th></tr></thead>
      <tbody>${lignes}</tbody>
    </table>
  </div>` : ''}
</div>` + closePage())
})

// ═══════════════════════════════════════════════════════════
// ACCÈS URGENCE
// ═══════════════════════════════════════════════════════════

medecinRoutes.post('/urgence', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const body   = await c.req.parseBody()
  const code   = String(body.code_urgence  ?? '').trim()
  const motif  = String(body.motif_urgence ?? '').trim()
  if (!/^\d{6}$/.test(code) || !motif) return c.redirect('/medecin/patients?err=code_invalide')
  const { data: pt } = await sb.from('patient_dossiers').select('id').eq('code_urgence', code).single()
  if (!pt) return c.redirect('/medecin/patients?err=code_introuvable')
  const expAt = new Date(); expAt.setHours(expAt.getHours() + 24)
  await sb.from('patient_acces_urgence').insert({
    patient_id:profil.id, medecin_id:profil.id, type_acces:'code_urgence_6chiffres',
    motif_urgence:motif, acces_expire_at:expAt.toISOString(), valide_par_admin:false
  })
  return c.redirect(`/medecin/patients/${pt.id}?urgence=1`)
})

// ═══════════════════════════════════════════════════════════
// DOSSIER PATIENT COMPLET
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/patients/:id', async (c) => {
  const sb      = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil  = c.get<AuthProfile>('profil')
  const id      = c.req.param('id')
  const params  = new URL(c.req.url).searchParams
  const urgence = params.get('urgence') === '1'

  const [ptRes, consultRes, ordRes, examRes] = await Promise.all([
    sb.from('patient_dossiers').select('*').eq('id', id).single(),
    sb.from('medical_consultations').select('id,created_at,motif,diagnostic_principal,type_consultation,conduite_a_tenir')
      .eq('patient_id', id).order('created_at',{ascending:false}).limit(8),
    sb.from('medical_ordonnances').select('id,numero_ordonnance,statut,created_at,date_expiration')
      .eq('patient_id', id).order('created_at',{ascending:false}).limit(5),
    sb.from('medical_examens').select('id,nom_examen,type_examen,statut,created_at,est_urgent,est_anormal')
      .eq('patient_id', id).order('created_at',{ascending:false}).limit(5),
  ])

  const pt = ptRes.data
  if (!pt) return c.redirect('/medecin/patients')

  const ptAge    = pt.date_naissance ? age(pt.date_naissance) : 0
  const allergies: any[] = Array.isArray(pt.allergies) ? pt.allergies : []
  const maladies: any[]  = Array.isArray(pt.maladies_chroniques) ? pt.maladies_chroniques : []

  const allerBadges = allergies.length === 0
    ? '<em style="color:var(--tx3);font-size:12px">Aucune connue</em>'
    : allergies.map((a:any)=>`<span class="badge" style="background:#FFF5F5;color:var(--rd);border:1px solid #FFCDD2;margin:2px">${esc(a.substance??a)}</span>`).join('')

  const maladieBadges = maladies.length === 0
    ? '<em style="color:var(--tx3);font-size:12px">Aucune</em>'
    : maladies.map((m:any)=>`<span class="badge" style="background:#FFF3E0;color:var(--or);border:1px solid #FFE0B2;margin:2px">${esc(m.maladie??m.nom??m)}</span>`).join('')

  const consultItems = (consultRes.data??[]).length===0 ? '<div class="empty">Aucune consultation</div>'
    : (consultRes.data??[]).map((r:any)=>`<div style="padding:11px 16px;border-bottom:1px solid var(--brd)">
      <div style="display:flex;justify-content:space-between;margin-bottom:2px">
        <span style="font-size:12px;font-weight:600;color:var(--v)">${esc(r.type_consultation??'')}</span>
        <span style="font-size:11px;color:var(--tx3)">${fmtD(r.created_at)}</span>
      </div>
      <div style="font-size:13px">${esc(r.motif??'')}</div>
      ${r.diagnostic_principal?`<div style="font-size:12px;color:var(--v)">&#x2192; ${esc(r.diagnostic_principal)}</div>`:''}
    </div>`).join('')

  const ordItems = (ordRes.data??[]).length===0 ? '<div class="empty">Aucune ordonnance</div>'
    : (ordRes.data??[]).map((o:any)=>`<div style="padding:11px 16px;border-bottom:1px solid var(--brd);display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">
      <div>
        <div style="font-size:12px;font-family:monospace;color:var(--gr)">${esc(o.numero_ordonnance??'')}</div>
        <div style="font-size:11px;color:var(--tx3)">Exp. ${fmtD(o.date_expiration)}</div>
      </div>
      <div style="display:flex;gap:5px;align-items:center">
        <span class="badge ${esc(o.statut??'')}">${esc(o.statut??'')}</span>
        <a href="/medecin/ordonnances/${o.id}/pdf" class="btn-sm-v" style="font-size:11px">PDF</a>
      </div>
    </div>`).join('')

  const examItems = (examRes.data??[]).length===0 ? '<div class="empty">Aucun examen</div>'
    : (examRes.data??[]).map((e:any)=>`<div style="padding:11px 16px;border-bottom:1px solid var(--brd)">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:3px">
        <span style="font-size:13px;font-weight:600">${esc(e.nom_examen??'')}${e.est_urgent?' <span class="badge urgent">URGENT</span>':''}${e.est_anormal?' <span class="badge grave">&#x26A0; Anormal</span>':''}</span>
        <span class="badge ${esc(e.statut??'')}">${esc(e.statut??'')}</span>
      </div>
      <div style="font-size:11px;color:var(--tx3)">${esc(e.type_examen??'')} &bull; ${fmtD(e.created_at)}</div>
    </div>`).join('')

  return c.html(pageHead(`${pt.prenom} ${pt.nom}`) + header(profil) + `
<div class="wrap">
  <div class="bread"><a href="/dashboard/medecin">Accueil</a> &#x2192; <a href="/medecin/patients">Patients</a> &#x2192; ${esc(pt.prenom)} ${esc(pt.nom)}</div>

  ${successMsg(params)}
  ${urgence ? '<div class="a-warn">&#x1F6A8; Acc&#xe8;s urgence actif (24h). Acc&#xe8;s sans consentement.</div>' : ''}

  <!-- Bandeau patient -->
  <div style="background:var(--v);border-radius:14px;padding:18px 22px;margin-bottom:20px;color:white">
    <div style="font-size:10px;opacity:.7;margin-bottom:2px">${esc(pt.numero_national??'')}</div>
    <div style="font-family:'DM Serif Display',serif;font-size:22px;margin-bottom:8px">${esc(pt.prenom)} ${esc(pt.nom)}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <span style="background:rgba(255,255,255,.2);padding:3px 11px;border-radius:20px;font-size:12px">${ptAge} ans</span>
      <span style="background:rgba(255,255,255,.2);padding:3px 11px;border-radius:20px;font-size:12px">${pt.sexe==='M'?'&#x2642; Homme':'&#x2640; Femme'}</span>
      <span style="background:white;color:var(--rd);padding:3px 11px;border-radius:20px;font-size:12px;font-weight:700">&#x1FA78; ${esc(pt.groupe_sanguin??'')}${esc(pt.rhesus??'')}</span>
      ${pt.date_naissance?`<span style="background:rgba(255,255,255,.2);padding:3px 11px;border-radius:20px;font-size:12px">N&#xe9; le ${fmtD(pt.date_naissance)}</span>`:''}
    </div>
  </div>

  <!-- Actions rapides -->
  <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
    <a href="/medecin/consultations/nouvelle?pid=${id}" class="btn">&#x1F4CB; Consultation</a>
    <a href="/medecin/ordonnances/nouvelle?pid=${id}" class="btn-v">&#x1F48A; Ordonnance</a>
    <a href="/medecin/examens/nouveau?pid=${id}" class="btn-b">&#x1F9EA; Examen</a>
    <a href="/medecin/rdv/nouveau?pid=${id}" class="btn-g">&#x1F4C5; RDV</a>
    <a href="/medecin/certificat/nouveau?pid=${id}" class="btn-g">&#x1F4DC; Certificat</a>
    <a href="/medecin/documents/upload?pid=${id}" class="btn-g">&#x1F4C4; Document</a>
  </div>

  <!-- Allergies + maladies -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">
    <div class="card cb"><div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">&#x26A0;&#xFE0F; Allergies</div>${allerBadges}</div>
    <div class="card cb"><div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">&#x1F3E5; Maladies chroniques</div>${maladieBadges}</div>
  </div>

  <!-- Blocs médicaux -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="card">
      <div style="padding:12px 16px;background:var(--v);display:flex;justify-content:space-between;align-items:center">
        <h3 style="font-size:13px;color:white;font-weight:600">&#x1F4CB; Consultations</h3>
        <a href="/medecin/consultations/nouvelle?pid=${id}" style="font-size:12px;color:rgba(255,255,255,.75);text-decoration:none;background:rgba(255,255,255,.12);padding:3px 8px;border-radius:5px">+ Nouvelle</a>
      </div>
      ${consultItems}
    </div>
    <div class="card">
      <div style="padding:12px 16px;background:var(--gr);display:flex;justify-content:space-between;align-items:center">
        <h3 style="font-size:13px;color:white;font-weight:600">&#x1F48A; Ordonnances</h3>
        <a href="/medecin/ordonnances/nouvelle?pid=${id}" style="font-size:12px;color:rgba(255,255,255,.75);text-decoration:none;background:rgba(255,255,255,.12);padding:3px 8px;border-radius:5px">+ Nouvelle</a>
      </div>
      ${ordItems}
    </div>
    <div class="card">
      <div style="padding:12px 16px;background:var(--bl);display:flex;justify-content:space-between;align-items:center">
        <h3 style="font-size:13px;color:white;font-weight:600">&#x1F9EA; Examens</h3>
        <a href="/medecin/examens/nouveau?pid=${id}" style="font-size:12px;color:rgba(255,255,255,.75);text-decoration:none;background:rgba(255,255,255,.12);padding:3px 8px;border-radius:5px">+ Prescrire</a>
      </div>
      ${examItems}
    </div>
  </div>
</div>` + closePage())
})

// ═══════════════════════════════════════════════════════════
// CONSULTATION
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/consultations/nouvelle', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const pid    = c.req.query('pid') ?? ''
  let patient: any = null
  if (pid) {
    const {data} = await sb.from('patient_dossiers').select('id,nom,prenom,date_naissance,sexe,groupe_sanguin,rhesus,allergies').eq('id',pid).single()
    patient = data
  }
  return c.html(consultPage(profil, patient))
})

medecinRoutes.post('/consultations/nouvelle', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const body   = await c.req.parseBody()
  const pid    = String(body.patient_id ?? '').trim()
  if (!pid) return c.redirect('/medecin/patients')

  await sb.from('medical_consultations').insert({
    patient_id:pid, medecin_id:profil.id, structure_id:profil.structure_id,
    type_consultation:String(body.type_consultation??'normale'),
    motif:String(body.motif??''),
    anamnese:String(body.anamnese??'')||null,
    examen_clinique:String(body.examen_clinique??'')||null,
    diagnostic_principal:String(body.diagnostic_principal??'')||null,
    conclusion:String(body.conclusion??'')||null,
    conduite_a_tenir:String(body.conduite_a_tenir??'')||null,
    notes_confidentielles:String(body.notes_confidentielles??'')||null,
    est_urgence:body.type_consultation==='urgence',
  })

  const tsys = parseInt(String(body.tension_sys??''))||null
  const tdia = parseInt(String(body.tension_dia??''))||null
  const temp = parseFloat(String(body.temperature??''))||null
  const pls  = parseInt(String(body.pouls??''))||null
  const spo2 = parseInt(String(body.spo2??''))||null
  const pds  = parseFloat(String(body.poids??''))||null
  const tail = parseFloat(String(body.taille??''))||null
  if (tsys||tdia||temp||pls||spo2||pds||tail) {
    await sb.from('medical_constantes').insert({
      patient_id:pid, prise_par:profil.id,
      tension_systolique:tsys, tension_diastolique:tdia,
      temperature:temp, pouls:pls, saturation_o2:spo2, poids:pds, taille:tail
    })
  }
  if (body.rdv_date && body.rdv_heure) {
    await sb.from('medical_rendez_vous').insert({
      patient_id:pid, medecin_id:profil.id, structure_id:profil.structure_id,
      date_heure:`${body.rdv_date}T${body.rdv_heure}:00`,
      motif:String(body.rdv_motif??'Suivi consultation'), statut:'planifie', duree_minutes:30, rappel_envoye:false
    })
  }
  return c.redirect(`/medecin/patients/${pid}?consult=ok`)
})

// ═══════════════════════════════════════════════════════════
// ORDONNANCE + EMAIL
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/ordonnances/nouvelle', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const pid    = c.req.query('pid') ?? ''
  let patient: any = null
  if (pid) {
    const {data} = await sb.from('patient_dossiers').select('id,nom,prenom,date_naissance,allergies,numero_national').eq('id',pid).single()
    patient = data
  }
  return c.html(ordPage(profil, patient))
})

medecinRoutes.post('/ordonnances/nouvelle', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const body   = await c.req.parseBody()
  const pid    = String(body.patient_id ?? '').trim()
  if (!pid) return c.redirect('/medecin/patients')

  const dateExp = new Date(); dateExp.setMonth(dateExp.getMonth()+3)

  const {data:ord} = await sb.from('medical_ordonnances').insert({
    patient_id:pid, medecin_id:profil.id, structure_id:profil.structure_id,
    statut:'active', date_expiration:dateExp.toISOString()
  }).select('id,numero_ordonnance,qr_code_verification').single()

  if (!ord) return c.redirect(`/medecin/patients/${pid}?err=ord`)

  let meds: any[] = []
  try { meds = JSON.parse(String(body.medicaments??'[]')) } catch { meds=[] }

  if (meds.length > 0) {
    await sb.from('medical_ordonnance_lignes').insert(
      meds.map((m:any, i:number) => ({
        ordonnance_id:ord.id, ordre:i+1,
        medicament_nom:String(m.nom??''),
        medicament_forme:String(m.forme??'comprimé'),
        dosage:String(m.dosage??''), frequence:String(m.frequence??''),
        duree:String(m.duree??''), quantite:parseInt(String(m.qte??'1'))||1,
        instructions_speciales:m.instructions||null, est_delivre:false
      }))
    )
  }

  // Email patient
  const {data:ptData} = await sb.from('patient_dossiers').select('prenom,nom,auth_profiles(email)').eq('id',pid).single()
  const ptEmail = (ptData as any)?.auth_profiles?.email
  if (ptEmail && c.env.RESEND_API_KEY) {
    const medsHtml = meds.map((m:any)=>`<li><strong>${esc(m.nom)}</strong> ${esc(m.dosage)} — ${esc(m.frequence)} pendant ${esc(m.duree)}</li>`).join('')
    await sendEmail({
      resendKey:c.env.RESEND_API_KEY, to:ptEmail,
      subject:`Ordonnance ${ord.numero_ordonnance} — SantéBF`,
      html:`<div style="font-family:sans-serif;max-width:580px">
        <div style="background:#4A148C;color:white;padding:20px;border-radius:8px 8px 0 0"><h2>&#x1F48A; Nouvelle ordonnance ${esc(ord.numero_ordonnance??'')}</h2></div>
        <div style="padding:20px;background:#f9f9f9;border:1px solid #e0e0e0;border-top:none">
          <p>Bonjour ${esc((ptData as any)?.prenom??'')},</p>
          <p>Dr. ${esc(profil.prenom)} ${esc(profil.nom)} vous a prescrit :</p>
          <ul>${medsHtml}</ul>
          <p>Valide jusqu'au : ${fmtD(dateExp.toISOString())}</p>
          <p>V&#xe9;rification : https://santebf.izicardouaga.com/public/ordonnance/${esc(ord.qr_code_verification??'')}</p>
        </div></div>`
    })
  }

  return c.redirect(`/medecin/patients/${pid}?ord=ok`)
})

// PDF ordonnance
medecinRoutes.get('/ordonnances/:id/pdf', async (c) => {
  const sb     = c.get<ReturnType<typeof getSupabase>>('supabase')
  const profil = c.get<AuthProfile>('profil')
  const id     = c.req.param('id')
  const [ordRes, lignesRes] = await Promise.all([
    sb.from('medical_ordonnances').select('*,patient_dossiers(nom,prenom,date_naissance,groupe_sanguin,rhesus,numero_national)').eq('id',id).single(),
    sb.from('medical_ordonnance_lignes').select('*').eq('ordonnance_id',id).order('ordre')
  ])
  const ord=ordRes.data; const lignes=lignesRes.data??[]
  if (!ord) return c.redirect('/medecin/patients')
  const pt=(ord as any).patient_dossiers
  const rows = lignes.map((l:any,i:number)=>`<tr>
    <td style="padding:9px 12px;border-bottom:1px solid #eee">${i+1}</td>
    <td style="padding:9px 12px;border-bottom:1px solid #eee"><strong>${esc(l.medicament_nom??'')}</strong><br><small>${esc(l.medicament_forme??'')} &bull; Qté ${l.quantite??1}</small></td>
    <td style="padding:9px 12px;border-bottom:1px solid #eee">${esc(l.dosage??'')}</td>
    <td style="padding:9px 12px;border-bottom:1px solid #eee">${esc(l.frequence??'')}</td>
    <td style="padding:9px 12px;border-bottom:1px solid #eee">${esc(l.duree??'')}</td>
  </tr>`).join('')
  return c.html(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Ordonnance ${esc(ord.numero_ordonnance??'')}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
<style>body{font-family:'DM Sans',sans-serif;max-width:820px;margin:0 auto;padding:32px 20px;color:#1A1A2E}
.hd{background:#4A148C;color:white;padding:18px 22px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px}
table{width:100%;border-collapse:collapse}thead th{background:#4A148C;color:white;padding:9px 12px;text-align:left;font-size:11px}
.no-print{margin-bottom:16px}@media print{.no-print{display:none}body{padding:10px}}</style>
</head><body>
<div class="no-print">
  <button onclick="window.print()" style="background:#4A148C;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;margin-right:8px">&#x1F5A8; Imprimer / PDF</button>
  <a href="/medecin/patients/${(ord as any).patient_id}" style="color:#4A148C">&#x2190; Retour dossier</a>
</div>
<div class="hd">
  <div><div style="font-family:'DM Serif Display',serif;font-size:20px">&#x1F48A; Ordonnance M&#xe9;dicale</div><div style="font-size:14px;opacity:.85">${esc(ord.numero_ordonnance??'')}</div></div>
  <div style="text-align:right;font-size:12px;opacity:.85"><div>Date : ${fmtD(ord.created_at)}</div><div>Expire : ${fmtD(ord.date_expiration)}</div><div>Dr. ${esc(profil.prenom)} ${esc(profil.nom)}</div></div>
</div>
<div style="background:#F3E5F5;padding:12px 16px;border:1px solid #E0E0E0;border-top:none;margin-bottom:18px;border-radius:0 0 10px 10px">
  <strong>${esc(pt?.prenom??'')} ${esc(pt?.nom??'')}</strong>
  <span style="font-family:monospace;font-size:12px;margin-left:8px">${esc(pt?.numero_national??'')}</span>
  <span style="color:#B71C1C;font-weight:700;margin-left:8px">${esc(pt?.groupe_sanguin??'')}${esc(pt?.rhesus??'')}</span>
</div>
<table><thead><tr><th>#</th><th>M&#xe9;dicament</th><th>Dosage</th><th>Fr&#xe9;quence</th><th>Dur&#xe9;e</th></tr></thead>
<tbody>${rows}</tbody></table>
<div style="margin-top:32px;font-size:11px;color:#9E9E9E">
  V&#xe9;rification QR : https://santebf.izicardouaga.com/public/ordonnance/${esc(ord.qr_code_verification??'')}
</div>
<div style="margin-top:24px;border-top:2px solid #4A148C;padding-top:8px;text-align:right">
  <div style="font-weight:600">Dr. ${esc(profil.prenom)} ${esc(profil.nom)}</div>
  <div style="font-size:11px;color:#9E9E9E;margin-top:4px">Signature et cachet</div>
  <div style="height:50px"></div>
</div>
</body></html>`)
})

// ═══════════════════════════════════════════════════════════
// EXAMEN
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/examens/nouveau', async (c) => {
  const sb=c.get<ReturnType<typeof getSupabase>>('supabase');const profil=c.get<AuthProfile>('profil')
  const pid=c.req.query('pid')??''; let patient:any=null
  if(pid){const{data}=await sb.from('patient_dossiers').select('id,nom,prenom,numero_national').eq('id',pid).single();patient=data}
  return c.html(examPage(profil, patient))
})

medecinRoutes.post('/examens/nouveau', async (c) => {
  const sb=c.get<ReturnType<typeof getSupabase>>('supabase');const profil=c.get<AuthProfile>('profil')
  const body=await c.req.parseBody();const pid=String(body.patient_id??'').trim()
  if(!pid)return c.redirect('/medecin/patients')
  await sb.from('medical_examens').insert({
    patient_id:pid,prescrit_par:profil.id,structure_id:profil.structure_id,
    type_examen:String(body.type_examen??'autre'),nom_examen:String(body.nom_examen??''),
    motif:String(body.motif??'')||null,est_urgent:body.est_urgent==='true',statut:'prescrit',est_anormal:false
  })
  return c.redirect(`/medecin/patients/${pid}?exam=ok`)
})

// ═══════════════════════════════════════════════════════════
// RDV
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/rdv', async (c) => {
  const sb=c.get<ReturnType<typeof getSupabase>>('supabase');const profil=c.get<AuthProfile>('profil')
  const today=new Date().toISOString().split('T')[0]
  const{data:rdvs}=await sb.from('medical_rendez_vous')
    .select('id,date_heure,motif,statut,duree_minutes,patient_dossiers(nom,prenom,numero_national)')
    .eq('medecin_id',profil.id).gte('date_heure',today+'T00:00:00').order('date_heure').limit(50)
  const lignes=(rdvs??[]).length===0?'<tr><td colspan="5" class="empty">Aucun RDV &#xe0; venir</td></tr>'
    :(rdvs??[]).map((r:any)=>`<tr>
      <td><strong style="color:var(--v)">${fmtDT(r.date_heure)}</strong></td>
      <td>${esc(r.patient_dossiers?.prenom??'')} ${esc(r.patient_dossiers?.nom??'')}<br><span style="font-size:11px;font-family:monospace;color:var(--tx3)">${esc(r.patient_dossiers?.numero_national??'')}</span></td>
      <td>${esc(r.motif??'—')}</td>
      <td><span class="badge ${esc(r.statut??'')}">${esc(r.statut??'')}</span></td>
      <td>
        ${r.statut==='planifie'?`<form method="POST" action="/medecin/rdv/${r.id}/statut" style="display:inline"><input type="hidden" name="statut" value="confirme"><button type="submit" class="btn-sm-v" style="margin-right:3px">Confirmer</button></form><form method="POST" action="/medecin/rdv/${r.id}/statut" style="display:inline"><input type="hidden" name="statut" value="annule"><button type="submit" class="btn-sm-r">Annuler</button></form>`:''}
        ${r.statut==='confirme'?`<form method="POST" action="/medecin/rdv/${r.id}/statut" style="display:inline"><input type="hidden" name="statut" value="passe"><button type="submit" class="btn-sm">Termin&#xe9;</button></form>`:''}
      </td>
    </tr>`).join('')
  return c.html(pageHead('Planning')+header(profil)+`<div class="wrap">
    <div class="bread"><a href="/dashboard/medecin">Accueil</a> &#x2192; Planning</div>
    <div style="display:flex;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div class="pg-t">Mon planning</div>
      <a href="/medecin/rdv/nouveau" class="btn">+ Nouveau RDV</a>
    </div>
    <div class="card"><table>
      <thead><tr><th>Date &amp; Heure</th><th>Patient</th><th>Motif</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>${lignes}</tbody>
    </table></div>
  </div>`+closePage())
})

medecinRoutes.post('/rdv/:id/statut', async (c) => {
  const sb=c.get<ReturnType<typeof getSupabase>>('supabase')
  const body=await c.req.parseBody();const st=String(body.statut??'')
  if(!['confirme','annule','passe','absent','reporte'].includes(st))return c.redirect('/medecin/rdv')
  await sb.from('medical_rendez_vous').update({statut:st}).eq('id',c.req.param('id'))
  return c.redirect('/medecin/rdv')
})

medecinRoutes.get('/rdv/nouveau', async (c) => {
  const sb=c.get<ReturnType<typeof getSupabase>>('supabase');const profil=c.get<AuthProfile>('profil')
  const pid=c.req.query('pid')??''; let patient:any=null
  if(pid){const{data}=await sb.from('patient_dossiers').select('id,nom,prenom,numero_national').eq('id',pid).single();patient=data}
  return c.html(rdvPage(profil, patient))
})

medecinRoutes.post('/rdv/nouveau', async (c) => {
  const sb=c.get<ReturnType<typeof getSupabase>>('supabase');const profil=c.get<AuthProfile>('profil')
  const body=await c.req.parseBody()
  const pid=String(body.patient_id??'').trim()
  const d=String(body.rdv_date??'');const h=String(body.rdv_heure??'')
  if(!pid||!d||!h)return c.redirect('/medecin/rdv')
  await sb.from('medical_rendez_vous').insert({
    patient_id:pid,medecin_id:profil.id,structure_id:profil.structure_id,
    date_heure:`${d}T${h}:00`,motif:String(body.motif??'')||null,
    duree_minutes:parseInt(String(body.duree??'30'))||30,statut:'planifie',rappel_envoye:false
  })
  // Email confirmation
  const{data:ptData}=await sb.from('patient_dossiers').select('prenom,nom,auth_profiles(email)').eq('id',pid).single()
  const ptEmail=(ptData as any)?.auth_profiles?.email
  if(ptEmail&&c.env.RESEND_API_KEY){
    await sendEmail({
      resendKey:c.env.RESEND_API_KEY,to:ptEmail,
      subject:`RDV confirm&#xe9; — SantéBF`,
      html:`<div style="font-family:sans-serif;max-width:580px"><div style="background:#4A148C;color:white;padding:20px;border-radius:8px 8px 0 0"><h2>&#x1F4C5; Rendez-vous confirm&#xe9;</h2></div>
        <div style="padding:20px;background:#f9f9f9;border:1px solid #e0e0e0;border-top:none">
          <p>Bonjour ${esc((ptData as any)?.prenom??'')},</p>
          <p>Dr. ${esc(profil.prenom)} ${esc(profil.nom)} vous a programm&#xe9; un RDV :</p>
          <p style="font-size:16px;font-weight:600;color:#4A148C">&#x1F4C5; ${fmtDT(d+'T'+h+':00')}</p>
          ${body.motif?`<p>Motif : ${esc(String(body.motif))}</p>`:''}
        </div></div>`
    })
  }
  return c.redirect(`/medecin/patients/${pid}?rdv=ok`)
})

// ═══════════════════════════════════════════════════════════
// CERTIFICAT MÉDICAL
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/certificat/nouveau', async (c) => {
  const sb=c.get<ReturnType<typeof getSupabase>>('supabase');const profil=c.get<AuthProfile>('profil')
  const pid=c.req.query('pid')??''; let patient:any=null
  if(pid){const{data}=await sb.from('patient_dossiers').select('id,nom,prenom,date_naissance,sexe,numero_national').eq('id',pid).single();patient=data}
  return c.html(certifPage(profil, patient))
})

medecinRoutes.post('/certificat/nouveau', async (c) => {
  const sb=c.get<ReturnType<typeof getSupabase>>('supabase');const profil=c.get<AuthProfile>('profil')
  const body=await c.req.parseBody();const pid=String(body.patient_id??'').trim()
  const{data:pt}=await sb.from('patient_dossiers').select('nom,prenom,date_naissance,sexe,numero_national').eq('id',pid).single()
  await sb.from('medical_documents').insert({
    patient_id:pid,uploaded_par:profil.id,structure_id:profil.structure_id,
    type_document:'certificat_medical',titre:`Certificat ${String(body.type_certif??'')} — ${fmtD(new Date().toISOString())}`,est_confidentiel:false
  })
  // Page imprimable
  return c.html(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Certificat M&#xe9;dical</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
<style>body{font-family:'DM Sans',sans-serif;max-width:800px;margin:0 auto;padding:32px 24px;color:#1A1A2E}
.no-print{margin-bottom:16px}@media print{.no-print{display:none}body{padding:10px}}</style></head><body>
<div class="no-print">
  <button onclick="window.print()" style="background:#4A148C;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer">&#x1F5A8; Imprimer / PDF</button>
  <a href="/medecin/patients/${pid}" style="margin-left:10px;color:#4A148C">&#x2190; Retour dossier</a>
</div>
<div style="text-align:center;border-bottom:3px solid #4A148C;padding-bottom:16px;margin-bottom:24px">
  <div style="font-family:'DM Serif Display',serif;font-size:24px;color:#4A148C">Certificat M&#xe9;dical</div>
  <div style="font-size:13px;color:#6B7280;margin-top:4px">${esc(String(body.type_certif??'').replace(/_/g,' '))}</div>
</div>
<p>Je soussign&#xe9;, <strong>Dr. ${esc(profil.prenom)} ${esc(profil.nom)}</strong>, certifie avoir examin&#xe9; ce jour :</p>
<div style="background:#F3E5F5;border-radius:8px;padding:14px;margin:16px 0;border-left:4px solid #4A148C">
  <strong>${esc(pt?.prenom??'')} ${esc(pt?.nom??'')}</strong>
  — N&#xb0; ${esc(pt?.numero_national??'')}
  — N&#xe9;(e) le ${fmtD(pt?.date_naissance??'')}
</div>
<div style="margin:20px 0;line-height:1.7;white-space:pre-wrap">${esc(String(body.contenu??''))}</div>
${body.duree?`<p>Dur&#xe9;e : <strong>${esc(String(body.duree))}</strong></p>`:''}
<div style="margin-top:48px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:20px">
  <div style="font-size:12px;color:#9E9E9E">D&#xe9;livr&#xe9; le ${fmtD(new Date().toISOString())}</div>
  <div style="text-align:right;border-top:2px solid #4A148C;padding-top:8px;min-width:200px">
    <div style="font-weight:600">Dr. ${esc(profil.prenom)} ${esc(profil.nom)}</div>
    <div style="font-size:11px;color:#9E9E9E">Signature et cachet</div>
    <div style="height:60px"></div>
  </div>
</div></body></html>`)
})

// ═══════════════════════════════════════════════════════════
// PROFIL MÉDECIN
// ═══════════════════════════════════════════════════════════

medecinRoutes.get('/profil', async (c) => {
  const sb=c.get<ReturnType<typeof getSupabase>>('supabase');const profil=c.get<AuthProfile>('profil')
  const[medRes,structRes]=await Promise.all([
    sb.from('auth_medecins').select('specialite_principale,numero_ordre_national,annee_diplome').eq('profile_id',profil.id).single(),
    sb.from('auth_medecin_structures').select('type_poste,jours_presence,struct_structures(nom,type_structure)').eq('medecin_id',profil.id)
  ])
  const med=medRes.data; const structs=structRes.data??[]
  const structRows=structs.length===0?'<div class="empty">Aucune structure associ&#xe9;e</div>'
    :structs.map((s:any)=>`<div style="padding:11px 15px;border-bottom:1px solid var(--brd)">
      <div style="font-size:13px;font-weight:600">${esc(s.struct_structures?.nom??'')}</div>
      <div style="font-size:11px;color:var(--tx2)">${esc(s.struct_structures?.type_structure??'')} &bull; ${esc(s.type_poste??'')}</div>
    </div>`).join('')
  const av=(profil as any).avatar_url
  const avHtml=av?`<img src="${esc(av)}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid var(--v);margin-bottom:12px">`
    :`<div style="width:90px;height:90px;border-radius:50%;background:var(--v);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:32px;font-weight:700;color:white">${esc(profil.prenom.charAt(0))}${esc(profil.nom.charAt(0))}</div>`
  return c.html(pageHead('Mon profil')+header(profil)+`<div class="wrap">
    <div class="bread"><a href="/dashboard/medecin">Accueil</a> &#x2192; Mon profil</div>
    <div style="display:grid;grid-template-columns:260px 1fr;gap:22px;align-items:start">
      <div class="card cb" style="text-align:center">
        ${avHtml}
        <div style="font-family:'DM Serif Display',serif;font-size:17px">Dr. ${esc(profil.prenom)} ${esc(profil.nom)}</div>
        <div style="font-size:12px;color:var(--tx2)">${esc(profil.role.replace(/_/g,' '))}</div>
        ${med?.specialite_principale?`<div style="font-size:13px;color:var(--v);font-weight:600;margin-top:5px">${esc(med.specialite_principale)}</div>`:''}
        ${med?.numero_ordre_national?`<div style="font-size:11px;color:var(--tx3);margin-top:3px">N&#xb0; Ordre : ${esc(med.numero_ordre_national)}</div>`:''}
        <form method="POST" action="/profil/avatar" enctype="multipart/form-data" style="margin-top:16px">
          <input type="file" name="avatar" accept="image/*" style="font-size:12px;margin-bottom:8px;display:block;width:100%">
          <button type="submit" class="btn" style="width:100%;padding:8px 0">Changer la photo</button>
        </form>
      </div>
      <div>
        <div class="card cb">
          <div class="st" style="margin-top:0;padding-top:0;border-top:none">Informations professionnelles</div>
          <div class="fg2">
            <div><label style="font-size:11px;color:var(--tx3)">Sp&#xe9;cialit&#xe9;</label><p>${esc(med?.specialite_principale??'—')}</p></div>
            <div><label style="font-size:11px;color:var(--tx3)">N&#xb0; Ordre</label><p>${esc(med?.numero_ordre_national??'—')}</p></div>
          </div>
        </div>
        <div class="card">
          <div style="padding:13px 18px;background:var(--v)"><h3 style="font-size:13px;color:white;font-weight:600">&#x1F3E5; Mes structures</h3></div>
          ${structRows}
        </div>
        <div class="card cb"><a href="/auth/changer-mdp" class="btn-g">&#x1F512; Changer mon mot de passe</a></div>
      </div>
    </div>
  </div>`+closePage())
})

// ═══════════════════════════════════════════════════════════
// FONCTIONS INTERNES — PAGES FORMULAIRES
// ═══════════════════════════════════════════════════════════

// ─── Consultation ─────────────────────────────────────────

function consultPage(profil: AuthProfile, patient: any): string {
  const pid = patient?.id ?? ''
  return pageHead('Nouvelle consultation') + header(profil) + `
<div class="wrap">
  <div class="bread"><a href="/dashboard/medecin">Accueil</a> &#x2192; <a href="/medecin/patients${pid?'/'+pid:''}">Patient</a> &#x2192; Consultation</div>
  <div class="pg-t">Nouvelle consultation</div>
  <div class="card cb">
    <form method="POST" action="/medecin/consultations/nouvelle">
      ${searchPatientWidget(patient)}
      <div class="fg2">
        <div class="fg"><label>Type <span style="color:#B71C1C">*</span></label>
          <select name="type_consultation" required>
            <option value="normale">Normale</option><option value="urgence">Urgence</option>
            <option value="suivi">Suivi</option><option value="teleconsultation">T&#xe9;l&#xe9;consultation</option>
            <option value="domicile">&#xe0; domicile</option>
          </select></div>
        <div class="fg"><label>Motif <span style="color:#B71C1C">*</span></label>
          <input type="text" name="motif" placeholder="Raison de la consultation" required></div>
      </div>
      <div class="sep"></div>
      <div class="st">&#x1F4DD; Anamn&#xe8;se</div>
      <div class="fg"><textarea name="anamnese" placeholder="Histoire de la maladie, ant&#xe9;c&#xe9;dents pertinents..." rows="4"></textarea></div>
      <div class="sep"></div>
      <div class="st">&#x1FA7A; Examen clinique</div>
      <div class="fg"><textarea name="examen_clinique" placeholder="&#xc9;tat g&#xe9;n&#xe9;ral, examen cardiovasculaire, respiratoire, abdominal..." rows="5"></textarea></div>
      <div class="sep"></div>
      <div class="st">&#x1F3AF; Diagnostic et prise en charge</div>
      <div class="fg"><label>Diagnostic principal <span style="color:#B71C1C">*</span></label>
        <input type="text" name="diagnostic_principal" placeholder="Ex : Gastro-ent&#xe9;rite aigu&#xeb;" required></div>
      <div class="fg"><label>Conduite &#xe0; tenir <span style="color:#B71C1C">*</span></label>
        <textarea name="conduite_a_tenir" placeholder="Traitement prescrit, examens demand&#xe9;s, conseils..." required></textarea></div>
      <div class="fg"><label>Conclusion</label><textarea name="conclusion" placeholder="Synth&#xe8;se clinique..."></textarea></div>
      <div class="fg"><label>Notes confidentielles <small style="font-weight:400;color:var(--tx3)">(jamais visibles par le patient)</small></label>
        <textarea name="notes_confidentielles" rows="2" placeholder="Notes priv&#xe9;es..."></textarea></div>
      <div class="sep"></div>
      <div class="st">&#x1F321;&#xFE0F; Constantes vitales <small style="font-size:11px;font-weight:400;text-transform:none">(optionnel)</small></div>
      <div id="cAlert" class="c-alert"></div>
      <div class="fg3">
        <div class="fg"><label>Tension syst. (mmHg)</label><input type="number" name="tension_sys" id="cs" placeholder="120" oninput="chkC()"></div>
        <div class="fg"><label>Tension diast. (mmHg)</label><input type="number" name="tension_dia" id="cd" placeholder="80" oninput="chkC()"></div>
        <div class="fg"><label>Temp. (&#xb0;C)</label><input type="number" name="temperature" id="ct" placeholder="37.0" step="0.1" oninput="chkC()"></div>
        <div class="fg"><label>Pouls (bpm)</label><input type="number" name="pouls" placeholder="72"></div>
        <div class="fg"><label>SpO2 (%)</label><input type="number" name="spo2" id="co" placeholder="98" oninput="chkC()"></div>
        <div class="fg"><label>Poids (kg)</label><input type="number" name="poids" placeholder="70" step="0.1"></div>
        <div class="fg"><label>Taille (cm)</label><input type="number" name="taille" placeholder="170"></div>
        <div class="fg"><label>Glyc&#xe9;mie (g/L)</label><input type="number" name="glycemie" id="cg" placeholder="0.95" step="0.01" oninput="chkC()"></div>
      </div>
      <div class="sep"></div>
      <div class="st">&#x1F4C5; RDV de suivi <small style="font-size:11px;font-weight:400;text-transform:none">(optionnel)</small></div>
      <div class="fg2">
        <div class="fg"><label>Date</label><input type="date" name="rdv_date"></div>
        <div class="fg"><label>Heure</label><input type="time" name="rdv_heure"></div>
        <div class="fg" style="grid-column:1/-1"><label>Motif RDV</label><input type="text" name="rdv_motif" placeholder="Ex : Contr&#xf4;le r&#xe9;sultats"></div>
      </div>
      <div class="fa">
        <a href="/medecin/patients${pid?'/'+pid:''}" class="btn-g">Annuler</a>
        <button type="submit" class="btn">&#x2705; Enregistrer</button>
      </div>
    </form>
  </div>
</div>
<script>
function chkC(){
  var s=parseFloat(document.getElementById('cs').value)||0;
  var d=parseFloat(document.getElementById('cd').value)||0;
  var t=parseFloat(document.getElementById('ct').value)||0;
  var o=parseFloat(document.getElementById('co').value)||0;
  var g=parseFloat(document.getElementById('cg').value)||0;
  var m=[];
  if(s>=160)m.push('\u26a0 Tension syst. '+s+' mmHg \u2014 CRITIQUE');
  else if(s>=140)m.push('\u26a0 Tension '+s+' mmHg \u2014 \u00e9lev\u00e9e');
  if(t>=39)m.push('\u26a0 Temp '+t+'\u00b0C \u2014 fi\u00e8vre');
  if(o>0&&o<94)m.push('\ud83d\udea8 SpO2 '+o+'% \u2014 hypox\u00e9mie');
  if(g>=2.0)m.push('\u26a0 Glyc\u00e9mie '+g+' g/L \u2014 hyperglyc\u00e9mie');
  var el=document.getElementById('cAlert');
  if(m.length){el.innerHTML=m.join('<br>');el.classList.add('show');}
  else{el.innerHTML='';el.classList.remove('show');}
}
</script>
` + closePage()
}

// ─── Ordonnance ───────────────────────────────────────────
// JS SANS BACKTICKS — bouton "Ajouter médicament" fonctionne

function ordPage(profil: AuthProfile, patient: any): string {
  const pid = patient?.id ?? ''
  return pageHead('Nouvelle ordonnance') + header(profil) + `
<div class="wrap">
  <div class="bread"><a href="/dashboard/medecin">Accueil</a> &#x2192; <a href="/medecin/patients${pid?'/'+pid:''}">Patient</a> &#x2192; Ordonnance</div>
  <div class="pg-t">Nouvelle ordonnance</div>
  <div style="background:#E3F2FD;border-left:4px solid var(--bl);padding:11px 15px;border-radius:8px;font-size:13px;color:var(--bl);margin-bottom:16px">
    &#x1F4E7; Un email sera envoy&#xe9; automatiquement au patient avec le QR code de v&#xe9;rification.
  </div>
  <div class="card cb">
    <form method="POST" action="/medecin/ordonnances/nouvelle" id="ordF" onsubmit="return buildOrd()">
      ${searchPatientWidget(patient)}
      <input type="hidden" name="medicaments" id="medsJson" value="[]">
      <div class="fg"><label>Diagnostic / Indications</label>
        <textarea name="diagnostic" placeholder="Ex : Infection respiratoire haute, fi&#xe8;vre 38.5&#xb0;C" rows="2"></textarea></div>
      <div class="sep"></div>
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;color:var(--tx2);letter-spacing:.6px;margin-bottom:12px">&#x1F48A; M&#xe9;dicaments <span style="color:#B71C1C">*</span></div>
      <div id="lignes"></div>
      <button type="button" class="btn-add-med" id="btnAddMed">&#x2795; Ajouter un m&#xe9;dicament</button>
      <div class="sep"></div>
      <div class="fg"><label>Conseils au patient</label>
        <textarea name="conseils" placeholder="Bien s'hydrater, repos, consulter si aggravation..." rows="2"></textarea></div>
      <div class="fa">
        <a href="/medecin/patients${pid?'/'+pid:''}" class="btn-g">Annuler</a>
        <button type="submit" class="btn">&#x2705; Cr&#xe9;er l&#x27;ordonnance</button>
      </div>
    </form>
  </div>
</div>
<script>
var ordCnt=0;

// Attacher le bouton APRÈS chargement DOM
document.addEventListener('DOMContentLoaded', function(){
  var btn = document.getElementById('btnAddMed');
  if(btn){ btn.addEventListener('click', addMed); }
  addMed(); // 1 médicament par défaut
});

function addMed(){
  ordCnt++;
  var n=ordCnt;
  var wrap=document.getElementById('lignes');
  if(!wrap)return;
  var div=document.createElement('div');
  div.className='med-bloc';
  div.id='med'+n;

  // Titre + bouton supprimer
  var head=document.createElement('div');
  head.className='med-head';
  var titre=document.createElement('div');
  titre.style.cssText='display:flex;align-items:center;gap:8px';
  var num=document.createElement('div');
  num.className='med-num';
  num.textContent=String(n);
  var lbl=document.createElement('span');
  lbl.style.cssText='font-size:13px;font-weight:600;color:var(--v)';
  lbl.textContent='M\u00e9dicament\u00a0'+n;
  titre.appendChild(num);titre.appendChild(lbl);
  var del=document.createElement('button');
  del.type='button';del.className='btn-del';del.textContent='\uD83D\uDDD1\uFE0F Supprimer';
  (function(id){del.addEventListener('click',function(){var el=document.getElementById('med'+id);if(el)el.remove();});})(n);
  head.appendChild(titre);head.appendChild(del);
  div.appendChild(head);

  // Grille 4 colonnes
  var g4=document.createElement('div');g4.className='med-g4';
  var fields=[
    {cls:'mn',lbl:'Nom du m\u00e9dicament *',type:'text',ph:'Amoxicilline 500mg'},
    {cls:'md',lbl:'Dosage',type:'text',ph:'500mg'},
    {cls:'mf',lbl:'Fr\u00e9quence',type:'text',ph:'3\u00d7/jour'},
    {cls:'mdu',lbl:'Dur\u00e9e',type:'text',ph:'7 jours'}
  ];
  fields.forEach(function(f){
    var fg=document.createElement('div');fg.className='fg';
    var l=document.createElement('label');l.style.cssText='font-size:12px;font-weight:600;display:block;margin-bottom:5px';l.textContent=f.lbl;
    var inp=document.createElement('input');inp.type=f.type;inp.className=f.cls;inp.placeholder=f.ph;
    fg.appendChild(l);fg.appendChild(inp);g4.appendChild(fg);
  });
  div.appendChild(g4);

  // Grille 2 colonnes
  var g2=document.createElement('div');g2.className='med-g2';
  // Forme
  var fgF=document.createElement('div');fgF.className='fg';
  var lF=document.createElement('label');lF.style.cssText='font-size:12px;font-weight:600;display:block;margin-bottom:5px';lF.textContent='Forme';
  var sel=document.createElement('select');sel.className='mfm';
  sel.style.cssText='width:100%;padding:9px 11px;border:1.5px solid var(--brd);border-radius:8px;background:var(--bg);color:var(--tx);font-family:inherit;outline:none';
  var opts=['comprim\u00e9','g\u00e9lule','sirop','injection','pommade','gouttes','suppositoire','inhalateur'];
  opts.forEach(function(o){var op=document.createElement('option');op.value=o;op.textContent=o.charAt(0).toUpperCase()+o.slice(1);sel.appendChild(op);});
  fgF.appendChild(lF);fgF.appendChild(sel);
  // Quantité
  var fgQ=document.createElement('div');fgQ.className='fg';
  var lQ=document.createElement('label');lQ.style.cssText='font-size:12px;font-weight:600;display:block;margin-bottom:5px';lQ.textContent='Quantit\u00e9';
  var inpQ=document.createElement('input');inpQ.type='number';inpQ.className='mq';inpQ.value='1';inpQ.min='1';inpQ.max='99';
  fgQ.appendChild(lQ);fgQ.appendChild(inpQ);
  g2.appendChild(fgF);g2.appendChild(fgQ);
  div.appendChild(g2);

  // Instructions
  var fgI=document.createElement('div');fgI.className='fg';fgI.style.marginTop='8px';
  var lI=document.createElement('label');lI.style.cssText='font-size:12px;font-weight:600;display:block;margin-bottom:5px';lI.textContent='Instructions sp\u00e9cifiques';
  var inpI=document.createElement('input');inpI.type='text';inpI.className='mi';inpI.placeholder='Ex : Prendre pendant le repas';
  fgI.appendChild(lI);fgI.appendChild(inpI);
  div.appendChild(fgI);

  wrap.appendChild(div);
}

function buildOrd(){
  var blocs=document.querySelectorAll('.med-bloc');
  var meds=[];
  for(var i=0;i<blocs.length;i++){
    var nom=blocs[i].querySelector('.mn');
    if(!nom||!nom.value.trim())continue;
    meds.push({
      nom:nom.value.trim(),
      dosage:blocs[i].querySelector('.md').value.trim(),
      frequence:blocs[i].querySelector('.mf').value.trim(),
      duree:blocs[i].querySelector('.mdu').value.trim(),
      forme:blocs[i].querySelector('.mfm').value,
      qte:blocs[i].querySelector('.mq').value||'1',
      instructions:blocs[i].querySelector('.mi').value.trim()||null
    });
  }
  if(meds.length===0){alert('\u26a0\ufe0f Ajoutez au moins un m\u00e9dicament.');return false;}
  document.getElementById('medsJson').value=JSON.stringify(meds);
  return true;
}
</script>
` + closePage()
}

// ─── Examen ───────────────────────────────────────────────

function examPage(profil: AuthProfile, patient: any): string {
  const pid = patient?.id ?? ''
  return pageHead('Prescrire examen') + header(profil) + `
<div class="wrap">
  <div class="bread"><a href="/dashboard/medecin">Accueil</a> &#x2192; Examen</div>
  <div class="pg-t">Prescrire un examen</div>
  <div class="card cb">
    <form method="POST" action="/medecin/examens/nouveau">
      ${searchPatientWidget(patient)}
      <div class="fg2">
        <div class="fg"><label>Type <span style="color:#B71C1C">*</span></label>
          <select name="type_examen" required>
            <option value="biologie">Biologie / Laboratoire</option>
            <option value="radiologie">Radiologie</option>
            <option value="echographie">&#xc9;chographie</option>
            <option value="ecg">ECG / Cardiologie</option>
            <option value="endoscopie">Endoscopie</option>
            <option value="anatomopathologie">Anatomopathologie</option>
            <option value="autre">Autre</option>
          </select></div>
        <div class="fg"><label>Nom de l&#x27;examen <span style="color:#B71C1C">*</span></label>
          <input type="text" name="nom_examen" placeholder="Ex : NFS, Radio thorax, &#xc9;cho abdo" required></div>
        <div class="fg" style="grid-column:1/-1"><label>Motif / Indication clinique</label>
          <input type="text" name="motif" placeholder="Ex : Suspicion pneumonie, bilan diab&#xe8;te"></div>
        <div class="fg"><label>Urgence</label>
          <select name="est_urgent">
            <option value="false">Non urgent</option>
            <option value="true">URGENT &#x2014; r&#xe9;sultat requis rapidement</option>
          </select></div>
      </div>
      <div class="fa">
        <a href="/medecin/patients${pid?'/'+pid:''}" class="btn-g">Annuler</a>
        <button type="submit" class="btn">Prescrire &#x2192;</button>
      </div>
    </form>
  </div>
</div>` + closePage()
}

// ─── RDV formulaire ───────────────────────────────────────

function rdvPage(profil: AuthProfile, patient: any): string {
  const pid = patient?.id ?? ''
  return pageHead('Nouveau RDV') + header(profil) + `
<div class="wrap">
  <div class="bread"><a href="/dashboard/medecin">Accueil</a> &#x2192; <a href="/medecin/rdv">Planning</a> &#x2192; Nouveau RDV</div>
  <div class="pg-t">Nouveau rendez-vous</div>
  <div class="card cb">
    <form method="POST" action="/medecin/rdv/nouveau">
      ${searchPatientWidget(patient)}
      <div class="fg2">
        <div class="fg"><label>Date <span style="color:#B71C1C">*</span></label>
          <input type="date" name="rdv_date" required></div>
        <div class="fg"><label>Heure <span style="color:#B71C1C">*</span></label>
          <input type="time" name="rdv_heure" required></div>
        <div class="fg"><label>Dur&#xe9;e</label>
          <select name="duree">
            <option value="15">15 min</option><option value="30" selected>30 min</option>
            <option value="45">45 min</option><option value="60">1 heure</option>
          </select></div>
        <div class="fg"><label>Motif</label>
          <input type="text" name="motif" placeholder="Ex : Suivi tension art&#xe9;rielle"></div>
      </div>
      <div class="fa">
        <a href="/medecin/rdv" class="btn-g">Annuler</a>
        <button type="submit" class="btn">Enregistrer &#x2192;</button>
      </div>
    </form>
  </div>
</div>` + closePage()
}

// ─── Certificat ───────────────────────────────────────────

function certifPage(profil: AuthProfile, patient: any): string {
  const pid = patient?.id ?? ''
  return pageHead('Certificat m&#xe9;dical') + header(profil) + `
<div class="wrap">
  <div class="bread"><a href="/dashboard/medecin">Accueil</a> &#x2192; Certificat m&#xe9;dical</div>
  <div class="pg-t">G&#xe9;n&#xe9;rer un certificat m&#xe9;dical</div>
  <div class="card cb">
    <form method="POST" action="/medecin/certificat/nouveau">
      ${searchPatientWidget(patient)}
      <div class="fg2">
        <div class="fg"><label>Type de certificat <span style="color:#B71C1C">*</span></label>
          <select name="type_certif" required>
            <option value="aptitude">Certificat d&#x27;aptitude</option>
            <option value="inaptitude">Certificat d&#x27;inaptitude</option>
            <option value="arret_travail">Arr&#xea;t de travail</option>
            <option value="hospitalisation">Certificat d&#x27;hospitalisation</option>
            <option value="vaccination">Certificat de vaccination</option>
            <option value="deces">Certificat de d&#xe9;c&#xe8;s</option>
            <option value="autre">Autre</option>
          </select></div>
        <div class="fg"><label>Date d&#x27;&#xe9;mission</label>
          <input type="date" name="date_emission" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="fg" style="grid-column:1/-1"><label>Contenu du certificat <span style="color:#B71C1C">*</span></label>
          <textarea name="contenu" rows="6" required placeholder="Je soussign&#xe9; Dr. ... certifie avoir examin&#xe9; M./Mme ..."></textarea></div>
        <div class="fg"><label>Dur&#xe9;e (si arr&#xea;t de travail)</label>
          <input type="text" name="duree" placeholder="Ex : 3 jours, du 17/03 au 20/03/2026"></div>
      </div>
      <div class="fa">
        <a href="/medecin/patients${pid?'/'+pid:''}" class="btn-g">Annuler</a>
        <button type="submit" class="btn">G&#xe9;n&#xe9;rer &#x2192;</button>
      </div>
    </form>
  </div>
</div>` + closePage()
}
