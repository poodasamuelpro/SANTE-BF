// src/routes/medecin.ts
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import type { AuthProfile } from '../lib/supabase'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }

export const medecinRoutes = new Hono<{ Bindings: Bindings }>()

// Middleware d'authentification et de rôle (médecin ou assimilés)
medecinRoutes.use('/*', requireAuth, requireRole('medecin', 'infirmier', 'sage_femme', 'laborantin', 'radiologue'))

// ─────────────────────────────────────────────────────────────
// DASHBOARD PRINCIPAL (page d'accueil du médecin)
// ─────────────────────────────────────────────────────────────
medecinRoutes.get('/dashboard', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  // Récupération des données pour le dashboard
  const [
    rdvJourRes,
    consultationsJourRes,
    ordonnancesActivesRes,
    rdvAVenirRes,
    consultationsRecentesRes,
    patientsConsentementRes
  ] = await Promise.all([
    // RDV du jour
    sb.from('medical_rendez_vous')
      .select('id, date_heure, motif, statut, duree_minutes, patient_dossiers(nom, prenom, numero_national)')
      .eq('medecin_id', profil.id)
      .gte('date_heure', today + 'T00:00:00')
      .lt('date_heure', today + 'T23:59:59')
      .order('date_heure'),

    // Consultations du jour
    sb.from('medical_consultations')
      .select('id', { count: 'exact', head: true })
      .eq('medecin_id', profil.id)
      .gte('date_heure', today + 'T00:00:00')
      .lt('date_heure', today + 'T23:59:59'),

    // Ordonnances actives émises par ce médecin
    sb.from('medical_ordonnances')
      .select('id', { count: 'exact', head: true })
      .eq('medecin_id', profil.id)
      .eq('statut', 'active'),

    // RDV à venir (futurs)
    sb.from('medical_rendez_vous')
      .select('id', { count: 'exact', head: true })
      .eq('medecin_id', profil.id)
      .gte('date_heure', now),

    // Dernières consultations (5)
    sb.from('medical_consultations')
      .select('id, created_at, motif, diagnostic_principal, type_consultation, patient_dossiers(nom, prenom)')
      .eq('medecin_id', profil.id)
      .order('created_at', { ascending: false })
      .limit(5),

    // Nombre de patients avec consentement actif pour ce médecin
    sb.from('patient_consentements')
      .select('patient_id', { count: 'exact', head: true })
      .eq('medecin_id', profil.id)
      .eq('est_actif', true)
  ])

  const data = {
    rdvJour: rdvJourRes.data ?? [],
    consultationsJour: consultationsJourRes.count ?? 0,
    ordonnancesActives: ordonnancesActivesRes.count ?? 0,
    rdvAVenir: rdvAVenirRes.count ?? 0,
    consultationsRecentes: consultationsRecentesRes.data ?? [],
    nbPatientsConsentement: patientsConsentementRes.count ?? 0
  }

  const { dashboardMedecinPage } = await import('../pages/dashboard-medecin')
  return c.html(dashboardMedecinPage(profil, data))
})

// ─────────────────────────────────────────────────────────────
// RECHERCHE PATIENTS
// ─────────────────────────────────────────────────────────────
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
    const { data: consentements } = await sb
      .from('patient_consentements')
      .select(`
        patient_dossiers ( id, numero_national, nom, prenom, date_naissance, sexe, groupe_sanguin, rhesus )
      `)
      .eq('medecin_id', profil.id)
      .eq('est_actif', true)
    patients = (consentements ?? []).map((c: any) => c.patient_dossiers).filter(Boolean)
  }

  const age = (ddn: string) => Math.floor((Date.now() - new Date(ddn).getTime()) / (1000 * 60 * 60 * 24 * 365.25))

  const { patientsListPage } = await import('../pages/medecin-patients')
  return c.html(patientsListPage(profil, patients, q, age))
})

// ─────────────────────────────────────────────────────────────
// FICHE PATIENT (avec gestion consentement / urgence)
// ─────────────────────────────────────────────────────────────
medecinRoutes.get('/patients/:id', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const id = c.req.param('id')

  // Vérifier consentement actif
  const { data: consent } = await sb
    .from('patient_consentements')
    .select('id')
    .eq('medecin_id', profil.id)
    .eq('patient_id', id)
    .eq('est_actif', true)
    .maybeSingle()

  let accesUrgence = false
  if (!consent) {
    const { data: urgence } = await sb
      .from('patient_acces_urgence')
      .select('id')
      .eq('patient_id', id)
      .eq('code_utilise', true)
      .gte('date_expiration', new Date().toISOString())
      .maybeSingle()
    accesUrgence = !!urgence
  }

  if (!consent && !accesUrgence) {
    return c.redirect('/medecin/patients?error=acces_refuse')
  }

  const [patientRes, consultRes, ordRes, examRes, hospitRes, chroniqueRes, grossesseRes] = await Promise.all([
    sb.from('patient_dossiers').select('*, patient_contacts_urgence(*)').eq('id', id).single(),
    sb.from('medical_consultations').select('id, created_at, motif, diagnostic_principal, type_consultation').eq('patient_id', id).order('created_at', { ascending: false }).limit(10),
    sb.from('medical_ordonnances').select('id, numero_ordonnance, statut, created_at').eq('patient_id', id).order('created_at', { ascending: false }).limit(5),
    sb.from('medical_examens').select('id, nom_examen, type_examen, statut, created_at').eq('patient_id', id).order('created_at', { ascending: false }).limit(5),
    sb.from('medical_hospitalisations').select('id, date_entree, date_sortie, service, diagnostic_entree').eq('patient_id', id).order('date_entree', { ascending: false }).limit(3),
    sb.from('spec_suivi_chronique').select('*').eq('patient_id', id).maybeSingle(),
    sb.from('spec_grossesses').select('*').eq('patient_id', id).maybeSingle()
  ])

  const patient = patientRes.data
  if (!patient) return c.redirect('/medecin/patients')

  const age = Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  const allergies = Array.isArray(patient.allergies) ? patient.allergies : []
  const maladies = Array.isArray(patient.maladies_chroniques) ? patient.maladies_chroniques : []

  const { patientFichePage } = await import('../pages/medecin-patient-fiche')
  return c.html(patientFichePage(profil, patient, age, allergies, maladies,
    consultRes.data ?? [], ordRes.data ?? [], examRes.data ?? [], hospitRes.data ?? [],
    chroniqueRes.data, grossesseRes.data, accesUrgence))
})

// ─────────────────────────────────────────────────────────────
// CONSULTATIONS
// ─────────────────────────────────────────────────────────────
// Formulaire nouvelle consultation
medecinRoutes.get('/consultations/nouvelle', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.query('patient_id')

  let patient: any = null
  if (patientId) {
    const { data } = await sb.from('patient_dossiers').select('id, nom, prenom, date_naissance, sexe, groupe_sanguin, rhesus, allergies').eq('id', patientId).single()
    patient = data
  }

  const { consultationFormPage } = await import('../pages/medecin-consultation-form')
  return c.html(consultationFormPage(profil, patient))
})

// Création consultation
medecinRoutes.post('/consultations/nouvelle', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const body = await c.req.parseBody()

  const patientId = String(body.patient_id ?? '')
  if (!patientId) return c.redirect('/medecin/patients')

  const { data: consultation, error } = await sb
    .from('medical_consultations')
    .insert({
      patient_id: patientId,
      medecin_id: profil.id,
      structure_id: profil.structure_id,
      type_consultation: String(body.type_consultation ?? 'normale'),
      motif: String(body.motif ?? ''),
      anamnese: String(body.anamnese ?? '') || null,
      examen_clinique: String(body.examen_clinique ?? '') || null,
      diagnostic_principal: String(body.diagnostic_principal ?? '') || null,
      conclusion: String(body.conclusion ?? '') || null,
      conduite_a_tenir: String(body.conduite_a_tenir ?? '') || null,
      notes_confidentielles: String(body.notes_confidentielles ?? '') || null,
      est_urgence: body.type_consultation === 'urgence',
    })
    .select('id')
    .single()

  if (error || !consultation) {
    return c.redirect(`/medecin/consultations/nouvelle?patient_id=${patientId}&error=insert`)
  }

  // Insertion des constantes
  const tensionSys = parseInt(String(body.tension_sys ?? ''))
  const tensionDia = parseInt(String(body.tension_dia ?? ''))
  const temperature = parseFloat(String(body.temperature ?? ''))
  const pouls = parseInt(String(body.pouls ?? ''))
  const spo2 = parseInt(String(body.spo2 ?? ''))
  const poids = parseFloat(String(body.poids ?? ''))
  const taille = parseFloat(String(body.taille ?? ''))

  if (tensionSys || tensionDia || temperature || pouls || spo2 || poids || taille) {
    await sb.from('medical_constantes').insert({
      consultation_id: consultation.id,
      patient_id: patientId,
      prise_par: profil.id,
      tension_systolique: tensionSys || null,
      tension_diastolique: tensionDia || null,
      temperature: temperature || null,
      pouls: pouls || null,
      saturation_o2: spo2 || null,
      poids: poids || null,
      taille: taille || null,
    })

    // Alertes automatiques (simples)
    const alertes = []
    if (tensionSys > 160) alertes.push('HTA sévère')
    if (tensionSys < 90) alertes.push('Hypotension')
    if (temperature > 38.5) alertes.push('Fièvre')
    if (spo2 < 92) alertes.push('Désaturation')
    if (alertes.length > 0) {
      // On peut stocker les alertes ou les passer en paramètre
      return c.redirect(`/medecin/patients/${patientId}?consult=ok&alertes=${encodeURIComponent(alertes.join(';'))}`)
    }
  }

  return c.redirect(`/medecin/patients/${patientId}?consult=ok`)
})

// Liste des consultations (générale ou par patient)
medecinRoutes.get('/consultations', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.query('patient_id')

  let query = sb
    .from('medical_consultations')
    .select('*, patient_dossiers(nom, prenom, numero_national)')
    .eq('medecin_id', profil.id)
    .order('created_at', { ascending: false })

  if (patientId) query = query.eq('patient_id', patientId)

  const { data: consultations } = await query.limit(50)

  const { consultationsListPage } = await import('../pages/medecin-consultations-list')
  return c.html(consultationsListPage(profil, consultations ?? [], patientId))
})

// ─────────────────────────────────────────────────────────────
// ORDONNANCES
// ─────────────────────────────────────────────────────────────
// Formulaire nouvelle ordonnance
medecinRoutes.get('/ordonnances/nouvelle', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.query('patient_id')

  let patient: any = null
  if (patientId) {
    const { data } = await sb.from('patient_dossiers').select('id, nom, prenom, date_naissance, sexe').eq('id', patientId).single()
    patient = data
  }

  const { ordonnanceFormPage } = await import('../pages/medecin-ordonnance-form')
  return c.html(ordonnanceFormPage(profil, patient))
})

// Création ordonnance
medecinRoutes.post('/ordonnances/nouvelle', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const body = await c.req.parseBody()

  const patientId = String(body.patient_id ?? '')
  if (!patientId) return c.redirect('/medecin/patients')

  const dateExp = new Date()
  dateExp.setMonth(dateExp.getMonth() + 3)

  const { data: ordonnance, error } = await sb
    .from('medical_ordonnances')
    .insert({
      patient_id: patientId,
      medecin_id: profil.id,
      structure_id: profil.structure_id,
      statut: 'active',
      date_expiration: dateExp.toISOString(),
    })
    .select('id, numero_ordonnance')
    .single()

  if (error || !ordonnance) {
    return c.redirect(`/medecin/ordonnances/nouvelle?patient_id=${patientId}&error=insert`)
  }

  const medicaments = JSON.parse(String(body.medicaments ?? '[]'))
  if (medicaments.length > 0) {
    await sb.from('medical_ordonnance_lignes').insert(
      medicaments.map((m: any, i: number) => ({
        ordonnance_id: ordonnance.id,
        ordre: i + 1,
        medicament_nom: m.nom,
        medicament_forme: m.forme || 'comprimé',
        dosage: m.dosage,
        frequence: m.frequence,
        duree: m.duree,
        instructions_speciales: m.instructions || null,
      }))
    )
  }

  // Génération du QR code (fonction à implémenter dans utils)
  // await generateQRCode(ordonnance.id, ordonnance.numero_ordonnance)

  return c.redirect(`/medecin/patients/${patientId}?ord=ok`)
})

// Liste des ordonnances
medecinRoutes.get('/ordonnances', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.query('patient_id')

  let query = sb
    .from('medical_ordonnances')
    .select('*, patient_dossiers(nom, prenom, numero_national)')
    .eq('medecin_id', profil.id)
    .order('created_at', { ascending: false })

  if (patientId) query = query.eq('patient_id', patientId)

  const { data: ordonnances } = await query.limit(50)

  const { ordonnancesListPage } = await import('../pages/medecin-ordonnances-list')
  return c.html(ordonnancesListPage(profil, ordonnances ?? [], patientId))
})

// Téléchargement PDF d'une ordonnance
medecinRoutes.get('/ordonnances/:id/pdf', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const id = c.req.param('id')

  const { data: ordonnance } = await sb
    .from('medical_ordonnances')
    .select('*, medical_ordonnance_lignes(*), patient_dossiers(*), auth_medecins(*)')
    .eq('id', id)
    .single()

  if (!ordonnance) return c.notFound()

  const { generateOrdonnancePDF } = await import('../utils/pdf')
  const pdfBuffer = await generateOrdonnancePDF(ordonnance)

  c.header('Content-Type', 'application/pdf')
  c.header('Content-Disposition', `inline; filename="ordonnance-${ordonnance.numero_ordonnance}.pdf"`)
  return c.body(pdfBuffer)
})

// ─────────────────────────────────────────────────────────────
// EXAMENS
// ─────────────────────────────────────────────────────────────
// Formulaire prescription examen
medecinRoutes.get('/examens/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.query('patient_id')

  let patient: any = null
  if (patientId) {
    const { data } = await sb.from('patient_dossiers').select('id, nom, prenom').eq('id', patientId).single()
    patient = data
  }

  const { examenFormPage } = await import('../pages/medecin-examen-form')
  return c.html(examenFormPage(profil, patient))
})

// Création examen
medecinRoutes.post('/examens/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const body = await c.req.parseBody()

  const patientId = String(body.patient_id ?? '')
  await sb.from('medical_examens').insert({
    patient_id: patientId,
    prescrit_par: profil.id,
    structure_id: profil.structure_id,
    type_examen: String(body.type_examen ?? 'autre'),
    nom_examen: String(body.nom_examen ?? ''),
    motif: String(body.motif ?? '') || null,
    est_urgent: body.est_urgent === 'true',
    statut: 'prescrit',
  })

  return c.redirect(`/medecin/patients/${patientId}?exam=ok`)
})

// Liste des examens prescrits
medecinRoutes.get('/examens', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.query('patient_id')

  let query = sb
    .from('medical_examens')
    .select('*, patient_dossiers(nom, prenom, numero_national)')
    .eq('prescrit_par', profil.id)
    .order('created_at', { ascending: false })

  if (patientId) query = query.eq('patient_id', patientId)

  const { data: examens } = await query.limit(50)

  const { examensListPage } = await import('../pages/medecin-examens-list')
  return c.html(examensListPage(profil, examens ?? [], patientId))
})

// Détail d'un examen (résultats)
medecinRoutes.get('/examens/:id', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const id = c.req.param('id')

  const { data: examen } = await sb
    .from('medical_examens')
    .select('*, patient_dossiers(*)')
    .eq('id', id)
    .single()

  if (!examen) return c.notFound()

  const { examenDetailPage } = await import('../pages/medecin-examen-detail')
  return c.html(examenDetailPage(profil, examen))
})

// ─────────────────────────────────────────────────────────────
// RENDEZ-VOUS
// ─────────────────────────────────────────────────────────────
// Liste des RDV (planning)
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
    .limit(50)

  const { rdvListPage } = await import('../pages/medecin-rdv-list')
  return c.html(rdvListPage(profil, rdvs ?? []))
})

// Formulaire nouveau RDV
medecinRoutes.get('/rdv/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.query('patient_id')

  let patient: any = null
  if (patientId) {
    const { data } = await sb.from('patient_dossiers').select('id, nom, prenom').eq('id', patientId).single()
    patient = data
  }

  const { rdvFormPage } = await import('../pages/medecin-rdv-form')
  return c.html(rdvFormPage(profil, patient))
})

// Création RDV
medecinRoutes.post('/rdv/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const body = await c.req.parseBody()

  const patientId = String(body.patient_id ?? '')
  if (!patientId) return c.redirect('/medecin/patients')

  const dateHeure = String(body.date_heure ?? '')
  if (!dateHeure) return c.redirect('/medecin/rdv/nouveau?error=date_requise')

  await sb.from('medical_rendez_vous').insert({
    patient_id: patientId,
    medecin_id: profil.id,
    structure_id: profil.structure_id,
    date_heure: dateHeure,
    motif: String(body.motif ?? ''),
    duree_minutes: parseInt(String(body.duree ?? '30')) || 30,
    statut: 'planifie',
  })

  // Notification au patient (à implémenter)
  // await envoyerNotificationRdv(patientId, dateHeure)

  return c.redirect('/medecin/rdv')
})

// Mise à jour du statut d'un RDV
medecinRoutes.post('/rdv/:id/statut', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const id = c.req.param('id')
  const body = await c.req.parseBody()
  const statut = String(body.statut ?? '')

  if (['planifie', 'confirme', 'annule', 'passe', 'absent'].includes(statut)) {
    await sb.from('medical_rendez_vous').update({ statut }).eq('id', id).eq('medecin_id', profil.id)
  }

  return c.redirect('/medecin/rdv')
})

// ─────────────────────────────────────────────────────────────
// HOSPITALISATIONS
// ─────────────────────────────────────────────────────────────
// Liste des hospitalisations en cours
medecinRoutes.get('/hospitalisations', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const { data: hospits } = await sb
    .from('medical_hospitalisations')
    .select('*, patient_dossiers(nom, prenom, numero_national)')
    .eq('medecin_referent', profil.id)
    .is('date_sortie', null) // en cours
    .order('date_entree', { ascending: false })

  const { hospitalisationsListPage } = await import('../pages/medecin-hospitalisations-list')
  return c.html(hospitalisationsListPage(profil, hospits ?? []))
})

// Formulaire admission
medecinRoutes.get('/hospitalisations/nouvelle', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.query('patient_id')

  let patient: any = null
  if (patientId) {
    const { data } = await sb.from('patient_dossiers').select('id, nom, prenom').eq('id', patientId).single()
    patient = data
  }

  const { hospitFormPage } = await import('../pages/medecin-hospitalisation-form')
  return c.html(hospitFormPage(profil, patient))
})

// Création hospitalisation
medecinRoutes.post('/hospitalisations/nouvelle', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const body = await c.req.parseBody()

  const patientId = String(body.patient_id ?? '')
  if (!patientId) return c.redirect('/medecin/patients')

  const { data: hospit } = await sb
    .from('medical_hospitalisations')
    .insert({
      patient_id: patientId,
      medecin_referent: profil.id,
      structure_id: profil.structure_id,
      service: String(body.service ?? ''),
      lit_id: body.lit_id ? parseInt(String(body.lit_id)) : null,
      date_entree: new Date().toISOString(),
      diagnostic_entree: String(body.diagnostic_entree ?? ''),
      motif: String(body.motif ?? ''),
    })
    .select('id')
    .single()

  return c.redirect(`/medecin/hospitalisations/${hospit?.id}`)
})

// Détail d'une hospitalisation
medecinRoutes.get('/hospitalisations/:id', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const id = c.req.param('id')

  const { data: hospit } = await sb
    .from('medical_hospitalisations')
    .select('*, patient_dossiers(*)')
    .eq('id', id)
    .single()

  if (!hospit) return c.notFound()

  const { data: evolutions } = await sb
    .from('medical_hospitalisation_evolutions')
    .select('*')
    .eq('hospitalisation_id', id)
    .order('date', { ascending: false })

  const { hospitDetailPage } = await import('../pages/medecin-hospitalisation-detail')
  return c.html(hospitDetailPage(profil, hospit, evolutions ?? []))
})

// Ajouter une note d'évolution
medecinRoutes.post('/hospitalisations/:id/evolution', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const id = c.req.param('id')
  const body = await c.req.parseBody()

  await sb.from('medical_hospitalisation_evolutions').insert({
    hospitalisation_id: id,
    date: new Date().toISOString(),
    note: String(body.note ?? ''),
    auteur_id: profil.id,
  })

  return c.redirect(`/medecin/hospitalisations/${id}`)
})

// Sortie d'hospitalisation
medecinRoutes.post('/hospitalisations/:id/sortie', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const id = c.req.param('id')
  const body = await c.req.parseBody()

  await sb
    .from('medical_hospitalisations')
    .update({
      date_sortie: new Date().toISOString(),
      rapport_sortie_url: body.rapport_url || null,
      diagnostic_sortie: String(body.diagnostic_sortie ?? ''),
    })
    .eq('id', id)

  return c.redirect(`/medecin/hospitalisations/${id}`)
})

// ─────────────────────────────────────────────────────────────
// TRANSFERTS
// ─────────────────────────────────────────────────────────────
// Formulaire transfert
medecinRoutes.get('/transferts/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.query('patient_id')

  let patient: any = null
  if (patientId) {
    const { data } = await sb.from('patient_dossiers').select('id, nom, prenom').eq('id', patientId).single()
    patient = data
  }

  const { data: structures } = await sb.from('structures_sante').select('id, nom')

  const { transfertFormPage } = await import('../pages/medecin-transfert-form')
  return c.html(transfertFormPage(profil, patient, structures ?? []))
})

// Création transfert
medecinRoutes.post('/transferts/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const body = await c.req.parseBody()

  const patientId = String(body.patient_id ?? '')
  if (!patientId) return c.redirect('/medecin/patients')

  await sb.from('medical_transferts').insert({
    patient_id: patientId,
    structure_source_id: profil.structure_id,
    structure_destination_id: parseInt(String(body.structure_destination_id)),
    medecin_demandeur_id: profil.id,
    motif: String(body.motif ?? ''),
    resume_clinique: String(body.resume_clinique ?? ''),
    etat_patient: String(body.etat_patient ?? 'stable'),
    date_demande: new Date().toISOString(),
    statut: 'en_attente',
  })

  return c.redirect(`/medecin/patients/${patientId}?transfert=ok`)
})

// ─────────────────────────────────────────────────────────────
// SUIVI MALADIES CHRONIQUES
// ─────────────────────────────────────────────────────────────
// Consultation ou création d'un suivi chronique
medecinRoutes.get('/chroniques/:patientId', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.param('patientId')

  const { data: chronique } = await sb
    .from('spec_suivi_chronique')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle()

  if (!chronique) {
    return c.redirect(`/medecin/chroniques/${patientId}/nouveau`)
  }

  const { data: bilans } = await sb
    .from('spec_suivi_chronique_bilans')
    .select('*')
    .eq('suivi_id', chronique.id)
    .order('date', { ascending: false })

  const { chroniqueDetailPage } = await import('../pages/medecin-chronique-detail')
  return c.html(chroniqueDetailPage(profil, chronique, bilans ?? []))
})

// Formulaire création suivi chronique
medecinRoutes.get('/chroniques/:patientId/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.param('patientId')

  const { data: patient } = await sb.from('patient_dossiers').select('id, nom, prenom').eq('id', patientId).single()

  const { chroniqueFormPage } = await import('../pages/medecin-chronique-form')
  return c.html(chroniqueFormPage(profil, patient))
})

// Création suivi chronique
medecinRoutes.post('/chroniques/:patientId/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.param('patientId')
  const body = await c.req.parseBody()

  await sb.from('spec_suivi_chronique').insert({
    patient_id: patientId,
    medecin_traitant_id: profil.id,
    type_maladie: String(body.type_maladie ?? ''),
    objectifs: body.objectifs ? JSON.parse(String(body.objectifs)) : null,
  })

  return c.redirect(`/medecin/chroniques/${patientId}`)
})

// Ajout d'un bilan
medecinRoutes.post('/chroniques/:suiviId/bilans', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const suiviId = c.req.param('suiviId')
  const body = await c.req.parseBody()

  await sb.from('spec_suivi_chronique_bilans').insert({
    suivi_id: suiviId,
    date: new Date().toISOString(),
    valeurs: body.valeurs ? JSON.parse(String(body.valeurs)) : {},
  })

  return c.redirect(`/medecin/chroniques/${suiviId}`)
})

// ─────────────────────────────────────────────────────────────
// SUIVI GROSSESSE
// ─────────────────────────────────────────────────────────────
// Consultation ou création d'un suivi grossesse
medecinRoutes.get('/grossesse/:patientId', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.param('patientId')

  const { data: grossesse } = await sb
    .from('spec_grossesses')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle()

  if (!grossesse) {
    return c.redirect(`/medecin/grossesse/${patientId}/nouveau`)
  }

  const { data: cpns } = await sb
    .from('spec_grossesse_cpn')
    .select('*')
    .eq('grossesse_id', grossesse.id)
    .order('date', { ascending: false })

  const { grossesseDetailPage } = await import('../pages/medecin-grossesse-detail')
  return c.html(grossesseDetailPage(profil, grossesse, cpns ?? []))
})

// Formulaire création grossesse
medecinRoutes.get('/grossesse/:patientId/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.param('patientId')
  const { data: patient } = await sb.from('patient_dossiers').select('id, nom, prenom, date_naissance').eq('id', patientId).single()
  const { grossesseFormPage } = await import('../pages/medecin-grossesse-form')
  return c.html(grossesseFormPage(profil, patient))
})

// Création grossesse
medecinRoutes.post('/grossesse/:patientId/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.param('patientId')
  const body = await c.req.parseBody()

  await sb.from('spec_grossesses').insert({
    patient_id: patientId,
    medecin_suivi_id: profil.id,
    date_debut: String(body.date_debut),
    date_prevue_accouchement: String(body.date_prevue_accouchement),
    gestite: parseInt(String(body.gestite)) || null,
    parite: parseInt(String(body.parite)) || null,
  })

  return c.redirect(`/medecin/grossesse/${patientId}`)
})

// Ajout d'une consultation prénatale (CPN)
medecinRoutes.post('/grossesse/:grossesseId/cpn', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const grossesseId = c.req.param('grossesseId')
  const body = await c.req.parseBody()

  await sb.from('spec_grossesse_cpn').insert({
    grossesse_id: grossesseId,
    date: String(body.date),
    sa: parseInt(String(body.sa)) || null,
    poids: parseFloat(String(body.poids)) || null,
    tension_systolique: parseInt(String(body.tension_sys)) || null,
    tension_diastolique: parseInt(String(body.tension_dia)) || null,
    fcf: parseInt(String(body.fcf)) || null,
    observations: String(body.observations) || null,
  })

  return c.redirect(`/medecin/grossesse/${grossesseId}`)
})

// ─────────────────────────────────────────────────────────────
// DOCUMENTS MÉDICAUX
// ─────────────────────────────────────────────────────────────
// Liste des documents d'un patient
medecinRoutes.get('/patients/:patientId/documents', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.param('patientId')

  const { data: documents } = await sb
    .from('medical_documents')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })

  const { documentsListPage } = await import('../pages/medecin-documents-list')
  return c.html(documentsListPage(profil, documents ?? [], patientId))
})

// Upload d'un document
medecinRoutes.post('/patients/:patientId/documents/upload', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.param('patientId')
  const body = await c.req.parseBody()

  const file = body.file as File
  if (!file) return c.redirect(`/medecin/patients/${patientId}/documents?error=no_file`)

  const fileName = `${Date.now()}-${file.name}`
  const { data: uploadData, error } = await sb.storage
    .from('documents')
    .upload(`patients/${patientId}/${fileName}`, file)

  if (error) {
    return c.redirect(`/medecin/patients/${patientId}/documents?error=upload`)
  }

  await sb.from('medical_documents').insert({
    patient_id: patientId,
    auteur_id: profil.id,
    type_document: String(body.type_document ?? 'autre'),
    nom_fichier: file.name,
    url_fichier: uploadData.path,
    description: String(body.description ?? '') || null,
  })

  return c.redirect(`/medecin/patients/${patientId}/documents`)
})

// Génération certificat médical
medecinRoutes.post('/patients/:patientId/certificat', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.param('patientId')
  const body = await c.req.parseBody()

  const { generateCertificatPDF } = await import('../utils/pdf')
  const pdfBuffer = await generateCertificatPDF({
    patientId,
    medecin: profil,
    motif: String(body.motif),
    duree: String(body.duree),
    date: new Date().toISOString(),
  })

  const fileName = `certificat-${Date.now()}.pdf`
  const { data: uploadData } = await sb.storage
    .from('documents')
    .upload(`patients/${patientId}/${fileName}`, pdfBuffer, {
      contentType: 'application/pdf',
    })

  if (uploadData) {
    await sb.from('medical_documents').insert({
      patient_id: patientId,
      auteur_id: profil.id,
      type_document: 'certificat',
      nom_fichier: fileName,
      url_fichier: uploadData.path,
      description: `Certificat médical - ${body.motif}`,
    })
  }

  return c.redirect(`/medecin/patients/${patientId}/documents`)
})

// ─────────────────────────────────────────────────────────────
// CODE URGENCE
// ─────────────────────────────────────────────────────────────
// Récupérer le code urgence d'un patient
medecinRoutes.get('/urgence/:patientId/code', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.param('patientId')

  const { data: dossier } = await sb
    .from('patient_dossiers')
    .select('code_urgence')
    .eq('id', patientId)
    .single()

  if (!dossier) return c.notFound()

  return c.json({ code: dossier.code_urgence })
})

// Accès via code urgence (le médecin saisit le code)
medecinRoutes.post('/urgence/acces', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const body = await c.req.parseBody()
  const code = String(body.code ?? '')

  const { data: patient } = await sb
    .from('patient_dossiers')
    .select('id, nom, prenom')
    .eq('code_urgence', code)
    .maybeSingle()

  if (!patient) {
    return c.redirect('/medecin/patients?error=code_invalide')
  }

  await sb.from('patient_acces_urgence').insert({
    patient_id: patient.id,
    medecin_id: profil.id,
    date_acces: new Date().toISOString(),
    date_expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    code_utilise: true,
  })

  // Notification au patient (à implémenter)
  // await notifierPatientAccesUrgence(patient.id)

  return c.redirect(`/medecin/patients/${patient.id}?urgence=1`)
})

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS / PRÉFÉRENCES
// ─────────────────────────────────────────────────────────────
// Afficher les préférences de notification du médecin
medecinRoutes.get('/notifications', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const { data: settings } = await sb
    .from('user_settings')
    .select('*')
    .eq('user_id', profil.id)
    .maybeSingle()

  const { notificationsPage } = await import('../pages/medecin-notifications')
  return c.html(notificationsPage(profil, settings))
})

// Mettre à jour les préférences
medecinRoutes.post('/notifications', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const body = await c.req.parseBody()

  await sb.from('user_settings').upsert({
    user_id: profil.id,
    email_rdv: body.email_rdv === 'on',
    sms_rdv: body.sms_rdv === 'on',
    email_urgence: body.email_urgence === 'on',
    sms_urgence: body.sms_urgence === 'on',
  })

  return c.redirect('/medecin/notifications?updated=1')
})

// ─────────────────────────────────────────────────────────────
// PROFIL MÉDECIN
// ─────────────────────────────────────────────────────────────
// Afficher le profil du médecin
medecinRoutes.get('/profil', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const { data: structures } = await sb
    .from('auth_medecin_structures')
    .select('structures_sante(*)')
    .eq('medecin_id', profil.id)

  const { profilMedecinPage } = await import('../pages/medecin-profil')
  return c.html(profilMedecinPage(profil, structures ?? []))
})

// Upload de la photo de profil
medecinRoutes.post('/profil/photo', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const body = await c.req.parseBody()
  const file = body.avatar as File

  if (!file) return c.redirect('/medecin/profil?error=no_file')

  const fileName = `avatar-${profil.id}-${Date.now()}.jpg`
  const { data } = await sb.storage
    .from('avatars')
    .upload(`medecins/${profil.id}/${fileName}`, file)

  if (data) {
    await sb.from('auth_profiles').update({ avatar_url: data.path }).eq('id', profil.id)
  }

  return c.redirect('/medecin/profil')
})

// Redirection de la racine vers le dashboard
medecinRoutes.get('/', (c) => c.redirect('/medecin/dashboard'))