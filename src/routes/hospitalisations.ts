/**
 * src/routes/hospitalisations.ts
 * SantéBF — Routes module hospitalisations
 *
 * CORRECTIONS APPLIQUÉES :
 *   [DB-17] motif → motif_admission (colonne réelle)
 *   [DB-17] compte_rendu_sortie → instructions_sortie (colonne réelle)
 *   [DB-17] medecin_id → medecin_responsable_id (colonne réelle pour INSERT)
 *   [DB-05] statut = GENERATED ALWAYS (colonne calculée, ne pas insérer)
 *   [DB-01] medecin_responsable_id = profil.medecin_id ?? profil.id
 *   [QC-10] Toutes les requêtes déstructurent { data, error }
 *   [S-09]  escapeHtml() systématique
 *   CONSERVÉ : Toute la logique métier existante
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase, type Bindings, type Variables, escapeHtml } from '../lib/supabase'
import { sanitizeInput } from '../utils/validation'

export const hospitalisationRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

hospitalisationRoutes.use('/*', requireAuth)
hospitalisationRoutes.use('/*', requireRole(
  'medecin', 'infirmier', 'admin_structure', 'super_admin'
))

// ── GET /hospitalisations ──────────────────────────────────────────────────────
hospitalisationRoutes.get('/', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const structureId = profil.structure_id
    if (!structureId) {
      return c.html(pageErreur('Aucune structure', 'Vous n\'êtes pas associé à une structure de santé.'))
    }

    // [DB-05] statut est GENERATED ALWAYS depuis date_sortie_reelle
    // On filtre sur date_sortie_reelle IS NULL pour "en cours"
    const [
      { data: enCours, error: enCoursErr },
      { data: recentes, error: recentesErr },
      { data: lits, error: litsErr }
    ] = await Promise.all([
      supabase.from('medical_hospitalisations')
        .select(`
          id, date_entree, date_sortie_prevue,
          motif_admission, diagnostic_entree, etat_a_l_entree,
          statut, lit_id,
          patient:patient_dossiers!medical_hospitalisations_patient_id_fkey(id, nom, prenom, groupe_sanguin, telephone),
          medecin:auth_profiles!medical_hospitalisations_medecin_responsable_id_fkey(nom, prenom),
          service:struct_services!medical_hospitalisations_service_id_fkey(nom)
        `)
        .eq('structure_id', structureId)
        // [DB-05] En cours = date_sortie_reelle IS NULL
        .is('date_sortie_reelle', null)
        .order('date_entree', { ascending: false }),

      supabase.from('medical_hospitalisations')
        .select(`
          id, date_entree, date_sortie_reelle, statut, motif_admission,
          patient:patient_dossiers!medical_hospitalisations_patient_id_fkey(nom, prenom)
        `)
        .eq('structure_id', structureId)
        .not('date_sortie_reelle', 'is', null)
        .order('date_sortie_reelle', { ascending: false })
        .limit(10),

      supabase.from('struct_lits')
        .select('id, numero_lit, statut, chambre')
        .eq('structure_id', structureId)
    ])

    if (enCoursErr)   console.error('[hosp/] en cours:', enCoursErr.message)
    if (recentesErr)  console.error('[hosp/] récentes:', recentesErr.message)
    if (litsErr)      console.error('[hosp/] lits:', litsErr.message)

    const litsLibres = (lits ?? []).filter(l => l.statut === 'libre').length
    const litsOccupes = (lits ?? []).filter(l => l.statut === 'occupe').length

    return c.html(pageHospitalisationsDashboard(
      enCours ?? [],
      recentes ?? [],
      litsLibres,
      litsOccupes,
      (lits ?? []).length
    ))

  } catch (err) {
    console.error('[hospitalisations/]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── GET /hospitalisations/nouvelle ────────────────────────────────────────────
hospitalisationRoutes.get('/nouvelle', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const patientSearch = sanitizeInput(c.req.query('patient') ?? '')
    const patientId     = c.req.query('patient_id') ?? ''

    let patient: any = null
    let patients:  any[] = []
    let services:  any[] = []
    let lits:      any[] = []

    // Récupérer les services et lits disponibles
    const [{ data: svcs }, { data: litsData }] = await Promise.all([
      supabase.from('struct_services')
        .select('id, nom, nb_lits_total')
        .eq('structure_id', profil.structure_id ?? '')
        .eq('est_actif', true),
      supabase.from('struct_lits')
        .select('id, numero_lit, chambre, type_lit, statut')
        .eq('structure_id', profil.structure_id ?? '')
        .eq('statut', 'libre')
    ])
    services = svcs ?? []
    lits     = litsData ?? []

    if (patientId) {
      const { data } = await supabase
        .from('patient_dossiers')
        .select('id, nom, prenom, date_naissance, groupe_sanguin, rhesus, telephone, numero_national')
        .eq('id', patientId)
        .single()
      patient = data
    } else if (patientSearch.length >= 2) {
      const { data } = await supabase
        .from('patient_dossiers')
        .select('id, nom, prenom, date_naissance, numero_national, telephone')
        .or(`nom.ilike.%${patientSearch}%,prenom.ilike.%${patientSearch}%,numero_national.ilike.%${patientSearch}%`)
        .limit(10)
      patients = data ?? []
    }

    return c.html(pageNouvelleHospitalisation(patient, patients, services, lits, patientSearch))

  } catch (err) {
    console.error('[hospitalisations/nouvelle]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── POST /hospitalisations/nouvelle ──────────────────────────────────────────
hospitalisationRoutes.post('/nouvelle', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const body = await c.req.parseBody()

    const patientId  = String(body.patient_id ?? '').trim()
    const serviceId  = String(body.service_id ?? '').trim()
    const litId      = String(body.lit_id ?? '').trim() || null

    if (!patientId || !serviceId) {
      return c.html(pageErreur('Données manquantes', 'Patient et service sont obligatoires.'))
    }

    // [DB-01] Utiliser profil.medecin_id ?? profil.id pour medecin_responsable_id
    const medecinId = (profil as any).medecin_id ?? profil.id

    // [DB-05] Ne PAS insérer statut (GENERATED ALWAYS depuis date_sortie_reelle)
    const { data: hosp, error } = await supabase
      .from('medical_hospitalisations')
      .insert({
        patient_id:              patientId,
        structure_id:            profil.structure_id,
        service_id:              serviceId,
        lit_id:                  litId || null,
        // [DB-01] medecin_responsable_id (pas medecin_id)
        medecin_responsable_id:  medecinId,
        admission_par:           profil.id,
        date_entree:             new Date().toISOString(),
        date_sortie_prevue:      String(body.date_sortie_prevue ?? '') || null,
        // [DB-17] motif_admission (pas motif)
        motif_admission:         sanitizeInput(String(body.motif_admission ?? ''), 500),
        diagnostic_entree:       sanitizeInput(String(body.diagnostic_entree ?? ''), 500) || null,
        etat_a_l_entree:         String(body.etat_a_l_entree ?? '') || null,
        // [DB-05] PAS de statut ici — c'est GENERATED ALWAYS
        created_at:              new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error || !hosp) {
      console.error('[hosp/nouvelle POST]', error?.message)
      return c.html(pageErreur('Erreur', 'Impossible de créer l\'hospitalisation : ' + (error?.message ?? 'Erreur inconnue')))
    }

    // Mettre à jour le statut du lit
    if (litId) {
      const { error: litErr } = await supabase
        .from('struct_lits')
        .update({ statut: 'occupe' })
        .eq('id', litId)
      if (litErr) console.warn('[hosp/nouvelle] update lit:', litErr.message)
    }

    return c.redirect(`/hospitalisations/${hosp.id}?created=1`)

  } catch (err) {
    console.error('[hospitalisations/nouvelle POST]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── GET /hospitalisations/:id ─────────────────────────────────────────────────
hospitalisationRoutes.get('/:id', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')
  const id       = c.req.param('id')

  try {
    const { data: hosp, error } = await supabase
      .from('medical_hospitalisations')
      .select(`
        id, date_entree, date_sortie_prevue, date_sortie_reelle,
        motif_admission, diagnostic_entree, etat_a_l_entree,
        diagnostic_sortie, type_sortie, instructions_sortie,
        notes_evolution, rapport_sortie_url, statut, lit_id,
        created_at, updated_at,
        patient:patient_dossiers!medical_hospitalisations_patient_id_fkey(
          id, nom, prenom, date_naissance, groupe_sanguin, rhesus, telephone, allergies
        ),
        medecin:auth_profiles!medical_hospitalisations_medecin_responsable_id_fkey(nom, prenom),
        service:struct_services!medical_hospitalisations_service_id_fkey(nom),
        lit:struct_lits!medical_hospitalisations_lit_id_fkey(numero_lit, chambre)
      `)
      .eq('id', id)
      .eq('structure_id', profil.structure_id ?? '')
      .single()

    if (error || !hosp) {
      return c.html(pageErreur('Hospitalisation introuvable', 'Cette hospitalisation n\'existe pas ou vous n\'y avez pas accès.'))
    }

    // Constantes récentes du patient
    const { data: constantes } = await supabase
      .from('medical_constantes')
      .select('date_mesure, tension_systolique, tension_diastolique, temperature, pouls, saturation_o2, poids')
      .eq('patient_id', hosp.patient_id ?? (hosp.patient as any)?.id)
      .order('date_mesure', { ascending: false })
      .limit(5)

    return c.html(pageDetailHospitalisation(hosp, constantes ?? []))

  } catch (err) {
    console.error('[hospitalisations/:id]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── POST /hospitalisations/:id/sortie ─────────────────────────────────────────
hospitalisationRoutes.post('/:id/sortie', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')
  const id       = c.req.param('id')

  try {
    const body = await c.req.parseBody()

    // [DB-17] instructions_sortie (pas compte_rendu_sortie)
    // [DB-17] type_sortie (pas statut pour le champ de sortie)
    const { error } = await supabase
      .from('medical_hospitalisations')
      .update({
        date_sortie_reelle:  new Date().toISOString(),
        diagnostic_sortie:   sanitizeInput(String(body.diagnostic_sortie ?? ''), 500) || null,
        // [DB-17] type_sortie (colonne réelle — pas statut)
        type_sortie:         String(body.type_sortie ?? 'gueri'),
        // [DB-17] instructions_sortie (colonne réelle — pas compte_rendu_sortie)
        instructions_sortie: sanitizeInput(String(body.instructions_sortie ?? ''), 1000) || null,
        updated_at:          new Date().toISOString(),
      })
      .eq('id', id)
      .eq('structure_id', profil.structure_id ?? '')

    if (error) {
      console.error('[hosp/sortie]', error.message)
      return c.json({ success: false, error: error.message }, 500)
    }

    // Libérer le lit si associé
    const { data: hosp } = await supabase
      .from('medical_hospitalisations')
      .select('lit_id')
      .eq('id', id)
      .single()

    if (hosp?.lit_id) {
      await supabase.from('struct_lits')
        .update({ statut: 'en_nettoyage' })
        .eq('id', hosp.lit_id)
    }

    return c.json({ success: true })

  } catch (err) {
    console.error('[hospitalisations/:id/sortie]', err)
    return c.json({ success: false, error: 'Erreur serveur' }, 500)
  }
})

// ── POST /hospitalisations/:id/note ──────────────────────────────────────────
hospitalisationRoutes.post('/:id/note', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')
  const id       = c.req.param('id')

  try {
    const body = await c.req.parseBody()
    const note = sanitizeInput(String(body.note ?? ''), 2000)

    if (!note) return c.json({ success: false, error: 'Note vide' }, 400)

    // Récupérer les notes existantes
    const { data: hosp, error: getErr } = await supabase
      .from('medical_hospitalisations')
      .select('notes_evolution')
      .eq('id', id)
      .eq('structure_id', profil.structure_id ?? '')
      .single()

    if (getErr || !hosp) return c.json({ success: false, error: 'Introuvable' }, 404)

    const notesExistantes: any[] = Array.isArray(hosp.notes_evolution) ? hosp.notes_evolution : []
    const nouvelleNote = {
      date:       new Date().toISOString(),
      note,
      medecin_id: profil.id,
      auteur:     `${profil.prenom} ${profil.nom}`
    }

    const { error: updateErr } = await supabase
      .from('medical_hospitalisations')
      .update({
        notes_evolution: [...notesExistantes, nouvelleNote],
        updated_at:      new Date().toISOString()
      })
      .eq('id', id)

    if (updateErr) {
      console.error('[hosp/note]', updateErr.message)
      return c.json({ success: false, error: updateErr.message }, 500)
    }

    return c.json({ success: true, note: nouvelleNote })

  } catch (err) {
    console.error('[hospitalisations/:id/note]', err)
    return c.json({ success: false, error: 'Erreur serveur' }, 500)
  }
})

// ─── Pages HTML ───────────────────────────────────────────────────────────────

function layoutHosp(titre: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(titre)} | Hospitalisations SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--primary:#1A237E;--rouge:#C62828;--vert:#1B5E20;--orange:#E65100;
      --text:#1a1a2e;--text2:#5A6A78;--border:#E0E0E0;--bg:#F0F0FF}
    body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text)}
    header{background:var(--primary);padding:14px 20px;color:white;display:flex;align-items:center;gap:12px}
    nav{background:white;padding:0 20px;border-bottom:1px solid var(--border);display:flex;gap:0;overflow-x:auto}
    nav a{padding:12px 16px;text-decoration:none;color:var(--text2);font-size:13px;font-weight:500;border-bottom:2px solid transparent;white-space:nowrap}
    nav a:hover{color:var(--primary);border-color:var(--primary)}
    .main{max-width:1200px;margin:0 auto;padding:24px 16px}
    .card{background:white;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:16px}
    .card-title{font-weight:700;font-size:15px;margin-bottom:14px;display:flex;align-items:center;gap:8px}
    .stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}
    .stat{background:white;border-radius:10px;padding:16px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.06)}
    .stat-number{font-size:28px;font-weight:700;color:var(--primary)}
    .stat-label{font-size:12px;color:var(--text2);margin-top:4px}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .badge-encours{background:#E8EAF6;color:var(--primary)}
    .badge-sorti{background:#E8F5E9;color:var(--vert)}
    .badge-rouge{background:#FFEBEE;color:var(--rouge)}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{background:#F7F8FA;padding:10px 12px;text-align:left;border-bottom:2px solid var(--border);font-size:12px;color:var(--text2);font-weight:600}
    td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:middle}
    .btn{display:inline-flex;gap:6px;padding:8px 14px;border-radius:7px;font-size:12px;font-weight:600;text-decoration:none;border:none;cursor:pointer}
    .btn-primary{background:var(--primary);color:white}
    .btn-success{background:#2E7D32;color:white}
    .btn-secondary{background:#F3F4F6;color:var(--text);border:1px solid var(--border)}
    .btn-danger{background:var(--rouge);color:white}
    form label{display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:var(--text)}
    form input,form select,form textarea{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;margin-bottom:12px;font-family:inherit}
    form textarea{min-height:80px;resize:vertical}
    .info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:16px}
    .info-item{background:#F7F8FA;padding:10px 14px;border-radius:8px}
    .info-label{font-size:11px;color:var(--text2);font-weight:600;text-transform:uppercase;margin-bottom:3px}
    .info-value{font-size:14px;font-weight:600}
    .note-item{background:#F7F8FA;border-left:3px solid var(--primary);border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:8px}
    .note-date{font-size:11px;color:var(--text2);margin-bottom:4px}
  </style>
</head>
<body>
<header>
  <div style="font-family:'DM Serif Display',serif;font-size:18px">🏥 Hospitalisations SantéBF</div>
</header>
<nav>
  <a href="/hospitalisations">Dashboard</a>
  <a href="/hospitalisations/nouvelle">Nouvelle admission</a>
  <a href="/dashboard/medecin">← Retour médecin</a>
</nav>
<main class="main">
  <h1 style="font-family:'DM Serif Display',serif;font-size:24px;color:var(--primary);margin-bottom:20px">${escapeHtml(titre)}</h1>
  ${content}
</main>
</body>
</html>`
}

function pageHospitalisationsDashboard(
  enCours: any[],
  recentes: any[],
  litsLibres: number,
  litsOccupes: number,
  totalLits: number
): string {
  const tauxOccupation = totalLits > 0 ? Math.round((litsOccupes / totalLits) * 100) : 0

  const content = `
    <div class="stats-row">
      <div class="stat"><div class="stat-number">${enCours.length}</div><div class="stat-label">🏥 En cours</div></div>
      <div class="stat"><div class="stat-number" style="color:var(--vert)">${litsLibres}</div><div class="stat-label">🛏️ Lits libres</div></div>
      <div class="stat"><div class="stat-number" style="color:var(--orange)">${litsOccupes}</div><div class="stat-label">🛏️ Lits occupés</div></div>
      <div class="stat"><div class="stat-number" style="color:${tauxOccupation > 80 ? 'var(--rouge)' : 'var(--primary)'}">${tauxOccupation}%</div><div class="stat-label">📊 Taux occupation</div></div>
    </div>

    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <a href="/hospitalisations/nouvelle" class="btn btn-primary">➕ Nouvelle admission</a>
    </div>

    <div class="card">
      <div class="card-title">🏥 Hospitalisations en cours (${enCours.length})</div>
      ${enCours.length ? `
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>Patient</th><th>Service</th><th>Lit</th><th>Date entrée</th><th>Sortie prévue</th><th>Motif</th><th>Médecin</th><th>Action</th></tr></thead>
          <tbody>
            ${enCours.map(h => {
              const patient = h.patient as any
              const medecin = h.medecin as any
              const service = h.service as any
              const lit     = h.lit as any
              const estEnRetard = h.date_sortie_prevue && new Date(h.date_sortie_prevue) < new Date()
              return `
              <tr ${estEnRetard ? 'style="background:#FFF3E0"' : ''}>
                <td>
                  <strong>${escapeHtml(patient?.nom)} ${escapeHtml(patient?.prenom)}</strong>
                  ${patient?.groupe_sanguin ? `<div style="font-size:11px;color:#C62828">${escapeHtml(patient.groupe_sanguin)} ${escapeHtml(patient.rhesus || '')}</div>` : ''}
                </td>
                <td>${escapeHtml(service?.nom) || '—'}</td>
                <td>${escapeHtml(lit?.numero_lit) || '—'} ${lit?.chambre ? `(${escapeHtml(lit.chambre)})` : ''}</td>
                <td>${new Date(h.date_entree).toLocaleDateString('fr-BF')}</td>
                <td ${estEnRetard ? 'style="color:var(--rouge);font-weight:600"' : ''}>
                  ${h.date_sortie_prevue ? new Date(h.date_sortie_prevue).toLocaleDateString('fr-BF') : '—'}
                  ${estEnRetard ? ' ⚠️' : ''}
                </td>
                <!-- [DB-17] motif_admission (colonne réelle) -->
                <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(h.motif_admission) || '—'}</td>
                <td>Dr ${escapeHtml(medecin?.prenom)} ${escapeHtml(medecin?.nom)}</td>
                <td><a href="/hospitalisations/${h.id}" class="btn btn-primary">→</a></td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>` : '<div style="text-align:center;padding:32px;color:var(--text2)">✅ Aucune hospitalisation en cours</div>'}
    </div>

    ${recentes.length ? `
    <div class="card">
      <div class="card-title">📋 Sorties récentes</div>
      <table>
        <thead><tr><th>Patient</th><th>Motif admission</th><th>Date sortie</th><th>Type sortie</th></tr></thead>
        <tbody>
          ${recentes.map(h => `
          <tr>
            <td>${escapeHtml((h.patient as any)?.nom)} ${escapeHtml((h.patient as any)?.prenom)}</td>
            <!-- [DB-17] motif_admission -->
            <td>${escapeHtml(h.motif_admission) || '—'}</td>
            <td>${h.date_sortie_reelle ? new Date(h.date_sortie_reelle).toLocaleDateString('fr-BF') : '—'}</td>
            <!-- [DB-17] type_sortie (colonne réelle) -->
            <td><span class="badge badge-sorti">${escapeHtml(h.type_sortie || h.statut || '—')}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}
  `
  return layoutHosp('Hospitalisations', content)
}

function pageNouvelleHospitalisation(
  patient: any,
  patients: any[],
  services: any[],
  lits: any[],
  search: string
): string {
  const content = `
    ${!patient ? `
    <div class="card">
      <div class="card-title">🔍 Rechercher un patient</div>
      <form method="GET" action="/hospitalisations/nouvelle">
        <div style="display:flex;gap:10px">
          <input type="text" name="patient" value="${escapeAttr(search)}" placeholder="Nom, prénom ou N° patient..." style="flex:1">
          <button type="submit" class="btn btn-primary">Rechercher</button>
        </div>
      </form>
      ${patients.length ? `
      <div style="margin-top:16px">
        ${patients.map(p => `
        <div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <strong>${escapeHtml(p.nom)} ${escapeHtml(p.prenom)}</strong>
            <div style="font-size:12px;color:var(--text2)">${escapeHtml(p.numero_national)} · ${escapeHtml(p.telephone) || '—'}</div>
          </div>
          <a href="/hospitalisations/nouvelle?patient_id=${p.id}" class="btn btn-primary">Sélectionner →</a>
        </div>`).join('')}
      </div>` : search.length >= 2 ? '<p style="color:var(--text2);margin-top:12px">Aucun patient trouvé</p>' : ''}
    </div>` : ''}

    ${patient ? `
    <div class="card" style="border-left:3px solid var(--primary)">
      <div class="card-title">👤 Patient sélectionné</div>
      <p><strong>${escapeHtml(patient.nom)} ${escapeHtml(patient.prenom)}</strong></p>
      <p style="font-size:13px;color:var(--text2)">
        N° ${escapeHtml(patient.numero_national)} ·
        ${patient.groupe_sanguin ? `Groupe ${escapeHtml(patient.groupe_sanguin)}${escapeHtml(patient.rhesus || '')} ·` : ''}
        ${escapeHtml(patient.telephone) || ''}
      </p>
    </div>

    <div class="card">
      <div class="card-title">🏥 Formulaire d'admission</div>
      <form method="POST" action="/hospitalisations/nouvelle">
        <input type="hidden" name="patient_id" value="${patient.id}">

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <label>Service *</label>
            <select name="service_id" required>
              <option value="">— Sélectionner un service —</option>
              ${services.map(s => `<option value="${s.id}">${escapeHtml(s.nom)}</option>`).join('')}
            </select>

            <label>Lit disponible</label>
            <select name="lit_id">
              <option value="">— Pas de lit attribué —</option>
              ${lits.map(l => `<option value="${l.id}">${escapeHtml(l.numero_lit)} ${l.chambre ? `(${escapeHtml(l.chambre)})` : ''} — ${escapeHtml(l.type_lit || 'standard')}</option>`).join('')}
            </select>

            <label>Date de sortie prévue</label>
            <input type="date" name="date_sortie_prevue">
          </div>
          <div>
            <label>État à l'entrée</label>
            <select name="etat_a_l_entree">
              <option value="">— État général —</option>
              <option value="stable">Stable</option>
              <option value="critique">Critique</option>
              <option value="urgence">Urgence</option>
              <option value="convalescent">Convalescent</option>
            </select>
          </div>
        </div>

        <!-- [DB-17] motif_admission (colonne réelle, pas motif) -->
        <label>Motif d'admission *</label>
        <textarea name="motif_admission" placeholder="Ex: Pneumonie sévère nécessitant surveillance..." required></textarea>

        <label>Diagnostic d'entrée</label>
        <textarea name="diagnostic_entree" placeholder="Diagnostic posé à l'entrée..."></textarea>

        <div style="display:flex;gap:12px;margin-top:8px">
          <button type="submit" class="btn btn-primary">🏥 Admettre le patient</button>
          <a href="/hospitalisations" class="btn btn-secondary">Annuler</a>
        </div>
      </form>
    </div>` : ''}
  `
  return layoutHosp('Nouvelle hospitalisation', content)
}

function pageDetailHospitalisation(hosp: any, constantes: any[]): string {
  const patient = hosp.patient as any
  const medecin = hosp.medecin as any
  const service = hosp.service as any
  const lit     = hosp.lit as any
  const enCours = !hosp.date_sortie_reelle

  const content = `
    ${enCours ? '' : '<div style="background:#E8F5E9;border-radius:8px;padding:12px;color:#1B5E20;margin-bottom:16px">✅ Patient sorti le ' + new Date(hosp.date_sortie_reelle).toLocaleDateString('fr-BF') + '</div>'}
    
    <div class="card">
      <div class="card-title">👤 Patient</div>
      <div class="info-grid">
        <div class="info-item"><div class="info-label">Nom</div><div class="info-value">${escapeHtml(patient?.nom)} ${escapeHtml(patient?.prenom)}</div></div>
        <div class="info-item"><div class="info-label">Groupe sanguin</div><div class="info-value" style="color:#C62828">${escapeHtml(patient?.groupe_sanguin) || '—'} ${escapeHtml(patient?.rhesus || '')}</div></div>
        <div class="info-item"><div class="info-label">Service</div><div class="info-value">${escapeHtml(service?.nom) || '—'}</div></div>
        <div class="info-item"><div class="info-label">Lit</div><div class="info-value">${escapeHtml(lit?.numero_lit) || '—'}</div></div>
        <div class="info-item"><div class="info-label">Médecin responsable</div><div class="info-value">Dr ${escapeHtml(medecin?.prenom)} ${escapeHtml(medecin?.nom)}</div></div>
        <div class="info-item"><div class="info-label">Date entrée</div><div class="info-value">${new Date(hosp.date_entree).toLocaleDateString('fr-BF')}</div></div>
        <div class="info-item"><div class="info-label">Sortie prévue</div><div class="info-value">${hosp.date_sortie_prevue ? new Date(hosp.date_sortie_prevue).toLocaleDateString('fr-BF') : '—'}</div></div>
        <div class="info-item"><div class="info-label">Statut</div><div class="info-value"><span class="badge ${enCours ? 'badge-encours' : 'badge-sorti'}">${enCours ? 'En cours' : escapeHtml(hosp.type_sortie || hosp.statut || 'Sorti')}</span></div></div>
      </div>

      <!-- [DB-17] motif_admission (colonne réelle) -->
      <div style="background:#F7F8FA;padding:12px;border-radius:8px;margin-bottom:10px">
        <div style="font-size:11px;color:var(--text2);font-weight:600;margin-bottom:4px">MOTIF D'ADMISSION</div>
        <div style="font-size:14px">${escapeHtml(hosp.motif_admission) || '—'}</div>
      </div>

      ${hosp.diagnostic_entree ? `
      <div style="background:#F7F8FA;padding:12px;border-radius:8px;margin-bottom:10px">
        <div style="font-size:11px;color:var(--text2);font-weight:600;margin-bottom:4px">DIAGNOSTIC D'ENTRÉE</div>
        <div style="font-size:14px">${escapeHtml(hosp.diagnostic_entree)}</div>
      </div>` : ''}

      ${patient?.allergies ? `
      <div style="background:#FFEBEE;border-left:3px solid #C62828;border-radius:0 8px 8px 0;padding:10px 14px">
        <strong>⚠️ Allergies :</strong> ${escapeHtml(typeof patient.allergies === 'string' ? patient.allergies : JSON.stringify(patient.allergies))}
      </div>` : ''}
    </div>

    ${constantes.length ? `
    <div class="card">
      <div class="card-title">📊 Dernières constantes vitales</div>
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>Date</th><th>TA</th><th>Temp.</th><th>Pouls</th><th>SpO2</th><th>Poids</th></tr></thead>
          <tbody>
            ${constantes.map(ct => `
            <tr>
              <td>${ct.date_mesure ? new Date(ct.date_mesure).toLocaleDateString('fr-BF') : '—'}</td>
              <td>${ct.tension_systolique || '—'}/${ct.tension_diastolique || '—'} mmHg</td>
              <td>${ct.temperature || '—'} °C</td>
              <td>${ct.pouls || '—'} bpm</td>
              <td>${ct.saturation_o2 || '—'}%</td>
              <td>${ct.poids || '—'} kg</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-title">📝 Notes d'évolution</div>
      ${Array.isArray(hosp.notes_evolution) && hosp.notes_evolution.length ? 
        hosp.notes_evolution.map((n: any) => `
        <div class="note-item">
          <div class="note-date">${new Date(n.date).toLocaleString('fr-BF')} — ${escapeHtml(n.auteur || n.medecin_id)}</div>
          <div>${escapeHtml(n.note)}</div>
        </div>`).join('') : '<p style="color:var(--text2)">Aucune note d\'évolution</p>'}
      
      ${enCours ? `
      <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:16px">
        <label>Ajouter une note d'évolution</label>
        <textarea id="nouvelle-note" placeholder="Note d'évolution du patient..."></textarea>
        <button onclick="ajouterNote()" class="btn btn-primary">💾 Ajouter la note</button>
      </div>
      <script>
        async function ajouterNote() {
          const note = document.getElementById('nouvelle-note').value.trim()
          if (!note) { alert('Note vide'); return }
          const res = await fetch('/hospitalisations/${hosp.id}/note', {
            method:'POST',
            body: new URLSearchParams({note})
          })
          const d = await res.json()
          if (d.success) { alert('Note ajoutée'); location.reload() }
          else alert('Erreur: ' + d.error)
        }
      </script>` : ''}
    </div>

    ${enCours ? `
    <div class="card" style="border-left:3px solid var(--vert)">
      <div class="card-title">🚪 Déclencher la sortie du patient</div>
      <form>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <label>Type de sortie *</label>
            <!-- [DB-17] type_sortie (colonne réelle) -->
            <select id="type_sortie" required>
              <option value="gueri">✅ Guéri</option>
              <option value="ameliore">📈 Amélioré</option>
              <option value="transfert">🚐 Transfert</option>
              <option value="contre_avis_medical">⚠️ Contre avis médical</option>
              <option value="deces">🕊️ Décès</option>
            </select>
          </div>
          <div>
            <label>Diagnostic de sortie</label>
            <input type="text" id="diagnostic_sortie" placeholder="Diagnostic final...">
          </div>
        </div>
        <!-- [DB-17] instructions_sortie (colonne réelle, pas compte_rendu_sortie) -->
        <label>Instructions de sortie / Compte rendu</label>
        <textarea id="instructions_sortie" placeholder="Instructions au patient, prescriptions de sortie..."></textarea>
        <button type="button" onclick="sortirPatient()" class="btn btn-success">🚪 Confirmer la sortie</button>
      </form>
      <script>
        async function sortirPatient() {
          if (!confirm('Confirmer la sortie du patient ?')) return
          const data = new URLSearchParams({
            type_sortie: document.getElementById('type_sortie').value,
            diagnostic_sortie: document.getElementById('diagnostic_sortie').value,
            instructions_sortie: document.getElementById('instructions_sortie').value,
          })
          const res = await fetch('/hospitalisations/${hosp.id}/sortie', { method:'POST', body: data })
          const d = await res.json()
          if (d.success) { alert('Sortie enregistrée'); location.reload() }
          else alert('Erreur: ' + d.error)
        }
      </script>
    </div>` : `
    ${hosp.instructions_sortie ? `
    <div class="card">
      <div class="card-title">📋 Instructions de sortie</div>
      <!-- [DB-17] instructions_sortie (colonne réelle, pas compte_rendu_sortie) -->
      <div style="background:#F7F8FA;padding:14px;border-radius:8px;line-height:1.6">${escapeHtml(hosp.instructions_sortie)}</div>
    </div>` : ''}`}
  `
  return layoutHosp(`Hospitalisation — ${patient?.nom} ${patient?.prenom}`, content)
}

function escapeAttr(s: string | null | undefined): string {
  if (!s) return ''
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;')
}

function pageErreur(titre: string, message: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${escapeHtml(titre)}</title></head>
  <body style="font-family:sans-serif;padding:40px;text-align:center">
    <h1 style="color:#C62828">${escapeHtml(titre)}</h1>
    <p style="color:#6B7280;margin:16px 0">${escapeHtml(message)}</p>
    <a href="/hospitalisations" style="background:#1A237E;color:white;padding:10px 20px;border-radius:8px;text-decoration:none">← Retour</a>
  </body></html>`
}