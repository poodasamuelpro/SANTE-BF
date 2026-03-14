import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import type { AuthProfile } from '../lib/supabase'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
export const medecinRoutes = new Hono<{ Bindings: Bindings }>()
medecinRoutes.use('/*', requireAuth, requireRole('medecin','infirmier','sage_femme','laborantin','radiologue'))

const CSS = `
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;min-height:100vh}
    header{background:#4A148C;padding:0 24px;height:60px;display:flex;align-items:center;
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
    .container{max-width:1050px;margin:0 auto;padding:28px 20px}
    .page-title{font-family:'DM Serif Display',serif;font-size:26px;color:#1A1A2E;margin-bottom:4px}
    .page-sub{font-size:14px;color:#6B7280;margin-bottom:24px}
    .breadcrumb{font-size:13px;color:#6B7280;margin-bottom:16px}
    .breadcrumb a{color:#4A148C;text-decoration:none}
    .alerte-err{background:#FFF5F5;border-left:4px solid #C62828;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#C62828}
    .alerte-ok{background:#E8F5E9;border-left:4px solid #1A6B3C;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#1A6B3C}
    .btn-primary{background:#4A148C;color:white;padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;display:inline-block}
    .btn-secondary{background:#F3F4F6;color:#374151;padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;display:inline-block}
    .btn-sm{background:#4A148C;color:white;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none}
    .top-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px}
    .card{background:white;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;margin-bottom:24px}
    .card-body{padding:24px}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#4A148C}
    thead th{padding:12px 16px;text-align:left;font-size:12px;color:white;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    tbody tr{border-bottom:1px solid #F5F5F5;transition:background .15s}
    tbody tr:hover{background:#F9FAFB}
    tbody td{padding:12px 16px;font-size:14px}
    tbody tr:last-child{border-bottom:none}
    .empty{padding:32px;text-align:center;color:#9E9E9E;font-style:italic}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .form-group{margin-bottom:0}
    .form-group.full{grid-column:1/-1}
    label{display:block;font-size:13px;font-weight:600;color:#1A1A2E;margin-bottom:7px}
    input,select,textarea{width:100%;padding:11px 14px;font-family:'DM Sans',sans-serif;font-size:14px;border:1.5px solid #E0E0E0;border-radius:10px;background:#F7F8FA;color:#1A1A2E;outline:none;transition:border-color .2s}
    input:focus,select:focus,textarea:focus{border-color:#4A148C;background:white;box-shadow:0 0 0 4px rgba(74,20,140,.08)}
    textarea{resize:vertical;min-height:100px}
    .form-actions{display:flex;gap:12px;margin-top:28px;justify-content:flex-end}
    .section-title{font-size:13px;font-weight:700;color:#4A148C;text-transform:uppercase;letter-spacing:.5px;margin:20px 0 12px;padding-top:20px;border-top:1px solid #F0F0F0}
    .patient-mini{background:#F3E5F5;border-radius:10px;padding:14px 16px;margin-bottom:24px;display:flex;align-items:center;gap:16px;border-left:4px solid #4A148C}
    .pm-nom{font-size:16px;font-weight:700;color:#1A1A2E}
    .pm-info{font-size:12px;color:#6B7280}
    .pm-tag{background:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;color:#4A148C}
    .ordonnance-ligne{background:#F9FAFB;border-radius:10px;padding:16px;margin-bottom:12px;border:1px solid #E0E0E0;position:relative}
    .btn-remove{position:absolute;top:8px;right:8px;background:#FFF5F5;color:#B71C1C;border:none;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer}
    .search-form{display:flex;gap:12px;margin-bottom:24px}
    .search-form input{flex:1;padding:12px 16px;border:1.5px solid #E0E0E0;border-radius:10px;font-size:15px;font-family:'DM Sans',sans-serif;outline:none}
    .search-form input:focus{border-color:#4A148C}
    .search-form button{background:#4A148C;color:white;border:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap}
    .numero-national{font-family:monospace;background:#EDE7F6;color:#4A148C;padding:2px 8px;border-radius:4px;font-size:13px}
    .badge-statut{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .badge-statut.active{background:#E8F5E9;color:#1A6B3C}
    .badge-statut.expiree{background:#F5F5F5;color:#9E9E9E}
    .badge-statut.delivree{background:#E3F2FD;color:#1565C0}
    .badge-statut.annulee{background:#FFF5F5;color:#B71C1C}
    @media(max-width:640px){.form-grid{grid-template-columns:1fr}.search-form{flex-direction:column}.container{padding:16px 12px}}
  </style>`

function headerHtml(profil: AuthProfile): string {
  return `<header>
    <div class="hl">
      <a href="/dashboard/medecin" class="logo-wrap">
        <div class="logo">🏥</div>
        <div class="ht">SantéBF <span>ESPACE MÉDICAL</span></div>
      </a>
    </div>
    <div class="hr">
      <div class="ub"><strong>Dr. ${profil.prenom} ${profil.nom}</strong><small>${profil.role.replace(/_/g,' ')}</small></div>
      <a href="/auth/logout" class="logout">Déconnexion</a>
    </div>
  </header>`
}

// ── GET /medecin/patients ──────────────────────────────────
medecinRoutes.get('/patients', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const q = String(c.req.query('q') ?? '').trim()

  let patients: any[] = []
  if (q.length >= 2) {
    const { data } = await sb
      .from('patient_dossiers')
      .select('id, numero_national, nom, prenom, date_naissance, sexe, groupe_sanguin, rhesus')
      .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,numero_national.ilike.%${q}%`)
      .limit(20)
    patients = data ?? []
  } else {
    // Patients avec consentement actif pour ce médecin
    const { data: consentements } = await sb
      .from('patient_consentements')
      .select(`
        patient_dossiers ( id, numero_national, nom, prenom, date_naissance, sexe, groupe_sanguin, rhesus )
      `)
      .eq('medecin_id', profil.id)
      .eq('est_actif', true)
    patients = (consentements ?? []).map((c: any) => c.patient_dossiers).filter(Boolean)
  }

  const age = (ddn: string) => Math.floor((Date.now() - new Date(ddn).getTime()) / (1000*60*60*24*365.25))

  return c.html(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Mes patients</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → Patients</div>
    <div class="page-title">Mes patients</div>
    <form action="/medecin/patients" method="GET" class="search-form">
      <input type="text" name="q" value="${q}" placeholder="Rechercher par nom, prénom ou numéro BF-...">
      <button type="submit">Rechercher</button>
    </form>
    ${patients.length === 0 && !q ? `<div style="text-align:center;padding:48px;color:#9E9E9E">
      <div style="font-size:48px;margin-bottom:12px">👥</div>
      <p>Aucun patient avec consentement actif.</p>
      <p style="font-size:13px;margin-top:8px">Recherchez un patient ou demandez-lui d'accorder un consentement.</p>
    </div>` : ''}
    ${patients.length > 0 ? `
    <div class="card">
      <table>
        <thead><tr><th>Numéro</th><th>Nom complet</th><th>Âge</th><th>Groupe sanguin</th><th>Action</th></tr></thead>
        <tbody>
          ${patients.map((p: any) => `
            <tr>
              <td><span class="numero-national">${p.numero_national}</span></td>
              <td><strong>${p.prenom} ${p.nom}</strong></td>
              <td>${age(p.date_naissance)} ans</td>
              <td style="font-weight:700;color:#B71C1C">${p.groupe_sanguin}${p.rhesus}</td>
              <td>
                <a href="/medecin/consultations/nouvelle?patient_id=${p.id}" class="btn-sm" style="margin-right:6px">+ Consultation</a>
                <a href="/medecin/patients/${p.id}" class="btn-secondary" style="font-size:12px;padding:5px 10px">Dossier</a>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}
  </div></body></html>`)
})

// ── GET /medecin/patients/:id ──────────────────────────────
medecinRoutes.get('/patients/:id', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const id = c.req.param('id')

  const [patientRes, consultRes, ordRes, examRes] = await Promise.all([
    sb.from('patient_dossiers').select('*, patient_contacts_urgence(*)').eq('id', id).single(),
    sb.from('medical_consultations').select('id, created_at, motif, diagnostic_principal, type_consultation').eq('patient_id', id).order('created_at', {ascending:false}).limit(10),
    sb.from('medical_ordonnances').select('id, numero_ordonnance, statut, created_at').eq('patient_id', id).order('created_at', {ascending:false}).limit(5),
    sb.from('medical_examens').select('id, nom_examen, type_examen, statut, created_at').eq('patient_id', id).order('created_at', {ascending:false}).limit(5),
  ])

  const patient = patientRes.data
  if (!patient) return c.redirect('/medecin/patients')

  const age = Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (1000*60*60*24*365.25))
  const allergies = Array.isArray(patient.allergies) ? patient.allergies : []
  const maladies  = Array.isArray(patient.maladies_chroniques) ? patient.maladies_chroniques : []

  return c.html(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — ${patient.prenom} ${patient.nom}</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → <a href="/medecin/patients">Patients</a> → ${patient.prenom} ${patient.nom}</div>

    <div style="background:#4A148C;border-radius:14px;padding:20px 24px;margin-bottom:24px;color:white">
      <div style="font-size:11px;opacity:.7;margin-bottom:4px">${patient.numero_national}</div>
      <div style="font-family:'DM Serif Display',serif;font-size:24px;margin-bottom:8px">${patient.prenom} ${patient.nom}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <span style="background:rgba(255,255,255,.2);padding:4px 12px;border-radius:20px;font-size:12px">${age} ans</span>
        <span style="background:rgba(255,255,255,.2);padding:4px 12px;border-radius:20px;font-size:12px">${patient.sexe === 'M' ? '♂ Homme' : '♀ Femme'}</span>
        <span style="background:white;color:#B71C1C;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700">🩸 ${patient.groupe_sanguin}${patient.rhesus}</span>
      </div>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap">
      <a href="/medecin/consultations/nouvelle?patient_id=${id}" class="btn-primary">📋 Nouvelle consultation</a>
      <a href="/medecin/ordonnances/nouvelle?patient_id=${id}" class="btn-primary" style="background:#1A6B3C">💊 Nouvelle ordonnance</a>
      <a href="/medecin/examens/nouveau?patient_id=${id}" class="btn-secondary">🧪 Prescrire examen</a>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div class="card card-body">
        <h4 style="font-size:12px;font-weight:700;color:#9E9E9E;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">⚠️ Allergies</h4>
        ${allergies.length === 0 ? '<p style="color:#9E9E9E;font-size:13px;font-style:italic">Aucune</p>'
          : allergies.map((a: any) => `<span style="display:inline-block;background:#FFF5F5;color:#B71C1C;border:1px solid #FFCDD2;padding:3px 10px;border-radius:20px;font-size:12px;margin:2px">${a.substance||a}</span>`).join('')}
      </div>
      <div class="card card-body">
        <h4 style="font-size:12px;font-weight:700;color:#9E9E9E;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">🏥 Maladies chroniques</h4>
        ${maladies.length === 0 ? '<p style="color:#9E9E9E;font-size:13px;font-style:italic">Aucune</p>'
          : maladies.map((m: any) => `<span style="display:inline-block;background:#FFF3E0;color:#E65100;border:1px solid #FFE0B2;padding:3px 10px;border-radius:20px;font-size:12px;margin:2px">${m.maladie||m}</span>`).join('')}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div style="padding:14px 18px;background:#4A148C;display:flex;justify-content:space-between;align-items:center">
          <h3 style="font-size:13px;color:white;font-weight:600">📋 Consultations récentes</h3>
          <a href="/medecin/consultations?patient_id=${id}" style="font-size:12px;color:rgba(255,255,255,.75);text-decoration:none">Voir tout</a>
        </div>
        ${(consultRes.data ?? []).length === 0 ? '<div class="empty">Aucune consultation</div>'
          : (consultRes.data ?? []).map((c: any) => `
            <div style="padding:12px 16px;border-bottom:1px solid #F5F5F5">
              <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                <span style="font-size:12px;font-weight:600;color:#4A148C">${c.type_consultation}</span>
                <span style="font-size:11px;color:#9E9E9E">${new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              <div style="font-size:13px">${c.motif||''}</div>
              ${c.diagnostic_principal ? `<div style="font-size:12px;color:#4A148C">→ ${c.diagnostic_principal}</div>` : ''}
            </div>`).join('')}
      </div>
      <div class="card">
        <div style="padding:14px 18px;background:#1A6B3C;display:flex;justify-content:space-between;align-items:center">
          <h3 style="font-size:13px;color:white;font-weight:600">💊 Ordonnances</h3>
          <a href="/medecin/ordonnances?patient_id=${id}" style="font-size:12px;color:rgba(255,255,255,.75);text-decoration:none">Voir tout</a>
        </div>
        ${(ordRes.data ?? []).length === 0 ? '<div class="empty">Aucune ordonnance</div>'
          : (ordRes.data ?? []).map((o: any) => `
            <div style="padding:12px 16px;border-bottom:1px solid #F5F5F5;display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-size:12px;font-family:monospace;color:#1A6B3C">${o.numero_ordonnance}</div>
                <div style="font-size:11px;color:#9E9E9E">${new Date(o.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
              <span class="badge-statut ${o.statut}">${o.statut}</span>
            </div>`).join('')}
      </div>
    </div>
  </div></body></html>`)
})

// ── GET /medecin/consultations/nouvelle ────────────────────
medecinRoutes.get('/consultations/nouvelle', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.query('patient_id')

  let patient: any = null
  if (patientId) {
    const { data } = await sb.from('patient_dossiers').select('id, nom, prenom, date_naissance, sexe, groupe_sanguin, rhesus, allergies').eq('id', patientId).single()
    patient = data
  }

  return c.html(consultationFormPage(profil, patient))
})

// ── POST /medecin/consultations/nouvelle ───────────────────
medecinRoutes.post('/consultations/nouvelle', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const body = await c.req.parseBody()

  const patientId = String(body.patient_id ?? '')
  if (!patientId) return c.redirect('/medecin/patients')

  const { data: consultation, error } = await sb
    .from('medical_consultations')
    .insert({
      patient_id:            patientId,
      medecin_id:            profil.id,
      structure_id:          profil.structure_id,
      type_consultation:     String(body.type_consultation ?? 'normale'),
      motif:                 String(body.motif ?? ''),
      anamnese:              String(body.anamnese ?? '') || null,
      examen_clinique:       String(body.examen_clinique ?? '') || null,
      diagnostic_principal:  String(body.diagnostic_principal ?? '') || null,
      conclusion:            String(body.conclusion ?? '') || null,
      conduite_a_tenir:      String(body.conduite_a_tenir ?? '') || null,
      notes_confidentielles: String(body.notes_confidentielles ?? '') || null,
      est_urgence:           body.type_consultation === 'urgence',
    })
    .select('id')
    .single()

  if (error || !consultation) {
    const { data: patient } = await sb.from('patient_dossiers').select('id, nom, prenom, date_naissance, sexe, groupe_sanguin, rhesus, allergies').eq('id', patientId).single()
    return c.html(consultationFormPage(profil, patient, 'Erreur : ' + (error?.message ?? 'Inconnue')))
  }

  // Sauvegarder les constantes si renseignées
  const poids = parseFloat(String(body.poids ?? '')) || null
  const taille = parseFloat(String(body.taille ?? '')) || null
  if (poids || taille || body.tension_sys || body.temperature) {
    await sb.from('medical_constantes').insert({
      consultation_id:     consultation.id,
      patient_id:          patientId,
      prise_par:           profil.id,
      tension_systolique:  parseInt(String(body.tension_sys ?? '')) || null,
      tension_diastolique: parseInt(String(body.tension_dia ?? '')) || null,
      temperature:         parseFloat(String(body.temperature ?? '')) || null,
      pouls:               parseInt(String(body.pouls ?? '')) || null,
      saturation_o2:       parseInt(String(body.spo2 ?? '')) || null,
      poids,
      taille,
    })
  }

  return c.redirect(`/medecin/patients/${patientId}?consult=ok`)
})

// ── GET /medecin/ordonnances/nouvelle ──────────────────────
medecinRoutes.get('/ordonnances/nouvelle', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.query('patient_id')

  let patient: any = null
  if (patientId) {
    const { data } = await sb.from('patient_dossiers').select('id, nom, prenom, date_naissance, sexe').eq('id', patientId).single()
    patient = data
  }

  return c.html(ordonnanceFormPage(profil, patient))
})

// ── POST /medecin/ordonnances/nouvelle ─────────────────────
medecinRoutes.post('/ordonnances/nouvelle', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const body = await c.req.parseBody()

  const patientId = String(body.patient_id ?? '')
  if (!patientId) return c.redirect('/medecin/patients')

  // Créer l'ordonnance (numéro auto par trigger)
  const dateExp = new Date()
  dateExp.setMonth(dateExp.getMonth() + 3)

  const { data: ordonnance, error } = await sb
    .from('medical_ordonnances')
    .insert({
      patient_id:      patientId,
      medecin_id:      profil.id,
      structure_id:    profil.structure_id,
      statut:          'active',
      date_expiration: dateExp.toISOString(),
    })
    .select('id, numero_ordonnance')
    .single()

  if (error || !ordonnance) return c.redirect(`/medecin/patients/${patientId}`)

  // Insérer les lignes médicaments
  const medicaments = JSON.parse(String(body.medicaments ?? '[]'))
  if (medicaments.length > 0) {
    await sb.from('medical_ordonnance_lignes').insert(
      medicaments.map((m: any, i: number) => ({
        ordonnance_id:          ordonnance.id,
        ordre:                  i + 1,
        medicament_nom:         m.nom,
        medicament_forme:       m.forme || 'comprimé',
        dosage:                 m.dosage,
        frequence:              m.frequence,
        duree:                  m.duree,
        instructions_speciales: m.instructions || null,
      }))
    )
  }

  return c.redirect(`/medecin/patients/${patientId}?ord=ok`)
})

// ── GET /medecin/examens/nouveau ───────────────────────────
medecinRoutes.get('/examens/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.query('patient_id')

  let patient: any = null
  if (patientId) {
    const { data } = await sb.from('patient_dossiers').select('id, nom, prenom').eq('id', patientId).single()
    patient = data
  }

  return c.html(examenFormPage(profil, patient))
})

// ── POST /medecin/examens/nouveau ──────────────────────────
medecinRoutes.post('/examens/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const body = await c.req.parseBody()

  const patientId = String(body.patient_id ?? '')
  await sb.from('medical_examens').insert({
    patient_id:    patientId,
    prescrit_par:  profil.id,
    structure_id:  profil.structure_id,
    type_examen:   String(body.type_examen ?? 'autre'),
    nom_examen:    String(body.nom_examen ?? ''),
    motif:         String(body.motif ?? '') || null,
    est_urgent:    body.est_urgent === 'true',
    statut:        'prescrit',
  })

  return c.redirect(`/medecin/patients/${patientId}?exam=ok`)
})

// ── GET /medecin/rdv ───────────────────────────────────────
medecinRoutes.get('/rdv', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const today = new Date().toISOString().split('T')[0]
  const { data: rdvs } = await sb
    .from('medical_rendez_vous')
    .select(`id, date_heure, motif, statut, duree_minutes, patient_dossiers(nom, prenom, numero_national)`)
    .eq('medecin_id', profil.id)
    .gte('date_heure', today + 'T00:00:00')
    .order('date_heure')
    .limit(30)

  return c.html(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Mes RDV</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → Planning</div>
    <div class="page-title">Mon planning</div>
    <div class="card">
      <table>
        <thead><tr><th>Heure</th><th>Patient</th><th>Motif</th><th>Durée</th><th>Statut</th></tr></thead>
        <tbody>
          ${(rdvs ?? []).length === 0 ? '<tr><td colspan="5" class="empty">Aucun rendez-vous à venir</td></tr>'
            : (rdvs ?? []).map((r: any) => `
              <tr>
                <td><strong style="color:#4A148C">${new Date(r.date_heure).toLocaleString('fr-FR',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</strong></td>
                <td>${r.patient_dossiers?.prenom} ${r.patient_dossiers?.nom}</td>
                <td>${r.motif||'—'}</td>
                <td>${r.duree_minutes} min</td>
                <td><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#EDE7F6;color:#4A148C">${r.statut}</span></td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div></body></html>`)
})

// ══════════════════════════════════════════════════════════
// PAGES FORMULAIRES
// ══════════════════════════════════════════════════════════

function consultationFormPage(profil: AuthProfile, patient: any, erreur?: string): string {
  const age = patient ? Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (1000*60*60*24*365.25)) : 0
  const allergies = patient && Array.isArray(patient.allergies) ? patient.allergies.map((a: any) => a.substance||a).join(', ') : ''

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Nouvelle consultation</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → <a href="/medecin/patients">Patients</a> → Nouvelle consultation</div>
    <div class="page-title">Nouvelle consultation</div>
    ${erreur ? `<div class="alerte-err">⚠️ ${erreur}</div>` : ''}
    ${patient ? `
    <div class="patient-mini">
      <div style="font-size:28px">👤</div>
      <div>
        <div class="pm-nom">${patient.prenom} ${patient.nom}</div>
        <div class="pm-info">${age} ans · ${patient.sexe === 'M' ? 'Homme' : 'Femme'}</div>
        ${allergies ? `<div style="margin-top:4px;font-size:12px;color:#B71C1C">⚠️ Allergies : ${allergies}</div>` : ''}
      </div>
      <span class="pm-tag" style="margin-left:auto">🩸 ${patient.groupe_sanguin}${patient.rhesus}</span>
    </div>` : ''}

    <div class="card card-body">
      <form method="POST" action="/medecin/consultations/nouvelle">
        <input type="hidden" name="patient_id" value="${patient?.id ?? ''}">

        <div class="form-grid">
          <div class="form-group">
            <label>Type de consultation *</label>
            <select name="type_consultation" required>
              <option value="normale">Consultation normale</option>
              <option value="urgence">Urgence</option>
              <option value="suivi">Suivi</option>
              <option value="teleconsultation">Téléconsultation</option>
            </select>
          </div>
          <div class="form-group">
            <label>Motif de consultation *</label>
            <input type="text" name="motif" placeholder="Ex: Douleur thoracique depuis 3 jours" required>
          </div>
        </div>

        <div class="section-title">📊 Constantes vitales (optionnel)</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Tension artérielle (sys / dia mmHg)</label>
            <div style="display:flex;gap:8px">
              <input type="number" name="tension_sys" placeholder="120" min="60" max="250" style="width:50%">
              <input type="number" name="tension_dia" placeholder="80" min="40" max="150" style="width:50%">
            </div>
          </div>
          <div class="form-group">
            <label>Température (°C)</label>
            <input type="number" name="temperature" placeholder="37.0" step="0.1" min="34" max="42">
          </div>
          <div class="form-group">
            <label>Pouls (bpm)</label>
            <input type="number" name="pouls" placeholder="72" min="30" max="200">
          </div>
          <div class="form-group">
            <label>SpO2 (%)</label>
            <input type="number" name="spo2" placeholder="98" min="50" max="100">
          </div>
          <div class="form-group">
            <label>Poids (kg)</label>
            <input type="number" name="poids" placeholder="70.0" step="0.1" min="1" max="300">
          </div>
          <div class="form-group">
            <label>Taille (cm)</label>
            <input type="number" name="taille" placeholder="170" min="30" max="250">
          </div>
        </div>

        <div class="section-title">📋 Anamnèse et examen</div>
        <div class="form-grid">
          <div class="form-group full">
            <label>Anamnèse (histoire de la maladie)</label>
            <textarea name="anamnese" placeholder="Décrivez chronologiquement l'histoire de la maladie..." rows="4"></textarea>
          </div>
          <div class="form-group full">
            <label>Examen clinique</label>
            <textarea name="examen_clinique" placeholder="Résultats de l'examen physique..." rows="3"></textarea>
          </div>
          <div class="form-group full">
            <label>Diagnostic principal</label>
            <input type="text" name="diagnostic_principal" placeholder="Ex: Pneumonie lobaire droite, Diabète T2 décompensé">
          </div>
          <div class="form-group full">
            <label>Conclusion et conduite à tenir</label>
            <textarea name="conduite_a_tenir" placeholder="Traitement prescrit, examens demandés, orientation..." rows="3"></textarea>
          </div>
          <div class="form-group full">
            <label>Notes confidentielles <small style="font-weight:400;color:#9E9E9E">(non visibles par le patient)</small></label>
            <textarea name="notes_confidentielles" placeholder="Notes privées pour le médecin uniquement..." rows="2"></textarea>
          </div>
        </div>

        <div class="form-actions">
          <a href="/medecin/patients${patient ? '/'+patient.id : ''}" class="btn-secondary">Annuler</a>
          <button type="submit" class="btn-primary">Enregistrer la consultation →</button>
        </div>
      </form>
    </div>
  </div></body></html>`
}

function ordonnanceFormPage(profil: AuthProfile, patient: any, erreur?: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Nouvelle ordonnance</title>${CSS}
  <style>
    .med-ligne{background:#F9FAFB;border:1px solid #E0E0E0;border-radius:10px;padding:16px;margin-bottom:12px;position:relative}
    .med-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:10px}
    .btn-add{background:#E8F5E9;color:#1A6B3C;border:1px dashed #1A6B3C;padding:10px;border-radius:8px;width:100%;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
    .btn-del{position:absolute;top:8px;right:8px;background:none;border:none;color:#9E9E9E;cursor:pointer;font-size:16px}
  </style>
  </head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → Nouvelle ordonnance</div>
    <div class="page-title">Nouvelle ordonnance</div>
    ${erreur ? `<div class="alerte-err">⚠️ ${erreur}</div>` : ''}
    ${patient ? `
    <div class="patient-mini">
      <div style="font-size:28px">👤</div>
      <div>
        <div class="pm-nom">${patient.prenom} ${patient.nom}</div>
        <div class="pm-info">${patient.sexe === 'M' ? 'Homme' : 'Femme'}</div>
      </div>
    </div>` : ''}

    <div class="card card-body">
      <form method="POST" action="/medecin/ordonnances/nouvelle" id="ordForm">
        <input type="hidden" name="patient_id" value="${patient?.id ?? ''}">
        <input type="hidden" name="medicaments" id="medicamentsJson" value="[]">

        <div id="lignes"></div>
        <button type="button" class="btn-add" onclick="ajouterLigne()">+ Ajouter un médicament</button>

        <div class="form-actions">
          <a href="/medecin/patients${patient ? '/'+patient.id : ''}" class="btn-secondary">Annuler</a>
          <button type="submit" class="btn-primary" onclick="preparerJson()">Enregistrer l'ordonnance →</button>
        </div>
      </form>
    </div>
  </div>
  <script>
    let count = 0
    function ajouterLigne() {
      count++
      const div = document.createElement('div')
      div.className = 'med-ligne'
      div.id = 'ligne-' + count
      div.innerHTML = \`
        <button type="button" class="btn-del" onclick="document.getElementById('ligne-\${count}').remove()">✕</button>
        <div style="font-size:12px;font-weight:700;color:#4A148C;margin-bottom:10px">Médicament \${count}</div>
        <div class="med-grid">
          <div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Médicament *</label>
            <input type="text" class="med-nom" placeholder="Ex: Amoxicilline 500mg" required></div>
          <div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Dosage</label>
            <input type="text" class="med-dosage" placeholder="Ex: 500mg"></div>
          <div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Fréquence</label>
            <input type="text" class="med-freq" placeholder="Ex: 3x/jour"></div>
          <div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Durée</label>
            <input type="text" class="med-duree" placeholder="Ex: 7 jours"></div>
        </div>
        <div style="margin-top:8px">
          <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Instructions spéciales</label>
          <input type="text" class="med-instructions" placeholder="Ex: Prendre pendant le repas, éviter l'alcool">
        </div>\`
      document.getElementById('lignes').appendChild(div)
    }

    function preparerJson() {
      const lignes = document.querySelectorAll('.med-ligne')
      const meds = Array.from(lignes).map(l => ({
        nom:          l.querySelector('.med-nom').value,
        dosage:       l.querySelector('.med-dosage').value,
        frequence:    l.querySelector('.med-freq').value,
        duree:        l.querySelector('.med-duree').value,
        instructions: l.querySelector('.med-instructions').value,
        forme:        'comprimé',
      })).filter(m => m.nom)
      document.getElementById('medicamentsJson').value = JSON.stringify(meds)
    }

    // Ajouter une ligne par défaut
    ajouterLigne()
  </script>
  </body></html>`
}

function examenFormPage(profil: AuthProfile, patient: any): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Prescrire examen</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → Prescrire examen</div>
    <div class="page-title">Prescrire un examen</div>
    ${patient ? `
    <div class="patient-mini">
      <div style="font-size:28px">👤</div>
      <div><div class="pm-nom">${patient.prenom} ${patient.nom}</div></div>
    </div>` : ''}
    <div class="card card-body">
      <form method="POST" action="/medecin/examens/nouveau">
        <input type="hidden" name="patient_id" value="${patient?.id ?? ''}">
        <div class="form-grid">
          <div class="form-group">
            <label>Type d'examen *</label>
            <select name="type_examen" required>
              <option value="biologie">Biologie / Laboratoire</option>
              <option value="radiologie">Radiologie</option>
              <option value="echographie">Échographie</option>
              <option value="ecg">ECG / Cardiologie</option>
              <option value="endoscopie">Endoscopie</option>
              <option value="anatomopathologie">Anatomopathologie</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div class="form-group">
            <label>Nom de l'examen *</label>
            <input type="text" name="nom_examen" placeholder="Ex: NFS, Radio thorax, Écho abdominale" required>
          </div>
          <div class="form-group full">
            <label>Motif / Indication clinique</label>
            <input type="text" name="motif" placeholder="Ex: Suspicion pneumonie, Bilan diabète">
          </div>
          <div class="form-group">
            <label>Urgence</label>
            <select name="est_urgent">
              <option value="false">Non urgent</option>
              <option value="true">URGENT — Résultat demandé rapidement</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <a href="/medecin/patients${patient ? '/'+patient.id : ''}" class="btn-secondary">Annuler</a>
          <button type="submit" class="btn-primary">Prescrire l'examen →</button>
        </div>
      </form>
    </div>
  </div></body></html>`
}
