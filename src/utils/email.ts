// ========================================
// Service d'envoi d'email en production
// ========================================
// Utilise l'API Resend (compatible Cloudflare Workers)
// Alternative: SendGrid, Mailgun, AWS SES via fetch API

type EmailParams = {
  to: string
  subject: string
  html: string
  from?: string
}

/**
 * Envoyer un email via Resend API
 * Doc: https://resend.com/docs/send-with-nodejs
 * 
 * Configuration requise:
 * - Variable d'environnement: RESEND_API_KEY
 * - Domain vérifié dans Resend
 */
export async function envoyerEmail(params: EmailParams, apiKey: string): Promise<{ success: boolean; error?: string; id?: string }> {
  const { to, subject, html, from = 'SantéBF <noreply@santebf.bf>' } = params

  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY manquante' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Erreur Resend API:', data)
      return {
        success: false,
        error: data.message || `HTTP ${response.status}`,
      }
    }

    return {
      success: true,
      id: data.id,
    }
  } catch (error: any) {
    console.error('Erreur envoi email:', error)
    return {
      success: false,
      error: error.message || 'Erreur inconnue',
    }
  }
}

/**
 * Template HTML: Email de réinitialisation de mot de passe
 */
export function templateResetPassword(nom: string, prenom: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation mot de passe — SantéBF</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #F7F8FA;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 580px;
      margin: 40px auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    .header {
      background: linear-gradient(135deg, #1A6B3C 0%, #2E8B57 100%);
      padding: 32px 40px;
      text-align: center;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 8px;
    }
    .header-title {
      font-size: 24px;
      color: white;
      font-weight: 600;
      margin: 0;
    }
    .header-subtitle {
      font-size: 13px;
      color: rgba(255,255,255,0.8);
      margin: 4px 0 0 0;
    }
    .content {
      padding: 40px;
    }
    .greeting {
      font-size: 18px;
      color: #1A1A2E;
      margin: 0 0 20px 0;
    }
    .text {
      font-size: 15px;
      color: #6B7280;
      line-height: 1.7;
      margin: 0 0 20px 0;
    }
    .button-wrap {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background: #1A6B3C;
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(26,107,60,0.3);
    }
    .info-box {
      background: #FFF8E1;
      border-left: 4px solid #F9A825;
      padding: 14px 18px;
      border-radius: 8px;
      font-size: 13px;
      color: #E65100;
      margin: 24px 0;
    }
    .footer {
      background: #F7F8FA;
      padding: 24px 40px;
      text-align: center;
      font-size: 12px;
      color: #9E9E9E;
      border-top: 1px solid #E5E7EB;
    }
    .footer a {
      color: #1A6B3C;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🏥</div>
      <h1 class="header-title">SantéBF</h1>
      <p class="header-subtitle">Système National de Santé Numérique</p>
    </div>

    <div class="content">
      <p class="greeting">Bonjour ${prenom} ${nom},</p>
      
      <p class="text">
        Vous avez demandé à réinitialiser votre mot de passe SantéBF.
        Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
      </p>

      <div class="button-wrap">
        <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
      </div>

      <div class="info-box">
        ⚠️ <strong>Sécurité :</strong> Ce lien est valable pendant 1 heure.
        Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
      </div>

      <p class="text">
        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
        <a href="${resetUrl}" style="color:#1565C0;word-break:break-all">${resetUrl}</a>
      </p>
    </div>

    <div class="footer">
      <p>
        Cet email a été envoyé automatiquement par <a href="https://santebf.bf">SantéBF</a><br>
        Ministère de la Santé — Burkina Faso 🇧🇫
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Template HTML: Email de bienvenue (nouveau compte créé)
 */
export function templateBienvenue(nom: string, prenom: string, email: string, motDePasseTemporaire: string, role: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur SantéBF</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #F7F8FA;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 580px;
      margin: 40px auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    .header {
      background: linear-gradient(135deg, #1A6B3C 0%, #2E8B57 100%);
      padding: 32px 40px;
      text-align: center;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 8px;
    }
    .header-title {
      font-size: 24px;
      color: white;
      font-weight: 600;
      margin: 0;
    }
    .content {
      padding: 40px;
    }
    .greeting {
      font-size: 20px;
      color: #1A1A2E;
      margin: 0 0 20px 0;
    }
    .text {
      font-size: 15px;
      color: #6B7280;
      line-height: 1.7;
      margin: 0 0 16px 0;
    }
    .credentials {
      background: #F9FAFB;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .credentials-title {
      font-size: 14px;
      color: #1A6B3C;
      font-weight: 700;
      margin: 0 0 12px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .credential-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #E5E7EB;
      font-size: 14px;
    }
    .credential-item:last-child {
      border-bottom: none;
    }
    .credential-label {
      color: #6B7280;
      font-weight: 500;
    }
    .credential-value {
      color: #1A1A2E;
      font-weight: 600;
      font-family: 'Courier New', monospace;
    }
    .button-wrap {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background: #1A6B3C;
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(26,107,60,0.3);
    }
    .warning-box {
      background: #FFF3E0;
      border-left: 4px solid #E65100;
      padding: 14px 18px;
      border-radius: 8px;
      font-size: 13px;
      color: #E65100;
      margin: 24px 0;
    }
    .footer {
      background: #F7F8FA;
      padding: 24px 40px;
      text-align: center;
      font-size: 12px;
      color: #9E9E9E;
      border-top: 1px solid #E5E7EB;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🏥</div>
      <h1 class="header-title">Bienvenue sur SantéBF !</h1>
    </div>

    <div class="content">
      <p class="greeting">Bonjour ${prenom} ${nom},</p>
      
      <p class="text">
        Votre compte SantéBF a été créé avec succès. Vous avez été enregistré(e) avec le rôle :
        <strong>${role}</strong>.
      </p>

      <div class="credentials">
        <p class="credentials-title">🔑 Vos identifiants de connexion</p>
        <div class="credential-item">
          <span class="credential-label">Email :</span>
          <span class="credential-value">${email}</span>
        </div>
        <div class="credential-item">
          <span class="credential-label">Mot de passe temporaire :</span>
          <span class="credential-value">${motDePasseTemporaire}</span>
        </div>
      </div>

      <div class="warning-box">
        ⚠️ <strong>Important :</strong> Vous devrez changer ce mot de passe temporaire
        lors de votre première connexion pour des raisons de sécurité.
      </div>

      <div class="button-wrap">
        <a href="https://santebf.bf/auth/login" class="button">Se connecter maintenant →</a>
      </div>

      <p class="text">
        Si vous rencontrez des difficultés, contactez l'administrateur de votre structure
        ou le support SantéBF.
      </p>
    </div>

    <div class="footer">
      <p>
        SantéBF — Système National de Santé Numérique<br>
        Ministère de la Santé — Burkina Faso 🇧🇫
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Template HTML: Notification rendez-vous
 */
export function templateRappelRDV(
  patientNom: string,
  patientPrenom: string,
  dateRdv: string,
  heureRdv: string,
  medecinNom: string,
  structureNom: string
): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rappel rendez-vous — SantéBF</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F7F8FA; margin: 0; padding: 0; }
    .container { max-width: 580px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1565C0 0%, #1976D2 100%); padding: 32px 40px; text-align: center; }
    .logo { font-size: 48px; margin-bottom: 8px; }
    .header-title { font-size: 24px; color: white; font-weight: 600; margin: 0; }
    .content { padding: 40px; }
    .greeting { font-size: 18px; color: #1A1A2E; margin: 0 0 20px 0; }
    .text { font-size: 15px; color: #6B7280; line-height: 1.7; margin: 0 0 16px 0; }
    .rdv-box { background: #E3F2FD; border: 2px solid #1565C0; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .rdv-icon { font-size: 36px; text-align: center; margin-bottom: 12px; }
    .rdv-item { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .rdv-label { color: #6B7280; font-weight: 500; }
    .rdv-value { color: #1A1A2E; font-weight: 700; }
    .footer { background: #F7F8FA; padding: 24px 40px; text-align: center; font-size: 12px; color: #9E9E9E; border-top: 1px solid #E5E7EB; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">📅</div>
      <h1 class="header-title">Rappel de rendez-vous</h1>
    </div>
    <div class="content">
      <p class="greeting">Bonjour ${patientPrenom} ${patientNom},</p>
      <p class="text">
        Ceci est un rappel pour votre rendez-vous médical.
      </p>
      <div class="rdv-box">
        <div class="rdv-icon">🏥</div>
        <div class="rdv-item">
          <span class="rdv-label">Date :</span>
          <span class="rdv-value">${dateRdv}</span>
        </div>
        <div class="rdv-item">
          <span class="rdv-label">Heure :</span>
          <span class="rdv-value">${heureRdv}</span>
        </div>
        <div class="rdv-item">
          <span class="rdv-label">Médecin :</span>
          <span class="rdv-value">Dr. ${medecinNom}</span>
        </div>
        <div class="rdv-item">
          <span class="rdv-label">Structure :</span>
          <span class="rdv-value">${structureNom}</span>
        </div>
      </div>
      <p class="text">
        Merci de vous présenter 15 minutes avant l'heure prévue.
        En cas d'empêchement, veuillez contacter la structure.
      </p>
    </div>
    <div class="footer">
      <p>SantéBF — Système National de Santé 🇧🇫</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
