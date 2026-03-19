/**
 * src/routes/vaccinations.ts
 * SantéBF — Module Vaccinations
 *
 * CORRECTIONS vs original :
 *  1. Bindings importé depuis supabase.ts (plus de type local)
 *  2. Colonnes spec_vaccinations corrigées :
 *     agent_id → administre_par
 *     dose_numero → numero_dose
 *     lot_numero ✅ (existait déjà)
 *     rappel_prevu → prochaine_dose_date
 *     remarques → reactions_observees
 *  3. statut → N'EXISTE PAS dans spec_vaccinations — supprimé des SELECT et INSERT
 *  4. Affichage des vaccinations adapté (plus de badge statut)
 *  5. INSERT corrigé : toutes les colonnes réelles
 *  6. JOIN médecin : administre_par → auth_profiles (pas agent_id)
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'
import { formatDate, calculerAge } from '../utils/format'

export const vaccinationRoutes = new Hono<{ Bindings: Bindings }>()

vaccinationRoutes.use('/*', requireAuth, requireRole('medecin', 'infirmier', 'sage_femme'))

// ── Carnet de vaccination d'un patient ────────────────────────
vaccinationRoutes.get('/patient/:patient_id', async (c) => {
  const patientId = c.req.param('patient_id')
  const supabase  = c.get('supabase' as never) as any

  const { data: patient } = await supabase
    .from('patient_dossiers')
    .select('id, nom, prenom, date_naissance, numero_national')
    .eq('id', patientId)
    .single()

  const { data: vaccinations } = await supabase
    .from('spec_vaccinations')
    .select(`
      id, vaccin_nom, date_administration, numero_lot, site_injection,
      numero_dose, prochaine_dose_date, reactions_observees,
      agent:auth_profiles!spec_vaccinations_administre_par_fkey(nom, prenom)
    `)
    .eq('patient_id', patientId)
    .order('date_administration', { ascending: false })

  const age = patient ? calculerAge(patient.date_naissance) : 0

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carnet de vaccination — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',sans-serif; background:#F7F8FA; padding:20px; }
    .container { max-width:1000px; margin:0 auto; }
    .back-link { display:inline-flex; align-items:center; gap:6px; color:#4A148C; text-decoration:none; font-size:14px; margin-bottom:16px; font-weight:600; }
    .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
    .patient-info h1 { font-size:24px; color:#1A1A2E; margin-bottom:4px; }
    .patient-info p { font-size:14px; color:#6B7280; }
    .btn-primary { padding:12px 20px; background:#4A148C; color:white; border-radius:10px; text-decoration:none; font-size:14px; font-weight:600; }
    .stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:16px; margin-bottom:28px; }
    .stat-card { background:#F9FAFB; border-radius:12px; padding:20px; text-align:center; border-top:4px solid #1A6B3C; }
    .stat-val { font-size:32px; font-weight:700; color:#1A6B3C; margin-bottom:4px; }
    .stat-label { font-size:13px; color:#6B7280; }
    .card { background:white; border-radius:16px; padding:28px 32px; box-shadow:0 2px 12px rgba(0,0,0,0.06); }
    .vacc-item { background:#F9FAFB; border-left:4px solid #1A6B3C; padding:16px; border-radius:10px; margin-bottom:12px; }
    .vacc-nom { font-size:15px; font-weight:600; color:#1A1A2E; margin-bottom:6px; }
    .vacc-info { font-size:13px; color:#6B7280; display:flex; gap:12px; flex-wrap:wrap; }
    .calendrier { background:#E8F5E9; border-left:4px solid #1A6B3C; padding:16px; border-radius:10px; margin-top:20px; }
    .calendrier h3 { font-size:15px; color:#1A6B3C; margin-bottom:12px; }
    .calendrier ul { margin-left:20px; }
    .calendrier li { font-size:13px; color:#424242; margin-bottom:6px; }
    .empty { text-align:center; padding:40px; color:#9CA3AF; font-style:italic; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/medecin/patients/${patientId}" class="back-link">← Retour au dossier patient</a>
    <div class="header">
      <div class="patient-info">
        <h1>💉 Carnet de vaccination</h1>
        <p><strong>${patient?.prenom||''} ${patient?.nom||''}</strong> • ${age} ans • ${patient?.numero_national||'N/A'}</p>
      </div>
      <a href="/vaccinations/patient/${patientId}/nouvelle" class="btn-primary">➕ Enregistrer une vaccination</a>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-val">${vaccinations?.length || 0}</div>
        <div class="stat-label">Vaccinations enregistrées</div>
      </div>
      <div class="stat-card" style="border-top-color:#E65100">
        <div class="stat-val" style="color:#E65100">
          ${(vaccinations ?? []).filter((v: any) => {
            if (!v.prochaine_dose_date) return false
            return new Date(v.prochaine_dose_date) > new Date()
          }).length}
        </div>
        <div class="stat-label">Rappels à venir</div>
      </div>
      <div class="stat-card" style="border-top-color:#B71C1C">
        <div class="stat-val" style="color:#B71C1C">
          ${(vaccinations ?? []).filter((v: any) => {
            if (!v.prochaine_dose_date) return false
            return new Date(v.prochaine_dose_date) < new Date()
          }).length}
        </div>
        <div class="stat-label">Rappels en retard</div>
      </div>
    </div>

    <div class="card">
      <h2 style="font-size:18px;margin-bottom:16px;color:#1A1A2E">Historique des vaccinations</h2>
      ${vaccinations && vaccinations.length > 0
        ? (vaccinations as any[]).map(v => {
            const agent = v.agent as any
            const rappelDate = v.prochaine_dose_date ? new Date(v.prochaine_dose_date) : null
            const rappelRetard = rappelDate && rappelDate < new Date()
            return `
          <div class="vacc-item">
            <div class="vacc-nom">${v.vaccin_nom}</div>
            <div class="vacc-info">
              <span>📅 ${formatDate(v.date_administration)}</span>
              <span>💉 Dose ${v.numero_dose||1}</span>
              <span>📍 ${v.site_injection||'N/A'}</span>
              ${v.numero_lot ? `<span>🔖 Lot: ${v.numero_lot}</span>` : ''}
              <span>👨‍⚕️ ${agent?.prenom||''} ${agent?.nom||''}</span>
              ${rappelDate ? `<span style="color:${rappelRetard?'#B71C1C':'#E65100'};font-weight:600;">
                ${rappelRetard ? '⚠️ Rappel en retard' : '🔔 Rappel prévu'}: ${rappelDate.toLocaleDateString('fr-FR')}
              </span>` : ''}
            </div>
            ${v.reactions_observees ? `<div class="vacc-info" style="margin-top:6px;"><span><strong>Réactions:</strong> ${v.reactions_observees}</span></div>` : ''}
          </div>`
          }).join('')
        : '<div class="empty">Aucune vaccination enregistrée</div>'
      }

      ${age <= 15 ? `
      <div class="calendrier">
        <h3>📅 Calendrier vaccinal national (Burkina Faso)</h3>
        <ul>
          <li><strong>À la naissance :</strong> BCG, Polio 0, Hépatite B 0</li>
          <li><strong>6 semaines :</strong> Penta 1, Polio 1, Pneumo 1, Rota 1</li>
          <li><strong>10 semaines :</strong> Penta 2, Polio 2, Pneumo 2, Rota 2</li>
          <li><strong>14 semaines :</strong> Penta 3, Polio 3, Pneumo 3, VPI</li>
          <li><strong>9 mois :</strong> Rougeole-Rubéole 1, Fièvre jaune, Vitamine A</li>
          <li><strong>15 mois :</strong> Rougeole-Rubéole 2</li>
        </ul>
      </div>` : ''}
    </div>
  </div>
</body>
</html>`)
})

// ── Formulaire nouvelle vaccination ────────────────────────────
vaccinationRoutes.get('/patient/:patient_id/nouvelle', async (c) => {
  const patientId = c.req.param('patient_id')
  const supabase  = c.get('supabase' as never) as any

  const { data: patient } = await supabase
    .from('patient_dossiers')
    .select('nom, prenom')
    .eq('id', patientId)
    .single()

  const vaccinsDisponibles = [
    'BCG', 'Polio (VPO)', 'Polio (VPI)', 'Hépatite B',
    'Pentavalent (DTC-HepB-Hib)', 'Pneumocoque', 'Rotavirus',
    'Rougeole-Rubéole', 'Fièvre jaune', 'Méningite A',
    'HPV', 'Tétanos', 'COVID-19', 'Grippe', 'Autre'
  ]

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Enregistrer vaccination — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',sans-serif; background:#F7F8FA; padding:20px; }
    .container { max-width:800px; margin:0 auto; }
    .back-link { display:inline-flex; align-items:center; gap:6px; color:#4A148C; text-decoration:none; font-size:14px; margin-bottom:16px; font-weight:600; }
    .card { background:white; border-radius:16px; padding:32px; box-shadow:0 2px 12px rgba(0,0,0,0.06); }
    h1 { font-size:24px; color:#1A1A2E; margin-bottom:24px; }
    .form-group { margin-bottom:20px; }
    label { display:block; font-size:13px; font-weight:600; color:#1A1A2E; margin-bottom:7px; }
    .req { color:#B71C1C; }
    input, select, textarea { width:100%; padding:12px 14px; border:1.5px solid #E5E7EB; border-radius:10px; font-size:15px; font-family:'DM Sans',sans-serif; outline:none; }
    input:focus, select:focus, textarea:focus { border-color:#4A148C; }
    textarea { resize:vertical; min-height:80px; }
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .btn { padding:14px 28px; border-radius:10px; font-size:15px; font-weight:600; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; }
    .btn-primary { background:#1A6B3C; color:white; }
    .btn-secondary { background:#E5E7EB; color:#424242; margin-left:12px; text-decoration:none; display:inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/vaccinations/patient/${patientId}" class="back-link">← Retour au carnet</a>
    <div class="card">
      <h1>💉 Enregistrer une vaccination</h1>
      <p style="color:#6B7280;margin-bottom:24px">Patient: <strong>${patient?.prenom||''} ${patient?.nom||''}</strong></p>
      <form method="POST" action="/vaccinations/patient/${patientId}/nouvelle">
        <div class="form-group">
          <label>Vaccin administré <span class="req">*</span></label>
          <select name="vaccin_nom" id="vaccinSelect" required onchange="checkAutre()">
            <option value="">-- Sélectionner --</option>
            ${vaccinsDisponibles.map(v => `<option value="${v}">${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="autreVaccin" style="display:none">
          <label>Nom du vaccin (autre)</label>
          <input type="text" name="vaccin_nom_autre" placeholder="Préciser le nom du vaccin">
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>Date d'administration <span class="req">*</span></label>
            <input type="date" name="date_administration" value="${new Date().toISOString().split('T')[0]}" required>
          </div>
          <div class="form-group">
            <label>Numéro de dose <span class="req">*</span></label>
            <input type="number" name="numero_dose" value="1" min="1" required>
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>Site d'injection</label>
            <select name="site_injection">
              <option value="">-- Sélectionner --</option>
              <option value="Bras gauche">Bras gauche</option>
              <option value="Bras droit">Bras droit</option>
              <option value="Cuisse gauche">Cuisse gauche</option>
              <option value="Cuisse droite">Cuisse droite</option>
              <option value="Fesse">Fesse</option>
            </select>
          </div>
          <div class="form-group">
            <label>Numéro de lot</label>
            <input type="text" name="numero_lot" placeholder="Ex: 12345ABC">
          </div>
        </div>
        <div class="form-group">
          <label>Date du prochain rappel</label>
          <input type="date" name="prochaine_dose_date">
        </div>
        <div class="form-group">
          <label>Réactions observées / Effets secondaires</label>
          <textarea name="reactions_observees" placeholder="Observations, effets indésirables constatés…"></textarea>
        </div>
        <button type="submit" class="btn btn-primary">✅ Enregistrer la vaccination</button>
        <a href="/vaccinations/patient/${patientId}" class="btn btn-secondary">Annuler</a>
      </form>
    </div>
  </div>
  <script>
    function checkAutre() {
      const s = document.getElementById('vaccinSelect')
      document.getElementById('autreVaccin').style.display = s.value === 'Autre' ? 'block' : 'none'
    }
  </script>
</body>
</html>`)
})

// ── POST nouvelle vaccination ──────────────────────────────────
vaccinationRoutes.post('/patient/:patient_id/nouvelle', async (c) => {
  const patientId = c.req.param('patient_id')
  const profil    = c.get('profil' as never) as AuthProfile
  const supabase  = c.get('supabase' as never) as any
  const body      = await c.req.parseBody()

  const vaccinNom = body.vaccin_nom === 'Autre'
    ? String(body.vaccin_nom_autre || '')
    : String(body.vaccin_nom      || '')

  const { error } = await supabase.from('spec_vaccinations').insert({
    patient_id:          patientId,
    structure_id:        profil.structure_id,
    administre_par:      profil.id,                  // ← colonne réelle (pas agent_id)
    vaccin_nom:          vaccinNom,
    date_administration: body.date_administration,
    numero_dose:         body.numero_dose            // ← colonne réelle (pas dose_numero)
      ? parseInt(String(body.numero_dose)) : 1,
    site_injection:      body.site_injection  || null,
    numero_lot:          body.numero_lot      || null, // ← colonne réelle ✅
    prochaine_dose_date: body.prochaine_dose_date || null, // ← colonne réelle (pas rappel_prevu)
    reactions_observees: body.reactions_observees || null, // ← colonne réelle (pas remarques)
    // PAS de statut — n'existe pas dans spec_vaccinations
  })

  if (error) {
    console.error('Erreur vaccination:', error.message)
    return c.text('Erreur: ' + error.message, 500)
  }

  return c.redirect(`/vaccinations/patient/${patientId}`, 303)
})
