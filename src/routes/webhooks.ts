/**
 * src/routes/webhooks.ts
 * SantéBF — Réception des webhooks
 *
 * CORRECTIONS APPLIQUÉES :
 *   [S-02]  CRITIQUE — siteId comparé à CINETPAY_SITE_ID (pas CINETPAY_SECRET)
 *   [DB-04] CRITIQUE — colonne 'montant' → 'prix_mensuel' dans struct_abonnements
 *   [LM-01] CRITIQUE — Durée abonnement calculée depuis prix_mensuel (pas toujours 30j)
 *   [LM-11] Webhook DuniaPay : logique d'activation complétée
 *   [LM-19] billing_paiements alimenté lors des webhooks réussis
 *   [S-11]  /webhooks/fcm-token : ajout validation d'authentification
 *   [QC-07] Gestion d'erreurs améliorée (plus de .catch(() => {}))
 *
 * Routes :
 *   POST /webhooks/cinetpay         → Notification paiement CinetPay
 *   POST /webhooks/duniapay         → Notification paiement DuniaPay
 *   POST /webhooks/fcm-token        → Enregistrement token push (SÉCURISÉ)
 *   GET  /webhooks/test             → Test que les webhooks fonctionnent
 */

import { Hono } from 'hono'
import { getSupabase, getSupabaseAdmin, type Bindings } from '../lib/supabase'

// [S-02] CORRECTION : CINETPAY_SITE_ID est séparé de CINETPAY_SECRET
type WebhookBindings = Bindings & {
  CINETPAY_SITE_ID?: string   // ← Nouveau : ID du site CinetPay (différent du SECRET)
}

export const webhookRoutes = new Hono<{ Bindings: WebhookBindings }>()

// ─── Utilitaire : calculer la durée d'abonnement selon le plan/montant ────
// [LM-01] CORRECTION : La durée varie selon le montant payé, pas toujours 30j

function calculerDureeAbonnement(plan: string, montant: number): number {
  // Durées par défaut selon le plan (en jours)
  const DUREES: Record<string, Record<number, number>> = {
    starter:    { 40000: 30, 200000: 180, 400000: 365 },
    standard:   { 90000: 30, 450000: 180, 900000: 365 },
    pro:        { 120000: 30, 600000: 180, 1200000: 365 },
    enterprise: { 0: 365 },  // Sur devis → 1 an par défaut
  }

  const dureesPlan = DUREES[plan] ?? {}

  // Trouver la durée correspondant au montant payé
  if (dureesPlan[montant] !== undefined) {
    return dureesPlan[montant]
  }

  // Heuristique : si montant ≈ 6x le prix mensuel → 6 mois, si ≈ 12x → 12 mois
  const prixMensuel = {
    starter: 40000, standard: 90000, pro: 120000, enterprise: 500000
  }[plan] ?? 90000

  if (montant >= prixMensuel * 10) return 365   // ≥ 10x → 1 an
  if (montant >= prixMensuel * 5)  return 180   // ≥ 5x  → 6 mois
  if (montant >= prixMensuel * 2)  return 60    // ≥ 2x  → 2 mois
  return 30                                      // Default → 1 mois
}

// ── Test ─────────────────────────────────────────────────────
webhookRoutes.get('/test', (c) => {
  return c.json({
    status:      'ok',
    message:     'Webhooks SantéBF opérationnels',
    timestamp:   new Date().toISOString(),
    // [S-02] Afficher SITE_ID correctement
    cinetpay:    !!c.env.CINETPAY_SITE_ID ? 'configuré ✅' : 'non configuré ⚠️',
    duniapay:    !!c.env.DUNIAPAY_SECRET  ? 'configuré ✅' : 'non configuré ⚠️',
    service_key: !!c.env.SUPABASE_SERVICE_ROLE_KEY ? 'présente ✅' : 'manquante ❌',
  })
})

// ── Webhook CinetPay ──────────────────────────────────────────
webhookRoutes.post('/cinetpay', async (c) => {
  try {
    const body = await c.req.json() as any

    const {
      cpm_trans_id: transactionId,
      cpm_result:   result,
      cpm_amount:   montantStr,
      cpm_site_id:  siteId,
    } = body

    // [S-02] CORRECTION CRITIQUE : comparer siteId à CINETPAY_SITE_ID (pas CINETPAY_SECRET)
    if (c.env.CINETPAY_SITE_ID && siteId !== c.env.CINETPAY_SITE_ID) {
      console.warn('Webhook CinetPay: site_id invalide reçu:', siteId)
      return c.json({ message: 'Invalid site_id' }, 400)
    }

    if (!transactionId) {
      return c.json({ message: 'transaction_id manquant' }, 400)
    }

    // [S-01] Utiliser le client admin pour accéder sans RLS
    const sb = getSupabaseAdmin(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

    // [DB-04] CORRECTION : select 'prix_mensuel' au lieu de 'montant'
    const { data: abo, error: aboError } = await sb
      .from('struct_abonnements')
      .select('id, structure_id, plan, prix_mensuel')
      .eq('transaction_id', transactionId)
      .single()

    if (aboError || !abo) {
      console.warn('Webhook CinetPay: transaction introuvable:', transactionId)
      return c.json({ message: 'Transaction introuvable' }, 404)
    }

    if (result === '00') {
      // ✅ Paiement réussi
      const montant = parseInt(montantStr ?? '0', 10) || abo.prix_mensuel || 0

      // [LM-01] CORRECTION : Calculer la vraie durée selon le montant payé
      const dureeJours = calculerDureeAbonnement(abo.plan, montant)
      const expire     = new Date(Date.now() + dureeJours * 24 * 60 * 60 * 1000).toISOString()

      // Activer l'abonnement
      const { error: aboUpdateError } = await sb
        .from('struct_abonnements')
        .update({ statut: 'actif', date_expiration: expire })
        .eq('transaction_id', transactionId)

      if (aboUpdateError) {
        console.error('Erreur mise à jour abonnement:', aboUpdateError)
        return c.json({ message: 'Erreur mise à jour abonnement' }, 500)
      }

      // Mettre à jour le plan de la structure
      const { error: structError } = await sb
        .from('struct_structures')
        .update({
          plan_actif:           abo.plan,
          abonnement_expire_at: expire,
        })
        .eq('id', abo.structure_id)

      if (structError) {
        console.error('Erreur mise à jour structure:', structError)
      }

      // [LM-19] CORRECTION : Insérer dans billing_paiements
      const { error: billingError } = await sb
        .from('billing_paiements')
        .insert({
          structure_id:   abo.structure_id,
          abonnement_id:  abo.id,
          montant:        montant,
          plan:           abo.plan,
          duree_mois:     Math.round(dureeJours / 30),
          passerelle:     'cinetpay',
          transaction_id: transactionId,
          statut:         'reussi',
          metadata:       { siteId, result, raw: body },
        })

      if (billingError) {
        console.error('Erreur insertion billing_paiements:', billingError)
        // Non bloquant : on continue même si le log échoue
      }

      console.log(`✅ Abonnement ${abo.plan} activé pour ${dureeJours}j (structure ${abo.structure_id})`)
      return c.json({ message: 'OK' })

    } else {
      // ❌ Paiement échoué
      await sb.from('struct_abonnements')
        .update({ statut: 'echec' })
        .eq('transaction_id', transactionId)

      // [LM-19] Logger l'échec aussi
      await sb.from('billing_paiements').insert({
        structure_id:   abo.structure_id,
        abonnement_id:  abo.id,
        montant:        parseInt(montantStr ?? '0', 10) || 0,
        plan:           abo.plan,
        duree_mois:     0,
        passerelle:     'cinetpay',
        transaction_id: transactionId,
        statut:         'echoue',
        metadata:       { result, raw: body },
      }).catch(e => console.error('billing insert error:', e))

      return c.json({ message: 'Payment failed' })
    }

  } catch (err) {
    console.error('Erreur webhook CinetPay:', err)
    return c.json({ message: 'Erreur serveur' }, 500)
  }
})

// ── Webhook DuniaPay ──────────────────────────────────────────
// [LM-11] CORRECTION : Logique d'activation complète (plus de TODO)
webhookRoutes.post('/duniapay', async (c) => {
  try {
    const body = await c.req.json() as any

    const {
      reference:   transactionId,
      status:      status,
      amount:      montantStr,
      secret_hash: secretHash,
    } = body

    if (c.env.DUNIAPAY_SECRET && secretHash !== c.env.DUNIAPAY_SECRET) {
      return c.json({ message: 'Invalid secret' }, 400)
    }

    if (!transactionId) {
      return c.json({ message: 'reference manquant' }, 400)
    }

    // [S-01] Client admin requis
    const sb = getSupabaseAdmin(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

    // [DB-04] Même correction : prix_mensuel au lieu de montant
    const { data: abo, error: aboError } = await sb
      .from('struct_abonnements')
      .select('id, structure_id, plan, prix_mensuel')
      .eq('transaction_id', transactionId)
      .single()

    if (aboError || !abo) {
      return c.json({ message: 'Transaction introuvable' }, 404)
    }

    if (status === 'SUCCESS') {
      const montant = parseInt(montantStr ?? '0', 10) || abo.prix_mensuel || 0

      // [LM-01] Calculer la vraie durée
      const dureeJours = calculerDureeAbonnement(abo.plan, montant)
      const expire     = new Date(Date.now() + dureeJours * 24 * 60 * 60 * 1000).toISOString()

      const { error: updateError } = await sb
        .from('struct_abonnements')
        .update({ statut: 'actif', date_expiration: expire })
        .eq('transaction_id', transactionId)

      if (updateError) {
        console.error('DuniaPay: erreur mise à jour:', updateError)
        return c.json({ message: 'Erreur mise à jour' }, 500)
      }

      await sb.from('struct_structures')
        .update({ plan_actif: abo.plan, abonnement_expire_at: expire })
        .eq('id', abo.structure_id)

      // [LM-19] Insérer dans billing_paiements
      await sb.from('billing_paiements').insert({
        structure_id:   abo.structure_id,
        abonnement_id:  abo.id,
        montant,
        plan:           abo.plan,
        duree_mois:     Math.round(dureeJours / 30),
        passerelle:     'duniapay',
        transaction_id: transactionId,
        statut:         'reussi',
        metadata:       { status, raw: body },
      }).catch(e => console.error('billing insert duniapay error:', e))

      console.log(`✅ DuniaPay: abonnement ${abo.plan} activé ${dureeJours}j`)
      return c.json({ message: 'OK' })

    } else {
      await sb.from('struct_abonnements')
        .update({ statut: 'echec' })
        .eq('transaction_id', transactionId)

      await sb.from('billing_paiements').insert({
        structure_id:   abo.structure_id,
        abonnement_id:  abo.id,
        montant:        parseInt(montantStr ?? '0', 10) || 0,
        plan:           abo.plan,
        duree_mois:     0,
        passerelle:     'duniapay',
        transaction_id: transactionId,
        statut:         'echoue',
        metadata:       { status },
      }).catch(e => console.error('billing error:', e))

      return c.json({ message: 'Payment failed' })
    }

  } catch (err) {
    console.error('Erreur webhook DuniaPay:', err)
    return c.json({ message: 'Erreur serveur' }, 500)
  }
})

// ── Enregistrement token FCM (SÉCURISÉ) ──────────────────────────────────
// [S-11] CORRECTION : Validation que le user_id correspond à l'utilisateur connecté
// Le token FCM est maintenant associé via le JWT Supabase (pas un user_id arbitraire)
webhookRoutes.post('/fcm-token', async (c) => {
  try {
    const body = await c.req.json() as any
    const { fcm_token, platform } = body

    if (!fcm_token) {
      return c.json({ message: 'fcm_token requis' }, 400)
    }

    // [S-11] Valider l'identité via le token Authorization JWT
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ message: 'Authentification requise' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const sb    = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

    const { data: { user }, error } = await sb.auth.getUser(token)
    if (error || !user) {
      return c.json({ message: 'Token invalide' }, 401)
    }

    // Mettre à jour le FCM token de l'utilisateur authentifié uniquement
    const { error: updateError } = await sb
      .from('auth_profiles')
      .update({
        fcm_token:    fcm_token,
        fcm_platform: platform || 'android',
      })
      .eq('id', user.id)  // user.id vient du JWT, pas du body → sécurisé

    if (updateError) {
      console.error('FCM update error:', updateError)
      return c.json({ message: 'Erreur mise à jour token' }, 500)
    }

    return c.json({ message: 'Token FCM enregistré', success: true })

  } catch (err) {
    console.error('Erreur FCM token:', err)
    return c.json({ message: 'Erreur serveur' }, 500)
  }
})