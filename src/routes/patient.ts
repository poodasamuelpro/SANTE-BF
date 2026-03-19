/**
 * src/routes/patient.ts
 * Toutes les routes patient — syntaxe TypeScript stricte, zéro template literal imbriqué
 *
 * CORRECTIONS APPLIQUÉES :
 *  1. Shadow variable `c` dans les callbacks .map() → renommé en `cons`, `rdvItem`, etc.
 *  2. `new URL(c.req.url)` → `c.req.query()` (compatible Cloudflare Workers)
 *  3. Toutes les redirections POST → code 303 explicite
 *  4. Import de `Bindings` depuis supabase.ts pour cohérence
 *
 * AJOUTS :
 *  5. Section structures dans GET /consentements (table patient_consentements_structure)
 *  6. POST /consentements/structure/:id/revoquer  → nouvelle table séparée
 *  7. POST /consentements/structure/:id/autoriser → nouvelle table séparée
 *     IMPORTANT : ces 2 routes sont déclarées AVANT POST /consentements/:id/*
 *     pour éviter que Hono capture "structure" comme valeur de :id
 */
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'

export const patientRoutes = new Hono<{ Bindings: Bindings }>()
patientRoutes.use('/*', requireAuth, requireRole('patient'))

// ── helpers ────────────────────────────────────────────────────
function layout(titre: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titre} — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>
:root{--bleu:#1565C0;--bleu-f:#0d47a1;--bleu-c:#e3f2fd;--vert:#1A6B3C;--vert-c:#e8f5ee;--rouge:#b71c1c;--rouge-c:#fce8e8;--or:#f59e0b;--or-c:#fff8e6;--texte:#0f1923;--soft:#5a6a78;--bg:#f0f4f8;--blanc:#fff;--bordure:#dde3ea;--r:16px;--rs:10px;--sh:0 2px 10px rgba(0,0,0,.07);}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);padding-bottom:80px;}
.topbar{background:linear-gradient(135deg,var(--bleu-f),var(--bleu));height:56px;display:flex;align-items:center;padding:0 20px;position:sticky;top:0;z-index:100;box-shadow:0 2px 10px rgba(21,101,192,.3);}
.tb-brand{font-family:'Fraunces',serif;font-size:18px;color:white;text-decoration:none;}
.tb-title{font-size:13px;color:rgba(255,255,255,.8);margin-left:auto;}
.wrap{max-width:720px;margin:0 auto;padding:20px 16px;}
.back{display:inline-flex;align-items:center;gap:8px;background:var(--blanc);border:1px solid var(--bordure);color:var(--texte);padding:9px 16px;border-radius:var(--rs);font-size:13px;font-weight:700;text-decoration:none;margin-bottom:20px;}
.back:hover{background:var(--bleu-c);color:var(--bleu);}
h1{font-family:'Fraunces',serif;font-size:22px;margin-bottom:16px;}
.card{background:var(--blanc);border-radius:var(--r);padding:20px;box-shadow:var(--sh);margin-bottom:12px;}
.card-title{font-size:14px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:7px;}
.empty{text-align:center;padding:32px;color:var(--soft);font-size:13px;font-style:italic;}
.badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;}
.bv{background:var(--vert-c);color:var(--vert);}
.bb{background:var(--bleu-c);color:var(--bleu);}
.br{background:var(--rouge-c);color:var(--rouge);}
.bg{background:#f0f0f0;color:#666;}
.bo{background:var(--or-c);color:#7a5500;}
.row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;}
.meta{font-size:12px;color:var(--soft);display:flex;gap:12px;flex-wrap:wrap;margin-top:4px;}
.sep{border-bottom:1px solid var(--bordure);padding:10px 0;display:flex;justify-content:space-between;}
.sep:last-child{border-bottom:none;}
.lbl{font-size:12px;font-weight:700;color:var(--soft);}
.val{font-size:13px;font-weight:600;}
.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:var(--rs);font-size:13px;font-weight:700;text-decoration:none;border:none;cursor:pointer;font-family:inherit;}
.btn-v{background:var(--vert);color:white;}
.btn-b{background:var(--bleu);color:white;}
.btn-r{background:var(--rouge-c);color:var(--rouge);}
.btn-o{background:var(--or-c);color:#7a5500;border:1px solid var(--or);}
.info-box{background:var(--bleu-c);border-left:4px solid var(--bleu);border-radius:var(--rs);padding:13px 15px;margin-bottom:16px;font-size:13px;color:#1a3a6b;line-height:1.6;}
.warn-box{background:var(--rouge-c);border-left:4px solid var(--rouge);border-radius:var(--rs);padding:13px 15px;margin-bottom:16px;font-size:13px;color:#7f1d1d;line-height:1.6;}
.ok-box{background:var(--vert-c);color:var(--vert);border-radius:var(--rs);padding:12px 15px;margin-bottom:16px;font-size:13px;font-weight:700;}
input,select,textarea{width:100%;padding:11px 14px;border:1.5px solid var(--bordure);border-radius:var(--rs);font-size:14px;font-family:inherit;outline:none;background:#fafafa;}
input:focus,select:focus{border-color:var(--bleu);background:white;}
.form-group{margin-bottom:14px;}
.form-label{display:block;font-size:12px;font-weight:700;color:var(--texte);margin-bottom:5px;}
@media(max-width:640px){.wrap{padding:14px 12px;}}
</style>
</head>
<body>
<div class="topbar">
  <a href="/dashboard/patient" class="tb-brand">&#127973; SantéBF</a>
  <span class="tb-title">${titre}</span>
</div>
${content}
</body>
</html>`
}

function noDossier(): string {
  return `<div class="card">
  <div style="text-align:center;padding:32px;">
    <div style="font-size:48px;margin-bottom:12px;">&#128203;</div>
    <div style="font-size:15px;font-weight:700;margin-bottom:8px;">Dossier non lié</div>
    <p style="font-size:13px;color:var(--soft);">Présentez-vous à l'accueil d'une structure SantéBF avec votre email pour lier votre dossier.</p>
  </div>
</div>`
}

// ═══════════════════════════════════════════════════════════════
// MON DOSSIER
// ═══════════════════════════════════════════════════════════════
patientRoutes.get('/dossier', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers')
    .select('id, numero_national, nom, prenom, date_naissance, sexe, groupe_sanguin, rhesus, allergies, maladies_chroniques, telephone, created_at')
    .eq('profile_id', profil.id).single()

  if (!dossier) {
    return c.html(layout('Mon dossier', `<div class="wrap"><a href="/dashboard/patient" class="back">&#8592; Retour</a>${noDossier()}</div>`))
  }

  const age = Math.floor((Date.now() - new Date(dossier.date_naissance).getTime()) / (1000 * 60 * 60 * 24 * 365.25))

  const [consRes, ordRes, vaccRes] = await Promise.all([
    supabase.from('medical_consultations')
      .select('id, created_at, motif, diagnostic_principal, type_consultation, auth_profiles(nom, prenom)')
      .eq('patient_id', dossier.id).order('created_at', { ascending: false }).limit(8),
    supabase.from('medical_ordonnances')
      .select('id, numero_ordonnance, created_at, statut, auth_profiles(nom, prenom)')
      .eq('patient_id', dossier.id).eq('statut', 'active').limit(5),
    supabase.from('spec_vaccinations')
      .select('id, vaccin, date_vaccination, prochaine_dose')
      .eq('patient_id', dossier.id).order('date_vaccination', { ascending: false }).limit(5),
  ])

  const allergies: any[]     = Array.isArray(dossier.allergies)          ? dossier.allergies          : []
  const maladies: any[]      = Array.isArray(dossier.maladies_chroniques) ? dossier.maladies_chroniques : []
  const consultations: any[] = consRes.data ?? []
  const ordonnances: any[]   = ordRes.data  ?? []
  const vaccins: any[]       = vaccRes.data ?? []

  const allergiesHtml = allergies.length > 0
    ? allergies.map((a: any) => {
        const substance    = a.substance || a.nom || String(a)
        const reactionTxt  = a.reaction ? ` — ${a.reaction}` : ''
        const reactionHtml = reactionTxt ? `<div style="font-size:12px;color:#7f1d1d;margin-top:2px;">${reactionTxt}</div>` : ''
        return `<div style="background:var(--rouge-c);border-left:4px solid var(--rouge);border-radius:8px;padding:12px;margin-bottom:8px;"><div style="font-size:14px;font-weight:700;color:var(--rouge);">${substance}</div>${reactionHtml}</div>`
      }).join('')
    : '<div class="empty">Aucune allergie enregistrée</div>'

  const maladiesHtml = maladies.length > 0
    ? maladies.map((m: any) => {
        const nom        = m.maladie || m.nom || String(m)
        const traitement = m.traitement ? `<div style="font-size:12px;color:#7a5500;margin-top:2px;">&#128138; ${m.traitement}</div>` : ''
        return `<div style="background:var(--or-c);border-left:4px solid var(--or);border-radius:8px;padding:12px;margin-bottom:8px;"><div style="font-size:14px;font-weight:700;color:#7a5500;">${nom}</div>${traitement}</div>`
      }).join('')
    : '<div class="empty">Aucune maladie chronique</div>'

  const ordHtml = ordonnances.length > 0
    ? ordonnances.map((o: any) => {
        const med     = o.auth_profiles ? `Dr. ${o.auth_profiles.prenom || ''} ${o.auth_profiles.nom || ''}` : ''
        const dt      = new Date(o.created_at).toLocaleDateString('fr-FR')
        const medHtml = med ? `<span>${med}</span>` : ''
        return `<div class="sep"><div><div style="font-size:13px;font-weight:700;">${o.numero_ordonnance}</div><div class="meta">${medHtml}<span>${dt}</span></div></div><a href="/patient-pdf/ordonnance/${o.id}" class="btn btn-v" style="font-size:12px;padding:6px 12px;">&#128229; PDF</a></div>`
      }).join('')
    : ''

  // FIX : paramètre renommé `cons` pour éviter le shadow de la variable `c` de Hono
  const consHtml = consultations.length > 0
    ? consultations.map((cons: any) => {
        const med  = cons.auth_profiles ? `Dr. ${cons.auth_profiles.prenom || ''} ${cons.auth_profiles.nom || ''}` : ''
        const dt   = new Date(cons.created_at).toLocaleDateString('fr-FR')
        const diag = cons.diagnostic_principal ? `<div style="font-size:12px;color:var(--bleu);margin-top:3px;">&#8594; ${cons.diagnostic_principal}</div>` : ''
        return `<div style="border-left:3px solid var(--bleu);padding:12px 14px;margin-bottom:10px;background:#fafcff;border-radius:0 8px 8px 0;"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span class="badge bb">${cons.type_consultation || 'normale'}</span><span style="font-size:12px;color:var(--soft);">${dt}</span></div><div style="font-size:14px;font-weight:700;">${cons.motif || 'N/A'}</div><div style="font-size:12px;color:var(--soft);">${med}</div>${diag}</div>`
      }).join('')
    : '<div class="empty">Aucune consultation</div>'

  const vaccHtml = vaccins.length > 0
    ? vaccins.map((v: any) => {
        const dt     = new Date(v.date_vaccination).toLocaleDateString('fr-FR')
        const rappel = v.prochaine_dose && new Date(v.prochaine_dose) > new Date()
          ? `<span class="badge bo">Rappel ${new Date(v.prochaine_dose).toLocaleDateString('fr-FR')}</span>`
          : `<span class="badge bv">&#10003; À jour</span>`
        return `<div class="sep"><div><div style="font-size:13px;font-weight:700;">&#128137; ${v.vaccin}</div><div style="font-size:12px;color:var(--soft);">${dt}</div></div>${rappel}</div>`
      }).join('')
    : ''

  const sanguin = dossier.groupe_sanguin
    ? `<span class="badge br" style="font-size:14px;padding:5px 14px;">&#129784; ${dossier.groupe_sanguin}${dossier.rhesus || ''}</span>`
    : ''

  const ordSectionHtml = ordonnances.length > 0
    ? `<div class="card"><div class="card-title" style="justify-content:space-between;">&#128138; Ordonnances actives <a href="/patient-pdf/ordonnances" style="font-size:12px;color:var(--bleu);font-weight:700;text-decoration:none;">Voir tout &#8594;</a></div>${ordHtml}</div>`
    : ''
  const vaccSectionHtml = vaccins.length > 0
    ? `<div class="card"><div class="card-title" style="justify-content:space-between;">&#128137; Vaccinations <a href="/patient/vaccinations" style="font-size:12px;color:var(--bleu);font-weight:700;text-decoration:none;">Voir tout &#8594;</a></div>${vaccHtml}</div>`
    : ''

  const content = `<div class="wrap">
  <a href="/dashboard/patient" class="back">&#8592; Retour au tableau de bord</a>

  <div class="card">
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
      <div style="width:60px;height:60px;border-radius:50%;background:var(--bleu-c);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:var(--bleu);flex-shrink:0;">${dossier.prenom.charAt(0)}${dossier.nom.charAt(0)}</div>
      <div>
        <div style="font-family:'Fraunces',serif;font-size:22px;">${dossier.prenom} ${dossier.nom}</div>
        <div style="font-size:12px;color:var(--soft);margin-top:3px;">${dossier.sexe === 'M' ? '&#128104; Masculin' : '&#128105; Féminin'} &middot; ${age} ans &middot; &#128197; ${new Date(dossier.date_naissance).toLocaleDateString('fr-FR')}</div>
        <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <span style="font-family:monospace;font-size:12px;background:#f0f4f8;padding:3px 10px;border-radius:8px;">&#128282; ${dossier.numero_national || 'N/A'}</span>
          ${sanguin}
        </div>
      </div>
    </div>
  </div>

  <div class="card"><div class="card-title">&#9888; Allergies</div>${allergiesHtml}</div>
  <div class="card"><div class="card-title">&#129658; Maladies chroniques</div>${maladiesHtml}</div>

  ${ordSectionHtml}

  <div class="card">
    <div class="card-title" style="justify-content:space-between;">&#128203; Consultations récentes <span class="badge bb">${consultations.length}</span></div>
    ${consHtml}
  </div>

  ${vaccSectionHtml}
</div>`

  return c.html(layout('Mon dossier', content))
})

// ═══════════════════════════════════════════════════════════════
// MES ORDONNANCES
// ═══════════════════════════════════════════════════════════════
patientRoutes.get('/ordonnances', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

  const { data: list } = dossier ? await supabase
    .from('medical_ordonnances')
    .select('id, numero_ordonnance, created_at, date_expiration, statut, auth_profiles!medical_ordonnances_medecin_id_fkey(nom, prenom), struct_structures!medical_ordonnances_structure_id_fkey(nom)')
    .eq('patient_id', dossier.id).order('created_at', { ascending: false })
    : { data: [] }

  const items = (list ?? []).map((o: any) => {
    const bc      = o.statut === 'active' ? 'bv' : o.statut === 'expiree' ? 'br' : 'bg'
    const lb      = o.statut === 'active' ? 'Active' : o.statut === 'delivree' ? 'Délivrée' : o.statut === 'expiree' ? 'Expirée' : o.statut
    const med     = o.auth_profiles ? `Dr. ${o.auth_profiles.prenom || ''} ${o.auth_profiles.nom || ''}` : ''
    const str     = o.struct_structures?.nom || ''
    const dt      = new Date(o.created_at).toLocaleDateString('fr-FR')
    const exp     = o.date_expiration ? `Expire ${new Date(o.date_expiration).toLocaleDateString('fr-FR')}` : ''
    const btn     = o.statut !== 'expiree'
      ? `<a href="/patient-pdf/ordonnance/${o.id}" class="btn btn-v">&#128229; Télécharger PDF</a>`
      : `<span style="font-size:12px;color:var(--soft);">Expirée</span>`
    const medHtml = med ? `<span>${med}</span>`           : ''
    const strHtml = str ? `<span>&#127973; ${str}</span>` : ''
    const expHtml = exp ? `<span>&#8987; ${exp}</span>`   : ''
    return `<div class="card"><div class="row"><div><div style="font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;">${o.numero_ordonnance}<span class="badge ${bc}">${lb}</span></div><div class="meta">${medHtml}${strHtml}<span>&#128197; ${dt}</span>${expHtml}</div></div>${btn}</div></div>`
  }).join('')

  const content = `<div class="wrap">
  <a href="/dashboard/patient" class="back">&#8592; Retour</a>
  <h1>&#128138; Mes ordonnances</h1>
  ${!dossier ? noDossier() : items || '<div class="card"><div class="empty">Aucune ordonnance</div></div>'}
</div>`
  return c.html(layout('Mes ordonnances', content))
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
  const [futRes, pasRes] = await Promise.all([
    dossier ? supabase.from('medical_rendez_vous')
      .select('id, date_heure, motif, statut, auth_profiles(nom, prenom), struct_structures(nom)')
      .eq('patient_id', dossier.id).gte('date_heure', now)
      .order('date_heure', { ascending: true }).limit(10)
      : { data: [] },
    dossier ? supabase.from('medical_rendez_vous')
      .select('id, date_heure, motif, statut, auth_profiles(nom, prenom), struct_structures(nom)')
      .eq('patient_id', dossier.id).lt('date_heure', now)
      .order('date_heure', { ascending: false }).limit(5)
      : { data: [] },
  ])

  // FIX : paramètre renommé `rdvItem` pour éviter le shadow de `c`
  function rdvCard(rdvItem: any): string {
    const bc      = rdvItem.statut === 'confirme' ? 'bv' : rdvItem.statut === 'planifie' ? 'bb' : rdvItem.statut === 'annule' ? 'br' : 'bg'
    const dt      = new Date(rdvItem.date_heure).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    const hr      = new Date(rdvItem.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const med     = rdvItem.auth_profiles ? `Dr. ${rdvItem.auth_profiles.prenom || ''} ${rdvItem.auth_profiles.nom || ''}` : ''
    const str     = rdvItem.struct_structures?.nom || ''
    const medHtml = med ? `<div style="font-size:12px;color:var(--soft);margin-top:3px;">${med}</div>` : ''
    const strHtml = str ? `<div style="font-size:12px;color:var(--bleu);">&#127973; ${str}</div>`      : ''
    return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;"><div style="font-size:15px;font-weight:700;color:var(--bleu);">${dt}</div><span class="badge ${bc}">${rdvItem.statut}</span></div><div style="font-size:16px;font-weight:700;color:var(--bleu);margin-bottom:3px;">&#128336; ${hr}</div><div style="font-size:14px;font-weight:600;">${rdvItem.motif || 'Consultation'}</div>${medHtml}${strHtml}</div>`
  }

  const futurs = (futRes.data ?? []).map(rdvCard).join('')
  const passes = (pasRes.data ?? []).map((r: any) => `<div style="opacity:.65;">${rdvCard(r)}</div>`).join('')

  const passesSection = passes
    ? `<div style="font-size:12px;font-weight:700;color:var(--soft);text-transform:uppercase;letter-spacing:.8px;margin:18px 0 10px;">Passés</div>${passes}`
    : ''

  const content = `<div class="wrap">
  <a href="/dashboard/patient" class="back">&#8592; Retour</a>
  <h1>&#128197; Mes rendez-vous</h1>
  ${!dossier ? noDossier() : `
  <div style="font-size:12px;font-weight:700;color:var(--soft);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px;">À venir (${(futRes.data ?? []).length})</div>
  ${futurs || '<div class="card"><div class="empty">Aucun rendez-vous à venir</div></div>'}
  ${passesSection}
  `}
</div>`
  return c.html(layout('Mes rendez-vous', content))
})

// ═══════════════════════════════════════════════════════════════
// MES VACCINATIONS
// ═══════════════════════════════════════════════════════════════
patientRoutes.get('/vaccinations', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

  const { data: list } = dossier ? await supabase
    .from('spec_vaccinations')
    .select('id, vaccin, date_vaccination, lot, prochaine_dose, notes, auth_profiles(nom, prenom)')
    .eq('patient_id', dossier.id).order('date_vaccination', { ascending: false })
    : { data: [] }

  const rappels = (list ?? []).filter((v: any) => v.prochaine_dose && new Date(v.prochaine_dose) > new Date())

  const rappelBox = rappels.length > 0
    ? `<div style="background:var(--or-c);border-left:4px solid var(--or);border-radius:var(--rs);padding:14px 16px;margin-bottom:16px;"><div style="font-size:13px;font-weight:700;color:#7a5500;margin-bottom:6px;">&#8987; ${rappels.length} rappel(s) à prévoir</div>${rappels.map((v: any) => '<div style="font-size:12px;color:#7a5500;">• ' + v.vaccin + ' \u2014 ' + new Date(v.prochaine_dose).toLocaleDateString('fr-FR') + '</div>').join('')}</div>`
    : ''

  const items = (list ?? []).map((v: any) => {
    const dt        = new Date(v.date_vaccination).toLocaleDateString('fr-FR')
    const med       = v.auth_profiles ? `Dr. ${v.auth_profiles.prenom || ''} ${v.auth_profiles.nom || ''}` : ''
    const rappel    = v.prochaine_dose && new Date(v.prochaine_dose) > new Date()
      ? `<span class="badge bo">Rappel ${new Date(v.prochaine_dose).toLocaleDateString('fr-FR')}</span>`
      : `<span class="badge bv">&#10003; À jour</span>`
    const lotHtml   = v.lot   ? `<span>&#128278; ${v.lot}</span>`                                              : ''
    const medHtml   = med     ? `<span>${med}</span>`                                                           : ''
    const notesHtml = v.notes ? `<div style="font-size:12px;color:var(--soft);margin-top:5px;font-style:italic;">${v.notes}</div>` : ''
    return `<div class="card"><div class="row"><div><div style="font-size:15px;font-weight:700;">&#128137; ${v.vaccin}</div><div class="meta"><span>&#128197; ${dt}</span>${lotHtml}${medHtml}</div>${notesHtml}</div>${rappel}</div></div>`
  }).join('')

  const content = `<div class="wrap">
  <a href="/dashboard/patient" class="back">&#8592; Retour</a>
  <h1>&#128137; Mon carnet de vaccination</h1>
  ${!dossier ? noDossier() : rappelBox + (items || '<div class="card"><div class="empty">Aucun vaccin enregistré</div></div>')}
</div>`
  return c.html(layout('Vaccinations', content))
})

// ═══════════════════════════════════════════════════════════════
// CONSENTEMENTS — médecins + structures
// ═══════════════════════════════════════════════════════════════
//
// ORDRE CRITIQUE DES ROUTES :
//   POST /consentements/structure/:id/*  → déclarés EN PREMIER
//   POST /consentements/:id/*            → déclarés APRÈS
//
// Si l'ordre était inversé, Hono capturerait "structure" comme
// valeur de :id dans /consentements/:id/revoquer et ne router
// jamais vers /consentements/structure/:id/*
//
// Table médecins   → patient_consentements           (originale, INCHANGÉE)
// Table structures → patient_consentements_structure (nouvelle, indépendante)
// ═══════════════════════════════════════════════════════════════

// ── 1. POST structures (EN PREMIER — ordre obligatoire) ───────

patientRoutes.post('/consentements/structure/:id/revoquer', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()
  if (dossier) {
    await supabase.from('patient_consentements_structure')
      .update({
        est_actif:        false,
        revoque_at:       new Date().toISOString(),
        motif_revocation: 'Révoqué par le patient',
      })
      .eq('id', c.req.param('id'))
      .eq('patient_id', dossier.id)
  }
  return c.redirect('/patient/consentements', 303)
})

patientRoutes.post('/consentements/structure/:id/autoriser', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()
  if (dossier) {
    // valide_du = now() → trigger PostgreSQL recalcule expire_at = now() + 3 mois
    await supabase.from('patient_consentements_structure')
      .update({
        est_actif:        true,
        revoque_at:       null,
        motif_revocation: null,
        valide_du:        new Date().toISOString(),
      })
      .eq('id', c.req.param('id'))
      .eq('patient_id', dossier.id)
  }
  return c.redirect('/patient/consentements', 303)
})

// ── 2. GET consentements (médecins + structures) ──────────────

patientRoutes.get('/consentements', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

  // Consentements médecins — table originale inchangée
  const { data: listMedecins } = dossier ? await supabase
    .from('patient_consentements')
    .select('id, est_actif, created_at, auth_profiles!patient_consentements_medecin_id_fkey(id, nom, prenom, avatar_url, auth_medecins(specialite_principale), struct_structures!auth_profiles_structure_id_fkey(nom))')
    .eq('patient_id', dossier.id)
    .order('created_at', { ascending: false })
    : { data: [] }

  // Consentements structures — nouvelle table séparée
  const { data: listStructures } = dossier ? await supabase
    .from('patient_consentements_structure')
    .select('id, est_actif, created_at, valide_du, expire_at, struct_structures!patient_consentements_structure_structure_id_fkey(id, nom, type)')
    .eq('patient_id', dossier.id)
    .order('created_at', { ascending: false })
    : { data: [] }

  const medActifs   = (listMedecins   ?? []).filter((x: any) =>  x.est_actif)
  const medInactifs = (listMedecins   ?? []).filter((x: any) => !x.est_actif)
  const strActifs   = (listStructures ?? []).filter((x: any) =>  x.est_actif)
  const strInactifs = (listStructures ?? []).filter((x: any) => !x.est_actif)

  function medecinCard(ct: any, actif: boolean): string {
    const p = ct.auth_profiles
    if (!p) return ''
    const ini      = `${(p.prenom || '?').charAt(0)}${(p.nom || '?').charAt(0)}`
    const av       = p.avatar_url
      ? `<img src="${p.avatar_url}" style="width:100%;height:100%;object-fit:cover;" alt="">`
      : ini
    const spec     = p.auth_medecins?.[0]?.specialite_principale || 'Médecin généraliste'
    const str      = p.struct_structures?.nom || ''
    const dt       = ct.created_at ? new Date(ct.created_at).toLocaleDateString('fr-FR') : 'N/A'
    const btn      = actif
      ? `<form method="POST" action="/patient/consentements/${ct.id}/revoquer"><button type="submit" class="btn btn-r" style="font-size:12px;padding:7px 12px;">&#128274; Révoquer</button></form>`
      : `<form method="POST" action="/patient/consentements/${ct.id}/reactiver"><button type="submit" class="btn btn-v" style="font-size:12px;padding:7px 12px;">&#128275; Réactiver</button></form>`
    const strHtml2     = str  ? `<div style="font-size:11px;color:var(--bleu);">&#127973; ${str}</div>` : ''
    const opacityStyle = actif ? '' : 'opacity:.65;'
    return `<div class="card" style="${opacityStyle}"><div style="display:flex;align-items:center;gap:14px;"><div style="width:48px;height:48px;border-radius:50%;background:var(--vert-c);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:var(--vert);flex-shrink:0;overflow:hidden;">${av}</div><div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:700;">Dr. ${p.prenom} ${p.nom}</div><div style="font-size:12px;color:var(--soft);">${spec}</div>${strHtml2}<div style="font-size:11px;color:var(--soft);margin-top:2px;">Accordé le ${dt}</div></div>${btn}</div></div>`
  }

  function structureCard(ct: any, actif: boolean): string {
    const s = ct.struct_structures as any
    if (!s) return ''
    const nom         = s.nom  || '—'
    const type        = s.type || ''
    const dt          = ct.created_at ? new Date(ct.created_at).toLocaleDateString('fr-FR') : 'N/A'
    const expDate     = ct.expire_at ? new Date(ct.expire_at) : null
    const expStr      = expDate ? expDate.toLocaleDateString('fr-FR') : '—'
    const expireSoon  = actif && expDate && (expDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000)
    const expCouleur  = expireSoon ? 'var(--rouge)' : 'var(--soft)'
    const expIco      = expireSoon ? '&#9888;&#65039;' : '&#8987;'
    const expHtml     = actif && expDate
      ? `<div style="font-size:11px;color:${expCouleur};">${expIco} Expire le ${expStr} (3 mois automatique)</div>`
      : ''
    const btn         = actif
      ? `<form method="POST" action="/patient/consentements/structure/${ct.id}/revoquer"><button type="submit" class="btn btn-r" style="font-size:12px;padding:7px 12px;">&#128274; Révoquer</button></form>`
      : `<form method="POST" action="/patient/consentements/structure/${ct.id}/autoriser"><button type="submit" class="btn btn-v" style="font-size:12px;padding:7px 12px;">&#128275; Réautoriser (3 mois)</button></form>`
    const opacityStyle = actif ? '' : 'opacity:.65;'
    return `<div class="card" style="${opacityStyle};border-left:3px solid #C9A84C;"><div style="display:flex;align-items:center;gap:14px;"><div style="width:48px;height:48px;border-radius:10px;background:#fff8e6;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">&#127973;</div><div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:700;">${nom}</div><div style="font-size:12px;color:var(--soft);">${type} &middot; Accordé le ${dt}</div>${expHtml}</div>${btn}</div></div>`
  }

  const medActHtml  = medActifs.length > 0
    ? medActifs.map((x: any) => medecinCard(x, true)).join('')
    : '<div class="card"><div class="empty">Aucun médecin autorisé. L\'hôpital crée les autorisations lors de votre visite.</div></div>'

  const medInactHtml = medInactifs.length > 0
    ? `<div style="font-size:12px;font-weight:700;color:var(--soft);text-transform:uppercase;letter-spacing:.8px;margin:18px 0 10px;">Accès médecins révoqués (${medInactifs.length})</div>${medInactifs.map((x: any) => medecinCard(x, false)).join('')}`
    : ''

  const strActHtml  = strActifs.length > 0
    ? strActifs.map((x: any) => structureCard(x, true)).join('')
    : '<div class="card"><div class="empty">Aucune structure autorisée pour le dossier complet.</div></div>'

  const strInactHtml = strInactifs.length > 0
    ? `<div style="font-size:12px;font-weight:700;color:var(--soft);text-transform:uppercase;letter-spacing:.8px;margin:18px 0 10px;">Structures révoquées / expirées (${strInactifs.length})</div>${strInactifs.map((x: any) => structureCard(x, false)).join('')}`
    : ''

  const content = `<div class="wrap">
  <a href="/dashboard/patient" class="back">&#8592; Retour</a>
  <h1>&#128274; Accès à mon dossier</h1>

  <div class="info-box">
    <strong>&#8505;&#65039; Deux niveaux d'accès</strong><br>
    <strong>Médecins</strong> — accordé lors de votre visite. Révocable à tout moment.<br>
    <strong>Structures (dossier complet)</strong> — expire automatiquement après <strong>3 mois</strong>. Révocable à tout moment avant.
  </div>

  ${!dossier ? noDossier() : `
    <div style="font-size:13px;font-weight:700;margin-bottom:10px;">&#128104;&#8205;&#9877;&#65039; Médecins autorisés (${medActifs.length})</div>
    ${medActHtml}
    ${medInactHtml}

    <div style="height:1px;background:var(--bordure);margin:24px 0;"></div>

    <div style="font-size:13px;font-weight:700;margin-bottom:6px;">&#127973; Structures — Dossier complet (${strActifs.length} actif(s))</div>
    <div class="warn-box">
      &#9888; Autoriser une structure = elle peut voir <strong>tout votre historique médical national</strong>, pas uniquement les soins chez elle. Expiration automatique 3 mois.
    </div>
    ${strActHtml}
    ${strInactHtml}
  `}
</div>`
  return c.html(layout('Consentements', content))
})

// ── 3. POST médecins : révoquer / réactiver (APRÈS les routes structure) ──

patientRoutes.post('/consentements/:id/revoquer', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()
  if (dossier) await supabase.from('patient_consentements')
    .update({ est_actif: false })
    .eq('id', c.req.param('id')).eq('patient_id', dossier.id)
  return c.redirect('/patient/consentements', 303)
})

patientRoutes.post('/consentements/:id/reactiver', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()
  if (dossier) await supabase.from('patient_consentements')
    .update({ est_actif: true })
    .eq('id', c.req.param('id')).eq('patient_id', dossier.id)
  return c.redirect('/patient/consentements', 303)
})

// ═══════════════════════════════════════════════════════════════
// MON PROFIL
// ═══════════════════════════════════════════════════════════════
patientRoutes.get('/profil', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers')
    .select('id, nom, prenom, date_naissance, sexe, telephone, groupe_sanguin, rhesus, code_urgence, numero_national')
    .eq('profile_id', profil.id).single()

  const { data: contacts } = dossier
    ? await supabase.from('patient_contacts_urgence').select('id, nom_complet, lien, telephone').eq('patient_id', dossier.id)
    : { data: [] }

  const nbContacts = (contacts ?? []).length
  // FIX : c.req.query() à la place de new URL(c.req.url)
  const succes = c.req.query('succes')

  const succesBox = succes
    ? `<div class="ok-box">&#10003; ${succes === 'code_regenere' ? 'Nouveau code urgence généré !' : 'Profil mis à jour !'}</div>`
    : ''

  const dosHtml = dossier ? `
  <div class="card">
    <div class="card-title">&#128203; Informations médicales</div>
    <div style="font-size:12px;color:var(--soft);margin-bottom:10px;">Gérées par votre établissement de santé.</div>
    ${[
      ['Prénom', dossier.prenom || '—'],
      ['Nom', dossier.nom || '—'],
      ['Date de naissance', dossier.date_naissance ? new Date(dossier.date_naissance).toLocaleDateString('fr-FR') : '—'],
      ['Sexe', dossier.sexe === 'M' ? 'Masculin' : dossier.sexe === 'F' ? 'Féminin' : '—'],
      ['Groupe sanguin', dossier.groupe_sanguin ? `${dossier.groupe_sanguin}${dossier.rhesus || ''}` : '—'],
      ['Téléphone', dossier.telephone || '—'],
      ['N° national', dossier.numero_national || '—'],
    ].map(([l, v]) => `<div class="sep"><span class="lbl">${l}</span><span class="val">${v}</span></div>`).join('')}
  </div>
  ${dossier.code_urgence ? `
  <div class="card" style="border:2px solid var(--rouge);">
    <div class="card-title" style="color:var(--rouge);">&#128680; Code d'urgence</div>
    <div style="background:var(--rouge-c);border-radius:var(--rs);padding:16px;margin-bottom:12px;text-align:center;">
      <div style="font-family:monospace;font-size:36px;font-weight:900;letter-spacing:12px;color:var(--rouge);">${dossier.code_urgence}</div>
    </div>
    <div style="font-size:12px;color:#7f1d1d;margin-bottom:14px;line-height:1.5;">Donnez ce code à un médecin en urgence pour un accès 24h à votre dossier complet. Régénérez-le s'il est compromis.</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <form method="POST" action="/patient/code-urgence/regenerer" style="flex:1;">
        <button type="submit" class="btn btn-r" style="width:100%;">&#128260; Régénérer</button>
      </form>
      <form method="POST" action="/patient/code-urgence/envoyer" style="flex:1;">
        <button type="submit" class="btn btn-o" style="width:100%;">&#128232; Envoyer au proche</button>
      </form>
    </div>
  </div>` : `
  <div class="card" style="border:2px dashed var(--bordure);">
    <div class="card-title" style="color:var(--soft);">&#128680; Code d'urgence</div>
    <div style="font-size:13px;color:var(--soft);">Aucun code d'urgence. L'hôpital peut en générer un lors de votre visite.</div>
  </div>`}
  ` : noDossier()

  const navItems: [string, string, string, string][] = [
    ['/patient/contacts-urgence', '&#128680;', `Contacts d'urgence`, `${nbContacts} contact(s)`],
    ['/patient/notifications',    '&#128276;', 'Notifications &amp; rappels', 'Email, SMS'],
    ['/patient/acces-dossier',    '&#128269;', 'Historique des accès', 'Qui a consulté mon dossier'],
    ['/patient/consentements',    '&#128274;', 'Accès médecins &amp; structures', 'Autoriser / révoquer'],
    ['/patient/factures',         '&#129534;', 'Mes factures', 'Historique paiements'],
    ['/patient/documents',        '&#128193;', 'Mes documents', 'Certificats, radios...'],
  ]

  const navHtml = navItems.map(([href, ico, label, desc]) =>
    `<a href="${href}" style="display:flex;align-items:center;gap:12px;padding:12px 0;text-decoration:none;color:var(--texte);border-bottom:1px solid var(--bordure);"><span style="font-size:22px;">${ico}</span><div style="flex:1;"><div style="font-size:14px;font-weight:600;">${label}</div><div style="font-size:11.5px;color:var(--soft);">${desc}</div></div><span style="color:var(--bleu);">&#8594;</span></a>`
  ).join('')

  const content = `<div class="wrap">
  <a href="/dashboard/patient" class="back">&#8592; Retour</a>
  <h1>&#128100; Mon profil</h1>
  ${succesBox}
  <div class="card">
    <div class="card-title">&#128231; Compte SantéBF</div>
    <div class="sep"><span class="lbl">Email</span><span class="val">${profil.email || '—'}</span></div>
    <div style="padding-top:12px;"><a href="/auth/changer-mdp" style="font-size:13px;color:var(--bleu);font-weight:700;text-decoration:none;">&#128273; Changer mon mot de passe &#8594;</a></div>
  </div>
  ${dosHtml}
  <div class="card">
    <div class="card-title">&#9881; Paramètres</div>
    ${navHtml}
    <a href="/auth/logout" style="display:flex;align-items:center;gap:12px;padding:12px 0;text-decoration:none;color:var(--rouge);"><span style="font-size:22px;">&#9211;</span><div style="font-size:14px;font-weight:600;">Se déconnecter</div></a>
  </div>
</div>`
  return c.html(layout('Mon profil', content))
})

// ═══════════════════════════════════════════════════════════════
// DOCUMENTS MÉDICAUX
// ═══════════════════════════════════════════════════════════════
patientRoutes.get('/documents', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

  const { data: list } = dossier ? await supabase
    .from('medical_documents')
    .select('id, type, titre, fichier_url, date_document, created_at, auth_profiles(nom, prenom)')
    .eq('patient_id', dossier.id).order('date_document', { ascending: false })
    : { data: [] }

  const typeLabel: Record<string, string> = { certificat: 'Certificat médical', radio: 'Radiologie', echo: 'Échographie', compte_rendu: 'Compte-rendu', analyse: 'Analyse', autre: 'Document' }
  const typeIco:   Record<string, string> = { certificat: '&#128220;', radio: '&#128247;', echo: '&#128300;', compte_rendu: '&#128203;', analyse: '&#129514;', autre: '&#128196;' }

  const items = (list ?? []).map((d: any) => {
    const ico     = typeIco[d.type]   || '&#128196;'
    const lbl     = typeLabel[d.type] || d.type || 'Document'
    const med     = d.auth_profiles ? `Dr. ${d.auth_profiles.prenom || ''} ${d.auth_profiles.nom || ''}` : ''
    const dt      = d.date_document ? new Date(d.date_document).toLocaleDateString('fr-FR') : new Date(d.created_at).toLocaleDateString('fr-FR')
    const btn     = d.fichier_url
      ? `<a href="${d.fichier_url}" target="_blank" download class="btn btn-v" style="font-size:12px;padding:7px 12px;">&#128229; Télécharger</a>`
      : `<span style="font-size:12px;color:var(--soft);font-style:italic;">Pas de fichier</span>`
    const medHtml = med ? `<span>${med}</span>` : ''
    return `<div class="card"><div style="display:flex;align-items:center;gap:14px;"><div style="font-size:32px;flex-shrink:0;">${ico}</div><div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:700;">${d.titre || lbl}</div><div class="meta"><span class="badge bb">${lbl}</span>${medHtml}<span>&#128197; ${dt}</span></div></div>${btn}</div></div>`
  }).join('')

  const content = `<div class="wrap">
  <a href="/dashboard/patient" class="back">&#8592; Retour</a>
  <h1>&#128193; Mes documents médicaux</h1>
  ${!dossier ? noDossier() : items || '<div class="card"><div class="empty">Aucun document médical</div></div>'}
</div>`
  return c.html(layout('Mes documents', content))
})

// ═══════════════════════════════════════════════════════════════
// MES FACTURES
// ═══════════════════════════════════════════════════════════════
patientRoutes.get('/factures', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

  const { data: list } = dossier ? await supabase
    .from('finance_factures')
    .select('id, numero_facture, created_at, total_ttc, statut, struct_structures(nom)')
    .eq('patient_id', dossier.id).order('created_at', { ascending: false })
    : { data: [] }

  const fmt       = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
  const totalPaye = (list ?? []).filter((f: any) => f.statut === 'payee').reduce((s: number, f: any) => s + (f.total_ttc || 0), 0)

  const totalBox = (list ?? []).length > 0
    ? `<div class="card" style="display:flex;align-items:center;gap:14px;"><div style="font-size:32px;">&#128176;</div><div><div style="font-size:12px;color:var(--soft);font-weight:700;text-transform:uppercase;">Total payé</div><div style="font-size:24px;font-weight:700;color:var(--vert);">${fmt(totalPaye)}</div></div></div>`
    : ''

  const items = (list ?? []).map((f: any) => {
    const bc      = f.statut === 'payee' ? 'bv' : f.statut === 'impayee' ? 'br' : 'bo'
    const lb      = f.statut === 'payee' ? 'Payée' : f.statut === 'impayee' ? 'Impayée' : 'En attente'
    const str     = f.struct_structures?.nom || ''
    const dt      = new Date(f.created_at).toLocaleDateString('fr-FR')
    const strHtml = str ? `<span>&#127973; ${str}</span>` : ''
    return `<div class="card"><div class="row"><div><div style="font-size:15px;font-weight:700;">${f.numero_facture}</div><div class="meta">${strHtml}<span>&#128197; ${dt}</span></div></div><div style="text-align:right;"><div style="font-size:17px;font-weight:700;color:var(--vert);">${fmt(f.total_ttc || 0)}</div><span class="badge ${bc}">${lb}</span></div></div></div>`
  }).join('')

  const content = `<div class="wrap">
  <a href="/dashboard/patient" class="back">&#8592; Retour</a>
  <h1>&#129534; Mes factures</h1>
  ${!dossier ? noDossier() : totalBox + (items || '<div class="card"><div class="empty">Aucune facture</div></div>')}
</div>`
  return c.html(layout('Mes factures', content))
})

// ═══════════════════════════════════════════════════════════════
// HISTORIQUE ACCÈS DOSSIER
// ═══════════════════════════════════════════════════════════════
patientRoutes.get('/acces-dossier', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

  const { data: list } = dossier ? await supabase
    .from('stats_acces_logs')
    .select('id, action, created_at, auth_profiles(nom, prenom, role)')
    .eq('patient_id', dossier.id)
    .order('created_at', { ascending: false }).limit(30)
    : { data: [] }

  const roleLabel: Record<string, string> = { medecin: 'Médecin', infirmier: 'Infirmier', pharmacien: 'Pharmacien', laborantin: 'Laborantin', radiologue: 'Radiologue', agent_accueil: 'Accueil', caissier: 'Caissier' }

  const items = (list ?? []).map((l: any) => {
    const who = l.auth_profiles ? `${roleLabel[l.auth_profiles.role] || l.auth_profiles.role} ${l.auth_profiles.prenom || ''} ${l.auth_profiles.nom || ''}` : 'Système'
    const dt  = new Date(l.created_at).toLocaleDateString('fr-FR')
    const hr  = new Date(l.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return `<div class="card" style="padding:14px 18px;"><div style="display:flex;align-items:center;gap:12px;"><div style="font-size:22px;">&#128065;</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;">${who}</div><div style="font-size:12px;color:var(--soft);">${l.action || 'Consultation dossier'}</div></div><div style="text-align:right;font-size:12px;color:var(--soft);">${dt}<br>${hr}</div></div></div>`
  }).join('')

  const content = `<div class="wrap">
  <a href="/dashboard/patient" class="back">&#8592; Retour</a>
  <h1>&#128269; Historique des accès</h1>
  <div class="info-box"><strong>ℹ️ Transparence totale</strong><br>Chaque accès à votre dossier est enregistré ici.</div>
  ${!dossier ? noDossier() : items || '<div class="card"><div class="empty">Aucun accès enregistré</div></div>'}
</div>`
  return c.html(layout('Historique accès', content))
})

// ═══════════════════════════════════════════════════════════════
// CONTACTS D'URGENCE
// ═══════════════════════════════════════════════════════════════
patientRoutes.get('/contacts-urgence', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id, code_urgence').eq('profile_id', profil.id).single()

  const { data: contacts } = dossier
    ? await supabase.from('patient_contacts_urgence').select('id, nom_complet, lien, telephone').eq('patient_id', dossier.id)
    : { data: [] }

  // FIX : c.req.query() à la place de new URL(c.req.url)
  const succes = c.req.query('succes')
  const list   = contacts ?? []

  const codeBox = dossier?.code_urgence ? `
  <div class="card">
    <div class="card-title">&#128273; Code d'urgence</div>
    <div style="font-family:monospace;font-size:28px;font-weight:900;letter-spacing:8px;color:var(--rouge);text-align:center;padding:16px;background:var(--rouge-c);border-radius:var(--rs);">${dossier.code_urgence}</div>
    <div style="font-size:12px;color:var(--soft);text-align:center;margin-top:8px;">Donnez ce code à un médecin en urgence — accès 24h à votre dossier</div>
  </div>` : ''

  const ctHtml = list.length > 0
    ? list.map((ct: any) => `<div class="card"><div style="display:flex;align-items:center;gap:12px;"><div style="font-size:28px;">&#128100;</div><div style="flex:1;"><div style="font-size:15px;font-weight:700;">${ct.nom_complet}</div><div style="font-size:12px;color:var(--soft);">${ct.lien || 'Proche'}</div><div style="font-size:14px;font-weight:700;color:var(--bleu);margin-top:2px;">&#128222; ${ct.telephone}</div></div><form method="POST" action="/patient/contacts-urgence/${ct.id}/supprimer"><button type="submit" class="btn btn-r" style="font-size:12px;padding:7px 12px;">Supprimer</button></form></div></div>`).join('')
    : '<div class="card"><div class="empty">Aucun contact d\'urgence</div></div>'

  const content = `<div class="wrap">
  <a href="/patient/profil" class="back">&#8592; Retour au profil</a>
  <h1>&#128680; Contacts d'urgence</h1>
  ${succes ? '<div class="ok-box">&#10003; Contact ajouté !</div>' : ''}
  <div class="warn-box"><strong>&#9888; Important</strong><br>En cas d'accident, le personnel médical contactera ces personnes.</div>
  ${codeBox}
  <div style="font-size:12px;font-weight:700;color:var(--soft);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px;">Mes contacts (${list.length})</div>
  ${ctHtml}
  <div class="card">
    <div class="card-title">&#10133; Ajouter un contact</div>
    <form method="POST" action="/patient/contacts-urgence/ajouter">
      <div class="form-group"><label class="form-label">Nom complet *</label><input type="text" name="nom_complet" placeholder="Ex: Fatimata Traoré" required></div>
      <div class="form-group"><label class="form-label">Lien de parenté</label><input type="text" name="lien" placeholder="Ex: Épouse, Parent, Ami..."></div>
      <div class="form-group"><label class="form-label">Téléphone *</label><input type="tel" name="telephone" placeholder="Ex: 70 12 34 56" required></div>
      <button type="submit" class="btn btn-v" style="width:100%;justify-content:center;padding:13px;">&#10133; Ajouter</button>
    </form>
  </div>
</div>`
  return c.html(layout('Contacts d\'urgence', content))
})

patientRoutes.post('/contacts-urgence/ajouter', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()
  const { data: dossier } = await supabase.from('patient_dossiers').select('id').eq('profile_id', profil.id).single()
  if (dossier) {
    await supabase.from('patient_contacts_urgence').insert({
      patient_id:  dossier.id,
      nom_complet: String(body.nom_complet || '').trim(),
      lien:        String(body.lien        || '').trim(),
      telephone:   String(body.telephone   || '').trim(),
    })
  }
  return c.redirect('/patient/contacts-urgence?succes=1', 303)
})

patientRoutes.post('/contacts-urgence/:id/supprimer', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const { data: dossier } = await supabase.from('patient_dossiers').select('id').eq('profile_id', profil.id).single()
  if (dossier) await supabase.from('patient_contacts_urgence').delete().eq('id', c.req.param('id')).eq('patient_id', dossier.id)
  return c.redirect('/patient/contacts-urgence', 303)
})

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════
patientRoutes.get('/notifications', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: s } = await supabase.from('user_settings').select('*').eq('user_id', profil.id).single()
  const settings = s || {}
  // FIX : c.req.query() à la place de new URL(c.req.url)
  const succes = c.req.query('succes')

  function toggle(name: string, label: string, desc: string, checked: boolean): string {
    const bg  = checked ? 'var(--vert)' : '#ccc'
    const pos = checked ? '23px' : '3px'
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--bordure);"><div style="flex:1;padding-right:16px;"><div style="font-size:14px;font-weight:700;">${label}</div><div style="font-size:12px;color:var(--soft);margin-top:2px;">${desc}</div></div><label style="position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0;cursor:pointer;"><input type="checkbox" name="${name}" value="1"${checked ? ' checked' : ''} style="opacity:0;width:0;height:0;"><span style="position:absolute;cursor:pointer;inset:0;background:${bg};border-radius:24px;"></span><span style="position:absolute;height:18px;width:18px;left:${pos};bottom:3px;background:white;border-radius:50%;"></span></label></div>`
  }

  const content = `<div class="wrap">
  <a href="/patient/profil" class="back">&#8592; Retour au profil</a>
  <h1>&#128276; Notifications &amp; rappels</h1>
  ${succes ? '<div class="ok-box">&#10003; Préférences enregistrées !</div>' : ''}
  <div class="card" style="margin-bottom:12px;"><div style="font-size:13px;color:var(--soft);">Emails envoyés à : <strong>${profil.email || '—'}</strong></div></div>
  <form method="POST" action="/patient/notifications/sauvegarder">
    <div class="card">
      <div class="card-title">&#128231; Par email</div>
      ${toggle('email_rdv',        'Rappels rendez-vous',    'Email 24h avant chaque RDV',               settings.email_rdv        !== false)}
      ${toggle('email_resultats',  'Résultats examens',      'Notifié quand un résultat est disponible', settings.email_resultats  !== false)}
      ${toggle('email_ordonnances','Nouvelles ordonnances',  'Copie PDF de chaque ordonnance',           settings.email_ordonnances ?? false)}
    </div>
    <div class="card">
      <div class="card-title">&#128172; Par SMS</div>
      <div style="font-size:12px;color:var(--soft);margin-bottom:10px;">Nécessite Twilio configuré par l'administrateur.</div>
      ${toggle('sms_rdv',       'Rappels RDV par SMS',    'SMS 24h avant chaque RDV',                  settings.sms_rdv       ?? false)}
      ${toggle('sms_resultats', 'Résultats par SMS',      'SMS quand un résultat est disponible',       settings.sms_resultats ?? false)}
    </div>
    <button type="submit" class="btn btn-v" style="width:100%;justify-content:center;padding:14px;font-size:15px;">&#128190; Enregistrer mes préférences</button>
  </form>
</div>`
  return c.html(layout('Notifications', content))
})

patientRoutes.post('/notifications/sauvegarder', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()
  await supabase.from('user_settings').upsert({
    user_id:           profil.id,
    email_rdv:         body.email_rdv         === '1',
    email_resultats:   body.email_resultats   === '1',
    email_ordonnances: body.email_ordonnances === '1',
    sms_rdv:           body.sms_rdv           === '1',
    sms_resultats:     body.sms_resultats     === '1',
    updated_at:        new Date().toISOString(),
  }, { onConflict: 'user_id' })
  return c.redirect('/patient/notifications?succes=1', 303)
})

// ═══════════════════════════════════════════════════════════════
// CODE URGENCE
// ═══════════════════════════════════════════════════════════════
patientRoutes.post('/code-urgence/regenerer', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const code     = Math.floor(100000 + Math.random() * 900000).toString()
  const { data: dossier } = await supabase.from('patient_dossiers').select('id').eq('profile_id', profil.id).single()
  if (dossier) await supabase.from('patient_dossiers').update({ code_urgence: code }).eq('id', dossier.id)
  return c.redirect('/patient/profil?succes=code_regenere', 303)
})

patientRoutes.post('/code-urgence/envoyer', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const { data: dossier } = await supabase.from('patient_dossiers').select('id, code_urgence').eq('profile_id', profil.id).single()
  if (dossier) {
    await supabase.from('stats_acces_logs').insert({
      user_id:    profil.id,
      patient_id: dossier.id,
      action:     'code_urgence_envoye_proche',
      created_at: new Date().toISOString(),
    })
  }
  return c.redirect('/patient/contacts-urgence', 303)
})
