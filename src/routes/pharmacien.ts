import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import type { AuthProfile } from '../lib/supabase'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
export const pharmacienRoutes = new Hono<{ Bindings: Bindings }>()
pharmacienRoutes.use('/*', requireAuth, requireRole('pharmacien'))

const CSS = `
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;min-height:100vh}
    header{background:#E65100;padding:0 24px;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.15)}
    .hl{display:flex;align-items:center;gap:12px}
    .logo-wrap{display:flex;align-items:center;gap:12px;text-decoration:none}
    .logo{width:34px;height:34px;background:white;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px}
    .ht{font-family:'DM Serif Display',serif;font-size:18px;color:white}
    .ht span{font-family:'DM Sans',sans-serif;font-size:11px;opacity:.7;display:block}
    .hr{display:flex;align-items:center;gap:10px}
    .ub{background:rgba(255,255,255,.15);border-radius:8px;padding:6px 12px}
    .ub strong{display:block;font-size:13px;color:white}
    .ub small{font-size:11px;color:rgba(255,255,255,.7)}
    .logout{background:rgba(255,255,255,.2);color:white;border:none;padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
    .container{max-width:950px;margin:0 auto;padding:28px 20px}
    .page-title{font-family:'DM Serif Display',serif;font-size:26px;color:#1A1A2E;margin-bottom:4px}
    .page-sub{font-size:14px;color:#6B7280;margin-bottom:24px}
    .breadcrumb{font-size:13px;color:#6B7280;margin-bottom:16px}
    .breadcrumb a{color:#E65100;text-decoration:none}
    .alerte-err{background:#FFF5F5;border-left:4px solid #C62828;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#C62828}
    .alerte-ok{background:#E8F5E9;border-left:4px solid #1A6B3C;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#1A6B3C}
    .alerte-warn{background:#FFF3E0;border-left:4px solid #E65100;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#E65100}
    .btn-primary{background:#E65100;color:white;padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;display:inline-block}
    .btn-secondary{background:#F3F4F6;color:#374151;padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;display:inline-block}
    .btn-sm{background:#E65100;color:white;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif}
    .btn-sm.vert{background:#1A6B3C}
    .card{background:white;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;margin-bottom:24px}
    .card-body{padding:24px}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#E65100}
    thead th{padding:12px 16px;text-align:left;font-size:12px;color:white;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    tbody tr{border-bottom:1px solid #F5F5F5;transition:background .15s}
    tbody tr:hover{background:#FFF8F0}
    tbody td{padding:12px 16px;font-size:14px}
    tbody tr:last-child{border-bottom:none}
    .empty{padding:32px;text-align:center;color:#9E9E9E;font-style:italic}
    .badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .badge.active{background:#E8F5E9;color:#1A6B3C}
    .badge.delivree{background:#E3F2FD;color:#1565C0}
    .badge.partiellement_delivree{background:#FFF3E0;color:#E65100}
    .badge.expiree{background:#F5F5F5;color:#9E9E9E}
    .badge.annulee{background:#FFF5F5;color:#B71C1C}
    .search-box{background:white;border-radius:14px;padding:24px;margin-bottom:24px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
    .search-row{display:flex;gap:12px}
    .search-row input{flex:1;padding:12px 16px;border:1.5px solid #E0E0E0;border-radius:10px;font-size:15px;font-family:'DM Sans',sans-serif;outline:none}
    .search-row input:focus{border-color:#E65100}
    .search-row button{background:#E65100;color:white;border:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap}
    .ord-detail{background:white;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden}
    .ord-header{background:#E65100;padding:20px 24px;color:white}
    .ord-num{font-size:11px;opacity:.75;margin-bottom:4px}
    .ord-patient{font-family:'DM Serif Display',serif;font-size:22px}
    .ord-meta{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}
    .ord-tag{background:rgba(255,255,255,.2);padding:4px 12px;border-radius:20px;font-size:12px}
    .ligne-med{padding:16px 24px;border-bottom:1px solid #F5F5F5;display:flex;align-items:center;justify-content:space-between;gap:16px}
    .ligne-med:last-child{border-bottom:none}
    .med-info strong{display:block;font-size:15px;margin-bottom:2px}
    .med-info span{font-size:12px;color:#6B7280}
    .med-delivre{background:#E8F5E9;color:#1A6B3C;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600}
    @media(max-width:640px){.search-row{flex-direction:column}.container{padding:16px 12px}}
  </style>`

function headerHtml(profil: AuthProfile): string {
  return `<header>
    <div class="hl">
      <a href="/dashboard/pharmacien" class="logo-wrap">
        <div class="logo">🏥</div>
        <div class="ht">SantéBF <span>PHARMACIE</span></div>
      </a>
    </div>
    <div class="hr">
      <div class="ub"><strong>${profil.prenom} ${profil.nom}</strong><small>Pharmacien(ne)</small></div>
      <a href="/auth/logout" class="logout">Déconnexion</a>
    </div>
  </header>`
}

// ── GET /pharmacien/scanner ────────────────────────────────
pharmacienRoutes.get('/scanner', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  return c.html(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Scanner QR</title>${CSS}
  <style>
    #preview{width:100%;max-width:400px;border-radius:12px;overflow:hidden;margin:0 auto 16px;display:block;background:#000}
    #result{display:none}
  </style>
  </head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/pharmacien">Accueil</a> → Scanner QR</div>
    <div class="page-title">Scanner une ordonnance</div>
    <div class="page-sub">Scannez le QR code de l'ordonnance du patient avec la caméra, ou entrez le code manuellement.</div>

    <div class="card card-body" style="text-align:center">
      <video id="preview" autoplay muted playsinline></video>
      <p id="scanStatus" style="font-size:13px;color:#6B7280;margin-bottom:16px">Initialisation de la caméra...</p>
      <button onclick="demarrerCamera()" class="btn-secondary" style="margin-right:8px">📷 Activer caméra</button>
      <button onclick="arreterCamera()" class="btn-secondary">⏹ Arrêter</button>
    </div>

    <div style="text-align:center;margin:16px 0;font-size:13px;color:#9E9E9E">— ou entrez manuellement —</div>

    <form action="/pharmacien/ordonnances" method="GET" class="search-box">
      <div class="search-row">
        <input type="text" name="qr" placeholder="Code QR de l'ordonnance ou numéro ORD-XXXX-XXXXXX" autofocus>
        <button type="submit">Vérifier →</button>
      </div>
    </form>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js"></script>
  <script>
    let stream = null
    let scanning = false

    async function demarrerCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        document.getElementById('preview').srcObject = stream
        document.getElementById('scanStatus').textContent = 'Pointez la caméra vers le QR code...'
        scanning = true
        scannerFrame()
      } catch(e) {
        document.getElementById('scanStatus').textContent = 'Erreur caméra : ' + e.message
      }
    }

    function arreterCamera() {
      scanning = false
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
      document.getElementById('scanStatus').textContent = 'Caméra arrêtée'
    }

    function scannerFrame() {
      if (!scanning) return
      const video = document.getElementById('preview')
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)
        const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code) {
          arreterCamera()
          const url = code.data
          const token = url.split('/').pop()
          window.location.href = '/pharmacien/ordonnances/' + token
          return
        }
      }
      requestAnimationFrame(scannerFrame)
    }
  </script>
  </body></html>`)
})

// ── GET /pharmacien/ordonnances ────────────────────────────
pharmacienRoutes.get('/ordonnances', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const qr = c.req.query('qr')?.trim()

  // Si QR fourni → chercher par QR code ou numéro
  if (qr) {
    const { data: ord } = await sb
      .from('medical_ordonnances')
      .select('id, qr_code_verification')
      .or(`qr_code_verification.eq.${qr},numero_ordonnance.eq.${qr}`)
      .single()
    if (ord) return c.redirect(`/pharmacien/ordonnances/${ord.qr_code_verification}`)
  }

  // Liste des ordonnances actives de la structure
  const { data: ordonnances } = await sb
    .from('medical_ordonnances')
    .select(`
      id, numero_ordonnance, statut, created_at, date_expiration,
      patient_dossiers ( nom, prenom, numero_national ),
      auth_profiles ( nom, prenom )
    `)
    .eq('structure_id', profil.structure_id)
    .eq('statut', 'active')
    .order('created_at', { ascending: false })
    .limit(30)

  return c.html(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Ordonnances actives</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/pharmacien">Accueil</a> → Ordonnances</div>
    <div class="page-title">Ordonnances actives</div>
    <div class="search-box">
      <div class="search-row">
        <input type="text" name="qr" form="searchForm" placeholder="Numéro d'ordonnance ou code QR...">
        <button type="submit" form="searchForm">Chercher</button>
      </div>
      <form id="searchForm" action="/pharmacien/ordonnances" method="GET"></form>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Numéro</th><th>Patient</th><th>Médecin</th><th>Date</th><th>Expire le</th><th>Action</th></tr></thead>
        <tbody>
          ${(ordonnances ?? []).length === 0 ? '<tr><td colspan="6" class="empty">Aucune ordonnance active</td></tr>'
            : (ordonnances ?? []).map((o: any) => `
              <tr>
                <td><code style="background:#FFF3E0;padding:2px 8px;border-radius:4px;font-size:12px;color:#E65100">${o.numero_ordonnance}</code></td>
                <td><strong>${o.patient_dossiers?.prenom} ${o.patient_dossiers?.nom}</strong></td>
                <td>Dr. ${o.auth_profiles?.prenom} ${o.auth_profiles?.nom}</td>
                <td>${new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
                <td style="color:${new Date(o.date_expiration) < new Date() ? '#B71C1C' : '#1A6B3C'}">${new Date(o.date_expiration).toLocaleDateString('fr-FR')}</td>
                <td><a href="/pharmacien/ordonnances/${o.qr_code_verification}" class="btn-sm">Délivrer</a></td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div></body></html>`)
})

// ── GET /pharmacien/ordonnances/:qr ────────────────────────
pharmacienRoutes.get('/ordonnances/:qr', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const qr = c.req.param('qr')

  const { data: ord } = await sb
    .from('medical_ordonnances')
    .select(`
      id, numero_ordonnance, statut, created_at, date_expiration, qr_code_verification,
      patient_dossiers ( id, nom, prenom, date_naissance, sexe, groupe_sanguin, rhesus, allergies ),
      auth_profiles ( nom, prenom ),
      medical_ordonnance_lignes ( id, ordre, medicament_nom, medicament_forme, dosage, frequence, duree, instructions_speciales, est_delivre )
    `)
    .eq('qr_code_verification', qr)
    .single()

  if (!ord) {
    return c.html(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Ordonnance invalide</title>${CSS}</head><body>
    ${headerHtml(profil)}
    <div class="container">
      <div class="alerte-err">❌ Ordonnance introuvable ou QR code invalide.</div>
      <a href="/pharmacien/scanner" class="btn-primary">← Retour au scanner</a>
    </div></body></html>`)
  }

  const estExpire = new Date(ord.date_expiration) < new Date()
  const lignes = Array.isArray(ord.medical_ordonnance_lignes)
    ? [...ord.medical_ordonnance_lignes].sort((a: any, b: any) => a.ordre - b.ordre)
    : []
  const patient = ord.patient_dossiers as any
  const allergies = patient && Array.isArray(patient.allergies) ? patient.allergies : []

  return c.html(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — ${ord.numero_ordonnance}</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/pharmacien">Accueil</a> → <a href="/pharmacien/ordonnances">Ordonnances</a> → ${ord.numero_ordonnance}</div>

    ${estExpire ? `<div class="alerte-err">⚠️ Cette ordonnance est <strong>expirée</strong> depuis le ${new Date(ord.date_expiration).toLocaleDateString('fr-FR')}. Vous ne pouvez pas la délivrer.</div>` : ''}
    ${ord.statut === 'annulee' ? `<div class="alerte-err">⚠️ Cette ordonnance est <strong>annulée</strong>.</div>` : ''}
    ${allergies.length > 0 ? `<div class="alerte-warn">⚠️ <strong>Allergies connues :</strong> ${allergies.map((a: any)=>a.substance||a).join(', ')}</div>` : ''}

    <div class="ord-detail">
      <div class="ord-header">
        <div class="ord-num">${ord.numero_ordonnance}</div>
        <div class="ord-patient">${patient?.prenom} ${patient?.nom}</div>
        <div class="ord-meta">
          <span class="ord-tag">Dr. ${(ord.auth_profiles as any)?.prenom} ${(ord.auth_profiles as any)?.nom}</span>
          <span class="ord-tag">${new Date(ord.created_at).toLocaleDateString('fr-FR')}</span>
          <span class="ord-tag" style="background:${estExpire?'rgba(198,40,40,.3)':'rgba(255,255,255,.2)'}">Expire: ${new Date(ord.date_expiration).toLocaleDateString('fr-FR')}</span>
          <span class="ord-tag">${ord.statut}</span>
        </div>
      </div>

      ${lignes.map((l: any) => `
        <div class="ligne-med">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:28px;height:28px;background:#FFF3E0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#E65100;flex-shrink:0">${l.ordre}</div>
            <div class="med-info">
              <strong>${l.medicament_nom}</strong>
              <span>${l.forme || ''} ${l.dosage ? '· '+l.dosage : ''} ${l.frequence ? '· '+l.frequence : ''} ${l.duree ? '· '+l.duree : ''}</span>
              ${l.instructions_speciales ? `<div style="font-size:11px;color:#E65100;margin-top:2px">ℹ️ ${l.instructions_speciales}</div>` : ''}
            </div>
          </div>
          <div style="flex-shrink:0">
            ${l.est_delivre
              ? '<span class="med-delivre">✅ Délivré</span>'
              : !estExpire && ord.statut === 'active'
                ? `<form method="POST" action="/pharmacien/ordonnances/${qr}/ligne/${l.id}">
                    <button type="submit" class="btn-sm vert">Délivrer ce médicament</button>
                   </form>`
                : '<span style="color:#9E9E9E;font-size:12px">Non délivré</span>'
            }
          </div>
        </div>`).join('')}

      ${!estExpire && ord.statut === 'active' && lignes.some((l: any) => !l.est_delivre) ? `
        <div style="padding:16px 24px;border-top:1px solid #F0F0F0;display:flex;gap:12px;justify-content:flex-end">
          <form method="POST" action="/pharmacien/ordonnances/${qr}/tout-delivrer">
            <button type="submit" class="btn-primary">✅ Tout délivrer</button>
          </form>
        </div>` : ''}
    </div>
  </div></body></html>`)
})

// ── POST /pharmacien/ordonnances/:qr/ligne/:id ─────────────
pharmacienRoutes.post('/ordonnances/:qr/ligne/:id', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const qr = c.req.param('qr')
  const ligneId = c.req.param('id')

  await sb.from('medical_ordonnance_lignes').update({
    est_delivre:    true,
    delivre_at:     new Date().toISOString(),
    pharmacie_id:   profil.structure_id,
    delivre_par:    profil.id,
  }).eq('id', ligneId)

  // Vérifier si toutes les lignes sont délivrées → mettre à jour statut ordonnance
  const { data: lignes } = await sb
    .from('medical_ordonnance_lignes')
    .select('est_delivre')
    .eq('ordonnance_id', (await sb.from('medical_ordonnance_lignes').select('ordonnance_id').eq('id', ligneId).single()).data?.ordonnance_id)

  const toutesLivrees = (lignes ?? []).every((l: any) => l.est_delivre)
  if (toutesLivrees) {
    const { data: ligne } = await sb.from('medical_ordonnance_lignes').select('ordonnance_id').eq('id', ligneId).single()
    if (ligne) await sb.from('medical_ordonnances').update({ statut: 'delivree' }).eq('id', ligne.ordonnance_id)
  }

  return c.redirect(`/pharmacien/ordonnances/${qr}`)
})

// ── POST /pharmacien/ordonnances/:qr/tout-delivrer ─────────
pharmacienRoutes.post('/ordonnances/:qr/tout-delivrer', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const qr = c.req.param('qr')

  const { data: ord } = await sb.from('medical_ordonnances').select('id').eq('qr_code_verification', qr).single()
  if (ord) {
    await sb.from('medical_ordonnance_lignes').update({
      est_delivre:  true,
      delivre_at:   new Date().toISOString(),
      pharmacie_id: profil.structure_id,
      delivre_par:  profil.id,
    }).eq('ordonnance_id', ord.id)

    await sb.from('medical_ordonnances').update({ statut: 'delivree' }).eq('id', ord.id)
  }

  return c.redirect(`/pharmacien/ordonnances/${qr}`)
})
