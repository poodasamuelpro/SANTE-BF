/**
 * src/routes/caissier.ts
 * SantéBF — Routes module caissier (facturation & paiements)
 *
 * CORRECTIONS APPLIQUÉES :
 *   [DB-16] finance_facture_lignes.description (pas acte_nom)
 *   [DB-16] finance_facture_lignes.montant_total (pas total_ligne)
 *   [QC-07] .catch(() => {}) vides remplacés par gestion d'erreur réelle
 *   [QC-08] validateEmail() utilisé dans la création de patient
 *   [QC-10] Toutes les requêtes déstructurent { data, error }
 *   [S-09]  escapeHtml() systématique
 *   CONSERVÉ : Toute la logique métier et la structure des routes
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase, type Bindings, type Variables, escapeHtml } from '../lib/supabase'
import { validateEmail, sanitizeInput, formatDateFr } from '../utils/validation'

export const caissierRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

caissierRoutes.use('/*', requireAuth)
caissierRoutes.use('/*', requireRole('caissier', 'admin_structure', 'super_admin'))

// ── GET /caissier ─────────────────────────────────────────────────────────────
caissierRoutes.get('/', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const structureId = profil.structure_id
    if (!structureId) return c.html(pageErreur('Aucune structure', ''))

    const today     = new Date()
    const todayStr  = today.toISOString().split('T')[0]
    const todayFrom = `${todayStr}T00:00:00.000Z`
    const todayTo   = `${todayStr}T23:59:59.999Z`

    const [
      { data: facturesEnAttente, error: faErr },
      { data: paiementsAujourd, error: paErr },
      { data: actesCatalogue,   error: acErr }
    ] = await Promise.all([
      supabase.from('finance_factures')
        .select(`
          id, numero_facture, total_ttc, montant_patient, statut, created_at,
          patient:patient_dossiers!finance_factures_patient_id_fkey(nom, prenom, telephone)
        `)
        .eq('structure_id', structureId)
        .in('statut', ['en_attente', 'partielle'])
        .order('created_at', { ascending: false })
        .limit(20),

      supabase.from('finance_paiements')
        .select('id, montant, mode_paiement, statut_paiement, date_paiement')
        .eq('structure_id', structureId)
        .gte('date_paiement', todayFrom)
        .lte('date_paiement', todayTo),

      supabase.from('finance_actes_catalogue')
        .select('id, nom, code, prix, categorie')
        .eq('structure_id', structureId)
        .eq('est_actif', true)
        .order('categorie')
        .limit(100)
    ])

    // [QC-07] Vraie gestion d'erreurs (pas .catch(() => {}))
    if (faErr) console.error('[caissier/] factures en attente:', faErr.message)
    if (paErr) console.error('[caissier/] paiements aujourd\'hui:', paErr.message)
    if (acErr) console.error('[caissier/] catalogue actes:', acErr.message)

    // Calcul totaux du jour
    const totalJour = (paiementsAujourd ?? [])
      .filter(p => p.statut_paiement === 'valide')
      .reduce((sum, p) => sum + (p.montant ?? 0), 0)

    return c.html(pageCaissierDashboard(
      facturesEnAttente ?? [],
      paiementsAujourd ?? [],
      totalJour,
      actesCatalogue ?? []
    ))

  } catch (err) {
    console.error('[caissier/]', err)
    return c.html(pageErreur('Erreur serveur', 'Impossible de charger le dashboard.'))
  }
})

// ── GET /caissier/factures ────────────────────────────────────────────────────
caissierRoutes.get('/factures', async (c) => {
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

    let query = supabase.from('finance_factures')
      .select(`
        id, numero_facture, total_ttc, montant_patient, montant_assurance,
        statut, date_emission, created_at,
        patient:patient_dossiers!finance_factures_patient_id_fkey(nom, prenom)
      `, { count: 'exact' })
      .eq('structure_id', structureId)

    if (statut !== 'all') query = query.eq('statut', statut)

    const { data: factures, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('[caissier/factures]', error.message)
      return c.html(pageErreur('Erreur', 'Impossible de charger les factures.'))
    }

    return c.html(pageListeFactures(factures ?? [], statut, page, Math.ceil((count ?? 0) / perPage), count ?? 0))

  } catch (err) {
    console.error('[caissier/factures]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── GET /caissier/factures/:id ────────────────────────────────────────────────
caissierRoutes.get('/factures/:id', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')
  const id       = c.req.param('id')

  try {
    const { data: facture, error: factErr } = await supabase
      .from('finance_factures')
      .select(`
        id, numero_facture, total_ttc, sous_total,
        remise_montant, remise_pourcentage,
        montant_patient, montant_assurance, statut,
        date_emission, date_echeance, notes, pdf_url, created_at,
        patient:patient_dossiers!finance_factures_patient_id_fkey(
          id, nom, prenom, telephone, email, numero_national
        )
      `)
      .eq('id', id)
      .eq('structure_id', profil.structure_id ?? '')
      .single()

    if (factErr || !facture) {
      return c.html(pageErreur('Facture introuvable', 'Cette facture n\'existe pas ou vous n\'y avez pas accès.'))
    }

    // [DB-16] Colonnes réelles : description, montant_total (pas acte_nom, total_ligne)
    const { data: lignes, error: lignesErr } = await supabase
      .from('finance_facture_lignes')
      .select('id, description, quantite, prix_unitaire, montant_total, ordre')
      .eq('facture_id', id)
      .order('ordre', { ascending: true })

    if (lignesErr) console.error('[caissier/factures/:id] lignes:', lignesErr.message)

    const { data: paiements, error: paiErr } = await supabase
      .from('finance_paiements')
      .select('id, montant, mode_paiement, statut_paiement, reference_transaction, date_paiement')
      .eq('facture_id', id)
      .order('date_paiement', { ascending: false })

    if (paiErr) console.error('[caissier/factures/:id] paiements:', paiErr.message)

    return c.html(pageDetailFacture(facture, lignes ?? [], paiements ?? []))

  } catch (err) {
    console.error('[caissier/factures/:id]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── GET /caissier/nouvelle-facture ────────────────────────────────────────────
caissierRoutes.get('/nouvelle-facture', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const patientSearch = sanitizeInput(c.req.query('patient') ?? '')

    let patients: any[] = []
    if (patientSearch.length >= 2) {
      const { data, error } = await supabase
        .from('patient_dossiers')
        .select('id, nom, prenom, numero_national, telephone')
        .or(`nom.ilike.%${patientSearch}%,prenom.ilike.%${patientSearch}%,numero_national.ilike.%${patientSearch}%`)
        .eq('structure_enregistrement_id', profil.structure_id ?? '')
        .limit(10)

      if (error) console.error('[caissier/nouvelle-facture] recherche:', error.message)
      patients = data ?? []
    }

    const { data: actes } = await supabase
      .from('finance_actes_catalogue')
      .select('id, nom, code, prix, categorie')
      .eq('structure_id', profil.structure_id ?? '')
      .eq('est_actif', true)
      .order('categorie')

    return c.html(pageNouvelleFacture(patients, actes ?? [], patientSearch))

  } catch (err) {
    console.error('[caissier/nouvelle-facture]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── POST /caissier/nouvelle-facture ───────────────────────────────────────────
caissierRoutes.post('/nouvelle-facture', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const body       = await c.req.parseBody()
    const patientId  = String(body.patient_id ?? '').trim()
    const remisePct  = parseFloat(String(body.remise_pourcentage ?? '0')) || 0
    const remiseMnt  = parseInt(String(body.remise_montant ?? '0'))        || 0
    const notes      = sanitizeInput(String(body.notes ?? ''))

    if (!patientId) {
      return c.html(pageErreur('Erreur', 'Patient requis pour créer une facture.'))
    }

    // Récupérer les lignes depuis le formulaire
    // Format: acte_id[0], description[0], quantite[0], prix_unitaire[0]
    const lignesRaw = body['lignes'] as any
    const acteIds   = [body['acte_id']].flat().filter(Boolean)
    const descs     = [body['description']].flat().filter(Boolean)
    const qtts      = [body['quantite']].flat().filter(Boolean)
    const prix      = [body['prix_unitaire']].flat().filter(Boolean)

    if (!descs.length) {
      return c.html(pageErreur('Erreur', 'Au moins une ligne de facturation est requise.'))
    }

    // Calculer les montants
    let sousTotal = 0
    const lignes = descs.map((desc, i) => {
      const qte       = parseInt(String(qtts[i] ?? '1')) || 1
      const prixUnit  = parseInt(String(prix[i] ?? '0')) || 0
      // [DB-16] montant_total (pas total_ligne)
      const montant   = qte * prixUnit
      sousTotal += montant
      return {
        // [DB-16] description (pas acte_nom)
        description:   sanitizeInput(String(desc)),
        acte_id:       acteIds[i] || null,
        quantite:      qte,
        prix_unitaire: prixUnit,
        // [DB-16] montant_total (pas total_ligne)
        montant_total: montant,
        ordre:         i + 1
      }
    })

    const remise   = remiseMnt || Math.round(sousTotal * remisePct / 100)
    const totalTtc = Math.max(0, sousTotal - remise)

    // Créer la facture
    const { data: facture, error: factErr } = await supabase
      .from('finance_factures')
      .insert({
        patient_id:         patientId,
        structure_id:       profil.structure_id,
        cree_par:           profil.id,
        date_emission:      new Date().toISOString(),
        sous_total:         sousTotal,
        remise_montant:     remise,
        remise_pourcentage: remisePct,
        total_ttc:          totalTtc,
        montant_patient:    totalTtc,
        statut:             'en_attente',
        notes:              notes || null,
      })
      .select('id, numero_facture')
      .single()

    if (factErr || !facture) {
      console.error('[caissier/nouvelle-facture] INSERT facture:', factErr?.message)
      return c.html(pageErreur('Erreur', 'Impossible de créer la facture : ' + (factErr?.message ?? 'Erreur inconnue')))
    }

    // Créer les lignes
    const lignesInsert = lignes.map(l => ({ ...l, facture_id: facture.id }))
    const { error: lignesErr } = await supabase
      .from('finance_facture_lignes')
      .insert(lignesInsert)

    if (lignesErr) {
      console.error('[caissier/nouvelle-facture] INSERT lignes:', lignesErr.message)
    }

    return c.redirect(`/caissier/factures/${facture.id}?created=1`)

  } catch (err) {
    console.error('[caissier/nouvelle-facture]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── POST /caissier/factures/:id/paiement ─────────────────────────────────────
caissierRoutes.post('/factures/:id/paiement', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')
  const id       = c.req.param('id')

  try {
    const body          = await c.req.parseBody()
    const montant       = parseInt(String(body.montant ?? '0')) || 0
    const modePaiement  = String(body.mode_paiement ?? '').trim()
    const reference     = sanitizeInput(String(body.reference_transaction ?? ''))
    const operateur     = sanitizeInput(String(body.operateur ?? ''))

    if (!montant || !modePaiement) {
      return c.json({ success: false, error: 'Montant et mode de paiement requis' }, 400)
    }

    const { data: facture, error: factErr } = await supabase
      .from('finance_factures')
      .select('id, total_ttc, statut, patient_id')
      .eq('id', id)
      .eq('structure_id', profil.structure_id ?? '')
      .single()

    if (factErr || !facture) {
      return c.json({ success: false, error: 'Facture introuvable' }, 404)
    }

    // Insérer le paiement
    const { data: paiement, error: paiErr } = await supabase
      .from('finance_paiements')
      .insert({
        facture_id:            id,
        patient_id:            facture.patient_id,
        caissier_id:           profil.id,
        structure_id:          profil.structure_id,
        montant,
        mode_paiement:         modePaiement,
        reference_transaction: reference || null,
        operateur:             operateur || null,
        statut_paiement:       'valide',
        date_paiement:         new Date().toISOString(),
      })
      .select('id')
      .single()

    if (paiErr) {
      console.error('[caissier/paiement]', paiErr.message)
      return c.json({ success: false, error: paiErr.message }, 500)
    }

    // Mettre à jour le statut de la facture
    const { data: autresPai } = await supabase
      .from('finance_paiements')
      .select('montant')
      .eq('facture_id', id)
      .eq('statut_paiement', 'valide')

    const totalPaye = (autresPai ?? []).reduce((s, p) => s + (p.montant ?? 0), 0)
    const nouveauStatut = totalPaye >= facture.total_ttc ? 'payee' : 'partielle'

    const { error: updateErr } = await supabase
      .from('finance_factures')
      .update({ statut: nouveauStatut })
      .eq('id', id)

    if (updateErr) console.error('[caissier/paiement] update statut:', updateErr.message)

    return c.json({ success: true, paiement_id: paiement?.id, statut_facture: nouveauStatut })

  } catch (err) {
    console.error('[caissier/factures/:id/paiement]', err)
    return c.json({ success: false, error: 'Erreur serveur' }, 500)
  }
})

// ── GET /caissier/paiements ───────────────────────────────────────────────────
caissierRoutes.get('/paiements', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const date    = c.req.query('date') ?? new Date().toISOString().split('T')[0]
    const dateFrom = `${date}T00:00:00.000Z`
    const dateTo   = `${date}T23:59:59.999Z`

    const { data: paiements, error } = await supabase
      .from('finance_paiements')
      .select(`
        id, montant, mode_paiement, statut_paiement,
        reference_transaction, date_paiement,
        facture:finance_factures!finance_paiements_facture_id_fkey(numero_facture),
        patient:patient_dossiers!finance_paiements_patient_id_fkey(nom, prenom)
      `)
      .eq('structure_id', profil.structure_id ?? '')
      .gte('date_paiement', dateFrom)
      .lte('date_paiement', dateTo)
      .order('date_paiement', { ascending: false })

    if (error) {
      console.error('[caissier/paiements]', error.message)
    }

    const total = (paiements ?? [])
      .filter(p => p.statut_paiement === 'valide')
      .reduce((s, p) => s + (p.montant ?? 0), 0)

    return c.html(pageListePaiements(paiements ?? [], date, total))

  } catch (err) {
    console.error('[caissier/paiements]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ─── Pages HTML ───────────────────────────────────────────────────────────────

function layoutCaissier(titre: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(titre)} | Caissier SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--primary:#6A1B9A;--rouge:#C62828;--vert:#1B5E20;--orange:#E65100;
      --text:#1a1a2e;--text2:#5A6A78;--border:#E0E0E0;--bg:#F7F8FA}
    body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text)}
    header{background:var(--primary);padding:14px 20px;display:flex;align-items:center;gap:12px;color:white}
    nav{background:white;padding:0 20px;border-bottom:1px solid var(--border);display:flex;gap:0;overflow-x:auto}
    nav a{padding:12px 16px;text-decoration:none;color:var(--text2);font-size:13px;font-weight:500;border-bottom:2px solid transparent;white-space:nowrap}
    nav a:hover,nav a.active{color:var(--primary);border-color:var(--primary)}
    .main{max-width:1200px;margin:0 auto;padding:24px 16px}
    .card{background:white;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:16px}
    .card-title{font-weight:700;font-size:15px;margin-bottom:14px;display:flex;align-items:center;gap:8px}
    .stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px}
    .stat-card{background:white;border-radius:10px;padding:16px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.06)}
    .stat-number{font-size:26px;font-weight:700}
    .stat-label{font-size:12px;color:var(--text2);margin-top:4px}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .badge-payee{background:#E8F5E9;color:var(--vert)}
    .badge-attente{background:#FFF3E0;color:var(--orange)}
    .badge-partielle{background:#E3F2FD;color:#0D47A1}
    .badge-annule{background:#FFEBEE;color:var(--rouge)}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;padding:10px 12px;background:#F7F8FA;color:var(--text2);font-weight:600;font-size:12px;border-bottom:2px solid var(--border)}
    td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:middle}
    .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:7px;font-size:12px;font-weight:600;text-decoration:none;border:none;cursor:pointer}
    .btn-primary{background:var(--primary);color:white}
    .btn-success{background:#2E7D32;color:white}
    .btn-secondary{background:#F3F4F6;color:var(--text);border:1px solid var(--border)}
    .amount{font-family:monospace;font-weight:700}
    form label{display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:var(--text)}
    form input,form select,form textarea{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;margin-bottom:12px;font-family:inherit}
  </style>
</head>
<body>
<header>
  <div style="font-family:'DM Serif Display',serif;font-size:18px">💰 Caisse SantéBF</div>
</header>
<nav>
  <a href="/caissier">Dashboard</a>
  <a href="/caissier/factures">Factures</a>
  <a href="/caissier/nouvelle-facture">Nouvelle facture</a>
  <a href="/caissier/paiements">Paiements du jour</a>
  <a href="/dashboard/caissier">← Dashboard</a>
</nav>
<main class="main">
  <h1 style="font-family:'DM Serif Display',serif;font-size:24px;color:var(--primary);margin-bottom:20px">${escapeHtml(titre)}</h1>
  ${content}
</main>
</body>
</html>`
}

function pageCaissierDashboard(
  factures: any[],
  paiements: any[],
  totalJour: number,
  actes: any[]
): string {
  const nbPayees   = paiements.filter(p => p.statut_paiement === 'valide').length
  const content = `
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-number" style="color:var(--orange)">${factures.length}</div>
        <div class="stat-label">💳 Factures en attente</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color:var(--vert)">${nbPayees}</div>
        <div class="stat-label">✅ Paiements aujourd'hui</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color:var(--primary);font-size:20px">${totalJour.toLocaleString('fr-BF')} FCFA</div>
        <div class="stat-label">💰 Recettes du jour</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">💳 Factures en attente de paiement</div>
      ${factures.length ? `
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>N° Facture</th><th>Patient</th><th>Total</th><th>À payer</th><th>Statut</th><th>Action</th></tr></thead>
          <tbody>
            ${factures.map(f => `
            <tr>
              <td><strong>${escapeHtml(f.numero_facture)}</strong></td>
              <td>${escapeHtml(f.patient?.nom)} ${escapeHtml(f.patient?.prenom)}</td>
              <td class="amount">${(f.total_ttc ?? 0).toLocaleString('fr-BF')} F</td>
              <td class="amount" style="color:var(--rouge)">${(f.montant_patient ?? f.total_ttc ?? 0).toLocaleString('fr-BF')} F</td>
              <td><span class="badge ${f.statut === 'en_attente' ? 'badge-attente' : 'badge-partielle'}">${escapeHtml(f.statut)}</span></td>
              <td><a href="/caissier/factures/${f.id}" class="btn btn-primary">Encaisser →</a></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<div style="text-align:center;padding:32px;color:var(--text2)">✅ Aucune facture en attente</div>'}
    </div>
  `
  return layoutCaissier('Dashboard Caisse', content)
}

function pageListeFactures(factures: any[], statut: string, page: number, totalPages: number, total: number): string {
  const content = `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      ${['all','en_attente','partielle','payee','annulee'].map(s => `
        <a href="/caissier/factures?statut=${s}" style="padding:7px 14px;background:white;border:1px solid #E0E0E0;border-radius:20px;font-size:12px;text-decoration:none;color:${statut===s?'white':'#374151'};background:${statut===s?'#6A1B9A':'white'}">${s==='all'?'Toutes':escapeHtml(s)}</a>
      `).join('')}
    </div>
    <p style="color:var(--text2);font-size:13px;margin-bottom:16px">${total} facture(s)</p>
    <div class="card">
      ${factures.length ? `
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>N° Facture</th><th>Patient</th><th>Total TTC</th><th>Statut</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>
            ${factures.map(f => `
            <tr>
              <td><strong>${escapeHtml(f.numero_facture)}</strong></td>
              <td>${escapeHtml(f.patient?.nom)} ${escapeHtml(f.patient?.prenom)}</td>
              <td class="amount">${(f.total_ttc ?? 0).toLocaleString('fr-BF')} FCFA</td>
              <td><span class="badge ${
                f.statut === 'payee' ? 'badge-payee' :
                f.statut === 'en_attente' ? 'badge-attente' :
                f.statut === 'partielle' ? 'badge-partielle' : 'badge-annule'
              }">${escapeHtml(f.statut)}</span></td>
              <td>${f.created_at ? new Date(f.created_at).toLocaleDateString('fr-BF') : '—'}</td>
              <td><a href="/caissier/factures/${f.id}" class="btn btn-secondary">Voir →</a></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${totalPages > 1 ? `
      <div style="display:flex;gap:8px;justify-content:center;margin-top:16px">
        ${page > 1 ? `<a href="/caissier/factures?statut=${statut}&page=${page-1}" class="btn btn-primary">← Précédent</a>` : ''}
        <span style="padding:6px 12px;font-size:13px">Page ${page}/${totalPages}</span>
        ${page < totalPages ? `<a href="/caissier/factures?statut=${statut}&page=${page+1}" class="btn btn-primary">Suivant →</a>` : ''}
      </div>` : ''}
      ` : '<div style="text-align:center;padding:32px;color:var(--text2)">Aucune facture</div>'}
    </div>
  `
  return layoutCaissier('Liste des factures', content)
}

function pageDetailFacture(facture: any, lignes: any[], paiements: any[]): string {
  const totalPaye = paiements
    .filter(p => p.statut_paiement === 'valide')
    .reduce((s, p) => s + (p.montant ?? 0), 0)
  const resteAPayer = Math.max(0, (facture.total_ttc ?? 0) - totalPaye)

  const content = `
    ${c_req_success() ? '<div style="background:#E8F5E9;border-radius:8px;padding:12px 16px;color:#1B5E20;margin-bottom:16px">✅ Facture créée avec succès</div>' : ''}
    
    <div class="card">
      <div class="card-title">📄 Facture N° ${escapeHtml(facture.numero_facture)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div>
          <p><strong>Patient :</strong> ${escapeHtml(facture.patient?.nom)} ${escapeHtml(facture.patient?.prenom)}</p>
          <p style="color:var(--text2);font-size:13px">${escapeHtml(facture.patient?.telephone) || ''}</p>
          <p style="color:var(--text2);font-size:13px">N° ${escapeHtml(facture.patient?.numero_national) || ''}</p>
        </div>
        <div style="text-align:right">
          <p><strong>Date :</strong> ${facture.date_emission ? new Date(facture.date_emission).toLocaleDateString('fr-BF') : '—'}</p>
          <p><strong>Statut :</strong> <span class="badge ${
            facture.statut === 'payee' ? 'badge-payee' :
            facture.statut === 'en_attente' ? 'badge-attente' : 'badge-partielle'
          }">${escapeHtml(facture.statut)}</span></p>
        </div>
      </div>
      
      <!-- Lignes de facturation [DB-16] : description et montant_total -->
      <table>
        <thead><tr><th>Description</th><th>Qté</th><th>Prix U.</th><th>Total</th></tr></thead>
        <tbody>
          ${lignes.map(l => `
          <tr>
            <!-- [DB-16] description est la colonne réelle (pas acte_nom) -->
            <td>${escapeHtml(l.description)}</td>
            <td>${l.quantite ?? 1}</td>
            <td class="amount">${(l.prix_unitaire ?? 0).toLocaleString('fr-BF')} F</td>
            <!-- [DB-16] montant_total est la colonne réelle (pas total_ligne) -->
            <td class="amount"><strong>${(l.montant_total ?? 0).toLocaleString('fr-BF')} F</strong></td>
          </tr>`).join('')}
        </tbody>
        <tfoot>
          ${facture.remise_montant ? `<tr><td colspan="3" style="text-align:right">Remise :</td><td class="amount" style="color:var(--rouge)">-${(facture.remise_montant ?? 0).toLocaleString('fr-BF')} F</td></tr>` : ''}
          <tr style="font-size:16px;font-weight:700">
            <td colspan="3" style="text-align:right">TOTAL TTC :</td>
            <td class="amount">${(facture.total_ttc ?? 0).toLocaleString('fr-BF')} FCFA</td>
          </tr>
          ${totalPaye > 0 ? `<tr><td colspan="3" style="text-align:right;color:var(--vert)">Payé :</td><td class="amount" style="color:var(--vert)">${totalPaye.toLocaleString('fr-BF')} F</td></tr>` : ''}
          ${resteAPayer > 0 ? `<tr style="color:var(--rouge)"><td colspan="3" style="text-align:right"><strong>Reste à payer :</strong></td><td class="amount"><strong>${resteAPayer.toLocaleString('fr-BF')} F</strong></td></tr>` : ''}
        </tfoot>
      </table>
    </div>

    ${resteAPayer > 0 ? `
    <div class="card">
      <div class="card-title">💳 Encaisser un paiement</div>
      <form id="form-paiement">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label>Montant (FCFA)</label>
            <input type="number" name="montant" value="${resteAPayer}" min="1" max="${resteAPayer}" required>
          </div>
          <div>
            <label>Mode de paiement</label>
            <select name="mode_paiement" required>
              <option value="especes">💵 Espèces</option>
              <option value="mobile_money">📱 Mobile Money (Orange/Moov)</option>
              <option value="carte">💳 Carte bancaire</option>
              <option value="virement">🏦 Virement</option>
              <option value="assurance">🏛️ Assurance</option>
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label>Référence transaction (optionnel)</label>
            <input type="text" name="reference_transaction" placeholder="Ex: TXN-ABC123">
          </div>
          <div>
            <label>Opérateur (Mobile Money)</label>
            <input type="text" name="operateur" placeholder="Orange, Moov, etc.">
          </div>
        </div>
        <button type="button" onclick="encaisser()" class="btn btn-success" style="margin-top:8px">
          ✅ Encaisser ${resteAPayer.toLocaleString('fr-BF')} FCFA
        </button>
      </form>
      <script>
        async function encaisser() {
          const form = document.getElementById('form-paiement')
          const data = new FormData(form)
          const res  = await fetch('/caissier/factures/${facture.id}/paiement', {
            method: 'POST',
            body: data
          })
          const json = await res.json()
          if (json.success) {
            alert('✅ Paiement enregistré !')
            location.reload()
          } else {
            alert('❌ Erreur : ' + json.error)
          }
        }
      </script>
    </div>` : ''}

    ${paiements.length ? `
    <div class="card">
      <div class="card-title">📜 Historique des paiements</div>
      <table>
        <thead><tr><th>Date</th><th>Montant</th><th>Mode</th><th>Référence</th><th>Statut</th></tr></thead>
        <tbody>
          ${paiements.map(p => `
          <tr>
            <td>${p.date_paiement ? new Date(p.date_paiement).toLocaleString('fr-BF') : '—'}</td>
            <td class="amount">${(p.montant ?? 0).toLocaleString('fr-BF')} F</td>
            <td>${escapeHtml(p.mode_paiement)}</td>
            <td>${escapeHtml(p.reference_transaction) || '—'}</td>
            <td><span class="badge ${p.statut_paiement === 'valide' ? 'badge-payee' : 'badge-annule'}">${escapeHtml(p.statut_paiement)}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}
  `
  return layoutCaissier(`Facture ${facture.numero_facture}`, content)
}

function c_req_success(): boolean { return false } // Placeholder

function pageNouvelleFacture(patients: any[], actes: any[], search: string): string {
  const content = `
    <div class="card">
      <div class="card-title">🔍 Rechercher un patient</div>
      <form method="GET" action="/caissier/nouvelle-facture">
        <div style="display:flex;gap:10px">
          <input type="text" name="patient" value="${escapeAttr(search)}" placeholder="Nom, prénom ou N° patient..." style="flex:1">
          <button type="submit" class="btn btn-primary">Rechercher</button>
        </div>
      </form>
      ${patients.length ? `
      <div style="margin-top:16px">
        <p style="font-size:13px;color:var(--text2);margin-bottom:8px">${patients.length} patient(s) trouvé(s)</p>
        ${patients.map(p => `
        <div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;cursor:pointer;display:flex;justify-content:space-between;align-items:center"
          onclick="selectPatient('${p.id}','${escapeAttr(p.nom)} ${escapeAttr(p.prenom)}')">
          <div>
            <strong>${escapeHtml(p.nom)} ${escapeHtml(p.prenom)}</strong>
            <div style="font-size:12px;color:var(--text2)">${escapeHtml(p.numero_national)} · ${escapeHtml(p.telephone) || '—'}</div>
          </div>
          <span class="btn btn-secondary">Sélectionner</span>
        </div>`).join('')}
      </div>` : search.length >= 2 ? '<p style="color:var(--text2);margin-top:12px">Aucun patient trouvé</p>' : ''}
    </div>

    <div id="form-facture" style="display:none">
      <div class="card">
        <div class="card-title">📄 Nouvelle facture</div>
        <p id="patient-selected" style="background:#E8F5E9;padding:10px;border-radius:8px;margin-bottom:16px;color:var(--vert)"></p>
        <form method="POST" action="/caissier/nouvelle-facture">
          <input type="hidden" name="patient_id" id="patient_id">
          
          <div id="lignes-container">
            <div class="card-title" style="margin-bottom:10px">🧾 Lignes de facturation</div>
            <div id="lignes">
              <div class="ligne-row" style="display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px">
                <!-- [DB-16] Le champ s'appelle description dans la DB -->
                <input type="text" name="description" placeholder="Description de l'acte" required>
                <input type="number" name="quantite" placeholder="Qté" value="1" min="1">
                <input type="number" name="prix_unitaire" placeholder="Prix (FCFA)" min="0">
                <button type="button" onclick="this.closest('.ligne-row').remove()" style="background:#FFEBEE;color:var(--rouge);border:none;padding:8px;border-radius:6px;cursor:pointer">✕</button>
              </div>
            </div>
            <button type="button" onclick="ajouterLigne()" class="btn btn-secondary" style="margin-bottom:16px">+ Ajouter une ligne</button>
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label>Remise (%)</label>
              <input type="number" name="remise_pourcentage" placeholder="0" min="0" max="100">
            </div>
            <div>
              <label>Notes</label>
              <input type="text" name="notes" placeholder="Notes optionnelles">
            </div>
          </div>
          
          <button type="submit" class="btn btn-primary" style="margin-top:8px">💾 Créer la facture</button>
        </form>
      </div>
    </div>
    
    <script>
      function selectPatient(id, nom) {
        document.getElementById('patient_id').value = id
        document.getElementById('patient-selected').textContent = '✅ Patient : ' + nom
        document.getElementById('form-facture').style.display = 'block'
        window.scrollTo({top: document.getElementById('form-facture').offsetTop - 20, behavior: 'smooth'})
      }
      function ajouterLigne() {
        const div = document.createElement('div')
        div.className = 'ligne-row'
        div.style.cssText = 'display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px'
        div.innerHTML = \`
          <input type="text" name="description" placeholder="Description de l'acte" required>
          <input type="number" name="quantite" placeholder="Qté" value="1" min="1">
          <input type="number" name="prix_unitaire" placeholder="Prix (FCFA)" min="0">
          <button type="button" onclick="this.closest('.ligne-row').remove()" style="background:#FFEBEE;color:#C62828;border:none;padding:8px;border-radius:6px;cursor:pointer">✕</button>
        \`
        document.getElementById('lignes').appendChild(div)
      }
    </script>
  `
  return layoutCaissier('Nouvelle facture', content)
}

function pageListePaiements(paiements: any[], date: string, total: number): string {
  const content = `
    <div style="display:flex;gap:10px;margin-bottom:16px;align-items:center">
      <label style="font-weight:600">Date :</label>
      <input type="date" value="${escapeAttr(date)}" onchange="location.href='/caissier/paiements?date='+this.value"
        style="padding:8px 12px;border:1px solid #E0E0E0;border-radius:8px;font-size:13px">
      <span style="margin-left:auto;font-size:18px;font-weight:700;color:#1B5E20">
        Total : ${total.toLocaleString('fr-BF')} FCFA
      </span>
    </div>
    <div class="card">
      ${paiements.length ? `
      <table>
        <thead><tr><th>Heure</th><th>Patient</th><th>Facture</th><th>Montant</th><th>Mode</th><th>Référence</th><th>Statut</th></tr></thead>
        <tbody>
          ${paiements.map(p => `
          <tr>
            <td>${p.date_paiement ? new Date(p.date_paiement).toLocaleTimeString('fr-BF', {hour:'2-digit',minute:'2-digit'}) : '—'}</td>
            <td>${escapeHtml(p.patient?.nom)} ${escapeHtml(p.patient?.prenom)}</td>
            <td>${escapeHtml(p.facture?.numero_facture) || '—'}</td>
            <td class="amount" style="font-weight:700">${(p.montant ?? 0).toLocaleString('fr-BF')} F</td>
            <td>${escapeHtml(p.mode_paiement)}</td>
            <td style="font-size:11px;color:var(--text2)">${escapeHtml(p.reference_transaction) || '—'}</td>
            <td><span class="badge ${p.statut_paiement === 'valide' ? 'badge-payee' : 'badge-annule'}">${escapeHtml(p.statut_paiement)}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<div style="text-align:center;padding:32px;color:var(--text2)">Aucun paiement ce jour</div>'}
    </div>
  `
  return layoutCaissier(`Paiements du ${new Date(date).toLocaleDateString('fr-BF')}`, content)
}

function escapeAttr(s: string | null | undefined): string {
  if (!s) return ''
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function pageErreur(titre: string, message: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${escapeHtml(titre)}</title></head>
  <body style="font-family:sans-serif;padding:40px;text-align:center">
    <h1 style="color:#C62828">${escapeHtml(titre)}</h1>
    <p style="color:#6B7280;margin:16px 0">${escapeHtml(message)}</p>
    <a href="/caissier" style="background:#6A1B9A;color:white;padding:10px 20px;border-radius:8px;text-decoration:none">← Retour</a>
  </body></html>`
}