import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import type { AuthProfile } from '../lib/supabase'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
export const accueilRoutes = new Hono<{ Bindings: Bindings }>()
accueilRoutes.use('/*', requireAuth, requireRole('agent_accueil', 'admin_structure', 'super_admin'))

const CSS = `
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;min-height:100vh}
    header{background:#1565C0;padding:0 24px;height:60px;display:flex;align-items:center;
      justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.15)}
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
    .container{max-width:1000px;margin:0 auto;padding:28px 20px}
    .page-title{font-family:'DM Serif Display',serif;font-size:26px;color:#1A1A2E;margin-bottom:4px}
    .page-sub{font-size:14px;color:#6B7280;margin-bottom:24px}
    .breadcrumb{font-size:13px;color:#6B7280;margin-bottom:16px}
    .breadcrumb a{color:#1565C0;text-decoration:none}
    .alerte-err{background:#FFF5F5;border-left:4px solid #C62828;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#C62828}
    .alerte-ok{background:#E8F5E9;border-left:4px solid #1A6B3C;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#1A6B3C}
    .btn-primary{background:#1565C0;color:white;padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;display:inline-block}
    .btn-secondary{background:#F3F4F6;color:#374151;padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;display:inline-block}
    .btn-sm{background:#1565C0;color:white;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif}
    .top-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px}
    .card{background:white;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;margin-bottom:24px}
    .card-body{padding:24px}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#1565C0}
    thead th{padding:12px 16px;text-align:left;font-size:12px;color:white;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    tbody tr{border-bottom:1px solid #F5F5F5;transition:background .15s}
    tbody tr:hover{background:#F9FAFB}
    tbody td{padding:12px 16px;font-size:14px}
    tbody tr:last-child{border-bottom:none}
    .empty{padding:32px;text-align:center;color:#9E9E9E;font-style:italic}
    .badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .badge.M{background:#E3F2FD;color:#1565C0}
    .badge.F{background:#FCE4EC;color:#880E4F}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .form-group{margin-bottom:0}
    .form-group.full{grid-column:1/-1}
    label{display:block;font-size:13px;font-weight:600;color:#1A1A2E;margin-bottom:7px}
    input,select,textarea{width:100%;padding:11px 14px;font-family:'DM Sans',sans-serif;font-size:14px;border:1.5px solid #E0E0E0;border-radius:10px;background:#F7F8FA;color:#1A1A2E;outline:none;transition:border-color .2s}
    input:focus,select:focus,textarea:focus{border-color:#1565C0;background:white;box-shadow:0 0 0 4px rgba(21,101,192,.08)}
    textarea{resize:vertical;min-height:80px}
    .form-actions{display:flex;gap:12px;margin-top:28px;justify-content:flex-end}
    .patient-card{background:white;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);padding:24px;margin-bottom:20px;border-left:4px solid #1565C0}
    .patient-header{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px}
    .patient-id{font-size:11px;color:#9E9E9E;margin-bottom:4px}
    .patient-nom{font-family:'DM Serif Display',serif;font-size:22px;color:#1A1A2E}
    .patient-meta{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px}
    .meta-tag{background:#F3F4F6;padding:4px 10px;border-radius:20px;font-size:12px;color:#424242}
    .meta-tag.sang{background:#FFF5F5;color:#B71C1C;font-weight:700}
    .patient-actions{display:flex;gap:10px;flex-wrap:wrap}
    .search-form{display:flex;gap:12px;margin-bottom:24px}
    .search-form input{flex:1;padding:12px 16px;border:1.5px solid #E0E0E0;border-radius:10px;font-size:15px;font-family:'DM Sans',sans-serif;outline:none}
    .search-form input:focus{border-color:#1565C0}
    .search-form button{background:#1565C0;color:white;border:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap}
    .numero-national{font-family:monospace;background:#EFF6FF;color:#1565C0;padding:2px 8px;border-radius:4px;font-size:13px}
    @media(max-width:640px){
      .form-grid{grid-template-columns:1fr}
      .search-form{flex-direction:column}
      .container{padding:16px 12px}
    }
  </style>`

function headerHtml(profil: AuthProfile): string {
  return `<header>
    <div class="hl">
      <a href="/dashboard/accueil" class="logo-wrap">
        <div class="logo">🏥</div>
        <div class="ht">SantéBF <span>ACCUEIL</span></div>
      </a>
    </div>
    <div class="hr">
      <div class="ub"><strong>${profil.prenom} ${profil.nom}</strong><small>Agent accueil</small></div>
      <a href="/auth/logout" class="logout">Déconnexion</a>
    </div>
  </header>`
}

// ── GET /accueil/nouveau-patient ───────────────────────────
accueilRoutes.get('/nouveau-patient', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const { data: regions } = await sb.from('geo_regions').select('id, nom').order('nom')
  return c.html(nouveauPatientPage(profil, regions ?? []))
})

// ── POST /accueil/nouveau-patient ──────────────────────────
accueilRoutes.post('/nouveau-patient', async (c) => {
  const sb   = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const body = await c.req.parseBody()

  const nom    = String(body.nom    ?? '').trim()
  const prenom = String(body.prenom ?? '').trim()
  const ddn    = String(body.date_naissance ?? '')
  const sexe   = String(body.sexe   ?? '')

  if (!nom || !prenom || !ddn || !sexe) {
    const { data: regions } = await sb.from('geo_regions').select('id, nom').order('nom')
    return c.html(nouveauPatientPage(profil, regions ?? [], 'Les champs nom, prénom, date de naissance et sexe sont obligatoires.'))
  }

  // Construire allergies JSONB
  const allergiesRaw = String(body.allergies ?? '').trim()
  const allergies = allergiesRaw
    ? allergiesRaw.split(',').map((a: string) => ({ substance: a.trim(), reaction: '' }))
    : []

  // Construire maladies JSONB
  const maladiesRaw = String(body.maladies ?? '').trim()
  const maladies = maladiesRaw
    ? maladiesRaw.split(',').map((m: string) => ({ maladie: m.trim(), depuis: '', traitement: '' }))
    : []

  const { data: patient, error } = await sb
    .from('patient_dossiers')
    .insert({
      nom:                           nom.toUpperCase(),
      prenom,
      date_naissance:                ddn,
      sexe,
      telephone:                     String(body.telephone ?? '') || null,
      groupe_sanguin:                String(body.groupe_sanguin ?? 'inconnu'),
      rhesus:                        String(body.rhesus ?? 'inconnu'),
      allergies:                     JSON.stringify(allergies),
      maladies_chroniques:           JSON.stringify(maladies),
      enregistre_par:                profil.id,
      structure_enregistrement_id:   profil.structure_id,
    })
    .select('id, numero_national')
    .single()

  if (error || !patient) {
    const { data: regions } = await sb.from('geo_regions').select('id, nom').order('nom')
    return c.html(nouveauPatientPage(profil, regions ?? [], 'Erreur : ' + (error?.message ?? 'Inconnue')))
  }

  // Contacts urgence
  const contactNom = String(body.contact_nom ?? '').trim()
  if (contactNom) {
    await sb.from('patient_contacts_urgence').insert({
      patient_id:    patient.id,
      nom_complet:   contactNom,
      lien_parente:  String(body.contact_lien ?? ''),
      telephone:     String(body.contact_tel ?? ''),
      est_principal: true,
    })
  }

  return c.redirect(`/accueil/patient/${patient.id}?nouveau=1`)
})

// ── GET /accueil/recherche ─────────────────────────────────
accueilRoutes.get('/recherche', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const q = String(c.req.query('q') ?? '').trim()

  let patients: any[] = []
  if (q.length >= 2) {
    const { data } = await sb
      .from('patient_dossiers')
      .select('id, numero_national, nom, prenom, date_naissance, sexe, groupe_sanguin, rhesus')
      .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,numero_national.ilike.%${q}%`)
      .order('nom')
      .limit(20)
    patients = data ?? []
  }

  return c.html(recherchePage(profil, q, patients))
})

// ── GET /accueil/patient/:id ───────────────────────────────
accueilRoutes.get('/patient/:id', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const id = c.req.param('id')
  const nouveau = c.req.query('nouveau') === '1'

  const { data: patient } = await sb
    .from('patient_dossiers')
    .select(`
      *,
      patient_contacts_urgence ( nom_complet, lien_parente, telephone, est_principal )
    `)
    .eq('id', id)
    .single()

  if (!patient) return c.redirect('/accueil/recherche')

  return c.html(patientFicheAccueilPage(profil, patient, nouveau))
})

// ── GET /accueil/patient/:id/qr ────────────────────────────
accueilRoutes.get('/patient/:id/qr', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const id = c.req.param('id')

  const { data: patient } = await sb
    .from('patient_dossiers')
    .select('numero_national, nom, prenom, qr_code_token')
    .eq('id', id)
    .single()

  if (!patient) return c.text('Patient introuvable', 404)

  // Page d'impression de la carte QR
  const qrUrl = `https://santebf.izicardouaga.com/public/urgence/${patient.qr_code_token}`
  return c.html(carteQRPage(patient, qrUrl))
})

// ── GET /accueil/rdv ───────────────────────────────────────
accueilRoutes.get('/rdv', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const today = new Date().toISOString().split('T')[0]
  const { data: rdvs } = await sb
    .from('medical_rendez_vous')
    .select(`
      id, date_heure, motif, statut,
      patient_dossiers ( nom, prenom, numero_national ),
      auth_profiles ( nom, prenom )
    `)
    .eq('structure_id', profil.structure_id)
    .gte('date_heure', today + 'T00:00:00')
    .order('date_heure')
    .limit(50)

  return c.html(rdvListePage(profil, rdvs ?? []))
})

// ── POST /accueil/rdv/nouveau ──────────────────────────────
accueilRoutes.post('/rdv/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const body = await c.req.parseBody()

  await sb.from('medical_rendez_vous').insert({
    patient_id:   String(body.patient_id),
    medecin_id:   String(body.medecin_id),
    structure_id: profil.structure_id,
    date_heure:   String(body.date_heure),
    motif:        String(body.motif ?? ''),
    duree_minutes: parseInt(String(body.duree ?? '30')),
    statut: 'planifie',
  })

  return c.redirect('/accueil/rdv?succes=1')
})

// ── POST /accueil/rdv/:id/statut ───────────────────────────
accueilRoutes.post('/rdv/:id/statut', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const id = c.req.param('id')
  const body = await c.req.parseBody()
  await sb.from('medical_rendez_vous').update({ statut: String(body.statut) }).eq('id', id)
  return c.redirect('/accueil/rdv')
})

// ══════════════════════════════════════════════════════════
// PAGES HTML
// ══════════════════════════════════════════════════════════

function nouveauPatientPage(profil: AuthProfile, regions: any[], erreur?: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Nouveau patient</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/accueil">Accueil</a> → Nouveau patient</div>
    <div class="page-title">Enregistrer un nouveau patient</div>
    <div class="page-sub">Le numéro national BF-XXXX-XXXXXX sera généré automatiquement.</div>
    ${erreur ? `<div class="alerte-err">⚠️ ${erreur}</div>` : ''}
    <div class="card card-body">
      <form method="POST" action="/accueil/nouveau-patient">
        <h3 style="font-size:15px;font-weight:600;margin-bottom:20px;color:#1565C0">👤 Identité civile</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Prénom *</label>
            <input type="text" name="prenom" placeholder="Ex: Aminata" required autocomplete="off">
          </div>
          <div class="form-group">
            <label>Nom *</label>
            <input type="text" name="nom" placeholder="Ex: SAWADOGO" required autocomplete="off">
          </div>
          <div class="form-group">
            <label>Date de naissance *</label>
            <input type="date" name="date_naissance" required>
          </div>
          <div class="form-group">
            <label>Sexe *</label>
            <select name="sexe" required>
              <option value="">Choisir...</option>
              <option value="F">Féminin</option>
              <option value="M">Masculin</option>
            </select>
          </div>
          <div class="form-group">
            <label>Téléphone</label>
            <input type="tel" name="telephone" placeholder="Ex: 70 11 22 33">
          </div>
          <div class="form-group full" style="border-top:1px solid #F0F0F0;padding-top:20px;margin-top:8px">
            <h3 style="font-size:15px;font-weight:600;margin-bottom:16px;color:#1565C0">🩸 Informations médicales permanentes</h3>
          </div>
          <div class="form-group">
            <label>Groupe sanguin</label>
            <select name="groupe_sanguin">
              <option value="inconnu">Inconnu</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="AB">AB</option>
              <option value="O">O</option>
            </select>
          </div>
          <div class="form-group">
            <label>Rhésus</label>
            <select name="rhesus">
              <option value="inconnu">Inconnu</option>
              <option value="+">Positif (+)</option>
              <option value="-">Négatif (−)</option>
            </select>
          </div>
          <div class="form-group full">
            <label>Allergies connues</label>
            <input type="text" name="allergies" placeholder="Ex: pénicilline, arachides (séparer par des virgules)">
            <small style="font-size:11px;color:#9E9E9E;margin-top:4px;display:block">Séparées par des virgules. Ces infos sont visibles sur la carte QR d'urgence.</small>
          </div>
          <div class="form-group full">
            <label>Maladies chroniques</label>
            <input type="text" name="maladies" placeholder="Ex: Diabète T2, Hypertension (séparer par des virgules)">
          </div>
          <div class="form-group full" style="border-top:1px solid #F0F0F0;padding-top:20px;margin-top:8px">
            <h3 style="font-size:15px;font-weight:600;margin-bottom:16px;color:#1565C0">📞 Contact d'urgence</h3>
          </div>
          <div class="form-group">
            <label>Nom complet du contact</label>
            <input type="text" name="contact_nom" placeholder="Ex: Ibrahim Sawadogo">
          </div>
          <div class="form-group">
            <label>Lien de parenté</label>
            <input type="text" name="contact_lien" placeholder="Ex: Époux, Mère, Fils">
          </div>
          <div class="form-group full">
            <label>Téléphone du contact *</label>
            <input type="tel" name="contact_tel" placeholder="Ex: 70 44 55 66">
          </div>
        </div>
        <div class="form-actions">
          <a href="/dashboard/accueil" class="btn-secondary">Annuler</a>
          <button type="submit" class="btn-primary">Enregistrer le patient →</button>
        </div>
      </form>
    </div>
  </div></body></html>`
}

function recherchePage(profil: AuthProfile, q: string, patients: any[]): string {
  const age = (ddn: string) => Math.floor((Date.now() - new Date(ddn).getTime()) / (1000*60*60*24*365.25))
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Recherche patient</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/accueil">Accueil</a> → Recherche</div>
    <div class="page-title">Rechercher un patient</div>
    <form action="/accueil/recherche" method="GET" class="search-form">
      <input type="text" name="q" value="${q}" placeholder="Nom, prénom ou numéro BF-XXXX-XXXXXX" autofocus>
      <button type="submit">Rechercher</button>
    </form>
    ${q && patients.length === 0 ? `<div class="alerte-err">Aucun patient trouvé pour "${q}". <a href="/accueil/nouveau-patient" style="color:#1565C0">Créer un nouveau dossier →</a></div>` : ''}
    ${patients.length > 0 ? `
      <div style="font-size:13px;color:#6B7280;margin-bottom:14px">${patients.length} résultat(s) pour "${q}"</div>
      <div class="card">
        <table>
          <thead><tr><th>Numéro</th><th>Nom complet</th><th>Âge</th><th>Sexe</th><th>Groupe sanguin</th><th>Action</th></tr></thead>
          <tbody>
            ${patients.map((p: any) => `
              <tr>
                <td><span class="numero-national">${p.numero_national}</span></td>
                <td><strong>${p.prenom} ${p.nom}</strong></td>
                <td>${age(p.date_naissance)} ans</td>
                <td><span class="badge ${p.sexe}">${p.sexe === 'M' ? 'Homme' : 'Femme'}</span></td>
                <td>${p.groupe_sanguin}${p.rhesus}</td>
                <td><a href="/accueil/patient/${p.id}" class="btn-sm">Ouvrir</a></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    ${!q ? `<div style="text-align:center;padding:48px;color:#9E9E9E">
      <div style="font-size:48px;margin-bottom:12px">🔍</div>
      <p>Tapez un nom, prénom ou numéro de dossier pour rechercher</p>
      <a href="/accueil/nouveau-patient" style="color:#1565C0;font-size:14px;display:inline-block;margin-top:12px">➕ Créer un nouveau dossier patient</a>
    </div>` : ''}
  </div></body></html>`
}

function patientFicheAccueilPage(profil: AuthProfile, patient: any, nouveau: boolean): string {
  const age = Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (1000*60*60*24*365.25))
  const allergies = Array.isArray(patient.allergies) ? patient.allergies : []
  const maladies  = Array.isArray(patient.maladies_chroniques) ? patient.maladies_chroniques : []
  const contacts  = Array.isArray(patient.patient_contacts_urgence) ? patient.patient_contacts_urgence : []

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — ${patient.prenom} ${patient.nom}</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/accueil">Accueil</a> → <a href="/accueil/recherche">Recherche</a> → ${patient.prenom} ${patient.nom}</div>
    ${nouveau ? `<div class="alerte-ok">✅ Dossier créé avec succès ! Numéro : <strong>${patient.numero_national}</strong></div>` : ''}

    <div class="patient-card">
      <div class="patient-header">
        <div>
          <div class="patient-id">${patient.numero_national}</div>
          <div class="patient-nom">${patient.prenom} ${patient.nom}</div>
          <div class="patient-meta">
            <span class="meta-tag">${age} ans</span>
            <span class="meta-tag">${patient.sexe === 'M' ? '♂ Homme' : '♀ Femme'}</span>
            <span class="meta-tag sang">🩸 ${patient.groupe_sanguin}${patient.rhesus}</span>
            ${patient.telephone ? `<span class="meta-tag">📞 ${patient.telephone}</span>` : ''}
          </div>
        </div>
        <div class="patient-actions">
          <a href="/accueil/patient/${patient.id}/qr" class="btn-sm" target="_blank">🪪 Imprimer carte QR</a>
          <a href="/accueil/rdv/nouveau?patient_id=${patient.id}" class="btn-primary" style="font-size:13px;padding:8px 16px">📅 Prendre RDV</a>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card card-body">
        <h4 style="font-size:13px;font-weight:700;color:#9E9E9E;text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px">⚠️ Allergies</h4>
        ${allergies.length === 0
          ? '<p style="color:#9E9E9E;font-size:13px;font-style:italic">Aucune allergie connue</p>'
          : allergies.map((a: any) => `<span style="display:inline-block;background:#FFF5F5;color:#B71C1C;border:1px solid #FFCDD2;padding:4px 12px;border-radius:20px;font-size:12px;margin:3px">${a.substance || a}</span>`).join('')
        }
      </div>
      <div class="card card-body">
        <h4 style="font-size:13px;font-weight:700;color:#9E9E9E;text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px">🏥 Maladies chroniques</h4>
        ${maladies.length === 0
          ? '<p style="color:#9E9E9E;font-size:13px;font-style:italic">Aucune maladie chronique</p>'
          : maladies.map((m: any) => `<span style="display:inline-block;background:#FFF3E0;color:#E65100;border:1px solid #FFE0B2;padding:4px 12px;border-radius:20px;font-size:12px;margin:3px">${m.maladie || m}</span>`).join('')
        }
      </div>
      <div class="card card-body" style="grid-column:1/-1">
        <h4 style="font-size:13px;font-weight:700;color:#9E9E9E;text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px">📞 Contacts d'urgence</h4>
        ${contacts.length === 0
          ? '<p style="color:#9E9E9E;font-size:13px;font-style:italic">Aucun contact enregistré</p>'
          : contacts.map((ct: any) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F5F5F5">
              <div>
                <strong style="font-size:14px">${ct.nom_complet}</strong>
                <span style="font-size:12px;color:#9E9E9E;margin-left:8px">${ct.lien_parente}</span>
              </div>
              <a href="tel:${ct.telephone}" style="background:#1565C0;color:white;padding:6px 14px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">📞 ${ct.telephone}</a>
            </div>`).join('')
        }
      </div>
    </div>

    <div style="text-align:center;padding:20px;color:#9E9E9E;font-size:13px">
      <p>Pour voir le dossier médical complet, le patient doit donner son consentement à un médecin.</p>
    </div>
  </div></body></html>`
}

function carteQRPage(patient: any, qrUrl: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Carte QR — ${patient.prenom} ${patient.nom}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:sans-serif;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
    .carte{width:320px;border:2px solid #1A6B3C;border-radius:12px;overflow:hidden;text-align:center}
    .carte-header{background:#1A6B3C;padding:12px;color:white}
    .carte-header h2{font-size:16px;font-weight:700}
    .carte-header p{font-size:11px;opacity:.8}
    .carte-body{padding:20px}
    .nom{font-size:18px;font-weight:700;margin-bottom:4px}
    .numero{font-size:11px;color:#9E9E9E;margin-bottom:16px;font-family:monospace}
    #qrcode{display:flex;justify-content:center;margin-bottom:16px}
    .urgence-url{font-size:10px;color:#6B7280;word-break:break-all;margin-bottom:12px}
    .carte-footer{background:#F7F8FA;padding:10px;font-size:11px;color:#9E9E9E;border-top:1px solid #E0E0E0}
    .btn-print{margin-top:20px;background:#1A6B3C;color:white;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer}
    @media print{.btn-print{display:none}body{padding:0}#carte-zone{margin:0}}
  </style>
  </head><body>
  <div id="carte-zone">
    <div class="carte">
      <div class="carte-header">
        <h2>🏥 SantéBF — URGENCE</h2>
        <p>Système National de Santé Numérique</p>
      </div>
      <div class="carte-body">
        <div class="nom">${patient.prenom} ${patient.nom}</div>
        <div class="numero">${patient.numero_national}</div>
        <div id="qrcode"></div>
        <div class="urgence-url">${qrUrl}</div>
        <p style="font-size:11px;color:#B71C1C;font-weight:600">Scanner ce QR code en cas d'urgence médicale</p>
      </div>
      <div class="carte-footer">SantéBF · Burkina Faso · 2025</div>
    </div>
    <div style="text-align:center">
      <button class="btn-print" onclick="window.print()">🖨️ Imprimer la carte</button>
    </div>
  </div>
  <script>
    new QRCode(document.getElementById("qrcode"), {
      text: "${qrUrl}",
      width: 180, height: 180,
      colorDark: "#1A6B3C",
      colorLight: "#ffffff",
    })
  </script>
  </body></html>`
}

function rdvListePage(profil: AuthProfile, rdvs: any[]): string {
  const date = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Rendez-vous</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/accueil">Accueil</a> → Rendez-vous</div>
    <div class="top-bar">
      <div>
        <div class="page-title">Rendez-vous du jour</div>
        <div class="page-sub">${date} — ${rdvs.length} rendez-vous</div>
      </div>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Heure</th><th>Patient</th><th>Médecin</th><th>Motif</th><th>Statut</th><th>Action</th></tr></thead>
        <tbody>
          ${rdvs.length === 0
            ? '<tr><td colspan="6" class="empty">Aucun rendez-vous aujourd\'hui</td></tr>'
            : rdvs.map((r: any) => `
              <tr>
                <td><strong style="color:#1565C0">${new Date(r.date_heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</strong></td>
                <td>${r.patient_dossiers?.prenom ?? ''} ${r.patient_dossiers?.nom ?? ''}</td>
                <td>Dr. ${r.auth_profiles?.prenom ?? ''} ${r.auth_profiles?.nom ?? ''}</td>
                <td>${r.motif ?? '—'}</td>
                <td><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#E3F2FD;color:#1565C0">${r.statut}</span></td>
                <td>
                  <form method="POST" action="/accueil/rdv/${r.id}/statut" style="display:inline">
                    <select name="statut" onchange="this.form.submit()" style="font-size:12px;padding:4px 8px;border:1px solid #E0E0E0;border-radius:6px">
                      <option ${r.statut==='planifie'?'selected':''} value="planifie">Planifié</option>
                      <option ${r.statut==='confirme'?'selected':''} value="confirme">Confirmé</option>
                      <option ${r.statut==='passe'?'selected':''} value="passe">Passé</option>
                      <option ${r.statut==='absent'?'selected':''} value="absent">Absent</option>
                      <option ${r.statut==='annule'?'selected':''} value="annule">Annulé</option>
                    </select>
                  </form>
                </td>
              </tr>`).join('')
          }
        </tbody>
      </table>
    </div>
  </div></body></html>`
}
