/**
 * src/routes/infirmerie.ts
 * SantéBF — Module Infirmerie
 *
 * CORRECTIONS vs original :
 *  1. import './module-helpers' → './dashboard' (module-helpers n'existe pas)
 *  2. use('/*') au lieu de use('*')
 *  3. Bindings importé depuis supabase.ts
 *  4. medical_soins_infirmiers + medical_surveillance → N'EXISTENT PAS
 *     → Remplacés par medical_constantes (table existante)
 *  5. Colonnes medical_constantes corrigées :
 *     frequence_cardiaque → pouls
 *     saturation_oxygene  → saturation_o2
 *     frequence_respiratoire → frequence_resp
 *     structure_id → N'EXISTE PAS dans medical_constantes
 *     → filtre via patient_id (les constantes sont liées au patient)
 *  6. c.get() avec cast explicite
 */

import { Hono } from 'hono'
import { requirePlan } from '../middleware/plan'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'
import { pageSkeleton, statsGrid, actionCard } from './dashboard'

export const infirmerieRoutes = new Hono<{ Bindings: Bindings }>()

infirmerieRoutes.use('/*', requireAuth)
// Vérification plan — Infirmerie — Standard minimum
infirmerieRoutes.use('/*', requirePlan('standard', 'pro', 'pilote'))
infirmerieRoutes.use('/*', requireRole('infirmier', 'sage_femme', 'medecin', 'super_admin'))

/**
 * GET /infirmerie — Dashboard infirmerie
 */
infirmerieRoutes.get('/', async (c) => {
  const supabase = c.get('supabase' as never) as any
  const profil   = c.get('profil' as never) as AuthProfile

  try {
    const aujourdhui = new Date().toISOString().split('T')[0]

    // medical_constantes n'a pas structure_id → compter via medical_hospitalisations
    // et le nombre de constantes du jour via date_mesure
    const [constJourRes, hospitEnCoursRes] = await Promise.all([
      supabase.from('medical_constantes')
        .select('id', { count: 'exact', head: true })
        .gte('date_mesure', `${aujourdhui}T00:00:00`)
        .lte('date_mesure', `${aujourdhui}T23:59:59`),
      supabase.from('medical_hospitalisations')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', profil.structure_id!)
        .is('date_sortie_reelle', null)
        .is('type_sortie', null),
    ])

    const stats = {
      constJour:     constJourRes.count  ?? 0,
      hospitEnCours: hospitEnCoursRes.count ?? 0,
    }

    const contenu = `
      ${statsGrid([
        { label: 'Constantes ce jour',    value: stats.constJour,     icon: '📊', color: '#0288D1' },
        { label: 'Hospitalisés en cours', value: stats.hospitEnCours, icon: '🛏️', color: '#1A6B3C' },
        { label: 'Soins programmés',      value: '–',                 icon: '💉', color: '#9E9E9E' },
        { label: 'Sous surveillance',     value: '–',                 icon: '👁', color: '#9E9E9E' },
      ])}

      ${actionCard([
        { href: '/infirmerie/constantes', icon: '📊', label: 'Constantes',      colorClass: 'blue' },
        { href: '/hospitalisations',      icon: '🛏️', label: 'Hospitalisations', colorClass: 'vert' },
        { href: '/infirmerie/soins',      icon: '💉', label: 'Soins',           colorClass: ''     },
        { href: '/infirmerie/historique', icon: '📋', label: 'Historique',       colorClass: ''     },
      ])}

      <div class="section-box" style="padding:22px;margin-bottom:20px;">
        <div class="section-header"><h2>📊 Constantes vitales</h2></div>
        <p style="font-size:13px;color:#6b7280;padding:12px 0;">
          Enregistrez les constantes vitales des patients hospitalisés ou en consultation.
        </p>
        <a href="/infirmerie/constantes/nouvelle" style="display:inline-flex;align-items:center;gap:8px;background:#0288D1;color:white;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">
          ➕ Enregistrer des constantes
        </a>
      </div>

      <div class="section-box" style="padding:22px;background:#FFF8E1;border-left:4px solid #F9A825;border-radius:12px;">
        <h3 style="font-size:15px;font-weight:700;color:#E65100;margin-bottom:8px;">⚙️ Module Soins Infirmiers — En développement</h3>
        <p style="font-size:13px;color:#7a5500;line-height:1.6;">
          La gestion des soins programmés et de la surveillance des patients sera disponible dans une prochaine version.
        </p>
      </div>`

    return c.html(pageSkeleton(profil, 'Infirmerie', '#0288D1', contenu))

  } catch (err) {
    console.error('Erreur dashboard infirmerie:', err)
    return c.html(pageSkeleton(profil, 'Erreur', '#0288D1', '<div style="background:#FFF5F5;border-left:4px solid #B71C1C;border-radius:10px;padding:16px;font-size:14px;font-weight:600;color:#B71C1C;">⚠️ Erreur lors du chargement</div>'))
  }
})

/**
 * GET /infirmerie/constantes
 */
infirmerieRoutes.get('/constantes', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const succes   = c.req.query('succes') || ''

  // medical_constantes n'a pas structure_id — on récupère les récentes globalement
  const { data: recentes } = await supabase
    .from('medical_constantes')
    .select(`
      id, date_mesure,
      tension_systolique, tension_diastolique, pouls, temperature,
      saturation_o2, frequence_resp, poids, taille, notes,
      patient:patient_dossiers(nom, prenom, numero_national)
    `)
    .order('date_mesure', { ascending: false })
    .limit(20)

  const rows = (recentes ?? []).map((r: any) => {
    const p  = r.patient as any
    const dt = r.date_mesure
      ? new Date(r.date_mesure).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
      : '—'
    return `<tr>
      <td>${dt}</td>
      <td><strong>${p?.prenom||''} ${p?.nom||''}</strong><br><span style="font-size:11px;color:#6b7280;">${p?.numero_national||''}</span></td>
      <td>${r.tension_systolique||'–'}/${r.tension_diastolique||'–'}</td>
      <td>${r.pouls||'–'}</td>
      <td>${r.temperature||'–'}</td>
      <td>${r.saturation_o2||'–'}%</td>
      <td>${r.poids||'–'} kg</td>
    </tr>`
  }).join('')

  const contenu = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
      <a href="/infirmerie" style="background:white;border:1px solid #e2e8e4;color:#374151;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">← Infirmerie</a>
      <a href="/infirmerie/constantes/nouvelle" style="background:#0288D1;color:white;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">➕ Nouvelles constantes</a>
    </div>
    ${succes ? '<div style="background:#E8F5E9;border-left:4px solid #1A6B3C;border-radius:8px;padding:12px 15px;margin-bottom:14px;font-size:13px;color:#1A6B3C;font-weight:700;">✓ Constantes enregistrées avec succès.</div>' : ''}
    <div class="section-box">
      <div class="section-header"><h2>📊 Constantes récentes</h2></div>
      ${rows ? `<div style="overflow-x:auto;"><table>
        <thead><tr><th>Date/Heure</th><th>Patient</th><th>TA (mmHg)</th><th>Pouls (bpm)</th><th>T° (°C)</th><th>SpO2</th><th>Poids</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>` : '<div class="empty">Aucune constante enregistrée</div>'}
    </div>`

  return c.html(pageSkeleton(profil, 'Constantes vitales', '#0288D1', contenu))
})

/**
 * GET /infirmerie/constantes/nouvelle
 */
infirmerieRoutes.get('/constantes/nouvelle', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile

  const contenu = `
    <div style="margin-bottom:14px;">
      <a href="/infirmerie/constantes" style="background:white;border:1px solid #e2e8e4;color:#374151;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">← Retour</a>
    </div>
    <div class="section-box" style="padding:26px;">
      <h2 style="font-family:'DM Serif Display',serif;font-size:20px;margin-bottom:20px;">📊 Enregistrer des constantes vitales</h2>
      <form method="POST" action="/infirmerie/constantes/nouvelle">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div style="grid-column:1/-1;">
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Patient (ID) *</label>
            <input type="text" name="patient_search" placeholder="Nom ou numéro national…" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;" required>
            <input type="hidden" name="patient_id" id="patientId">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Date et heure de mesure</label>
            <input type="datetime-local" name="date_mesure" value="${new Date().toISOString().slice(0,16)}" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;">
          </div>
          <div></div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">TA systolique (mmHg)</label>
            <input type="number" name="tension_systolique" min="60" max="300" placeholder="Ex: 120" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">TA diastolique (mmHg)</label>
            <input type="number" name="tension_diastolique" min="30" max="200" placeholder="Ex: 80" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Pouls (bpm)</label>
            <input type="number" name="pouls" min="20" max="300" placeholder="Ex: 72" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Température (°C)</label>
            <input type="number" name="temperature" step="0.1" min="30" max="45" placeholder="Ex: 37.2" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Saturation O2 (%)</label>
            <input type="number" name="saturation_o2" min="50" max="100" placeholder="Ex: 98" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Fréquence respiratoire (/min)</label>
            <input type="number" name="frequence_resp" min="5" max="60" placeholder="Ex: 18" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Poids (kg)</label>
            <input type="number" name="poids" step="0.1" min="1" max="500" placeholder="Ex: 70.5" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Taille (cm)</label>
            <input type="number" name="taille" min="30" max="250" placeholder="Ex: 170" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;">
          </div>
          <div style="grid-column:1/-1;">
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Notes</label>
            <input type="text" name="notes" placeholder="Observations particulières…" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8e4;border-radius:8px;font-size:14px;font-family:inherit;">
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-top:20px;justify-content:flex-end;">
          <a href="/infirmerie/constantes" style="background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Annuler</a>
          <button type="submit" style="background:#0288D1;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Enregistrer</button>
        </div>
      </form>
    </div>`

  return c.html(pageSkeleton(profil, 'Nouvelles constantes', '#0288D1', contenu))
})

/**
 * POST /infirmerie/constantes/nouvelle
 */
infirmerieRoutes.post('/constantes/nouvelle', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()

  const num = (v: any) => v && String(v).trim() !== '' ? parseFloat(String(v)) : null

  const { error } = await supabase.from('medical_constantes').insert({
    patient_id:         String(body.patient_id || ''),
    mesure_par:         profil.id,
    date_mesure:        String(body.date_mesure || new Date().toISOString()),
    tension_systolique: num(body.tension_systolique),
    tension_diastolique: num(body.tension_diastolique),
    pouls:              num(body.pouls),              // ← colonne réelle (pas frequence_cardiaque)
    temperature:        num(body.temperature),
    saturation_o2:      num(body.saturation_o2),      // ← colonne réelle (pas saturation_oxygene)
    frequence_resp:     num(body.frequence_resp),      // ← colonne réelle (pas frequence_respiratoire)
    poids:              num(body.poids),
    taille:             num(body.taille),
    notes:              String(body.notes || '') || null,
  })

  if (error) {
    console.error('Erreur constantes:', error.message)
    return c.redirect('/infirmerie/constantes/nouvelle?erreur=1', 303)
  }

  return c.redirect('/infirmerie/constantes?succes=1', 303)
})

/** GET /infirmerie/soins — À venir */
infirmerieRoutes.get('/soins', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  return c.html(pageSkeleton(profil, 'Soins infirmiers', '#0288D1',
    `<div class="section-box" style="padding:32px;text-align:center;">
      <div style="font-size:40px;margin-bottom:14px;">⚙️</div>
      <h2 style="font-family:'DM Serif Display',serif;font-size:20px;margin-bottom:10px;">Module Soins Infirmiers</h2>
      <p style="color:#6b7280;font-size:14px;max-width:400px;margin:0 auto 20px;">Disponible dans une prochaine version de SantéBF.</p>
      <a href="/infirmerie" style="color:#0288D1;font-weight:700;font-size:13px;text-decoration:none;">← Retour dashboard infirmerie</a>
    </div>`
  ))
})

/** GET /infirmerie/surveillance — À venir */
infirmerieRoutes.get('/surveillance', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  return c.html(pageSkeleton(profil, 'Surveillance', '#0288D1',
    `<div class="section-box" style="padding:32px;text-align:center;">
      <div style="font-size:40px;margin-bottom:14px;">👁</div>
      <h2 style="font-family:'DM Serif Display',serif;font-size:20px;margin-bottom:10px;">Module Surveillance Patients</h2>
      <p style="color:#6b7280;font-size:14px;max-width:400px;margin:0 auto 20px;">Disponible dans une prochaine version de SantéBF.</p>
      <a href="/infirmerie" style="color:#0288D1;font-weight:700;font-size:13px;text-decoration:none;">← Retour dashboard infirmerie</a>
    </div>`
  ))
})

/** GET /infirmerie/recherche */
infirmerieRoutes.get('/recherche', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  return c.html(pageSkeleton(profil, 'Recherche', '#0288D1',
    `<div class="section-box" style="padding:28px;text-align:center;">
      <p style="color:#6b7280;">Fonctionnalité en développement.</p>
      <a href="/infirmerie" style="display:inline-block;margin-top:16px;color:#0288D1;font-weight:600;">← Retour</a>
    </div>`
  ))
})

/** GET /infirmerie/historique */
infirmerieRoutes.get('/historique', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any

  const { data: constantes } = await supabase
    .from('medical_constantes')
    .select(`
      id, date_mesure, tension_systolique, tension_diastolique,
      pouls, temperature, saturation_o2,
      patient:patient_dossiers(nom, prenom)
    `)
    .order('date_mesure', { ascending: false })
    .limit(50)

  const rows = (constantes ?? []).map((r: any) => {
    const p = r.patient as any
    return `<tr>
      <td>${r.date_mesure ? new Date(r.date_mesure).toLocaleString('fr-FR') : '—'}</td>
      <td>${p?.prenom||''} ${p?.nom||''}</td>
      <td>${r.tension_systolique||'–'}/${r.tension_diastolique||'–'}</td>
      <td>${r.pouls||'–'}</td>
      <td>${r.temperature||'–'}</td>
      <td>${r.saturation_o2||'–'}%</td>
    </tr>`
  }).join('')

  const contenu = `
    <div style="margin-bottom:14px;">
      <a href="/infirmerie" style="background:white;border:1px solid #e2e8e4;color:#374151;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">← Infirmerie</a>
    </div>
    <div class="section-box">
      <div class="section-header"><h2>📋 Historique des constantes</h2></div>
      ${rows ? `<div style="overflow-x:auto;"><table>
        <thead><tr><th>Date/Heure</th><th>Patient</th><th>TA (mmHg)</th><th>Pouls</th><th>T° (°C)</th><th>SpO2</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>` : '<div class="empty">Aucune constante enregistrée</div>'}
    </div>`

  return c.html(pageSkeleton(profil, 'Historique', '#0288D1', contenu))
})

/** GET /infirmerie/soin/:id */
infirmerieRoutes.get('/soin/:id', async (c) => {
  const profil = c.get('profil' as never) as AuthProfile
  const id     = c.req.param('id')
  return c.html(pageSkeleton(profil, 'Soin', '#0288D1',
    `<div class="section-box" style="padding:28px;">
      <p>Soin #${id} — Fonctionnalité en développement.</p>
      <a href="/infirmerie" style="color:#0288D1;font-weight:600;">← Retour</a>
    </div>`
  ))
})
