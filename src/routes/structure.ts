/**
 * src/routes/structure.ts
 * SantéBF — Routes Admin Structure
 * Monté sur /structure dans functions/[[path]].ts
 *
 * Routes couvertes :
 *   GET  /personnel                    Liste du personnel
 *   GET  /personnel/nouveau            Formulaire nouveau compte
 *   POST /personnel/nouveau            Créer un compte
 *   GET  /personnel/:id                Fiche d'un employé
 *   POST /personnel/:id/modifier       Modifier un compte (statut, role…)
 *   POST /personnel/:id/reset-mdp     Réinitialiser MDP + email
 *   GET  /services                     Liste des services
 *   GET  /services/nouveau             Formulaire nouveau service
 *   POST /services/nouveau             Créer un service
 *   GET  /services/:id/modifier        Formulaire modification service
 *   POST /services/:id/modifier        Sauvegarder modification service
 *   GET  /lits                         Liste des lits par service
 *   POST /lits/:id/statut              Changer statut d'un lit (maintenance ↔ disponible)
 *   GET  /hospitalisations             Hospitalisations en cours + alertes
 *   GET  /transferts                   Transferts entrants + sortants
 *   POST /transferts/:id/accepter      Accepter un transfert entrant
 *   POST /transferts/:id/refuser       Refuser un transfert entrant
 *   GET  /statistiques                 Stats par période
 *   GET  /finances                     Dashboard financier
 *   GET  /finances/factures            Liste des factures
 *   GET  /configuration                Config de la structure
 *   POST /configuration                Sauvegarder config
 *   POST /configuration/logo           Upload logo (base64 → Supabase Storage)
 *   GET  /logs                         Logs d'accès
 */
import { Hono }               from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase }        from '../lib/supabase'
import type { AuthProfile, Bindings } from '../lib/supabase'
import { structureLayout }    from '../pages/dashboard-structure'
import { sendEmail }          from '../utils/email'

export const structureRoutes = new Hono<{ Bindings: Bindings }>()
structureRoutes.use('/*', requireAuth, requireRole('admin_structure'))

// ── Helpers ───────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  medecin:       'Médecin',
  infirmier:     'Infirmier(e)',
  sage_femme:    'Sage-femme',
  pharmacien:    'Pharmacien(ne)',
  laborantin:    'Laborantin(e)',
  radiologue:    'Radiologue',
  caissier:      'Caissier(ère)',
  agent_accueil: 'Agent d\'accueil',
}

const ROLES_CREABLES = Object.keys(ROLE_LABELS)

function fcfa(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

function genererMdpTemporaire(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789@#$%'
  let mdp = ''
  // Au moins 1 maj, 1 chiffre, 1 spécial
  mdp += 'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 23)]
  mdp += '23456789'[Math.floor(Math.random() * 8)]
  mdp += '@#$%'[Math.floor(Math.random() * 4)]
  for (let i = 0; i < 5; i++) mdp += chars[Math.floor(Math.random() * chars.length)]
  return mdp.split('').sort(() => Math.random() - 0.5).join('')
}

// ═══════════════════════════════════════════════════════════════
// PERSONNEL — LISTE
// ═══════════════════════════════════════════════════════════════
structureRoutes.get('/personnel', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const filtreRole   = c.req.query('role')   || ''
  const filtreStatut = c.req.query('statut') || ''
  const q            = c.req.query('q')      || ''
  const succes       = c.req.query('succes') || ''

  let query = supabase
    .from('auth_profiles')
    .select('id, nom, prenom, role, est_actif, created_at, derniere_connexion, avatar_url')
    .eq('structure_id', profil.structure_id)
    .not('role', 'eq', 'patient')
    .not('role', 'eq', 'admin_structure')
    .not('role', 'eq', 'super_admin')
    .order('nom', { ascending: true })

  if (filtreRole)   query = query.eq('role', filtreRole)
  if (filtreStatut === 'actif')   query = query.eq('est_actif', true)
  if (filtreStatut === 'inactif') query = query.eq('est_actif', false)
  if (q.length >= 2) query = query.or(`nom.ilike.%${q}%,prenom.ilike.%${q}%`)

  const { data: personnel } = await query

  const total  = (personnel ?? []).length
  const actifs = (personnel ?? []).filter((p: any) => p.est_actif).length

  const filtresHtml = `
<div class="card" style="padding:14px 18px;margin-bottom:14px;">
  <form method="GET" action="/structure/personnel" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
    <div style="flex:1;min-width:140px;">
      <label class="form-label">Rôle</label>
      <select name="role" style="padding:8px 12px;font-size:13px;">
        <option value="">Tous les rôles</option>
        ${Object.entries(ROLE_LABELS).map(([k, v]) =>
          `<option value="${k}"${filtreRole === k ? ' selected' : ''}>${v}</option>`
        ).join('')}
      </select>
    </div>
    <div style="flex:1;min-width:120px;">
      <label class="form-label">Statut</label>
      <select name="statut" style="padding:8px 12px;font-size:13px;">
        <option value="">Tous</option>
        <option value="actif"${filtreStatut === 'actif' ? ' selected' : ''}>Actif</option>
        <option value="inactif"${filtreStatut === 'inactif' ? ' selected' : ''}>Inactif</option>
      </select>
    </div>
    <div style="flex:2;min-width:160px;">
      <label class="form-label">Recherche</label>
      <input type="text" name="q" placeholder="Nom ou prénom…" value="${q}" style="padding:8px 12px;font-size:13px;">
    </div>
    <button type="submit" class="btn btn-or" style="margin-bottom:1px;">🔍 Filtrer</button>
    <a href="/structure/personnel" class="btn btn-soft" style="margin-bottom:1px;">✕</a>
  </form>
</div>`

  const tableRows = (personnel ?? []).map((p: any) => {
    const derniereConn = p.derniere_connexion
      ? new Date(p.derniere_connexion).toLocaleDateString('fr-FR')
      : 'Jamais'
    const ini = `${(p.prenom || '?').charAt(0)}${(p.nom || '?').charAt(0)}`
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:34px;height:34px;border-radius:8px;background:var(--or-c);
            display:flex;align-items:center;justify-content:center;font-size:12px;
            font-weight:700;color:var(--or-f);flex-shrink:0;">${ini}</div>
          <div>
            <div style="font-weight:700;">${p.prenom} ${p.nom}</div>
          </div>
        </div>
      </td>
      <td><span class="badge b-bleu">${ROLE_LABELS[p.role] || p.role}</span></td>
      <td><span class="badge ${p.est_actif ? 'b-vert' : 'b-gris'}">${p.est_actif ? '✓ Actif' : 'Inactif'}</span></td>
      <td>${derniereConn}</td>
      <td>
        <a href="/structure/personnel/${p.id}" class="btn btn-soft" style="font-size:12px;padding:6px 10px;">Voir</a>
      </td>
    </tr>`
  }).join('')

  const content = `
<div class="page-header">
  <div>
    <div class="page-title">👥 Personnel (${total})</div>
    <div style="font-size:12px;color:var(--soft);margin-top:3px;">${actifs} actif(s)</div>
  </div>
  <a href="/structure/personnel/nouveau" class="btn btn-or">➕ Nouveau compte</a>
</div>
${filtresHtml}
<div class="card">
  ${(personnel ?? []).length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Employé</th>
        <th>Rôle</th>
        <th>Statut</th>
        <th>Dernière connexion</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>` : '<div class="empty">Aucun personnel trouvé</div>'}
</div>`

  return c.html(structureLayout(profil, 'Personnel', 'personnel', content,
    succes === 'compte_cree' ? 'Compte créé avec succès — email envoyé.' :
    succes === 'modifie'     ? 'Compte mis à jour.' :
    succes === 'mdp_reset'   ? 'Mot de passe réinitialisé — email envoyé.' : undefined
  ))
})

// ═══════════════════════════════════════════════════════════════
// PERSONNEL — NOUVEAU (GET + POST)
// ═══════════════════════════════════════════════════════════════
structureRoutes.get('/personnel/nouveau', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const erreur   = c.req.query('erreur') || ''

  const { data: services } = await supabase
    .from('struct_services')
    .select('id, nom')
    .eq('structure_id', profil.structure_id)
    .eq('est_actif', true)
    .order('nom')

  const content = `
<div class="page-header">
  <div class="page-title">➕ Nouveau compte personnel</div>
  <a href="/structure/personnel" class="back-btn">← Retour</a>
</div>
${erreur ? `<div class="flash-err">⚠️ ${decodeURIComponent(erreur)}</div>` : ''}
<div class="card">
  <form method="POST" action="/structure/personnel/nouveau">
    <div class="grid2">
      <div class="form-group">
        <label class="form-label">Prénom *</label>
        <input type="text" name="prenom" placeholder="Ex: Aminata" required>
      </div>
      <div class="form-group">
        <label class="form-label">Nom *</label>
        <input type="text" name="nom" placeholder="Ex: TRAORÉ" required>
      </div>
    </div>
    <div class="grid2">
      <div class="form-group">
        <label class="form-label">Email *</label>
        <input type="email" name="email" placeholder="email@exemple.com" required>
      </div>
      <div class="form-group">
        <label class="form-label">Téléphone</label>
        <input type="tel" name="telephone" placeholder="70 12 34 56">
      </div>
    </div>
    <div class="grid2">
      <div class="form-group">
        <label class="form-label">Rôle *</label>
        <select name="role" id="roleSelect" required onchange="onRoleChange()">
          <option value="">Sélectionner un rôle…</option>
          ${ROLES_CREABLES.map(r =>
            `<option value="${r}">${ROLE_LABELS[r]}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Service</label>
        <select name="service_id">
          <option value="">Aucun service spécifique</option>
          ${(services ?? []).map((s: any) =>
            `<option value="${s.id}">${s.nom}</option>`
          ).join('')}
        </select>
      </div>
    </div>
    <div id="medecinFields" style="display:none;">
      <div class="info-box">Les champs ci-dessous sont requis pour les médecins.</div>
      <div class="grid2">
        <div class="form-group">
          <label class="form-label">N° ordre national médecin</label>
          <input type="text" name="numero_ordre" placeholder="MED-BF-2019-00342">
        </div>
        <div class="form-group">
          <label class="form-label">Spécialité principale</label>
          <input type="text" name="specialite" placeholder="Ex: Cardiologie">
        </div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Mot de passe temporaire</label>
      <div style="display:flex;gap:10px;align-items:center;">
        <input type="text" name="mdp_temp" id="mdpField" placeholder="Laissez vide pour générer automatiquement">
        <button type="button" onclick="genMdp()" class="btn btn-soft" style="white-space:nowrap;">🔀 Générer</button>
      </div>
      <div style="font-size:12px;color:var(--soft);margin-top:4px;">8 car. min · 1 majuscule · 1 chiffre · 1 spécial (#@$%)</div>
    </div>
    <button type="submit" class="btn btn-or" style="padding:13px 28px;font-size:15px;margin-top:6px;">
      ✅ Créer le compte
    </button>
  </form>
</div>
<script>
function onRoleChange(){
  var r=document.getElementById('roleSelect').value;
  document.getElementById('medecinFields').style.display=r==='medecin'?'block':'none';
}
function genMdp(){
  var chars='abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789@#$%';
  var mdp='ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random()*23)];
  mdp+='23456789'[Math.floor(Math.random()*8)];
  mdp+='@#$%'[Math.floor(Math.random()*4)];
  for(var i=0;i<5;i++)mdp+=chars[Math.floor(Math.random()*chars.length)];
  mdp=mdp.split('').sort(function(){return Math.random()-.5;}).join('');
  document.getElementById('mdpField').value=mdp;
}
</script>`

  return c.html(structureLayout(profil, 'Nouveau compte', 'personnel', content))
})

structureRoutes.post('/personnel/nouveau', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()

  const email     = String(body.email     || '').trim().toLowerCase()
  const nom       = String(body.nom       || '').trim().toUpperCase()
  const prenom    = String(body.prenom    || '').trim()
  const role      = String(body.role      || '').trim()
  const telephone = String(body.telephone || '').trim()
  const serviceId = String(body.service_id || '').trim() || null
  const mdpSaisi  = String(body.mdp_temp  || '').trim()

  if (!email || !nom || !prenom || !role) {
    return c.redirect('/structure/personnel/nouveau?erreur=' +
      encodeURIComponent('Prénom, nom, email et rôle sont obligatoires.'))
  }
  if (!ROLES_CREABLES.includes(role)) {
    return c.redirect('/structure/personnel/nouveau?erreur=' +
      encodeURIComponent('Rôle non autorisé.'))
  }

  const mdp = mdpSaisi.length >= 8 ? mdpSaisi : genererMdpTemporaire()

  // 1. Créer le compte Supabase Auth
  const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: mdp,
    email_confirm: true,
    user_metadata: { nom, prenom, role, telephone },
  })

  if (error || !data?.user) {
    const msg = error?.message?.includes('already')
      ? 'Cet email est déjà utilisé dans le système.'
      : 'Erreur création compte : ' + (error?.message || 'Inconnue')
    return c.redirect('/structure/personnel/nouveau?erreur=' + encodeURIComponent(msg))
  }

  const userId = data.user.id

  // 2. Compléter auth_profiles
  await supabase.from('auth_profiles').update({
    nom, prenom, role,
    telephone:          telephone || null,
    structure_id:       profil.structure_id,
    doit_changer_mdp:   true,
    est_actif:          true,
  }).eq('id', userId)

  // 3. Si médecin → créer auth_medecins
  if (role === 'medecin') {
    const numeroOrdre = String(body.numero_ordre || '').trim()
    const specialite  = String(body.specialite   || '').trim()
    if (numeroOrdre && specialite) {
      await supabase.from('auth_medecins').insert({
        profile_id:            userId,
        numero_ordre_national: numeroOrdre,
        specialite_principale: specialite,
      })
    }
  }

  // 4. Si infirmier/sage_femme/etc → auth_paramedical
  if (['infirmier', 'sage_femme', 'laborantin', 'radiologue'].includes(role)) {
    await supabase.from('auth_paramedical').insert({
      profile_id:   userId,
      service_id:   serviceId,
    }).select().maybeSingle()
  }

  // 5. Email de bienvenue
  if (c.env.RESEND_API_KEY) {
    await sendEmail({
      to:      email,
      subject: `Bienvenue sur SantéBF — Vos accès`,
      html: `<p>Bonjour <strong>${prenom} ${nom}</strong>,</p>
<p>Votre compte SantéBF a été créé avec le rôle : <strong>${ROLE_LABELS[role]}</strong>.</p>
<p><strong>Email :</strong> ${email}<br><strong>Mot de passe temporaire :</strong> ${mdp}</p>
<p>⚠️ Vous devrez changer ce mot de passe à la première connexion.</p>
<p><a href="https://santebf.izicardouaga.com/auth/login">Se connecter →</a></p>`,
    }, c.env.RESEND_API_KEY)
  }

  return c.redirect('/structure/personnel?succes=compte_cree')
})

// ═══════════════════════════════════════════════════════════════
// PERSONNEL — FICHE EMPLOYÉ
// ═══════════════════════════════════════════════════════════════
structureRoutes.get('/personnel/:id', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')
  const succes   = c.req.query('succes') || ''

  const { data: emp } = await supabase
    .from('auth_profiles')
    .select('id, nom, prenom, role, est_actif, created_at, derniere_connexion, telephone, email, avatar_url, doit_changer_mdp')
    .eq('id', id)
    .eq('structure_id', profil.structure_id)
    .single()

  if (!emp) {
    return c.redirect('/structure/personnel')
  }

  const ini = `${(emp.prenom || '?').charAt(0)}${(emp.nom || '?').charAt(0)}`

  const content = `
<div class="page-header">
  <div class="page-title">👤 ${emp.prenom} ${emp.nom}</div>
  <a href="/structure/personnel" class="back-btn">← Retour</a>
</div>
<div class="grid2">
  <div class="card">
    <div class="card-hd"><div class="card-title">Informations</div></div>
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
      <div style="width:56px;height:56px;border-radius:12px;background:var(--or-c);
        display:flex;align-items:center;justify-content:center;font-size:20px;
        font-weight:700;color:var(--or-f);">${ini}</div>
      <div>
        <div style="font-size:18px;font-weight:700;">${emp.prenom} ${emp.nom}</div>
        <span class="badge b-bleu">${ROLE_LABELS[emp.role] || emp.role}</span>
      </div>
    </div>
    <div style="border-top:1px solid var(--bordure);padding-top:14px;">
      ${[
        ['Email', emp.email || '—'],
        ['Téléphone', emp.telephone || '—'],
        ['Statut', emp.est_actif ? '✓ Actif' : 'Inactif'],
        ['Compte créé le', new Date(emp.created_at).toLocaleDateString('fr-FR')],
        ['Dernière connexion', emp.derniere_connexion ? new Date(emp.derniere_connexion).toLocaleDateString('fr-FR') : 'Jamais'],
        ['MDP temporaire', emp.doit_changer_mdp ? '⚠️ Non encore changé' : '✓ OK'],
      ].map(([l, v]) =>
        `<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--bordure);">
          <span style="font-size:12px;font-weight:700;color:var(--soft);">${l}</span>
          <span style="font-size:13px;font-weight:600;">${v}</span>
        </div>`
      ).join('')}
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:12px;">
    <div class="card">
      <div class="card-title" style="margin-bottom:14px;">⚡ Actions rapides</div>
      <form method="POST" action="/structure/personnel/${emp.id}/modifier" style="margin-bottom:10px;">
        <input type="hidden" name="est_actif" value="${emp.est_actif ? 'false' : 'true'}">
        <button type="submit" class="btn ${emp.est_actif ? 'btn-rouge' : 'btn-vert'}" style="width:100%;justify-content:center;padding:12px;">
          ${emp.est_actif ? '🔒 Désactiver le compte' : '🔓 Activer le compte'}
        </button>
      </form>
      <form method="POST" action="/structure/personnel/${emp.id}/reset-mdp">
        <button type="submit" class="btn btn-soft" style="width:100%;justify-content:center;padding:12px;">
          🔑 Réinitialiser le mot de passe
        </button>
      </form>
    </div>
    <div class="card">
      <div class="card-title" style="margin-bottom:12px;">⚙️ Modifier</div>
      <form method="POST" action="/structure/personnel/${emp.id}/modifier">
        <div class="form-group">
          <label class="form-label">Rôle</label>
          <select name="role">
            ${ROLES_CREABLES.map(r =>
              `<option value="${r}"${r === emp.role ? ' selected' : ''}>${ROLE_LABELS[r]}</option>`
            ).join('')}
          </select>
        </div>
        <button type="submit" class="btn btn-or" style="width:100%;justify-content:center;padding:12px;">
          💾 Enregistrer
        </button>
      </form>
    </div>
  </div>
</div>`

  return c.html(structureLayout(profil, `${emp.prenom} ${emp.nom}`, 'personnel', content,
    succes === 'modifie'    ? 'Compte mis à jour.' :
    succes === 'mdp_reset'  ? 'Mot de passe réinitialisé — email envoyé.' : undefined
  ))
})

structureRoutes.post('/personnel/:id/modifier', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')
  const body     = await c.req.parseBody()

  const update: Record<string, any> = {}
  if (body.est_actif !== undefined) update.est_actif = body.est_actif === 'true'
  if (body.role && ROLES_CREABLES.includes(String(body.role))) update.role = body.role

  if (Object.keys(update).length > 0) {
    await supabase.from('auth_profiles')
      .update(update)
      .eq('id', id)
      .eq('structure_id', profil.structure_id)
  }
  return c.redirect(`/structure/personnel/${id}?succes=modifie`, 303)
})

structureRoutes.post('/personnel/:id/reset-mdp', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')

  const { data: emp } = await supabase
    .from('auth_profiles')
    .select('email, nom, prenom')
    .eq('id', id)
    .eq('structure_id', profil.structure_id)
    .single()

  if (!emp) return c.redirect('/structure/personnel', 303)

  const nvMdp = genererMdpTemporaire()
  const sb    = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  await sb.auth.admin.updateUserById(id, { password: nvMdp })
  await supabase.from('auth_profiles').update({ doit_changer_mdp: true }).eq('id', id)

  if (c.env.RESEND_API_KEY && emp.email) {
    await sendEmail({
      to:      emp.email,
      subject: 'SantéBF — Réinitialisation de votre mot de passe',
      html: `<p>Bonjour <strong>${emp.prenom} ${emp.nom}</strong>,</p>
<p>Votre mot de passe a été réinitialisé par l'administrateur.</p>
<p><strong>Nouveau mot de passe temporaire :</strong> ${nvMdp}</p>
<p>Vous devrez le changer à la prochaine connexion.</p>
<p><a href="https://santebf.izicardouaga.com/auth/login">Se connecter →</a></p>`,
    }, c.env.RESEND_API_KEY)
  }
  return c.redirect(`/structure/personnel/${id}?succes=mdp_reset`, 303)
})

// ═══════════════════════════════════════════════════════════════
// SERVICES
// ═══════════════════════════════════════════════════════════════
structureRoutes.get('/services', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const succes   = c.req.query('succes') || ''

  const { data: services } = await supabase
    .from('struct_services')
    .select('id, nom, code, nb_lits_total, est_actif, telephone_direct')
    .eq('structure_id', profil.structure_id)
    .order('nom')

  // Compter les lits par service
  const { data: litsStats } = await supabase
    .from('struct_lits')
    .select('service_id, statut')
    .eq('structure_id', profil.structure_id)

  const litsByService: Record<string, Record<string, number>> = {}
  ;(litsStats ?? []).forEach((l: any) => {
    if (!litsByService[l.service_id]) litsByService[l.service_id] = {}
    litsByService[l.service_id][l.statut] = (litsByService[l.service_id][l.statut] || 0) + 1
  })

  const rows = (services ?? []).map((s: any) => {
    const lits  = litsByService[s.id] || {}
    const occ   = lits.occupe   || 0
    const disp  = lits.disponible || 0
    const total = Object.values(lits).reduce((a: number, b) => a + (b as number), 0)
    return `<tr>
      <td><strong>${s.nom}</strong>${s.code ? ` <span style="font-size:11px;color:var(--soft);">(${s.code})</span>` : ''}</td>
      <td style="text-align:center;">
        <span style="font-size:13px;font-weight:700;color:var(--rouge);">${occ}</span>
        <span style="color:var(--soft);"> / </span>
        <span style="font-size:13px;font-weight:700;color:var(--vert);">${disp}</span>
        <span style="color:var(--soft);"> / ${total}</span>
      </td>
      <td><span class="badge ${s.est_actif ? 'b-vert' : 'b-gris'}">${s.est_actif ? 'Actif' : 'Inactif'}</span></td>
      <td>
        <a href="/structure/services/${s.id}/modifier" class="btn btn-soft" style="font-size:12px;padding:6px 10px;">✏️ Modifier</a>
        <a href="/structure/lits?service=${s.id}" class="btn btn-or" style="font-size:12px;padding:6px 10px;margin-left:4px;">🛏️ Lits</a>
      </td>
    </tr>`
  }).join('')

  const content = `
<div class="page-header">
  <div class="page-title">🏥 Services (${(services ?? []).length})</div>
  <a href="/structure/services/nouveau" class="btn btn-or">➕ Nouveau service</a>
</div>
<div class="card">
  ${rows ? `<table>
    <thead><tr><th>Nom du service</th><th style="text-align:center;">Lits occ / disp / total</th><th>Statut</th><th>Actions</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>` : '<div class="empty">Aucun service configuré</div>'}
</div>`

  return c.html(structureLayout(profil, 'Services', 'services', content,
    succes === 'cree' ? 'Service créé.' : succes === 'modifie' ? 'Service mis à jour.' : undefined
  ))
})

structureRoutes.get('/services/nouveau', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  const content = `
<div class="page-header">
  <div class="page-title">➕ Nouveau service</div>
  <a href="/structure/services" class="back-btn">← Retour</a>
</div>
<div class="card">
  <form method="POST" action="/structure/services/nouveau">
    <div class="grid2">
      <div class="form-group">
        <label class="form-label">Nom du service *</label>
        <input type="text" name="nom" placeholder="Ex: Cardiologie, Urgences, Maternité" required>
      </div>
      <div class="form-group">
        <label class="form-label">Code court</label>
        <input type="text" name="code" placeholder="Ex: CARDIO, URG, MATERN">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea name="description" rows="3" placeholder="Description du service…"></textarea>
    </div>
    <div class="grid2">
      <div class="form-group">
        <label class="form-label">Nombre total de lits</label>
        <input type="number" name="nb_lits_total" value="0" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">Téléphone direct</label>
        <input type="tel" name="telephone_direct" placeholder="Ex: 25 30 XX XX">
      </div>
    </div>
    <button type="submit" class="btn btn-or" style="padding:13px 28px;font-size:15px;">✅ Créer le service</button>
  </form>
</div>`
  return c.html(structureLayout(profil, 'Nouveau service', 'services', content))
})

structureRoutes.post('/services/nouveau', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()

  await supabase.from('struct_services').insert({
    structure_id:    profil.structure_id,
    nom:             String(body.nom || '').trim(),
    code:            String(body.code || '').trim().toUpperCase() || null,
    description:     String(body.description || '').trim() || null,
    nb_lits_total:   parseInt(String(body.nb_lits_total || '0')) || 0,
    telephone_direct: String(body.telephone_direct || '').trim() || null,
    est_actif:       true,
  })
  return c.redirect('/structure/services?succes=cree', 303)
})

structureRoutes.get('/services/:id/modifier', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')

  const { data: s } = await supabase
    .from('struct_services').select('*').eq('id', id).eq('structure_id', profil.structure_id).single()
  if (!s) return c.redirect('/structure/services')

  const content = `
<div class="page-header">
  <div class="page-title">✏️ Modifier ${s.nom}</div>
  <a href="/structure/services" class="back-btn">← Retour</a>
</div>
<div class="card">
  <form method="POST" action="/structure/services/${id}/modifier">
    <div class="grid2">
      <div class="form-group">
        <label class="form-label">Nom du service *</label>
        <input type="text" name="nom" value="${s.nom}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Code court</label>
        <input type="text" name="code" value="${s.code || ''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea name="description" rows="3">${s.description || ''}</textarea>
    </div>
    <div class="grid2">
      <div class="form-group">
        <label class="form-label">Nombre total de lits</label>
        <input type="number" name="nb_lits_total" value="${s.nb_lits_total || 0}" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">Téléphone direct</label>
        <input type="tel" name="telephone_direct" value="${s.telephone_direct || ''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Statut</label>
      <select name="est_actif">
        <option value="true"${s.est_actif ? ' selected' : ''}>Actif</option>
        <option value="false"${!s.est_actif ? ' selected' : ''}>Inactif</option>
      </select>
    </div>
    <button type="submit" class="btn btn-or" style="padding:13px 28px;font-size:15px;">💾 Enregistrer</button>
  </form>
</div>`
  return c.html(structureLayout(profil, `Modifier ${s.nom}`, 'services', content))
})

structureRoutes.post('/services/:id/modifier', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')
  const body     = await c.req.parseBody()

  await supabase.from('struct_services').update({
    nom:              String(body.nom || '').trim(),
    code:             String(body.code || '').trim().toUpperCase() || null,
    description:      String(body.description || '').trim() || null,
    nb_lits_total:    parseInt(String(body.nb_lits_total || '0')) || 0,
    telephone_direct: String(body.telephone_direct || '').trim() || null,
    est_actif:        body.est_actif === 'true',
  }).eq('id', id).eq('structure_id', profil.structure_id)

  return c.redirect('/structure/services?succes=modifie', 303)
})

// ═══════════════════════════════════════════════════════════════
// LITS
// ═══════════════════════════════════════════════════════════════
structureRoutes.get('/lits', async (c) => {
  const profil     = c.get('profil' as never) as AuthProfile
  const supabase   = c.get('supabase' as never) as any
  const filtreServ = c.req.query('service') || ''
  const succes     = c.req.query('succes')  || ''

  let query = supabase
    .from('struct_lits')
    .select('id, numero_lit, chambre, type_lit, statut, service_id, struct_services(nom)')
    .eq('structure_id', profil.structure_id)
    .order('numero_lit')

  if (filtreServ) query = query.eq('service_id', filtreServ)

  const [{ data: lits }, { data: services }] = await Promise.all([
    query,
    supabase.from('struct_services').select('id, nom').eq('structure_id', profil.structure_id).eq('est_actif', true).order('nom'),
  ])

  const stats = {
    disponible:  (lits ?? []).filter((l: any) => l.statut === 'disponible').length,
    occupe:      (lits ?? []).filter((l: any) => l.statut === 'occupe').length,
    nettoyage:   (lits ?? []).filter((l: any) => l.statut === 'nettoyage').length,
    maintenance: (lits ?? []).filter((l: any) => l.statut === 'maintenance').length,
    total:       (lits ?? []).length,
  }

  const STATUT_BADGE: Record<string, string> = {
    disponible:  'b-vert',
    occupe:      'b-rouge',
    nettoyage:   'b-or',
    maintenance: 'b-gris',
  }

  const rows = (lits ?? []).map((l: any) => `<tr>
    <td><strong>${l.numero_lit}</strong>${l.chambre ? ` <span style="color:var(--soft);font-size:12px;">(${l.chambre})</span>` : ''}</td>
    <td>${(l.struct_services as any)?.nom || '—'}</td>
    <td style="font-size:12px;color:var(--soft);">${l.type_lit || 'standard'}</td>
    <td><span class="badge ${STATUT_BADGE[l.statut] || 'b-gris'}">${l.statut}</span></td>
    <td>
      ${l.statut === 'maintenance' ? `
        <form method="POST" action="/structure/lits/${l.id}/statut" style="display:inline;">
          <input type="hidden" name="statut" value="disponible">
          <button type="submit" class="btn btn-vert" style="font-size:12px;padding:5px 10px;">✓ Disponible</button>
        </form>` : ''}
      ${l.statut === 'nettoyage' ? `
        <form method="POST" action="/structure/lits/${l.id}/statut" style="display:inline;">
          <input type="hidden" name="statut" value="disponible">
          <button type="submit" class="btn btn-vert" style="font-size:12px;padding:5px 10px;">✓ Nettoyé</button>
        </form>` : ''}
      ${l.statut === 'disponible' ? `
        <form method="POST" action="/structure/lits/${l.id}/statut" style="display:inline;">
          <input type="hidden" name="statut" value="maintenance">
          <button type="submit" class="btn btn-soft" style="font-size:12px;padding:5px 10px;">🔧 Maintenance</button>
        </form>` : ''}
    </td>
  </tr>`).join('')

  const content = `
<div class="page-header">
  <div class="page-title">🛏️ Lits (${stats.total})</div>
</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;">
  ${[
    { label: 'Disponibles', val: stats.disponible, color: 'var(--vert)'  },
    { label: 'Occupés',     val: stats.occupe,     color: 'var(--rouge)' },
    { label: 'Nettoyage',   val: stats.nettoyage,  color: 'var(--or)'    },
    { label: 'Maintenance', val: stats.maintenance, color: 'var(--soft)'  },
  ].map(s => `
    <div class="card" style="text-align:center;padding:16px;">
      <div style="font-family:'Fraunces',serif;font-size:32px;font-weight:600;color:${s.color};">${s.val}</div>
      <div style="font-size:12px;color:var(--soft);">${s.label}</div>
    </div>`).join('')}
</div>
<div class="card" style="margin-bottom:14px;padding:12px 16px;">
  <form method="GET" action="/structure/lits" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
    <select name="service" style="padding:8px 12px;font-size:13px;border:1.5px solid var(--bordure);border-radius:var(--rs);">
      <option value="">Tous les services</option>
      ${(services ?? []).map((s: any) =>
        `<option value="${s.id}"${filtreServ === s.id ? ' selected' : ''}>${s.nom}</option>`
      ).join('')}
    </select>
    <button type="submit" class="btn btn-or">Filtrer</button>
    <a href="/structure/lits" class="btn btn-soft">✕</a>
  </form>
</div>
<div class="card">
  ${rows ? `<table>
    <thead><tr><th>N° Lit</th><th>Service</th><th>Type</th><th>Statut</th><th>Actions</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>` : '<div class="empty">Aucun lit trouvé</div>'}
</div>`

  return c.html(structureLayout(profil, 'Lits', 'lits', content,
    succes === 'ok' ? 'Statut du lit mis à jour.' : undefined
  ))
})

structureRoutes.post('/lits/:id/statut', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')
  const body     = await c.req.parseBody()
  const statut   = String(body.statut || '').trim()

  const STATUTS_MANUELS = ['disponible', 'maintenance', 'nettoyage']
  if (STATUTS_MANUELS.includes(statut)) {
    await supabase.from('struct_lits')
      .update({ statut })
      .eq('id', id)
      .eq('structure_id', profil.structure_id)
  }
  return c.redirect('/structure/lits?succes=ok', 303)
})

// ═══════════════════════════════════════════════════════════════
// HOSPITALISATIONS EN COURS
// ═══════════════════════════════════════════════════════════════
structureRoutes.get('/hospitalisations', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: hospit } = await supabase
    .from('medical_hospitalisations')
    .select(`
      id, date_entree, date_sortie_prevue, motif_admission, etat_a_l_entree, rapport_sortie_url,
      patient_dossiers (nom, prenom, numero_national),
      struct_lits (numero_lit, struct_services (nom)),
      auth_medecins!medical_hospitalisations_medecin_responsable_id_fkey (
        auth_profiles (nom, prenom)
      )
    `)
    .eq('structure_id', profil.structure_id)
    .is('date_sortie_reelle', null)
    .order('date_entree', { ascending: true })

  const now = new Date()

  const rows = (hospit ?? []).map((h: any) => {
    const patient  = h.patient_dossiers as any
    const lit      = h.struct_lits      as any
    const medProf  = h.auth_medecins?.auth_profiles as any
    const entree   = new Date(h.date_entree)
    const nbJours  = Math.floor((now.getTime() - entree.getTime()) / (1000 * 60 * 60 * 24))
    const alerte   = nbJours > 10 && !h.rapport_sortie_url
    const sortieDepassee = h.date_sortie_prevue && new Date(h.date_sortie_prevue) < now

    return `<tr style="${alerte ? 'background:#fff5f5;' : ''}">
      <td>
        <div style="font-weight:700;">${patient?.prenom || ''} ${patient?.nom || ''}</div>
        <div style="font-size:11px;font-family:monospace;color:var(--soft);">${patient?.numero_national || ''}</div>
      </td>
      <td>
        <div>${lit?.numero_lit || '—'}</div>
        <div style="font-size:11px;color:var(--soft);">${lit?.struct_services?.nom || ''}</div>
      </td>
      <td>
        <div style="font-weight:700;${nbJours > 10 ? 'color:var(--rouge);' : ''}">${nbJours} jour(s)</div>
        <div style="font-size:11px;color:var(--soft);">${entree.toLocaleDateString('fr-FR')}</div>
      </td>
      <td>
        ${sortieDepassee ? `<span class="badge b-rouge">⚠️ Dépassée</span>` :
          h.date_sortie_prevue ? new Date(h.date_sortie_prevue).toLocaleDateString('fr-FR') : '—'}
      </td>
      <td style="font-size:13px;">${medProf ? `Dr. ${medProf.prenom} ${medProf.nom}` : '—'}</td>
      <td>
        <div style="font-size:12px;">${h.motif_admission || '—'}</div>
        <span class="badge ${h.etat_a_l_entree === 'critique' ? 'b-rouge' : h.etat_a_l_entree === 'grave' ? 'b-or' : 'b-vert'}" style="font-size:10px;">${h.etat_a_l_entree || 'stable'}</span>
      </td>
      <td>
        ${alerte ? '<span class="badge b-rouge">⚠️ Rapport manquant</span>' :
          h.rapport_sortie_url ? '<span class="badge b-vert">✓ Rapport</span>' : ''}
      </td>
    </tr>`
  }).join('')

  const alertes = (hospit ?? []).filter((h: any) => {
    const nbJ = Math.floor((now.getTime() - new Date(h.date_entree).getTime()) / (1000 * 60 * 60 * 24))
    return nbJ > 10 && !h.rapport_sortie_url
  }).length

  const content = `
<div class="page-header">
  <div>
    <div class="page-title">📋 Hospitalisations en cours (${(hospit ?? []).length})</div>
    ${alertes > 0 ? `<div style="font-size:12px;color:var(--rouge);margin-top:3px;">⚠️ ${alertes} alerte(s) — rapport sortie manquant</div>` : ''}
  </div>
</div>
${alertes > 0 ? `<div class="alert-box">
  ⚠️ <strong>${alertes} patient(s) hospitalisé(s) depuis plus de 10 jours sans rapport de sortie.</strong>
  Contactez le médecin responsable.
</div>` : ''}
<div class="card">
  ${rows ? `<table>
    <thead><tr>
      <th>Patient</th><th>Lit / Service</th><th>Durée</th>
      <th>Sortie prévue</th><th>Médecin</th><th>Motif / État</th><th>Alertes</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>` : '<div class="empty">Aucune hospitalisation en cours</div>'}
</div>`

  return c.html(structureLayout(profil, 'Hospitalisations', 'hospit', content))
})

// ═══════════════════════════════════════════════════════════════
// TRANSFERTS
// ═══════════════════════════════════════════════════════════════
structureRoutes.get('/transferts', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const succes   = c.req.query('succes') || ''

  const [sortants, entrants] = await Promise.all([
    supabase.from('medical_transferts')
      .select(`
        id, statut, date_transfert, motif_transfert, etat_patient_transfert,
        patient_dossiers (nom, prenom, numero_national),
        struct_structures!medical_transferts_structure_destination_id_fkey (nom)
      `)
      .eq('structure_origine_id', profil.structure_id)
      .order('date_transfert', { ascending: false })
      .limit(20),
    supabase.from('medical_transferts')
      .select(`
        id, statut, date_transfert, motif_transfert, etat_patient_transfert, resume_clinique,
        patient_dossiers (nom, prenom, numero_national),
        struct_structures!medical_transferts_structure_origine_id_fkey (nom)
      `)
      .eq('structure_destination_id', profil.structure_id)
      .order('date_transfert', { ascending: false })
      .limit(20),
  ])

  const STATUT_B: Record<string, string> = {
    en_attente: 'b-or', accepte: 'b-vert', refuse: 'b-rouge',
    en_cours: 'b-bleu', arrive: 'b-vert',
  }

  const rowSortant = (t: any) => {
    const p   = t.patient_dossiers as any
    const dst = (t.struct_structures as any)?.nom || '—'
    const dt  = new Date(t.date_transfert).toLocaleDateString('fr-FR')
    return `<tr>
      <td><div style="font-weight:700;">${p?.prenom || ''} ${p?.nom || ''}</div>
          <div style="font-size:11px;color:var(--soft);">${p?.numero_national || ''}</div></td>
      <td>${dst}</td>
      <td>${dt}</td>
      <td><span class="badge ${STATUT_B[t.statut] || 'b-gris'}">${t.statut}</span></td>
      <td style="font-size:12px;color:var(--soft);">${t.motif_transfert || '—'}</td>
    </tr>`
  }

  const rowEntrant = (t: any) => {
    const p   = t.patient_dossiers as any
    const src = (t.struct_structures as any)?.nom || '—'
    const dt  = new Date(t.date_transfert).toLocaleDateString('fr-FR')
    const actionsHtml = t.statut === 'en_attente' ? `
      <form method="POST" action="/structure/transferts/${t.id}/accepter" style="display:inline;">
        <button type="submit" class="btn btn-vert" style="font-size:11px;padding:5px 9px;">✓ Accepter</button>
      </form>
      <form method="POST" action="/structure/transferts/${t.id}/refuser" style="display:inline;margin-left:4px;">
        <button type="submit" class="btn btn-rouge" style="font-size:11px;padding:5px 9px;">✗ Refuser</button>
      </form>` : ''
    return `<tr${t.statut === 'en_attente' ? ' style="background:#fff8e6;"' : ''}>
      <td><div style="font-weight:700;">${p?.prenom || ''} ${p?.nom || ''}</div>
          <div style="font-size:11px;color:var(--soft);">${p?.numero_national || ''}</div></td>
      <td>${src}</td>
      <td>${dt}</td>
      <td><span class="badge ${STATUT_B[t.statut] || 'b-gris'}">${t.statut}</span></td>
      <td><span class="badge ${t.etat_patient_transfert === 'critique' ? 'b-rouge' : t.etat_patient_transfert === 'grave' ? 'b-or' : 'b-vert'}">${t.etat_patient_transfert || '—'}</span></td>
      <td>${actionsHtml}</td>
    </tr>`
  }

  const nbAttente = (entrants.data ?? []).filter((t: any) => t.statut === 'en_attente').length

  const content = `
<div class="page-header">
  <div class="page-title">🔄 Transferts${nbAttente > 0 ? ` <span style="color:var(--rouge);font-size:16px;">(${nbAttente} en attente)</span>` : ''}</div>
</div>
${nbAttente > 0 ? `<div class="alert-box">⚠️ <strong>${nbAttente} transfert(s) entrant(s) en attente de votre réponse.</strong></div>` : ''}

<div class="card" style="margin-bottom:14px;">
  <div class="card-hd"><div class="card-title">📥 Transferts entrants (${(entrants.data ?? []).length})</div></div>
  ${(entrants.data ?? []).length > 0 ? `<table>
    <thead><tr><th>Patient</th><th>Depuis</th><th>Date</th><th>Statut</th><th>État</th><th>Actions</th></tr></thead>
    <tbody>${(entrants.data ?? []).map(rowEntrant).join('')}</tbody>
  </table>` : '<div class="empty">Aucun transfert entrant</div>'}
</div>
<div class="card">
  <div class="card-hd"><div class="card-title">📤 Transferts sortants (${(sortants.data ?? []).length})</div></div>
  ${(sortants.data ?? []).length > 0 ? `<table>
    <thead><tr><th>Patient</th><th>Vers</th><th>Date</th><th>Statut</th><th>Motif</th></tr></thead>
    <tbody>${(sortants.data ?? []).map(rowSortant).join('')}</tbody>
  </table>` : '<div class="empty">Aucun transfert sortant</div>'}
</div>`

  return c.html(structureLayout(profil, 'Transferts', 'transferts', content,
    succes === 'accepte' ? 'Transfert accepté.' :
    succes === 'refuse'  ? 'Transfert refusé.'  : undefined
  ))
})

structureRoutes.post('/transferts/:id/accepter', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')
  await supabase.from('medical_transferts')
    .update({ statut: 'accepte', accepte_by: profil.id, accepte_at: new Date().toISOString() })
    .eq('id', id)
    .eq('structure_destination_id', profil.structure_id)
  return c.redirect('/structure/transferts?succes=accepte', 303)
})

structureRoutes.post('/transferts/:id/refuser', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')
  const body     = await c.req.parseBody()
  await supabase.from('medical_transferts')
    .update({ statut: 'refuse' })
    .eq('id', id)
    .eq('structure_destination_id', profil.structure_id)
  return c.redirect('/structure/transferts?succes=refuse', 303)
})

// ═══════════════════════════════════════════════════════════════
// STATISTIQUES
// ═══════════════════════════════════════════════════════════════
structureRoutes.get('/statistiques', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const periode  = c.req.query('periode') || '30'

  const debut = new Date()
  debut.setDate(debut.getDate() - parseInt(periode))
  const debutStr = debut.toISOString()

  const [consult, urgences, ordonnances, hospit, factures, rdv, vaccinations, examens] = await Promise.all([
    supabase.from('medical_consultations').select('id', { count: 'exact', head: true })
      .eq('structure_id', profil.structure_id).gte('created_at', debutStr),
    supabase.from('medical_consultations').select('id', { count: 'exact', head: true })
      .eq('structure_id', profil.structure_id).eq('type_consultation', 'urgence').gte('created_at', debutStr),
    supabase.from('medical_ordonnances').select('id', { count: 'exact', head: true })
      .eq('structure_id', profil.structure_id).gte('created_at', debutStr),
    supabase.from('medical_hospitalisations').select('id', { count: 'exact', head: true })
      .eq('structure_id', profil.structure_id).gte('created_at', debutStr),
    supabase.from('finance_factures').select('total_ttc')
      .eq('structure_id', profil.structure_id).eq('statut', 'payee').gte('created_at', debutStr),
    supabase.from('medical_rendez_vous').select('id', { count: 'exact', head: true })
      .eq('structure_id', profil.structure_id).gte('created_at', debutStr),
    supabase.from('spec_vaccinations').select('id', { count: 'exact', head: true })
      .eq('structure_id', profil.structure_id).gte('created_at', debutStr),
    supabase.from('medical_examens').select('id', { count: 'exact', head: true })
      .eq('structure_id', profil.structure_id).gte('created_at', debutStr),
  ])

  const totalRecettes = (factures.data ?? []).reduce((s: number, f: any) => s + (f.total_ttc || 0), 0)

  const statCards = [
    { ico: '📋', val: consult.count || 0,      lbl: 'Consultations' },
    { ico: '🚨', val: urgences.count || 0,     lbl: 'Urgences' },
    { ico: '💊', val: ordonnances.count || 0,  lbl: 'Ordonnances' },
    { ico: '🏨', val: hospit.count || 0,       lbl: 'Hospitalisations' },
    { ico: '📅', val: rdv.count || 0,          lbl: 'RDV' },
    { ico: '🧪', val: examens.count || 0,      lbl: 'Examens' },
    { ico: '💉', val: vaccinations.count || 0, lbl: 'Vaccinations' },
    { ico: '💰', val: fcfa(totalRecettes),     lbl: 'Recettes' },
  ]

  const content = `
<div class="page-header">
  <div class="page-title">📊 Statistiques</div>
  <form method="GET" action="/structure/statistiques" style="display:flex;gap:8px;align-items:center;">
    <label style="font-size:13px;font-weight:600;color:var(--soft);">Période :</label>
    <select name="periode" onchange="this.form.submit()" style="padding:8px 12px;font-size:13px;border:1.5px solid var(--bordure);border-radius:var(--rs);">
      ${[['1','Aujourd\'hui'],['7','7 jours'],['30','30 jours'],['90','3 mois'],['365','1 an']].map(([v, l]) =>
        `<option value="${v}"${periode === v ? ' selected' : ''}>${l}</option>`
      ).join('')}
    </select>
  </form>
</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;">
  ${statCards.map(s => `
    <div class="card" style="text-align:center;padding:20px;">
      <div style="font-size:26px;margin-bottom:8px;">${s.ico}</div>
      <div style="font-family:'Fraunces',serif;font-size:${typeof s.val === 'string' ? '18' : '32'}px;font-weight:600;color:var(--or-f);">${s.val}</div>
      <div style="font-size:12px;color:var(--soft);margin-top:4px;">${s.lbl}</div>
    </div>`).join('')}
</div>
<div class="info-box">
  📊 Ces statistiques couvrent les <strong>${periode} dernier(s) jour(s)</strong>.
  Pour des rapports détaillés, utilisez les exports CSV.
</div>`

  return c.html(structureLayout(profil, 'Statistiques', 'stats', content))
})

// ═══════════════════════════════════════════════════════════════
// FINANCES
// ═══════════════════════════════════════════════════════════════
structureRoutes.get('/finances', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const today    = new Date().toISOString().split('T')[0]
  const moisDeb  = new Date(); moisDeb.setDate(1)
  const moisStr  = moisDeb.toISOString()

  const [fjour, fmois, fimpayees] = await Promise.all([
    supabase.from('finance_factures').select('total_ttc')
      .eq('structure_id', profil.structure_id).eq('statut', 'payee').gte('created_at', today + 'T00:00:00'),
    supabase.from('finance_factures').select('total_ttc')
      .eq('structure_id', profil.structure_id).eq('statut', 'payee').gte('created_at', moisStr),
    supabase.from('finance_factures').select('total_ttc', { count: 'exact' })
      .eq('structure_id', profil.structure_id).eq('statut', 'impayee'),
  ])

  const sumFn = (data: any[]) => data.reduce((s, f) => s + (f.total_ttc || 0), 0)
  const recJour  = sumFn(fjour.data  ?? [])
  const recMois  = sumFn(fmois.data  ?? [])
  const nbImpaye = fimpayees.count   || 0

  // Liste factures récentes
  const { data: factures } = await supabase
    .from('finance_factures')
    .select('id, numero_facture, created_at, total_ttc, statut, patient_dossiers(nom, prenom)')
    .eq('structure_id', profil.structure_id)
    .order('created_at', { ascending: false })
    .limit(10)

  const STATUT_FACT: Record<string, string> = {
    payee: 'b-vert', impayee: 'b-rouge', partiellement_payee: 'b-or', annulee: 'b-gris',
  }

  const rows = (factures ?? []).map((f: any) => {
    const p = f.patient_dossiers as any
    return `<tr>
      <td style="font-family:monospace;font-size:12px;">${f.numero_facture}</td>
      <td>${p?.prenom || ''} ${p?.nom || ''}</td>
      <td>${new Date(f.created_at).toLocaleDateString('fr-FR')}</td>
      <td style="font-weight:700;color:var(--vert);">${fcfa(f.total_ttc || 0)}</td>
      <td><span class="badge ${STATUT_FACT[f.statut] || 'b-gris'}">${f.statut}</span></td>
    </tr>`
  }).join('')

  const content = `
<div class="page-header">
  <div class="page-title">💰 Finances</div>
  <a href="/structure/finances/factures" class="btn btn-or">Toutes les factures →</a>
</div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px;">
  <div class="card" style="text-align:center;padding:20px;">
    <div style="font-size:22px;margin-bottom:8px;">📅</div>
    <div style="font-size:20px;font-weight:700;color:var(--vert);">${fcfa(recJour)}</div>
    <div style="font-size:12px;color:var(--soft);">Recettes du jour</div>
  </div>
  <div class="card" style="text-align:center;padding:20px;">
    <div style="font-size:22px;margin-bottom:8px;">📆</div>
    <div style="font-size:20px;font-weight:700;color:var(--vert);">${fcfa(recMois)}</div>
    <div style="font-size:12px;color:var(--soft);">Recettes du mois</div>
  </div>
  <div class="card" style="text-align:center;padding:20px;">
    <div style="font-size:22px;margin-bottom:8px;">⚠️</div>
    <div style="font-size:32px;font-weight:700;color:${nbImpaye > 0 ? 'var(--rouge)' : 'var(--vert)'};">${nbImpaye}</div>
    <div style="font-size:12px;color:var(--soft);">Factures impayées</div>
  </div>
</div>
<div class="card">
  <div class="card-hd"><div class="card-title">🧾 Factures récentes</div></div>
  ${rows ? `<table>
    <thead><tr><th>N°</th><th>Patient</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>` : '<div class="empty">Aucune facture</div>'}
</div>`

  return c.html(structureLayout(profil, 'Finances', 'finances', content))
})

structureRoutes.get('/finances/factures', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const filtreStatut = c.req.query('statut') || ''

  let query = supabase.from('finance_factures')
    .select('id, numero_facture, created_at, total_ttc, statut, montant_assurance, montant_patient, patient_dossiers(nom, prenom)')
    .eq('structure_id', profil.structure_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (filtreStatut) query = query.eq('statut', filtreStatut)

  const { data: factures } = await query

  const STATUT_FACT: Record<string, string> = {
    payee: 'b-vert', impayee: 'b-rouge', partiellement_payee: 'b-or', annulee: 'b-gris', remboursee: 'b-bleu',
  }

  const rows = (factures ?? []).map((f: any) => {
    const p = f.patient_dossiers as any
    return `<tr>
      <td style="font-family:monospace;font-size:12px;">${f.numero_facture}</td>
      <td>${p?.prenom || ''} ${p?.nom || ''}</td>
      <td>${new Date(f.created_at).toLocaleDateString('fr-FR')}</td>
      <td style="font-weight:700;">${fcfa(f.total_ttc || 0)}</td>
      <td style="font-size:12px;color:var(--soft);">${fcfa(f.montant_assurance || 0)}</td>
      <td style="font-size:12px;">${fcfa(f.montant_patient || 0)}</td>
      <td><span class="badge ${STATUT_FACT[f.statut] || 'b-gris'}">${f.statut}</span></td>
    </tr>`
  }).join('')

  const content = `
<div class="page-header">
  <div class="page-title">🧾 Factures (${(factures ?? []).length})</div>
  <a href="/structure/finances" class="back-btn">← Finances</a>
</div>
<div class="card" style="margin-bottom:14px;padding:12px 16px;">
  <form method="GET" action="/structure/finances/factures" style="display:flex;gap:10px;align-items:center;">
    <select name="statut" style="padding:8px 12px;font-size:13px;border:1.5px solid var(--bordure);border-radius:var(--rs);">
      <option value="">Tous les statuts</option>
      ${['payee','impayee','partiellement_payee','annulee','remboursee'].map(s =>
        `<option value="${s}"${filtreStatut === s ? ' selected' : ''}>${s}</option>`
      ).join('')}
    </select>
    <button type="submit" class="btn btn-or">Filtrer</button>
    <a href="/structure/finances/factures" class="btn btn-soft">✕</a>
  </form>
</div>
<div class="card">
  ${rows ? `<table>
    <thead><tr><th>N°</th><th>Patient</th><th>Date</th><th>Total</th><th>Assurance</th><th>Patient</th><th>Statut</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>` : '<div class="empty">Aucune facture</div>'}
</div>`

  return c.html(structureLayout(profil, 'Factures', 'finances', content))
})

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════
structureRoutes.get('/configuration', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const succes   = c.req.query('succes') || ''

  const { data: struct } = await supabase
    .from('struct_structures')
    .select('id, nom, type, niveau, adresse, telephone, telephone_urgence, email, logo_url, est_public, est_actif')
    .eq('id', profil.structure_id)
    .single()

  if (!struct) return c.redirect('/dashboard/structure')

  const content = `
<div class="page-header">
  <div class="page-title">⚙️ Configuration de la structure</div>
</div>
<div class="card">
  <div class="card-hd"><div class="card-title">🏥 Informations générales</div></div>
  ${struct.logo_url ? `<img src="${struct.logo_url}" alt="Logo" style="height:60px;border-radius:8px;margin-bottom:16px;border:1px solid var(--bordure);">` : ''}
  <form method="POST" action="/structure/configuration">
    <div class="grid2">
      <div class="form-group">
        <label class="form-label">Nom de la structure</label>
        <input type="text" name="nom" value="${struct.nom || ''}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Type <span style="color:var(--soft);font-weight:400;">(lecture seule)</span></label>
        <input type="text" value="${struct.type || ''}" readonly style="background:var(--bg);cursor:not-allowed;">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Adresse physique</label>
      <input type="text" name="adresse" value="${struct.adresse || ''}" placeholder="Ex: Secteur 15, Ouagadougou">
    </div>
    <div class="grid2">
      <div class="form-group">
        <label class="form-label">Téléphone principal</label>
        <input type="tel" name="telephone" value="${struct.telephone || ''}" placeholder="25 30 XX XX">
      </div>
      <div class="form-group">
        <label class="form-label">Téléphone urgence 24h/24</label>
        <input type="tel" name="telephone_urgence" value="${struct.telephone_urgence || ''}" placeholder="Urgences">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Email de contact</label>
      <input type="email" name="email" value="${struct.email || ''}" placeholder="contact@structure.bf">
    </div>
    <button type="submit" class="btn btn-or" style="padding:13px 28px;font-size:15px;">💾 Enregistrer</button>
  </form>
</div>
<div class="card">
  <div class="card-hd"><div class="card-title">🖼️ Logo de la structure</div></div>
  <p style="font-size:13px;color:var(--soft);margin-bottom:14px;">
    Le logo apparaît sur les ordonnances et documents générés. Max 2 Mo. PNG ou JPG.
  </p>
  <form id="logoForm">
    <div style="border:2px dashed var(--bordure);border-radius:var(--rs);padding:18px;text-align:center;cursor:pointer;margin-bottom:12px;"
         onclick="document.getElementById('logoFile').click()">
      <div style="font-size:13px;font-weight:600;">📁 Cliquer pour choisir un logo</div>
      <div style="font-size:12px;color:var(--soft);">PNG · JPG · Max 2 Mo</div>
      <input type="file" id="logoFile" accept="image/png,image/jpeg" style="display:none;" onchange="previewLogo(this)">
    </div>
    <div id="logoPreview" style="display:none;margin-bottom:12px;text-align:center;">
      <img id="logoImg" src="" alt="" style="height:60px;border-radius:8px;border:1px solid var(--bordure);">
    </div>
    <div id="logoMsg" style="display:none;"></div>
    <button type="button" id="logoBtn" onclick="uploadLogo()" disabled class="btn btn-or">⬆️ Enregistrer le logo</button>
  </form>
</div>
<script>
var logoSel=null;
function previewLogo(input){
  var f=input.files[0];
  if(!f)return;
  if(f.size>2*1024*1024){alert('Fichier trop lourd (max 2 Mo)');return;}
  logoSel=f;
  var r=new FileReader();r.onload=function(e){
    document.getElementById('logoImg').src=e.target.result;
    document.getElementById('logoPreview').style.display='block';
  };r.readAsDataURL(f);
  document.getElementById('logoBtn').disabled=false;
}
async function uploadLogo(){
  if(!logoSel)return;
  var btn=document.getElementById('logoBtn'),msg=document.getElementById('logoMsg');
  btn.disabled=true;btn.textContent='Envoi…';
  var b64=await new Promise(function(res,rej){
    var r=new FileReader();r.onload=function(e){res(e.target.result.split(',')[1]);};
    r.onerror=rej;r.readAsDataURL(logoSel);
  });
  var resp=await fetch('/structure/configuration/logo',{method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({fichier:b64,type:logoSel.type,nom:logoSel.name})});
  msg.style.display='block';
  if(resp.ok){
    msg.style.background='var(--vert-c)';msg.style.color='var(--vert)';
    msg.style.borderRadius='var(--rs)';msg.style.padding='10px 14px';msg.style.fontSize='13px';
    msg.textContent='✓ Logo mis à jour !';
    setTimeout(function(){location.reload();},1500);
  } else {
    msg.style.background='var(--rouge-c)';msg.style.color='var(--rouge)';
    msg.style.borderRadius='var(--rs)';msg.style.padding='10px 14px';msg.style.fontSize='13px';
    msg.textContent='✗ Erreur upload. Réessayez.';
    btn.disabled=false;btn.textContent='⬆️ Enregistrer le logo';
  }
}
</script>`

  return c.html(structureLayout(profil, 'Configuration', 'config', content,
    succes === 'ok' ? 'Configuration mise à jour.' : undefined
  ))
})

structureRoutes.post('/configuration', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()

  await supabase.from('struct_structures').update({
    nom:               String(body.nom               || '').trim(),
    adresse:           String(body.adresse           || '').trim() || null,
    telephone:         String(body.telephone         || '').trim() || null,
    telephone_urgence: String(body.telephone_urgence || '').trim() || null,
    email:             String(body.email             || '').trim() || null,
    updated_at:        new Date().toISOString(),
  }).eq('id', profil.structure_id)

  return c.redirect('/structure/configuration?succes=ok', 303)
})

structureRoutes.post('/configuration/logo', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  try {
    const body    = await c.req.json() as any
    const base64  = body.fichier as string
    const mime    = body.type    || 'image/png'
    const ext     = mime.includes('png') ? 'png' : 'jpg'
    const path    = `structures/${profil.structure_id}/logo.${ext}`

    // Convertir base64 → Uint8Array
    const binary  = atob(base64)
    const bytes   = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    const { error } = await supabase.storage
      .from('structures')
      .upload(path, bytes, { contentType: mime, upsert: true })

    if (error) throw error

    const { data: urlData } = supabase.storage.from('structures').getPublicUrl(path)
    const logoUrl = urlData.publicUrl + '?t=' + Date.now()

    await supabase.from('struct_structures')
      .update({ logo_url: logoUrl })
      .eq('id', profil.structure_id)

    return c.json({ ok: true, url: logoUrl })
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500)
  }
})

// ═══════════════════════════════════════════════════════════════
// LOGS D'ACCÈS
// ═══════════════════════════════════════════════════════════════
structureRoutes.get('/logs', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: logs } = await supabase
    .from('stats_acces_logs')
    .select('id, action, created_at, ip_address, auth_profiles(nom, prenom, role), patient_dossiers(nom, prenom, numero_national)')
    .eq('structure_id', profil.structure_id)
    .order('created_at', { ascending: false })
    .limit(50)

  const ROLE_L: Record<string, string> = {
    medecin: 'Médecin', infirmier: 'Infirmier', pharmacien: 'Pharmacien',
    laborantin: 'Laborantin', caissier: 'Caissier', agent_accueil: 'Accueil',
    admin_structure: 'Admin', radiologue: 'Radiologue',
  }

  const rows = (logs ?? []).map((l: any) => {
    const who = l.auth_profiles
      ? `${ROLE_L[l.auth_profiles.role] || l.auth_profiles.role} ${l.auth_profiles.prenom || ''} ${l.auth_profiles.nom || ''}`
      : 'Système'
    const pat = l.patient_dossiers
      ? `${l.patient_dossiers.prenom || ''} ${l.patient_dossiers.nom || ''} (${l.patient_dossiers.numero_national || ''})`
      : '—'
    const dt = new Date(l.created_at)
    return `<tr>
      <td>${dt.toLocaleDateString('fr-FR')} ${dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
      <td style="font-size:13px;">${who}</td>
      <td style="font-size:12px;font-family:monospace;color:var(--soft);">${l.action || '—'}</td>
      <td style="font-size:12px;">${pat}</td>
      <td style="font-size:11px;color:var(--soft);">${l.ip_address || '—'}</td>
    </tr>`
  }).join('')

  const content = `
<div class="page-header">
  <div class="page-title">🔍 Logs d'accès (${(logs ?? []).length} derniers)</div>
</div>
<div class="info-box">
  ℹ️ Chaque accès à un dossier patient dans cette structure est enregistré automatiquement.
  Les logs sont conservés 10 ans.
</div>
<div class="card">
  ${rows ? `<table>
    <thead><tr><th>Date / Heure</th><th>Utilisateur</th><th>Action</th><th>Patient concerné</th><th>IP</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>` : '<div class="empty">Aucun log disponible</div>'}
</div>`

  return c.html(structureLayout(profil, 'Logs d\'accès', 'logs', content))
})
