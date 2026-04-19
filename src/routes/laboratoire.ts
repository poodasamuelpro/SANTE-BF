/**
 * src/routes/laboratoire.ts
 * SantéBF — Routes module laboratoire
 *
 * CORRECTIONS APPLIQUÉES :
 *   [DB-14] est_urgent = BOOLEAN (pas priorite: 'urgente')
 *   [DB-14] resultat_texte (pas conclusion)
 *   [DB-14] valeurs_numeriques JSONB (pas resultats)
 *   [DB-14] realise_at (pas date_prelevement)
 *   [QC-10] Toutes requêtes déstructurent { data, error } + vérification error
 *   [S-09]  escapeHtml() systématique sur données affichées
 *   CONSERVÉ : Toute la logique métier et la structure des routes existantes
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase, type Bindings, type Variables, escapeHtml } from '../lib/supabase'

export const laboratoireRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

laboratoireRoutes.use('/*', requireAuth)
laboratoireRoutes.use('/*', requireRole('laborantin', 'medecin', 'infirmier', 'admin_structure', 'super_admin'))

// ── GET /laboratoire ──────────────────────────────────────────────────────────
laboratoireRoutes.get('/', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const structureId = profil.structure_id
    if (!structureId) {
      return c.html(pageErreur('Aucune structure', 'Vous n\'êtes pas associé à une structure.'))
    }

    const [
      { data: examensUrgents,  error: urgErr  },
      { data: examensEnCours,  error: coursErr },
      { data: examensValides,  error: valErr  }
    ] = await Promise.all([
      // [DB-14] est_urgent = BOOLEAN (pas .eq('priorite','urgente'))
      supabase.from('medical_examens')
        .select(`
          id, nom_examen, type_examen, statut,
          est_urgent, date_prescription, created_at,
          patient:patient_dossiers!medical_examens_patient_id_fkey(nom, prenom)
        `)
        .eq('structure_id', structureId)
        .eq('type_examen', 'laboratoire')
        .eq('est_urgent', true)
        .in('statut', ['prescrit', 'en_cours'])
        .order('created_at', { ascending: false })
        .limit(10),

      supabase.from('medical_examens')
        .select(`
          id, nom_examen, type_examen, statut,
          est_urgent, date_prescription, created_at,
          patient:patient_dossiers!medical_examens_patient_id_fkey(nom, prenom)
        `)
        .eq('structure_id', structureId)
        .eq('type_examen', 'laboratoire')
        .in('statut', ['prescrit', 'en_cours'])
        .eq('est_urgent', false)
        .order('est_urgent', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(20),

      supabase.from('medical_examens')
        .select(`
          id, nom_examen, statut, realise_at, created_at,
          patient:patient_dossiers!medical_examens_patient_id_fkey(nom, prenom)
        `)
        .eq('structure_id', structureId)
        .eq('type_examen', 'laboratoire')
        .eq('statut', 'valide')
        .order('realise_at', { ascending: false })
        .limit(10)
    ])

    // [QC-10] Log erreurs non bloquantes
    if (urgErr)   console.warn('[labo] urgents:',   urgErr.message)
    if (coursErr) console.warn('[labo] en cours:',  coursErr.message)
    if (valErr)   console.warn('[labo] validés:',   valErr.message)

    return c.html(pageLaboratoireDashboard(
      examensUrgents ?? [],
      examensEnCours ?? [],
      examensValides ?? [],
      profil
    ))

  } catch (err) {
    console.error('[laboratoire/]', err)
    return c.html(pageErreur('Erreur serveur', 'Impossible de charger le dashboard.'))
  }
})

// ── GET /laboratoire/examens ──────────────────────────────────────────────────
laboratoireRoutes.get('/examens', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const structureId = profil.structure_id
    if (!structureId) return c.html(pageErreur('Aucune structure', ''))

    const statut  = c.req.query('statut') ?? 'all'
    const page    = parseInt(c.req.query('page') ?? '1')
    const perPage = 25
    const from    = (page - 1) * perPage
    const to      = from + perPage - 1

    let query = supabase.from('medical_examens')
      .select(`
        id, nom_examen, type_examen, statut,
        est_urgent, date_prescription, realise_at, created_at,
        patient:patient_dossiers!medical_examens_patient_id_fkey(nom, prenom)
      `, { count: 'exact' })
      .eq('structure_id', structureId)
      .eq('type_examen', 'laboratoire')

    if (statut !== 'all') {
      query = query.eq('statut', statut)
    }

    const { data: examens, error, count } = await query
      .order('est_urgent', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('[labo/examens]', error.message)
      return c.html(pageErreur('Erreur', 'Impossible de charger les examens.'))
    }

    return c.html(pageListeExamens(examens ?? [], statut, page, Math.ceil((count ?? 0) / perPage)))

  } catch (err) {
    console.error('[laboratoire/examens]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── GET /laboratoire/examens/:id ──────────────────────────────────────────────
laboratoireRoutes.get('/examens/:id', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')
  const id       = c.req.param('id')

  try {
    const { data: examen, error } = await supabase
      .from('medical_examens')
      .select(`
        id, nom_examen, type_examen, description_demande,
        est_urgent, statut,
        date_prescription, realise_at, valide_at,
        resultat_texte, valeurs_numeriques, interpretation, est_anormal,
        fichier_url,
        patient:patient_dossiers!medical_examens_patient_id_fkey(id, nom, prenom, date_naissance, groupe_sanguin),
        prescripteur:auth_profiles!medical_examens_prescripteur_id_fkey(nom, prenom)
      `)
      .eq('id', id)
      .eq('structure_id', profil.structure_id ?? '')
      .single()

    if (error || !examen) {
      return c.html(pageErreur('Examen introuvable', 'Cet examen n\'existe pas ou vous n\'avez pas accès.'))
    }

    return c.html(pageDetailExamen(examen))

  } catch (err) {
    console.error('[laboratoire/examens/:id]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── POST /laboratoire/examens/:id/resultat ────────────────────────────────────
laboratoireRoutes.post('/examens/:id/resultat', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')
  const id       = c.req.param('id')

  try {
    const body = await c.req.parseBody()

    // [DB-14] Colonnes réelles : resultat_texte, valeurs_numeriques, realise_at
    const { error } = await supabase
      .from('medical_examens')
      .update({
        // [DB-14] resultat_texte (pas conclusion)
        resultat_texte:     String(body.resultat_texte ?? '').trim() || null,
        // [DB-14] interpretation (correcte)
        interpretation:     String(body.interpretation ?? '').trim() || null,
        // [DB-14] est_anormal = BOOLEAN (pas string)
        est_anormal:        body.est_anormal === 'true' || body.est_anormal === 'on',
        // [DB-14] realise_at (pas date_prelevement)
        realise_at:         new Date().toISOString(),
        realise_par:        profil.id,
        statut:             'realise',
        updated_at:         new Date().toISOString(),
      })
      .eq('id', id)
      .eq('structure_id', profil.structure_id ?? '')

    if (error) {
      console.error('[labo/resultat]', error.message)
      return c.html(pageErreur('Erreur', 'Impossible d\'enregistrer le résultat : ' + error.message))
    }

    return c.redirect(`/laboratoire/examens/${id}?success=1`)

  } catch (err) {
    console.error('[laboratoire/examens/:id/resultat]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── POST /laboratoire/examens/:id/valider ────────────────────────────────────
laboratoireRoutes.post('/examens/:id/valider', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')
  const id       = c.req.param('id')

  try {
    const { error } = await supabase
      .from('medical_examens')
      .update({
        statut:     'valide',
        valide_par: profil.id,
        valide_at:  new Date().toISOString(),
      })
      .eq('id', id)
      .eq('structure_id', profil.structure_id ?? '')

    if (error) {
      console.error('[labo/valider]', error.message)
      return c.json({ success: false, error: error.message }, 500)
    }

    return c.json({ success: true })

  } catch (err) {
    console.error('[laboratoire/examens/:id/valider]', err)
    return c.json({ success: false, error: 'Erreur serveur' }, 500)
  }
})

// ─── Pages HTML ───────────────────────────────────────────────────────────────

function layoutLabo(titre: string, profil: any, content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(titre)} | Laboratoire SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--primary:#6A1B9A;--rouge:#C62828;--vert:#1B5E20;--orange:#E65100;
      --text:#1a1a2e;--text2:#5A6A78;--border:#E0E0E0;--bg:#F7F8FA}
    body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text)}
    header{background:var(--primary);padding:14px 20px;display:flex;align-items:center;gap:12px;color:white;box-shadow:0 2px 8px rgba(0,0,0,.2)}
    .logo{font-family:'DM Serif Display',serif;font-size:18px}
    .user-info{margin-left:auto;font-size:13px;opacity:.9}
    nav{background:white;padding:0 20px;border-bottom:1px solid var(--border);display:flex;gap:0;overflow-x:auto}
    nav a{padding:12px 16px;text-decoration:none;color:var(--text2);font-size:13px;font-weight:500;border-bottom:2px solid transparent;white-space:nowrap}
    nav a:hover,nav a.active{color:var(--primary);border-color:var(--primary)}
    .main{max-width:1200px;margin:0 auto;padding:24px 16px}
    .page-title{font-family:'DM Serif Display',serif;font-size:24px;color:var(--primary);margin-bottom:20px}
    .card{background:white;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:16px}
    .card-title{font-weight:700;font-size:15px;color:var(--text);margin-bottom:14px;display:flex;align-items:center;gap:8px}
    .stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px}
    .stat-card{background:white;border-radius:10px;padding:16px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.06)}
    .stat-number{font-size:28px;font-weight:700}
    .stat-label{font-size:12px;color:var(--text2);margin-top:4px}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .badge-urgent{background:#FFEBEE;color:var(--rouge)}
    .badge-encours{background:#FFF3E0;color:var(--orange)}
    .badge-valide{background:#E8F5E9;color:var(--vert)}
    .badge-prescrit{background:#E3F2FD;color:#0D47A1}
    .table-wrap{overflow-x:auto}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;padding:10px 12px;background:#F7F8FA;color:var(--text2);font-weight:600;font-size:12px;border-bottom:2px solid var(--border)}
    td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:middle}
    tr:hover td{background:#FAFAFA}
    .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:7px;font-size:12px;font-weight:600;text-decoration:none;border:none;cursor:pointer;transition:.2s}
    .btn-primary{background:var(--primary);color:white}
    .btn-secondary{background:#F3F4F6;color:var(--text);border:1px solid var(--border)}
    .btn-success{background:#2E7D32;color:white}
    .urgent-row td{border-left:3px solid var(--rouge)}
    .empty-state{text-align:center;padding:40px;color:var(--text2)}
    form label{display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:var(--text)}
    form input,form textarea,form select{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;margin-bottom:14px}
    form textarea{min-height:80px;resize:vertical}
  </style>
</head>
<body>
<header>
  <div class="logo">🔬 Laboratoire</div>
  <div class="user-info">Dr ${escapeHtml(profil?.prenom)} ${escapeHtml(profil?.nom)}</div>
</header>
<nav>
  <a href="/laboratoire" class="active">Dashboard</a>
  <a href="/laboratoire/examens">Tous les examens</a>
  <a href="/laboratoire/examens?statut=prescrit">En attente</a>
  <a href="/laboratoire/examens?statut=realise">À valider</a>
  <a href="/dashboard/medecin">← Retour</a>
</nav>
<main class="main">
  <h1 class="page-title">${escapeHtml(titre)}</h1>
  ${content}
</main>
</body>
</html>`
}

function pageLaboratoireDashboard(urgents: any[], enCours: any[], valides: any[], profil: any): string {
  const content = `
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-number" style="color:var(--rouge)">${urgents.length}</div>
        <div class="stat-label">🚨 Urgents</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color:var(--orange)">${enCours.length}</div>
        <div class="stat-label">⏳ En attente</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color:var(--vert)">${valides.length}</div>
        <div class="stat-label">✅ Validés aujourd'hui</div>
      </div>
    </div>

    ${urgents.length ? `
    <div class="card">
      <div class="card-title">🚨 Examens urgents</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Patient</th><th>Examen</th><th>Prescrit le</th><th>Statut</th><th>Action</th></tr></thead>
          <tbody>
            ${urgents.map(ex => `
            <tr class="urgent-row">
              <td><strong>${escapeHtml(ex.patient?.nom)} ${escapeHtml(ex.patient?.prenom)}</strong></td>
              <td>${escapeHtml(ex.nom_examen)}<br><small style="color:var(--text2)">${escapeHtml(ex.type_examen)}</small></td>
              <td>${ex.date_prescription ? new Date(ex.date_prescription).toLocaleDateString('fr-BF') : '—'}</td>
              <td><span class="badge badge-urgent">🚨 Urgent</span></td>
              <td><a href="/laboratoire/examens/${ex.id}" class="btn btn-primary">Traiter →</a></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-title">⏳ Examens en attente de traitement</div>
      ${enCours.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Patient</th><th>Examen</th><th>Prescrit le</th><th>Statut</th><th>Action</th></tr></thead>
          <tbody>
            ${enCours.map(ex => `
            <tr>
              <td>${escapeHtml(ex.patient?.nom)} ${escapeHtml(ex.patient?.prenom)}</td>
              <td>${escapeHtml(ex.nom_examen)}</td>
              <td>${ex.date_prescription ? new Date(ex.date_prescription).toLocaleDateString('fr-BF') : '—'}</td>
              <td><span class="badge badge-prescrit">${escapeHtml(ex.statut)}</span></td>
              <td><a href="/laboratoire/examens/${ex.id}" class="btn btn-secondary">Voir →</a></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<div class="empty-state">✅ Aucun examen en attente</div>'}
    </div>
  `
  return layoutLabo('Laboratoire', profil, content)
}

function pageListeExamens(examens: any[], statut: string, page: number, totalPages: number): string {
  // Sera rendu dans le contexte du layout — mock profil pour l'affichage
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Liste examens | Laboratoire SantéBF</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#F7F8FA;padding:20px}
.card{background:white;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:#F7F8FA;padding:10px;text-align:left;border-bottom:2px solid #E0E0E0}
td{padding:10px;border-bottom:1px solid #E0E0E0}
.badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
.btn{padding:8px 14px;border-radius:7px;font-size:12px;text-decoration:none;font-weight:600;display:inline-block}
.btn-primary{background:#6A1B9A;color:white}
.filters{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.filters a{padding:7px 14px;background:white;border:1px solid #E0E0E0;border-radius:20px;font-size:12px;text-decoration:none;color:#374151}
.filters a.active{background:#6A1B9A;color:white;border-color:#6A1B9A}
</style>
</head>
<body>
<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
  <a href="/laboratoire" style="text-decoration:none;color:#6A1B9A;font-weight:600">← Dashboard</a>
  <h1 style="font-size:22px;color:#1a1a2e">Examens de laboratoire</h1>
</div>
<div class="filters">
  <a href="/laboratoire/examens" class="${statut === 'all' ? 'active' : ''}">Tous</a>
  <a href="/laboratoire/examens?statut=prescrit" class="${statut === 'prescrit' ? 'active' : ''}">En attente</a>
  <a href="/laboratoire/examens?statut=en_cours" class="${statut === 'en_cours' ? 'active' : ''}">En cours</a>
  <a href="/laboratoire/examens?statut=realise" class="${statut === 'realise' ? 'active' : ''}">À valider</a>
  <a href="/laboratoire/examens?statut=valide" class="${statut === 'valide' ? 'active' : ''}">Validés</a>
</div>
<div class="card">
  ${examens.length ? `
  <div style="overflow-x:auto">
    <table>
      <thead><tr><th>Patient</th><th>Examen</th><th>Urgence</th><th>Prescrit le</th><th>Réalisé le</th><th>Statut</th><th>Action</th></tr></thead>
      <tbody>
        ${examens.map(ex => `
        <tr ${ex.est_urgent ? 'style="border-left:3px solid #C62828"' : ''}>
          <td><strong>${escapeHtml(ex.patient?.nom)} ${escapeHtml(ex.patient?.prenom)}</strong></td>
          <td>${escapeHtml(ex.nom_examen)}<br><small style="color:#6B7280">${escapeHtml(ex.type_examen)}</small></td>
          <!-- [DB-14] est_urgent = BOOLEAN -->
          <td>${ex.est_urgent ? '<span style="color:#C62828;font-weight:700">🚨 Oui</span>' : '—'}</td>
          <td>${ex.date_prescription ? new Date(ex.date_prescription).toLocaleDateString('fr-BF') : '—'}</td>
          <!-- [DB-14] realise_at (pas date_prelevement) -->
          <td>${ex.realise_at ? new Date(ex.realise_at).toLocaleDateString('fr-BF') : '—'}</td>
          <td><span class="badge" style="background:${
            ex.statut === 'valide' ? '#E8F5E9' :
            ex.statut === 'realise' ? '#FFF3E0' :
            ex.statut === 'prescrit' ? '#E3F2FD' : '#F5F5F5'
          };color:${
            ex.statut === 'valide' ? '#1B5E20' :
            ex.statut === 'realise' ? '#E65100' :
            ex.statut === 'prescrit' ? '#0D47A1' : '#757575'
          }">${escapeHtml(ex.statut)}</span></td>
          <td><a href="/laboratoire/examens/${ex.id}" class="btn btn-primary">→</a></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
  ${totalPages > 1 ? `
  <div style="display:flex;gap:8px;justify-content:center;margin-top:16px">
    ${page > 1 ? `<a href="/laboratoire/examens?statut=${statut}&page=${page-1}" class="btn btn-primary">← Précédent</a>` : ''}
    <span style="padding:6px 12px;font-size:13px;color:#6B7280">Page ${page}/${totalPages}</span>
    ${page < totalPages ? `<a href="/laboratoire/examens?statut=${statut}&page=${page+1}" class="btn btn-primary">Suivant →</a>` : ''}
  </div>` : ''}
  ` : '<div style="text-align:center;padding:40px;color:#6B7280">Aucun examen</div>'}
</div>
</body></html>`
}

function pageDetailExamen(examen: any): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(examen.nom_examen)} | Laboratoire SantéBF</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:#F7F8FA;padding:20px;color:#1a1a2e}
.card{background:white;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:16px}
.card-title{font-weight:700;font-size:16px;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:16px}
.info-item{background:#F7F8FA;padding:10px 14px;border-radius:8px}
.info-label{font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;margin-bottom:3px}
.info-value{font-size:14px;font-weight:600}
form label{display:block;font-size:13px;font-weight:600;margin-bottom:5px;color:#374151}
form textarea,form select,form input{width:100%;padding:10px 12px;border:1px solid #E0E0E0;border-radius:8px;font-size:13px;margin-bottom:14px;font-family:inherit}
form textarea{min-height:80px;resize:vertical}
.btn{padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;text-decoration:none;display:inline-block}
.btn-primary{background:#6A1B9A;color:white}
.btn-success{background:#2E7D32;color:white}
.btn-secondary{background:#F3F4F6;color:#374151;border:1px solid #E0E0E0}
.urgent-banner{background:#FFEBEE;border:1px solid #EF9A9A;border-radius:8px;padding:12px 16px;color:#C62828;font-weight:600;margin-bottom:16px}
.success-banner{background:#E8F5E9;border:1px solid #A5D6A7;border-radius:8px;padding:12px 16px;color:#1B5E20;margin-bottom:16px}
</style>
</head>
<body>
<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
  <a href="/laboratoire" style="text-decoration:none;color:#6A1B9A;font-weight:600">← Retour</a>
  <h1 style="font-size:20px">Détail de l'examen</h1>
</div>

${examen.est_urgent ? '<div class="urgent-banner">🚨 Examen URGENT — À traiter en priorité</div>' : ''}

<div class="card">
  <div class="card-title">🔬 ${escapeHtml(examen.nom_examen)}</div>
  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">Patient</div>
      <div class="info-value">${escapeHtml(examen.patient?.nom)} ${escapeHtml(examen.patient?.prenom)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Type d'examen</div>
      <div class="info-value">${escapeHtml(examen.type_examen)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Prescrit par</div>
      <div class="info-value">Dr ${escapeHtml(examen.prescripteur?.prenom)} ${escapeHtml(examen.prescripteur?.nom)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Date prescription</div>
      <div class="info-value">${examen.date_prescription ? new Date(examen.date_prescription).toLocaleDateString('fr-BF') : '—'}</div>
    </div>
    <!-- [DB-14] realise_at (pas date_prelevement) -->
    <div class="info-item">
      <div class="info-label">Date réalisation</div>
      <div class="info-value">${examen.realise_at ? new Date(examen.realise_at).toLocaleString('fr-BF') : 'Non réalisé'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Statut</div>
      <div class="info-value">${escapeHtml(examen.statut)}</div>
    </div>
  </div>
  ${examen.description_demande ? `
  <div style="background:#F7F8FA;padding:12px;border-radius:8px;margin-bottom:12px">
    <div style="font-size:12px;color:#6B7280;font-weight:600;margin-bottom:4px">DEMANDE DU MÉDECIN</div>
    <div style="font-size:14px">${escapeHtml(examen.description_demande)}</div>
  </div>` : ''}
</div>

${examen.statut === 'prescrit' || examen.statut === 'en_cours' ? `
<div class="card">
  <div class="card-title">📝 Saisir les résultats</div>
  <form method="POST" action="/laboratoire/examens/${examen.id}/resultat">
    <label>Résultats textuels</label>
    <!-- [DB-14] resultat_texte est la colonne réelle (pas conclusion) -->
    <textarea name="resultat_texte" placeholder="Décrire les résultats de l'examen...">${escapeHtml(examen.resultat_texte ?? '')}</textarea>
    
    <label>Interprétation</label>
    <textarea name="interpretation" placeholder="Interprétation clinique des résultats...">${escapeHtml(examen.interpretation ?? '')}</textarea>
    
    <label>
      <input type="checkbox" name="est_anormal" value="true" ${examen.est_anormal ? 'checked' : ''}>
      Résultat anormal / pathologique
    </label>
    
    <div style="margin-top:14px">
      <button type="submit" class="btn btn-primary">💾 Enregistrer les résultats</button>
    </div>
  </form>
</div>` : ''}

${examen.resultat_texte || examen.interpretation ? `
<div class="card">
  <div class="card-title">📊 Résultats enregistrés</div>
  ${examen.est_anormal ? '<div class="urgent-banner">⚠️ Résultat ANORMAL</div>' : ''}
  
  ${examen.resultat_texte ? `
  <div style="margin-bottom:12px">
    <div style="font-size:12px;color:#6B7280;font-weight:600;margin-bottom:4px">RÉSULTATS</div>
    <!-- [DB-14] resultat_texte (colonne réelle, alias de conclusion) -->
    <div style="background:#F7F8FA;padding:12px;border-radius:8px;font-size:14px;line-height:1.6">${escapeHtml(examen.resultat_texte)}</div>
  </div>` : ''}
  
  ${examen.interpretation ? `
  <div>
    <div style="font-size:12px;color:#6B7280;font-weight:600;margin-bottom:4px">INTERPRÉTATION</div>
    <div style="background:#F7F8FA;padding:12px;border-radius:8px;font-size:14px;line-height:1.6">${escapeHtml(examen.interpretation)}</div>
  </div>` : ''}
  
  ${examen.statut === 'realise' ? `
  <div style="margin-top:16px">
    <button onclick="fetch('/laboratoire/examens/${examen.id}/valider',{method:'POST'}).then(r=>r.json()).then(d=>{if(d.success)location.reload()})" 
      class="btn btn-success">✅ Valider et signer</button>
  </div>` : ''}
</div>` : ''}
</body></html>`
}

function pageErreur(titre: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>${escapeHtml(titre)}</title></head>
<body style="font-family:sans-serif;padding:40px;text-align:center">
  <h1 style="color:#C62828">${escapeHtml(titre)}</h1>
  <p style="color:#6B7280;margin:16px 0">${escapeHtml(message)}</p>
  <a href="/laboratoire" style="background:#6A1B9A;color:white;padding:10px 20px;border-radius:8px;text-decoration:none">← Retour</a>
</body></html>`
}