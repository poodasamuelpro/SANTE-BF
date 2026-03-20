/**
 * src/routes/admin.ts
 * SantéBF — Routes Super Administrateur National
 *
 * Accessible uniquement au rôle super_admin
 * Monté sur /admin dans functions/[[path]].ts
 *
 * Routes disponibles :
 *   GET  /admin/structures          → Liste toutes les structures
 *   GET  /admin/structures/nouvelle → Formulaire nouvelle structure
 *   POST /admin/structures/nouvelle → Créer une structure
 *   GET  /admin/structures/:id      → Détail structure
 *   POST /admin/structures/:id/plan → Modifier le plan d'abonnement
 *   GET  /admin/comptes             → Liste tous les comptes
 *   GET  /admin/plans               → Gestion des plans (activer/suspendre)
 */

import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'
import { pageSkeleton, statsGrid, actionCard, dataTable } from './dashboard'

export const adminRoutes = new Hono<{ Bindings: Bindings }>()

adminRoutes.use('/*', requireAuth)
adminRoutes.use('/*', requireRole('super_admin'))

// ── Helpers ────────────────────────────────────────────────────
function badge(text: string, color: string): string {
  const colors: Record<string, string> = {
    vert:   'background:#E8F5E9;color:#1A6B3C',
    rouge:  'background:#FFF5F5;color:#B71C1C',
    bleu:   'background:#E3F2FD;color:#1565C0',
    orange: 'background:#FFF3E0;color:#E65100',
    gris:   'background:#F3F4F6;color:#9E9E9E',
  }
  return `<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;${colors[color]||colors.gris}">${text}</span>`
}

// ── GET /admin/structures ─────────────────────────────────────
adminRoutes.get('/structures', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: structures } = await supabase
    .from('struct_structures')
    .select('id, nom, type, niveau, plan_actif, est_actif, created_at')
    .order('nom', { ascending: true })
    .limit(100)

  const contenu = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <h2 style="font-family:'DM Serif Display',serif;font-size:22px;">🏥 Structures sanitaires</h2>
      <a href="/admin/structures/nouvelle" style="background:#4A148C;color:white;padding:10px 18px;border-radius:9px;font-size:13px;font-weight:700;text-decoration:none;">➕ Nouvelle structure</a>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nom</th><th>Type</th><th>Niveau</th><th>Plan</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          ${(structures ?? []).map((s: any) => {
            const planColor = s.plan_actif === 'pro' ? 'vert' : s.plan_actif === 'standard' ? 'bleu' : s.plan_actif === 'starter' ? 'orange' : 'gris'
            return `<tr>
              <td><strong>${s.nom}</strong></td>
              <td>${s.type || '—'}</td>
              <td>Niveau ${s.niveau || 1}</td>
              <td>${badge(s.plan_actif || 'gratuit', planColor)}</td>
              <td>${s.est_actif ? badge('Actif', 'vert') : badge('Inactif', 'rouge')}</td>
              <td><a href="/admin/structures/${s.id}" style="color:#4A148C;font-size:13px;font-weight:700;">Gérer →</a></td>
            </tr>`
          }).join('')}
          ${(structures ?? []).length === 0 ? '<tr><td colspan="6" class="empty">Aucune structure</td></tr>' : ''}
        </tbody>
      </table>
    </div>`

  return c.html(pageSkeleton(profil, 'Structures', '#4A148C', contenu))
})

// ── GET /admin/structures/nouvelle ───────────────────────────
adminRoutes.get('/structures/nouvelle', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile

  const contenu = `
    <div style="margin-bottom:14px;">
      <a href="/admin/structures" style="background:white;border:1px solid #e2e8e4;color:#374151;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">← Retour</a>
    </div>
    <div style="background:white;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
      <h2 style="font-family:'DM Serif Display',serif;font-size:20px;margin-bottom:20px;">Nouvelle structure</h2>
      <form method="POST" action="/admin/structures/nouvelle">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div style="grid-column:1/-1;">
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Nom de la structure *</label>
            <input type="text" name="nom" placeholder="Ex: CHR de Ouagadougou" style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:9px;font-size:14px;font-family:inherit;outline:none;" required>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Type *</label>
            <select name="type" style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:9px;font-size:14px;font-family:inherit;outline:none;" required>
              <option value="">-- Sélectionner --</option>
              <option value="chu">CHU</option>
              <option value="chr">CHR</option>
              <option value="district">Centre de Santé District</option>
              <option value="csps">CSPS</option>
              <option value="clinique">Clinique privée</option>
              <option value="cabinet">Cabinet médical</option>
              <option value="pharmacie">Pharmacie</option>
              <option value="laboratoire">Laboratoire</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Niveau</label>
            <select name="niveau" style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:9px;font-size:14px;font-family:inherit;outline:none;">
              <option value="1">Niveau 1 — Local</option>
              <option value="2">Niveau 2 — District</option>
              <option value="3">Niveau 3 — Régional</option>
              <option value="4">Niveau 4 — National</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Plan d'abonnement</label>
            <select name="plan_actif" style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:9px;font-size:14px;font-family:inherit;outline:none;">
              <option value="gratuit">Gratuit (6 mois)</option>
              <option value="pilote">Pilote (accès complet gratuit)</option>
              <option value="starter">Starter — 15 000 FCFA/mois</option>
              <option value="standard">Standard — 40 000 FCFA/mois</option>
              <option value="pro">Pro — 80 000 FCFA/mois</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Email admin structure *</label>
            <input type="email" name="email_admin" placeholder="admin@structure.bf" style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:9px;font-size:14px;font-family:inherit;outline:none;" required>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Téléphone</label>
            <input type="tel" name="telephone" placeholder="70 12 34 56" style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:9px;font-size:14px;font-family:inherit;outline:none;">
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-top:20px;justify-content:flex-end;">
          <a href="/admin/structures" style="background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:9px;text-decoration:none;font-size:14px;font-weight:600;">Annuler</a>
          <button type="submit" style="background:#4A148C;color:white;border:none;padding:10px 20px;border-radius:9px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Créer la structure</button>
        </div>
      </form>
    </div>`

  return c.html(pageSkeleton(profil, 'Nouvelle structure', '#4A148C', contenu))
})

// ── POST /admin/structures/nouvelle ──────────────────────────
adminRoutes.post('/structures/nouvelle', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()

  const nom        = String(body.nom        || '').trim()
  const type       = String(body.type       || '').trim()
  const niveau     = parseInt(String(body.niveau || '1'))
  const plan_actif = String(body.plan_actif || 'gratuit')

  if (!nom || !type) {
    return c.redirect('/admin/structures/nouvelle?err=champs_obligatoires', 303)
  }

  const { data: struct, error } = await supabase
    .from('struct_structures')
    .insert({
      nom,
      type,
      niveau,
      plan_actif,
      est_actif: true,
      abonnement_expire_at: plan_actif === 'gratuit'
        ? new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single()

  if (error || !struct) {
    return c.redirect('/admin/structures/nouvelle?err=' + encodeURIComponent(error?.message || 'Erreur'), 303)
  }

  return c.redirect(`/admin/structures/${struct.id}`, 303)
})

// ── GET /admin/structures/:id ────────────────────────────────
adminRoutes.get('/structures/:id', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')

  const [structRes, personnelRes] = await Promise.all([
    supabase.from('struct_structures')
      .select('id, nom, type, niveau, plan_actif, abonnement_expire_at, est_actif, est_pilote, telephone, created_at')
      .eq('id', id).single(),
    supabase.from('auth_profiles')
      .select('id, nom, prenom, role, est_actif', { count: 'exact', head: false })
      .eq('structure_id', id).limit(20),
  ])

  const struct    = structRes.data
  const personnel = personnelRes.data ?? []

  if (!struct) {
    return c.redirect('/admin/structures', 303)
  }

  const planColor = struct.plan_actif === 'pro' ? 'vert' : struct.plan_actif === 'standard' ? 'bleu' : 'gris'
  const expire    = struct.abonnement_expire_at
    ? new Date(struct.abonnement_expire_at).toLocaleDateString('fr-FR')
    : '—'

  const contenu = `
    <div style="margin-bottom:14px;">
      <a href="/admin/structures" style="background:white;border:1px solid #e2e8e4;color:#374151;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">← Structures</a>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div style="background:white;border-radius:12px;padding:22px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;">🏥 ${struct.nom}</h3>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;">
          <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">Type</span><span>${struct.type || '—'}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">Niveau</span><span>${struct.niveau}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">Statut</span>${struct.est_actif ? badge('Actif', 'vert') : badge('Inactif', 'rouge')}</div>
          <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">Créée le</span><span>${new Date(struct.created_at).toLocaleDateString('fr-FR')}</span></div>
        </div>
      </div>
      <div style="background:white;border-radius:12px;padding:22px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;">💳 Plan d'abonnement</h3>
        <div style="text-align:center;padding:12px;background:#F3E5F5;border-radius:9px;margin-bottom:14px;">
          <div style="font-size:22px;font-weight:700;color:#4A148C;">${(struct.plan_actif||'gratuit').toUpperCase()}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">Expire le ${expire}</div>
        </div>
        <form method="POST" action="/admin/structures/${id}/plan" style="display:flex;flex-direction:column;gap:10px;">
          <select name="plan" style="width:100%;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:9px;font-size:13px;font-family:inherit;outline:none;">
            <option value="gratuit" ${struct.plan_actif==='gratuit'?'selected':''}>Gratuit</option>
            <option value="pilote" ${struct.plan_actif==='pilote'?'selected':''}>Pilote (accès complet)</option>
            <option value="starter" ${struct.plan_actif==='starter'?'selected':''}>Starter — 15 000 FCFA/mois</option>
            <option value="standard" ${struct.plan_actif==='standard'?'selected':''}>Standard — 40 000 FCFA/mois</option>
            <option value="pro" ${struct.plan_actif==='pro'?'selected':''}>Pro — 80 000 FCFA/mois</option>
            <option value="suspendu" ${struct.plan_actif==='suspendu'?'selected':''}>Suspendu</option>
          </select>
          <select name="duree" style="width:100%;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:9px;font-size:13px;font-family:inherit;outline:none;">
            <option value="1m">1 mois</option>
            <option value="6m">6 mois</option>
            <option value="1a" selected>1 an</option>
            <option value="2a">2 ans</option>
          </select>
          <button type="submit" style="background:#4A148C;color:white;border:none;padding:9px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">✅ Activer le plan</button>
        </form>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Personnel</th><th>Rôle</th><th>Statut</th></tr></thead>
        <tbody>
          ${personnel.map((p: any) => `<tr>
            <td>${p.prenom} ${p.nom}</td>
            <td>${p.role.replace(/_/g,' ')}</td>
            <td>${p.est_actif ? badge('Actif','vert') : badge('Inactif','rouge')}</td>
          </tr>`).join('')}
          ${personnel.length===0?'<tr><td colspan="3" class="empty">Aucun personnel</td></tr>':''}
        </tbody>
      </table>
    </div>`

  return c.html(pageSkeleton(profil, struct.nom, '#4A148C', contenu))
})

// ── POST /admin/structures/:id/plan ──────────────────────────
adminRoutes.post('/structures/:id/plan', async (c) => {
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')
  const body     = await c.req.parseBody()

  const plan   = String(body.plan   || 'gratuit')
  const duree  = String(body.duree  || '1a')

  const mois: Record<string, number> = { '1m': 1, '6m': 6, '1a': 12, '2a': 24 }
  const nbMois = mois[duree] || 12
  const expire = new Date(Date.now() + nbMois * 30 * 24 * 60 * 60 * 1000).toISOString()

  await supabase.from('struct_structures').update({
    plan_actif:            plan,
    abonnement_expire_at:  expire,
    est_pilote:            plan === 'pilote',
  }).eq('id', id)

  // Enregistrer dans l'historique
  await supabase.from('struct_abonnements').insert({
    structure_id:   id,
    plan,
    statut:         plan === 'suspendu' ? 'suspendu' : 'actif',
    date_debut:     new Date().toISOString(),
    date_expiration: expire,
    mode_paiement:  'gratuit',
    notes:          'Activé manuellement par super_admin',
  })

  return c.redirect(`/admin/structures/${id}`, 303)
})

// ── GET /admin/comptes ────────────────────────────────────────
adminRoutes.get('/comptes', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: comptes } = await supabase
    .from('auth_profiles')
    .select('id, nom, prenom, email, role, est_actif, created_at, struct_structures(nom)')
    .order('created_at', { ascending: false })
    .limit(50)

  const contenu = `
    <div style="margin-bottom:16px;">
      <h2 style="font-family:'DM Serif Display',serif;font-size:22px;">👥 Comptes utilisateurs</h2>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Structure</th><th>Statut</th></tr></thead>
        <tbody>
          ${(comptes ?? []).map((u: any) => {
            const struct = u.struct_structures as any
            return `<tr>
              <td><strong>${u.prenom} ${u.nom}</strong></td>
              <td style="font-size:12px;font-family:monospace;">${u.email||'—'}</td>
              <td>${badge(u.role.replace(/_/g,' '), 'bleu')}</td>
              <td style="font-size:12px;">${struct?.nom||'—'}</td>
              <td>${u.est_actif ? badge('Actif','vert') : badge('Inactif','rouge')}</td>
            </tr>`
          }).join('')}
          ${(comptes ?? []).length===0?'<tr><td colspan="5" class="empty">Aucun compte</td></tr>':''}
        </tbody>
      </table>
    </div>`

  return c.html(pageSkeleton(profil, 'Comptes', '#4A148C', contenu))
})

// ── GET /admin/plans ─────────────────────────────────────────
adminRoutes.get('/plans', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: structs } = await supabase
    .from('struct_structures')
    .select('id, nom, plan_actif, abonnement_expire_at, est_actif')
    .order('plan_actif', { ascending: true })
    .limit(100)

  const grouped: Record<string, any[]> = {}
  for (const s of structs || []) {
    const plan = s.plan_actif || 'gratuit'
    if (!grouped[plan]) grouped[plan] = []
    grouped[plan].push(s)
  }

  const planColors: Record<string, string> = {
    gratuit: 'gris', pilote: 'vert', starter: 'orange',
    standard: 'bleu', pro: 'vert', suspendu: 'rouge',
  }

  const contenu = `
    <div style="margin-bottom:16px;">
      <h2 style="font-family:'DM Serif Display',serif;font-size:22px;">💳 Plans & Abonnements</h2>
      <p style="font-size:13px;color:#6b7280;margin-top:4px;">Gérez les plans d'abonnement de chaque structure. Cliquez sur une structure pour modifier son plan.</p>
    </div>
    ${Object.entries(grouped).map(([plan, list]) => `
      <div style="margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <h3 style="font-size:15px;font-weight:700;">${plan.toUpperCase()}</h3>
          ${badge(`${list.length} structure(s)`, planColors[plan]||'gris')}
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Structure</th><th>Expiration</th><th>Actions</th></tr></thead>
            <tbody>
              ${list.map((s: any) => `<tr>
                <td>${s.nom}</td>
                <td style="font-size:12px;">${s.abonnement_expire_at ? new Date(s.abonnement_expire_at).toLocaleDateString('fr-FR') : '—'}</td>
                <td><a href="/admin/structures/${s.id}" style="color:#4A148C;font-size:13px;font-weight:700;">Modifier →</a></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('')}`

  return c.html(pageSkeleton(profil, 'Plans', '#4A148C', contenu))
})

// ── GET /admin/stats ─────────────────────────────────────────
adminRoutes.get('/stats', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const [structRes, comptesRes, patRes, consultRes] = await Promise.all([
    supabase.from('struct_structures').select('*', { count: 'exact', head: true }),
    supabase.from('auth_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('patient_dossiers').select('*', { count: 'exact', head: true }),
    supabase.from('medical_consultations').select('*', { count: 'exact', head: true }),
  ])

  const contenu = `
    <h2 style="font-family:'DM Serif Display',serif;font-size:22px;margin-bottom:20px;">📊 Statistiques nationales</h2>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">🏥</div><div class="stat-val">${structRes.count??0}</div><div class="stat-lbl">Structures</div></div>
      <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-val">${comptesRes.count??0}</div><div class="stat-lbl">Comptes</div></div>
      <div class="stat-card"><div class="stat-icon">📂</div><div class="stat-val">${patRes.count??0}</div><div class="stat-lbl">Dossiers patients</div></div>
      <div class="stat-card"><div class="stat-icon">🩺</div><div class="stat-val">${consultRes.count??0}</div><div class="stat-lbl">Consultations</div></div>
    </div>`

  return c.html(pageSkeleton(profil, 'Statistiques', '#4A148C', contenu))
})

// ── GET /admin/logs ──────────────────────────────────────────
adminRoutes.get('/logs', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile

  const contenu = `
    <div style="background:white;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,.06);text-align:center;">
      <div style="font-size:40px;margin-bottom:14px;">📋</div>
      <h2 style="font-family:'DM Serif Display',serif;font-size:20px;margin-bottom:10px;">Logs système</h2>
      <p style="color:#6b7280;font-size:14px;max-width:400px;margin:0 auto;">Disponible dans une prochaine version. Consultez les logs directement dans Cloudflare Pages → Logs.</p>
    </div>`

  return c.html(pageSkeleton(profil, 'Logs', '#4A148C', contenu))
})

// ── GET /admin/cnts ──────────────────────────────────────────
adminRoutes.get('/cnts', async (c) => {
  return c.redirect('/dashboard/cnts', 302)
})
