import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile } from '../lib/supabase'
import { dashboardAdminPage } from '../pages/dashboard-admin'
import { dashboardMedecinPage } from '../pages/dashboard-medecin'
import { dashboardAccueilPage } from '../pages/dashboard-accueil'
import { dashboardPharmacienPage } from '../pages/dashboard-pharmacien'
import { dashboardCaissierPage } from '../pages/dashboard-caissier'
import { dashboardPatientPage } from '../pages/dashboard-patient'
import { dashboardStructurePage } from '../pages/dashboard-structure'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
export const dashboardRoutes = new Hono<{ Bindings: Bindings }>()

dashboardRoutes.use('/*', requireAuth)

// ── Super Admin ────────────────────────────────────────────
dashboardRoutes.get('/admin',
  requireRole('super_admin'),
  async (c) => {
    const profil   = c.get('profil' as never) as AuthProfile
    const supabase = c.get('supabase' as never) as any

    // Stats nationales
    const [structures, comptes, patients] = await Promise.all([
      supabase.from('struct_structures').select('id', { count: 'exact', head: true }),
      supabase.from('auth_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('patient_dossiers').select('id', { count: 'exact', head: true }),
    ])

    return c.html(dashboardAdminPage(profil, {
      nbStructures: structures.count ?? 0,
      nbComptes:    comptes.count    ?? 0,
      nbPatients:   patients.count   ?? 0,
    }))
  }
)

// ── Admin Structure ────────────────────────────────────────
dashboardRoutes.get('/structure',
  requireRole('admin_structure'),
  async (c) => {
    const profil   = c.get('profil' as never) as AuthProfile
    const supabase = c.get('supabase' as never) as any

    const { data: structure } = await supabase
      .from('struct_structures')
      .select('nom, type, niveau')
      .eq('id', profil.structure_id)
      .single()

    const [lits, personnel] = await Promise.all([
      supabase.from('struct_lits').select('statut').eq('structure_id', profil.structure_id),
      supabase.from('auth_profiles').select('id', { count: 'exact', head: true }).eq('structure_id', profil.structure_id),
    ])

    const litsData    = lits.data ?? []
    const litsDispos  = litsData.filter((l: any) => l.statut === 'disponible').length
    const litsOccupes = litsData.filter((l: any) => l.statut === 'occupe').length

    return c.html(dashboardStructurePage(profil, structure, {
      nbPersonnel: personnel.count ?? 0,
      litsDispos,
      litsOccupes,
      litsTotal: litsData.length,
    }))
  }
)

// ── Médecin / Infirmier / Sage-femme ──────────────────────
dashboardRoutes.get('/medecin',
  requireRole('medecin', 'infirmier', 'sage_femme', 'laborantin', 'radiologue'),
  async (c) => {
    const profil   = c.get('profil' as never) as AuthProfile
    const supabase = c.get('supabase' as never) as any

    // RDV du jour
    const today = new Date().toISOString().split('T')[0]
    const { data: rdvJour } = await supabase
      .from('medical_rendez_vous')
      .select(`
        id, date_heure, motif, statut,
        patient_dossiers ( nom, prenom )
      `)
      .eq('medecin_id', profil.id)
      .gte('date_heure', today + 'T00:00:00')
      .lte('date_heure', today + 'T23:59:59')
      .order('date_heure', { ascending: true })
      .limit(10)

    // Dernières consultations
    const { data: consultations } = await supabase
      .from('medical_consultations')
      .select(`
        id, created_at, motif, diagnostic_principal,
        patient_dossiers ( nom, prenom )
      `)
      .eq('medecin_id', profil.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return c.html(dashboardMedecinPage(profil, {
      rdvJour:       rdvJour       ?? [],
      consultations: consultations ?? [],
    }))
  }
)

// ── Pharmacien ─────────────────────────────────────────────
dashboardRoutes.get('/pharmacien',
  requireRole('pharmacien'),
  async (c) => {
    const profil   = c.get('profil' as never) as AuthProfile
    const supabase = c.get('supabase' as never) as any

    const { data: ordonnances } = await supabase
      .from('medical_ordonnances')
      .select(`
        id, numero_ordonnance, created_at, statut,
        patient_dossiers ( nom, prenom )
      `)
      .eq('structure_id', profil.structure_id)
      .eq('statut', 'active')
      .order('created_at', { ascending: false })
      .limit(10)

    return c.html(dashboardPharmacienPage(profil, ordonnances ?? []))
  }
)

// ── Caissier ───────────────────────────────────────────────
dashboardRoutes.get('/caissier',
  requireRole('caissier'),
  async (c) => {
    const profil   = c.get('profil' as never) as AuthProfile
    const supabase = c.get('supabase' as never) as any

    const today = new Date().toISOString().split('T')[0]
    const { data: factures } = await supabase
      .from('finance_factures')
      .select(`
        id, numero_facture, total_ttc, statut, created_at,
        patient_dossiers ( nom, prenom )
      `)
      .eq('structure_id', profil.structure_id)
      .gte('created_at', today + 'T00:00:00')
      .order('created_at', { ascending: false })
      .limit(15)

    const totalJour = (factures ?? [])
      .filter((f: any) => f.statut === 'payee')
      .reduce((sum: number, f: any) => sum + (f.total_ttc ?? 0), 0)

    return c.html(dashboardCaissierPage(profil, factures ?? [], totalJour))
  }
)

// ── Agent Accueil ──────────────────────────────────────────
dashboardRoutes.get('/accueil',
  requireRole('agent_accueil'),
  async (c) => {
    const profil   = c.get('profil' as never) as AuthProfile
    const supabase = c.get('supabase' as never) as any

    const today = new Date().toISOString().split('T')[0]
    const { data: rdvJour } = await supabase
      .from('medical_rendez_vous')
      .select(`
        id, date_heure, motif, statut,
        patient_dossiers ( nom, prenom ),
        auth_profiles ( nom, prenom )
      `)
      .eq('structure_id', profil.structure_id)
      .gte('date_heure', today + 'T00:00:00')
      .lte('date_heure', today + 'T23:59:59')
      .order('date_heure', { ascending: true })

    return c.html(dashboardAccueilPage(profil, rdvJour ?? []))
  }
)

// ── Patient ────────────────────────────────────────────────
dashboardRoutes.get('/patient',
  requireRole('patient'),
  async (c) => {
    const profil   = c.get('profil' as never) as AuthProfile
    const supabase = c.get('supabase' as never) as any

    const { data: dossier } = await supabase
      .from('patient_dossiers')
      .select(`
        numero_national, nom, prenom, date_naissance,
        groupe_sanguin, rhesus, allergies, maladies_chroniques
      `)
      .eq('profile_id', profil.id)
      .single()

    const { data: ordonnances } = await supabase
      .from('medical_ordonnances')
      .select('id, numero_ordonnance, statut, created_at')
      .eq('patient_id', dossier?.id)
      .eq('statut', 'active')
      .limit(5)

    return c.html(dashboardPatientPage(profil, dossier, ordonnances ?? []))
  }
)

// ── Pages internes ─────────────────────────────────────────
function dashboardStructurePage(profil: AuthProfile, structure: any, stats: any): string {
  return pageSkeleton(profil, 'Admin Structure', '#1565C0', `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-val">${stats.nbPersonnel}</div>
        <div class="stat-lbl">Personnel</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🛏️</div>
        <div class="stat-val">${stats.litsDispos}</div>
        <div class="stat-lbl">Lits disponibles</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏥</div>
        <div class="stat-val">${stats.litsOccupes}</div>
        <div class="stat-lbl">Lits occupés</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-val">${stats.litsTotal}</div>
        <div class="stat-lbl">Lits total</div>
      </div>
    </div>
    <div class="actions-grid">
      <a href="/structure/personnel" class="action-card blue">
        <span class="ac-icon">👥</span>
        <span class="ac-lbl">Mon personnel</span>
      </a>
      <a href="/structure/lits" class="action-card blue">
        <span class="ac-icon">🛏️</span>
        <span class="ac-lbl">État des lits</span>
      </a>
      <a href="/structure/stats" class="action-card blue">
        <span class="ac-icon">📈</span>
        <span class="ac-lbl">Statistiques</span>
      </a>
      <a href="/structure/facturation" class="action-card blue">
        <span class="ac-icon">💰</span>
        <span class="ac-lbl">Facturation</span>
      </a>
    </div>
  `)
}

function dashboardPharmacienPage(profil: AuthProfile, ordonnances: any[]): string {
  return pageSkeleton(profil, 'Pharmacie', '#E65100', `
    <div class="actions-grid">
      <a href="/pharmacien/scanner" class="action-card orange">
        <span class="ac-icon">📱</span>
        <span class="ac-lbl">Scanner QR ordonnance</span>
      </a>
      <a href="/pharmacien/ordonnances" class="action-card orange">
        <span class="ac-icon">💊</span>
        <span class="ac-lbl">Ordonnances actives</span>
      </a>
    </div>
    <div class="section-title">Ordonnances actives récentes</div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Numéro</th><th>Patient</th><th>Date</th><th>Action</th>
        </tr></thead>
        <tbody>
          ${ordonnances.length === 0
            ? '<tr><td colspan="4" class="empty">Aucune ordonnance active</td></tr>'
            : ordonnances.map((o: any) => `
              <tr>
                <td><code>${o.numero_ordonnance}</code></td>
                <td>${(o.patient_dossiers as any)?.prenom} ${(o.patient_dossiers as any)?.nom}</td>
                <td>${new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
                <td><a href="/pharmacien/ordonnances/${o.qr_code_verification}" class="btn-sm">Délivrer</a></td>
              </tr>`).join('')
          }
        </tbody>
      </table>
    </div>
  `)
}

function dashboardCaissierPage(profil: AuthProfile, factures: any[], totalJour: number): string {
  return pageSkeleton(profil, 'Caisse', '#B71C1C', `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-val">${new Intl.NumberFormat('fr-FR').format(totalJour)}</div>
        <div class="stat-lbl">FCFA encaissés aujourd'hui</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-val">${factures.length}</div>
        <div class="stat-lbl">Factures du jour</div>
      </div>
    </div>
    <div class="actions-grid">
      <a href="/caissier/facture/nouvelle" class="action-card rouge">
        <span class="ac-icon">➕</span>
        <span class="ac-lbl">Nouvelle facture</span>
      </a>
      <a href="/caissier/rapport" class="action-card rouge">
        <span class="ac-icon">📊</span>
        <span class="ac-lbl">Rapport de caisse</span>
      </a>
    </div>
    <div class="section-title">Factures du jour</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Numéro</th><th>Patient</th><th>Montant</th><th>Statut</th></tr></thead>
        <tbody>
          ${factures.length === 0
            ? '<tr><td colspan="4" class="empty">Aucune facture aujourd\'hui</td></tr>'
            : factures.map((f: any) => `
              <tr>
                <td><code>${f.numero_facture}</code></td>
                <td>${(f.patient_dossiers as any)?.prenom} ${(f.patient_dossiers as any)?.nom}</td>
                <td>${new Intl.NumberFormat('fr-FR').format(f.total_ttc)} FCFA</td>
                <td><span class="badge-statut ${f.statut}">${f.statut}</span></td>
              </tr>`).join('')
          }
        </tbody>
      </table>
    </div>
  `)
}

function dashboardPatientPage(profil: AuthProfile, dossier: any, ordonnances: any[]): string {
  const age = dossier ? Math.floor(
    (Date.now() - new Date(dossier.date_naissance).getTime()) / (1000*60*60*24*365.25)
  ) : 0
  return pageSkeleton(profil, 'Mon Dossier', '#1A6B3C', `
    ${dossier ? `
    <div class="patient-card">
      <div class="patient-info">
        <span class="groupe-sanguin">🩸 ${dossier.groupe_sanguin}${dossier.rhesus}</span>
        <span>${age} ans</span>
        <span>N° ${dossier.numero_national}</span>
      </div>
    </div>` : ''}
    <div class="actions-grid">
      <a href="/patient/dossier" class="action-card vert">
        <span class="ac-icon">📁</span>
        <span class="ac-lbl">Mon dossier médical</span>
      </a>
      <a href="/patient/ordonnances" class="action-card vert">
        <span class="ac-icon">💊</span>
        <span class="ac-lbl">Mes ordonnances</span>
      </a>
      <a href="/patient/rdv" class="action-card vert">
        <span class="ac-icon">📅</span>
        <span class="ac-lbl">Mes rendez-vous</span>
      </a>
      <a href="/patient/consentements" class="action-card vert">
        <span class="ac-icon">🔐</span>
        <span class="ac-lbl">Mes consentements</span>
      </a>
    </div>
  `)
}

// ── Skeleton HTML partagé par tous les dashboards ──────────
function pageSkeleton(profil: AuthProfile, titre: string, couleur: string, contenu: string): string {
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
    :root {
      --couleur: ${couleur};
      --gris: #F7F8FA;
      --bordure: #E5E7EB;
      --texte: #1A1A2E;
      --soft: #6B7280;
    }
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',sans-serif; background:var(--gris); min-height:100vh; }

    /* Header */
    header {
      background: var(--couleur);
      padding: 0 24px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      position: sticky; top: 0; z-index: 100;
    }
    .header-left { display:flex; align-items:center; gap:12px; }
    .logo-small {
      width:34px; height:34px;
      background:white;
      border-radius:8px;
      display:flex; align-items:center; justify-content:center;
      font-size:18px;
    }
    .header-title {
      font-family:'DM Serif Display',serif;
      font-size:18px; color:white;
    }
    .header-title span {
      font-family:'DM Sans',sans-serif;
      font-size:12px;
      opacity:.7;
      display:block;
      margin-top:-2px;
    }
    .header-right { display:flex; align-items:center; gap:12px; }
    .user-badge {
      background:rgba(255,255,255,0.15);
      border-radius:8px;
      padding:6px 12px;
      font-size:13px;
      color:white;
    }
    .user-badge strong { display:block; font-size:14px; }
    .user-badge small { opacity:.75; font-size:11px; }
    .btn-logout {
      background:rgba(255,255,255,0.2);
      color:white;
      border:none;
      padding:8px 14px;
      border-radius:8px;
      font-size:13px;
      cursor:pointer;
      text-decoration:none;
      font-family:'DM Sans',sans-serif;
      transition:background .2s;
    }
    .btn-logout:hover { background:rgba(255,255,255,0.3); }

    /* Layout */
    .container { max-width:1100px; margin:0 auto; padding:24px 20px; }

    /* Bienvenue */
    .welcome {
      margin-bottom:24px;
    }
    .welcome h2 {
      font-family:'DM Serif Display',serif;
      font-size:26px;
      color:var(--texte);
      margin-bottom:4px;
    }
    .welcome p { font-size:14px; color:var(--soft); }

    /* Stats grid */
    .stats-grid {
      display:grid;
      grid-template-columns:repeat(auto-fill, minmax(180px,1fr));
      gap:16px;
      margin-bottom:28px;
    }
    .stat-card {
      background:white;
      border-radius:12px;
      padding:20px;
      text-align:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.06);
      border-top:4px solid var(--couleur);
    }
    .stat-icon { font-size:28px; margin-bottom:8px; }
    .stat-val  { font-size:28px; font-weight:700; color:var(--couleur); }
    .stat-lbl  { font-size:12px; color:var(--soft); margin-top:4px; }

    /* Actions grid */
    .actions-grid {
      display:grid;
      grid-template-columns:repeat(auto-fill, minmax(160px,1fr));
      gap:14px;
      margin-bottom:28px;
    }
    .action-card {
      background:white;
      border-radius:12px;
      padding:20px 16px;
      text-align:center;
      text-decoration:none;
      color:var(--texte);
      box-shadow:0 2px 8px rgba(0,0,0,0.06);
      transition:transform .2s, box-shadow .2s;
      display:flex; flex-direction:column;
      align-items:center; gap:10px;
      border-bottom:3px solid transparent;
    }
    .action-card:hover { transform:translateY(-3px); box-shadow:0 8px 20px rgba(0,0,0,0.1); }
    .action-card.vert  { border-bottom-color:#1A6B3C; }
    .action-card.blue  { border-bottom-color:#1565C0; }
    .action-card.violet{ border-bottom-color:#4A148C; }
    .action-card.orange{ border-bottom-color:#E65100; }
    .action-card.rouge { border-bottom-color:#B71C1C; }
    .ac-icon { font-size:32px; }
    .ac-lbl  { font-size:13px; font-weight:600; }

    /* Section titre */
    .section-title {
      font-size:14px;
      font-weight:700;
      color:var(--soft);
      text-transform:uppercase;
      letter-spacing:.8px;
      margin-bottom:12px;
    }

    /* Table */
    .table-wrap {
      background:white;
      border-radius:12px;
      overflow:hidden;
      box-shadow:0 2px 8px rgba(0,0,0,0.06);
      margin-bottom:24px;
    }
    table { width:100%; border-collapse:collapse; }
    thead tr { background:var(--couleur); }
    thead th { padding:12px 16px; text-align:left; font-size:12px; color:white; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
    tbody tr { border-bottom:1px solid var(--bordure); transition:background .15s; }
    tbody tr:hover { background:#F9FAFB; }
    tbody td { padding:12px 16px; font-size:14px; }
    tbody tr:last-child { border-bottom:none; }
    .empty { text-align:center; color:var(--soft); font-style:italic; }
    code { background:#F3F4F6; padding:2px 8px; border-radius:4px; font-size:12px; }

    /* Badges statut */
    .badge-statut { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
    .badge-statut.payee           { background:#E8F5E9; color:#1A6B3C; }
    .badge-statut.impayee         { background:#FFF5F5; color:#B71C1C; }
    .badge-statut.partiellement_payee { background:#FFF3E0; color:#E65100; }
    .badge-statut.annulee         { background:#F3F4F6; color:#9E9E9E; }

    /* Patient card */
    .patient-card {
      background:white;
      border-radius:12px;
      padding:16px 20px;
      margin-bottom:24px;
      box-shadow:0 2px 8px rgba(0,0,0,0.06);
      border-left:4px solid var(--couleur);
    }
    .patient-info { display:flex; gap:20px; align-items:center; flex-wrap:wrap; }
    .groupe-sanguin {
      background:#FFF5F5; color:#B71C1C;
      padding:4px 12px; border-radius:20px;
      font-size:14px; font-weight:700;
    }

    /* RDV liste */
    .rdv-list { display:flex; flex-direction:column; gap:10px; margin-bottom:24px; }
    .rdv-item {
      background:white;
      border-radius:10px;
      padding:14px 16px;
      box-shadow:0 2px 6px rgba(0,0,0,0.05);
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      border-left:4px solid var(--couleur);
    }
    .rdv-heure { font-size:16px; font-weight:700; color:var(--couleur); min-width:50px; }
    .rdv-info strong { display:block; font-size:14px; }
    .rdv-info span   { font-size:12px; color:var(--soft); }
    .rdv-statut { padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600; }
    .rdv-statut.planifie  { background:#E3F2FD; color:#1565C0; }
    .rdv-statut.confirme  { background:#E8F5E9; color:#1A6B3C; }
    .rdv-statut.passe     { background:#F3F4F6; color:#9E9E9E; }
    .rdv-statut.annule    { background:#FFF5F5; color:#B71C1C; }

    /* Btn small */
    .btn-sm {
      background:var(--couleur);
      color:white;
      padding:5px 12px;
      border-radius:6px;
      text-decoration:none;
      font-size:12px;
      font-weight:600;
    }

    /* Date header */
    .date-header {
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:6px;
    }
    .date-header span { font-size:13px; color:var(--soft); }
    .date-header strong { font-size:13px; color:var(--texte); }

    /* Responsive */
    @media (max-width:640px) {
      header { padding:0 16px; }
      .header-title span { display:none; }
      .user-badge strong { display:none; }
      .container { padding:16px 12px; }
      .stats-grid { grid-template-columns:repeat(2,1fr); }
      .actions-grid { grid-template-columns:repeat(2,1fr); }
      .table-wrap { overflow-x:auto; }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      <div class="logo-small">🏥</div>
      <div class="header-title">
        SantéBF
        <span>${titre}</span>
      </div>
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
        <div>
          <strong>${heure}</strong>
          <span> — ${date}</span>
        </div>
      </div>
      <p>Bienvenue dans votre espace SantéBF</p>
    </div>

    ${contenu}
  </div>
</body>
</html>`
}
