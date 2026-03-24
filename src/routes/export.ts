/**
 * src/utils/export.ts
 * SantéBF — Fonctions d'export CSV
 * Utilisé par src/routes/export.ts
 *
 * Toutes les fonctions retournent une string CSV UTF-8
 * Compatible Cloudflare Workers (pas de fs, pas de Node streams)
 */

// ── Helper CSV ────────────────────────────────────────────────
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function toCsv(headers: string[], rows: any[][]): string {
  const bom = '\uFEFF' // BOM UTF-8 pour Excel
  const header = headers.map(escapeCsv).join(',')
  const body   = rows.map(row => row.map(escapeCsv).join(',')).join('\n')
  return bom + header + '\n' + body
}

function fmtDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR')
}

function fmtDateTime(d: string | null): string {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR') + ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function addDateFilter(query: any, dateDebut?: string, dateFin?: string, col = 'created_at') {
  if (dateDebut) query = query.gte(col, dateDebut + 'T00:00:00')
  if (dateFin)   query = query.lte(col, dateFin   + 'T23:59:59')
  return query
}

// ═══════════════════════════════════════════════════════════════
// EXPORT PATIENTS
// ═══════════════════════════════════════════════════════════════
export async function exporterPatients(
  supabase: any,
  structureId: string,
  format: 'csv' = 'csv'
): Promise<string> {
  const { data, error } = await supabase
    .from('patient_dossiers')
    .select('numero_national, nom, prenom, date_naissance, sexe, groupe_sanguin, rhesus, telephone, email, created_at')
    .eq('structure_enregistrement_id', structureId)
    .order('nom')
    .limit(5000)

  if (error) throw new Error('Erreur export patients : ' + error.message)

  const headers = [
    'N° National', 'Nom', 'Prénom', 'Date naissance',
    'Sexe', 'Groupe sanguin', 'Rhésus', 'Téléphone', 'Email', 'Date enregistrement'
  ]
  const rows = (data ?? []).map((p: any) => [
    p.numero_national, p.nom, p.prenom, fmtDate(p.date_naissance),
    p.sexe === 'M' ? 'Masculin' : 'Féminin',
    p.groupe_sanguin || '', p.rhesus || '',
    p.telephone || '', p.email || '',
    fmtDate(p.created_at),
  ])

  return toCsv(headers, rows)
}

// ═══════════════════════════════════════════════════════════════
// EXPORT CONSULTATIONS
// ═══════════════════════════════════════════════════════════════
export async function exporterConsultations(
  supabase: any,
  structureId: string,
  dateDebut?: string,
  dateFin?: string,
  format: 'csv' = 'csv'
): Promise<string> {
  let query = supabase
    .from('medical_consultations')
    .select(`
      id, motif, diagnostic_principal, type_consultation, statut, created_at,
      patient:patient_dossiers(numero_national, nom, prenom),
      medecin:auth_profiles!medical_consultations_medecin_id_fkey(nom, prenom)
    `)
    .eq('structure_id', structureId)
    .order('created_at', { ascending: false })
    .limit(10000)

  query = addDateFilter(query, dateDebut, dateFin)
  const { data, error } = await query

  if (error) throw new Error('Erreur export consultations : ' + error.message)

  const headers = [
    'Date', 'N° Patient', 'Nom patient', 'Prénom patient',
    'Médecin', 'Motif', 'Diagnostic', 'Type', 'Statut'
  ]
  const rows = (data ?? []).map((c: any) => [
    fmtDateTime(c.created_at),
    c.patient?.numero_national || '',
    c.patient?.nom || '', c.patient?.prenom || '',
    `Dr. ${c.medecin?.prenom || ''} ${c.medecin?.nom || ''}`.trim(),
    c.motif || '', c.diagnostic_principal || '',
    c.type_consultation || '', c.statut || '',
  ])

  return toCsv(headers, rows)
}

// ═══════════════════════════════════════════════════════════════
// EXPORT FACTURES
// ═══════════════════════════════════════════════════════════════
export async function exporterFactures(
  supabase: any,
  structureId: string,
  dateDebut?: string,
  dateFin?: string,
  format: 'csv' = 'csv'
): Promise<string> {
  let query = supabase
    .from('finance_factures')
    .select(`
      numero_facture, statut, sous_total, montant_assurance, total_ttc, montant_patient, created_at,
      patient:patient_dossiers(numero_national, nom, prenom)
    `)
    .eq('structure_id', structureId)
    .order('created_at', { ascending: false })
    .limit(10000)

  query = addDateFilter(query, dateDebut, dateFin)
  const { data, error } = await query

  if (error) throw new Error('Erreur export factures : ' + error.message)

  const headers = [
    'Date', 'N° Facture', 'N° Patient', 'Nom patient', 'Prénom patient',
    'Sous-total (FCFA)', 'Part assurance (FCFA)', 'Total TTC (FCFA)',
    'Part patient (FCFA)', 'Statut'
  ]
  const rows = (data ?? []).map((f: any) => [
    fmtDate(f.created_at),
    f.numero_facture,
    f.patient?.numero_national || '',
    f.patient?.nom || '', f.patient?.prenom || '',
    f.sous_total || 0, f.montant_assurance || 0,
    f.total_ttc || 0, f.montant_patient || 0,
    f.statut || '',
  ])

  return toCsv(headers, rows)
}

// ═══════════════════════════════════════════════════════════════
// EXPORT ORDONNANCES
// ═══════════════════════════════════════════════════════════════
export async function exporterOrdonnances(
  supabase: any,
  structureId: string,
  dateDebut?: string,
  dateFin?: string,
  format: 'csv' = 'csv'
): Promise<string> {
  let query = supabase
    .from('medical_ordonnances')
    .select(`
      numero_ordonnance, statut, date_expiration, created_at,
      patient:patient_dossiers(numero_national, nom, prenom),
      medecin:auth_profiles!medical_ordonnances_medecin_id_fkey(nom, prenom),
      lignes:medical_ordonnance_lignes(medicament_nom, dosage, frequence, duree)
    `)
    .eq('structure_id', structureId)
    .order('created_at', { ascending: false })
    .limit(10000)

  query = addDateFilter(query, dateDebut, dateFin)
  const { data, error } = await query

  if (error) throw new Error('Erreur export ordonnances : ' + error.message)

  const headers = [
    'Date', 'N° Ordonnance', 'N° Patient', 'Nom patient', 'Prénom patient',
    'Médecin', 'Statut', 'Date expiration',
    'Médicaments (liste)'
  ]
  const rows = (data ?? []).map((o: any) => {
    const meds = (o.lignes || [])
      .map((l: any) => `${l.medicament_nom} ${l.dosage} ${l.frequence} ${l.duree}`.trim())
      .join(' | ')
    return [
      fmtDate(o.created_at),
      o.numero_ordonnance,
      o.patient?.numero_national || '',
      o.patient?.nom || '', o.patient?.prenom || '',
      `Dr. ${o.medecin?.prenom || ''} ${o.medecin?.nom || ''}`.trim(),
      o.statut || '', fmtDate(o.date_expiration),
      meds,
    ]
  })

  return toCsv(headers, rows)
}

// ═══════════════════════════════════════════════════════════════
// EXPORT EXAMENS LABORATOIRE
// ═══════════════════════════════════════════════════════════════
export async function exporterExamensLabo(
  supabase: any,
  structureId: string,
  dateDebut?: string,
  dateFin?: string,
  format: 'csv' = 'csv'
): Promise<string> {
  let query = supabase
    .from('medical_examens')
    .select(`
      nom_examen, type_examen, statut, est_urgent, est_anormal,
      resultat_texte, interpretation, created_at, valide_at,
      patient:patient_dossiers(numero_national, nom, prenom),
      prescripteur:auth_profiles!medical_examens_prescripteur_id_fkey(nom, prenom)
    `)
    .eq('structure_id', structureId)
    .order('created_at', { ascending: false })
    .limit(10000)

  query = addDateFilter(query, dateDebut, dateFin)
  const { data, error } = await query

  if (error) throw new Error('Erreur export examens labo : ' + error.message)

  const headers = [
    'Date prescription', 'N° Patient', 'Nom patient', 'Prénom patient',
    'Prescripteur', 'Examen', 'Type', 'Statut',
    'Urgent', 'Anormal', 'Date résultat', 'Interprétation'
  ]
  const rows = (data ?? []).map((e: any) => [
    fmtDate(e.created_at),
    e.patient?.numero_national || '',
    e.patient?.nom || '', e.patient?.prenom || '',
    `Dr. ${e.prescripteur?.prenom || ''} ${e.prescripteur?.nom || ''}`.trim(),
    e.nom_examen || '', e.type_examen || '', e.statut || '',
    e.est_urgent ? 'Oui' : 'Non',
    e.est_anormal ? 'Oui' : 'Non',
    fmtDate(e.valide_at),
    e.interpretation || '',
  ])

  return toCsv(headers, rows)
}

// ═══════════════════════════════════════════════════════════════
// EXPORT STATISTIQUES STRUCTURE
// ═══════════════════════════════════════════════════════════════
export async function exporterStatistiquesStructure(
  supabase: any,
  structureId: string,
  mois: number,
  annee: number,
  format: 'csv' = 'csv'
): Promise<string> {
  const debut = new Date(annee, mois - 1, 1).toISOString()
  const fin   = new Date(annee, mois, 0, 23, 59, 59).toISOString()

  const [consRes, factRes, ordRes, examRes, patRes] = await Promise.all([
    supabase.from('medical_consultations')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .gte('created_at', debut).lte('created_at', fin),
    supabase.from('finance_factures')
      .select('total_ttc, statut')
      .eq('structure_id', structureId)
      .gte('created_at', debut).lte('created_at', fin),
    supabase.from('medical_ordonnances')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .gte('created_at', debut).lte('created_at', fin),
    supabase.from('medical_examens')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .gte('created_at', debut).lte('created_at', fin),
    supabase.from('patient_dossiers')
      .select('id', { count: 'exact', head: true })
      .eq('structure_enregistrement_id', structureId)
      .gte('created_at', debut).lte('created_at', fin),
  ])

  const factures = factRes.data ?? []
  const recette  = factures.filter((f: any) => f.statut === 'payee')
    .reduce((s: number, f: any) => s + (f.total_ttc || 0), 0)
  const impayees = factures.filter((f: any) => f.statut === 'impayee').length

  const headers = ['Indicateur', 'Valeur', 'Période']
  const periode = `${mois.toString().padStart(2,'0')}/${annee}`
  const rows = [
    ['Consultations totales',              consRes.count ?? 0,  periode],
    ['Nouveaux patients enregistrés',       patRes.count  ?? 0,  periode],
    ['Ordonnances émises',                  ordRes.count  ?? 0,  periode],
    ['Examens prescrits',                   examRes.count ?? 0,  periode],
    ['Factures totales',                    factures.length,     periode],
    ['Factures impayées',                   impayees,            periode],
    ['Recette encaissée (FCFA)',             recette,             periode],
  ]

  return toCsv(headers, rows)
}