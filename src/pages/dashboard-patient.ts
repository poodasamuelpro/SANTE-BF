import { AuthProfile } from '../lib/supabase'
import { formatDate } from '../utils/format'

interface PatientData {
  dossier: {
    numero_national: string
    groupe_sanguin: string
    rhesus: string
    allergies: string | null
    maladies_chroniques: string | null
  } | null
  prochainRdv: {
    date_heure: string
    medecin: { nom: string; prenom: string; specialite: string }
    motif: string
  } | null
  ordonnancesActives: number
  consultationsTotal: number
}

export function dashboardPatientPage(profil: AuthProfile, data: PatientData): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — Mon espace santé</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fraunces:ital,wght@0,300;0,600;1,300&display=swap" rel="stylesheet">
  <style>
    :root {
      --bleu:        #1565C0;
      --bleu-mid:    #1976D2;
      --bleu-clair:  #e8f0fe;
      --bleu-glow:   rgba(21,101,192,0.12);
      --rouge:       #C62828;
      --rouge-clair: #fce8e8;
      --vert:        #1A6B3C;
      --vert-clair:  #e8f5ee;
      --texte:       #0f1923;
      --texte-soft:  #5a6a78;
      --bg:          #f0f4fb;
      --blanc:       #ffffff;
      --bordure:     #dce6f5;
      --shadow-sm:   0 1px 4px rgba(0,0,0,0.06);
      --shadow-md:   0 4px 20px rgba(0,0,0,0.08);
      --radius:      16px;
      --radius-sm:   10px;
    }
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Plus Jakarta Sans',sans-serif; background:var(--bg); min-height:100vh; color:var(--texte); }

    /* HEADER MOBILE-FIRST */
    .topbar {
      background: linear-gradient(135deg, var(--bleu), var(--bleu-mid));
      padding: 20px 20px 60px;
      position: relative;
    }
    .topbar-inner {
      max-width: 700px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand { display:flex; align-items:center; gap:10px; }
    .brand-icon { width:32px; height:32px; background:rgba(255,255,255,0.2); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:15px; }
    .brand-name { font-family:'Fraunces',serif; font-size:17px; color:white; }
    .logout-pill { background:rgba(255,255,255,0.15); color:white; border:1px solid rgba(255,255,255,0.2); padding:7px 14px; border-radius:20px; font-size:12px; font-weight:600; text-decoration:none; }
    .logout-pill:hover { background:rgba(255,255,255,0.25); }

    .hero {
      max-width: 700px;
      margin: 16px auto 0;
      padding: 0 20px;
    }
    .hero h1 {
      font-family: 'Fraunces', serif;
      font-size: 26px;
      font-weight: 600;
      color: white;
      margin-bottom: 4px;
    }
    .hero p { font-size: 13px; color: rgba(255,255,255,0.75); }

    /* CONTENT */
    .content {
      max-width: 700px;
      margin: -40px auto 0;
      padding: 0 16px 32px;
    }

    /* NUMERO CARD */
    .numero-card {
      background: var(--blanc);
      border-radius: var(--radius);
      padding: 18px 20px;
      margin-bottom: 16px;
      box-shadow: var(--shadow-md);
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid var(--bordure);
    }
    .numero-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--texte-soft); margin-bottom: 4px; }
    .numero-value { font-family: 'Fraunces', serif; font-size: 20px; color: var(--bleu); font-weight: 600; }
    .sanguin-badge {
      background: var(--rouge-clair);
      color: var(--rouge);
      font-size: 18px;
      font-weight: 900;
      padding: 10px 18px;
      border-radius: var(--radius-sm);
      font-family: 'Fraunces', serif;
    }

    /* RDV CARD */
    .rdv-card {
      background: linear-gradient(135deg, var(--bleu), var(--bleu-mid));
      border-radius: var(--radius);
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: var(--shadow-md);
      color: white;
    }
    .rdv-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.7; margin-bottom: 10px; }
    .rdv-date { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 600; margin-bottom: 4px; }
    .rdv-medecin { font-size: 14px; font-weight: 600; opacity: 0.9; }
    .rdv-motif { font-size: 13px; opacity: 0.7; margin-top: 4px; }
    .no-rdv { text-align: center; padding: 8px 0; }
    .no-rdv-icon { font-size: 32px; margin-bottom: 8px; opacity: 0.6; }
    .no-rdv p { font-size: 13px; opacity: 0.7; }

    /* STATS STRIP */
    .stats-strip {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat-pill {
      background: var(--blanc);
      border-radius: var(--radius);
      padding: 16px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--bordure);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .stat-pill-icon { font-size: 24px; }
    .stat-pill-val { font-family:'Fraunces',serif; font-size:22px; font-weight:600; color:var(--bleu); line-height:1; }
    .stat-pill-lbl { font-size:11px; color:var(--texte-soft); margin-top:2px; }

    /* ACTIONS */
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .action-card {
      background: var(--blanc);
      border-radius: var(--radius);
      padding: 18px 16px;
      text-decoration: none;
      color: var(--texte);
      border: 1px solid var(--bordure);
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: var(--shadow-sm);
      transition: all 0.2s;
    }
    .action-card:hover { border-color:var(--bleu); box-shadow:0 0 0 3px var(--bleu-glow), var(--shadow-md); transform:translateY(-1px); }
    .action-icon { font-size: 24px; width: 44px; height: 44px; background: var(--bleu-clair); border-radius: 10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .action-label { font-size: 13px; font-weight: 600; }
    .action-sub { font-size: 11px; color: var(--texte-soft); margin-top: 2px; }

    /* INFO MEDICALE */
    .info-card {
      background: var(--blanc);
      border-radius: var(--radius);
      padding: 20px;
      border: 1px solid var(--bordure);
      box-shadow: var(--shadow-sm);
    }
    .info-card-title { font-family:'Fraunces',serif; font-size:16px; color:var(--texte); margin-bottom:14px; }
    .info-row { display:flex; justify-content:space-between; align-items:flex-start; padding:10px 0; border-bottom:1px solid var(--bordure); }
    .info-row:last-child { border-bottom:none; }
    .info-lbl { font-size:12px; color:var(--texte-soft); font-weight:500; }
    .info-val { font-size:13px; font-weight:600; color:var(--texte); text-align:right; max-width:60%; }
    .tag { display:inline-block; background:var(--rouge-clair); color:var(--rouge); padding:2px 8px; border-radius:6px; font-size:11px; font-weight:600; margin:2px 2px 0 0; }
    .tag.maladie { background:#fff3e0; color:#e65100; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="topbar">
    <div class="topbar-inner">
      <div class="brand">
        <div class="brand-icon">🏥</div>
        <div class="brand-name">SantéBF</div>
      </div>
      <a href="/auth/logout" class="logout-pill">⏻ Déconnexion</a>
    </div>
    <div class="hero">
      <h1>Bonjour, ${profil.prenom} 👋</h1>
      <p>${date} • ${heure}</p>
    </div>
  </div>

  <div class="content">

    <!-- NUMERO NATIONAL -->
    ${data.dossier ? `
    <div class="numero-card">
      <div>
        <div class="numero-label">Numéro national</div>
        <div class="numero-value">${data.dossier.numero_national}</div>
      </div>
      <div class="sanguin-badge">
        🩸 ${data.dossier.groupe_sanguin || '?'}${data.dossier.rhesus || ''}
      </div>
    </div>` : ''}

    <!-- PROCHAIN RDV -->
    <div class="rdv-card">
      <div class="rdv-title">📅 Prochain rendez-vous</div>
      ${data.prochainRdv ? `
        <div class="rdv-date">${formatDate(data.prochainRdv.date_heure)}</div>
        <div class="rdv-medecin">Dr. ${data.prochainRdv.medecin.nom} ${data.prochainRdv.medecin.prenom}</div>
        <div class="rdv-motif">${data.prochainRdv.medecin.specialite} — ${data.prochainRdv.motif}</div>
      ` : `
        <div class="no-rdv">
          <div class="no-rdv-icon">📅</div>
          <p>Aucun rendez-vous programmé</p>
        </div>
      `}
    </div>

    <!-- STATS -->
    <div class="stats-strip">
      <div class="stat-pill">
        <div class="stat-pill-icon">💊</div>
        <div>
          <div class="stat-pill-val">${data.ordonnancesActives}</div>
          <div class="stat-pill-lbl">Ordonnances actives</div>
        </div>
      </div>
      <div class="stat-pill">
        <div class="stat-pill-icon">📋</div>
        <div>
          <div class="stat-pill-val">${data.consultationsTotal}</div>
          <div class="stat-pill-lbl">Consultations</div>
        </div>
      </div>
    </div>

    <!-- ACTIONS -->
    <div class="actions-grid">
      <a href="/dashboard/patient/dossier" class="action-card">
        <div class="action-icon">📋</div>
        <div>
          <div class="action-label">Mon dossier</div>
          <div class="action-sub">Historique complet</div>
        </div>
      </a>
      <a href="/dashboard/patient/ordonnances" class="action-card">
        <div class="action-icon">💊</div>
        <div>
          <div class="action-label">Ordonnances</div>
          <div class="action-sub">${data.ordonnancesActives} active(s)</div>
        </div>
      </a>
      <a href="/dashboard/patient/rdv" class="action-card">
        <div class="action-icon">📅</div>
        <div>
          <div class="action-label">Rendez-vous</div>
          <div class="action-sub">Mes RDV</div>
        </div>
      </a>
      <a href="/dashboard/patient/examens" class="action-card">
        <div class="action-icon">🧪</div>
        <div>
          <div class="action-label">Examens</div>
          <div class="action-sub">Résultats</div>
        </div>
      </a>
      <a href="/dashboard/patient/vaccinations" class="action-card">
        <div class="action-icon">💉</div>
        <div>
          <div class="action-label">Vaccinations</div>
          <div class="action-sub">Carnet vaccinal</div>
        </div>
      </a>
      <a href="/dashboard/patient/consentements" class="action-card">
        <div class="action-icon">🔒</div>
        <div>
          <div class="action-label">Consentements</div>
          <div class="action-sub">Accès au dossier</div>
        </div>
      </a>
    </div>

    <!-- INFO MEDICALE -->
    ${data.dossier ? `
    <div class="info-card">
      <div class="info-card-title">🩺 Informations médicales</div>
      <div class="info-row">
        <span class="info-lbl">Allergies</span>
        <span class="info-val">
          ${data.dossier.allergies
            ? (Array.isArray(data.dossier.allergies)
                ? (data.dossier.allergies as any[]).map((a: any) => `<span class="tag">${a.nom || a}</span>`).join('')
                : `<span class="tag">${data.dossier.allergies}</span>`)
            : '<span style="color:var(--texte-soft)">Aucune</span>'}
        </span>
      </div>
      <div class="info-row">
        <span class="info-lbl">Maladies chroniques</span>
        <span class="info-val">
          ${data.dossier.maladies_chroniques
            ? (Array.isArray(data.dossier.maladies_chroniques)
                ? (data.dossier.maladies_chroniques as any[]).map((m: any) => `<span class="tag maladie">${m.nom || m}</span>`).join('')
                : `<span class="tag maladie">${data.dossier.maladies_chroniques}</span>`)
            : '<span style="color:var(--texte-soft)">Aucune</span>'}
        </span>
      </div>
    </div>` : ''}

  </div>
</body>
</html>`
}
