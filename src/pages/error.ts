export function errorPage(code: number, message: string, detail?: string): string {
  const configs: Record<number, { icon: string; couleur: string; titre: string }> = {
    403: { icon: '⛔', couleur: '#B71C1C', titre: 'Accès refusé' },
    404: { icon: '🔍', couleur: '#1565C0', titre: 'Page introuvable' },
    500: { icon: '⚠️', couleur: '#E65100', titre: 'Erreur serveur' },
  }
  const cfg = configs[code] ?? { icon: '❓', couleur: '#424242', titre: 'Erreur' }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — ${cfg.titre}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family:'DM Sans',sans-serif;
      background:#F7F8FA;
      min-height:100vh;
      display:flex; align-items:center; justify-content:center;
      padding:24px;
    }
    .card {
      background:white; border-radius:20px; padding:56px 48px;
      max-width:480px; width:100%; text-align:center;
      box-shadow:0 8px 40px rgba(0,0,0,0.08);
    }
    .code { font-size:80px; font-weight:700; color:${cfg.couleur}; opacity:.15; line-height:1; }
    .icon { font-size:56px; margin:-20px 0 16px; display:block; }
    h1 { font-family:'DM Serif Display',serif; font-size:28px; color:#1A1A2E; margin-bottom:12px; }
    p  { font-size:15px; color:#6B7280; line-height:1.6; margin-bottom:8px; }
    .detail { font-size:12px; color:#BDBDBD; font-family:monospace; margin-bottom:32px; }
    .btns { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
    .btn {
      padding:12px 24px; border-radius:10px;
      font-size:14px; font-weight:600;
      text-decoration:none; font-family:'DM Sans',sans-serif;
    }
    .btn-primary { background:${cfg.couleur}; color:white; }
    .btn-secondary { background:#F3F4F6; color:#374151; }
    .logo { display:flex; align-items:center; gap:8px; justify-content:center; margin-bottom:32px; }
    .logo-icon { width:32px; height:32px; background:#1A6B3C; border-radius:8px;
      display:flex; align-items:center; justify-content:center; font-size:16px; }
    .logo span { font-family:'DM Serif Display',serif; font-size:16px; color:#1A6B3C; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">🏥</div>
      <span>SantéBF</span>
    </div>
    <div class="code">${code}</div>
    <span class="icon">${cfg.icon}</span>
    <h1>${cfg.titre}</h1>
    <p>${message}</p>
    ${detail ? `<p class="detail">${detail}</p>` : ''}
    <div class="btns">
      <a href="javascript:history.back()" class="btn btn-secondary">← Retour</a>
      <a href="/auth/login" class="btn btn-primary">Accueil</a>
    </div>
  </div>
</body>
</html>`
}
