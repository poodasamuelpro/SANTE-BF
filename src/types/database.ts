// Types TypeScript correspondant aux tables Supabase
// Chaque type = une table de la base de données

export type GeoRegion = {
  id: string
  nom: string
  code: string
  chef_lieu: string | null
  created_at: string
}

export type GeoProvince = {
  id: string
  region_id: string
  nom: string
  code: string
  chef_lieu: string | null
}

export type StructStructure = {
  id: string
  nom: string
  type: 'CHU'|'CHR'|'CMA'|'CSPS'|'clinique_privee'|'cabinet_medical'|'pharmacie'|'laboratoire'|'cabinet_imagerie'
  niveau: 1|2|3|4
  ville_id: string
  adresse: string | null
  telephone: string | null
  est_public: boolean
  est_actif: boolean
}

export type PatientDossier = {
  id: string
  profile_id: string | null
  numero_national: string
  nom: string
  prenom: string
  date_naissance: string
  sexe: 'M'|'F'
  groupe_sanguin: 'A'|'B'|'AB'|'O'|'inconnu'
  rhesus: '+'|'-'|'inconnu'
  allergies: any[]
  maladies_chroniques: any[]
  qr_code_token: string
}

export type MedicalConsultation = {
  id: string
  patient_id: string
  medecin_id: string
  structure_id: string
  type_consultation: 'normale'|'urgence'|'suivi'|'teleconsultation'|'domicile'
  motif: string
  diagnostic_principal: string | null
  created_at: string
}

export type MedicalOrdonnance = {
  id: string
  numero_ordonnance: string
  patient_id: string
  medecin_id: string
  statut: 'active'|'expiree'|'delivree'|'partiellement_delivree'|'annulee'
  date_expiration: string
  qr_code_verification: string
}

export type FinanceFacture = {
  id: string
  numero_facture: string
  patient_id: string
  structure_id: string
  total_ttc: number
  montant_patient: number
  montant_assurance: number
  statut: 'impayee'|'partiellement_payee'|'payee'|'annulee'|'remboursee'
}
