/**
 * src/routes/webhooks.ts
 * SantéBF — Réception des webhooks
 *
 * ÉTAT : Prêt — en attente des clés API passerelle
 *
 * Ce fichier reçoit les notifications automatiques des passerelles
 * de paiement quand un paiement est validé ou échoue.
 *
 * Pour activer CinetPay :
 *   1. Sur cinetpay.com → Mon compte → Webhooks
 *   2. Renseigner l'URL : https://santebf.izicardouaga.com/webhooks/cinetpay
 *   3. Ajouter CINETPAY_SECRET dans Cloudflare Pages → Variables
 *
 * Pour activer DuniaPay :
 *   1. Sur duniapay.net → Paramètres → Webhooks
 *   2. URL : https://santebf.izicardouaga.com/webhooks/duniapay
 *   3. Ajouter DUNIAPAY_SECRET dans Cloudflare Pages → Variables
 *
 * Routes :
 *   POST /webhooks/cinetpay         → Notification paiement CinetPay
 *   POST /webhooks/duniapay         → Notification paiement DuniaPay
 *   POST /webhooks/fcm-token        → Enregistrement token push depuis app
 *   GET  /webhooks/test             → Test que les webhooks fonctionnent
 */

import { Hono } from 'hono'
import { getSupabase, type Bindings } from '../lib/supabase'

type WebhookBindings = Bindings & {
  CINETPAY_SECRET?:  string
  DUNIAPAY_SECRET?:  string
}

export const webhookRoutes = new Hono<{ Bindings: WebhookBindings }>()

// ── Test ─────────────────────────────────────────────────────
webhookRoutes.get('/test', (c) => {
  return c.json({
    status:    'ok',
    message:   'Webhooks SantéBF opérationnels',
    timestamp: new Date().toISOString(),
    cinetpay:  !!c.env.CINETPAY_SECRET ? 'configuré ✅' : 'non configuré ⚠️',
    duniapay:  !!c.env.DUNIAPAY_SECRET ? 'configuré ✅' : 'non configuré ⚠️',
  })
})

// ── Webhook CinetPay ──────────────────────────────────────────
// CinetPay envoie une requête POST à chaque changement de statut
webhookRoutes.post('/cinetpay', async (c) => {
  try {
    const body = await c.req.json() as any
    console.log('Webhook CinetPay reçu:', JSON.stringify(body))

    const {
      cpm_trans_id:   transactionId,
      cpm_result:     result,       // '00' = succès
      cpm_amount:     montant,
      cpm_site_id:    siteId,
      cpm_custom:     custom,
    } = body

    // Vérifier que c'est bien notre site
    if (c.env.CINETPAY_SECRET && siteId !== c.env.CINETPAY_SECRET) {
      console.warn('Webhook CinetPay: site_id invalide')
      return c.json({ message: 'Invalid site_id' }, 400)
    }

    if (!transactionId) {
      return c.json({ message: 'transaction_id manquant' }, 400)
    }

    const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

    // Récupérer l'abonnement en attente
    const { data: abo } = await sb
      .from('struct_abonnements')
      .select('id, structure_id, plan, montant')
      .eq('transaction_id', transactionId)
      .single()

    if (!abo) {
      console.warn('Webhook CinetPay: transaction introuvable', transactionId)
      return c.json({ message: 'Transaction introuvable' }, 404)
    }

    if (result === '00') {
      // ✅ Paiement réussi
      const expire = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      // Activer l'abonnement
      await sb.from('struct_abonnements')
        .update({ statut: 'actif', date_expiration: expire })
        .eq('transaction_id', transactionId)

      // Mettre à jour le plan de la structure
      await sb.from('struct_structures')
        .update({
          plan_actif:           abo.plan,
          abonnement_expire_at: expire,
        })
        .eq('id', abo.structure_id)

      console.log(`✅ Abonnement ${abo.plan} activé pour structure ${abo.structure_id}`)
      return c.json({ message: 'OK' })

    } else {
      // ❌ Paiement échoué ou annulé
      await sb.from('struct_abonnements')
        .update({ statut: 'echec' })
        .eq('transaction_id', transactionId)

      console.log(`❌ Paiement échoué pour transaction ${transactionId} (code: ${result})`)
      return c.json({ message: 'Payment failed' })
    }

  } catch (err) {
    console.error('Erreur webhook CinetPay:', err)
    return c.json({ message: 'Erreur serveur' }, 500)
  }
})

// ── Webhook DuniaPay ──────────────────────────────────────────
webhookRoutes.post('/duniapay', async (c) => {
  try {
    const body = await c.req.json() as any
    console.log('Webhook DuniaPay reçu:', JSON.stringify(body))

    const {
      reference:   transactionId,
      status:      status,      // 'SUCCESS' = validé
      amount:      montant,
      secret_hash: secretHash,
    } = body

    // Vérifier le secret
    if (c.env.DUNIAPAY_SECRET && secretHash !== c.env.DUNIAPAY_SECRET) {
      return c.json({ message: 'Invalid secret' }, 400)
    }

    if (!transactionId) {
      return c.json({ message: 'reference manquant' }, 400)
    }

    const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

    const { data: abo } = await sb
      .from('struct_abonnements')
      .select('id, structure_id, plan')
      .eq('transaction_id', transactionId)
      .single()

    if (!abo) {
      return c.json({ message: 'Transaction introuvable' }, 404)
    }

    if (status === 'SUCCESS') {
      const expire = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await sb.from('struct_abonnements')
        .update({ statut: 'actif', date_expiration: expire })
        .eq('transaction_id', transactionId)

      await sb.from('struct_structures')
        .update({ plan_actif: abo.plan, abonnement_expire_at: expire })
        .eq('id', abo.structure_id)

      return c.json({ message: 'OK' })
    } else {
      await sb.from('struct_abonnements')
        .update({ statut: 'echec' })
        .eq('transaction_id', transactionId)

      return c.json({ message: 'Payment failed' })
    }

  } catch (err) {
    console.error('Erreur webhook DuniaPay:', err)
    return c.json({ message: 'Erreur serveur' }, 500)
  }
})

// ── Enregistrement token FCM depuis l'app mobile ──────────────
// L'app Capacitor appelle cet endpoint après connexion pour
// enregistrer son token FCM (notifications push)
webhookRoutes.post('/fcm-token', async (c) => {
  try {
    const body = await c.req.json() as any
    const { user_id, fcm_token, platform } = body

    if (!user_id || !fcm_token) {
      return c.json({ message: 'user_id et fcm_token requis' }, 400)
    }

    const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

    await sb.from('auth_profiles')
      .update({
        fcm_token:    fcm_token,
        fcm_platform: platform || 'android',
      })
      .eq('id', user_id)

    return c.json({ message: 'Token FCM enregistré', success: true })

  } catch (err) {
    console.error('Erreur FCM token:', err)
    return c.json({ message: 'Erreur serveur' }, 500)
  }
})
