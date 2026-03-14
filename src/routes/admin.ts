import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import type { AuthProfile } from '../lib/supabase'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
export const adminRoutes = new Hono<{ Bindings: Bindings }>()
adminRoutes.use('/*', requireAuth, requireRole('super_admin'))

// ── GET /admin/structures ──────────────────────────────────
adminRoutes.get('/structures', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const { data: structures } = await sb
    .from('struct_structures')
    .select(`
      id, nom, type, niveau, est_public, est_actif,
      geo_villes ( nom, geo_provinces ( nom ) )
    `)
    .order('nom')

  return c.html(structuresListePage(profil, structures ?? []))
})

// ── GET /admin/structures/nouvelle ────────────────────────
adminRoutes.get('/structures/nouvelle', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const { data: villes } = await sb
    .from('geo_villes')
    .select('id, nom, geo_provinces(nom, geo_regions(nom))')
    .order('nom')
  return c.html(structureFormPage(profil, villes ?? []))
})

// ── POST /admin/structures/nouvelle ───────────────────────
adminRoutes.post('/structures/nouvelle', async (c) => {
  const sb   = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const body = await c.req.parseBody()

  const { error } = await sb.from('struct_structures').insert({
    nom:        String(body.nom ?? ''),
    type:       String(body.type ?? ''),
    niveau:     parseInt(String(body.niveau ?? '1')),
    ville_id:   String(body.ville_id ?? ''),
    adresse:    String(body.adresse ?? ''),
    telephone:  String(body.telephone ?? ''),
    est_public: body.est_public === 'true',
    est_actif:  true,
  })

  if (error) {
    const sb2 = c.get('supabase' as never) as ReturnType<typeof getSupabase>
    const profil = c.get('profil' as never) as AuthProfile
    const { data: villes } = await sb2.from('geo_villes').select('id, nom, geo_provinces(nom, geo_regions(nom))').order('nom')
    return c.html(structureFormPage(profil, villes ?? [], 'Erreur : ' + error.message))
  }

  return c.redirect('/admin/structures?succes=1')
})

// ── GET /admin/structures/:id ──────────────────────────────
adminRoutes.get('/structures/:id', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const id = c.req.param('id')

  const { data: structure } = await sb
    .from('struct_structures')
    .select(`*, geo_villes(nom, geo_provinces(nom))`)
    .eq('id', id)
    .single()

  const { data: services } = await sb
    .from('struct_services')
    .select('*')
    .eq('structure_id', id)

  const { data: personnel } = await sb
    .from('auth_profiles')
    .select('id, nom, prenom, role')
    .eq('structure_id', id)
    .eq('est_actif', true)

  return c.html(structureDetailPage(profil, structure, services ?? [], personnel ?? []))
})

// ── GET /admin/comptes ─────────────────────────────────────
adminRoutes.get('/comptes', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const { data: comptes } = await sb
    .from('auth_profiles')
    .select(`
      id, nom, prenom, role, est_actif, created_at,
      struct_structures ( nom )
    `)
    .order('created_at', { ascending: false })

  return c.html(comptesListePage(profil, comptes ?? []))
})

// ── GET /admin/comptes/nouveau ─────────────────────────────
adminRoutes.get('/comptes/nouveau', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const { data: structures } = await sb
    .from('struct_structures')
    .select('id, nom, type')
    .eq('est_actif', true)
    .order('nom')

  return c.html(compteFormPage(profil, structures ?? []))
})

// ── POST /admin/comptes/nouveau ────────────────────────────
adminRoutes.post('/comptes/nouveau', async (c) => {
  const sb   = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const body = await c.req.parseBody()

  const email       = String(body.email       ?? '').trim().toLowerCase()
  const password    = String(body.password    ?? '').trim()
  const nom         = String(body.nom         ?? '').trim()
  const prenom      = String(body.prenom      ?? '').trim()
  const role        = String(body.role        ?? '')
  const structure_id = body.structure_id ? String(body.structure_id) : null

  if (!email || !password || !nom || !prenom || !role) {
    const { data: structures } = await sb.from('struct_structures').select('id, nom, type').eq('est_actif', true).order('nom')
    const profil = c.get('profil' as never) as AuthProfile
    return c.html(compteFormPage(profil, structures ?? [], 'Tous les champs obligatoires doivent être remplis.'))
  }

  // Créer le compte dans Supabase Auth
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nom, prenom, role },
  })

  if (authError || !authData?.user) {
    const { data: structures } = await sb.from('struct_structures').select('id, nom, type').eq('est_actif', true).order('nom')
    const profil = c.get('profil' as never) as AuthProfile
    return c.html(compteFormPage(profil, structures ?? [], 'Erreur création compte : ' + (authError?.message ?? 'Inconnue')))
  }

  // Mettre à jour auth_profiles avec la structure et activer
  await sb.from('auth_profiles').update({
    structure_id,
    doit_changer_mdp: true,
    est_actif: true,
  }).eq('id', authData.user.id)

  // Si médecin → créer entrée auth_medecins
  if (role === 'medecin' && body.numero_ordre) {
    await sb.from('auth_medecins').insert({
      profile_id: authData.user.id,
      numero_ordre_national: String(body.numero_ordre),
      specialite_principale: String(body.specialite ?? 'Médecine générale'),
    })
  }

  return c.redirect('/admin/comptes?succes=1')
})

// ── POST /admin/comptes/:id/toggle ─────────────────────────
adminRoutes.post('/comptes/:id/toggle', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const id = c.req.param('id')

  const { data: compte } = await sb.from('auth_profiles').select('est_actif').eq('id', id).single()
  await sb.from('auth_profiles').update({ est_actif: !compte?.est_actif }).eq('id', id)

  return c.redirect('/admin/comptes')
})

// ── GET /admin/stats ───────────────────────────────────────
adminRoutes.get('/stats', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const [structs, patients, consults, ordonnances] = await Promise.all([
    sb.from('struct_structures').select('type, est_actif'),
    sb.from('patient_dossiers').select('id', { count: 'exact', head: true }),
    sb.from('medical_consultations').select('id', { count: 'exact', head: true }),
    sb.from('medical_ordonnances').select('id', { count: 'exact', head: true }),
  ])

  const parType: Record<string, number> = {}
  for (const s of structs.data ?? []) {
    parType[s.type] = (parType[s.type] ?? 0) + 1
  }

  return c.html(statsPage(profil, {
    nbPatients:    patients.count    ?? 0,
    nbConsults:    consults.count    ?? 0,
    nbOrdonnances: ordonnances.count ?? 0,
    nbStructures:  (structs.data ?? []).length,
    parType,
  }))
})

// ══════════════════════════════════════════════════════════
// PAGES HTML
// ══════════════════════════════════════════════════════════

function header(profil: AuthProfile): string {
  return `<header>
    <div class="hl">
      <a href="/dashboard/admin" class="logo-wrap">
        <div class="logo">🏥</div>
        <div class="ht">SantéBF <span>SUPER ADMIN</span></div>
      </a>
    </div>
    <div class="hr">
      <div class="ub"><strong>${profil.prenom} ${profil.nom}</strong><small>Super Admin</small></div>
      <a href="/auth/logout" class="logout">Déconnexion</a>
    </div>
  </header>`
}

const CSS = `
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;min-height:100vh}
    header{background:#1A6B3C;padding:0 24px;height:60px;display:flex;align-items:center;
      justify-content:space-between;position:sticky;top:0;z-index:100;
      box-shadow:0 2px 8px rgba(0,0,0,.15)}
    .hl{display:flex;align-items:center;gap:12px}
    .logo-wrap{display:flex;align-items:center;gap:12px;text-decoration:none}
    .logo{width:34px;height:34px;background:white;border-radius:8px;
      display:flex;align-items:center;justify-content:center;font-size:18px}
    .ht{font-family:'DM Serif Display',serif;font-size:18px;color:white}
    .ht span{font-family:'DM Sans',sans-serif;font-size:11px;opacity:.7;display:block}
    .hr{display:flex;align-items:center;gap:10px}
    .ub{background:rgba(255,255,255,.15);border-radius:8px;padding:6px 12px}
    .ub strong{display:block;font-size:13px;color:white}
    .ub small{font-size:11px;color:rgba(255,255,255,.7)}
    .logout{background:rgba(255,255,255,.2);color:white;border:none;padding:8px 14px;
      border-radius:8px;font-size:13px;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
    .container{max-width:1100px;margin:0 auto;padding:28px 20px}
    .page-title{font-family:'DM Serif Display',serif;font-size:26px;color:#1A1A2E;margin-bottom:4px}
    .page-sub{font-size:14px;color:#6B7280;margin-bottom:24px}
    .breadcrumb{font-size:13px;color:#6B7280;margin-bottom:16px}
    .breadcrumb a{color:#1A6B3C;text-decoration:none}
    .alerte-err{background:#FFF5F5;border-left:4px solid #C62828;padding:12px 16px;
      border-radius:8px;margin-bottom:20px;font-size:13px;color:#C62828}
    .alerte-ok{background:#E8F5E9;border-left:4px solid #1A6B3C;padding:12px 16px;
      border-radius:8px;margin-bottom:20px;font-size:13px;color:#1A6B3C}
    .btn-primary{background:#1A6B3C;color:white;padding:10px 20px;border:none;
      border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;
      text-decoration:none;font-family:'DM Sans',sans-serif;display:inline-block}
    .btn-primary:hover{background:#2E8B57}
    .btn-secondary{background:#F3F4F6;color:#374151;padding:10px 20px;border:none;
      border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;
      text-decoration:none;font-family:'DM Sans',sans-serif;display:inline-block}
    .btn-danger{background:#B71C1C;color:white;padding:8px 14px;border:none;
      border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;
      text-decoration:none;font-family:'DM Sans',sans-serif}
    .top-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px}
    .card{background:white;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;margin-bottom:24px}
    .card-header{padding:16px 20px;border-bottom:1px solid #F0F0F0;
      display:flex;justify-content:space-between;align-items:center}
    .card-header h3{font-size:15px;font-weight:600;color:#1A1A2E}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#1A6B3C}
    thead th{padding:12px 16px;text-align:left;font-size:12px;color:white;
      font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    tbody tr{border-bottom:1px solid #F5F5F5;transition:background .15s}
    tbody tr:hover{background:#F9FAFB}
    tbody td{padding:12px 16px;font-size:14px}
    tbody tr:last-child{border-bottom:none}
    .badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .badge.actif{background:#E8F5E9;color:#1A6B3C}
    .badge.inactif{background:#F5F5F5;color:#9E9E9E}
    .badge.medecin{background:#EDE7F6;color:#4A148C}
    .badge.infirmier{background:#E3F2FD;color:#1565C0}
    .badge.pharmacien{background:#FFF3E0;color:#E65100}
    .badge.super_admin{background:#E8F5E9;color:#1A6B3C}
    .badge.admin_structure{background:#E3F2FD;color:#1565C0}
    .badge.agent_accueil{background:#FFF3E0;color:#E65100}
    .badge.caissier{background:#FFF5F5;color:#B71C1C}
    .badge.patient{background:#F3F4F6;color:#424242}
    .type-badge{padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600;background:#F3F4F6;color:#424242}
    .niveau{display:inline-block;width:24px;height:24px;border-radius:50%;
      background:#1A6B3C;color:white;font-size:12px;font-weight:700;
      text-align:center;line-height:24px}
    /* Formulaire */
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .form-group{margin-bottom:0}
    .form-group.full{grid-column:1/-1}
    label{display:block;font-size:13px;font-weight:600;color:#1A1A2E;margin-bottom:7px}
    input,select,textarea{width:100%;padding:11px 14px;
      font-family:'DM Sans',sans-serif;font-size:14px;
      border:1.5px solid #E0E0E0;border-radius:10px;
      background:#F7F8FA;color:#1A1A2E;outline:none;
      transition:border-color .2s,box-shadow .2s}
    input:focus,select:focus,textarea:focus{border-color:#1A6B3C;background:white;
      box-shadow:0 0 0 4px rgba(26,107,60,.08)}
    textarea{resize:vertical;min-height:80px}
    .form-actions{display:flex;gap:12px;margin-top:28px;justify-content:flex-end}
    .stat-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;margin-bottom:28px}
    .sc{background:white;border-radius:12px;padding:20px;text-align:center;
      box-shadow:0 2px 8px rgba(0,0,0,.06);border-top:4px solid #1A6B3C}
    .sc-icon{font-size:28px;margin-bottom:8px}
    .sc-val{font-size:32px;font-weight:700;color:#1A6B3C}
    .sc-lbl{font-size:12px;color:#6B7280;margin-top:4px}
    .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .detail-box{background:white;border-radius:12px;padding:20px;
      box-shadow:0 2px 8px rgba(0,0,0,.06)}
    .detail-box h4{font-size:13px;font-weight:700;color:#9E9E9E;
      text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px}
    .dl dt{font-size:12px;color:#9E9E9E;margin-bottom:2px}
    .dl dd{font-size:14px;color:#1A1A2E;margin-bottom:12px;font-weight:500}
    @media(max-width:768px){
      .form-grid{grid-template-columns:1fr}
      .detail-grid{grid-template-columns:1fr}
      .container{padding:16px 12px}
      table{font-size:12px}
      thead th,tbody td{padding:10px 10px}
    }
  </style>`

function structuresListePage(profil: AuthProfile, structures: any[]): string {
  const succes = false // TODO: lire query param
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Structures</title>${CSS}</head><body>
  ${header(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/admin">Accueil</a> → Structures</div>
    <div class="top-bar">
      <div>
        <div class="page-title">Structures sanitaires</div>
        <div class="page-sub">${structures.length} structure(s) enregistrée(s)</div>
      </div>
      <a href="/admin/structures/nouvelle" class="btn-primary">+ Ajouter une structure</a>
    </div>
    <div class="card">
      <table>
        <thead><tr>
          <th>Nom</th><th>Type</th><th>Niveau</th><th>Ville</th><th>Statut</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${structures.length === 0
            ? '<tr><td colspan="6" style="text-align:center;padding:32px;color:#9E9E9E;font-style:italic">Aucune structure enregistrée. <a href="/admin/structures/nouvelle" style="color:#1A6B3C">Ajouter la première →</a></td></tr>'
            : structures.map((s: any) => `
              <tr>
                <td><strong>${s.nom}</strong></td>
                <td><span class="type-badge">${s.type}</span></td>
                <td><span class="niveau">${s.niveau}</span></td>
                <td>${s.geo_villes?.nom ?? '—'}</td>
                <td><span class="badge ${s.est_actif ? 'actif' : 'inactif'}">${s.est_actif ? 'Active' : 'Inactive'}</span></td>
                <td><a href="/admin/structures/${s.id}" class="btn-secondary" style="padding:6px 12px;font-size:12px">Voir</a></td>
              </tr>`).join('')
          }
        </tbody>
      </table>
    </div>
  </div></body></html>`
}

function structureFormPage(profil: AuthProfile, villes: any[], erreur?: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Nouvelle structure</title>${CSS}</head><body>
  ${header(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/admin">Accueil</a> → <a href="/admin/structures">Structures</a> → Nouvelle</div>
    <div class="page-title">Ajouter une structure sanitaire</div>
    <div class="page-sub">Enregistrer un hôpital, une clinique, un CSPS...</div>
    ${erreur ? `<div class="alerte-err">⚠️ ${erreur}</div>` : ''}
    <div class="card" style="padding:28px">
      <form method="POST" action="/admin/structures/nouvelle">
        <div class="form-grid">
          <div class="form-group full">
            <label>Nom complet de la structure *</label>
            <input type="text" name="nom" placeholder="Ex: CHU Yalgado Ouédraogo" required>
          </div>
          <div class="form-group">
            <label>Type de structure *</label>
            <select name="type" required>
              <option value="">Choisir...</option>
              <option value="CHU">CHU — Centre Hospitalier Universitaire</option>
              <option value="CHR">CHR — Centre Hospitalier Régional</option>
              <option value="CMA">CMA — Centre Médical avec Antenne</option>
              <option value="CSPS">CSPS — Centre de Santé et Promotion Sociale</option>
              <option value="clinique_privee">Clinique privée</option>
              <option value="cabinet_medical">Cabinet médical</option>
              <option value="pharmacie">Pharmacie</option>
              <option value="laboratoire">Laboratoire</option>
              <option value="cabinet_imagerie">Cabinet d'imagerie</option>
            </select>
          </div>
          <div class="form-group">
            <label>Niveau *</label>
            <select name="niveau" required>
              <option value="1">Niveau 1 — CSPS (local)</option>
              <option value="2">Niveau 2 — CMA (district)</option>
              <option value="3">Niveau 3 — CHR (régional)</option>
              <option value="4">Niveau 4 — CHU (national)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Ville *</label>
            <select name="ville_id" required>
              <option value="">Choisir une ville...</option>
              ${villes.map((v: any) => `<option value="${v.id}">${v.nom} — ${(v.geo_provinces as any)?.nom ?? ''}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Type de gestion *</label>
            <select name="est_public">
              <option value="true">Publique (État / Ministère)</option>
              <option value="false">Privée</option>
            </select>
          </div>
          <div class="form-group">
            <label>Téléphone</label>
            <input type="text" name="telephone" placeholder="Ex: 25 30 60 00">
          </div>
          <div class="form-group full">
            <label>Adresse complète</label>
            <textarea name="adresse" placeholder="Ex: Avenue de la Nation, Secteur 4, Ouagadougou"></textarea>
          </div>
        </div>
        <div class="form-actions">
          <a href="/admin/structures" class="btn-secondary">Annuler</a>
          <button type="submit" class="btn-primary">Enregistrer la structure →</button>
        </div>
      </form>
    </div>
  </div></body></html>`
}

function structureDetailPage(profil: AuthProfile, structure: any, services: any[], personnel: any[]): string {
  if (!structure) return `<html><body>Structure introuvable</body></html>`
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — ${structure.nom}</title>${CSS}</head><body>
  ${header(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/admin">Accueil</a> → <a href="/admin/structures">Structures</a> → ${structure.nom}</div>
    <div class="top-bar">
      <div>
        <div class="page-title">${structure.nom}</div>
        <div class="page-sub"><span class="type-badge">${structure.type}</span> · Niveau ${structure.niveau} · ${structure.est_public ? 'Public' : 'Privé'}</div>
      </div>
      <span class="badge ${structure.est_actif ? 'actif' : 'inactif'}" style="padding:8px 16px;font-size:13px">${structure.est_actif ? '✅ Active' : '⛔ Inactive'}</span>
    </div>
    <div class="detail-grid">
      <div class="detail-box">
        <h4>Informations générales</h4>
        <dl class="dl">
          <dt>Nom</dt><dd>${structure.nom}</dd>
          <dt>Type</dt><dd>${structure.type}</dd>
          <dt>Ville</dt><dd>${structure.geo_villes?.nom ?? '—'}</dd>
          <dt>Adresse</dt><dd>${structure.adresse ?? '—'}</dd>
          <dt>Téléphone</dt><dd>${structure.telephone ?? '—'}</dd>
        </dl>
      </div>
      <div class="detail-box">
        <h4>Personnel (${personnel.length})</h4>
        ${personnel.length === 0
          ? '<p style="color:#9E9E9E;font-size:13px;font-style:italic">Aucun personnel assigné</p>'
          : personnel.slice(0,8).map((p: any) => `
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F5F5F5">
              <span style="font-size:13px">${p.prenom} ${p.nom}</span>
              <span class="badge ${p.role}">${p.role.replace(/_/g,' ')}</span>
            </div>`).join('')
        }
        ${personnel.length > 8 ? `<p style="font-size:12px;color:#9E9E9E;margin-top:8px">+${personnel.length-8} autres</p>` : ''}
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <h3>Services (${services.length})</h3>
      </div>
      <table>
        <thead><tr><th>Nom</th><th>Code</th><th>Lits</th><th>Statut</th></tr></thead>
        <tbody>
          ${services.length === 0
            ? '<tr><td colspan="4" style="text-align:center;padding:24px;color:#9E9E9E;font-style:italic">Aucun service enregistré</td></tr>'
            : services.map((s: any) => `
              <tr>
                <td><strong>${s.nom}</strong></td>
                <td><code style="background:#F3F4F6;padding:2px 8px;border-radius:4px;font-size:12px">${s.code ?? '—'}</code></td>
                <td>${s.nb_lits_total ?? 0}</td>
                <td><span class="badge ${s.est_actif ? 'actif' : 'inactif'}">${s.est_actif ? 'Actif' : 'Inactif'}</span></td>
              </tr>`).join('')
          }
        </tbody>
      </table>
    </div>
  </div></body></html>`
}

function comptesListePage(profil: AuthProfile, comptes: any[]): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Comptes</title>${CSS}</head><body>
  ${header(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/admin">Accueil</a> → Comptes</div>
    <div class="top-bar">
      <div>
        <div class="page-title">Comptes utilisateurs</div>
        <div class="page-sub">${comptes.length} compte(s) dans le système</div>
      </div>
      <a href="/admin/comptes/nouveau" class="btn-primary">+ Créer un compte</a>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Nom</th><th>Rôle</th><th>Structure</th><th>Statut</th><th>Créé le</th><th>Actions</th></tr></thead>
        <tbody>
          ${comptes.length === 0
            ? '<tr><td colspan="6" style="text-align:center;padding:32px;color:#9E9E9E;font-style:italic">Aucun compte. <a href="/admin/comptes/nouveau" style="color:#1A6B3C">Créer le premier →</a></td></tr>'
            : comptes.map((cp: any) => `
              <tr>
                <td><strong>${cp.prenom} ${cp.nom}</strong></td>
                <td><span class="badge ${cp.role}">${cp.role.replace(/_/g,' ')}</span></td>
                <td>${(cp.struct_structures as any)?.nom ?? '—'}</td>
                <td><span class="badge ${cp.est_actif ? 'actif' : 'inactif'}">${cp.est_actif ? 'Actif' : 'Inactif'}</span></td>
                <td>${new Date(cp.created_at).toLocaleDateString('fr-FR')}</td>
                <td>
                  <form method="POST" action="/admin/comptes/${cp.id}/toggle" style="display:inline">
                    <button type="submit" class="${cp.est_actif ? 'btn-danger' : 'btn-primary'}" style="font-size:11px;padding:5px 10px">
                      ${cp.est_actif ? 'Désactiver' : 'Activer'}
                    </button>
                  </form>
                </td>
              </tr>`).join('')
          }
        </tbody>
      </table>
    </div>
  </div></body></html>`
}

function compteFormPage(profil: AuthProfile, structures: any[], erreur?: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Nouveau compte</title>${CSS}
  <style>
    .medecin-fields{display:none}
    .medecin-fields.visible{display:grid}
  </style>
  </head><body>
  ${header(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/admin">Accueil</a> → <a href="/admin/comptes">Comptes</a> → Nouveau</div>
    <div class="page-title">Créer un compte utilisateur</div>
    <div class="page-sub">Le compte sera créé dans Supabase Auth et le profil sera configuré automatiquement.</div>
    ${erreur ? `<div class="alerte-err">⚠️ ${erreur}</div>` : ''}
    <div class="card" style="padding:28px">
      <form method="POST" action="/admin/comptes/nouveau">
        <div class="form-grid">
          <div class="form-group">
            <label>Prénom *</label>
            <input type="text" name="prenom" placeholder="Ex: Apollinaire" required>
          </div>
          <div class="form-group">
            <label>Nom *</label>
            <input type="text" name="nom" placeholder="Ex: Kaboré" required>
          </div>
          <div class="form-group full">
            <label>Adresse email *</label>
            <input type="email" name="email" placeholder="Ex: dr.kabore@santebf.bf" required>
          </div>
          <div class="form-group">
            <label>Mot de passe temporaire *</label>
            <input type="text" name="password" placeholder="Ex: SanteBF@2025#" required>
            <small style="font-size:11px;color:#9E9E9E;margin-top:4px;display:block">L'utilisateur devra le changer à la 1ère connexion</small>
          </div>
          <div class="form-group">
            <label>Rôle *</label>
            <select name="role" required id="roleSelect" onchange="toggleMedecin(this.value)">
              <option value="">Choisir un rôle...</option>
              <option value="admin_structure">Admin structure</option>
              <option value="medecin">Médecin</option>
              <option value="infirmier">Infirmier(e)</option>
              <option value="sage_femme">Sage-femme</option>
              <option value="pharmacien">Pharmacien(ne)</option>
              <option value="laborantin">Laborantin(e)</option>
              <option value="radiologue">Radiologue</option>
              <option value="caissier">Caissier(e)</option>
              <option value="agent_accueil">Agent d'accueil</option>
              <option value="patient">Patient</option>
            </select>
          </div>
          <div class="form-group">
            <label>Structure d'affectation</label>
            <select name="structure_id">
              <option value="">Aucune (Super Admin)</option>
              ${structures.map((s: any) => `<option value="${s.id}">${s.nom} (${s.type})</option>`).join('')}
            </select>
          </div>

          <!-- Champs spécifiques médecin -->
          <div class="form-group medecin-fields" id="medecinFields">
            <label>N° Ordre national médecin</label>
            <input type="text" name="numero_ordre" placeholder="Ex: MED-BF-2019-00342">
          </div>
          <div class="form-group medecin-fields" id="medecinFields2">
            <label>Spécialité principale</label>
            <input type="text" name="specialite" placeholder="Ex: Cardiologie, Médecine générale">
          </div>
        </div>
        <div class="form-actions">
          <a href="/admin/comptes" class="btn-secondary">Annuler</a>
          <button type="submit" class="btn-primary">Créer le compte →</button>
        </div>
      </form>
    </div>
  </div>
  <script>
    function toggleMedecin(role) {
      const show = role === 'medecin'
      document.getElementById('medecinFields').className = 'form-group medecin-fields' + (show ? ' visible' : '')
      document.getElementById('medecinFields2').className = 'form-group medecin-fields' + (show ? ' visible' : '')
    }
  </script>
  </body></html>`
}

function statsPage(profil: AuthProfile, stats: any): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Statistiques</title>${CSS}</head><body>
  ${header(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/admin">Accueil</a> → Statistiques</div>
    <div class="page-title">Statistiques nationales</div>
    <div class="page-sub">Vue d'ensemble du système SantéBF</div>
    <div class="stat-row">
      <div class="sc"><div class="sc-icon">🗂️</div><div class="sc-val">${stats.nbPatients}</div><div class="sc-lbl">Dossiers patients</div></div>
      <div class="sc"><div class="sc-icon">🏥</div><div class="sc-val">${stats.nbStructures}</div><div class="sc-lbl">Structures</div></div>
      <div class="sc"><div class="sc-icon">📋</div><div class="sc-val">${stats.nbConsults}</div><div class="sc-lbl">Consultations</div></div>
      <div class="sc"><div class="sc-icon">💊</div><div class="sc-val">${stats.nbOrdonnances}</div><div class="sc-lbl">Ordonnances</div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Structures par type</h3></div>
      <table>
        <thead><tr><th>Type</th><th>Nombre</th></tr></thead>
        <tbody>
          ${Object.entries(stats.parType).map(([type, nb]: [string, any]) => `
            <tr><td><span class="type-badge">${type}</span></td><td><strong>${nb}</strong></td></tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div></body></html>`
}
