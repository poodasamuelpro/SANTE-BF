/**
 * src/types/database.ts
 * SantéBF — Types TypeScript des tables Supabase
 *
 * Corrections :
 *   1. UserSettings supprimé — table n'existe pas dans le schéma DB documenté
 *      Les préférences email sont gérées via auth_profiles.email_notifications
 *   2. AuthProfileExtended fusionné dans AuthMedecin (cohérent avec schéma réel)
 *   3. Champs manquants ajoutés sur PatientDossier (contacts_urgence, code_urgence)
 *   4. MedicalRendezVous : colonne date_heure (pas date_rdv)
 */

// ─── Géographie ───────────────────────────────────────────

export type GeoRegion = {
  id:         string
  nom:        string
  code:       string
  chef_lieu:  string | null
  created_at: string
}

export type GeoProvince = {
  id:        string
  region_id: string
  nom:       string
  code:      string
  chef_lieu: string | null
}

export type GeoVille = {
  id:          string
  province_id: string
  nom:         string
}

// ─── Structures sanitaires ────────────────────────────────

export type StructStructure = {
  id:          string
  nom:         string
  type:        'CHU'|'CHR'|'CMA'|'CSPS'|'clinique_privee'|'cabinet_medical'|'pharmacie'|'laboratoire'|'cabinet_imagerie'
  niveau:      1|2|3|4
  ville_id:    string
  adresse:     string | null
  telephone:   string | null
  est_public:  boolean
  est_actif:   boolean
  logo_url:    string | null
}

export type StructService = {
  id:           string
  structure_id: string
  nom:          string
  type:         string
}

export type StructLit = {
  id:           string
  structure_id: string
  service_id:   string
  numero_lit:   string
  statut:       'libre' | 'occupe' | 'nettoyage' | 'hors_service'
}

// ─── Authentification ─────────────────────────────────────

export type AuthProfile = {
  id:               string
  email:            string | null
  nom:              string
  prenom:           string
  telephone:        string | null
  role:             string
  structure_id:     string | null
  est_actif:        boolean
  doit_changer_mdp: boolean
  otp_actif:        boolean
  avatar_url:       string | null
  derniere_connexion: string | null
  // Ajouté via ALTER TABLE (pour préférences notifications)
  email_notifications?: boolean
}

export type AuthMedecin = {
  id:                      string
  profile_id:              string
  numero_ordre_national:   string | null
  specialite_principale:   string | null
  specialites_secondaires: string[]
  est_generaliste:         boolean
  est_chirurgien:          boolean
  signature_url:           string | null   // upload via /upload/signature-medecin
}

export type AuthMedecinStructure = {
  medecin_id:    string
  structure_id:  string
  type_poste:    'permanent' | 'vacataire' | 'consultant' | 'garde'
  jours_presence: string[]
  heure_debut:   string | null
  heure_fin:     string | null
  date_debut:    string | null
  date_fin:      string | null
}

// ─── Patients ─────────────────────────────────────────────

export type PatientDossier = {
  id:                    string
  profile_id:            string | null
  numero_national:       string
  nom:                   string
  prenom:                string
  date_naissance:        string
  sexe:                  'M' | 'F'
  groupe_sanguin:        'A' | 'B' | 'AB' | 'O' | 'inconnu'
  rhesus:                '+' | '-' | 'inconnu'
  allergies:             Array<{ substance: string; reaction?: string }>
  maladies_chroniques:   Array<{ maladie: string; depuis?: string; traitement?: string }>
  traitements_permanents: any[]
  qr_code_token:         string
  code_urgence:          string   // Code 6 chiffres pour accès urgence
}

export type PatientContactUrgence = {
  id:         string
  patient_id: string
  nom:        string
  prenom:     string
  lien:       string
  telephone:  string
}

export type PatientConsentement = {
  id:                   string
  patient_id:           string
  medecin_id:           string
  accorde_par:          'patient' | 'tuteur' | 'parent'
  type_acces:           'consultation_unique' | 'mois_1' | 'mois_3' | 'mois_6' | 'an_1' | 'permanent'
  sections_autorisees:  string[]
  valide_jusqu_au:      string | null
  est_actif:            boolean
  revoque_at:           string | null
}

// ─── Médical ──────────────────────────────────────────────

export type MedicalConsultation = {
  id:                    string
  patient_id:            string
  medecin_id:            string
  structure_id:          string
  type_consultation:     'normale' | 'urgence' | 'suivi' | 'teleconsultation' | 'domicile'
  motif:                 string
  anamnese:              string | null
  examen_clinique:       string | null
  diagnostic_principal:  string | null
  diagnostics_secondaires: any[] | null
  conclusion:            string | null
  conduite_a_tenir:      string | null
  notes_confidentielles: string | null
  est_urgence:           boolean
  created_at:            string
}

export type MedicalConstante = {
  id:                  string
  consultation_id:     string | null
  patient_id:          string
  prise_par:           string
  tension_systolique:  number | null
  tension_diastolique: number | null
  temperature:         number | null
  pouls:               number | null
  saturation_o2:       number | null
  poids:               number | null
  taille:              number | null
  imc:                 number | null   // GENERATED ALWAYS - ne pas insérer
  glycemie:            number | null
}

export type MedicalOrdonnance = {
  id:                   string
  numero_ordonnance:    string         // Auto-généré par trigger
  consultation_id:      string | null
  patient_id:           string
  medecin_id:           string
  structure_id:         string
  statut:               'active' | 'expiree' | 'delivree' | 'partiellement_delivree' | 'annulee'
  date_expiration:      string
  qr_code_verification: string         // Auto-généré par trigger
  pdf_url:              string | null  // URL PDF stocké en Storage
  created_at:           string
}

export type MedicalOrdonnanceLigne = {
  id:                     string
  ordonnance_id:          string
  ordre:                  number
  medicament_nom:         string
  medicament_forme:       string
  dosage:                 string
  frequence:              string
  duree:                  string
  quantite:               number
  instructions_speciales: string | null
  est_delivre:            boolean
  delivre_at:             string | null
  delivre_par:            string | null
}

export type MedicalRendezVous = {
  id:             string
  patient_id:     string
  medecin_id:     string
  structure_id:   string
  date_heure:     string   // ← date_heure (PAS date_rdv — erreur corrigée dans notifications.ts)
  duree_minutes:  number
  motif:          string | null
  statut:         'planifie' | 'confirme' | 'annule' | 'passe' | 'absent' | 'reporte'
  rappel_envoye:  boolean
  motif_annulation: string | null
}

export type MedicalExamen = {
  id:                   string
  patient_id:           string
  prescrit_par:         string
  structure_id:         string
  realise_structure_id: string | null
  type_examen:          'biologie' | 'radiologie' | 'echographie' | 'ecg' | 'endoscopie' | 'anatomopathologie' | 'autre'
  nom_examen:           string
  motif:                string | null
  est_urgent:           boolean
  statut:               'prescrit' | 'en_cours' | 'resultat_disponible' | 'annule'
  resultat_texte:       string | null
  valeurs_numeriques:   Record<string, number> | null
  est_anormal:          boolean
  fichier_url:          string | null
  realise_par:          string | null
  valide_par:           string | null
  created_at:           string
}

export type MedicalDocument = {
  id:              string
  patient_id:      string
  uploaded_par:    string
  structure_id:    string
  type_document:   'radio'|'scanner'|'irm'|'echo_image'|'compte_rendu_op'|'compte_rendu_hospit'|'certificat_medical'|'certificat_deces'|'bon_examen'|'resultats_labo'|'courrier_medical'|'autre'
  titre:           string
  fichier_url:     string | null
  taille_fichier:  number | null
  est_confidentiel: boolean
  created_at:      string
}

export type MedicalHospitalisation = {
  id:                      string
  patient_id:              string
  medecin_responsable_id:  string
  structure_id:            string
  lit_id:                  string | null
  diagnostic_entree:       string
  etat_a_l_entree:         'stable' | 'grave' | 'critique' | 'inconscient'
  statut:                  'en_cours' | 'sorti' | 'transfere' | 'decede'
  notes_evolution:         Array<{ date: string; note: string; medecin_id: string }>
  date_sortie_reelle:      string | null
  type_sortie:             'gueri'|'ameliore'|'stationnaire'|'transfert'|'contre_avis_medical'|'deces'|'fugue' | null
  rapport_sortie_url:      string | null
  vient_de_structure_id:   string | null
  created_at:              string
}

export type MedicalTransfert = {
  id:                    string
  patient_id:            string
  structure_origine_id:  string
  structure_destination_id: string
  medecin_origine_id:    string
  medecin_destination_id: string | null
  motif_transfert:       string
  resume_clinique:       string
  etat_patient_transfert: 'stable' | 'grave' | 'critique'
  moyen_transport:       string | null
  statut:                'en_attente' | 'accepte' | 'refuse' | 'en_cours' | 'arrive'
  accepte_par:           string | null
  accepte_at:            string | null
}

// ─── Spécialités ──────────────────────────────────────────

export type SpecGrossesse = {
  id:                        string
  patient_id:                string
  medecin_referent_id:       string
  structure_id:              string
  date_ddr:                  string
  date_prevue_accouchement:  string | null
  gestite:                   number
  parite:                    number
  grossesse_a_risque:        boolean
  facteurs_risque:           string[]
  incompatibilite_rhesus:    boolean
  statut:                    'en_cours' | 'accouche' | 'fausse_couche' | 'interruption' | 'mort_nee'
  type_accouchement:         string | null
  poids_naissance_g:         number | null
  apgar_1min:                number | null
  apgar_5min:                number | null
}

export type SpecGrossesseCPN = {
  id:                        string
  grossesse_id:              string
  numero_cpn:                number
  age_gestationnel_sa:       number
  fcf_bpm:                   number | null
  hauteur_uterine_cm:        number | null
  presentation:              string | null
  test_vih:                  'positif' | 'negatif' | 'non_fait'
  traitement_prophylactique: string[]
  prochaine_cpn_date:        string | null
  observations:              string | null
}

export type SpecSuiviChronique = {
  id:                        string
  patient_id:                string
  medecin_referent_id:       string
  structure_id:              string
  maladie:                   'diabete_type1'|'diabete_type2'|'hypertension'|'asthme'|'drepanocytose'|'vih_sida'|'tuberculose'|'insuffisance_renale'|'insuffisance_cardiaque'|'epilepsie'|'cancer'|'autre'
  traitement_fond:           string | null
  objectifs_therapeutiques:  string | null
  prochain_controle:         string | null
  statut:                    'actif' | 'en_remission' | 'decede'
}

export type SpecSuiviChroniquesBilans = {
  id:           string
  suivi_id:     string
  pris_par:     string
  valeurs:      Record<string, number>
  observations: string | null
  created_at:   string
}

// ─── Finance ──────────────────────────────────────────────

export type FinanceFacture = {
  id:                  string
  numero_facture:      string
  patient_id:          string
  structure_id:        string
  total_ttc:           number
  montant_patient:     number
  montant_assurance:   number
  statut:              'impayee' | 'partiellement_payee' | 'payee' | 'annulee' | 'remboursee'
  created_at:          string
}

// ─── Statistiques ─────────────────────────────────────────

export type StatsAccesLog = {
  id:           string
  user_id:      string
  patient_id:   string | null
  action:       string
  table_accedee: string | null
  ressource_id: string | null
  created_at:   string
}

/*
 * ⚠️ NOTE : UserSettings a été SUPPRIMÉ de ce fichier.
 *
 * La table 'user_settings' n'existe pas dans le schéma DB documenté de SantéBF.
 * Les préférences de notifications sont gérées par :
 *   - auth_profiles.email_notifications BOOLEAN DEFAULT TRUE
 *
 * SQL pour l'ajouter :
 *   ALTER TABLE auth_profiles
 *     ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE;
 */
