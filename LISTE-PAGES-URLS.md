# 📋 SantéBF - Liste complète des pages et URLs

**Projet** : SantéBF  
**Domaine de production** : https://santebf.izicardouaga.com  
**Date** : 2026-03-16

---

## 🔐 AUTHENTIFICATION

| Page | URL | Méthode | Accès | Description |
|------|-----|---------|-------|-------------|
| **Page de connexion** | `/auth/login` | GET | Public | Formulaire email/mot de passe |
| **Traitement connexion** | `/auth/login` | POST | Public | Authentification Supabase |
| **Changement de mot de passe** | `/auth/changer-mdp` | GET | Authentifié | Formulaire changement MDP |
| **Traitement changement MDP** | `/auth/changer-mdp` | POST | Authentifié | Mise à jour MDP |
| **Demande réinitialisation** | `/auth/reset-password` | GET | Public | Formulaire email de reset |
| **Envoi email réinitialisation** | `/auth/reset-password` | POST | Public | Envoi lien reset Supabase |
| **Confirmation reset** | `/auth/reset-confirm` | GET | Public | Formulaire nouveau MDP |
| **Traitement reset** | `/auth/reset-confirm` | POST | Public | Mise à jour MDP après reset |
| **Déconnexion** | `/auth/logout` | GET | Authentifié | Suppression session |

---

## 📊 DASHBOARDS (Pages d'accueil par rôle)

| Page | URL | Rôle(s) requis | Description |
|------|-----|----------------|-------------|
| **Dashboard Super Admin** | `/dashboard/admin` | `super_admin` | Vue nationale : structures, comptes, patients |
| **Dashboard Admin Structure** | `/dashboard/structure` | `admin_structure` | Stats structure : lits, personnel, consultations |
| **Dashboard Médecin** | `/dashboard/medecin` | `medecin`, `infirmier`, `sage_femme`, `laborantin`, `radiologue` | RDV du jour, dernières consultations |
| **Dashboard Pharmacien** | `/dashboard/pharmacien` | `pharmacien` | Ordonnances actives à traiter |
| **Dashboard Caissier** | `/dashboard/caissier` | `caissier` | Factures du jour, recettes, impayés |
| **Dashboard Agent Accueil** | `/dashboard/accueil` | `agent_accueil` | RDV du jour, arrivées patients |
| **Dashboard Patient** | `/dashboard/patient` | `patient` | Dossier médical, ordonnances, RDV |

---

## 👤 MODULE PATIENT

| Page | URL | Rôle(s) requis | Description |
|------|-----|----------------|-------------|
| **Fiche patient** | `/patient/fiche/:id` | Soignants | Détails complets dossier patient |
| **PDF patient** | `/patient-pdf/:id` | Soignants | Export PDF dossier patient |
| **QR Code urgence** | `/public/urgence-qr/:id` | Public | Infos urgences accessibles sans login |

---

## 🏥 MODULE ACCUEIL (Agent d'accueil)

| Page | URL | Rôle(s) requis | Description |
|------|-----|----------------|-------------|
| **Gestion rendez-vous** | `/accueil/rendez-vous` | `agent_accueil` | Liste et gestion RDV |
| **Nouveau RDV** | `/accueil/rendez-vous/nouveau` | `agent_accueil` | Prise de RDV |
| **Arrivées patients** | `/accueil/arrivees` | `agent_accueil` | Validation présence patients |

---

## 👨‍⚕️ MODULE MÉDECIN

| Page | URL | Rôle(s) requis | Description |
|------|-----|----------------|-------------|
| **Consultations** | `/medecin/consultations` | `medecin`, `infirmier`, `sage_femme` | Liste consultations |
| **Nouvelle consultation** | `/medecin/consultations/nouveau` | `medecin`, `infirmier`, `sage_femme` | Formulaire consultation |
| **Ordonnances** | `/medecin/ordonnances` | `medecin` | Liste ordonnances prescrites |
| **Nouvelle ordonnance** | `/medecin/ordonnances/nouveau` | `medecin` | Prescription médicaments |
| **Examens médicaux** | `/medecin/examens` | `medecin` | Liste examens prescrits |

---

## 💊 MODULE PHARMACIE

| Page | URL | Rôle(s) requis | Description |
|------|-----|----------------|-------------|
| **Délivrance ordonnances** | `/pharmacien/delivrance` | `pharmacien` | Traitement ordonnances actives |
| **Stock médicaments** | `/pharmacien/stock` | `pharmacien` | Gestion inventaire |
| **Nouveaux stocks** | `/pharmacien/stock/nouveau` | `pharmacien` | Ajout médicament |

---

## 💰 MODULE CAISSE

| Page | URL | Rôle(s) requis | Description |
|------|-----|----------------|-------------|
| **Facturation** | `/caissier/factures` | `caissier` | Liste factures |
| **Nouvelle facture** | `/caissier/factures/nouveau` | `caissier` | Création facture |
| **Paiements** | `/caissier/paiements` | `caissier` | Gestion règlements |
| **Rapport caisse** | `/caissier/rapports` | `caissier` | Rapport financier journalier |

---

## 🔬 MODULE LABORATOIRE

| Page | URL | Rôle(s) requis | Description |
|------|-----|----------------|-------------|
| **Examens laboratoire** | `/laboratoire/examens` | `laborantin` | Liste examens à réaliser |
| **Détail examen** | `/laboratoire/examens/:id` | `laborantin` | Saisie résultats |
| **Nouveau type examen** | `/laboratoire/types/nouveau` | `admin_structure` | Ajout type examen |

---

## 📻 MODULE RADIOLOGIE

| Page | URL | Rôle(s) requis | Description |
|------|-----|----------------|-------------|
| **Examens imagerie** | `/radiologie/examens` | `radiologue` | Liste examens radiologiques |
| **Détail examen** | `/radiologie/examens/:id` | `radiologue` | Saisie résultats, upload images |
| **Nouveau type imagerie** | `/radiologie/types/nouveau` | `admin_structure` | Ajout type examen |

---

## 🏥 MODULE HOSPITALISATION

| Page | URL | Rôle(s) requis | Description |
|------|-----|----------------|-------------|
| **Hospitalisations** | `/hospitalisations` | Soignants | Liste patients hospitalisés |
| **Nouvelle hospitalisation** | `/hospitalisations/nouveau` | `medecin` | Admission patient |
| **Dossier hospitalisation** | `/hospitalisations/:id` | Soignants | Suivi hospitalisation |
| **Gestion lits** | `/structure/lits` | `admin_structure` | Configuration lits |

---

## 💉 MODULE VACCINATION

| Page | URL | Rôle(s) requis | Description |
|------|-----|----------------|-------------|
| **Vaccinations** | `/vaccinations` | `infirmier`, `sage_femme` | Liste vaccinations |
| **Nouvelle vaccination** | `/vaccinations/nouveau` | `infirmier`, `sage_femme` | Enregistrement vaccination |
| **Carnet de vaccination** | `/vaccinations/carnet/:patientId` | Soignants, Patient | Historique vaccinations patient |

---

## 🤰 MODULE GROSSESSE (Suivi prénatal)

| Page | URL | Rôle(s) requis | Description |
|------|-----|----------------|-------------|
| **Suivis grossesse** | `/grossesse` | `sage_femme`, `medecin` | Liste grossesses en cours |
| **Nouveau suivi** | `/grossesse/nouveau` | `sage_femme`, `medecin` | Déclaration grossesse |
| **Dossier grossesse** | `/grossesse/:id` | `sage_femme`, `medecin` | Consultations prénatales |

---

## 🩺 MODULE INFIRMERIE

| Page | URL | Rôle(s) requis | Description |
|------|-----|----------------|-------------|
| **Soins infirmiers** | `/infirmerie/soins` | `infirmier` | Liste soins à réaliser |
| **Nouveau soin** | `/infirmerie/soins/nouveau` | `infirmier` | Enregistrement soin |
| **Pansements** | `/infirmerie/pansements` | `infirmier` | Gestion pansements |

---

## ⚙️ MODULE ADMINISTRATION

| Page | URL | Rôle(s) requis | Description |
|------|-----|----------------|-------------|
| **Gestion structures** | `/admin/structures` | `super_admin` | Liste structures sanitaires |
| **Nouvelle structure** | `/admin/structures/nouveau` | `super_admin` | Création structure |
| **Gestion comptes** | `/admin/comptes` | `super_admin`, `admin_structure` | Liste utilisateurs |
| **Nouveau compte** | `/admin/comptes/nouveau` | `super_admin`, `admin_structure` | Création compte |
| **Paramètres structure** | `/structure/parametres` | `admin_structure` | Configuration structure |

---

## 📤 EXPORTS & UTILITAIRES

| Page | URL | Rôle(s) requis | Description |
|------|-----|----------------|-------------|
| **Export données** | `/export/patients` | Admins | Export CSV patients |
| **Export consultations** | `/export/consultations` | Admins | Export CSV consultations |
| **Upload fichiers** | `/upload` | POST | Upload images/documents |
| **Paramètres utilisateur** | `/parametres` | Authentifié | Préférences personnelles |

---

## 🌐 PAGES PUBLIQUES

| Page | URL | Accès | Description |
|------|-----|-------|-------------|
| **Racine** | `/` | Public | Redirection vers `/auth/login` |
| **QR Code urgence** | `/public/urgence-qr/:id` | Public | Infos urgences patient (groupe sanguin, allergies) |
| **404 Non trouvé** | `/*` | Public | Redirection vers `/auth/login` |

---

## 📊 STATISTIQUES DES PAGES

- **Total pages** : ~70+ pages
- **Pages publiques** : 3 (login, reset password, QR urgence)
- **Dashboards** : 7 (un par rôle)
- **Modules métier** : 10 modules principaux
- **Pages d'administration** : 15+
- **Routes API** : 30+

---

## 🔑 RÔLES DU SYSTÈME

| Rôle | Code | Accès Dashboard |
|------|------|-----------------|
| **Super Administrateur** | `super_admin` | `/dashboard/admin` |
| **Admin Structure** | `admin_structure` | `/dashboard/structure` |
| **Médecin** | `medecin` | `/dashboard/medecin` |
| **Infirmier** | `infirmier` | `/dashboard/medecin` |
| **Sage-femme** | `sage_femme` | `/dashboard/medecin` |
| **Pharmacien** | `pharmacien` | `/dashboard/pharmacien` |
| **Laborantin** | `laborantin` | `/dashboard/medecin` |
| **Radiologue** | `radiologue` | `/dashboard/medecin` |
| **Caissier** | `caissier` | `/dashboard/caissier` |
| **Agent Accueil** | `agent_accueil` | `/dashboard/accueil` |
| **Patient** | `patient` | `/dashboard/patient` |

---

## 🛡️ SÉCURITÉ

- Toutes les pages `/dashboard/*` requièrent authentification via middleware `requireAuth`
- Toutes les pages de modules requièrent un rôle spécifique via middleware `requireRole`
- Les cookies de session sont `httpOnly`, `secure`, `sameSite: Lax`, validité 7 jours
- Variables d'environnement requises : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY`

---

## 🚀 URL DE PRODUCTION

**Domaine principal** : https://santebf.izicardouaga.com

**Exemples d'accès** :
- Connexion : https://santebf.izicardouaga.com/auth/login
- Dashboard admin : https://santebf.izicardouaga.com/dashboard/admin
- Fiche patient : https://santebf.izicardouaga.com/patient/fiche/[UUID]
- QR urgence : https://santebf.izicardouaga.com/public/urgence-qr/[UUID]

---

**Dernière mise à jour** : 2026-03-16  
**Version** : 3.1.9
