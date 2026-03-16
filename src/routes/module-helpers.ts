/**
 * Helpers partagés pour les modules grossesse, infirmerie, radiologie
 * Ces modules utilisaient pageSkeleton/statsGrid/actionCard sans les importer
 * 
 * ✅ CORRECTION : Ces fonctions sont maintenant définies ici et importables
 * Usage : import { pageSkeleton, statsGrid, actionCard } from './module-helpers'
 */

import type { AuthProfile } from '../lib/supabase'

/**
 * Génère le squelette HTML complet d'une page avec header + contenu
 */
export function pageSkeleton(
  profil: AuthProfile,
  titre: string,
  couleur: string,
  contenu: string
): string {
  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date  = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — ${titre}</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fraunces:wght@300;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --couleur:  ${couleur};
      --bg:       #F7F8FA;
      --blanc:    #ffffff;
      --bordure:  #E5E7EB;
      --texte:    #0f1923;
      --soft:     #6B7280;
      --shadow:   0 2px 8px rgba(0,0,0,0.06);
      --radius:   12px;
    }
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Plus Jakarta Sans',sans-serif; background:var(--bg); min-height:100vh; color:var(--texte); }

    header {
      background:var(--couleur); padding:0 24px; height:60px;
      display:flex; align-items:center; justify-content:space-between;
      box-shadow:0 2px 8px rgba(0,0,0,0.15); position:sticky; top:0; z-index:100;
    }
    .header-left { display:flex; align-items:center; gap:12px; }
    .logo-small { width:34px; height:34px; background:white; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:18px; }
    .header-title { font-family:'Fraunces',serif; font-size:18px; color:white; }
    .header-title span { font-family:'Plus Jakarta Sans',sans-serif; font-size:12px; opacity:.7; display:block; margin-top:-2px; }
    .header-right { display:flex; align-items:center; gap:12px; }
    .user-badge { background:rgba(255,255,255,0.15); border-radius:8px; padding:6px 12px; }
    .user-badge strong { display:block; font-size:14px; color:white; }
    .user-badge small { opacity:.75; font-size:11px; color:white; }
    .btn-logout { background:rgba(255,255,255,0.2); color:white; border:none; padding:8px 14px; border-radius:8px; font-size:13px; cursor:pointer; text-decoration:none; font-family:'Plus Jakarta Sans',sans-serif; transition:background .2s; }
    .btn-logout:hover { background:rgba(255,255,255,0.3); }

    .container { max-width:1200px; margin:0 auto; padding:24px 20px; }

    /* STATS GRID */
    .stats-module { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px; margin-bottom:28px; }
    .stat-module-card { background:var(--blanc); border-radius:var(--radius); padding:20px; box-shadow:var(--shadow); border-top:4px solid var(--couleur); text-align:center; }
    .stat-module-icon { font-size:28px; margin-bottom:8px; }
    .stat-module-val  { font-family:'Fraunces',serif; font-size:32px; font-weight:600; color:var(--couleur); line-height:1; margin-bottom:4px; }
    .stat-module-lbl  { font-size:12px; color:var(--soft); }

    /* ACTION CARDS */
    .actions-module { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:14px; margin-bottom:28px; }
    .action-module-card { background:var(--blanc); border-radius:var(--radius); padding:18px 14px; text-align:center; text-decoration:none; color:var(--texte); box-shadow:var(--shadow); border-bottom:3px solid var(--couleur); transition:transform .2s, box-shadow .2s; display:flex; flex-direction:column; align-items:center; gap:8px; }
    .action-module-card:hover { transform:translateY(-3px); box-shadow:0 8px 20px rgba(0,0,0,0.1); }
    .action-module-icon { font-size:28px; }
    .action-module-label { font-size:13px; font-weight:600; }

    /* SECTION BOXES */
    .section-box { background:var(--blanc); border-radius:var(--radius); box-shadow:var(--shadow); overflow:hidden; margin-bottom:20px; }
    .section-header { padding:14px 20px; background:var(--couleur); display:flex; justify-content:space-between; align-items:center; }
    .section-header h2 { font-size:14px; font-weight:600; color:white; }

    /* TABLE */
    table { width:100%; border-collapse:collapse; }
    thead th { padding:11px 16px; text-align:left; font-size:11px; color:var(--soft); font-weight:700; text-transform:uppercase; letter-spacing:.5px; background:#F9FAFB; border-bottom:2px solid var(--bordure); }
    tbody tr { border-bottom:1px solid var(--bordure); transition:background .15s; }
    tbody tr:hover { background:#F9FAFB; }
    tbody td { padding:12px 16px; font-size:14px; }
    tbody tr:last-child { border-bottom:none; }

    /* BADGE */
    .badge { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
    .badge-ok      { background:#e8f5e9; color:#1a6b3c; }
    .badge-warn    { background:#fff3e0; color:#e65100; }
    .badge-danger  { background:#fce8e8; color:#b71c1c; }
    .badge-neutral { background:#f3f4f6; color:#9e9e9e; }
    .badge-blue    { background:#e3f2fd; color:#1565c0; }

    .empty { text-align:center; padding:40px; color:var(--soft); font-style:italic; font-size:13px; }

    @media(max-width:640px) {
      header { padding:0 16px; }
      .container { padding:16px 12px; }
      .stats-module { grid-template-columns:repeat(2,1fr); }
      .actions-module { grid-template-columns:repeat(2,1fr); }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      <div class="logo-small">🏥</div>
      <div class="header-title">
        SantéBF <span>${titre}</span>
      </div>
    </div>
    <div class="header-right">
      <div class="user-badge">
        <strong>${profil.prenom} ${profil.nom}</strong>
        <small>${profil.role.replace(/_/g,' ')} — ${heure}</small>
      </div>
      <a href="/auth/logout" class="btn-logout">Déconnexion</a>
    </div>
  </header>

  <div class="container">
    ${contenu}
  </div>
</body>
</html>`
}

/**
 * Grille de statistiques
 */
export function statsGrid(stats: Array<{
  label: string
  value: string | number
  icon: string
  color?: string
}>): string {
  const colorMap: Record<string, string> = {
    blue:   '#1565C0',
    green:  '#1A6B3C',
    orange: '#E65100',
    red:    '#B71C1C',
    purple: '#4A148C',
    gray:   '#6B7280',
  }

  return `
    <div class="stats-module">
      ${stats.map(s => {
        const color = s.color ? (colorMap[s.color] || s.color) : 'var(--couleur)'
        return `
          <div class="stat-module-card" style="border-top-color:${color}">
            <div class="stat-module-icon">${s.icon}</div>
            <div class="stat-module-val" style="color:${color}">${s.value}</div>
            <div class="stat-module-lbl">${s.label}</div>
          </div>`
      }).join('')}
    </div>`
}

/**
 * Carte d'action rapide
 */
export function actionCard(
  label: string,
  icon: string,
  href: string,
  color?: string
): string {
  const colorMap: Record<string, string> = {
    blue:   '#1565C0',
    green:  '#1A6B3C',
    orange: '#E65100',
    red:    '#B71C1C',
    purple: '#4A148C',
    gray:   '#6B7280',
  }
  const c = color ? (colorMap[color] || color) : 'var(--couleur)'

  return `
    <a href="${href}" class="action-module-card" style="border-bottom-color:${c}">
      <span class="action-module-icon">${icon}</span>
      <span class="action-module-label">${label}</span>
    </a>`
}

/**
 * Message d'alerte HTML simple
 * (utilisé quand alertHTML de components/alert n'est pas disponible)
 */
export function alertHTML(type: 'error' | 'success' | 'warning', message: string): string {
  const styles: Record<string, string> = {
    error:   'background:#fff5f5;border-left:4px solid #c62828;color:#c62828',
    success: 'background:#e8f5e9;border-left:4px solid #1a6b3c;color:#1a6b3c',
    warning: 'background:#fff8e1;border-left:4px solid #f9a825;color:#e65100',
  }
  const icons: Record<string, string> = { error: '❌', success: '✅', warning: '⚠️' }

  return `
    <div style="${styles[type] || styles.error};padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:14px">
      ${icons[type] || '⚠️'} ${message}
    </div>`
}
