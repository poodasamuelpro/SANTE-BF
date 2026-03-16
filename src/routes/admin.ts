import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { type Variables, type Bindings } from '../lib/supabase' 

export const adminRoutes = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>()

adminRoutes.use('/*', requireAuth, requireRole('super_admin'))

// ── GET /admin/structures ──────────────────────────────────
adminRoutes.get('/structures', async (c) => {
  const supabase = c.get('supabase')
  const profil = c.get('profil')

  const { data: structures } = await supabase
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
  const supabase = c.get('supabase')
  const profil = c.get('profil')

  const { data: villes } = await supabase
    .from('geo_villes')
    .select('id, nom, geo_provinces(nom, geo_regions(nom))')
    .order('nom')

  return c.html(structureFormPage(profil, villes ?? []))
})

// ── POST /admin/structures/nouvelle ───────────────────────
adminRoutes.post('/structures/nouvelle', async (c) => {
  const supabase = c.get('supabase')
  const profil = c.get('profil')
  const body = await c.req.parseBody()

  const { error } = await supabase.from('struct_structures').insert({
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
    const { data: villes } = await supabase
      .from('geo_villes')
      .select('id, nom, geo_provinces(nom, geo_regions(nom))')
      .order('nom')
    return c.html(structureFormPage(profil, villes ?? [], 'Erreur : ' + error.message))
  }

  return c.redirect('/admin/structures?succes=1')
})

// ── GET /admin/structures/:id ──────────────────────────────
adminRoutes.get('/structures/:id', async (c) => {
  const supabase = c.get('supabase')
  const profil = c.get('profil')
  const id = c.req.param('id')

  const { data: structure } = await supabase
    .from('struct_structures')
    .select(`*, geo_villes(nom, geo_provinces(nom))`)
    .eq('id', id)
    .single()

  if (!structure) return c.text('Structure introuvable', 404)

  const { data: services } = await supabase
    .from('struct_services')
    .select('*')
    .eq('structure_id', id)

  const { data: personnel } = await supabase
    .from('auth_profiles')
    .select('id, nom, prenom, role')
    .eq('structure_id', id)
    .eq('est_actif', true)

  return c.html(structureDetailPage(profil, structure, services ?? [], personnel ?? []))
})

// ── GET /admin/comptes ─────────────────────────────────────
adminRoutes.get('/comptes', async (c) => {
  const supabase = c.get('supabase')
  const profil = c.get('profil')

  const { data: comptes } = await supabase
    .from('auth_profiles')
    .select(`id, nom, prenom, role, est_actif, created_at, struct_structures ( nom )`)
    .order('created_at', { ascending: false })

  return c.html(comptesListePage(profil, comptes ?? []))
})

// ── GET /admin/comptes/nouveau ─────────────────────────────
adminRoutes.get('/comptes/nouveau', async (c) => {
  const supabase = c.get('supabase')
  const profil = c.get('profil')

  const { data: structures } = await supabase
    .from('struct_structures')
    .select('id, nom, type')
    .eq('est_actif', true)
    .order('nom')

  return c.html(compteFormPage(profil, structures ?? []))
})

// ── POST /admin/comptes/nouveau ────────────────────────────
adminRoutes.post('/comptes/nouveau', async (c) => {
  const supabase = c.get('supabase')
  const profil = c.get('profil')
  const body = await c.req.parseBody()

  const email        = String(body.email       ?? '').trim().toLowerCase()
  const password     = String(body.password    ?? '').trim()
  const nom          = String(body.nom         ?? '').trim()
  const prenom       = String(body.prenom      ?? '').trim()
  const role         = String(body.role        ?? '')
  const structure_id = body.structure_id ? String(body.structure_id) : null

  if (!email || !password || !nom || !prenom || !role) {
    const { data: structures } = await supabase
      .from('struct_structures').select('id, nom, type').eq('est_actif', true).order('nom')
    return c.html(compteFormPage(profil, structures ?? [], 'Tous les champs obligatoires doivent être remplis.'))
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { nom, prenom, role },
  })

  if (authError || !authData?.user) {
    const { data: structures } = await supabase
      .from('struct_structures').select('id, nom, type').eq('est_actif', true).order('nom')
    return c.html(compteFormPage(profil, structures ?? [], 'Erreur création compte : ' + (authError?.message ?? 'Inconnue')))
  }

  await supabase.from('auth_profiles').update({
    structure_id, doit_changer_mdp: true, est_actif: true,
  }).eq('id', authData.user.id)

  if (role === 'medecin' && body.numero_ordre) {
    await supabase.from('auth_medecins').insert({
      profile_id: authData.user.id,
      numero_ordre_national: String(body.numero_ordre),
      specialite_principale: String(body.specialite ?? 'Médecine générale'),
    })
  }

  return c.redirect('/admin/comptes?succes=1')
})

// ── POST /admin/comptes/:id/toggle ─────────────────────────
adminRoutes.post('/comptes/:id/toggle', async (c) => {
  const supabase = c.get('supabase')
  const id = c.req.param('id')

  const { data: compte } = await supabase
    .from('auth_profiles').select('est_actif').eq('id', id).single()

  await supabase.from('auth_profiles')
    .update({ est_actif: !compte?.est_actif }).eq('id', id)

  return c.redirect('/admin/comptes')
})

// ── GET /admin/stats ───────────────────────────────────────
adminRoutes.get('/stats', async (c) => {
  const supabase = c.get('supabase')
  const profil = c.get('profil')

  const [structs, patients, consults, ordonnances] = await Promise.all([
    supabase.from('struct_structures').select('type, est_actif'),
    supabase.from('patient_dossiers').select('*', { count: 'exact', head: true }),
    supabase.from('medical_consultations').select('*', { count: 'exact', head: true }),
    supabase.from('medical_ordonnances').select('*', { count: 'exact', head: true }),
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
// CSS + COMPOSANTS COMMUNS
// ══════════════════════════════════════════════════════════

const CSS = `
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fraunces:wght@300;600&display=swap" rel="stylesheet">
<style>
  :root {
    --vert:        #1A6B3C;
    --vert-fonce:  #134d2c;
    --vert-clair:  #e8f5ee;
    --vert-glow:   rgba(26,107,60,0.12);
    --or:          #C9A84C;
    --or-clair:    #fdf6e3;
    --texte:       #0f1923;
    --texte-soft:  #5a6a78;
    --bg:          #f4f6f4;
    --blanc:       #ffffff;
    --bordure:     #e2e8e4;
    --shadow-sm:   0 1px 4px rgba(0,0,0,0.06);
    --shadow-md:   0 4px 20px rgba(0,0,0,0.08);
    --radius:      14px;
    --radius-sm:   8px;
  }
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Plus Jakarta Sans',sans-serif; background:var(--bg); min-height:100vh; color:var(--texte); }

  /* HEADER */
  header {
    background:var(--vert-fonce); padding:0 28px; height:60px;
    display:flex; align-items:center; justify-content:space-between;
    position:sticky; top:0; z-index:100;
    box-shadow:0 2px 8px rgba(0,0,0,0.15);
  }
  .hl { display:flex; align-items:center; gap:12px; }
  .logo-wrap { display:flex; align-items:center; gap:12px; text-decoration:none; }
  .logo { width:34px; height:34px; background:var(--or); border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:17px; }
  .ht { font-family:'Fraunces',serif; font-size:18px; color:white; }
  .ht span { font-family:'Plus Jakarta Sans',sans-serif; font-size:11px; opacity:.6; display:block; }
  .hr { display:flex; align-items:center; gap:10px; }
  .ub { background:rgba(255,255,255,0.1); border-radius:8px; padding:6px 12px; }
  .ub strong { display:block; font-size:13px; color:white; }
  .ub small { font-size:11px; color:rgba(255,255,255,0.5); }
  .logout { background:rgba(255,255,255,0.1); color:white; border:none; padding:8px 14px; border-radius:8px; font-size:13px; cursor:pointer; text-decoration:none; font-family:'Plus Jakarta Sans',sans-serif; transition:background .2s; }
  .logout:hover { background:rgba(255,80,80,0.2); }

  /* LAYOUT */
  .container { max-width:1100px; margin:0 auto; padding:28px 20px; }
  .breadcrumb { font-size:12px; color:var(--texte-soft); margin-bottom:14px; }
  .breadcrumb a { color:var(--vert); text-decoration:none; font-weight:600; }
  .breadcrumb a:hover { text-decoration:underline; }

  /* TOP BAR */
  .top-bar { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
  .page-title { font-family:'Fraunces',serif; font-size:26px; color:var(--texte); margin-bottom:3px; }
  .page-sub { font-size:13px; color:var(--texte-soft); }

  /* BUTTONS */
  .btn-primary { background:var(--vert); color:white; padding:10px 20px; border:none; border-radius:var(--radius-sm); font-size:14px; font-weight:600; cursor:pointer; text-decoration:none; font-family:'Plus Jakarta Sans',sans-serif; display:inline-block; transition:background .2s; }
  .btn-primary:hover { background:#15593a; }
  .btn-secondary { background:var(--blanc); color:var(--texte); padding:10px 20px; border:1px solid var(--bordure); border-radius:var(--radius-sm); font-size:14px; font-weight:600; cursor:pointer; text-decoration:none; font-family:'Plus Jakarta Sans',sans-serif; display:inline-block; }
  .btn-danger { background:#fce8e8; color:#b71c1c; padding:10px 20px; border:none; border-radius:var(--radius-sm); font-size:13px; font-weight:600; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; }
  .btn-danger:hover { background:#fbd0d0; }

  /* ALERTS */
  .alerte-err { background:#fff5f5; border-left:4px solid #c62828; padding:12px 16px; border-radius:var(--radius-sm); margin-bottom:20px; font-size:13px; color:#c62828; }
  .alerte-ok  { background:var(--vert-clair); border-left:4px solid var(--vert); padding:12px 16px; border-radius:var(--radius-sm); margin-bottom:20px; font-size:13px; color:var(--vert); }

  /* CARD */
  .card { background:var(--blanc); border-radius:var(--radius); box-shadow:var(--shadow-sm); border:1px solid var(--bordure); overflow:hidden; margin-bottom:24px; }
  .card-header { padding:14px 20px; background:var(--vert-fonce); display:flex; justify-content:space-between; align-items:center; }
  .card-header h3 { font-size:14px; color:white; font-weight:600; }

  /* TABLE */
  table { width:100%; border-collapse:collapse; }
  thead tr { background:#f8faf8; }
  thead th { padding:11px 16px; text-align:left; font-size:11px; color:var(--texte-soft); font-weight:700; text-transform:uppercase; letter-spacing:.6px; border-bottom:2px solid var(--bordure); }
  tbody tr { border-bottom:1px solid var(--bordure); transition:background .15s; }
  tbody tr:hover { background:#f9fdf9; }
  tbody td { padding:12px 16px; font-size:13.5px; }
  tbody tr:last-child { border-bottom:none; }
  .empty { padding:40px; text-align:center; color:var(--texte-soft); font-style:italic; font-size:13px; }

  /* BADGES */
  .badge { padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600; display:inline-block; }
  .badge.actif    { background:var(--vert-clair); color:var(--vert); }
  .badge.inactif  { background:#f3f4f6; color:#9e9e9e; }
  .type-badge { background:var(--or-clair); color:#7a5500; padding:3px 10px; border-radius:6px; font-size:11px; font-weight:600; }
  .niveau { background:#e8f0fe; color:#1e40af; padding:3px 10px; border-radius:6px; font-size:11px; font-weight:600; }

  /* ROLE BADGES */
  .badge.super_admin     { background:#fdf6e3; color:#7a5500; }
  .badge.admin_structure { background:#e8f0fe; color:#1e40af; }
  .badge.medecin         { background:#f3e8ff; color:#6a1b9a; }
  .badge.infirmier       { background:#e0f2fe; color:#0277bd; }
  .badge.sage_femme      { background:#fce4ec; color:#880e4f; }
  .badge.pharmacien      { background:#e8eaf6; color:#283593; }
  .badge.laborantin      { background:#e0f7fa; color:#00695c; }
  .badge.radiologue      { background:#fff3e0; color:#e65100; }
  .badge.caissier        { background:var(--vert-clair); color:var(--vert); }
  .badge.agent_accueil   { background:#f1f8e9; color:#33691e; }
  .badge.patient         { background:#fce8e8; color:#b71c1c; }

  /* FORMS */
  .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .form-group { display:flex; flex-direction:column; gap:6px; }
  .form-group.full { grid-column:1/-1; }
  label { font-size:13px; font-weight:600; color:var(--texte); }
  input[type="text"], input[type="email"], input[type="number"], input[type="password"],
  select, textarea {
    width:100%; padding:11px 14px; font-family:'Plus Jakarta Sans',sans-serif;
    font-size:14px; border:1.5px solid var(--bordure); border-radius:var(--radius-sm);
    background:#f8faf8; color:var(--texte); outline:none; transition:border-color .2s, background .2s;
  }
  input:focus, select:focus, textarea:focus { border-color:var(--vert); background:var(--blanc); box-shadow:0 0 0 3px var(--vert-glow); }
  textarea { resize:vertical; min-height:90px; }
  .form-actions { display:flex; gap:12px; margin-top:28px; justify-content:flex-end; }

  /* DETAIL GRID */
  .detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; }
  .detail-box { background:var(--blanc); border-radius:var(--radius); padding:22px; border:1px solid var(--bordure); box-shadow:var(--shadow-sm); }
  .detail-box h4 { font-family:'Fraunces',serif; font-size:15px; margin-bottom:14px; color:var(--texte); }
  .dl { display:flex; flex-direction:column; gap:0; }
  .dl dt { font-size:11px; font-weight:700; color:var(--texte-soft); text-transform:uppercase; letter-spacing:.5px; margin-top:10px; }
  .dl dd { font-size:14px; color:var(--texte); font-weight:500; padding-bottom:10px; border-bottom:1px solid var(--bordure); }
  .dl dd:last-child { border-bottom:none; }

  /* STATS ROW */
  .stat-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px; margin-bottom:28px; }
  .sc { background:var(--blanc); border-radius:var(--radius); padding:22px; box-shadow:var(--shadow-sm); border:1px solid var(--bordure); position:relative; overflow:hidden; }
  .sc::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,var(--vert),var(--or)); }
  .sc-icon { font-size:28px; margin-bottom:8px; }
  .sc-val  { font-family:'Fraunces',serif; font-size:36px; font-weight:600; color:var(--vert); line-height:1; margin-bottom:4px; }
  .sc-lbl  { font-size:12px; color:var(--texte-soft); font-weight:500; }

  /* MEDECIN FIELDS */
  .medecin-fields { display:none; }
  .medecin-fields.visible { display:contents; }

  @media(max-width:768px) {
    .form-grid { grid-template-columns:1fr; }
    .detail-grid { grid-template-columns:1fr; }
    .top-bar { flex-direction:column; }
    .container { padding:16px 12px; }
    header { padding:0 16px; }
  }
</style>`

function header(profil: any): string {
  return `<header>
    <div class="hl">
      <a href="/dashboard/admin" class="logo-wrap">
        <div class="logo">🏥</div>
        <div class="ht">SantéBF <span>SUPER ADMIN</span></div>
      </a>
    </div>
    <div class="hr">
      <div class="ub">
        <strong>${profil.prenom} ${profil.nom}</strong>
        <small>Super Admin</small>
      </div>
      <a href="/auth/logout" class="logout">Déconnexion</a>
    </div>
  </header>`
}

function structuresListePage(profil: any, structures: any[]): string {
  const succes = false
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
            ? `<tr><td colspan="6" class="empty">Aucune structure enregistrée. <a href="/admin/structures/nouvelle" style="color:var(--vert)">Ajouter la première →</a></td></tr>`
            : structures.map((s: any) => `
              <tr>
                <td><strong>${s.nom}</strong></td>
                <td><span class="type-badge">${s.type}</span></td>
                <td><span class="niveau">Niv. ${s.niveau}</span></td>
                <td>${s.geo_villes?.nom ?? '—'}</td>
                <td><span class="badge ${s.est_actif ? 'actif' : 'inactif'}">${s.est_actif ? 'Active' : 'Inactive'}</span></td>
                <td><a href="/admin/structures/${s.id}" class="btn-secondary" style="padding:5px 12px;font-size:12px">Voir →</a></td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div></body></html>`
}

function structureFormPage(profil: any, villes: any[], erreur?: string): string {
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

function structureDetailPage(profil: any, structure: any, services: any[], personnel: any[]): string {
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
        <div class="page-sub">
          <span class="type-badge">${structure.type}</span>
          &nbsp;· Niveau ${structure.niveau}
          &nbsp;· ${structure.est_public ? 'Public' : 'Privé'}
        </div>
      </div>
      <span class="badge ${structure.est_actif ? 'actif' : 'inactif'}" style="padding:8px 16px;font-size:13px">
        ${structure.est_actif ? '✅ Active' : '⛔ Inactive'}
      </span>
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
        <h4>Personnel actif (${personnel.length})</h4>
        ${personnel.length === 0
          ? '<p style="color:var(--texte-soft);font-size:13px;font-style:italic">Aucun personnel assigné</p>'
          : personnel.slice(0,8).map((p: any) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--bordure)">
              <span style="font-size:13px;font-weight:500">${p.prenom} ${p.nom}</span>
              <span class="badge ${p.role}" style="font-size:10px">${p.role.replace(/_/g,' ')}</span>
            </div>`).join('')}
        ${personnel.length > 8 ? `<p style="font-size:12px;color:var(--texte-soft);margin-top:8px">+${personnel.length-8} autres</p>` : ''}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Services (${services.length})</h3></div>
      <table>
        <thead><tr><th>Nom</th><th>Code</th><th>Lits</th><th>Statut</th></tr></thead>
        <tbody>
          ${services.length === 0
            ? '<tr><td colspan="4" class="empty">Aucun service enregistré</td></tr>'
            : services.map((s: any) => `
              <tr>
                <td><strong>${s.nom}</strong></td>
                <td><code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:11px">${s.code ?? '—'}</code></td>
                <td>${s.nb_lits_total ?? 0}</td>
                <td><span class="badge ${s.est_actif ? 'actif' : 'inactif'}">${s.est_actif ? 'Actif' : 'Inactif'}</span></td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div></body></html>`
}

function comptesListePage(profil: any, comptes: any[]): string {
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
            ? `<tr><td colspan="6" class="empty">Aucun compte. <a href="/admin/comptes/nouveau" style="color:var(--vert)">Créer le premier →</a></td></tr>`
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
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div></body></html>`
}

function compteFormPage(profil: any, structures: any[], erreur?: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Nouveau compte</title>${CSS}</head><body>
  ${header(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/admin">Accueil</a> → <a href="/admin/comptes">Comptes</a> → Nouveau</div>
    <div class="page-title">Créer un compte utilisateur</div>
    <div class="page-sub">Le compte sera créé dans Supabase Auth et le profil configuré automatiquement.</div>
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
            <small style="font-size:11px;color:var(--texte-soft);margin-top:4px">L'utilisateur devra le changer à la 1ère connexion</small>
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
          <div class="form-group full">
            <label>Structure d'affectation</label>
            <select name="structure_id">
              <option value="">Aucune (Super Admin)</option>
              ${structures.map((s: any) => `<option value="${s.id}">${s.nom} (${s.type})</option>`).join('')}
            </select>
          </div>
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

function statsPage(profil: any, stats: any): string {
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
            <tr>
              <td><span class="type-badge">${type}</span></td>
              <td><strong>${nb}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div></body></html>`
}
