/**
 * src/utils/notifications.ts
 * SantéBF — Notifications automatiques par email (Resend)
 *
 * Corrections vs version originale :
 *   1. Table 'rdv_appointments'   → 'medical_rendez_vous'  (vraie table DB)
 *   2. Colonne 'rdv.date_rdv'     → 'date_heure'           (vraie colonne)
 *   3. patient.email              → via auth_profiles (email pas dans patient_dossiers)
 *   4. Table 'user_settings'      → SUPPRIMÉE (n'existe pas en DB)
 *      Remplacée par : auth_profiles.email_notifications (à ajouter via ALTER TABLE)
 *   5. sendEmail() signature unifiée avec medecin.ts (fetch natif Workers)
 *   6. examen.type_examen label  → examen.nom_examen (vraie colonne)
 *   7. Types SupabaseClient remplacés par ReturnType<typeof getSupabase>
 *
 * Note sur les préférences de notifications :
 *   La table user_settings n'existe pas dans le schéma DB documenté.
 *   Solution : ajouter une colonne email_notifications BOOLEAN à auth_profiles.
 *   SQL : ALTER TABLE auth_profiles ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE;
 *   Par défaut, toutes les notifications sont envoyées si l'email est renseigné.
 */

// import supprimé (supabase-type-helper non nécessaire)

// ─── sendEmail — fetch natif Workers (pas de SDK Node) ────

interface EmailOpts {
  resendKey: string
  to:        string
  subject:   string
  html:      string
}

async function sendEmail(opts: EmailOpts): Promise<boolean> {
  if (!opts.to || !opts.resendKey) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${opts.resendKey}`,
      },
      body: JSON.stringify({
        from:    'Sant\u00e9BF <noreply@santebf.izicardouaga.com>',
        to:      [opts.to],
        subject: opts.subject,
        html:    opts.html,
      }),
    })
    return res.ok
  } catch (e) {
    console.error('sendEmail error:', e)
    return false
  }
}

// ── Envoi email via Brevo (Sendinblue) ────────────────────────────────────
// Alternative à Resend — mêmes fonctionnalités, plan gratuit différent
// Pour activer Brevo : ajouter BREVO_API_KEY dans Cloudflare Variables
// Le code utilise automatiquement Brevo si RESEND_API_KEY est absent

interface BrevoEmailOpts {
  brevoKey: string
  to:       string
  subject:  string
  html:     string
}

async function sendEmailBrevo(opts: BrevoEmailOpts): Promise<boolean> {
  if (!opts.to || !opts.brevoKey) return false
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: {
        'accept':       'application/json',
        'api-key':      opts.brevoKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender:  { name: 'Sant\u00e9BF', email: 'noreply@santebf.izicardouaga.com' },
        to:      [{ email: opts.to }],
        subject: opts.subject,
        htmlContent: opts.html,
      }),
    })
    return res.ok
  } catch (e) {
    console.error('sendEmailBrevo error:', e)
    return false
  }
}

// ── Dispatcher email intelligent ──────────────────────────────────────────
// Utilise Resend si RESEND_API_KEY disponible, sinon Brevo
// Tu n'as qu'à mettre la clé de ton choix dans Cloudflare Variables

export async function envoyerEmail(
  to:      string,
  subject: string,
  html:    string,
  env:     { RESEND_API_KEY?: string; BREVO_API_KEY?: string }
): Promise<boolean> {
  if (env.RESEND_API_KEY) {
    return sendEmail({ resendKey: env.RESEND_API_KEY, to, subject, html })
  }
  if (env.BREVO_API_KEY) {
    return sendEmailBrevo({ brevoKey: env.BREVO_API_KEY, to, subject, html })
  }
  console.warn('Aucune clé email configurée (RESEND_API_KEY ou BREVO_API_KEY)')
  return false
}

// ─── Template email HTML commun ───────────────────────────

function emailWrapper(opts: {
  headerColor: string
  headerTitle: string
  body:        string
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5}
  .wrap{max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .hd{background:${opts.headerColor};color:white;padding:22px 28px}
  .hd h2{margin:0;font-size:18px}
  .bd{padding:28px}
  .info-card{background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid ${opts.headerColor}}
  .info-row{margin:6px 0}
  .lbl{font-weight:600;color:#555}
  .ft{text-align:center;color:#9E9E9E;font-size:11px;padding:16px;border-top:1px solid #eee}
</style>
</head>
<body>
<div class="wrap">
  <div class="hd"><h2>${opts.headerTitle}</h2></div>
  <div class="bd">${opts.body}</div>
  <div class="ft">Cet email est automatique. Ne pas r\u00e9pondre.<br>Sant\u00e9BF — Syst\u00e8me National de Sant\u00e9 Num\u00e9rique</div>
</div>
</body>
</html>`
}

// ─── Récupérer email d'un patient via auth_profiles ───────

async function getPatientEmail(
  sb: any,
  patientId: string
): Promise<string | null> {
  // patient_dossiers.profile_id → auth_profiles.email
  const { data } = await sb
    .from('patient_dossiers')
    .select('profile_id')
    .eq('id', patientId)
    .single()

  if (!data?.profile_id) return null

  const { data: prof } = await sb
    .from('auth_profiles')
    .select('email, email_notifications')
    .eq('id', data.profile_id)
    .single()

  if (!prof?.email) return null
  // Respecter préférence notifications (colonne optionnelle, true par défaut)
  if (prof.email_notifications === false) return null

  return prof.email
}

// ═══════════════════════════════════════════════════════════
// Rappel RDV (J-1)
// Déclencher manuellement ou via Supabase Edge Function cron
// ═══════════════════════════════════════════════════════════

export async function envoyerRappelRDV(
  sb: any,
  rdvId:       string,
  resendKey:   string
): Promise<boolean> {
  try {
    // ⚠️ Vraie table : medical_rendez_vous (pas rdv_appointments)
    const { data: rdv, error } = await sb
      .from('medical_rendez_vous')
      .select(`
        id,
        date_heure,
        motif,
        duree_minutes,
        patient_id,
        medecin:auth_profiles!medical_rendez_vous_medecin_id_fkey (nom, prenom, specialite_principale),
        structure:struct_structures (nom, adresse, telephone)
      `)
      .eq('id', rdvId)
      .single()

    if (error || !rdv) return false

    const email = await getPatientEmail(sb, rdv.patient_id)
    if (!email) return false

    // Récupérer nom patient
    const { data: pt } = await sb
      .from('patient_dossiers')
      .select('nom, prenom')
      .eq('id', rdv.patient_id)
      .single()

    // ⚠️ Vraie colonne : date_heure (pas date_rdv)
    const dt     = new Date(rdv.date_heure)
    const dateFr = dt.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const heureFr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    const body = `
      <p>Bonjour <strong>${pt?.prenom ?? ''} ${pt?.nom ?? ''}</strong>,</p>
      <p>Rappel : vous avez un rendez-vous m\u00e9dical <strong>demain</strong> :</p>
      <div class="info-card">
        <div class="info-row"><span class="lbl">&#x1F4C5; Date :</span> ${dateFr}</div>
        <div class="info-row"><span class="lbl">&#x1F550; Heure :</span> ${heureFr}</div>
        <div class="info-row"><span class="lbl">&#x1F9D1;&#x200D;&#x2695;&#xFE0F; M\u00e9decin :</span> Dr ${rdv.medecin?.nom ?? ''} ${rdv.medecin?.prenom ?? ''}${rdv.medecin?.specialite_principale ? ' (' + rdv.medecin.specialite_principale + ')' : ''}</div>
        <div class="info-row"><span class="lbl">&#x1F3E5; Lieu :</span> ${rdv.structure?.nom ?? ''}</div>
        ${rdv.structure?.adresse  ? `<div class="info-row"><span class="lbl">&#x1F4CD; Adresse :</span> ${rdv.structure.adresse}</div>` : ''}
        ${rdv.motif               ? `<div class="info-row"><span class="lbl">&#x1F4AC; Motif :</span> ${rdv.motif}</div>` : ''}
        ${rdv.structure?.telephone ? `<div class="info-row"><span class="lbl">&#x1F4DE; Contact :</span> ${rdv.structure.telephone}</div>` : ''}
      </div>
      <p><strong>&#x26A0;&#xFE0F; Conseils :</strong></p>
      <ul>
        <li>Arrivez 10 minutes \u00e0 l&#x27;avance</li>
        <li>Apportez votre pi\u00e8ce d&#x27;identit\u00e9</li>
        <li>En cas d&#x27;emp\u00eachement, pr\u00e9venez au plus t\u00f4t</li>
      </ul>`

    return await sendEmail({
      resendKey,
      to:      email,
      subject: `&#x1F514; Rappel RDV demain \u00e0 ${heureFr} — ${rdv.structure?.nom ?? 'SantéBF'}`,
      html:    emailWrapper({ headerColor: '#4A148C', headerTitle: '&#x1F514; Rappel de rendez-vous', body }),
    })

  } catch (e) {
    console.error('envoyerRappelRDV:', e)
    return false
  }
}

// ═══════════════════════════════════════════════════════════
// Résultat examen disponible
// ═══════════════════════════════════════════════════════════

export async function envoyerNotificationResultatExamen(
  sb:        any,
  examenId:  string,
  resendKey: string
): Promise<boolean> {
  try {
    // ⚠️ Une seule table : medical_examens (pas de table séparée imagerie)
    const { data: exam, error } = await sb
      .from('medical_examens')
      .select(`
        id,
        nom_examen,
        type_examen,
        patient_id,
        created_at,
        structure:struct_structures (nom)
      `)
      .eq('id', examenId)
      .single()

    if (error || !exam) return false

    const email = await getPatientEmail(sb, exam.patient_id)
    if (!email) return false

    const { data: pt } = await sb
      .from('patient_dossiers')
      .select('nom, prenom')
      .eq('id', exam.patient_id)
      .single()

    // ⚠️ Vraie colonne : nom_examen (pas type_examen comme label)
    const labelExamen = exam.nom_examen || exam.type_examen || 'examen m\u00e9dical'

    const body = `
      <p>Bonjour <strong>${pt?.prenom ?? ''} ${pt?.nom ?? ''}</strong>,</p>
      <p>Les r\u00e9sultats de votre examen sont maintenant disponibles.</p>
      <div class="info-card">
        <div class="info-row"><span class="lbl">&#x1F9EA; Examen :</span> ${labelExamen}</div>
        <div class="info-row"><span class="lbl">&#x1F3E5; Structure :</span> ${exam.structure?.nom ?? ''}</div>
        <div class="info-row"><span class="lbl">&#x1F4C5; Date :</span> ${new Date(exam.created_at).toLocaleDateString('fr-FR')}</div>
      </div>
      <p>Connectez-vous \u00e0 votre espace patient pour consulter vos r\u00e9sultats.</p>
      <p style="margin-top:16px">&#x26A0;&#xFE0F; Si vous avez des questions, contactez votre m\u00e9decin.</p>`

    return await sendEmail({
      resendKey,
      to:      email,
      subject: `&#x2705; R\u00e9sultats disponibles : ${labelExamen}`,
      html:    emailWrapper({ headerColor: '#1A6B3C', headerTitle: '&#x2705; R\u00e9sultats d&#x27;examen disponibles', body }),
    })

  } catch (e) {
    console.error('envoyerNotificationResultatExamen:', e)
    return false
  }
}

// ═══════════════════════════════════════════════════════════
// Nouvelle ordonnance créée
// ═══════════════════════════════════════════════════════════

export async function envoyerNotificationOrdonnance(
  sb:           any,
  ordonnanceId: string,
  resendKey:    string
): Promise<boolean> {
  try {
    const { data: ord, error } = await sb
      .from('medical_ordonnances')
      .select(`
        id,
        numero_ordonnance,
        created_at,
        date_expiration,
        qr_code_verification,
        patient_id,
        medecin:auth_profiles!medical_ordonnances_medecin_id_fkey (nom, prenom),
        structure:struct_structures (nom, telephone)
      `)
      .eq('id', ordonnanceId)
      .single()

    if (error || !ord) return false

    const email = await getPatientEmail(sb, ord.patient_id)
    if (!email) return false

    const { data: pt } = await sb
      .from('patient_dossiers')
      .select('nom, prenom')
      .eq('id', ord.patient_id)
      .single()

    const qrUrl = ord.qr_code_verification
      ? `https://santebf.izicardouaga.com/public/ordonnance/${ord.qr_code_verification}`
      : null

    const body = `
      <p>Bonjour <strong>${pt?.prenom ?? ''} ${pt?.nom ?? ''}</strong>,</p>
      <p>Dr. ${ord.medecin?.nom ?? ''} ${ord.medecin?.prenom ?? ''} vous a prescrit une nouvelle ordonnance.</p>
      <div class="info-card">
        <div class="info-row"><span class="lbl">&#x1F4C4; N\u00b0 ordonnance :</span> <strong>${ord.numero_ordonnance}</strong></div>
        <div class="info-row"><span class="lbl">&#x1F9D1;&#x200D;&#x2695;&#xFE0F; M\u00e9decin :</span> Dr ${ord.medecin?.nom ?? ''} ${ord.medecin?.prenom ?? ''}</div>
        <div class="info-row"><span class="lbl">&#x1F3E5; Structure :</span> ${ord.structure?.nom ?? ''}</div>
        <div class="info-row"><span class="lbl">&#x1F4C5; Date :</span> ${new Date(ord.created_at).toLocaleDateString('fr-FR')}</div>
        ${ord.date_expiration ? `<div class="info-row"><span class="lbl">&#x23F0; Expire le :</span> ${new Date(ord.date_expiration).toLocaleDateString('fr-FR')}</div>` : ''}
        ${qrUrl ? `<div class="info-row" style="margin-top:8px"><span class="lbl">&#x1F517; V\u00e9rification :</span> <a href="${qrUrl}" style="color:#4A148C">${qrUrl}</a></div>` : ''}
      </div>
      <p><strong>&#x1F4A1; Conseils :</strong></p>
      <ul>
        <li>Pr\u00e9sentez cette ordonnance \u00e0 la pharmacie</li>
        <li>Respectez les doses et dur\u00e9es prescrits</li>
        <li>En cas d&#x27;effets ind\u00e9sirables, contactez votre m\u00e9decin</li>
      </ul>
      ${ord.structure?.telephone ? `<p>&#x1F4DE; Contact structure : ${ord.structure.telephone}</p>` : ''}`

    return await sendEmail({
      resendKey,
      to:      email,
      subject: `&#x1F48A; Nouvelle ordonnance ${ord.numero_ordonnance} — ${ord.structure?.nom ?? 'SantéBF'}`,
      html:    emailWrapper({ headerColor: '#4A148C', headerTitle: '&#x1F48A; Nouvelle ordonnance disponible', body }),
    })

  } catch (e) {
    console.error('envoyerNotificationOrdonnance:', e)
    return false
  }
}

// ═══════════════════════════════════════════════════════════
// Confirmation de nouveau RDV
// ═══════════════════════════════════════════════════════════

export async function envoyerConfirmationRDV(
  sb:        any,
  rdvId:     string,
  resendKey: string
): Promise<boolean> {
  try {
    const { data: rdv } = await sb
      .from('medical_rendez_vous')
      .select(`
        id, date_heure, motif, duree_minutes, patient_id,
        medecin:auth_profiles!medical_rendez_vous_medecin_id_fkey (nom, prenom, specialite_principale),
        structure:struct_structures (nom, adresse, telephone)
      `)
      .eq('id', rdvId)
      .single()

    if (!rdv) return false

    const email = await getPatientEmail(sb, rdv.patient_id)
    if (!email) return false

    const { data: pt } = await sb
      .from('patient_dossiers')
      .select('nom, prenom')
      .eq('id', rdv.patient_id)
      .single()

    const dt      = new Date(rdv.date_heure)
    const dateFr  = dt.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const heureFr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    const body = `
      <p>Bonjour <strong>${pt?.prenom ?? ''} ${pt?.nom ?? ''}</strong>,</p>
      <p>Votre rendez-vous a bien \u00e9t\u00e9 enregistr\u00e9 :</p>
      <div class="info-card">
        <div class="info-row"><span class="lbl">&#x1F4C5; Date :</span> ${dateFr}</div>
        <div class="info-row"><span class="lbl">&#x1F550; Heure :</span> ${heureFr}</div>
        <div class="info-row"><span class="lbl">&#x23F1; Dur\u00e9e :</span> ${rdv.duree_minutes ?? 30} min</div>
        <div class="info-row"><span class="lbl">&#x1F9D1;&#x200D;&#x2695;&#xFE0F; M\u00e9decin :</span> Dr ${rdv.medecin?.nom ?? ''} ${rdv.medecin?.prenom ?? ''}</div>
        <div class="info-row"><span class="lbl">&#x1F3E5; Lieu :</span> ${rdv.structure?.nom ?? ''}</div>
        ${rdv.structure?.adresse   ? `<div class="info-row"><span class="lbl">&#x1F4CD; Adresse :</span> ${rdv.structure.adresse}</div>` : ''}
        ${rdv.motif                 ? `<div class="info-row"><span class="lbl">&#x1F4AC; Motif :</span> ${rdv.motif}</div>` : ''}
        ${rdv.structure?.telephone  ? `<div class="info-row"><span class="lbl">&#x1F4DE; Contact :</span> ${rdv.structure.telephone}</div>` : ''}
      </div>
      <p>Un rappel vous sera envoy\u00e9 la veille du rendez-vous.</p>`

    return await sendEmail({
      resendKey,
      to:      email,
      subject: `&#x1F4C5; RDV confirm\u00e9 — ${dateFr} \u00e0 ${heureFr}`,
      html:    emailWrapper({ headerColor: '#4A148C', headerTitle: '&#x1F4C5; Rendez-vous confirm\u00e9', body }),
    })

  } catch (e) {
    console.error('envoyerConfirmationRDV:', e)
    return false
  }
}

// ═══════════════════════════════════════════════════════════
// Dispatcher central
// ═══════════════════════════════════════════════════════════

export async function declencherNotification(
  type:      'rdv_rappel' | 'rdv_confirmation' | 'resultat_examen' | 'ordonnance',
  sb:        any,
  id:        string,
  resendKey: string
): Promise<boolean> {
  switch (type) {
    case 'rdv_rappel':
      return envoyerRappelRDV(sb, id, resendKey)
    case 'rdv_confirmation':
      return envoyerConfirmationRDV(sb, id, resendKey)
    case 'resultat_examen':
      return envoyerNotificationResultatExamen(sb, id, resendKey)
    case 'ordonnance':
      return envoyerNotificationOrdonnance(sb, id, resendKey)
    default:
      return false
  }
}

/*
 * ═══════════════════════════════════════════════════════════
 * SQL À EXÉCUTER dans Supabase → SQL Editor
 * (préférences notifications — colonne optionnelle)
 * ═══════════════════════════════════════════════════════════
 *
 * -- Ajouter colonne préférences email dans auth_profiles
 * ALTER TABLE auth_profiles
 *   ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE;
 *
 * -- Index pour les requêtes de rappel cron
 * CREATE INDEX IF NOT EXISTS idx_rdv_rappel
 *   ON medical_rendez_vous (date_heure, statut, rappel_envoye)
 *   WHERE statut IN ('planifie', 'confirme') AND rappel_envoye = FALSE;
 * ═══════════════════════════════════════════════════════════
 *
 * USAGE DEPUIS medecin.ts (exemple) :
 *
 * import { envoyerNotificationOrdonnance, envoyerConfirmationRDV } from '../utils/notifications'
 *
 * // Après création ordonnance :
 * if (c.env.RESEND_API_KEY) {
 *   await envoyerNotificationOrdonnance(sb, ordonnance.id, c.env.RESEND_API_KEY)
 * }
 *
 * // Après création RDV :
 * if (c.env.RESEND_API_KEY) {
 *   await envoyerConfirmationRDV(sb, rdvId, c.env.RESEND_API_KEY)
 * }
 *
 * CRON RAPPELS J-1 (Supabase Edge Function ou Cloudflare Cron Trigger) :
 *
 * // Récupérer RDV de demain non rappelés :
 * const demain = new Date(); demain.setDate(demain.getDate() + 1)
 * const debut  = demain.toISOString().split('T')[0] + 'T00:00:00'
 * const fin    = demain.toISOString().split('T')[0] + 'T23:59:59'
 * const { data: rdvs } = await sb.from('medical_rendez_vous')
 *   .select('id').gte('date_heure', debut).lte('date_heure', fin)
 *   .eq('rappel_envoye', false).in('statut', ['planifie', 'confirme'])
 * for (const rdv of rdvs ?? []) {
 *   const ok = await envoyerRappelRDV(sb, rdv.id, RESEND_API_KEY)
 *   if (ok) await sb.from('medical_rendez_vous').update({ rappel_envoye: true }).eq('id', rdv.id)
 * }
 * ═══════════════════════════════════════════════════════════
 */


// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS PUSH — Firebase Cloud Messaging (FCM v1 API)
// ═══════════════════════════════════════════════════════════
//
// Utilise le Service Account Firebase (nouvelles API FCM v1)
// Plus besoin de FCM_SERVER_KEY — utiliser ces 3 variables Cloudflare :
//   FCM_PROJECT_ID   = sante-bf-64d92
//   FCM_CLIENT_EMAIL = firebase-adminsdk-fbsvc@sante-bf-64d92.iam.gserviceaccount.com
//   FCM_PRIVATE_KEY  = (clé privée du service account — voir guide)
//
// FCM v1 est l'API recommandée par Google depuis 2024.
// L'ancienne "Legacy API" avec FCM_SERVER_KEY est dépréciée.
// ═══════════════════════════════════════════════════════════

// ── Signer un JWT avec SubtleCrypto (natif Cloudflare Workers) ──────────
// Cloudflare Workers ne supporte pas firebase-admin SDK
// On signe le JWT manuellement avec l'API WebCrypto

async function signJWT(
  clientEmail: string,
  privateKeyPem: string,
  scopes: string[]
): Promise<string> {
  const now        = Math.floor(Date.now() / 1000)
  const expiry     = now + 3600

  const header  = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss:   clientEmail,
    sub:   clientEmail,
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   expiry,
    scope: scopes.join(' '),
  }

  const b64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const headerB64  = b64url(header)
  const payloadB64 = b64url(payload)
  const signingInput = `${headerB64}.${payloadB64}`

  // Importer la clé privée PEM
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '')
    .replace(/\\n/g, '')
    .trim()

  const binaryKey = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  return `${signingInput}.${sigB64}`
}

// ── Obtenir un Access Token OAuth2 Google ────────────────────────────────
async function getGoogleAccessToken(
  clientEmail: string,
  privateKey: string
): Promise<string> {
  const jwt = await signJWT(clientEmail, privateKey, [
    'https://www.googleapis.com/auth/firebase.messaging'
  ])

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  })

  const data = await res.json() as any
  if (!data.access_token) {
    throw new Error('FCM token error: ' + JSON.stringify(data))
  }
  return data.access_token
}

// ── Envoyer une notification push via FCM v1 ─────────────────────────────
// opts.env doit contenir: FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY
//
// Exemple d'appel depuis une route :
//   if (c.env.FCM_PROJECT_ID && token) {
//     await envoyerNotifPush(token, 'Titre', 'Corps', '/patient/dossier', c.env)
//   }

export async function envoyerNotifPush(
  fcmToken:    string,
  titre:       string,
  corps:       string,
  url:         string,
  env:         { FCM_PROJECT_ID?: string; FCM_CLIENT_EMAIL?: string; FCM_PRIVATE_KEY?: string }
): Promise<boolean> {
  if (!fcmToken || !env.FCM_PROJECT_ID || !env.FCM_CLIENT_EMAIL || !env.FCM_PRIVATE_KEY) {
    return false
  }
  try {
    const accessToken = await getGoogleAccessToken(
      env.FCM_CLIENT_EMAIL,
      env.FCM_PRIVATE_KEY
    )

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: { title: titre, body: corps },
            data: { url },
            android: {
              priority: 'high',
              notification: { sound: 'default', click_action: 'FLUTTER_NOTIFICATION_CLICK' }
            },
          }
        }),
      }
    )

    const result = await res.json() as any
    if (!res.ok) {
      console.error('FCM v1 error:', result)
      return false
    }
    return true
  } catch (e) {
    console.error('envoyerNotifPush error:', e)
    return false
  }
}

// ── Récupérer le token FCM d'un utilisateur ──────────────────────────────
export async function getFcmToken(sb: any, userId: string): Promise<string | null> {
  try {
    const { data } = await sb
      .from('auth_profiles')
      .select('fcm_token')
      .eq('id', userId)
      .single()
    return data?.fcm_token || null
  } catch {
    return null
  }
}

// ── Notifier un patient (email + push combinés) ──────────────────────────
// Envoie l'email via Resend OU Brevo selon la clé configurée,
// ET la notification push si FCM est configuré.

export async function notifierPatient(opts: {
  sb:           any
  patientId:    string
  profileId?:   string
  titre:        string
  message:      string
  url:          string
  emailSubject: string
  emailHtml:    string
  env:          {
    RESEND_API_KEY?:   string
    BREVO_API_KEY?:    string
    FCM_PROJECT_ID?:   string
    FCM_CLIENT_EMAIL?: string
    FCM_PRIVATE_KEY?:  string
  }
}): Promise<void> {
  const { sb, patientId, titre, message, url, emailSubject, emailHtml, env } = opts

  // 1. Email (Resend OU Brevo selon clé disponible)
  const email = await getPatientEmail(sb, patientId)
  if (email) {
    if (env.RESEND_API_KEY) {
      await sendEmail({ resendKey: env.RESEND_API_KEY, to: email, subject: emailSubject, html: emailHtml })
    } else if (env.BREVO_API_KEY) {
      await sendEmailBrevo({ brevoKey: env.BREVO_API_KEY, to: email, subject: emailSubject, html: emailHtml })
    }
  }

  // 2. Push notification
  if (env.FCM_PROJECT_ID) {
    let profileId = opts.profileId
    if (!profileId) {
      const { data: dos } = await sb.from('patient_dossiers').select('profile_id').eq('id', patientId).single()
      profileId = dos?.profile_id
    }
    if (profileId) {
      const token = await getFcmToken(sb, profileId)
      if (token) {
        await envoyerNotifPush(token, titre, message, url, env)
      }
    }
  }
}
