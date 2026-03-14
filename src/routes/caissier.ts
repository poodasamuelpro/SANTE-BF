import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import type { AuthProfile } from '../lib/supabase'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
export const caissierRoutes = new Hono<{ Bindings: Bindings }>()
caissierRoutes.use('/*', requireAuth, requireRole('caissier', 'admin_structure'))

const FCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'

const CSS = `
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#F7F8FA;min-height:100vh}
    header{background:#B71C1C;padding:0 24px;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.15)}
    .hl{display:flex;align-items:center;gap:12px}
    .logo-wrap{display:flex;align-items:center;gap:12px;text-decoration:none}
    .logo{width:34px;height:34px;background:white;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px}
    .ht{font-family:'DM Serif Display',serif;font-size:18px;color:white}
    .ht span{font-family:'DM Sans',sans-serif;font-size:11px;opacity:.7;display:block}
    .hr{display:flex;align-items:center;gap:10px}
    .ub{background:rgba(255,255,255,.15);border-radius:8px;padding:6px 12px}
    .ub strong{display:block;font-size:13px;color:white}
    .ub small{font-size:11px;color:rgba(255,255,255,.7)}
    .logout{background:rgba(255,255,255,.2);color:white;border:none;padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
    .container{max-width:950px;margin:0 auto;padding:28px 20px}
    .page-title{font-family:'DM Serif Display',serif;font-size:26px;color:#1A1A2E;margin-bottom:4px}
    .page-sub{font-size:14px;color:#6B7280;margin-bottom:24px}
    .breadcrumb{font-size:13px;color:#6B7280;margin-bottom:16px}
    .breadcrumb a{color:#B71C1C;text-decoration:none}
    .alerte-err{background:#FFF5F5;border-left:4px solid #C62828;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#C62828}
    .alerte-ok{background:#E8F5E9;border-left:4px solid #1A6B3C;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#1A6B3C}
    .btn-primary{background:#B71C1C;color:white;padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;display:inline-block}
    .btn-secondary{background:#F3F4F6;color:#374151;padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;display:inline-block}
    .btn-vert{background:#1A6B3C;color:white;padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;display:inline-block}
    .btn-sm{background:#B71C1C;color:white;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif}
    .top-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px}
    .card{background:white;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;margin-bottom:24px}
    .card-body{padding:24px}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#B71C1C}
    thead th{padding:12px 16px;text-align:left;font-size:12px;color:white;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    tbody tr{border-bottom:1px solid #F5F5F5;transition:background .15s}
    tbody tr:hover{background:#FFF5F5}
    tbody td{padding:12px 16px;font-size:14px}
    tbody tr:last-child{border-bottom:none}
    .empty{padding:32px;text-align:center;color:#9E9E9E;font-style:italic}
    .badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .badge.payee{background:#E8F5E9;color:#1A6B3C}
    .badge.impayee{background:#FFF5F5;color:#B71C1C}
    .badge.partiellement_payee{background:#FFF3E0;color:#E65100}
    .badge.annulee{background:#F5F5F5;color:#9E9E9E}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .form-group{margin-bottom:0}
    .form-group.full{grid-column:1/-1}
    label{display:block;font-size:13px;font-weight:600;color:#1A1A2E;margin-bottom:7px}
    input,select{width:100%;padding:11px 14px;font-family:'DM Sans',sans-serif;font-size:14px;border:1.5px solid #E0E0E0;border-radius:10px;background:#F7F8FA;color:#1A1A2E;outline:none;transition:border-color .2s}
    input:focus,select:focus{border-color:#B71C1C;background:white}
    .form-actions{display:flex;gap:12px;margin-top:28px;justify-content:flex-end}
    .stat-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:28px}
    .sc{background:white;border-radius:12px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.06);border-top:4px solid #B71C1C}
    .sc-icon{font-size:28px;margin-bottom:8px}
    .sc-val{font-size:24px;font-weight:700;color:#B71C1C}
    .sc-lbl{font-size:12px;color:#6B7280;margin-top:4px}
    .facture-detail{background:white;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
    .fac-header{background:#B71C1C;padding:20px 24px;color:white}
    .fac-num{font-size:11px;opacity:.75;margin-bottom:4px}
    .fac-patient{font-family:'DM Serif Display',serif;font-size:22px}
    .ligne-acte{padding:14px 24px;border-bottom:1px solid #F5F5F5;display:flex;justify-content:space-between;align-items:center}
    .total-box{padding:20px 24px;background:#F7F8FA;border-top:2px solid #E0E0E0}
    .total-row{display:flex;justify-content:space-between;font-size:15px;margin-bottom:6px}
    .total-row.final{font-size:18px;font-weight:700;color:#B71C1C;padding-top:8px;border-top:1px solid #E0E0E0;margin-top:4px}
    @media(max-width:640px){.form-grid{grid-template-columns:1fr}.container{padding:16px 12px}.stat-cards{grid-template-columns:1fr 1fr}}
  </style>`

function headerHtml(profil: AuthProfile): string {
  return `<header>
    <div class="hl">
      <a href="/dashboard/caissier" class="logo-wrap">
        <div class="logo">🏥</div>
        <div class="ht">SantéBF <span>CAISSE</span></div>
      </a>
    </div>
    <div class="hr">
      <div class="ub"><strong>${profil.prenom} ${profil.nom}</strong><small>Caissier(e)</small></div>
      <a href="/auth/logout" class="logout">Déconnexion</a>
    </div>
  </header>`
}

// ── GET /caissier/factures ─────────────────────────────────
caissierRoutes.get('/factures', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const today = new Date().toISOString().split('T')[0]
  const { data: factures } = await sb
    .from('finance_factures')
    .select(`id, numero_facture, total_ttc, montant_patient, statut, created_at,
      patient_dossiers(nom, prenom)`)
    .eq('structure_id', profil.structure_id)
    .gte('created_at', today + 'T00:00:00')
    .order('created_at', { ascending: false })

  const total = (factures ?? []).filter((f: any) => f.statut === 'payee').reduce((s: number, f: any) => s + (f.total_ttc ?? 0), 0)
  const nbImpayees = (factures ?? []).filter((f: any) => f.statut === 'impayee').length

  return c.html(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Factures</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/caissier">Accueil</a> → Factures du jour</div>
    <div class="top-bar">
      <div><div class="page-title">Factures du jour</div></div>
      <a href="/caissier/facture/nouvelle" class="btn-primary">+ Nouvelle facture</a>
    </div>
    <div class="stat-cards">
      <div class="sc"><div class="sc-icon">💰</div><div class="sc-val">${FCFA(total)}</div><div class="sc-lbl">Encaissé aujourd'hui</div></div>
      <div class="sc"><div class="sc-icon">📋</div><div class="sc-val">${(factures??[]).length}</div><div class="sc-lbl">Factures totales</div></div>
      <div class="sc"><div class="sc-icon">⚠️</div><div class="sc-val" style="color:#E65100">${nbImpayees}</div><div class="sc-lbl">Impayées</div></div>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Numéro</th><th>Patient</th><th>Montant</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          ${(factures ?? []).length === 0 ? '<tr><td colspan="5" class="empty">Aucune facture aujourd\'hui</td></tr>'
            : (factures ?? []).map((f: any) => `
              <tr>
                <td><code style="background:#FFF5F5;color:#B71C1C;padding:2px 8px;border-radius:4px;font-size:12px">${f.numero_facture}</code></td>
                <td>${f.patient_dossiers?.prenom} ${f.patient_dossiers?.nom}</td>
                <td style="font-weight:700">${FCFA(f.total_ttc)}</td>
                <td><span class="badge ${f.statut}">${f.statut.replace(/_/g,' ')}</span></td>
                <td style="display:flex;gap:6px">
                  <a href="/caissier/factures/${f.id}" class="btn-secondary" style="font-size:12px;padding:5px 10px">Voir</a>
                  ${f.statut === 'impayee' ? `<a href="/caissier/factures/${f.id}/encaisser" class="btn-vert" style="font-size:12px;padding:5px 10px">Encaisser</a>` : ''}
                </td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div></body></html>`)
})

// ── GET /caissier/facture/nouvelle ─────────────────────────
caissierRoutes.get('/facture/nouvelle', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const { data: actes } = await sb
    .from('finance_actes_catalogue')
    .select('id, nom, code_acte, tarif_public, tarif_prive')
    .or(`structure_id.is.null,structure_id.eq.${profil.structure_id}`)
    .order('nom')

  return c.html(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Nouvelle facture</title>${CSS}
  <style>
    .acte-ligne{background:#F9FAFB;border:1px solid #E0E0E0;border-radius:10px;padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px}
    .btn-add-acte{background:#FFF5F5;color:#B71C1C;border:1px dashed #B71C1C;padding:10px;border-radius:8px;width:100%;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
    #total-display{font-size:20px;font-weight:700;color:#B71C1C;text-align:right;margin-top:12px}
  </style>
  </head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/caissier">Accueil</a> → <a href="/caissier/factures">Factures</a> → Nouvelle</div>
    <div class="page-title">Nouvelle facture</div>
    <div class="card card-body">
      <form method="POST" action="/caissier/facture/nouvelle" id="factureForm">
        <div class="form-grid">
          <div class="form-group full">
            <label>Numéro de dossier patient ou nom</label>
            <input type="text" name="patient_search" id="patientSearch" placeholder="Ex: BF-2025-000001 ou Sawadogo Aminata" autocomplete="off">
            <input type="hidden" name="patient_id" id="patientId">
            <div id="patientSuggest" style="display:none;background:white;border:1px solid #E0E0E0;border-radius:8px;margin-top:4px;box-shadow:0 4px 12px rgba(0,0,0,.1)"></div>
          </div>
        </div>

        <div style="margin:20px 0 12px;font-size:13px;font-weight:700;color:#B71C1C;text-transform:uppercase;letter-spacing:.5px">Actes / Prestations</div>
        <input type="hidden" name="actes_json" id="actesJson" value="[]">
        <div id="actesListe"></div>
        <button type="button" class="btn-add-acte" onclick="ajouterActe()">+ Ajouter un acte</button>
        <div id="total-display">Total : 0 FCFA</div>

        <div class="form-grid" style="margin-top:20px">
          <div class="form-group">
            <label>Mode de paiement</label>
            <select name="mode_paiement">
              <option value="especes">Espèces</option>
              <option value="orange_money">Orange Money</option>
              <option value="moov_money">Moov Money</option>
              <option value="carte_bancaire">Carte bancaire</option>
              <option value="assurance">Assurance</option>
              <option value="mutuelle">Mutuelle</option>
              <option value="bon_prise_en_charge">Bon de prise en charge</option>
              <option value="gratuit">Gratuit / Exonéré</option>
            </select>
          </div>
          <div class="form-group">
            <label>Part assurance (FCFA)</label>
            <input type="number" name="montant_assurance" value="0" min="0" id="assuranceInput" oninput="calculerTotal()">
          </div>
        </div>

        <div class="form-actions">
          <a href="/caissier/factures" class="btn-secondary">Annuler</a>
          <button type="submit" class="btn-primary" onclick="preparerJson()">Créer la facture →</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    const ACTES = ${JSON.stringify(actes ?? [])}
    let actesSelectionnes = []

    function ajouterActe() {
      const idx = actesSelectionnes.length
      actesSelectionnes.push({ acte_id: '', nom: '', montant: 0, quantite: 1 })

      const div = document.createElement('div')
      div.className = 'acte-ligne'
      div.id = 'acte-' + idx
      div.innerHTML = \`
        <select onchange="selectionnerActe(this, \${idx})" style="flex:2;padding:10px;border:1.5px solid #E0E0E0;border-radius:8px;font-family:inherit;font-size:13px;outline:none">
          <option value="">Choisir un acte du catalogue...</option>
          \${ACTES.map(a => \`<option value="\${a.id}" data-nom="\${a.nom}" data-tarif="\${a.tarif_public||0}">\${a.nom}</option>\`).join('')}
          <option value="autre">Autre (saisie manuelle)</option>
        </select>
        <input type="number" id="qte-\${idx}" value="1" min="1" style="width:60px;padding:10px;border:1.5px solid #E0E0E0;border-radius:8px;font-family:inherit;font-size:13px;outline:none" onchange="majMontant(\${idx})" placeholder="Qté">
        <input type="number" id="mnt-\${idx}" value="0" min="0" style="width:110px;padding:10px;border:1.5px solid #E0E0E0;border-radius:8px;font-family:inherit;font-size:13px;outline:none" onchange="majMontant(\${idx})" placeholder="Montant FCFA">
        <button type="button" onclick="document.getElementById('acte-\${idx}').remove();actesSelectionnes[\${idx}]=null;calculerTotal()" style="background:none;border:none;color:#B71C1C;font-size:18px;cursor:pointer">✕</button>\`
      document.getElementById('actesListe').appendChild(div)
    }

    function selectionnerActe(sel, idx) {
      const opt = sel.options[sel.selectedIndex]
      const tarif = parseInt(opt.dataset.tarif || '0')
      document.getElementById('mnt-' + idx).value = tarif
      actesSelectionnes[idx] = { acte_id: sel.value, nom: opt.dataset.nom || sel.value, montant: tarif, quantite: 1 }
      calculerTotal()
    }

    function majMontant(idx) {
      const qte = parseInt(document.getElementById('qte-'+idx)?.value || '1')
      const mnt = parseInt(document.getElementById('mnt-'+idx)?.value || '0')
      if (actesSelectionnes[idx]) { actesSelectionnes[idx].montant = mnt; actesSelectionnes[idx].quantite = qte }
      calculerTotal()
    }

    function calculerTotal() {
      const total = actesSelectionnes.filter(Boolean).reduce((s,a)=>s+(a.montant*a.quantite),0)
      const assurance = parseInt(document.getElementById('assuranceInput')?.value||'0')
      document.getElementById('total-display').textContent = 'Total : ' + total.toLocaleString('fr-FR') + ' FCFA (patient : ' + Math.max(0,total-assurance).toLocaleString('fr-FR') + ' FCFA)'
    }

    function preparerJson() {
      document.getElementById('actesJson').value = JSON.stringify(actesSelectionnes.filter(Boolean))
    }

    // Recherche patient en temps réel
    let searchTimer
    document.getElementById('patientSearch').addEventListener('input', function() {
      clearTimeout(searchTimer)
      const q = this.value.trim()
      if (q.length < 2) { document.getElementById('patientSuggest').style.display='none'; return }
      searchTimer = setTimeout(async () => {
        const res = await fetch('/caissier/api/patients?q=' + encodeURIComponent(q))
        const patients = await res.json()
        const div = document.getElementById('patientSuggest')
        if (patients.length === 0) { div.style.display='none'; return }
        div.innerHTML = patients.map(p =>
          \`<div onclick="selectPatient('\${p.id}','\${p.prenom} \${p.nom}')" style="padding:10px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid #F0F0F0" onmouseover="this.style.background='#F7F8FA'" onmouseout="this.style.background=''">\${p.prenom} \${p.nom} <span style="color:#9E9E9E">\${p.numero_national}</span></div>\`
        ).join('')
        div.style.display = 'block'
      }, 300)
    })

    function selectPatient(id, nom) {
      document.getElementById('patientSearch').value = nom
      document.getElementById('patientId').value = id
      document.getElementById('patientSuggest').style.display = 'none'
    }
  </script>
  </body></html>`)
})

// ── GET /caissier/api/patients ─────────────────────────────
caissierRoutes.get('/api/patients', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const q = String(c.req.query('q') ?? '').trim()
  if (q.length < 2) return c.json([])

  const { data } = await sb
    .from('patient_dossiers')
    .select('id, nom, prenom, numero_national')
    .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,numero_national.ilike.%${q}%`)
    .limit(8)

  return c.json(data ?? [])
})

// ── POST /caissier/facture/nouvelle ────────────────────────
caissierRoutes.post('/facture/nouvelle', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const body = await c.req.parseBody()

  const patientId = String(body.patient_id ?? '')
  const actesJson = String(body.actes_json ?? '[]')
  const actes = JSON.parse(actesJson)

  const montantAssurance = parseInt(String(body.montant_assurance ?? '0')) || 0
  const sousTtl = actes.reduce((s: number, a: any) => s + (a.montant * a.quantite), 0)
  const totalTtc = sousTtl
  const montantPatient = Math.max(0, totalTtc - montantAssurance)

  const { data: facture, error } = await sb
    .from('finance_factures')
    .insert({
      patient_id:        patientId,
      structure_id:      profil.structure_id,
      cree_par:          profil.id,
      sous_total:        sousTtl,
      total_ttc:         totalTtc,
      montant_assurance: montantAssurance,
      montant_patient:   montantPatient,
      statut:            'impayee',
    })
    .select('id')
    .single()

  if (error || !facture) return c.redirect('/caissier/factures?err=1')

  // Insérer les lignes
  if (actes.length > 0) {
    await sb.from('finance_facture_lignes').insert(
      actes.map((a: any) => ({
        facture_id:   facture.id,
        acte_nom:     a.nom,
        acte_id:      a.acte_id || null,
        quantite:     a.quantite || 1,
        prix_unitaire: a.montant,
        total_ligne:   a.montant * (a.quantite || 1),
      }))
    )
  }

  // Si mode paiement fourni → encaisser directement
  const mode = String(body.mode_paiement ?? '')
  if (mode && mode !== '') {
    await sb.from('finance_paiements').insert({
      facture_id:       facture.id,
      structure_id:     profil.structure_id,
      encaisse_par:     profil.id,
      montant:          montantPatient,
      mode_paiement:    mode,
      statut_paiement:  'valide',
    })
    await sb.from('finance_factures').update({ statut: 'payee' }).eq('id', facture.id)
  }

  return c.redirect(`/caissier/factures/${facture.id}?nouveau=1`)
})

// ── GET /caissier/factures/:id ─────────────────────────────
caissierRoutes.get('/factures/:id', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const id = c.req.param('id')
  const nouveau = c.req.query('nouveau') === '1'

  const { data: facture } = await sb
    .from('finance_factures')
    .select(`*, patient_dossiers(nom, prenom, numero_national),
      finance_facture_lignes(*),
      finance_paiements(mode_paiement, montant, statut_paiement, created_at)`)
    .eq('id', id)
    .single()

  if (!facture) return c.redirect('/caissier/factures')

  const lignes = Array.isArray(facture.finance_facture_lignes) ? facture.finance_facture_lignes : []
  const patient = facture.patient_dossiers as any

  return c.html(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — ${facture.numero_facture}</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/caissier">Accueil</a> → <a href="/caissier/factures">Factures</a> → ${facture.numero_facture}</div>
    ${nouveau ? `<div class="alerte-ok">✅ Facture créée et enregistrée avec succès.</div>` : ''}

    <div class="facture-detail">
      <div class="fac-header">
        <div class="fac-num">${facture.numero_facture}</div>
        <div class="fac-patient">${patient?.prenom} ${patient?.nom}</div>
        <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap">
          <span style="background:rgba(255,255,255,.2);padding:4px 12px;border-radius:20px;font-size:12px">${patient?.numero_national}</span>
          <span style="background:rgba(255,255,255,.2);padding:4px 12px;border-radius:20px;font-size:12px">${new Date(facture.created_at).toLocaleDateString('fr-FR')}</span>
          <span style="background:rgba(255,255,255,.2);padding:4px 12px;border-radius:20px;font-size:12px">${facture.statut}</span>
        </div>
      </div>

      ${lignes.map((l: any) => `
        <div class="ligne-acte">
          <div>
            <div style="font-size:14px;font-weight:600">${l.acte_nom}</div>
            <div style="font-size:12px;color:#9E9E9E">Quantité : ${l.quantite}</div>
          </div>
          <div style="font-weight:700;color:#B71C1C">${FCFA(l.total_ligne)}</div>
        </div>`).join('')}

      <div class="total-box">
        <div class="total-row"><span>Sous-total</span><span>${FCFA(facture.sous_total)}</span></div>
        ${facture.montant_assurance > 0 ? `<div class="total-row"><span>Part assurance</span><span style="color:#1A6B3C">- ${FCFA(facture.montant_assurance)}</span></div>` : ''}
        <div class="total-row final"><span>À PAYER</span><span>${FCFA(facture.montant_patient)}</span></div>
      </div>

      ${facture.statut === 'impayee' ? `
        <div style="padding:16px 24px;border-top:1px solid #F0F0F0">
          <form method="POST" action="/caissier/factures/${id}/encaisser" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
            <select name="mode_paiement" style="flex:1;padding:10px;border:1.5px solid #E0E0E0;border-radius:8px;font-family:inherit;min-width:160px">
              <option value="especes">Espèces</option>
              <option value="orange_money">Orange Money</option>
              <option value="moov_money">Moov Money</option>
              <option value="carte_bancaire">Carte bancaire</option>
              <option value="assurance">Assurance</option>
              <option value="gratuit">Gratuit</option>
            </select>
            <button type="submit" class="btn-vert">💳 Encaisser ${FCFA(facture.montant_patient)}</button>
          </form>
        </div>` : ''}
    </div>
  </div></body></html>`)
})

// ── POST /caissier/factures/:id/encaisser ──────────────────
caissierRoutes.post('/factures/:id/encaisser', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile
  const id = c.req.param('id')
  const body = await c.req.parseBody()

  const { data: facture } = await sb.from('finance_factures').select('montant_patient').eq('id', id).single()

  await sb.from('finance_paiements').insert({
    facture_id:      id,
    structure_id:    profil.structure_id,
    encaisse_par:    profil.id,
    montant:         facture?.montant_patient ?? 0,
    mode_paiement:   String(body.mode_paiement ?? 'especes'),
    statut_paiement: 'valide',
  })

  await sb.from('finance_factures').update({ statut: 'payee' }).eq('id', id)

  return c.redirect(`/caissier/factures/${id}`)
})

// ── GET /caissier/rapport ──────────────────────────────────
caissierRoutes.get('/rapport', async (c) => {
  const sb = c.get('supabase' as never) as ReturnType<typeof getSupabase>
  const profil = c.get('profil' as never) as AuthProfile

  const today = new Date().toISOString().split('T')[0]
  const { data: paiements } = await sb
    .from('finance_paiements')
    .select('montant, mode_paiement, statut_paiement')
    .eq('structure_id', profil.structure_id)
    .eq('statut_paiement', 'valide')
    .gte('created_at', today + 'T00:00:00')

  const parMode: Record<string, number> = {}
  let total = 0
  for (const p of paiements ?? []) {
    parMode[p.mode_paiement] = (parMode[p.mode_paiement] ?? 0) + p.montant
    total += p.montant
  }

  return c.html(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SantéBF — Rapport de caisse</title>${CSS}</head><body>
  ${headerHtml(profil)}
  <div class="container">
    <div class="breadcrumb"><a href="/dashboard/caissier">Accueil</a> → Rapport</div>
    <div class="page-title">Rapport de caisse</div>
    <div class="page-sub">${new Date().toLocaleDateString('fr-FR', {weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
    <div class="stat-cards">
      <div class="sc"><div class="sc-icon">💰</div><div class="sc-val">${FCFA(total)}</div><div class="sc-lbl">Total encaissé</div></div>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Mode de paiement</th><th>Montant</th></tr></thead>
        <tbody>
          ${Object.entries(parMode).map(([mode, mnt]: [string, any]) => `
            <tr><td>${mode.replace(/_/g,' ')}</td><td style="font-weight:700">${FCFA(mnt)}</td></tr>
          `).join('')}
          <tr style="background:#FFF5F5">
            <td style="font-weight:700">TOTAL</td>
            <td style="font-weight:700;color:#B71C1C">${FCFA(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div></body></html>`)
})
