import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Variables, Bindings } from '../lib/supabase'
import { dashboardAdminPage } from '../pages/dashboard-admin'
import { dashboardMedecinPage } from '../pages/dashboard-medecin'
import { dashboardAccueilPage } from '../pages/dashboard-accueil'
import { dashboardPharmacienPage } from '../pages/dashboard-pharmacien'
import { dashboardCaissierPage } from '../pages/dashboard-caissier'
import { dashboardPatientPage, dashboardPatientSansDossierPage } from '../pages/dashboard-patient'
import { dashboardStructurePage } from '../pages/dashboard-structure'

export const dashboardRoutes = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>()

dashboardRoutes.use('/*', requireAuth)

// ── Super Admin ────────────────────────────────────────────
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
      console.error('❌ Erreur dashboard admin:', err)
      return c.text('Erreur serveur', 500)
    }
  }
)

// ── Admin Structure ────────────────────────────────────────
dashboardRoutes.get('/structure',
  requireRole('admin_structure'),
  async (c) => {
    try {
      const profil   = c.get('profil')
      const supabase = c.get('supabase')

      if (!profil.structure_id) return c.text('Aucune structure assignée', 400)

      const { data: structure } = await supabase
        .from('struct_structures')
        .select('nom, type, niveau')
        .eq('id', profil.structure_id)
        .single()

      const [lits, personnel] = await Promise.all([
        supabase.from('struct_lits').select('statut').eq('structure_id', profil.structure_id),
        supabase.from('auth_profiles').select('*', { count: 'exact', head: true }).eq('structure_id', profil.structure_id),
      ])

      const litsData    = lits.data ?? []
      const litsOccupes = litsData.filter((l: any) => l.statut === 'occupe').length

      return c.html(dashboardStructurePage(profil, {
        structure: {
          nom:    structure?.nom    || 'N/A',
          type:   structure?.type   || 'N/A',
          niveau: structure?.niveau || 1
        },
        stats: {
          personnel:         personnel.count ?? 0,
          patientsJour:      0,
          litsOccupes:       litsOccupes,
          litsTotal:         litsData.length,
          consultationsJour: 0
        }
      }))
    } catch (err) {
      console.error('❌ Erreur dashboard structure:', err)
      return c.text('Erreur serveur', 500)
    }
  }
)

// ── Médecin / Infirmier / Sage-femme / Labo / Radio ───────
dashboardRoutes.get('/medecin',
  requireRole('medecin', 'infirmier', 'sage_femme', 'laborantin', 'radiologue'),
  async (c) => {
    try {
      const profil   = c.get('profil')
      const supabase = c.get('supabase')

      const today = new Date().toISOString().split('T')[0]
      const { data: rdvJour } = await supabase
        .from('medical_rendez_vous')
        .select('id, date_heure, motif, statut, patient_dossiers ( nom, prenom )')
        .eq('medecin_id', profil.id)
        .gte('date_heure', today + 'T00:00:00')
        .lte('date_heure', today + 'T23:59:59')
        .order('date_heure', { ascending: true })
        .limit(10)

      const { data: consultations } = await supabase
        .from('medical_consultations')
        .select('id, created_at, motif, diagnostic_principal, patient_dossiers ( nom, prenom )')
        .eq('medecin_id', profil.id)
        .order('created_at', { ascending: false })
        .limit(5)

      return c.html(dashboardMedecinPage(profil, {
        rdvJour:       rdvJour       ?? [],
        consultations: consultations ?? [],
      }))
    } catch (err) {
      console.error('❌ Erreur dashboard medecin:', err)
      return c.text('Erreur serveur', 500)
    }
  }
)

// ── Pharmacien ─────────────────────────────────────────────
dashboardRoutes.get('/pharmacien',
  requireRole('pharmacien'),
  async (c) => {
    try {
      const profil   = c.get('profil')
      const supabase = c.get('supabase')

      const { data: ordonnances } = await supabase
        .from('medical_ordonnances')
        .select('id, numero_ordonnance, created_at, statut, patient_dossiers ( nom, prenom )')
        .eq('structure_id', profil.structure_id)
        .eq('statut', 'active')
        .order('created_at', { ascending: false })
        .limit(10)

      return c.html(dashboardPharmacienPage(profil, ordonnances ?? []))
    } catch (err) {
      console.error('❌ Erreur dashboard pharmacien:', err)
      return c.text('Erreur serveur', 500)
    }
  }
)

// ── Caissier ───────────────────────────────────────────────
dashboardRoutes.get('/caissier',
  requireRole('caissier'),
  async (c) => {
    try {
      const profil   = c.get('profil')
      const supabase = c.get('supabase')

      const today = new Date().toISOString().split('T')[0]
      const { data: factures } = await supabase
        .from('finance_factures')
        .select('id, numero_facture, total_ttc, statut, created_at, patient_dossiers ( nom, prenom )')
        .eq('structure_id', profil.structure_id)
        .gte('created_at', today + 'T00:00:00')
        .order('created_at', { ascending: false })
        .limit(15)

      const totalJour = (factures ?? [])
        .filter((f: any) => f.statut === 'payee')
        .reduce((sum: number, f: any) => sum + (f.total_ttc ?? 0), 0)

      return c.html(dashboardCaissierPage(profil, {
        factures: (factures ?? []).map((f: any) => ({
          id:             f.id,
          numero_facture: f.numero_facture,
          patient:        { nom: f.patient_dossiers?.nom || '', prenom: f.patient_dossiers?.prenom || '' },
          montant_patient: f.total_ttc ?? 0,
          total_ttc:       f.total_ttc ?? 0,
          statut:          f.statut,
          created_at:      f.created_at
        })),
        stats: {
          facturesJour: factures?.length ?? 0,
          impayees:     (factures ?? []).filter((f: any) => f.statut === 'impayee').length,
          recetteJour:  totalJour,
          attente:      (factures ?? []).filter((f: any) => f.statut === 'en_attente').length
        }
      }))
    } catch (err) {
      console.error('❌ Erreur dashboard caissier:', err)
      return c.text('Erreur serveur', 500)
    }
  }
)

// ── Agent Accueil ──────────────────────────────────────────
dashboardRoutes.get('/accueil',
  requireRole('agent_accueil'),
  async (c) => {
    try {
      const profil   = c.get('profil')
      const supabase = c.get('supabase')

      const today = new Date().toISOString().split('T')[0]
      const { data: rdvJour } = await supabase
        .from('medical_rendez_vous')
        .select('id, date_heure, motif, statut, patient_dossiers ( nom, prenom ), auth_profiles ( nom, prenom )')
        .eq('structure_id', profil.structure_id)
        .gte('date_heure', today + 'T00:00:00')
        .lte('date_heure', today + 'T23:59:59')
        .order('date_heure', { ascending: true })

      return c.html(dashboardAccueilPage(profil, rdvJour ?? []))
    } catch (err) {
      console.error('❌ Erreur dashboard accueil:', err)
      return c.text('Erreur serveur', 500)
    }
  }
)

// ── Patient ─────────────────────────────────────────────────
// ✅ CORRIGÉ : plus d'écran noir, données complètes
dashboardRoutes.get('/patient',
  requireRole('patient'),
  async (c) => {
    try {
      const profil   = c.get('profil')
      const supabase = c.get('supabase')

      // Dossier patient
      const { data: dossier } = await supabase
        .from('patient_dossiers')
        .select('id, numero_national, nom, prenom, date_naissance, groupe_sanguin, rhesus, allergies, maladies_chroniques')
        .eq('profile_id', profil.id)
        .single()

      // ✅ Pas de dossier → page d'accueil limitée (plus d'écran noir)
      if (!dossier) {
        return c.html(dashboardPatientSansDossierPage(profil))
      }

      // Toutes les données en parallèle
      const [
        rdvResult,
        ordResult,
        consResult,
        consentResult,
        examenResult,
      ] = await Promise.all([
        // Prochain RDV confirmé
        supabase
          .from('medical_rendez_vous')
          .select('id, date_heure, motif, auth_profiles!medical_rendez_vous_medecin_id_fkey(nom, prenom)')
          .eq('patient_id', dossier.id)
          .gte('date_heure', new Date().toISOString())
          .in('statut', ['confirme', 'planifie'])
          .order('date_heure', { ascending: true })
          .limit(1),

        // Ordonnances actives (count)
        supabase
          .from('medical_ordonnances')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', dossier.id)
          .eq('statut', 'active'),

        // Consultations total (count)
        supabase
          .from('medical_consultations')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', dossier.id),

        // Médecins autorisés via consentements actifs
        supabase
          .from('patient_consentements')
          .select(`
            auth_profiles!patient_consentements_medecin_id_fkey(
              id, nom, prenom, avatar_url,
              auth_medecins(specialite_principale),
              struct_structures!auth_profiles_structure_id_fkey(nom)
            )
          `)
          .eq('patient_id', dossier.id)
          .eq('est_actif', true)
          .limit(10),

        // Derniers examens labo
        supabase
          .from('medical_examens')
          .select('id, type_examen, nom_examen, statut, created_at, valide_par')
          .eq('patient_id', dossier.id)
          .order('created_at', { ascending: false })
          .limit(3),
      ])

      // Prochain RDV
      const rdv0 = rdvResult.data?.[0]
      const prochainRdv = rdv0
        ? { ...rdv0, medecin: (rdv0 as any).auth_profiles }
        : null

      // Médecins formatés
      const medecins = (consentResult.data ?? [])
        .map((c: any) => {
          const p = c.auth_profiles
          if (!p) return null
          return {
            id:         p.id,
            nom:        p.nom,
            prenom:     p.prenom,
            avatar_url: p.avatar_url,
            specialite: p.auth_medecins?.[0]?.specialite_principale || 'Médecin généraliste',
            structure:  (p.struct_structures as any)?.nom || '',
          }
        })
        .filter(Boolean)

      // Examens formatés
      const examens = (examenResult.data ?? []).map((e: any) => ({
        ...e,
        type_categorie: 'laboratoire',
      }))

      return c.html(dashboardPatientPage(profil, {
        dossier,
        prochainRdv,
        ordonnancesActives: ordResult.count  ?? 0,
        consultationsTotal: consResult.count ?? 0,
        medecins,
        examens,
      }))

    } catch (err) {
      console.error('❌ Erreur dashboard patient:', err)
      return c.text('Erreur serveur', 500)
    }
  }
)

// ── Helpers partagés (inchangés) ───────────────────────────
export function pageSkeleton(profil: AuthProfile, titre: string, couleur: string, contenu: string): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — ${titre}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root{--couleur:${couleur};--gris:#F7F8FA;--bordure:#E5E7EB;--texte:#1A1A2E;--soft:#6B7280;}
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:var(--gris);min-height:100vh;}
    header{background:var(--couleur);padding:0 24px;height:60px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,0.15);position:sticky;top:0;z-index:100;}
    .header-left{display:flex;align-items:center;gap:12px;}
    .logo-small{width:34px;height:34px;background:white;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;}
    .header-title{font-family:'DM Serif Display',serif;font-size:18px;color:white;}
    .header-title span{font-family:'DM Sans',sans-serif;font-size:12px;opacity:.7;display:block;margin-top:-2px;}
    .header-right{display:flex;align-items:center;gap:12px;}
    .user-badge{background:rgba(255,255,255,0.15);border-radius:8px;padding:6px 12px;font-size:13px;color:white;}
    .user-badge strong{display:block;font-size:14px;}
    .user-badge small{opacity:.75;font-size:11px;}
    .btn-logout{background:rgba(255,255,255,0.2);color:white;border:none;padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;transition:background .2s;}
    .btn-logout:hover{background:rgba(255,255,255,0.3);}
    .container{max-width:1100px;margin:0 auto;padding:24px 20px;}
    .welcome{margin-bottom:24px;}
    .welcome h2{font-family:'DM Serif Display',serif;font-size:26px;color:var(--texte);margin-bottom:4px;}
    .welcome p{font-size:14px;color:var(--soft);}
    .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;margin-bottom:28px;}
    .stat-card{background:white;border-radius:12px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-top:4px solid var(--couleur);}
    .stat-icon{font-size:28px;margin-bottom:8px;}
    .stat-val{font-size:28px;font-weight:700;color:var(--couleur);}
    .stat-lbl{font-size:12px;color:var(--soft);margin-top:4px;}
    .actions-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:28px;}
    .action-card{background:white;border-radius:12px;padding:20px 16px;text-align:center;text-decoration:none;color:var(--texte);box-shadow:0 2px 8px rgba(0,0,0,0.06);transition:transform .2s,box-shadow .2s;display:flex;flex-direction:column;align-items:center;gap:10px;border-bottom:3px solid transparent;}
    .action-card:hover{transform:translateY(-3px);box-shadow:0 8px 20px rgba(0,0,0,0.1);}
    .action-card.vert{border-bottom-color:#1A6B3C;}.action-card.blue{border-bottom-color:#1565C0;}.action-card.violet{border-bottom-color:#4A148C;}.action-card.orange{border-bottom-color:#E65100;}.action-card.rouge{border-bottom-color:#B71C1C;}
    .ac-icon{font-size:32px;}.ac-lbl{font-size:13px;font-weight:600;}
    .section-title{font-size:14px;font-weight:700;color:var(--soft);text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px;}
    .table-wrap{background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);margin-bottom:24px;}
    table{width:100%;border-collapse:collapse;}
    thead tr{background:var(--couleur);}
    thead th{padding:12px 16px;text-align:left;font-size:12px;color:white;font-weight:600;text-transform:uppercase;letter-spacing:.5px;}
    tbody tr{border-bottom:1px solid var(--bordure);transition:background .15s;}
    tbody tr:hover{background:#F9FAFB;}
    tbody td{padding:12px 16px;font-size:14px;}
    tbody tr:last-child{border-bottom:none;}
    .empty{text-align:center;color:var(--soft);font-style:italic;}
    code{background:#F3F4F6;padding:2px 8px;border-radius:4px;font-size:12px;}
    .badge-statut{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;}
    .badge-statut.payee{background:#E8F5E9;color:#1A6B3C;}.badge-statut.impayee{background:#FFF5F5;color:#B71C1C;}.badge-statut.partiellement_payee{background:#FFF3E0;color:#E65100;}.badge-statut.annulee{background:#F3F4F6;color:#9E9E9E;}
    .rdv-list{display:flex;flex-direction:column;gap:10px;margin-bottom:24px;}
    .rdv-item{background:white;border-radius:10px;padding:14px 16px;box-shadow:0 2px 6px rgba(0,0,0,0.05);display:flex;align-items:center;justify-content:space-between;gap:12px;border-left:4px solid var(--couleur);}
    .rdv-heure{font-size:16px;font-weight:700;color:var(--couleur);min-width:50px;}
    .rdv-info strong{display:block;font-size:14px;}.rdv-info span{font-size:12px;color:var(--soft);}
    .rdv-statut{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;}
    .rdv-statut.planifie{background:#E3F2FD;color:#1565C0;}.rdv-statut.confirme{background:#E8F5E9;color:#1A6B3C;}.rdv-statut.passe{background:#F3F4F6;color:#9E9E9E;}.rdv-statut.annule{background:#FFF5F5;color:#B71C1C;}
    .date-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
    .date-header span{font-size:13px;color:var(--soft);}.date-header strong{font-size:13px;color:var(--texte);}
    @media(max-width:640px){header{padding:0 16px;}.header-title span{display:none;}.user-badge strong{display:none;}.container{padding:16px 12px;}.stats-grid{grid-template-columns:repeat(2,1fr);}.actions-grid{grid-template-columns:repeat(2,1fr);}.table-wrap{overflow-x:auto;}}
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      <div class="logo-small">🏥</div>
      <div class="header-title">SantéBF<span>${titre}</span></div>
    </div>
    <div class="header-right">
      <div class="user-badge">
        <strong>${profil.prenom} ${profil.nom}</strong>
        <small>${profil.role.replace(/_/g,' ')}</small>
      </div>
      <a href="/auth/logout" class="btn-logout">Déconnexion</a>
    </div>
  </header>
  <div class="container">
    <div class="welcome">
      <div class="date-header">
        <h2>Bonjour, ${profil.prenom} 👋</h2>
        <div><strong>${heure}</strong><span> — ${date}</span></div>
      </div>
      <p>Bienvenue dans votre espace SantéBF</p>
    </div>
    ${contenu}
  </div>
</body>
</html>`
}

export function statsGrid(stats: { icon: string; value: string | number; label: string; color?: string }[]): string {
  return `<div class="stats-grid">${stats.map(s=>`<div class="stat-card"${s.color?` style="border-top-color:${s.color}"`:''}><div class="stat-icon">${s.icon}</div><div class="stat-val"${s.color?` style="color:${s.color}"`:''}>${s.value}</div><div class="stat-lbl">${s.label}</div></div>`).join('')}</div>`
}

export function actionCard(actions: { href: string; icon: string; label: string; colorClass?: string }[]): string {
  return `<div class="actions-grid">${actions.map(a=>`<a href="${a.href}" class="action-card ${a.colorClass||''}"><span class="ac-icon">${a.icon}</span><span class="ac-lbl">${a.label}</span></a>`).join('')}</div>`
}

export function dataTable(headers: string[], rows: string[][]): string {
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length===0?`<tr><td colspan="${headers.length}" class="empty">Aucune donnée disponible</td></tr>`:rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
}
