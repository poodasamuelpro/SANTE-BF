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
  const profil   = c.get('profil')
  const { data: structures } = await supabase
    .from('struct_structures')
    .select('id, nom, type, niveau, est_public, est_actif, geo_villes(nom, geo_provinces(nom))')
    .order('nom')
  return c.html(structuresListePage(profil, structures ?? []))
})

// ── GET /admin/structures/nouvelle ────────────────────────
adminRoutes.get('/structures/nouvelle', async (c) => {
  const supabase = c.get('supabase')
  const profil   = c.get('profil')
  const { data: villes } = await supabase
    .from('geo_villes')
    .select('id, nom, geo_provinces(nom, geo_regions(nom))')
    .order('nom')
  return c.html(structureFormPage(profil, villes ?? []))
})

// ── POST /admin/structures/nouvelle ───────────────────────
adminRoutes.post('/structures/nouvelle', async (c) => {
  const supabase = c.get('supabase')
  const profil   = c.get('profil')
  const body     = await c.req.parseBody()
  const { error } = await supabase.from('struct_structures').insert({
    nom:        String(body.nom       ?? ''),
    type:       String(body.type      ?? ''),
    niveau:     parseInt(String(body.niveau ?? '1')),
    ville_id:   String(body.ville_id  ?? ''),
    adresse:    String(body.adresse   ?? ''),
    telephone:  String(body.telephone ?? ''),
    est_public: body.est_public === 'true',
    est_actif:  true,
  })
  if (error) {
    const { data: villes } = await supabase.from('geo_villes')
      .select('id, nom, geo_provinces(nom, geo_regions(nom))').order('nom')
    return c.html(structureFormPage(profil, villes ?? [], 'Erreur : ' + error.message))
  }
  return c.redirect('/admin/structures?succes=1')
})

// ── GET /admin/structures/:id ──────────────────────────────
adminRoutes.get('/structures/:id', async (c) => {
  const supabase = c.get('supabase')
  const profil   = c.get('profil')
  const id       = c.req.param('id')
  const { data: structure } = await supabase
    .from('struct_structures')
    .select('*, geo_villes(nom, geo_provinces(nom))')
    .eq('id', id).single()
  if (!structure) return c.text('Structure introuvable', 404)
  const { data: services  } = await supabase.from('struct_services').select('*').eq('structure_id', id)
  const { data: personnel } = await supabase.from('auth_profiles').select('id, nom, prenom, role').eq('structure_id', id).eq('est_actif', true)
  return c.html(structureDetailPage(profil, structure, services ?? [], personnel ?? []))
})

// ── GET /admin/comptes ─────────────────────────────────────
adminRoutes.get('/comptes', async (c) => {
  const supabase = c.get('supabase')
  const profil   = c.get('profil')
  const { data: comptes } = await supabase
    .from('auth_profiles')
    .select('id, nom, prenom, role, est_actif, created_at, struct_structures(nom)')
    .order('created_at', { ascending: false })
  return c.html(comptesListePage(profil, comptes ?? []))
})

// ── GET /admin/comptes/nouveau ─────────────────────────────
adminRoutes.get('/comptes/nouveau', async (c) => {
  const supabase = c.get('supabase')
  const profil   = c.get('profil')
  const { data: structures } = await supabase
    .from('struct_structures').select('id, nom, type').eq('est_actif', true).order('nom')
  return c.html(compteFormPage(profil, structures ?? []))
})

// ── POST /admin/comptes/nouveau ────────────────────────────
// ✅ super_admin peut être créé ici
adminRoutes.post('/comptes/nouveau', async (c) => {
  const supabase     = c.get('supabase')
  const profil       = c.get('profil')
  const body         = await c.req.parseBody()
  const email        = String(body.email    ?? '').trim().toLowerCase()
  const password     = String(body.password ?? '').trim()
  const nom          = String(body.nom      ?? '').trim()
  const prenom       = String(body.prenom   ?? '').trim()
  const role         = String(body.role     ?? '')
  const structure_id = body.structure_id ? String(body.structure_id) : null

  const rolesValides = [
    'super_admin', 'admin_structure', 'medecin', 'infirmier', 'sage_femme',
    'pharmacien', 'laborantin', 'radiologue', 'caissier', 'agent_accueil', 'patient'
  ]

  if (!email || !password || !nom || !prenom || !role || !rolesValides.includes(role)) {
    const { data: structures } = await supabase.from('struct_structures').select('id, nom, type').eq('est_actif', true).order('nom')
    return c.html(compteFormPage(profil, structures ?? [], 'Tous les champs obligatoires doivent être remplis.'))
  }

  // Super admin n'a pas de structure obligatoire
  if (role !== 'super_admin' && !structure_id && role !== 'patient') {
    const { data: structures } = await supabase.from('struct_structures').select('id, nom, type').eq('est_actif', true).order('nom')
    return c.html(compteFormPage(profil, structures ?? [], 'Une structure est requise pour ce rôle.'))
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { nom, prenom, role },
  })

  if (authError || !authData?.user) {
    const { data: structures } = await supabase.from('struct_structures').select('id, nom, type').eq('est_actif', true).order('nom')
    return c.html(compteFormPage(profil, structures ?? [], 'Erreur création compte : ' + (authError?.message ?? 'Inconnue')))
  }

  await supabase.from('auth_profiles').update({
    structure_id: role === 'super_admin' ? null : structure_id,
    doit_changer_mdp: true,
    est_actif: true,
  }).eq('id', authData.user.id)

  if (role === 'medecin' && body.numero_ordre) {
    await supabase.from('auth_medecins').insert({
      profile_id:            authData.user.id,
      numero_ordre_national: String(body.numero_ordre),
      specialite_principale: String(body.specialite ?? 'Médecine générale'),
    })
  }

  return c.redirect('/admin/comptes?succes=1')
})

// ── POST /admin/comptes/:id/toggle ─────────────────────────
adminRoutes.post('/comptes/:id/toggle', async (c) => {
  const supabase = c.get('supabase')
  const id       = c.req.param('id')
  const { data: compte } = await supabase.from('auth_profiles').select('est_actif').eq('id', id).single()
  await supabase.from('auth_profiles').update({ est_actif: !compte?.est_actif }).eq('id', id)
  return c.redirect('/admin/comptes')
})

// ── GET /admin/stats ───────────────────────────────────────
adminRoutes.get('/stats', async (c) => {
  const supabase = c.get('supabase')
  const profil   = c.get('profil')
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

// ── GET /admin/geo ─────────────────────────────────────────
// ✅ GÉOGRAPHIE FONCTIONNELLE
adminRoutes.get('/geo', async (c) => {
  const supabase = c.get('supabase')
  const profil   = c.get('profil')
  const [regionsRes, provincesRes, villesRes] = await Promise.all([
    supabase.from('geo_regions').select('id, nom, code').order('nom'),
    supabase.from('geo_provinces').select('id, nom, code, geo_regions(nom)').order('nom'),
    supabase.from('geo_villes').select('id, nom, geo_provinces(nom, geo_regions(nom))').order('nom').limit(200),
  ])
  return c.html(geoPage(profil, {
    regions:   regionsRes.data   ?? [],
    provinces: provincesRes.data ?? [],
    villes:    villesRes.data    ?? [],
  }))
})

// ── POST /admin/geo/regions ────────────────────────────────
adminRoutes.post('/geo/regions', async (c) => {
  const supabase = c.get('supabase')
  const body     = await c.req.parseBody()
  await supabase.from('geo_regions').insert({
    nom:  String(body.nom  ?? '').trim(),
    code: String(body.code ?? '').trim().toUpperCase(),
  })
  return c.redirect('/admin/geo?succes=region')
})

// ── POST /admin/geo/provinces ──────────────────────────────
adminRoutes.post('/geo/provinces', async (c) => {
  const supabase = c.get('supabase')
  const body     = await c.req.parseBody()
  await supabase.from('geo_provinces').insert({
    nom:       String(body.nom       ?? '').trim(),
    code:      String(body.code      ?? '').trim().toUpperCase(),
    region_id: String(body.region_id ?? ''),
  })
  return c.redirect('/admin/geo?succes=province')
})

// ── POST /admin/geo/villes ─────────────────────────────────
adminRoutes.post('/geo/villes', async (c) => {
  const supabase = c.get('supabase')
  const body     = await c.req.parseBody()
  await supabase.from('geo_villes').insert({
    nom:         String(body.nom         ?? '').trim(),
    province_id: String(body.province_id ?? ''),
  })
  return c.redirect('/admin/geo?succes=ville')
})

// ══════════════════════════════════════════════════════════
// CSS COMMUN
// ══════════════════════════════════════════════════════════
const CSS = `
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fraunces:wght@300;600&display=swap" rel="stylesheet">
<style>
  :root{--vert:#1A6B3C;--vert-f:#134d2c;--vert-c:#e8f5ee;--vert-g:rgba(26,107,60,0.12);--or:#C9A84C;--or-c:#fdf6e3;--texte:#0f1923;--soft:#5a6a78;--bg:#f4f6f4;--blanc:#ffffff;--bordure:#e2e8e4;--sh-sm:0 1px 4px rgba(0,0,0,0.06);--sh-md:0 4px 20px rgba(0,0,0,0.08);--r:14px;--rs:8px;}
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);}
  header{background:var(--vert-f);padding:0 28px;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,0.15);}
  .hl{display:flex;align-items:center;gap:12px;}
  .logo-wrap{display:flex;align-items:center;gap:12px;text-decoration:none;}
  .logo{width:34px;height:34px;background:var(--or);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px;}
  .ht{font-family:'Fraunces',serif;font-size:18px;color:white;}
  .ht span{font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;opacity:.6;display:block;}
  .hr{display:flex;align-items:center;gap:10px;}
  .ub{background:rgba(255,255,255,0.1);border-radius:8px;padding:6px 12px;}
  .ub strong{display:block;font-size:13px;color:white;}.ub small{font-size:11px;color:rgba(255,255,255,0.5);}
  .logout{background:rgba(255,255,255,0.1);color:white;border:none;padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer;text-decoration:none;font-family:'Plus Jakarta Sans',sans-serif;}
  .logout:hover{background:rgba(255,80,80,0.2);}
  .container{max-width:1100px;margin:0 auto;padding:28px 20px;}
  .breadcrumb{font-size:12px;color:var(--soft);margin-bottom:14px;}
  .breadcrumb a{color:var(--vert);text-decoration:none;font-weight:600;}
  .top-bar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;flex-wrap:wrap;gap:12px;}
  .page-title{font-family:'Fraunces',serif;font-size:26px;color:var(--texte);margin-bottom:3px;}
  .page-sub{font-size:13px;color:var(--soft);}
  .btn-primary{background:var(--vert);color:white;padding:10px 20px;border:none;border-radius:var(--rs);font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'Plus Jakarta Sans',sans-serif;display:inline-block;transition:background .2s;}
  .btn-primary:hover{background:#15593a;}
  .btn-secondary{background:var(--blanc);color:var(--texte);padding:10px 20px;border:1px solid var(--bordure);border-radius:var(--rs);font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'Plus Jakarta Sans',sans-serif;display:inline-block;}
  .btn-danger{background:#fce8e8;color:#b71c1c;padding:8px 14px;border:none;border-radius:var(--rs);font-size:12px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;}
  .btn-danger:hover{background:#fbd0d0;}
  .alerte-err{background:#fff5f5;border-left:4px solid #c62828;padding:12px 16px;border-radius:var(--rs);margin-bottom:20px;font-size:13px;color:#c62828;}
  .alerte-ok{background:var(--vert-c);border-left:4px solid var(--vert);padding:12px 16px;border-radius:var(--rs);margin-bottom:20px;font-size:13px;color:var(--vert);}
  .card{background:var(--blanc);border-radius:var(--r);box-shadow:var(--sh-sm);border:1px solid var(--bordure);overflow:hidden;margin-bottom:24px;}
  .card-header{padding:14px 20px;background:var(--vert-f);display:flex;justify-content:space-between;align-items:center;}
  .card-header h3{font-size:14px;color:white;font-weight:600;}
  table{width:100%;border-collapse:collapse;}
  thead tr{background:#f8faf8;}
  thead th{padding:11px 16px;text-align:left;font-size:11px;color:var(--soft);font-weight:700;text-transform:uppercase;letter-spacing:.6px;border-bottom:2px solid var(--bordure);}
  tbody tr{border-bottom:1px solid var(--bordure);transition:background .15s;}
  tbody tr:hover{background:#f9fdf9;}
  tbody td{padding:12px 16px;font-size:13.5px;}
  tbody tr:last-child{border-bottom:none;}
  .empty{padding:40px;text-align:center;color:var(--soft);font-style:italic;font-size:13px;}
  .badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;display:inline-block;}
  .badge.actif{background:var(--vert-c);color:var(--vert);}.badge.inactif{background:#f3f4f6;color:#9e9e9e;}
  .type-badge{background:var(--or-c);color:#7a5500;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600;}
  .niveau{background:#e8f0fe;color:#1e40af;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600;}
  .badge.super_admin{background:#fdf6e3;color:#7a5500;}.badge.admin_structure{background:#e8f0fe;color:#1e40af;}
  .badge.medecin{background:#f3e8ff;color:#6a1b9a;}.badge.infirmier{background:#e0f2fe;color:#0277bd;}
  .badge.sage_femme{background:#fce4ec;color:#880e4f;}.badge.pharmacien{background:#e8eaf6;color:#283593;}
  .badge.laborantin{background:#e0f7fa;color:#00695c;}.badge.radiologue{background:#fff3e0;color:#e65100;}
  .badge.caissier{background:var(--vert-c);color:var(--vert);}.badge.agent_accueil{background:#f1f8e9;color:#33691e;}
  .badge.patient{background:#fce8e8;color:#b71c1c;}
  .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
  .form-group{display:flex;flex-direction:column;gap:6px;}
  .form-group.full{grid-column:1/-1;}
  label{font-size:13px;font-weight:600;color:var(--texte);}
  input[type="text"],input[type="email"],input[type="number"],input[type="password"],select,textarea{width:100%;padding:11px 14px;font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;border:1.5px solid var(--bordure);border-radius:var(--rs);background:#f8faf8;color:var(--texte);outline:none;transition:border-color .2s,background .2s;}
  input:focus,select:focus,textarea:focus{border-color:var(--vert);background:var(--blanc);box-shadow:0 0 0 3px var(--vert-g);}
  textarea{resize:vertical;min-height:90px;}
  .form-actions{display:flex;gap:12px;margin-top:28px;justify-content:flex-end;}
  .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;}
  .detail-box{background:var(--blanc);border-radius:var(--r);padding:22px;border:1px solid var(--bordure);box-shadow:var(--sh-sm);}
  .detail-box h4{font-family:'Fraunces',serif;font-size:15px;margin-bottom:14px;}
  .dl{display:flex;flex-direction:column;gap:0;}
  .dl dt{font-size:11px;font-weight:700;color:var(--soft);text-transform:uppercase;letter-spacing:.5px;margin-top:10px;}
  .dl dd{font-size:14px;font-weight:500;padding-bottom:10px;border-bottom:1px solid var(--bordure);}
  .dl dd:last-child{border-bottom:none;}
  .stat-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:28px;}
  .sc{background:var(--blanc);border-radius:var(--r);padding:22px;box-shadow:var(--sh-sm);border:1px solid var(--bordure);position:relative;overflow:hidden;}
  .sc::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--vert),var(--or));}
  .sc-icon{font-size:28px;margin-bottom:8px;}.sc-val{font-family:'Fraunces',serif;font-size:36px;font-weight:600;color:var(--vert);line-height:1;margin-bottom:4px;}.sc-lbl{font-size:12px;color:var(--soft);font-weight:500;}
  .medecin-fields{display:none;}.medecin-fields.visible{display:contents;}
  .tabs{display:flex;gap:0;margin-bottom:0;border-bottom:2px solid var(--bordure);}
  .tab{padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;border:none;background:none;color:var(--soft);border-bottom:2px solid transparent;margin-bottom:-2px;font-family:'Plus Jakarta Sans',sans-serif;}
  .tab.active{color:var(--vert);border-bottom-color:var(--vert);}
  .tab-content{display:none;padding-top:20px;}.tab-content.active{display:block;}
  .geo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
  .mini-form{background:var(--vert-c);border-radius:var(--rs);padding:16px;margin-bottom:14px;}
  .mini-form h4{font-size:13px;font-weight:700;margin-bottom:10px;color:var(--vert);}
  .mini-form input,.mini-form select{background:var(--blanc);border:1.5px solid var(--bordure);padding:9px 12px;border-radius:var(--rs);font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;width:100%;margin-bottom:8px;outline:none;}
  .mini-form input:focus,.mini-form select:focus{border-color:var(--vert);}
  .mini-form button{background:var(--vert);color:white;border:none;padding:8px 16px;border-radius:var(--rs);font-size:13px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;width:100%;}
  @media(max-width:768px){.form-grid{grid-template-columns:1fr;}.detail-grid{grid-template-columns:1fr;}.geo-grid{grid-template-columns:1fr;}.top-bar{flex-direction:column;}.container{padding:16px 12px;}header{padding:0 16px;}}
</style>`

function headerHtml(profil: any): string {
  return '<header>'
    + '<div class="hl"><a href="/dashboard/admin" class="logo-wrap">'
    + '<div class="logo">&#127973;</div>'
    + '<div class="ht">SantéBF <span>SUPER ADMIN</span></div>'
    + '</a></div>'
    + '<div class="hr"><div class="ub"><strong>' + profil.prenom + ' ' + profil.nom + '</strong><small>Super Admin</small></div>'
    + '<a href="/auth/logout" class="logout">Déconnexion</a></div>'
    + '</header>'
}

function structuresListePage(profil: any, structures: any[]): string {
  const rows = structures.map((s: any) => {
    const ville = s.geo_villes?.nom ?? '—'
    const statut = s.est_actif
      ? '<span class="badge actif">Active</span>'
      : '<span class="badge inactif">Inactive</span>'
    return '<tr><td><strong>' + s.nom + '</strong></td>'
      + '<td><span class="type-badge">' + s.type + '</span></td>'
      + '<td><span class="niveau">Niv. ' + s.niveau + '</span></td>'
      + '<td>' + ville + '</td>'
      + '<td>' + statut + '</td>'
      + '<td><a href="/admin/structures/' + s.id + '" class="btn-secondary" style="padding:5px 12px;font-size:12px">Voir &#8594;</a></td></tr>'
  }).join('')
  const tbody = structures.length === 0
    ? '<tr><td colspan="6" class="empty">Aucune structure. <a href="/admin/structures/nouvelle" style="color:var(--vert)">Ajouter la première &#8594;</a></td></tr>'
    : rows
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SantéBF — Structures</title>' + CSS + '</head><body>'
    + headerHtml(profil)
    + '<div class="container">'
    + '<div class="breadcrumb"><a href="/dashboard/admin">Accueil</a> &#8594; Structures</div>'
    + '<div class="top-bar"><div><div class="page-title">Structures sanitaires</div><div class="page-sub">' + structures.length + ' structure(s)</div></div>'
    + '<a href="/admin/structures/nouvelle" class="btn-primary">+ Ajouter une structure</a></div>'
    + '<div class="card"><table><thead><tr><th>Nom</th><th>Type</th><th>Niveau</th><th>Ville</th><th>Statut</th><th>Actions</th></tr></thead>'
    + '<tbody>' + tbody + '</tbody></table></div></div></body></html>'
}

function structureFormPage(profil: any, villes: any[], erreur?: string): string {
  const err = erreur ? '<div class="alerte-err">&#9888; ' + erreur + '</div>' : ''
  const villesOpts = villes.map((v: any) => {
    const prov = v.geo_provinces?.nom ?? ''
    return '<option value="' + v.id + '">' + v.nom + (prov ? ' — ' + prov : '') + '</option>'
  }).join('')
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SantéBF — Nouvelle structure</title>' + CSS + '</head><body>'
    + headerHtml(profil)
    + '<div class="container">'
    + '<div class="breadcrumb"><a href="/dashboard/admin">Accueil</a> &#8594; <a href="/admin/structures">Structures</a> &#8594; Nouvelle</div>'
    + '<div class="page-title">Ajouter une structure sanitaire</div>'
    + '<div class="page-sub">Enregistrer un hôpital, une clinique, un CSPS...</div>'
    + err
    + '<div class="card" style="padding:28px"><form method="POST" action="/admin/structures/nouvelle">'
    + '<div class="form-grid">'
    + '<div class="form-group full"><label>Nom complet *</label><input type="text" name="nom" placeholder="Ex: CHU Yalgado Ouédraogo" required></div>'
    + '<div class="form-group"><label>Type *</label><select name="type" required>'
    + '<option value="">Choisir...</option>'
    + '<option value="CHU">CHU</option><option value="CHR">CHR</option><option value="CMA">CMA</option>'
    + '<option value="CSPS">CSPS</option><option value="clinique_privee">Clinique privée</option>'
    + '<option value="cabinet_medical">Cabinet médical</option><option value="pharmacie">Pharmacie</option>'
    + '<option value="laboratoire">Laboratoire</option><option value="cabinet_imagerie">Cabinet d\'imagerie</option>'
    + '</select></div>'
    + '<div class="form-group"><label>Niveau *</label><select name="niveau" required>'
    + '<option value="1">Niveau 1 — CSPS</option><option value="2">Niveau 2 — CMA</option>'
    + '<option value="3">Niveau 3 — CHR</option><option value="4">Niveau 4 — CHU</option>'
    + '</select></div>'
    + '<div class="form-group"><label>Ville *</label><select name="ville_id" required><option value="">Choisir...</option>' + villesOpts + '</select></div>'
    + '<div class="form-group"><label>Gestion *</label><select name="est_public"><option value="true">Publique</option><option value="false">Privée</option></select></div>'
    + '<div class="form-group"><label>Téléphone</label><input type="text" name="telephone" placeholder="Ex: 25 30 60 00"></div>'
    + '<div class="form-group full"><label>Adresse</label><textarea name="adresse" placeholder="Ex: Avenue de la Nation, Secteur 4, Ouagadougou"></textarea></div>'
    + '</div>'
    + '<div class="form-actions"><a href="/admin/structures" class="btn-secondary">Annuler</a><button type="submit" class="btn-primary">Enregistrer &#8594;</button></div>'
    + '</form></div></div></body></html>'
}

function structureDetailPage(profil: any, structure: any, services: any[], personnel: any[]): string {
  const pers = personnel.slice(0, 8).map((p: any) =>
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--bordure);">'
    + '<span style="font-size:13px;font-weight:500;">' + p.prenom + ' ' + p.nom + '</span>'
    + '<span class="badge ' + p.role + '" style="font-size:10px;">' + p.role.replace(/_/g, ' ') + '</span>'
    + '</div>'
  ).join('')
  const persExtra = personnel.length > 8 ? '<p style="font-size:12px;color:var(--soft);margin-top:8px;">+' + (personnel.length - 8) + ' autres</p>' : ''
  const servRows = services.map((s: any) =>
    '<tr><td><strong>' + s.nom + '</strong></td>'
    + '<td><code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:11px;">' + (s.code ?? '—') + '</code></td>'
    + '<td>' + (s.nb_lits_total ?? 0) + '</td>'
    + '<td><span class="badge ' + (s.est_actif ? 'actif' : 'inactif') + '">' + (s.est_actif ? 'Actif' : 'Inactif') + '</span></td></tr>'
  ).join('')
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SantéBF — ' + structure.nom + '</title>' + CSS + '</head><body>'
    + headerHtml(profil)
    + '<div class="container">'
    + '<div class="breadcrumb"><a href="/dashboard/admin">Accueil</a> &#8594; <a href="/admin/structures">Structures</a> &#8594; ' + structure.nom + '</div>'
    + '<div class="top-bar"><div><div class="page-title">' + structure.nom + '</div>'
    + '<div class="page-sub"><span class="type-badge">' + structure.type + '</span> &middot; Niveau ' + structure.niveau + ' &middot; ' + (structure.est_public ? 'Public' : 'Privé') + '</div></div>'
    + '<span class="badge ' + (structure.est_actif ? 'actif' : 'inactif') + '" style="padding:8px 16px;font-size:13px;">' + (structure.est_actif ? '&#10003; Active' : '&#9211; Inactive') + '</span></div>'
    + '<div class="detail-grid">'
    + '<div class="detail-box"><h4>Informations</h4><dl class="dl"><dt>Nom</dt><dd>' + structure.nom + '</dd><dt>Type</dt><dd>' + structure.type + '</dd><dt>Ville</dt><dd>' + (structure.geo_villes?.nom ?? '—') + '</dd><dt>Adresse</dt><dd>' + (structure.adresse ?? '—') + '</dd><dt>Téléphone</dt><dd>' + (structure.telephone ?? '—') + '</dd></dl></div>'
    + '<div class="detail-box"><h4>Personnel actif (' + personnel.length + ')</h4>' + (personnel.length === 0 ? '<p style="color:var(--soft);font-size:13px;font-style:italic;">Aucun personnel</p>' : pers + persExtra) + '</div>'
    + '</div>'
    + '<div class="card"><div class="card-header"><h3>Services (' + services.length + ')</h3></div>'
    + '<table><thead><tr><th>Nom</th><th>Code</th><th>Lits</th><th>Statut</th></tr></thead>'
    + '<tbody>' + (services.length === 0 ? '<tr><td colspan="4" class="empty">Aucun service</td></tr>' : servRows) + '</tbody></table></div>'
    + '</div></body></html>'
}

function comptesListePage(profil: any, comptes: any[]): string {
  const rows = comptes.map((cp: any) => {
    const structure = (cp.struct_structures as any)?.nom ?? '—'
    const dt = new Date(cp.created_at).toLocaleDateString('fr-FR')
    const toggleBtn = '<form method="POST" action="/admin/comptes/' + cp.id + '/toggle" style="display:inline">'
      + '<button type="submit" class="' + (cp.est_actif ? 'btn-danger' : 'btn-primary') + '" style="font-size:11px;padding:5px 10px;">'
      + (cp.est_actif ? 'Désactiver' : 'Activer') + '</button></form>'
    return '<tr><td><strong>' + cp.prenom + ' ' + cp.nom + '</strong></td>'
      + '<td><span class="badge ' + cp.role + '">' + cp.role.replace(/_/g, ' ') + '</span></td>'
      + '<td>' + structure + '</td>'
      + '<td><span class="badge ' + (cp.est_actif ? 'actif' : 'inactif') + '">' + (cp.est_actif ? 'Actif' : 'Inactif') + '</span></td>'
      + '<td>' + dt + '</td><td>' + toggleBtn + '</td></tr>'
  }).join('')
  const tbody = comptes.length === 0
    ? '<tr><td colspan="6" class="empty">Aucun compte. <a href="/admin/comptes/nouveau" style="color:var(--vert);">Créer le premier &#8594;</a></td></tr>'
    : rows
  const succes = false // flag placeholder — url ?succes= géré côté client si besoin
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SantéBF — Comptes</title>' + CSS + '</head><body>'
    + headerHtml(profil)
    + '<div class="container">'
    + '<div class="breadcrumb"><a href="/dashboard/admin">Accueil</a> &#8594; Comptes</div>'
    + '<div class="top-bar"><div><div class="page-title">Comptes utilisateurs</div><div class="page-sub">' + comptes.length + ' compte(s)</div></div>'
    + '<a href="/admin/comptes/nouveau" class="btn-primary">+ Créer un compte</a></div>'
    + '<div class="card"><table><thead><tr><th>Nom</th><th>Rôle</th><th>Structure</th><th>Statut</th><th>Créé le</th><th>Actions</th></tr></thead>'
    + '<tbody>' + tbody + '</tbody></table></div></div></body></html>'
}

function compteFormPage(profil: any, structures: any[], erreur?: string): string {
  const err = erreur ? '<div class="alerte-err">&#9888; ' + erreur + '</div>' : ''
  const structOpts = structures.map((s: any) =>
    '<option value="' + s.id + '">' + s.nom + ' (' + s.type + ')</option>'
  ).join('')

  // ✅ super_admin dans la liste
  const rolesOpts = [
    ['super_admin',     '&#11088; Super Admin (Ministère)'],
    ['admin_structure', 'Admin structure'],
    ['medecin',         'Médecin'],
    ['infirmier',       'Infirmier(e)'],
    ['sage_femme',      'Sage-femme'],
    ['pharmacien',      'Pharmacien(ne)'],
    ['laborantin',      'Laborantin(e)'],
    ['radiologue',      'Radiologue'],
    ['caissier',        'Caissier(e)'],
    ['agent_accueil',   'Agent d\'accueil'],
    ['patient',         'Patient'],
  ].map(([val, lbl]) => '<option value="' + val + '">' + lbl + '</option>').join('')

  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SantéBF — Nouveau compte</title>' + CSS + '</head><body>'
    + headerHtml(profil)
    + '<div class="container">'
    + '<div class="breadcrumb"><a href="/dashboard/admin">Accueil</a> &#8594; <a href="/admin/comptes">Comptes</a> &#8594; Nouveau</div>'
    + '<div class="page-title">Créer un compte utilisateur</div>'
    + '<div class="page-sub">Le compte sera créé dans Supabase Auth et le profil configuré automatiquement.</div>'
    + err
    + '<div class="card" style="padding:28px;"><form method="POST" action="/admin/comptes/nouveau">'
    + '<div class="form-grid">'
    + '<div class="form-group"><label>Prénom *</label><input type="text" name="prenom" placeholder="Ex: Apollinaire" required></div>'
    + '<div class="form-group"><label>Nom *</label><input type="text" name="nom" placeholder="Ex: Kaboré" required></div>'
    + '<div class="form-group full"><label>Email *</label><input type="email" name="email" placeholder="Ex: dr.kabore@santebf.bf" required></div>'
    + '<div class="form-group"><label>Mot de passe temporaire *</label><input type="text" name="password" placeholder="Ex: SanteBF@2025#" required>'
    + '<small style="font-size:11px;color:var(--soft);margin-top:4px;">L\'utilisateur devra le changer à la 1ère connexion</small></div>'
    + '<div class="form-group"><label>Rôle *</label><select name="role" required id="roleSelect" onchange="toggleFields(this.value)">'
    + '<option value="">Choisir un rôle...</option>' + rolesOpts + '</select></div>'
    + '<div class="form-group" id="structureField"><label>Structure d\'affectation</label>'
    + '<select name="structure_id"><option value="">Aucune (Super Admin)</option>' + structOpts + '</select>'
    + '<small id="structureNote" style="font-size:11px;color:var(--soft);margin-top:4px;display:none;">Requis pour ce rôle</small></div>'
    + '<div class="form-group medecin-fields" id="medecinFields"><label>N° Ordre national médecin</label><input type="text" name="numero_ordre" placeholder="Ex: MED-BF-2019-00342"></div>'
    + '<div class="form-group medecin-fields" id="medecinFields2"><label>Spécialité principale</label><input type="text" name="specialite" placeholder="Ex: Cardiologie"></div>'
    + '</div>'
    + '<div class="form-actions"><a href="/admin/comptes" class="btn-secondary">Annuler</a><button type="submit" class="btn-primary">Créer le compte &#8594;</button></div>'
    + '</form></div></div>'
    + '<script>'
    + 'function toggleFields(role){'
    + 'var isMed=role==="medecin";'
    + 'var isSA=role==="super_admin";'
    + 'document.getElementById("medecinFields").className="form-group medecin-fields"+(isMed?" visible":"");'
    + 'document.getElementById("medecinFields2").className="form-group medecin-fields"+(isMed?" visible":"");'
    + 'var note=document.getElementById("structureNote");'
    + 'note.style.display=(!isSA&&role)?"block":"none";'
    + 'note.textContent=isSA?"":"Requis pour ce rôle";'
    + '}'
    + '</script>'
    + '</body></html>'
}

function statsPage(profil: any, stats: any): string {
  const parTypeRows = Object.entries(stats.parType).map(([type, nb]: [string, any]) =>
    '<tr><td><span class="type-badge">' + type + '</span></td><td><strong>' + nb + '</strong></td></tr>'
  ).join('')
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SantéBF — Statistiques</title>' + CSS + '</head><body>'
    + headerHtml(profil)
    + '<div class="container">'
    + '<div class="breadcrumb"><a href="/dashboard/admin">Accueil</a> &#8594; Statistiques</div>'
    + '<div class="page-title">Statistiques nationales</div>'
    + '<div class="page-sub">Vue d\'ensemble du système SantéBF</div>'
    + '<div class="stat-row">'
    + '<div class="sc"><div class="sc-icon">&#128193;</div><div class="sc-val">' + stats.nbPatients + '</div><div class="sc-lbl">Dossiers patients</div></div>'
    + '<div class="sc"><div class="sc-icon">&#127973;</div><div class="sc-val">' + stats.nbStructures + '</div><div class="sc-lbl">Structures</div></div>'
    + '<div class="sc"><div class="sc-icon">&#128203;</div><div class="sc-val">' + stats.nbConsults + '</div><div class="sc-lbl">Consultations</div></div>'
    + '<div class="sc"><div class="sc-icon">&#128138;</div><div class="sc-val">' + stats.nbOrdonnances + '</div><div class="sc-lbl">Ordonnances</div></div>'
    + '</div>'
    + '<div class="card"><div class="card-header"><h3>Structures par type</h3></div>'
    + '<table><thead><tr><th>Type</th><th>Nombre</th></tr></thead>'
    + '<tbody>' + (Object.keys(stats.parType).length === 0 ? '<tr><td colspan="2" class="empty">Aucune donnée</td></tr>' : parTypeRows) + '</tbody></table></div>'
    + '</div></body></html>'
}

function geoPage(profil: any, data: { regions: any[]; provinces: any[]; villes: any[] }): string {
  const succes = false

  const regionRows = data.regions.map((r: any) =>
    '<tr><td><strong>' + r.nom + '</strong></td><td><code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:11px;">' + (r.code ?? '—') + '</code></td></tr>'
  ).join('')

  const provRows = data.provinces.map((p: any) =>
    '<tr><td><strong>' + p.nom + '</strong></td><td>' + (p.geo_regions?.nom ?? '—') + '</td><td><code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:11px;">' + (p.code ?? '—') + '</code></td></tr>'
  ).join('')

  const villeRows = data.villes.slice(0, 50).map((v: any) =>
    '<tr><td><strong>' + v.nom + '</strong></td><td>' + (v.geo_provinces?.nom ?? '—') + '</td><td>' + (v.geo_provinces?.geo_regions?.nom ?? '—') + '</td></tr>'
  ).join('')

  const regOpts = data.regions.map((r: any) =>
    '<option value="' + r.id + '">' + r.nom + '</option>'
  ).join('')

  const provOpts = data.provinces.map((p: any) =>
    '<option value="' + p.id + '">' + p.nom + ' (' + (p.geo_regions?.nom ?? '—') + ')</option>'
  ).join('')

  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SantéBF — Géographie</title>' + CSS + '</head><body>'
    + headerHtml(profil)
    + '<div class="container">'
    + '<div class="breadcrumb"><a href="/dashboard/admin">Accueil</a> &#8594; Géographie</div>'
    + '<div class="page-title">Gestion géographique</div>'
    + '<div class="page-sub">Régions, provinces et villes du Burkina Faso</div>'
    + '<div class="geo-grid">'

    // Colonne Régions
    + '<div>'
    + '<div class="mini-form"><h4>&#10133; Ajouter une région</h4>'
    + '<form method="POST" action="/admin/geo/regions">'
    + '<input type="text" name="nom" placeholder="Nom de la région" required>'
    + '<input type="text" name="code" placeholder="Code (ex: CENTRE)" required>'
    + '<button type="submit">Ajouter</button>'
    + '</form></div>'
    + '<div class="card"><div class="card-header"><h3>Régions (' + data.regions.length + ')</h3></div>'
    + '<table><thead><tr><th>Nom</th><th>Code</th></tr></thead>'
    + '<tbody>' + (data.regions.length === 0 ? '<tr><td colspan="2" class="empty">Aucune région</td></tr>' : regionRows) + '</tbody></table></div>'
    + '</div>'

    // Colonne Provinces
    + '<div>'
    + '<div class="mini-form"><h4>&#10133; Ajouter une province</h4>'
    + '<form method="POST" action="/admin/geo/provinces">'
    + '<input type="text" name="nom" placeholder="Nom de la province" required>'
    + '<input type="text" name="code" placeholder="Code (ex: KADIOGO)" required>'
    + '<select name="region_id" required><option value="">Région *</option>' + regOpts + '</select>'
    + '<button type="submit">Ajouter</button>'
    + '</form></div>'
    + '<div class="card"><div class="card-header"><h3>Provinces (' + data.provinces.length + ')</h3></div>'
    + '<table><thead><tr><th>Nom</th><th>Région</th><th>Code</th></tr></thead>'
    + '<tbody>' + (data.provinces.length === 0 ? '<tr><td colspan="3" class="empty">Aucune province</td></tr>' : provRows) + '</tbody></table></div>'
    + '</div>'

    // Colonne Villes
    + '<div>'
    + '<div class="mini-form"><h4>&#10133; Ajouter une ville</h4>'
    + '<form method="POST" action="/admin/geo/villes">'
    + '<input type="text" name="nom" placeholder="Nom de la ville" required>'
    + '<select name="province_id" required><option value="">Province *</option>' + provOpts + '</select>'
    + '<button type="submit">Ajouter</button>'
    + '</form></div>'
    + '<div class="card"><div class="card-header"><h3>Villes (' + data.villes.length + (data.villes.length >= 200 ? '+' : '') + ')</h3></div>'
    + '<table><thead><tr><th>Nom</th><th>Province</th><th>Région</th></tr></thead>'
    + '<tbody>' + (data.villes.length === 0 ? '<tr><td colspan="3" class="empty">Aucune ville</td></tr>' : villeRows) + '</tbody></table></div>'
    + '</div>'

    + '</div>'
    + '</div></body></html>'
}
