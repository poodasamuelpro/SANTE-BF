/**
 * src/middleware/plan.ts
 * SantéBF — Middleware contrôle plan d'abonnement
 *
 * USAGE dans une route :
 *   import { requirePlan } from '../middleware/plan'
 *   medecinRoutes.get('/ia/...', requirePlan('standard','pro','enterprise'), handler)
 *
 * COMPORTEMENT ACTUEL : toutes les fonctions retournent next()
 * → Tout le monde a accès, rien n'est bloqué
 * → Quand tu veux activer : décommenter le bloc de vérification
 *
 * PLANS :
 *   gratuit    → accès de base (dossier patient, consultation, RDV)
 *   starter    → + PDF, pharmacien, notifications (40 000 FCFA/mois)
 *   standard   → + Labo, grossesse, facturation, IA limitée (90 000 FCFA/mois)
 *   pro        → + Hospit, IA illimitée, SMS illimités (120 000 FCFA/mois)
 *   enterprise → API publique, SLA, support (sur devis)
 *   pilote     → accès complet gratuit (structures partenaires)
 */

import type { Context, Next } from 'hono'

// ─── Page "fonctionnalité non activée" ───────────────────────
function pagePlanRequis(planMinimum: string): string {
  const prix: Record<string, string> = {
    starter:    '40 000 FCFA/mois',
    standard:   '90 000 FCFA/mois',
    pro:        '120 000 FCFA/mois',
    enterprise: 'Sur devis',
  }
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fonctionnalité non disponible — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:#f0f4f8;min-height:100vh;
  display:flex;align-items:center;justify-content:center;padding:20px;}
.box{background:white;border-radius:20px;padding:48px 40px;max-width:460px;
  width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);}
.ico{font-size:52px;margin-bottom:16px;}
h1{font-family:'Fraunces',serif;font-size:24px;color:#0f1923;margin-bottom:10px;}
p{color:#5a6a78;font-size:14px;line-height:1.6;margin-bottom:6px;}
.plan-badge{display:inline-block;background:#E8F5EE;color:#1A6B3C;
  padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;margin:14px 0;}
.prix{font-family:'Fraunces',serif;font-size:26px;color:#1A6B3C;margin-bottom:4px;}
.actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:24px;}
.btn{padding:11px 22px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;}
.btn-vert{background:#1A6B3C;color:white;}
.btn-soft{background:#f0f4f8;color:#374151;border:1px solid #E0E0E0;}
</style>
</head>
<body>
<div class="box">
  <div class="ico">🔒</div>
  <h1>Fonctionnalité non disponible</h1>
  <p>Cette fonctionnalité nécessite le plan</p>
  <div class="plan-badge">${planMinimum.charAt(0).toUpperCase() + planMinimum.slice(1)}</div>
  <div class="prix">${prix[planMinimum] ?? 'Sur devis'}</div>
  <p style="font-size:12px;color:#9CA3AF;">Contactez votre administrateur pour activer cette fonctionnalité.</p>
  <div class="actions">
    <a href="javascript:history.back()" class="btn btn-soft">← Retour</a>
    <a href="/dashboard/structure" class="btn btn-vert">Gérer l'abonnement</a>
  </div>
</div>
</body>
</html>`
}

function pageExpire(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Abonnement expiré — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:#fff5f5;min-height:100vh;
  display:flex;align-items:center;justify-content:center;padding:20px;}
.box{background:white;border-radius:20px;padding:48px 40px;max-width:460px;
  width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);}
.ico{font-size:52px;margin-bottom:16px;}
h1{font-family:'Fraunces',serif;font-size:24px;color:#B71C1C;margin-bottom:10px;}
p{color:#5a6a78;font-size:14px;line-height:1.6;margin-bottom:6px;}
.actions{display:flex;gap:10px;justify-content:center;margin-top:24px;}
.btn{padding:11px 22px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;}
.btn-rouge{background:#B71C1C;color:white;}
.btn-soft{background:#f0f4f8;color:#374151;}
</style>
</head>
<body>
<div class="box">
  <div class="ico">⏰</div>
  <h1>Abonnement expiré</h1>
  <p>L'abonnement de votre structure est arrivé à expiration.</p>
  <p>Contactez le super administrateur SantéBF pour renouveler.</p>
  <div class="actions">
    <a href="/auth/logout" class="btn btn-soft">Déconnexion</a>
    <a href="/dashboard/structure" class="btn btn-rouge">Renouveler</a>
  </div>
</div>
</body>
</html>`
}

// ─── Middleware principal ─────────────────────────────────────

export function requirePlan(...plans: string[]) {
  return async (c: Context, next: Next) => {
    const profil = c.get('profil') as any
    if (!profil?.structure_id) { await next(); return }

    // super_admin passe toujours
    if (profil?.role === 'super_admin') { await next(); return }

    const supabase = c.get('supabase') as any
    const { data: struct } = await supabase
      .from('struct_structures')
      .select('plan_actif, abonnement_expire_at, est_pilote')
      .eq('id', profil.structure_id)
      .single()

    if (!struct) { await next(); return }

    // Structures pilotes : accès complet
    if (struct.est_pilote) { await next(); return }

    // Vérifier expiration
    if (struct.abonnement_expire_at && new Date(struct.abonnement_expire_at) < new Date()) {
      await supabase.from('struct_structures')
        .update({ plan_actif: 'suspendu' })
        .eq('id', profil.structure_id)
      return c.html(pageExpire(), 402)
    }

    const planActif = struct?.plan_actif ?? 'gratuit'

    // Plan pilote : accès complet
    if (planActif === 'pilote') { await next(); return }

    if (!plans.includes(planActif)) {
      return c.html(pagePlanRequis(plans[0]), 402)
    }

    await next()
  }
}

// ─── Middleware IA ────────────────────────────────────────────

function pageIANonActivee(fonctionnalite: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Module IA non disponible — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:#f0f4f8;min-height:100vh;
  display:flex;align-items:center;justify-content:center;padding:20px;}
.box{background:white;border-radius:20px;padding:48px 40px;max-width:460px;
  width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);}
h1{font-family:'Fraunces',serif;font-size:24px;color:#0f1923;margin-bottom:10px;}
p{color:#5a6a78;font-size:14px;line-height:1.6;margin-bottom:6px;}
.actions{display:flex;gap:10px;justify-content:center;margin-top:24px;}
.btn{padding:11px 22px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;background:#f0f4f8;color:#374151;}
</style>
</head>
<body>
<div class="box">
  <div style="font-size:52px;margin-bottom:16px;">🤖</div>
  <h1>Module IA non activé</h1>
  <p>Le module <strong>${fonctionnalite.replace(/_/g,' ')}</strong> n'est pas encore activé pour votre structure.</p>
  <p>Contactez votre administrateur pour activer ce module.</p>
  <div class="actions">
    <a href="javascript:history.back()" class="btn">← Retour</a>
  </div>
</div>
</body>
</html>`
}

export function requireIA(fonctionnalite: string) {
  return async (c: Context, next: Next) => {
    const profil   = c.get('profil') as any
    const supabase = c.get('supabase') as any

    // super_admin passe toujours
    if (profil?.role === 'super_admin') { await next(); return }

    if (!profil?.structure_id) { await next(); return }

    // Vérifier le plan de la structure pour l'IA
    const { data: struct } = await supabase
      .from('struct_structures')
      .select('plan_actif, est_pilote, abonnement_expire_at')
      .eq('id', profil.structure_id)
      .single()

    if (!struct) { await next(); return }
    if (struct.est_pilote) { await next(); return }

    // Vérifier expiration
    if (struct.abonnement_expire_at && new Date(struct.abonnement_expire_at) < new Date()) {
      return c.json({ error: 'Abonnement expire', upgrade: true }, 402)
    }

    const planActif = struct?.plan_actif ?? 'gratuit'

    // Plans avec IA : standard (limité) et pro (illimité)
    if (!['standard', 'pro', 'pilote'].includes(planActif)) {
      const accept = c.req.header('Accept') || ''
      if (accept.includes('application/json')) {
        return c.json({ error: 'Module IA non disponible sur votre plan', code: 'PLAN_REQUIRED', upgrade: true }, 402)
      }
      return c.html(pageIANonActivee(fonctionnalite), 402)
    }

    // Standard : quota mensuel limité (50 requêtes/mois)
    if (planActif === 'standard') {
      const debut_mois = new Date()
      debut_mois.setDate(1)
      debut_mois.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('usage_ia_logs')
        .select('*', { count: 'exact', head: true })
        .eq('structure_id', profil.structure_id)
        .gte('created_at', debut_mois.toISOString())

      if ((count ?? 0) >= 50) {
        const accept = c.req.header('Accept') || ''
        if (accept.includes('application/json')) {
          return c.json({ error: 'Quota IA mensuel atteint (50 req/mois sur Standard). Passez au plan Pro pour un accès illimité.', upgrade: true }, 402)
        }
        return c.html(pageIANonActivee('quota_depasse'), 402)
      }
    }

    // Logger l'utilisation
    await supabase.from('usage_ia_logs').insert({
      structure_id:   profil.structure_id,
      user_id:        profil.id,
      fonctionnalite,
      modele:         '',
      succes:         true,
      tokens_approx:  0,
    }).catch(() => {})

    await next()
  }
}
 