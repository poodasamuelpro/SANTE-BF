// Composant Layout HTML réutilisable
// Header + Navigation + Footer avec profil utilisateur

import type { AuthProfile } from '../lib/supabase'

export function layoutHTML(profil: AuthProfile, titre: string, contenu: string): string {
  const couleurParRole: Record<string, string> = {
    super_admin:     '#1A6B3C',
    admin_structure: '#1565C0',
    medecin:         '#4A148C',
    infirmier:       '#4A148C',
    sage_femme:      '#4A148C',
    pharmacien:      '#E65100',
    laborantin:      '#6A1B9A',
    radiologue:      '#6A1B9A',
    caissier:        '#B71C1C',
    agent_accueil:   '#1565C0',
    patient:         '#1A6B3C',
  }
  
  const couleur = couleurParRole[profil.role] ?? '#424242'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titre} — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root {
      --couleur: ${couleur};
      --gris: #F7F8FA;
      --bordure: #E5E7EB;
      --texte: #1A1A2E;
      --soft: #6B7280;
    }
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',sans-serif; background:var(--gris); min-height:100vh; }
    
    /* Header */
    header {
      background: var(--couleur);
      padding: 0 24px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-left { display:flex; align-items:center; gap:12px; }
    .logo {
      width:36px; height:36px;
      background:white;
      border-radius:8px;
      display:flex; align-items:center; justify-content:center;
      font-size:18px;
    }
    .header-title {
      font-family:'DM Serif Display',serif;
      font-size:18px;
      color:white;
    }
    .header-title span {
      font-family:'DM Sans',sans-serif;
      font-size:11px;
      opacity:.7;
      display:block;
    }
    .header-right { display:flex; align-items:center; gap:12px; }
    .user-badge {
      background:rgba(255,255,255,0.15);
      border-radius:8px;
      padding:6px 12px;
    }
    .user-badge strong {
      display:block;
      font-size:13px;
      color:white;
    }
    .user-badge small {
      font-size:11px;
      color:rgba(255,255,255,0.7);
    }
    .btn-logout {
      background:rgba(255,255,255,0.2);
      color:white;
      border:none;
      padding:8px 14px;
      border-radius:8px;
      font-size:13px;
      cursor:pointer;
      text-decoration:none;
      font-family:'DM Sans',sans-serif;
      transition:background .2s;
    }
    .btn-logout:hover { background:rgba(255,255,255,0.3); }
    
    /* Container */
    .container { max-width:1200px; margin:0 auto; padding:24px 20px; min-height:calc(100vh - 60px - 60px); }
    
    /* Footer */
    footer {
      background:white;
      border-top:1px solid var(--bordure);
      padding:20px;
      text-align:center;
      font-size:12px;
      color:var(--soft);
    }
    footer a { color:var(--couleur); text-decoration:none; }
    footer a:hover { text-decoration:underline; }
    
    /* Responsive */
    @media (max-width:640px) {
      header { padding:0 16px; }
      .header-title span { display:none; }
      .user-badge strong { display:none; }
      .container { padding:16px 12px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      <div class="logo">🏥</div>
      <div class="header-title">
        SantéBF
        <span>${titre}</span>
      </div>
    </div>
    <div class="header-right">
      <div class="user-badge">
        <strong>${profil.prenom} ${profil.nom}</strong>
        <small>${profil.role.replace(/_/g, ' ')}</small>
      </div>
      <a href="/auth/logout" class="btn-logout">Déconnexion</a>
    </div>
  </header>
  
  <div class="container">
    ${contenu}
  </div>
  
  <footer>
    <p>
      SantéBF — Système National de Santé Numérique
      &copy; 2025 Ministère de la Santé — Burkina Faso 🇧🇫<br>
      <a href="/aide">Aide</a> • <a href="/contact">Contact</a> • <a href="/politique-confidentialite">Politique de confidentialité</a>
    </p>
  </footer>
  
  <script src="/js/main.js"></script>
</body>
</html>`
}
