import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { Env } from '../../functions/_middleware'
import type { AuthProfile } from '../lib/supabase'

export const dashboardRoutes = new Hono<{ Bindings: Env }>()

// Toutes les routes dashboard nécessitent d'être connecté
dashboardRoutes.use('/*', requireAuth)

// ── Dashboard Super Admin ──────────────────────────────────
dashboardRoutes.get('/admin',
  requireRole('super_admin'),
  (c) => {
    const profil = c.get('profil' as never) as AuthProfile
    return c.html(dashboardHTML(profil, 'Super Admin', '#1A6B3C', [
      { icon: '🏥', label: 'Structures sanitaires', href: '/admin/structures' },
      { icon: '👨‍⚕️', label: 'Gérer les comptes', href: '/admin/comptes' },
      { icon: '📊', label: 'Statistiques nationales', href: '/admin/stats' },
      { icon: '🗺️', label: 'Carte épidémique', href: '/admin/carte' },
    ]))
  }
)

// ── Dashboard Admin Structure ──────────────────────────────
dashboardRoutes.get('/structure',
  requireRole('admin_structure'),
  (c) => {
    const profil = c.get('profil' as never) as AuthProfile
    return c.html(dashboardHTML(profil, 'Admin Structure', '#1565C0', [
      { icon: '👥', label: 'Mon personnel', href: '/structure/personnel' },
      { icon: '🛏️', label: 'Gestion des lits', href: '/structure/lits' },
      { icon: '📈', label: 'Statistiques', href: '/structure/stats' },
      { icon: '💰', label: 'Facturation', href: '/structure/facturation' },
    ]))
  }
)

// ── Dashboard Médecin / Infirmier / Sage-femme ─────────────
dashboardRoutes.get('/medecin',
  requireRole('medecin', 'infirmier', 'sage_femme', 'laborantin', 'radiologue'),
  (c) => {
    const profil = c.get('profil' as never) as AuthProfile
    return c.html(dashboardHTML(profil, 'Espace Médical', '#4A148C', [
      { icon: '🔍', label: 'Mes patients', href: '/medecin/patients' },
      { icon: '📋', label: 'Consultations', href: '/medecin/consultations' },
      { icon: '💊', label: 'Ordonnances', href: '/medecin/ordonnances' },
      { icon: '📅', label: 'Rendez-vous', href: '/medecin/rdv' },
      { icon: '🧪', label: 'Examens', href: '/medecin/examens' },
    ]))
  }
)

// ── Dashboard Pharmacien ───────────────────────────────────
dashboardRoutes.get('/pharmacien',
  requireRole('pharmacien'),
  (c) => {
    const profil = c.get('profil' as never) as AuthProfile
    return c.html(dashboardHTML(profil, 'Pharmacie', '#E65100', [
      { icon: '📱', label: 'Scanner ordonnance', href: '/pharmacien/scanner' },
      { icon: '💊', label: 'Ordonnances actives', href: '/pharmacien/ordonnances' },
      { icon: '📦', label: 'Stock médicaments', href: '/pharmacien/stock' },
    ]))
  }
)

// ── Dashboard Caissier ─────────────────────────────────────
dashboardRoutes.get('/caissier',
  requireRole('caissier'),
  (c) => {
    const profil = c.get('profil' as never) as AuthProfile
    return c.html(dashboardHTML(profil, 'Caisse', '#B71C1C', [
      { icon: '💳', label: 'Nouvelle facture', href: '/caissier/facture' },
      { icon: '📋', label: 'Factures du jour', href: '/caissier/factures' },
      { icon: '📊', label: 'Rapport caisse', href: '/caissier/rapport' },
    ]))
  }
)

// ── Dashboard Agent Accueil ────────────────────────────────
dashboardRoutes.get('/accueil',
  requireRole('agent_accueil'),
  (c) => {
    const profil = c.get('profil' as never) as AuthProfile
    return c.html(dashboardHTML(profil, 'Accueil', '#1565C0', [
      { icon: '➕', label: 'Nouveau patient', href: '/accueil/nouveau-patient' },
      { icon: '🔍', label: 'Rechercher patient', href: '/accueil/recherche' },
      { icon: '📅', label: 'Rendez-vous', href: '/accueil/rdv' },
      { icon: '🪪', label: 'Imprimer carte QR', href: '/accueil/qr' },
    ]))
  }
)

// ── Dashboard Patient ──────────────────────────────────────
dashboardRoutes.get('/patient',
  requireRole('patient'),
  (c) => {
    const profil = c.get('profil' as never) as AuthProfile
    return c.html(dashboardHTML(profil, 'Mon Dossier', '#1A6B3C', [
      { icon: '📁', label: 'Mon dossier médical', href: '/patient/dossier' },
      { icon: '💊', label: 'Mes ordonnances', href: '/patient/ordonnances' },
      { icon: '📅', label: 'Mes rendez-vous', href: '/patient/rdv' },
      { icon: '🔐', label: 'Mes consentements', href: '/patient/consentements' },
    ]))
  }
)

// ── Template dashboard temporaire ─────────────────────────
function dashboardHTML(
  profil: AuthProfile,
  titre: string,
  couleur: string,
  actions: { icon: string; label: string; href: string }[]
) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SantéBF — ${titre}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: #F5F5F5; min-height: 100vh; }
    header {
      background: ${couleur}; color: white; padding: 16px 32px;
      display: flex; justify-content: space-between; align-items: center;
    }
    header h1 { font-size: 20px; }
    header span { font-size: 14px; opacity: 0.8; }
    .logout { color: white; text-decoration: none; background: rgba(255,255,255,0.2);
      padding: 8px 16px; border-radius: 6px; font-size: 14px; }
    .container { max-width: 900px; margin: 40px auto; padding: 0 20px; }
    h2 { color: #212121; margin-bottom: 8px; }
    p { color: #666; margin-bottom: 32px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .card {
      background: white; border-radius: 12px; padding: 28px 20px;
      text-align: center; text-decoration: none; color: #212121;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      transition: transform 0.2s, box-shadow 0.2s;
      border-top: 4px solid ${couleur};
    }
    .card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
    .card .icon { font-size: 36px; margin-bottom: 12px; }
    .card .label { font-size: 14px; font-weight: 600; }
    .badge {
      display: inline-block; background: ${couleur}22; color: ${couleur};
      padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
      margin-bottom: 24px;
    }
  </style>
</head>
<body>
  <header>
    <h1>🏥 SantéBF — ${titre}</h1>
    <div style="display:flex;align-items:center;gap:16px">
      <span>${profil.prenom} ${profil.nom}</span>
      <a href="/auth/logout" class="logout">Déconnexion</a>
    </div>
  </header>
  <div class="container">
    <h2>Bonjour, ${profil.prenom} ${profil.nom} 👋</h2>
    <p>Bienvenue dans votre espace <span class="badge">${profil.role.replace('_', ' ')}</span></p>
    <div class="grid">
      ${actions.map(a => `
        <a href="${a.href}" class="card">
          <div class="icon">${a.icon}</div>
          <div class="label">${a.label}</div>
        </a>
      `).join('')}
    </div>
  </div>
</body>
</html>`
}
