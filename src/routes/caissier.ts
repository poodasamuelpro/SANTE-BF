/**
 * src/routes/caissier.ts
 * SantéBF — Routes Caissier
 * Monté sur /caissier dans functions/[[path]].ts
 *
 * CORRECTIONS vs version originale :
 *  1. finance_facture_lignes.acte_nom    → description  (vrai nom colonne DB)
 *  2. finance_facture_lignes.total_ligne → montant_total (vrai nom colonne DB)
 *  3. finance_paiements.encaisse_par     → caissier_id  (vrai nom colonne DB)
 *  4. finance_paiements.structure_id     → retiré (n'existe pas dans le schéma)
 *  5. Redirections → 303 explicite
 *  6. Vérification patient_id avant INSERT facture
 *
 * AJOUTS :
 *  7. POST /factures/:id/annuler
 *  8. GET  /factures/:id/recu  (reçu imprimable)
 *  9. GET  /rapport avec filtre période (jour/semaine/mois)
 * 10. Filtre statut sur liste factures
 *
 * Connexions :
 *  finance_factures           → CRUD complet
 *  finance_facture_lignes     → lignes d'actes
 *  finance_paiements          → enregistrement paiements
 *  finance_actes_catalogue    → tarifs catalogue
 *  patient_dossiers           → recherche patient (autocomplete)
 *  dashboard admin structure  → recettes du jour temps réel
 *  dashboard patient          → /patient/factures mis à jour
 */
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthProfile, Bindings } from '../lib/supabase'

export const caissierRoutes = new Hono<{ Bindings: Bindings }>()
caissierRoutes.use('/*', requireAuth, requireRole('caissier', 'admin_structure'))

// ── Utilitaires ───────────────────────────────────────────────
const fcfa = (n: number) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA'

const ROUGE_C = '#B71C1C'

const CSS = `
:root{
  --cs:#B71C1C;--cs-f:#7f0000;--cs-c:#FFF5F5;
  --vert:#1A6B3C;--vert-c:#E8F5EE;
  --or:#E65100;--or-c:#FFF3E0;
  --bleu:#1565C0;--bleu-c:#E3F2FD;
  --texte:#0f1923;--soft:#5a6a78;
  --bg:#FFF5F5;--blanc:#fff;--bordure:#FFCDD2;
  --r:14px;--rs:10px;--sh:0 2px 10px rgba(0,0,0,.06);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);}
a{color:inherit;text-decoration:none;}
.topbar{background:linear-gradient(135deg,var(--cs-f),var(--cs));height:54px;
  display:flex;align-items:center;justify-content:space-between;padding:0 20px;
  position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(183,28,28,.3);}
.tb-brand{display:flex;align-items:center;gap:10px;}
.tb-ico{font-size:20px;}
.tb-name{font-family:'Fraunces',serif;font-size:17px;color:white;}
.tb-sub{font-size:10px;color:rgba(255,255,255,.5);letter-spacing:1px;text-transform:uppercase;}
.tb-right{display:flex;align-items:center;gap:10px;}
.tb-user strong{display:block;font-size:13px;font-weight:700;color:white;text-align:right;}
.tb-user small{font-size:11px;color:rgba(255,255,255,.5);}
.tb-btn{background:rgba(255,255,255,.15);color:white;padding:7px 14px;
  border-radius:8px;font-size:12px;font-weight:600;white-space:nowrap;}
.tb-btn:hover{background:rgba(255,255,255,.25);}
.wrap{max-width:1000px;margin:0 auto;padding:22px 16px;}
.page-hd{display:flex;align-items:center;justify-content:space-between;
  margin-bottom:20px;flex-wrap:wrap;gap:10px;}
.page-title{font-family:'Fraunces',serif;font-size:22px;}
.back{display:inline-flex;align-items:center;gap:7px;background:var(--blanc);
  border:1px solid var(--bordure);color:var(--texte);padding:8px 14px;
  border-radius:var(--rs);font-size:13px;font-weight:700;}
.back:hover{background:var(--cs-c);color:var(--cs);}
.card{background:var(--blanc);border-radius:var(--r);padding:20px 22px;
  box-shadow:var(--sh);border:1px solid var(--bordure);margin-bottom:14px;}
.badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;}
.b-vert{background:var(--vert-c);color:var(--vert);}
.b-rouge{background:var(--cs-c);color:var(--cs);}
.b-or{background:var(--or-c);color:var(--or);}
.b-gris{background:#f0f0f0;color:#666;}
.b-bleu{background:var(--bleu-c);color:var(--bleu);}
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:var(--rs);
  font-size:13px;font-weight:700;border:none;cursor:pointer;font-family:inherit;text-decoration:none;}
.btn-cs{background:var(--cs);color:white;}
.btn-cs:hover{background:var(--cs-f);}
.btn-vert{background:var(--vert);color:white;}
.btn-soft{background:var(--bg);color:var(--texte);border:1px solid var(--bordure);}
.btn-gris{background:#f0f0f0;color:#666;}
.ok-box{background:var(--vert-c);border-left:4px solid var(--vert);border-radius:var(--rs);
  padding:12px 15px;margin-bottom:14px;font-size:13px;color:var(--vert);font-weight:700;}
.err-box{background:var(--cs-c);border-left:4px solid var(--cs);border-radius:var(--rs);
  padding:12px 15px;margin-bottom:14px;font-size:13px;color:var(--cs);}
.info-box{background:var(--bleu-c);border-left:4px solid var(--bleu);border-radius:var(--rs);
  padding:12px 15px;margin-bottom:14px;font-size:13px;color:#1a3a6b;}
table{width:100%;border-collapse:collapse;}
thead tr{background:var(--cs-c);}
thead th{padding:10px 14px;text-align:left;font-size:11.5px;font-weight:700;
  color:var(--cs);text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid var(--bordure);}
tbody tr{border-bottom:1px solid var(--bordure);}
tbody tr:hover{background:#fff8f8;}
tbody td{padding:10px 14px;font-size:14px;}
.empty{text-align:center;padding:32px;color:var(--soft);font-style:italic;font-size:13px;}
.form-group{margin-bottom:14px;}
.form-label{display:block;font-size:12px;font-weight:700;color:var(--texte);margin-bottom:5px;}
.form-label span{color:var(--cs);}
input,select,textarea{width:100%;padding:10px 14px;border:1.5px solid var(--bordure);
  border-radius:var(--rs);font-size:14px;font-family:inherit;outline:none;background:#fffafa;}
input:focus,select:focus{border-color:var(--cs);background:white;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
.sep{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--bordure);}
.sep:last-child{border-bottom:none;}
@media(max-width:640px){.grid2,.grid3{grid-template-columns:1fr;}.wrap{padding:14px 12px;}}
`

function topbar(profil: AuthProfile, titre: string): string {
  const ini = `${(profil.prenom||'?').charAt(0)}${(profil.nom||'?').charAt(0)}`
  return `<div class="topbar">
  <div class="tb-brand">
    <span class="tb-ico">💰</span>
    <div><div class="tb-name">SantéBF</div><div class="tb-sub">Caisse · ${titre}</div></div>
  </div>
  <div class="tb-right">
    <div class="tb-user">
      <strong>${profil.prenom} ${profil.nom}</strong>
      <small>Caissier(e)</small>
    </div>
    <div style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.2);
      display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;">${ini}</div>
    <a href="/dashboard/caissier" class="tb-btn">⊞ Dashboard</a>
    <a href="/auth/logout" class="tb-btn">⏻</a>
  </div>
</div>`
}

function page(titre: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titre} — SantéBF Caisse</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>${body}</body>
</html>`
}

function statutBadge(s: string): string {
  const m: Record<string,string> = {
    payee: 'b-vert', impayee: 'b-rouge',
    partiellement_payee: 'b-or', annulee: 'b-gris', remboursee: 'b-bleu',
  }
  return `<span class="badge ${m[s]||'b-gris'}">${s.replace(/_/g,' ')}</span>`
}

// ═══════════════════════════════════════════════════════════════
// LISTE FACTURES
// ═══════════════════════════════════════════════════════════════
caissierRoutes.get('/factures', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const filtreStatut = c.req.query('statut') || 'today'
  const succes       = c.req.query('succes') || ''

  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('finance_factures')
    .select(`id, numero_facture, total_ttc, montant_patient, statut, created_at,
      patient_dossiers(nom, prenom)`)
    .eq('structure_id', profil.structure_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filtreStatut === 'today')   query = query.gte('created_at', today + 'T00:00:00')
  if (filtreStatut === 'impayee') query = query.eq('statut', 'impayee')
  if (filtreStatut === 'payee')   query = query.eq('statut', 'payee')

  const { data: factures } = await query

  const totalEncaisse = (factures ?? [])
    .filter((f: any) => f.statut === 'payee')
    .reduce((s: number, f: any) => s + (f.total_ttc || 0), 0)
  const nbImpayees = (factures ?? []).filter((f: any) => f.statut === 'impayee').length

  const rows = (factures ?? []).map((f: any) => {
    const p = f.patient_dossiers as any
    return `<tr>
      <td><code style="background:var(--cs-c);color:var(--cs);padding:2px 8px;border-radius:4px;font-size:12px;">${f.numero_facture}</code></td>
      <td>${p?.prenom||''} ${p?.nom||''}</td>
      <td style="font-weight:700;">${fcfa(f.total_ttc)}</td>
      <td>${fcfa(f.montant_patient)}</td>
      <td>${statutBadge(f.statut)}</td>
      <td>${new Date(f.created_at).toLocaleDateString('fr-FR')}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap;">
        <a href="/caissier/factures/${f.id}" class="btn btn-soft" style="font-size:12px;padding:5px 10px;">Voir</a>
        ${f.statut === 'impayee' ? `<a href="/caissier/factures/${f.id}" class="btn btn-vert" style="font-size:12px;padding:5px 10px;">💳 Encaisser</a>` : ''}
      </td>
    </tr>`
  }).join('')

  const html = `
${topbar(profil, 'Factures')}
<div class="wrap">
  <div class="page-hd">
    <div>
      <div class="page-title">🧾 Factures</div>
      <div style="font-size:12px;color:var(--soft);margin-top:2px;">${fcfa(totalEncaisse)} encaissés · ${nbImpayees} impayée(s)</div>
    </div>
    <a href="/caissier/facture/nouvelle" class="btn btn-cs">➕ Nouvelle facture</a>
  </div>
  ${succes === 'encaisse' ? '<div class="ok-box">✓ Paiement enregistré avec succès.</div>' : ''}
  ${succes === 'cree' ? '<div class="ok-box">✓ Facture créée avec succès.</div>' : ''}
  ${succes === 'annulee' ? '<div class="ok-box">✓ Facture annulée.</div>' : ''}

  <!-- Filtres -->
  <div class="card" style="padding:12px 16px;margin-bottom:14px;">
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      ${[['today','Aujourd\'hui'],['impayee','Impayées'],['payee','Payées'],['all','Toutes']].map(([v,l]) =>
        `<a href="/caissier/factures?statut=${v}" class="btn ${filtreStatut===v?'btn-cs':'btn-soft'}" style="font-size:12px;padding:7px 14px;">${l}</a>`
      ).join('')}
    </div>
  </div>

  <!-- Stats rapides -->
  <div class="grid3" style="margin-bottom:14px;">
    <div class="card" style="text-align:center;padding:16px;">
      <div style="font-family:'Fraunces',serif;font-size:26px;color:var(--vert);">${fcfa(totalEncaisse)}</div>
      <div style="font-size:12px;color:var(--soft);">Encaissé</div>
    </div>
    <div class="card" style="text-align:center;padding:16px;">
      <div style="font-family:'Fraunces',serif;font-size:26px;">${(factures??[]).length}</div>
      <div style="font-size:12px;color:var(--soft);">Factures totales</div>
    </div>
    <div class="card" style="text-align:center;padding:16px;">
      <div style="font-family:'Fraunces',serif;font-size:26px;color:${nbImpayees>0?'var(--cs)':'var(--vert)'};">${nbImpayees}</div>
      <div style="font-size:12px;color:var(--soft);">Impayées</div>
    </div>
  </div>

  <div class="card">
    ${rows ? `<table>
      <thead><tr><th>Numéro</th><th>Patient</th><th>Total</th><th>À payer</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>` : '<div class="empty">Aucune facture</div>'}
  </div>
</div>`

  return c.html(page('Factures', html))
})

// ═══════════════════════════════════════════════════════════════
// NOUVELLE FACTURE — FORMULAIRE
// ═══════════════════════════════════════════════════════════════
caissierRoutes.get('/facture/nouvelle', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const erreur   = c.req.query('err') || ''

  const { data: actes } = await supabase
    .from('finance_actes_catalogue')
    .select('id, nom, tarif_public, tarif_prive')
    .or(`structure_id.is.null,structure_id.eq.${profil.structure_id}`)
    .order('nom')
    .limit(200)

  const html = `
${topbar(profil, 'Nouvelle facture')}
<div class="wrap">
  <div class="page-hd">
    <div class="page-title">➕ Nouvelle facture</div>
    <a href="/caissier/factures" class="back">← Retour</a>
  </div>
  ${erreur === 'patient_requis' ? '<div class="err-box">⚠️ Vous devez sélectionner un patient.</div>' : ''}
  ${erreur === 'actes_requis'   ? '<div class="err-box">⚠️ Vous devez ajouter au moins un acte.</div>' : ''}

  <form method="POST" action="/caissier/facture/nouvelle">
    <!-- Recherche patient -->
    <div class="card">
      <div style="font-size:14px;font-weight:700;margin-bottom:14px;">👤 Patient</div>
      <div class="form-group">
        <label class="form-label">Rechercher le patient <span>*</span></label>
        <input type="text" id="patientSearch" placeholder="Nom, prénom ou numéro BF-XXXX…" autocomplete="off">
        <input type="hidden" name="patient_id" id="patientId">
        <div id="patientSelected" style="display:none;margin-top:8px;background:var(--vert-c);
          padding:10px 14px;border-radius:var(--rs);color:var(--vert);font-weight:700;font-size:13px;"></div>
        <div id="patientSuggest" style="display:none;background:white;border:1.5px solid var(--bordure);
          border-radius:var(--rs);margin-top:4px;box-shadow:0 4px 12px rgba(0,0,0,.08);max-height:200px;overflow-y:auto;"></div>
      </div>
    </div>

    <!-- Actes -->
    <div class="card">
      <div style="font-size:14px;font-weight:700;margin-bottom:14px;">📋 Actes et prestations</div>
      <input type="hidden" name="actes_json" id="actesJson" value="[]">
      <div id="actesListe"></div>
      <button type="button" onclick="ajouterActe()" class="btn btn-soft" style="width:100%;justify-content:center;margin-top:8px;border-style:dashed;">
        ➕ Ajouter un acte
      </button>
      <div style="text-align:right;margin-top:14px;font-family:'Fraunces',serif;font-size:22px;color:var(--cs);" id="totalDisplay">
        Total : 0 FCFA
      </div>
    </div>

    <!-- Paiement -->
    <div class="card">
      <div style="font-size:14px;font-weight:700;margin-bottom:14px;">💳 Paiement</div>
      <div class="grid2">
        <div class="form-group">
          <label class="form-label">Mode de paiement</label>
          <select name="mode_paiement">
            <option value="especes">💵 Espèces</option>
            <option value="orange_money">🟠 Orange Money</option>
            <option value="moov_money">🔵 Moov Money</option>
            <option value="carte_bancaire">💳 Carte bancaire</option>
            <option value="assurance">🏥 Assurance</option>
            <option value="mutuelle">🤝 Mutuelle</option>
            <option value="bon_prise_en_charge">📄 Bon de prise en charge</option>
            <option value="gratuit">🆓 Gratuit / Exonéré</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Part assurance (FCFA)</label>
          <input type="number" name="montant_assurance" id="assuranceInput" value="0" min="0" oninput="calculerTotal()">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <input type="text" name="notes" placeholder="Remarques optionnelles…">
      </div>
    </div>

    <button type="submit" onclick="preparerJson()" class="btn btn-cs" style="width:100%;justify-content:center;padding:14px;font-size:15px;">
      ✅ Créer la facture
    </button>
  </form>
</div>

<script>
var ACTES = ${JSON.stringify(actes ?? [])};
var actesSelectionnes = [];

function ajouterActe() {
  var idx = actesSelectionnes.length;
  actesSelectionnes.push({ acte_id: '', description: '', montant: 0, quantite: 1 });
  var div = document.createElement('div');
  div.id = 'acte-' + idx;
  div.style.cssText = 'background:#fffafa;border:1px solid var(--bordure);border-radius:var(--rs);padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;';
  div.innerHTML =
    '<select onchange="selectionnerActe(this,' + idx + ')" style="flex:2;min-width:180px;padding:9px;border:1.5px solid var(--bordure);border-radius:var(--rs);font-family:inherit;font-size:13px;outline:none;">' +
    '<option value="">Catalogue…</option>' +
    ACTES.map(function(a) { return '<option value="' + a.id + '" data-nom="' + a.nom + '" data-tarif="' + (a.tarif_public||0) + '">' + a.nom + ' (' + (a.tarif_public||0).toLocaleString("fr-FR") + ' FCFA)</option>'; }).join('') +
    '<option value="autre">Autre (saisie manuelle)</option>' +
    '</select>' +
    '<input type="text" id="nom-' + idx + '" placeholder="Description" style="flex:2;min-width:140px;padding:9px;border:1.5px solid var(--bordure);border-radius:var(--rs);font-family:inherit;font-size:13px;" oninput="majNom(' + idx + ')">' +
    '<input type="number" id="qte-' + idx + '" value="1" min="1" style="width:60px;padding:9px;border:1.5px solid var(--bordure);border-radius:var(--rs);font-family:inherit;font-size:13px;" onchange="majMontant(' + idx + ')" placeholder="Qté">' +
    '<input type="number" id="mnt-' + idx + '" value="0" min="0" style="width:110px;padding:9px;border:1.5px solid var(--bordure);border-radius:var(--rs);font-family:inherit;font-size:13px;" onchange="majMontant(' + idx + ')" placeholder="FCFA">' +
    '<button type="button" onclick="supprimerActe(' + idx + ')" style="background:none;border:none;color:var(--cs);font-size:18px;cursor:pointer;padding:0 4px;">✕</button>';
  document.getElementById('actesListe').appendChild(div);
}

function supprimerActe(idx) {
  var el = document.getElementById('acte-' + idx);
  if (el) el.remove();
  actesSelectionnes[idx] = null;
  calculerTotal();
}

function selectionnerActe(sel, idx) {
  var opt = sel.options[sel.selectedIndex];
  var tarif = parseInt(opt.dataset.tarif || '0');
  var nom = opt.dataset.nom || '';
  document.getElementById('mnt-' + idx).value = tarif;
  document.getElementById('nom-' + idx).value = nom;
  actesSelectionnes[idx] = { acte_id: sel.value !== 'autre' ? sel.value : '', description: nom, montant: tarif, quantite: 1 };
  calculerTotal();
}

function majNom(idx) {
  if (actesSelectionnes[idx]) actesSelectionnes[idx].description = document.getElementById('nom-' + idx).value;
}

function majMontant(idx) {
  var qte = parseInt(document.getElementById('qte-' + idx)?.value || '1');
  var mnt = parseInt(document.getElementById('mnt-' + idx)?.value || '0');
  if (actesSelectionnes[idx]) { actesSelectionnes[idx].montant = mnt; actesSelectionnes[idx].quantite = qte; }
  calculerTotal();
}

function calculerTotal() {
  var total = actesSelectionnes.filter(Boolean).reduce(function(s,a) { return s + (a.montant * a.quantite); }, 0);
  var assurance = parseInt(document.getElementById('assuranceInput')?.value || '0') || 0;
  var patient = Math.max(0, total - assurance);
  document.getElementById('totalDisplay').textContent =
    'Total : ' + total.toLocaleString('fr-FR') + ' FCFA (patient : ' + patient.toLocaleString('fr-FR') + ' FCFA)';
}

function preparerJson() {
  document.getElementById('actesJson').value = JSON.stringify(actesSelectionnes.filter(Boolean).filter(function(a) { return a.description && a.montant >= 0; }));
}

// Recherche patient autocomplete
var searchTimer;
document.getElementById('patientSearch').addEventListener('input', function() {
  clearTimeout(searchTimer);
  var q = this.value.trim();
  if (q.length < 2) { document.getElementById('patientSuggest').style.display = 'none'; return; }
  searchTimer = setTimeout(async function() {
    try {
      var res = await fetch('/caissier/api/patients?q=' + encodeURIComponent(q));
      var patients = await res.json();
      var div = document.getElementById('patientSuggest');
      if (!patients.length) { div.style.display = 'none'; return; }
      div.innerHTML = patients.map(function(p) {
        return '<div onclick="selectPatient(\'' + p.id + '\',\'' + p.prenom + ' ' + p.nom + '\')" ' +
          'style="padding:10px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--bordure);" ' +
          'onmouseover="this.style.background=\'var(--cs-c)\'" onmouseout="this.style.background=\'\'">'+
          p.prenom + ' ' + p.nom + ' <span style="color:var(--soft);font-size:11px;">' + p.numero_national + '</span></div>';
      }).join('');
      div.style.display = 'block';
    } catch(e) {}
  }, 300);
});

function selectPatient(id, nom) {
  document.getElementById('patientSearch').value = nom;
  document.getElementById('patientId').value = id;
  document.getElementById('patientSuggest').style.display = 'none';
  var sel = document.getElementById('patientSelected');
  sel.textContent = '✓ ' + nom + ' sélectionné(e)';
  sel.style.display = 'block';
}
</script>`

  return c.html(page('Nouvelle facture', html))
})

// ═══════════════════════════════════════════════════════════════
// API RECHERCHE PATIENT (autocomplete)
// ═══════════════════════════════════════════════════════════════
caissierRoutes.get('/api/patients', async (c) => {
  const supabase = c.get('supabase' as never) as any
  const q        = String(c.req.query('q') ?? '').trim()
  if (q.length < 2) return c.json([])

  const { data } = await supabase
    .from('patient_dossiers')
    .select('id, nom, prenom, numero_national')
    .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,numero_national.ilike.%${q}%`)
    .limit(8)

  return c.json(data ?? [])
})

// ═══════════════════════════════════════════════════════════════
// CRÉER UNE FACTURE
// ═══════════════════════════════════════════════════════════════
caissierRoutes.post('/facture/nouvelle', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const body     = await c.req.parseBody()

  const patientId = String(body.patient_id ?? '').trim()
  if (!patientId) return c.redirect('/caissier/facture/nouvelle?err=patient_requis', 303)

  const actesJson = String(body.actes_json ?? '[]')
  let actes: any[] = []
  try { actes = JSON.parse(actesJson) } catch { actes = [] }
  if (actes.length === 0) return c.redirect('/caissier/facture/nouvelle?err=actes_requis', 303)

  const montantAssurance = parseInt(String(body.montant_assurance ?? '0')) || 0
  const sousTtl          = actes.reduce((s: number, a: any) => s + ((a.montant || 0) * (a.quantite || 1)), 0)
  const totalTtc         = sousTtl
  const montantPatient   = Math.max(0, totalTtc - montantAssurance)
  const notes            = String(body.notes ?? '').trim() || null

  // Créer la facture
  const { data: facture, error } = await supabase
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
      notes,
    })
    .select('id')
    .single()

  if (error || !facture) return c.redirect('/caissier/facture/nouvelle?err=db', 303)

  // Insérer les lignes (colonnes corrigées selon schéma DB)
  if (actes.length > 0) {
    await supabase.from('finance_facture_lignes').insert(
      actes.map((a: any, i: number) => ({
        facture_id:    facture.id,
        acte_id:       a.acte_id || null,
        ordre:         i + 1,
        description:   a.description || a.nom || 'Acte',  // ← colonne correcte
        quantite:      a.quantite || 1,
        prix_unitaire: a.montant || 0,
        montant_total: (a.montant || 0) * (a.quantite || 1),  // ← colonne correcte
      }))
    )
  }

  // Si mode paiement → encaisser directement
  const mode = String(body.mode_paiement ?? '').trim()
  if (mode && mode !== 'impayee') {
    await supabase.from('finance_paiements').insert({
      facture_id:      facture.id,
      patient_id:      patientId,
      caissier_id:     profil.id,         // ← colonne correcte
      montant:         montantPatient,
      mode_paiement:   mode,
      statut_paiement: 'valide',
    })
    await supabase.from('finance_factures')
      .update({ statut: 'payee' })
      .eq('id', facture.id)
  }

  return c.redirect(`/caissier/factures/${facture.id}?succes=cree`, 303)
})

// ═══════════════════════════════════════════════════════════════
// DÉTAIL FACTURE
// ═══════════════════════════════════════════════════════════════
caissierRoutes.get('/factures/:id', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')
  const succes   = c.req.query('succes') || ''

  const { data: facture } = await supabase
    .from('finance_factures')
    .select(`
      id, numero_facture, total_ttc, montant_patient, montant_assurance,
      sous_total, statut, created_at, notes,
      patient_dossiers(id, nom, prenom, numero_national, telephone),
      finance_facture_lignes(id, description, quantite, prix_unitaire, montant_total),
      finance_paiements(mode_paiement, montant, statut_paiement, date_paiement)
    `)
    .eq('id', id)
    .eq('structure_id', profil.structure_id)
    .single()

  if (!facture) return c.redirect('/caissier/factures', 303)

  const patient  = facture.patient_dossiers as any
  const lignes   = (facture.finance_facture_lignes as any[]) || []
  const paiements = (facture.finance_paiements as any[]) || []

  const lignesHtml = lignes.map((l: any) => `
    <div class="sep">
      <div>
        <div style="font-size:14px;font-weight:600;">${l.description}</div>
        <div style="font-size:12px;color:var(--soft);">Quantité : ${l.quantite}</div>
      </div>
      <div style="font-weight:700;color:var(--cs);">${fcfa(l.montant_total)}</div>
    </div>`).join('')

  const html = `
${topbar(profil, facture.numero_facture)}
<div class="wrap">
  <div class="page-hd">
    <div class="page-title">${facture.numero_facture}</div>
    <a href="/caissier/factures" class="back">← Factures</a>
  </div>

  ${succes === 'cree'    ? '<div class="ok-box">✓ Facture créée avec succès.</div>' : ''}
  ${succes === 'encaisse'? '<div class="ok-box">✓ Paiement encaissé avec succès.</div>' : ''}
  ${succes === 'annulee' ? '<div class="ok-box">✓ Facture annulée.</div>' : ''}

  <!-- En-tête patient -->
  <div class="card" style="background:linear-gradient(135deg,var(--cs-f),var(--cs));border:none;margin-bottom:14px;">
    <div style="color:white;">
      <div style="font-size:11px;opacity:.7;margin-bottom:3px;">${facture.numero_facture}</div>
      <div style="font-family:'Fraunces',serif;font-size:20px;margin-bottom:3px;">
        ${patient?.prenom||''} ${patient?.nom||''}
      </div>
      <div style="font-size:12px;opacity:.8;display:flex;gap:12px;flex-wrap:wrap;">
        <span>${patient?.numero_national||''}</span>
        ${patient?.telephone ? `<span>📞 ${patient.telephone}</span>` : ''}
        <span>${new Date(facture.created_at).toLocaleDateString('fr-FR')}</span>
        ${statutBadge(facture.statut).replace('class="badge', 'style="font-size:11px;" class="badge')}
      </div>
    </div>
  </div>

  <div class="grid2">
    <!-- Lignes actes -->
    <div class="card">
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;">📋 Actes</div>
      ${lignesHtml || '<div style="color:var(--soft);font-size:13px;">Aucun acte enregistré</div>'}
      <div style="border-top:2px solid var(--bordure);margin-top:10px;padding-top:10px;">
        ${facture.montant_assurance > 0 ? `
          <div class="sep"><span style="font-size:13px;">Sous-total</span><span style="font-weight:700;">${fcfa(facture.sous_total)}</span></div>
          <div class="sep"><span style="font-size:13px;color:var(--vert);">Part assurance</span><span style="color:var(--vert);font-weight:700;">- ${fcfa(facture.montant_assurance)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;padding-top:8px;">
          <span style="font-size:16px;font-weight:700;">À PAYER</span>
          <span style="font-size:18px;font-weight:700;color:var(--cs);">${fcfa(facture.montant_patient)}</span>
        </div>
      </div>
    </div>

    <!-- Actions + paiements -->
    <div>
      ${facture.statut === 'impayee' ? `
        <div class="card">
          <div style="font-size:14px;font-weight:700;margin-bottom:12px;">💳 Encaisser</div>
          <form method="POST" action="/caissier/factures/${id}/encaisser">
            <div class="form-group">
              <label class="form-label">Mode de paiement</label>
              <select name="mode_paiement">
                <option value="especes">💵 Espèces</option>
                <option value="orange_money">🟠 Orange Money</option>
                <option value="moov_money">🔵 Moov Money</option>
                <option value="carte_bancaire">💳 Carte bancaire</option>
                <option value="assurance">🏥 Assurance</option>
                <option value="mutuelle">🤝 Mutuelle</option>
                <option value="gratuit">🆓 Gratuit</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Référence transaction (mobile money)</label>
              <input type="text" name="reference_transaction" placeholder="Ex: ORM-XXXXXXXX">
            </div>
            <button type="submit" class="btn btn-vert" style="width:100%;justify-content:center;padding:12px;">
              💳 Encaisser ${fcfa(facture.montant_patient)}
            </button>
          </form>
        </div>` : ''}

      ${paiements.length > 0 ? `
        <div class="card">
          <div style="font-size:14px;font-weight:700;margin-bottom:12px;">✅ Paiements</div>
          ${paiements.map((p: any) => `
            <div class="sep">
              <div>
                <div style="font-size:13px;font-weight:600;">${p.mode_paiement.replace(/_/g,' ')}</div>
                <div style="font-size:11px;color:var(--soft);">${p.date_paiement ? new Date(p.date_paiement).toLocaleDateString('fr-FR') : '—'}</div>
              </div>
              <span class="badge b-vert">${fcfa(p.montant)}</span>
            </div>`).join('')}
        </div>` : ''}

      <div class="card">
        <div style="font-size:14px;font-weight:700;margin-bottom:12px;">⚡ Actions</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <a href="/caissier/factures/${id}/recu" target="_blank" class="btn btn-soft" style="justify-content:center;">
            🖨️ Imprimer reçu
          </a>
          ${facture.statut === 'impayee' ? `
            <form method="POST" action="/caissier/factures/${id}/annuler">
              <button type="submit" class="btn btn-gris" style="width:100%;justify-content:center;"
                onclick="return confirm('Annuler cette facture ?')">
                ✕ Annuler la facture
              </button>
            </form>` : ''}
        </div>
      </div>
    </div>
  </div>
</div>`

  return c.html(page(facture.numero_facture, html))
})

// ═══════════════════════════════════════════════════════════════
// ENCAISSER UNE FACTURE
// ═══════════════════════════════════════════════════════════════
caissierRoutes.post('/factures/:id/encaisser', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')
  const body     = await c.req.parseBody()

  const { data: facture } = await supabase
    .from('finance_factures')
    .select('montant_patient, patient_id')
    .eq('id', id)
    .eq('structure_id', profil.structure_id)
    .single()

  if (!facture) return c.redirect('/caissier/factures', 303)

  const ref = String(body.reference_transaction ?? '').trim() || null

  // Créer le paiement (colonnes correctes selon schéma DB)
  await supabase.from('finance_paiements').insert({
    facture_id:            id,
    patient_id:            facture.patient_id,
    caissier_id:           profil.id,            // ← colonne correcte
    montant:               facture.montant_patient,
    mode_paiement:         String(body.mode_paiement ?? 'especes'),
    reference_transaction: ref,
    statut_paiement:       'valide',
  })

  await supabase.from('finance_factures')
    .update({ statut: 'payee' })
    .eq('id', id)

  return c.redirect(`/caissier/factures/${id}?succes=encaisse`, 303)
})

// ═══════════════════════════════════════════════════════════════
// ANNULER UNE FACTURE
// ═══════════════════════════════════════════════════════════════
caissierRoutes.post('/factures/:id/annuler', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')

  await supabase.from('finance_factures')
    .update({ statut: 'annulee' })
    .eq('id', id)
    .eq('structure_id', profil.structure_id)
    .eq('statut', 'impayee')  // sécurité : ne peut annuler que si impayée

  return c.redirect(`/caissier/factures?succes=annulee`, 303)
})

// ═══════════════════════════════════════════════════════════════
// REÇU IMPRIMABLE
// ═══════════════════════════════════════════════════════════════
caissierRoutes.get('/factures/:id/recu', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const id       = c.req.param('id')

  const { data: facture } = await supabase
    .from('finance_factures')
    .select(`
      id, numero_facture, total_ttc, montant_patient, montant_assurance,
      sous_total, statut, created_at,
      patient_dossiers(nom, prenom, numero_national),
      finance_facture_lignes(description, quantite, prix_unitaire, montant_total),
      finance_paiements(mode_paiement, montant, date_paiement)
    `)
    .eq('id', id)
    .eq('structure_id', profil.structure_id)
    .single()

  if (!facture) return c.text('Facture introuvable', 404)

  const patient = facture.patient_dossiers as any
  const lignes  = (facture.finance_facture_lignes as any[]) || []
  const paiements = (facture.finance_paiements as any[]) || []
  const modePaiement = paiements[0]?.mode_paiement?.replace(/_/g,' ') || '—'

  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Reçu ${facture.numero_facture}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;background:white;padding:20px;max-width:320px;margin:0 auto;}
  .header{text-align:center;border-bottom:2px solid #B71C1C;padding-bottom:12px;margin-bottom:12px;}
  .header h2{font-size:14px;color:#B71C1C;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}
  .header .num{font-size:11px;color:#666;}
  .row{display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid #eee;}
  .total-row{display:flex;justify-content:space-between;font-size:14px;font-weight:700;
    color:#B71C1C;padding:8px 0;border-top:2px solid #B71C1C;margin-top:6px;}
  .footer{text-align:center;font-size:10px;color:#999;margin-top:14px;border-top:1px solid #eee;padding-top:10px;}
  .print-btn{display:block;width:100%;background:#B71C1C;color:white;border:none;
    padding:10px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:12px;}
  @media print{.print-btn{display:none;}}
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨️ Imprimer</button>
<div class="header">
  <h2>🏥 SantéBF</h2>
  <div class="num">REÇU DE PAIEMENT</div>
  <div class="num">${facture.numero_facture}</div>
  <div class="num">${new Date(facture.created_at).toLocaleDateString('fr-FR')}</div>
</div>
<div class="row"><span>Patient</span><span>${patient?.prenom||''} ${patient?.nom||''}</span></div>
<div class="row"><span>N° dossier</span><span>${patient?.numero_national||'—'}</span></div>
<div class="row"><span>Mode paiement</span><span>${modePaiement}</span></div>
<div style="margin-top:10px;">
  ${lignes.map((l: any) => `
    <div class="row">
      <span>${l.description} (x${l.quantite})</span>
      <span>${fcfa(l.montant_total)}</span>
    </div>`).join('')}
  ${facture.montant_assurance > 0 ? `<div class="row"><span>Part assurance</span><span>- ${fcfa(facture.montant_assurance)}</span></div>` : ''}
</div>
<div class="total-row"><span>TOTAL PAYÉ</span><span>${fcfa(facture.montant_patient)}</span></div>
<div class="footer">
  SantéBF — Système National de Santé Numérique<br>
  Burkina Faso 🇧🇫 · ${new Date().getFullYear()}
</div>
</body>
</html>`)
})

// ═══════════════════════════════════════════════════════════════
// RAPPORT DE CAISSE
// ═══════════════════════════════════════════════════════════════
caissierRoutes.get('/rapport', async (c) => {
  const profil   = c.get('profil' as never) as AuthProfile
  const supabase = c.get('supabase' as never) as any
  const periode  = c.req.query('periode') || 'today'

  const now    = new Date()
  let debutStr = now.toISOString().split('T')[0] + 'T00:00:00'

  if (periode === 'week') {
    const lundi = new Date(now)
    lundi.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
    debutStr = lundi.toISOString().split('T')[0] + 'T00:00:00'
  } else if (periode === 'month') {
    debutStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] + 'T00:00:00'
  }

  const { data: paiements } = await supabase
    .from('finance_paiements')
    .select('montant, mode_paiement, statut_paiement')
    .eq('statut_paiement', 'valide')
    .gte('date_paiement', debutStr)

  // Filtrer par structure via jointure factures
  const { data: factures } = await supabase
    .from('finance_factures')
    .select('total_ttc, statut, created_at')
    .eq('structure_id', profil.structure_id)
    .gte('created_at', debutStr)

  const parMode: Record<string,number> = {}
  let total = 0
  for (const p of paiements ?? []) {
    parMode[p.mode_paiement] = (parMode[p.mode_paiement] || 0) + p.montant
    total += p.montant
  }

  const totalFactures   = (factures ?? []).length
  const totalPayees     = (factures ?? []).filter((f: any) => f.statut === 'payee').length
  const totalImpayees   = (factures ?? []).filter((f: any) => f.statut === 'impayee').length
  const montantTotal    = (factures ?? []).filter((f: any) => f.statut === 'payee')
    .reduce((s: number, f: any) => s + (f.total_ttc || 0), 0)

  const modeRows = Object.entries(parMode).map(([mode, mnt]: [string, any]) => `
    <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bordure);">
      <span style="font-size:14px;">${mode.replace(/_/g,' ')}</span>
      <span style="font-weight:700;">${fcfa(mnt)}</span>
    </div>`).join('')

  const html = `
${topbar(profil, 'Rapport')}
<div class="wrap">
  <div class="page-hd">
    <div class="page-title">📊 Rapport de caisse</div>
  </div>

  <!-- Filtres période -->
  <div class="card" style="padding:12px 16px;margin-bottom:14px;">
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      ${[['today','Aujourd\'hui'],['week','Cette semaine'],['month','Ce mois']].map(([v,l]) =>
        `<a href="/caissier/rapport?periode=${v}" class="btn ${periode===v?'btn-cs':'btn-soft'}" style="font-size:12px;padding:7px 14px;">${l}</a>`
      ).join('')}
    </div>
  </div>

  <!-- Stats -->
  <div class="grid2" style="margin-bottom:14px;">
    <div class="card" style="text-align:center;padding:20px;">
      <div style="font-size:13px;color:var(--soft);margin-bottom:6px;">Total encaissé</div>
      <div style="font-family:'Fraunces',serif;font-size:26px;color:var(--vert);">${fcfa(montantTotal)}</div>
    </div>
    <div class="card" style="text-align:center;padding:20px;">
      <div style="font-size:13px;color:var(--soft);margin-bottom:6px;">Factures</div>
      <div style="display:flex;justify-content:center;gap:16px;margin-top:4px;">
        <div><div style="font-size:20px;font-weight:700;color:var(--vert);">${totalPayees}</div><div style="font-size:11px;color:var(--soft);">Payées</div></div>
        <div><div style="font-size:20px;font-weight:700;color:var(--cs);">${totalImpayees}</div><div style="font-size:11px;color:var(--soft);">Impayées</div></div>
        <div><div style="font-size:20px;font-weight:700;">${totalFactures}</div><div style="font-size:11px;color:var(--soft);">Total</div></div>
      </div>
    </div>
  </div>

  <!-- Répartition par mode -->
  <div class="card">
    <div style="font-size:14px;font-weight:700;margin-bottom:14px;">💳 Répartition par mode de paiement</div>
    ${modeRows || '<div class="empty">Aucun paiement enregistré</div>'}
    ${Object.keys(parMode).length > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:12px 0 0;
        border-top:2px solid var(--bordure);margin-top:6px;">
        <span style="font-size:16px;font-weight:700;">TOTAL</span>
        <span style="font-size:18px;font-weight:700;color:var(--cs);">${fcfa(total)}</span>
      </div>` : ''}
  </div>
</div>`

  return c.html(page('Rapport', html))
})

// ═══════════════════════════════════════════════════════════════
// ROUTES ALIASES (liens sidebar dashboard)
// ═══════════════════════════════════════════════════════════════

// /encaissement → /facture/nouvelle
caissierRoutes.get('/encaissement', async (c) => {
  return c.redirect('/caissier/facture/nouvelle', 303)
})

// /recherche → /factures?statut=impayee
caissierRoutes.get('/recherche', async (c) => {
  return c.redirect('/caissier/factures?statut=impayee', 303)
})

// /historique → /factures?statut=all
caissierRoutes.get('/historique', async (c) => {
  return c.redirect('/caissier/factures?statut=all', 303)
})

// /cloture → /rapport
caissierRoutes.get('/cloture', async (c) => {
  return c.redirect('/caissier/rapport', 303)
})
