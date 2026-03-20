/**
 * src/routes/accueil.ts
 * SantéBF — Routes agent d'accueil
 * Monté sur /accueil dans functions/[[path]].ts
 *
 * Routes :
 *   GET  /nouveau-patient          Formulaire création patient
 *   POST /nouveau-patient          Créer dossier + contact urgence
 *   GET  /recherche                Rechercher un patient
 *   GET  /patient/:id              Fiche patient (vue accueil)
 *   GET  /patient/:id/qr           Carte QR imprimable
 *   GET  /rdv                      Liste RDV du jour + à venir
 *   GET  /rdv/nouveau              Formulaire prendre RDV
 *   POST /rdv/nouveau              Créer un RDV
 *   POST /rdv/:id/statut           Mettre à jour statut RDV
 *
 * Connexions inter-dashboards :
 *   RDV créé ici → apparaît dans dashboard médecin + dashboard patient
 *   Patient créé ici → visible dans /structure/patients + /medecin/*
 */
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import type { AuthProfile, Bindings } from '../lib/supabase'
import { genererMdpTemporaire } from '../utils/password'
import { sendEmail, templateBienvenue } from '../utils/email'

export const accueilRoutes = new Hono<{ Bindings: Bindings }>()
accueilRoutes.use('/*', requireAuth, requireRole('agent_accueil', 'admin_structure', 'super_admin'))

// ── CSS partagé ───────────────────────────────────────────
const CSS = `
:root{
  --bleu:#1565C0;--bleu-f:#0d47a1;--bleu-c:#e3f2fd;
  --vert:#1A6B3C;--vert-c:#e8f5ee;
  --rouge:#B71C1C;--rouge-c:#fce8e8;
  --or:#f59e0b;--or-c:#fff8e6;
  --texte:#0f1923;--soft:#5a6a78;
  --bg:#f0f4fb;--blanc:#fff;--bordure:#dce6f5;
  --r:14px;--rs:10px;--sh:0 2px 10px rgba(0,0,0,.06);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);}
a{color:inherit;text-decoration:none;}
.topbar{background:linear-gradient(135deg,var(--bleu-f),var(--bleu));height:54px;display:flex;
  align-items:center;justify-content:space-between;padding:0 20px;
  position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(21,101,192,.3);}
.tb-brand{display:flex;align-items:center;gap:10px;}
.tb-ico{font-size:20px;}
.tb-name{font-family:'Fraunces',serif;font-size:17px;color:white;}
.tb-sub{font-size:10px;color:rgba(255,255,255,.5);letter-spacing:1px;text-transform:uppercase;}
.tb-user{display:flex;align-items:center;gap:10px;}
.tb-info{text-align:right;}
.tb-info strong{display:block;font-size:13px;font-weight:700;color:white;}
.tb-info small{font-size:11px;color:rgba(255,255,255,.5);}
.tb-logout{background:rgba(255,255,255,.12);color:white;padding:7px 14px;border-radius:8px;
  font-size:12px;font-weight:600;white-space:nowrap;}
.tb-logout:hover{background:rgba(255,80,80,.25);}
.wrap{max-width:1100px;margin:0 auto;padding:22px 16px;}
.page-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px;}
.page-title{font-family:'Fraunces',serif;font-size:22px;}
.back{display:inline-flex;align-items:center;gap:7px;background:var(--blanc);
  border:1px solid var(--bordure);color:var(--texte);padding:8px 14px;
  border-radius:var(--rs);font-size:13px;font-weight:700;text-decoration:none;}
.back:hover{background:var(--bleu-c);color:var(--bleu);}
.card{background:var(--blanc);border-radius:var(--r);padding:20px 22px;
  box-shadow:var(--sh);border:1px solid var(--bordure);margin-bottom:14px;}
.card-title{font-size:14px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:7px;}
.badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;}
.b-bleu{background:var(--bleu-c);color:var(--bleu);}
.b-vert{background:var(--vert-c);color:var(--vert);}
.b-rouge{background:var(--rouge-c);color:var(--rouge);}
.b-gris{background:#f0f0f0;color:#666;}
.b-or{background:var(--or-c);color:#7a5500;}
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:var(--rs);
  font-size:13px;font-weight:700;border:none;cursor:pointer;font-family:inherit;text-decoration:none;}
.btn-bleu{background:var(--bleu);color:white;}
.btn-bleu:hover{background:var(--bleu-f);}
.btn-vert{background:var(--vert);color:white;}
.btn-rouge{background:var(--rouge-c);color:var(--rouge);}
.btn-soft{background:var(--bg);color:var(--texte);border:1px solid var(--bordure);}
.form-group{margin-bottom:14px;}
.form-label{display:block;font-size:12px;font-weight:700;color:var(--texte);margin-bottom:5px;}
.form-label span{color:var(--rouge);}
input,select,textarea{width:100%;padding:10px 14px;border:1.5px solid var(--bordure);
  border-radius:var(--rs);font-size:14px;font-family:inherit;outline:none;background:#fafdf8;}
input:focus,select:focus,textarea:focus{border-color:var(--bleu);background:white;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
.info-box{background:var(--bleu-c);border-left:4px solid var(--bleu);border-radius:var(--rs);
  padding:12px 15px;margin-bottom:14px;font-size:13px;color:#1a3a6b;line-height:1.6;}
.ok-box{background:var(--vert-c);border-left:4px solid var(--vert);border-radius:var(--rs);
  padding:12px 15px;margin-bottom:14px;font-size:13px;color:var(--vert);font-weight:700;}
.err-box{background:var(--rouge-c);border-left:4px solid var(--rouge);border-radius:var(--rs);
  padding:12px 15px;margin-bottom:14px;font-size:13px;color:var(--rouge);}
.empty{text-align:center;padding:32px;color:var(--soft);font-style:italic;font-size:13px;}
table{width:100%;border-collapse:collapse;}
thead tr{background:var(--bleu-c);}
thead th{padding:10px 14px;text-align:left;font-size:11.5px;font-weight:700;
  color:var(--bleu);text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid var(--bordure);}
tbody tr{border-bottom:1px solid var(--bordure);}
tbody tr:hover{background:#f7f9ff;}
tbody td{padding:10px 14px;font-size:14px;}
.sep{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--bordure);}
.sep:last-child{border-bottom:none;}
.lbl{font-size:12px;font-weight:700;color:var(--soft);}
.val{font-size:13px;font-weight:600;}
.qr-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;}
@media(max-width:640px){.grid2,.grid3{grid-template-columns:1fr;}.wrap{padding:14px 12px;}}
`

function page(titre: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titre} — SantéBF Accueil</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>${body}</body>
</html>`
}

function topbar(profil: AuthProfile, titre: string): string {
  const ini = `${(profil.prenom||'?').charAt(0)}${(profil.nom||'?').charAt(0)}`
  return `<div class="topbar">
  <div class="tb-brand">
    <span class="tb-ico">🏥</span>
    <div><div class="tb-name">SantéBF</div><div class="tb-sub">Accueil · ${titre}</div></div>
  </div>
  <div class="tb-user">
    <div class="tb-info">
      <strong>${profil.prenom} ${profil.nom}</strong>
      <small>Agent d'accueil</small>
    </div>
    <div style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.2);
      display:flex;align-items:center;justify-content:center;font-size:12px;
      font-weight:700;color:white;">${ini}</div>
    <a href="/dashboard/accueil" class="tb-logout">⊞ Dashboard</a>
    <a href="/auth/logout" class="tb-logout">⏻</a>
  </div>
</div>`
}

function statut_badge(s: string): string {
  const map: Record<string,string> = {
    planifie:'b-bleu', confirme:'b-vert', annule:'b-rouge',
    passe:'b-gris', absent:'b-rouge', reporte:'b-or',
  }
  return `<span class="badge ${map[s]||'b-gris'}">${s}</span>`
}

// ═══════════════════════════════════════════════════════════════
// NOUVEAU PATIENT
// ═══════════════════════════════════════════════════════════════
accueilRoutes.get('/nouveau-patient', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const succes   = c.req.query('succes') || ''

  const [{ data: services }, { data: medecins }] = await Promise.all([
    supabase.from('struct_services')
      .select('id, nom').eq('structure_id', profil.structure_id).eq('est_actif', true).order('nom'),
    supabase.from('auth_medecin_structures')
      .select('auth_medecins!inner(id, specialite_principale, auth_profiles!inner(nom, prenom))')
      .eq('structure_id', profil.structure_id).eq('est_actif', true),
  ])

  const medecinsList = (medecins ?? []).map((m: any) => m.auth_medecins).filter(Boolean)

  const html = `
${topbar(profil, 'Nouveau patient')}
<div class="wrap">
  <div class="page-hd">
    <div class="page-title">➕ Nouveau patient</div>
    <a href="/dashboard/accueil" class="back">← Dashboard</a>
  </div>
  ${succes ? '<div class="ok-box">✓ Patient enregistré avec succès.</div>' : ''}
  <form method="POST" action="/accueil/nouveau-patient">
    <div class="card">
      <div class="card-title">👤 Identité</div>
      <div class="grid2">
        <div class="form-group">
          <label class="form-label">Prénom <span>*</span></label>
          <input type="text" name="prenom" placeholder="Ex: Aminata" required>
        </div>
        <div class="form-group">
          <label class="form-label">Nom <span>*</span></label>
          <input type="text" name="nom" placeholder="Ex: TRAORÉ" required>
        </div>
      </div>
      <div class="grid3">
        <div class="form-group">
          <label class="form-label">Date de naissance <span>*</span></label>
          <input type="date" name="date_naissance" required>
        </div>
        <div class="form-group">
          <label class="form-label">Sexe <span>*</span></label>
          <select name="sexe" required>
            <option value="">Sélectionner…</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Téléphone</label>
          <input type="tel" name="telephone" placeholder="70 12 34 56">
        </div>
        <div class="form-group">
          <label class="form-label">Email (optionnel)</label>
          <input type="email" name="email" placeholder="patient@exemple.com">
          <div style="font-size:11px;color:#6b7280;margin-top:4px;">
            Si renseigné, un compte SantéBF est créé automatiquement avec envoi du mot de passe par email.
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🩸 Informations médicales</div>
      <div class="grid3">
        <div class="form-group">
          <label class="form-label">Groupe sanguin</label>
          <select name="groupe_sanguin">
            <option value="inconnu">Inconnu</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="AB">AB</option>
            <option value="O">O</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Rhésus</label>
          <select name="rhesus">
            <option value="inconnu">Inconnu</option>
            <option value="+">Positif (+)</option>
            <option value="-">Négatif (−)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Allergies connues</label>
          <input type="text" name="allergies" placeholder="Ex: pénicilline, aspirine…">
          <div style="font-size:11px;color:var(--soft);margin-top:3px;">Séparer par des virgules</div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Maladies chroniques</label>
        <input type="text" name="maladies" placeholder="Ex: Diabète, Hypertension…">
        <div style="font-size:11px;color:var(--soft);margin-top:3px;">Séparer par des virgules</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🚨 Contact d'urgence</div>
      <div class="grid3">
        <div class="form-group">
          <label class="form-label">Nom complet</label>
          <input type="text" name="contact_nom" placeholder="Ex: Fatimata Traoré">
        </div>
        <div class="form-group">
          <label class="form-label">Lien de parenté</label>
          <input type="text" name="contact_lien" placeholder="Ex: Épouse, Parent…">
        </div>
        <div class="form-group">
          <label class="form-label">Téléphone</label>
          <input type="tel" name="contact_tel" placeholder="70 XX XX XX">
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📅 Programmer un RDV maintenant (optionnel)</div>
      <div class="info-box">Si vous cochez cette option, un rendez-vous sera créé immédiatement et apparaîtra dans le dashboard du médecin choisi.</div>
      <div style="margin-bottom:12px;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;">
          <input type="checkbox" id="rdvCheck" onchange="document.getElementById('rdvFields').style.display=this.checked?'block':'none'" style="width:auto;">
          Programmer un RDV
        </label>
      </div>
      <div id="rdvFields" style="display:none;">
        <div class="grid3">
          <div class="form-group">
            <label class="form-label">Médecin</label>
            <select name="rdv_medecin_id">
              <option value="">Sélectionner un médecin…</option>
              ${medecinsList.map((m: any) => {
                const p = m.auth_profiles
                return `<option value="${m.id}">Dr. ${p?.prenom||''} ${p?.nom||''} (${m.specialite_principale||'Généraliste'})</option>`
              }).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Date et heure</label>
            <input type="datetime-local" name="rdv_date_heure">
          </div>
          <div class="form-group">
            <label class="form-label">Motif</label>
            <input type="text" name="rdv_motif" placeholder="Motif de la consultation">
          </div>
        </div>
      </div>
    </div>

    <button type="submit" class="btn btn-bleu" style="padding:13px 30px;font-size:15px;width:100%;justify-content:center;">
      ✅ Enregistrer le patient
    </button>
  </form>
</div>`

  return c.html(page('Nouveau patient', html))
})

accueilRoutes.post('/nouveau-patient', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()

  const nom    = String(body.nom    ?? '').trim()
  const prenom = String(body.prenom ?? '').trim()
  const ddn    = String(body.date_naissance ?? '')
  const sexe   = String(body.sexe   ?? '')

  if (!nom || !prenom || !ddn || !sexe) {
    return c.redirect('/accueil/nouveau-patient?err=champs_obligatoires', 303)
  }

  const allergies = String(body.allergies ?? '').trim()
    ? String(body.allergies).split(',').map((a: string) => ({ substance: a.trim(), reaction: '' }))
    : []

  const maladies = String(body.maladies ?? '').trim()
    ? String(body.maladies).split(',').map((m: string) => ({ maladie: m.trim(), depuis: '', traitement: '' }))
    : []

  const { data: patient, error } = await supabase
    .from('patient_dossiers')
    .insert({
      nom:                         nom.toUpperCase(),
      prenom,
      date_naissance:              ddn,
      sexe,
      telephone:                   String(body.telephone ?? '').trim() || null,
      groupe_sanguin:              String(body.groupe_sanguin ?? 'inconnu'),
      rhesus:                      String(body.rhesus ?? 'inconnu'),
      allergies:                   JSON.stringify(allergies),
      maladies_chroniques:         JSON.stringify(maladies),
      enregistre_par:              profil.id,
      structure_enregistrement_id: profil.structure_id,
    })
    .select('id, numero_national')
    .single()

  if (error || !patient) {
    return c.redirect('/accueil/nouveau-patient?err=' + encodeURIComponent(error?.message || 'Inconnue'), 303)
  }

  // Contact urgence
  const contactNom = String(body.contact_nom ?? '').trim()
  if (contactNom) {
    await supabase.from('patient_contacts_urgence').insert({
      patient_id:   patient.id,
      nom_complet:  contactNom,
      lien_parente: String(body.contact_lien ?? ''),
      telephone:    String(body.contact_tel  ?? ''),
      est_principal: true,
    })
  }

  // RDV optionnel
  const rdvMedecinId = String(body.rdv_medecin_id ?? '').trim()
  const rdvDate      = String(body.rdv_date_heure ?? '').trim()
  if (rdvMedecinId && rdvDate) {
    await supabase.from('medical_rendez_vous').insert({
      patient_id:    patient.id,
      medecin_id:    rdvMedecinId,
      structure_id:  profil.structure_id,
      date_heure:    rdvDate,
      motif:         String(body.rdv_motif ?? 'Première consultation'),
      duree_minutes: 30,
      statut:        'planifie',
    })
  }

  // ── Création compte Supabase si email fourni ─────────────────
  // Si l'agent d'accueil fournit un email, on crée le compte Auth.
  // Un MDP temporaire est généré et envoyé par email au patient.
  // À sa première connexion, il devra changer son MDP (doit_changer_mdp=true).
  const emailPatient = String(body.email ?? '').trim().toLowerCase()
  if (emailPatient) {
    try {
      const sbAdmin = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
      const mdpTemp = genererMdpTemporaire()

      const { data: authData, error: authError } = await sbAdmin.auth.admin.createUser({
        email:         emailPatient,
        password:      mdpTemp,
        email_confirm: true,
        user_metadata: { nom, prenom, role: 'patient' },
      })

      if (!authError && authData?.user) {
        await supabase
          .from('auth_profiles')
          .update({ nom, prenom, role: 'patient', doit_changer_mdp: true, est_actif: true })
          .eq('id', authData.user.id)

        await supabase
          .from('patient_dossiers')
          .update({ profile_id: authData.user.id })
          .eq('id', patient.id)

        if (c.env.RESEND_API_KEY) {
          await sendEmail({
            to:      emailPatient,
            subject: 'Votre acces SanteBF — Connexion',
            html:    templateBienvenue(nom, prenom, emailPatient, mdpTemp, 'patient'),
          }, c.env.RESEND_API_KEY)
        }
      }
    } catch (err) {
      console.error('Creation compte patient (non bloquant):', err)
    }
  }

  return c.redirect(`/accueil/patient/${patient.id}?nouveau=1`, 303)
})

// ═══════════════════════════════════════════════════════════════
// RECHERCHE PATIENT
// ═══════════════════════════════════════════════════════════════
accueilRoutes.get('/recherche', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const q        = String(c.req.query('q') ?? '').trim()

  let patients: any[] = []
  if (q.length >= 2) {
    const { data } = await supabase
      .from('patient_dossiers')
      .select('id, numero_national, nom, prenom, date_naissance, sexe, groupe_sanguin, rhesus, telephone')
      .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,numero_national.ilike.%${q}%,telephone.ilike.%${q}%`)
      .order('nom')
      .limit(20)
    patients = data ?? []
  }

  const calcAge = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / (1000*60*60*24*365.25))

  const rows = patients.map(p => {
    const age = p.date_naissance ? calcAge(p.date_naissance) + ' ans' : '—'
    return `<tr>
      <td>
        <div style="font-weight:700;">${p.prenom} ${p.nom}</div>
        <div style="font-size:11px;font-family:monospace;color:var(--soft);">${p.numero_national||'—'}</div>
      </td>
      <td>${p.sexe === 'M' ? '♂ Homme' : '♀ Femme'}</td>
      <td>${age}</td>
      <td>${p.groupe_sanguin !== 'inconnu' && p.groupe_sanguin ? `<span class="badge b-rouge">${p.groupe_sanguin}${p.rhesus||''}</span>` : '—'}</td>
      <td>${p.telephone || '—'}</td>
      <td>
        <a href="/accueil/patient/${p.id}" class="btn btn-bleu" style="font-size:12px;padding:6px 12px;">Voir fiche</a>
        <a href="/accueil/rdv/nouveau?patient_id=${p.id}&nom=${encodeURIComponent(p.prenom+' '+p.nom)}" class="btn btn-soft" style="font-size:12px;padding:6px 12px;margin-left:4px;">📅 RDV</a>
      </td>
    </tr>`
  }).join('')

  const html = `
${topbar(profil, 'Recherche')}
<div class="wrap">
  <div class="page-hd">
    <div class="page-title">🔍 Recherche patient</div>
    <a href="/accueil/nouveau-patient" class="btn btn-bleu">➕ Nouveau patient</a>
  </div>
  <div class="card">
    <form method="GET" action="/accueil/recherche" style="display:flex;gap:10px;">
      <input type="text" name="q" value="${q}" placeholder="Nom, prénom, numéro BF-XXXX ou téléphone…"
        style="flex:1;" autofocus>
      <button type="submit" class="btn btn-bleu">Rechercher</button>
    </form>
  </div>
  ${q.length >= 2 ? `
  <div class="card">
    ${rows ? `<table>
      <thead><tr><th>Patient</th><th>Sexe</th><th>Âge</th><th>Groupe</th><th>Tél.</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>` : `<div class="empty">Aucun résultat pour « ${q} »</div>`}
  </div>` : `
  <div class="card">
    <div class="empty">Saisissez au moins 2 caractères pour rechercher.</div>
  </div>`}
</div>`

  return c.html(page('Recherche', html))
})

// ═══════════════════════════════════════════════════════════════
// FICHE PATIENT (vue accueil)
// ═══════════════════════════════════════════════════════════════
accueilRoutes.get('/patient/:id', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')
  const nouveau  = c.req.query('nouveau') === '1'
  const erreur   = c.req.query('err')    || ''

  const { data: patient } = await supabase
    .from('patient_dossiers')
    .select(`id, numero_national, nom, prenom, date_naissance, sexe,
      groupe_sanguin, rhesus, telephone, allergies, maladies_chroniques,
      created_at, qr_code_token,
      patient_contacts_urgence(nom_complet, lien_parente, telephone, est_principal)`)
    .eq('id', id)
    .single()

  if (!patient) return c.redirect('/accueil/recherche', 303)

  // RDV récents du patient dans cette structure
  const { data: rdvs } = await supabase
    .from('medical_rendez_vous')
    .select('id, date_heure, motif, statut, auth_profiles(nom, prenom)')
    .eq('patient_id', id)
    .eq('structure_id', profil.structure_id)
    .order('date_heure', { ascending: false })
    .limit(5)

  const calcAge = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / (1000*60*60*24*365.25))
  const age     = patient.date_naissance ? calcAge(patient.date_naissance) : '?'
  const ini     = `${patient.prenom.charAt(0)}${patient.nom.charAt(0)}`

  const contacts = (patient.patient_contacts_urgence as any[]) || []
  const allergies: any[] = Array.isArray(patient.allergies) ? patient.allergies : []
  const maladies: any[]  = Array.isArray(patient.maladies_chroniques) ? patient.maladies_chroniques : []

  const allergiesBadges = allergies.length > 0
    ? allergies.map((a: any) =>
        `<span class="badge b-rouge" style="margin:2px;">⚠️ ${a.substance||String(a)}</span>`
      ).join('')
    : '<span style="font-size:12px;color:var(--soft);">Aucune allergie connue</span>'

  const rdvRows = (rdvs ?? []).map((r: any) => {
    const dt = new Date(r.date_heure).toLocaleDateString('fr-FR')
    const hr = new Date(r.date_heure).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})
    const med = r.auth_profiles ? `Dr. ${r.auth_profiles.prenom||''} ${r.auth_profiles.nom||''}` : '—'
    return `<tr>
      <td>${dt} ${hr}</td>
      <td>${r.motif||'—'}</td>
      <td>${med}</td>
      <td>${statut_badge(r.statut)}</td>
      <td>
        <form method="POST" action="/accueil/rdv/${r.id}/statut" style="display:inline;">
          <select name="statut" onchange="this.form.submit()" style="font-size:12px;padding:4px 8px;width:auto;">
            ${['planifie','confirme','passe','absent','annule'].map(s =>
              `<option value="${s}"${s===r.statut?' selected':''}>${s}</option>`
            ).join('')}
          </select>
        </form>
      </td>
    </tr>`
  }).join('')

  const qrUrl = `https://santebf.izicardouaga.com/public/urgence/${patient.qr_code_token}`

  const html = `
${topbar(profil, patient.prenom + ' ' + patient.nom)}
<div class="wrap">
  <div class="page-hd">
    <div class="page-title">👤 Fiche patient</div>
    <a href="/accueil/recherche" class="back">← Retour</a>
  </div>

  ${nouveau ? '<div class="ok-box">✓ Dossier créé avec succès ! Numéro national attribué.</div>' : ''}
  ${erreur ? `<div class="err-box">⚠️ ${decodeURIComponent(erreur)}</div>` : ''}

  <div class="card" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
    <div style="width:56px;height:56px;border-radius:12px;background:var(--bleu-c);
      display:flex;align-items:center;justify-content:center;font-size:18px;
      font-weight:700;color:var(--bleu);flex-shrink:0;">${ini}</div>
    <div style="flex:1;">
      <div style="font-family:'Fraunces',serif;font-size:22px;">${patient.prenom} ${patient.nom}</div>
      <div style="font-size:13px;color:var(--soft);margin-top:3px;">
        ${patient.sexe==='M'?'♂ Homme':'♀ Femme'} · ${age} ans
        ${patient.groupe_sanguin && patient.groupe_sanguin !== 'inconnu'
          ? `· <strong style="color:var(--rouge)">🩸 ${patient.groupe_sanguin}${patient.rhesus&&patient.rhesus!=='inconnu'?patient.rhesus:''}</strong>`
          : ''}
      </div>
      <div style="margin-top:6px;">
        <span style="font-family:monospace;font-size:12px;background:#f0f4fb;padding:3px 10px;border-radius:8px;font-weight:700;">
          🔖 ${patient.numero_national || 'N/A'}
        </span>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <a href="/accueil/rdv/nouveau?patient_id=${patient.id}&nom=${encodeURIComponent(patient.prenom+' '+patient.nom)}"
        class="btn btn-bleu">📅 Prendre RDV</a>
      <a href="/accueil/patient/${patient.id}/qr" target="_blank"
        class="btn btn-soft">🖨️ Carte QR</a>
    </div>
  </div>

  <div class="grid2">
    <div class="card">
      <div class="card-title">📋 Informations</div>
      ${[
        ['Téléphone', patient.telephone || '—'],
        ['Date de naissance', patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString('fr-FR') : '—'],
        ['Enregistré le', new Date(patient.created_at).toLocaleDateString('fr-FR')],
      ].map(([l,v]) => `<div class="sep"><span class="lbl">${l}</span><span class="val">${v}</span></div>`).join('')}
    </div>
    <div class="card">
      <div class="card-title">⚠️ Allergies</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;">${allergiesBadges}</div>
      ${maladies.length > 0 ? `
      <div style="margin-top:12px;">
        <div style="font-size:12px;font-weight:700;color:var(--soft);margin-bottom:6px;">Maladies chroniques</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${maladies.map((m: any) => `<span class="badge b-or">💊 ${m.maladie||String(m)}</span>`).join('')}
        </div>
      </div>` : ''}
    </div>
  </div>

  ${contacts.length > 0 ? `
  <div class="card">
    <div class="card-title">🚨 Contact d'urgence</div>
    ${contacts.map((ct: any) => `
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--bordure);">
        <div style="flex:1;">
          <div style="font-weight:700;">${ct.nom_complet}</div>
          <div style="font-size:12px;color:var(--soft);">${ct.lien_parente||'Proche'}</div>
        </div>
        <a href="tel:${ct.telephone}" style="color:var(--bleu);font-weight:700;">📞 ${ct.telephone}</a>
      </div>`).join('')}
  </div>` : ''}

  <div class="card">
    <div class="card-title" style="justify-content:space-between;">
      📅 Rendez-vous (${(rdvs??[]).length})
      <a href="/accueil/rdv/nouveau?patient_id=${patient.id}&nom=${encodeURIComponent(patient.prenom+' '+patient.nom)}"
        class="btn btn-bleu" style="font-size:12px;padding:6px 12px;">➕ Nouveau RDV</a>
    </div>
    ${rdvRows ? `<table>
      <thead><tr><th>Date / Heure</th><th>Motif</th><th>Médecin</th><th>Statut</th><th>Modifier</th></tr></thead>
      <tbody>${rdvRows}</tbody>
    </table>` : '<div class="empty">Aucun rendez-vous dans cette structure</div>'}
  </div>
</div>`

  return c.html(page(patient.prenom + ' ' + patient.nom, html))
})

// ═══════════════════════════════════════════════════════════════
// CARTE QR IMPRIMABLE
// ═══════════════════════════════════════════════════════════════
accueilRoutes.get('/patient/:id/qr', async (c) => {
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')

  const { data: patient } = await supabase
    .from('patient_dossiers')
    .select('numero_national, nom, prenom, groupe_sanguin, rhesus, allergies, qr_code_token')
    .eq('id', id)
    .single()

  if (!patient) return c.text('Patient introuvable', 404)

  const qrUrl    = `https://santebf.izicardouaga.com/public/urgence/${patient.qr_code_token}`
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`
  const allergies: any[] = Array.isArray(patient.allergies) ? patient.allergies : []
  const allergieTxt = allergies.map((a: any) => a.substance || String(a)).join(', ') || 'Aucune'
  const sang = patient.groupe_sanguin !== 'inconnu' && patient.groupe_sanguin
    ? patient.groupe_sanguin + (patient.rhesus && patient.rhesus !== 'inconnu' ? patient.rhesus : '')
    : '?'

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Carte QR — ${patient.prenom} ${patient.nom}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;background:white;display:flex;align-items:center;
    justify-content:center;min-height:100vh;padding:20px;}
  .carte{width:320px;border:2px solid #1565C0;border-radius:12px;overflow:hidden;
    box-shadow:0 4px 20px rgba(0,0,0,.1);}
  .carte-header{background:#1565C0;color:white;padding:12px 16px;text-align:center;}
  .carte-header h2{font-size:13px;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;}
  .carte-header .nom{font-size:18px;font-weight:700;}
  .carte-body{padding:16px;text-align:center;}
  .carte-body img{width:160px;height:160px;margin-bottom:12px;}
  .info-row{display:flex;justify-content:space-between;padding:6px 0;
    border-bottom:1px solid #eee;font-size:13px;}
  .info-label{color:#666;font-weight:700;}
  .info-val{font-weight:700;color:#1565C0;}
  .sang{font-size:22px;font-weight:900;color:#B71C1C;margin:8px 0;}
  .allergie{background:#fce8e8;border-radius:8px;padding:8px;margin-top:8px;
    font-size:12px;color:#B71C1C;font-weight:700;}
  .carte-footer{background:#f5f7ff;padding:10px 16px;text-align:center;
    font-size:10px;color:#666;border-top:1px solid #dce6f5;}
  .print-btn{display:block;width:100%;max-width:320px;margin:16px auto;
    background:#1565C0;color:white;border:none;padding:12px;border-radius:10px;
    font-size:14px;font-weight:700;cursor:pointer;font-family:Arial;}
  @media print{.print-btn{display:none;}}
</style>
</head>
<body>
<div>
  <button class="print-btn" onclick="window.print()">🖨️ Imprimer la carte</button>
  <div class="carte">
    <div class="carte-header">
      <h2>🏥 SantéBF — Urgence</h2>
      <div class="nom">${patient.prenom} ${patient.nom}</div>
      <div style="font-size:11px;opacity:.7;">${patient.numero_national||''}</div>
    </div>
    <div class="carte-body">
      <img src="${qrApiUrl}" alt="QR Code urgence">
      <div class="sang">🩸 ${sang}</div>
      ${allergies.length > 0 ? `<div class="allergie">⚠️ Allergies : ${allergieTxt}</div>` : ''}
      <div style="font-size:11px;color:#666;margin-top:10px;">
        Scanner pour accéder aux données d'urgence
      </div>
    </div>
    <div class="carte-footer">
      santebf.izicardouaga.com · Burkina Faso
    </div>
  </div>
</div>
</body>
</html>`)
})

// ═══════════════════════════════════════════════════════════════
// LISTE RDV
// ═══════════════════════════════════════════════════════════════
accueilRoutes.get('/rdv', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const succes   = c.req.query('succes') || ''
  const filtre   = c.req.query('filtre') || 'today'

  const today = new Date().toISOString().split('T')[0]
  let query = supabase
    .from('medical_rendez_vous')
    .select(`id, date_heure, motif, statut,
      patient_dossiers(id, nom, prenom, numero_national),
      auth_profiles!medical_rendez_vous_medecin_id_fkey(nom, prenom)`)
    .eq('structure_id', profil.structure_id)
    .order('date_heure')

  if (filtre === 'today') {
    query = query.gte('date_heure', today + 'T00:00:00').lte('date_heure', today + 'T23:59:59')
  } else if (filtre === 'week') {
    const fin = new Date(); fin.setDate(fin.getDate() + 7)
    query = query.gte('date_heure', today + 'T00:00:00').lte('date_heure', fin.toISOString())
  }
  query = query.limit(100)

  const { data: rdvs } = await query

  const rows = (rdvs ?? []).map((r: any) => {
    const p    = r.patient_dossiers as any
    const med  = r.auth_profiles
    const dt   = new Date(r.date_heure).toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' })
    const hr   = new Date(r.date_heure).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
    return `<tr>
      <td><strong>${hr}</strong><div style="font-size:11px;color:var(--soft);">${dt}</div></td>
      <td>
        <div style="font-weight:700;">${p?.prenom||''} ${p?.nom||''}</div>
        <div style="font-size:11px;font-family:monospace;color:var(--soft);">${p?.numero_national||''}</div>
      </td>
      <td style="font-size:13px;">${r.motif||'—'}</td>
      <td>Dr. ${med?.prenom||''} ${med?.nom||''}</td>
      <td>${statut_badge(r.statut)}</td>
      <td>
        <form method="POST" action="/accueil/rdv/${r.id}/statut" style="display:inline;">
          <select name="statut" onchange="this.form.submit()"
            style="font-size:12px;padding:4px 8px;border:1px solid var(--bordure);border-radius:6px;width:auto;">
            ${['planifie','confirme','passe','absent','annule','reporte'].map(s =>
              `<option value="${s}"${s===r.statut?' selected':''}>${s}</option>`
            ).join('')}
          </select>
        </form>
        ${p ? `<a href="/accueil/patient/${p.id}" style="font-size:12px;color:var(--bleu);margin-left:6px;">Fiche →</a>` : ''}
      </td>
    </tr>`
  }).join('')

  const html = `
${topbar(profil, 'Rendez-vous')}
<div class="wrap">
  <div class="page-hd">
    <div class="page-title">📅 Rendez-vous</div>
    <a href="/accueil/rdv/nouveau" class="btn btn-bleu">➕ Prendre RDV</a>
  </div>
  ${succes === '1' ? '<div class="ok-box">✓ Rendez-vous créé avec succès.</div>' : ''}
  <div class="card" style="padding:12px 16px;margin-bottom:14px;">
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      ${[['today','Aujourd\'hui'],['week','7 prochains jours'],['all','Tous']].map(([v,l]) =>
        `<a href="/accueil/rdv?filtre=${v}" class="btn ${filtre===v?'btn-bleu':'btn-soft'}" style="font-size:13px;padding:7px 14px;">${l}</a>`
      ).join('')}
    </div>
  </div>
  <div class="card">
    ${rows ? `<table>
      <thead><tr><th>Heure</th><th>Patient</th><th>Motif</th><th>Médecin</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>` : '<div class="empty">Aucun rendez-vous pour cette période.</div>'}
  </div>
</div>`

  return c.html(page('RDV', html))
})

// ═══════════════════════════════════════════════════════════════
// FORMULAIRE NOUVEAU RDV
// ═══════════════════════════════════════════════════════════════
accueilRoutes.get('/rdv/nouveau', async (c) => {
  const profil     = c.get('profil' as never) as AuthProfile
  const supabase   = c.get('supabase' as never) as any
  const patientId  = c.req.query('patient_id') || ''
  const patientNom = c.req.query('nom')         || ''

  const { data: medecins } = await supabase
    .from('auth_medecin_structures')
    .select('auth_medecins!inner(id, specialite_principale, auth_profiles!inner(nom, prenom))')
    .eq('structure_id', profil.structure_id)
    .eq('est_actif', true)

  const medecinsList = (medecins ?? []).map((m: any) => m.auth_medecins).filter(Boolean)

  // Date/heure minimum = maintenant
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  const minDate = now.toISOString().slice(0, 16)

  const html = `
${topbar(profil, 'Nouveau RDV')}
<div class="wrap">
  <div class="page-hd">
    <div class="page-title">📅 Prendre un rendez-vous</div>
    <a href="/accueil/rdv" class="back">← Retour RDV</a>
  </div>
  <div class="card">
    <form method="POST" action="/accueil/rdv/nouveau">

      <div class="form-group">
        <label class="form-label">Patient <span>*</span></label>
        ${patientId ? `
        <input type="hidden" name="patient_id" value="${patientId}">
        <div style="background:var(--bleu-c);padding:12px 14px;border-radius:var(--rs);
          font-weight:700;color:var(--bleu);">✓ ${patientNom}</div>
        <div style="margin-top:6px;">
          <a href="/accueil/recherche" style="font-size:12px;color:var(--bleu);">Changer de patient →</a>
        </div>` : `
        <div class="info-box">
          Cherchez d'abord le patient dans la
          <a href="/accueil/recherche" style="font-weight:700;color:var(--bleu);">recherche</a>,
          puis cliquez "📅 RDV" sur sa ligne.
        </div>
        <input type="text" id="searchPatient" placeholder="Tapez nom ou numéro…" autocomplete="off"
          style="margin-bottom:8px;" oninput="searchPat(this.value)">
        <div id="searchResults" style="display:none;background:white;border:1px solid var(--bordure);
          border-radius:var(--rs);max-height:200px;overflow-y:auto;"></div>
        <input type="hidden" name="patient_id" id="patientIdInput">
        `}
      </div>

      <div class="grid2">
        <div class="form-group">
          <label class="form-label">Médecin <span>*</span></label>
          <select name="medecin_id" required>
            <option value="">Sélectionner un médecin…</option>
            ${medecinsList.map((m: any) => {
              const p = m.auth_profiles
              return `<option value="${m.id}">Dr. ${p?.prenom||''} ${p?.nom||''} — ${m.specialite_principale||'Généraliste'}</option>`
            }).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Date et heure <span>*</span></label>
          <input type="datetime-local" name="date_heure" min="${minDate}" required>
        </div>
      </div>

      <div class="grid2">
        <div class="form-group">
          <label class="form-label">Motif <span>*</span></label>
          <input type="text" name="motif" placeholder="Motif de la consultation" required>
        </div>
        <div class="form-group">
          <label class="form-label">Durée (minutes)</label>
          <select name="duree">
            <option value="15">15 min</option>
            <option value="30" selected>30 min</option>
            <option value="45">45 min</option>
            <option value="60">1 heure</option>
          </select>
        </div>
      </div>

      <button type="submit" class="btn btn-bleu" style="width:100%;justify-content:center;padding:13px;font-size:15px;">
        ✅ Confirmer le rendez-vous
      </button>
    </form>
  </div>
</div>
<script>
var searchTimer;
function searchPat(q) {
  clearTimeout(searchTimer);
  if (q.length < 2) { document.getElementById('searchResults').style.display='none'; return; }
  searchTimer = setTimeout(async function() {
    var res = await fetch('/accueil/recherche?q=' + encodeURIComponent(q));
    // Simple: redirect to recherche
    document.getElementById('searchResults').style.display='block';
    document.getElementById('searchResults').innerHTML =
      '<div style="padding:12px;font-size:13px;color:var(--soft);">→ <a href="/accueil/recherche?q=' +
      encodeURIComponent(q) + '" style="color:var(--bleu);font-weight:700;">Voir les résultats pour «' + q + '»</a></div>';
  }, 300);
}
</script>`

  return c.html(page('Nouveau RDV', html))
})

accueilRoutes.post('/rdv/nouveau', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()

  const patientId = String(body.patient_id  || '').trim()
  const medecinId = String(body.medecin_id  || '').trim()
  const dateHeure = String(body.date_heure  || '').trim()
  const motif     = String(body.motif       || '').trim()
  const duree     = parseInt(String(body.duree || '30'))

  if (!patientId || !medecinId || !dateHeure || !motif) {
    return c.redirect('/accueil/rdv/nouveau?err=champs_requis', 303)
  }

  // Créer le RDV — apparaît automatiquement dans dashboard médecin + patient
  await supabase.from('medical_rendez_vous').insert({
    patient_id:    patientId,
    medecin_id:    medecinId,
    structure_id:  profil.structure_id,
    date_heure:    dateHeure,
    motif,
    duree_minutes: duree,
    statut:        'planifie',
  })

  return c.redirect('/accueil/rdv?succes=1', 303)
})

// ═══════════════════════════════════════════════════════════════
// MISE À JOUR STATUT RDV
// ═══════════════════════════════════════════════════════════════
accueilRoutes.post('/rdv/:id/statut', async (c) => {
  const supabase = c.get('supabase' as never) as any
  const profil   = c.get('profil' as never) as AuthProfile
  const id       = c.req.param('id')
  const body     = await c.req.parseBody()
  const statut   = String(body.statut || '').trim()

  const STATUTS = ['planifie','confirme','annule','passe','absent','reporte']
  if (STATUTS.includes(statut)) {
    await supabase.from('medical_rendez_vous')
      .update({ statut })
      .eq('id', id)
      .eq('structure_id', profil.structure_id)  // sécurité : seulement sa structure
  }
  // Retour intelligent : si referer dispo, retour sur la page précédente
  const ref = c.req.header('referer') || '/accueil/rdv'
  return c.redirect(ref, 303)
})
