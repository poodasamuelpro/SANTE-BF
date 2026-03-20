/**
 * src/routes/dashboard.ts
 * SantéBF — Routes des tableaux de bord par rôle
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Variables, Bindings } from '../lib/supabase'
import { dashboardAdminPage }                               from '../pages/dashboard-admin'
import { dashboardMedecinPage }                             from '../pages/dashboard-medecin'
import { dashboardAccueilPage }                             from '../pages/dashboard-accueil'
import { dashboardPharmacienPage }                          from '../pages/dashboard-pharmacien'
import { dashboardCaissierPage }                            from '../pages/dashboard-caissier'
import { dashboardPatientPage, dashboardPatientSansDossierPage } from '../pages/dashboard-patient'
import { dashboardStructurePage }                           from '../pages/dashboard-structure'

export const dashboardRoutes = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>()

dashboardRoutes.use('/*', requireAuth)

// \u2500\u2500\u2500 Helper page d'erreur inline \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function erreurPage(titre: string, detail?: string): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titre} | Sant&#xe9;BF</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'DM Sans',sans-serif;background:#F7F8FA;min-height:100vh;
    display:flex;align-items:center;justify-content:center;padding:20px}
  .box{background:white;border-radius:16px;padding:48px 40px;max-width:460px;
    width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  h1{font-family:'DM Serif Display',serif;font-size:26px;color:#B71C1C;margin:16px 0 10px}
  p{color:#6B7280;font-size:14px;line-height:1.6;margin-bottom:8px}
  code{background:#F3F4F6;padding:2px 6px;border-radius:4px;font-size:12px}
  .actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:24px}
  .btn{padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none}
  .btn-back{background:#4A148C;color:white}
  .btn-out{background:#F3F4F6;color:#374151;border:1px solid #E0E0E0}
</style>
</head>
<body>
  <div class="box">
    <div style="font-size:52px">&#x26A0;&#xFE0F;</div>
    <h1>${titre}</h1>
    ${detail ? `<p><code>${detail}</code></p>` : ''}
    <p>Veuillez r&#xe9;essayer ou contacter l&#x27;administrateur.</p>
    <div class="actions">
      <a href="javascript:location.reload()" class="btn btn-back">&#x21BA; Recharger</a>
      <a href="/auth/logout" class="btn btn-out">D&#xe9;connexion</a>
    </div>
  </div>
</body></html>`
}

// \u2500\u2500 Super Admin \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

dashboardRoutes.get('/admin',
  requireRole('super_admin'),
  async (c) => {
    try {
      const profil   = c.get('profil')
      const supabase = c.get('supabase')

      const [structures, comptes, patients] = await Promise.all([
        supabase.from('struct_structures').select('*', { count: 'exact', head: true }),
        supabase.from('auth_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('patient_dossiers').select('*', { count: 'exact', head: true }),
      ])

      return c.html(dashboardAdminPage(profil, {
        nbStructures: structures.count ?? 0,
        nbComptes:    comptes.count    ?? 0,
        nbPatients:   patients.count   ?? 0,
      }))
    } catch (err) {
      console.error('dashboard/admin:', err)
      return c.html(erreurPage('Erreur tableau de bord admin',
        err instanceof Error ? err.message : String(err)), 500)
    }
  }
)

// \u2500\u2500 Admin Structure \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

dashboardRoutes.get('/structure',
  requireRole('admin_structure'),
  async (c) => {
    try {
      const profil   = c.get('profil')
      const supabase = c.get('supabase')

      if (!profil.structure_id) {
        return c.html(erreurPage('Aucune structure assign\u00e9e',
          'Votre compte n\'est pas li\u00e9 \u00e0 une structure. Contactez le super admin.'), 400)
      }

      const { data: structure } = await supabase
        .from('struct_structures')
        .select('nom, type, niveau')
        .eq('id', profil.structure_id)
        .single()

      const today  = new Date().toISOString().split('T')[0]
      const sid    = profil.structure_id

      const [lits, personnel, consultJour, patientsJour, rdvJour, hospitEnCours, recettesJour] = await Promise.all([
        supabase.from('struct_lits').select('statut').eq('structure_id', sid),
        supabase.from('auth_profiles').select('*', { count: 'exact', head: true })
          .eq('structure_id', sid).eq('est_actif', true),
        supabase.from('medical_consultations').select('*', { count: 'exact', head: true })
          .eq('structure_id', sid).gte('created_at', today + 'T00:00:00'),
        supabase.from('medical_consultations').select('patient_id').eq('structure_id', sid)
          .gte('created_at', today + 'T00:00:00'),
        supabase.from('medical_rendez_vous').select('*', { count: 'exact', head: true })
          .eq('structure_id', sid).gte('date_heure', today + 'T00:00:00'),
        supabase.from('medical_hospitalisations').select('*', { count: 'exact', head: true })
          .eq('structure_id', sid).is('date_sortie_reelle', null),
        supabase.from('finance_factures').select('total_ttc')
          .eq('structure_id', sid).eq('statut', 'payee').gte('created_at', today + 'T00:00:00'),
      ])

      const litsData      = lits.data ?? []
      const litsOccupes   = litsData.filter((l: any) => l.statut === 'occupe').length
      const patientsUniq  = new Set((patientsJour.data ?? []).map((r: any) => r.patient_id)).size
      const recettesTotal = (recettesJour.data ?? []).reduce((s: number, f: any) => s + (f.total_ttc || 0), 0)

      return c.html(dashboardStructurePage(profil, {
        structure: {
          nom:    structure?.nom    ?? 'N/A',
          type:   structure?.type   ?? 'N/A',
          niveau: structure?.niveau ?? 1,
        },
        stats: {
          personnel:         personnel.count     ?? 0,
          patientsJour:      patientsUniq,
          litsOccupes,
          litsTotal:         litsData.length,
          consultationsJour: consultJour.count   ?? 0,
          recettesJour:      recettesTotal,
          rdvJour:           rdvJour.count       ?? 0,
          hospitalisations:  hospitEnCours.count ?? 0,
        },
      }))
    } catch (err) {
      console.error('dashboard/structure:', err)
      return c.html(erreurPage('Erreur tableau de bord structure',
        err instanceof Error ? err.message : String(err)), 500)
    }
  }
)

// \u2500\u2500 M\u00e9decin / Infirmier / Sage-femme / Labo / Radio \u2500\u2500\u2500\u2500\u2500\u2500\u2500
// FIX CRITIQUE : ajout des stats manquantes qui causaient le crash

dashboardRoutes.get('/medecin',
  requireRole('medecin', 'infirmier', 'sage_femme', 'laborantin', 'radiologue'),
  async (c) => {
    try {
      const profil   = c.get('profil')
      const supabase = c.get('supabase')

      const today = new Date().toISOString().split('T')[0]

      const [rdvRes, consultRes, cntConsultJour, cntOrdActives] = await Promise.all([
        // RDV du jour
        supabase.from('medical_rendez_vous')
          .select('id, date_heure, motif, statut, duree_minutes, patient_dossiers(nom, prenom)')
          .eq('medecin_id', profil.id)
          .gte('date_heure', today + 'T00:00:00')
          .lte('date_heure', today + 'T23:59:59')
          .order('date_heure', { ascending: true })
          .limit(10),

        // Consultations r\u00e9centes
        supabase.from('medical_consultations')
          .select('id, created_at, motif, diagnostic_principal, patient_dossiers(nom, prenom)')
          .eq('medecin_id', profil.id)
          .order('created_at', { ascending: false })
          .limit(5),

        // Stats : nb consultations aujourd'hui
        supabase.from('medical_consultations')
          .select('*', { count: 'exact', head: true })
          .eq('medecin_id', profil.id)
          .gte('created_at', today + 'T00:00:00'),

        // Stats : ordonnances actives \u00e9mises par ce m\u00e9decin
        supabase.from('medical_ordonnances')
          .select('*', { count: 'exact', head: true })
          .eq('medecin_id', profil.id)
          .eq('statut', 'active'),
      ])

      const rdvJour      = rdvRes.data      ?? []
      const consultations = consultRes.data ?? []

      return c.html(dashboardMedecinPage(profil, {
        rdvJour,
        consultations,
        // \u2190 stats OBLIGATOIRES \u2014 c'\u00e9tait la cause du crash
        stats: {
          consultationsJour:  cntConsultJour.count  ?? 0,
          rdvAVenir:          rdvJour.length,
          ordonnancesActives: cntOrdActives.count   ?? 0,
        },
      }))
    } catch (err) {
      console.error('dashboard/medecin:', err)
      return c.html(erreurPage('Erreur tableau de bord m&#xe9;decin',
        err instanceof Error ? err.message : String(err)), 500)
    }
  }
)

// \u2500\u2500 Pharmacien \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

dashboardRoutes.get('/pharmacien',
  requireRole('pharmacien'),
  async (c) => {
    try {
      const profil   = c.get('profil')
      const supabase = c.get('supabase')
      const today    = new Date().toISOString().split('T')[0]

      const [ordsRes, delivreesRes, partiellesRes] = await Promise.all([
        supabase
          .from('medical_ordonnances')
          .select(`id, numero_ordonnance, created_at, statut,
            patient_dossiers(nom, prenom),
            auth_medecins!medical_ordonnances_medecin_id_fkey(auth_profiles(nom, prenom))`)
          .eq('structure_id', profil.structure_id)
          .in('statut', ['active', 'partiellement_delivree'])
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('medical_ordonnances')
          .select('id', { count: 'exact', head: true })
          .eq('structure_id', profil.structure_id)
          .eq('statut', 'delivree')
          .gte('created_at', today + 'T00:00:00'),
        supabase.from('medical_ordonnances')
          .select('id', { count: 'exact', head: true })
          .eq('structure_id', profil.structure_id)
          .eq('statut', 'partiellement_delivree'),
      ])

      const ordonnances  = ordsRes.data ?? []
      const totalJour    = ordonnances.length + (delivreesRes.count ?? 0)

      return c.html(dashboardPharmacienPage(profil, {
        ordonnances: ordonnances.map((o: any) => ({
          id:               o.id,
          numero_ordonnance: o.numero_ordonnance,
          patient:          { nom: o.patient_dossiers?.nom ?? '', prenom: o.patient_dossiers?.prenom ?? '' },
          medecin:          { nom: o.auth_medecins?.auth_profiles?.nom ?? '', prenom: o.auth_medecins?.auth_profiles?.prenom ?? '' },
          statut:           o.statut,
          created_at:       o.created_at,
        })),
        stats: {
          ordonnancesJour: totalJour,
          enAttente:       ordonnances.filter((o: any) => o.statut === 'active').length,
          delivrees:       delivreesRes.count ?? 0,
          stockAlertes:    0,  // pas de gestion de stock v1
        },
      }))
    } catch (err) {
      console.error('dashboard/pharmacien:', err)
      return c.html(erreurPage('Erreur tableau de bord pharmacien',
        err instanceof Error ? err.message : String(err)), 500)
    }
  }
)

// \u2500\u2500 Caissier \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

dashboardRoutes.get('/caissier',
  requireRole('caissier'),
  async (c) => {
    try {
      const profil   = c.get('profil')
      const supabase = c.get('supabase')

      const today = new Date().toISOString().split('T')[0]
      const { data: factures } = await supabase
        .from('finance_factures')
        .select('id, numero_facture, total_ttc, statut, created_at, patient_dossiers(nom, prenom)')
        .eq('structure_id', profil.structure_id)
        .gte('created_at', today + 'T00:00:00')
        .order('created_at', { ascending: false })
        .limit(15)

      const facturesArr = factures ?? []
      const totalJour   = facturesArr
        .filter((f: any) => f.statut === 'payee')
        .reduce((sum: number, f: any) => sum + (f.total_ttc ?? 0), 0)

      return c.html(dashboardCaissierPage(profil, {
        factures: facturesArr.map((f: any) => ({
          id:              f.id,
          numero_facture:  f.numero_facture,
          patient:         { nom: f.patient_dossiers?.nom ?? '', prenom: f.patient_dossiers?.prenom ?? '' },
          montant_patient: f.total_ttc ?? 0,
          total_ttc:       f.total_ttc ?? 0,
          statut:          f.statut,
          created_at:      f.created_at,
        })),
        stats: {
          facturesJour: facturesArr.length,
          impayees:     facturesArr.filter((f: any) => f.statut === 'impayee').length,
          recetteJour:  totalJour,
          attente:      facturesArr.filter((f: any) => f.statut === 'partiellement_payee').length,
        },
      }))
    } catch (err) {
      console.error('dashboard/caissier:', err)
      return c.html(erreurPage('Erreur tableau de bord caissier',
        err instanceof Error ? err.message : String(err)), 500)
    }
  }
)

// \u2500\u2500 Agent Accueil \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

dashboardRoutes.get('/accueil',
  requireRole('agent_accueil'),
  async (c) => {
    try {
      const profil   = c.get('profil')
      const supabase = c.get('supabase')

      const today = new Date().toISOString().split('T')[0]
      const { data: rdvJour } = await supabase
        .from('medical_rendez_vous')
        .select(`
          id, date_heure, motif, statut,
          patient_dossiers(nom, prenom),
          auth_profiles!medical_rendez_vous_medecin_id_fkey(nom, prenom)
        `)
        .eq('structure_id', profil.structure_id)
        .gte('date_heure', today + 'T00:00:00')
        .lte('date_heure', today + 'T23:59:59')
        .order('date_heure', { ascending: true })

      return c.html(dashboardAccueilPage(profil, rdvJour ?? []))
    } catch (err) {
      console.error('dashboard/accueil:', err)
      return c.html(erreurPage('Erreur tableau de bord accueil',
        err instanceof Error ? err.message : String(err)), 500)
    }
  }
)

// \u2500\u2500 Patient \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

dashboardRoutes.get('/patient',
  requireRole('patient'),
  async (c) => {
    try {
      const profil   = c.get('profil')
      const supabase = c.get('supabase')

      const { data: dossier } = await supabase
        .from('patient_dossiers')
        .select('id, numero_national, nom, prenom, date_naissance, groupe_sanguin, rhesus, allergies, maladies_chroniques')
        .eq('profile_id', profil.id)
        .single()

      if (!dossier) return c.html(dashboardPatientSansDossierPage(profil))

      const [rdvRes, ordRes, consRes, consentRes, examenRes] = await Promise.all([
        supabase.from('medical_rendez_vous')
          .select('id, date_heure, motif, auth_profiles!medical_rendez_vous_medecin_id_fkey(nom, prenom)')
          .eq('patient_id', dossier.id)
          .gte('date_heure', new Date().toISOString())
          .in('statut', ['confirme', 'planifie'])
          .order('date_heure', { ascending: true })
          .limit(1),
        supabase.from('medical_ordonnances')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', dossier.id).eq('statut', 'active'),
        supabase.from('medical_consultations')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', dossier.id),
        supabase.from('patient_consentements')
          .select(`auth_profiles!patient_consentements_medecin_id_fkey(
            id, nom, prenom, avatar_url,
            auth_medecins(specialite_principale),
            struct_structures!auth_profiles_structure_id_fkey(nom)
          )`)
          .eq('patient_id', dossier.id).eq('est_actif', true).limit(10),
        supabase.from('medical_examens')
          .select('id, type_examen, nom_examen, statut, created_at')
          .eq('patient_id', dossier.id)
          .order('created_at', { ascending: false }).limit(3),
      ])

      const rdv0       = rdvRes.data?.[0]
      const prochainRdv = rdv0 ? { ...rdv0, medecin: (rdv0 as any).auth_profiles } : null

      const medecins = (consentRes.data ?? [])
        .map((ct: any) => {
          const p = ct.auth_profiles
          if (!p) return null
          return {
            id:         p.id,
            nom:        p.nom,
            prenom:     p.prenom,
            avatar_url: p.avatar_url,
            specialite: p.auth_medecins?.[0]?.specialite_principale ?? 'M\u00e9decin g\u00e9n\u00e9raliste',
            structure:  (p.struct_structures as any)?.nom ?? '',
          }
        })
        .filter(Boolean)

      return c.html(dashboardPatientPage(profil, {
        dossier,
        prochainRdv,
        ordonnancesActives: ordRes.count  ?? 0,
        consultationsTotal: consRes.count ?? 0,
        medecins,
        examens: examenRes.data ?? [],
      }))
    } catch (err) {
      console.error('dashboard/patient:', err)
      return c.html(erreurPage('Erreur tableau de bord patient',
        err instanceof Error ? err.message : String(err)), 500)
    }
  }
)

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// HELPERS PARTAG\u00c9S
// Export\u00e9s ici pour les modules qui les importent depuis './dashboard'
// Les modules grossesse/infirmerie/radiologie utilisent './module-helpers'
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

// ── CNTS ───────────────────────────────────────────────────

dashboardRoutes.get('/cnts',
  requireRole('cnts_agent', 'super_admin'),
  async (c) => {
    try {
      const profil   = c.get('profil')
      const supabase = c.get('supabase')
      const debut    = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [totalRes, dispoRes, urgenceRes, donsRes, groupesRes] = await Promise.all([
        supabase.from('sang_donneurs').select('*', { count: 'exact', head: true }),
        supabase.from('sang_donneurs').select('*', { count: 'exact', head: true }).eq('est_disponible', true),
        supabase.from('sang_demandes_urgence').select('*', { count: 'exact', head: true }).eq('statut', 'en_cours'),
        supabase.from('sang_contacts_log').select('*', { count: 'exact', head: true }).gte('contacte_at', debut),
        supabase.from('sang_donneurs').select('groupe_sanguin, rhesus').eq('est_disponible', true).limit(1000),
      ])

      const compteur: Record<string, number> = {}
      for (const d of groupesRes.data ?? []) {
        const key = `${d.groupe_sanguin}|${d.rhesus}`
        compteur[key] = (compteur[key] ?? 0) + 1
      }
      const parGroupe = Object.entries(compteur)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .map(([key, count]) => {
          const [groupe, rhesus] = key.split('|')
          return { groupe, rhesus, count: count as number }
        })

      const { dashboardCNTSPage } = await import('../pages/dashboard-cnts')
      return c.html(dashboardCNTSPage(profil, {
        stats: {
          donneursTotal:   totalRes.count   ?? 0,
          donneursDispos:  dispoRes.count   ?? 0,
          urgencesEnCours: urgenceRes.count ?? 0,
          donsThisMonth:   donsRes.count    ?? 0,
        },
        parGroupe,
      }))
    } catch (err) {
      console.error('dashboard/cnts:', err)
      return c.html(erreurPage('Erreur dashboard CNTS',
        err instanceof Error ? err.message : String(err)), 500)
    }
  }
)


export function pageSkeleton(
  profil:  AuthProfile,
  titre:   string,
  couleur: string,
  contenu: string
): string {
  const heure = new Date().toLocaleTimeString('fr-FR',  { hour: '2-digit', minute: '2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR',  { weekday: 'long', day: 'numeric', month: 'long' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sant&#xe9;BF &#x2014; ${titre}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root{--c:${couleur};--bg:#F7F8FA;--brd:#E5E7EB;--tx:#1A1A2E;--soft:#6B7280}
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:var(--bg);min-height:100vh}
    header{background:var(--c);padding:0 24px;height:60px;display:flex;align-items:center;
      justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,.15);position:sticky;top:0;z-index:100}
    .hl{display:flex;align-items:center;gap:12px}
    .logo{width:34px;height:34px;background:white;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px}
    .ht{font-family:'DM Serif Display',serif;font-size:18px;color:white}
    .ht span{font-family:'DM Sans',sans-serif;font-size:12px;opacity:.7;display:block;margin-top:-2px}
    .hr{display:flex;align-items:center;gap:12px}
    .ub{background:rgba(255,255,255,.15);border-radius:8px;padding:6px 12px;font-size:13px;color:white}
    .ub strong{display:block;font-size:14px}.ub small{opacity:.75;font-size:11px}
    .logout{background:rgba(255,255,255,.2);color:white;border:none;padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
    .logout:hover{background:rgba(255,255,255,.3)}
    .wrap{max-width:1100px;margin:0 auto;padding:24px 20px}
    .welcome{margin-bottom:24px}
    .welcome h2{font-family:'DM Serif Display',serif;font-size:26px;color:var(--tx);margin-bottom:4px}
    .welcome p{font-size:14px;color:var(--soft)}
    .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;margin-bottom:28px}
    .stat-card{background:white;border-radius:12px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.06);border-top:4px solid var(--c)}
    .stat-icon{font-size:28px;margin-bottom:8px}.stat-val{font-size:28px;font-weight:700;color:var(--c)}.stat-lbl{font-size:12px;color:var(--soft);margin-top:4px}
    .actions-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:28px}
    .action-card{background:white;border-radius:12px;padding:20px 16px;text-align:center;text-decoration:none;color:var(--tx);box-shadow:0 2px 8px rgba(0,0,0,.06);transition:transform .2s,box-shadow .2s;display:flex;flex-direction:column;align-items:center;gap:10px;border-bottom:3px solid transparent}
    .action-card:hover{transform:translateY(-3px);box-shadow:0 8px 20px rgba(0,0,0,.1)}
    .action-card.vert{border-bottom-color:#1A6B3C}.action-card.blue{border-bottom-color:#1565C0}.action-card.violet{border-bottom-color:#4A148C}.action-card.orange{border-bottom-color:#E65100}.action-card.rouge{border-bottom-color:#B71C1C}
    .ac-icon{font-size:32px}.ac-lbl{font-size:13px;font-weight:600}
    .table-wrap{background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:24px}
    table{width:100%;border-collapse:collapse}
    thead tr{background:var(--c)}
    thead th{padding:12px 16px;text-align:left;font-size:12px;color:white;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    tbody tr{border-bottom:1px solid var(--brd);transition:background .15s}
    tbody tr:hover{background:#F9FAFB}
    tbody td{padding:12px 16px;font-size:14px}
    tbody tr:last-child{border-bottom:none}
    .empty{text-align:center;color:var(--soft);font-style:italic}
    .badge-statut{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .badge-statut.payee{background:#E8F5E9;color:#1A6B3C}.badge-statut.impayee{background:#FFF5F5;color:#B71C1C}.badge-statut.partiellement_payee{background:#FFF3E0;color:#E65100}.badge-statut.annulee{background:#F3F4F6;color:#9E9E9E}
    .rdv-list{display:flex;flex-direction:column;gap:10px;margin-bottom:24px}
    .rdv-item{background:white;border-radius:10px;padding:14px 16px;box-shadow:0 2px 6px rgba(0,0,0,.05);display:flex;align-items:center;justify-content:space-between;gap:12px;border-left:4px solid var(--c)}
    .rdv-heure{font-size:16px;font-weight:700;color:var(--c);min-width:50px}
    .rdv-info strong{display:block;font-size:14px}.rdv-info span{font-size:12px;color:var(--soft)}
    .rdv-statut{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .rdv-statut.planifie{background:#E3F2FD;color:#1565C0}.rdv-statut.confirme{background:#E8F5E9;color:#1A6B3C}.rdv-statut.passe{background:#F3F4F6;color:#9E9E9E}.rdv-statut.annule{background:#FFF5F5;color:#B71C1C}
    .date-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    .date-header span{font-size:13px;color:var(--soft)}.date-header strong{font-size:13px;color:var(--tx)}
    @media(max-width:640px){header{padding:0 16px}.ht span{display:none}.ub strong{display:none}.wrap{padding:16px 12px}.stats-grid{grid-template-columns:repeat(2,1fr)}.actions-grid{grid-template-columns:repeat(2,1fr)}.table-wrap{overflow-x:auto}}
  </style>
</head>
<body>
  <header>
    <div class="hl">
      <div class="logo">&#x1F3E5;</div>
      <div class="ht">Sant&#xe9;BF<span>${titre}</span></div>
    </div>
    <div class="hr">
      <div class="ub">
        <strong>${profil.prenom} ${profil.nom}</strong>
        <small>${profil.role.replace(/_/g, ' ')}</small>
      </div>
      <a href="/auth/logout" class="logout">D&#xe9;connexion</a>
    </div>
  </header>
  <div class="wrap">
    <div class="welcome">
      <div class="date-header">
        <h2>Bonjour, ${profil.prenom} &#x1F44B;</h2>
        <div><strong>${heure}</strong><span> &#x2014; ${date}</span></div>
      </div>
      <p>Bienvenue dans votre espace Sant&#xe9;BF</p>
    </div>
    ${contenu}
  </div>
</body>
</html>`
}

export function statsGrid(
  stats: { icon: string; value: string | number; label: string; color?: string }[]
): string {
  return '<div class="stats-grid">' + stats.map(s =>
    '<div class="stat-card"' + (s.color ? ` style="border-top-color:${s.color}"` : '') + '>'
    + '<div class="stat-icon">' + s.icon + '</div>'
    + '<div class="stat-val"' + (s.color ? ` style="color:${s.color}"` : '') + '>' + s.value + '</div>'
    + '<div class="stat-lbl">' + s.label + '</div>'
    + '</div>'
  ).join('') + '</div>'
}

export function actionCard(
  actions: { href: string; icon: string; label: string; colorClass?: string }[]
): string {
  return '<div class="actions-grid">' + actions.map(a =>
    `<a href="${a.href}" class="action-card ${a.colorClass ?? ''}">`
    + `<span class="ac-icon">${a.icon}</span>`
    + `<span class="ac-lbl">${a.label}</span>`
    + '</a>'
  ).join('') + '</div>'
}

export function dataTable(headers: string[], rows: string[][]): string {
  const ths = headers.map(h => '<th>' + h + '</th>').join('')
  const trs = rows.length === 0
    ? `<tr><td colspan="${headers.length}" class="empty">Aucune donn&#xe9;e disponible</td></tr>`
    : rows.map(row => '<tr>' + row.map(cell => '<td>' + cell + '</td>').join('') + '</tr>').join('')
  return '<div class="table-wrap"><table><thead><tr>' + ths + '</tr></thead><tbody>' + trs + '</tbody></table></div>'
}
export function alertHTML(type: 'error' | 'success' | 'warning', message: string): string {
  const styles: Record<string, string> = {
    error:   'background:#FFF5F5;border-left:4px solid #B71C1C;color:#B71C1C;',
    success: 'background:#E8F5E9;border-left:4px solid #1A6B3C;color:#1A6B3C;',
    warning: 'background:#FFF8E1;border-left:4px solid #F9A825;color:#E65100;',
  }
  const icons: Record<string, string> = { error: '⚠️', success: '✓', warning: '⚠️' }
  return `<div style="${styles[type]}border-radius:10px;padding:16px 18px;font-size:14px;font-weight:600;margin:12px 0;">${icons[type]} ${message}</div>`
}
