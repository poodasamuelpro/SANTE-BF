/**
 * src/routes/public.ts
 * SantéBF — Routes publiques (sans authentification)
 *
 * Routes disponibles :
 *   GET /public/                     → Page landing marketing
 *   GET /public/patient/welcome      → Page accueil app mobile patient
 *   GET /public/urgence/:qr_token    → Dossier urgence via QR code
 *   GET /public/ordonnance/:qr_code  → Vérification ordonnance publique
 */

import { Hono } from 'hono'
import { getSupabase, type Bindings } from '../lib/supabase'
import { landingPage }           from '../pages/landing'
import { accueilPatientAppPage } from '../pages/accueil-patient-app'

export const publicRoutes = new Hono<{ Bindings: Bindings }>()

// ── Page landing marketing ─────────────────────────────────────
// Matcher /public ET /public/ (avec et sans slash final)
publicRoutes.get('',  (c) => c.html(landingPage()))
publicRoutes.get('/', (c) => c.html(landingPage()))

// ── Page d'accueil app mobile patient ─────────────────────────
publicRoutes.get('/patient/welcome', (c) => c.html(accueilPatientAppPage()))

// ── QR code urgence ────────────────────────────────────────────
publicRoutes.get('/urgence/:qr_token', async (c) => {
  try {
    const qrToken = c.req.param('qr_token')
    const sb      = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

    const { data: patient, error } = await sb
      .from('patient_dossiers')
      .select(`
        id, numero_national, nom, prenom, date_naissance, sexe,
        groupe_sanguin, rhesus, allergies, maladies_chroniques,
        patient_contacts_urgence ( nom_complet, telephone, lien_parente )
      `)
      .eq('qr_code_token', qrToken)
      .single()

    if (error || !patient) {
      return c.html(notFoundPage('QR Code invalide'), 404)
    }

    const { urgencePage } = await import('../pages/urgence-qr')
    return c.html(urgencePage(patient))
  } catch (err) {
    console.error('Erreur route urgence:', err)
    return c.html(errorPage('Erreur serveur'), 500)
  }
})

// ── Vérification ordonnance publique ──────────────────────────
publicRoutes.get('/ordonnance/:qr_code', async (c) => {
  try {
    const qrCode = c.req.param('qr_code')
    const sb     = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

    const { data: ordonnance, error } = await sb
      .from('medical_ordonnances')
      .select(`
        id, numero_ordonnance, created_at, date_expiration, statut,
        patient_dossiers ( nom, prenom, date_naissance ),
        auth_profiles ( nom, prenom ),
        medical_ordonnance_lignes ( medicament_nom, dosage, frequence, duree )
      `)
      .eq('qr_code_verification', qrCode)
      .single()

    if (error || !ordonnance) {
      return c.html(notFoundPage('Ordonnance introuvable'), 404)
    }

    return c.html(ordonnancePage(ordonnance))
  } catch (err) {
    console.error('Erreur route ordonnance:', err)
    return c.html(errorPage('Erreur serveur'), 500)
  }
})

// ── Helpers pages HTML ─────────────────────────────────────────

function notFoundPage(message: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${message}</title>
<style>body{font-family:sans-serif;background:#f7f8fa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.box{background:white;padding:48px;border-radius:16px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.08)}h1{color:#B71C1C;font-size:24px;margin-bottom:12px}p{color:#6B7280;font-size:14px}</style>
</head><body><div class="box"><div style="font-size:48px;margin-bottom:16px">⚠️</div><h1>${message}</h1><p>Code non reconnu dans le système SantéBF.</p></div></body></html>`
}

function errorPage(message: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Erreur</title>
<style>body{font-family:sans-serif;background:#f7f8fa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.box{background:white;padding:48px;border-radius:16px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.08)}h1{color:#B71C1C;font-size:24px;margin-bottom:12px}</style>
</head><body><div class="box"><div style="font-size:48px;margin-bottom:16px">❌</div><h1>Erreur serveur</h1><p>${message}</p></div></body></html>`
}

function ordonnancePage(ordonnance: any): string {
  const patient    = ordonnance.patient_dossiers as any
  const medecin    = ordonnance.auth_profiles    as any
  const lignes     = ordonnance.medical_ordonnance_lignes as any[]
  const estExpiree = new Date(ordonnance.date_expiration) < new Date()

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vérification ordonnance — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;padding:20px}
    .container{max-width:700px;margin:0 auto}
    .card{background:white;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:20px}
    .header{text-align:center;margin-bottom:24px}
    h1{font-size:24px;color:#1A1A2E;margin-bottom:6px}
    .subtitle{font-size:14px;color:#6B7280}
    .badge{display:inline-block;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;margin:12px 0}
    .badge.active{background:#E8F5E9;color:#1A6B3C}
    .badge.expiree{background:#FFF5F5;color:#B71C1C}
    .badge.delivree{background:#F3F4F6;color:#9E9E9E}
    .section-title{font-size:13px;font-weight:700;text-transform:uppercase;color:#9CA3AF;margin:20px 0 12px}
    .field{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F3F4F6}
    .field-label{font-size:13px;color:#6B7280}
    .field-value{font-size:14px;color:#1A1A2E;font-weight:600}
    .med-item{background:#F9FAFB;border-left:4px solid #4A148C;padding:14px;border-radius:8px;margin-bottom:10px}
    .med-nom{font-size:14px;font-weight:600;margin-bottom:4px}
    .med-posologie{font-size:13px;color:#6B7280}
    .alert{background:#FFF8E1;border-left:4px solid #F9A825;padding:14px;border-radius:8px;margin:20px 0;font-size:13px;color:#E65100}
    .footer{text-align:center;margin-top:32px;font-size:12px;color:#9CA3AF}
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div style="font-size:48px;margin-bottom:8px">💊</div>
        <h1>Vérification d'ordonnance</h1>
        <p class="subtitle">SantéBF — Plateforme de Santé Numérique</p>
        <div class="badge ${ordonnance.statut}">${ordonnance.statut}</div>
      </div>
      ${estExpiree ? '<div class="alert">⚠️ <strong>Attention :</strong> Cette ordonnance est expirée.</div>' : ''}
      <div class="section-title">📋 Ordonnance</div>
      <div class="field"><span class="field-label">Numéro</span><span class="field-value">${ordonnance.numero_ordonnance}</span></div>
      <div class="field"><span class="field-label">Date prescription</span><span class="field-value">${new Date(ordonnance.created_at).toLocaleDateString('fr-FR')}</span></div>
      <div class="field"><span class="field-label">Expiration</span><span class="field-value">${new Date(ordonnance.date_expiration).toLocaleDateString('fr-FR')}</span></div>
      <div class="section-title">👤 Patient</div>
      <div class="field"><span class="field-label">Nom</span><span class="field-value">${patient?.prenom||''} ${patient?.nom||''}</span></div>
      <div class="section-title">👨‍⚕️ Médecin prescripteur</div>
      <div class="field"><span class="field-label">Nom</span><span class="field-value">Dr. ${medecin?.prenom||''} ${medecin?.nom||''}</span></div>
      <div class="section-title">💊 Médicaments (${lignes?.length||0})</div>
      ${(lignes||[]).map((l: any) => `
        <div class="med-item">
          <div class="med-nom">${l.medicament_nom||''}</div>
          <div class="med-posologie">${[l.dosage,l.frequence,l.duree].filter(Boolean).join(' — ')}</div>
        </div>`).join('')}
      <div class="footer"><p>🔐 Vérification sécurisée — SantéBF</p></div>
    </div>
  </div>
</body>
</html>`
}
