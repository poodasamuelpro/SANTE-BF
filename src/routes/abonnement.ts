/**
 * src/routes/abonnement.ts
 * SantéBF — Abonnement PRIVÉ (structures connectées uniquement)
 *
 * Accessible uniquement aux admin_structure et super_admin connectés
 * Durées : 1 mois / 6 mois (-5%) / 1 an (-10%)
 *
 * Routes :
 *   GET  /abonnement/plans       → Voir plans + renouveller avec durée
 *   GET  /abonnement/actuel      → Plan actuel + dates
 *   POST /abonnement/initier     → Initier paiement renouvellement
 *   GET  /abonnement/retour      → Retour après paiement CinetPay
 *   GET  /abonnement/historique  → Historique paiements
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'

type AbonnementBindings = Bindings & {
  CINETPAY_SITE_ID?:  string
  CINETPAY_API_KEY?:  string
  ENVIRONMENT?:       string
}

export const abonnementRoutes = new Hono<{ Bindings: AbonnementBindings }>()

// Toutes les routes privées
abonnementRoutes.use('/actuel',     requireAuth)
abonnementRoutes.use('/actuel',     requireRole('admin_structure', 'super_admin'))
abonnementRoutes.use('/plans',      requireAuth)
abonnementRoutes.use('/plans',      requireRole('admin_structure', 'super_admin'))
abonnementRoutes.use('/initier',    requireAuth)
abonnementRoutes.use('/initier',    requireRole('admin_structure', 'super_admin'))
abonnementRoutes.use('/retour',     requireAuth)
abonnementRoutes.use('/retour',     requireRole('admin_structure', 'super_admin'))
abonnementRoutes.use('/historique', requireAuth)
abonnementRoutes.use('/historique', requireRole('admin_structure', 'super_admin'))

const PLANS = [
  {
    id: 'starter', nom: 'Starter', prix: 40000,
    couleur: '#1565C0', bg: '#e3f2fd',
    features: [
      'Ordonnances PDF + QR code', 'Module pharmacien', 'Vaccinations',
      'Notifications email patients & médecins', 'Laboratoire',
      "Jusqu'à 7 personnels médicaux",
    ],
  },
  {
    id: 'standard', nom: 'Standard', prix: 90000,
    couleur: '#1A6B3C', bg: '#e8f5ee',
    features: [
      'Tout du Starter', 'Radiologie & imagerie', 'Grossesses & CPN',
      'Infirmerie & soins', 'Facturation & caisse',
      'IA médicale (50 req/mois)', 'Statistiques avancées',
      "Jusqu'à 35 personnels médicaux",
    ],
    populaire: true,
  },
  {
    id: 'pro', nom: 'Pro', prix: 120000,
    couleur: '#4A148C', bg: '#F3E5F5',
    features: [
      'Tout du Standard & Starter', 'Hospitalisations & lits',
      'Facturation avancée & rapports', 'IA médicale illimitée',
      'SMS illimités', 'Personnels médicaux illimités', 'Support prioritaire',
    ],
  },
]

// Durées : 1 mois, 6 mois (-5%), 1 an (-10%) uniquement
const DUREES = [
  { id: '1m', label: '1 mois',  mois: 1,  remise: 0,  badge: ''    },
  { id: '6m', label: '6 mois',  mois: 6,  remise: 5,  badge: '-5%' },
  { id: '1a', label: '1 an',    mois: 12, remise: 10, badge: '-10%'},
]

function prixTotal(base: number, remise: number, mois: number): number {
  return Math.round(base * mois * (1 - remise / 100))
}

function layout(titre: string, contenu: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${titre} — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
<style>
:root{--v:#1A6B3C;--vf:#0d4a2a;--vc:#e8f5ee;--b:#1565C0;--bc:#e3f2fd;--vio:#4A148C;--vioc:#F3E5F5;--r:#b71c1c;--rc:#fff5f5;--or:#E65100;--oc:#FFF3E0;--tx:#0f1923;--soft:#6B7280;--bg:#f7f8fa;--w:#fff;--bd:#e2e8e4}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--tx)}
header{background:var(--v);height:56px;display:flex;align-items:center;padding:0 24px;justify-content:space-between;position:sticky;top:0;z-index:100}
.hl{font-family:'DM Serif Display',serif;font-size:18px;color:white}
.hr a{color:rgba(255,255,255,.7);font-size:13px;text-decoration:none}
.wrap{max-width:1000px;margin:0 auto;padding:32px 20px}
.card{background:var(--w);border-radius:14px;padding:22px;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:16px;border:1.5px solid var(--bd)}
.badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
.bv{background:var(--vc);color:var(--v)}.bb{background:var(--bc);color:var(--b)}
.br{background:var(--rc);color:var(--r)}.bo{background:var(--oc);color:var(--or)}
.bvio{background:var(--vioc);color:var(--vio)}.bg{background:#f3f4f6;color:var(--soft)}
.warn{background:var(--oc);border-left:4px solid var(--or);border-radius:9px;padding:13px 15px;font-size:13px;color:#7a5500;margin-bottom:16px;line-height:1.7}
.info{background:var(--bc);border-left:4px solid var(--b);border-radius:9px;padding:13px 15px;font-size:13px;color:#1a3a6b;margin-bottom:16px;line-height:1.7}
.ok{background:var(--vc);border-left:4px solid var(--v);border-radius:9px;padding:13px 15px;font-size:13px;color:#1a4a2e;margin-bottom:16px;font-weight:600}
table{width:100%;border-collapse:collapse}
thead th{background:var(--v);color:white;padding:10px 14px;font-size:12px;text-align:left;font-weight:600}
tbody tr{border-bottom:1px solid var(--bd)}tbody tr:hover{background:#f9fbf9}
tbody td{padding:10px 14px;font-size:13px}
.btn{display:inline-block;background:var(--v);color:white;padding:10px 20px;border-radius:9px;font-size:13px;font-weight:700;text-decoration:none;border:none;cursor:pointer;font-family:inherit;transition:all .2s}
.btn:hover{background:var(--vf)}.btn-g{background:#f3f4f6;color:var(--tx);border:1px solid var(--bd)}.btn-b{background:var(--b);color:white}
</style>
</head>
<body>
<header>
  <div class="hl">&#x1F3E5; SantéBF — Abonnement</div>
  <div class="hr"><a href="/dashboard/structure">&#x2190; Retour au dashboard</a></div>
</header>
<div class="wrap">${contenu}</div>
<div style="text-align:center;padding:20px;font-size:11px;color:var(--soft)">
  <a href="/politique-confidentialite" style="color:var(--soft);text-decoration:none">&#x1F512; Politique de confidentialité</a>
</div>
</body></html>`
}

// ══════════════════════════════════════════════════════════════
// GET /abonnement/plans
// ══════════════════════════════════════════════════════════════
abonnementRoutes.get('/plans', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const ok       = c.req.query('ok')  || ''
  const err      = c.req.query('err') || ''

  const { data: structure } = await supabase
    .from('struct_structures')
    .select('id, nom, plan_actif, abonnement_expire_at, est_pilote')
    .eq('id', profil.structure_id)
    .single()

  const planActuel    = structure?.plan_actif || 'gratuit'
  const paiementActif = !!(c.env.CINETPAY_SITE_ID && c.env.CINETPAY_API_KEY)
  const expire        = structure?.abonnement_expire_at
    ? new Date(structure.abonnement_expire_at).toLocaleDateString('fr-FR') : '—'
  const joursRestants = structure?.abonnement_expire_at
    ? Math.ceil((new Date(structure.abonnement_expire_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

  const planCouleurs: Record<string, string> = {
    gratuit: 'bg', starter: 'bb', standard: 'bv', pro: 'bvio', pilote: 'bv', suspendu: 'br',
  }

  const plansHtml = PLANS.map(plan => {
    const isActuel = plan.id === planActuel
    return `
    <div style="background:var(--w);border:2px solid ${isActuel ? plan.couleur : 'var(--bd)'};border-radius:16px;padding:22px 18px;position:relative">
      ${isActuel ? `<div style="position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:${plan.couleur};color:white;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap">Plan actuel</div>` : ''}
      ${(plan as any).populaire && !isActuel ? `<div style="position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:#1A6B3C;color:white;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap">⭐ Populaire</div>` : ''}
      <div style="background:${plan.bg};border-radius:10px;padding:14px;margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${plan.couleur};margin-bottom:5px">${plan.nom}</div>
        <div style="font-family:'DM Serif Display',serif;font-size:26px;font-weight:700;color:${plan.couleur}">${plan.prix.toLocaleString('fr-FR')} <span style="font-size:13px;font-weight:400">FCFA/mois</span></div>
      </div>
      <div style="margin-bottom:14px">
        ${plan.features.map(f => `<div style="font-size:12.5px;margin-bottom:6px;display:flex;gap:7px;color:var(--soft)"><span style="color:${plan.couleur};font-weight:700;flex-shrink:0">✓</span>${f}</div>`).join('')}
      </div>
      ${isActuel
        ? `<div style="background:${plan.bg};color:${plan.couleur};text-align:center;padding:10px;border-radius:9px;font-size:13px;font-weight:700">✅ Plan actif</div>`
        : paiementActif
          ? `<form method="POST" action="/abonnement/initier">
               <input type="hidden" name="plan" value="${plan.id}">
               <div style="margin-bottom:10px">
                 <div style="font-size:12px;font-weight:600;color:var(--soft);margin-bottom:8px">Durée d'engagement :</div>
                 <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
                   ${DUREES.map((d, i) => {
                     const t = prixTotal(plan.prix, d.remise, d.mois)
                     return `<label style="border:1.5px solid var(--bd);border-radius:9px;padding:9px 6px;text-align:center;cursor:pointer;font-size:11px;transition:border-color .2s" onmouseover="this.style.borderColor='${plan.couleur}'" onmouseout="this.style.borderColor='var(--bd)'">
                       <input type="radio" name="duree" value="${d.id}" ${i === 0 ? 'checked' : ''} style="display:none">
                       <div style="font-weight:700;margin-bottom:2px">${d.label}</div>
                       <div style="color:${plan.couleur};font-weight:700;font-size:12px">${t.toLocaleString('fr-FR')}</div>
                       <div style="font-size:10px;color:var(--soft)">FCFA</div>
                       ${d.remise > 0 ? `<div style="background:${plan.couleur};color:white;border-radius:20px;font-size:9px;padding:1px 6px;margin-top:3px;display:inline-block;font-weight:700">${d.badge}</div>` : ''}
                     </label>`
                   }).join('')}
                 </div>
               </div>
               <button type="submit" style="width:100%;background:${plan.couleur};color:white;border:none;padding:11px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">
                 ${plan.id === planActuel ? 'Renouveler' : 'Passer au ' + plan.nom} →
               </button>
             </form>`
          : `<a href="/contact" style="display:block;text-align:center;background:#f3f4f6;color:var(--soft);padding:10px;border-radius:9px;font-size:13px;font-weight:600;text-decoration:none">Nous contacter</a>`
      }
    </div>`
  }).join('')

  const contenu = `
    ${ok === 'paye' ? '<div class="ok">✅ Paiement validé ! Votre abonnement a été activé.</div>' : ''}
    ${err ? `<div class="warn">⚠️ ${decodeURIComponent(err)}</div>` : ''}

    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:10px">
      <div>
        <h1 style="font-family:'DM Serif Display',serif;font-size:24px;margin-bottom:4px">💳 Abonnement</h1>
        <p style="font-size:13px;color:var(--soft)">${structure?.nom || '—'}</p>
      </div>
      <a href="/abonnement/historique" class="btn btn-g" style="font-size:12px;padding:8px 14px">📋 Historique</a>
    </div>

    <div class="card" style="margin-bottom:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:12px;color:var(--soft);margin-bottom:4px">Plan actif</div>
          <span class="badge ${planCouleurs[planActuel] || 'bg'}" style="font-size:14px;padding:5px 14px">${planActuel.toUpperCase()}</span>
        </div>
        <div style="text-align:right">
          <div style="font-size:12px;color:var(--soft)">Expiration : <strong>${expire}</strong></div>
          ${joursRestants !== null ? `<div style="font-size:12px;margin-top:4px;color:${joursRestants < 30 ? 'var(--r)' : 'var(--soft)'};font-weight:${joursRestants < 30 ? '700' : '400'}">${joursRestants > 0 ? joursRestants + ' jours restants' : '⚠️ Expiré'}</div>` : ''}
        </div>
      </div>
      ${structure?.est_pilote ? '<div class="ok" style="margin-top:12px;margin-bottom:0">👍 Votre structure est en mode Pilote — accès complet offert.</div>' : ''}
    </div>

    ${joursRestants !== null && joursRestants < 30 && joursRestants > 0 ? '<div class="warn">⏰ Votre abonnement expire dans moins de 30 jours. Pensez à le renouveler.</div>' : ''}
    ${!paiementActif ? "<div class=\"info\">ℹ️ Le paiement en ligne est en cours d'activation. Contactez-nous pour renouveler votre abonnement.</div>" : ''}

    <h2 style="font-size:16px;font-weight:700;margin-bottom:16px">Choisir ou renouveler</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-bottom:24px">
      ${plansHtml}
    </div>
    <p style="font-size:12px;color:var(--soft);text-align:center">
      Besoin d'un plan Entreprise ? <a href="/contact" style="color:var(--v);font-weight:600">Contactez-nous</a>
    </p>`

  return c.html(layout('Plans & Abonnements', contenu))
})

// GET /abonnement/actuel
abonnementRoutes.get('/actuel', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: structure } = await supabase
    .from('struct_structures')
    .select('id, nom, plan_actif, abonnement_expire_at, est_pilote')
    .eq('id', profil.structure_id).single()

  const { data: historique } = await supabase
    .from('struct_abonnements')
    .select('plan, montant, statut, mode_paiement, date_debut, date_expiration, notes, created_at')
    .eq('structure_id', profil.structure_id)
    .order('created_at', { ascending: false })
    .limit(10)

  const planActuel = structure?.plan_actif || 'gratuit'
  const expire     = structure?.abonnement_expire_at
    ? new Date(structure.abonnement_expire_at).toLocaleDateString('fr-FR') : '—'

  const rows = (historique ?? []).map((h: any) => {
    const bc = h.statut === 'actif' ? 'bv' : h.statut === 'en_attente' ? 'bo' : 'br'
    return `<tr>
      <td><span class="badge ${bc}">${h.plan?.toUpperCase()}</span></td>
      <td style="font-weight:600">${(h.montant || 0).toLocaleString('fr-FR')} FCFA</td>
      <td><span class="badge ${bc}">${h.statut}</span></td>
      <td style="font-size:12px">${h.mode_paiement || '—'}</td>
      <td style="font-size:12px">${h.date_debut ? new Date(h.date_debut).toLocaleDateString('fr-FR') : '—'}</td>
      <td style="font-size:12px">${h.date_expiration ? new Date(h.date_expiration).toLocaleDateString('fr-FR') : '—'}</td>
    </tr>`
  }).join('')

  const contenu = `
    <h1 style="font-family:'DM Serif Display',serif;font-size:24px;margin-bottom:20px">💳 Mon abonnement</h1>
    <div class="card">
      <div style="font-size:12px;color:var(--soft);margin-bottom:8px">Structure : <strong>${structure?.nom || '—'}</strong></div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span class="badge bv" style="font-size:15px;padding:6px 16px">${planActuel.toUpperCase()}</span>
        <span style="font-size:13px;color:var(--soft)">Expire le : <strong>${expire}</strong></span>
      </div>
      <a href="/abonnement/plans" class="btn" style="display:inline-block;margin-top:16px">Modifier / Renouveler →</a>
    </div>
    <div class="card">
      <h2 style="font-size:15px;font-weight:700;margin-bottom:14px">Historique des paiements</h2>
      ${(historique ?? []).length === 0
        ? '<p style="color:var(--soft);font-style:italic;font-size:13px">Aucun paiement enregistré</p>'
        : `<div style="overflow-x:auto"><table>
             <thead><tr><th>Plan</th><th>Montant</th><th>Statut</th><th>Mode</th><th>Début</th><th>Fin</th></tr></thead>
             <tbody>${rows}</tbody>
           </table></div>`
      }
    </div>`

  return c.html(layout('Mon abonnement', contenu))
})

// POST /abonnement/initier
abonnementRoutes.post('/initier', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()

  const planId  = String(body.plan  || 'standard')
  const dureeId = String(body.duree || '1m')
  const plan    = PLANS.find(p => p.id === planId)
  const duree   = DUREES.find(d => d.id === dureeId) || DUREES[0]

  if (!plan) return c.redirect('/abonnement/plans?err=Plan+invalide', 303)

  const total   = prixTotal(plan.prix, duree.remise, duree.mois)
  const txId    = `SBFREN-${profil.structure_id?.slice(0,8)}-${Date.now()}`
  const expire  = new Date(Date.now() + duree.mois * 30 * 24 * 60 * 60 * 1000).toISOString()
  const baseUrl = new URL(c.req.url).origin

  await supabase.from('struct_abonnements').insert({
    structure_id: profil.structure_id, plan: planId, montant: total,
    statut: 'en_attente', mode_paiement: 'cinetpay', transaction_id: txId,
    date_debut: new Date().toISOString(), date_expiration: expire,
    notes: `Renouvellement ${duree.label} — ${profil.id}`,
  }).catch(() => {})

  if (!c.env.CINETPAY_SITE_ID || !c.env.CINETPAY_API_KEY) {
    return c.html(layout('Paiement en attente', `
      <div class="card" style="text-align:center;padding:40px">
        <div style="font-size:48px;margin-bottom:16px">📧</div>
        <h2 style="font-family:'DM Serif Display',serif;font-size:22px;margin-bottom:10px">Demande enregistrée</h2>
        <p style="color:var(--soft);font-size:14px;margin-bottom:8px">Plan : <strong>${plan.nom}</strong> — ${duree.label}</p>
        <p style="color:var(--soft);font-size:14px;margin-bottom:20px">Montant : <strong>${total.toLocaleString('fr-FR')} FCFA</strong></p>
        <div class="info">Le paiement en ligne n'est pas encore activé. Notre équipe vous contactera pour finaliser.</div>
        <p style="font-size:12px;color:var(--soft);font-family:monospace;margin-bottom:20px">Réf. ${txId}</p>
        <a href="/abonnement/actuel" class="btn">Retour à mon abonnement</a>
      </div>`))
  }

  const { data: struct } = await supabase.from('struct_structures').select('nom').eq('id', profil.structure_id).single()

  try {
    const res  = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: c.env.CINETPAY_API_KEY, site_id: c.env.CINETPAY_SITE_ID,
        transaction_id: txId, amount: total, currency: 'XOF',
        description: `SantéBF Renouvellement ${plan.nom} — ${duree.label}`,
        notify_url:  `${baseUrl}/webhooks/cinetpay`,
        return_url:  `${baseUrl}/abonnement/retour?plan=${planId}&tx=${txId}&duree=${dureeId}`,
        cancel_url:  `${baseUrl}/abonnement/plans?err=Paiement+annul%C3%A9`,
        customer_name:  `${profil.prenom} ${profil.nom}`,
        customer_email: (profil as any).email || '',
        lang: 'fr',
      }),
    })
    const data = await res.json() as any
    if (data.code === '201' && data.data?.payment_url) return c.redirect(data.data.payment_url, 302)
    return c.redirect(`/abonnement/plans?err=${encodeURIComponent(data.message || 'Erreur passerelle')}`, 303)
  } catch {
    return c.redirect('/abonnement/plans?err=Erreur+connexion+passerelle', 303)
  }
})

// GET /abonnement/retour
abonnementRoutes.get('/retour', async (c) => {
  const supabase = c.get('supabase' as never) as any
  const planId   = c.req.query('plan')  || ''
  const txId     = c.req.query('tx')    || ''
  const dureeId  = c.req.query('duree') || '1m'

  const duree = DUREES.find(d => d.id === dureeId) || DUREES[0]
  const plan  = PLANS.find(p => p.id === planId)

  const { data: abo } = await supabase
    .from('struct_abonnements')
    .select('statut, plan, date_expiration')
    .eq('transaction_id', txId).single()

  if (abo?.statut === 'actif') return c.redirect('/abonnement/plans?ok=paye', 303)

  return c.html(layout('Paiement en cours', `
    <div class="card" style="text-align:center;padding:40px">
      <div style="font-size:48px;margin-bottom:16px">⏳</div>
      <h2 style="font-family:'DM Serif Display',serif;font-size:22px;margin-bottom:10px">Paiement en cours de vérification</h2>
      <p style="color:var(--soft);font-size:14px;margin-bottom:8px">Plan : <strong>${plan?.nom || planId}</strong> — ${duree.label}</p>
      <p style="font-size:12px;color:var(--soft);font-family:monospace;margin-bottom:20px">Réf. : ${txId}</p>
      <div class="info">La validation peut prendre quelques instants.</div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:16px">
        <a href="/abonnement/retour?plan=${planId}&tx=${txId}&duree=${dureeId}" class="btn btn-g">🔄 Vérifier</a>
        <a href="/abonnement/actuel" class="btn">Mon abonnement</a>
      </div>
    </div>`))
})

// GET /abonnement/historique
abonnementRoutes.get('/historique', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: historique } = await supabase
    .from('struct_abonnements')
    .select('*')
    .eq('structure_id', profil.structure_id)
    .order('created_at', { ascending: false })

  const rows = (historique ?? []).map((h: any) => {
    const bc = h.statut === 'actif' ? 'bv' : h.statut === 'en_attente' ? 'bo' : 'br'
    return `<tr>
      <td><span class="badge ${bc}">${h.plan?.toUpperCase()}</span></td>
      <td style="font-weight:600">${(h.montant || 0).toLocaleString('fr-FR')} FCFA</td>
      <td><span class="badge ${bc}">${h.statut}</span></td>
      <td style="font-size:12px">${h.mode_paiement || '—'}</td>
      <td style="font-size:12px">${h.notes?.split('—')[0]?.trim() || '—'}</td>
      <td style="font-size:12px">${h.date_debut ? new Date(h.date_debut).toLocaleDateString('fr-FR') : '—'}</td>
      <td style="font-size:12px">${h.date_expiration ? new Date(h.date_expiration).toLocaleDateString('fr-FR') : '—'}</td>
    </tr>`
  }).join('')

  const contenu = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px">
      <h1 style="font-family:'DM Serif Display',serif;font-size:24px">📋 Historique des paiements</h1>
      <a href="/abonnement/plans" class="btn" style="font-size:12px;padding:8px 14px">💳 Renouveler</a>
    </div>
    <div class="card">
      ${(historique ?? []).length === 0
        ? '<p style="color:var(--soft);font-style:italic;font-size:13px">Aucun paiement enregistré</p>'
        : `<div style="overflow-x:auto"><table>
             <thead><tr><th>Plan</th><th>Montant</th><th>Statut</th><th>Mode</th><th>Durée</th><th>Début</th><th>Fin</th></tr></thead>
             <tbody>${rows}</tbody>
           </table></div>`
      }
    </div>`

  return c.html(layout('Historique paiements', contenu))
})
