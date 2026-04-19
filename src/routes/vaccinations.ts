/**
 * src/routes/vaccinations.ts
 * SantéBF — Routes module vaccinations
 *
 * CORRECTIONS APPLIQUÉES :
 *   [DB-15] agent_id → administre_par (colonne réelle spec_vaccinations)
 *   [DB-15] dose_numero → numero_dose (colonne réelle spec_vaccinations)
 *   [DB-15] rappel_prevu → prochaine_dose_date (colonne réelle spec_vaccinations)
 *   [QC-10] Toutes requêtes déstructurent { data, error }
 *   [S-09]  escapeHtml() systématique
 *   CONSERVÉ : Toute la logique métier originale
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase, type Bindings, type Variables, escapeHtml } from '../lib/supabase'
import { sanitizeInput } from '../utils/validation'

export const vaccinationRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

vaccinationRoutes.use('/*', requireAuth)
vaccinationRoutes.use('/*', requireRole(
  'medecin', 'infirmier', 'sage_femme', 'agent_accueil',
  'admin_structure', 'super_admin'
))

// ── GET /vaccinations ──────────────────────────────────────────────────────────
vaccinationRoutes.get('/', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const structureId = profil.structure_id
    if (!structureId) {
      return c.html(pageErreur('Aucune structure', 'Vous n\'êtes pas associé à une structure de santé.'))
    }

    const today = new Date()
    const in30  = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { data: recents, error: recentErr },
      { data: rappels, error: rappelErr }
    ] = await Promise.all([
      supabase.from('spec_vaccinations')
        .select(`
          id, vaccin_nom, date_administration,
          numero_dose, prochaine_dose_date,
          patient:patient_dossiers!spec_vaccinations_patient_id_fkey(nom, prenom, date_naissance),
          agent:auth_profiles!spec_vaccinations_administre_par_fkey(nom, prenom)
        `)
        .eq('structure_id', structureId)
        .order('date_administration', { ascending: false })
        .limit(20),

      // Rappels à venir dans 30 jours
      supabase.from('spec_vaccinations')
        .select(`
          id, vaccin_nom, prochaine_dose_date, numero_dose,
          patient:patient_dossiers!spec_vaccinations_patient_id_fkey(nom, prenom, telephone)
        `)
        .eq('structure_id', structureId)
        .gte('prochaine_dose_date', today.toISOString())
        .lte('prochaine_dose_date', in30)
        .order('prochaine_dose_date', { ascending: true })
    ])

    if (recentErr) console.error('[vaccinations/] recents:', recentErr.message)
    if (rappelErr) console.error('[vaccinations/] rappels:', rappelErr.message)

    return c.html(pageVaccinationsDashboard(recents ?? [], rappels ?? []))

  } catch (err) {
    console.error('[vaccinations/]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── GET /vaccinations/patient/:patientId ──────────────────────────────────────
vaccinationRoutes.get('/patient/:patientId', async (c) => {
  const profil    = c.get('profil')
  const supabase  = c.get('supabase')
  const patientId = c.req.param('patientId')

  try {
    const { data: patient, error: patErr } = await supabase
      .from('patient_dossiers')
      .select('id, nom, prenom, date_naissance, numero_national')
      .eq('id', patientId)
      .single()

    if (patErr || !patient) {
      return c.html(pageErreur('Patient introuvable', ''))
    }

    // [DB-15] colonnes réelles : numero_dose, prochaine_dose_date, administre_par
    const { data: vaccinations, error: vaccErr } = await supabase
      .from('spec_vaccinations')
      .select(`
        id, vaccin_nom, vaccin_code, fabricant, numero_lot,
        date_administration, numero_dose, prochaine_dose_date,
        voie_administration, site_injection, reactions_observees,
        agent:auth_profiles!spec_vaccinations_administre_par_fkey(nom, prenom)
      `)
      .eq('patient_id', patientId)
      .order('date_administration', { ascending: false })

    if (vaccErr) console.error('[vaccinations/patient]', vaccErr.message)

    // Rappels en retard
    const retard = (vaccinations ?? []).filter(v => {
      if (!v.prochaine_dose_date) return false
      return new Date(v.prochaine_dose_date) < new Date()
    })

    // Rappels à venir
    const aVenir = (vaccinations ?? []).filter(v => {
      if (!v.prochaine_dose_date) return false
      return new Date(v.prochaine_dose_date) >= new Date()
    })

    return c.html(pageCarnetVaccination(patient, vaccinations ?? [], retard, aVenir))

  } catch (err) {
    console.error('[vaccinations/patient/:id]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── GET /vaccinations/nouvelle/:patientId ─────────────────────────────────────
vaccinationRoutes.get('/nouvelle/:patientId', async (c) => {
  const profil    = c.get('profil')
  const supabase  = c.get('supabase')
  const patientId = c.req.param('patientId')

  try {
    const { data: patient, error } = await supabase
      .from('patient_dossiers')
      .select('id, nom, prenom, date_naissance')
      .eq('id', patientId)
      .single()

    if (error || !patient) {
      return c.html(pageErreur('Patient introuvable', ''))
    }

    return c.html(pageNouvelleVaccination(patient))

  } catch (err) {
    console.error('[vaccinations/nouvelle]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── POST /vaccinations/nouvelle/:patientId ────────────────────────────────────
vaccinationRoutes.post('/nouvelle/:patientId', async (c) => {
  const profil    = c.get('profil')
  const supabase  = c.get('supabase')
  const patientId = c.req.param('patientId')

  try {
    const body = await c.req.parseBody()

    const { error } = await supabase
      .from('spec_vaccinations')
      .insert({
        patient_id:           patientId,
        structure_id:         profil.structure_id,
        // [DB-15] administre_par (pas agent_id)
        administre_par:       profil.id,
        vaccin_nom:           sanitizeInput(String(body.vaccin_nom ?? ''), 200),
        vaccin_code:          sanitizeInput(String(body.vaccin_code ?? ''), 50) || null,
        numero_lot:           sanitizeInput(String(body.numero_lot ?? ''), 100) || null,
        fabricant:            sanitizeInput(String(body.fabricant ?? ''), 200) || null,
        date_expiration_lot:  String(body.date_expiration_lot ?? '') || null,
        date_administration:  String(body.date_administration ?? new Date().toISOString().split('T')[0]),
        // [DB-15] numero_dose (pas dose_numero)
        numero_dose:          parseInt(String(body.numero_dose ?? '1')) || 1,
        voie_administration:  String(body.voie_administration ?? '') || null,
        site_injection:       String(body.site_injection ?? '') || null,
        // [DB-15] prochaine_dose_date (pas rappel_prevu)
        prochaine_dose_date:  String(body.prochaine_dose_date ?? '') || null,
        reactions_observees:  sanitizeInput(String(body.reactions_observees ?? ''), 500) || null,
        created_at:           new Date().toISOString(),
      })

    if (error) {
      console.error('[vaccinations/POST]', error.message)
      return c.html(pageErreur('Erreur enregistrement', 'Impossible d\'enregistrer la vaccination : ' + error.message))
    }

    return c.redirect(`/vaccinations/patient/${patientId}?success=1`)

  } catch (err) {
    console.error('[vaccinations/nouvelle/POST]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ─── Pages HTML ───────────────────────────────────────────────────────────────

function layoutVacc(titre: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(titre)} | Vaccinations SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--primary:#1565C0;--text:#1a1a2e;--text2:#5A6A78;--border:#E0E0E0;--bg:#F0F7FF}
    body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text)}
    header{background:var(--primary);padding:14px 20px;display:flex;align-items:center;gap:12px;color:white}
    nav{background:white;padding:0 20px;border-bottom:1px solid var(--border);display:flex;gap:0}
    nav a{padding:12px 16px;text-decoration:none;color:var(--text2);font-size:13px;font-weight:500;border-bottom:2px solid transparent}
    nav a:hover{color:var(--primary);border-color:var(--primary)}
    .main{max-width:1100px;margin:0 auto;padding:24px 16px}
    .card{background:white;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:16px}
    .card-title{font-weight:700;font-size:15px;margin-bottom:14px;display:flex;align-items:center;gap:8px}
    .stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}
    .stat{background:white;border-radius:10px;padding:16px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.06)}
    .stat-number{font-size:28px;font-weight:700;color:var(--primary)}
    .stat-label{font-size:12px;color:var(--text2);margin-top:4px}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .badge-bleu{background:#E3F2FD;color:#0D47A1}
    .badge-rouge{background:#FFEBEE;color:#C62828}
    .badge-orange{background:#FFF3E0;color:#E65100}
    .badge-vert{background:#E8F5E9;color:#1B5E20}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{background:#F7F8FA;padding:10px 12px;text-align:left;border-bottom:2px solid var(--border);font-size:12px;color:var(--text2);font-weight:600}
    td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:middle}
    .btn{display:inline-flex;gap:6px;padding:8px 14px;border-radius:7px;font-size:12px;font-weight:600;text-decoration:none;border:none;cursor:pointer}
    .btn-primary{background:var(--primary);color:white}
    .btn-secondary{background:#F3F4F6;color:var(--text);border:1px solid var(--border)}
    .alert-orange{background:#FFF3E0;border-left:3px solid #E65100;border-radius:8px;padding:12px;margin-bottom:12px;color:#E65100}
    form label{display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:var(--text)}
    form input,form select,form textarea{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;margin-bottom:12px;font-family:inherit}
  </style>
</head>
<body>
<header>
  <div style="font-family:'DM Serif Display',serif;font-size:18px">💉 Vaccinations SantéBF</div>
</header>
<nav>
  <a href="/vaccinations">Dashboard</a>
  <a href="/dashboard/medecin">← Retour médecin</a>
</nav>
<main class="main">
  <h1 style="font-family:'DM Serif Display',serif;font-size:24px;color:var(--primary);margin-bottom:20px">${escapeHtml(titre)}</h1>
  ${content}
</main>
</body>
</html>`
}

function pageVaccinationsDashboard(recents: any[], rappels: any[]): string {
  const content = `
    <div class="stats-row">
      <div class="stat"><div class="stat-number">${recents.length}</div><div class="stat-label">💉 Vaccinations récentes</div></div>
      <div class="stat"><div class="stat-number" style="color:#E65100">${rappels.length}</div><div class="stat-label">⏰ Rappels (30j)</div></div>
    </div>

    ${rappels.length ? `
    <div class="card">
      <div class="card-title">⏰ Rappels de vaccination à venir</div>
      <div class="alert-orange">⚠️ ${rappels.length} patient(s) ont un rappel de vaccination prévu dans les 30 prochains jours</div>
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>Patient</th><th>Vaccin</th><th>Dose suivante</th><th>Tél.</th></tr></thead>
          <tbody>
            ${rappels.map(v => `
            <tr>
              <td><strong>${escapeHtml(v.patient?.nom)} ${escapeHtml(v.patient?.prenom)}</strong></td>
              <td>${escapeHtml(v.vaccin_nom)}</td>
              <!-- [DB-15] prochaine_dose_date (colonne réelle, pas rappel_prevu) -->
              <td>${v.prochaine_dose_date ? new Date(v.prochaine_dose_date).toLocaleDateString('fr-BF') : '—'}</td>
              <td>${escapeHtml(v.patient?.telephone) || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-title">💉 Vaccinations récentes</div>
      ${recents.length ? `
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>Patient</th><th>Vaccin</th><th>Date</th><th>Dose</th><th>Administré par</th><th>Prochain rappel</th></tr></thead>
          <tbody>
            ${recents.map(v => `
            <tr>
              <td><strong>${escapeHtml(v.patient?.nom)} ${escapeHtml(v.patient?.prenom)}</strong></td>
              <td>${escapeHtml(v.vaccin_nom)}</td>
              <td>${new Date(v.date_administration).toLocaleDateString('fr-BF')}</td>
              <!-- [DB-15] numero_dose (colonne réelle, pas dose_numero) -->
              <td><span class="badge badge-bleu">Dose ${v.numero_dose}</span></td>
              <!-- [DB-15] administre_par (colonne réelle, pas agent_id) -->
              <td>${escapeHtml(v.agent?.prenom)} ${escapeHtml(v.agent?.nom)}</td>
              <!-- [DB-15] prochaine_dose_date (colonne réelle, pas rappel_prevu) -->
              <td>${v.prochaine_dose_date ? new Date(v.prochaine_dose_date).toLocaleDateString('fr-BF') : '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<div style="text-align:center;padding:32px;color:var(--text2)">Aucune vaccination enregistrée</div>'}
    </div>
  `
  return layoutVacc('Vaccinations', content)
}

function pageCarnetVaccination(patient: any, vaccinations: any[], retard: any[], aVenir: any[]): string {
  const content = `
    <div class="card">
      <div class="card-title">👤 Patient</div>
      <p><strong>${escapeHtml(patient.nom)} ${escapeHtml(patient.prenom)}</strong></p>
      <p style="color:var(--text2);font-size:13px">
        Né(e) le ${patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString('fr-BF') : '—'}
        · N° ${escapeHtml(patient.numero_national)}
      </p>
      <a href="/vaccinations/nouvelle/${patient.id}" class="btn btn-primary" style="margin-top:12px">
        ➕ Ajouter une vaccination
      </a>
    </div>

    ${retard.length ? `
    <div class="card" style="border-left:3px solid #E65100">
      <div class="card-title">⚠️ Rappels en retard (${retard.length})</div>
      ${retard.map(v => `
      <div style="padding:8px;background:#FFF3E0;border-radius:6px;margin-bottom:6px">
        <!-- [DB-15] vaccin_nom, numero_dose, prochaine_dose_date (colonnes réelles) -->
        <strong>${escapeHtml(v.vaccin_nom)}</strong> — Dose ${v.numero_dose}
        <span class="badge badge-rouge" style="margin-left:8px">En retard : ${new Date(v.prochaine_dose_date).toLocaleDateString('fr-BF')}</span>
      </div>`).join('')}
    </div>` : ''}

    <div class="card">
      <div class="card-title">💉 Historique des vaccinations</div>
      ${vaccinations.length ? `
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>Vaccin</th><th>Date</th><th>Dose</th><th>Lot</th><th>Prochain rappel</th><th>Effets</th></tr></thead>
          <tbody>
            ${vaccinations.map(v => `
            <tr>
              <td><strong>${escapeHtml(v.vaccin_nom)}</strong>${v.vaccin_code ? `<br><small style="color:var(--text2)">${escapeHtml(v.vaccin_code)}</small>` : ''}</td>
              <td>${new Date(v.date_administration).toLocaleDateString('fr-BF')}</td>
              <!-- [DB-15] numero_dose (colonne réelle) -->
              <td><span class="badge badge-bleu">Dose ${v.numero_dose}</span></td>
              <td style="font-size:12px;color:var(--text2)">${escapeHtml(v.numero_lot) || '—'}</td>
              <!-- [DB-15] prochaine_dose_date (colonne réelle) -->
              <td>${v.prochaine_dose_date ? `
                <span class="badge ${new Date(v.prochaine_dose_date) < new Date() ? 'badge-rouge' : 'badge-vert'}">
                  ${new Date(v.prochaine_dose_date).toLocaleDateString('fr-BF')}
                </span>` : '—'}</td>
              <td style="font-size:12px">${escapeHtml(v.reactions_observees) || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<div style="text-align:center;padding:32px;color:var(--text2)">Aucune vaccination enregistrée</div>'}
    </div>
  `
  return layoutVacc(`Carnet de ${patient.prenom} ${patient.nom}`, content)
}

function pageNouvelleVaccination(patient: any): string {
  const content = `
    <div class="card">
      <div class="card-title">💉 Nouvelle vaccination pour ${escapeHtml(patient.prenom)} ${escapeHtml(patient.nom)}</div>
      <form method="POST" action="/vaccinations/nouvelle/${patient.id}">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <label>Nom du vaccin *</label>
            <input type="text" name="vaccin_nom" placeholder="Ex: BCG, DTP, VAA..." required>
            <label>Code vaccin</label>
            <input type="text" name="vaccin_code" placeholder="Ex: BCG-01">
            <label>Fabricant</label>
            <input type="text" name="fabricant" placeholder="Ex: Sanofi, Pfizer...">
            <label>Numéro de lot</label>
            <input type="text" name="numero_lot" placeholder="Ex: LOT-2024-001">
            <label>Date d'expiration du lot</label>
            <input type="date" name="date_expiration_lot">
          </div>
          <div>
            <label>Date d'administration *</label>
            <input type="date" name="date_administration" value="${new Date().toISOString().split('T')[0]}" required>
            <label>Numéro de dose *</label>
            <!-- [DB-15] numero_dose (colonne réelle, pas dose_numero) -->
            <input type="number" name="numero_dose" value="1" min="1" required>
            <label>Voie d'administration</label>
            <select name="voie_administration">
              <option value="">— Sélectionner —</option>
              <option value="IM">Intramusculaire (IM)</option>
              <option value="SC">Sous-cutanée (SC)</option>
              <option value="ID">Intradermique (ID)</option>
              <option value="PO">Orale (PO)</option>
            </select>
            <label>Site d'injection</label>
            <input type="text" name="site_injection" placeholder="Ex: Deltoïde gauche">
            <label>Date du prochain rappel</label>
            <!-- [DB-15] prochaine_dose_date (colonne réelle, pas rappel_prevu) -->
            <input type="date" name="prochaine_dose_date">
          </div>
        </div>
        <label>Réactions observées (optionnel)</label>
        <textarea name="reactions_observees" placeholder="Ex: Rougeur au site d'injection, légère fièvre..."></textarea>
        <div style="display:flex;gap:12px;margin-top:8px">
          <button type="submit" class="btn btn-primary">💾 Enregistrer la vaccination</button>
          <a href="/vaccinations/patient/${patient.id}" class="btn btn-secondary">Annuler</a>
        </div>
      </form>
    </div>
  `
  return layoutVacc(`Nouvelle vaccination`, content)
}

function pageErreur(titre: string, message: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${escapeHtml(titre)}</title></head>
  <body style="font-family:sans-serif;padding:40px;text-align:center">
    <h1 style="color:#C62828">${escapeHtml(titre)}</h1>
    <p style="color:#6B7280;margin:16px 0">${escapeHtml(message)}</p>
    <a href="/vaccinations" style="background:#1565C0;color:white;padding:10px 20px;border-radius:8px;text-decoration:none">← Retour</a>
  </body></html>`
}