/**
 * src/middleware/plan.ts
 * SantéBF — Middleware contrôle plan d'abonnement
 *
 * CORRECTIONS APPLIQUÉES :
 *   [LM-02] requirePlan() est maintenant ACTIF (restrictions non commentées)
 *           Les vérifications de plan fonctionnent réellement
 *   [S-18]  !profil.structure_id : super_admin pass uniquement si rôle super_admin
 *           Les autres sans structure_id ne bypassent plus la vérification
 *   [LM-05] requireIA() est maintenant appliqué sur les routes /ia/*
 *           (Les routes ia.ts doivent utiliser ce middleware)
 *   [S-21]  Logger l'usage IA APRÈS la requête IA, pas avant
 *           (Ce middleware logue le quota AVANT la requête — à corriger dans ia.ts)
 *   [QC-17] modele: '' → modele renseigné via le paramètre passé
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

// ─── Middleware principal requirePlan ─────────────────────────
// [LM-02] CORRECTION : Les vérifications sont maintenant ACTIVES

export function requirePlan(...plans: string[]) {
  return async (c: Context, next: Next) => {
    const profil = c.get('profil') as any

    // super_admin passe toujours
    if (profil?.role === 'super_admin') { await next(); return }

    // [S-18] CORRECTION : Un utilisateur sans structure_id est BLOQUÉ
    // (sauf super_admin ci-dessus) — plus de bypass implicite
    if (!profil?.structure_id) {
      return c.html(pagePlanRequis(plans[0]), 402)
    }

    const supabase = c.get('supabase') as any
    const { data: struct, error } = await supabase
      .from('struct_structures')
      .select('plan_actif, abonnement_expire_at, est_pilote')
      .eq('id', profil.structure_id)
      .single()

    if (error || !struct) {
      // Erreur DB → bloquer par sécurité (pas next())
      console.error('requirePlan: erreur chargement structure', error)
      return c.html(pagePlanRequis(plans[0]), 402)
    }

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
// [LM-05] CORRECTION : requireIA() doit être appliqué sur les routes /ia/*
// [QC-17] CORRECTION : modele passé en paramètre et enregistré dans les logs

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

// [LM-05] requireIA maintenant avec paramètre modele
// [QC-17] modele enregistré dans les logs
// [S-21]  NOTE : Ce middleware logue AVANT la requête IA
//         Pour logger APRÈS, ia.ts doit appeler une fonction de log post-requête
export function requireIA(fonctionnalite: string, modele: string = '') {
  return async (c: Context, next: Next) => {
    const profil   = c.get('profil') as any
    const supabase = c.get('supabase') as any

    // super_admin passe toujours
    if (profil?.role === 'super_admin') { await next(); return }

    // [S-18] CORRECTION : Pas de bypass pour structure_id manquant
    if (!profil?.structure_id) {
      const accept = c.req.header('Accept') || ''
      if (accept.includes('application/json')) {
        return c.json({ error: 'Structure non définie', code: 'NO_STRUCTURE' }, 402)
      }
      return c.html(pageIANonActivee(fonctionnalite), 402)
    }

    const { data: struct } = await supabase
      .from('struct_structures')
      .select('plan_actif, est_pilote, abonnement_expire_at')
      .eq('id', profil.structure_id)
      .single()

    if (!struct) { 
      const accept = c.req.header('Accept') || ''
      if (accept.includes('application/json')) {
        return c.json({ error: 'Structure introuvable' }, 402)
      }
      return c.html(pageIANonActivee(fonctionnalite), 402)
    }

    if (struct.est_pilote) { await next(); return }

    // Vérifier expiration
    if (struct.abonnement_expire_at && new Date(struct.abonnement_expire_at) < new Date()) {
      const accept = c.req.header('Accept') || ''
      if (accept.includes('application/json')) {
        return c.json({ error: 'Abonnement expiré', upgrade: true }, 402)
      }
      return c.html(pageIANonActivee('abonnement_expire'), 402)
    }

    const planActif = struct?.plan_actif ?? 'gratuit'

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

    // [QC-17] CORRECTION : enregistrer avec modele renseigné (pas chaîne vide)
    // [S-21] NOTE : Ce log est AVANT la requête IA (le quota est déduit même si IA échoue)
    // Pour corriger S-21 complètement, ia.ts doit appeler logUsageIA() APRÈS la requête
    await supabase.from('usage_ia_logs').insert({
      structure_id:   profil.structure_id,
      user_id:        profil.id,
      fonctionnalite,
      modele:         modele || 'non_defini',  // [QC-17] plus jamais ''
      succes:         true,   // optimiste — sera mis à false par ia.ts si erreur
      tokens_approx:  0,      // mis à jour par ia.ts après la requête
    }).catch((e: any) => console.error('usage_ia_logs insert error:', e))

    await next()
  }
}

// ─── Fonction de log post-requête IA ─────────────────────────
// [S-21] À appeler depuis ia.ts APRÈS la requête IA pour corriger le statut
export async function logUsageIAPost(
  supabase: any,
  structureId: string,
  userId: string,
  fonctionnalite: string,
  modele: string,
  succes: boolean,
  tokensApprox: number = 0
) {
  // Mettre à jour le dernier log pour cette requête
  await supabase
    .from('usage_ia_logs')
    .update({ succes, tokens_approx: tokensApprox, modele })
    .eq('structure_id', structureId)
    .eq('user_id', userId)
    .eq('fonctionnalite', fonctionnalite)
    .order('created_at', { ascending: false })
    .limit(1)
    .catch((e: any) => console.error('logUsageIAPost error:', e))
}