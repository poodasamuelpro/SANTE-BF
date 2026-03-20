/**
 * src/routes/hospitalisations.ts
 * SantéBF — Module Hospitalisations
 *
 * CORRECTIONS vs original :
 *  1. medecin_id → medecin_responsable_id
 *  2. motif → motif_admission
 *  3. statut → N'EXISTE PAS — 'en_cours' = date_sortie_reelle IS NULL + type_sortie IS NULL
 *  4. compte_rendu_sortie → instructions_sortie
 *  5. INSERT: medecin_id → medecin_responsable_id, motif → motif_admission
 *  6. INSERT: supprimer statut: 'en_cours'
 *  7. UPDATE sortie: statut → type_sortie = 'gueri', compte_rendu_sortie → instructions_sortie
 *  8. Bindings importé depuis supabase.ts (plus de type local)
 *  9. JOIN médecin: auth_profiles via medecin_responsable_id
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'
import { formatDate } from '../utils/format'

export const hospitalisationRoutes = new Hono<{ Bindings: Bindings }>()

hospitalisationRoutes.use('/*', requireAuth, requireRole('medecin', 'infirmier', 'sage_femme', 'admin_structure'))

// ── Déduire le statut d'affichage ─────────────────────────────
// medical_hospitalisations n'a pas de colonne 'statut'
// En cours = date_sortie_reelle IS NULL + type_sortie IS NULL
function statutHosp(hosp: any): 'en_cours' | string {
  if (!hosp.date_sortie_reelle && !hosp.type_sortie) return 'en_cours'
  return hosp.type_sortie ?? 'sorti'
}

// ── Liste des hospitalisations ─────────────────────────────────
hospitalisationRoutes.get('/', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: hospitalisations } = await supabase
    .from('medical_hospitalisations')
    .select(`
      id, date_entree, date_sortie_prevue, date_sortie_reelle,
      motif_admission, type_sortie, diagnostic_entree,
      patient_dossiers (id, nom, prenom, numero_national),
      struct_lits (numero_lit, type_lit),
      medecin:auth_profiles!medical_hospitalisations_medecin_responsable_id_fkey(nom, prenom)
    `)
    .eq('structure_id', profil.structure_id)
    .order('date_entree', { ascending: false })
    .limit(50)

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hospitalisations — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',sans-serif; background:#F7F8FA; padding:20px; }
    .container { max-width:1200px; margin:0 auto; }
    .back-link { display:inline-flex; align-items:center; gap:6px; color:#4A148C; text-decoration:none; font-size:14px; margin-bottom:16px; font-weight:600; }
    .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
    h1 { font-size:26px; color:#1A1A2E; }
    .btn-primary { padding:12px 20px; background:#4A148C; color:white; border-radius:10px; text-decoration:none; font-size:14px; font-weight:600; }
    .card { background:white; border-radius:16px; padding:28px 32px; box-shadow:0 2px 12px rgba(0,0,0,0.06); }
    .filters { display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
    .filter-btn { padding:8px 16px; border:2px solid #E5E7EB; border-radius:8px; background:white; font-size:14px; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .2s; }
    .filter-btn.active { background:#4A148C; color:white; border-color:#4A148C; }
    .hosp-item { background:#F9FAFB; border-left:4px solid #4A148C; padding:16px; border-radius:10px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; gap:12px; }
    .hosp-main { flex:1; }
    .hosp-patient { font-size:16px; font-weight:600; color:#1A1A2E; margin-bottom:4px; }
    .hosp-info { font-size:13px; color:#6B7280; display:flex; gap:16px; flex-wrap:wrap; margin-top:4px; }
    .hosp-actions { display:flex; gap:8px; align-items:center; flex-shrink:0; }
    .badge { padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; }
    .badge.en_cours { background:#E3F2FD; color:#1565C0; }
    .badge.sorti { background:#E8F5E9; color:#1A6B3C; }
    .badge.gueri { background:#E8F5E9; color:#1A6B3C; }
    .badge.transfert { background:#FFF3E0; color:#E65100; }
    .badge.deces { background:#F3F4F6; color:#9E9E9E; }
    .btn-small { padding:6px 12px; border-radius:6px; font-size:12px; font-weight:600; text-decoration:none; }
    .btn-view { background:#E3F2FD; color:#1565C0; }
    .btn-discharge { background:#E8F5E9; color:#1A6B3C; }
    .empty { text-align:center; padding:40px; color:#9CA3AF; font-style:italic; }
    @media(max-width:640px) { .hosp-item { flex-direction:column; align-items:flex-start; } }
  </style>
</head>
<body>
  <div class="container">
    <a href="/medecin/patients" class="back-link">← Retour</a>
    <div class="header">
      <h1>🛏️ Patients hospitalisés (${hospitalisations?.length || 0})</h1>
      <a href="/hospitalisations/nouvelle" class="btn-primary">➕ Nouvelle hospitalisation</a>
    </div>
    <div class="card">
      <div class="filters">
        <button class="filter-btn active" onclick="filtrer(this,'tous')">Tous</button>
        <button class="filter-btn" onclick="filtrer(this,'en_cours')">En cours</button>
        <button class="filter-btn" onclick="filtrer(this,'sorti')">Sortis</button>
      </div>
      ${hospitalisations && hospitalisations.length > 0
        ? (hospitalisations as any[]).map(h => {
            const patient  = h.patient_dossiers as any
            const lit      = h.struct_lits as any
            const medecin  = h.medecin as any
            const st       = statutHosp(h)
            return `
          <div class="hosp-item" data-statut="${st}">
            <div class="hosp-main">
              <div class="hosp-patient">${patient?.prenom||''} ${patient?.nom||''}</div>
              <div class="hosp-info">
                <span>🛏️ Lit ${lit?.numero_lit||'N/A'} (${lit?.type_lit||'standard'})</span>
                <span>📅 Entrée: ${formatDate(h.date_entree)}</span>
                ${h.date_sortie_prevue ? `<span>🔜 Sortie prévue: ${formatDate(h.date_sortie_prevue)}</span>` : ''}
                <span>👨‍⚕️ Dr. ${medecin?.prenom||''} ${medecin?.nom||''}</span>
              </div>
              <div class="hosp-info"><span><strong>Motif:</strong> ${h.motif_admission||'N/A'}</span></div>
            </div>
            <div class="hosp-actions">
              <span class="badge ${st}">${st === 'en_cours' ? 'En cours' : st}</span>
              <a href="/hospitalisations/${h.id}" class="btn-small btn-view">Voir</a>
              ${st === 'en_cours' ? `<a href="/hospitalisations/${h.id}/sortir" class="btn-small btn-discharge">Sortir</a>` : ''}
            </div>
          </div>`
          }).join('')
        : '<div class="empty">Aucune hospitalisation enregistrée</div>'
      }
    </div>
  </div>
  <script>
    function filtrer(btn, statut) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      document.querySelectorAll('.hosp-item').forEach(item => {
        item.style.display = (statut === 'tous' || item.dataset.statut === statut) ? 'flex' : 'none'
      })
    }
  </script>
</body>
</html>`)
})

// ── Détail hospitalisation ─────────────────────────────────────
hospitalisationRoutes.get('/:id', async (c) => {
  const id       = c.req.param('id')
  const supabase = c.get('supabase' as never) as any

  const { data: hosp } = await supabase
    .from('medical_hospitalisations')
    .select(`
      id, date_entree, date_sortie_prevue, date_sortie_reelle,
      motif_admission, diagnostic_entree, etat_a_l_entree,
      type_sortie, instructions_sortie, diagnostic_sortie,
      patient_dossiers (id, nom, prenom, numero_national, date_naissance, groupe_sanguin, rhesus),
      struct_lits (numero_lit, type_lit, struct_services(nom)),
      medecin:auth_profiles!medical_hospitalisations_medecin_responsable_id_fkey(nom, prenom)
    `)
    .eq('id', id)
    .single()

  if (!hosp) return c.html('<h1>Hospitalisation introuvable</h1>', 404)

  const patient = hosp.patient_dossiers as any
  const lit     = hosp.struct_lits as any
  const medecin = hosp.medecin as any
  const st      = statutHosp(hosp)

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Détail hospitalisation — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',sans-serif; background:#F7F8FA; padding:20px; }
    .container { max-width:900px; margin:0 auto; }
    .back-link { display:inline-flex; align-items:center; gap:6px; color:#4A148C; text-decoration:none; font-size:14px; margin-bottom:16px; font-weight:600; }
    .card { background:white; border-radius:16px; padding:28px 32px; box-shadow:0 2px 12px rgba(0,0,0,0.06); margin-bottom:20px; }
    h1 { font-size:24px; color:#1A1A2E; margin-bottom:20px; }
    .section-title { font-size:12px; font-weight:700; text-transform:uppercase; color:#9CA3AF; margin:20px 0 12px; letter-spacing:.5px; }
    .field { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #F3F4F6; font-size:14px; }
    .field-label { color:#6B7280; font-weight:500; }
    .field-value { font-weight:600; color:#1A1A2E; }
    .badge { padding:6px 14px; border-radius:20px; font-size:12px; font-weight:700; }
    .badge.en_cours { background:#E3F2FD; color:#1565C0; }
    .badge.gueri { background:#E8F5E9; color:#1A6B3C; }
    .badge.transfert { background:#FFF3E0; color:#E65100; }
    .text-box { background:#F9FAFB; padding:14px; border-radius:8px; font-size:14px; line-height:1.7; color:#424242; margin-top:8px; }
    .btn-action { display:inline-block; padding:12px 24px; background:#1A6B3C; color:white; border-radius:10px; text-decoration:none; font-size:14px; font-weight:600; margin-top:20px; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/hospitalisations" class="back-link">← Retour à la liste</a>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h1>Détail hospitalisation</h1>
        <span class="badge ${st}">${st === 'en_cours' ? 'En cours' : st}</span>
      </div>
      <div class="section-title">👤 Patient</div>
      <div class="field"><span class="field-label">Nom complet</span><span class="field-value">${patient?.prenom||''} ${patient?.nom||''}</span></div>
      <div class="field"><span class="field-label">Numéro national</span><span class="field-value">${patient?.numero_national||'N/A'}</span></div>
      <div class="field"><span class="field-label">Groupe sanguin</span><span class="field-value">${patient?.groupe_sanguin||'?'}${patient?.rhesus||''}</span></div>
      <div class="section-title">🛏️ Hospitalisation</div>
      <div class="field"><span class="field-label">Service / Lit</span><span class="field-value">${lit?.struct_services?.nom||'N/A'} — Lit ${lit?.numero_lit||'N/A'}</span></div>
      <div class="field"><span class="field-label">Médecin responsable</span><span class="field-value">Dr. ${medecin?.prenom||''} ${medecin?.nom||''}</span></div>
      <div class="field"><span class="field-label">Date d'entrée</span><span class="field-value">${formatDate(hosp.date_entree)}</span></div>
      ${hosp.date_sortie_prevue ? `<div class="field"><span class="field-label">Sortie prévue</span><span class="field-value">${formatDate(hosp.date_sortie_prevue)}</span></div>` : ''}
      ${hosp.date_sortie_reelle ? `<div class="field"><span class="field-label">Sortie réelle</span><span class="field-value">${formatDate(hosp.date_sortie_reelle)}</span></div>` : ''}
      ${hosp.type_sortie ? `<div class="field"><span class="field-label">Type de sortie</span><span class="field-value">${hosp.type_sortie}</span></div>` : ''}
      <div class="section-title">📋 Motif et diagnostic</div>
      <div class="text-box"><strong>Motif d'hospitalisation :</strong><br>${hosp.motif_admission||'Non renseigné'}</div>
      ${hosp.diagnostic_entree ? `<div class="text-box" style="margin-top:10px"><strong>Diagnostic d'entrée :</strong><br>${hosp.diagnostic_entree}</div>` : ''}
      ${hosp.instructions_sortie ? `
      <div class="section-title">📄 Instructions de sortie</div>
      <div class="text-box">${hosp.instructions_sortie}</div>` : ''}
      ${st === 'en_cours' ? `<a href="/hospitalisations/${hosp.id}/sortir" class="btn-action">✅ Enregistrer la sortie</a>` : ''}
    </div>
  </div>
</body>
</html>`)
})

// ── Formulaire nouvelle hospitalisation ────────────────────────
hospitalisationRoutes.get('/nouvelle', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: litsDisponibles } = await supabase
    .from('struct_lits')
    .select('id, numero_lit, type_lit, struct_services(nom)')
    .eq('structure_id', profil.structure_id)
    .eq('statut', 'disponible')
    .order('numero_lit', { ascending: true })

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Nouvelle hospitalisation — SantéBF</title>
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
    textarea { resize:vertical; min-height:100px; }
    .btn { padding:14px 28px; border-radius:10px; font-size:15px; font-weight:600; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; }
    .btn-primary { background:#4A148C; color:white; }
    .btn-secondary { background:#E5E7EB; color:#424242; margin-left:12px; text-decoration:none; display:inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/hospitalisations" class="back-link">← Retour</a>
    <div class="card">
      <h1>Nouvelle hospitalisation</h1>
      <form method="POST" action="/hospitalisations/nouvelle">
        <div class="form-group">
          <label>Patient <span class="req">*</span></label>
          <input type="text" name="patient_search" placeholder="Rechercher par nom ou numéro…" required>
          <input type="hidden" name="patient_id" id="patient_id">
        </div>
        <div class="form-group">
          <label>Lit <span class="req">*</span></label>
          <select name="lit_id" required>
            <option value="">-- Sélectionner un lit disponible --</option>
            ${(litsDisponibles ?? []).map((l: any) =>
              `<option value="${l.id}">Lit ${l.numero_lit} — ${l.struct_services?.nom||'N/A'} (${l.type_lit})</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Date d'entrée <span class="req">*</span></label>
          <input type="datetime-local" name="date_entree" value="${new Date().toISOString().slice(0,16)}" required>
        </div>
        <div class="form-group">
          <label>Date de sortie prévue</label>
          <input type="date" name="date_sortie_prevue">
        </div>
        <div class="form-group">
          <label>Motif d'hospitalisation <span class="req">*</span></label>
          <textarea name="motif_admission" placeholder="Ex: Pneumonie sévère nécessitant surveillance…" required></textarea>
        </div>
        <div class="form-group">
          <label>Diagnostic d'entrée</label>
          <textarea name="diagnostic_entree" placeholder="Diagnostic posé à l'entrée…"></textarea>
        </div>
        <button type="submit" class="btn btn-primary">✅ Enregistrer l'hospitalisation</button>
        <a href="/hospitalisations" class="btn btn-secondary">Annuler</a>
      </form>
    </div>
  </div>
</body>
</html>`)
})

// ── POST nouvelle hospitalisation ──────────────────────────────
hospitalisationRoutes.post('/nouvelle', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()

  const { error } = await supabase.from('medical_hospitalisations').insert({
    patient_id:              body.patient_id,
    structure_id:            profil.structure_id,
    lit_id:                  body.lit_id,
    medecin_responsable_id:  profil.id,     // ← colonne réelle
    date_entree:             body.date_entree,
    date_sortie_prevue:      body.date_sortie_prevue || null,
    motif_admission:         body.motif_admission,   // ← colonne réelle
    diagnostic_entree:       body.diagnostic_entree || null,
    // PAS de statut — n'existe pas dans la table
  })

  if (error) return c.text('Erreur: ' + error.message, 500)
  return c.redirect('/hospitalisations', 303)
})

// ── Formulaire sortie ──────────────────────────────────────────
hospitalisationRoutes.get('/:id/sortir', async (c) => {
  const id       = c.req.param('id')
  const supabase = c.get('supabase' as never) as any

  const { data: hosp } = await supabase
    .from('medical_hospitalisations')
    .select('id, patient_dossiers(nom, prenom)')
    .eq('id', id)
    .single()

  if (!hosp) return c.text('Hospitalisation introuvable', 404)
  const patient = hosp.patient_dossiers as any

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Sortie — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',sans-serif; background:#F7F8FA; padding:20px; }
    .container { max-width:800px; margin:0 auto; }
    .back-link { display:inline-flex; align-items:center; gap:6px; color:#4A148C; text-decoration:none; font-size:14px; margin-bottom:16px; font-weight:600; }
    .card { background:white; border-radius:16px; padding:32px; box-shadow:0 2px 12px rgba(0,0,0,0.06); }
    h1 { font-size:24px; color:#1A1A2E; margin-bottom:24px; }
    .form-group { margin-bottom:20px; }
    label { display:block; font-size:13px; font-weight:600; margin-bottom:7px; }
    input, select, textarea { width:100%; padding:12px 14px; border:1.5px solid #E5E7EB; border-radius:10px; font-size:15px; font-family:'DM Sans',sans-serif; outline:none; }
    input:focus, select:focus, textarea:focus { border-color:#1A6B3C; }
    textarea { resize:vertical; min-height:120px; }
    .btn { padding:14px 28px; border-radius:10px; font-size:15px; font-weight:600; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; }
    .btn-primary { background:#1A6B3C; color:white; }
    .btn-secondary { background:#E5E7EB; color:#424242; margin-left:12px; text-decoration:none; display:inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/hospitalisations/${id}" class="back-link">← Retour</a>
    <div class="card">
      <h1>Enregistrer la sortie</h1>
      <p style="color:#6B7280;margin-bottom:20px">Patient: <strong>${patient?.prenom} ${patient?.nom}</strong></p>
      <form method="POST" action="/hospitalisations/${id}/sortir">
        <div class="form-group">
          <label>Date et heure de sortie *</label>
          <input type="datetime-local" name="date_sortie_reelle" value="${new Date().toISOString().slice(0,16)}" required>
        </div>
        <div class="form-group">
          <label>Type de sortie *</label>
          <select name="type_sortie" required>
            <option value="gueri">Guéri</option>
            <option value="ameliore">Amélioré</option>
            <option value="stationnaire">Stationnaire</option>
            <option value="transfert">Transfert</option>
            <option value="contre_avis_medical">Contre avis médical</option>
            <option value="deces">Décès</option>
            <option value="fugue">Fugue</option>
          </select>
        </div>
        <div class="form-group">
          <label>Instructions de sortie / Compte rendu</label>
          <textarea name="instructions_sortie" placeholder="Résumé de l'hospitalisation, traitements effectués, recommandations…"></textarea>
        </div>
        <button type="submit" class="btn btn-primary">✅ Enregistrer la sortie</button>
        <a href="/hospitalisations/${id}" class="btn btn-secondary">Annuler</a>
      </form>
    </div>
  </div>
</body>
</html>`)
})

// ── POST sortie ────────────────────────────────────────────────
hospitalisationRoutes.post('/:id/sortir', async (c) => {
  const id       = c.req.param('id')
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()

  const { error } = await supabase
    .from('medical_hospitalisations')
    .update({
      date_sortie_reelle:  body.date_sortie_reelle,
      type_sortie:         body.type_sortie,        // ← colonne réelle (pas statut)
      instructions_sortie: body.instructions_sortie, // ← colonne réelle (pas compte_rendu_sortie)
    })
    .eq('id', id)

  if (error) return c.text('Erreur: ' + error.message, 500)
  return c.redirect('/hospitalisations/' + id, 303)
})
 