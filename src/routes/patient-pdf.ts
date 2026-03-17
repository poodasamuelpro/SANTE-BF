/**
 * src/routes/patient-pdf.ts
 * Routes PDF patient — ordonnances, examens, documents médicaux
 * 
 * ✅ FIX CRITIQUE : requireRole('patient') sans tableau
 */
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { genererOrdonnancePDF, genererBulletinExamenPDF } from '../utils/pdf'

export const patientPdfRoutes = new Hono()

patientPdfRoutes.use('*', requireAuth)
patientPdfRoutes.use('*', requireRole('patient'))  // ✅ CORRIGÉ — pas de tableau

// ── CSS commun ─────────────────────────────────────────────────
const CSS = `
  :root{
    --bleu:#1565C0;--bleu-fonce:#0d47a1;--bleu-clair:#e3f2fd;
    --vert:#1A6B3C;--vert-clair:#e8f5ee;
    --rouge:#b71c1c;--rouge-clair:#fce8e8;
    --or:#f59e0b;--or-clair:#fff8e6;
    --texte:#0f1923;--soft:#5a6a78;--bg:#f0f4f8;--blanc:#fff;--bordure:#dde3ea;
    --shadow:0 2px 10px rgba(0,0,0,0.07);--radius:16px;--radius-sm:10px;
  }
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);min-height:100vh;color:var(--texte);padding-bottom:80px;}
  .topbar{background:linear-gradient(135deg,var(--bleu-fonce),var(--bleu));height:56px;display:flex;align-items:center;padding:0 20px;position:sticky;top:0;z-index:100;box-shadow:0 2px 10px rgba(21,101,192,0.3);}
  .topbar-brand{font-family:'Fraunces',serif;font-size:18px;color:white;text-decoration:none;}
  .topbar-title{font-size:13px;color:rgba(255,255,255,0.8);margin-left:auto;}
  .content{max-width:760px;margin:0 auto;padding:20px 16px;}
  .back-btn{display:inline-flex;align-items:center;gap:8px;background:var(--blanc);border:1px solid var(--bordure);color:var(--texte);padding:9px 16px;border-radius:var(--radius-sm);font-size:13px;font-weight:700;text-decoration:none;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,0.06);transition:all .2s;font-family:inherit;}
  .back-btn:hover{background:var(--bleu-clair);border-color:var(--bleu);color:var(--bleu);}
  h1{font-family:'Fraunces',serif;font-size:22px;color:var(--texte);margin-bottom:16px;}
  .card{background:var(--blanc);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow);margin-bottom:12px;}
  .badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;}
  .b-vert{background:var(--vert-clair);color:var(--vert);}
  .b-gris{background:#f0f0f0;color:#666;}
  .b-rouge{background:var(--rouge-clair);color:var(--rouge);}
  .b-or{background:var(--or-clair);color:#7a5500;}
  .b-bleu{background:var(--bleu-clair);color:var(--bleu);}
  .empty{text-align:center;padding:40px;color:var(--soft);font-size:13px;font-style:italic;}
  .btn-dl{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:var(--radius-sm);font-size:13px;font-weight:700;text-decoration:none;border:none;cursor:pointer;font-family:inherit;transition:all .2s;}
  .btn-dl-vert{background:var(--vert);color:white;}
  .btn-dl-vert:hover{background:#134d2c;}
  .btn-dl-bleu{background:var(--bleu);color:white;}
  .btn-dl-bleu:hover{background:var(--bleu-fonce);}
  .btn-dl-gris{background:#e5e7eb;color:#6b7280;cursor:not-allowed;}
  @media(max-width:640px){.content{padding:14px 12px;}}
`

const HEAD = (titre: string) => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titre} — SantéBF</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:wght@600&display=swap" rel="stylesheet">
  <style>${CSS}</style>
</head>`

const TOPBAR = (titre: string) => `
<div class="topbar">
  <a href="/dashboard/patient" class="topbar-brand">🏥 SantéBF</a>
  <span class="topbar-title">${titre}</span>
</div>`

// ═══════════════════════════════════════════════════════════════
// LISTE ORDONNANCES
// ═══════════════════════════════════════════════════════════════
patientPdfRoutes.get('/ordonnances', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

  const { data: ordonnances } = dossier
    ? await supabase
        .from('medical_ordonnances')
        .select(`
          id, numero_ordonnance, created_at, date_expiration, statut,
          auth_profiles!medical_ordonnances_medecin_id_fkey(nom, prenom),
          struct_structures!medical_ordonnances_structure_id_fkey(nom)
        `)
        .eq('patient_id', dossier.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const list = ordonnances ?? []

  return c.html(`${HEAD('Mes ordonnances')}
<body>
${TOPBAR('Mes ordonnances')}
<div class="content">
  <a href="/dashboard/patient" class="back-btn">← Retour</a>
  <h1>💊 Mes ordonnances</h1>

  ${!dossier ? `<div class="card"><div class="empty">Dossier non lié. Présentez-vous à l'accueil d'un hôpital SantéBF.</div></div>` :
    list.length === 0 ? `<div class="card"><div class="empty">Aucune ordonnance enregistrée</div></div>` :
    list.map((o: any) => {
      const statut = o.statut
      const badge = statut === 'active' ? 'b-vert' : statut === 'expiree' ? 'b-rouge' : 'b-gris'
      const labelStatut = statut === 'active' ? '✅ Active' : statut === 'delivree' ? '📦 Délivrée' : statut === 'expiree' ? '❌ Expirée' : statut
      return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
              <span style="font-size:15px;font-weight:700;">${o.numero_ordonnance}</span>
              <span class="badge ${badge}">${labelStatut}</span>
            </div>
            <div style="font-size:12px;color:var(--soft);display:flex;gap:14px;flex-wrap:wrap;">
              <span>👨‍⚕️ Dr. ${(o as any).auth_profiles?.prenom||''} ${(o as any).auth_profiles?.nom||''}</span>
              ${(o as any).struct_structures?.nom ? `<span>🏥 ${(o as any).struct_structures.nom}</span>` : ''}
              <span>📅 ${new Date(o.created_at).toLocaleDateString('fr-FR')}</span>
              ${o.date_expiration ? `<span>⏳ Expire ${new Date(o.date_expiration).toLocaleDateString('fr-FR')}</span>` : ''}
            </div>
          </div>
          ${statut !== 'expiree'
            ? `<a href="/patient-pdf/ordonnance/${o.id}" class="btn-dl btn-dl-vert">📥 Télécharger PDF</a>`
            : `<span class="btn-dl btn-dl-gris">Expirée</span>`}
        </div>
      </div>`
    }).join('')
  }
</div>
</body></html>`)
})


// ═══════════════════════════════════════════════════════════════
// LISTE EXAMENS
// ═══════════════════════════════════════════════════════════════
patientPdfRoutes.get('/examens', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')

  const { data: dossier } = await supabase
    .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

  if (!dossier) {
    return c.html(`${HEAD('Mes examens')}<body>${TOPBAR('Mes examens')}
    <div class="content">
      <a href="/dashboard/patient" class="back-btn">← Retour</a>
      <div class="card"><div class="empty">Dossier non lié. Présentez-vous à l'accueil d'un hôpital SantéBF.</div></div>
    </div></body></html>`)
  }

  const [laboRes, radioRes] = await Promise.all([
    supabase.from('medical_examens')
      .select('id,type_examen,statut,created_at,date_resultat,valide_par,auth_profiles!medical_examens_demandeur_id_fkey(nom,prenom)')
      .eq('patient_id', dossier.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('medical_examens')
      .select('id,type_examen,statut,created_at,date_resultat,valide_par')
      .eq('patient_id', dossier.id)
      .order('created_at', { ascending: false })
      .limit(0), // placeholder — même table pour l'instant
  ])

  const examens = (laboRes.data ?? []).map((e: any) => ({ ...e, categorie: 'laboratoire' }))

  return c.html(`${HEAD('Mes examens')}
<body>
${TOPBAR('Mes examens')}
<div class="content">
  <a href="/dashboard/patient" class="back-btn">← Retour</a>
  <h1>🧪 Résultats d'examens</h1>

  ${examens.length === 0
    ? `<div class="card"><div class="empty">Aucun examen enregistré</div></div>`
    : examens.map((e: any) => {
        const dispo = e.statut === 'resultat_disponible' || e.valide_par
        return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
                <span style="font-size:15px;font-weight:700;">🔬 ${e.type_examen || 'Examen'}</span>
                <span class="badge ${dispo ? 'b-vert' : 'b-or'}">${dispo ? '✅ Disponible' : '⏳ En attente'}</span>
              </div>
              <div style="font-size:12px;color:var(--soft);display:flex;gap:14px;flex-wrap:wrap;">
                ${e.auth_profiles ? `<span>👨‍⚕️ Dr. ${e.auth_profiles.prenom||''} ${e.auth_profiles.nom||''}</span>` : ''}
                <span>📅 ${new Date(e.created_at).toLocaleDateString('fr-FR')}</span>
                ${e.date_resultat ? `<span>📋 Résultat le ${new Date(e.date_resultat).toLocaleDateString('fr-FR')}</span>` : ''}
              </div>
            </div>
            ${dispo
              ? `<a href="/patient-pdf/examen/${e.id}?type=${e.categorie}" class="btn-dl btn-dl-bleu">📥 Télécharger bulletin</a>`
              : `<span class="btn-dl btn-dl-gris">En attente</span>`}
          </div>
        </div>`
      }).join('')
  }
</div>
</body></html>`)
})


// ═══════════════════════════════════════════════════════════════
// TÉLÉCHARGER ORDONNANCE PDF
// ═══════════════════════════════════════════════════════════════
patientPdfRoutes.get('/ordonnance/:id', async (c) => {
  const profil   = c.get('profil')
  const supabase = c.get('supabase')
  const id = c.req.param('id')

  try {
    const { data: dossier } = await supabase
      .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

    if (!dossier) return c.json({ error: 'Dossier non trouvé' }, 404)

    const { data: ordonnance, error } = await supabase
      .from('medical_ordonnances')
      .select(`
        *,
        patient:patient_dossiers(nom, prenom, date_naissance, sexe, numero_national),
        medecin:auth_profiles!medical_ordonnances_medecin_id_fkey(nom, prenom, specialite, ordre_numero, signature_url),
        structure:struct_structures!medical_ordonnances_structure_id_fkey(nom, type, adresse, telephone, logo_url),
        prescriptions:medical_ordonnance_lignes(nom_medicament, posologie, duree_jours, instructions)
      `)
      .eq('id', id)
      .eq('patient_id', dossier.id)
      .single()

    if (error || !ordonnance) return c.json({ error: 'Ordonnance non trouvée' }, 404)

    const pdfBytes = await genererOrdonnancePDF({
      numero: ordonnance.numero_ordonnance,
      date: new Date(ordonnance.created_at),
      patient: {
        nom:            ordonnance.patient?.nom || '',
        prenom:         ordonnance.patient?.prenom || '',
        dateNaissance:  ordonnance.patient?.date_naissance || '',
        sexe:           ordonnance.patient?.sexe || '',
        numeroNational: ordonnance.patient?.numero_national || '',
      },
      medecin: {
        nom:         ordonnance.medecin?.nom || '',
        prenom:      ordonnance.medecin?.prenom || '',
        specialite:  ordonnance.medecin?.specialite || '',
        ordreNumero: ordonnance.medecin?.ordre_numero || '',
        signatureUrl: ordonnance.medecin?.signature_url || '',
      },
      structure: {
        nom:       ordonnance.structure?.nom || '',
        type:      ordonnance.structure?.type || '',
        adresse:   ordonnance.structure?.adresse || '',
        telephone: ordonnance.structure?.telephone || '',
        logoUrl:   ordonnance.structure?.logo_url || '',
      },
      prescriptions: (ordonnance.prescriptions || []).map((p: any) => ({
        medicament: p.nom_medicament || p.medicament || '',
        posologie:  p.posologie || '',
        duree:      String(p.duree_jours || p.duree || ''),
        quantite:   p.quantite || '',
      })),
      qrCode: ordonnance.qr_code_verification || '',
    })

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ordonnance-${ordonnance.numero_ordonnance}.pdf"`,
      },
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
  const profil   = c.get('profil')
  const supabase = c.get('supabase')
  const id       = c.req.param('id')
  const type     = c.req.query('type') || 'laboratoire'

  try {
    const { data: dossier } = await supabase
      .from('patient_dossiers').select('id').eq('profile_id', profil.id).single()

    if (!dossier) return c.json({ error: 'Dossier non trouvé' }, 404)

    const { data: examen, error } = await supabase
      .from('medical_examens')
      .select(`
        *,
        patient:patient_dossiers(nom, prenom, date_naissance, sexe, numero_national),
        medecin:auth_profiles!medical_examens_demandeur_id_fkey(nom, prenom, specialite),
        structure:struct_structures!medical_examens_structure_id_fkey(nom, type, adresse, telephone, logo_url)
      `)
      .eq('id', id)
      .eq('patient_id', dossier.id)
      .single()

    if (error || !examen) return c.json({ error: 'Examen non trouvé' }, 404)

    if (examen.statut !== 'resultat_disponible' && !examen.valide_par) {
      return c.json({ error: 'Résultats pas encore disponibles' }, 400)
    }

    const pdfBytes = await genererBulletinExamenPDF({
      typeExamen:    examen.type_examen || type,
      date:          new Date(examen.created_at),
      dateResultat:  examen.date_resultat ? new Date(examen.date_resultat) : new Date(),
      patient: {
        nom:            examen.patient?.nom || '',
        prenom:         examen.patient?.prenom || '',
        dateNaissance:  examen.patient?.date_naissance || '',
        sexe:           examen.patient?.sexe || '',
        numeroNational: examen.patient?.numero_national || '',
      },
      medecin: {
        nom:        examen.medecin?.nom || '',
        prenom:     examen.medecin?.prenom || '',
        specialite: examen.medecin?.specialite || '',
      },
      structure: {
        nom:       examen.structure?.nom || '',
        type:      examen.structure?.type || '',
        adresse:   examen.structure?.adresse || '',
        telephone: examen.structure?.telephone || '',
        logoUrl:   examen.structure?.logo_url || '',
      },
      resultats:   examen.resultats || {},
      conclusion:  examen.conclusion || examen.compte_rendu || '',
      technicien:  examen.technicien_nom || '',
    })

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="examen-${id}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Erreur PDF examen:', err)
    return c.json({ error: 'Erreur génération PDF' }, 500)
  }
})
 