import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase, type Variables, type Bindings } from '../lib/supabase'

export const accueilRoutes = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>()

accueilRoutes.use('/*', requireAuth, requireRole('agent_accueil', 'admin_structure', 'super_admin'))

const CSS = `...` // Même CSS que dans votre code original

function headerHtml(profil: any): string {
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
  const supabase = c.get('supabase')
  const profil = c.get('profil')
  
  const { data: regions } = await supabase
    .from('geo_regions')
    .select('id, nom')
    .order('nom')
    
  return c.html(nouveauPatientPage(profil, regions ?? []))
})

// ── POST /accueil/nouveau-patient ──────────────────────────
accueilRoutes.post('/nouveau-patient', async (c) => {
  const supabase = c.get('supabase')
  const profil = c.get('profil')
  const body = await c.req.parseBody()

  const nom    = String(body.nom    ?? '').trim()
  const prenom = String(body.prenom ?? '').trim()
  const ddn    = String(body.date_naissance ?? '')
  const sexe   = String(body.sexe   ?? '')

  if (!nom || !prenom || !ddn || !sexe) {
    const { data: regions } = await supabase
      .from('geo_regions')
      .select('id, nom')
      .order('nom')
      
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

  const { data: patient, error } = await supabase
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
    const { data: regions } = await supabase
      .from('geo_regions')
      .select('id, nom')
      .order('nom')
      
    return c.html(nouveauPatientPage(profil, regions ?? [], 'Erreur : ' + (error?.message ?? 'Inconnue')))
  }

  // Contacts urgence
  const contactNom = String(body.contact_nom ?? '').trim()
  if (contactNom) {
    await supabase.from('patient_contacts_urgence').insert({
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
  const supabase = c.get('supabase')
  const profil = c.get('profil')
  const q = String(c.req.query('q') ?? '').trim()

  let patients: any[] = []
  if (q.length >= 2) {
    const { data } = await supabase
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
  const supabase = c.get('supabase')
  const profil = c.get('profil')
  const id = c.req.param('id')
  const nouveau = c.req.query('nouveau') === '1'

  const { data: patient } = await supabase
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
  const supabase = c.get('supabase')
  const id = c.req.param('id')

  const { data: patient } = await supabase
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
  const supabase = c.get('supabase')
  const profil = c.get('profil')

  const today = new Date().toISOString().split('T')[0]
  const { data: rdvs } = await supabase
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
  const supabase = c.get('supabase')
  const profil = c.get('profil')
  const body = await c.req.parseBody()

  await supabase.from('medical_rendez_vous').insert({
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
  const supabase = c.get('supabase')
  const id = c.req.param('id')
  const body = await c.req.parseBody()
  
  await supabase
    .from('medical_rendez_vous')
    .update({ statut: String(body.statut) })
    .eq('id', id)
    
  return c.redirect('/accueil/rdv')
})

// ══════════════════════════════════════════════════════════
// PAGES HTML (inchangées)
// ══════════════════════════════════════════════════════════

function nouveauPatientPage(profil: any, regions: any[], erreur?: string): string {
  // Même code que votre original
  return `<!DOCTYPE html>...` // Gardez votre code existant
}

function recherchePage(profil: any, q: string, patients: any[]): string {
  // Même code que votre original
  return `<!DOCTYPE html>...` // Gardez votre code existant
}

function patientFicheAccueilPage(profil: any, patient: any, nouveau: boolean): string {
  // Même code que votre original
  return `<!DOCTYPE html>...` // Gardez votre code existant
}

function carteQRPage(patient: any, qrUrl: string): string {
  // Même code que votre original
  return `<!DOCTYPE html>...` // Gardez votre code existant
}

function rdvListePage(profil: any, rdvs: any[]): string {
  // Même code que votre original
  return `<!DOCTYPE html>...` // Gardez votre code existant
}