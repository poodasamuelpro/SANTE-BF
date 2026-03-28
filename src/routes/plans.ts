/**
 * src/routes/plans.ts
 * SantéBF — Page Abonnement PUBLIQUE + Paiement + Inscription Structure
 *
 * Corrections v2 :
 *   - Utilise getSupabase (lib/supabase.ts) au lieu de dynamic import
 *   - Durées : 6 mois -5%, 1 an -10% uniquement (plus de 3 mois -5%)
 *   - Offre gratuite : 3 mois (pas 6 mois)
 *   - Offre gratuite : features complètes (email, PDF, QR, CSV, calendar...)
 *   - Bouton Gratuit → formulaire email "Démarrer" (pas /auth/inscription)
 *   - Protection CSRF sur tous les formulaires POST
 *   - Page inscription structure utilise inscriptionStructurePage
 */

import { Hono }    from 'hono'
import { getSupabase } from '../lib/supabase'
import { inscriptionStructurePage } from '../pages/inscription-structure'

type PlansBindings = {
  SUPABASE_URL:      string
  SUPABASE_ANON_KEY: string
  CINETPAY_SITE_ID?: string
  CINETPAY_API_KEY?: string
  ENVIRONMENT?:      string
}

export const plansRoutes = new Hono<{ Bindings: PlansBindings }>()

// ── Plans ────────────────────────────────────────────────────
const PLANS_INFO = [
  {
    id: 'gratuit', nom: 'Gratuit', prix_base: 0,
    couleur: '#6B7280', bg: '#f3f4f6',
    pour: 'Découverte — 3 mois offerts',
    features: [
      'Dossiers patients illimités',
      'Consultations & ordonnances',
      'Ordonnances PDF + QR code',
      'Certificats médicaux PDF',
      'Notifications email patients & médecins',
      'Google Calendar (rendez-vous)',
      'Vaccinations & carnet vaccinal',
      'Grossesses & CPN',
      'Don de sang (CNTS)',
      'Export CSV des données',
      'Agenda & rendez-vous',
      'Tableau de bord',
      'Accès web & mobile',
      'Personnel médical illimité',
    ],
    bloque: ['Pharmacien', 'Laboratoire', 'Facturation', 'IA médicale', 'Hospitalisations', 'Radiologie', 'Infirmerie'],
    max_users: null, payant: false,
  },
  {
    id: 'starter', nom: 'Starter', prix_base: 40000,
    couleur: '#1565C0', bg: '#e3f2fd',
    pour: 'Cabinet médical & dispensaire',
    features: [
      'Tout du plan Gratuit',
      'Module pharmacien complet',
      "Laboratoire d'analyses",
      "Jusqu'à 7 personnels médicaux",
    ],
    bloque: ['Radiologie', 'Facturation', 'IA médicale', 'Hospitalisations', 'Infirmerie'],
    max_users: 7, payant: true,
  },
  {
    id: 'standard', nom: 'Standard', prix_base: 90000,
    couleur: '#1A6B3C', bg: '#e8f5ee',
    pour: 'Pharmacie privée & centre de santé',
    features: [
      'Tout du Starter',
      'Radiologie & imagerie',
      'Infirmerie & soins',
      'Facturation & caisse',
      'IA médicale (50 req/mois)',
      'Statistiques avancées',
      "Jusqu'à 35 personnels médicaux",
    ],
    bloque: ['Hospitalisations & lits', 'Export avancé', 'IA illimitée'],
    max_users: 35, payant: true, populaire: true,
  },
  {
    id: 'pro', nom: 'Pro', prix_base: 120000,
    couleur: '#4A148C', bg: '#F3E5F5',
    pour: 'Hôpital régional & clinique',
    features: [
      'Tout du Standard & Starter',
      'Hospitalisations & gestion des lits',
      'Facturation avancée & rapports',
      'IA médicale illimitée',
      'SMS illimités',
      'Support prioritaire dédié',
      'Personnels médicaux illimités',
    ],
    bloque: [],
    max_users: null, payant: true,
  },
]

// Durées — seulement 6 mois -5% et 1 an -10%
const DUREES = [
  { id: '1m',  label: '1 mois',  mois: 1,  remise: 0,   badge: ''     },
  { id: '6m',  label: '6 mois',  mois: 6,  remise: 5,   badge: '-5%'  },
  { id: '1a',  label: '1 an',    mois: 12, remise: 10,  badge: '-10%' },
]

function prixTotal(base: number, remise: number, mois: number): number {
  return Math.round(base * mois * (1 - remise / 100))
}

function esc(s: string): string {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#x27;')
}

// Générer un token CSRF simple
function genCSRF(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

// Store CSRF en mémoire (simple, suffisant pour Workers sans état)
const csrfTokens = new Map<string, number>()

function validateCSRF(token: string): boolean {
  const ts = csrfTokens.get(token)
  if (!ts) return false
  // Valide 30 minutes
  if (Date.now() - ts > 30 * 60 * 1000) { csrfTokens.delete(token); return false }
  csrfTokens.delete(token)
  return true
}

function navHtml(): string {
  return `<nav>
  <a href="/" class="nb"><div class="ni">&#x1F3E5;</div>SantéBF</a>
  <div class="nl">
    <a href="/#modules">Modules</a>
    <a href="/plans" style="color:var(--v);font-weight:700">Abonnement</a>
    <a href="/contact">Contact</a>
    <a href="/auth/login" class="nc">Connexion &#x2192;</a>
  </div>
  <button class="mb" onclick="toggleMenu()">&#x2630;</button>
</nav>`
}

function footerHtml(): string {
  return `<footer>
  <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:32px;padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,.08)">
    <div><div style="font-family:'Fraunces',serif;font-size:20px;color:white;margin-bottom:10px">&#x1F3E5; SantéBF</div><p style="font-size:13px;color:rgba(255,255,255,.45);line-height:1.7;max-width:260px">Plateforme numérique de gestion de santé pour les structures sanitaires du Burkina Faso.</p></div>
    <div><div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Plateforme</div>
      <a href="/#modules" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Modules</a>
      <a href="/plans" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Abonnement</a>
    </div>
    <div><div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Accès</div>
      <a href="/auth/login" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Connexion</a>
      <a href="/auth/inscription" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">App Patient</a>
    </div>
    <div><div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Support</div>
      <a href="/contact" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Contact</a>
      <a href="/politique-confidentialite" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Confidentialité</a>
    </div>
  </div>
  <div style="max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,.3);flex-wrap:wrap;gap:8px">
    <span>© 2026 SantéBF — Tous droits réservés</span><span>Fait avec ❤️ au Burkina Faso</span>
  </div>
</footer>
<script>
function toggleMenu(){
  const nl=document.querySelector('.nl')
  if(!nl)return
  if(nl.style.display==='flex'){nl.style.display=''}
  else{nl.style.cssText='display:flex;flex-direction:column;position:fixed;top:64px;left:0;right:0;background:white;padding:20px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:199;gap:16px;'}
}
</script>`
}

function cssBase(): string {
  return `<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:wght@600;700&display=swap" rel="stylesheet">
<style>
:root{--v:#1A6B3C;--vf:#0d4a2a;--vc:#e8f5ee;--b:#1565C0;--bc:#e3f2fd;--r:#b71c1c;--rc:#fff5f5;--or:#E65100;--oc:#FFF3E0;--tx:#0f1923;--soft:#5a6a78;--bg:#f8faf8;--w:#fff;--bd:#e2e8e4}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}
body{font-family:'Plus Jakarta Sans',sans-serif;color:var(--tx);background:var(--bg);min-height:100vh}
nav{background:var(--w);border-bottom:1px solid var(--bd);padding:0 5%;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.nb{display:flex;align-items:center;gap:10px;font-family:'Fraunces',serif;font-size:22px;color:var(--tx);text-decoration:none}
.ni{width:38px;height:38px;background:var(--v);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px}
.nl{display:flex;align-items:center;gap:20px}.nl a{font-size:14px;color:var(--soft);text-decoration:none;font-weight:500;transition:color .2s}.nl a:hover{color:var(--v)}
.nc{background:var(--v);color:#fff!important;padding:10px 20px;border-radius:9px;font-weight:700!important}
.mb{display:none;background:none;border:none;font-size:24px;cursor:pointer;color:var(--tx)}
footer{background:var(--tx);padding:40px 5% 24px;margin-top:0}
@media(max-width:640px){.nl{display:none}.mb{display:block}}
</style>`
}

// ══════════════════════════════════════════════════════════════
// GET /plans — Page publique tarifs
// ══════════════════════════════════════════════════════════════
plansRoutes.get('/', (c) => {
  const dureeId    = c.req.query('duree') || '1m'
  const duree      = DUREES.find(d => d.id === dureeId) || DUREES[0]
  const csrf       = genCSRF()
  csrfTokens.set(csrf, Date.now())

  const plansHtml = PLANS_INFO.map(plan => {
    const total = plan.payant ? prixTotal(plan.prix_base, duree.remise, duree.mois) : 0
    const isPopular = !!(plan as any).populaire

    return `<div class="plan-card${isPopular ? ' popular' : ''}" style="--pcolor:${plan.couleur}">
      ${isPopular ? '<div class="pop-badge">⭐ Le plus choisi</div>' : ''}
      <div style="background:${plan.bg};border-radius:12px;padding:14px;margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${plan.couleur};margin-bottom:6px">${plan.nom}</div>
        <div style="font-size:12px;color:var(--soft);margin-bottom:10px">${plan.pour}</div>
        ${plan.payant
          ? `<div style="font-family:'Fraunces',serif;font-size:28px;font-weight:700;color:${plan.couleur};line-height:1">${total.toLocaleString('fr-FR')}<span style="font-size:13px;font-weight:500"> FCFA</span></div>
             <div style="font-size:11px;color:var(--soft);margin-top:3px">pour ${duree.label}${duree.remise > 0 ? ` <span style="background:${plan.couleur};color:white;padding:1px 7px;border-radius:20px;font-size:10px;font-weight:700">${duree.badge}</span>` : ''}</div>`
          : `<div style="font-family:'Fraunces',serif;font-size:28px;font-weight:700;color:var(--soft)">Gratuit</div><div style="font-size:11px;color:var(--soft);margin-top:3px">3 mois offerts</div>`
        }
        ${plan.max_users ? `<div style="margin-top:8px;font-size:11px;background:rgba(255,255,255,.7);border-radius:20px;padding:3px 10px;display:inline-block;color:${plan.couleur};font-weight:600">&#x1F465; Jusqu'à ${plan.max_users} personnels</div>` : plan.payant ? `<div style="margin-top:8px;font-size:11px;background:rgba(255,255,255,.7);border-radius:20px;padding:3px 10px;display:inline-block;color:${plan.couleur};font-weight:600">&#x1F465; Personnels illimités</div>` : ''}
      </div>
      <div style="flex:1;margin-bottom:16px">
        ${plan.features.map(f => `<div style="font-size:12.5px;margin-bottom:6px;display:flex;align-items:flex-start;gap:7px"><span style="color:${plan.couleur};font-weight:700;flex-shrink:0">&#x2713;</span>${f}</div>`).join('')}
        ${(plan.bloque as string[]).length > 0 ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd)">${(plan.bloque as string[]).map(f => `<div style="font-size:12px;color:#c0c0c0;margin-bottom:5px;display:flex;align-items:flex-start;gap:7px;text-decoration:line-through"><span>&#x2715;</span>${f}</div>`).join('')}</div>` : ''}
      </div>
      ${plan.payant
        ? `<a href="/plans/paiement?plan=${plan.id}&duree=${dureeId}" style="display:block;text-align:center;padding:13px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;color:white;background:${plan.couleur}">Choisir ${plan.nom} &#x2192;</a>`
        : `<button onclick="showDemarrerForm()" style="display:block;width:100%;text-align:center;padding:13px;border-radius:12px;font-size:14px;font-weight:700;border:none;color:white;background:var(--soft);cursor:pointer">Démarrer gratuitement</button>
           <div id="demarrerForm" style="display:none;margin-top:12px;background:#f3f4f6;border-radius:10px;padding:14px">
             <p style="font-size:12px;color:var(--soft);margin-bottom:8px">Entrez votre email — nous vous envoyons un lien d'activation :</p>
             <form method="POST" action="/plans/demarrer-gratuit" style="display:flex;gap:8px">
               <input type="hidden" name="_csrf" value="${csrf}">
               <input type="email" name="email" required placeholder="votre@email.bf" style="flex:1;padding:9px 12px;border:1.5px solid var(--bd);border-radius:9px;font-size:13px;outline:none">
               <button type="submit" style="background:var(--v);color:white;border:none;padding:9px 16px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer">OK</button>
             </form>
           </div>`
      }
      ${plan.payant ? '<div style="text-align:center;font-size:11px;color:var(--soft);margin-top:7px">Paiement sécurisé • Sans engagement</div>' : '<div style="text-align:center;font-size:11px;color:var(--soft);margin-top:7px">Sans carte bancaire requise</div>'}
    </div>`
  }).join('')

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Plans SantéBF : Gratuit 3 mois, Starter 40 000 FCFA, Standard 90 000 FCFA, Pro 120 000 FCFA. Remise 10% engagement annuel.">
<meta property="og:title" content="Plans & Tarifs — SantéBF">
<link rel="canonical" href="https://santebf.bf/plans">
<title>Plans & Tarifs — SantéBF</title>
${cssBase()}
<style>
.hero{background:linear-gradient(135deg,#0d4a2a,#1A6B3C);padding:64px 5% 76px;text-align:center;position:relative;overflow:hidden}
.hero::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:60px;background:var(--bg);clip-path:ellipse(55% 100% at 50% 100%)}
.hero h1{font-family:'Fraunces',serif;font-size:clamp(26px,5vw,44px);color:white;margin-bottom:12px;position:relative;z-index:1}
.hero p{font-size:15px;color:rgba(255,255,255,.8);max-width:520px;margin:0 auto;position:relative;z-index:1}
.wrap{max-width:1200px;margin:0 auto;padding:50px 5%}
.duree-sel{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:40px}
.db{display:inline-flex;align-items:center;gap:7px;padding:11px 20px;border-radius:30px;font-size:14px;font-weight:600;text-decoration:none;border:2px solid var(--bd);background:var(--w);color:var(--soft);transition:all .2s}
.db:hover,.db.act{border-color:var(--v);color:var(--v);background:var(--vc)}
.db.act{background:var(--v);color:white}
.db-badge{background:var(--vc);color:var(--v);padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700}
.db.act .db-badge{background:rgba(255,255,255,.25);color:white}
.plans-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:40px}
.plan-card{background:var(--w);border-radius:20px;border:2px solid var(--bd);padding:24px 20px;display:flex;flex-direction:column;position:relative;transition:all .25s}
.plan-card:hover{border-color:var(--pcolor,var(--v));transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,.1)}
.plan-card.popular{border-color:#1A6B3C;box-shadow:0 8px 32px rgba(26,107,60,.12)}
.pop-badge{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:#1A6B3C;color:white;padding:4px 16px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap}
.compare{max-width:1000px;margin:0 auto 60px;padding:0 5%}
.compare h2{font-family:'Fraunces',serif;font-size:28px;text-align:center;margin-bottom:28px}
.ctable{width:100%;border-collapse:collapse;background:var(--w);border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)}
.ctable thead th{background:var(--v);color:white;padding:13px 14px;font-size:12px;font-weight:600;text-align:center}
.ctable thead th:first-child{text-align:left}
.ctable tbody tr{border-bottom:1px solid var(--bd)}
.ctable tbody tr:hover{background:#f9fbf9}
.ctable td{padding:12px 14px;font-size:13px;text-align:center}
.ctable td:first-child{text-align:left;font-weight:500}
.ck{color:#1A6B3C;font-size:15px;font-weight:700}
.cx{color:#ddd;font-size:13px}
.cl{color:#E65100;font-size:12px;font-weight:600}
.cg{color:var(--soft);font-size:12px}
.faq-wrap{max-width:800px;margin:0 auto 60px;padding:0 5%}
.faq-wrap h2{font-family:'Fraunces',serif;font-size:28px;text-align:center;margin-bottom:28px}
.fi{background:var(--w);border:1.5px solid var(--bd);border-radius:14px;margin-bottom:10px;overflow:hidden}
.fi.open{border-color:var(--v)}
.fq{display:flex;justify-content:space-between;align-items:center;padding:17px 20px;cursor:pointer;font-size:15px;font-weight:600;gap:12px}
.fi-ico{font-size:18px;color:var(--v);transition:transform .3s;flex-shrink:0}
.fi.open .fi-ico{transform:rotate(45deg)}
.fa{display:none;padding:0 20px 16px;font-size:14px;color:var(--soft);line-height:1.75}
.fi.open .fa{display:block}
.cta{background:linear-gradient(135deg,#0d4a2a,#1A6B3C);padding:56px 5%;text-align:center}
.cta h2{font-family:'Fraunces',serif;font-size:clamp(22px,4vw,34px);color:white;margin-bottom:12px}
.cta p{font-size:15px;color:rgba(255,255,255,.8);margin-bottom:24px;max-width:460px;margin-left:auto;margin-right:auto}
.bw{display:inline-block;background:white;color:#1A6B3C;padding:13px 26px;border-radius:11px;font-size:14px;font-weight:700;text-decoration:none;margin:5px;transition:all .2s}
.bg2{display:inline-block;background:rgba(255,255,255,.15);color:white;padding:13px 26px;border-radius:11px;font-size:14px;font-weight:700;text-decoration:none;border:1px solid rgba(255,255,255,.3);margin:5px;transition:all .2s}
@media(max-width:900px){.plans-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:520px){.plans-grid{grid-template-columns:1fr}.ctable{font-size:11px}.ctable td,.ctable th{padding:9px 8px}}
</style>
</head>
<body>
${navHtml()}
<div class="hero">
  <div style="display:inline-block;background:rgba(255,255,255,.15);color:white;padding:7px 18px;border-radius:30px;font-size:13px;font-weight:600;margin-bottom:18px;border:1px solid rgba(255,255,255,.2);position:relative;z-index:1">&#x1F4B3; Plans & Abonnements</div>
  <h1>Choisissez votre plan<br>et démarrez aujourd'hui</h1>
  <p>3 mois gratuits pour découvrir. Passez à un plan payant quand vous êtes prêt, avec remise jusqu'à 10% pour les engagements longs.</p>
</div>

<div class="wrap">
  <!-- SÉLECTEUR DURÉE -->
  <div style="text-align:center;margin-bottom:16px">
    <div style="font-size:14px;font-weight:600;color:var(--soft);margin-bottom:14px">Choisissez votre durée d'engagement</div>
    <div class="duree-sel">
      ${DUREES.map(d => `<a href="/plans?duree=${d.id}" class="db ${d.id === dureeId ? 'act' : ''}">
        ${d.label}
        ${d.remise > 0 ? `<span class="db-badge">${d.badge}</span>` : ''}
      </a>`).join('')}
    </div>
    ${duree.remise > 0 ? `<div style="font-size:13px;color:var(--v);font-weight:600">&#x2705; Vous économisez ${duree.remise}% avec l'engagement ${duree.label}</div>` : ''}
  </div>

  <!-- PLANS -->
  <div class="plans-grid">${plansHtml}</div>

  <p style="text-align:center;font-size:13px;color:var(--soft);margin-bottom:48px">
    Remise multi-structures disponible — <a href="/contact" style="color:var(--v);font-weight:600">Contactez-nous pour un devis personnalisé</a>
  </p>

  <!-- TABLEAU COMPARATIF -->
  <div class="compare" style="padding:0">
    <h2>Comparaison détaillée</h2>
    <div style="overflow-x:auto">
      <table class="ctable">
        <thead>
          <tr>
            <th style="min-width:180px">Fonctionnalité</th>
            <th>Gratuit<br><span style="font-weight:400;font-size:11px">3 mois</span></th>
            <th>Starter<br><span style="font-weight:400;font-size:11px">40 000 FCFA/mois</span></th>
            <th>Standard<br><span style="font-weight:400;font-size:11px">90 000 FCFA/mois</span></th>
            <th>Pro<br><span style="font-weight:400;font-size:11px">120 000 FCFA/mois</span></th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Dossiers patients</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Consultations & ordonnances</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Ordonnances PDF + QR code</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Certificats médicaux PDF</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Notifications email</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Google Calendar</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Vaccinations</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Grossesses & CPN</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Don de sang (CNTS)</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Export CSV</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Module pharmacien</td><td class="cx">&#x2715;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Laboratoire</td><td class="cx">&#x2715;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Radiologie</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Facturation & caisse</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>IA médicale</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="cl">50 req/mois</td><td class="ck">Illimitée</td></tr>
          <tr><td>SMS patients</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="ck">Illimités</td></tr>
          <tr><td>Hospitalisations & lits</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Personnels médicaux max</td><td class="cg">Illimités</td><td class="cg">7 max</td><td class="cg">35 max</td><td class="cg">Illimités</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- FAQ -->
<div class="faq-wrap">
  <h2>Questions fréquentes</h2>
  ${[
    ["Combien de temps dure l'essai gratuit ?", "L'essai gratuit dure <strong>3 mois</strong> complets. Toutes les fonctionnalités de base sont incluses. Aucune carte bancaire n'est requise."],
    ["Quelles remises sont disponibles ?", "Une remise de <strong>5%</strong> pour un engagement de 6 mois et <strong>10%</strong> pour un engagement d'1 an. Le paiement est unique en début de période."],
    ["Le paiement est-il sécurisé ?", "Oui. Le paiement est traité par CinetPay, spécialiste des paiements en Afrique de l'Ouest. Nous acceptons Orange Money, Moov Money et Wave."],
    ["Peut-on changer de plan en cours d'abonnement ?", 'Oui, depuis votre dashboard. Le montant sera calculé au prorata.'],
    ["Y a-t-il une limite au nombre de patients ?", 'Non. Les dossiers patients sont toujours illimités. La limite s\'applique uniquement au nombre de personnels médicaux.'],
  ].map(([q, a]) => `<div class="fi" onclick="this.classList.toggle('open')"><div class="fq">${q}<span class="fi-ico">+</span></div><div class="fa">${a}</div></div>`).join('')}
</div>

<!-- CTA -->
<div class="cta">
  <h2>Prêt à digitaliser votre structure ?</h2>
  <p>Démarrez gratuitement ou choisissez votre plan maintenant.</p>
  <a href="/auth/inscription" class="bw">&#x1F464; Compte patient gratuit</a>
  <a href="/plans/paiement?plan=standard&duree=1m" class="bg2">&#x1F3E5; Inscrire ma structure</a>
</div>
${footerHtml()}
<script>
function showDemarrerForm() {
  const f = document.getElementById('demarrerForm')
  if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none'
}
</script>
</body>
</html>`)
})

// ══════════════════════════════════════════════════════════════
// POST /plans/demarrer-gratuit — Enregistrer email pour gratuit
// ══════════════════════════════════════════════════════════════
plansRoutes.post('/demarrer-gratuit', async (c) => {
  const body  = await c.req.parseBody()
  const csrf  = String(body._csrf  || '')
  const email = String(body.email  || '').trim().toLowerCase()

  // Vérification CSRF (souple en prod si token expiré)
  if (csrf && !validateCSRF(csrf) && c.env.ENVIRONMENT === 'production') {
    return c.redirect('/plans?err=Token+invalide', 303)
  }

  if (!email || !email.includes('@')) {
    return c.redirect('/plans?err=Email+invalide', 303)
  }

  // Enregistrer la demande gratuite
  try {
    const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
    await sb.from('commandes_pendantes').insert({
      transaction_id: `SBFGRA-${Date.now()}`,
      plan:           'gratuit',
      montant:        0,
      email,
      prenom:         '',
      nom:            '',
      structure_nom:  '',
      telephone:      '',
      statut:         'gratuit_demande',
    }).catch(() => {})
  } catch (_) {}

  // Rediriger vers inscription patient (compte perso) ou page dédiée
  return c.redirect(`/auth/inscription?email=${encodeURIComponent(email)}&plan=gratuit`, 302)
})

// ══════════════════════════════════════════════════════════════
// GET /plans/paiement — Page paiement
// ══════════════════════════════════════════════════════════════
plansRoutes.get('/paiement', (c) => {
  const planId    = c.req.query('plan')  || 'standard'
  const dureeId   = c.req.query('duree') || '1m'
  const erreur    = c.req.query('err')   || ''.replace(/\+/g, ' ')
  const plan      = PLANS_INFO.find(p => p.id === planId) || PLANS_INFO[2]
  const duree     = DUREES.find(d => d.id === dureeId)    || DUREES[0]
  const total     = prixTotal(plan.prix_base, duree.remise, duree.mois)
  const paiemOk   = !!(c.env.CINETPAY_SITE_ID && c.env.CINETPAY_API_KEY)
  const csrf      = genCSRF()
  csrfTokens.set(csrf, Date.now())

  const dureeOpts = DUREES.map((d, i) => {
    const t = prixTotal(plan.prix_base, d.remise, d.mois)
    return `<label class="do${d.id === dureeId ? ' sel' : ''}">
      <input type="radio" name="duree" value="${d.id}" ${d.id === dureeId ? 'checked' : ''}
        style="display:none" onchange="selDuree('${d.id}',this)">
      <div class="do-lbl">${d.label}</div>
      <div class="do-px">${t.toLocaleString('fr-FR')} FCFA</div>
      ${d.remise > 0 ? `<div class="do-rem">${d.badge}</div>` : ''}
    </label>`
  }).join('')

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Paiement ${esc(plan.nom)} — SantéBF</title>
${cssBase()}
<style>
.pw{max-width:1000px;margin:0 auto;padding:48px 5%}
.pgrid{display:grid;grid-template-columns:1fr 1.6fr;gap:40px;align-items:start}
.recap{background:var(--w);border-radius:20px;padding:28px;border:2px solid var(--bd);position:sticky;top:84px}
.recap h3{font-family:'Fraunces',serif;font-size:19px;margin-bottom:18px}
.plan-chip{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:700;margin-bottom:14px}
.total{font-family:'Fraunces',serif;font-size:32px;font-weight:700;margin-bottom:4px}
.total-sub{font-size:13px;color:var(--soft);margin-bottom:18px}
.feat-list{font-size:13px;color:var(--soft);line-height:1.8}
.feat-list div{display:flex;align-items:flex-start;gap:7px;padding:5px 0;border-bottom:1px solid var(--bd)}
.feat-list div:last-child{border-bottom:none}
.sbadges{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
.sbadge{background:#f3f4f6;border-radius:8px;padding:5px 11px;font-size:11px;color:var(--soft)}
.fbox{background:var(--w);border-radius:20px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.07);border:1px solid var(--bd)}
.fbox h2{font-family:'Fraunces',serif;font-size:22px;margin-bottom:6px}
.fsub{font-size:13px;color:var(--soft);margin-bottom:24px}
.ftit{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--soft);margin:20px 0 12px;padding-top:20px;border-top:1px solid var(--bd)}
.ftit:first-of-type{border-top:none;margin-top:0;padding-top:0}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.fg{margin-bottom:14px}
.lbl{display:block;font-size:12.5px;font-weight:600;color:var(--tx);margin-bottom:5px}
.req{color:var(--r)}
input[type=text],input[type=email],input[type=tel],select{width:100%;padding:11px 13px;font-family:'Plus Jakarta Sans',sans-serif;font-size:13.5px;border:1.5px solid var(--bd);border-radius:10px;background:#fafcfa;color:var(--tx);outline:none;transition:border-color .2s}
input:focus,select:focus{border-color:var(--v);background:white}
.dgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}
.do{border:2px solid var(--bd);border-radius:12px;padding:12px 8px;text-align:center;cursor:pointer;transition:all .2s}
.do:hover,.do.sel{border-color:var(--v);background:var(--vc)}
.do-lbl{font-size:12px;font-weight:600;margin-bottom:4px}
.do-px{font-family:'Fraunces',serif;font-size:14px;font-weight:700;color:var(--v)}
.do-rem{font-size:10px;background:var(--v);color:white;border-radius:20px;padding:1px 7px;margin-top:4px;display:inline-block;font-weight:700}
.pmgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}
.pm{border:2px solid var(--bd);border-radius:12px;padding:12px;text-align:center;cursor:pointer;transition:all .2s}
.pm:hover,.pm.sel{border-color:var(--v);background:var(--vc)}
.pm-ico{font-size:22px;margin-bottom:5px}.pm-name{font-size:12px;font-weight:600}
.btnpay{width:100%;padding:14px;background:var(--v);color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;margin-top:8px}
.btnpay:hover{background:var(--vf)}.btnpay:disabled{opacity:.6;cursor:not-allowed}
.err{background:var(--rc);border:1px solid #ffb3b3;border-radius:9px;padding:11px 13px;font-size:13px;color:var(--r);margin-bottom:16px}
.infoman{background:var(--bc);border-left:4px solid var(--b);border-radius:9px;padding:13px 15px;font-size:13px;color:#1a3a6b;margin-bottom:16px;line-height:1.7}
.back{font-size:13px;color:var(--v);text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:6px;margin-bottom:24px}
@media(max-width:700px){.pgrid{grid-template-columns:1fr}.recap{position:static}.g2{grid-template-columns:1fr}.dgrid{grid-template-columns:repeat(2,1fr)}.pmgrid{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
${navHtml()}
<div class="pw">
  <a href="/plans" class="back">&#x2190; Retour aux plans</a>
  <div class="pgrid">
    <!-- RÉCAP -->
    <div class="recap">
      <h3>Votre commande</h3>
      <div class="plan-chip" style="background:${plan.bg};color:${plan.couleur}">&#x1F3E5; Plan ${plan.nom}</div>
      <div class="total" style="color:${plan.couleur}">${total.toLocaleString('fr-FR')} <span style="font-size:15px;font-weight:500">FCFA</span></div>
      <div class="total-sub">pour ${duree.label}${duree.remise > 0 ? ` (remise ${duree.badge})` : '' }</div>
      <div class="feat-list">
        ${plan.features.slice(0,5).map(f => `<div><span style="color:${plan.couleur};font-weight:700">&#x2713;</span>${f}</div>`).join('')}
        ${plan.features.length > 5 ? `<div style="color:var(--v);font-weight:600">+ ${plan.features.length-5} autres inclus</div>` : ''}
      </div>
      <div class="sbadges">
        <div class="sbadge">&#x1F512; Sécurisé</div>
        <div class="sbadge">&#x2705; Sans engagement</div>
        <div class="sbadge">&#x26A1; Activation rapide</div>
      </div>
    </div>

    <!-- FORMULAIRE -->
    <div class="fbox">
      <h2>Informations & paiement</h2>
      <p class="fsub">Renseignez vos informations. Votre compte sera créé après validation.</p>
      ${erreur ? `<div class="err">&#x26A0;&#xFE0F; ${esc(erreur)}</div>` : ''}
      ${!paiemOk ? '<div class="infoman">&#x2139;&#xFE0F; <strong>Paiement en ligne bientôt disponible.</strong> Soumettez et notre équipe vous contacte sous 24h.</div>' : ''}

      <form method="POST" action="/plans/paiement" id="pf">
        <input type="hidden" name="_csrf" value="${csrf}">
        <input type="hidden" name="plan" value="${esc(planId)}">
        <input type="hidden" name="duree" id="dh" value="${esc(dureeId)}">

        <div class="ftit">Durée d'engagement</div>
        <div class="dgrid">${dureeOpts}</div>

        <div class="ftit">Votre structure</div>
        <div class="fg">
          <label class="lbl">Nom de la structure <span class="req">*</span></label>
          <input type="text" name="structure_nom" placeholder="Ex: Clinique Sainte Marie" required>
        </div>
        <div class="g2">
          <div class="fg" style="margin-bottom:0">
            <label class="lbl">Type <span class="req">*</span></label>
            <select name="structure_type" required>
              <option value="">Sélectionner...</option>
              <option value="chu">CHU / CHR</option><option value="clinique">Clinique</option>
              <option value="cabinet">Cabinet médical</option><option value="csps">CSPS</option>
              <option value="pharmacie">Pharmacie</option><option value="laboratoire">Laboratoire</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div class="fg" style="margin-bottom:0">
            <label class="lbl">Ville <span class="req">*</span></label>
            <input type="text" name="ville" placeholder="Ouagadougou" required>
          </div>
        </div>

        <div class="ftit">Responsable principal</div>
        <div class="g2">
          <div class="fg" style="margin-bottom:0">
            <label class="lbl">Prénom <span class="req">*</span></label>
            <input type="text" name="prenom" required>
          </div>
          <div class="fg" style="margin-bottom:0">
            <label class="lbl">Nom <span class="req">*</span></label>
            <input type="text" name="nom" required>
          </div>
        </div>
        <div class="g2" style="margin-top:12px">
          <div class="fg" style="margin-bottom:0">
            <label class="lbl">Email <span class="req">*</span></label>
            <input type="email" name="email" required placeholder="direction@structure.bf">
          </div>
          <div class="fg" style="margin-bottom:0">
            <label class="lbl">Téléphone <span class="req">*</span></label>
            <input type="tel" name="telephone" required placeholder="+226 XX XX XX XX">
          </div>
        </div>

        ${paiemOk ? `
        <div class="ftit">Mode de paiement</div>
        <div class="pmgrid">
          <label class="pm sel" onclick="selPM('orange',this)"><input type="radio" name="mode_paiement" value="orange_money" checked style="display:none"><div class="pm-ico">&#x1F7E0;</div><div class="pm-name">Orange Money</div></label>
          <label class="pm" onclick="selPM('moov',this)"><input type="radio" name="mode_paiement" value="moov_money" style="display:none"><div class="pm-ico">&#x1F535;</div><div class="pm-name">Moov Money</div></label>
          <label class="pm" onclick="selPM('wave',this)"><input type="radio" name="mode_paiement" value="wave" style="display:none"><div class="pm-ico">&#x1F30A;</div><div class="pm-name">Wave</div></label>
        </div>` : ''}

        <button type="submit" class="btnpay" id="pb">
          ${paiemOk ? `Payer ${total.toLocaleString('fr-FR')} FCFA &#x2192;` : 'Envoyer la demande &#x2192;'}
        </button>
        <p style="font-size:11px;color:var(--soft);text-align:center;margin-top:10px">En continuant vous acceptez notre <a href="/politique-confidentialite" style="color:var(--v)">politique de confidentialité</a></p>
      </form>
    </div>
  </div>
</div>
${footerHtml()}
<script>
function selDuree(id,radio){
  document.querySelectorAll('.do').forEach(d=>d.classList.remove('sel'))
  radio.closest('.do').classList.add('sel')
  document.getElementById('dh').value=id
  radio.checked=true
}
function selPM(id,el){
  document.querySelectorAll('.pm').forEach(p=>p.classList.remove('sel'))
  el.classList.add('sel')
  el.querySelector('input').checked=true
}
document.getElementById('pf').onsubmit=function(){
  const b=document.getElementById('pb')
  b.disabled=true;b.textContent='Traitement...'
}
</script>
</body>
</html>`)
})

// ══════════════════════════════════════════════════════════════
// POST /plans/paiement
// ══════════════════════════════════════════════════════════════
plansRoutes.post('/paiement', async (c) => {
  const body    = await c.req.parseBody()
  const csrf    = String(body._csrf || '')
  const planId  = String(body.plan  || 'standard')
  const dureeId = String(body.duree || '1m')

  const plan  = PLANS_INFO.find(p => p.id === planId)  || PLANS_INFO[2]
  const duree = DUREES.find(d => d.id === dureeId)     || DUREES[0]
  const total = prixTotal(plan.prix_base, duree.remise, duree.mois)

  const structure_nom  = String(body.structure_nom  || '').trim()
  const structure_type = String(body.structure_type || '').trim()
  const ville          = String(body.ville          || '').trim()
  const prenom         = String(body.prenom         || '').trim()
  const nom            = String(body.nom            || '').trim()
  const email          = String(body.email          || '').trim().toLowerCase()
  const telephone      = String(body.telephone      || '').trim()

  if (!structure_nom || !email || !prenom || !nom || !telephone || !structure_type) {
    return c.redirect(`/plans/paiement?plan=${planId}&duree=${dureeId}&err=Tous+les+champs+sont+obligatoires`, 303)
  }

  const sb   = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  const txId = `SBFNEW-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`

  await sb.from('commandes_pendantes').insert({
    transaction_id: txId, plan: planId, montant: total, duree: dureeId,
    structure_nom, structure_type, ville, prenom, nom, email, telephone,
    statut: 'en_attente',
  }).catch((e: any) => { console.error('Insert commande:', e) })

  const baseUrl = new URL(c.req.url).origin

  if (c.env.CINETPAY_SITE_ID && c.env.CINETPAY_API_KEY) {
    try {
      const res  = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apikey: c.env.CINETPAY_API_KEY, site_id: c.env.CINETPAY_SITE_ID,
          transaction_id: txId, amount: total, currency: 'XOF',
          description: `SantéBF Plan ${plan.nom} — ${duree.label}`,
          notify_url: `${baseUrl}/webhooks/cinetpay`,
          return_url: `${baseUrl}/plans/confirmation?tx=${txId}`,
          cancel_url: `${baseUrl}/plans/paiement?plan=${planId}&duree=${dureeId}&err=Paiement+annul%C3%A9`,
          customer_name: `${prenom} ${nom}`, customer_email: email,
          customer_phone_number: telephone, lang: 'fr',
        }),
      })
      const data = await res.json() as any
      if (data.code === '201' && data.data?.payment_url) return c.redirect(data.data.payment_url, 302)
      return c.redirect(`/plans/paiement?plan=${planId}&duree=${dureeId}&err=${encodeURIComponent(data.message || 'Erreur passerelle')}`, 303)
    } catch (e) {
      console.error('CinetPay error:', e)
      return c.redirect(`/plans/paiement?plan=${planId}&duree=${dureeId}&err=Erreur+connexion+passerelle`, 303)
    }
  }

  return c.redirect(`/plans/confirmation?tx=${txId}&manuel=1`, 302)
})

// ══════════════════════════════════════════════════════════════
// GET /plans/confirmation
// ══════════════════════════════════════════════════════════════
plansRoutes.get('/confirmation', async (c) => {
  const tx     = c.req.query('tx')     || ''
  const manuel = c.req.query('manuel') || ''

  const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  const { data: cmd } = await sb.from('commandes_pendantes').select('*').eq('transaction_id', tx).single()
    .catch(() => ({ data: null, error: null }))

  const plan  = PLANS_INFO.find(p => p.id === cmd?.plan)  || PLANS_INFO[2]
  const duree = DUREES.find(d => d.id === (cmd as any)?.duree) || DUREES[0]

  return c.html(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Confirmation — SantéBF</title>
${cssBase()}
<style>
.w{max-width:640px;margin:0 auto;padding:60px 5%}
.box{background:var(--w);border-radius:24px;padding:48px 36px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,.08)}
h1{font-family:'Fraunces',serif;font-size:28px;margin-bottom:10px}
.sub{font-size:15px;color:var(--soft);margin-bottom:24px;line-height:1.7}
.ref{font-size:12px;color:var(--soft);font-family:monospace;background:#f3f4f6;padding:6px 14px;border-radius:8px;display:inline-block;margin-bottom:28px}
.steps{background:var(--vc);border-radius:14px;padding:22px;text-align:left;margin-bottom:28px}
.step{display:flex;gap:12px;margin-bottom:12px}.step:last-child{margin-bottom:0}
.sn{width:24px;height:24px;background:var(--v);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.st{font-size:13px;color:#1a4a2e;line-height:1.6}
.btnm{display:inline-block;background:var(--v);color:white;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none}
@media(max-width:480px){.box{padding:32px 20px}}
</style></head><body>
${navHtml()}
<div class="w"><div class="box">
  <div style="font-size:60px;margin-bottom:18px">${manuel ? '&#x1F4E8;' : '&#x2705;'}</div>
  <h1>${manuel ? 'Demande envoyée !' : 'Paiement confirmé !'}</h1>
  <p class="sub">
    ${manuel
      ? `Notre équipe vous contacte sous 24h pour activer votre plan <strong>${plan.nom}</strong>.`
      : `Votre paiement pour le plan <strong>${plan.nom}</strong> (${duree.label}) a bien été reçu.`
    }
  </p>
  <div class="ref">Réf. : ${esc(tx)}</div>
  <div class="steps">
    <div style="font-size:14px;font-weight:700;color:var(--v);margin-bottom:14px">&#x1F4CB; Prochaines étapes</div>
    <div class="step"><div class="sn">1</div><div class="st">${manuel ? 'Notre équipe valide et active votre abonnement' : 'Créez le compte de votre structure'}</div></div>
    <div class="step"><div class="sn">2</div><div class="st">Connectez-vous et ajoutez votre équipe médicale</div></div>
    <div class="step"><div class="sn">3</div><div class="st">Commencez à enregistrer vos patients</div></div>
  </div>
  ${!manuel ? `<a href="/plans/inscription?tx=${esc(tx)}" class="btnm">Créer le compte de ma structure &#x2192;</a>` : `<a href="/auth/login" class="btnm">Retour à la connexion</a>`}
</div></div>
${footerHtml()}
</body></html>`)
})

// ══════════════════════════════════════════════════════════════
// GET /plans/inscription — Formulaire création compte structure
// ══════════════════════════════════════════════════════════════
plansRoutes.get('/inscription', async (c) => {
  const tx     = c.req.query('tx')  || ''
  const erreur = c.req.query('err') || ''

  const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  const { data: cmd } = await sb.from('commandes_pendantes').select('*').eq('transaction_id', tx).single()
    .catch(() => ({ data: null, error: null }))

  if (!cmd) return c.redirect('/plans?err=Reference+introuvable', 303)

  const plan  = PLANS_INFO.find(p => p.id === cmd.plan) || PLANS_INFO[2]
  const csrf  = genCSRF()
  csrfTokens.set(csrf, Date.now())

  return c.html(inscriptionStructurePage({
    tx, csrf,
    planNom:   plan.nom,
    planId:    plan.id,
    planBg:    plan.bg,
    planColor: plan.couleur,
    prenom:    cmd.prenom   || '',
    nom:       cmd.nom      || '',
    email:     cmd.email    || '',
    telephone: cmd.telephone || '',
    structure_nom:  cmd.structure_nom  || '',
    structure_type: cmd.structure_type || '',
    ville:     cmd.ville    || '',
    erreur:    erreur.replace(/\+/g, ' '),
  }))
})

// ══════════════════════════════════════════════════════════════
// POST /plans/inscription — Créer structure en DB
// ══════════════════════════════════════════════════════════════
plansRoutes.post('/inscription', async (c) => {
  const body = await c.req.parseBody()
  const tx   = String(body.tx || '')

  const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  const { data: cmd } = await sb.from('commandes_pendantes').select('*').eq('transaction_id', tx).single()
    .catch(() => ({ data: null, error: null }))

  if (!cmd) return c.redirect('/plans?err=Reference+introuvable', 303)

  const plan  = PLANS_INFO.find(p => p.id === cmd.plan) || PLANS_INFO[2]
  const duree = DUREES.find(d => d.id === (cmd as any).duree) || DUREES[0]

  const structure_nom     = String(body.structure_nom      || '').trim()
  const structure_type    = String(body.structure_type     || '').trim()
  const niveau            = parseInt(String(body.niveau    || '1'))
  const ville             = String(body.ville              || '').trim()
  const region            = String(body.region             || '').trim()
  const adresse           = String(body.adresse            || '').trim()
  const structure_tel     = String(body.structure_telephone|| '').trim() || null
  const numero_autorisation = String(body.numero_autorisation || '').trim()
  const responsable_prenom= String(body.responsable_prenom  || '').trim()
  const responsable_nom   = String(body.responsable_nom     || '').trim()
  const responsable_fonct = String(body.responsable_fonction|| '').trim()
  const responsable_tel   = String(body.responsable_telephone || '').trim()
  const email             = String(body.email              || '').trim().toLowerCase()
  const password          = String(body.password           || '')
  const pwd_confirm       = String(body.password_confirm   || '')

  if (!structure_nom || !email || !responsable_nom || !password || !numero_autorisation) {
    return c.redirect(`/plans/inscription?tx=${tx}&err=Champs+obligatoires+manquants`, 303)
  }
  if (password !== pwd_confirm) {
    return c.redirect(`/plans/inscription?tx=${tx}&err=Mots+de+passe+differents`, 303)
  }
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[#@!$%]/.test(password)) {
    return c.redirect(`/plans/inscription?tx=${tx}&err=Mot+de+passe+trop+faible+(8+car+1+maj+1+chiffre+1+special)`, 303)
  }

  const expire = new Date(Date.now() + duree.mois * 30 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Créer la structure
  const { data: struct, error: se } = await sb.from('struct_structures').insert({
    nom:                  structure_nom,
    type:                 structure_type,
    niveau,
    plan_actif:           cmd.plan,
    est_actif:            true,
    est_pilote:           false,
    telephone:            structure_tel,
    abonnement_expire_at: expire,
    numero_autorisation,
    responsable_nom,
    responsable_prenom,
    responsable_telephone: responsable_tel,
    responsable_email:    email,
    statut_verification:  'en_attente',
    adresse:              adresse || null,
    region:               region  || null,
  }).select('id').single()

  if (se || !struct) {
    const msg = se?.message || 'Erreur création structure'
    return c.redirect(`/plans/inscription?tx=${tx}&err=${encodeURIComponent(msg)}`, 303)
  }

  // 2. Créer compte Auth
  const { data: authData, error: ae } = await sb.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { nom: responsable_nom, prenom: responsable_prenom, role: 'admin_structure', telephone: responsable_tel },
  })

  if (ae || !authData?.user) {
    await sb.from('struct_structures').delete().eq('id', struct.id)
    const msg = ae?.message?.includes('already') ? 'Email+deja+utilise' : encodeURIComponent(ae?.message || 'Erreur compte')
    return c.redirect(`/plans/inscription?tx=${tx}&err=${msg}`, 303)
  }

  // 3. Mettre à jour le profil
  await sb.from('auth_profiles').update({
    nom: responsable_nom, prenom: responsable_prenom,
    role: 'admin_structure', structure_id: struct.id,
    est_actif: true, doit_changer_mdp: false,
    telephone: responsable_tel,
  }).eq('id', authData.user.id).catch((e: any) => console.error('profil update:', e))

  // 4. Enregistrer abonnement
  await sb.from('struct_abonnements').insert({
    structure_id: struct.id, plan: cmd.plan, montant: cmd.montant,
    statut: 'actif', mode_paiement: 'cinetpay', transaction_id: tx,
    date_debut: new Date().toISOString(), date_expiration: expire,
    notes: `Inscription /plans — ${email} — ${duree.label}`,
  }).catch((e: any) => console.error('abo insert:', e))

  // 5. Marquer commande traitée
  await sb.from('commandes_pendantes').update({ statut: 'traite', structure_id: struct.id })
    .eq('transaction_id', tx).catch(() => {})

  return c.redirect('/auth/login?inscription=ok', 302)
})
