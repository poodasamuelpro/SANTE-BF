/**
 * src/utils/email.ts
 * SantéBF — Service d'envoi email via Resend API
 *
 * Corrections :
 *   1. Fonction principale renommée sendEmail() (cohérent avec notifications.ts)
 *      La version originale s'appelait envoyerEmail() — incohérence corrigée
 *   2. Export de envoyerEmail() maintenu comme alias pour rétrocompatibilité
 *   3. Interface EmailParams simplifiée et cohérente
 *   4. from: utilise domaine santebf.izicardouaga.com (cohérent avec notifications.ts)
 */

// ─── Interface ────────────────────────────────────────────

export interface EmailParams {
  to:       string
  subject:  string
  html:     string
  from?:    string
}

// ─── sendEmail — fetch natif Workers ─────────────────────
// Nom unifié : sendEmail() utilisé dans notifications.ts et medecin.ts

export async function sendEmail(
  params:  EmailParams,
  apiKey:  string
): Promise<{ success: boolean; error?: string; id?: string }> {
  const {
    to,
    subject,
    html,
    from = 'Sant\u00e9BF <noreply@santebf.izicardouaga.com>',
  } = params

  if (!apiKey) return { success: false, error: 'RESEND_API_KEY manquante' }
  if (!to)     return { success: false, error: 'Destinataire manquant' }

  try {
    const res  = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })

    const data = await res.json() as any

    if (!res.ok) {
      console.error('Resend API error:', data)
      return { success: false, error: data.message ?? `HTTP ${res.status}` }
    }

    return { success: true, id: data.id }
  } catch (err: any) {
    console.error('sendEmail fetch error:', err)
    return { success: false, error: err.message ?? 'Erreur inconnue' }
  }
}

// Alias rétrocompatibilité (l'ancienne version s'appelait envoyerEmail)
export const envoyerEmail = sendEmail

// ═══════════════════════════════════════════════════════════
// TEMPLATES EMAIL HTML
// ═══════════════════════════════════════════════════════════

// ─── Réinitialisation mot de passe ───────────────────────

export function templateResetPassword(
  nom:      string,
  prenom:   string,
  resetUrl: string
): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>R&#xe9;initialisation mot de passe &#x2014; Sant&#xe9;BF</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F7F8FA;margin:0;padding:0}
  .wrap{max-width:560px;margin:32px auto;background:white;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
  .hd{background:#4A148C;padding:28px 36px;text-align:center;color:white}
  .hd-ico{font-size:44px;margin-bottom:8px}
  .hd h1{font-size:22px;margin:0;font-weight:600}
  .bd{padding:36px}
  .btn-wrap{text-align:center;margin:28px 0}
  .btn{display:inline-block;background:#4A148C;color:white;text-decoration:none;
    padding:13px 30px;border-radius:9px;font-size:15px;font-weight:600}
  .warn{background:#FFF8E1;border-left:4px solid #F9A825;padding:12px 16px;
    border-radius:8px;font-size:13px;color:#E65100;margin:20px 0}
  .ft{background:#F7F8FA;padding:20px 36px;text-align:center;font-size:11px;
    color:#9E9E9E;border-top:1px solid #E5E7EB}
  p{font-size:15px;color:#6B7280;line-height:1.7;margin:0 0 14px}
  a.link{color:#4A148C;word-break:break-all;font-size:13px}
</style>
</head>
<body>
<div class="wrap">
  <div class="hd">
    <div class="hd-ico">&#x1F3E5;</div>
    <h1>Sant&#xe9;BF &#x2014; R&#xe9;initialisation</h1>
  </div>
  <div class="bd">
    <p>Bonjour <strong>${prenom} ${nom}</strong>,</p>
    <p>Vous avez demand&#xe9; &#xe0; r&#xe9;initialiser votre mot de passe SantéBF.
    Cliquez sur le bouton ci-dessous :</p>
    <div class="btn-wrap">
      <a href="${resetUrl}" class="btn">R&#xe9;initialiser mon mot de passe</a>
    </div>
    <div class="warn">
      &#x26A0;&#xFE0F; <strong>S&#xe9;curit&#xe9; :</strong> Ce lien est valable 1 heure.
      Si vous n&#x27;avez pas demand&#xe9; cette r&#xe9;initialisation, ignorez cet email.
    </div>
    <p>Si le bouton ne fonctionne pas :<br>
      <a href="${resetUrl}" class="link">${resetUrl}</a>
    </p>
  </div>
  <div class="ft">
    Sant&#xe9;BF &#x2014; Syst&#xe8;me National de Sant&#xe9; Num&#xe9;rique &#x1F1E7;&#x1F1EB;
  </div>
</div>
</body>
</html>`
}

// ─── Bienvenue nouveau compte ─────────────────────────────

export function templateBienvenue(
  nom:                  string,
  prenom:               string,
  email:                string,
  motDePasseTemporaire: string,
  role:                 string
): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bienvenue sur Sant&#xe9;BF</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F7F8FA;margin:0;padding:0}
  .wrap{max-width:560px;margin:32px auto;background:white;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
  .hd{background:#4A148C;padding:28px 36px;text-align:center;color:white}
  .hd-ico{font-size:44px;margin-bottom:8px}
  .hd h1{font-size:22px;margin:0;font-weight:600}
  .bd{padding:36px}
  .creds{background:#F9FAFB;border:2px solid #E5E7EB;border-radius:12px;padding:18px;margin:20px 0}
  .creds-title{font-size:12px;color:#4A148C;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin:0 0 12px}
  .cred-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #E5E7EB;font-size:14px}
  .cred-row:last-child{border-bottom:none}
  .cred-lbl{color:#6B7280;font-weight:500}
  .cred-val{color:#1A1A2E;font-weight:600;font-family:'Courier New',monospace}
  .warn{background:#FFF3E0;border-left:4px solid #E65100;padding:12px 16px;border-radius:8px;font-size:13px;color:#E65100;margin:20px 0}
  .btn-wrap{text-align:center;margin:24px 0}
  .btn{display:inline-block;background:#4A148C;color:white;text-decoration:none;
    padding:13px 30px;border-radius:9px;font-size:15px;font-weight:600}
  .ft{background:#F7F8FA;padding:20px 36px;text-align:center;font-size:11px;color:#9E9E9E;border-top:1px solid #E5E7EB}
  p{font-size:15px;color:#6B7280;line-height:1.7;margin:0 0 14px}
</style>
</head>
<body>
<div class="wrap">
  <div class="hd">
    <div class="hd-ico">&#x1F3E5;</div>
    <h1>Bienvenue sur Sant&#xe9;BF !</h1>
  </div>
  <div class="bd">
    <p>Bonjour <strong>${prenom} ${nom}</strong>,</p>
    <p>Votre compte Sant&#xe9;BF a &#xe9;t&#xe9; cr&#xe9;&#xe9; avec le r&#xf4;le : <strong>${role}</strong>.</p>
    <div class="creds">
      <p class="creds-title">&#x1F511; Vos identifiants</p>
      <div class="cred-row">
        <span class="cred-lbl">Email :</span>
        <span class="cred-val">${email}</span>
      </div>
      <div class="cred-row">
        <span class="cred-lbl">Mot de passe temporaire :</span>
        <span class="cred-val">${motDePasseTemporaire}</span>
      </div>
    </div>
    <div class="warn">
      &#x26A0;&#xFE0F; <strong>Important :</strong> Vous devrez changer ce mot de passe
      lors de votre premi&#xe8;re connexion.
    </div>
    <div class="btn-wrap">
      <a href="https://santebf.izicardouaga.com/auth/login" class="btn">Se connecter &#x2192;</a>
    </div>
  </div>
  <div class="ft">
    Sant&#xe9;BF &#x2014; Minist&#xe8;re de la Sant&#xe9; &#x2014; Burkina Faso &#x1F1E7;&#x1F1EB;
  </div>
</div>
</body>
</html>`
}

// ─── Rappel RDV ───────────────────────────────────────────

export function templateRappelRDV(
  patientNom:    string,
  patientPrenom: string,
  dateRdv:       string,
  heureRdv:      string,
  medecinNom:    string,
  structureNom:  string
): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rappel RDV &#x2014; Sant&#xe9;BF</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F7F8FA;margin:0;padding:0}
  .wrap{max-width:560px;margin:32px auto;background:white;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
  .hd{background:#4A148C;padding:28px 36px;text-align:center;color:white}
  .hd-ico{font-size:44px;margin-bottom:8px}
  .hd h1{font-size:22px;margin:0;font-weight:600}
  .bd{padding:36px}
  .rdv-card{background:#F3E5F5;border:2px solid #4A148C;border-radius:12px;padding:18px;margin:20px 0}
  .rdv-row{display:flex;justify-content:space-between;padding:7px 0;font-size:14px}
  .rdv-lbl{color:#6B7280;font-weight:500}
  .rdv-val{color:#1A1A2E;font-weight:700}
  .ft{background:#F7F8FA;padding:20px 36px;text-align:center;font-size:11px;color:#9E9E9E;border-top:1px solid #E5E7EB}
  p{font-size:15px;color:#6B7280;line-height:1.7;margin:0 0 14px}
  ul{font-size:14px;color:#6B7280;padding-left:20px;margin:0 0 14px}
  li{margin-bottom:6px}
</style>
</head>
<body>
<div class="wrap">
  <div class="hd">
    <div class="hd-ico">&#x1F4C5;</div>
    <h1>Rappel de rendez-vous</h1>
  </div>
  <div class="bd">
    <p>Bonjour <strong>${patientPrenom} ${patientNom}</strong>,</p>
    <p>Rappel : vous avez un rendez-vous m&#xe9;dical <strong>demain</strong> :</p>
    <div class="rdv-card">
      <div class="rdv-row"><span class="rdv-lbl">&#x1F4C5; Date :</span><span class="rdv-val">${dateRdv}</span></div>
      <div class="rdv-row"><span class="rdv-lbl">&#x1F550; Heure :</span><span class="rdv-val">${heureRdv}</span></div>
      <div class="rdv-row"><span class="rdv-lbl">&#x1F9D1;&#x200D;&#x2695;&#xFE0F; M&#xe9;decin :</span><span class="rdv-val">Dr. ${medecinNom}</span></div>
      <div class="rdv-row"><span class="rdv-lbl">&#x1F3E5; Structure :</span><span class="rdv-val">${structureNom}</span></div>
    </div>
    <ul>
      <li>Pr&#xe9;sentez-vous 10 minutes avant l&#x27;heure</li>
      <li>Apportez votre pi&#xe8;ce d&#x27;identit&#xe9;</li>
      <li>En cas d&#x27;emp&#xea;chement, pr&#xe9;venez au plus t&#xf4;t</li>
    </ul>
  </div>
  <div class="ft">
    Sant&#xe9;BF &#x2014; Syst&#xe8;me National de Sant&#xe9; Num&#xe9;rique &#x1F1E7;&#x1F1EB;
  </div>
</div>
</body>
</html>`
}
