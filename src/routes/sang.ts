/**
 * src/routes/sang.ts
 * SantéBF — Module Don de Sang + CNTS
 *
 * Routes patient : /sang/...
 *   GET  /sang/consentement   → page consentement du patient
 *   POST /sang/consentement   → enregistrer consentement
 *
 * Routes CNTS : /cnts/...
 *   GET  /cnts                → dashboard CNTS
 *   GET  /cnts/recherche      → chercher donneurs compatibles
 *   POST /cnts/urgence        → créer demande d'urgence
 *   GET  /cnts/urgence/:id    → détail demande
 *   POST /cnts/urgence/:id/contacter → envoyer contacts
 *   GET  /cnts/donneurs       → liste tous les donneurs actifs
 *
 * STATUT : PRÊT mais routes patient affichent "bientôt disponible"
 * jusqu'à activation manuelle (commenter/décommenter dans functions/[[path]].ts)
 */
import { Hono } from 'hono'
import { requirePlan } from '../middleware/plan'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────
// ROUTES PATIENT — consentement don de sang
// ─────────────────────────────────────────────────────────────
export const sangPatientRoutes = new Hono<{ Bindings: Bindings }>()
sangPatientRoutes.use('/*', requireAuth, requireRole('patient'))

sangPatientRoutes.get('/consentement', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers')
    .select('id, groupe_sanguin, rhesus, prenom, nom')
    .eq('profile_id', profil.id)
    .single()

  const { data: consent } = dossier ? await supabase
    .from('sang_consentements')
    .select('*')
    .eq('patient_id', dossier.id)
    .single()
    : { data: null }

  const gs = dossier?.groupe_sanguin && dossier?.rhesus
    ? `${dossier.groupe_sanguin}${dossier.rhesus}`
    : 'Non renseigné'

  const succes = c.req.query('succes') || ''

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Don de Sang — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>
:root{--rouge:#B71C1C;--vert:#1A6B3C;--texte:#0f1923;--soft:#5a6a78;--bg:#FFF5F5;--blanc:#fff;--bordure:#FFCDD2;}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);}
.topbar{background:linear-gradient(135deg,#7f0000,var(--rouge));height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;position:sticky;top:0;z-index:100;}
.tb-brand{font-family:'Fraunces',serif;font-size:17px;color:white;}
.tb-btn{background:rgba(255,255,255,.15);color:white;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;}
.wrap{max-width:680px;margin:0 auto;padding:24px 16px;}
.card{background:var(--blanc);border-radius:16px;padding:24px;border:1px solid var(--bordure);margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.05);}
.gs-display{text-align:center;padding:20px;background:linear-gradient(135deg,#7f0000,var(--rouge));border-radius:12px;color:white;margin-bottom:16px;}
.gs-val{font-family:'Fraunces',serif;font-size:48px;font-weight:900;text-shadow:0 2px 8px rgba(0,0,0,.2);}
.gs-lbl{font-size:12px;opacity:.8;margin-top:4px;}
.check-row{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid #F3F4F6;}
.check-row:last-child{border-bottom:none;}
input[type=checkbox]{width:20px;height:20px;margin-top:2px;accent-color:var(--rouge);flex-shrink:0;}
.check-label{font-size:14px;font-weight:600;color:var(--texte);}
.check-sub{font-size:12px;color:var(--soft);margin-top:2px;line-height:1.5;}
.btn-save{background:var(--rouge);color:white;border:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;width:100%;margin-top:14px;font-family:inherit;}
.ok-box{background:#E8F5E9;border-left:4px solid var(--vert);border-radius:10px;padding:12px 15px;margin-bottom:14px;font-size:13px;color:var(--vert);font-weight:700;}
.info-box{background:#FFF3E0;border-left:4px solid #F57C00;border-radius:10px;padding:12px 15px;margin-bottom:14px;font-size:13px;color:#7a4500;}
h2{font-family:'Fraunces',serif;font-size:20px;margin-bottom:14px;}
</style>
</head>
<body>
<div class="topbar">
  <span class="tb-brand">🩸 SantéBF — Don de Sang</span>
  <a href="/dashboard/patient" class="tb-btn">← Dashboard</a>
</div>
<div class="wrap">
  ${succes ? '<div class="ok-box">✓ Vos préférences ont été enregistrées.</div>' : ''}
  <div class="info-box">
    ⚠️ Le don de sang peut sauver des vies. En vous inscrivant, vous acceptez d'être contacté par le Centre National de Transfusion Sanguine (CNTS) uniquement en cas d'urgence médicale.
  </div>
  <div class="gs-display">
    <div class="gs-val">${gs}</div>
    <div class="gs-lbl">Votre groupe sanguin</div>
  </div>
  <div class="card">
    <h2>🩸 Consentement pour le don de sang</h2>
    <form method="POST" action="/sang/consentement">
      <div class="check-row">
        <input type="checkbox" name="accepte_don" id="don" ${consent?.accepte_don ? 'checked' : ''}>
        <div>
          <div class="check-label"><label for="don">Je souhaite être donneur de sang potentiel</label></div>
          <div class="check-sub">Votre groupe sanguin sera ajouté à la banque nationale des donneurs potentiels du CNTS Burkina Faso.</div>
        </div>
      </div>
      <div class="check-row">
        <input type="checkbox" name="accepte_contact" id="contact" ${consent?.accepte_contact ? 'checked' : ''}>
        <div>
          <div class="check-label"><label for="contact">J'accepte d'être contacté par le CNTS en cas d'urgence</label></div>
          <div class="check-sub">Le CNTS pourra vous envoyer un SMS ou vous appeler si votre groupe sanguin est recherché en urgence dans votre région.</div>
        </div>
      </div>
      <button type="submit" class="btn-save">Enregistrer mes préférences</button>
    </form>
    ${consent
      ? `<p style="font-size:11px;color:var(--soft);margin-top:12px;text-align:center;">
          Dernière mise à jour : ${new Date(consent.updated_at || consent.created_at).toLocaleDateString('fr-FR')}
         </p>`
      : ''}
  </div>
  <div class="card" style="font-size:13px;color:var(--soft);">
    <strong style="color:var(--texte);">ℹ️ Vos droits</strong>
    <ul style="margin-top:8px;padding-left:18px;line-height:2;">
      <li>Vous pouvez retirer votre consentement à tout moment</li>
      <li>Vos données ne sont jamais partagées à des fins commerciales</li>
      <li>Seul le CNTS peut vous contacter, uniquement en cas d'urgence médicale</li>
      <li>Votre identité complète n'est jamais transmise sans votre accord explicite</li>
    </ul>
  </div>
</div>
</body>
</html>`)
})

sangPatientRoutes.post('/consentement', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const body = await c.req.parseBody()
  const { data: dossier } = await supabase
    .from('patient_dossiers')
    .select('id, groupe_sanguin, rhesus, telephone, ville_id')
    .eq('profile_id', profil.id)
    .single()

  if (!dossier) return c.redirect('/sang/consentement?erreur=dossier', 303)

  const accepteDon     = body.accepte_don     === 'on'
  const accepteContact = body.accepte_contact === 'on'

  // Upsert consentement
  await supabase.from('sang_consentements').upsert({
    patient_id:       dossier.id,
    accepte_don:      accepteDon,
    accepte_contact:  accepteContact,
    date_consentement: new Date().toISOString(),
    est_actif:        true,
    updated_at:       new Date().toISOString(),
  }, { onConflict: 'patient_id' })

  // Si le patient accepte le don → créer/mettre à jour son profil donneur
  if (accepteDon && dossier.groupe_sanguin && dossier.rhesus) {
    await supabase.from('sang_donneurs').upsert({
      patient_id:       dossier.id,
      groupe_sanguin:   dossier.groupe_sanguin,
      rhesus:           dossier.rhesus,
      est_disponible:   accepteContact,
      telephone_contact: dossier.telephone,
      ville_id:         dossier.ville_id,
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'patient_id' })
  } else if (!accepteDon) {
    // Désactiver le donneur si retrait consentement
    await supabase.from('sang_donneurs')
      .update({ est_disponible: false, updated_at: new Date().toISOString() })
      .eq('patient_id', dossier.id)
  }

  return c.redirect('/sang/consentement?succes=1', 303)
})

// ─────────────────────────────────────────────────────────────
// ROUTES CNTS — réservées rôle cnts_agent + super_admin
// ─────────────────────────────────────────────────────────────
export const cntsRoutes = new Hono<{ Bindings: Bindings }>()
cntsRoutes.use('/*', requireAuth, requireRole('cnts_agent', 'super_admin'))
// CNTS Don de Sang — Pro minimum
cntsRoutes.use('/*', requirePlan('pro', 'pilote'))

const CNTS_COLOR = '#B71C1C'

function cntsTopbar(profil: AuthProfile, titre: string): string {
  return `<div style="background:linear-gradient(135deg,#7f0000,${CNTS_COLOR});height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;position:sticky;top:0;z-index:100;">
  <div style="display:flex;align-items:center;gap:10px;">
    <span style="font-size:20px;">🩸</span>
    <div style="font-family:'Fraunces',serif;font-size:17px;color:white;">CNTS BF</div>
    <div style="font-size:10px;color:rgba(255,255,255,.5);letter-spacing:1px;text-transform:uppercase;">Centre National de Transfusion Sanguine · ${titre}</div>
  </div>
  <div style="display:flex;gap:8px;">
    <a href="/cnts" style="background:rgba(255,255,255,.15);color:white;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">⊞ Dashboard</a>
    <a href="/auth/logout" style="background:rgba(255,255,255,.15);color:white;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">⏻</a>
  </div>
</div>`
}

// ── Dashboard CNTS ────────────────────────────────────────────
cntsRoutes.get('/', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const [donneursRes, demandesRes, urgentsRes] = await Promise.all([
    supabase.from('sang_donneurs').select('*', { count: 'exact', head: true }).eq('est_disponible', true),
    supabase.from('sang_demandes_urgence').select('*', { count: 'exact', head: true }).eq('statut', 'en_cours'),
    supabase.from('sang_donneurs')
      .select('groupe_sanguin, rhesus')
      .eq('est_disponible', true)
      .limit(1000),
  ])

  // Compter par groupe sanguin
  const groupes: Record<string, number> = {}
  for (const d of urgentsRes.data ?? []) {
    const key = `${d.groupe_sanguin}${d.rhesus}`
    groupes[key] = (groupes[key] || 0) + 1
  }
  const topGroupes = Object.entries(groupes).sort((a,b) => (b[1] as number)-(a[1] as number))

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CNTS — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>
:root{--rouge:#B71C1C;--vert:#1A6B3C;--texte:#0f1923;--soft:#5a6a78;--bg:#FFF5F5;--blanc:#fff;--bordure:#FFCDD2;}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--texte);}
.wrap{max-width:1000px;margin:0 auto;padding:22px 16px;}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;}
.stat-card{background:var(--blanc);border-radius:14px;padding:18px;border:1px solid var(--bordure);text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.05);}
.stat-val{font-family:'Fraunces',serif;font-size:36px;color:var(--rouge);}
.stat-lbl{font-size:12px;color:var(--soft);margin-top:4px;}
.card{background:var(--blanc);border-radius:14px;padding:20px;border:1px solid var(--bordure);margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,.05);}
.card h3{font-family:'Fraunces',serif;font-size:17px;margin-bottom:14px;}
.gs-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.gs-card{background:linear-gradient(135deg,#7f0000,var(--rouge));border-radius:10px;padding:14px;text-align:center;color:white;}
.gs-val{font-family:'Fraunces',serif;font-size:24px;font-weight:900;}
.gs-count{font-size:12px;opacity:.8;margin-top:4px;}
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;font-family:inherit;text-decoration:none;}
.btn-rouge{background:var(--rouge);color:white;}
.btn-soft{background:var(--bg);color:var(--texte);border:1px solid var(--bordure);}
.page-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
.page-title{font-family:'Fraunces',serif;font-size:22px;}
@media(max-width:640px){.grid{grid-template-columns:1fr 1fr;}.gs-grid{grid-template-columns:repeat(2,1fr);}}
</style>
</head>
<body>
${cntsTopbar(profil, 'Tableau de bord')}
<div class="wrap">
  <div class="page-hd">
    <div class="page-title">🩸 Centre National de Transfusion Sanguine</div>
    <a href="/cnts/urgence/nouvelle" class="btn btn-rouge">🚨 Nouvelle urgence</a>
  </div>
  <div class="grid">
    <div class="stat-card">
      <div class="stat-val">${donneursRes.count ?? 0}</div>
      <div class="stat-lbl">Donneurs disponibles</div>
    </div>
    <div class="stat-card">
      <div class="stat-val">${demandesRes.count ?? 0}</div>
      <div class="stat-lbl">Urgences en cours</div>
    </div>
    <div class="stat-card">
      <div class="stat-val">${topGroupes.length}</div>
      <div class="stat-lbl">Groupes couverts</div>
    </div>
  </div>
  <div class="card">
    <h3>🩸 Disponibilité par groupe sanguin</h3>
    <div class="gs-grid">
      ${topGroupes.map(([gs, n]) => `
        <div class="gs-card">
          <div class="gs-val">${gs}</div>
          <div class="gs-count">${n} donneur${n>1?'s':''}</div>
        </div>
      `).join('') || '<p style="color:var(--soft);font-size:13px;font-style:italic;">Aucun donneur enregistré</p>'}
    </div>
  </div>
  <div class="card" style="display:flex;gap:12px;flex-wrap:wrap;">
    <a href="/cnts/donneurs"  class="btn btn-soft">👥 Liste donneurs</a>
    <a href="/cnts/recherche" class="btn btn-soft">🔍 Rechercher</a>
    <a href="/cnts/historique" class="btn btn-soft">📋 Historique</a>
  </div>
</div>
</body>
</html>`)
})

// ── Recherche donneurs compatibles ────────────────────────────
cntsRoutes.get('/recherche', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const gs       = c.req.query('gs') || ''
  const rh       = c.req.query('rh') || ''

  let donneurs: any[] = []
  if (gs && rh) {
    const { data } = await supabase
      .from('sang_donneurs')
      .select(`
        id, groupe_sanguin, rhesus, telephone_contact, est_disponible, derniere_donnee_at,
        patient:patient_dossiers(prenom, nom, telephone),
        ville:geo_villes(nom)
      `)
      .eq('groupe_sanguin', gs)
      .eq('rhesus', rh)
      .eq('est_disponible', true)
      .order('derniere_donnee_at', { ascending: true, nullsFirst: true })
      .limit(50)
    donneurs = data ?? []
  }

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Recherche donneurs — CNTS</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>
:root{--rouge:#B71C1C;--texte:#0f1923;--soft:#5a6a78;--bg:#FFF5F5;--blanc:#fff;--bordure:#FFCDD2;}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--texte);}
.wrap{max-width:900px;margin:0 auto;padding:22px 16px;}
.card{background:var(--blanc);border-radius:14px;padding:20px;border:1px solid var(--bordure);margin-bottom:14px;}
select,input{padding:10px 14px;border:1.5px solid var(--bordure);border-radius:10px;font-size:14px;font-family:inherit;outline:none;background:#fffafa;}
select:focus,input:focus{border-color:var(--rouge);}
.btn{padding:10px 18px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;font-family:inherit;text-decoration:none;}
.btn-rouge{background:var(--rouge);color:white;}
.btn-soft{background:var(--bg);color:var(--texte);border:1px solid var(--bordure);}
table{width:100%;border-collapse:collapse;}
thead tr{background:#FFEBEE;}
th{padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:var(--rouge);text-transform:uppercase;border-bottom:2px solid var(--bordure);}
td{padding:10px 14px;font-size:14px;border-bottom:1px solid var(--bordure);}
.page-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px;}
.page-title{font-family:'Fraunces',serif;font-size:20px;}
</style>
</head>
<body>
${cntsTopbar(profil, 'Recherche')}
<div class="wrap">
  <div class="page-hd">
    <div class="page-title">🔍 Rechercher des donneurs</div>
    <a href="/cnts" class="btn btn-soft">← Retour</a>
  </div>
  <div class="card">
    <form method="GET" action="/cnts/recherche" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
      <div>
        <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Groupe sanguin</label>
        <select name="gs">
          <option value="">-- Groupe --</option>
          ${['A','B','AB','O'].map(g => `<option value="${g}" ${gs===g?'selected':''}>${g}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Rhésus</label>
        <select name="rh">
          <option value="">-- Rh --</option>
          <option value="+" ${rh==='+'?'selected':''}>Positif (+)</option>
          <option value="-" ${rh==='-'?'selected':''}>Négatif (-)</option>
        </select>
      </div>
      <button type="submit" class="btn btn-rouge">Rechercher</button>
    </form>
  </div>
  ${gs && rh ? `
  <div class="card">
    <div style="font-size:14px;font-weight:700;margin-bottom:14px;">
      Donneurs ${gs}${rh} disponibles : <span style="color:var(--rouge)">${donneurs.length}</span>
    </div>
    ${donneurs.length > 0 ? `
    <table>
      <thead><tr><th>Nom</th><th>Groupe</th><th>Ville</th><th>Tél contact</th><th>Dernier don</th><th>Action</th></tr></thead>
      <tbody>
        ${donneurs.map(d => `<tr>
          <td style="font-weight:600;">${d.patient?.prenom||''} ${d.patient?.nom||''}</td>
          <td><strong style="color:var(--rouge);">${d.groupe_sanguin}${d.rhesus}</strong></td>
          <td>${d.ville?.nom || '—'}</td>
          <td>${d.telephone_contact || d.patient?.telephone || '—'}</td>
          <td>${d.derniere_donnee_at ? new Date(d.derniere_donnee_at).toLocaleDateString('fr-FR') : 'Jamais donné'}</td>
          <td><a href="tel:${d.telephone_contact || d.patient?.telephone}" class="btn btn-rouge" style="font-size:12px;padding:6px 12px;">📞 Appeler</a></td>
        </tr>`).join('')}
      </tbody>
    </table>` : `<p style="color:var(--soft);text-align:center;padding:24px;font-style:italic;">Aucun donneur ${gs}${rh} disponible</p>`}
  </div>` : ''}
</div>
</body>
</html>`)
})

// ── Formulaire nouvelle urgence ───────────────────────────────
cntsRoutes.get('/urgence/nouvelle', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nouvelle urgence — CNTS</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>
:root{--rouge:#B71C1C;--texte:#0f1923;--soft:#5a6a78;--bg:#FFF5F5;--blanc:#fff;--bordure:#FFCDD2;}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--texte);}
.wrap{max-width:680px;margin:0 auto;padding:22px 16px;}
.card{background:var(--blanc);border-radius:14px;padding:22px;border:1px solid var(--bordure);margin-bottom:14px;}
.form-group{margin-bottom:14px;}
label{display:block;font-size:12px;font-weight:700;margin-bottom:5px;color:var(--texte);}
select,input,textarea{width:100%;padding:10px 14px;border:1.5px solid var(--bordure);border-radius:10px;font-size:14px;font-family:inherit;outline:none;}
select:focus,input:focus,textarea:focus{border-color:var(--rouge);}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.btn{width:100%;padding:12px;border-radius:10px;font-size:14px;font-weight:700;border:none;cursor:pointer;font-family:inherit;background:var(--rouge);color:white;}
h2{font-family:'Fraunces',serif;font-size:18px;margin-bottom:16px;}
.back{display:inline-flex;align-items:center;gap:7px;background:var(--blanc);border:1px solid var(--bordure);color:var(--texte);padding:8px 14px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;margin-bottom:16px;}
</style>
</head>
<body>
${cntsTopbar(profil, 'Nouvelle urgence')}
<div class="wrap">
  <a href="/cnts" class="back">← Retour</a>
  <div class="card">
    <h2>🚨 Créer une demande d'urgence</h2>
    <form method="POST" action="/cnts/urgence">
      <div class="grid2">
        <div class="form-group">
          <label>Groupe sanguin *</label>
          <select name="groupe_sanguin" required>
            ${['A','B','AB','O'].map(g => `<option value="${g}">${g}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Rhésus *</label>
          <select name="rhesus" required>
            <option value="+">Positif (+)</option>
            <option value="-">Négatif (-)</option>
          </select>
        </div>
      </div>
      <div class="grid2">
        <div class="form-group">
          <label>Quantité de poches</label>
          <input type="number" name="quantite_poches" value="1" min="1" max="20">
        </div>
        <div class="form-group">
          <label>Niveau d'urgence</label>
          <select name="niveau_urgence">
            <option value="urgent">Urgent</option>
            <option value="critique">Critique</option>
            <option value="extreme">Extrême</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Motif</label>
        <textarea name="motif" rows="3" placeholder="Motif de la demande, structure concernée..."></textarea>
      </div>
      <button type="submit" class="btn">🚨 Créer la demande d'urgence</button>
    </form>
  </div>
</div>
</body>
</html>`)
})

cntsRoutes.post('/urgence', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()

  const { data: demande } = await supabase
    .from('sang_demandes_urgence')
    .insert({
      demande_par:     profil.id,
      groupe_sanguin:  String(body.groupe_sanguin),
      rhesus:          String(body.rhesus),
      quantite_poches: parseInt(String(body.quantite_poches || '1')),
      niveau_urgence:  String(body.niveau_urgence || 'urgent'),
      motif:           String(body.motif || ''),
    })
    .select('id')
    .single()

  return c.redirect(`/cnts/urgence/${demande?.id}?nouveau=1`, 303)
})

// ── Détail urgence ────────────────────────────────────────────
cntsRoutes.get('/urgence/:id', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')
  const nouveau  = c.req.query('nouveau') || ''

  const { data: demande } = await supabase
    .from('sang_demandes_urgence')
    .select('*')
    .eq('id', id)
    .single()

  if (!demande) return c.redirect('/cnts', 303)

  // Chercher donneurs compatibles
  const { data: donneurs } = await supabase
    .from('sang_donneurs')
    .select(`
      id, groupe_sanguin, rhesus, telephone_contact, est_disponible, derniere_donnee_at,
      patient:patient_dossiers(prenom, nom, telephone),
      ville:geo_villes(nom)
    `)
    .eq('groupe_sanguin', demande.groupe_sanguin)
    .eq('rhesus', demande.rhesus)
    .eq('est_disponible', true)
    .limit(20)

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Urgence — CNTS</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>
:root{--rouge:#B71C1C;--vert:#1A6B3C;--texte:#0f1923;--soft:#5a6a78;--bg:#FFF5F5;--blanc:#fff;--bordure:#FFCDD2;}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--texte);}
.wrap{max-width:900px;margin:0 auto;padding:22px 16px;}
.card{background:var(--blanc);border-radius:14px;padding:20px;border:1px solid var(--bordure);margin-bottom:14px;}
.ok-box{background:#E8F5E9;border-left:4px solid var(--vert);border-radius:10px;padding:12px 15px;margin-bottom:14px;font-size:13px;color:var(--vert);font-weight:700;}
.urgence-header{background:linear-gradient(135deg,#7f0000,var(--rouge));border-radius:14px;padding:20px;color:white;margin-bottom:14px;}
.uh-gs{font-family:'Fraunces',serif;font-size:42px;font-weight:900;}
table{width:100%;border-collapse:collapse;}
thead tr{background:#FFEBEE;}
th{padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:var(--rouge);text-transform:uppercase;border-bottom:2px solid var(--bordure);}
td{padding:10px 14px;font-size:14px;border-bottom:1px solid var(--bordure);}
.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;border:none;cursor:pointer;font-family:inherit;text-decoration:none;}
.btn-rouge{background:var(--rouge);color:white;}
.btn-vert{background:var(--vert);color:white;}
.back{display:inline-flex;align-items:center;gap:7px;background:var(--blanc);border:1px solid var(--bordure);color:var(--texte);padding:8px 14px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;margin-bottom:14px;}
</style>
</head>
<body>
${cntsTopbar(profil, 'Urgence')}
<div class="wrap">
  <a href="/cnts" class="back">← Retour</a>
  ${nouveau ? '<div class="ok-box">✓ Demande d\'urgence créée. Voici les donneurs compatibles.</div>' : ''}
  <div class="urgence-header">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <div>
        <div style="font-size:11px;opacity:.7;margin-bottom:4px;">DEMANDE D'URGENCE</div>
        <div class="uh-gs">${demande.groupe_sanguin}${demande.rhesus}</div>
        <div style="font-size:13px;opacity:.8;margin-top:4px;">${demande.quantite_poches} poche(s) · ${demande.niveau_urgence} · ${new Date(demande.created_at).toLocaleDateString('fr-FR')}</div>
      </div>
      <span style="padding:6px 14px;border-radius:20px;background:rgba(255,255,255,.2);font-size:12px;font-weight:700;">${demande.statut.replace(/_/g,' ')}</span>
    </div>
    ${demande.motif ? `<div style="margin-top:10px;font-size:13px;opacity:.85;">${demande.motif}</div>` : ''}
  </div>
  <div class="card">
    <div style="font-size:14px;font-weight:700;margin-bottom:14px;">
      👥 Donneurs compatibles disponibles : <span style="color:var(--rouge)">${(donneurs??[]).length}</span>
    </div>
    ${(donneurs??[]).length > 0 ? `
    <table>
      <thead><tr><th>Nom</th><th>Groupe</th><th>Ville</th><th>Téléphone</th><th>Dernier don</th><th>Contact</th></tr></thead>
      <tbody>
        ${(donneurs??[]).map((d: any) => `<tr>
          <td style="font-weight:600;">${d.patient?.prenom||''} ${d.patient?.nom||''}</td>
          <td><strong style="color:var(--rouge);">${d.groupe_sanguin}${d.rhesus}</strong></td>
          <td>${d.ville?.nom || '—'}</td>
          <td style="font-family:monospace;">${d.telephone_contact || d.patient?.telephone || '—'}</td>
          <td>${d.derniere_donnee_at ? new Date(d.derniere_donnee_at).toLocaleDateString('fr-FR') : 'Jamais'}</td>
          <td style="display:flex;gap:6px;">
            <a href="tel:${d.telephone_contact || d.patient?.telephone}" class="btn btn-rouge">📞</a>
            <a href="sms:${d.telephone_contact || d.patient?.telephone}" class="btn btn-vert">💬</a>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p style="color:var(--soft);text-align:center;padding:24px;font-style:italic;">Aucun donneur compatible disponible actuellement.</p>'}
  </div>
</div>
</body>
</html>`)
})

// ── Liste tous les donneurs ───────────────────────────────────
cntsRoutes.get('/donneurs', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const gs       = c.req.query('gs') || 'all'

  let query = supabase
    .from('sang_donneurs')
    .select(`
      id, groupe_sanguin, rhesus, est_disponible, derniere_donnee_at, nb_dons_total,
      patient:patient_dossiers(prenom, nom, telephone),
      ville:geo_villes(nom)
    `)
    .order('groupe_sanguin')
    .limit(200)

  if (gs !== 'all') query = query.eq('groupe_sanguin', gs)

  const { data: donneurs } = await query

  const rows = (donneurs ?? []).map((d: any) => `<tr>
    <td style="font-weight:600;">${d.patient?.prenom||''} ${d.patient?.nom||''}</td>
    <td><strong style="color:${CNTS_COLOR};">${d.groupe_sanguin}${d.rhesus}</strong></td>
    <td>${d.ville?.nom || '—'}</td>
    <td style="font-family:monospace;font-size:13px;">${d.patient?.telephone || '—'}</td>
    <td>${d.nb_dons_total || 0}</td>
    <td>${d.derniere_donnee_at ? new Date(d.derniere_donnee_at).toLocaleDateString('fr-FR') : '—'}</td>
    <td><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;
      background:${d.est_disponible?'#E8F5E9':'#F5F5F5'};
      color:${d.est_disponible?'#1A6B3C':'#9E9E9E'};">
      ${d.est_disponible ? 'Disponible' : 'Indisponible'}
    </span></td>
  </tr>`).join('')

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Donneurs — CNTS</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>
:root{--rouge:#B71C1C;--texte:#0f1923;--soft:#5a6a78;--bg:#FFF5F5;--blanc:#fff;--bordure:#FFCDD2;}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--texte);}
.wrap{max-width:1000px;margin:0 auto;padding:22px 16px;}
.card{background:var(--blanc);border-radius:14px;padding:20px;border:1px solid var(--bordure);margin-bottom:14px;}
table{width:100%;border-collapse:collapse;}
thead tr{background:#FFEBEE;}
th{padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:var(--rouge);text-transform:uppercase;border-bottom:2px solid var(--bordure);}
td{padding:10px 14px;font-size:14px;border-bottom:1px solid var(--bordure);}
.btn{padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;}
.btn-rouge{background:var(--rouge);color:white;}
.btn-soft{background:var(--bg);color:var(--texte);border:1px solid var(--bordure);}
.page-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;}
.page-title{font-family:'Fraunces',serif;font-size:20px;}
.filtres{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
</style>
</head>
<body>
${cntsTopbar(profil, 'Donneurs')}
<div class="wrap">
  <div class="page-hd">
    <div class="page-title">👥 Base de donneurs (${(donneurs??[]).length})</div>
    <a href="/cnts" class="btn btn-soft">← Retour</a>
  </div>
  <div class="filtres">
    ${['all','A','B','AB','O'].map(g =>
      `<a href="/cnts/donneurs?gs=${g}" class="btn ${gs===g?'btn-rouge':'btn-soft'}">${g==='all'?'Tous':g}</a>`
    ).join('')}
  </div>
  <div class="card">
    ${rows ? `<table>
      <thead><tr><th>Nom</th><th>Groupe</th><th>Ville</th><th>Téléphone</th><th>Dons</th><th>Dernier don</th><th>Statut</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>` : '<p style="color:var(--soft);text-align:center;padding:24px;font-style:italic;">Aucun donneur enregistré</p>'}
  </div>
</div>
</body>
</html>`)
})
