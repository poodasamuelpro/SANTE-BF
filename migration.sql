-- Migration SQL pour SantéBF
-- Nouvelles tables et colonnes pour PDF, Google Calendar, paramètres utilisateur

-- ================================================
-- 1. Table paramètres utilisateur
-- ================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  email_rdv_rappel BOOLEAN DEFAULT true,
  email_resultats BOOLEAN DEFAULT true,
  email_ordonnances BOOLEAN DEFAULT true,
  google_calendar_enabled BOOLEAN DEFAULT false,
  google_calendar_refresh_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- ================================================
-- 2. Colonnes pour logo structure
-- ================================================
ALTER TABLE struct_structures ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ================================================
-- 3. Colonnes pour signature médecin
-- ================================================
ALTER TABLE auth_profiles ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE auth_profiles ADD COLUMN IF NOT EXISTS ordre_numero TEXT;
ALTER TABLE auth_profiles ADD COLUMN IF NOT EXISTS specialite TEXT;

-- ================================================
-- 4. Colonne Google Calendar event_id
-- ================================================
ALTER TABLE medical_rendez_vous ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;
ALTER TABLE medical_rendez_vous ADD COLUMN IF NOT EXISTS duree_minutes INTEGER DEFAULT 30;

-- Index pour recherche par event_id
CREATE INDEX IF NOT EXISTS idx_rdv_google_event ON medical_rendez_vous(google_calendar_event_id);

-- ================================================
-- 5. Colonnes examens laboratoire (résultats JSON)
-- ================================================
ALTER TABLE medical_examens ADD COLUMN IF NOT EXISTS date_prelevement TIMESTAMP WITH TIME ZONE;
ALTER TABLE medical_examens ADD COLUMN IF NOT EXISTS date_resultat TIMESTAMP WITH TIME ZONE;
ALTER TABLE medical_examens ADD COLUMN IF NOT EXISTS resultats JSONB;
ALTER TABLE medical_examens ADD COLUMN IF NOT EXISTS conclusion TEXT;
ALTER TABLE medical_examens ADD COLUMN IF NOT EXISTS technicien_nom TEXT;
ALTER TABLE medical_examens ADD COLUMN IF NOT EXISTS valide_par UUID REFERENCES auth_profiles(id);
ALTER TABLE medical_examens ADD COLUMN IF NOT EXISTS date_validation TIMESTAMP WITH TIME ZONE;

-- ================================================
-- 6. Colonnes examens imagerie
-- ================================================
ALTER TABLE medical_examens_imagerie ADD COLUMN IF NOT EXISTS date_cliche TIMESTAMP WITH TIME ZONE;
ALTER TABLE medical_examens_imagerie ADD COLUMN IF NOT EXISTS date_compte_rendu TIMESTAMP WITH TIME ZONE;
ALTER TABLE medical_examens_imagerie ADD COLUMN IF NOT EXISTS compte_rendu TEXT;
ALTER TABLE medical_examens_imagerie ADD COLUMN IF NOT EXISTS images_urls TEXT[];
ALTER TABLE medical_examens_imagerie ADD COLUMN IF NOT EXISTS radiologue_nom TEXT;
ALTER TABLE medical_examens_imagerie ADD COLUMN IF NOT EXISTS valide_par UUID REFERENCES auth_profiles(id);

-- ================================================
-- 7. Buckets Cloudflare R2 via Supabase Storage
-- ================================================
-- Bucket pour logos structures
INSERT INTO storage.buckets (id, name, public) 
VALUES ('structures', 'structures', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour signatures médecins
INSERT INTO storage.buckets (id, name, public) 
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour PDF générés
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour images radiologie
INSERT INTO storage.buckets (id, name, public) 
VALUES ('imagerie', 'imagerie', false)
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- 8. Policies RLS (Row Level Security)
-- ================================================

-- Policy user_settings: utilisateur ne voit que ses paramètres
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ================================================
-- 9. Fonctions utilitaires
-- ================================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur user_settings
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 10. Index pour performance recherche
-- ================================================

-- Index full-text search sur patients
CREATE INDEX IF NOT EXISTS idx_patients_search ON patient_dossiers 
  USING gin(to_tsvector('french', nom || ' ' || prenom || ' ' || numero_national));

-- Index sur ordonnances
CREATE INDEX IF NOT EXISTS idx_ordonnances_numero ON medical_ordonnances(numero_ordonnance);
CREATE INDEX IF NOT EXISTS idx_ordonnances_statut ON medical_ordonnances(statut);
CREATE INDEX IF NOT EXISTS idx_ordonnances_structure ON medical_ordonnances(structure_id);

-- Index sur consultations
CREATE INDEX IF NOT EXISTS idx_consultations_medecin ON medical_consultations(medecin_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON medical_consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON medical_consultations(created_at DESC);

-- Index sur factures
CREATE INDEX IF NOT EXISTS idx_factures_statut ON finance_factures(statut);
CREATE INDEX IF NOT EXISTS idx_factures_structure ON finance_factures(structure_id);
CREATE INDEX IF NOT EXISTS idx_factures_date ON finance_factures(created_at DESC);

-- ================================================
-- 11. Valeurs par défaut pour tests
-- ================================================

-- Ajouter quelques paramètres types d'examen si manquants
-- (à adapter selon les besoins)

-- ================================================
-- FIN DE LA MIGRATION
-- ================================================

-- Vérification
SELECT 'Migration terminée avec succès!' AS status;
