# SantéBF - Système National de Santé du Burkina Faso

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/poodasamuelpro/SANTEBF)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Cloudflare Pages](https://img.shields.io/badge/deploy-Cloudflare%20Pages-orange.svg)](https://pages.cloudflare.com)

## 🏥 Vue d'ensemble

SantéBF est une plateforme complète de gestion des dossiers médicaux électroniques pour le Burkina Faso. Le système permet la gestion centralisée des patients, consultations, ordonnances, examens, hospitalisations et facturation.

### ✨ Fonctionnalités principales

- 🔐 **Authentification sécurisée** avec gestion des rôles (7 rôles)
- 👥 **Gestion des patients** avec dossier médical complet
- 📋 **Consultations médicales** et prescriptions
- 💊 **Ordonnances électroniques** avec QR code de vérification
- 🧪 **Examens laboratoire** et imagerie
- 🏥 **Hospitalisation** et gestion des lits
- 💉 **Suivi vaccinations** et grossesses
- 💰 **Facturation** et paiements
- 📱 **QR code urgence** - Accès sans authentification
- 📧 **Notifications email** automatiques
- 📄 **Génération PDF** professionnelle
- 📊 **Export CSV/Excel** des données
- 📅 **Intégration Google Calendar**
- 🔍 **Recherche multi-critères**
- 📱 **Design responsive** (Mobile, Tablette, Desktop)

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+
- Compte Supabase
- Compte Cloudflare (pour déploiement)
- Compte Resend (pour emails)

### Installation locale

```bash
# 1. Cloner le repository
git clone https://github.com/poodasamuelpro/SANTEBF.git
cd SANTEBF

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .dev.vars.example .dev.vars
# Éditer .dev.vars avec vos clés API

# 4. Appliquer la migration base de données
# Ouvrir migration.sql dans Supabase SQL Editor et exécuter

# 5. Build le projet
npm run build

# 6. Lancer en développement
npm run dev
# → http://localhost:8788
```

### Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Récupérer `SUPABASE_URL` et `SUPABASE_ANON_KEY`
3. Exécuter `migration.sql` dans SQL Editor
4. Activer RLS (Row Level Security) sur les tables
5. Configurer Storage buckets: `structures`, `signatures`, `documents`, `imagerie`

### Variables d'environnement

Créer `.dev.vars` avec:

```bash
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-clé-anon
RESEND_API_KEY=re_votre_clé_resend
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-secret
```

## 📦 Déploiement Cloudflare Pages

### Via GitHub Actions (Recommandé)

1. **Configurer les secrets GitHub**:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

2. **Push sur main**:
```bash
git push origin main
# GitHub Actions déploie automatiquement
```

### Via Wrangler CLI

```bash
# 1. Build le projet
npm run build

# 2. Configurer les secrets Cloudflare
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put RESEND_API_KEY

# 3. Déployer
wrangler pages deploy public --project-name=santebf

# 4. Votre application est en ligne!
# → https://santebf.pages.dev
```

### Configuration domaine personnalisé

```bash
wrangler pages domain add votre-domaine.com --project-name=santebf
```

## 🗂️ Structure du projet

```
santebf/
├── functions/
│   └── _middleware.ts          # Point d'entrée Cloudflare Pages
├── src/
│   ├── components/             # Composants HTML réutilisables
│   ├── lib/                    # Client Supabase
│   ├── middleware/             # Auth middleware
│   ├── pages/                  # Pages HTML complètes
│   ├── routes/                 # Routes API (20+ fichiers)
│   ├── types/                  # Types TypeScript
│   └── utils/                  # Services (PDF, Email, Export, etc.)
├── public/                     # Fichiers statiques
├── migration.sql               # Migration base de données
├── wrangler.toml               # Configuration Cloudflare
├── package.json
└── tsconfig.json
```

## 👥 Rôles utilisateurs

| Rôle | Accès | Dashboard |
|------|-------|-----------|
| **super_admin** | Gestion nationale | `/dashboard/admin` |
| **admin_structure** | Gestion structure | `/dashboard/structure` |
| **medecin** | Consultations, prescriptions | `/dashboard/medecin` |
| **infirmier** | Soins infirmiers | `/dashboard/medecin` |
| **sage_femme** | Suivi grossesses | `/dashboard/medecin` |
| **pharmacien** | Délivrance ordonnances | `/dashboard/pharmacien` |
| **caissier** | Facturation | `/dashboard/caissier` |
| **agent_accueil** | Accueil patients, RDV | `/dashboard/accueil` |
| **patient** | Consultation dossier | `/dashboard/patient` |

## 🔐 Sécurité

- ✅ Authentification JWT (Supabase Auth)
- ✅ Cookies HttpOnly pour tokens
- ✅ Middleware de protection des routes
- ✅ Vérification des rôles par endpoint
- ✅ RLS Supabase (Row Level Security)
- ✅ HTTPS obligatoire (Cloudflare)
- ✅ Rate limiting Cloudflare
- ✅ Protection DDoS Cloudflare
- ✅ Validation côté serveur
- ✅ Secrets stockés dans Cloudflare

## 📱 Accès d'urgence QR

### Fonctionnalité critique

Chaque patient possède un **QR code d'urgence** unique permettant l'accès aux informations vitales **SANS authentification**.

**Cas d'usage**: Patient inconscient aux urgences

**Route publique**: `/public/urgence/:qr_token`

**Informations accessibles**:
- Identité complète
- Groupe sanguin + Rhésus
- **Allergies critiques** (mise en avant)
- Maladies chroniques
- Contacts d'urgence
- Dernières consultations
- Traitements en cours

**Sécurité**: Token unique UUID v4, accès anonyme tracé

## 🎯 Routes principales

### Publiques (pas d'authentification)
```
GET /public/urgence/:qr_token         # Accès urgence patient
GET /public/ordonnance/:qr_code       # Vérification ordonnance
```

### Patient
```
GET /patient/dossier                  # Dossier médical (lecture seule)
GET /patient/ordonnances              # Liste ordonnances
GET /patient/ordonnances/:id/pdf      # Télécharger ordonnance PDF
GET /patient/rdv                      # Rendez-vous
GET /patient/examens                  # Résultats examens
GET /patient/vaccinations             # Carnet vaccination
GET /patient/consentements            # Gestion consentements
```

### Médecin
```
GET  /medecin/consultations           # Liste consultations
POST /medecin/nouvelle-consultation   # Nouvelle consultation
POST /medecin/ordonnances/nouvelle    # Prescrire ordonnance
GET  /medecin/patients/:id            # Fiche patient complète
```

### Agent accueil
```
GET  /accueil/nouveau-patient         # Créer compte patient
POST /accueil/nouveau-patient         # Enregistrer patient
GET  /accueil/rdv/nouveau             # Prendre RDV
POST /accueil/rdv/nouveau             # Enregistrer RDV
```

### Export
```
GET /export/patients                  # Export CSV patients
GET /export/consultations             # Export CSV consultations
GET /export/factures                  # Export CSV factures
GET /export/examens                   # Export CSV examens
```

## 📄 Documentation complète

- [`VERIFICATION-COMPLETE.md`](VERIFICATION-COMPLETE.md) - Vérification fonctionnalités
- [`MAPPING-ARCHITECTURE.md`](MAPPING-ARCHITECTURE.md) - Architecture détaillée
- [`RESPONSIVE-DESIGN.md`](RESPONSIVE-DESIGN.md) - Design responsive
- [`LIVRAISON-FINALE-COMPLETE.md`](LIVRAISON-FINALE-COMPLETE.md) - Document livraison
- [`RAPPORT-COMPLET-FINAL.md`](RAPPORT-COMPLET-FINAL.md) - Rapport complet
- [`LISTE-ROUTES-COMPLETE.md`](LISTE-ROUTES-COMPLETE.md) - Liste routes API

## 🧪 Tests

```bash
# Tester l'authentification
curl -X POST http://localhost:8788/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Tester route protégée (avec token)
curl http://localhost:8788/patient/dossier \
  -H "Cookie: sb_token=votre_token"

# Tester accès urgence (sans auth)
curl http://localhost:8788/public/urgence/{qr_token}
```

## 📊 Statistiques

- **68 fichiers** TypeScript
- **~24,000 lignes** de code
- **200+ routes** API
- **28 tables** Supabase
- **24 modules** métier
- **9 services** (PDF, Email, Export, etc.)
- **7 rôles** utilisateurs
- **140+ pages** documentation

## 🔧 Scripts npm

```json
{
  "dev": "wrangler pages dev public",
  "build": "tsc --noEmit",
  "deploy": "wrangler pages deploy public",
  "git:commit": "git add . && git commit -m",
  "git:push": "git push origin main"
}
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE) pour plus de détails.

## 👤 Auteur

**Samuel POODA**
- GitHub: [@poodasamuelpro](https://github.com/poodasamuelpro)

## 🙏 Remerciements

- [Hono](https://hono.dev) - Framework web ultra-rapide
- [Supabase](https://supabase.com) - Backend-as-a-Service
- [Cloudflare Pages](https://pages.cloudflare.com) - Hébergement edge
- [Resend](https://resend.com) - Service email
- [PDFMake](http://pdfmake.org) - Génération PDF

## ⚠️ Checklist production

Avant le déploiement en production:

- [ ] Activer RLS Supabase sur toutes les tables
- [ ] Configurer HTTPS obligatoire
- [ ] Activer rate limiting Cloudflare
- [ ] Configurer backup automatique base de données
- [ ] Ajouter monitoring (Cloudflare Analytics)
- [ ] Tests de charge
- [ ] Formation utilisateurs
- [ ] Documentation procédures urgence
- [ ] Plan de reprise d'activité

## 📞 Support

Pour toute question ou problème:
- Créer une [Issue GitHub](https://github.com/poodasamuelpro/SANTEBF/issues)
- Consulter la [documentation complète](./docs)
- Contacter l'équipe technique

## 🔄 Mises à jour

### Version 3.0.0 (2026-03-15)
- ✅ Notifications email automatiques
- ✅ Téléchargement PDF patient
- ✅ Export CSV/Excel complet
- ✅ Configuration Cloudflare Pages
- ✅ Documentation complète
- ✅ Design responsive finalisé

### Version 2.0.0 (2026-03-14)
- ✅ Modules laboratoire, radiologie, grossesse, infirmerie
- ✅ Génération PDF professionnelle
- ✅ Upload fichiers (logo, signature)
- ✅ Intégration Google Calendar
- ✅ Recherche multi-critères

### Version 1.0.0 (2026-03-13)
- ✅ Authentification et rôles
- ✅ Gestion patients
- ✅ Consultations et ordonnances
- ✅ Rendez-vous et facturation
- ✅ QR code urgence

---

**🩺 SantéBF - Pour une santé digitale accessible à tous**

_Développé avec ❤️ pour le Burkina Faso_
