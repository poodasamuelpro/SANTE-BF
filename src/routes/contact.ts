/**
 * src/routes/contact.ts
 * Sant&#xe9;BF &#x2014; Page de contact publique
 *
 * Routes :
 *   GET  /contact      &#x2192; Formulaire de contact
 *   POST /contact      &#x2192; Envoyer le message par email
 *
 * Email destination : contact@santebf.bf
 * Utilise Resend ou Brevo si configur&#xe9; dans Cloudflare Variables
 */

import { Hono } from 'hono'
import type { Bindings } from '../lib/supabase'

type ContactBindings = Bindings & {
  RESEND_API_KEY?: string
  BREVO_API_KEY?:  string
  ENVIRONMENT?:    string
}

export const contactRoutes = new Hono<{ Bindings: ContactBindings }>()

const DEST_EMAIL = 'sante.bf@gmail.com'
const FROM_EMAIL = 'noreply@santebf.bf'
const FROM_NAME  = 'Sant&#xe9;BF Contact'

// ── Envoi email ───────────────────────────────────────────

async function sendEmail(env: ContactBindings, to: string, subject: string, html: string): Promise<boolean> {
  if (env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_API_KEY },
      body: JSON.stringify({ from: FROM_NAME + ' <' + FROM_EMAIL + '>', to: [to], subject, html }),
    })
    return res.ok
  }
  if (env.BREVO_API_KEY) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ sender: { name: FROM_NAME, email: FROM_EMAIL }, to: [{ email: to }], subject, htmlContent: html }),
    })
    return res.ok
  }
  return false
}

// ── Page HTML ─────────────────────────────────────────────

function contactPage(opts: { succes?: boolean; erreur?: string } = {}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Contactez l'equipe SanteBF pour toute question sur la plateforme.">
<title>Contact &#x2014; Sant&#xe9;BF</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:wght@600;700&display=swap" rel="stylesheet">
<style>
:root{--v:#1A6B3C;--vf:#0d4a2a;--vc:#e8f5ee;--b:#1565C0;--bc:#e3f2fd;--or:#C9A84C;--r:#b71c1c;--rc:#fff5f5;--tx:#0f1923;--soft:#5a6a78;--bg:#f8faf8;--w:#fff;--bd:#e2e8e4}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'Plus Jakarta Sans',sans-serif;color:var(--tx);background:var(--bg);min-height:100vh}

/* NAV */
nav{background:var(--w);border-bottom:1px solid var(--bd);padding:0 5%;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.nb{display:flex;align-items:center;gap:10px;font-family:'Fraunces',serif;font-size:22px;color:var(--tx);text-decoration:none}
.ni{width:38px;height:38px;background:var(--v);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px}
.nl{display:flex;align-items:center;gap:20px}
.nl a{font-size:14px;color:var(--soft);text-decoration:none;font-weight:500;transition:color .2s}
.nl a:hover{color:var(--v)}
.nc{background:var(--v);color:#fff!important;padding:10px 20px;border-radius:9px;font-weight:700!important}

/* HERO CONTACT */
.hero-c{background:linear-gradient(135deg,var(--vf),var(--v));padding:70px 5% 80px;text-align:center;position:relative;overflow:hidden}
.hero-c::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:60px;background:var(--bg);clip-path:ellipse(55% 100% at 50% 100%)}
.hero-c h1{font-family:'Fraunces',serif;font-size:clamp(30px,5vw,50px);color:white;margin-bottom:14px;line-height:1.2}
.hero-c p{font-size:17px;color:rgba(255,255,255,.8);max-width:520px;margin:0 auto}

/* CONTENU */
.wrap{max-width:1100px;margin:0 auto;padding:60px 5%}
.grid{display:grid;grid-template-columns:1fr 1.6fr;gap:48px;align-items:start}

/* INFOS GAUCHE */
.info-box{background:var(--w);border-radius:20px;padding:36px;border:1.5px solid var(--bd);position:sticky;top:88px}
.info-box h2{font-family:'Fraunces',serif;font-size:22px;margin-bottom:6px}
.info-box p{font-size:14px;color:var(--soft);line-height:1.7;margin-bottom:28px}
.contact-item{display:flex;align-items:flex-start;gap:14px;margin-bottom:22px;padding-bottom:22px;border-bottom:1px solid var(--bd)}
.contact-item:last-of-type{border-bottom:none;margin-bottom:0;padding-bottom:0}
.ci-ico{width:42px;height:42px;background:var(--vc);border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.ci-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--soft);margin-bottom:4px}
.ci-val{font-size:14px;font-weight:600;color:var(--tx)}
.ci-sub{font-size:12px;color:var(--soft);margin-top:2px}
.badge-disp{display:inline-flex;align-items:center;gap:6px;background:var(--vc);color:var(--v);padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-top:20px}
.badge-disp::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--v);display:inline-block}

/* FORMULAIRE DROITE */
.form-box{background:var(--w);border-radius:20px;padding:40px;border:1.5px solid var(--bd);box-shadow:0 8px 32px rgba(0,0,0,.06)}
.form-box h2{font-family:'Fraunces',serif;font-size:22px;margin-bottom:6px}
.form-box > p{font-size:14px;color:var(--soft);margin-bottom:28px}
.fg{margin-bottom:20px}
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
label{display:block;font-size:12.5px;font-weight:700;color:var(--tx);margin-bottom:7px}
.req{color:var(--r)}
input,select,textarea{width:100%;padding:12px 15px;font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;border:1.5px solid var(--bd);border-radius:11px;background:#fafcfa;color:var(--tx);outline:none;transition:border-color .2s,box-shadow .2s}
input:focus,select:focus,textarea:focus{border-color:var(--v);background:var(--w);box-shadow:0 0 0 4px rgba(26,107,60,.08)}
textarea{resize:vertical;min-height:130px;line-height:1.6}
.char-count{font-size:11px;color:var(--soft);text-align:right;margin-top:4px}
.submit-btn{width:100%;padding:15px;background:var(--v);color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:10px;margin-top:8px}
.submit-btn:hover{background:var(--vf);transform:translateY(-1px);box-shadow:0 6px 20px rgba(26,107,60,.25)}
.submit-btn:active{transform:translateY(0)}
.submit-btn.loading{opacity:.7;cursor:not-allowed}
.note{font-size:12px;color:var(--soft);text-align:center;margin-top:12px;line-height:1.6}

/* SUCCES/ERREUR */
.msg-ok{background:#e8f5ee;border:1.5px solid #a5d6b7;border-radius:12px;padding:20px;margin-bottom:24px;display:flex;gap:14px;align-items:flex-start}
.msg-ok-ico{font-size:24px}
.msg-ok h3{font-size:16px;font-weight:700;color:var(--v);margin-bottom:4px}
.msg-ok p{font-size:14px;color:#2d6a4f}
.msg-err{background:var(--rc);border:1.5px solid #ffb3b3;border-radius:12px;padding:16px;margin-bottom:20px;font-size:14px;color:var(--r);display:flex;align-items:center;gap:10px}

/* SUJETS */
.sujets-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:6px}
.sujet-btn{padding:10px 14px;border:1.5px solid var(--bd);border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;background:var(--bg);color:var(--soft);transition:all .2s;text-align:left;font-family:inherit}
.sujet-btn:hover,.sujet-btn.active{border-color:var(--v);background:var(--vc);color:var(--v)}
#sujet{display:none}

/* FAQ RAPIDE */
.faq-rapide{margin-top:48px;padding-top:48px;border-top:1.5px solid var(--bd)}
.faq-rapide h2{font-family:'Fraunces',serif;font-size:26px;margin-bottom:8px;text-align:center}
.faq-rapide > p{font-size:15px;color:var(--soft);text-align:center;margin-bottom:36px}
.faq-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.faq-item{background:var(--w);border:1.5px solid var(--bd);border-radius:14px;padding:22px;cursor:pointer;transition:all .2s}
.faq-item:hover{border-color:var(--v);box-shadow:0 4px 16px rgba(26,107,60,.08)}
.faq-q{font-size:15px;font-weight:700;margin-bottom:0;display:flex;justify-content:space-between;align-items:center;gap:12px}
.faq-ico{font-size:18px;color:var(--v);flex-shrink:0;transition:transform .3s}
.faq-item.open .faq-ico{transform:rotate(45deg)}
.faq-a{display:none;margin-top:12px;font-size:14px;color:var(--soft);line-height:1.7}
.faq-item.open .faq-a{display:block}

/* FOOTER */
footer{background:var(--tx);padding:40px 5% 24px}
.fbot{max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,.3);flex-wrap:wrap;gap:8px;align-items:center}
.fbot a{color:rgba(255,255,255,.4);text-decoration:none;font-family:'Fraunces',serif;font-size:16px}
.fbot a:hover{color:white}

.mb{display:none;background:none;border:none;font-size:24px;cursor:pointer;color:var(--tx)}
@media(max-width:800px){.grid{grid-template-columns:1fr}.info-box{position:static}.fg2{grid-template-columns:1fr}.faq-grid{grid-template-columns:1fr}.sujets-grid{grid-template-columns:1fr}}
@media(max-width:480px){.wrap{padding:40px 5%}.form-box{padding:24px}.hero-c{padding:50px 5% 70px}}
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
    <a href="/#faq">FAQ</a>
    <a href="/contact" style="color:var(--v);font-weight:700;">Contact</a>
    <a href="/auth/login" class="nc">Connexion &#x2192;</a>
  </div>
  <button class="mb" onclick="toggleMenu()">&#x2630;</button>
</nav>

<div class="hero-c">
  <div style="position:relative;z-index:1">
    <div style="display:inline-block;background:rgba(255,255,255,.15);color:white;padding:8px 20px;border-radius:30px;font-size:13px;font-weight:600;margin-bottom:20px;border:1px solid rgba(255,255,255,.2)">&#x1F4AC; Nous sommes &#xe0; votre &#xe9;coute</div>
    <h1>Contactez l&#x27;&#xe9;quipe SantéBF</h1>
    <p>Une question sur nos plans, une d&#xe9;monstration, un besoin sp&#xe9;cifique ? Notre &#xe9;quipe vous r&#xe9;pond.</p>
  </div>
</div>

<div class="wrap">
  <div class="grid">

    <!-- COLONNE GAUCHE — INFOS -->
    <div>
      <div class="info-box">
        <h2>Parlons de votre projet</h2>
        <p>Que vous soyez une clinique priv&#xe9;e, un h&#xf4;pital r&#xe9;gional ou un cabinet m&#xe9;dical, nous adaptons notre accompagnement &#xe0; vos besoins.</p>

        <div class="contact-item">
          <div class="ci-ico">&#x2709;&#xFE0F;</div>
          <div>
            <div class="ci-label">Email</div>
            <div class="ci-val">sante.bf@gmail.com</div>
            <div class="ci-sub">R&#xe9;ponse sous 24h ouvr&#xe9;es</div>
          </div>
        </div>

        <div class="contact-item">
          <div class="ci-ico">&#x1F4CD;</div>
          <div>
            <div class="ci-label">Localisation</div>
            <div class="ci-val">Ouagadougou, Burkina Faso</div>
            <div class="ci-sub">D&#xe9;monstrations disponibles sur site</div>
          </div>
        </div>

        <div class="contact-item">
          <div class="ci-ico">&#x1F553;</div>
          <div>
            <div class="ci-label">Horaires</div>
            <div class="ci-val">Lundi &#x2014; Vendredi</div>
            <div class="ci-sub">8h00 &#x2014; 18h00 (heure locale)</div>
          </div>
        </div>

        <div class="badge-disp">Disponible pour d&#xe9;monstration</div>

        <div style="margin-top:28px;padding-top:24px;border-top:1px solid var(--bd)">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--soft);margin-bottom:14px">Acc&#xe8;s direct</div>
          <a href="/auth/inscription" style="display:block;background:var(--vc);color:var(--v);padding:12px 16px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;margin-bottom:8px;text-align:center">&#x1F680; Essai gratuit 6 mois</a>
          <a href="/abonnement/plans" style="display:block;background:#f3f4f6;color:#374151;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;text-align:center">&#x1F4B3; Voir les tarifs</a>
        </div>
      </div>
    </div>

    <!-- COLONNE DROITE — FORMULAIRE -->
    <div>
      <div class="form-box">
        <h2>Envoyer un message</h2>
        <p>Remplissez ce formulaire et nous vous r&#xe9;pondrons dans les plus brefs d&#xe9;lais.</p>

        ${opts.succes ? `
        <div class="msg-ok">
          <div class="msg-ok-ico">&#x2705;</div>
          <div>
            <h3>Message envoy&#xe9; avec succ&#xe8;s !</h3>
            <p>Merci pour votre message. Notre &#xe9;quipe vous r&#xe9;pondra sous 24h ouvr&#xe9;es &#xe0; l&#x27;adresse indiqu&#xe9;e.</p>
          </div>
        </div>` : ''}

        ${opts.erreur ? `<div class="msg-err">&#x26A0;&#xFE0F; ${opts.erreur}</div>` : ''}

        <form method="POST" action="/contact" id="contactForm" onsubmit="handleSubmit(this)">

          <div style="margin-bottom:20px">
            <label>Sujet de votre demande <span class="req">*</span></label>
            <div class="sujets-grid">
              <button type="button" class="sujet-btn" onclick="selectSujet('demonstration',this)">&#x1F4BB; Demande de d&#xe9;monstration</button>
              <button type="button" class="sujet-btn" onclick="selectSujet('abonnement',this)">&#x1F4B3; Question abonnement</button>
              <button type="button" class="sujet-btn" onclick="selectSujet('technique',this)">&#x2699;&#xFE0F; Support technique</button>
              <button type="button" class="sujet-btn" onclick="selectSujet('autre',this)">&#x1F4AC; Autre question</button>
            </div>
            <input type="hidden" name="sujet" id="sujet" required>
          </div>

          <div class="fg2">
            <div class="fg" style="margin-bottom:0">
              <label>Pr&#xe9;nom <span class="req">*</span></label>
              <input type="text" name="prenom" placeholder="Aminata" required>
            </div>
            <div class="fg" style="margin-bottom:0">
              <label>Nom <span class="req">*</span></label>
              <input type="text" name="nom" placeholder="TRAORE" required>
            </div>
          </div>

          <div class="fg" style="margin-top:16px">
            <label>Email professionnel <span class="req">*</span></label>
            <input type="email" name="email" placeholder="contact@votre-structure.bf" required>
          </div>

          <div class="fg2" style="margin-top:0">
            <div class="fg" style="margin-bottom:0">
              <label>T&#xe9;l&#xe9;phone</label>
              <input type="tel" name="telephone" placeholder="+226 XX XX XX XX">
            </div>
            <div class="fg" style="margin-bottom:0">
              <label>Type de structure</label>
              <select name="type_structure">
                <option value="">S&#xe9;lectionner...</option>
                <option value="chu">CHU / CHR</option>
                <option value="clinique">Clinique priv&#xe9;e</option>
                <option value="cabinet">Cabinet m&#xe9;dical</option>
                <option value="csps">CSPS / Centre de sant&#xe9;</option>
                <option value="pharmacie">Pharmacie</option>
                <option value="labo">Laboratoire</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>

          <div class="fg" style="margin-top:16px">
            <label>Nom de votre structure</label>
            <input type="text" name="structure" placeholder="Ex: Clinique Sainte Marie de Ouagadougou">
          </div>

          <div class="fg">
            <label>Votre message <span class="req">*</span></label>
            <textarea name="message" placeholder="D&#xe9;crivez votre besoin, vos questions ou la taille de votre &#xe9;quipe..." required maxlength="2000" oninput="updateCount(this)"></textarea>
            <div class="char-count"><span id="charCount">0</span> / 2000</div>
          </div>

          <button type="submit" class="submit-btn" id="submitBtn">
            <span id="btnText">&#x2709;&#xFE0F; Envoyer le message</span>
          </button>
          <p class="note">En envoyant ce formulaire, vous acceptez que nous vous contactions &#xe0; l&#x27;adresse indiqu&#xe9;e. Aucune donn&#xe9;e n&#x27;est partag&#xe9;e avec des tiers.</p>
        </form>
      </div>
    </div>

  </div><!-- /grid -->

  <!-- FAQ RAPIDE -->
  <div class="faq-rapide">
    <h2>Questions fr&#xe9;quentes</h2>
    <p>Les r&#xe9;ponses aux questions les plus courantes sur SantéBF.</p>
    <div class="faq-grid">
      <div class="faq-item" onclick="toggleFaq(this)">
        <div class="faq-q">Combien de temps dure l&#x27;essai gratuit ?<span class="faq-ico">+</span></div>
        <div class="faq-a">L&#x27;essai gratuit dure <strong>6 mois</strong> complets. Toutes les fonctionnalit&#xe9;s de base sont incluses sans limitation pendant cette p&#xe9;riode. Aucune carte bancaire n&#x27;est requise pour commencer.</div>
      </div>
      <div class="faq-item" onclick="toggleFaq(this)">
        <div class="faq-q">Puis-je avoir une d&#xe9;monstration en direct ?<span class="faq-ico">+</span></div>
        <div class="faq-a">Oui. Remplissez le formulaire en s&#xe9;lectionnant <strong>&#x201C;Demande de d&#xe9;monstration&#x201D;</strong> et notre &#xe9;quipe vous contactera pour planifier une session adapt&#xe9;e &#xe0; votre structure.</div>
      </div>
      <div class="faq-item" onclick="toggleFaq(this)">
        <div class="faq-q">Combien coute l&#x27;abonnement mensuel ?<span class="faq-ico">+</span></div>
        <div class="faq-a">Les plans vont de <strong>40 000 FCFA/mois</strong> (Starter) &#xe0; <strong>120 000 FCFA/mois</strong> (Pro). Des remises de 20% sont disponibles pour les engagements annuels et les groupes de structures.</div>
      </div>
      <div class="faq-item" onclick="toggleFaq(this)">
        <div class="faq-q">Est-ce que SantéBF fonctionne sans internet ?<span class="faq-ico">+</span></div>
        <div class="faq-a">SantéBF n&#xe9;cessite une connexion internet, mais est <strong>optimis&#xe9; pour les connexions lentes</strong> (3G/4G). Les pages sont l&#xe9;g&#xe8;res et rapides m&#xea;me avec un r&#xe9;seau limit&#xe9;.</div>
      </div>
      <div class="faq-item" onclick="toggleFaq(this)">
        <div class="faq-q">Peut-on migrer nos donn&#xe9;es existantes ?<span class="faq-ico">+</span></div>
        <div class="faq-a">Oui, nous accompagnons la migration de vos donn&#xe9;es existantes (depuis Excel, papier ou autre logiciel). Contactez-nous pour discuter de votre situation sp&#xe9;cifique.</div>
      </div>
      <div class="faq-item" onclick="toggleFaq(this)">
        <div class="faq-q">Y a-t-il une formation incluse ?<span class="faq-ico">+</span></div>
        <div class="faq-a">La prise en main est intuitive et conc&#xe7;ue pour &#xea;tre rapide (1 &#xe0; 2 heures). Pour les plans Entreprise, une <strong>formation sur site</strong> est incluse. Des ressources en ligne sont disponibles pour tous les plans.</div>
      </div>
    </div>
  </div>

</div><!-- /wrap -->

<footer>
  <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:36px;padding-bottom:36px;border-bottom:1px solid rgba(255,255,255,.08)">
    <div>
      <div style="font-family:'Fraunces',serif;font-size:20px;color:white;margin-bottom:10px">&#x1F3E5; Sant&#xe9;BF</div>
      <p style="font-size:13px;color:rgba(255,255,255,.45);line-height:1.7;max-width:260px">Plateforme num&#xe9;rique de gestion de sant&#xe9; pour les structures sanitaires du Burkina Faso.</p>
    </div>
    <div>
      <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Plateforme</div>
      <a href="/#modules" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Modules</a>
      <a href="/abonnement/plans" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Abonnement</a>
      <a href="/#plans" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Tarifs</a>
      <a href="/#securite" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">S&#xe9;curit&#xe9;</a>
    </div>
    <div>
      <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Acc&#xe8;s</div>
      <a href="/auth/login" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Connexion</a>
      <a href="/auth/inscription" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Cr&#xe9;er un compte</a>
      <a href="/public/patient/welcome" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">App Patient</a>
    </div>
    <div>
      <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Support</div>
      <a href="/#faq" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">FAQ</a>
      <a href="/contact" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Nous contacter</a>
      <a href="/politique-confidentialite" style="display:block;font-size:13px;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:8px">Confidentialit&#xe9;</a>
    </div>
  </div>
  <div class="fbot">
    <span>&#xa9; 2026 Sant&#xe9;BF &#x2014; Tous droits r&#xe9;serv&#xe9;s</span>
    <span>Fait avec &#x2764;&#xFE0F; au Burkina Faso</span>
  </div>
</footer>

<script>
function selectSujet(val, btn) {
  document.querySelectorAll('.sujet-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  document.getElementById('sujet').value = val
}

function updateCount(el) {
  document.getElementById('charCount').textContent = el.value.length
}

function handleSubmit(form) {
  const btn = document.getElementById('submitBtn')
  const txt = document.getElementById('btnText')
  btn.classList.add('loading')
  txt.textContent = 'Envoi en cours...'
  btn.disabled = true
}

function toggleFaq(item) {
  const wasOpen = item.classList.contains('open')
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'))
  if (!wasOpen) item.classList.add('open')
}
</script>
</body>
</html>`
}

// ── Routes ────────────────────────────────────────────────

contactRoutes.get('/', (c) => c.html(contactPage()))

contactRoutes.post('/', async (c) => {
  try {
    const body = await c.req.parseBody()

    const prenom         = String(body.prenom         || '').trim()
    const nom            = String(body.nom            || '').trim()
    const email          = String(body.email          || '').trim().toLowerCase()
    const sujet          = String(body.sujet          || '').trim()
    const message        = String(body.message        || '').trim()
    const telephone      = String(body.telephone      || '').trim()
    const structure      = String(body.structure      || '').trim()
    const type_structure = String(body.type_structure || '').trim()

    if (!prenom || !nom || !email || !sujet || !message) {
      return c.html(contactPage({ erreur: 'Veuillez remplir tous les champs obligatoires.' }))
    }
    if (!email.includes('@')) {
      return c.html(contactPage({ erreur: 'Adresse email invalide.' }))
    }
    if (message.length < 10) {
      return c.html(contactPage({ erreur: 'Message trop court (minimum 10 caracteres).' }))
    }

    const sujets: Record<string, string> = {
      demonstration: 'Demande de demonstration',
      abonnement:    'Question abonnement',
      technique:     'Support technique',
      autre:         'Autre question',
    }

    const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<div style="background:#1A6B3C;color:white;padding:20px;border-radius:8px 8px 0 0">
  <h2 style="margin:0">&#x1F3E5; SanteBF &#x2014; Nouveau message de contact</h2>
</div>
<div style="background:#f9f9f9;border:1px solid #e0e0e0;border-top:none;padding:20px;border-radius:0 0 8px 8px">
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:8px 0;font-weight:bold;color:#374151;width:160px">Sujet :</td><td style="padding:8px 0;color:#1A6B3C;font-weight:bold">${sujets[sujet] || sujet}</td></tr>
    <tr><td style="padding:8px 0;font-weight:bold;color:#374151">Nom :</td><td style="padding:8px 0">${prenom} ${nom}</td></tr>
    <tr><td style="padding:8px 0;font-weight:bold;color:#374151">Email :</td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
    <tr><td style="padding:8px 0;font-weight:bold;color:#374151">Telephone :</td><td style="padding:8px 0">${telephone || 'Non renseigne'}</td></tr>
    <tr><td style="padding:8px 0;font-weight:bold;color:#374151">Structure :</td><td style="padding:8px 0">${structure || 'Non renseignee'} ${type_structure ? '(' + type_structure + ')' : ''}</td></tr>
  </table>
  <hr style="border:none;border-top:1px solid #e0e0e0;margin:16px 0">
  <h3 style="color:#374151;margin-bottom:10px">Message :</h3>
  <p style="background:white;border:1px solid #e0e0e0;border-radius:8px;padding:16px;line-height:1.6;white-space:pre-wrap">${message}</p>
  <p style="font-size:11px;color:#9e9e9e;margin-top:16px">Envoye via le formulaire de contact SanteBF le ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
</div>
</body></html>`

    const sent = await sendEmail(
      c.env,
      DEST_EMAIL,
      `[SanteBF Contact] ${sujets[sujet] || sujet} — ${prenom} ${nom}`,
      html
    )

    if (!sent) {
      console.warn('Email non envoye (aucune cle API configuree) - message:', { prenom, nom, email, sujet, message })
    }

    return c.html(contactPage({ succes: true }))

  } catch (err) {
    console.error('POST /contact error:', err)
    return c.html(contactPage({ erreur: 'Erreur serveur. Veuillez reessayer ou nous ecrire directement.' }))
  }
})
