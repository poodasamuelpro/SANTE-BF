// src/routes/medecin.ts
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import type { AuthProfile } from '../lib/supabase'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }

export const medecinRoutes = new Hono<{ Bindings: Bindings }>()

// Appliquer l'authentification et le rôle pour toutes les routes
medecinRoutes.use('/*', requireAuth, requireRole('medecin', 'infirmier', 'sage_femme', 'laborantin', 'radiologue'))

// ============================================================================
// DASHBOARD PRINCIPAL (importé depuis le fichier existant)
// ============================================================================
medecinRoutes.get('/dashboard', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  // Requêtes parallèles pour les statistiques
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
    // RDV à venir
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
    // Patients avec consentement actif
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

// ============================================================================
// RECHERCHE PATIENTS (page intégrée)
// ============================================================================
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

  return c.html(patientsListPage(profil, patients, q, age))
})

// ============================================================================
// FICHE PATIENT (page intégrée)
// ============================================================================
medecinRoutes.get('/patients/:id', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const id = c.req.param('id')

  // Vérifier consentement
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

  return c.html(patientFichePage(profil, patient, age, allergies, maladies,
    consultRes.data ?? [], ordRes.data ?? [], examRes.data ?? [], hospitRes.data ?? [],
    chroniqueRes.data, grossesseRes.data, accesUrgence))
})

// ============================================================================
// CONSULTATIONS
// ============================================================================
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

  // Constantes
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

    const alertes = []
    if (tensionSys > 160) alertes.push('HTA sévère')
    if (tensionSys < 90) alertes.push('Hypotension')
    if (temperature > 38.5) alertes.push('Fièvre')
    if (spo2 < 92) alertes.push('Désaturation')
    if (alertes.length > 0) {
      return c.redirect(`/medecin/patients/${patientId}?consult=ok&alertes=${encodeURIComponent(alertes.join(';'))}`)
    }
  }

  return c.redirect(`/medecin/patients/${patientId}?consult=ok`)
})

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

  return c.html(consultationsListPage(profil, consultations ?? [], patientId))
})

// ============================================================================
// ORDONNANCES
// ============================================================================
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

  return c.redirect(`/medecin/patients/${patientId}?ord=ok`)
})

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

  return c.html(ordonnancesListPage(profil, ordonnances ?? [], patientId))
})

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

// ============================================================================
// EXAMENS
// ============================================================================
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

  return c.html(examensListPage(profil, examens ?? [], patientId))
})

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

  return c.html(examenDetailPage(profil, examen))
})

// ============================================================================
// RENDEZ-VOUS
// ============================================================================
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

  return c.html(rdvListPage(profil, rdvs ?? []))
})

medecinRoutes.get('/rdv/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.query('patient_id')

  let patient: any = null
  if (patientId) {
    const { data } = await sb.from('patient_dossiers').select('id, nom, prenom').eq('id', patientId).single()
    patient = data
  }

  return c.html(rdvFormPage(profil, patient))
})

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

  return c.redirect('/medecin/rdv')
})

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

// ============================================================================
// HOSPITALISATIONS
// ============================================================================
medecinRoutes.get('/hospitalisations', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const { data: hospits } = await sb
    .from('medical_hospitalisations')
    .select('*, patient_dossiers(nom, prenom, numero_national)')
    .eq('medecin_referent', profil.id)
    .is('date_sortie', null)
    .order('date_entree', { ascending: false })

  return c.html(hospitalisationsListPage(profil, hospits ?? []))
})

medecinRoutes.get('/hospitalisations/nouvelle', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.query('patient_id')

  let patient: any = null
  if (patientId) {
    const { data } = await sb.from('patient_dossiers').select('id, nom, prenom').eq('id', patientId).single()
    patient = data
  }

  return c.html(hospitalisationFormPage(profil, patient))
})

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

  return c.html(hospitalisationDetailPage(profil, hospit, evolutions ?? []))
})

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

// ============================================================================
// TRANSFERTS
// ============================================================================
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

  return c.html(transfertFormPage(profil, patient, structures ?? []))
})

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

// ============================================================================
// SUIVI MALADIES CHRONIQUES
// ============================================================================
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

  return c.html(chroniqueDetailPage(profil, chronique, bilans ?? []))
})

medecinRoutes.get('/chroniques/:patientId/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.param('patientId')

  const { data: patient } = await sb.from('patient_dossiers').select('id, nom, prenom').eq('id', patientId).single()

  return c.html(chroniqueFormPage(profil, patient))
})

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

// ============================================================================
// SUIVI GROSSESSE
// ============================================================================
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

  return c.html(grossesseDetailPage(profil, grossesse, cpns ?? []))
})

medecinRoutes.get('/grossesse/:patientId/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.param('patientId')
  const { data: patient } = await sb.from('patient_dossiers').select('id, nom, prenom, date_naissance').eq('id', patientId).single()
  return c.html(grossesseFormPage(profil, patient))
})

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

// ============================================================================
// DOCUMENTS MÉDICAUX
// ============================================================================
medecinRoutes.get('/patients/:patientId/documents', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const patientId = c.req.param('patientId')

  const { data: documents } = await sb
    .from('medical_documents')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })

  return c.html(documentsListPage(profil, documents ?? [], patientId))
})

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

// ============================================================================
// CODE URGENCE
// ============================================================================
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

  return c.redirect(`/medecin/patients/${patient.id}?urgence=1`)
})

// ============================================================================
// NOTIFICATIONS / PRÉFÉRENCES
// ============================================================================
medecinRoutes.get('/notifications', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const { data: settings } = await sb
    .from('user_settings')
    .select('*')
    .eq('user_id', profil.id)
    .maybeSingle()

  return c.html(notificationsPage(profil, settings))
})

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

// ============================================================================
// PROFIL MÉDECIN
// ============================================================================
medecinRoutes.get('/profil', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const { data: structures } = await sb
    .from('auth_medecin_structures')
    .select('structures_sante(*)')
    .eq('medecin_id', profil.id)

  return c.html(profilMedecinPage(profil, structures ?? []))
})

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

// ============================================================================
// FONCTIONS DE RENDU HTML (intégrées pour éviter les imports manquants)
// ============================================================================

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

// Liste des patients
function patientsListPage(profil: AuthProfile, patients: any[], q: string, ageFn: (ddn: string) => number): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
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
              <td>${ageFn(p.date_naissance)} ans</td>
              <td style="font-weight:700;color:#B71C1C">${p.groupe_sanguin}${p.rhesus}</td>
              <td>
                <a href="/medecin/consultations/nouvelle?patient_id=${p.id}" class="btn-sm" style="margin-right:6px">+ Consultation</a>
                <a href="/medecin/patients/${p.id}" class="btn-secondary" style="font-size:12px;padding:5px 10px">Dossier</a>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}
  </div></body></html>`
}

// Fiche patient
function patientFichePage(profil: AuthProfile, patient: any, age: number, allergies: any[], maladies: any[],
  consultations: any[], ordonnances: any[], examens: any[], hospitalisations: any[],
  chronique: any, grossesse: any, accesUrgence: boolean): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
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
      <a href="/medecin/consultations/nouvelle?patient_id=${patient.id}" class="btn-primary">📋 Nouvelle consultation</a>
      <a href="/medecin/ordonnances/nouvelle?patient_id=${patient.id}" class="btn-primary" style="background:#1A6B3C">💊 Nouvelle ordonnance</a>
      <a href="/medecin/examens/nouveau?patient_id=${patient.id}" class="btn-secondary">🧪 Prescrire examen</a>
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
          <a href="/medecin/consultations?patient_id=${patient.id}" style="font-size:12px;color:rgba(255,255,255,.75);text-decoration:none">Voir tout</a>
        </div>
        ${consultations.length === 0 ? '<div class="empty">Aucune consultation</div>'
          : consultations.map((c: any) => `
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
          <a href="/medecin/ordonnances?patient_id=${patient.id}" style="font-size:12px;color:rgba(255,255,255,.75);text-decoration:none">Voir tout</a>
        </div>
        ${ordonnances.length === 0 ? '<div class="empty">Aucune ordonnance</div>'
          : ordonnances.map((o: any) => `
            <div style="padding:12px 16px;border-bottom:1px solid #F5F5F5;display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-size:12px;font-family:monospace;color:#1A6B3C">${o.numero_ordonnance}</div>
                <div style="font-size:11px;color:#9E9E9E">${new Date(o.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
              <span class="badge-statut ${o.statut}">${o.statut}</span>
            </div>`).join('')}
      </div>
    </div>
  </div></body></html>`
}

// Formulaire consultation
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

// Formulaire ordonnance
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

// Formulaire examen
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

// Liste des consultations
function consultationsListPage(profil: AuthProfile, consultations: any[], patientId?: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Consultations</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → Consultations</div>
    <div class="page-title">Consultations</div>
    <div class="card">
      <table>
        <thead><tr><th>Date</th><th>Patient</th><th>Motif</th><th>Diagnostic</th><th>Type</th></tr></thead>
        <tbody>
          ${consultations.length === 0 ? '<tr><td colspan="5" class="empty">Aucune consultation</td></tr>'
            : consultations.map((c: any) => `
              <tr>
                <td>${new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                <td>${c.patient_dossiers?.prenom} ${c.patient_dossiers?.nom}</td>
                <td>${c.motif || ''}</td>
                <td>${c.diagnostic_principal || ''}</td>
                <td>${c.type_consultation}</td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div></body></html>`
}

// Liste des ordonnances
function ordonnancesListPage(profil: AuthProfile, ordonnances: any[], patientId?: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Ordonnances</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → Ordonnances</div>
    <div class="page-title">Ordonnances</div>
    <div class="card">
      <table>
        <thead><tr><th>N°</th><th>Date</th><th>Patient</th><th>Statut</th><th>PDF</th></tr></thead>
        <tbody>
          ${ordonnances.length === 0 ? '<tr><td colspan="5" class="empty">Aucune ordonnance</td></tr>'
            : ordonnances.map((o: any) => `
              <tr>
                <td>${o.numero_ordonnance}</td>
                <td>${new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
                <td>${o.patient_dossiers?.prenom} ${o.patient_dossiers?.nom}</td>
                <td><span class="badge-statut ${o.statut}">${o.statut}</span></td>
                <td><a href="/medecin/ordonnances/${o.id}/pdf" target="_blank">📄 PDF</a></td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div></body></html>`
}

// Liste des examens
function examensListPage(profil: AuthProfile, examens: any[], patientId?: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Examens</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → Examens</div>
    <div class="page-title">Examens prescrits</div>
    <div class="card">
      <table>
        <thead><tr><th>Date</th><th>Patient</th><th>Examen</th><th>Type</th><th>Statut</th></tr></thead>
        <tbody>
          ${examens.length === 0 ? '<tr><td colspan="5" class="empty">Aucun examen</td></tr>'
            : examens.map((e: any) => `
              <tr>
                <td>${new Date(e.created_at).toLocaleDateString('fr-FR')}</td>
                <td>${e.patient_dossiers?.prenom} ${e.patient_dossiers?.nom}</td>
                <td>${e.nom_examen}</td>
                <td>${e.type_examen}</td>
                <td>${e.statut}</td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div></body></html>`
}

// Détail examen
function examenDetailPage(profil: AuthProfile, examen: any): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Examen</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → <a href="/medecin/examens">Examens</a> → Détail</div>
    <div class="page-title">Examen : ${examen.nom_examen}</div>
    <div class="card card-body">
      <p><strong>Patient :</strong> ${examen.patient_dossiers?.prenom} ${examen.patient_dossiers?.nom}</p>
      <p><strong>Type :</strong> ${examen.type_examen}</p>
      <p><strong>Prescrit le :</strong> ${new Date(examen.created_at).toLocaleDateString('fr-FR')}</p>
      <p><strong>Motif :</strong> ${examen.motif || ''}</p>
      <p><strong>Statut :</strong> ${examen.statut}</p>
      ${examen.resultats ? `<p><strong>Résultats :</strong> ${examen.resultats}</p>` : ''}
      ${examen.fichier_url ? `<p><a href="${examen.fichier_url}" target="_blank">📄 Télécharger le compte-rendu</a></p>` : ''}
    </div>
  </div></body></html>`
}

// Planning RDV
function rdvListPage(profil: AuthProfile, rdvs: any[]): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Rendez-vous</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → Rendez-vous</div>
    <div class="page-title">Mon planning</div>
    <div class="card">
      <table>
        <thead><tr><th>Date/Heure</th><th>Patient</th><th>Motif</th><th>Durée</th><th>Statut</th><th>Action</th></tr></thead>
        <tbody>
          ${rdvs.length === 0 ? '<tr><td colspan="6" class="empty">Aucun rendez-vous à venir</td></tr>'
            : rdvs.map((r: any) => `
              <tr>
                <td><strong>${new Date(r.date_heure).toLocaleString('fr-FR',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</strong></td>
                <td>${r.patient_dossiers?.prenom} ${r.patient_dossiers?.nom}</td>
                <td>${r.motif||''}</td>
                <td>${r.duree_minutes} min</td>
                <td><span class="badge-statut ${r.statut}">${r.statut}</span></td>
                <td>
                  <form method="POST" action="/medecin/rdv/${r.id}/statut" style="display:inline">
                    <select name="statut" onchange="this.form.submit()">
                      <option value="planifie" ${r.statut==='planifie'?'selected':''}>Planifié</option>
                      <option value="confirme" ${r.statut==='confirme'?'selected':''}>Confirmé</option>
                      <option value="annule" ${r.statut==='annule'?'selected':''}>Annulé</option>
                      <option value="passe" ${r.statut==='passe'?'selected':''}>Passé</option>
                      <option value="absent" ${r.statut==='absent'?'selected':''}>Absent</option>
                    </select>
                  </form>
                </td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <a href="/medecin/rdv/nouveau" class="btn-primary">➕ Nouveau rendez-vous</a>
  </div></body></html>`
}

// Formulaire RDV
function rdvFormPage(profil: AuthProfile, patient: any): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Nouveau RDV</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → <a href="/medecin/rdv">Rendez-vous</a> → Nouveau</div>
    <div class="page-title">Nouveau rendez-vous</div>
    <div class="card card-body">
      <form method="POST" action="/medecin/rdv/nouveau">
        <input type="hidden" name="patient_id" value="${patient?.id ?? ''}">
        <div class="form-grid">
          <div class="form-group full">
            <label>Patient</label>
            <input type="text" value="${patient ? patient.prenom+' '+patient.nom : ''}" disabled>
            <small>Recherchez d'abord un patient via <a href="/medecin/patients">Mes patients</a></small>
          </div>
          <div class="form-group">
            <label>Date et heure *</label>
            <input type="datetime-local" name="date_heure" required>
          </div>
          <div class="form-group">
            <label>Durée (minutes)</label>
            <input type="number" name="duree" value="30" min="5" max="240">
          </div>
          <div class="form-group full">
            <label>Motif</label>
            <input type="text" name="motif" placeholder="Ex: Consultation de suivi">
          </div>
        </div>
        <div class="form-actions">
          <a href="/medecin/rdv" class="btn-secondary">Annuler</a>
          <button type="submit" class="btn-primary">Créer le rendez-vous</button>
        </div>
      </form>
    </div>
  </div></body></html>`
}

// Hospitalisations (liste)
function hospitalisationsListPage(profil: AuthProfile, hospits: any[]): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Hospitalisations</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → Hospitalisations</div>
    <div class="page-title">Patients hospitalisés</div>
    <div class="card">
      <table>
        <thead><tr><th>Patient</th><th>Entrée</th><th>Service</th><th>Diagnostic</th><th>Action</th></tr></thead>
        <tbody>
          ${hospits.length === 0 ? '<tr><td colspan="5" class="empty">Aucune hospitalisation en cours</td></tr>'
            : hospits.map((h: any) => `
              <tr>
                <td>${h.patient_dossiers?.prenom} ${h.patient_dossiers?.nom}</td>
                <td>${new Date(h.date_entree).toLocaleDateString('fr-FR')}</td>
                <td>${h.service}</td>
                <td>${h.diagnostic_entree}</td>
                <td><a href="/medecin/hospitalisations/${h.id}" class="btn-sm">Voir</a></td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <a href="/medecin/hospitalisations/nouvelle" class="btn-primary">➕ Nouvelle admission</a>
  </div></body></html>`
}

// Formulaire hospitalisation
function hospitalisationFormPage(profil: AuthProfile, patient: any): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Nouvelle hospitalisation</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → <a href="/medecin/hospitalisations">Hospitalisations</a> → Nouvelle</div>
    <div class="page-title">Admission</div>
    <div class="card card-body">
      <form method="POST" action="/medecin/hospitalisations/nouvelle">
        <input type="hidden" name="patient_id" value="${patient?.id ?? ''}">
        <div class="form-grid">
          <div class="form-group full">
            <label>Patient</label>
            <input type="text" value="${patient ? patient.prenom+' '+patient.nom : ''}" disabled>
            <small>Recherchez d'abord un patient via <a href="/medecin/patients">Mes patients</a></small>
          </div>
          <div class="form-group">
            <label>Service *</label>
            <input type="text" name="service" placeholder="Ex: Médecine interne" required>
          </div>
          <div class="form-group">
            <label>N° Lit (optionnel)</label>
            <input type="number" name="lit_id">
          </div>
          <div class="form-group full">
            <label>Diagnostic d'entrée *</label>
            <input type="text" name="diagnostic_entree" required>
          </div>
          <div class="form-group full">
            <label>Motif / Résumé clinique</label>
            <textarea name="motif" rows="3"></textarea>
          </div>
        </div>
        <div class="form-actions">
          <a href="/medecin/hospitalisations" class="btn-secondary">Annuler</a>
          <button type="submit" class="btn-primary">Admettre le patient</button>
        </div>
      </form>
    </div>
  </div></body></html>`
}

// Détail hospitalisation
function hospitalisationDetailPage(profil: AuthProfile, hospit: any, evolutions: any[]): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Hospitalisation</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → <a href="/medecin/hospitalisations">Hospitalisations</a> → Détail</div>
    <div class="page-title">Hospitalisation - ${hospit.patient_dossiers?.prenom} ${hospit.patient_dossiers?.nom}</div>
    <div class="card card-body">
      <p><strong>Entrée :</strong> ${new Date(hospit.date_entree).toLocaleString('fr-FR')}</p>
      <p><strong>Service :</strong> ${hospit.service}</p>
      <p><strong>Diagnostic entrée :</strong> ${hospit.diagnostic_entree}</p>
      <p><strong>Motif :</strong> ${hospit.motif}</p>
      ${hospit.date_sortie ? `<p><strong>Sortie :</strong> ${new Date(hospit.date_sortie).toLocaleString('fr-FR')}</p>` : ''}
      ${hospit.diagnostic_sortie ? `<p><strong>Diagnostic sortie :</strong> ${hospit.diagnostic_sortie}</p>` : ''}
    </div>

    <div class="card">
      <div class="section-head" style="padding:14px 18px;background:#4A148C;color:white">
        <h3 style="font-size:13px;">📝 Évolutions</h3>
      </div>
      <div style="padding:16px">
        ${evolutions.length === 0 ? '<p class="empty">Aucune note d\'évolution</p>' : ''}
        ${evolutions.map(e => `
          <div style="border-bottom:1px solid #eee;padding:10px 0">
            <div style="font-size:11px;color:#9E9E9E">${new Date(e.date).toLocaleString('fr-FR')}</div>
            <div style="font-size:13px;margin-top:4px">${e.note}</div>
          </div>`).join('')}
        <form method="POST" action="/medecin/hospitalisations/${hospit.id}/evolution" style="margin-top:16px">
          <textarea name="note" placeholder="Ajouter une note d'évolution..." rows="2" style="width:100%"></textarea>
          <button type="submit" class="btn-primary" style="margin-top:8px">Ajouter</button>
        </form>
      </div>
    </div>

    ${!hospit.date_sortie ? `
    <div class="card card-body">
      <h3>Sortie d'hospitalisation</h3>
      <form method="POST" action="/medecin/hospitalisations/${hospit.id}/sortie">
        <div class="form-group">
          <label>Diagnostic de sortie</label>
          <input type="text" name="diagnostic_sortie">
        </div>
        <div class="form-group">
          <label>URL du rapport (optionnel)</label>
          <input type="text" name="rapport_url" placeholder="https://...">
        </div>
        <button type="submit" class="btn-primary">Enregistrer la sortie</button>
      </form>
    </div>` : ''}
  </div></body></html>`
}

// Formulaire transfert
function transfertFormPage(profil: AuthProfile, patient: any, structures: any[]): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Transfert</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → Transfert</div>
    <div class="page-title">Demande de transfert</div>
    <div class="card card-body">
      <form method="POST" action="/medecin/transferts/nouveau">
        <input type="hidden" name="patient_id" value="${patient?.id ?? ''}">
        <div class="form-grid">
          <div class="form-group full">
            <label>Patient</label>
            <input type="text" value="${patient ? patient.prenom+' '+patient.nom : ''}" disabled>
          </div>
          <div class="form-group full">
            <label>Structure de destination *</label>
            <select name="structure_destination_id" required>
              <option value="">Choisir...</option>
              ${structures.map(s => `<option value="${s.id}">${s.nom}</option>`).join('')}
            </select>
          </div>
          <div class="form-group full">
            <label>État du patient</label>
            <select name="etat_patient">
              <option value="stable">Stable</option>
              <option value="grave">État grave</option>
              <option value="critique">Critique</option>
            </select>
          </div>
          <div class="form-group full">
            <label>Motif du transfert *</label>
            <input type="text" name="motif" required>
          </div>
          <div class="form-group full">
            <label>Résumé clinique</label>
            <textarea name="resume_clinique" rows="4"></textarea>
          </div>
        </div>
        <div class="form-actions">
          <a href="/medecin/patients${patient ? '/'+patient.id : ''}" class="btn-secondary">Annuler</a>
          <button type="submit" class="btn-primary">Envoyer la demande</button>
        </div>
      </form>
    </div>
  </div></body></html>`
}

// Suivi chronique détail
function chroniqueDetailPage(profil: AuthProfile, chronique: any, bilans: any[]): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Suivi chronique</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → Suivi chronique</div>
    <div class="page-title">Suivi ${chronique.type_maladie}</div>
    <div class="card card-body">
      <p><strong>Objectifs :</strong> ${JSON.stringify(chronique.objectifs)}</p>
    </div>
    <div class="card">
      <div class="section-head" style="background:#1A6B3C">
        <h3>📊 Bilans</h3>
        <a href="#" style="color:white">Ajouter</a>
      </div>
      <div style="padding:16px">
        ${bilans.length === 0 ? '<p class="empty">Aucun bilan</p>' : ''}
        ${bilans.map(b => `
          <div style="border-bottom:1px solid #eee;padding:10px 0">
            <div><strong>${new Date(b.date).toLocaleDateString('fr-FR')}</strong></div>
            <div>Valeurs : ${JSON.stringify(b.valeurs)}</div>
          </div>`).join('')}
        <form method="POST" action="/medecin/chroniques/${chronique.id}/bilans" style="margin-top:16px">
          <textarea name="valeurs" placeholder='{"hba1c":7.2,"poids":75}' rows="2" style="width:100%"></textarea>
          <button type="submit" class="btn-primary" style="margin-top:8px">Ajouter bilan</button>
        </form>
      </div>
    </div>
  </div></body></html>`
}

// Formulaire chronique
function chroniqueFormPage(profil: AuthProfile, patient: any): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Nouveau suivi chronique</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → Nouveau suivi</div>
    <div class="page-title">Ouvrir un suivi chronique</div>
    <div class="card card-body">
      <form method="POST" action="/medecin/chroniques/${patient?.id}/nouveau">
        <div class="form-grid">
          <div class="form-group full">
            <label>Patient</label>
            <input type="text" value="${patient ? patient.prenom+' '+patient.nom : ''}" disabled>
          </div>
          <div class="form-group full">
            <label>Type de maladie *</label>
            <select name="type_maladie" required>
              <option value="diabete">Diabète</option>
              <option value="hta">Hypertension artérielle</option>
              <option value="asthme">Asthme</option>
              <option value="insuffisance_renale">Insuffisance rénale</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div class="form-group full">
            <label>Objectifs (format JSON)</label>
            <textarea name="objectifs" rows="3" placeholder='{"hba1c":7,"tension":"130/80"}'>{"hba1c":7}</textarea>
          </div>
        </div>
        <div class="form-actions">
          <a href="/medecin/patients/${patient?.id}" class="btn-secondary">Annuler</a>
          <button type="submit" class="btn-primary">Créer le suivi</button>
        </div>
      </form>
    </div>
  </div></body></html>`
}

// Grossesse détail
function grossesseDetailPage(profil: AuthProfile, grossesse: any, cpns: any[]): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Suivi grossesse</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → Suivi grossesse</div>
    <div class="page-title">Grossesse - DDR ${new Date(grossesse.date_debut).toLocaleDateString('fr-FR')}</div>
    <div class="card card-body">
      <p><strong>Date prévue accouchement :</strong> ${new Date(grossesse.date_prevue_accouchement).toLocaleDateString('fr-FR')}</p>
      <p><strong>Gestité :</strong> ${grossesse.gestite} | <strong>Parité :</strong> ${grossesse.parite}</p>
    </div>
    <div class="card">
      <div class="section-head" style="background:#1A6B3C">
        <h3>Consultations prénatales</h3>
        <a href="#" style="color:white">Ajouter</a>
      </div>
      <div style="padding:16px">
        ${cpns.length === 0 ? '<p class="empty">Aucune CPN</p>' : ''}
        ${cpns.map(c => `
          <div style="border-bottom:1px solid #eee;padding:10px 0">
            <div><strong>${new Date(c.date).toLocaleDateString('fr-FR')} - SA ${c.sa}</strong></div>
            <div>TA: ${c.tension_systolique}/${c.tension_diastolique} - Poids: ${c.poids}kg - FCF: ${c.fcf}</div>
            <div>Obs: ${c.observations}</div>
          </div>`).join('')}
        <form method="POST" action="/medecin/grossesse/${grossesse.id}/cpn" style="margin-top:16px">
          <div class="form-grid" style="grid-template-columns:1fr 1fr 1fr 1fr">
            <input type="date" name="date" placeholder="Date" required>
            <input type="number" name="sa" placeholder="SA">
            <input type="number" name="poids" placeholder="Poids (kg)" step="0.1">
            <input type="number" name="tension_sys" placeholder="TA sys">
            <input type="number" name="tension_dia" placeholder="TA dia">
            <input type="number" name="fcf" placeholder="FCF">
          </div>
          <textarea name="observations" placeholder="Observations" rows="2" style="width:100%;margin-top:8px"></textarea>
          <button type="submit" class="btn-primary" style="margin-top:8px">Ajouter CPN</button>
        </form>
      </div>
    </div>
  </div></body></html>`
}

// Formulaire grossesse
function grossesseFormPage(profil: AuthProfile, patient: any): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Nouvelle grossesse</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → Nouvelle grossesse</div>
    <div class="page-title">Ouvrir un suivi de grossesse</div>
    <div class="card card-body">
      <form method="POST" action="/medecin/grossesse/${patient?.id}/nouveau">
        <div class="form-grid">
          <div class="form-group full">
            <label>Patient</label>
            <input type="text" value="${patient ? patient.prenom+' '+patient.nom : ''}" disabled>
          </div>
          <div class="form-group">
            <label>Date des dernières règles *</label>
            <input type="date" name="date_debut" required>
          </div>
          <div class="form-group">
            <label>Date prévue d'accouchement *</label>
            <input type="date" name="date_prevue_accouchement" required>
          </div>
          <div class="form-group">
            <label>Gestité</label>
            <input type="number" name="gestite" min="0">
          </div>
          <div class="form-group">
            <label>Parité</label>
            <input type="number" name="parite" min="0">
          </div>
        </div>
        <div class="form-actions">
          <a href="/medecin/patients/${patient?.id}" class="btn-secondary">Annuler</a>
          <button type="submit" class="btn-primary">Créer le suivi</button>
        </div>
      </form>
    </div>
  </div></body></html>`
}

// Documents liste
function documentsListPage(profil: AuthProfile, documents: any[], patientId: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Documents</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → <a href="/medecin/patients/${patientId}">Patient</a> → Documents</div>
    <div class="page-title">Documents médicaux</div>

    <div class="card card-body">
      <h3>📤 Uploader un document</h3>
      <form method="POST" action="/medecin/patients/${patientId}/documents/upload" enctype="multipart/form-data">
        <div class="form-grid">
          <div class="form-group">
            <label>Type de document</label>
            <select name="type_document">
              <option value="compte_rendu">Compte-rendu</option>
              <option value="radio">Radio</option>
              <option value="echo">Échographie</option>
              <option value="certificat">Certificat</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div class="form-group">
            <label>Fichier</label>
            <input type="file" name="file" required>
          </div>
          <div class="form-group full">
            <label>Description</label>
            <input type="text" name="description" placeholder="Ex: Radio thorax du 15/03">
          </div>
        </div>
        <button type="submit" class="btn-primary">Uploader</button>
      </form>
    </div>

    <div class="card">
      <div class="section-head" style="background:#4A148C">
        <h3>📄 Documents existants</h3>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Fichier</th></tr></thead>
        <tbody>
          ${documents.length === 0 ? '<tr><td colspan="4" class="empty">Aucun document</td></tr>'
            : documents.map(d => `
              <tr>
                <td>${new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                <td>${d.type_document}</td>
                <td>${d.description || ''}</td>
                <td><a href="${d.url_fichier}" target="_blank">📄 Voir</a></td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div></body></html>`
}

// Notifications
function notificationsPage(profil: AuthProfile, settings: any): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Notifications</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → Notifications</div>
    <div class="page-title">Préférences de notification</div>
    <div class="card card-body">
      <form method="POST" action="/medecin/notifications">
        <div style="margin-bottom:16px">
          <label style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" name="email_rdv" ${settings?.email_rdv ? 'checked' : ''}> Recevoir les rappels de RDV par email
          </label>
          <label style="display:flex;align-items:center;gap:8px;margin-top:8px">
            <input type="checkbox" name="sms_rdv" ${settings?.sms_rdv ? 'checked' : ''}> Recevoir les rappels de RDV par SMS
          </label>
          <label style="display:flex;align-items:center;gap:8px;margin-top:8px">
            <input type="checkbox" name="email_urgence" ${settings?.email_urgence ? 'checked' : ''}> Alertes d'urgence par email
          </label>
          <label style="display:flex;align-items:center;gap:8px;margin-top:8px">
            <input type="checkbox" name="sms_urgence" ${settings?.sms_urgence ? 'checked' : ''}> Alertes d'urgence par SMS
          </label>
        </div>
        <button type="submit" class="btn-primary">Enregistrer</button>
      </form>
    </div>
  </div></body></html>`
}

// Profil médecin
function profilMedecinPage(profil: AuthProfile, structures: any[]): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Mon profil</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/medecin">Accueil</a> → Mon profil</div>
    <div class="page-title">Mon profil</div>

    <div class="card card-body" style="display:flex;gap:20px;align-items:center">
      <div style="width:80px;height:80px;background:#4A148C;border-radius:40px;display:flex;align-items:center;justify-content:center;color:white;font-size:32px;font-weight:bold">
        ${profil.prenom?.charAt(0) || ''}${profil.nom?.charAt(0) || ''}
      </div>
      <div>
        <h2>Dr. ${profil.prenom} ${profil.nom}</h2>
        <p>${profil.role?.replace(/_/g,' ')} | ${profil.email}</p>
        <p>Spécialité : ${profil.specialite || 'Non renseignée'}</p>
        <p>Numéro d'ordre : ${profil.numero_ordre || 'Non renseigné'}</p>
      </div>
    </div>

    <div class="card card-body">
      <h3>🏥 Structures d'exercice</h3>
      <ul style="margin-top:10px">
        ${structures.length === 0 ? '<li>Aucune structure associée</li>' : ''}
        ${structures.map((s: any) => `<li>${s.structures_sante?.nom || ''}</li>`).join('')}
      </ul>
    </div>

    <div class="card card-body">
      <h3>📸 Changer photo de profil</h3>
      <form method="POST" action="/medecin/profil/photo" enctype="multipart/form-data">
        <input type="file" name="avatar" accept="image/*" required>
        <button type="submit" class="btn-primary" style="margin-top:10px">Uploader</button>
      </form>
    </div>
  </div></body></html>`
}