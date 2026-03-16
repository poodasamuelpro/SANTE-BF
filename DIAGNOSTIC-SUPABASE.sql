-- ============================================
-- SCRIPT SQL DIAGNOSTIC ET CRÉATION COMPTE TEST
-- SantéBF - À exécuter dans Supabase SQL Editor
-- ============================================

-- =====================================
-- ÉTAPE 1 : DIAGNOSTIC
-- =====================================

-- 1.1 Vérifier les utilisateurs existants
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.confirmed_at,
  u.last_sign_in_at,
  p.nom,
  p.prenom,
  p.role,
  p.est_actif,
  p.structure_id
FROM auth.users u
LEFT JOIN auth_profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 1.2 Vérifier spécifiquement l'email testé
SELECT 
  u.id,
  u.email,
  u.confirmed_at,
  u.email_confirmed_at,
  p.nom,
  p.prenom,
  p.role,
  p.est_actif
FROM auth.users u
LEFT JOIN auth_profiles p ON u.id = p.id
WHERE u.email = 'poodasamuel09@esmc@gmail.com';
-- REMPLACER PAR VOTRE EMAIL

-- 1.3 Vérifier les profils sans utilisateur (problème de cohérence)
SELECT 
  p.id,
  p.email,
  p.nom,
  p.prenom,
  p.role,
  p.est_actif
FROM auth_profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- =====================================
-- ÉTAPE 2 : CRÉATION COMPTE DE TEST
-- =====================================

-- 2.1 IMPORTANT : Créer d'abord l'utilisateur via Dashboard Supabase
-- Aller sur : Authentication → Users → Add user
-- Email: admin@santebf.bf
-- Password: Admin123!@#
-- Auto Confirm User: OUI (cocher la case)

-- 2.2 Récupérer l'UUID de l'utilisateur créé
SELECT id, email FROM auth.users WHERE email = 'admin@santebf.bf';
-- COPIER L'UUID RETOURNÉ

-- 2.3 Créer le profil correspondant
-- REMPLACER 'UUID_ICI' par l'UUID copié ci-dessus
INSERT INTO auth_profiles (
  id,
  nom,
  prenom,
  email,
  telephone,
  role,
  structure_id,
  est_actif,
  doit_changer_mdp,
  created_at,
  updated_at
) VALUES (
  'UUID_ICI', -- REMPLACER PAR L'UUID DE L'UTILISATEUR
  'Admin',
  'Super',
  'admin@santebf.bf',
  '+226 70 00 00 00',
  'super_admin',
  NULL,
  true,  -- ⚠️ IMPORTANT : doit être true
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom,
  prenom = EXCLUDED.prenom,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  est_actif = EXCLUDED.est_actif;

-- =====================================
-- ÉTAPE 3 : VÉRIFICATION
-- =====================================

-- 3.1 Vérifier que le compte est bien créé
SELECT 
  u.id,
  u.email,
  u.confirmed_at,
  u.email_confirmed_at,
  p.nom,
  p.prenom,
  p.role,
  p.est_actif
FROM auth.users u
INNER JOIN auth_profiles p ON u.id = p.id
WHERE u.email = 'admin@santebf.bf';

-- Résultat attendu :
-- - id : UUID non null
-- - email : admin@santebf.bf
-- - confirmed_at : timestamp non null
-- - email_confirmed_at : timestamp non null
-- - nom : Admin
-- - prenom : Super
-- - role : super_admin
-- - est_actif : true (✅ DOIT ÊTRE TRUE)

-- =====================================
-- ÉTAPE 4 : CORRECTION COMPTES EXISTANTS
-- =====================================

-- 4.1 Activer tous les comptes désactivés (si nécessaire)
UPDATE auth_profiles
SET est_actif = true
WHERE est_actif = false OR est_actif IS NULL;

-- 4.2 Confirmer tous les emails non confirmés (si nécessaire)
-- ATTENTION : À utiliser uniquement en développement/test
UPDATE auth.users
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email_confirmed_at IS NULL
  OR confirmed_at IS NULL;

-- 4.3 Vérifier le nombre de comptes actifs par rôle
SELECT 
  role,
  COUNT(*) as total,
  SUM(CASE WHEN est_actif = true THEN 1 ELSE 0 END) as actifs,
  SUM(CASE WHEN est_actif = false THEN 1 ELSE 0 END) as desactives
FROM auth_profiles
GROUP BY role
ORDER BY role;

-- =====================================
-- ÉTAPE 5 : TEST DE CONNEXION
-- =====================================

-- 5.1 Après avoir exécuté ce script, tester la connexion :
-- URL : https://santebf.izicardouaga.com/auth/login
-- Email : admin@santebf.bf
-- Mot de passe : Admin123!@#

-- 5.2 Si ça ne fonctionne toujours pas, vérifier :
-- - Les variables Cloudflare (SUPABASE_URL, SUPABASE_ANON_KEY)
-- - Les logs Cloudflare Pages
-- - Les logs Supabase Authentication

-- =====================================
-- ÉTAPE 6 : CRÉATION COMPTES ADDITIONNELS
-- =====================================

-- Créer un compte patient de test
-- 1. Dashboard Supabase → Authentication → Add user
--    Email: patient@test.bf
--    Password: Patient123!@#
--    Auto Confirm: OUI

-- 2. Créer le profil (remplacer UUID_ICI)
INSERT INTO auth_profiles (
  id, nom, prenom, email, role, est_actif
) VALUES (
  'UUID_ICI',
  'Dupont',
  'Jean',
  'patient@test.bf',
  'patient',
  true
);

-- Créer un compte médecin de test
-- 1. Dashboard Supabase → Authentication → Add user
--    Email: medecin@test.bf
--    Password: Medecin123!@#
--    Auto Confirm: OUI

-- 2. Créer le profil (remplacer UUID_ICI et STRUCTURE_ID)
INSERT INTO auth_profiles (
  id, nom, prenom, email, role, structure_id, est_actif, specialite
) VALUES (
  'UUID_ICI',
  'Traoré',
  'Amadou',
  'medecin@test.bf',
  'medecin',
  'STRUCTURE_ID', -- ID d'une structure existante
  true,
  'Médecine générale'
);

-- =====================================
-- NOTES IMPORTANTES
-- =====================================

/*
⚠️ POINTS CRITIQUES :

1. L'utilisateur DOIT être créé via Dashboard Supabase AVANT le profil
2. L'UUID du profil DOIT correspondre à l'UUID de auth.users
3. est_actif DOIT être true
4. confirmed_at et email_confirmed_at DOIVENT être non null
5. Le mot de passe doit respecter :
   - Minimum 8 caractères
   - Au moins 1 majuscule
   - Au moins 1 chiffre
   - Au moins 1 caractère spécial

✅ ORDRE DE CRÉATION CORRECT :

1. Créer utilisateur via Dashboard Supabase
2. Copier l'UUID généré
3. Créer le profil avec cet UUID
4. Vérifier que tout est correct avec la requête SELECT
5. Tester la connexion

❌ ERREURS FRÉQUENTES :

- Créer le profil avant l'utilisateur → ERREUR FOREIGN KEY
- UUID incorrect → Profil ne s'affiche pas
- est_actif = false → "Compte désactivé"
- email non confirmé → "Compte non confirmé"
- Mot de passe faible → Rejeté par Supabase
*/
