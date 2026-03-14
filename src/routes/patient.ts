// Routes patient — Dossier médical, ordonnances, RDV, consentements
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile } from '../lib/supabase'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
export const patientRoutes = new Hono<{ Bindings: Bindings }>()

patientRoutes.use('/*', requireAuth, requireRole('patient'))

// ── Mon dossier médical ────────────────────────────────────────
patientRoutes.get('/dossier', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers')
    .select(`
      id, numero_national, nom, prenom, date_naissance,
      sexe, groupe_sanguin, rhesus, allergies, maladies_chroniques,
      created_at
    `)
    .eq('profile_id', profil.id)
    .single()

  const { data: consultations } = await supabase
    .from('medical_consultations')
    .select(`
      id, created_at, motif, diagnostic_principal, type_consultation,
      auth_profiles (nom, prenom)
    `)
    .eq('patient_id', dossier?.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const age = dossier ? Math.floor(
    (Date.now() - new Date(dossier.date_naissance).getTime()) / (1000*60*60*24*365.25)
  ) : 0

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mon dossier médical — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;padding:20px}
    .container{max-width:900px;margin:0 auto}
    .back-link{display:inline-flex;align-items:center;gap:6px;color:#1A6B3C;text-decoration:none;font-size:14px;margin-bottom:16px;font-weight:600}
    .back-link:hover{text-decoration:underline}
    .card{background:white;border-radius:16px;padding:28px 32px;box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-bottom:20px}
    h1{font-size:26px;color:#1A1A2E;margin-bottom:6px}
    .meta{font-size:14px;color:#6B7280;display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px}
    .badge{background:#F3F4F6;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
    .badge.sanguin{background:#FEE2E2;color:#B71C1C;font-size:14px;padding:6px 14px}
    .section-title{font-size:13px;font-weight:700;text-transform:uppercase;color:#9CA3AF;margin:20px 0 12px}
    .item{background:#F9FAFB;border-left:4px solid #1A6B3C;padding:14px;border-radius:8px;margin-bottom:10px}
    .item-title{font-size:14px;font-weight:600;color:#1A1A2E;margin-bottom:2px}
    .item-desc{font-size:12px;color:#6B7280}
    .consult-item{background:#F9FAFB;border-left:4px solid #4A148C;padding:16px;border-radius:10px;margin-bottom:12px}
    .consult-header{display:flex;justify-content:space-between;margin-bottom:8px}
    .consult-date{font-size:12px;color:#9CA3AF}
    .empty{text-align:center;padding:24px;color:#9CA3AF;font-style:italic}
  </style>
</head>
<body>
  <div class="container">
    <a href="/dashboard/patient" class="back-link">← Retour au tableau de bord</a>

    <div class="card">
      <h1>${dossier?.prenom || ''} ${dossier?.nom || ''}</h1>
      <div class="meta">
        <span>${dossier?.sexe === 'M' ? '👨 Masculin' : '👩 Féminin'}</span>
        <span>📅 ${age} ans</span>
        <span>🆔 ${dossier?.numero_national || 'N/A'}</span>
        <span class="badge sanguin">🩸 ${dossier?.groupe_sanguin || '?'}${dossier?.rhesus || ''}</span>
      </div>
    </div>

    <div class="card">
      <div class="section-title">⚠️ Allergies</div>
      ${dossier?.allergies && dossier.allergies.length > 0
        ? dossier.allergies.map((a: any) => `
          <div class="item">
            <div class="item-title">${a.nom || a}</div>
            <div class="item-desc">${a.severite || ''} ${a.reaction || ''}</div>
          </div>
        `).join('')
        : '<div class="empty">Aucune allergie enregistrée</div>'
      }
    </div>

    <div class="card">
      <div class="section-title">🩺 Maladies chroniques</div>
      ${dossier?.maladies_chroniques && dossier.maladies_chroniques.length > 0
        ? dossier.maladies_chroniques.map((m: any) => `
          <div class="item">
            <div class="item-title">${m.nom || m}</div>
            <div class="item-desc">${m.date_diagnostic || ''}</div>
          </div>
        `).join('')
        : '<div class="empty">Aucune maladie chronique</div>'
      }
    </div>

    <div class="card">
      <div class="section-title">📋 Consultations récentes</div>
      ${consultations && consultations.length > 0
        ? consultations.map((c: any) => `
          <div class="consult-item">
            <div class="consult-header">
              <span class="consult-date">${new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
              <span class="badge">${c.type_consultation || 'normale'}</span>
            </div>
            <div class="item-title">${c.motif || 'N/A'}</div>
            <div class="item-desc">Dr. ${c.auth_profiles?.prenom || ''} ${c.auth_profiles?.nom || ''}</div>
            ${c.diagnostic_principal ? `<div class="item-desc">→ ${c.diagnostic_principal}</div>` : ''}
          </div>
        `).join('')
        : '<div class="empty">Aucune consultation</div>'
      }
    </div>
  </div>
</body>
</html>`)
})

// ── Mes ordonnances ────────────────────────────────────────────
patientRoutes.get('/ordonnances', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers')
    .select('id')
    .eq('profile_id', profil.id)
    .single()

  const { data: ordonnances } = await supabase
    .from('medical_ordonnances')
    .select(`
      id, numero_ordonnance, created_at, date_expiration, statut,
      qr_code_verification,
      auth_profiles (nom, prenom)
    `)
    .eq('patient_id', dossier?.id)
    .order('created_at', { ascending: false })

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Mes ordonnances — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;padding:20px}
    .container{max-width:900px;margin:0 auto}
    .back-link{display:inline-flex;align-items:center;gap:6px;color:#1A6B3C;text-decoration:none;font-size:14px;margin-bottom:16px;font-weight:600}
    .card{background:white;border-radius:16px;padding:28px 32px;box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-bottom:20px}
    h1{font-size:24px;color:#1A1A2E;margin-bottom:20px}
    .ord-item{border:2px solid #E5E7EB;border-radius:12px;padding:16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center}
    .ord-info strong{display:block;font-size:14px;margin-bottom:4px}
    .ord-info span{font-size:12px;color:#6B7280}
    .badge{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600}
    .badge.active{background:#E8F5E9;color:#1A6B3C}
    .badge.delivree{background:#F3F4F6;color:#9E9E9E}
    .badge.expiree{background:#FFF5F5;color:#B71C1C}
    .btn{padding:8px 14px;background:#1A6B3C;color:white;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600}
    .empty{text-align:center;padding:40px;color:#9CA3AF;font-style:italic}
  </style>
</head>
<body>
  <div class="container">
    <a href="/dashboard/patient" class="back-link">← Retour</a>
    <div class="card">
      <h1>Mes ordonnances</h1>
      ${ordonnances && ordonnances.length > 0
        ? ordonnances.map((o: any) => `
          <div class="ord-item">
            <div class="ord-info">
              <strong>Ordonnance ${o.numero_ordonnance}</strong>
              <span>Dr. ${o.auth_profiles?.prenom || ''} ${o.auth_profiles?.nom || ''}</span>
              <span>${new Date(o.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            <div style="display:flex;gap:10px;align-items:center">
              <span class="badge ${o.statut}">${o.statut}</span>
              <a href="/patient/ordonnances/${o.id}" class="btn">Voir</a>
            </div>
          </div>
        `).join('')
        : '<div class="empty">Vous n\'avez aucune ordonnance</div>'
      }
    </div>
  </div>
</body>
</html>`)
})

// ── Mes rendez-vous ────────────────────────────────────────────
patientRoutes.get('/rdv', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers')
    .select('id')
    .eq('profile_id', profil.id)
    .single()

  const { data: rdv } = await supabase
    .from('medical_rendez_vous')
    .select(`
      id, date_heure, motif, statut,
      auth_profiles (nom, prenom),
      struct_structures (nom)
    `)
    .eq('patient_id', dossier?.id)
    .order('date_heure', { ascending: true })

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Mes rendez-vous — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;padding:20px}
    .container{max-width:900px;margin:0 auto}
    .back-link{display:inline-flex;align-items:center;gap:6px;color:#1A6B3C;text-decoration:none;font-size:14px;margin-bottom:16px;font-weight:600}
    .card{background:white;border-radius:16px;padding:28px 32px;box-shadow:0 2px 12px rgba(0,0,0,0.06)}
    h1{font-size:24px;color:#1A1A2E;margin-bottom:20px}
    .rdv-item{background:#F9FAFB;border-left:4px solid #1565C0;padding:16px;border-radius:10px;margin-bottom:12px}
    .rdv-header{display:flex;justify-content:space-between;margin-bottom:8px}
    .rdv-date{font-size:15px;font-weight:700;color:#1565C0}
    .badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .badge.planifie{background:#E3F2FD;color:#1565C0}
    .badge.confirme{background:#E8F5E9;color:#1A6B3C}
    .badge.passe{background:#F3F4F6;color:#9E9E9E}
    .rdv-info strong{display:block;font-size:14px;margin-bottom:4px}
    .rdv-info span{font-size:12px;color:#6B7280}
    .empty{text-align:center;padding:40px;color:#9CA3AF;font-style:italic}
  </style>
</head>
<body>
  <div class="container">
    <a href="/dashboard/patient" class="back-link">← Retour</a>
    <div class="card">
      <h1>Mes rendez-vous</h1>
      ${rdv && rdv.length > 0
        ? rdv.map((r: any) => `
          <div class="rdv-item">
            <div class="rdv-header">
              <span class="rdv-date">${new Date(r.date_heure).toLocaleDateString('fr-FR')} à ${new Date(r.date_heure).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})}</span>
              <span class="badge ${r.statut}">${r.statut}</span>
            </div>
            <div class="rdv-info">
              <strong>${r.motif || 'Consultation'}</strong>
              <span>Dr. ${r.auth_profiles?.prenom || ''} ${r.auth_profiles?.nom || ''}</span>
              <span>${r.struct_structures?.nom || ''}</span>
            </div>
          </div>
        `).join('')
        : '<div class="empty">Vous n\'avez aucun rendez-vous planifié</div>'
      }
    </div>
  </div>
</body>
</html>`)
})

// ── Mes consentements ──────────────────────────────────────────
patientRoutes.get('/consentements', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Mes consentements — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;padding:20px}
    .container{max-width:700px;margin:0 auto}
    .back-link{display:inline-flex;align-items:center;gap:6px;color:#1A6B3C;text-decoration:none;font-size:14px;margin-bottom:16px;font-weight:600}
    .card{background:white;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06);text-align:center}
    h1{font-size:24px;color:#1A1A2E;margin-bottom:12px}
    p{font-size:14px;color:#6B7280;line-height:1.7}
    .icon{font-size:64px;margin-bottom:20px}
  </style>
</head>
<body>
  <div class="container">
    <a href="/dashboard/patient" class="back-link">← Retour</a>
    <div class="card">
      <div class="icon">🔐</div>
      <h1>Gestion des consentements</h1>
      <p>Cette fonctionnalité sera bientôt disponible.<br>
      Vous pourrez gérer les autorisations d'accès à votre dossier médical.</p>
    </div>
  </div>
</body>
</html>`)
})
