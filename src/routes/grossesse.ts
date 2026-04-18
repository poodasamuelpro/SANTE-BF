/**
 * src/routes/grossesse.ts
 * SantéBF — Module Suivi de Grossesse
 *
 * CORRECTIONS vs original :
 *  1. import './module-helpers' → './dashboard'
 *  2. use('/*') au lieu de use('*')
 *  3. Bindings importé depuis supabase.ts
 *  4. actionCard(...args individuels) → actionCard([tableau d'objets])
 *  5. FROM medical_grossesses → spec_grossesses (table réelle)
 *  6. ddr → date_dernieres_regles
 *  7. dpa → date_accouchement_prevue
 *  8. terme_semaines → age_gestationnel_debut
 *  9. nb_cpn → COUNT via spec_grossesse_cpn
 * 10. prochaine_cpn → spec_grossesse_cpn.prochaine_cpn_date
 * 11. risque → grossesse_a_risque (BOOLEAN) + facteurs_risque (TEXT)
 * 12. INSERT: colonnes correctes
 * 13. CPN du jour: depuis spec_grossesse_cpn.prochaine_cpn_date
 * 14. c.get() avec cast explicite
 */

import { Hono } from 'hono'
import { requirePlan } from '../middleware/plan'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'
import { pageSkeleton, statsGrid, actionCard } from './dashboard'

export const grossesseRoutes = new Hono<{ Bindings: Bindings }>()

grossesseRoutes.use('/*', requireAuth)
// Vérification plan — Grossesse & CPN — Standard minimum
grossesseRoutes.use('/*', requirePlan('standard', 'pro', 'pilote'))
grossesseRoutes.use('/*', requireRole('sage_femme', 'medecin', 'super_admin'))

/**
 * GET /grossesse — Dashboard suivi de grossesse
 */
grossesseRoutes.get('/', async (c) => {
  const supabase = c.get('supabase' as never) as any
  const profil   = c.get('profil' as never) as AuthProfile

  try {
    const aujourdhui = new Date().toISOString().split('T')[0]
    const debutMois  = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const finMois    = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()

    const [enCoursRes, accMoisRes, cpnJourRes, aRisqueRes] = await Promise.all([
      // grossesse_a_risque est BOOLEAN — pas de colonne 'risque'
      supabase.from('spec_grossesses')
        .select(`
          id, patient_id, date_dernieres_regles, date_accouchement_prevue,
          age_gestationnel_debut, statut, grossesse_a_risque, facteurs_risque,
          patient:patient_dossiers(nom, prenom, numero_national, date_naissance)
        `)
        .eq('structure_id', profil.structure_id!)
        .eq('statut', 'en_cours')
        .order('date_accouchement_prevue', { ascending: true })
        .limit(20),

      supabase.from('spec_grossesses')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', profil.structure_id!)
        .eq('statut', 'en_cours')
        .gte('date_accouchement_prevue', debutMois)
        .lte('date_accouchement_prevue', finMois),

      // CPN du jour via spec_grossesse_cpn.prochaine_cpn_date
      supabase.from('spec_grossesse_cpn')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', profil.structure_id!)
        .eq('prochaine_cpn_date', aujourdhui),

      supabase.from('spec_grossesses')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', profil.structure_id!)
        .eq('statut', 'en_cours')
        .eq('grossesse_a_risque', true),
    ])

    const enCours = enCoursRes.data ?? []
    const stats = {
      enCours:           enCours.length,
      accouchementsMois: accMoisRes.count  ?? 0,
      cpnJour:           cpnJourRes.count  ?? 0,
      aRisque:           aRisqueRes.count  ?? 0,
    }

    // Charger nb_cpn pour chaque grossesse via spec_grossesse_cpn
    const grossesseIds = enCours.map((g: any) => g.id)
    let cpnCounts: Record<string, number> = {}
    let cpnProchaines: Record<string, string | null> = {}

    if (grossesseIds.length > 0) {
      const { data: cpns } = await supabase
        .from('spec_grossesse_cpn')
        .select('grossesse_id, prochaine_cpn_date')
        .in('grossesse_id', grossesseIds)
        .order('date_cpn', { ascending: false })

      for (const cpn of cpns ?? []) {
        cpnCounts[cpn.grossesse_id] = (cpnCounts[cpn.grossesse_id] ?? 0) + 1
        if (!cpnProchaines[cpn.grossesse_id]) {
          cpnProchaines[cpn.grossesse_id] = cpn.prochaine_cpn_date
        }
      }
    }

    const contenu = `
      ${statsGrid([
        { label: 'Grossesses en cours',   value: stats.enCours,           icon: '🤰', color: '#1565C0' },
        { label: 'Accouchements ce mois', value: stats.accouchementsMois, icon: '👶', color: '#1A6B3C' },
        { label: "CPN aujourd'hui",       value: stats.cpnJour,           icon: '📅', color: '#E65100' },
        { label: 'À risque',              value: stats.aRisque,           icon: '⚠️', color: '#B71C1C' },
      ])}

      ${actionCard([
        { href: '/grossesse/nouveau',       icon: '➕', label: 'Nouvelle grossesse', colorClass: 'blue'   },
        { href: '/grossesse/cpn-jour',      icon: '📋', label: 'CPN du jour',        colorClass: 'vert'   },
        { href: '/grossesse/recherche',     icon: '🔍', label: 'Rechercher',          colorClass: ''       },
        { href: '/grossesse/accouchements', icon: '👶', label: 'Accouchements',        colorClass: ''       },
      ])}

      <div class="section-box">
        <div class="section-header"><h2>🤰 Grossesses en cours (${enCours.length})</h2></div>
        ${enCours.length === 0
          ? '<div class="empty">Aucune grossesse en cours</div>'
          : `<div style="overflow-x:auto">
              <table>
                <thead><tr>
                  <th>Patiente</th><th>Terme (SA)</th><th>DPA</th>
                  <th>CPN</th><th>Prochaine CPN</th><th>Risque</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  ${enCours.map((g: any) => {
                    const nbCpn      = cpnCounts[g.id]      ?? 0
                    const procCpn    = cpnProchaines[g.id]   ?? null
                    const risque     = g.grossesse_a_risque ? 'Élevé' : 'Normal'
                    const risqueClass = g.grossesse_a_risque ? 'badge-danger' : 'badge-ok'
                    return `<tr>
                      <td><strong>${g.patient?.prenom||''} ${g.patient?.nom||''}</strong><br>
                        <span style="font-size:11px;color:#6b7280;">${g.patient?.numero_national||''}</span></td>
                      <td>${g.age_gestationnel_debut||'—'} SA</td>
                      <td>${g.date_accouchement_prevue ? new Date(g.date_accouchement_prevue).toLocaleDateString('fr-FR') : '—'}</td>
                      <td>${nbCpn}</td>
                      <td>${procCpn ? new Date(procCpn).toLocaleDateString('fr-FR') : '—'}</td>
                      <td><span class="badge ${risqueClass}">${risque}</span></td>
                      <td><a href="/grossesse/dossier/${g.id}" style="color:#1565C0;font-size:13px">Voir →</a></td>
                    </tr>`
                  }).join('')}
                </tbody>
              </table>
            </div>`
        }
      </div>`

    return c.html(pageSkeleton(profil, 'Suivi de grossesse', '#E91E63', contenu))

  } catch (err) {
    console.error('Erreur dashboard grossesse:', err)
    return c.html(pageSkeleton(profil, 'Erreur', '#E91E63', '<div style="background:#FFF5F5;border-left:4px solid #B71C1C;border-radius:10px;padding:16px;font-size:14px;font-weight:600;color:#B71C1C;">⚠️ Erreur lors du chargement du dashboard</div>'))
  }
})

/**
 * GET /grossesse/nouveau
 */
grossesseRoutes.get('/nouveau', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile

  const contenu = `
    <div class="section-box" style="padding:28px">
      <h1 style="font-family:'DM Serif Display',serif;font-size:22px;margin-bottom:20px">Déclaration de grossesse</h1>
      <form method="POST" action="/grossesse/nouveau">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
          <div style="grid-column:1/-1">
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Patiente *</label>
            <input type="text" name="patient_search" placeholder="Rechercher par nom, numéro national…" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit" required>
            <input type="hidden" name="patient_id">
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Date dernières règles (DDR) *</label>
            <input type="date" name="date_dernieres_regles" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit" required>
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Grossesse à risque</label>
            <select name="grossesse_a_risque" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit">
              <option value="false">Non — Grossesse normale</option>
              <option value="true">Oui — Grossesse à risque</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Gestité (G)</label>
            <input type="number" name="gestite" min="1" placeholder="Nombre de grossesses" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit">
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Parité (P)</label>
            <input type="number" name="parite" min="0" placeholder="Nombre d'accouchements" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit">
          </div>
          <div style="grid-column:1/-1">
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Facteurs de risque / Antécédents</label>
            <textarea name="facteurs_risque" rows="3" placeholder="Césarienne, fausse couche, diabète gestationnel, HTA…" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;resize:vertical"></textarea>
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-top:24px;justify-content:flex-end">
          <a href="/grossesse" style="background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Annuler</a>
          <button type="submit" style="background:#E91E63;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Enregistrer →</button>
        </div>
      </form>
    </div>`

  return c.html(pageSkeleton(profil, 'Nouvelle grossesse', '#E91E63', contenu))
})

/**
 * POST /grossesse/nouveau
 */
grossesseRoutes.post('/nouveau', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()

  // Calculer DPA = DDR + 280 jours
  const ddr = new Date(String(body['date_dernieres_regles'] || body.date_ddr || ''))
  const dpa = new Date(ddr)
  dpa.setDate(dpa.getDate() + 280)

  const { error } = await supabase.from('spec_grossesses').insert({
    patient_id:             body.patient_id,
    structure_id:           profil.structure_id,
    medecin_referent_id: profil.medecin_id ?? profil.id,
    date_dernieres_regles:  String(body['date_dernieres_regles'] || body.date_ddr || ''),
    date_accouchement_prevue: isNaN(dpa.getTime()) ? null : dpa.toISOString().split('T')[0],
    grossesse_a_risque:     body.grossesse_a_risque === 'true',
    facteurs_risque:        String(body.facteurs_risque || '') || null,
    gestite:                body.gestite ? parseInt(String(body.gestite)) : null,
    parite:                 body.parite  ? parseInt(String(body.parite))  : null,
    statut:                 'en_cours',
  })

  if (error) {
    console.error('Erreur création grossesse:', error.message)
    return c.redirect('/grossesse/nouveau?erreur=1', 303)
  }
  return c.redirect('/grossesse', 303)
})

/**
 * GET /grossesse/dossier/:id
 */
grossesseRoutes.get('/dossier/:id', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')

  const { data: g } = await supabase
    .from('spec_grossesses')
    .select(`
      id, date_dernieres_regles, date_accouchement_prevue,
      age_gestationnel_debut, grossesse_a_risque, facteurs_risque,
      gestite, parite, statut,
      patient:patient_dossiers(nom, prenom, numero_national, date_naissance, groupe_sanguin, rhesus)
    `)
    .eq('id', id)
    .single()

  if (!g) return c.html(pageSkeleton(profil, 'Introuvable', '#E91E63',
    '<div style="background:#FFF5F5;border-left:4px solid #B71C1C;border-radius:10px;padding:16px;font-size:14px;font-weight:600;color:#B71C1C;">⚠️ Dossier grossesse introuvable</div>'), 404)

  const patient  = g.patient as any
  const { data: cpns } = await supabase
    .from('spec_grossesse_cpn')
    .select('id, numero_cpn, date_cpn, age_gestationnel_sa, prochaine_cpn_date, poids_kg, tension_sys, tension_dia')
    .eq('grossesse_id', id)
    .order('date_cpn', { ascending: false })

  const contenu = `
    <div style="margin-bottom:14px;">
      <a href="/grossesse" style="background:white;border:1px solid #e2e8e4;color:#374151;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">← Grossesses en cours</a>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div class="section-box" style="padding:20px;">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;">👤 Patiente</h3>
        <div style="font-size:13px;display:flex;flex-direction:column;gap:8px;">
          <div><span style="color:#6b7280;">Nom : </span><strong>${patient?.prenom||''} ${patient?.nom||''}</strong></div>
          <div><span style="color:#6b7280;">N° national : </span>${patient?.numero_national||'—'}</div>
          <div><span style="color:#6b7280;">Groupe sanguin : </span><strong style="color:#b71c1c;">${patient?.groupe_sanguin||'?'}${patient?.rhesus||''}</strong></div>
        </div>
      </div>
      <div class="section-box" style="padding:20px;">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;">🤰 Grossesse</h3>
        <div style="font-size:13px;display:flex;flex-direction:column;gap:8px;">
          <div><span style="color:#6b7280;">DDR : </span>${g.date_dernieres_regles ? new Date(g.date_dernieres_regles).toLocaleDateString('fr-FR') : '—'}</div>
          <div><span style="color:#6b7280;">DPA : </span><strong>${g.date_accouchement_prevue ? new Date(g.date_accouchement_prevue).toLocaleDateString('fr-FR') : '—'}</strong></div>
          <div><span style="color:#6b7280;">Terme début : </span>${g.age_gestationnel_debut||'—'} SA</div>
          <div><span style="color:#6b7280;">Risque : </span><span class="badge ${g.grossesse_a_risque ? 'badge-danger' : 'badge-ok'}">${g.grossesse_a_risque ? 'Élevé' : 'Normal'}</span></div>
          <div><span style="color:#6b7280;">G</span>${g.gestite||'—'} / <span style="color:#6b7280;">P</span>${g.parite||0}</div>
        </div>
      </div>
    </div>
    <div class="section-box">
      <div class="section-header"><h2>📋 CPN réalisées (${(cpns??[]).length})</h2></div>
      ${(cpns??[]).length === 0
        ? '<div class="empty">Aucune CPN enregistrée</div>'
        : `<table>
            <thead><tr><th>CPN n°</th><th>Date</th><th>Terme (SA)</th><th>Poids (kg)</th><th>TA</th><th>Prochaine CPN</th></tr></thead>
            <tbody>
              ${(cpns??[]).map((cpn: any) => `<tr>
                <td><strong>CPN ${cpn.numero_cpn||'?'}</strong></td>
                <td>${cpn.date_cpn ? new Date(cpn.date_cpn).toLocaleDateString('fr-FR') : '—'}</td>
                <td>${cpn.age_gestationnel_sa||'—'} SA</td>
                <td>${cpn.poids_kg||'—'}</td>
                <td>${cpn.tension_sys||'–'}/${cpn.tension_dia||'–'}</td>
                <td>${cpn.prochaine_cpn_date ? new Date(cpn.prochaine_cpn_date).toLocaleDateString('fr-FR') : '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>`
      }
    </div>`

  return c.html(pageSkeleton(profil, 'Dossier grossesse', '#E91E63', contenu))
})

/**
 * GET /grossesse/cpn-jour
 */
grossesseRoutes.get('/cpn-jour', async (c) => {
  const profil    = c.get('profil' as never) as AuthProfile
  const supabase  = c.get('supabase' as never) as any
  const aujourdhui = new Date().toISOString().split('T')[0]

  // Chercher dans spec_grossesse_cpn.prochaine_cpn_date (pas medical_grossesses)
  const { data: cpns } = await supabase
    .from('spec_grossesse_cpn')
    .select(`
      id, grossesse_id, numero_cpn, prochaine_cpn_date,
      grossesse:spec_grossesses(
        id,
        patient:patient_dossiers(nom, prenom)
      )
    `)
    .eq('structure_id', profil.structure_id!)
    .eq('prochaine_cpn_date', aujourdhui)
    .order('prochaine_cpn_date', { ascending: true })

  const contenu = `
    <div style="margin-bottom:14px;"><a href="/grossesse" style="background:white;border:1px solid #e2e8e4;color:#374151;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">← Retour</a></div>
    <div class="section-box">
      <div class="section-header"><h2>📋 CPN du jour (${cpns?.length || 0})</h2></div>
      ${!cpns || cpns.length === 0
        ? '<div class="empty">Aucune CPN programmée aujourd\'hui</div>'
        : `<table>
            <thead><tr><th>Patiente</th><th>CPN n°</th><th>Actions</th></tr></thead>
            <tbody>
              ${(cpns as any[]).map(cpn => {
                const patient = cpn.grossesse?.patient as any
                return `<tr>
                  <td><strong>${patient?.prenom||''} ${patient?.nom||''}</strong></td>
                  <td>CPN ${(cpn.numero_cpn||0) + 1}</td>
                  <td><a href="/grossesse/dossier/${cpn.grossesse_id}" style="color:#E91E63;font-size:13px">Voir dossier →</a></td>
                </tr>`
              }).join('')}
            </tbody>
          </table>`}
    </div>`

  return c.html(pageSkeleton(profil, 'CPN du jour', '#E91E63', contenu))
})

/** GET /grossesse/accouchements */
grossesseRoutes.get('/accouchements', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  return c.html(pageSkeleton(profil, 'Accouchements', '#E91E63',
    `<div class="section-box" style="padding:28px;text-align:center;">
      <div style="font-size:40px;margin-bottom:14px;">👶</div>
      <h2 style="font-family:'DM Serif Display',serif;font-size:20px;margin-bottom:10px;">Module Accouchements</h2>
      <p style="color:#6b7280;font-size:14px;max-width:400px;margin:0 auto 20px;">Disponible dans une prochaine version.</p>
      <a href="/grossesse" style="color:#E91E63;font-weight:700;font-size:13px;text-decoration:none;">← Retour</a>
    </div>`
  ))
})

/**
 * GET /grossesse/recherche
 */
grossesseRoutes.get('/recherche', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const q        = String(c.req.query('q') ?? '').trim()

  let resultats: any[] = []
  if (q.length >= 2) {
    const { data } = await supabase
      .from('spec_grossesses')
      .select(`
        id, statut, date_accouchement_prevue,
        patient:patient_dossiers(nom, prenom, numero_national)
      `)
      .eq('structure_id', profil.structure_id!)
      .order('date_accouchement_prevue', { ascending: false })
      .limit(20)

    resultats = (data ?? []).filter((g: any) =>
      `${g.patient?.nom} ${g.patient?.prenom} ${g.patient?.numero_national}`
        .toLowerCase().includes(q.toLowerCase())
    )
  }

  const contenu = `
    <div style="margin-bottom:20px">
      <form action="/grossesse/recherche" method="GET" style="display:flex;gap:10px">
        <input type="text" name="q" value="${q}" placeholder="Nom, prénom ou numéro national…" autofocus
          style="flex:1;padding:12px 16px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;outline:none">
        <button type="submit" style="background:#E91E63;color:white;border:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Rechercher</button>
      </form>
    </div>
    ${q && resultats.length === 0
      ? '<div class="section-box"><div class="empty">Aucun résultat pour "' + q + '"</div></div>'
      : resultats.length > 0
        ? `<div class="section-box">
            <div class="section-header"><h2>Résultats (${resultats.length})</h2></div>
            <table>
              <thead><tr><th>Patiente</th><th>DPA</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                ${resultats.map((g: any) => `<tr>
                  <td><strong>${g.patient?.prenom||''} ${g.patient?.nom||''}</strong><br>
                    <span style="font-size:11px;color:#6b7280;">${g.patient?.numero_national||''}</span></td>
                  <td>${g.date_accouchement_prevue ? new Date(g.date_accouchement_prevue).toLocaleDateString('fr-FR') : '—'}</td>
                  <td><span class="badge ${g.statut === 'en_cours' ? 'badge-blue' : 'badge-ok'}">${g.statut}</span></td>
                  <td><a href="/grossesse/dossier/${g.id}" style="color:#E91E63;font-size:13px">Voir →</a></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`
        : ''
    }`

  return c.html(pageSkeleton(profil, 'Recherche grossesse', '#E91E63', contenu))
})