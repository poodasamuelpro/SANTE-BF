/**
 * src/routes/pharmacien.ts
 * SantéBF — Routes Pharmacien
 * Monté sur /pharmacien dans functions/[[path]].ts
 *
 * CORRECTIONS vs version originale :
 *  1. statut 'partiellement_delivree' correctement mis à jour
 *  2. Double requête ordonnance_id → requête unique
 *  3. Redirections → 303 explicite
 *  4. Import Bindings depuis supabase.ts (pas type local)
 *  5. getSupabase retiré (non utilisé)
 *
 * AJOUTS :
 *  6. GET /historique   → ordonnances délivrées
 *  7. GET /stats        → stats du jour (nb, médicaments fréquents)
 *  8. GET /partielles   → ordonnances partiellement délivrées
 *  9. Dashboard complet avec sidebar
 *
 * Connexions :
 *  medical_ordonnances         → statut: active → partiellement_delivree → delivree
 *  medical_ordonnance_lignes   → est_delivre, delivre_at, pharmacie_id, delivre_par
 *  patient_dossiers            → allergies (alerte automatique)
 *  dashboard médecin           → statut ordonnance visible
 *  dashboard patient           → /patient/ordonnances mis à jour
 *  dashboard admin structure   → compteur ordonnances du jour
 */
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'

export const pharmacienRoutes = new Hono<{ Bindings: Bindings }>()
pharmacienRoutes.use('/*', requireAuth, requireRole('pharmacien'))

// ── CSS + layout ──────────────────────────────────────────────
const OR_PH = '#E65100'   // Orange pharmacien

const CSS = `
:root{
  --ph:#E65100;--ph-f:#BF360C;--ph-c:#FFF3E0;
  --vert:#1A6B3C;--vert-c:#E8F5EE;
  --rouge:#B71C1C;--rouge-c:#FFF5F5;
  --bleu:#1565C0;--bleu-c:#E3F2FD;
  --texte:#0f1923;--soft:#5a6a78;
  --bg:#FFF8F2;--blanc:#fff;--bordure:#FCE4D6;
  --r:14px;--rs:10px;--sh:0 2px 10px rgba(0,0,0,.06);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);}
a{color:inherit;text-decoration:none;}
.topbar{background:linear-gradient(135deg,var(--ph-f),var(--ph));height:54px;
  display:flex;align-items:center;justify-content:space-between;padding:0 20px;
  position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(230,81,0,.3);}
.tb-brand{display:flex;align-items:center;gap:10px;}
.tb-ico{font-size:20px;}
.tb-name{font-family:'Fraunces',serif;font-size:17px;color:white;}
.tb-sub{font-size:10px;color:rgba(255,255,255,.5);letter-spacing:1px;text-transform:uppercase;}
.tb-right{display:flex;align-items:center;gap:10px;}
.tb-user strong{display:block;font-size:13px;font-weight:700;color:white;text-align:right;}
.tb-user small{font-size:11px;color:rgba(255,255,255,.5);}
.tb-btn{background:rgba(255,255,255,.15);color:white;padding:7px 14px;
  border-radius:8px;font-size:12px;font-weight:600;white-space:nowrap;}
.tb-btn:hover{background:rgba(255,255,255,.25);}
.wrap{max-width:1000px;margin:0 auto;padding:22px 16px;}
.page-hd{display:flex;align-items:center;justify-content:space-between;
  margin-bottom:20px;flex-wrap:wrap;gap:10px;}
.page-title{font-family:'Fraunces',serif;font-size:22px;}
.back{display:inline-flex;align-items:center;gap:7px;background:var(--blanc);
  border:1px solid var(--bordure);color:var(--texte);padding:8px 14px;
  border-radius:var(--rs);font-size:13px;font-weight:700;}
.back:hover{background:var(--ph-c);color:var(--ph);}
.card{background:var(--blanc);border-radius:var(--r);padding:20px 22px;
  box-shadow:var(--sh);border:1px solid var(--bordure);margin-bottom:14px;}
.badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;}
.b-vert{background:var(--vert-c);color:var(--vert);}
.b-or{background:var(--ph-c);color:var(--ph);}
.b-rouge{background:var(--rouge-c);color:var(--rouge);}
.b-gris{background:#f0f0f0;color:#666;}
.b-bleu{background:var(--bleu-c);color:var(--bleu);}
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:var(--rs);
  font-size:13px;font-weight:700;border:none;cursor:pointer;font-family:inherit;}
.btn-ph{background:var(--ph);color:white;}
.btn-ph:hover{background:var(--ph-f);}
.btn-vert{background:var(--vert);color:white;}
.btn-soft{background:var(--bg);color:var(--texte);border:1px solid var(--bordure);}
.info-box{background:var(--bleu-c);border-left:4px solid var(--bleu);border-radius:var(--rs);
  padding:12px 15px;margin-bottom:14px;font-size:13px;color:#1a3a6b;}
.warn-box{background:var(--rouge-c);border-left:4px solid var(--rouge);border-radius:var(--rs);
  padding:12px 15px;margin-bottom:14px;font-size:13px;color:#7f1d1d;}
.ok-box{background:var(--vert-c);border-left:4px solid var(--vert);border-radius:var(--rs);
  padding:12px 15px;margin-bottom:14px;font-size:13px;color:var(--vert);font-weight:700;}
.err-box{background:var(--rouge-c);border-left:4px solid var(--rouge);border-radius:var(--rs);
  padding:12px 15px;margin-bottom:14px;font-size:13px;color:var(--rouge);}
table{width:100%;border-collapse:collapse;}
thead tr{background:var(--ph-c);}
thead th{padding:10px 14px;text-align:left;font-size:11.5px;font-weight:700;
  color:var(--ph);text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid var(--bordure);}
tbody tr{border-bottom:1px solid var(--bordure);}
tbody tr:hover{background:#fff8f5;}
tbody td{padding:10px 14px;font-size:14px;}
.empty{text-align:center;padding:32px;color:var(--soft);font-style:italic;font-size:13px;}
input,select{width:100%;padding:10px 14px;border:1.5px solid var(--bordure);
  border-radius:var(--rs);font-size:14px;font-family:inherit;outline:none;background:#fffaf7;}
input:focus,select:focus{border-color:var(--ph);background:white;}
@media(max-width:640px){.wrap{padding:14px 12px;}}
`

function topbar(profil: AuthProfile, titre: string): string {
  const ini = `${(profil.prenom||'?').charAt(0)}${(profil.nom||'?').charAt(0)}`
  return `<div class="topbar">
  <div class="tb-brand">
    <span class="tb-ico">💊</span>
    <div><div class="tb-name">SantéBF</div><div class="tb-sub">Pharmacie · ${titre}</div></div>
  </div>
  <div class="tb-right">
    <div class="tb-user">
      <strong>${profil.prenom} ${profil.nom}</strong>
      <small>Pharmacien(ne)</small>
    </div>
    <div style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.2);
      display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;">${ini}</div>
    <a href="/dashboard/pharmacien" class="tb-btn">⊞ Dashboard</a>
    <a href="/auth/logout" class="tb-btn">⏻</a>
  </div>
</div>`
}

function page(titre: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titre} — SantéBF Pharmacie</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>${body}</body>
</html>`
}

function statutBadge(s: string): string {
  const m: Record<string,string> = {
    active: 'b-vert', delivree: 'b-bleu',
    partiellement_delivree: 'b-or', expiree: 'b-gris', annulee: 'b-rouge',
  }
  return `<span class="badge ${m[s]||'b-gris'}">${s.replace(/_/g,' ')}</span>`
}

// ═══════════════════════════════════════════════════════════════
// SCANNER QR
// ═══════════════════════════════════════════════════════════════
pharmacienRoutes.get('/scanner', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile

  const html = `
${topbar(profil, 'Scanner QR')}
<div class="wrap">
  <div class="page-hd">
    <div class="page-title">📷 Scanner une ordonnance</div>
    <a href="/pharmacien/ordonnances" class="back">← Liste</a>
  </div>
  <div class="info-box">
    Scannez le QR code sur l'ordonnance du patient avec la caméra, ou entrez le numéro manuellement.
  </div>
  <div class="card" style="text-align:center;">
    <video id="preview" style="width:100%;max-width:400px;border-radius:12px;background:#000;display:block;margin:0 auto 14px;" autoplay muted playsinline></video>
    <div id="scanStatus" style="font-size:13px;color:var(--soft);margin-bottom:14px;">Cliquez sur "Activer la caméra" pour commencer</div>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
      <button onclick="demarrerCamera()" class="btn btn-ph">📷 Activer caméra</button>
      <button onclick="arreterCamera()" class="btn btn-soft">⏹ Arrêter</button>
    </div>
  </div>
  <div style="text-align:center;margin:14px 0;font-size:13px;color:var(--soft);">— ou entrez manuellement —</div>
  <div class="card">
    <form action="/pharmacien/ordonnances" method="GET" style="display:flex;gap:10px;">
      <input type="text" name="qr" placeholder="N° ordonnance ORD-XXXX-XXXXXX ou token QR…" style="flex:1;" autofocus>
      <button type="submit" class="btn btn-ph">Vérifier →</button>
    </form>
  </div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js"></script>
<script>
var stream=null,scanning=false;
async function demarrerCamera(){
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    document.getElementById('preview').srcObject=stream;
    document.getElementById('scanStatus').textContent='Pointez vers le QR code de l\'ordonnance…';
    scanning=true;scannerFrame();
  }catch(e){document.getElementById('scanStatus').textContent='Erreur : '+e.message;}
}
function arreterCamera(){
  scanning=false;
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
  document.getElementById('scanStatus').textContent='Caméra arrêtée';
}
function scannerFrame(){
  if(!scanning)return;
  var v=document.getElementById('preview');
  if(v.readyState===v.HAVE_ENOUGH_DATA){
    var c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext('2d').drawImage(v,0,0);
    var img=c.getContext('2d').getImageData(0,0,c.width,c.height);
    var code=jsQR(img.data,img.width,img.height);
    if(code){
      arreterCamera();
      var token=code.data.split('/').pop();
      window.location.href='/pharmacien/ordonnances/'+token;return;
    }
  }
  requestAnimationFrame(scannerFrame);
}
</script>`

  return c.html(page('Scanner QR', html))
})

// ═══════════════════════════════════════════════════════════════
// LISTE ORDONNANCES ACTIVES
// ═══════════════════════════════════════════════════════════════
pharmacienRoutes.get('/ordonnances', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const qr       = c.req.query('qr')?.trim() || ''

  // Si QR/numéro fourni → rediriger directement
  if (qr.length > 3) {
    const { data: ord } = await supabase
      .from('medical_ordonnances')
      .select('qr_code_verification')
      .or(`qr_code_verification.eq.${qr},numero_ordonnance.ilike.${qr}`)
      .single()
    if (ord) return c.redirect(`/pharmacien/ordonnances/${ord.qr_code_verification}`, 303)
  }

  const { data: ordonnances } = await supabase
    .from('medical_ordonnances')
    .select(`
      id, numero_ordonnance, statut, created_at, date_expiration, qr_code_verification,
      patient_dossiers(nom, prenom, numero_national),
      auth_medecins!medical_ordonnances_medecin_id_fkey(auth_profiles(nom, prenom))
    `)
    .eq('structure_id', profil.structure_id)
    .in('statut', ['active', 'partiellement_delivree'])
    .order('created_at', { ascending: false })
    .limit(50)

  const now = new Date()
  const rows = (ordonnances ?? []).map((o: any) => {
    const p      = o.patient_dossiers as any
    const med    = o.auth_medecins?.auth_profiles
    const expDate = new Date(o.date_expiration)
    const expire  = expDate < now
    const expStr  = expDate.toLocaleDateString('fr-FR')
    return `<tr>
      <td><code style="background:var(--ph-c);color:var(--ph);padding:2px 8px;border-radius:4px;font-size:12px;">${o.numero_ordonnance}</code></td>
      <td><div style="font-weight:700;">${p?.prenom||''} ${p?.nom||''}</div>
          <div style="font-size:11px;font-family:monospace;color:var(--soft);">${p?.numero_national||''}</div></td>
      <td>Dr. ${med?.prenom||''} ${med?.nom||''}</td>
      <td>${new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
      <td style="color:${expire?'var(--rouge)':'var(--vert)'};">${expStr}${expire?' ⚠️':''}</td>
      <td>${statutBadge(o.statut)}</td>
      <td><a href="/pharmacien/ordonnances/${o.qr_code_verification}" class="btn btn-ph" style="font-size:12px;padding:6px 12px;">💊 Délivrer</a></td>
    </tr>`
  }).join('')

  const html = `
${topbar(profil, 'Ordonnances')}
<div class="wrap">
  <div class="page-hd">
    <div class="page-title">📋 Ordonnances actives (${(ordonnances??[]).length})</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <a href="/pharmacien/scanner" class="btn btn-ph">📷 Scanner QR</a>
      <a href="/pharmacien/partielles" class="btn btn-soft">⏳ Partielles</a>
      <a href="/pharmacien/historique" class="btn btn-soft">📚 Historique</a>
    </div>
  </div>
  <div class="card" style="padding:12px 16px;margin-bottom:14px;">
    <form method="GET" action="/pharmacien/ordonnances" style="display:flex;gap:10px;">
      <input type="text" name="qr" value="${qr}" placeholder="Numéro ORD-XXXX ou code QR…" style="flex:1;">
      <button type="submit" class="btn btn-ph">Rechercher</button>
    </form>
  </div>
  <div class="card">
    ${rows ? `<table>
      <thead><tr><th>Numéro</th><th>Patient</th><th>Médecin</th><th>Date</th><th>Expire</th><th>Statut</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>` : '<div class="empty">Aucune ordonnance active dans cette structure</div>'}
  </div>
</div>`

  return c.html(page('Ordonnances', html))
})

// ═══════════════════════════════════════════════════════════════
// ORDONNANCES PARTIELLEMENT DÉLIVRÉES
// ═══════════════════════════════════════════════════════════════
pharmacienRoutes.get('/partielles', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: ordonnances } = await supabase
    .from('medical_ordonnances')
    .select(`
      id, numero_ordonnance, statut, created_at, date_expiration, qr_code_verification,
      patient_dossiers(nom, prenom),
      auth_medecins!medical_ordonnances_medecin_id_fkey(auth_profiles(nom, prenom))
    `)
    .eq('structure_id', profil.structure_id)
    .eq('statut', 'partiellement_delivree')
    .order('created_at', { ascending: false })
    .limit(30)

  const rows = (ordonnances ?? []).map((o: any) => {
    const p   = o.patient_dossiers as any
    const med = o.auth_medecins?.auth_profiles
    return `<tr>
      <td><code style="background:var(--ph-c);color:var(--ph);padding:2px 8px;border-radius:4px;font-size:12px;">${o.numero_ordonnance}</code></td>
      <td>${p?.prenom||''} ${p?.nom||''}</td>
      <td>Dr. ${med?.prenom||''} ${med?.nom||''}</td>
      <td>${new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
      <td><a href="/pharmacien/ordonnances/${o.qr_code_verification}" class="btn btn-ph" style="font-size:12px;padding:6px 12px;">Compléter</a></td>
    </tr>`
  }).join('')

  const html = `
${topbar(profil, 'Partiellement délivrées')}
<div class="wrap">
  <div class="page-hd">
    <div class="page-title">⏳ Ordonnances partielles (${(ordonnances??[]).length})</div>
    <a href="/pharmacien/ordonnances" class="back">← Retour</a>
  </div>
  <div class="info-box">Ces ordonnances ont été partiellement délivrées. Des médicaments restent à remettre au patient.</div>
  <div class="card">
    ${rows ? `<table>
      <thead><tr><th>Numéro</th><th>Patient</th><th>Médecin</th><th>Date</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>` : '<div class="empty">Aucune ordonnance partiellement délivrée</div>'}
  </div>
</div>`

  return c.html(page('Partielles', html))
})

// ═══════════════════════════════════════════════════════════════
// HISTORIQUE ORDONNANCES DÉLIVRÉES
// ═══════════════════════════════════════════════════════════════
pharmacienRoutes.get('/historique', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const today    = new Date().toISOString().split('T')[0]

  const { data: ordonnances } = await supabase
    .from('medical_ordonnances')
    .select(`
      id, numero_ordonnance, statut, created_at,
      patient_dossiers(nom, prenom),
      auth_medecins!medical_ordonnances_medecin_id_fkey(auth_profiles(nom, prenom))
    `)
    .eq('structure_id', profil.structure_id)
    .eq('statut', 'delivree')
    .gte('created_at', today + 'T00:00:00')
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = (ordonnances ?? []).map((o: any) => {
    const p   = o.patient_dossiers as any
    const med = o.auth_medecins?.auth_profiles
    const hr  = new Date(o.created_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
    return `<tr>
      <td><code style="font-size:12px;background:var(--vert-c);color:var(--vert);padding:2px 8px;border-radius:4px;">${o.numero_ordonnance}</code></td>
      <td>${p?.prenom||''} ${p?.nom||''}</td>
      <td>Dr. ${med?.prenom||''} ${med?.nom||''}</td>
      <td>${hr}</td>
      <td><span class="badge b-vert">✓ Délivrée</span></td>
    </tr>`
  }).join('')

  const html = `
${topbar(profil, 'Historique')}
<div class="wrap">
  <div class="page-hd">
    <div class="page-title">📚 Historique du jour (${(ordonnances??[]).length})</div>
    <a href="/pharmacien/ordonnances" class="back">← Retour</a>
  </div>
  <div class="card">
    ${rows ? `<table>
      <thead><tr><th>Numéro</th><th>Patient</th><th>Médecin</th><th>Heure délivrance</th><th>Statut</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>` : '<div class="empty">Aucune ordonnance délivrée aujourd\'hui</div>'}
  </div>
</div>`

  return c.html(page('Historique', html))
})

// ═══════════════════════════════════════════════════════════════
// STATS DU JOUR
// ═══════════════════════════════════════════════════════════════
pharmacienRoutes.get('/stats', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const today    = new Date().toISOString().split('T')[0]

  const [delivrees, actives, partielles] = await Promise.all([
    supabase.from('medical_ordonnances').select('*', { count: 'exact', head: true })
      .eq('structure_id', profil.structure_id).eq('statut', 'delivree')
      .gte('created_at', today + 'T00:00:00'),
    supabase.from('medical_ordonnances').select('*', { count: 'exact', head: true })
      .eq('structure_id', profil.structure_id).eq('statut', 'active'),
    supabase.from('medical_ordonnances').select('*', { count: 'exact', head: true })
      .eq('structure_id', profil.structure_id).eq('statut', 'partiellement_delivree'),
  ])

  // Top médicaments délivrés aujourd'hui
  const { data: lignes } = await supabase
    .from('medical_ordonnance_lignes')
    .select('medicament_nom, ordonnance:medical_ordonnances!inner(structure_id, created_at)')
    .eq('ordonnance.structure_id', profil.structure_id)
    .eq('est_delivre', true)
    .gte('delivre_at', today + 'T00:00:00')

  const compteur: Record<string,number> = {}
  ;(lignes ?? []).forEach((l: any) => {
    compteur[l.medicament_nom] = (compteur[l.medicament_nom] || 0) + 1
  })
  const topMeds = Object.entries(compteur)
    .sort((a,b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5)

  const html = `
${topbar(profil, 'Statistiques')}
<div class="wrap">
  <div class="page-title" style="margin-bottom:20px;">📊 Statistiques du jour</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px;">
    ${[
      { ico: '✅', val: delivrees.count||0, lbl: 'Délivrées aujourd\'hui', color: 'var(--vert)' },
      { ico: '📋', val: actives.count||0,   lbl: 'En attente',            color: 'var(--ph)'   },
      { ico: '⏳', val: partielles.count||0,lbl: 'Partielles',            color: 'var(--bleu)' },
    ].map(s => `
      <div class="card" style="text-align:center;padding:20px;">
        <div style="font-size:26px;margin-bottom:8px;">${s.ico}</div>
        <div style="font-family:'Fraunces',serif;font-size:32px;color:${s.color};">${s.val}</div>
        <div style="font-size:12px;color:var(--soft);">${s.lbl}</div>
      </div>`).join('')}
  </div>
  <div class="card">
    <div style="font-size:14px;font-weight:700;margin-bottom:14px;">💊 Top médicaments délivrés aujourd'hui</div>
    ${topMeds.length > 0 ? topMeds.map(([nom, nb]: [string, any]) => `
      <div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--bordure);">
        <span style="font-size:13px;">${nom}</span>
        <span class="badge b-or">${nb} fois</span>
      </div>`).join('') : '<div class="empty">Aucune délivrance aujourd\'hui</div>'}
  </div>
</div>`

  return c.html(page('Statistiques', html))
})

// ═══════════════════════════════════════════════════════════════
// DÉTAIL ORDONNANCE (par QR token)
// ═══════════════════════════════════════════════════════════════
pharmacienRoutes.get('/ordonnances/:qr', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const qr       = c.req.param('qr')
  const succes   = c.req.query('succes') || ''

  const { data: ord } = await supabase
    .from('medical_ordonnances')
    .select(`
      id, numero_ordonnance, statut, created_at, date_expiration, qr_code_verification,
      patient_dossiers(id, nom, prenom, date_naissance, sexe, groupe_sanguin, rhesus, allergies),
      auth_medecins!medical_ordonnances_medecin_id_fkey(auth_profiles(nom, prenom)),
      medical_ordonnance_lignes(id, ordre, medicament_nom, medicament_forme, dosage, frequence, duree, instructions_speciales, est_delivre, delivre_at)
    `)
    .eq('qr_code_verification', qr)
    .single()

  if (!ord) {
    return c.html(page('Ordonnance invalide', `
      ${topbar(profil, 'Erreur')}
      <div class="wrap">
        <div class="err-box">❌ Ordonnance introuvable ou QR code invalide.</div>
        <a href="/pharmacien/scanner" class="btn btn-ph">← Retour au scanner</a>
      </div>`))
  }

  const now        = new Date()
  const estExpire  = new Date(ord.date_expiration) < now
  const patient    = ord.patient_dossiers as any
  const med        = (ord.auth_medecins as any)?.auth_profiles
  const allergies: any[] = Array.isArray(patient?.allergies) ? patient.allergies : []
  const lignes     = [...((ord.medical_ordonnance_lignes as any[]) || [])].sort((a,b) => a.ordre - b.ordre)
  const nbTotal    = lignes.length
  const nbDelivre  = lignes.filter((l: any) => l.est_delivre).length
  const peutDelivrer = !estExpire && ord.statut !== 'annulee' && ord.statut !== 'delivree'
  const calcAge    = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / (1000*60*60*24*365.25))

  const lignesHtml = lignes.map((l: any) => `
    <div style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--bordure);">
      <div style="width:28px;height:28px;background:var(--ph-c);border-radius:50%;
        display:flex;align-items:center;justify-content:center;font-size:13px;
        font-weight:700;color:var(--ph);flex-shrink:0;">${l.ordre}</div>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:700;">${l.medicament_nom}</div>
        <div style="font-size:12px;color:var(--soft);">
          ${[l.medicament_forme, l.dosage, l.frequence, l.duree].filter(Boolean).join(' · ')}
        </div>
        ${l.instructions_speciales ? `<div style="font-size:11px;color:var(--ph);margin-top:2px;">ℹ️ ${l.instructions_speciales}</div>` : ''}
        ${l.est_delivre ? `<div style="font-size:11px;color:var(--vert);margin-top:2px;">✓ Délivré le ${new Date(l.delivre_at).toLocaleDateString('fr-FR')}</div>` : ''}
      </div>
      <div style="flex-shrink:0;">
        ${l.est_delivre
          ? `<span class="badge b-vert">✓ Délivré</span>`
          : peutDelivrer
            ? `<form method="POST" action="/pharmacien/ordonnances/${qr}/ligne/${l.id}">
                <button type="submit" class="btn btn-vert" style="font-size:12px;padding:7px 12px;">Délivrer</button>
               </form>`
            : `<span style="font-size:12px;color:var(--soft);">Non délivré</span>`
        }
      </div>
    </div>`).join('')

  const html = `
${topbar(profil, ord.numero_ordonnance)}
<div class="wrap">
  <div class="page-hd">
    <div class="page-title">${ord.numero_ordonnance}</div>
    <a href="/pharmacien/ordonnances" class="back">← Ordonnances</a>
  </div>

  ${succes === 'ligne' ? '<div class="ok-box">✓ Médicament délivré.</div>' : ''}
  ${succes === 'tout' ? '<div class="ok-box">✓ Tous les médicaments délivrés.</div>' : ''}
  ${estExpire ? `<div class="err-box">⚠️ Ordonnance <strong>expirée</strong> depuis le ${new Date(ord.date_expiration).toLocaleDateString('fr-FR')}. Délivrance impossible.</div>` : ''}
  ${ord.statut === 'annulee' ? '<div class="err-box">⚠️ Ordonnance annulée.</div>' : ''}
  ${allergies.length > 0 ? `<div class="warn-box">⚠️ <strong>Allergies connues :</strong> ${allergies.map((a: any) => a.substance||String(a)).join(', ')}</div>` : ''}

  <!-- En-tête patient -->
  <div class="card" style="background:linear-gradient(135deg,var(--ph-f),var(--ph));border:none;margin-bottom:14px;">
    <div style="color:white;">
      <div style="font-size:11px;opacity:.7;margin-bottom:4px;">${ord.numero_ordonnance}</div>
      <div style="font-family:'Fraunces',serif;font-size:20px;margin-bottom:4px;">${patient?.prenom||''} ${patient?.nom||''}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px;opacity:.85;">
        <span>${patient?.sexe==='M'?'♂ Homme':'♀ Femme'} · ${patient?.date_naissance ? calcAge(patient.date_naissance)+' ans' : '—'}</span>
        ${patient?.groupe_sanguin && patient?.groupe_sanguin !== 'inconnu' ? `<span>🩸 ${patient.groupe_sanguin}${patient.rhesus||''}</span>` : ''}
        <span>Dr. ${med?.prenom||''} ${med?.nom||''}</span>
        <span>Émise ${new Date(ord.created_at).toLocaleDateString('fr-FR')}</span>
        <span>Expire ${new Date(ord.date_expiration).toLocaleDateString('fr-FR')}</span>
      </div>
    </div>
  </div>

  <!-- Progression -->
  <div class="card" style="padding:14px 18px;margin-bottom:14px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-size:13px;font-weight:700;">Médicaments délivrés</span>
      <span style="font-size:14px;font-weight:700;color:${nbDelivre===nbTotal?'var(--vert)':'var(--ph)'};">${nbDelivre} / ${nbTotal}</span>
    </div>
    <div style="background:var(--bordure);border-radius:10px;height:8px;overflow:hidden;">
      <div style="height:100%;border-radius:10px;background:${nbDelivre===nbTotal?'var(--vert)':'var(--ph)'};
        width:${nbTotal>0?Math.round(nbDelivre/nbTotal*100):0}%;transition:width .3s;"></div>
    </div>
  </div>

  <!-- Lignes médicaments -->
  <div class="card">
    ${lignesHtml}
    ${peutDelivrer && nbDelivre < nbTotal ? `
    <div style="padding:14px 0 0;display:flex;justify-content:flex-end;">
      <form method="POST" action="/pharmacien/ordonnances/${qr}/tout-delivrer">
        <button type="submit" class="btn btn-ph">✅ Tout délivrer (${nbTotal - nbDelivre} restant(s))</button>
      </form>
    </div>` : ''}
  </div>
</div>`

  return c.html(page(ord.numero_ordonnance, html))
})

// ═══════════════════════════════════════════════════════════════
// DÉLIVRER UN MÉDICAMENT
// ═══════════════════════════════════════════════════════════════
pharmacienRoutes.post('/ordonnances/:qr/ligne/:ligneId', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const qr       = c.req.param('qr')
  const ligneId  = c.req.param('ligneId')

  // 1. Marquer la ligne comme délivrée
  await supabase.from('medical_ordonnance_lignes').update({
    est_delivre:  true,
    delivre_at:   new Date().toISOString(),
    pharmacie_id: profil.structure_id,
    delivre_par:  profil.id,
  }).eq('id', ligneId)

  // 2. Récupérer l'ordonnance_id depuis la ligne (1 seule requête)
  const { data: ligne } = await supabase
    .from('medical_ordonnance_lignes')
    .select('ordonnance_id')
    .eq('id', ligneId)
    .single()

  if (ligne?.ordonnance_id) {
    // 3. Compter toutes les lignes et celles délivrées
    const { data: toutes } = await supabase
      .from('medical_ordonnance_lignes')
      .select('est_delivre')
      .eq('ordonnance_id', ligne.ordonnance_id)

    const total    = (toutes ?? []).length
    const livrees  = (toutes ?? []).filter((l: any) => l.est_delivre).length

    // 4. Mettre à jour le statut de l'ordonnance
    const nouveauStatut = livrees >= total ? 'delivree' : 'partiellement_delivree'
    await supabase.from('medical_ordonnances')
      .update({ statut: nouveauStatut })
      .eq('id', ligne.ordonnance_id)
  }

  return c.redirect(`/pharmacien/ordonnances/${qr}?succes=ligne`, 303)
})

// ═══════════════════════════════════════════════════════════════
// TOUT DÉLIVRER
// ═══════════════════════════════════════════════════════════════
pharmacienRoutes.post('/ordonnances/:qr/tout-delivrer', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const qr       = c.req.param('qr')

  const { data: ord } = await supabase
    .from('medical_ordonnances')
    .select('id')
    .eq('qr_code_verification', qr)
    .single()

  if (ord) {
    // Délivrer toutes les lignes non encore délivrées
    await supabase.from('medical_ordonnance_lignes').update({
      est_delivre:  true,
      delivre_at:   new Date().toISOString(),
      pharmacie_id: profil.structure_id,
      delivre_par:  profil.id,
    }).eq('ordonnance_id', ord.id).eq('est_delivre', false)

    // Passer le statut ordonnance à 'delivree'
    await supabase.from('medical_ordonnances')
      .update({ statut: 'delivree' })
      .eq('id', ord.id)
  }

  return c.redirect(`/pharmacien/ordonnances/${qr}?succes=tout`, 303)
})
