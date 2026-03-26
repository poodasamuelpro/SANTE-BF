/**
 * src/routes/abonnement.ts
 * SantéBF — Module Abonnement & Paiement
 *
 * ÉTAT : Prêt — en attente de la clé API passerelle de paiement
 *
 * Pour activer :
 *   1. Choisir la passerelle (CinetPay recommandé au Burkina)
 *   2. Créer un compte sur cinetpay.com (gratuit)
 *   3. Récupérer CINETPAY_SITE_ID et CINETPAY_API_KEY
 *   4. Les ajouter dans Cloudflare Pages → Settings → Variables
 *   5. Décommenter l'import dans functions/[[path]].ts
 *
 * Passerelles supportées (commenter/décommenter selon choix) :
 *   - CinetPay  → cinetpay.com     (Burkina, Côte d'Ivoire, Sénégal...)
 *   - DuniaPay  → duniapay.net     (Burkina Faso spécifique)
 *   - Wave      → wave.com         (Mobile Money)
 *
 * Routes :
 *   GET  /abonnement/plans          → Liste des plans disponibles
 *   GET  /abonnement/actuel         → Plan actuel de la structure
 *   POST /abonnement/initier        → Initier un paiement
 *   GET  /abonnement/retour         → Retour après paiement (success/cancel)
 *   GET  /abonnement/historique     → Historique des paiements
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'

// Étendre Bindings pour les variables paiement
type AbonnementBindings = Bindings & {
  CINETPAY_SITE_ID?:  string
  CINETPAY_API_KEY?:  string
  DUNIAPAY_API_KEY?:  string
  ENVIRONMENT?:       string
}

export const abonnementRoutes = new Hono<{ Bindings: AbonnementBindings }>()

// /plans est public — visible sans connexion
// Autres routes nécessitent connexion admin_structure
abonnementRoutes.use('/actuel', requireAuth)
abonnementRoutes.use('/actuel', requireRole('admin_structure', 'super_admin'))
abonnementRoutes.use('/initier', requireAuth)
abonnementRoutes.use('/initier', requireRole('admin_structure', 'super_admin'))
abonnementRoutes.use('/retour', requireAuth)
abonnementRoutes.use('/retour', requireRole('admin_structure', 'super_admin'))
abonnementRoutes.use('/historique', requireAuth)
abonnementRoutes.use('/historique', requireRole('admin_structure', 'super_admin'))

// ── Plans disponibles ────────────────────────────────────────

const PLANS = [
  {
    id:       'starter',
    nom:      'Starter',
    prix:     40000,
    devise:   'XOF',
    periode:  'mois',
    features: ['Dossiers patients illimites', 'Consultations & ordonnances PDF', 'Module pharmacien', 'Notifications email patients & medecins', 'Acces urgence QR code', 'Jusqu\'a 7 personnels medicaux'],
  },
  {
    id:       'standard',
    nom:      'Standard',
    prix:     90000,
    devise:   'XOF',
    periode:  'mois',
    features: ['Tout du Starter', 'Laboratoire & Radiologie', 'Grossesses & CPN', 'Facturation & caisse', 'Assistant IA medical (acces limite)', 'Statistiques avancees', 'Jusqu\'a 35 personnels medicaux'],
    populaire: true,
  },
  {
    id:       'pro',
    nom:      'Pro',
    prix:     120000,
    devise:   'XOF',
    periode:  'mois',
    features: ['Tout du Standard & Starter', 'Hospitalisations & gestion des lits', 'Facturation avancee & rapports', 'IA medicale illimitee', 'SMS illimites patients & medecins', 'Personnels medicaux illimites', 'Support prioritaire dedie'],
  },
]

// ── GET /abonnement/plans ─────────────────────────────────────
// ROUTE PUBLIQUE — accessible sans connexion (page tarifaire)
abonnementRoutes.get('/plans', async (c) => {
  // Tenter de récupérer le profil si connecté (optionnel)
  let structure: any = null
  try {
    const profil = c.get('profil' as never) as AuthProfile | undefined
    if (profil?.structure_id) {
      const supabase = c.get('supabase' as never) as any
      const { data } = await supabase
        .from('struct_structures')
        .select('id, nom, plan_actif, abonnement_expire_at')
        .eq('id', profil.structure_id)
        .single()
      structure = data
    }
  } catch (_) {
    // Pas connecté — afficher la page sans info structure
  }

  const paiementActif = !!(c.env.CINETPAY_SITE_ID || c.env.DUNIAPAY_API_KEY)
  return c.html(plansPage(structure, paiementActif))
})

// ── GET /abonnement/actuel ────────────────────────────────────
abonnementRoutes.get('/actuel', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: structure } = await supabase
    .from('struct_structures')
    .select('id, nom, plan_actif, abonnement_expire_at, est_pilote')
    .eq('id', profil.structure_id)
    .single()

  const { data: historique } = await supabase
    .from('struct_abonnements')
    .select('id, plan, montant, statut, date_debut, date_expiration, mode_paiement, created_at')
    .eq('structure_id', profil.structure_id)
    .order('created_at', { ascending: false })
    .limit(10)

  return c.html(actuelPage(structure, historique ?? []))
})

// ── POST /abonnement/initier ──────────────────────────────────
abonnementRoutes.post('/initier', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()

  const planId = String(body.plan || '').trim()
  const plan   = PLANS.find(p => p.id === planId)

  if (!plan) {
    return c.redirect('/abonnement/plans?err=plan_invalide', 303)
  }

  // Vérifier si une passerelle est configurée
  if (!c.env.CINETPAY_SITE_ID && !c.env.DUNIAPAY_API_KEY) {
    // Pas encore de passerelle — mode manuel
    return c.html(paiementManuelPage(plan, profil))
  }

  // ── CinetPay ─────────────────────────────────────────────
  if (c.env.CINETPAY_SITE_ID && c.env.CINETPAY_API_KEY) {
    const transactionId = `SBFABO-${profil.structure_id?.slice(0,8)}-${Date.now()}`
    const baseUrl       = new URL(c.req.url).origin

    // Enregistrer la transaction en attente
    await supabase.from('struct_abonnements').insert({
      structure_id:     profil.structure_id,
      plan:             planId,
      montant:          plan.prix,
      statut:           'en_attente',
      mode_paiement:    'cinetpay',
      transaction_id:   transactionId,
      date_debut:       new Date().toISOString(),
      date_expiration:  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    // Initier le paiement CinetPay
    const payload = {
      apikey:           c.env.CINETPAY_API_KEY,
      site_id:          c.env.CINETPAY_SITE_ID,
      transaction_id:   transactionId,
      amount:           plan.prix,
      currency:         'XOF',
      description:      `SantéBF — Abonnement ${plan.nom}`,
      notify_url:       `${baseUrl}/webhooks/cinetpay`,
      return_url:       `${baseUrl}/abonnement/retour?plan=${planId}&tx=${transactionId}`,
      cancel_url:       `${baseUrl}/abonnement/plans?cancel=1`,
      customer_name:    profil.nom,
      customer_email:   profil.email || '',
      lang:             'fr',
    }

    try {
      const res  = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json() as any

      if (data.code === '201' && data.data?.payment_url) {
        return c.redirect(data.data.payment_url, 302)
      }

      return c.redirect('/abonnement/plans?err=' + encodeURIComponent(data.message || 'Erreur CinetPay'), 303)
    } catch (err) {
      console.error('CinetPay error:', err)
      return c.redirect('/abonnement/plans?err=erreur_passerelle', 303)
    }
  }

  return c.redirect('/abonnement/plans?err=passerelle_non_configuree', 303)
})

// ── GET /abonnement/retour ────────────────────────────────────
// Appelé par CinetPay après paiement (succès ou annulation)
abonnementRoutes.get('/retour', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const planId = c.req.query('plan') || ''
  const txId   = c.req.query('tx')   || ''

  // Vérifier le statut du paiement via webhook (déjà traité)
  // Si le webhook a validé → abonnement actif
  const { data: abo } = await supabase
    .from('struct_abonnements')
    .select('statut, plan, date_expiration')
    .eq('transaction_id', txId)
    .single()

  if (abo?.statut === 'actif') {
    return c.html(retourSuccesPage(abo.plan))
  }

  return c.html(retourAttenteePage(planId, txId))
})

// ── GET /abonnement/historique ────────────────────────────────
abonnementRoutes.get('/historique', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: historique } = await supabase
    .from('struct_abonnements')
    .select('*')
    .eq('structure_id', profil.structure_id)
    .order('created_at', { ascending: false })

  return c.html(historiquePage(historique ?? []))
})

// ══════════════════════════════════════════════════════════════
// PAGES HTML
// ══════════════════════════════════════════════════════════════

function layout(titre: string, contenu: string): string {
  return `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titre} — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
<style>
:root{--v:#1A6B3C;--vf:#0d4a2a;--vc:#e8f5ee;--b:#1565C0;--bc:#e3f2fd;--or:#C9A84C;--oc:#fdf6e3;--r:#b71c1c;--rc:#fff5f5;--tx:#0f1923;--soft:#6b7280;--bg:#f7f8fa;--w:#fff;--bd:#e2e8e4}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--tx)}
header{background:var(--v);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.hl{font-family:'DM Serif Display',serif;font-size:18px;color:white}
.hr a{color:rgba(255,255,255,.7);font-size:13px;text-decoration:none}
.wrap{max-width:1000px;margin:0 auto;padding:32px 20px}
.card{background:var(--w);border-radius:14px;padding:24px;box-shadow:0 2px 10px rgba(0,0,0,.06);margin-bottom:16px;border:1.5px solid var(--bd)}
h1{font-family:'DM Serif Display',serif;font-size:26px;margin-bottom:8px}
h2{font-size:18px;font-weight:700;margin-bottom:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-bottom:24px}
.plan{background:var(--w);border:2px solid var(--bd);border-radius:14px;padding:24px;position:relative;transition:all .2s}
.plan:hover{border-color:var(--v);transform:translateY(-2px)}
.plan.pop{border-color:var(--v);background:var(--vc)}
.pop-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--v);color:white;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700}
.plan-name{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--soft);margin-bottom:8px}
.plan-price{font-family:'DM Serif Display',serif;font-size:28px;font-weight:700;margin-bottom:4px}
.plan-period{font-size:12px;color:var(--soft);margin-bottom:14px}
.plan-feat{font-size:13px;display:flex;gap:7px;align-items:flex-start;margin-bottom:6px}
.plan-feat::before{content:'✓';color:var(--v);font-weight:700;flex-shrink:0}
.btn{display:block;text-align:center;padding:11px;border-radius:9px;font-size:14px;font-weight:700;text-decoration:none;margin-top:16px;cursor:pointer;border:none;font-family:inherit;width:100%}
.btn-v{background:var(--v);color:white}
.btn-b{background:var(--b);color:white}
.btn-gray{background:#f3f4f6;color:#374151}
.badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
.bv{background:var(--vc);color:var(--v)}
.bb{background:var(--bc);color:var(--b)}
.br{background:var(--rc);color:var(--r)}
.bo{background:var(--oc);color:#7a5500}
.info-box{background:var(--bc);border-left:4px solid var(--b);border-radius:9px;padding:14px 16px;font-size:13px;color:#1a3a6b;margin-bottom:16px}
.warn-box{background:var(--oc);border-left:4px solid var(--or);border-radius:9px;padding:14px 16px;font-size:13px;color:#7a5500;margin-bottom:16px}
</style></head><body>
<header>
  <div class="hl">🏥 SantéBF</div>
  <div class="hr"><a href="/dashboard/structure">← Retour</a></div>
</header>
<div class="wrap">${contenu}</div>
</body></html>`
}

function plansPage(structure: any, paiementActif: boolean): string {
  const planActuel = structure?.plan_actif || 'gratuit'
  const expire     = structure?.abonnement_expire_at
    ? new Date(structure.abonnement_expire_at).toLocaleDateString('fr-FR')
    : '—'

  const plansHtml = PLANS.map(plan => `
    <div class="plan ${plan.populaire ? 'pop' : ''}">
      ${plan.populaire ? '<div class="pop-badge">⭐ Le plus populaire</div>' : ''}
      <div class="plan-name">${plan.nom}</div>
      <div class="plan-price">${plan.prix.toLocaleString('fr-FR')} FCFA</div>
      <div class="plan-period">par mois · engagement mensuel</div>
      ${plan.features.map(f => `<div class="plan-feat">${f}</div>`).join('')}
      ${paiementActif
        ? `<form method="POST" action="/abonnement/initier">
             <input type="hidden" name="plan" value="${plan.id}">
             <button type="submit" class="btn btn-v">Souscrire →</button>
           </form>`
        : `<a href="#contact" class="btn btn-gray" onclick="alert('Contactez-nous pour activer ce plan.')">Nous contacter</a>`
      }
    </div>`).join('')

  return layout('Abonnements', `
    <h1>💳 Plans & Abonnements</h1>
    <p style="color:var(--soft);margin-bottom:24px">Gérez l'abonnement de votre structure.</p>

    <div class="card">
      <h2>📊 Plan actuel — <span class="badge bv">${planActuel.toUpperCase()}</span></h2>
      <p style="font-size:13px;color:var(--soft)">Structure : <strong>${structure?.nom || '—'}</strong></p>
      <p style="font-size:13px;color:var(--soft);margin-top:4px">Expire le : <strong>${expire}</strong></p>
      ${!paiementActif ? `<div class="warn-box" style="margin-top:14px">⚠️ Le paiement en ligne n'est pas encore activé. Contactez l'équipe SantéBF pour activer votre abonnement.</div>` : ''}
    </div>

    <h2 style="margin-bottom:16px">Choisir un plan</h2>
    <div class="grid">${plansHtml}</div>
  `)
}

function actuelPage(structure: any, historique: any[]): string {
  const rows = historique.map((h: any) => {
    const bc = h.statut === 'actif' ? 'bv' : h.statut === 'en_attente' ? 'bo' : 'br'
    const dt = new Date(h.created_at).toLocaleDateString('fr-FR')
    return `<tr>
      <td>${h.plan?.toUpperCase()}</td>
      <td>${h.montant?.toLocaleString('fr-FR')} FCFA</td>
      <td><span class="badge ${bc}">${h.statut}</span></td>
      <td>${h.mode_paiement || '—'}</td>
      <td style="font-size:12px">${dt}</td>
    </tr>`
  }).join('')

  return layout('Abonnement actuel', `
    <h1>💳 Mon abonnement</h1>
    <div class="card">
      <h2>Plan actif : <span class="badge bv">${(structure?.plan_actif || 'gratuit').toUpperCase()}</span></h2>
      <a href="/abonnement/plans" class="btn btn-v" style="margin-top:12px;display:inline-block;width:auto;padding:10px 20px;text-decoration:none">Changer de plan →</a>
    </div>
    <div class="card">
      <h2>Historique des paiements</h2>
      ${historique.length === 0
        ? '<p style="color:var(--soft);font-style:italic">Aucun paiement enregistré</p>'
        : `<table style="width:100%;border-collapse:collapse;font-size:13px">
             <thead><tr style="background:var(--v);color:white">
               <th style="padding:8px;text-align:left">Plan</th>
               <th style="padding:8px;text-align:left">Montant</th>
               <th style="padding:8px;text-align:left">Statut</th>
               <th style="padding:8px;text-align:left">Mode</th>
               <th style="padding:8px;text-align:left">Date</th>
             </tr></thead>
             <tbody>${rows}</tbody>
           </table>`}
    </div>
  `)
}

function paiementManuelPage(plan: typeof PLANS[0], profil: any): string {
  return layout('Paiement manuel', `
    <h1>💳 Paiement — ${plan.nom}</h1>
    <div class="card">
      <h2>Montant : ${plan.prix.toLocaleString('fr-FR')} FCFA / mois</h2>
      <div class="info-box" style="margin-top:16px">
        ℹ️ Le paiement en ligne n'est pas encore activé. Pour activer votre abonnement <strong>${plan.nom}</strong>, contactez l'équipe SantéBF par email ou téléphone en mentionnant :
        <ul style="margin-top:8px;margin-left:16px">
          <li>Nom de votre structure</li>
          <li>Plan souhaité : <strong>${plan.nom}</strong></li>
          <li>Montant : <strong>${plan.prix.toLocaleString('fr-FR')} FCFA/mois</strong></li>
        </ul>
      </div>
      <a href="/abonnement/plans" class="btn btn-gray" style="display:inline-block;width:auto;padding:10px 20px;margin-top:12px">← Retour aux plans</a>
    </div>
  `)
}

function retourSuccesPage(plan: string): string {
  return layout('Paiement réussi', `
    <div class="card" style="text-align:center;padding:48px">
      <div style="font-size:60px;margin-bottom:16px">✅</div>
      <h1>Paiement réussi !</h1>
      <p style="color:var(--soft);margin-top:8px">Votre abonnement <strong>${plan?.toUpperCase()}</strong> est maintenant actif.</p>
      <a href="/dashboard/structure" class="btn btn-v" style="display:inline-block;width:auto;padding:12px 28px;margin-top:24px;text-decoration:none">Accéder au dashboard →</a>
    </div>
  `)
}

function retourAttenteePage(plan: string, txId: string): string {
  return layout('Paiement en attente', `
    <div class="card" style="text-align:center;padding:48px">
      <div style="font-size:60px;margin-bottom:16px">⏳</div>
      <h1>Paiement en cours de vérification</h1>
      <p style="color:var(--soft);margin-top:8px">Votre paiement est en cours de traitement. Revenez dans quelques minutes.</p>
      <p style="font-size:11px;color:var(--soft);margin-top:8px;font-family:monospace">Ref: ${txId}</p>
      <a href="/abonnement/actuel" class="btn btn-gray" style="display:inline-block;width:auto;padding:12px 28px;margin-top:24px;text-decoration:none">Vérifier le statut</a>
    </div>
  `)
}

function historiquePage(historique: any[]): string {
  const rows = historique.map((h: any) => {
    const bc = h.statut === 'actif' ? 'bv' : h.statut === 'en_attente' ? 'bo' : 'br'
    const dt = new Date(h.created_at).toLocaleDateString('fr-FR')
    return `<tr style="border-bottom:1px solid var(--bd)">
      <td style="padding:10px">${h.plan?.toUpperCase()}</td>
      <td style="padding:10px">${(h.montant||0).toLocaleString('fr-FR')} FCFA</td>
      <td style="padding:10px"><span class="badge ${bc}">${h.statut}</span></td>
      <td style="padding:10px">${h.mode_paiement||'—'}</td>
      <td style="padding:10px;font-size:12px">${dt}</td>
    </tr>`
  }).join('')

  return layout('Historique paiements', `
    <h1>📋 Historique des paiements</h1>
    <div class="card">
      ${historique.length === 0
        ? '<p style="color:var(--soft);font-style:italic">Aucun paiement</p>'
        : `<table style="width:100%;border-collapse:collapse;font-size:13px">
             <thead><tr style="background:var(--v);color:white">
               <th style="padding:10px;text-align:left">Plan</th>
               <th style="padding:10px;text-align:left">Montant</th>
               <th style="padding:10px;text-align:left">Statut</th>
               <th style="padding:10px;text-align:left">Mode</th>
               <th style="padding:10px;text-align:left">Date</th>
             </tr></thead>
             <tbody>${rows}</tbody>
           </table>`}
    </div>
  `)
}
