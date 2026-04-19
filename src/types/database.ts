/**
 * src/types/database.ts
 * SantéBF — Types TypeScript alignés sur la DB Supabase RÉELLE
 *
 * CORRECTIONS APPLIQUÉES :
 *   [DB-08]  UserSettings rétabli avec colonnes RÉELLES (user_id, pas profile_id)
 *   [DB-09]  PatientContactUrgence : lien_parente (colonne réelle)
 *   [DB-10]  PatientDossier : code_urgence_hash (colonne réelle) + code_urgence (alias)
 *   [DB-14]  MedicalExamen : est_urgent (BOOLEAN), resultat_texte, valeurs_numeriques
 *   [DB-16]  FinanceFactureLigne : description, montant_total (colonnes réelles)
 *   [DB-17]  MedicalHospitalisation : motif_admission, instructions_sortie (colonnes réelles)
 *   [DB-19]  MedicalOrdonnance : numero_ordonnance généré par trigger (ne pas insérer)
 *   [DB-21]  MedicalConstantes : imc GENERATED ALWAYS (ne pas insérer)
 *   [QC-15]  env.ts mis à jour via les Bindings dans supabase.ts
 */

// ─── Géographie ───────────────────────────────────────────────────────────────

export interface GeoRegion {
  id:         string
  nom:        string
  code?:      string
  created_at: string
}

export interface GeoProvince {
  id:         string
  region_id:  string
  nom:        string
  created_at: string
}

export interface GeoVille {
  id:          string
  province_id: string
  region_id?:  string
  nom:         string
  created_at:  string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthProfile {
  id:                    string
  nom:                   string
  prenom:                string
  telephone?:            string | null
  email?:                string | null
  photo_url?:            string | null
  avatar_url?:           string | null   // alias de photo_url
  signature_url?:        string | null
  role:                  string
  structure_id?:         string | null
  doit_changer_mdp:      boolean
  otp_actif?:            boolean
  est_actif:             boolean
  derniere_connexion?:   string | null
  nb_tentatives_echec?:  number
  bloque_jusqu_au?:      string | null
  ordre_numero?:         string | null   // colonne DB réelle (pas numero_ordre)
  specialite?:           string | null
  fcm_token?:            string | null
  fcm_platform?:         string | null
  created_at:            string
  updated_at?:           string | null
}

export interface AuthMedecin {
  id:                       string
  profile_id:               string
  numero_ordre_national:    string
  specialite_principale:    string
  specialites_secondaires?: string[] | null
  diplome_principal?:       string | null
  annee_diplome?:           number | null
  universite?:              string | null
  est_generaliste?:         boolean
  est_chirurgien?:          boolean
  biographie?:              string | null
  signature_url?:           string | null
  created_at:               string
}

export interface AuthParamedical {
  id:            string
  profile_id:    string
  structure_id:  string
  type_poste:    string
  service_id?:   string | null
  created_at:    string
}

// ─── Patient ──────────────────────────────────────────────────────────────────

export interface PatientDossier {
  id:                           string
  profile_id?:                  string | null     // Lien vers auth.users (Supabase Auth)
  numero_national:              string            // PAT-YYYY-XXXXX
  nom:                          string
  prenom:                       string
  date_naissance:               string
  sexe:                         string
  lieu_naissance?:              string | null
  nationalite?:                 string | null
  profession?:                  string | null
  niveau_instruction?:          string | null
  telephone?:                   string | null
  telephone_2?:                 string | null
  email?:                       string | null
  adresse?:                     string | null
  ville_id?:                    string | null
  groupe_sanguin?:              string | null
  rhesus?:                      string | null
  allergies?:                   any
  maladies_chroniques?:         any
  traitements_permanents?:      any
  antecedents_chirurgicaux?:    any
  antecedents_familiaux?:       string | null
  qr_code_token?:               string | null
  // [DB-10] code_urgence_hash est la colonne réelle
  code_urgence_hash?:           string | null
  // code_urgence est une colonne générée (alias du hash tronqué à 6 chars)
  code_urgence?:                string | null
  code_urgence_expires_at?:     string | null
  // QR expiration (ajouté par migration 006)
  qr_code_expires_at?:          string | null
  qr_code_revoked_at?:          string | null
  photo_url?:                   string | null
  enregistre_par?:              string | null
  structure_enregistrement_id?: string | null
  est_actif:                    boolean
  created_at:                   string
  updated_at?:                  string | null
}

export interface PatientContactUrgence {
  id:             string
  patient_id:     string
  nom_complet:    string
  // [DB-09] colonne réelle = lien_parente (pas lien)
  lien_parente:   string
  lien?:          string    // alias pour compatibilité dans le code
  telephone:      string
  telephone_2?:   string | null
  est_principal:  boolean
  created_at:     string
}

export interface PatientConsentement {
  id:            string
  patient_id:    string
  structure_id:  string
  type:          string
  accorde:       boolean
  date_debut?:   string | null
  date_fin?:     string | null
  notes?:        string | null
  created_at:    string
}

export interface PatientAccesUrgence {
  id:                  string
  patient_id:          string
  medecin_id:          string
  structure_id:        string
  type_acces:          string
  motif_urgence?:      string | null
  acces_expire_at?:    string | null
  valide_par_admin?:   boolean
  commentaire_audit?:  string | null
  ip_address?:         string | null
  created_at:          string
}

// ─── Medical ──────────────────────────────────────────────────────────────────

export interface MedicalConsultation {
  id:                      string
  patient_id:              string
  medecin_id:              string
  structure_id:            string
  service_id?:             string | null
  date_heure:              string
  duree_minutes?:          number | null
  type_consultation?:      string | null
  motif:                   string
  anamnese?:               string | null
  examen_clinique?:        string | null
  diagnostic_principal?:   string | null
  diagnostics_secondaires?: any
  conclusion?:             string | null
  conduite_a_tenir?:       string | null
  prochain_rdv_dans?:      number | null
  notes_confidentielles?:  string | null
  est_urgence?:            boolean
  created_at:              string
  updated_at?:             string | null
}

export interface MedicalOrdonnance {
  id:                    string
  // [DB-19] numero_ordonnance généré par trigger — NE PAS insérer
  numero_ordonnance:     string
  consultation_id?:      string | null
  patient_id:            string
  medecin_id:            string
  structure_id:          string
  date_emission?:        string | null
  date_expiration?:      string | null
  statut?:               string | null
  notes_generales?:      string | null
  pdf_url?:              string | null
  qr_code_verification?: string | null
  created_at:            string
}

export interface MedicalOrdonnanceLigne {
  id:              string
  ordonnance_id:   string
  medicament_nom:  string
  dosage?:         string | null
  frequence?:      string | null
  duree?:          string | null
  instructions?:   string | null
  quantite?:       number | null
  ordre?:          number | null
  created_at:      string
}

export interface MedicalRendezVous {
  id:                       string
  patient_id:               string
  medecin_id:               string
  structure_id:             string
  service_id?:              string | null
  pris_par?:                string | null
  date_heure:               string
  duree_minutes?:           number | null
  motif:                    string
  notes?:                   string | null
  statut?:                  string | null
  motif_annulation?:        string | null
  rappel_envoye?:           boolean
  google_calendar_event_id?: string | null
  created_at:               string
}

export interface MedicalHospitalisation {
  id:                       string
  patient_id:               string
  structure_id:             string
  service_id:               string
  lit_id?:                  string | null
  medecin_responsable_id:   string
  admission_par?:           string | null
  date_entree:              string
  date_sortie_prevue?:      string | null
  // [DB-17] colonne réelle = motif_admission (pas motif)
  motif_admission:          string
  diagnostic_entree?:       string | null
  etat_a_l_entree?:         string | null
  vient_de_structure_id?:   string | null
  notes_evolution?:         Array<{ date: string; note: string; medecin_id: string }> | null
  date_sortie_reelle?:      string | null
  diagnostic_sortie?:       string | null
  // [DB-17] colonne réelle = type_sortie (pas statut pour la sortie)
  type_sortie?:             string | null
  rapport_sortie_url?:      string | null
  // [DB-17] colonne réelle = instructions_sortie (pas compte_rendu_sortie)
  instructions_sortie?:     string | null
  // statut est GENERATED ALWAYS depuis date_sortie_reelle (migration 003)
  statut?:                  string | null
  created_at:               string
  updated_at?:              string | null
}

export interface MedicalExamen {
  id:                    string
  consultation_id?:      string | null
  patient_id:            string
  prescripteur_id:       string
  structure_id:          string
  realise_structure_id?: string | null
  type_examen:           string     // 'laboratoire' | 'imagerie' | 'autre'
  nom_examen:            string
  description_demande?:  string | null
  // [DB-14] est_urgent = BOOLEAN (pas priorite: 'urgente')
  est_urgent?:           boolean
  statut?:               string | null
  // [DB-14] resultat_texte (pas conclusion)
  resultat_texte?:       string | null
  // [DB-14] valeurs_numeriques JSONB (pas resultats string)
  valeurs_numeriques?:   any
  interpretation?:       string | null
  est_anormal?:          boolean
  fichier_url?:          string | null
  realise_par?:          string | null
  // [DB-14] realise_at (pas date_prelevement)
  realise_at?:           string | null
  valide_par?:           string | null
  valide_at?:            string | null
  date_prescription?:    string | null
  created_at:            string
}

export interface MedicalConstantes {
  id:                   string
  consultation_id?:     string | null
  patient_id:           string
  mesure_par?:          string | null   // [DB-11] mesure_par (pas prise_par)
  date_mesure?:         string | null
  tension_systolique?:  number | null
  tension_diastolique?: number | null
  temperature?:         number | null
  pouls?:               number | null
  saturation_o2?:       number | null
  frequence_resp?:      number | null
  poids?:               number | null
  taille?:              number | null
  // [DB-21] imc = GENERATED ALWAYS → NE PAS INSÉRER
  imc?:                 number | null
  glycemie?:            number | null
  notes?:               string | null
}

export interface MedicalDocument {
  id:               string
  patient_id:       string
  consultation_id?: string | null
  upload_par?:      string | null
  structure_id:     string
  type_document?:   string | null
  titre:            string
  description?:     string | null
  fichier_url:      string
  taille_fichier?:  number | null
  format_fichier?:  string | null
  date_document?:   string | null
  est_confidentiel?: boolean
  created_at:       string
}

export interface MedicalTransfert {
  id:                        string
  patient_id:                string
  hospitalisation_id?:       string | null
  structure_origine_id:      string
  structure_destination_id:  string
  service_destination_id?:   string | null
  medecin_origine_id:        string
  medecin_destination_id?:   string | null
  date_transfert?:           string | null
  motif_transfert:           string
  resume_clinique:           string
  etat_patient_transfert?:   string | null
  moyen_transport?:          string | null
  accompagnateur?:           string | null
  statut?:                   string | null
  accepte_par?:              string | null
  accepte_at?:               string | null
  motif_refus?:              string | null
  created_at:                string
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export interface FinanceFacture {
  id:                  string
  numero_facture:      string
  patient_id:          string
  structure_id:        string
  consultation_id?:    string | null
  hospitalisation_id?: string | null
  cree_par?:           string | null
  date_emission?:      string | null
  date_echeance?:      string | null
  sous_total:          number
  remise_montant?:     number | null
  remise_pourcentage?: number | null
  total_ttc:           number
  montant_assurance?:  number | null
  montant_patient?:    number | null
  statut?:             string | null
  notes?:              string | null
  pdf_url?:            string | null
  created_at:          string
}

export interface FinanceFactureLigne {
  id:             string
  facture_id:     string
  acte_id?:       string | null
  ordre?:         number | null
  // [DB-16] colonne réelle = description (pas acte_nom)
  description:    string
  quantite?:      number | null
  prix_unitaire:  number
  // [DB-16] colonne réelle = montant_total (pas total_ligne)
  montant_total:  number
  created_at:     string
}

export interface FinancePaiement {
  id:                    string
  facture_id:            string
  patient_id:            string
  caissier_id?:          string | null
  montant:               number
  mode_paiement:         string
  reference_transaction?: string | null
  operateur?:            string | null
  commission_plateforme?: number | null
  statut_paiement?:      string | null
  recu_pdf_url?:         string | null
  notes?:                string | null
  date_paiement?:        string | null
  structure_id?:         string | null
}

export interface FinanceActeCatalogue {
  id:            string
  structure_id?: string | null
  nom:           string
  code?:         string | null
  categorie?:    string | null
  prix:          number
  est_actif?:    boolean
  created_at:    string
}

// ─── Spécialités ──────────────────────────────────────────────────────────────

export interface SpecVaccination {
  id:                    string
  patient_id:            string
  // [DB-15] administre_par (pas agent_id)
  administre_par:        string
  structure_id:          string
  vaccin_nom:            string
  vaccin_code?:          string | null
  numero_lot?:           string | null
  fabricant?:            string | null
  date_expiration_lot?:  string | null
  date_administration:   string
  // [DB-15] numero_dose (pas dose_numero)
  numero_dose:           number
  voie_administration?:  string | null
  site_injection?:       string | null
  // [DB-15] prochaine_dose_date (pas rappel_prevu)
  prochaine_dose_date?:  string | null
  reactions_observees?:  string | null
  certificat_url?:       string | null
  created_at:            string
}

export interface SpecGrossesse {
  id:                          string
  patient_id:                  string
  medecin_referent_id?:        string | null
  sage_femme_id?:              string | null
  structure_id:                string
  // [DB-07] date_dernieres_regles (sans accent — colonne DB réelle)
  date_dernieres_regles?:      string | null
  date_debut_grossesse?:       string | null
  date_accouchement_prevue?:   string | null
  age_gestationnel_debut?:     number | null
  gestite?:                    number | null
  parite?:                     number | null
  nb_fausses_couches?:         number | null
  nb_morts_nes?:               number | null
  grossesse_a_risque?:         boolean
  facteurs_risque?:            string[] | null
  groupe_sanguin_pere?:        string | null
  incompatibilite_rhesus?:     boolean
  statut?:                     string | null
  date_accouchement_reel?:     string | null
  type_accouchement?:          string | null
  duree_travail_heures?:       number | null
  complications_accouchement?: string | null
  poids_naissance_g?:          number | null
  taille_naissance_cm?:        number | null
  apgar_1min?:                 number | null
  apgar_5min?:                 number | null
  sexe_nouveau_ne?:            string | null
  etat_nouveau_ne?:            string | null
  created_at:                  string
  updated_at?:                 string | null
}

export interface SpecGrossesseCpn {
  id:                           string
  grossesse_id:                 string
  patient_id:                   string
  realise_par?:                 string | null
  structure_id:                 string
  numero_cpn:                   number
  date_cpn:                     string
  age_gestationnel_sa?:         number | null
  tension_sys?:                 number | null
  tension_dia?:                 number | null
  poids_kg?:                    number | null
  hauteur_uterine_cm?:          number | null
  fcf_bpm?:                     number | null
  presentation?:                string | null
  mouvement_foetaux?:           boolean
  oedemes?:                     boolean
  albuminurie?:                 string | null
  glucosurie?:                  string | null
  hemoglobine?:                 number | null
  test_vih?:                    string | null
  traitement_prophylactique?:   string[] | null
  observations?:                string | null
  prochaine_cpn_date?:          string | null
  created_at:                   string
}

export interface SpecSuiviChronique {
  id:                       string
  patient_id:               string
  medecin_referent_id?:     string | null
  structure_id:             string
  maladie:                  string
  maladie_autre_nom?:       string | null
  date_diagnostic?:         string | null
  stade?:                   string | null
  traitement_fond?:         string | null
  objectifs_therapeutiques?: string | null
  prochain_controle?:       string | null
  notes?:                   string | null
  est_actif:                boolean
  created_at:               string
  updated_at?:              string | null
}

// ─── Structure ────────────────────────────────────────────────────────────────

export interface StructStructure {
  id:                    string
  nom:                   string
  type:                  string
  niveau?:               number | null
  ville_id:              string
  adresse?:              string | null
  telephone?:            string | null
  telephone_urgence?:    string | null
  email?:                string | null
  logo_url?:             string | null
  latitude?:             number | null
  longitude?:            number | null
  est_public?:           boolean
  est_actif:             boolean
  date_creation?:        string | null
  created_at:            string
  updated_at?:           string | null
  plan_actif?:           string | null
  abonnement_expire_at?: string | null
  est_pilote?:           boolean
  numero_autorisation?:  string | null
  responsable_nom?:      string | null
  responsable_prenom?:   string | null
  responsable_telephone?: string | null
  responsable_email?:    string | null
  statut_verification?:  string | null
  date_verification?:    string | null
  note_verification?:    string | null
  photo_url?:            string | null
  region?:               string | null
}

export interface StructAbonnement {
  id:                 string
  structure_id:       string
  plan:               string
  statut:             string
  date_debut:         string
  date_expiration:    string
  prix_mensuel?:      number | null
  mode_paiement?:     string | null
  reference_contrat?: string | null
  cree_par?:          string | null
  notes?:             string | null
  transaction_id?:    string | null
  created_at:         string
  updated_at?:        string | null
}

export interface StructService {
  id:               string
  structure_id:     string
  nom:              string
  code?:            string | null
  description?:     string | null
  nb_lits_total?:   number | null
  responsable_id?:  string | null
  telephone_direct?: string | null
  est_actif?:       boolean
  created_at:       string
}

export interface StructLit {
  id:           string
  service_id:   string
  structure_id: string
  numero_lit:   string
  chambre?:     string | null
  type_lit?:    string | null
  statut?:      string | null   // 'libre' | 'occupe' | 'en_nettoyage'
  created_at:   string
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id:                string
  structure_id?:     string | null
  user_id?:          string | null
  destinataire_id?:  string | null   // Colonne principale pour le destinataire
  titre:             string
  message?:          string | null
  type?:             string | null
  type_notification?: string | null
  entite_type?:      string | null
  entite_id?:        string | null
  action_url?:       string | null
  lu?:               boolean
  est_lue?:          boolean        // alias plus récent
  lue_at?:           string | null
  created_at:        string
}

// ─── IA & Config ──────────────────────────────────────────────────────────────

export interface ConfigGlobal {
  id:          string
  cle:         string
  valeur?:     any
  description?: string | null
  modifie_par?: string | null
  created_at:  string
  updated_at?: string | null
}

export interface UsageIaLog {
  id:            string
  structure_id:  string
  user_id:       string
  fonctionnalite: string
  tokens_input?: number | null
  tokens_output?: number | null
  cout_fcfa?:    number | null
  succes?:       boolean
  created_at:    string
}

export interface StructLicenceIa {
  id:               string
  structure_id:     string
  fonctionnalite:   string
  est_active:       boolean
  quota_mensuel?:   number | null
  quota_utilise?:   number | null
  reset_le?:        string | null
  prix_unitaire?:   number | null
  date_activation?: string | null
  created_at:       string
}

// ─── Sang ─────────────────────────────────────────────────────────────────────

export interface SangDonneur {
  id:                  string
  patient_id:          string
  groupe_sanguin?:     string | null
  rhesus?:             string | null
  est_disponible?:     boolean
  derniere_donnee_at?: string | null
  peut_donner_apres?:  string | null
  // [LM-23] nb_dons_total doit être initialisé à 0
  nb_dons_total?:      number
  ville_id?:           string | null
  telephone_contact?:  string | null
  notes_medicales?:    string | null
  valide_par?:         string | null
  created_at:          string
  updated_at?:         string | null
}

export interface SangDemandeUrgence {
  id:                string
  structure_id?:     string | null
  medecin_demandeur?: string | null
  patient_receveur?:  string | null
  groupe_sanguin:    string
  rhesus:            string
  quantite_ml?:      number | null
  urgence_niveau?:   string | null
  statut?:           string | null
  notes?:            string | null
  created_at:        string
}

// ─── User Settings ────────────────────────────────────────────────────────────

// [DB-08] UserSettings : colonnes réelles (user_id, pas profile_id)
export interface UserSettings {
  id:                                string
  // Colonne réelle : user_id (pas profile_id)
  user_id:                           string
  email_notifications?:              boolean
  email_rdv_rappel?:                 boolean
  email_resultats?:                  boolean
  email_ordonnances?:                boolean
  google_calendar_enabled?:          boolean
  google_calendar_refresh_token?:    string | null
  // Colonnes ajoutées par migration 009
  google_calendar_access_token?:     string | null
  google_calendar_token_expires?:    string | null
  google_calendar_calendar_id?:      string | null
  theme?:                            string | null
  langue?:                           string | null
  notifications_email?:              boolean
  created_at:                        string
  updated_at?:                       string | null
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export interface BillingPaiement {
  id:                     string
  structure_id?:          string | null
  abonnement_id?:         string | null
  montant:                number
  statut?:                string | null
  passerelle?:            string | null
  transaction_id?:        string | null
  webhook_recu_at?:       string | null
  activation_effectuee?:  boolean
  created_at:             string
}

export interface CommandePendante {
  id:                   string
  transaction_id?:      string | null
  plan?:                string | null
  montant?:             number | null
  structure_nom?:       string | null
  structure_type?:      string | null
  ville?:               string | null
  prenom?:              string | null
  nom?:                 string | null
  email?:               string | null
  telephone?:           string | null
  duree?:               string | null
  statut?:              string | null
  structure_id?:        string | null
  created_at:           string
  numero_autorisation?: string | null
  responsable_nom?:     string | null
  responsable_prenom?:  string | null
  structure_adresse?:   string | null
  structure_region?:    string | null
}