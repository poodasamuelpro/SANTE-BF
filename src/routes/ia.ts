/**
 * src/routes/ia.ts
 * SantéBF — Module IA Médicale
 *
 * 3 modèles supportés — le système utilise automatiquement
 * le premier modèle disponible selon les clés configurées,
 * OU celui choisi par l'admin dans les paramètres.
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  MODÈLE 1 — Anthropic Claude Haiku                      │
 * │  Variable : ANTHROPIC_API_KEY                           │
 * │  Obtenir  : console.anthropic.com → API Keys            │
 * │  Prix     : ~0.001$ / requête (5$ gratuits offerts)     │
 * │  Qualité  : ⭐⭐⭐⭐⭐                                    │
 * ├─────────────────────────────────────────────────────────┤
 * │  MODÈLE 2 — Google Gemini Flash-Lite                    │
 * │  Variable : GEMINI_API_KEY                              │
 * │  Obtenir  : aistudio.google.com → Get API key           │
 * │  Prix     : GRATUIT — 15 req/min, 1000 req/jour         │
 * │  Qualité  : ⭐⭐⭐⭐                                     │
 * ├─────────────────────────────────────────────────────────┤
 * │  MODÈLE 3 — BioMistral-7B (HuggingFace)                 │
 * │  Variable : HUGGINGFACE_API_KEY                         │
 * │  Obtenir  : huggingface.co → Settings → Access Tokens   │
 * │  Prix     : GRATUIT (limité) — modèle médical spécialisé│
 * │  Qualité  : ⭐⭐⭐ (lent mais 100% médical)              │
 * └─────────────────────────────────────────────────────────┘
 *
 * PRIORITÉ AUTOMATIQUE (si IA_MODEL n'est pas défini) :
 *   1. Anthropic (si ANTHROPIC_API_KEY présent)
 *   2. Gemini    (si GEMINI_API_KEY présent)
 *   3. BioMistral (si HUGGINGFACE_API_KEY présent)
 *
 * CHOIX ADMIN :
 *   Variable IA_MODEL = 'anthropic' | 'gemini' | 'biomistral'
 *   L'admin peut forcer un modèle depuis Cloudflare Variables
 *   OU depuis /admin/ia (page de configuration)
 *
 * Routes :
 *   GET  /ia/status              → Modèles disponibles + actif
 *   GET  /ia/config              → Page admin choix du modèle
 *   POST /ia/config              → Sauvegarder le choix du modèle
 *   POST /ia/diagnostic          → Aide au diagnostic
 *   POST /ia/interactions        → Vérification interactions médicaments
 *   POST /ia/resume-patient      → Résumé dossier patient
 *   POST /ia/ordonnance-check    → Vérification ordonnance
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'

type IABindings = Bindings & {
  ANTHROPIC_API_KEY?:  string
  GEMINI_API_KEY?:     string
  HUGGINGFACE_API_KEY?: string
  IA_MODEL?:           string   // 'anthropic' | 'gemini' | 'biomistral' | 'auto'
}

export const iaRoutes = new Hono<{ Bindings: IABindings }>()

iaRoutes.use('/*', requireAuth)
iaRoutes.use('/*', requireRole('medecin', 'infirmier', 'sage_femme', 'laborantin', 'radiologue', 'super_admin', 'admin_structure'))

// ══════════════════════════════════════════════════════════
// SÉLECTION AUTOMATIQUE DU MODÈLE
// ══════════════════════════════════════════════════════════

type ModeleIA = 'anthropic' | 'gemini' | 'biomistral' | null

function choisirModele(env: IABindings): ModeleIA {
  // Si l'admin a forcé un modèle
  const force = env.IA_MODEL?.toLowerCase().trim()

  if (force && force !== 'auto') {
    if (force === 'anthropic'  && env.ANTHROPIC_API_KEY)  return 'anthropic'
    if (force === 'gemini'     && env.GEMINI_API_KEY)     return 'gemini'
    if (force === 'biomistral' && env.HUGGINGFACE_API_KEY) return 'biomistral'
    // Modèle forcé mais clé absente → fallback automatique
  }

  // Mode automatique : priorité par ordre
  if (env.ANTHROPIC_API_KEY)   return 'anthropic'
  if (env.GEMINI_API_KEY)      return 'gemini'
  if (env.HUGGINGFACE_API_KEY) return 'biomistral'

  return null // Aucun modèle disponible
}

function nomModele(m: ModeleIA): string {
  if (m === 'anthropic')  return 'Claude Haiku (Anthropic)'
  if (m === 'gemini')     return 'Gemini Flash-Lite (Google)'
  if (m === 'biomistral') return 'BioMistral-7B (HuggingFace)'
  return 'Aucun'
}

// ══════════════════════════════════════════════════════════
// APPEL IA — 3 fonctions selon le modèle
// ══════════════════════════════════════════════════════════

// ── Anthropic Claude ──────────────────────────────────────
async function appelAnthropic(
  apiKey:   string,
  systeme:  string,
  message:  string,
  maxTokens = 800
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system:     systeme,
      messages:   [{ role: 'user', content: message }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
  const data = await res.json() as any
  return data.content?.[0]?.text || ''
}

// ── Google Gemini Flash-Lite ───────────────────────────────
async function appelGemini(
  apiKey:  string,
  systeme: string,
  message: string
): Promise<string> {
  // Gemini Flash-Lite : gratuit, 15 req/min, 1000 req/jour
  const model = 'gemini-2.0-flash-lite'
  const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systeme }] },
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: { maxOutputTokens: 800, temperature: 0.3 },
    }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const data = await res.json() as any
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// ── HuggingFace BioMistral-7B ─────────────────────────────
// BioMistral-7B : modèle médical open source,
// entraîné sur PubMed + littérature médicale,
// 7 milliards de paramètres, rapide, 100% santé
async function appelBioMistral(
  apiKey:  string,
  systeme: string,
  message: string
): Promise<string> {
  const res = await fetch(
    'https://api-inference.huggingface.co/models/BioMistral/BioMistral-7B-DARE',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        inputs: `<s>[INST] ${systeme}\n\n${message} [/INST]`,
        parameters: {
          max_new_tokens: 600,
          temperature:    0.3,
          return_full_text: false,
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    // HuggingFace retourne 503 si le modèle est en train de charger
    if (res.status === 503) {
      throw new Error('BioMistral en cours de chargement (20-30 secondes). Réessayez.')
    }
    throw new Error(`BioMistral ${res.status}: ${err}`)
  }

  const data = await res.json() as any
  // HuggingFace retourne un tableau
  if (Array.isArray(data)) return data[0]?.generated_text || ''
  return data?.generated_text || ''
}

// ── Dispatcher principal ──────────────────────────────────
async function appelIA(
  env:     IABindings,
  systeme: string,
  message: string,
  maxTokens = 800
): Promise<{ reponse: string; modele: ModeleIA }> {

  const modele = choisirModele(env)
  if (!modele) throw new Error('NO_MODEL')

  let reponse = ''
  switch (modele) {
    case 'anthropic':
      reponse = await appelAnthropic(env.ANTHROPIC_API_KEY!, systeme, message, maxTokens)
      break
    case 'gemini':
      reponse = await appelGemini(env.GEMINI_API_KEY!, systeme, message)
      break
    case 'biomistral':
      reponse = await appelBioMistral(env.HUGGINGFACE_API_KEY!, systeme, message)
      break
  }

  return { reponse, modele }
}

// ══════════════════════════════════════════════════════════
// GET /ia/status — Statut des modèles
// ══════════════════════════════════════════════════════════
iaRoutes.get('/status', (c) => {
  const env    = c.env
  const actif  = choisirModele(env)
  const force  = env.IA_MODEL?.toLowerCase() || 'auto'

  return c.json({
    actif:       actif ? nomModele(actif) : null,
    disponibles: {
      anthropic:  !!env.ANTHROPIC_API_KEY,
      gemini:     !!env.GEMINI_API_KEY,
      biomistral: !!env.HUGGINGFACE_API_KEY,
    },
    mode:        force,
    message:     actif
      ? `IA opérationnelle — ${nomModele(actif)}`
      : 'Aucune clé API configurée — ajouter GEMINI_API_KEY ou ANTHROPIC_API_KEY dans Cloudflare',
  })
})

// ══════════════════════════════════════════════════════════
// GET /ia/config — Page admin choix du modèle
// ══════════════════════════════════════════════════════════
iaRoutes.get('/config', requireRole('super_admin', 'admin_structure'), async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  const env    = c.env
  const actif  = choisirModele(env)
  const force  = env.IA_MODEL || 'auto'

  const modeles = [
    {
      id:        'auto',
      nom:       'Automatique',
      desc:      'Utilise le premier modèle disponible selon les clés configurées',
      dispo:     true,
      gratuit:   true,
      badge:     '🤖',
    },
    {
      id:        'anthropic',
      nom:       'Claude Haiku',
      desc:      'Anthropic — Meilleure qualité, ~0.001$/requête, 5$ offerts',
      dispo:     !!env.ANTHROPIC_API_KEY,
      gratuit:   false,
      badge:     '⭐⭐⭐⭐⭐',
    },
    {
      id:        'gemini',
      nom:       'Gemini Flash-Lite',
      desc:      'Google — 100% gratuit, 15 req/min, 1000 req/jour, sans carte',
      dispo:     !!env.GEMINI_API_KEY,
      gratuit:   true,
      badge:     '🆓 ⭐⭐⭐⭐',
    },
    {
      id:        'biomistral',
      nom:       'BioMistral-7B',
      desc:      'HuggingFace — Modèle médical spécialisé, gratuit, peut être lent',
      dispo:     !!env.HUGGINGFACE_API_KEY,
      gratuit:   true,
      badge:     '🏥 ⭐⭐⭐',
    },
  ]

  const cartes = modeles.map(m => `
    <div style="background:${force===m.id?'#e8f5ee':'white'};border:2px solid ${force===m.id?'#1A6B3C':'#e0e0e0'};
      border-radius:12px;padding:20px;margin-bottom:12px;display:flex;align-items:center;gap:16px;cursor:pointer"
      onclick="document.getElementById('model_${m.id}').click()">
      <input type="radio" name="ia_model" id="model_${m.id}" value="${m.id}"
        ${force===m.id?'checked':''} style="width:18px;height:18px;accent-color:#1A6B3C">
      <div style="flex:1">
        <div style="font-size:16px;font-weight:700;margin-bottom:4px">${m.badge} ${m.nom}</div>
        <div style="font-size:13px;color:#6b7280">${m.desc}</div>
        ${!m.dispo?'<div style="font-size:12px;color:#B71C1C;margin-top:4px">⚠️ Clé API non configurée dans Cloudflare</div>':''}
      </div>
      ${m.gratuit?'<span style="background:#e8f5ee;color:#1A6B3C;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700">GRATUIT</span>':'<span style="background:#e3f2fd;color:#1565C0;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700">PAYANT</span>'}
    </div>
  `).join('')

  return c.html(`<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Configuration IA — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:#f7f8fa;min-height:100vh;color:#0f1923}
header{background:#1A6B3C;height:56px;display:flex;align-items:center;padding:0 24px;justify-content:space-between}
.hl{font-family:'DM Serif Display',serif;font-size:18px;color:white}
.wrap{max-width:700px;margin:0 auto;padding:32px 20px}
h1{font-family:'DM Serif Display',serif;font-size:24px;margin-bottom:8px}
.info-box{background:#e3f2fd;border-left:4px solid #1565C0;border-radius:9px;padding:14px 16px;font-size:13px;color:#1a3a6b;margin-bottom:24px;line-height:1.6}
.btn{background:#1A6B3C;color:white;border:none;padding:13px 28px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;width:100%;margin-top:8px}
.btn:hover{background:#0d4a2a}
.actif{background:#e8f5ee;border-left:4px solid #1A6B3C;border-radius:9px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#0d4a2a;font-weight:600}
</style></head><body>
<header><div class="hl">🏥 SantéBF</div><a href="/dashboard/medecin" style="color:rgba(255,255,255,.7);font-size:13px;text-decoration:none">← Retour</a></header>
<div class="wrap">
  <h1>🤖 Configuration IA Médicale</h1>
  <p style="color:#6b7280;margin-bottom:20px;font-size:14px">Choisissez le modèle d'IA à utiliser pour les assistants médicaux.</p>
  
  ${actif ? `<div class="actif">✅ Modèle actif : <strong>${nomModele(actif)}</strong></div>` : '<div style="background:#fff5f5;border-left:4px solid #B71C1C;border-radius:9px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#B71C1C;font-weight:600">❌ Aucun modèle configuré — ajoutez une clé API dans Cloudflare</div>'}

  <div class="info-box">
    ℹ️ Le modèle sélectionné ici est sauvegardé dans Supabase et appliqué à tous les médecins de la plateforme.
    Pour forcer un modèle via Cloudflare, ajouter la variable <strong>IA_MODEL</strong> = <code>anthropic</code> / <code>gemini</code> / <code>biomistral</code> / <code>auto</code>
  </div>

  <form method="POST" action="/ia/config">
    ${cartes}
    <button type="submit" class="btn">💾 Enregistrer le choix</button>
  </form>

  <div style="margin-top:24px;background:white;border-radius:12px;padding:20px;border:1px solid #e0e0e0">
    <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Variables Cloudflare à configurer</div>
    ${[
      ['ANTHROPIC_API_KEY', 'sk-ant-api03-...', 'console.anthropic.com', !!env.ANTHROPIC_API_KEY],
      ['GEMINI_API_KEY', 'AIzaSy...', 'aistudio.google.com', !!env.GEMINI_API_KEY],
      ['HUGGINGFACE_API_KEY', 'hf_...', 'huggingface.co → Settings → Tokens', !!env.HUGGINGFACE_API_KEY],
    ].map(([nom, ex, url, ok]) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0f0f0">
        <div>
          <div style="font-family:monospace;font-size:13px;font-weight:600">${nom}</div>
          <div style="font-size:11px;color:#9e9e9e">${ex} — <a href="https://${url}" target="_blank" style="color:#1565C0">${url}</a></div>
        </div>
        <span style="background:${ok?'#e8f5ee':'#fff5f5'};color:${ok?'#1A6B3C':'#B71C1C'};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700">${ok?'✅ Configurée':'❌ Manquante'}</span>
      </div>
    `).join('')}
  </div>
</div>
</body></html>`)
})

// ══════════════════════════════════════════════════════════
// POST /ia/config — Sauvegarder le choix du modèle
// ══════════════════════════════════════════════════════════
iaRoutes.post('/config', requireRole('super_admin', 'admin_structure'), async (c) => {
  const sb     = c.get('supabase' as never) as any
  const profil = c.get('profil' as never) as AuthProfile
  const body   = await c.req.parseBody()
  const model  = String(body.ia_model || 'auto')

  // Sauvegarder dans Supabase (table config globale)
  await sb.from('config_global').upsert({
    cle:       'ia_model',
    valeur:    model,
    modifie_par: profil.id,
  }, { onConflict: 'cle' }).catch(() => {})

  return c.redirect('/ia/config?saved=1', 303)
})

// ══════════════════════════════════════════════════════════
// POST /ia/diagnostic
// ══════════════════════════════════════════════════════════
iaRoutes.post('/diagnostic', async (c) => {
  try {
    const modele = choisirModele(c.env)
    if (!modele) return c.json({ error: 'IA non configurée', code: 'NO_MODEL' }, 503)

    const body      = await c.req.json() as any
    const symptomes = String(body.symptomes || '').trim()
    const contexte  = String(body.contexte  || '').trim()
    if (!symptomes) return c.json({ error: 'Symptômes requis' }, 400)

    const systeme = `Tu es un assistant médical pour SantéBF, plateforme de santé au Burkina Faso.
Tu aides les médecins avec des suggestions de diagnostic différentiel.
Contexte : Afrique de l'Ouest, maladies tropicales fréquentes (paludisme, typhoïde, méningite, etc.).
IMPORTANT : Tu fournis des suggestions à titre indicatif uniquement. Le médecin reste seul responsable du diagnostic final.
Réponds en français, de façon concise et structurée.`

    const message = `Symptômes : ${symptomes}${contexte ? `\nContexte patient : ${contexte}` : ''}

Propose les 3-5 diagnostics différentiels les plus probables avec :
1. Nom du diagnostic
2. Probabilité (élevée/moyenne/faible)
3. Examens complémentaires recommandés
4. Points de vigilance`

    const { reponse } = await appelIA(c.env, systeme, message)

    // Logger l'utilisation (non bloquant)
    const profil = c.get('profil' as never) as AuthProfile
    const sb     = c.get('supabase' as never) as any
    if (sb) {
      await sb.from('usage_ia_logs').insert({
        structure_id:   profil.structure_id,
        user_id:        profil.id,
        fonctionnalite: 'diagnostic',
        modele:         nomModele(modele),
        tokens_approx:  Math.ceil((message.length + reponse.length) / 4),
      }).catch(() => {})
    }

    return c.json({ suggestion: reponse, modele: nomModele(modele), success: true })

  } catch (err: any) {
    const msg = err?.message || 'Erreur IA'
    if (msg.includes('NO_MODEL')) return c.json({ error: 'Aucun modèle IA configuré', code: 'NO_MODEL' }, 503)
    return c.json({ error: msg }, 500)
  }
})

// ══════════════════════════════════════════════════════════
// POST /ia/interactions
// ══════════════════════════════════════════════════════════
iaRoutes.post('/interactions', async (c) => {
  try {
    const modele = choisirModele(c.env)
    if (!modele) return c.json({ error: 'IA non configurée', code: 'NO_MODEL' }, 503)

    const body        = await c.req.json() as any
    const medicaments = Array.isArray(body.medicaments)
      ? body.medicaments.map((m: any) => String(m)).join(', ')
      : String(body.medicaments || '')
    if (!medicaments) return c.json({ error: 'Liste de médicaments requise' }, 400)

    const systeme = `Tu es un pharmacologue assistant pour SantéBF au Burkina Faso.
Analyse les interactions médicamenteuses.
Réponds en français. Classe les interactions : GRAVE / MODÉRÉE / MINEURE / AUCUNE.`

    const message = `Médicaments prescrits ensemble : ${medicaments}

Analyse les interactions potentielles :
1. Les interactions identifiées (gravité + description courte)
2. Les recommandations (surveillance, contre-indication, ajustement dose)
3. Verdict global : prescription sûre ou à réviser ?`

    const { reponse } = await appelIA(c.env, systeme, message, 600)
    return c.json({ analyse: reponse, modele: nomModele(modele), success: true })

  } catch (err: any) {
    return c.json({ error: err?.message || 'Erreur IA' }, 500)
  }
})

// ══════════════════════════════════════════════════════════
// POST /ia/resume-patient
// ══════════════════════════════════════════════════════════
iaRoutes.post('/resume-patient', async (c) => {
  try {
    const modele = choisirModele(c.env)
    if (!modele) return c.json({ error: 'IA non configurée', code: 'NO_MODEL' }, 503)

    const body    = await c.req.json() as any
    const dossier = body.dossier as any
    if (!dossier) return c.json({ error: 'Données dossier requises' }, 400)

    const systeme = `Tu es un assistant médical pour SantéBF. Tu génères des résumés de dossiers patients clairs et concis pour les médecins.
Réponds en français, structuré, maximum 300 mots.`

    const message = `Génère un résumé médical concis de ce patient :

Patient : ${dossier.prenom} ${dossier.nom}, ${dossier.age || '—'} ans, ${dossier.sexe || '—'}
Groupe sanguin : ${dossier.groupe_sanguin || '—'}${dossier.rhesus || ''}
Allergies : ${dossier.allergies?.length ? dossier.allergies.map((a: any) => a.substance || a).join(', ') : 'Aucune connue'}
Maladies chroniques : ${dossier.maladies_chroniques?.length ? dossier.maladies_chroniques.map((m: any) => m.maladie || m).join(', ') : 'Aucune'}
Dernières consultations : ${dossier.consultations || 'Non disponible'}

Fais un résumé structuré : état général, points d'attention, historique pertinent.`

    const { reponse } = await appelIA(c.env, systeme, message)
    return c.json({ resume: reponse, modele: nomModele(modele), success: true })

  } catch (err: any) {
    return c.json({ error: err?.message || 'Erreur IA' }, 500)
  }
})

// ══════════════════════════════════════════════════════════
// POST /ia/ordonnance-check
// ══════════════════════════════════════════════════════════
iaRoutes.post('/ordonnance-check', async (c) => {
  try {
    const modele = choisirModele(c.env)
    if (!modele) return c.json({ error: 'IA non configurée', code: 'NO_MODEL' }, 503)

    const body        = await c.req.json() as any
    const diagnostic  = String(body.diagnostic || '')
    const medicaments = body.medicaments as any[]
    const patient     = body.patient as any
    if (!medicaments?.length) return c.json({ error: 'Médicaments requis' }, 400)

    const medsText = medicaments
      .map((m: any) => `${m.nom} ${m.dosage || ''} — ${m.frequence || ''} pendant ${m.duree || ''}`)
      .join('\n')

    const systeme = `Tu es un assistant de vérification d'ordonnances pour SantéBF au Burkina Faso.
Vérifie la cohérence et la sécurité des prescriptions. Sois concis et pratique.`

    const message = `Vérifie cette ordonnance :

Diagnostic : ${diagnostic || 'Non précisé'}
Patient : ${patient?.age || '—'} ans, ${patient?.poids || '—'} kg
Allergies : ${patient?.allergies || 'aucune'}

Médicaments :
${medsText}

Vérifie :
1. Cohérence diagnostic/traitement
2. Dosages appropriés pour le patient
3. Interactions entre les médicaments
4. Durées de traitement
5. Verdict : ✅ Ordonnance correcte ou ⚠️ Points à revoir`

    const { reponse } = await appelIA(c.env, systeme, message)
    return c.json({ verification: reponse, modele: nomModele(modele), success: true })

  } catch (err: any) {
    return c.json({ error: err?.message || 'Erreur IA' }, 500)
  }
})
