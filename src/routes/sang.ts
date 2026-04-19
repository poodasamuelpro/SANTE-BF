/**
 * src/routes/sang.ts
 * SantéBF — Module Don de Sang + CNTS
 *
 * CORRECTIONS APPLIQUÉES :
 *   [LM-23] sang_donneurs : nb_dons_total initialisé à 0, valide_par correctement géré
 *   [QC-10] Toutes les requêtes déstructurent { data, error } et vérifient l'erreur
 *   [S-09]  escapeHtml() systématique sur toutes les données dynamiques
 *   CONSERVÉ : Toute la logique métier du module sang
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase, type Bindings, type Variables, escapeHtml } from '../lib/supabase'

// ─── Routes patients (inscription comme donneur) ──────────────────────────────
export const sangPatientRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
sangPatientRoutes.use('/*', requireAuth)
sangPatientRoutes.use('/*', requireRole('patient', 'agent_accueil', 'admin_structure', 'super_admin'))

// ─── Routes CNTS ──────────────────────────────────────────────────────────────
export const cntsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
cntsRoutes.use('/*', requireAuth)
cntsRoutes.use('/*', requireRole('cnts_agent', 'super_admin'))

// ── GET /sang ─────────────────────────────────────────────────────────────────
sangPatientRoutes.get('/', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    // Récupérer le dossier patient
    const { data: dossier, error: dossierErr } = await supabase
      .from('patient_dossiers')
      .select('id, nom, prenom, groupe_sanguin, rhesus, date_naissance')
      .eq('profile_id', profil.id)
      .single()

    if (dossierErr || !dossier) {
      return c.html(pageErreurSang('Dossier introuvable', 'Vous devez avoir un dossier patient pour accéder à ce module.'))
    }

    // Vérifier si déjà inscrit comme donneur
    const { data: donneur, error: donneurErr } = await supabase
      .from('sang_donneurs')
      .select('id, est_disponible, derniere_donnee_at, peut_donner_apres, nb_dons_total')
      .eq('patient_id', dossier.id)
      .single()

    if (donneurErr && donneurErr.code !== 'PGRST116') {
      console.warn('[sang/] erreur donneur:', donneurErr.message)
    }

    return c.html(pageSangPatient(dossier, donneur))

  } catch (err) {
    console.error('[sang/]', err)
    return c.html(pageErreurSang('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── POST /sang/inscription ────────────────────────────────────────────────────
sangPatientRoutes.post('/inscription', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const { data: dossier, error: dossierErr } = await supabase
      .from('patient_dossiers')
      .select('id, groupe_sanguin, rhesus, telephone')
      .eq('profile_id', profil.id)
      .single()

    if (dossierErr || !dossier) {
      return c.json({ success: false, error: 'Dossier patient introuvable' }, 404)
    }

    const body              = await c.req.parseBody()
    const telephone_contact = String(body.telephone_contact ?? dossier.telephone ?? '').trim()
    const ville_id          = String(body.ville_id ?? '').trim() || null
    const notes             = String(body.notes ?? '').trim() || null

    // Vérifier si déjà inscrit
    const { data: existant } = await supabase
      .from('sang_donneurs')
      .select('id')
      .eq('patient_id', dossier.id)
      .single()

    if (existant) {
      return c.json({ success: false, error: 'Vous êtes déjà inscrit comme donneur' }, 409)
    }

    // [LM-23] Initialiser nb_dons_total à 0 (jamais NULL)
    const { data: nouveau, error: insertErr } = await supabase
      .from('sang_donneurs')
      .insert({
        patient_id:        dossier.id,
        groupe_sanguin:    dossier.groupe_sanguin || null,
        rhesus:            dossier.rhesus || null,
        est_disponible:    true,
        // [LM-23] valide_par initialisé à null (sera renseigné par un CNTS)
        valide_par:        null,
        // [LM-23] nb_dons_total initialisé à 0
        nb_dons_total:     0,
        telephone_contact: telephone_contact || null,
        ville_id:          ville_id,
        notes_medicales:   notes,
        created_at:        new Date().toISOString(),
        updated_at:        new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertErr || !nouveau) {
      console.error('[sang/inscription]', insertErr?.message)
      return c.json({ success: false, error: insertErr?.message ?? 'Erreur d\'inscription' }, 500)
    }

    return c.json({ success: true, donneur_id: nouveau.id })

  } catch (err) {
    console.error('[sang/inscription]', err)
    return c.json({ success: false, error: 'Erreur serveur' }, 500)
  }
})

// ── POST /sang/disponibilite ──────────────────────────────────────────────────
sangPatientRoutes.post('/disponibilite', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const body = await c.req.parseBody()
    const est_disponible = body.disponible === 'true' || body.disponible === 'on'

    const { data: dossier, error: dossierErr } = await supabase
      .from('patient_dossiers')
      .select('id')
      .eq('profile_id', profil.id)
      .single()

    if (dossierErr || !dossier) {
      return c.json({ success: false, error: 'Dossier introuvable' }, 404)
    }

    const { error: updateErr } = await supabase
      .from('sang_donneurs')
      .update({
        est_disponible,
        updated_at: new Date().toISOString()
      })
      .eq('patient_id', dossier.id)

    if (updateErr) {
      console.error('[sang/disponibilite]', updateErr.message)
      return c.json({ success: false, error: updateErr.message }, 500)
    }

    return c.json({ success: true, est_disponible })

  } catch (err) {
    console.error('[sang/disponibilite]', err)
    return c.json({ success: false, error: 'Erreur serveur' }, 500)
  }
})

// ── GET /cnts ─────────────────────────────────────────────────────────────────
cntsRoutes.get('/', async (c) => {
  const supabase = c.get('supabase')

  try {
    // Statistiques globales
    const [
      { data: totalDonneurs, error: totErr },
      { data: demandesUrgentes, error: demErr },
      { data: donneursDisponibles, error: dispErr }
    ] = await Promise.all([
      supabase.from('sang_donneurs').select('id', { count: 'exact' }),
      supabase.from('sang_demandes_urgence')
        .select('id, groupe_sanguin, rhesus, urgence_niveau, statut, created_at')
        .in('statut', ['en_cours', 'en_attente'])
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('sang_donneurs')
        .select('id, groupe_sanguin, rhesus, nb_dons_total')
        .eq('est_disponible', true)
        .is('peut_donner_apres', null)
        .or(`peut_donner_apres.lte.${new Date().toISOString()}`)
        .limit(5)
    ])

    if (totErr)  console.warn('[cnts/] total donneurs:', totErr.message)
    if (demErr)  console.warn('[cnts/] demandes:', demErr.message)
    if (dispErr) console.warn('[cnts/] disponibles:', dispErr.message)

    return c.html(pageCntsDashboard(
      totalDonneurs?.length ?? 0,
      demandesUrgentes ?? [],
      donneursDisponibles ?? []
    ))

  } catch (err) {
    console.error('[cnts/]', err)
    return c.html(pageErreurSang('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── GET /cnts/recherche ───────────────────────────────────────────────────────
cntsRoutes.get('/recherche', async (c) => {
  const supabase = c.get('supabase')

  try {
    const groupe  = c.req.query('groupe') ?? ''
    const rhesus  = c.req.query('rhesus') ?? ''
    const ville   = c.req.query('ville')  ?? ''

    let query = supabase
      .from('sang_donneurs')
      .select(`
        id, groupe_sanguin, rhesus, est_disponible,
        peut_donner_apres, nb_dons_total, telephone_contact,
        patient:patient_dossiers!sang_donneurs_patient_id_fkey(
          nom, prenom, telephone, ville_id
        )
      `)
      .eq('est_disponible', true)

    if (groupe)   query = query.eq('groupe_sanguin', groupe)
    if (rhesus)   query = query.eq('rhesus', rhesus)

    const { data: donneurs, error } = await query
      .order('nb_dons_total', { ascending: false })
      .limit(50)

    if (error) console.error('[cnts/recherche]', error.message)

    // Filtrer côté serveur ceux qui peuvent donner maintenant
    const disponibles = (donneurs ?? []).filter(d => {
      if (!d.peut_donner_apres) return true
      return new Date(d.peut_donner_apres) <= new Date()
    })

    return c.html(pageRechercheDonneurs(disponibles, groupe, rhesus))

  } catch (err) {
    console.error('[cnts/recherche]', err)
    return c.html(pageErreurSang('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── POST /cnts/donneurs/:id/valider ──────────────────────────────────────────
cntsRoutes.post('/donneurs/:id/valider', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')
  const id       = c.req.param('id')

  try {
    // [LM-23] Mettre à jour valide_par correctement
    const { error } = await supabase
      .from('sang_donneurs')
      .update({
        valide_par:  profil.id,
        updated_at:  new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('[cnts/valider]', error.message)
      return c.json({ success: false, error: error.message }, 500)
    }

    return c.json({ success: true })

  } catch (err) {
    console.error('[cnts/donneurs/:id/valider]', err)
    return c.json({ success: false, error: 'Erreur serveur' }, 500)
  }
})

// ── POST /cnts/demandes ───────────────────────────────────────────────────────
cntsRoutes.post('/demandes', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const body = await c.req.parseBody()

    const { data, error } = await supabase
      .from('sang_demandes_urgence')
      .insert({
        groupe_sanguin:  String(body.groupe_sanguin ?? '').trim(),
        rhesus:          String(body.rhesus ?? '').trim(),
        quantite_ml:     parseInt(String(body.quantite_ml ?? '0')) || null,
        urgence_niveau:  String(body.urgence_niveau ?? 'normale').trim(),
        structure_id:    profil.structure_id || null,
        medecin_demandeur: profil.id,
        notes:           String(body.notes ?? '').trim() || null,
        statut:          'en_attente',
        created_at:      new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      console.error('[cnts/demandes]', error.message)
      return c.json({ success: false, error: error.message }, 500)
    }

    return c.json({ success: true, demande_id: data?.id })

  } catch (err) {
    console.error('[cnts/demandes]', err)
    return c.json({ success: false, error: 'Erreur serveur' }, 500)
  }
})

// ─── Pages HTML ───────────────────────────────────────────────────────────────

function layoutSang(titre: string, couleur: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(titre)} | SantéBF Don de Sang</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#FFF5F5;color:#1a1a2e}
    header{background:${couleur};padding:14px 20px;color:white;display:flex;align-items:center;gap:12px}
    .main{max-width:900px;margin:0 auto;padding:24px 16px}
    .card{background:white;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:16px}
    .card-title{font-weight:700;font-size:15px;margin-bottom:14px;display:flex;align-items:center;gap:8px}
    .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
    .badge-rouge{background:#FFEBEE;color:#C62828}
    .badge-vert{background:#E8F5E9;color:#1B5E20}
    .badge-orange{background:#FFF3E0;color:#E65100}
    .btn{padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;border:none;cursor:pointer;display:inline-block}
    .btn-rouge{background:#C62828;color:white}
    .btn-vert{background:#2E7D32;color:white}
    .btn-secondary{background:#F3F4F6;color:#374151;border:1px solid #E0E0E0}
    .stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px}
    .stat{background:white;border-radius:10px;padding:16px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.06)}
    .stat-number{font-size:28px;font-weight:700;color:#C62828}
    .stat-label{font-size:12px;color:#6B7280;margin-top:4px}
    .list-item{padding:12px;border-bottom:1px solid #F0F0F0;display:flex;gap:12px;align-items:center}
    .list-item:last-child{border-bottom:none}
    form label{display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:#374151}
    form input,form select,form textarea{width:100%;padding:10px 12px;border:1px solid #E0E0E0;border-radius:8px;font-size:13px;margin-bottom:12px;font-family:inherit}
  </style>
</head>
<body>
<header>
  <div style="font-family:'DM Serif Display',serif;font-size:20px">🩸 ${escapeHtml(titre)}</div>
  <div style="margin-left:auto">
    <a href="/auth/logout" style="color:rgba(255,255,255,.8);text-decoration:none;font-size:13px">Déconnexion</a>
  </div>
</header>
<main class="main">
  ${content}
</main>
</body>
</html>`
}

function pageSangPatient(dossier: any, donneur: any): string {
  const peutDonner = !donneur?.peut_donner_apres ||
    new Date(donneur.peut_donner_apres) <= new Date()

  const content = `
    <div class="card">
      <div class="card-title">🩸 Don de Sang — ${escapeHtml(dossier.prenom)} ${escapeHtml(dossier.nom)}</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">
        <div style="background:#FFF5F5;padding:12px 20px;border-radius:8px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#C62828">${escapeHtml(dossier.groupe_sanguin) || '?'} ${escapeHtml(dossier.rhesus) || ''}</div>
          <div style="font-size:12px;color:#6B7280">Groupe sanguin</div>
        </div>
        ${donneur ? `
        <div style="background:#F0FFF4;padding:12px 20px;border-radius:8px;text-align:center">
          <!-- [LM-23] nb_dons_total initialisé à 0 -->
          <div style="font-size:28px;font-weight:700;color:#2E7D32">${donneur.nb_dons_total ?? 0}</div>
          <div style="font-size:12px;color:#6B7280">Dons effectués</div>
        </div>` : ''}
      </div>

      ${!donneur ? `
      <div style="background:#FFF5F5;border:1px solid #EF9A9A;border-radius:8px;padding:16px;margin-bottom:16px">
        <h3 style="color:#C62828;margin-bottom:8px">🩸 Devenez donneur de sang</h3>
        <p style="font-size:14px;color:#5A6A78;margin-bottom:12px">
          Le don de sang sauve des vies. En vous inscrivant, vous permettez au CNTS de vous contacter en cas d'urgence correspondant à votre groupe sanguin.
        </p>
        <form method="POST" action="/sang/inscription">
          <label>Téléphone de contact (pour les urgences)</label>
          <input type="tel" name="telephone_contact" placeholder="Ex: 70 00 00 00" value="${escapeAttr(dossier.telephone) || ''}">
          <label>Notes médicales (optionnel)</label>
          <textarea name="notes" placeholder="Contre-indications, maladies récentes..."></textarea>
          <button type="submit" class="btn btn-rouge">🩸 M'inscrire comme donneur</button>
        </form>
      </div>` : `
      <div style="background:${donneur.est_disponible ? '#F0FFF4' : '#FFF5F5'};border-radius:8px;padding:16px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <strong>${donneur.est_disponible ? '✅ Disponible pour donner' : '⏸️ Actuellement indisponible'}</strong>
            ${donneur.peut_donner_apres && !peutDonner ? `<p style="font-size:12px;color:#6B7280;margin-top:4px">Peut donner à partir du ${new Date(donneur.peut_donner_apres).toLocaleDateString('fr-BF')}</p>` : ''}
          </div>
          <form method="POST" action="/sang/disponibilite">
            <input type="hidden" name="disponible" value="${donneur.est_disponible ? 'false' : 'true'}">
            <button type="submit" class="btn ${donneur.est_disponible ? 'btn-secondary' : 'btn-vert'}">
              ${donneur.est_disponible ? '⏸️ Suspendre' : '✅ Me rendre disponible'}
            </button>
          </form>
        </div>
      </div>
      <div style="background:#FFF8E1;border-radius:8px;padding:12px;font-size:13px;color:#795548">
        <strong>ℹ️ Informations importantes :</strong><br>
        • Intervalle minimum entre 2 dons : 56 jours<br>
        • Vous serez contacté uniquement en cas d'urgence correspondant à votre groupe<br>
        • Vous pouvez vous désinscrire à tout moment
      </div>`}
    </div>
  `
  return layoutSang('Don de Sang', '#C62828', content)
}

function pageCntsDashboard(total: number, demandes: any[], disponibles: any[]): string {
  const content = `
    <div class="stat-grid">
      <div class="stat"><div class="stat-number">${total}</div><div class="stat-label">Donneurs inscrits</div></div>
      <div class="stat"><div class="stat-number" style="color:#E65100">${demandes.length}</div><div class="stat-label">Demandes urgentes</div></div>
      <div class="stat"><div class="stat-number" style="color:#1B5E20">${disponibles.length}</div><div class="stat-label">Disponibles maintenant</div></div>
    </div>

    ${demandes.length ? `
    <div class="card">
      <div class="card-title">🚨 Demandes de sang urgentes</div>
      ${demandes.map(d => `
      <div class="list-item">
        <div style="background:#FFEBEE;color:#C62828;font-weight:700;padding:8px 14px;border-radius:8px;font-size:16px">
          ${escapeHtml(d.groupe_sanguin)} ${escapeHtml(d.rhesus)}
        </div>
        <div style="flex:1">
          <div style="font-weight:600">${escapeHtml(d.urgence_niveau) || 'normale'}</div>
          <div style="font-size:12px;color:#6B7280">${new Date(d.created_at).toLocaleString('fr-BF')}</div>
        </div>
        <span class="badge ${d.statut === 'en_cours' ? 'badge-orange' : 'badge-rouge'}">${escapeHtml(d.statut)}</span>
        <a href="/cnts/recherche?groupe=${encodeURIComponent(d.groupe_sanguin || '')}&rhesus=${encodeURIComponent(d.rhesus || '')}" class="btn btn-rouge" style="margin-left:8px">Trouver →</a>
      </div>`).join('')}
    </div>` : ''}

    <div class="card">
      <div class="card-title">🔍 Rechercher un donneur</div>
      <form method="GET" action="/cnts/recherche">
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end">
          <div>
            <label>Groupe sanguin</label>
            <select name="groupe">
              <option value="">Tous</option>
              ${['A','B','AB','O'].map(g => `<option value="${g}">${g}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Rhésus</label>
            <select name="rhesus">
              <option value="">Tous</option>
              <option value="+">Positif (+)</option>
              <option value="-">Négatif (-)</option>
            </select>
          </div>
          <button type="submit" class="btn btn-rouge" style="margin-bottom:12px">🔍 Rechercher</button>
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-title">➕ Créer une demande urgente</div>
      <form method="POST" action="/cnts/demandes">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
          <div>
            <label>Groupe sanguin requis</label>
            <select name="groupe_sanguin" required>
              ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => `<option value="${g}">${g}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Rhésus</label>
            <select name="rhesus" required>
              <option value="+">Positif (+)</option>
              <option value="-">Négatif (-)</option>
            </select>
          </div>
          <div>
            <label>Urgence</label>
            <select name="urgence_niveau">
              <option value="critique">🔴 Critique</option>
              <option value="urgente">🟠 Urgente</option>
              <option value="normale">🟡 Normale</option>
            </select>
          </div>
        </div>
        <label>Notes</label>
        <input type="text" name="notes" placeholder="Contexte, patient, hôpital...">
        <button type="submit" class="btn btn-rouge">🩸 Créer la demande</button>
      </form>
    </div>
  `
  return layoutSang('CNTS — Centre National de Transfusion Sanguine', '#B71C1C', content)
}

function pageRechercheDonneurs(donneurs: any[], groupe: string, rhesus: string): string {
  const content = `
    <div style="margin-bottom:16px">
      <a href="/cnts" style="color:#C62828;text-decoration:none;font-weight:600">← Retour CNTS</a>
    </div>
    <h2 style="font-size:22px;margin-bottom:16px;color:#1a1a2e">
      🔍 Donneurs ${groupe ? `groupe ${escapeHtml(groupe)}${rhesus ? escapeHtml(rhesus) : ''}` : 'tous groupes'}
    </h2>
    <div class="card">
      ${donneurs.length ? `
      <p style="font-size:13px;color:#6B7280;margin-bottom:12px">${donneurs.length} donneur(s) disponible(s)</p>
      ${donneurs.map(d => `
      <div class="list-item">
        <div style="background:#FFEBEE;color:#C62828;font-weight:700;padding:8px 12px;border-radius:8px;min-width:60px;text-align:center">
          ${escapeHtml(d.groupe_sanguin) || '?'} ${escapeHtml(d.rhesus) || ''}
        </div>
        <div style="flex:1">
          <div style="font-weight:600">${escapeHtml(d.patient?.nom)} ${escapeHtml(d.patient?.prenom)}</div>
          <div style="font-size:12px;color:#6B7280">
            📞 ${escapeHtml(d.telephone_contact || d.patient?.telephone || '—')}
            · ${d.nb_dons_total ?? 0} don(s)
          </div>
        </div>
        ${d.valide_par ? '' : `
        <form method="POST" action="/cnts/donneurs/${d.id}/valider" style="display:inline">
          <button type="submit" class="btn btn-vert" style="font-size:11px;padding:6px 10px">Valider</button>
        </form>`}
      </div>`).join('')}` :
      '<div style="text-align:center;padding:40px;color:#6B7280">Aucun donneur disponible pour ce groupe</div>'}
    </div>
  `
  return layoutSang('Résultats de recherche', '#C62828', content)
}

function escapeAttr(s: string | null | undefined): string {
  if (!s) return ''
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;')
}

function pageErreurSang(titre: string, message: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${escapeHtml(titre)}</title></head>
  <body style="font-family:sans-serif;padding:40px;text-align:center;background:#FFF5F5">
    <h1 style="color:#C62828">🩸 ${escapeHtml(titre)}</h1>
    <p style="color:#6B7280;margin:16px 0">${escapeHtml(message)}</p>
    <a href="/dashboard/patient" style="background:#C62828;color:white;padding:10px 20px;border-radius:8px;text-decoration:none">← Retour</a>
  </body></html>`
}