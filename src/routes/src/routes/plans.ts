/**
 * src/routes/plans.ts
 * SantéBF — Page Abonnement PUBLIQUE
 *
 * Accessible sans connexion — pour les nouvelles structures
 *
 * Routes :
 *   GET  /plans                 → Page tarifs avec plans + durées
 *   GET  /plans/paiement        → Page paiement (infos structure + mode paiement + durée)
 *   POST /plans/paiement        → Initier paiement CinetPay ou demande manuelle
 *   GET  /plans/confirmation    → Page après paiement validé
 *   GET  /plans/inscription     → Formulaire création compte structure
 *   POST /plans/inscription     → Créer structure + admin en DB → /auth/login
 *
 * Flux :
 *   /plans → choisir plan + durée → /plans/paiement → CinetPay
 *   → webhook valide → /plans/confirmation → /plans/inscription → /auth/login
 */

import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'

type PlansBindings = {
  SUPABASE_URL:      string
  SUPABASE_ANON_KEY: string
  CINETPAY_SITE_ID?: string
  CINETPAY_API_KEY?: string
  ENVIRONMENT?:      string
}

export const plansRoutes = new Hono<{ Bindings: PlansBindings }>()

// ── Définition des plans ──────────────────────────────────────
const PLANS_INFO = [
  {
    id: 'gratuit', nom: 'Gratuit', prix_base: 0,
    couleur: '#6B7280', bg: '#f3f4f6',
    pour: 'D&#xe9;couverte — 6 mois offerts',
    features: [
      'Dossiers patients illimit&#xe9;s',
      'Consultations &amp; ordonnances',
      'Agenda &amp; rendez-vous',
      'Tableau de bord complet',
      'Acc&#xe8;s web &amp; mobile',
    ],
    bloque: ['Pharmacien', 'Laboratoire', 'Facturation', 'IA m&#xe9;dicale', 'Hospitalisations'],
    max_users: null, payant: false,
  },
  {
    id: 'starter', nom: 'Starter', prix_base: 40000,
    couleur: '#1565C0', bg: '#e3f2fd',
    pour: 'Cabinet m&#xe9;dical &amp; dispensaire',
    features: [
      'Tout du plan Gratuit',
      'Ordonnances PDF + QR code',
      'Module pharmacien complet',
      'Vaccinations &amp; carnet vaccinal',
      'Notifications email',
      'Laboratoire',
      'Jusqu\'&#xe0; 7 personnels m&#xe9;dicaux',
    ],
    bloque: ['Radiologie', 'Grossesse', 'Facturation', 'IA m&#xe9;dicale', 'Hospitalisations'],
    max_users: 7, payant: true,
  },
  {
    id: 'standard', nom: 'Standard', prix_base: 90000,
    couleur: '#1A6B3C', bg: '#e8f5ee',
    pour: 'Pharmacie priv&#xe9;e &amp; centre de sant&#xe9;',
    features: [
      'Tout du Starter',
      'Radiologie &amp; imagerie',
      'Grossesses &amp; CPN',
      'Infirmerie &amp; soins',
      'Facturation &amp; caisse',
      'IA m&#xe9;dicale (50 req/mois)',
      'Statistiques avanc&#xe9;es',
      'Jusqu\'&#xe0; 35 personnels m&#xe9;dicaux',
    ],
    bloque: ['Hospitalisations', 'Export CSV', 'Don de sang', 'IA illimit&#xe9;e'],
    max_users: 35, payant: true, populaire: true,
  },
  {
    id: 'pro', nom: 'Pro', prix_base: 120000,
    couleur: '#4A148C', bg: '#F3E5F5',
    pour: 'H&#xf4;pital r&#xe9;gional &amp; clinique',
    features: [
      'Tout du Standard &amp; Starter',
      'Hospitalisations &amp; lits',
      'Facturation avanc&#xe9;e &amp; rapports',
      'IA m&#xe9;dicale illimit&#xe9;e',
      'SMS illimit&#xe9;s',
      'Don de sang (CNTS)',
      'Export CSV',
      'Personnels illimit&#xe9;s',
      'Support prioritaire',
    ],
    bloque: [], max_users: null, payant: true,
  },
]

// Durées avec remises
const DUREES = [
  { id: '1m',  label: '1 mois',  mois: 1,  remise: 0,    badge: '' },
  { id: '3m',  label: '3 mois',  mois: 3,  remise: 5,    badge: '-5%' },
  { id: '6m',  label: '6 mois',  mois: 6,  remise: 10,   badge: '-10%' },
  { id: '1a',  label: '1 an',    mois: 12, remise: 20,   badge: '-20%' },
]

function prixAvecRemise(prix_base: number, remise: number, mois: number): number {
  return Math.round(prix_base * mois * (1 - remise / 100))
}

function esc(s: string): string {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#x27;')
}

function navHtml(): string {
  return `<nav>
  <a href="/" class="nb"><div class="ni">&#x1F3E5;</div>Sant&#xe9;BF</a>
  <div class="nl">
    <a href="/#modules">Modules</a>
    <a href="/#securite">S&#xe9;curit&#xe9;</a>
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
    <div>
      <div style="font-family:'Fraunces',serif;font-size:20px;color:white;margin-bottom:10px">&#x1F3E5; Sant&#xe9;BF</div>
      <p style="font-size:13px;color:rgba(255,255,255,.45);line-height:1.7;max-width:260px">Plateforme num&#xe9;rique de gestion de sant&#xe9; pour les structures sanitaires du Burkina Faso.</p>
    </div>
    <div>
      <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Plateforme</div>
      <a href="/#modules" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Modules</a>
      <a href="/plans" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Abonnement</a>
      <a href="/#securite" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">S&#xe9;curit&#xe9;</a>
    </div>
    <div>
      <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Acc&#xe8;s</div>
      <a href="/auth/login" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Connexion</a>
      <a href="/auth/inscription" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">App Patient</a>
    </div>
    <div>
      <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Support</div>
      <a href="/contact" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Contact</a>
      <a href="/#faq" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">FAQ</a>
      <a href="/politique-confidentialite" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Confidentialit&#xe9;</a>
    </div>
  </div>
  <div style="max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,.3);flex-wrap:wrap;gap:8px">
    <span>&#xa9; 2026 Sant&#xe9;BF &#x2014; Tous droits r&#xe9;serv&#xe9;s</span>
    <span>Fait avec &#x2764;&#xFE0F; au Burkina Faso</span>
  </div>
</footer>
<script>
function toggleMenu(){
  const nl=document.querySelector('.nl')
  if(nl.style.display==='flex'){nl.style.display=''}
  else{nl.style.cssText='display:flex;flex-direction:column;position:fixed;top:64px;left:0;right:0;background:white;padding:20px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:199;gap:16px;'}
}
</script>`
}

function cssCommun(): string {
  return `<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:wght@600;700&display=swap" rel="stylesheet">
<style>
:root{--v:#1A6B3C;--vf:#0d4a2a;--vc:#e8f5ee;--b:#1565C0;--bc:#e3f2fd;--vio:#4A148C;--vioc:#F3E5F5;--r:#b71c1c;--rc:#fff5f5;--or:#C9A84C;--oc:#fdf6e3;--tx:#0f1923;--soft:#5a6a78;--bg:#f8faf8;--w:#fff;--bd:#e2e8e4}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'Plus Jakarta Sans',sans-serif;color:var(--tx);background:var(--bg);min-height:100vh}
nav{background:var(--w);border-bottom:1px solid var(--bd);padding:0 5%;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.nb{display:flex;align-items:center;gap:10px;font-family:'Fraunces',serif;font-size:22px;color:var(--tx);text-decoration:none}
.ni{width:38px;height:38px;background:var(--v);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px}
.nl{display:flex;align-items:center;gap:20px}
.nl a{font-size:14px;color:var(--soft);text-decoration:none;font-weight:500;transition:color .2s}
.nl a:hover{color:var(--v)}
.nc{background:var(--v);color:#fff!important;padding:10px 20px;border-radius:9px;font-weight:700!important}
.mb{display:none;background:none;border:none;font-size:24px;cursor:pointer;color:var(--tx)}
footer{background:var(--tx);padding:40px 5% 24px;margin-top:0}
@media(max-width:640px){.nl{display:none}.mb{display:block}}
</style>`
}

// ══════════════════════════════════════════════════════════════
// GET /plans — Page publique plans & tarifs
// ══════════════════════════════════════════════════════════════
plansRoutes.get('/', (c) => {
  const dureeActive = c.req.query('duree') || '1m'
  const duree = DUREES.find(d => d.id === dureeActive) || DUREES[0]

  const plansHtml = PLANS_INFO.map(plan => {
    const total  = plan.payant ? prixAvecRemise(plan.prix_base, duree.remise, duree.mois) : 0
    const isPopular = (plan as any).populaire

    return `<div class="plan-card${isPopular ? ' popular' : ''}" style="--pcolor:${plan.couleur}">
      ${isPopular ? '<div class="pop-badge">&#x2B50; Le plus choisi</div>' : ''}
      <div style="background:${plan.bg};border-radius:12px;padding:14px;margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${plan.couleur};margin-bottom:8px">${plan.nom}</div>
        <div style="font-size:12px;color:var(--soft);margin-bottom:10px">${plan.pour}</div>
        ${plan.payant
          ? `<div style="font-family:'Fraunces',serif;font-size:28px;font-weight:700;color:${plan.couleur};line-height:1">${total.toLocaleString('fr-FR')}<span style="font-size:13px;font-weight:500"> FCFA</span></div>
             <div style="font-size:11px;color:var(--soft);margin-top:3px">pour ${duree.label}${duree.remise > 0 ? ' <span style="background:'+plan.couleur+';color:white;padding:1px 7px;border-radius:20px;font-size:10px;font-weight:700">'+duree.badge+'</span>' : ''}</div>`
          : `<div style="font-family:'Fraunces',serif;font-size:28px;font-weight:700;color:var(--soft)">Gratuit</div>
             <div style="font-size:11px;color:var(--soft);margin-top:3px">6 mois offerts</div>`
        }
        ${plan.max_users ? `<div style="margin-top:8px;font-size:11px;background:rgba(255,255,255,.7);border-radius:20px;padding:3px 10px;display:inline-block;color:${plan.couleur};font-weight:600">&#x1F465; Jusqu'&#xe0; ${plan.max_users} personnels</div>` : plan.payant ? '<div style="margin-top:8px;font-size:11px;background:rgba(255,255,255,.7);border-radius:20px;padding:3px 10px;display:inline-block;color:'+plan.couleur+';font-weight:600">&#x1F465; Personnels illimit&#xe9;s</div>' : ''}
      </div>
      <div style="flex:1;margin-bottom:16px">
        ${plan.features.map(f => `<div style="font-size:13px;margin-bottom:7px;display:flex;align-items:flex-start;gap:7px"><span style="color:${plan.couleur};font-weight:700;flex-shrink:0">&#x2713;</span>${f}</div>`).join('')}
        ${plan.bloque.length > 0 ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd)">${plan.bloque.map(f => `<div style="font-size:12px;color:#c0c0c0;margin-bottom:5px;display:flex;align-items:center;gap:7px;text-decoration:line-through"><span>&#x2715;</span>${f}</div>`).join('')}</div>` : ''}
      </div>
      ${plan.payant
        ? `<a href="/plans/paiement?plan=${plan.id}&duree=${dureeActive}" style="display:block;text-align:center;padding:13px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;color:white;background:${plan.couleur};transition:all .2s">Choisir ${plan.nom} &#x2192;</a>`
        : `<a href="/auth/inscription" style="display:block;text-align:center;padding:13px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;color:white;background:var(--soft)">D&#xe9;marrer gratuitement</a>`
      }
      <div style="text-align:center;font-size:11px;color:var(--soft);margin-top:7px">${plan.payant ? 'Paiement s&#xe9;curis&#xe9; &#x2022; Sans engagement' : 'Sans carte bancaire'}</div>
    </div>`
  }).join('')

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Plans SantéBF : Gratuit 6 mois, Starter 40 000 FCFA, Standard 90 000 FCFA, Pro 120 000 FCFA. Remise jusqu'à 20% pour engagement annuel.">
<meta name="keywords" content="abonnement SantéBF, tarif santé numérique Burkina Faso, logiciel médical prix">
<meta property="og:title" content="Plans &amp; Tarifs — SantéBF">
<meta property="og:description" content="Choisissez votre plan. Essai gratuit 6 mois, puis Starter, Standard ou Pro.">
<link rel="canonical" href="https://santebf.bf/plans">
<title>Plans &amp; Tarifs — Sant&#xe9;BF</title>
${cssCommun()}
<style>
.hero{background:linear-gradient(135deg,#0d4a2a,#1A6B3C);padding:64px 5% 76px;text-align:center;position:relative;overflow:hidden}
.hero::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:60px;background:var(--bg);clip-path:ellipse(55% 100% at 50% 100%)}
.hero h1{font-family:'Fraunces',serif;font-size:clamp(26px,5vw,44px);color:white;margin-bottom:12px;position:relative;z-index:1}
.hero p{font-size:15px;color:rgba(255,255,255,.8);max-width:520px;margin:0 auto;position:relative;z-index:1}
.wrap{max-width:1200px;margin:0 auto;padding:50px 5%}

/* SÉLECTEUR DURÉE */
.duree-sel{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:40px}
.duree-btn{display:inline-flex;align-items:center;gap:7px;padding:11px 20px;border-radius:30px;font-size:14px;font-weight:600;text-decoration:none;border:2px solid var(--bd);background:var(--w);color:var(--soft);transition:all .2s}
.duree-btn:hover{border-color:var(--v);color:var(--v)}
.duree-btn.active{background:var(--v);color:white;border-color:var(--v)}
.duree-badge{background:rgba(255,255,255,.25);padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700}
.duree-btn:not(.active) .duree-badge{background:var(--vc);color:var(--v)}

/* GRILLE PLANS */
.plans-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:40px}
.plan-card{background:var(--w);border-radius:20px;border:2px solid var(--bd);padding:24px 20px;display:flex;flex-direction:column;position:relative;transition:all .25s}
.plan-card:hover{border-color:var(--pcolor,var(--v));transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,.1)}
.plan-card.popular{border-color:#1A6B3C;box-shadow:0 8px 32px rgba(26,107,60,.12)}
.pop-badge{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:#1A6B3C;color:white;padding:4px 16px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap}

/* TABLEAU COMPARATIF */
.compare{max-width:1000px;margin:0 auto 60px;padding:0 5%}
.compare h2{font-family:'Fraunces',serif;font-size:28px;text-align:center;margin-bottom:28px}
.compare-table{width:100%;border-collapse:collapse;background:var(--w);border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)}
.compare-table thead th{background:var(--v);color:white;padding:13px 14px;font-size:13px;font-weight:600;text-align:center}
.compare-table thead th:first-child{text-align:left}
.compare-table tbody tr{border-bottom:1px solid var(--bd)}
.compare-table tbody tr:hover{background:#f9fbf9}
.compare-table td{padding:12px 14px;font-size:13px;text-align:center}
.compare-table td:first-child{text-align:left;font-weight:500;color:var(--tx)}
.ck{color:#1A6B3C;font-size:16px;font-weight:700}
.cx{color:#ddd;font-size:14px}
.cl{color:#E65100;font-size:12px;font-weight:600}
.cg{color:var(--soft);font-size:12px}

/* FAQ */
.faq-wrap{max-width:800px;margin:0 auto 60px;padding:0 5%}
.faq-wrap h2{font-family:'Fraunces',serif;font-size:28px;text-align:center;margin-bottom:28px}
.fi{background:var(--w);border:1.5px solid var(--bd);border-radius:14px;margin-bottom:10px;overflow:hidden}
.fi.open{border-color:var(--v)}
.fq{display:flex;justify-content:space-between;align-items:center;padding:17px 20px;cursor:pointer;font-size:15px;font-weight:600;gap:12px}
.fq:hover{background:#f9fbf9}
.fi-ico{font-size:18px;color:var(--v);transition:transform .3s;flex-shrink:0}
.fi.open .fi-ico{transform:rotate(45deg)}
.fa{display:none;padding:0 20px 16px;font-size:14px;color:var(--soft);line-height:1.75}
.fi.open .fa{display:block}

/* CTA */
.cta{background:linear-gradient(135deg,#0d4a2a,#1A6B3C);padding:56px 5%;text-align:center}
.cta h2{font-family:'Fraunces',serif;font-size:clamp(22px,4vw,34px);color:white;margin-bottom:12px}
.cta p{font-size:15px;color:rgba(255,255,255,.8);margin-bottom:24px;max-width:460px;margin-left:auto;margin-right:auto}
.btn-w{display:inline-block;background:white;color:#1A6B3C;padding:13px 26px;border-radius:11px;font-size:14px;font-weight:700;text-decoration:none;margin:5px;transition:all .2s}
.btn-g{display:inline-block;background:rgba(255,255,255,.15);color:white;padding:13px 26px;border-radius:11px;font-size:14px;font-weight:700;text-decoration:none;border:1px solid rgba(255,255,255,.3);margin:5px;transition:all .2s}

@media(max-width:900px){.plans-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:520px){.plans-grid{grid-template-columns:1fr}.compare-table{font-size:11px}.compare-table td,.compare-table th{padding:9px 8px}}
</style>
</head>
<body>
${navHtml()}

<div class="hero">
  <div style="display:inline-block;background:rgba(255,255,255,.15);color:white;padding:7px 18px;border-radius:30px;font-size:13px;font-weight:600;margin-bottom:18px;border:1px solid rgba(255,255,255,.2);position:relative;z-index:1">&#x1F4B3; Plans &amp; Abonnements</div>
  <h1>Choisissez votre plan<br>et d&#xe9;marrez aujourd&#x27;hui</h1>
  <p>6 mois gratuits pour d&#xe9;couvrir. Passez &#xe0; un plan payant quand vous &#xea;tes pr&#xea;t, avec remise jusqu&#x27;&#xe0; 20% pour les engagements longs.</p>
</div>

<div class="wrap">
  <!-- SÉLECTEUR DE DURÉE -->
  <div style="text-align:center;margin-bottom:16px">
    <div style="font-size:14px;font-weight:600;color:var(--soft);margin-bottom:14px">Choisissez votre dur&#xe9;e d&#x27;engagement</div>
    <div class="duree-sel">
      ${DUREES.map(d => `<a href="/plans?duree=${d.id}" class="duree-btn ${d.id === dureeActive ? 'active' : ''}">
        ${d.label}
        ${d.remise > 0 ? `<span class="duree-badge">${d.badge}</span>` : ''}
      </a>`).join('')}
    </div>
    ${duree.remise > 0 ? `<div style="font-size:13px;color:var(--v);font-weight:600">&#x2705; Vous &#xe9;conomisez ${duree.remise}% avec l&#x27;engagement ${duree.label}</div>` : ''}
  </div>

  <!-- PLANS -->
  <div class="plans-grid">${plansHtml}</div>

  <p style="text-align:center;font-size:13px;color:var(--soft);margin-bottom:48px">
    Remise multi-structures disponible &#x2014; <a href="/contact" style="color:var(--v);font-weight:600">Contactez-nous pour un devis personnalis&#xe9;</a>
  </p>

  <!-- TABLEAU COMPARATIF -->
  <div class="compare" style="padding:0">
    <h2>Comparaison d&#xe9;taill&#xe9;e</h2>
    <div style="overflow-x:auto">
      <table class="compare-table">
        <thead>
          <tr>
            <th style="min-width:180px">Fonctionnalit&#xe9;</th>
            <th>Gratuit</th>
            <th>Starter<br><span style="font-weight:400;font-size:11px">40 000 FCFA/mois</span></th>
            <th>Standard<br><span style="font-weight:400;font-size:11px">90 000 FCFA/mois</span></th>
            <th>Pro<br><span style="font-weight:400;font-size:11px">120 000 FCFA/mois</span></th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Dossiers patients</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Consultations &amp; ordonnances</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Agenda &amp; rendez-vous</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Ordonnances PDF + QR code</td><td class="cx">&#x2715;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Module pharmacien</td><td class="cx">&#x2715;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Vaccinations</td><td class="cx">&#x2715;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Notifications email</td><td class="cx">&#x2715;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Laboratoire</td><td class="cx">&#x2715;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Radiologie</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Grossesses &amp; CPN</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Facturation &amp; caisse</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="ck">&#x2713;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>IA m&#xe9;dicale</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="cl">50 req/mois</td><td class="ck">Illimit&#xe9;e</td></tr>
          <tr><td>SMS patients</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="ck">Illimit&#xe9;s</td></tr>
          <tr><td>Hospitalisations &amp; lits</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Don de sang (CNTS)</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Export CSV</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="cx">&#x2715;</td><td class="ck">&#x2713;</td></tr>
          <tr><td>Personnels m&#xe9;dicaux max</td><td class="cg">Illimit&#xe9;s</td><td class="cg">7 max</td><td class="cg">35 max</td><td class="cg">Illimit&#xe9;s</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- FAQ -->
<div class="faq-wrap">
  <h2>Questions fr&#xe9;quentes</h2>
  ${[
    ['Puis-je changer de plan ?', 'Oui, vous pouvez passer &#xe0; un plan sup&#xe9;rieur &#xe0; tout moment depuis votre dashboard. Le montant est calcul&#xe9; au prorata.'],
    ['Que se passe-t-il apr&#xe8;s les 6 mois gratuits ?', 'Votre acc&#xe8;s passe en mode lecture seule. Vos donn&#xe9;es sont conserv&#xe9;es. Vous pouvez souscrire un plan payant pour retrouver un acc&#xe8;s complet.'],
    ['Comment fonctionne la remise annuelle ?', 'En choisissant 1 an, vous payez l\'&#xe9;quivalent de 10 mois au lieu de 12 — soit 20% d\'&#xe9;conomie. Le paiement est unique en d&#xe9;but de p&#xe9;riode.'],
    ['Le paiement est-il s&#xe9;curis&#xe9; ?', 'Oui. Nous acceptons Orange Money, Moov Money et Wave via CinetPay. Aucune donn&#xe9;e bancaire ne transite par nos serveurs.'],
    ['Y a-t-il une limite au nombre de patients ?', 'Non. Les dossiers patients sont toujours illimit&#xe9;s, quel que soit le plan. La limite s\'applique uniquement au nombre de personnels m&#xe9;dicaux (m&#xe9;decins, infirmiers...).'],
  ].map(([q, a]) => `<div class="fi" onclick="this.classList.toggle('open')"><div class="fq">${q}<span class="fi-ico">+</span></div><div class="fa">${a}</div></div>`).join('')}
</div>

<!-- CTA -->
<div class="cta">
  <h2>Pr&#xea;t &#xe0; digitaliser votre structure ?</h2>
  <p>D&#xe9;marrez gratuitement ou choisissez votre plan maintenant.</p>
  <a href="/auth/inscription" class="btn-w">&#x1F464; Compte patient gratuit</a>
  <a href="/plans/paiement?plan=standard&duree=1m" class="btn-g">&#x1F3E5; Inscrire ma structure</a>
</div>
${footerHtml()}
</body>
</html>`)
})

// ══════════════════════════════════════════════════════════════
// GET /plans/paiement — Page paiement publique
// ══════════════════════════════════════════════════════════════
plansRoutes.get('/paiement', (c) => {
  const planId     = c.req.query('plan')  || 'standard'
  const dureeId    = c.req.query('duree') || '1m'
  const erreur     = c.req.query('err')   || ''
  const plan       = PLANS_INFO.find(p => p.id === planId)  || PLANS_INFO[2]
  const duree      = DUREES.find(d => d.id === dureeId) || DUREES[0]
  const total      = prixAvecRemise(plan.prix_base, duree.remise, duree.mois)
  const paiementOk = !!(c.env.CINETPAY_SITE_ID && c.env.CINETPAY_API_KEY)

  const dureeOptions = PLANS_INFO.filter(p => p.payant).includes(plan as any)
    ? DUREES.map(d => {
        const t = prixAvecRemise(plan.prix_base, d.remise, d.mois)
        return `<label class="duree-opt${d.id === dureeId ? ' sel' : ''}" onclick="selectDuree('${d.id}', this)">
          <input type="radio" name="duree" value="${d.id}" ${d.id === dureeId ? 'checked' : ''} style="display:none">
          <div class="do-label">${d.label}</div>
          <div class="do-prix">${t.toLocaleString('fr-FR')} FCFA</div>
          ${d.remise > 0 ? `<div class="do-remise">${d.badge}</div>` : ''}
        </label>`
      }).join('')
    : ''

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Paiement ${esc(plan.nom)} — Sant&#xe9;BF</title>
${cssCommun()}
<style>
.wrap{max-width:1000px;margin:0 auto;padding:48px 5%}
.grid{display:grid;grid-template-columns:1fr 1.6fr;gap:40px;align-items:start}
.recap{background:var(--w);border-radius:20px;padding:28px;border:2px solid var(--bd);position:sticky;top:84px}
.recap h3{font-family:'Fraunces',serif;font-size:19px;margin-bottom:18px}
.plan-chip{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:700;margin-bottom:14px}
.total-line{font-family:'Fraunces',serif;font-size:32px;font-weight:700;margin-bottom:4px}
.total-sub{font-size:13px;color:var(--soft);margin-bottom:18px}
.feat-recap{font-size:13px;color:var(--soft);line-height:1.8}
.feat-recap div{display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px solid var(--bd)}
.feat-recap div:last-child{border-bottom:none}
.sec-badges{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
.sb{background:#f3f4f6;border-radius:8px;padding:5px 11px;font-size:11px;color:var(--soft)}
.form-box{background:var(--w);border-radius:20px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.07);border:1px solid var(--bd)}
.form-box h2{font-family:'Fraunces',serif;font-size:22px;margin-bottom:6px}
.form-box>.sub{font-size:13px;color:var(--soft);margin-bottom:24px}
.ftitle{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--soft);margin:20px 0 12px;padding-top:20px;border-top:1px solid var(--bd)}
.ftitle:first-of-type{border-top:none;margin-top:0;padding-top:0}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.fg{margin-bottom:14px}
label.lbl{display:block;font-size:12.5px;font-weight:600;color:var(--tx);margin-bottom:5px}
.req{color:var(--r)}
input[type=text],input[type=email],input[type=tel],select{width:100%;padding:11px 13px;font-family:'Plus Jakarta Sans',sans-serif;font-size:13.5px;border:1.5px solid var(--bd);border-radius:10px;background:#fafcfa;color:var(--tx);outline:none;transition:border-color .2s}
input:focus,select:focus{border-color:var(--v);background:var(--w)}
.duree-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:6px}
.duree-opt{border:2px solid var(--bd);border-radius:12px;padding:12px 8px;text-align:center;cursor:pointer;transition:all .2s}
.duree-opt:hover{border-color:var(--v)}
.duree-opt.sel{border-color:var(--v);background:var(--vc)}
.do-label{font-size:12px;font-weight:600;margin-bottom:4px}
.do-prix{font-family:'Fraunces',serif;font-size:14px;font-weight:700;color:var(--v)}
.do-remise{font-size:10px;background:#1A6B3C;color:white;border-radius:20px;padding:1px 7px;margin-top:4px;display:inline-block;font-weight:700}
.pm-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}
.pm{border:2px solid var(--bd);border-radius:12px;padding:12px;text-align:center;cursor:pointer;transition:all .2s}
.pm:hover,.pm.sel{border-color:var(--v);background:var(--vc)}
.pm-ico{font-size:22px;margin-bottom:5px}
.pm-name{font-size:12px;font-weight:600}
.btn-pay{width:100%;padding:14px;background:var(--v);color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;margin-top:8px}
.btn-pay:hover{background:var(--vf)}
.btn-pay:disabled{opacity:.6;cursor:not-allowed}
.err{background:var(--rc);border:1px solid #ffb3b3;border-radius:9px;padding:11px 13px;font-size:13px;color:var(--r);margin-bottom:16px}
.info-manuel{background:var(--bc);border-left:4px solid var(--b);border-radius:9px;padding:13px 15px;font-size:13px;color:#1a3a6b;margin-bottom:16px;line-height:1.7}
.back-link{font-size:13px;color:var(--v);text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:6px;margin-bottom:24px}
@media(max-width:700px){.grid{grid-template-columns:1fr}.recap{position:static}.grid2{grid-template-columns:1fr}.duree-grid{grid-template-columns:repeat(2,1fr)}.pm-grid{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
${navHtml()}
<div class="wrap">
  <a href="/plans" class="back-link">&#x2190; Retour aux plans</a>

  <div class="grid">
    <!-- RÉCAP -->
    <div class="recap">
      <h3>Votre commande</h3>
      <div class="plan-chip" style="background:${plan.bg};color:${plan.couleur}">&#x1F3E5; Plan ${plan.nom}</div>
      <div class="total-line" style="color:${plan.couleur}">${total.toLocaleString('fr-FR')} <span style="font-size:15px;font-weight:500">FCFA</span></div>
      <div class="total-sub">pour ${duree.label}${duree.remise > 0 ? ` (remise ${duree.badge})` : ''}</div>
      <div class="feat-recap">
        ${plan.features.slice(0, 5).map(f => `<div><span style="color:${plan.couleur};font-weight:700">&#x2713;</span>${f}</div>`).join('')}
        ${plan.features.length > 5 ? `<div style="color:var(--v);font-weight:600">+ ${plan.features.length - 5} autres inclus</div>` : ''}
      </div>
      ${plan.max_users ? `<div style="margin-top:12px;font-size:12px;background:${plan.bg};border-radius:9px;padding:8px 12px;color:${plan.couleur};font-weight:600">&#x1F465; Jusqu'&#xe0; ${plan.max_users} personnels m&#xe9;dicaux</div>` : ''}
      <div class="sec-badges">
        <div class="sb">&#x1F512; S&#xe9;curis&#xe9;</div>
        <div class="sb">&#x2705; Sans engagement</div>
        <div class="sb">&#x26A1; Activation rapide</div>
      </div>
    </div>

    <!-- FORMULAIRE -->
    <div class="form-box">
      <h2>Informations &amp; paiement</h2>
      <p class="sub">Renseignez vos informations. Votre compte sera cr&#xe9;&#xe9; apr&#xe8;s validation.</p>

      ${erreur ? `<div class="err">&#x26A0;&#xFE0F; ${esc(decodeURIComponent(erreur))}</div>` : ''}
      ${!paiementOk ? `<div class="info-manuel">&#x2139;&#xFE0F; <strong>Paiement en ligne bient&#xf4;t disponible.</strong> Soumettez ce formulaire et notre &#xe9;quipe vous contacte sous 24h pour finaliser.</div>` : ''}

      <form method="POST" action="/plans/paiement" id="payForm">
        <input type="hidden" name="plan" value="${esc(planId)}">
        <input type="hidden" name="duree" id="dureeHidden" value="${esc(dureeId)}">

        <div class="ftitle">Dur&#xe9;e d&#x27;engagement</div>
        <div class="duree-grid">${dureeOptions}</div>

        <div class="ftitle">Votre structure</div>
        <div class="fg">
          <label class="lbl">Nom de la structure <span class="req">*</span></label>
          <input type="text" name="structure_nom" placeholder="Ex: Clinique Sainte Marie" required>
        </div>
        <div class="grid2">
          <div class="fg" style="margin-bottom:0">
            <label class="lbl">Type <span class="req">*</span></label>
            <select name="structure_type" required>
              <option value="">S&#xe9;lectionner...</option>
              <option value="chu">CHU / CHR</option>
              <option value="clinique">Clinique priv&#xe9;e</option>
              <option value="cabinet">Cabinet m&#xe9;dical</option>
              <option value="csps">CSPS / Centre de sant&#xe9;</option>
              <option value="pharmacie">Pharmacie</option>
              <option value="laboratoire">Laboratoire</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div class="fg" style="margin-bottom:0">
            <label class="lbl">Ville <span class="req">*</span></label>
            <input type="text" name="ville" placeholder="Ouagadougou" required>
          </div>
        </div>

        <div class="ftitle">Responsable principal</div>
        <div class="grid2">
          <div class="fg" style="margin-bottom:0">
            <label class="lbl">Pr&#xe9;nom <span class="req">*</span></label>
            <input type="text" name="prenom" required>
          </div>
          <div class="fg" style="margin-bottom:0">
            <label class="lbl">Nom <span class="req">*</span></label>
            <input type="text" name="nom" required>
          </div>
        </div>
        <div class="grid2" style="margin-top:12px">
          <div class="fg" style="margin-bottom:0">
            <label class="lbl">Email <span class="req">*</span></label>
            <input type="email" name="email" required placeholder="directeur@structure.bf">
          </div>
          <div class="fg" style="margin-bottom:0">
            <label class="lbl">T&#xe9;l&#xe9;phone <span class="req">*</span></label>
            <input type="tel" name="telephone" required placeholder="+226 XX XX XX XX">
          </div>
        </div>

        ${paiementOk ? `
        <div class="ftitle">Mode de paiement</div>
        <div class="pm-grid">
          <label class="pm sel" onclick="selectPM('orange_money',this)">
            <input type="radio" name="mode_paiement" value="orange_money" checked style="display:none">
            <div class="pm-ico">&#x1F7E0;</div><div class="pm-name">Orange Money</div>
          </label>
          <label class="pm" onclick="selectPM('moov_money',this)">
            <input type="radio" name="mode_paiement" value="moov_money" style="display:none">
            <div class="pm-ico">&#x1F535;</div><div class="pm-name">Moov Money</div>
          </label>
          <label class="pm" onclick="selectPM('wave',this)">
            <input type="radio" name="mode_paiement" value="wave" style="display:none">
            <div class="pm-ico">&#x1F30A;</div><div class="pm-name">Wave</div>
          </label>
        </div>` : ''}

        <button type="submit" class="btn-pay" id="payBtn">
          ${paiementOk ? `&#x1F4B3; Payer ${total.toLocaleString('fr-FR')} FCFA` : '&#x1F4E8; Envoyer la demande'}
        </button>
        <p style="font-size:11px;color:var(--soft);text-align:center;margin-top:10px">
          En continuant vous acceptez notre <a href="/politique-confidentialite" style="color:var(--v)">politique de confidentialit&#xe9;</a>
        </p>
      </form>
    </div>
  </div>
</div>
${footerHtml()}
<script>
function selectDuree(id, el) {
  document.querySelectorAll('.duree-opt').forEach(d => d.classList.remove('sel'))
  el.classList.add('sel')
  el.querySelector('input').checked = true
  document.getElementById('dureeHidden').value = id
}
function selectPM(val, el) {
  document.querySelectorAll('.pm').forEach(p => p.classList.remove('sel'))
  el.classList.add('sel')
  el.querySelector('input').checked = true
}
document.getElementById('payForm').onsubmit = function() {
  const btn = document.getElementById('payBtn')
  btn.disabled = true
  btn.textContent = 'Traitement...'
}
</script>
</body>
</html>`)
})

// ══════════════════════════════════════════════════════════════
// POST /plans/paiement
// ══════════════════════════════════════════════════════════════
plansRoutes.post('/paiement', async (c) => {
  const body   = await c.req.parseBody()
  const planId = String(body.plan           || 'standard')
  const dureeId= String(body.duree          || '1m')
  const plan   = PLANS_INFO.find(p => p.id === planId)  || PLANS_INFO[2]
  const duree  = DUREES.find(d => d.id === dureeId) || DUREES[0]
  const total  = prixAvecRemise(plan.prix_base, duree.remise, duree.mois)

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

  const sb = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  const txId = `SBFNEW-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

  await sb.from('commandes_pendantes').insert({
    transaction_id: txId, plan: planId, montant: total, duree: dureeId,
    structure_nom, structure_type, ville, prenom, nom, email, telephone, statut: 'en_attente',
  }).catch(() => {})

  const baseUrl = new URL(c.req.url).origin

  if (c.env.CINETPAY_SITE_ID && c.env.CINETPAY_API_KEY) {
    try {
      const res = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apikey: c.env.CINETPAY_API_KEY, site_id: c.env.CINETPAY_SITE_ID,
          transaction_id: txId, amount: total, currency: 'XOF',
          description: `SantéBF Plan ${plan.nom} — ${duree.label}`,
          notify_url: `${baseUrl}/webhooks/cinetpay`,
          return_url: `${baseUrl}/plans/confirmation?tx=${txId}`,
          cancel_url: `${baseUrl}/plans/paiement?plan=${planId}&duree=${dureeId}&err=Paiement+annulé`,
          customer_name: `${prenom} ${nom}`, customer_email: email,
          customer_phone_number: telephone, lang: 'fr',
        }),
      })
      const data = await res.json() as any
      if (data.code === '201' && data.data?.payment_url) return c.redirect(data.data.payment_url, 302)
      return c.redirect(`/plans/paiement?plan=${planId}&duree=${dureeId}&err=${encodeURIComponent(data.message || 'Erreur passerelle')}`, 303)
    } catch {
      return c.redirect(`/plans/paiement?plan=${planId}&duree=${dureeId}&err=Erreur+connexion`, 303)
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
  const sb     = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  const { data: cmd } = await sb.from('commandes_pendantes').select('*').eq('transaction_id', tx).single().catch(() => ({ data: null }))
  const plan = PLANS_INFO.find(p => p.id === cmd?.plan) || PLANS_INFO[2]
  const duree = DUREES.find(d => d.id === cmd?.duree) || DUREES[0]

  return c.html(`<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Confirmation — Sant&#xe9;BF</title>
${cssCommun()}
<style>
.wrap{max-width:640px;margin:0 auto;padding:60px 5%}
.box{background:var(--w);border-radius:24px;padding:48px 36px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,.08)}
h1{font-family:'Fraunces',serif;font-size:28px;margin-bottom:10px}
.sub{font-size:15px;color:var(--soft);margin-bottom:24px;line-height:1.7}
.ref{font-size:12px;color:var(--soft);font-family:monospace;background:#f3f4f6;padding:6px 14px;border-radius:8px;display:inline-block;margin-bottom:28px}
.steps{background:var(--vc);border-radius:14px;padding:22px;text-align:left;margin-bottom:28px}
.step{display:flex;gap:12px;margin-bottom:12px}
.step:last-child{margin-bottom:0}
.sn{width:24px;height:24px;background:var(--v);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.st{font-size:13px;color:#1a4a2e;line-height:1.6}
.btn-main{display:inline-block;background:var(--v);color:white;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none}
@media(max-width:480px){.box{padding:32px 20px}}
</style></head><body>
${navHtml()}
<div class="wrap">
  <div class="box">
    <div style="font-size:60px;margin-bottom:18px">${manuel ? '&#x1F4E8;' : '&#x2705;'}</div>
    <h1>${manuel ? 'Demande envoy&#xe9;e !' : 'Paiement confirm&#xe9; !'}</h1>
    <p class="sub">
      ${manuel
        ? `Notre &#xe9;quipe vous contacte sous 24h pour activer votre plan <strong>${plan.nom}</strong>.`
        : `Votre paiement pour le plan <strong>${plan.nom}</strong> (${duree.label}) a bien &#xe9;t&#xe9; re&#xe7;u.`
      }
    </p>
    <div class="ref">R&#xe9;f. transaction : ${esc(tx)}</div>
    <div class="steps">
      <div style="font-size:14px;font-weight:700;color:var(--v);margin-bottom:14px">&#x1F4CB; Prochaines &#xe9;tapes</div>
      <div class="step"><div class="sn">1</div><div class="st">${manuel ? 'Notre &#xe9;quipe valide et active votre abonnement' : 'Cr&#xe9;ez le compte de votre structure'}</div></div>
      <div class="step"><div class="sn">2</div><div class="st">Connectez-vous et ajoutez votre &#xe9;quipe m&#xe9;dicale</div></div>
      <div class="step"><div class="sn">3</div><div class="st">Commencez &#xe0; enregistrer vos patients</div></div>
    </div>
    ${!manuel
      ? `<a href="/plans/inscription?tx=${esc(tx)}" class="btn-main">Cr&#xe9;er le compte de ma structure &#x2192;</a>`
      : `<a href="/auth/login" class="btn-main">Retour &#xe0; la connexion</a>`
    }
  </div>
</div>
${footerHtml()}
</body></html>`)
})

// ══════════════════════════════════════════════════════════════
// GET /plans/inscription — Formulaire création compte structure
// ══════════════════════════════════════════════════════════════
plansRoutes.get('/inscription', async (c) => {
  const tx     = c.req.query('tx')  || ''
  const erreur = c.req.query('err') || ''
  const sb     = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  const { data: cmd } = await sb.from('commandes_pendantes').select('*').eq('transaction_id', tx).single().catch(() => ({ data: null }))

  if (!cmd) return c.redirect('/plans?err=Reference+introuvable', 303)
  const plan = PLANS_INFO.find(p => p.id === cmd.plan) || PLANS_INFO[2]

  return c.html(`<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Cr&#xe9;er votre compte — Sant&#xe9;BF</title>
${cssCommun()}
<style>
.wrap{max-width:700px;margin:0 auto;padding:48px 5%}
.head{text-align:center;margin-bottom:32px}
.head h1{font-family:'Fraunces',serif;font-size:26px;margin-bottom:8px}
.head p{font-size:14px;color:var(--soft)}
.plan-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:20px;font-size:13px;font-weight:700;margin-bottom:14px}
.box{background:var(--w);border-radius:20px;padding:36px;box-shadow:0 4px 24px rgba(0,0,0,.07);border:1px solid var(--bd)}
.stitle{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--soft);margin:22px 0 14px;padding-top:22px;border-top:1px solid var(--bd)}
.stitle:first-child{border-top:none;margin-top:0;padding-top:0}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.fg{margin-bottom:14px}
label{display:block;font-size:12.5px;font-weight:600;color:var(--tx);margin-bottom:5px}
.req{color:var(--r)}
input[type=text],input[type=email],input[type=tel],input[type=password],select{width:100%;padding:11px 13px;font-family:'Plus Jakarta Sans',sans-serif;font-size:13.5px;border:1.5px solid var(--bd);border-radius:10px;background:#fafcfa;color:var(--tx);outline:none;transition:border-color .2s}
input:focus,select:focus{border-color:var(--v);background:var(--w)}
.pwd-hint{font-size:11px;color:var(--soft);margin-top:4px;line-height:1.5}
.note{font-size:12px;color:var(--soft);margin-top:4px;line-height:1.5;background:#f8faf8;border-radius:8px;padding:9px 12px}
.consent{display:flex;align-items:flex-start;gap:10px;margin:14px 0;font-size:13px;color:var(--soft);line-height:1.6}
.consent input[type=checkbox]{width:18px;height:18px;flex-shrink:0;accent-color:var(--v)}
.btn-sub{width:100%;padding:14px;background:var(--v);color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;margin-top:6px}
.btn-sub:hover{background:var(--vf)}
.err{background:var(--rc);border:1px solid #ffb3b3;border-radius:9px;padding:11px 13px;font-size:13px;color:var(--r);margin-bottom:14px}
@media(max-width:500px){.box{padding:24px 18px}.grid2{grid-template-columns:1fr}}
</style></head><body>
${navHtml()}
<div class="wrap">
  <div class="head">
    <div class="plan-badge" style="background:${plan.bg};color:${plan.couleur}">&#x1F3E5; Plan ${plan.nom}</div>
    <h1>Cr&#xe9;ez votre compte structure</h1>
    <p>Renseignez les informations de votre structure et de l&#x27;administrateur principal.</p>
  </div>
  <div class="box">
    ${erreur ? `<div class="err">&#x26A0;&#xFE0F; ${esc(decodeURIComponent(erreur))}</div>` : ''}
    <form method="POST" action="/plans/inscription">
      <input type="hidden" name="tx" value="${esc(tx)}">

      <div class="stitle">Informations de la structure</div>
      <div class="fg">
        <label>Nom de la structure <span class="req">*</span></label>
        <input type="text" name="structure_nom" value="${esc(cmd.structure_nom || '')}" required>
      </div>
      <div class="grid2">
        <div class="fg" style="margin-bottom:0">
          <label>Type <span class="req">*</span></label>
          <select name="structure_type" required>
            <option value="">S&#xe9;lectionner...</option>
            ${['chu:CHU / CHR','chr:CHR','district:Centre santé district','csps:CSPS','clinique:Clinique','cabinet:Cabinet médical','pharmacie:Pharmacie','laboratoire:Laboratoire','autre:Autre'].map(t => {
              const [val, lab] = t.split(':')
              return `<option value="${val}" ${cmd.structure_type===val?'selected':''}>${lab}</option>`
            }).join('')}
          </select>
        </div>
        <div class="fg" style="margin-bottom:0">
          <label>Niveau</label>
          <select name="niveau">
            <option value="1">Niveau 1 — Local</option>
            <option value="2">Niveau 2 — District</option>
            <option value="3">Niveau 3 — R&#xe9;gional</option>
            <option value="4">Niveau 4 — National</option>
          </select>
        </div>
      </div>
      <div class="grid2" style="margin-top:12px">
        <div class="fg" style="margin-bottom:0">
          <label>Ville <span class="req">*</span></label>
          <input type="text" name="ville" value="${esc(cmd.ville || '')}" required>
        </div>
        <div class="fg" style="margin-bottom:0">
          <label>T&#xe9;l&#xe9;phone structure</label>
          <input type="tel" name="structure_telephone" placeholder="+226 XX XX XX XX">
        </div>
      </div>

      <div class="stitle">Administrateur principal</div>
      <div class="note">Ce compte aura les droits complets. Vous pourrez ajouter d&#x27;autres administrateurs et m&#xe9;decins apr&#xe8;s connexion.</div>
      <div class="grid2" style="margin-top:12px">
        <div class="fg" style="margin-bottom:0">
          <label>Pr&#xe9;nom <span class="req">*</span></label>
          <input type="text" name="prenom" value="${esc(cmd.prenom || '')}" required>
        </div>
        <div class="fg" style="margin-bottom:0">
          <label>Nom <span class="req">*</span></label>
          <input type="text" name="nom" value="${esc(cmd.nom || '')}" required>
        </div>
      </div>
      <div class="grid2" style="margin-top:12px">
        <div class="fg" style="margin-bottom:0">
          <label>Email <span class="req">*</span></label>
          <input type="email" name="email" value="${esc(cmd.email || '')}" required>
          <div class="pwd-hint">Sera votre identifiant de connexion</div>
        </div>
        <div class="fg" style="margin-bottom:0">
          <label>T&#xe9;l&#xe9;phone <span class="req">*</span></label>
          <input type="tel" name="telephone" value="${esc(cmd.telephone || '')}" required>
        </div>
      </div>

      <div class="stitle">Mot de passe</div>
      <div class="grid2">
        <div class="fg" style="margin-bottom:0">
          <label>Mot de passe <span class="req">*</span></label>
          <input type="password" name="password" required minlength="8">
          <div class="pwd-hint">8+ car., 1 maj., 1 chiffre, 1 sp&#xe9;cial (#@!$%)</div>
        </div>
        <div class="fg" style="margin-bottom:0">
          <label>Confirmer <span class="req">*</span></label>
          <input type="password" name="password_confirm" required>
        </div>
      </div>

      <div class="consent">
        <input type="checkbox" id="consent" name="consent" required>
        <label for="consent" style="margin-bottom:0;font-weight:400">
          J&#x27;accepte les <a href="/politique-confidentialite" target="_blank" style="color:var(--v);font-weight:600">conditions et la politique de confidentialit&#xe9;</a> de Sant&#xe9;BF.
        </label>
      </div>

      <button type="submit" class="btn-sub">Cr&#xe9;er le compte et acc&#xe9;der au dashboard &#x2192;</button>
      <p style="font-size:11px;color:var(--soft);text-align:center;margin-top:8px">Vous pourrez modifier ces informations depuis votre dashboard.</p>
    </form>
  </div>
</div>
${footerHtml()}
</body></html>`)
})

// ══════════════════════════════════════════════════════════════
// POST /plans/inscription — Créer la structure en DB
// ══════════════════════════════════════════════════════════════
plansRoutes.post('/inscription', async (c) => {
  const body    = await c.req.parseBody()
  const tx      = String(body.tx || '')
  const sb      = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

  const { data: cmd } = await sb.from('commandes_pendantes').select('*').eq('transaction_id', tx).single().catch(() => ({ data: null }))
  if (!cmd) return c.redirect('/plans?err=Reference+introuvable', 303)

  const plan  = PLANS_INFO.find(p => p.id === cmd.plan) || PLANS_INFO[2]
  const duree = DUREES.find(d => d.id === (cmd as any).duree) || DUREES[0]

  const structure_nom  = String(body.structure_nom      || '').trim()
  const structure_type = String(body.structure_type     || '').trim()
  const niveau         = parseInt(String(body.niveau    || '1'))
  const ville          = String(body.ville              || '').trim()
  const structure_tel  = String(body.structure_telephone|| '').trim() || null
  const prenom         = String(body.prenom             || '').trim()
  const nom            = String(body.nom                || '').trim()
  const email          = String(body.email              || '').trim().toLowerCase()
  const telephone      = String(body.telephone          || '').trim()
  const password       = String(body.password           || '')
  const pwd_confirm    = String(body.password_confirm   || '')

  if (!structure_nom || !email || !prenom || !nom || !password) {
    return c.redirect(`/plans/inscription?tx=${tx}&err=Champs+obligatoires+manquants`, 303)
  }
  if (password !== pwd_confirm) {
    return c.redirect(`/plans/inscription?tx=${tx}&err=Mots+de+passe+differents`, 303)
  }
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[#@!$%]/.test(password)) {
    return c.redirect(`/plans/inscription?tx=${tx}&err=Mot+de+passe+trop+faible`, 303)
  }

  const expire = new Date(Date.now() + duree.mois * 30 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Créer la structure
  const { data: struct, error: se } = await sb.from('struct_structures').insert({
    nom: structure_nom, type: structure_type, niveau, plan_actif: cmd.plan,
    est_actif: true, est_pilote: false, telephone: structure_tel,
    abonnement_expire_at: expire,
  }).select('id').single()

  if (se || !struct) {
    return c.redirect(`/plans/inscription?tx=${tx}&err=${encodeURIComponent(se?.message || 'Erreur creation structure')}`, 303)
  }

  // 2. Créer le compte Auth
  const { data: authData, error: ae } = await sb.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { nom, prenom, role: 'admin_structure', telephone },
  })

  if (ae || !authData?.user) {
    await sb.from('struct_structures').delete().eq('id', struct.id)
    const msg = ae?.message?.includes('already') ? 'Email deja utilise' : (ae?.message || 'Erreur creation compte')
    return c.redirect(`/plans/inscription?tx=${tx}&err=${encodeURIComponent(msg)}`, 303)
  }

  // 3. Mettre à jour le profil
  await sb.from('auth_profiles').update({
    nom, prenom, role: 'admin_structure', structure_id: struct.id,
    est_actif: true, doit_changer_mdp: false, telephone,
  }).eq('id', authData.user.id)

  // 4. Enregistrer abonnement
  await sb.from('struct_abonnements').insert({
    structure_id: struct.id, plan: cmd.plan, montant: cmd.montant,
    statut: 'actif', mode_paiement: 'cinetpay', transaction_id: tx,
    date_debut: new Date().toISOString(), date_expiration: expire,
    notes: `Inscription via /plans — ${email} — Durée ${duree.label}`,
  }).catch(() => {})

  // 5. Marquer commande traitée
  await sb.from('commandes_pendantes').update({ statut: 'traite', structure_id: struct.id }).eq('transaction_id', tx).catch(() => {})

  return c.redirect('/auth/login?inscription=ok', 302)
})
