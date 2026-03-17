/**
 * src/routes/patient-pdf.ts
 * ✅ FIX: requireRole('patient') — sans tableau
 */
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { genererOrdonnancePDF, genererBulletinExamenPDF } from '../utils/pdf'

export const patientPdfRoutes = new Hono()

patientPdfRoutes.use('*', requireAuth)
patientPdfRoutes.use('*', requireRole('patient'))

// ── CSS + helpers ──────────────────────────────────────────────
function page(titre: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titre} — SantéBF</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>
:root{--bleu:#1565C0;--bleu-f:#0d47a1;--bleu-c:#e3f2fd;--vert:#1A6B3C;--vert-c:#e8f5ee;--rouge:#b71c1c;--rouge-c:#fce8e8;--or:#f59e0b;--or-c:#fff8e6;--texte:#0f1923;--soft:#5a6a78;--bg:#f0f4f8;--blanc:#fff;--bordure:#dde3ea;--r:16px;--rs:10px;}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);padding-bottom:80px;}
.topbar{background:linear-gradient(135deg,var(--bleu-f),var(--bleu));height:56px;display:flex;align-items:center;padding:0 20px;position:sticky;top:0;z-index:100;}
.tb-brand{font-family:'Fraunces',serif;font-size:18px;color:white;text-decoration:none;}
.tb-title{font-size:13px;color:rgba(255,255,255,0.8);margin-left:auto;}
.content{max-width:760px;margin:0 auto;padding:20px 16px;}
.back{display:inline-flex;align-items:center;gap:8px;background:var(--blanc);border:1px solid var(--bordure);color:var(--texte);padding:9px 16px;border-radius:var(--rs);font-size:13px;font-weight:700;text-decoration:none;margin-bottom:20px;}
.back:hover{background:var(--bleu-c);color:var(--bleu);}
h1{font-family:'Fraunces',serif;font-size:22px;margin-bottom:16px;}
.card{background:var(--blanc);border-radius:var(--r);padding:20px;box-shadow:0 2px 10px rgba(0,0,0,.07);margin-bottom:12px;}
.empty{text-align:center;padding:40px;color:var(--soft);font-size:13px;font-style:italic;}
.badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;}
.bv{background:var(--vert-c);color:var(--vert);}
.bb{background:var(--bleu-c);color:var(--bleu);}
.br{background:var(--rouge-c);color:var(--rouge);}
.bg{background:#f0f0f0;color:#666;}
.bo{background:var(--or-c);color:#7a5500;}
.row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;}
.meta{font-size:12px;color:var(--soft);display:flex;gap:12px;flex-wrap:wrap;margin-top:4px;}
.btn-dl{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:var(--rs);font-size:13px;font-weight:700;text-decoration:none;border:none;cursor:pointer;white-space:nowrap;}
.btn-v{background:var(--vert);color:white;}
.btn-b{background:var(--bleu);color:white;}
.btn-g{background:#e5e7eb;color:#6b7280;cursor:not-allowed;}
@media(max-width:640px){.content{padding:14px 12px;}}
</style>
</head>
<body>
<div class="topbar">
  <a href="/dashboard/patient" class="tb-brand">&#127973; SantéBF</a>
  <span class="tb-title">${titre}</span>
</div>
${body}
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════
// LISTE ORDONNANCES
// ═══════════════════════════════════════════════════════════════
patientPdfRoutes.get('/ordonnances', async (c) => {
  const profil   = c.get('profil' as never) as any
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

  const { data: list } = dossier ? await supabase
    .from('medical_ordonnances')
    .select('id, numero_ordonnance, created_at, date_expiration, statut, auth_profiles!medical_ordonnances_medecin_id_fkey(nom, prenom), struct_structures!medical_ordonnances_structure_id_fkey(nom)')
    .eq('patient_id', dossier.id)
    .order('created_at', { ascending: false })
    : { data: [] }

  const items = (list ?? []).map((o: any) => {
    const badgeClass = o.statut === 'active' ? 'bv' : o.statut === 'expiree' ? 'br' : 'bg'
    const labelStatut = o.statut === 'active' ? '&#10003; Active' : o.statut === 'delivree' ? 'Délivrée' : o.statut === 'expiree' ? 'Expirée' : o.statut
    const medecin = o.auth_profiles ? `Dr. ${o.auth_profiles.prenom || ''} ${o.auth_profiles.nom || ''}` : ''
    const structure = o.struct_structures?.nom || ''
    const dateCreation = new Date(o.created_at).toLocaleDateString('fr-FR')
    const dateExp = o.date_expiration ? `Expire ${new Date(o.date_expiration).toLocaleDateString('fr-FR')}` : ''
    const btnHtml = o.statut !== 'expiree'
      ? `<a href="/patient-pdf/ordonnance/${o.id}" class="btn-dl btn-v">&#128229; PDF</a>`
      : `<span class="btn-dl btn-g">Expirée</span>`
    return `<div class="card">
  <div class="row">
    <div>
      <div style="font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;">
        ${o.numero_ordonnance} <span class="badge ${badgeClass}">${labelStatut}</span>
      </div>
      <div class="meta">
        ${medecin ? `<span>&#128104;&#8205;&#9877; ${medecin}</span>` : ''}
        ${structure ? `<span>&#127973; ${structure}</span>` : ''}
        <span>&#128197; ${dateCreation}</span>
        ${dateExp ? `<span>&#8987; ${dateExp}</span>` : ''}
      </div>
    </div>
    ${btnHtml}
  </div>
</div>`
  }).join('')

  const body = `<div class="content">
  <a href="/dashboard/patient" class="back">&#8592; Retour</a>
  <h1>&#128138; Mes ordonnances</h1>
  ${!dossier ? '<div class="card"><div class="empty">Dossier non lié au compte.</div></div>' : items || '<div class="card"><div class="empty">Aucune ordonnance enregistrée</div></div>'}
</div>`

  return c.html(page('Mes ordonnances', body))
})

// ═══════════════════════════════════════════════════════════════
// LISTE EXAMENS
// ═══════════════════════════════════════════════════════════════
patientPdfRoutes.get('/examens', async (c) => {
  const profil   = c.get('profil' as never) as any
  const supabase = c.get('supabase' as never) as any

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

  const { data: list } = dossier ? await supabase
    .from('medical_examens')
    .select('id, type_examen, statut, created_at, date_resultat, valide_par, auth_profiles!medical_examens_demandeur_id_fkey(nom, prenom)')
    .eq('patient_id', dossier.id)
    .order('created_at', { ascending: false })
    .limit(20)
    : { data: [] }

  const items = (list ?? []).map((e: any) => {
    const dispo = e.statut === 'resultat_disponible' || e.valide_par
    const medecin = e.auth_profiles ? `Dr. ${e.auth_profiles.prenom || ''} ${e.auth_profiles.nom || ''}` : ''
    const dateCreation = new Date(e.created_at).toLocaleDateString('fr-FR')
    const dateRes = e.date_resultat ? `Résultat ${new Date(e.date_resultat).toLocaleDateString('fr-FR')}` : ''
    const btnHtml = dispo
      ? `<a href="/patient-pdf/examen/${e.id}" class="btn-dl btn-b">&#128229; Bulletin</a>`
      : `<span class="btn-dl btn-g">En attente</span>`
    return `<div class="card">
  <div class="row">
    <div>
      <div style="font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;">
        &#128300; ${e.type_examen || 'Examen'} <span class="badge ${dispo ? 'bv' : 'bo'}">${dispo ? '&#10003; Disponible' : '&#8987; En attente'}</span>
      </div>
      <div class="meta">
        ${medecin ? `<span>&#128104;&#8205;&#9877; ${medecin}</span>` : ''}
        <span>&#128197; ${dateCreation}</span>
        ${dateRes ? `<span>&#128203; ${dateRes}</span>` : ''}
      </div>
    </div>
    ${btnHtml}
  </div>
</div>`
  }).join('')

  const body = `<div class="content">
  <a href="/dashboard/patient" class="back">&#8592; Retour</a>
  <h1>&#129514; Résultats d'examens</h1>
  ${!dossier ? '<div class="card"><div class="empty">Dossier non lié au compte.</div></div>' : items || '<div class="card"><div class="empty">Aucun examen enregistré</div></div>'}
</div>`

  return c.html(page('Mes examens', body))
})

// ═══════════════════════════════════════════════════════════════
// TÉLÉCHARGER ORDONNANCE PDF
// ═══════════════════════════════════════════════════════════════
patientPdfRoutes.get('/ordonnance/:id', async (c) => {
  const profil   = c.get('profil' as never) as any
  const supabase = c.get('supabase' as never) as any
  const id = c.req.param('id')

  try {
    const { data: dossier } = await supabase
      .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()
    if (!dossier) return c.json({ error: 'Dossier non trouvé' }, 404)

    const { data: ord, error } = await supabase
      .from('medical_ordonnances')
      .select('*, patient:patient_dossiers(nom,prenom,date_naissance,sexe,numero_national), medecin:auth_profiles!medical_ordonnances_medecin_id_fkey(nom,prenom,specialite,ordre_numero,signature_url), structure:struct_structures!medical_ordonnances_structure_id_fkey(nom,type,adresse,telephone,logo_url), prescriptions:medical_ordonnance_lignes(nom_medicament,posologie,duree_jours,instructions)')
      .eq('id', id).eq('patient_id', dossier.id).single()

    if (error || !ord) return c.json({ error: 'Ordonnance non trouvée' }, 404)

    const pdfBytes = await genererOrdonnancePDF({
      numero: ord.numero_ordonnance,
      date: new Date(ord.created_at),
      patient: { nom: ord.patient?.nom || '', prenom: ord.patient?.prenom || '', dateNaissance: ord.patient?.date_naissance || '', sexe: ord.patient?.sexe || '', numeroNational: ord.patient?.numero_national || '' },
      medecin: { nom: ord.medecin?.nom || '', prenom: ord.medecin?.prenom || '', specialite: ord.medecin?.specialite || '', ordreNumero: ord.medecin?.ordre_numero || '', signatureUrl: ord.medecin?.signature_url || '' },
      structure: { nom: ord.structure?.nom || '', type: ord.structure?.type || '', adresse: ord.structure?.adresse || '', telephone: ord.structure?.telephone || '', logoUrl: ord.structure?.logo_url || '' },
      prescriptions: (ord.prescriptions || []).map((p: any) => ({ medicament: p.nom_medicament || '', posologie: p.posologie || '', duree: String(p.duree_jours || ''), quantite: p.quantite || '' })),
      qrCode: ord.qr_code_verification || '',
    })

    return new Response(pdfBytes, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="ordonnance-${ord.numero_ordonnance}.pdf"` }
    })
  } catch (err) {
    console.error('Erreur PDF ordonnance:', err)
    return c.json({ error: 'Erreur génération PDF' }, 500)
  }
})

// ═══════════════════════════════════════════════════════════════
// TÉLÉCHARGER BULLETIN EXAMEN PDF
// ═══════════════════════════════════════════════════════════════
patientPdfRoutes.get('/examen/:id', async (c) => {
  const profil   = c.get('profil' as never) as any
  const supabase = c.get('supabase' as never) as any
  const id = c.req.param('id')

  try {
    const { data: dossier } = await supabase
      .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()
    if (!dossier) return c.json({ error: 'Dossier non trouvé' }, 404)

    const { data: ex, error } = await supabase
      .from('medical_examens')
      .select('*, patient:patient_dossiers(nom,prenom,date_naissance,sexe,numero_national), medecin:auth_profiles!medical_examens_demandeur_id_fkey(nom,prenom,specialite), structure:struct_structures!medical_examens_structure_id_fkey(nom,type,adresse,telephone,logo_url)')
      .eq('id', id).eq('patient_id', dossier.id).single()

    if (error || !ex) return c.json({ error: 'Examen non trouvé' }, 404)
    if (ex.statut !== 'resultat_disponible' && !ex.valide_par) return c.json({ error: 'Résultats pas encore disponibles' }, 400)

    const pdfBytes = await genererBulletinExamenPDF({
      typeExamen: ex.type_examen || 'laboratoire',
      date: new Date(ex.created_at),
      dateResultat: ex.date_resultat ? new Date(ex.date_resultat) : new Date(),
      patient: { nom: ex.patient?.nom || '', prenom: ex.patient?.prenom || '', dateNaissance: ex.patient?.date_naissance || '', sexe: ex.patient?.sexe || '', numeroNational: ex.patient?.numero_national || '' },
      medecin: { nom: ex.medecin?.nom || '', prenom: ex.medecin?.prenom || '', specialite: ex.medecin?.specialite || '' },
      structure: { nom: ex.structure?.nom || '', type: ex.structure?.type || '', adresse: ex.structure?.adresse || '', telephone: ex.structure?.telephone || '', logoUrl: ex.structure?.logo_url || '' },
      resultats: ex.resultats || {},
      conclusion: ex.conclusion || ex.compte_rendu || '',
      technicien: ex.technicien_nom || '',
    })

    return new Response(pdfBytes, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="examen-${id}.pdf"` }
    })
  } catch (err) {
    console.error('Erreur PDF examen:', err)
    return c.json({ error: 'Erreur génération PDF' }, 500)
  }
})
