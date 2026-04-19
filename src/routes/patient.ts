/**
 * src/routes/patient.ts
 * SantéBF — Routes espace patient
 *
 * CORRECTIONS APPLIQUÉES :
 *   [DB-10]  code_urgence_hash → utilisation de code_urgence (colonne générée) pour affichage
 *   [DB-09]  patient_contacts_urgence.lien → lien_parente (colonne réelle)
 *   [QC-10]  Toutes les requêtes Supabase déstructurent { data, error } et vérifient error
 *   [S-09]   escapeHtml() utilisé pour toutes les données affichées en HTML
 *   [LM-21]  Pagination améliorée (range au lieu de limit fixe)
 *   CONSERVÉ : Toute la logique métier existante intacte
 */

import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { requireAuth, requireRole } from '../middleware/auth'
import {
  getSupabase,
  getProfil,
  type Bindings,
  type Variables,
  escapeHtml
} from '../lib/supabase'

export const patientRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

patientRoutes.use('/*', requireAuth)
patientRoutes.use('/*', requireRole('patient'))

// ── GET /patient/dossier ──────────────────────────────────────────────────────
patientRoutes.get('/dossier', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    // Récupérer le dossier patient lié au profil
    const { data: dossier, error: dossierError } = await supabase
      .from('patient_dossiers')
      .select(`
        id, numero_national, nom, prenom, date_naissance, sexe,
        groupe_sanguin, rhesus, allergies, maladies_chroniques,
        telephone, email, adresse, code_urgence, qr_code_token,
        created_at
      `)
      .eq('profile_id', profil.id)
      .single()

    if (dossierError || !dossier) {
      return c.html(pageErreur('Dossier introuvable', 'Votre dossier médical n\'est pas encore créé. Contactez votre médecin.'))
    }

    // Requêtes parallèles — toutes avec vérification d'erreur [QC-10]
    const [
      { data: consultations, error: consultErr },
      { data: ordonnances,   error: ordoErr   },
      { data: vaccinations,  error: vaccErr   },
      { data: rdvFuturs,     error: rdvErr    },
      { data: contacts,      error: contErr   }
    ] = await Promise.all([
      supabase
        .from('medical_consultations')
        .select('id, date_heure, motif, diagnostic_principal, created_at')
        .eq('patient_id', dossier.id)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('medical_ordonnances')
        .select('id, numero_ordonnance, date_emission, statut')
        .eq('patient_id', dossier.id)
        .eq('statut', 'active')
        .limit(5),
      supabase
        .from('spec_vaccinations')
        .select('id, vaccin_nom, date_administration, numero_dose')
        .eq('patient_id', dossier.id)
        .order('date_administration', { ascending: false })
        .limit(5),
      supabase
        .from('medical_rendez_vous')
        .select('id, date_heure, motif, statut')
        .eq('patient_id', dossier.id)
        .gte('date_heure', new Date().toISOString())
        .order('date_heure', { ascending: true })
        .limit(5),
      supabase
        .from('patient_contacts_urgence')
        // [DB-09] Sélectionner lien_parente (colonne réelle)
        .select('id, nom_complet, lien_parente, telephone')
        .eq('patient_id', dossier.id)
        .order('est_principal', { ascending: false })
    ])

    // Log des erreurs non bloquantes [QC-10]
    if (consultErr)  console.warn('[patient/dossier] consultations:', consultErr.message)
    if (ordoErr)     console.warn('[patient/dossier] ordonnances:',   ordoErr.message)
    if (vaccErr)     console.warn('[patient/dossier] vaccinations:',  vaccErr.message)
    if (rdvErr)      console.warn('[patient/dossier] rdv futurs:',    rdvErr.message)
    if (contErr)     console.warn('[patient/dossier] contacts:',      contErr.message)

    return c.html(pageDossierPatient(dossier, {
      consultations: consultations ?? [],
      ordonnances:   ordonnances   ?? [],
      vaccinations:  vaccinations  ?? [],
      rdvFuturs:     rdvFuturs     ?? [],
      contacts:      contacts      ?? []
    }))

  } catch (err) {
    console.error('[patient/dossier] Erreur:', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer dans quelques instants.'))
  }
})

// ── GET /patient/ordonnances ──────────────────────────────────────────────────
patientRoutes.get('/ordonnances', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const { data: dossier, error: dossierErr } = await supabase
      .from('patient_dossiers')
      .select('id, nom, prenom')
      .eq('profile_id', profil.id)
      .single()

    if (dossierErr || !dossier) {
      return c.html(pageErreur('Dossier introuvable', 'Votre dossier patient n\'existe pas encore.'))
    }

    const page    = parseInt(c.req.query('page') ?? '1')
    const perPage = 20
    const from    = (page - 1) * perPage
    const to      = from + perPage - 1

    const { data: ordonnances, error, count } = await supabase
      .from('medical_ordonnances')
      .select('id, numero_ordonnance, date_emission, date_expiration, statut, created_at', { count: 'exact' })
      .eq('patient_id', dossier.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('[patient/ordonnances]', error.message)
      return c.html(pageErreur('Erreur', 'Impossible de charger les ordonnances.'))
    }

    const totalPages = count ? Math.ceil(count / perPage) : 1

    return c.html(pageOrdonnances(dossier, ordonnances ?? [], page, totalPages, count ?? 0))

  } catch (err) {
    console.error('[patient/ordonnances]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── GET /patient/rdv ──────────────────────────────────────────────────────────
patientRoutes.get('/rdv', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const { data: dossier, error: dossierErr } = await supabase
      .from('patient_dossiers')
      .select('id')
      .eq('profile_id', profil.id)
      .single()

    if (dossierErr || !dossier) {
      return c.html(pageErreur('Dossier introuvable', 'Votre dossier n\'existe pas encore.'))
    }

    const now = new Date().toISOString()

    const [
      { data: rdvFuturs,  error: rdvFErr },
      { data: rdvPasses,  error: rdvPErr }
    ] = await Promise.all([
      supabase
        .from('medical_rendez_vous')
        .select('id, date_heure, motif, statut, notes')
        .eq('patient_id', dossier.id)
        .gte('date_heure', now)
        .order('date_heure', { ascending: true }),
      supabase
        .from('medical_rendez_vous')
        .select('id, date_heure, motif, statut')
        .eq('patient_id', dossier.id)
        .lt('date_heure', now)
        .order('date_heure', { ascending: false })
        .limit(10)
    ])

    if (rdvFErr) console.warn('[patient/rdv] futurs:', rdvFErr.message)
    if (rdvPErr) console.warn('[patient/rdv] passés:', rdvPErr.message)

    return c.html(pageRdv(rdvFuturs ?? [], rdvPasses ?? []))

  } catch (err) {
    console.error('[patient/rdv]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── GET /patient/examens ──────────────────────────────────────────────────────
patientRoutes.get('/examens', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const { data: dossier, error: dossierErr } = await supabase
      .from('patient_dossiers')
      .select('id')
      .eq('profile_id', profil.id)
      .single()

    if (dossierErr || !dossier) {
      return c.html(pageErreur('Dossier introuvable', 'Contactez votre médecin.'))
    }

    const { data: examens, error } = await supabase
      .from('medical_examens')
      // [DB-14] Colonnes réelles : est_urgent (BOOLEAN), resultat_texte
      .select('id, nom_examen, type_examen, statut, est_urgent, date_prescription, resultat_texte, created_at')
      .eq('patient_id', dossier.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[patient/examens]', error.message)
    }

    return c.html(pageExamens(examens ?? []))

  } catch (err) {
    console.error('[patient/examens]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── GET /patient/vaccinations ─────────────────────────────────────────────────
patientRoutes.get('/vaccinations', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const { data: dossier, error: dossierErr } = await supabase
      .from('patient_dossiers')
      .select('id, nom, prenom')
      .eq('profile_id', profil.id)
      .single()

    if (dossierErr || !dossier) {
      return c.html(pageErreur('Dossier introuvable', 'Contactez votre médecin.'))
    }

    const { data: vaccinations, error } = await supabase
      .from('spec_vaccinations')
      // [DB-15] colonnes réelles : numero_dose, prochaine_dose_date
      .select('id, vaccin_nom, date_administration, numero_dose, prochaine_dose_date, reactions_observees')
      .eq('patient_id', dossier.id)
      .order('date_administration', { ascending: false })

    if (error) console.error('[patient/vaccinations]', error.message)

    return c.html(pageVaccinations(dossier, vaccinations ?? []))

  } catch (err) {
    console.error('[patient/vaccinations]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── GET /patient/consentements ────────────────────────────────────────────────
patientRoutes.get('/consentements', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const { data: dossier, error: dossierErr } = await supabase
      .from('patient_dossiers')
      .select('id')
      .eq('profile_id', profil.id)
      .single()

    if (dossierErr || !dossier) {
      return c.html(pageErreur('Dossier introuvable', 'Contactez votre médecin.'))
    }

    const { data: consentements, error } = await supabase
      .from('patient_consentements_structure')
      .select('id, structure_id, accorde, date_debut, date_fin, notes, created_at')
      .eq('patient_id', dossier.id)
      .order('created_at', { ascending: false })

    if (error) console.error('[patient/consentements]', error.message)

    return c.html(pageConsentements(consentements ?? []))

  } catch (err) {
    console.error('[patient/consentements]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── GET /patient/notifications ────────────────────────────────────────────────
patientRoutes.get('/notifications', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, titre, message, type_notification, action_url, est_lue, created_at')
      .eq('destinataire_id', profil.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) console.error('[patient/notifications]', error.message)

    return c.html(pageNotifications(notifications ?? []))

  } catch (err) {
    console.error('[patient/notifications]', err)
    return c.html(pageErreur('Erreur serveur', 'Veuillez réessayer.'))
  }
})

// ── POST /patient/notifications/:id/lire ──────────────────────────────────────
patientRoutes.post('/notifications/:id/lire', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')
  const id       = c.req.param('id')

  const { error } = await supabase
    .from('notifications')
    .update({ est_lue: true, lue_at: new Date().toISOString() })
    .eq('id', id)
    .eq('destinataire_id', profil.id)

  if (error) {
    return c.json({ success: false, error: error.message }, 500)
  }

  return c.json({ success: true })
})

// ─── Pages HTML ───────────────────────────────────────────────────────────────

function layoutPatient(titre: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(titre)} | SantéBF Patient</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--primary:#6A1B9A;--primary-light:#9C27B0;--primary-bg:#F3E5F5;
      --rouge:#C62828;--vert:#1B5E20;--orange:#E65100;--bleu:#0D47A1;
      --text:#1a1a2e;--text2:#5A6A78;--border:#E0E0E0;--bg:#F7F8FA}
    body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
    header{background:var(--primary);padding:14px 20px;display:flex;align-items:center;gap:12px;color:white;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.2)}
    .logo{font-family:'DM Serif Display',serif;font-size:20px;letter-spacing:1px}
    .nav-links{display:flex;gap:8px;margin-left:auto;flex-wrap:wrap}
    .nav-links a{color:rgba(255,255,255,.9);text-decoration:none;padding:6px 12px;border-radius:6px;font-size:13px;font-weight:500;transition:.2s}
    .nav-links a:hover,.nav-links a.active{background:rgba(255,255,255,.2)}
    .nav-links .btn-logout{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3)}
    .main{max-width:1100px;margin:0 auto;padding:24px 16px}
    .page-title{font-family:'DM Serif Display',serif;font-size:26px;color:var(--primary);margin-bottom:6px}
    .page-subtitle{color:var(--text2);font-size:14px;margin-bottom:24px}
    .card{background:white;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:16px}
    .card-title{font-weight:700;font-size:16px;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:8px}
    .info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
    .info-item{background:#F7F8FA;padding:10px 14px;border-radius:8px}
    .info-label{font-size:11px;color:var(--text2);font-weight:600;text-transform:uppercase;margin-bottom:3px}
    .info-value{font-size:14px;font-weight:600;color:var(--text)}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600}
    .badge-vert{background:#E8F5E9;color:var(--vert)}
    .badge-rouge{background:#FFEBEE;color:var(--rouge)}
    .badge-orange{background:#FFF3E0;color:var(--orange)}
    .badge-bleu{background:#E3F2FD;color:var(--bleu)}
    .badge-gris{background:#F5F5F5;color:#757575}
    .list-item{padding:12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px}
    .list-item:last-child{border-bottom:none}
    .list-item-date{font-size:12px;color:var(--text2);min-width:90px}
    .list-item-title{font-weight:600;font-size:14px;flex:1}
    .list-item-meta{font-size:12px;color:var(--text2)}
    .urgence-box{background:#FFF9E0;border:2px dashed #F9A825;border-radius:12px;padding:16px;text-align:center;margin-top:16px}
    .btn{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;border:none;cursor:pointer;transition:.2s}
    .btn-primary{background:var(--primary);color:white}
    .btn-primary:hover{background:var(--primary-light)}
    .btn-sm{padding:6px 12px;font-size:12px}
    .empty-state{text-align:center;padding:32px 16px;color:var(--text2)}
    .empty-state .ico{font-size:40px;margin-bottom:8px}
    @media(max-width:600px){.info-grid{grid-template-columns:1fr 1fr}.nav-links{display:none}}
  </style>
</head>
<body>
<header>
  <div class="logo">🏥 SantéBF</div>
  <nav class="nav-links">
    <a href="/patient/dossier">Dossier</a>
    <a href="/patient/ordonnances">Ordonnances</a>
    <a href="/patient/rdv">Rendez-vous</a>
    <a href="/patient/examens">Examens</a>
    <a href="/patient/vaccinations">Vaccins</a>
    <a href="/patient/notifications">🔔</a>
    <a href="/auth/logout" class="btn-logout">Déconnexion</a>
  </nav>
</header>
<main class="main">
  <h1 class="page-title">${escapeHtml(titre)}</h1>
  ${content}
</main>
</body>
</html>`
}

function pageDossierPatient(
  dossier: any,
  data: { consultations: any[]; ordonnances: any[]; vaccinations: any[]; rdvFuturs: any[]; contacts: any[] }
): string {
  const allergiesArr = Array.isArray(dossier.allergies) ? dossier.allergies : 
    (typeof dossier.allergies === 'string' ? [dossier.allergies] : [])
  const maladiesArr  = Array.isArray(dossier.maladies_chroniques) ? dossier.maladies_chroniques :
    (typeof dossier.maladies_chroniques === 'string' ? [dossier.maladies_chroniques] : [])

  const content = `
    <p class="page-subtitle">Dossier N° <code>${escapeHtml(dossier.numero_national)}</code></p>
    
    <div class="card">
      <div class="card-title">👤 Informations personnelles</div>
      <div class="info-grid">
        <div class="info-item"><div class="info-label">Nom</div><div class="info-value">${escapeHtml(dossier.nom)}</div></div>
        <div class="info-item"><div class="info-label">Prénom</div><div class="info-value">${escapeHtml(dossier.prenom)}</div></div>
        <div class="info-item"><div class="info-label">Date de naissance</div><div class="info-value">${dossier.date_naissance ? new Date(dossier.date_naissance).toLocaleDateString('fr-BF') : '—'}</div></div>
        <div class="info-item"><div class="info-label">Sexe</div><div class="info-value">${escapeHtml(dossier.sexe) || '—'}</div></div>
        <div class="info-item"><div class="info-label">Groupe sanguin</div><div class="info-value" style="color:#C62828;font-size:16px">${escapeHtml(dossier.groupe_sanguin) || '—'} ${escapeHtml(dossier.rhesus) || ''}</div></div>
        <div class="info-item"><div class="info-label">Téléphone</div><div class="info-value">${escapeHtml(dossier.telephone) || '—'}</div></div>
      </div>
      ${allergiesArr.length ? `<div style="margin-top:12px;padding:10px;background:#FFEBEE;border-radius:8px;color:#C62828"><strong>⚠️ Allergies :</strong> ${allergiesArr.map(a => escapeHtml(String(a))).join(', ')}</div>` : ''}
      ${maladiesArr.length ? `<div style="margin-top:8px;padding:10px;background:#FFF3E0;border-radius:8px;color:#E65100"><strong>🏥 Maladies chroniques :</strong> ${maladiesArr.map(m => escapeHtml(String(m))).join(', ')}</div>` : ''}
    </div>

    ${data.rdvFuturs.length ? `
    <div class="card">
      <div class="card-title">📅 Prochains rendez-vous</div>
      ${data.rdvFuturs.map(rdv => `
        <div class="list-item">
          <div class="list-item-date">${new Date(rdv.date_heure).toLocaleDateString('fr-BF')}</div>
          <div class="list-item-title">${escapeHtml(rdv.motif)}</div>
          <span class="badge ${rdv.statut === 'confirme' ? 'badge-vert' : 'badge-orange'}">${escapeHtml(rdv.statut) || 'programmé'}</span>
        </div>
      `).join('')}
    </div>` : ''}

    <div class="card">
      <div class="card-title">🩺 Dernières consultations</div>
      ${data.consultations.length ? data.consultations.map(c => `
        <div class="list-item">
          <div class="list-item-date">${new Date(c.date_heure || c.created_at).toLocaleDateString('fr-BF')}</div>
          <div style="flex:1">
            <div class="list-item-title">${escapeHtml(c.motif)}</div>
            ${c.diagnostic_principal ? `<div class="list-item-meta">Diagnostic : ${escapeHtml(c.diagnostic_principal)}</div>` : ''}
          </div>
        </div>
      `).join('') : '<div class="empty-state"><div class="ico">📋</div><p>Aucune consultation</p></div>'}
    </div>

    <div class="card">
      <div class="card-title">💊 Ordonnances actives</div>
      ${data.ordonnances.length ? data.ordonnances.map(o => `
        <div class="list-item">
          <div class="list-item-date">${o.date_emission ? new Date(o.date_emission).toLocaleDateString('fr-BF') : '—'}</div>
          <div class="list-item-title">N° ${escapeHtml(o.numero_ordonnance)}</div>
          <a href="/patient/ordonnances/${o.id}/pdf" class="btn btn-sm btn-primary">📄 PDF</a>
        </div>
      `).join('') : '<div class="empty-state"><div class="ico">💊</div><p>Aucune ordonnance active</p></div>'}
    </div>

    <div class="card">
      <div class="card-title">💉 Dernières vaccinations</div>
      ${data.vaccinations.length ? data.vaccinations.map(v => `
        <div class="list-item">
          <div class="list-item-date">${new Date(v.date_administration).toLocaleDateString('fr-BF')}</div>
          <div class="list-item-title">${escapeHtml(v.vaccin_nom)}</div>
          <span class="badge badge-bleu">Dose ${v.numero_dose}</span>
        </div>
      `).join('') : '<div class="empty-state"><div class="ico">💉</div><p>Aucune vaccination enregistrée</p></div>'}
      <div style="text-align:right;margin-top:8px">
        <a href="/patient/vaccinations" class="btn btn-sm btn-primary">Voir tout →</a>
      </div>
    </div>

    ${data.contacts.length ? `
    <div class="card">
      <div class="card-title">📞 Contacts d'urgence</div>
      ${data.contacts.map(ct => `
        <div class="list-item">
          <div style="flex:1">
            <div class="list-item-title">${escapeHtml(ct.nom_complet)}</div>
            <!-- [DB-09] lien_parente est la colonne réelle -->
            <div class="list-item-meta">${escapeHtml(ct.lien_parente || ct.lien || '—')} · ${escapeHtml(ct.telephone)}</div>
          </div>
        </div>
      `).join('')}
    </div>` : ''}

    ${dossier.code_urgence ? `
    <div class="urgence-box">
      <div style="font-size:13px;font-weight:600;color:#F57F17;margin-bottom:8px">🆘 Code d'accès urgence</div>
      <div style="font-family:monospace;font-size:32px;font-weight:900;letter-spacing:10px;color:#C62828">${escapeHtml(dossier.code_urgence)}</div>
      <div style="font-size:11px;color:#795548;margin-top:6px">Ce code permet aux médecins d'urgence d'accéder à vos informations vitales</div>
    </div>` : ''}
  `
  return layoutPatient(`Dossier de ${dossier.prenom} ${dossier.nom}`, content)
}

function pageOrdonnances(dossier: any, ordonnances: any[], page: number, totalPages: number, total: number): string {
  const content = `
    <p class="page-subtitle">${total} ordonnance(s) au total</p>
    <div class="card">
      ${ordonnances.length ? ordonnances.map(o => `
        <div class="list-item">
          <div class="list-item-date">${o.date_emission ? new Date(o.date_emission).toLocaleDateString('fr-BF') : '—'}</div>
          <div style="flex:1">
            <div class="list-item-title">N° ${escapeHtml(o.numero_ordonnance)}</div>
            <div class="list-item-meta">Expiration : ${o.date_expiration ? new Date(o.date_expiration).toLocaleDateString('fr-BF') : '—'}</div>
          </div>
          <span class="badge ${o.statut === 'active' ? 'badge-vert' : o.statut === 'expiree' ? 'badge-rouge' : 'badge-gris'}">${escapeHtml(o.statut) || '—'}</span>
          <a href="/patient/ordonnances/${o.id}/pdf" class="btn btn-sm btn-primary" style="margin-left:8px">📄 PDF</a>
        </div>
      `).join('') : '<div class="empty-state"><div class="ico">💊</div><p>Aucune ordonnance</p></div>'}
    </div>
    ${totalPages > 1 ? `
    <div style="display:flex;gap:8px;justify-content:center;margin-top:16px">
      ${page > 1 ? `<a href="/patient/ordonnances?page=${page-1}" class="btn btn-sm btn-primary">← Précédent</a>` : ''}
      <span style="padding:6px 12px;font-size:13px;color:var(--text2)">Page ${page}/${totalPages}</span>
      ${page < totalPages ? `<a href="/patient/ordonnances?page=${page+1}" class="btn btn-sm btn-primary">Suivant →</a>` : ''}
    </div>` : ''}
  `
  return layoutPatient('Mes ordonnances', content)
}

function pageRdv(futurs: any[], passes: any[]): string {
  const content = `
    <div class="card">
      <div class="card-title">📅 Prochains rendez-vous</div>
      ${futurs.length ? futurs.map(r => `
        <div class="list-item">
          <div class="list-item-date">${new Date(r.date_heure).toLocaleDateString('fr-BF')}</div>
          <div style="flex:1">
            <div class="list-item-title">${escapeHtml(r.motif)}</div>
            ${r.notes ? `<div class="list-item-meta">${escapeHtml(r.notes)}</div>` : ''}
          </div>
          <span class="badge ${r.statut === 'confirme' ? 'badge-vert' : r.statut === 'annule' ? 'badge-rouge' : 'badge-orange'}">${escapeHtml(r.statut) || 'programmé'}</span>
        </div>
      `).join('') : '<div class="empty-state"><div class="ico">📅</div><p>Aucun rendez-vous à venir</p></div>'}
    </div>
    ${passes.length ? `
    <div class="card">
      <div class="card-title">🕐 Rendez-vous passés</div>
      ${passes.map(r => `
        <div class="list-item">
          <div class="list-item-date">${new Date(r.date_heure).toLocaleDateString('fr-BF')}</div>
          <div class="list-item-title">${escapeHtml(r.motif)}</div>
          <span class="badge badge-gris">${escapeHtml(r.statut) || '—'}</span>
        </div>
      `).join('')}
    </div>` : ''}
  `
  return layoutPatient('Mes rendez-vous', content)
}

function pageExamens(examens: any[]): string {
  const content = `
    <div class="card">
      ${examens.length ? examens.map(ex => `
        <div class="list-item">
          <div class="list-item-date">${ex.date_prescription ? new Date(ex.date_prescription).toLocaleDateString('fr-BF') : '—'}</div>
          <div style="flex:1">
            <div class="list-item-title">${escapeHtml(ex.nom_examen)}</div>
            <div class="list-item-meta">${escapeHtml(ex.type_examen)}</div>
            <!-- [DB-14] resultat_texte est la colonne réelle (pas conclusion) -->
            ${ex.resultat_texte ? `<div style="font-size:12px;margin-top:4px;color:var(--text2)">${escapeHtml(ex.resultat_texte).substring(0, 100)}...</div>` : ''}
          </div>
          ${ex.est_urgent ? '<span class="badge badge-rouge">🚨 Urgent</span>' : ''}
          <span class="badge ${
            ex.statut === 'valide' ? 'badge-vert' :
            ex.statut === 'en_cours' ? 'badge-orange' : 'badge-gris'
          }">${escapeHtml(ex.statut) || '—'}</span>
        </div>
      `).join('') : '<div class="empty-state"><div class="ico">🔬</div><p>Aucun examen</p></div>'}
    </div>
  `
  return layoutPatient('Mes examens', content)
}

function pageVaccinations(dossier: any, vaccinations: any[]): string {
  const content = `
    <p class="page-subtitle">Carnet de vaccination de ${escapeHtml(dossier.prenom)} ${escapeHtml(dossier.nom)}</p>
    <div class="card">
      ${vaccinations.length ? vaccinations.map(v => `
        <div class="list-item">
          <div class="list-item-date">${new Date(v.date_administration).toLocaleDateString('fr-BF')}</div>
          <div style="flex:1">
            <div class="list-item-title">${escapeHtml(v.vaccin_nom)}</div>
            <!-- [DB-15] numero_dose et prochaine_dose_date sont les colonnes réelles -->
            ${v.prochaine_dose_date ? `<div class="list-item-meta">Prochaine dose : ${new Date(v.prochaine_dose_date).toLocaleDateString('fr-BF')}</div>` : ''}
            ${v.reactions_observees ? `<div class="list-item-meta">⚠️ ${escapeHtml(v.reactions_observees)}</div>` : ''}
          </div>
          <span class="badge badge-bleu">Dose ${v.numero_dose}</span>
        </div>
      `).join('') : '<div class="empty-state"><div class="ico">💉</div><p>Aucune vaccination enregistrée</p></div>'}
    </div>
  `
  return layoutPatient('Mon carnet de vaccination', content)
}

function pageConsentements(consentements: any[]): string {
  const content = `
    <div class="card">
      <p style="color:var(--text2);font-size:14px;margin-bottom:16px">
        Gérez ici les autorisations d'accès à votre dossier médical par les structures de santé.
      </p>
      ${consentements.length ? consentements.map(ct => `
        <div class="list-item">
          <div style="flex:1">
            <div class="list-item-title">Structure ${escapeHtml(ct.structure_id?.substring(0, 8))}...</div>
            <div class="list-item-meta">Du ${ct.date_debut ? new Date(ct.date_debut).toLocaleDateString('fr-BF') : '—'} au ${ct.date_fin ? new Date(ct.date_fin).toLocaleDateString('fr-BF') : 'indéfini'}</div>
          </div>
          <span class="badge ${ct.accorde ? 'badge-vert' : 'badge-rouge'}">${ct.accorde ? '✅ Accordé' : '❌ Refusé'}</span>
        </div>
      `).join('') : '<div class="empty-state"><div class="ico">📋</div><p>Aucun consentement enregistré</p></div>'}
    </div>
  `
  return layoutPatient('Mes consentements', content)
}

function pageNotifications(notifications: any[]): string {
  const content = `
    <div class="card">
      ${notifications.length ? notifications.map(n => `
        <div class="list-item" style="${!n.est_lue ? 'background:#F3E5F5;border-left:3px solid #9C27B0;' : ''}">
          <div style="flex:1">
            <div class="list-item-title">${escapeHtml(n.titre)}</div>
            ${n.message ? `<div class="list-item-meta">${escapeHtml(n.message)}</div>` : ''}
          </div>
          <div class="list-item-date">${new Date(n.created_at).toLocaleDateString('fr-BF')}</div>
          ${!n.est_lue ? `
            <button onclick="fetch('/patient/notifications/${n.id}/lire',{method:'POST'}).then(()=>this.closest('.list-item').style.background='')"
              style="background:none;border:none;cursor:pointer;font-size:16px" title="Marquer comme lu">✓</button>
          ` : ''}
        </div>
      `).join('') : '<div class="empty-state"><div class="ico">🔔</div><p>Aucune notification</p></div>'}
    </div>
  `
  return layoutPatient('Mes notifications', content)
}

function pageErreur(titre: string, message: string): string {
  return layoutPatient(titre, `
    <div class="card" style="text-align:center;padding:40px">
      <div style="font-size:48px;margin-bottom:16px">⚠️</div>
      <p style="color:var(--text2)">${escapeHtml(message)}</p>
      <a href="/patient/dossier" class="btn btn-primary" style="margin-top:16px">← Retour au dossier</a>
    </div>
  `)
}