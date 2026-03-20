/**
 * src/routes/ia.ts
 * SantéBF — Module IA Médicale
 *
 * ÉTAT : Prêt — en attente de la clé API Anthropic
 *
 * Pour activer :
 *   1. Aller sur console.anthropic.com
 *   2. Créer un compte (gratuit pour commencer)
 *   3. Aller dans API Keys → Create Key
 *   4. Copier la clé (commence par sk-ant-...)
 *   5. Dans Cloudflare Pages → Settings → Variables d'environnement
 *   6. Ajouter : ANTHROPIC_API_KEY = sk-ant-votre-clé
 *   7. Décommenter l'import dans functions/[[path]].ts
 *
 * PRIX Anthropic (modèle Claude Haiku — le moins cher) :
 *   - $0.25 / million de tokens en entrée
 *   - $1.25 / million de tokens en sortie
 *   - Une consultation typique = ~500 tokens = environ $0.001
 *   - Très abordable pour un usage médical
 *
 * Modèles disponibles :
 *   - claude-haiku-4-5-20251001  → Rapide et économique (recommandé)
 *   - claude-sonnet-4-6          → Plus intelligent, plus cher
 *
 * Routes :
 *   POST /ia/diagnostic          → Aide au diagnostic différentiel
 *   POST /ia/interactions        → Vérifier interactions médicamenteuses
 *   POST /ia/resume-patient      → Résumé automatique du dossier
 *   POST /ia/ordonnance-check    → Vérifier une ordonnance
 *   GET  /ia/status              → Vérifier si l'IA est active
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'

type IABindings = Bindings & {
  ANTHROPIC_API_KEY?: string
}

export const iaRoutes = new Hono<{ Bindings: IABindings }>()

iaRoutes.use('/*', requireAuth)
iaRoutes.use('/*', requireRole('medecin', 'infirmier', 'sage_femme', 'laborantin', 'radiologue', 'super_admin', 'admin_structure'))

// ── Vérifier si l'IA est active ──────────────────────────────
iaRoutes.get('/status', (c) => {
  const active = !!c.env.ANTHROPIC_API_KEY
  return c.json({
    active,
    message: active
      ? 'IA médicale SantéBF opérationnelle'
      : 'ANTHROPIC_API_KEY non configurée — ajouter dans Cloudflare Pages Variables',
  })
})

// ── Helper appel API Anthropic ────────────────────────────────
async function appelClaude(
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

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${err}`)
  }

  const data = await res.json() as any
  return data.content?.[0]?.text || ''
}

// ── POST /ia/diagnostic ───────────────────────────────────────
// Aide au diagnostic différentiel basé sur les symptômes
iaRoutes.post('/diagnostic', async (c) => {
  try {
    if (!c.env.ANTHROPIC_API_KEY) {
      return c.json({ error: 'IA non configurée', code: 'NO_API_KEY' }, 503)
    }

    const body     = await c.req.json() as any
    const symptomes = String(body.symptomes || '').trim()
    const contexte  = String(body.contexte  || '').trim() // âge, sexe, antécédents

    if (!symptomes) {
      return c.json({ error: 'Symptômes requis' }, 400)
    }

    const systeme = `Tu es un assistant médical pour SantéBF, une plateforme de santé au Burkina Faso.
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

    const reponse = await appelClaude(c.env.ANTHROPIC_API_KEY, systeme, message)

    // Logger l'utilisation
    const profil = c.get('profil' as never) as AuthProfile
    const sb     = c.get('supabase' as never) as any
    if (sb) {
      await sb.from('usage_ia_logs').insert({
        structure_id:    profil.structure_id,
        user_id:         profil.id,
        fonctionnalite:  'diagnostic',
        tokens_approx:   Math.ceil((message.length + reponse.length) / 4),
      }).catch(() => {}) // Non bloquant
    }

    return c.json({ suggestion: reponse, success: true })

  } catch (err) {
    console.error('IA diagnostic error:', err)
    return c.json({ error: 'Erreur IA', details: err instanceof Error ? err.message : 'Inconnue' }, 500)
  }
})

// ── POST /ia/interactions ─────────────────────────────────────
// Vérifier les interactions entre médicaments
iaRoutes.post('/interactions', async (c) => {
  try {
    if (!c.env.ANTHROPIC_API_KEY) {
      return c.json({ error: 'IA non configurée', code: 'NO_API_KEY' }, 503)
    }

    const body        = await c.req.json() as any
    const medicaments = Array.isArray(body.medicaments)
      ? body.medicaments.map((m: any) => String(m)).join(', ')
      : String(body.medicaments || '')

    if (!medicaments) {
      return c.json({ error: 'Liste de médicaments requise' }, 400)
    }

    const systeme = `Tu es un pharmacologue assistant pour SantéBF au Burkina Faso.
Analyse les interactions médicamenteuses.
Réponds en français, de façon concise. Classe les interactions : GRAVE / MODÉRÉE / MINEURE / AUCUNE.`

    const message = `Médicaments prescrits ensemble : ${medicaments}

Analyse les interactions potentielles et indique :
1. Les interactions identifiées (gravité + description courte)
2. Les recommandations (surveillance, contre-indication, ajustement dose)
3. Verdict global : prescription sûre ou à réviser ?`

    const reponse = await appelClaude(c.env.ANTHROPIC_API_KEY, systeme, message, 600)

    return c.json({ analyse: reponse, success: true })

  } catch (err) {
    console.error('IA interactions error:', err)
    return c.json({ error: 'Erreur IA' }, 500)
  }
})

// ── POST /ia/resume-patient ───────────────────────────────────
// Résumé automatique du dossier patient
iaRoutes.post('/resume-patient', async (c) => {
  try {
    if (!c.env.ANTHROPIC_API_KEY) {
      return c.json({ error: 'IA non configurée', code: 'NO_API_KEY' }, 503)
    }

    const body    = await c.req.json() as any
    const dossier = body.dossier as any // dossier patient complet

    if (!dossier) {
      return c.json({ error: 'Données dossier requises' }, 400)
    }

    const systeme = `Tu es un assistant médical pour SantéBF. Tu génères des résumés de dossiers patients clairs et concis pour les médecins.
Réponds en français, structuré, maximum 300 mots.`

    const message = `Génère un résumé médical concis de ce patient pour un médecin.

Patient : ${dossier.prenom} ${dossier.nom}, ${dossier.age || '—'} ans, ${dossier.sexe || '—'}
Groupe sanguin : ${dossier.groupe_sanguin || '—'}${dossier.rhesus || ''}
Allergies : ${dossier.allergies?.length ? dossier.allergies.map((a: any) => a.substance || a).join(', ') : 'Aucune connue'}
Maladies chroniques : ${dossier.maladies_chroniques?.length ? dossier.maladies_chroniques.map((m: any) => m.maladie || m).join(', ') : 'Aucune'}
Dernières consultations : ${dossier.consultations || 'Non disponible'}

Fais un résumé structuré : état général, points d'attention, historique pertinent.`

    const reponse = await appelClaude(c.env.ANTHROPIC_API_KEY, systeme, message)

    return c.json({ resume: reponse, success: true })

  } catch (err) {
    console.error('IA resume error:', err)
    return c.json({ error: 'Erreur IA' }, 500)
  }
})

// ── POST /ia/ordonnance-check ─────────────────────────────────
// Vérifier la cohérence d'une ordonnance
iaRoutes.post('/ordonnance-check', async (c) => {
  try {
    if (!c.env.ANTHROPIC_API_KEY) {
      return c.json({ error: 'IA non configurée', code: 'NO_API_KEY' }, 503)
    }

    const body        = await c.req.json() as any
    const diagnostic  = String(body.diagnostic  || '')
    const medicaments = body.medicaments as any[]
    const patient     = body.patient     as any

    if (!medicaments?.length) {
      return c.json({ error: 'Médicaments requis' }, 400)
    }

    const medsText = medicaments
      .map((m: any) => `${m.nom} ${m.dosage || ''} — ${m.frequence || ''} pendant ${m.duree || ''}`)
      .join('\n')

    const systeme = `Tu es un assistant de vérification d'ordonnances pour SantéBF au Burkina Faso.
Vérifie la cohérence et la sécurité des prescriptions. Sois concis et pratique.`

    const message = `Vérifie cette ordonnance :

Diagnostic : ${diagnostic || 'Non précisé'}
Patient : ${patient?.age || '—'} ans, ${patient?.poids || '—'} kg, allergies : ${patient?.allergies || 'aucune'}

Médicaments prescrits :
${medsText}

Vérifie :
1. Cohérence diagnostic/traitement
2. Dosages appropriés pour le patient
3. Interactions entre les médicaments
4. Durées de traitement
5. Verdict : ✅ Ordonnance correcte ou ⚠️ Points à revoir`

    const reponse = await appelClaude(c.env.ANTHROPIC_API_KEY, systeme, message)

    return c.json({ verification: reponse, success: true })

  } catch (err) {
    console.error('IA ordonnance error:', err)
    return c.json({ error: 'Erreur IA' }, 500)
  }
})
