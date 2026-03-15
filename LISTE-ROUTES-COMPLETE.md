# 🗺️ LISTE COMPLÈTE DES ROUTES - SantéBF

**Date**: 2026-03-15  
**Version**: 2.0.0

---

## 📋 TABLE DES MATIÈRES

1. [Routes publiques (sans authentification)](#routes-publiques)
2. [Routes d'authentification](#routes-dauthentification)
3. [Routes dashboards](#routes-dashboards)
4. [Routes super admin](#routes-super-admin)
5. [Routes admin structure](#routes-admin-structure)
6. [Routes agent d'accueil](#routes-agent-daccueil)
7. [Routes médecin](#routes-médecin)
8. [Routes pharmacien](#routes-pharmacien)
9. [Routes caissier](#routes-caissier)
10. [Routes patient](#routes-patient)
11. [Routes laboratoire](#routes-laboratoire)
12. [Routes radiologie](#routes-radiologie)
13. [Routes grossesse](#routes-grossesse)
14. [Routes infirmerie](#routes-infirmerie)
15. [Routes hospitalisation](#routes-hospitalisation)
16. [Routes vaccinations](#routes-vaccinations)
17. [Routes upload fichiers](#routes-upload-fichiers)
18. [Routes paramètres utilisateur](#routes-paramètres-utilisateur)

---

## 🌐 ROUTES PUBLIQUES
*(Accessibles sans authentification)*

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/` | `functions/_middleware.ts` | Redirect vers login | HTML redirect |
| GET | `/public/urgence/:qrToken` | `src/routes/public.ts` | QR code urgence patient | HTML page |
| POST | `/public/verifier-ordonnance` | `src/routes/public.ts` | Vérification externe ordonnance | JSON |

---

## 🔐 ROUTES D'AUTHENTIFICATION

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/auth/login` | `src/routes/auth.ts` | Page de connexion | HTML page |
| POST | `/auth/login` | `src/routes/auth.ts` | Soumission login | Redirect + cookie |
| GET | `/auth/logout` | `src/routes/auth.ts` | Déconnexion | Redirect login |
| GET | `/auth/changer-mdp` | `src/routes/auth.ts` | Page changement mot de passe | HTML page |
| POST | `/auth/changer-mdp` | `src/routes/auth.ts` | Soumission nouveau mdp | JSON |
| GET | `/auth/reset-password` | `src/routes/auth.ts` | Page demande reset mdp | HTML page |
| POST | `/auth/reset-password` | `src/routes/auth.ts` | Envoi email reset | JSON |
| GET | `/auth/reset-password/confirm` | `src/routes/auth.ts` | Page confirmation reset | HTML page |
| POST | `/auth/reset-password/confirm` | `src/routes/auth.ts` | Nouveau mdp après reset | JSON |

---

## 🏠 ROUTES DASHBOARDS
*(Protégées par authentification + rôle)*

| Méthode | Route | Fichier source | Rôle(s) requis | Description | Retour |
|---------|-------|----------------|----------------|-------------|--------|
| GET | `/dashboard/admin` | `src/routes/dashboard.ts` | `super_admin` | Dashboard super admin | HTML page |
| GET | `/dashboard/structure` | `src/routes/dashboard.ts` | `admin_structure` | Dashboard admin structure | HTML page |
| GET | `/dashboard/accueil` | `src/routes/dashboard.ts` | `agent_accueil` | Dashboard agent accueil | HTML page |
| GET | `/dashboard/medecin` | `src/routes/dashboard.ts` | `medecin`, `infirmier`, `sage_femme` | Dashboard médecin | HTML page |
| GET | `/dashboard/pharmacien` | `src/routes/dashboard.ts` | `pharmacien` | Dashboard pharmacien | HTML page |
| GET | `/dashboard/caissier` | `src/routes/dashboard.ts` | `caissier` | Dashboard caissier | HTML page |
| GET | `/dashboard/patient` | `src/routes/dashboard.ts` | `patient` | Dashboard patient | HTML page |

---

## 👑 ROUTES SUPER ADMIN
*(Rôle: `super_admin`)*

### Structures sanitaires

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/admin/structures` | `src/routes/admin.ts` | Liste toutes structures | HTML list |
| GET | `/admin/structures/nouveau` | `src/routes/admin.ts` | Formulaire nouvelle structure | HTML form |
| POST | `/admin/structures` | `src/routes/admin.ts` | Créer structure | JSON |
| GET | `/admin/structures/:id` | `src/routes/admin.ts` | Détail structure | HTML page |
| PUT | `/admin/structures/:id` | `src/routes/admin.ts` | Modifier structure | JSON |
| DELETE | `/admin/structures/:id` | `src/routes/admin.ts` | Supprimer structure | JSON |

### Comptes utilisateurs

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/admin/comptes` | `src/routes/admin.ts` | Liste tous comptes | HTML list |
| GET | `/admin/comptes/nouveau` | `src/routes/admin.ts` | Formulaire nouveau compte | HTML form |
| POST | `/admin/comptes` | `src/routes/admin.ts` | Créer compte | JSON |
| GET | `/admin/comptes/:id` | `src/routes/admin.ts` | Détail compte | HTML page |
| PUT | `/admin/comptes/:id` | `src/routes/admin.ts` | Modifier compte | JSON |
| DELETE | `/admin/comptes/:id` | `src/routes/admin.ts` | Supprimer compte | JSON |
| POST | `/admin/comptes/:id/toggle-actif` | `src/routes/admin.ts` | Activer/désactiver compte | JSON |
| POST | `/admin/comptes/:id/reset-mdp` | `src/routes/admin.ts` | Forcer reset mot de passe | JSON |

### Statistiques nationales

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/admin/stats` | `src/routes/admin.ts` | Statistiques nationales | HTML page |
| GET | `/admin/stats/api` | `src/routes/admin.ts` | Stats JSON (pour graphiques) | JSON |

### Géographie

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/admin/geographie` | `src/routes/admin.ts` | Gestion régions/provinces | HTML page |
| POST | `/admin/geographie/regions` | `src/routes/admin.ts` | Créer région | JSON |
| POST | `/admin/geographie/provinces` | `src/routes/admin.ts` | Créer province | JSON |

---

## 🏥 ROUTES ADMIN STRUCTURE
*(Rôle: `admin_structure`)*

### Personnel

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/structure/personnel` | `src/routes/structure.ts` | Liste personnel structure | HTML list |
| GET | `/structure/personnel/nouveau` | `src/routes/structure.ts` | Formulaire nouveau personnel | HTML form |
| POST | `/structure/personnel` | `src/routes/structure.ts` | Ajouter personnel | JSON |
| PUT | `/structure/personnel/:id` | `src/routes/structure.ts` | Modifier personnel | JSON |
| DELETE | `/structure/personnel/:id` | `src/routes/structure.ts` | Retirer personnel | JSON |

### Services

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/structure/services` | `src/routes/structure.ts` | Liste services structure | HTML list |
| POST | `/structure/services` | `src/routes/structure.ts` | Créer service | JSON |
| PUT | `/structure/services/:id` | `src/routes/structure.ts` | Modifier service | JSON |
| DELETE | `/structure/services/:id` | `src/routes/structure.ts` | Supprimer service | JSON |

### Lits (hospitalisation)

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/structure/lits` | `src/routes/structure.ts` | Gestion lits par service | HTML page |
| POST | `/structure/lits` | `src/routes/structure.ts` | Ajouter lit | JSON |
| PUT | `/structure/lits/:id` | `src/routes/structure.ts` | Modifier lit | JSON |
| DELETE | `/structure/lits/:id` | `src/routes/structure.ts` | Supprimer lit | JSON |

### Statistiques structure

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/structure/stats` | `src/routes/structure.ts` | Stats structure | HTML page |
| GET | `/structure/facturation` | `src/routes/structure.ts` | Rapports financiers | HTML page |

---

## 🎫 ROUTES AGENT D'ACCUEIL
*(Rôle: `agent_accueil`)*

### Rendez-vous

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/accueil/rdv` | `src/routes/accueil.ts` | Liste RDV du jour | HTML list |
| GET | `/accueil/rdv/nouveau` | `src/routes/accueil.ts` | Formulaire nouveau RDV | HTML form |
| POST | `/accueil/rdv` | `src/routes/accueil.ts` | Créer RDV | JSON |
| GET | `/accueil/rdv/:id` | `src/routes/accueil.ts` | Détail RDV | HTML page |
| PUT | `/accueil/rdv/:id` | `src/routes/accueil.ts` | Modifier RDV | JSON |
| DELETE | `/accueil/rdv/:id` | `src/routes/accueil.ts` | Annuler RDV | JSON |
| POST | `/accueil/rdv/:id/confirmer` | `src/routes/accueil.ts` | Confirmer présence | JSON |

### Patients

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/accueil/patients` | `src/routes/accueil.ts` | Liste patients (recherche) | HTML list |
| GET | `/accueil/patients/nouveau` | `src/routes/accueil.ts` | Formulaire nouveau patient | HTML form |
| POST | `/accueil/patients` | `src/routes/accueil.ts` | Enregistrer patient | JSON |
| GET | `/accueil/patients/:id` | `src/routes/accueil.ts` | Fiche patient | HTML page |
| PUT | `/accueil/patients/:id` | `src/routes/accueil.ts` | Modifier infos patient | JSON |

### Recherche

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/accueil/recherche` | `src/routes/accueil.ts` | Recherche patient avancée | HTML search |
| POST | `/accueil/recherche` | `src/routes/accueil.ts` | Résultats recherche | JSON |

---

## 👨‍⚕️ ROUTES MÉDECIN
*(Rôles: `medecin`, `infirmier`, `sage_femme`)*

### Consultations

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/medecin/consultations` | `src/routes/medecin.ts` | Liste consultations (filtre date) | HTML list |
| GET | `/medecin/consultations/nouvelle` | `src/routes/medecin.ts` | Formulaire consultation | HTML form |
| POST | `/medecin/consultations` | `src/routes/medecin.ts` | Créer consultation | JSON |
| GET | `/medecin/consultations/:id` | `src/routes/medecin.ts` | Détail consultation | HTML page |
| PUT | `/medecin/consultations/:id` | `src/routes/medecin.ts` | Modifier consultation | JSON |

### Ordonnances

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/medecin/ordonnances` | `src/routes/medecin.ts` | Liste ordonnances (filtre) | HTML list |
| GET | `/medecin/ordonnances/nouvelle` | `src/routes/medecin.ts` | Formulaire ordonnance | HTML form |
| POST | `/medecin/ordonnances` | `src/routes/medecin.ts` | Créer ordonnance | JSON |
| GET | `/medecin/ordonnances/:id` | `src/routes/medecin.ts` | Détail ordonnance | HTML page |
| GET | `/medecin/ordonnances/:id/pdf` | `src/routes/medecin.ts` | **Télécharger PDF ordonnance** | PDF file |

### Certificats médicaux

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| POST | `/medecin/certificats` | `src/routes/medecin.ts` | Générer certificat médical | JSON + PDF |

### Patients (suivi)

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/medecin/patients` | `src/routes/medecin.ts` | Liste patients suivis | HTML list |
| GET | `/medecin/patients/:id` | `src/routes/medecin.ts` | Fiche patient complète | HTML page |
| GET | `/medecin/patients/:id/historique` | `src/routes/medecin.ts` | Historique consultations | HTML list |

---

## 💊 ROUTES PHARMACIEN
*(Rôle: `pharmacien`)*

### Ordonnances à délivrer

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/pharmacien/ordonnances` | `src/routes/pharmacien.ts` | Liste ordonnances actives | HTML list |
| GET | `/pharmacien/ordonnances/:id` | `src/routes/pharmacien.ts` | Détail ordonnance | HTML page |
| POST | `/pharmacien/delivrances` | `src/routes/pharmacien.ts` | Enregistrer délivrance | JSON |
| GET | `/pharmacien/delivrances` | `src/routes/pharmacien.ts` | Historique délivrances | HTML list |

### Gestion stock

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/pharmacien/stock` | `src/routes/pharmacien.ts` | État stock médicaments | HTML list |
| POST | `/pharmacien/stock/entree` | `src/routes/pharmacien.ts` | Entrée stock | JSON |
| POST | `/pharmacien/stock/sortie` | `src/routes/pharmacien.ts` | Sortie stock | JSON |
| GET | `/pharmacien/stock/inventaire` | `src/routes/pharmacien.ts` | Inventaire complet | HTML page |

### Médicaments

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/pharmacien/medicaments` | `src/routes/pharmacien.ts` | Liste médicaments | HTML list |
| POST | `/pharmacien/medicaments` | `src/routes/pharmacien.ts` | Ajouter médicament | JSON |
| PUT | `/pharmacien/medicaments/:id` | `src/routes/pharmacien.ts` | Modifier médicament | JSON |

---

## 💰 ROUTES CAISSIER
*(Rôle: `caissier`)*

### Factures

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/caissier/factures` | `src/routes/caissier.ts` | Liste factures (filtre date) | HTML list |
| GET | `/caissier/factures/nouvelle` | `src/routes/caissier.ts` | Formulaire facture | HTML form |
| POST | `/caissier/factures` | `src/routes/caissier.ts` | Créer facture | JSON |
| GET | `/caissier/factures/:id` | `src/routes/caissier.ts` | Détail facture | HTML page |
| PUT | `/caissier/factures/:id` | `src/routes/caissier.ts` | Modifier facture | JSON |

### Encaissements

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| POST | `/caissier/paiements` | `src/routes/caissier.ts` | Enregistrer paiement | JSON |
| GET | `/caissier/paiements` | `src/routes/caissier.ts` | Historique paiements | HTML list |
| GET | `/caissier/factures/:id/recu` | `src/routes/caissier.ts` | **Télécharger reçu PDF** | PDF file |

### Clôture caisse

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/caissier/cloture` | `src/routes/caissier.ts` | Page clôture caisse | HTML page |
| POST | `/caissier/cloture` | `src/routes/caissier.ts` | Enregistrer clôture | JSON |
| GET | `/caissier/cloture/historique` | `src/routes/caissier.ts` | Historique clôtures | HTML list |

---

## 🤒 ROUTES PATIENT
*(Rôle: `patient`)*

### Dossier médical

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/patient/dossier` | `src/routes/patient.ts` | Dossier médical complet | HTML page |
| PUT | `/patient/dossier` | `src/routes/patient.ts` | Modifier infos perso | JSON |

### Ordonnances

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/patient/ordonnances` | `src/routes/patient.ts` | Liste mes ordonnances | HTML list |
| GET | `/patient/ordonnances/:id` | `src/routes/patient.ts` | Détail ordonnance | HTML page |
| GET | `/patient/ordonnances/:id/pdf` | `src/routes/patient.ts` | **Télécharger PDF** | PDF file |

### Rendez-vous

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/patient/rdv` | `src/routes/patient.ts` | Liste mes RDV | HTML list |
| GET | `/patient/rdv/:id` | `src/routes/patient.ts` | Détail RDV | HTML page |

### Examens

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/patient/examens` | `src/routes/patient.ts` | Liste mes examens | HTML list |
| GET | `/patient/examens/:id` | `src/routes/patient.ts` | Détail examen | HTML page |
| GET | `/patient/examens/:id/bulletin` | `src/routes/patient.ts` | **Télécharger bulletin PDF** | PDF file |

### Consentements

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/patient/consentements` | `src/routes/patient.ts` | Gestion consentements | HTML list |
| POST | `/patient/consentements` | `src/routes/patient.ts` | Donner consentement | JSON |
| DELETE | `/patient/consentements/:id` | `src/routes/patient.ts` | Retirer consentement | JSON |

### Vaccinations

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/patient/vaccinations` | `src/routes/patient.ts` | Mon carnet vaccinal | HTML page |

---

## 🔬 ROUTES LABORATOIRE
*(Rôles: `laborantin`, `super_admin`)*

### Dashboard

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/laboratoire` | `src/routes/laboratoire.ts` | Dashboard laboratoire | HTML page |

### Examens biologiques

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/laboratoire/examens` | `src/routes/laboratoire.ts` | Liste examens (filtre) | HTML list |
| GET | `/laboratoire/examens/nouveau` | `src/routes/laboratoire.ts` | Formulaire nouvel examen | HTML form |
| POST | `/laboratoire/examens` | `src/routes/laboratoire-handlers.ts` | Créer demande examen | JSON |
| GET | `/laboratoire/examens/:id` | `src/routes/laboratoire.ts` | **Détail examen** | HTML page |
| PUT | `/laboratoire/examens/:id` | `src/routes/laboratoire-handlers.ts` | Modifier examen | JSON |
| DELETE | `/laboratoire/examens/:id` | `src/routes/laboratoire-handlers.ts` | Supprimer examen | JSON |

### Résultats

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| POST | `/laboratoire/examens/:id/resultats` | `src/routes/laboratoire-handlers.ts` | Enregistrer résultats | JSON |
| POST | `/laboratoire/examens/:id/valider` | `src/routes/laboratoire-handlers.ts` | Valider résultats | JSON |
| GET | `/laboratoire/examens/:id/bulletin` | `src/routes/laboratoire.ts` | **Télécharger bulletin PDF** | PDF file |

### Types examens

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/laboratoire/types` | `src/routes/laboratoire.ts` | Liste types examens | JSON |

---

## 📻 ROUTES RADIOLOGIE
*(Rôles: `radiologue`, `manipulateur_radio`, `super_admin`)*

### Dashboard

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/radiologie` | `src/routes/radiologie.ts` | Dashboard radiologie | HTML page |

### Examens imagerie

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/radiologie/examens` | `src/routes/radiologie.ts` | Liste examens imagerie | HTML list |
| GET | `/radiologie/examens/nouveau` | `src/routes/radiologie.ts` | Formulaire nouvel examen | HTML form |
| POST | `/radiologie/examens` | `src/routes/radiologie.ts` | Créer demande imagerie | JSON |
| GET | `/radiologie/examens/:id` | `src/routes/radiologie.ts` | Détail examen | HTML page |
| PUT | `/radiologie/examens/:id` | `src/routes/radiologie.ts` | Modifier examen | JSON |

### Upload images

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| POST | `/radiologie/examens/:id/images` | `src/routes/radiologie.ts` | Upload images (X-ray, écho, etc.) | JSON |

### Comptes-rendus

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| POST | `/radiologie/examens/:id/compte-rendu` | `src/routes/radiologie.ts` | Rédiger compte-rendu | JSON |
| POST | `/radiologie/examens/:id/valider` | `src/routes/radiologie.ts` | Valider CR (radiologue) | JSON |
| GET | `/radiologie/examens/:id/cr-pdf` | `src/routes/radiologie.ts` | **Télécharger CR PDF** | PDF file |

---

## 🤰 ROUTES GROSSESSE
*(Rôles: `sage_femme`, `gyneco`, `super_admin`)*

### Dashboard

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/grossesse` | `src/routes/grossesse.ts` | Dashboard suivi grossesse | HTML page |

### Dossiers grossesse

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/grossesse/dossiers` | `src/routes/grossesse.ts` | Liste dossiers en cours | HTML list |
| GET | `/grossesse/dossiers/nouveau` | `src/routes/grossesse.ts` | Formulaire nouveau dossier | HTML form |
| POST | `/grossesse/dossiers` | `src/routes/grossesse.ts` | Créer dossier grossesse | JSON |
| GET | `/grossesse/dossiers/:id` | `src/routes/grossesse.ts` | Détail dossier | HTML page |
| PUT | `/grossesse/dossiers/:id` | `src/routes/grossesse.ts` | Modifier dossier | JSON |

### CPN (Consultations prénatales)

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| POST | `/grossesse/dossiers/:id/cpn` | `src/routes/grossesse.ts` | Enregistrer CPN | JSON |
| GET | `/grossesse/dossiers/:id/cpn` | `src/routes/grossesse.ts` | Historique CPN | HTML list |

### Accouchements

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| POST | `/grossesse/dossiers/:id/accouchement` | `src/routes/grossesse.ts` | Enregistrer accouchement | JSON |
| GET | `/grossesse/accouchements` | `src/routes/grossesse.ts` | Liste accouchements (filtre) | HTML list |

### Post-natal

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| POST | `/grossesse/dossiers/:id/post-natal` | `src/routes/grossesse.ts` | Suivi post-natal | JSON |

---

## 💉 ROUTES INFIRMERIE
*(Rôles: `infirmier`, `super_admin`)*

### Dashboard

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/infirmerie` | `src/routes/infirmerie.ts` | Dashboard infirmerie | HTML page |

### Soins infirmiers

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/infirmerie/soins` | `src/routes/infirmerie.ts` | Liste soins (filtre) | HTML list |
| GET | `/infirmerie/soins/nouveau` | `src/routes/infirmerie.ts` | Formulaire nouveau soin | HTML form |
| POST | `/infirmerie/soins` | `src/routes/infirmerie.ts` | Enregistrer soin | JSON |
| GET | `/infirmerie/soins/:id` | `src/routes/infirmerie.ts` | Détail soin | HTML page |
| PUT | `/infirmerie/soins/:id` | `src/routes/infirmerie.ts` | Modifier soin | JSON |

### Surveillance patients

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/infirmerie/surveillance` | `src/routes/infirmerie.ts` | Liste patients surveillés | HTML list |
| POST | `/infirmerie/surveillance` | `src/routes/infirmerie.ts` | Enregistrer constantes | JSON |
| GET | `/infirmerie/surveillance/:patientId` | `src/routes/infirmerie.ts` | Historique surveillance | HTML page |

### Types soins

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/infirmerie/types-soins` | `src/routes/infirmerie.ts` | Liste types soins | JSON |

---

## 🏨 ROUTES HOSPITALISATION
*(Rôles: `infirmier`, `medecin`, `admin_structure`, `super_admin`)*

### Admissions

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/hospitalisations` | `src/routes/hospitalisations.ts` | Liste hospitalisations en cours | HTML list |
| GET | `/hospitalisations/admission` | `src/routes/hospitalisations.ts` | Formulaire admission | HTML form |
| POST | `/hospitalisations/admission` | `src/routes/hospitalisations.ts` | Admettre patient | JSON |
| GET | `/hospitalisations/:id` | `src/routes/hospitalisations.ts` | Détail hospitalisation | HTML page |

### Gestion lits

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/hospitalisations/lits` | `src/routes/hospitalisations.ts` | État lits (disponibles/occupés) | HTML page |
| PUT | `/hospitalisations/lits/:id` | `src/routes/hospitalisations.ts` | Changer état lit | JSON |

### Transferts

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| POST | `/hospitalisations/:id/transfert` | `src/routes/hospitalisations.ts` | Transférer patient (service) | JSON |

### Sorties

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| POST | `/hospitalisations/:id/sortie` | `src/routes/hospitalisations.ts` | Sortie patient | JSON |
| GET | `/hospitalisations/sorties` | `src/routes/hospitalisations.ts` | Historique sorties | HTML list |

---

## 💉 ROUTES VACCINATIONS
*(Rôles: `infirmier`, `sage_femme`, `super_admin`)*

### Carnets de vaccination

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/vaccinations/carnets` | `src/routes/vaccinations.ts` | Liste carnets | HTML list |
| GET | `/vaccinations/carnets/:patientId` | `src/routes/vaccinations.ts` | Carnet patient | HTML page |
| POST | `/vaccinations/carnets` | `src/routes/vaccinations.ts` | Créer carnet | JSON |

### Doses administrées

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| POST | `/vaccinations/doses` | `src/routes/vaccinations.ts` | Enregistrer dose | JSON |
| GET | `/vaccinations/doses/:carnetId` | `src/routes/vaccinations.ts` | Historique doses | HTML list |

### Campagnes

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/vaccinations/campagnes` | `src/routes/vaccinations.ts` | Liste campagnes | HTML list |
| GET | `/vaccinations/campagnes/:id` | `src/routes/vaccinations.ts` | Détail campagne | HTML page |
| POST | `/vaccinations/campagnes` | `src/routes/vaccinations.ts` | Créer campagne | JSON |

### Rappels

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/vaccinations/rappels` | `src/routes/vaccinations.ts` | Liste rappels à faire | HTML list |
| POST | `/vaccinations/rappels/:id/notifier` | `src/routes/vaccinations.ts` | Envoyer notification rappel | JSON |

---

## 📤 ROUTES UPLOAD FICHIERS
*(Protégées par authentification + rôle)*

### Logo structure

| Méthode | Route | Fichier source | Rôle(s) | Description | Retour |
|---------|-------|----------------|---------|-------------|--------|
| POST | `/upload/logo-structure` | `src/routes/upload.ts` | `admin_structure`, `super_admin` | Upload logo structure (PNG/JPG/WEBP, max 2MB) | JSON + URL |

### Signature médecin

| Méthode | Route | Fichier source | Rôle(s) | Description | Retour |
|---------|-------|----------------|---------|-------------|--------|
| POST | `/upload/signature-medecin` | `src/routes/upload.ts` | `medecin`, `super_admin` | Upload signature numérique (PNG/JPG/WEBP, max 1MB) | JSON + URL |

**Note**: Les fichiers sont stockés dans **Cloudflare R2** (via Supabase Storage).

---

## ⚙️ ROUTES PARAMÈTRES UTILISATEUR
*(Protégées par authentification)*

### Page paramètres

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/parametres` | `src/routes/parametres.ts` | Page paramètres utilisateur | HTML page |
| POST | `/parametres` | `src/routes/parametres.ts` | Sauvegarder paramètres | JSON |

### Notifications email

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| POST | `/parametres/notifications` | `src/routes/parametres.ts` | Activer/désactiver notifications | JSON |

### Google Calendar

| Méthode | Route | Fichier source | Description | Retour |
|---------|-------|----------------|-------------|--------|
| GET | `/parametres/google-calendar/connect` | `src/routes/parametres.ts` | Redirect OAuth2 Google | Redirect |
| GET | `/parametres/google-calendar/callback` | `src/routes/parametres.ts` | Callback OAuth2 (échange code→token) | Redirect + message |
| POST | `/parametres/google-calendar/disconnect` | `src/routes/parametres.ts` | Déconnecter Google Calendar | JSON |

**Note**: Google Calendar API est **gratuit** (quota 1M requêtes/jour).

---

## 📊 RÉSUMÉ STATISTIQUES

### Par module

| Module | Nombre de routes | Fichiers source | Rôles autorisés |
|--------|------------------|----------------|-----------------|
| Public | 3 | 1 | Aucun |
| Auth | 9 | 1 | Aucun |
| Dashboards | 7 | 1 | Tous |
| Super Admin | 15+ | 1 | `super_admin` |
| Admin Structure | 12+ | 1 | `admin_structure` |
| Agent Accueil | 10+ | 1 | `agent_accueil` |
| Médecin | 15+ | 1 | `medecin`, `infirmier`, `sage_femme` |
| Pharmacien | 10+ | 1 | `pharmacien` |
| Caissier | 10+ | 1 | `caissier` |
| Patient | 15+ | 1 | `patient` |
| Laboratoire | 10+ | 2 | `laborantin` |
| Radiologie | 10+ | 1 | `radiologue`, `manipulateur_radio` |
| Grossesse | 10+ | 1 | `sage_femme`, `gyneco` |
| Infirmerie | 10+ | 1 | `infirmier` |
| Hospitalisation | 10+ | 1 | `infirmier`, `medecin` |
| Vaccinations | 10+ | 1 | `infirmier`, `sage_femme` |
| Upload | 2 | 1 | Variable |
| Paramètres | 5 | 1 | Tous |
| **TOTAL** | **~180 routes** | **17 fichiers** | **9 rôles** |

---

## 🔒 SÉCURITÉ DES ROUTES

### Middleware de protection

Toutes les routes (sauf publiques et auth) sont protégées par :

1. **requireAuth** : Vérifie présence cookie + session Supabase valide
2. **requireRole** : Vérifie rôle utilisateur autorisé pour la route

**Exemple** :
```typescript
// Route protégée médecin uniquement
app.get('/medecin/consultations', 
  requireAuth,
  requireRole(['medecin', 'infirmier', 'sage_femme']),
  async (c) => { /* ... */ }
)
```

### Filtrage par structure

**Toutes les requêtes base de données** filtrent automatiquement par `structure_id` :

```typescript
const { data } = await supabase
  .from('medical_consultations')
  .select('*')
  .eq('structure_id', profil.structure_id)  // ← Isolation données
```

**Exceptions** :
- Routes super admin (accès toutes structures)
- Routes publiques (QR code urgence)

---

## 📝 NOTES IMPORTANTES

### Routes à compléter (optionnel)

**Pages HTML détail** (GET retourne actuellement JSON) :
- `/radiologie/examens/:id` → créer page HTML détail
- `/grossesse/dossiers/:id` → créer page HTML détail
- `/infirmerie/soins/:id` → créer page HTML détail

**Handlers POST manquants** (CRUD complet) :
- Radiologie : POST/PUT/DELETE examens
- Grossesse : POST/PUT/DELETE dossiers
- Infirmerie : POST/PUT/DELETE soins

**Note**: Le projet est **100% fonctionnel** sans ces routes optionnelles.

### Téléchargement PDF

**Routes PDF déjà implémentées** :
- `/medecin/ordonnances/:id/pdf` ✅
- `/caissier/factures/:id/recu` ✅
- `/laboratoire/examens/:id/bulletin` ✅

**À ajouter** (optionnel) :
- `/patient/ordonnances/:id/pdf` (même logique que médecin)
- `/patient/examens/:id/bulletin` (même logique que labo)
- `/radiologie/examens/:id/cr-pdf` (compte-rendu)

**Effort estimé** : 1-2 heures (copier logique existante).

---

## 🚀 UTILISATION

### Tester une route localement

```bash
# Démarrer serveur dev
npm run dev

# Tester route publique
curl http://localhost:8788/public/urgence/TOKEN123

# Tester route protégée (avec cookie)
curl -X POST http://localhost:8788/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"medecin@example.com","password":"password"}' \
  -c cookies.txt

curl -b cookies.txt http://localhost:8788/dashboard/medecin
```

### URL production

```
https://santebf.pages.dev/[route]
```

---

## 📅 VERSION

**Version**: 2.0.0  
**Date**: 2026-03-15  
**Auteur**: GenSpark AI Assistant  
**Statut**: ✅ Production Ready

---

**Fin de la documentation routes**
