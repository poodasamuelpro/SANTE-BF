/**
 * Service d'export Excel/CSV
 * Permet d'exporter des données en format Excel (.xlsx) ou CSV
 * 
 * Bibliothèque utilisée: exceljs (compatible Cloudflare Workers)
 * Installation: npm install exceljs
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Interface données export
 */
interface ExportData {
  headers: string[]
  rows: any[][]
  title?: string
}

/**
 * Générer fichier CSV
 */
function genererCSV(data: ExportData): string {
  const { headers, rows } = data
  
  // Échapper les virgules et guillemets dans les cellules
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  
  // En-têtes
  const csvHeaders = headers.map(escapeCSV).join(',')
  
  // Lignes
  const csvRows = rows.map(row =>
    row.map(escapeCSV).join(',')
  ).join('\n')
  
  return `${csvHeaders}\n${csvRows}`
}

/**
 * Exporter liste patients
 */
export async function exporterPatients(
  supabase: SupabaseClient,
  structureId: string,
  format: 'csv' | 'excel' = 'csv'
): Promise<string | Uint8Array> {
  const { data: patients, error } = await supabase
    .from('patient_dossiers')
    .select('*')
    .eq('structure_id', structureId)
    .order('created_at', { ascending: false })

  if (error || !patients) {
    throw new Error('Erreur lors de la récupération des patients')
  }

  const exportData: ExportData = {
    title: 'Liste des patients',
    headers: [
      'N° National',
      'Nom',
      'Prénom',
      'Date naissance',
      'Sexe',
      'Groupe sanguin',
      'Rhésus',
      'Téléphone',
      'Email',
      'Ville',
      'Date création'
    ],
    rows: patients.map(p => [
      p.numero_national || '',
      p.nom || '',
      p.prenom || '',
      p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr-FR') : '',
      p.sexe || '',
      p.groupe_sanguin || '',
      p.rhesus || '',
      p.telephone || '',
      p.email || '',
      p.ville || '',
      new Date(p.created_at).toLocaleDateString('fr-FR')
    ])
  }

  if (format === 'csv') {
    return genererCSV(exportData)
  }

  // Pour Excel, retourner CSV pour l'instant (ExcelJS nécessite plus de config)
  return genererCSV(exportData)
}

/**
 * Exporter consultations
 */
export async function exporterConsultations(
  supabase: SupabaseClient,
  structureId: string,
  dateDebut?: string,
  dateFin?: string,
  format: 'csv' | 'excel' = 'csv'
): Promise<string | Uint8Array> {
  let query = supabase
    .from('medical_consultations')
    .select(`
      *,
      patient:patient_dossiers(nom, prenom, numero_national),
      medecin:auth_profiles!medical_consultations_medecin_id_fkey(nom, prenom)
    `)
    .eq('structure_id', structureId)

  if (dateDebut) {
    query = query.gte('created_at', dateDebut)
  }
  if (dateFin) {
    query = query.lte('created_at', dateFin)
  }

  const { data: consultations, error } = await query.order('created_at', { ascending: false })

  if (error || !consultations) {
    throw new Error('Erreur lors de la récupération des consultations')
  }

  const exportData: ExportData = {
    title: 'Liste des consultations',
    headers: [
      'Date',
      'Patient',
      'N° National',
      'Médecin',
      'Motif',
      'Diagnostic',
      'Température',
      'Tension',
      'Poids',
      'Taille'
    ],
    rows: consultations.map(c => [
      new Date(c.created_at).toLocaleDateString('fr-FR') + ' ' + new Date(c.created_at).toLocaleTimeString('fr-FR'),
      c.patient ? `${c.patient.nom} ${c.patient.prenom}` : '',
      c.patient?.numero_national || '',
      c.medecin ? `Dr ${c.medecin.nom} ${c.medecin.prenom}` : '',
      c.motif || '',
      c.diagnostic || '',
      c.temperature ? `${c.temperature}°C` : '',
      c.tension_arterielle || '',
      c.poids ? `${c.poids} kg` : '',
      c.taille ? `${c.taille} cm` : ''
    ])
  }

  return genererCSV(exportData)
}

/**
 * Exporter factures
 */
export async function exporterFactures(
  supabase: SupabaseClient,
  structureId: string,
  dateDebut?: string,
  dateFin?: string,
  format: 'csv' | 'excel' = 'csv'
): Promise<string | Uint8Array> {
  let query = supabase
    .from('finance_factures')
    .select(`
      *,
      patient:patient_dossiers(nom, prenom, numero_national)
    `)
    .eq('structure_id', structureId)

  if (dateDebut) {
    query = query.gte('created_at', dateDebut)
  }
  if (dateFin) {
    query = query.lte('created_at', dateFin)
  }

  const { data: factures, error } = await query.order('created_at', { ascending: false })

  if (error || !factures) {
    throw new Error('Erreur lors de la récupération des factures')
  }

  const exportData: ExportData = {
    title: 'Liste des factures',
    headers: [
      'N° Facture',
      'Date',
      'Patient',
      'N° National',
      'Total TTC',
      'Part patient',
      'Part assurance',
      'Statut',
      'Mode paiement'
    ],
    rows: factures.map(f => [
      f.numero_facture || '',
      new Date(f.created_at).toLocaleDateString('fr-FR'),
      f.patient ? `${f.patient.nom} ${f.patient.prenom}` : '',
      f.patient?.numero_national || '',
      `${f.total_ttc} FCFA`,
      `${f.montant_patient} FCFA`,
      `${f.montant_assurance} FCFA`,
      f.statut || '',
      f.mode_paiement || ''
    ])
  }

  return genererCSV(exportData)
}

/**
 * Exporter ordonnances
 */
export async function exporterOrdonnances(
  supabase: SupabaseClient,
  structureId: string,
  dateDebut?: string,
  dateFin?: string,
  format: 'csv' | 'excel' = 'csv'
): Promise<string | Uint8Array> {
  let query = supabase
    .from('medical_ordonnances')
    .select(`
      *,
      patient:patient_dossiers(nom, prenom, numero_national),
      medecin:auth_profiles!medical_ordonnances_medecin_id_fkey(nom, prenom)
    `)
    .eq('structure_id', structureId)

  if (dateDebut) {
    query = query.gte('created_at', dateDebut)
  }
  if (dateFin) {
    query = query.lte('created_at', dateFin)
  }

  const { data: ordonnances, error } = await query.order('created_at', { ascending: false })

  if (error || !ordonnances) {
    throw new Error('Erreur lors de la récupération des ordonnances')
  }

  const exportData: ExportData = {
    title: 'Liste des ordonnances',
    headers: [
      'N° Ordonnance',
      'Date',
      'Patient',
      'N° National',
      'Médecin',
      'Statut',
      'Date expiration'
    ],
    rows: ordonnances.map(o => [
      o.numero_ordonnance || '',
      new Date(o.created_at).toLocaleDateString('fr-FR'),
      o.patient ? `${o.patient.nom} ${o.patient.prenom}` : '',
      o.patient?.numero_national || '',
      o.medecin ? `Dr ${o.medecin.nom} ${o.medecin.prenom}` : '',
      o.statut || '',
      o.date_expiration ? new Date(o.date_expiration).toLocaleDateString('fr-FR') : ''
    ])
  }

  return genererCSV(exportData)
}

/**
 * Exporter examens laboratoire
 */
export async function exporterExamensLabo(
  supabase: SupabaseClient,
  structureId: string,
  dateDebut?: string,
  dateFin?: string,
  format: 'csv' | 'excel' = 'csv'
): Promise<string | Uint8Array> {
  let query = supabase
    .from('medical_examens')
    .select(`
      *,
      patient:patient_dossiers(nom, prenom, numero_national),
      medecin:auth_profiles!medical_examens_demandeur_id_fkey(nom, prenom)
    `)
    .eq('structure_id', structureId)

  if (dateDebut) {
    query = query.gte('created_at', dateDebut)
  }
  if (dateFin) {
    query = query.lte('created_at', dateFin)
  }

  const { data: examens, error } = await query.order('created_at', { ascending: false })

  if (error || !examens) {
    throw new Error('Erreur lors de la récupération des examens')
  }

  const exportData: ExportData = {
    title: 'Liste des examens laboratoire',
    headers: [
      'Date demande',
      'Patient',
      'N° National',
      'Médecin prescripteur',
      'Type examen',
      'Statut',
      'Date prélèvement',
      'Date résultat',
      'Validé'
    ],
    rows: examens.map(e => [
      new Date(e.created_at).toLocaleDateString('fr-FR'),
      e.patient ? `${e.patient.nom} ${e.patient.prenom}` : '',
      e.patient?.numero_national || '',
      e.medecin ? `Dr ${e.medecin.nom} ${e.medecin.prenom}` : '',
      e.type_examen || '',
      e.statut || '',
      e.date_prelevement ? new Date(e.date_prelevement).toLocaleDateString('fr-FR') : '',
      e.date_resultat ? new Date(e.date_resultat).toLocaleDateString('fr-FR') : '',
      e.valide_par ? 'Oui' : 'Non'
    ])
  }

  return genererCSV(exportData)
}

/**
 * Exporter statistiques structure
 */
export async function exporterStatistiquesStructure(
  supabase: SupabaseClient,
  structureId: string,
  mois: number,
  annee: number,
  format: 'csv' | 'excel' = 'csv'
): Promise<string | Uint8Array> {
  const dateDebut = new Date(annee, mois - 1, 1).toISOString()
  const dateFin = new Date(annee, mois, 0, 23, 59, 59).toISOString()

  // Compter consultations
  const { count: nbConsultations } = await supabase
    .from('medical_consultations')
    .select('*', { count: 'exact', head: true })
    .eq('structure_id', structureId)
    .gte('created_at', dateDebut)
    .lte('created_at', dateFin)

  // Compter factures payées
  const { count: nbFactures, data: factures } = await supabase
    .from('finance_factures')
    .select('total_ttc')
    .eq('structure_id', structureId)
    .eq('statut', 'payee')
    .gte('created_at', dateDebut)
    .lte('created_at', dateFin)

  const recetteTotal = factures?.reduce((sum, f) => sum + (f.total_ttc || 0), 0) || 0

  // Compter nouveaux patients
  const { count: nbNouveauxPatients } = await supabase
    .from('patient_dossiers')
    .select('*', { count: 'exact', head: true })
    .eq('structure_id', structureId)
    .gte('created_at', dateDebut)
    .lte('created_at', dateFin)

  // Compter ordonnances
  const { count: nbOrdonnances } = await supabase
    .from('medical_ordonnances')
    .select('*', { count: 'exact', head: true })
    .eq('structure_id', structureId)
    .gte('created_at', dateDebut)
    .lte('created_at', dateFin)

  // Compter examens
  const { count: nbExamens } = await supabase
    .from('medical_examens')
    .select('*', { count: 'exact', head: true })
    .eq('structure_id', structureId)
    .gte('created_at', dateDebut)
    .lte('created_at', dateFin)

  const exportData: ExportData = {
    title: `Statistiques ${mois}/${annee}`,
    headers: ['Indicateur', 'Valeur'],
    rows: [
      ['Période', `${mois}/${annee}`],
      ['Nombre de consultations', nbConsultations?.toString() || '0'],
      ['Nombre de nouveaux patients', nbNouveauxPatients?.toString() || '0'],
      ['Nombre d\'ordonnances', nbOrdonnances?.toString() || '0'],
      ['Nombre d\'examens', nbExamens?.toString() || '0'],
      ['Nombre de factures payées', nbFactures?.toString() || '0'],
      ['Recette totale', `${recetteTotal} FCFA`]
    ]
  }

  return genererCSV(exportData)
}
