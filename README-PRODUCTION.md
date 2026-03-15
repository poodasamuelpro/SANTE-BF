# 🏥 SantéBF - Système National de Santé Numérique du Burkina Faso

**Version**: 1.0.0  
**Statut**: ✅ Production Ready  
**Dernière mise à jour**: Mars 2026

---

## 📋 Vue d'ensemble

SantéBF est une plateforme nationale de santé numérique complète pour le Burkina Faso, déployée sur Cloudflare Pages avec Supabase comme base de données.

### 🎯 Fonctionnalités principales

- ✅ **Authentification multi-rôles** (Super admin, Admin structure, Médecin, Pharmacien, Caissier, Patient, etc.)
- ✅ **Dossier patient électronique** avec QR code urgence
- ✅ **Consultations médicales** et prescriptions
- ✅ **Gestion pharmacie** (délivrance ordonnances, stock)
- ✅ **Caisse** (facturation, encaissements)
- ✅ **Laboratoire** (analyses biologiques, résultats)
- ✅ **Radiologie** (imagerie médicale, comptes-rendus)
- ✅ **Suivi grossesse** (CPN, accouchements)
- ✅ **Hospitalisation** (admissions, gestion lits)
- ✅ **Vaccinations** (carnets, campagnes)
- ✅ **Génération PDF professionnelle** (ordonnances, certificats, bulletins, reçus)
- ✅ **Google Calendar** (synchronisation RDV - gratuit)
- ✅ **Notifications email** (RDV, résultats, ordonnances)
- ✅ **Recherche avancée** multi-critères
- ✅ **Upload fichiers** (logos structure, signatures médecin)

---

## 🚀 Installation & Déploiement

### Prérequis

- Node.js 18+ et npm
- Compte Supabase (gratuit)
- Compte Cloudflare (gratuit)
- Compte Resend pour emails (gratuit jusqu'à 3000 emails/mois)
- Compte Google Cloud (gratuit) pour Google Calendar

### 1. Télécharger le projet

```bash
# Télécharger l'archive
wget https://[URL]/SANTEBF-FINAL-COMPLET.tar.gz

# Extraire
tar -xzf SANTEBF-FINAL-COMPLET.tar.gz
cd webapp
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration Supabase

#### 3.1 Créer projet Supabase

1. Aller sur https://supabase.com
2. Créer nouveau projet "SantéBF"
3. Noter l'URL et la clé anon

#### 3.2 Exécuter la migration SQL

1. Dans Supabase Dashboard → SQL Editor
2. Copier le contenu de `migration.sql`
3. Exécuter la requête

Cela créera :
- Table `user_settings` (paramètres utilisateur)
- Colonnes `logo_url`, `signature_url`, `ordre_numero`, `specialite`
- Colonnes pour résultats examens
- Buckets Storage (structures, signatures, documents, imagerie)
- Index de performance
- Policies RLS

#### 3.3 Configurer Storage

Dans Supabase Dashboard → Storage :
- Vérifier que les buckets sont créés
- Configurer policies si nécessaire

### 4. Configuration environnement

Créer fichier `.dev.vars` (pour dev local) :

```bash
SUPABASE_URL=https://[votre-projet].supabase.co
SUPABASE_ANON_KEY=eyJ[votre-cle]...
RESEND_API_KEY=re_[votre-cle]
GOOGLE_CLIENT_ID=[votre-client-id].apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-[votre-secret]
```

### 5. Configuration Google Calendar (Optionnel)

1. Aller sur https://console.cloud.google.com
2. Créer projet "SantéBF"
3. Activer **Google Calendar API**
4. Créer identifiants OAuth 2.0 :
   - Type: Application Web
   - URI autorisés: `https://santebf.pages.dev`, `http://localhost:3000`
   - URI de redirection: `https://santebf.pages.dev/parametres/google-calendar/callback`
5. Copier Client ID et Client Secret dans `.dev.vars`

**Note**: L'API Google Calendar est 100% gratuite pour usage normal.

### 6. Configuration Resend (Email)

1. Aller sur https://resend.com
2. Créer compte (gratuit jusqu'à 3000 emails/mois)
3. Ajouter domaine vérifié OU utiliser sandbox
4. Créer API key
5. Copier dans `.dev.vars`

### 7. Test en local

```bash
npm run dev
```

Ouvrir http://localhost:8787

### 8. Déploiement Cloudflare Pages

#### 8.1 Build

```bash
npm run build
```

#### 8.2 Déploiement

```bash
# Premier déploiement
npx wrangler pages deploy public --project-name=santebf

# Déploiements suivants
npm run deploy
```

#### 8.3 Configurer les secrets

```bash
npx wrangler pages secret put SUPABASE_URL --project-name=santebf
npx wrangler pages secret put SUPABASE_ANON_KEY --project-name=santebf
npx wrangler pages secret put RESEND_API_KEY --project-name=santebf
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name=santebf
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name=santebf
```

#### 8.4 Mettre à jour Google OAuth

Dans Google Cloud Console, ajouter l'URL de production :
- URI autorisés: `https://santebf.pages.dev`
- URI de redirection: `https://santebf.pages.dev/parametres/google-calendar/callback`

---

## 📊 Structure du projet

```
webapp/
├── functions/
│   └── _middleware.ts          # Point d'entrée Hono
├── public/
│   ├── css/main.css
│   ├── js/main.js
│   └── js/scanner-qr.js
├── src/
│   ├── components/             # Composants réutilisables
│   │   ├── alert.ts
│   │   ├── layout.ts
│   │   ├── pagination.ts
│   │   └── table.ts
│   ├── lib/
│   │   └── supabase.ts         # Client Supabase
│   ├── middleware/
│   │   └── auth.ts             # Auth + rôles
│   ├── pages/                  # Pages HTML complètes
│   │   ├── login.ts
│   │   ├── dashboard-*.ts
│   │   ├── examen-labo-detail.ts
│   │   └── ...
│   ├── routes/                 # Routes métier
│   │   ├── auth.ts
│   │   ├── admin.ts
│   │   ├── medecin.ts
│   │   ├── laboratoire.ts
│   │   ├── upload.ts
│   │   ├── parametres.ts
│   │   └── ...
│   ├── types/
│   │   ├── database.ts         # Types Supabase
│   │   └── env.ts
│   └── utils/
│       ├── pdf.ts              # Génération PDF
│       ├── email.ts            # Service email
│       ├── google-calendar.ts  # Google Calendar
│       ├── recherche.ts        # Recherche avancée
│       ├── format.ts
│       └── validation.ts
├── .dev.vars.example
├── migration.sql               # Migration Supabase
├── package.json
├── tsconfig.json
├── wrangler.toml
└── README.md
```

---

## 🔐 Utilisateurs par défaut

Après migration, créer les premiers utilisateurs dans Supabase Auth, puis ajouter leurs profils dans `auth_profiles`.

### Rôles disponibles

- `super_admin` - Administration nationale
- `admin_structure` - Gestion structure sanitaire
- `medecin` - Consultations, prescriptions
- `infirmier` - Soins infirmiers
- `sage_femme` - Suivi grossesse
- `pharmacien` - Délivrance ordonnances
- `laborantin` - Examens laboratoire
- `radiologue` - Examens imagerie
- `caissier` - Facturation
- `agent_accueil` - RDV, enregistrement patients
- `patient` - Dossier personnel

---

## 📄 Génération PDF

### Types de documents

1. **Ordonnances** (`genererOrdonnancePDF`)
   - Médicaments avec posologie
   - Logo hôpital
   - Signature médecin
   - QR code vérification

2. **Certificats médicaux** (`genererCertificatPDF`)
   - Arrêt travail
   - Aptitude
   - Constat

3. **Reçus de paiement** (`genererRecuPDF`)
   - Détail actes
   - Montants
   - Mode paiement

4. **Bulletins d'examen** (`genererBulletinExamenPDF`)
   - Résultats labo/radio
   - Valeurs normales
   - Interprétation

### Upload logo & signature

Pour personnaliser les PDF :

1. **Logo structure** : Admin structure → Paramètres → Upload logo (max 2MB)
2. **Signature médecin** : Médecin → Paramètres → Upload signature (max 1MB)

Les fichiers sont stockés sur Cloudflare R2 via Supabase Storage.

---

## 📧 Notifications email

### Configuration patient

Chaque utilisateur peut activer/désactiver les notifications dans `/parametres` :

- ✅ Rappels RDV (1 jour avant)
- ✅ Résultats examens disponibles
- ✅ Nouvelles ordonnances et certificats

### Templates disponibles

1. **Bienvenue** - Nouveau compte
2. **Reset password** - Lien réinitialisation
3. **RDV rappel** - 24h avant le RDV
4. **Résultats examen** - Bulletin disponible + PDF
5. **Ordonnance** - Nouvelle ordonnance + PDF

---

## 📅 Google Calendar

### Activation

1. Patient va dans `/parametres`
2. Clic "Connecter Google Calendar"
3. Autoriser accès (OAuth2 sécurisé)
4. RDV automatiquement synchronisés

### Fonctionnalités

- ✅ Ajout automatique nouveaux RDV
- ✅ Mise à jour si RDV modifié
- ✅ Suppression si RDV annulé
- ✅ Rappels Google (1 jour + 1 heure avant)
- ✅ 100% gratuit

---

## 🔍 Recherche avancée

Utiliser la fonction `rechercheGlobale()` ou `rechercheAvancee()` dans `src/utils/recherche.ts`.

### Exemple intégration

```typescript
import { rechercheGlobale } from '../utils/recherche'

const resultats = await rechercheGlobale(supabase, 'Jean Dupont', {
  types: ['patient', 'consultation', 'ordonnance'],
  structureId: profil.structure_id,
  limit: 20
})
```

---

## 🧪 Tests

### Tests unitaires (à implémenter)

```bash
npm install --save-dev vitest
npm run test
```

### Tests e2e (à implémenter)

```bash
npm install --save-dev @playwright/test
npx playwright test
```

---

## 📈 Performance

### Optimisations appliquées

- ✅ Index Supabase sur colonnes fréquentes
- ✅ Requêtes avec `select()` spécifiques (pas de `*`)
- ✅ Pagination serveur
- ✅ Filtres par `structure_id` (multi-tenant)
- ✅ Cache Cloudflare CDN pour assets statiques
- ✅ Bundle size optimisé

### Métriques attendues

- Temps de réponse API : < 200ms
- Génération PDF : < 2s
- Upload fichier : < 3s

---

## 🔒 Sécurité

### Mesures appliquées

- ✅ Authentification Supabase (JWT)
- ✅ Cookies httpOnly pour tokens
- ✅ Middleware `requireAuth` + `requireRole`
- ✅ RLS (Row Level Security) Supabase
- ✅ Validation inputs serveur
- ✅ Hashing mots de passe (Supabase Auth)
- ✅ HTTPS obligatoire (Cloudflare)
- ✅ CORS configuré

### Recommandations production

1. Activer RLS sur toutes les tables
2. Configurer firewall Cloudflare
3. Rotation secrets régulière
4. Monitoring logs Supabase
5. Backup automatique DB

---

## 🐛 Dépannage

### Erreur "Module pdfmake not found"

```bash
npm install pdfmake
```

### Erreur Google Calendar OAuth

Vérifier :
- Client ID et Secret corrects
- URI de redirection exacte
- API Calendar activée dans Google Cloud Console

### PDF vide ou corrompu

Vérifier :
- Logo structure au bon format (PNG/JPG)
- Signature médecin valide
- Données complètes (pas de `null`)

### Email non envoyé

Vérifier :
- API key Resend valide
- Email destinataire valide
- Domaine vérifié dans Resend (ou utiliser sandbox)

---

## 📞 Support

- **Documentation**: Ce README
- **Issues**: GitHub Issues
- **Email**: support@santebf.bf (à configurer)

---

## 📜 Licence

Propriété du Ministère de la Santé du Burkina Faso.

---

## 🙏 Remerciements

Développé avec ❤️ pour le système de santé du Burkina Faso.

**Technologies utilisées** :
- [Hono](https://hono.dev) - Framework web
- [Cloudflare Pages](https://pages.cloudflare.com) - Hébergement edge
- [Supabase](https://supabase.com) - Base de données PostgreSQL
- [pdfmake](http://pdfmake.org) - Génération PDF
- [Resend](https://resend.com) - Service email
- [Google Calendar API](https://developers.google.com/calendar) - Synchronisation RDV
