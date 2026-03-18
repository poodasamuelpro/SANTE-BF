/**
 * src/pages/fiche-patient.ts
 * SantéBF — Fiche patient complète (vue médecin)
 *
 * Corrections vs version originale :
 *   1. Liens consultations/ordonnances : ?patient_id= → ?pid=
 *      (medecin.ts lit c.req.query('pid') pas 'patient_id')
 *   2. Mode sombre CSS variables
 *   3. Ajout bouton Examen + RDV + Documents
 *   4. Affichage ordonnances actives en plus des consultations
 */

import { calculerAge, formatDate } from '../utils/format'

export function fichePatientPage(
  patient:       any,
  consultations: any[],
  ordonnances?:  any[]
): string {
  const age     = patient?.date_naissance ? calculerAge(patient.date_naissance) : 0
  const pid     = patient?.id ?? ''
  const ords    = ordonnances ?? []

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fiche &#x2014; ${patient?.prenom ?? ''} ${patient?.nom ?? ''} | Sant&#xe9;BF</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root{--v:#4A148C;--vl:#EDE7F6;--vg:rgba(74,20,140,.08);
      --bg:#F7F8FA;--sur:white;--brd:#E5E7EB;--tx:#1A1A2E;--tx2:#6B7280;--tx3:#9CA3AF}
    [data-theme="dark"]{--bg:#0F1117;--sur:#1A1B2E;--brd:#2E3047;--tx:#E8E8F0;--tx2:#9BA3B8;--tx3:#5A6080;--vl:#2A1550}
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:var(--bg);padding:24px;color:var(--tx);transition:background .2s,color .2s}
    .container{max-width:1000px;margin:0 auto}
    .back-link{display:inline-flex;align-items:center;gap:6px;color:var(--v);text-decoration:none;font-size:14px;margin-bottom:16px;font-weight:600}
    .back-link:hover{text-decoration:underline}
    .card{background:var(--sur);border-radius:16px;padding:28px 32px;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:20px;border:1px solid var(--brd)}
    .pt-header{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid var(--brd);padding-bottom:20px;margin-bottom:20px;flex-wrap:wrap;gap:14px}
    .pt-main h1{font-family:'DM Serif Display',serif;font-size:28px;color:var(--tx);margin-bottom:4px}
    .pt-meta{font-size:14px;color:var(--tx2);display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:6px}
    .badge{background:var(--brd);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;color:var(--tx)}
    .badge.sang{background:#FEE2E2;color:#B71C1C;font-size:14px;padding:6px 14px;font-weight:700}
    .pt-actions{display:flex;gap:8px;flex-wrap:wrap}
    .btn{padding:9px 16px;border-radius:9px;font-size:13px;font-weight:600;text-decoration:none;display:inline-block;font-family:'DM Sans',sans-serif;border:none;cursor:pointer}
    .btn-v{background:var(--v);color:white}
    .btn-v:hover{opacity:.88}
    .btn-g{background:#1A6B3C;color:white}
    .btn-b{background:#1565C0;color:white}
    .btn-s{background:var(--brd);color:var(--tx)}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .field-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--brd)}
    .field-row:last-child{border-bottom:none}
    .fl{font-size:13px;color:var(--tx2);font-weight:500}
    .fv{font-size:14px;color:var(--tx);font-weight:600}
    .sec-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--tx3);margin-bottom:14px}
    .allergie-item{background:#FFF5F5;border-left:4px solid #B71C1C;padding:11px;border-radius:8px;margin-bottom:8px}
    .maladie-item{background:var(--brd);border-left:4px solid var(--tx2);padding:11px;border-radius:8px;margin-bottom:8px}
    .item-titre{font-size:14px;font-weight:600;color:var(--tx);margin-bottom:2px}
    .item-desc{font-size:12px;color:var(--tx2)}
    .consult-item{background:var(--vl);border-left:4px solid var(--v);padding:16px;border-radius:10px;margin-bottom:12px}
    .consult-head{display:flex;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px}
    .consult-date{font-size:12px;color:var(--tx3)}
    .consult-motif{font-size:14px;font-weight:600;color:var(--tx);margin-bottom:6px}
    .consult-diag{font-size:13px;color:var(--v)}
    .ord-item{background:#E8F5E9;border-left:4px solid #1A6B3C;padding:13px;border-radius:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
    .ord-num{font-size:13px;font-family:monospace;color:#1A6B3C;font-weight:600}
    .ord-exp{font-size:12px;color:var(--tx2)}
    .badge-statut{padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600}
    .badge-statut.active{background:#E8F5E9;color:#1A6B3C}
    .badge-statut.expiree{background:var(--brd);color:var(--tx3)}
    .badge-statut.delivree{background:#E3F2FD;color:#1565C0}
    .empty{text-align:center;padding:28px;color:var(--tx3);font-style:italic;font-size:13px}
    @media(max-width:768px){.grid2{grid-template-columns:1fr}.pt-header{flex-direction:column}.pt-actions{flex-wrap:wrap}}
  </style>
  <script>(function(){var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t)})();</script>
</head>
<body>
<div class="container">
  <a href="/medecin/patients" class="back-link">&#x2190; Retour &#xe0; la liste</a>

  <!-- Identité -->
  <div class="card">
    <div class="pt-header">
      <div class="pt-main">
        <h1>${patient?.prenom ?? ''} ${patient?.nom ?? ''}</h1>
        <div class="pt-meta">
          <span>${patient?.sexe === 'M' ? '&#x2642; Homme' : '&#x2640; Femme'}</span>
          <span>&#x1F4C5; ${age} ans</span>
          <span style="font-family:monospace;font-size:12px">&#x1F194; ${patient?.numero_national ?? 'N/A'}</span>
          <span class="badge sang">&#x1FA78; ${patient?.groupe_sanguin ?? '?'}${patient?.rhesus ?? ''}</span>
        </div>
      </div>
      <div class="pt-actions">
        <!-- ✅ FIX : ?pid= (pas ?patient_id=) — medecin.ts lit c.req.query('pid') -->
        <a href="/medecin/consultations/nouvelle?pid=${pid}" class="btn btn-v">&#x1F4CB; Consultation</a>
        <a href="/medecin/ordonnances/nouvelle?pid=${pid}"   class="btn btn-g">&#x1F48A; Ordonnance</a>
        <a href="/medecin/examens/nouveau?pid=${pid}"        class="btn btn-b">&#x1F9EA; Examen</a>
        <a href="/medecin/rdv/nouveau?pid=${pid}"            class="btn btn-s">&#x1F4C5; RDV</a>
        <a href="/medecin/documents/upload?pid=${pid}"       class="btn btn-s">&#x1F4C4; Doc.</a>
      </div>
    </div>

    <div class="grid2">
      <div>
        <div class="field-row">
          <span class="fl">Date de naissance</span>
          <span class="fv">${patient?.date_naissance ? formatDate(patient.date_naissance) : 'N/A'}</span>
        </div>
        <div class="field-row">
          <span class="fl">Groupe sanguin</span>
          <span class="fv" style="color:#B71C1C">${patient?.groupe_sanguin ?? 'inconnu'}${patient?.rhesus ?? ''}</span>
        </div>
      </div>
      <div>
        <div class="field-row">
          <span class="fl">N&#xb0; national</span>
          <span class="fv" style="font-family:monospace">${patient?.numero_national ?? 'N/A'}</span>
        </div>
        <div class="field-row">
          <span class="fl">Inscription</span>
          <span class="fv">${patient?.created_at ? formatDate(patient.created_at) : 'N/A'}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Allergies -->
  <div class="card">
    <div class="sec-title">&#x26A0;&#xFE0F; Allergies connues</div>
    ${(patient?.allergies?.length ?? 0) > 0
      ? patient.allergies.map((a: any) => `
        <div class="allergie-item">
          <div class="item-titre">${a.substance ?? a.nom ?? String(a)}</div>
          <div class="item-desc">
            ${a.severite ? 'S&#xe9;v&#xe9;rit&#xe9; : ' + a.severite : ''}
            ${a.reaction ? ' &mdash; ' + a.reaction : ''}
          </div>
        </div>`).join('')
      : '<div class="empty">Aucune allergie enregistr&#xe9;e</div>'}
  </div>

  <!-- Maladies chroniques -->
  <div class="card">
    <div class="sec-title">&#x1FA7A; Maladies chroniques</div>
    ${(patient?.maladies_chroniques?.length ?? 0) > 0
      ? patient.maladies_chroniques.map((m: any) => `
        <div class="maladie-item">
          <div class="item-titre">${m.maladie ?? m.nom ?? String(m)}</div>
          <div class="item-desc">
            ${m.depuis ? 'Depuis : ' + m.depuis : ''}
            ${m.traitement ? ' &mdash; ' + m.traitement : ''}
          </div>
        </div>`).join('')
      : '<div class="empty">Aucune maladie chronique enregistr&#xe9;e</div>'}
  </div>

  <!-- Ordonnances actives -->
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div class="sec-title" style="margin-bottom:0">&#x1F48A; Ordonnances</div>
      <a href="/medecin/ordonnances/nouvelle?pid=${pid}" class="btn btn-g" style="font-size:12px;padding:6px 12px">+ Nouvelle</a>
    </div>
    ${ords.length > 0
      ? ords.map((o: any) => `
        <div class="ord-item">
          <div>
            <div class="ord-num">${o.numero_ordonnance ?? o.id}</div>
            <div class="ord-exp">Exp. ${o.date_expiration ? formatDate(o.date_expiration) : 'N/A'}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span class="badge-statut ${o.statut ?? ''}">${o.statut ?? ''}</span>
            <a href="/medecin/ordonnances/${o.id}/pdf" class="btn btn-g" style="font-size:11px;padding:5px 10px">PDF</a>
          </div>
        </div>`).join('')
      : '<div class="empty">Aucune ordonnance</div>'}
  </div>

  <!-- Consultations -->
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div class="sec-title" style="margin-bottom:0">&#x1F4CB; Historique consultations (${consultations?.length ?? 0})</div>
      <a href="/medecin/consultations/nouvelle?pid=${pid}" class="btn btn-v" style="font-size:12px;padding:6px 12px">+ Nouvelle</a>
    </div>
    ${(consultations?.length ?? 0) > 0
      ? consultations.map((c: any) => `
        <div class="consult-item">
          <div class="consult-head">
            <span class="consult-date">${c.created_at ? formatDate(c.created_at) : ''}</span>
            <span class="badge">${c.type_consultation ?? 'normale'}</span>
          </div>
          <div class="consult-motif">${c.motif ?? 'N/A'}</div>
          ${c.diagnostic_principal
            ? `<div class="consult-diag">&#x2192; ${c.diagnostic_principal}</div>`
            : ''}
          ${c.conduite_a_tenir
            ? `<div style="font-size:12px;color:var(--tx2);margin-top:4px">&#x1F4CC; ${c.conduite_a_tenir}</div>`
            : ''}
        </div>`).join('')
      : '<div class="empty">Aucune consultation enregistr&#xe9;e</div>'}
  </div>
</div>
</body>
</html>`
}
