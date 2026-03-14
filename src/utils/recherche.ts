/**
 * Service de recherche avancée multi-critères
 * Recherche dans patients, consultations, ordonnances, factures, etc.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Interface résultat de recherche unifié
 */
export interface RechercheResultat {
  type: 'patient' | 'consultation' | 'ordonnance' | 'facture' | 'rdv' | 'examen'
  id: string
  titre: string
  sousTitre: string
  date: string
  url: string
  badges?: Array<{ label: string; color: string }>
}

/**
 * Rechercher patients
 */
export async function rechercherPatients(
  supabase: SupabaseClient,
  query: string,
  structureId?: string
): Promise<RechercheResultat[]> {
  
  const { data, error } = await supabase
    .from('patient_dossiers')
    .select('id, nom, prenom, numero_national, date_naissance, created_at')
    .or(`nom.ilike.%${query}%,prenom.ilike.%${query}%,numero_national.ilike.%${query}%`)
    .limit(10)
  
  if (error || !data) return []
  
  return data.map(p => ({
    type: 'patient',
    id: p.id,
    titre: `${p.nom} ${p.prenom}`,
    sousTitre: `N° ${p.numero_national}`,
    date: p.date_naissance || '',
    url: `/medecin/patient/${p.id}`,
    badges: [{ label: 'Patient', color: 'blue' }]
  }))
}

/**
 * Rechercher consultations
 */
export async function rechercherConsultations(
  supabase: SupabaseClient,
  query: string,
  medecinId?: string
): Promise<RechercheResultat[]> {
  
  let request = supabase
    .from('medical_consultations')
    .select(`
      id, created_at, motif, diagnostic_principal,
      patient:patient_id (nom, prenom)
    `)
  
  if (medecinId) {
    request = request.eq('medecin_id', medecinId)
  }
  
  const { data, error } = await request
    .or(`motif.ilike.%${query}%,diagnostic_principal.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error || !data) return []
  
  return data.map(c => ({
    type: 'consultation',
    id: c.id,
    titre: c.motif || 'Consultation',
    sousTitre: `Patient: ${c.patient?.nom} ${c.patient?.prenom}`,
    date: new Date(c.created_at).toLocaleDateString('fr-FR'),
    url: `/medecin/consultation/${c.id}`,
    badges: [{ label: 'Consultation', color: 'green' }]
  }))
}

/**
 * Rechercher ordonnances
 */
export async function rechercherOrdonnances(
  supabase: SupabaseClient,
  query: string,
  structureId?: string
): Promise<RechercheResultat[]> {
  
  let request = supabase
    .from('medical_ordonnances')
    .select(`
      id, numero_ordonnance, created_at, statut,
      patient:patient_id (nom, prenom)
    `)
  
  if (structureId) {
    request = request.eq('structure_id', structureId)
  }
  
  const { data, error } = await request
    .ilike('numero_ordonnance', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error || !data) return []
  
  return data.map(o => ({
    type: 'ordonnance',
    id: o.id,
    titre: `Ordonnance ${o.numero_ordonnance}`,
    sousTitre: `Patient: ${o.patient?.nom} ${o.patient?.prenom}`,
    date: new Date(o.created_at).toLocaleDateString('fr-FR'),
    url: `/pharmacien/ordonnance/${o.id}`,
    badges: [
      { label: 'Ordonnance', color: 'purple' },
      { 
        label: o.statut, 
        color: o.statut === 'active' ? 'green' : o.statut === 'delivree' ? 'blue' : 'gray' 
      }
    ]
  }))
}

/**
 * Recherche globale (tous types)
 */
export async function rechercheGlobale(
  supabase: SupabaseClient,
  query: string,
  options?: {
    types?: Array<'patient' | 'consultation' | 'ordonnance' | 'facture' | 'rdv' | 'examen'>
    medecinId?: string
    structureId?: string
    limit?: number
  }
): Promise<RechercheResultat[]> {
  
  const types = options?.types || ['patient', 'consultation', 'ordonnance', 'facture', 'rdv']
  const limit = options?.limit || 20
  
  const resultats: RechercheResultat[] = []
  
  // Recherche par type
  if (types.includes('patient')) {
    const patients = await rechercherPatients(supabase, query, options?.structureId)
    resultats.push(...patients)
  }
  
  if (types.includes('consultation')) {
    const consultations = await rechercherConsultations(supabase, query, options?.medecinId)
    resultats.push(...consultations)
  }
  
  if (types.includes('ordonnance')) {
    const ordonnances = await rechercherOrdonnances(supabase, query, options?.structureId)
    resultats.push(...ordonnances)
  }
  
  // Trier par pertinence (longueur correspondance)
  resultats.sort((a, b) => {
    const aMatch = a.titre.toLowerCase().indexOf(query.toLowerCase())
    const bMatch = b.titre.toLowerCase().indexOf(query.toLowerCase())
    if (aMatch === -1) return 1
    if (bMatch === -1) return -1
    return aMatch - bMatch
  })
  
  return resultats.slice(0, limit)
}

/**
 * Recherche avec filtres avancés
 */
export async function rechercheAvancee(
  supabase: SupabaseClient,
  filtres: {
    type: 'patient' | 'consultation' | 'ordonnance' | 'facture' | 'rdv' | 'examen'
    query?: string
    dateDebut?: string
    dateFin?: string
    statut?: string
    medecinId?: string
    patientId?: string
    structureId?: string
    limite?: number
  }
): Promise<any[]> {
  
  let request: any
  
  switch (filtres.type) {
    case 'patient':
      request = supabase
        .from('patient_dossiers')
        .select('*')
      
      if (filtres.query) {
        request = request.or(`nom.ilike.%${filtres.query}%,prenom.ilike.%${filtres.query}%,numero_national.ilike.%${filtres.query}%`)
      }
      break
    
    case 'consultation':
      request = supabase
        .from('medical_consultations')
        .select('*, patient:patient_id(nom, prenom), medecin:medecin_id(nom, prenom)')
      
      if (filtres.query) {
        request = request.or(`motif.ilike.%${filtres.query}%,diagnostic_principal.ilike.%${filtres.query}%`)
      }
      if (filtres.medecinId) request = request.eq('medecin_id', filtres.medecinId)
      if (filtres.patientId) request = request.eq('patient_id', filtres.patientId)
      if (filtres.structureId) request = request.eq('structure_id', filtres.structureId)
      break
    
    case 'ordonnance':
      request = supabase
        .from('medical_ordonnances')
        .select('*, patient:patient_id(nom, prenom), medecin:medecin_id(nom, prenom)')
      
      if (filtres.query) request = request.ilike('numero_ordonnance', `%${filtres.query}%`)
      if (filtres.statut) request = request.eq('statut', filtres.statut)
      if (filtres.structureId) request = request.eq('structure_id', filtres.structureId)
      break
    
    case 'facture':
      request = supabase
        .from('finance_factures')
        .select('*, patient:patient_id(nom, prenom)')
      
      if (filtres.query) request = request.ilike('numero_facture', `%${filtres.query}%`)
      if (filtres.statut) request = request.eq('statut', filtres.statut)
      if (filtres.structureId) request = request.eq('structure_id', filtres.structureId)
      break
    
    case 'rdv':
      request = supabase
        .from('medical_rendez_vous')
        .select('*, patient:patient_id(nom, prenom), medecin:medecin_id(nom, prenom)')
      
      if (filtres.medecinId) request = request.eq('medecin_id', filtres.medecinId)
      if (filtres.patientId) request = request.eq('patient_id', filtres.patientId)
      if (filtres.statut) request = request.eq('statut', filtres.statut)
      break
    
    default:
      return []
  }
  
  // Filtres de date
  if (filtres.dateDebut) {
    request = request.gte('created_at', filtres.dateDebut)
  }
  if (filtres.dateFin) {
    request = request.lte('created_at', filtres.dateFin)
  }
  
  // Limite et tri
  request = request
    .order('created_at', { ascending: false })
    .limit(filtres.limite || 50)
  
  const { data, error } = await request
  
  if (error) {
    console.error('Erreur recherche avancée:', error)
    return []
  }
  
  return data || []
}
