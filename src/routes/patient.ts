/**
 * src/routes/patient.ts
 * Routes patient — toutes les fonctionnalités
 */
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile } from '../lib/supabase'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
export const patientRoutes = new Hono<{ Bindings: Bindings }>()

patientRoutes.use('/*', requireAuth, requireRole('patient'))

// ── helpers CSS commun ─────────────────────────────────────────
const CSS_BASE = `
  :root {
    --bleu:#1565C0; --bleu-fonce:#0d47a1; --bleu-clair:#e3f2fd;
    --vert:#1A6B3C; --vert-clair:#e8f5ee;
    --rouge:#b71c1c; --rouge-clair:#fce8e8;
    --or:#f59e0b; --or-clair:#fff8e6;
    --texte:#0f1923; --soft:#5a6a78; --bg:#f0f4f8;
    --blanc:#fff; --bordure:#dde3ea;
    --shadow:0 2px 12px rgba(0,0,0,0.07);
    --radius:16px; --radius-sm:10px;
  }
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);padding:0 0 80px;}
  .topbar{background:linear-gradient(135deg,var(--bleu-fonce),var(--bleu));height:56px;display:flex;align-items:center;padding:0 20px;position:sticky;top:0;z-index:100;box-shadow:0 2px 10px rgba(21,101,192,0.3);}
  .topbar-brand{font-family:'Fraunces',serif;font-size:18px;color:white;text-decoration:none;}
  .topbar-title{font-size:14px;color:rgba(255,255,255,0.8);margin-left:auto;}
  .content{max-width:700px;margin:0 auto;padding:20px 16px;}
  .back-btn{display:inline-flex;align-items:center;gap:8px;background:var(--blanc);border:1px solid var(--bordure);color:var(--texte);padding:9px 16px;border-radius:var(--radius-sm);font-size:13px;font-weight:700;text-decoration:none;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,0.06);transition:all .2s;font-family:inherit;}
  .back-btn:hover{background:var(--bleu-clair);border-color:var(--bleu);color:var(--bleu);}
  .card{background:var(--blanc);border-radius:var(--radius);padding:22px;box-shadow:var(--shadow);margin-bottom:14px;}
  .card-title{font-size:15px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
  h1{font-family:'Fraunces',serif;font-size:22px;color:var(--texte);margin-bottom:16px;}
  .badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;}
  .b-vert{background:var(--vert-clair);color:var(--vert);}
  .b-bleu{background:var(--bleu-clair);color:var(--bleu);}
  .b-rouge{background:var(--rouge-clair);color:var(--rouge);}
  .b-or{background:var(--or-clair);color:#7a5500;}
  .b-gris{background:#f0f0f0;color:#666;}
  .empty{text-align:center;padding:32px;color:var(--soft);font-size:13px;font-style:italic;}
  @media(max-width:640px){.content{padding:16px 12px;}}
`

const HEAD = (titre: string) => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titre} — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
  <style>${CSS_BASE}</style>
</head>`

const TOPBAR = (titre: string) => `
<div class="topbar">
  <a href="/dashboard/patient" class="topbar-brand">🏥 SantéBF</a>
  <span class="topbar-title">${titre}</span>
</div>`

// ═══════════════════════════════════════════════════════════════
// MON DOSSIER MÉDICAL
// ═══════════════════════════════════════════════════════════════
patientRoutes.get('/dossier', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers')
    .select('id,numero_national,nom,prenom,date_naissance,sexe,groupe_sanguin,rhesus,allergies,maladies_chroniques,telephone,created_at')
    .eq('profile_id', profil.id)
    .single()

  if (!dossier) {
    return c.html(`${HEAD('Mon dossier')}
    <body>${TOPBAR('Mon dossier')}
    <div class="content">
      <a href="/dashboard/patient" class="back-btn">← Retour</a>
      <div class="card" style="text-align:center;padding:40px;">
        <div style="font-size:48px;margin-bottom:16px;">📋</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:8px;">Dossier non lié</div>
        <p style="font-size:13px;color:var(--soft);line-height:1.7;">
          Votre dossier médical n'est pas encore lié à votre compte.<br>
          Présentez-vous à l'accueil d'une structure SantéBF avec votre email :<br>
          <strong style="color:var(--bleu)">${profil.email || ''}</strong>
        </p>
      </div>
    </div></body></html>`)
  }

  const age = Math.floor((Date.now() - new Date(dossier.date_naissance).getTime()) / (1000*60*60*24*365.25))

  const [consResult, ordResult, vaccResult] = await Promise.all([
    supabase.from('medical_consultations')
      .select('id,created_at,motif,diagnostic_principal,type_consultation,auth_profiles(nom,prenom)')
      .eq('patient_id', dossier.id)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('medical_ordonnances')
      .select('id,numero_ordonnance,created_at,statut,auth_profiles(nom,prenom)')
      .eq('patient_id', dossier.id)
      .eq('statut', 'active')
      .limit(5),
    supabase.from('spec_vaccinations')
      .select('id,vaccin,date_vaccination,prochaine_dose')
      .eq('patient_id', dossier.id)
      .order('date_vaccination', { ascending: false })
      .limit(5),
  ])

  const allergies: any[] = Array.isArray(dossier.allergies) ? dossier.allergies : []
  const maladies:  any[] = Array.isArray(dossier.maladies_chroniques) ? dossier.maladies_chroniques : []
  const consultations = consResult.data ?? []
  const ordonnances   = ordResult.data ?? []
  const vaccins       = vaccResult.data ?? []

  return c.html(`${HEAD('Mon dossier')}
<body>
${TOPBAR('Mon dossier')}
<div class="content">
  <a href="/dashboard/patient" class="back-btn">← Retour au tableau de bord</a>

  <!-- Identité -->
  <div class="card">
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
      <div style="width:64px;height:64px;border-radius:50%;background:var(--bleu-clair);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:var(--bleu);flex-shrink:0;">
        ${(dossier.prenom||'?').charAt(0)}${(dossier.nom||'?').charAt(0)}
      </div>
      <div style="flex:1;">
        <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:600;">${dossier.prenom} ${dossier.nom}</div>
        <div style="font-size:12px;color:var(--soft);margin-top:3px;">
          ${dossier.sexe === 'M' ? '👨 Masculin' : '👩 Féminin'} · ${age} ans · 🗓️ ${new Date(dossier.date_naissance).toLocaleDateString('fr-FR')}
        </div>
        <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <span style="font-family:monospace;font-size:12px;background:#f0f4f8;padding:3px 10px;border-radius:8px;">🪪 ${dossier.numero_national || 'N/A'}</span>
          ${dossier.groupe_sanguin ? `<span class="badge" style="background:var(--rouge-clair);color:var(--rouge);font-size:14px;padding:5px 12px;">🩸 ${dossier.groupe_sanguin}${dossier.rhesus||''}</span>` : ''}
        </div>
      </div>
    </div>
  </div>

  <!-- Allergies -->
  <div class="card">
    <div class="card-title">⚠️ Allergies connues</div>
    ${allergies.length > 0
      ? allergies.map(a => `
        <div style="background:var(--rouge-clair);border-left:4px solid var(--rouge);border-radius:8px;padding:12px;margin-bottom:8px;">
          <div style="font-size:14px;font-weight:700;color:var(--rouge);">${a.substance || a.nom || a}</div>
          ${a.reaction ? `<div style="font-size:12px;color:#7f1d1d;margin-top:2px;">Réaction : ${a.reaction}</div>` : ''}
        </div>`).join('')
      : '<div class="empty">✅ Aucune allergie enregistrée</div>'
    }
  </div>

  <!-- Maladies chroniques -->
  <div class="card">
    <div class="card-title">🩺 Maladies chroniques</div>
    ${maladies.length > 0
      ? maladies.map(m => `
        <div style="background:var(--or-clair);border-left:4px solid var(--or);border-radius:8px;padding:12px;margin-bottom:8px;">
          <div style="font-size:14px;font-weight:700;color:#7a5500;">${m.maladie || m.nom || m}</div>
          ${m.traitement ? `<div style="font-size:12px;color:#7a5500;margin-top:2px;">💊 ${m.traitement}</div>` : ''}
          ${m.depuis ? `<div style="font-size:11px;color:#9a7500;margin-top:2px;">Depuis ${m.depuis}</div>` : ''}
        </div>`).join('')
      : '<div class="empty">Aucune maladie chronique enregistrée</div>'
    }
  </div>

  <!-- Ordonnances actives -->
  ${ordonnances.length > 0 ? `
  <div class="card">
    <div class="card-title">💊 Ordonnances actives <span class="badge b-vert">${ordonnances.length}</span></div>
    ${ordonnances.map((o:any) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--bordure);">
        <div>
          <div style="font-size:13px;font-weight:700;">${o.numero_ordonnance}</div>
          <div style="font-size:12px;color:var(--soft);">Dr. ${o.auth_profiles?.prenom||''} ${o.auth_profiles?.nom||''} · ${new Date(o.created_at).toLocaleDateString('fr-FR')}</div>
        </div>
        <a href="/patient-pdf/ordonnance/${o.id}" style="background:var(--vert);color:white;padding:7px 12px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;">📥 PDF</a>
      </div>
    `).join('')}
    <a href="/patient/ordonnances" style="display:block;text-align:center;margin-top:12px;font-size:13px;color:var(--bleu);font-weight:700;text-decoration:none;">Voir toutes mes ordonnances →</a>
  </div>` : ''}

  <!-- Consultations -->
  <div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
      <div class="card-title" style="margin-bottom:0;">📋 Consultations récentes</div>
      <span class="badge b-bleu">${consultations.length}</span>
    </div>
    ${consultations.length > 0
      ? consultations.map((c:any) => `
        <div style="border-left:3px solid var(--bleu);padding:12px 14px;margin-bottom:10px;background:#fafcff;border-radius:0 8px 8px 0;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-size:12px;color:var(--soft);">${new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
            <span class="badge b-gris">${c.type_consultation||'normale'}</span>
          </div>
          <div style="font-size:14px;font-weight:700;">${c.motif||'N/A'}</div>
          <div style="font-size:12px;color:var(--soft);margin-top:3px;">Dr. ${c.auth_profiles?.prenom||''} ${c.auth_profiles?.nom||''}</div>
          ${c.diagnostic_principal ? `<div style="font-size:12px;color:var(--bleu);margin-top:3px;">→ ${c.diagnostic_principal}</div>` : ''}
        </div>`).join('')
      : '<div class="empty">Aucune consultation enregistrée</div>'
    }
  </div>

  <!-- Vaccinations récentes -->
  ${vaccins.length > 0 ? `
  <div class="card">
    <div class="card-title">💉 Vaccinations récentes</div>
    ${vaccins.map((v:any) => `
      <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bordure);">
        <div>
          <div style="font-size:13px;font-weight:700;">${v.vaccin}</div>
          <div style="font-size:12px;color:var(--soft);">${new Date(v.date_vaccination).toLocaleDateString('fr-FR')}</div>
        </div>
        ${v.prochaine_dose ? `<span class="badge b-or">Rappel ${new Date(v.prochaine_dose).toLocaleDateString('fr-FR')}</span>` : '<span class="badge b-vert">✅ À jour</span>'}
      </div>
    `).join('')}
    <a href="/patient/vaccinations" style="display:block;text-align:center;margin-top:12px;font-size:13px;color:var(--bleu);font-weight:700;text-decoration:none;">Voir tout mon carnet →</a>
  </div>` : ''}

</div>
</body></html>`)
})


// ═══════════════════════════════════════════════════════════════
// MES ORDONNANCES
// ═══════════════════════════════════════════════════════════════
patientRoutes.get('/ordonnances', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

  const { data: ordonnances } = await supabase
    .from('medical_ordonnances')
    .select('id,numero_ordonnance,created_at,date_expiration,statut,auth_profiles(nom,prenom,struct_structures(nom))')
    .eq('patient_id', dossier?.id)
    .order('created_at', { ascending: false })

  const list = ordonnances ?? []

  return c.html(`${HEAD('Mes ordonnances')}
<body>
${TOPBAR('Mes ordonnances')}
<div class="content">
  <a href="/dashboard/patient" class="back-btn">← Retour</a>
  <h1>💊 Mes ordonnances</h1>

  ${list.length === 0
    ? `<div class="card"><div class="empty">Aucune ordonnance enregistrée</div></div>`
    : list.map((o:any) => {
        const statut = o.statut
        const badgeClass = statut==='active' ? 'b-vert' : statut==='expiree' ? 'b-rouge' : 'b-gris'
        const labelStatut = statut==='active' ? '✅ Active' : statut==='delivree' ? '📦 Délivrée' : statut==='expiree' ? '❌ Expirée' : statut
        return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
            <div>
              <div style="font-size:15px;font-weight:700;margin-bottom:4px;">${o.numero_ordonnance}</div>
              <div style="font-size:12px;color:var(--soft);">Dr. ${o.auth_profiles?.prenom||''} ${o.auth_profiles?.nom||''}</div>
              ${o.auth_profiles?.struct_structures?.nom ? `<div style="font-size:11px;color:var(--bleu);">🏥 ${o.auth_profiles.struct_structures.nom}</div>` : ''}
            </div>
            <span class="badge ${badgeClass}">${labelStatut}</span>
          </div>
          <div style="display:flex;gap:12px;font-size:12px;color:var(--soft);margin-bottom:14px;flex-wrap:wrap;">
            <span>📅 Créée le ${new Date(o.created_at).toLocaleDateString('fr-FR')}</span>
            ${o.date_expiration ? `<span>⏳ Expire le ${new Date(o.date_expiration).toLocaleDateString('fr-FR')}</span>` : ''}
          </div>
          ${statut !== 'expiree' ? `
          <a href="/patient-pdf/ordonnance/${o.id}"
             style="display:flex;align-items:center;justify-content:center;gap:8px;background:var(--vert);color:white;padding:11px;border-radius:var(--radius-sm);text-decoration:none;font-size:13px;font-weight:700;">
            📥 Télécharger en PDF
          </a>` : ''}
        </div>`
      }).join('')
  }
</div>
</body></html>`)
})


// ═══════════════════════════════════════════════════════════════
// MES RENDEZ-VOUS
// ═══════════════════════════════════════════════════════════════
patientRoutes.get('/rdv', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

  const now = new Date().toISOString()
  const [futursRes, passesRes] = await Promise.all([
    supabase.from('medical_rendez_vous')
      .select('id,date_heure,motif,statut,auth_profiles(nom,prenom),struct_structures(nom)')
      .eq('patient_id', dossier?.id)
      .gte('date_heure', now)
      .order('date_heure', { ascending: true })
      .limit(10),
    supabase.from('medical_rendez_vous')
      .select('id,date_heure,motif,statut,auth_profiles(nom,prenom),struct_structures(nom)')
      .eq('patient_id', dossier?.id)
      .lt('date_heure', now)
      .order('date_heure', { ascending: false })
      .limit(5),
  ])

  const futurs = futursRes.data ?? []
  const passes = passesRes.data ?? []

  const rdvCard = (r:any, estPasse = false) => {
    const badgeClass = r.statut==='confirme' ? 'b-vert' : r.statut==='planifie' ? 'b-bleu' : r.statut==='annule' ? 'b-rouge' : 'b-gris'
    return `
    <div class="card" style="${estPasse ? 'opacity:.7;' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div style="font-size:16px;font-weight:700;color:var(--bleu);">
          ${new Date(r.date_heure).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
        </div>
        <span class="badge ${badgeClass}">${r.statut}</span>
      </div>
      <div style="font-size:15px;font-weight:700;color:var(--bleu);margin-bottom:2px;">
        🕐 ${new Date(r.date_heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
      </div>
      <div style="font-size:14px;font-weight:600;margin-bottom:4px;">${r.motif||'Consultation'}</div>
      <div style="font-size:12px;color:var(--soft);">Dr. ${r.auth_profiles?.prenom||''} ${r.auth_profiles?.nom||''}</div>
      ${r.struct_structures?.nom ? `<div style="font-size:12px;color:var(--bleu);">🏥 ${r.struct_structures.nom}</div>` : ''}
    </div>`
  }

  return c.html(`${HEAD('Mes rendez-vous')}
<body>
${TOPBAR('Mes rendez-vous')}
<div class="content">
  <a href="/dashboard/patient" class="back-btn">← Retour</a>
  <h1>📅 Mes rendez-vous</h1>

  <div style="font-size:13px;font-weight:700;color:var(--soft);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px;">À venir (${futurs.length})</div>
  ${futurs.length > 0 ? futurs.map(r => rdvCard(r)).join('') : '<div class="card"><div class="empty">Aucun rendez-vous à venir</div></div>'}

  ${passes.length > 0 ? `
  <div style="font-size:13px;font-weight:700;color:var(--soft);text-transform:uppercase;letter-spacing:.8px;margin:20px 0 10px;">Passés</div>
  ${passes.map(r => rdvCard(r, true)).join('')}` : ''}
</div>
</body></html>`)
})


// ═══════════════════════════════════════════════════════════════
// MES VACCINATIONS
// ═══════════════════════════════════════════════════════════════
patientRoutes.get('/vaccinations', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

  const { data: vaccins } = await supabase
    .from('spec_vaccinations')
    .select('id,vaccin,date_vaccination,lot,prochaine_dose,notes,auth_profiles(nom,prenom)')
    .eq('patient_id', dossier?.id)
    .order('date_vaccination', { ascending: false })

  const list = vaccins ?? []
  const rappels = list.filter((v:any) => v.prochaine_dose && new Date(v.prochaine_dose) > new Date())

  return c.html(`${HEAD('Mes vaccinations')}
<body>
${TOPBAR('Mes vaccinations')}
<div class="content">
  <a href="/dashboard/patient" class="back-btn">← Retour</a>
  <h1>💉 Mon carnet de vaccination</h1>

  ${rappels.length > 0 ? `
  <div style="background:var(--or-clair);border-left:4px solid var(--or);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:16px;">
    <div style="font-size:13px;font-weight:700;color:#7a5500;margin-bottom:6px;">⏰ ${rappels.length} rappel(s) à prévoir</div>
    ${rappels.map((v:any) => `<div style="font-size:12px;color:#7a5500;">• ${v.vaccin} — ${new Date(v.prochaine_dose).toLocaleDateString('fr-FR')}</div>`).join('')}
  </div>` : ''}

  ${list.length === 0
    ? `<div class="card"><div class="empty">Aucun vaccin enregistré</div></div>`
    : list.map((v:any) => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div style="font-size:15px;font-weight:700;">💉 ${v.vaccin}</div>
          ${v.prochaine_dose && new Date(v.prochaine_dose) > new Date()
            ? `<span class="badge b-or">Rappel ${new Date(v.prochaine_dose).toLocaleDateString('fr-FR')}</span>`
            : `<span class="badge b-vert">✅ À jour</span>`}
        </div>
        <div style="font-size:12px;color:var(--soft);display:flex;gap:14px;flex-wrap:wrap;">
          <span>📅 ${new Date(v.date_vaccination).toLocaleDateString('fr-FR')}</span>
          ${v.lot ? `<span>🔖 Lot : ${v.lot}</span>` : ''}
          ${v.auth_profiles ? `<span>👨‍⚕️ Dr. ${v.auth_profiles.prenom} ${v.auth_profiles.nom}</span>` : ''}
        </div>
        ${v.notes ? `<div style="font-size:12px;color:var(--soft);margin-top:6px;font-style:italic;">${v.notes}</div>` : ''}
      </div>`).join('')
  }
</div>
</body></html>`)
})


// ═══════════════════════════════════════════════════════════════
// MES CONSENTEMENTS — liste médecins + révoquer
// ═══════════════════════════════════════════════════════════════
patientRoutes.get('/consentements', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

  const { data: consentements } = await supabase
    .from('patient_consentements')
    .select(`
      id, est_actif, accordé_le,
      auth_profiles!patient_consentements_medecin_id_fkey(
        id, nom, prenom, avatar_url,
        auth_medecins(specialite_principale),
        struct_structures!auth_profiles_structure_id_fkey(nom)
      )
    `)
    .eq('patient_id', dossier?.id)
    .order('accordé_le', { ascending: false })

  const list = consentements ?? []
  const actifs  = list.filter((c:any) => c.est_actif)
  const inactifs = list.filter((c:any) => !c.est_actif)

  const medecinCard = (c:any, actif: boolean) => {
    const p = c.auth_profiles
    if (!p) return ''
    const initiales = `${(p.prenom||'?').charAt(0)}${(p.nom||'?').charAt(0)}`
    return `
    <div class="card" style="${actif ? '' : 'opacity:.6;'}">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:48px;height:48px;border-radius:50%;background:var(--vert-clair);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:var(--vert);flex-shrink:0;overflow:hidden;">
          ${p.avatar_url ? `<img src="${p.avatar_url}" style="width:100%;height:100%;object-fit:cover;" alt="">` : initiales}
        </div>
        <div style="flex:1;">
          <div style="font-size:15px;font-weight:700;">Dr. ${p.prenom} ${p.nom}</div>
          <div style="font-size:12px;color:var(--soft);">${p.auth_medecins?.[0]?.specialite_principale || 'Médecin généraliste'}</div>
          ${p.struct_structures?.nom ? `<div style="font-size:11px;color:var(--bleu);">🏥 ${p.struct_structures.nom}</div>` : ''}
          <div style="font-size:11px;color:var(--soft);margin-top:2px;">Accordé le ${c.accordé_le ? new Date(c.accordé_le).toLocaleDateString('fr-FR') : 'N/A'}</div>
        </div>
        <div>
          ${actif
            ? `<form method="POST" action="/patient/consentements/${c.id}/revoquer" style="margin:0;">
                 <button type="submit" style="background:var(--rouge-clair);color:var(--rouge);border:none;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">
                   🔒 Révoquer
                 </button>
               </form>`
            : `<form method="POST" action="/patient/consentements/${c.id}/reactiver" style="margin:0;">
                 <button type="submit" style="background:var(--vert-clair);color:var(--vert);border:none;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">
                   🔓 Réactiver
                 </button>
               </form>`
          }
        </div>
      </div>
    </div>`
  }

  return c.html(`${HEAD('Mes consentements')}
<body>
${TOPBAR('Consentements')}
<div class="content">
  <a href="/dashboard/patient" class="back-btn">← Retour</a>
  <h1>🔐 Accès à mon dossier</h1>

  <div style="background:var(--bleu-clair);border-left:4px solid var(--bleu);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:20px;font-size:13px;color:#1a3a6b;">
    <strong style="display:block;margin-bottom:4px;">ℹ️ Comment ça fonctionne ?</strong>
    Les médecins listés ici ont accès à votre dossier médical complet. Vous pouvez révoquer cet accès à tout moment. La révocation est immédiate.
  </div>

  <div style="font-size:13px;font-weight:700;color:var(--soft);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px;">
    Médecins autorisés (${actifs.length})
  </div>

  ${actifs.length > 0
    ? actifs.map((c:any) => medecinCard(c, true)).join('')
    : `<div class="card"><div class="empty">Aucun médecin autorisé pour le moment.<br>L'hôpital crée les autorisations lors de votre visite.</div></div>`
  }

  ${inactifs.length > 0 ? `
  <div style="font-size:13px;font-weight:700;color:var(--soft);text-transform:uppercase;letter-spacing:.8px;margin:20px 0 10px;">
    Accès révoqués (${inactifs.length})
  </div>
  ${inactifs.map((c:any) => medecinCard(c, false)).join('')}` : ''}
</div>
</body></html>`)
})


// ── POST révoquer consentement ─────────────────────────────────
patientRoutes.post('/consentements/:id/revoquer', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id = c.req.param('id')

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

  await supabase
    .from('patient_consentements')
    .update({ est_actif: false })
    .eq('id', id)
    .eq('patient_id', dossier?.id)

  return c.redirect('/patient/consentements')
})

// ── POST réactiver consentement ────────────────────────────────
patientRoutes.post('/consentements/:id/reactiver', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id = c.req.param('id')

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

  await supabase
    .from('patient_consentements')
    .update({ est_actif: true })
    .eq('id', id)
    .eq('patient_id', dossier?.id)

  return c.redirect('/patient/consentements')
})


// ═══════════════════════════════════════════════════════════════
// MON PROFIL — modifier infos personnelles
// ═══════════════════════════════════════════════════════════════
patientRoutes.get('/profil', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers')
    .select('id,nom,prenom,date_naissance,sexe,telephone,groupe_sanguin,rhesus')
    .eq('profile_id', profil.id)
    .single()

  const succes = new URL(c.req.url).searchParams.get('succes')

  return c.html(`${HEAD('Mon profil')}
<body>
${TOPBAR('Mon profil')}
<div class="content">
  <a href="/dashboard/patient" class="back-btn">← Retour</a>
  <h1>👤 Mon profil</h1>

  ${succes ? `<div style="background:var(--vert-clair);color:var(--vert);border-radius:var(--radius-sm);padding:12px 16px;margin-bottom:16px;font-size:13px;font-weight:700;">✅ Profil mis à jour avec succès !</div>` : ''}

  <div class="card">
    <div class="card-title">📧 Compte</div>
    <div style="font-size:13px;color:var(--soft);margin-bottom:4px;">Email de connexion</div>
    <div style="font-size:14px;font-weight:700;margin-bottom:16px;">${profil.email || 'Non défini'}</div>
    <a href="/auth/changer-mdp" style="font-size:13px;color:var(--bleu);font-weight:700;text-decoration:none;">🔑 Changer mon mot de passe →</a>
  </div>

  ${dossier ? `
  <div class="card">
    <div class="card-title">📋 Informations médicales</div>
    <div style="font-size:12px;color:var(--soft);margin-bottom:12px;">Ces informations sont gérées par votre établissement de santé.</div>
    <div style="display:grid;gap:10px;">
      ${[
        ['Prénom', dossier.prenom],
        ['Nom', dossier.nom],
        ['Date de naissance', dossier.date_naissance ? new Date(dossier.date_naissance).toLocaleDateString('fr-FR') : 'N/A'],
        ['Sexe', dossier.sexe === 'M' ? 'Masculin' : 'Féminin'],
        ['Groupe sanguin', dossier.groupe_sanguin ? `${dossier.groupe_sanguin}${dossier.rhesus||''}` : 'Non renseigné'],
        ['Téléphone', dossier.telephone || 'Non renseigné'],
      ].map(([label, val]) => `
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bordure);">
          <span style="font-size:12px;font-weight:700;color:var(--soft);">${label}</span>
          <span style="font-size:13px;font-weight:600;">${val}</span>
        </div>`).join('')}
    </div>
  </div>` : `
  <div class="card" style="text-align:center;padding:32px;">
    <div style="font-size:36px;margin-bottom:12px;">📋</div>
    <div style="font-size:14px;font-weight:700;margin-bottom:6px;">Dossier non lié</div>
    <div style="font-size:12px;color:var(--soft);">Présentez-vous à l'accueil d'une structure SantéBF pour lier votre dossier.</div>
  </div>`}

  <div class="card">
    <div class="card-title">🔐 Sécurité</div>
    <a href="/patient/consentements" style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;text-decoration:none;color:var(--texte);border-bottom:1px solid var(--bordure);">
      <span style="font-size:14px;font-weight:600;">Gérer les accès à mon dossier</span>
      <span style="color:var(--bleu);">→</span>
    </a>
    <a href="/auth/logout" style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;text-decoration:none;color:var(--rouge);">
      <span style="font-size:14px;font-weight:600;">Se déconnecter</span>
      <span>⏻</span>
    </a>
  </div>
</div>
</body></html>`)
})
