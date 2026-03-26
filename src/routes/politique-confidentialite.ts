/**
 * src/routes/politique-confidentialite.ts
 * SantéBF — Politique de Confidentialité & Protection des Données
 *
 * Routes :
 *   GET /politique-confidentialite  → Page politique complète
 *
 * Conforme aux principes RGPD adaptés au contexte Burkina Faso
 * Couvre : données collectées, finalités, droits, sécurité, durée de conservation
 */

import { Hono } from 'hono'

export const politiqueRoutes = new Hono()

politiqueRoutes.get('/', (c) => c.html(politiquePage()))

function politiquePage(): string {
  const date = '1er janvier 2026'
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Politique de confidentialite et protection des donnees personnelles de SanteBF.">
<title>Politique de Confidentialit&#xe9; &#x2014; Sant&#xe9;BF</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:wght@600;700&display=swap" rel="stylesheet">
<style>
:root{--v:#1A6B3C;--vf:#0d4a2a;--vc:#e8f5ee;--b:#1565C0;--bc:#e3f2fd;--r:#b71c1c;--rc:#fff5f5;--tx:#0f1923;--soft:#5a6a78;--bg:#f8faf8;--w:#fff;--bd:#e2e8e4}
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

.hero{background:linear-gradient(135deg,var(--vf),var(--v));padding:60px 5% 70px;text-align:center;position:relative;overflow:hidden}
.hero::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:60px;background:var(--bg);clip-path:ellipse(55% 100% at 50% 100%)}
.hero h1{font-family:'Fraunces',serif;font-size:clamp(28px,4vw,44px);color:white;margin-bottom:12px;line-height:1.2;position:relative;z-index:1}
.hero p{font-size:15px;color:rgba(255,255,255,.8);position:relative;z-index:1}
.hero-badge{display:inline-block;background:rgba(255,255,255,.15);color:white;padding:7px 18px;border-radius:30px;font-size:13px;font-weight:600;margin-bottom:18px;border:1px solid rgba(255,255,255,.2);position:relative;z-index:1}

.wrap{max-width:900px;margin:0 auto;padding:60px 5%}

/* TABLE DES MATIERES */
.toc{background:var(--w);border:1.5px solid var(--bd);border-radius:16px;padding:28px 32px;margin-bottom:48px}
.toc h2{font-family:'Fraunces',serif;font-size:18px;margin-bottom:16px;color:var(--tx)}
.toc ol{margin-left:20px}
.toc li{margin-bottom:8px}
.toc a{font-size:14px;color:var(--v);text-decoration:none;font-weight:500}
.toc a:hover{text-decoration:underline}

/* SECTIONS */
.section{margin-bottom:48px;scroll-margin-top:80px}
.section h2{font-family:'Fraunces',serif;font-size:24px;color:var(--tx);margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--vc);display:flex;align-items:center;gap:10px}
.section-ico{font-size:22px}
.section p{font-size:15px;color:var(--soft);line-height:1.8;margin-bottom:14px}
.section strong{color:var(--tx)}

/* CARDS DONNÉES */
.data-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin-bottom:20px}
.data-card{background:var(--w);border:1.5px solid var(--bd);border-radius:12px;padding:18px}
.data-card h4{font-size:14px;font-weight:700;margin-bottom:8px;color:var(--tx);display:flex;align-items:center;gap:7px}
.data-card ul{margin-left:16px}
.data-card li{font-size:13px;color:var(--soft);margin-bottom:5px;line-height:1.5}

/* DROITS */
.droits-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin:16px 0}
.droit{background:var(--vc);border-radius:12px;padding:18px}
.droit h4{font-size:14px;font-weight:700;color:var(--v);margin-bottom:6px}
.droit p{font-size:13px;color:#2d6a4f;line-height:1.5}

/* LISTE */
.ul-styled{list-style:none;margin:12px 0 16px}
.ul-styled li{font-size:15px;color:var(--soft);line-height:1.8;padding-left:20px;position:relative;margin-bottom:6px}
.ul-styled li::before{content:'✓';color:var(--v);font-weight:700;position:absolute;left:0}

/* TABLE */
table{width:100%;border-collapse:collapse;margin:16px 0}
thead th{background:var(--v);color:white;padding:11px 14px;text-align:left;font-size:13px;font-weight:600}
tbody td{padding:11px 14px;font-size:14px;border-bottom:1px solid var(--bd);color:var(--soft)}
tbody td:first-child{font-weight:600;color:var(--tx)}
tbody tr:hover{background:#f9fbf9}

/* ALERTE */
.alerte{background:#e3f2fd;border-left:4px solid var(--b);border-radius:10px;padding:16px 18px;font-size:14px;color:#1a3a6b;margin:16px 0;line-height:1.7}
.alerte-v{background:var(--vc);border-left:4px solid var(--v);color:#1a4a2e}
.alerte-r{background:var(--rc);border-left:4px solid var(--r);color:#6b1a1a}

/* CONTACT */
.contact-box{background:var(--w);border:2px solid var(--v);border-radius:16px;padding:28px;margin-top:32px;text-align:center}
.contact-box h3{font-family:'Fraunces',serif;font-size:20px;margin-bottom:10px}
.contact-box p{font-size:14px;color:var(--soft);margin-bottom:16px}
.btn-contact{display:inline-block;background:var(--v);color:white;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;transition:background .2s}
.btn-contact:hover{background:var(--vf)}

/* UPDATE BADGE */
.update-badge{display:inline-flex;align-items:center;gap:8px;background:var(--vc);color:var(--v);padding:8px 16px;border-radius:20px;font-size:13px;font-weight:600;margin-bottom:32px}

footer{background:var(--tx);padding:40px 5% 24px;margin-top:80px}
.fg{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:32px;padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,.08)}
.fb h2{font-family:'Fraunces',serif;font-size:20px;color:white;margin-bottom:10px}
.fb p{font-size:13px;color:rgba(255,255,255,.45);line-height:1.7;max-width:260px}
.fc h4{font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px}
.fc a{display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px;transition:color .2s}
.fc a:hover{color:white}
.fbot{max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,.3);flex-wrap:wrap;gap:8px}

@media(max-width:640px){.nl{display:none}.data-grid,.droits-grid{grid-template-columns:1fr}.fg{grid-template-columns:1fr 1fr}}
</style>
</head>
<body>

<nav>
  <a href="/" class="nb"><div class="ni">&#x1F3E5;</div>Sant&#xe9;BF</a>
  <div class="nl">
    <a href="/#modules">Modules</a>
    <a href="/#securite">S&#xe9;curit&#xe9;</a>
    <a href="/#plans">Tarifs</a>
    <a href="/abonnement/plans">Abonnement</a>
    <a href="/contact">Contact</a>
    <a href="/auth/login" class="nc">Connexion &#x2192;</a>
  </div>
</nav>

<div class="hero">
  <div class="hero-badge">&#x1F512; Protection des donn&#xe9;es</div>
  <h1>Politique de Confidentialit&#xe9;<br>et Protection des Donn&#xe9;es</h1>
  <p>Derni&#xe8;re mise &#xe0; jour : ${date}</p>
</div>

<div class="wrap">

  <div class="update-badge">
    &#x1F4C5; En vigueur depuis le ${date} &mdash; Version 1.0
  </div>

  <!-- TABLE DES MATIÈRES -->
  <div class="toc">
    <h2>&#x1F4CB; Table des mati&#xe8;res</h2>
    <ol>
      <li><a href="#qui-sommes-nous">Qui sommes-nous ?</a></li>
      <li><a href="#donnees-collectees">Donn&#xe9;es collect&#xe9;es</a></li>
      <li><a href="#finalites">Finalit&#xe9;s et bases l&#xe9;gales</a></li>
      <li><a href="#consentement">Consentement m&#xe9;dical et partage</a></li>
      <li><a href="#conservation">Dur&#xe9;e de conservation</a></li>
      <li><a href="#securite">S&#xe9;curit&#xe9; des donn&#xe9;es</a></li>
      <li><a href="#partage">Partage avec des tiers</a></li>
      <li><a href="#droits">Vos droits</a></li>
      <li><a href="#cookies">Cookies et donn&#xe9;es de navigation</a></li>
      <li><a href="#mineurs">Mineurs</a></li>
      <li><a href="#modifications">Modifications de cette politique</a></li>
      <li><a href="#contact">Nous contacter</a></li>
    </ol>
  </div>

  <!-- 1. QUI SOMMES-NOUS -->
  <div class="section" id="qui-sommes-nous">
    <h2><span class="section-ico">&#x1F3E5;</span>1. Qui sommes-nous ?</h2>
    <p><strong>SantéBF</strong> est une plateforme num&#xe9;rique de gestion de sant&#xe9; d&#xe9;velopp&#xe9;e et exploit&#xe9;e au Burkina Faso. Notre service permet aux structures sanitaires (h&#xf4;pitaux, cliniques, cabinets m&#xe9;dicaux, pharmacies, laboratoires) de g&#xe9;rer les dossiers m&#xe9;dicaux de leurs patients de mani&#xe8;re num&#xe9;rique, s&#xe9;curis&#xe9;e et collaborative.</p>
    <p><strong>Responsable du traitement des donn&#xe9;es :</strong> SantéBF<br>
    <strong>Email :</strong> sante.bf@gmail.com<br>
    <strong>Pays d&#x27;op&#xe9;ration :</strong> Burkina Faso</p>
    <div class="alerte alerte-v">
      En tant que plateforme de sant&#xe9;, nous traitons des <strong>donn&#xe9;es de sant&#xe9; sensibles</strong> conformes aux obligations de confidentialit&#xe9; m&#xe9;dicale et aux principes de protection des donn&#xe9;es personnelles.
    </div>
  </div>

  <!-- 2. DONNÉES COLLECTÉES -->
  <div class="section" id="donnees-collectees">
    <h2><span class="section-ico">&#x1F4CB;</span>2. Donn&#xe9;es collect&#xe9;es</h2>
    <p>Nous collectons uniquement les donn&#xe9;es n&#xe9;cessaires au fonctionnement de la plateforme. Aucune donn&#xe9;e n&#x27;est collect&#xe9;e &#xe0; des fins publicitaires ou commerciales.</p>

    <div class="data-grid">
      <div class="data-card">
        <h4>&#x1F464; Donn&#xe9;es d&#x27;identit&#xe9;</h4>
        <ul>
          <li>Nom et pr&#xe9;nom</li>
          <li>Adresse email</li>
          <li>Num&#xe9;ro de t&#xe9;l&#xe9;phone</li>
          <li>Date de naissance</li>
          <li>Sexe</li>
          <li>Num&#xe9;ro d&#x27;identification patient</li>
        </ul>
      </div>
      <div class="data-card">
        <h4>&#x1F9EC; Donn&#xe9;es m&#xe9;dicales (patients)</h4>
        <ul>
          <li>Groupe sanguin et rh&#xe9;sus</li>
          <li>Allergies connues</li>
          <li>Maladies chroniques</li>
          <li>Historique des consultations</li>
          <li>Ordonnances et m&#xe9;dicaments</li>
          <li>R&#xe9;sultats d&#x27;examens</li>
          <li>Comptes rendus m&#xe9;dicaux</li>
          <li>Vaccinations</li>
          <li>Donn&#xe9;es de grossesse (si applicable)</li>
        </ul>
      </div>
      <div class="data-card">
        <h4>&#x1F3E5; Donn&#xe9;es professionnelles (personnel)</h4>
        <ul>
          <li>Nom et pr&#xe9;nom</li>
          <li>Email professionnel</li>
          <li>R&#xf4;le dans la structure</li>
          <li>Structure d&#x27;appartenance</li>
          <li>Historique des actions m&#xe9;dicales</li>
        </ul>
      </div>
      <div class="data-card">
        <h4>&#x1F4BB; Donn&#xe9;es techniques</h4>
        <ul>
          <li>Identifiant de session</li>
          <li>Date et heure de connexion</li>
          <li>Journal d&#x27;activit&#xe9; (audit log)</li>
          <li>Type d&#x27;appareil (mobile/desktop)</li>
        </ul>
      </div>
      <div class="data-card">
        <h4>&#x1F4B3; Donn&#xe9;es de paiement (structures)</h4>
        <ul>
          <li>Nom de la structure</li>
          <li>Historique des abonnements</li>
          <li>R&#xe9;f&#xe9;rences de transactions</li>
          <li>Montants pay&#xe9;s</li>
          <li>Note : aucun num&#xe9;ro de carte bancaire n&#x27;est stock&#xe9;</li>
        </ul>
      </div>
      <div class="data-card">
        <h4>&#x1F9B8; Donn&#xe9;es don de sang (volontaires)</h4>
        <ul>
          <li>Groupe sanguin</li>
          <li>Disponibilit&#xe9; comme donneur</li>
          <li>Historique des dons</li>
          <li>Consentement explicite enregistr&#xe9;</li>
          <li>Contacts d&#x27;urgence</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- 3. FINALITÉS -->
  <div class="section" id="finalites">
    <h2><span class="section-ico">&#x1F3AF;</span>3. Finalit&#xe9;s et bases l&#xe9;gales</h2>
    <p>Chaque traitement de donn&#xe9;es repose sur une base l&#xe9;gale claire :</p>
    <table>
      <thead>
        <tr>
          <th>Finalit&#xe9;</th>
          <th>Base l&#xe9;gale</th>
          <th>Donn&#xe9;es concern&#xe9;es</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Gestion du dossier m&#xe9;dical</td>
          <td>Int&#xe9;r&#xea;t l&#xe9;gitime m&#xe9;dical + consentement</td>
          <td>Donn&#xe9;es m&#xe9;dicales complètes</td>
        </tr>
        <tr>
          <td>Authentification et s&#xe9;curit&#xe9;</td>
          <td>Obligation contractuelle</td>
          <td>Email, mot de passe hash&#xe9;</td>
        </tr>
        <tr>
          <td>Notifications m&#xe9;dicales</td>
          <td>Consentement patient</td>
          <td>Email, t&#xe9;l&#xe9;phone</td>
        </tr>
        <tr>
          <td>Facturation et paiements</td>
          <td>Obligation contractuelle</td>
          <td>Donn&#xe9;es structure et transactions</td>
        </tr>
        <tr>
          <td>Urgences m&#xe9;dicales (QR code)</td>
          <td>Int&#xe9;r&#xea;t vital de la personne</td>
          <td>Donn&#xe9;es vitales minimales</td>
        </tr>
        <tr>
          <td>Don de sang</td>
          <td>Consentement explicite</td>
          <td>Groupe sanguin, disponibilit&#xe9;</td>
        </tr>
        <tr>
          <td>Am&#xe9;lioration du service</td>
          <td>Int&#xe9;r&#xea;t l&#xe9;gitime (statistiques anonymis&#xe9;es)</td>
          <td>Donn&#xe9;es agr&#xe9;g&#xe9;es et anonymis&#xe9;es uniquement</td>
        </tr>
      </tbody>
    </table>
    <div class="alerte">
      &#x2139;&#xFE0F; <strong>Donn&#xe9;es sensibles :</strong> Les donn&#xe9;es de sant&#xe9; sont des donn&#xe9;es sensibles au sens du droit &#xe0; la protection des donn&#xe9;es. Leur traitement est strictement limit&#xe9; aux finalit&#xe9;s m&#xe9;dicales et soumis &#xe0; des mesures de s&#xe9;curit&#xe9; renforc&#xe9;es.
    </div>
  </div>

  <!-- 4. CONSENTEMENT MÉDICAL -->
  <div class="section" id="consentement">
    <h2><span class="section-ico">&#x2705;</span>4. Consentement m&#xe9;dical et partage</h2>
    <p>SantéBF a con&#xe7;u un syst&#xe8;me de consentement &#xe0; deux niveaux pour respecter la vie priv&#xe9;e des patients :</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0">
      <div style="background:var(--vc);border-radius:12px;padding:20px">
        <h4 style="font-size:15px;font-weight:700;color:var(--v);margin-bottom:10px">&#x1F468;&#x200D;&#x2695;&#xFE0F; Consentement m&#xe9;decin</h4>
        <p style="font-size:13px;color:#2d6a4f;line-height:1.6">Le patient autorise un m&#xe9;decin pr&#xe9;cis &#xe0; acc&#xe9;der &#xe0; son dossier. Ce consentement est donn&#xe9; explicitement depuis l&#x27;espace patient et peut &#xea;tre r&#xe9;voqu&#xe9; &#xe0; tout moment. L&#x27;acc&#xe8;s est imm&#xe9;diatement coup&#xe9; d&#xe8;s r&#xe9;vocation.</p>
      </div>
      <div style="background:var(--bc);border-radius:12px;padding:20px">
        <h4 style="font-size:15px;font-weight:700;color:var(--b);margin-bottom:10px">&#x1F3E5; Consentement structure</h4>
        <p style="font-size:13px;color:#1a3a6b;line-height:1.6">Le patient autorise tout le personnel d&#x27;une structure &#xe0; acc&#xe9;der &#xe0; son dossier. Valable 3 mois, renouvelable, r&#xe9;vocable imm&#xe9;diatement. Sans ce consentement, aucun acc&#xe8;s ext&#xe9;rieur n&#x27;est possible.</p>
      </div>
    </div>

    <ul class="ul-styled">
      <li>Sans consentement actif, aucun m&#xe9;decin ext&#xe9;rieur &#xe0; la structure de premi&#xe8;re visite ne peut acc&#xe9;der au dossier</li>
      <li>Le patient peut consulter &#xe0; tout moment la liste des personnes ayant acc&#xe8;s &#xe0; ses donn&#xe9;es</li>
      <li>Chaque acc&#xe8;s au dossier est enregistr&#xe9; avec la date, l&#x27;heure et l&#x27;identit&#xe9; du professionnel</li>
      <li>En cas d&#x27;urgence, un QR code donne un acc&#xe8;s temporaire (24h) aux seules donn&#xe9;es vitales</li>
    </ul>
  </div>

  <!-- 5. CONSERVATION -->
  <div class="section" id="conservation">
    <h2><span class="section-ico">&#x1F4C5;</span>5. Dur&#xe9;e de conservation</h2>
    <table>
      <thead>
        <tr><th>Type de donn&#xe9;e</th><th>Dur&#xe9;e de conservation</th><th>Justification</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Dossier m&#xe9;dical patient</td>
          <td>10 ans apr&#xe8;s la derni&#xe8;re consultation</td>
          <td>Obligation l&#xe9;gale m&#xe9;dicale (secret m&#xe9;dical)</td>
        </tr>
        <tr>
          <td>Comptes m&#xe9;decins et personnel</td>
          <td>Dur&#xe9;e de l&#x27;abonnement + 1 an</td>
          <td>Obligation contractuelle et audit</td>
        </tr>
        <tr>
          <td>Journaux d&#x27;activit&#xe9; (audit logs)</td>
          <td>3 ans</td>
          <td>S&#xe9;curit&#xe9; et responsabilit&#xe9; m&#xe9;dicale</td>
        </tr>
        <tr>
          <td>Historique de paiements</td>
          <td>5 ans</td>
          <td>Obligation comptable et fiscale</td>
        </tr>
        <tr>
          <td>Sessions et tokens d&#x27;authentification</td>
          <td>7 jours (expiration automatique)</td>
          <td>S&#xe9;curit&#xe9; acc&#xe8;s</td>
        </tr>
        <tr>
          <td>Consentements r&#xe9;voqu&#xe9;s</td>
          <td>3 ans (archivage)</td>
          <td>Preuve de conformit&#xe9;</td>
        </tr>
        <tr>
          <td>Donn&#xe9;es don de sang</td>
          <td>Jusqu&#x27;&#xe0; r&#xe9;vocation du consentement</td>
          <td>Consentement volontaire</td>
        </tr>
      </tbody>
    </table>
    <p>Apr&#xe8;s ces p&#xe9;riodes, les donn&#xe9;es sont <strong>supprim&#xe9;es de fa&#xe7;on irr&#xe9;versible</strong> ou anonymis&#xe9;es pour usage statistique uniquement.</p>
  </div>

  <!-- 6. SÉCURITÉ -->
  <div class="section" id="securite">
    <h2><span class="section-ico">&#x1F512;</span>6. S&#xe9;curit&#xe9; des donn&#xe9;es</h2>
    <p>SantéBF met en &#x153;uvre des mesures techniques et organisationnelles adapt&#xe9;es pour prot&#xe9;ger vos donn&#xe9;es contre tout acc&#xe8;s non autoris&#xe9;, perte, destruction ou divulgation.</p>

    <ul class="ul-styled">
      <li><strong>Chiffrement des communications :</strong> Toutes les donn&#xe9;es &#xe9;chang&#xe9;es entre votre appareil et nos serveurs sont chiffr&#xe9;es via HTTPS</li>
      <li><strong>Chiffrement au repos :</strong> Les donn&#xe9;es stock&#xe9;es dans notre base de donn&#xe9;es sont chiffr&#xe9;es</li>
      <li><strong>Mots de passe :</strong> Les mots de passe ne sont jamais stock&#xe9;s en clair &mdash; ils sont transform&#xe9;s de fa&#xe7;on irr&#xe9;versible avant stockage</li>
      <li><strong>Contr&#xf4;le d&#x27;acc&#xe8;s par r&#xf4;le :</strong> Chaque utilisateur acc&#xe8;de uniquement aux donn&#xe9;es n&#xe9;cessaires &#xe0; sa fonction</li>
      <li><strong>Sessions s&#xe9;curis&#xe9;es :</strong> Les sessions expirent automatiquement apr&#xe8;s 7 jours. Un administrateur peut r&#xe9;voquer tout acc&#xe8;s imm&#xe9;diatement</li>
      <li><strong>Journalisation :</strong> Chaque action sur un dossier m&#xe9;dical est enregistr&#xe9;e avec horodatage et identit&#xe9; du responsable</li>
      <li><strong>Protection contre les attaques :</strong> Notre infrastructure inclut une protection contre les tentatives d&#x27;intrusion et le blocage automatique apr&#xe8;s &#xe9;checs r&#xe9;p&#xe9;t&#xe9;s de connexion</li>
      <li><strong>Sauvegardes :</strong> Les donn&#xe9;es sont sauvegard&#xe9;es r&#xe9;guli&#xe8;rement sur des serveurs s&#xe9;curis&#xe9;s</li>
    </ul>

    <div class="alerte alerte-r">
      &#x26A0;&#xFE0F; <strong>En cas de violation de donn&#xe9;es :</strong> Si nous d&#xe9;tectons une violation susceptible d&#x27;affecter vos donn&#xe9;es, nous vous en informerons dans les meilleurs d&#xe9;lais par email, conform&#xe9;ment aux bonnes pratiques de notification.
    </div>
  </div>

  <!-- 7. PARTAGE -->
  <div class="section" id="partage">
    <h2><span class="section-ico">&#x1F91D;</span>7. Partage avec des tiers</h2>
    <p><strong>SantéBF ne vend pas, ne loue pas et ne partage pas vos donn&#xe9;es m&#xe9;dicales avec des tiers &#xe0; des fins commerciales.</strong></p>
    <p>Les seules situations o&#xf9; des donn&#xe9;es peuvent &#xea;tre partag&#xe9;es :</p>

    <table>
      <thead>
        <tr><th>Destinataire</th><th>Donn&#xe9;es partag&#xe9;es</th><th>Raison</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Personnel m&#xe9;dical autoris&#xe9;</td>
          <td>Dossier m&#xe9;dical du patient</td>
          <td>Consentement explicite du patient</td>
        </tr>
        <tr>
          <td>Prestataires techniques</td>
          <td>Donn&#xe9;es techniques uniquement</td>
          <td>H&#xe9;bergement, envoi d&#x27;emails, paiement</td>
        </tr>
        <tr>
          <td>Autorit&#xe9;s l&#xe9;gales</td>
          <td>Selon r&#xe9;quisition judiciaire</td>
          <td>Obligation l&#xe9;gale uniquement</td>
        </tr>
        <tr>
          <td>Urgence m&#xe9;dicale (QR)</td>
          <td>Donn&#xe9;es vitales uniquement</td>
          <td>Int&#xe9;r&#xea;t vital du patient, acc&#xe8;s limit&#xe9; 24h</td>
        </tr>
      </tbody>
    </table>

    <p>Nos prestataires techniques sont contractuellement tenus de traiter vos donn&#xe9;es uniquement selon nos instructions et de maintenir des mesures de s&#xe9;curit&#xe9; &#xe9;quivalentes aux n&#xf4;tres. <strong>Aucun prestataire n&#x27;a acc&#xe8;s aux donn&#xe9;es m&#xe9;dicales en clair.</strong></p>
  </div>

  <!-- 8. DROITS -->
  <div class="section" id="droits">
    <h2><span class="section-ico">&#x2696;&#xFE0F;</span>8. Vos droits</h2>
    <p>Conform&#xe9;ment aux principes de protection des donn&#xe9;es personnelles, vous disposez des droits suivants :</p>

    <div class="droits-grid">
      <div class="droit">
        <h4>&#x1F440; Droit d&#x27;acc&#xe8;s</h4>
        <p>Vous pouvez obtenir une copie de toutes les donn&#xe9;es que nous d&#xe9;tenons sur vous.</p>
      </div>
      <div class="droit">
        <h4>&#x270F;&#xFE0F; Droit de rectification</h4>
        <p>Vous pouvez corriger vos informations personnelles inexactes ou incompl&#xe8;tes.</p>
      </div>
      <div class="droit">
        <h4>&#x1F5D1;&#xFE0F; Droit &#xe0; l&#x27;effacement</h4>
        <p>Vous pouvez demander la suppression de vos donn&#xe9;es, sous r&#xe9;serve des obligations l&#xe9;gales de conservation.</p>
      </div>
      <div class="droit">
        <h4>&#x23F8;&#xFE0F; Droit &#xe0; la limitation</h4>
        <p>Vous pouvez demander la suspension temporaire du traitement de vos donn&#xe9;es.</p>
      </div>
      <div class="droit">
        <h4>&#x1F6AB; Droit d&#x27;opposition</h4>
        <p>Vous pouvez vous opposer au traitement de vos donn&#xe9;es pour des raisons tenant &#xe0; votre situation.</p>
      </div>
      <div class="droit">
        <h4>&#x1F4E6; Droit &#xe0; la portabilit&#xe9;</h4>
        <p>Vous pouvez recevoir vos donn&#xe9;es dans un format structur&#xe9; et lisible.</p>
      </div>
      <div class="droit">
        <h4>&#x1F504; Droit de r&#xe9;vocation</h4>
        <p>Vous pouvez retirer &#xe0; tout moment un consentement pr&#xe9;alablement accord&#xe9;, sans effet r&#xe9;troactif.</p>
      </div>
      <div class="droit">
        <h4>&#x1F4AC; Droit de r&#xe9;clamation</h4>
        <p>Vous pouvez d&#xe9;poser une r&#xe9;clamation aupr&#xe8;s de toute autorit&#xe9; comp&#xe9;tente en mati&#xe8;re de protection des donn&#xe9;es.</p>
      </div>
    </div>

    <p style="margin-top:16px">Pour exercer ces droits, contactez-nous &#xe0; <strong>sante.bf@gmail.com</strong>. Nous r&#xe9;pondrons dans un d&#xe9;lai de <strong>30 jours ouvr&#xe9;s</strong>. Une preuve d&#x27;identit&#xe9; peut &#xea;tre demand&#xe9;e pour les demandes sensibles.</p>

    <div class="alerte">
      &#x2139;&#xFE0F; <strong>Pour les dossiers m&#xe9;dicaux :</strong> La suppression imm&#xe9;diate peut &#xea;tre limit&#xe9;e par les obligations l&#xe9;gales de conservation des dossiers m&#xe9;dicaux (10 ans). Dans ce cas, vos donn&#xe9;es seront archiv&#xe9;es et inaccessibles au personnel m&#xe9;dical, puis supprim&#xe9;es &#xe0; l&#x27;expiration du d&#xe9;lai l&#xe9;gal.
    </div>
  </div>

  <!-- 9. COOKIES -->
  <div class="section" id="cookies">
    <h2><span class="section-ico">&#x1F36A;</span>9. Cookies et donn&#xe9;es de navigation</h2>
    <p>SantéBF utilise des cookies techniques <strong>strictement n&#xe9;cessaires</strong> au fonctionnement de la plateforme :</p>

    <table>
      <thead>
        <tr><th>Cookie</th><th>Finalit&#xe9;</th><th>Dur&#xe9;e</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>sb_token</td>
          <td>Token d&#x27;authentification (session active)</td>
          <td>7 jours</td>
        </tr>
        <tr>
          <td>sb_refresh</td>
          <td>Token de rafra&#xee;chissement de session</td>
          <td>7 jours</td>
        </tr>
        <tr>
          <td>santebf_theme</td>
          <td>Pr&#xe9;f&#xe9;rence de th&#xe8;me (clair/sombre)</td>
          <td>Permanent (localStorage)</td>
        </tr>
      </tbody>
    </table>

    <p><strong>SantéBF n&#x27;utilise aucun cookie publicitaire, de tra&#xe7;age tiers ou d&#x27;analyse comportementale.</strong> Aucune donn&#xe9;e de navigation n&#x27;est partag&#xe9;e avec des r&#xe9;gies publicitaires.</p>
  </div>

  <!-- 10. MINEURS -->
  <div class="section" id="mineurs">
    <h2><span class="section-ico">&#x1F476;</span>10. Mineurs</h2>
    <p>SantéBF peut traiter des donn&#xe9;es m&#xe9;dicales concernant des mineurs dans le cadre de soins m&#xe9;dicaux. Dans ce cas :</p>
    <ul class="ul-styled">
      <li>Le consentement est donn&#xe9; par le ou les parents ou tuteur(s) l&#xe9;gal(aux)</li>
      <li>Les m&#xea;mes droits d&#x27;acc&#xe8;s, rectification et suppression s&#x27;appliquent aux repr&#xe9;sentants l&#xe9;gaux</li>
      <li>&#xe0; la majorit&#xe9; (18 ans), le jeune adulte peut reprendre le contr&#xf4;le de son dossier en cr&#xe9;ant son propre compte</li>
      <li>Les donn&#xe9;es des mineurs sont soumises aux m&#xea;mes mesures de s&#xe9;curit&#xe9; renforc&#xe9;es</li>
    </ul>
    <p>SantéBF ne collecte pas de donn&#xe9;es personnelles de mineurs &#xe0; des fins commerciales, publicitaires ou de profiling.</p>
  </div>

  <!-- 11. MODIFICATIONS -->
  <div class="section" id="modifications">
    <h2><span class="section-ico">&#x1F4DD;</span>11. Modifications de cette politique</h2>
    <p>Cette politique de confidentialit&#xe9; peut &#xea;tre mise &#xe0; jour pour refl&#xe9;ter les &#xe9;volutions de nos pratiques, de la l&#xe9;gislation ou de notre service.</p>
    <ul class="ul-styled">
      <li>Toute modification substantielle fera l&#x27;objet d&#x27;une notification par email &#xe0; tous les utilisateurs concern&#xe9;s</li>
      <li>La date de derni&#xe8;re mise &#xe0; jour est indiqu&#xe9;e en haut de ce document</li>
      <li>L&#x27;utilisation continue de SantéBF apr&#xe8;s notification vaut acceptation des modifications</li>
      <li>Vous pouvez &#xe0; tout moment supprimer votre compte si vous n&#x27;acceptez pas les nouvelles conditions</li>
    </ul>
    <p>L&#x27;historique des versions de cette politique est disponible sur demande.</p>
  </div>

  <!-- 12. CONTACT -->
  <div class="section" id="contact">
    <h2><span class="section-ico">&#x1F4AC;</span>12. Nous contacter</h2>
    <p>Pour toute question relative &#xe0; cette politique, &#xe0; vos donn&#xe9;es ou pour exercer vos droits :</p>

    <div class="contact-box">
      <h3>&#x1F3E5; Responsable Protection des Donn&#xe9;es SantéBF</h3>
      <p>Notre &#xe9;quipe est disponible pour r&#xe9;pondre &#xe0; toute question concernant le traitement de vos donn&#xe9;es personnelles et m&#xe9;dicales.</p>
      <a href="/contact" class="btn-contact">&#x2709;&#xFE0F; Nous contacter</a>
      <p style="margin-top:16px;font-size:13px;color:var(--soft)">Email : sante.bf@gmail.com &mdash; R&#xe9;ponse sous 30 jours ouvr&#xe9;s</p>
    </div>
  </div>

</div><!-- /wrap -->

<footer>
  <div class="fg">
    <div class="fb">
      <h2>&#x1F3E5; Sant&#xe9;BF</h2>
      <p>Plateforme num&#xe9;rique de gestion de sant&#xe9; pour les structures sanitaires du Burkina Faso.</p>
    </div>
    <div class="fc">
      <h4>Plateforme</h4>
      <a href="/#modules">Modules</a>
      <a href="/abonnement/plans">Abonnement</a>
      <a href="/#plans">Tarifs</a>
      <a href="/#securite">S&#xe9;curit&#xe9;</a>
    </div>
    <div class="fc">
      <h4>Acc&#xe8;s</h4>
      <a href="/auth/login">Connexion</a>
      <a href="/auth/inscription">Cr&#xe9;er un compte</a>
      <a href="/public/patient/welcome">App Patient</a>
    </div>
    <div class="fc">
      <h4>Support</h4>
      <a href="/#faq">FAQ</a>
      <a href="/contact">Nous contacter</a>
      <a href="/politique-confidentialite">Confidentialit&#xe9;</a>
    </div>
  </div>
  <div class="fbot">
    <span>&#xa9; 2026 Sant&#xe9;BF &mdash; Tous droits r&#xe9;serv&#xe9;s</span>
    <span>Fait avec &#x2764;&#xFE0F; au Burkina Faso</span>
  </div>
</footer>

</body>
</html>`
}
 