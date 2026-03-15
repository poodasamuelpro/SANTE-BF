# 🚀 GUIDE DE DÉPLOIEMENT - SantéBF v3.0

## 📋 TABLE DES MATIÈRES

1. [Prérequis](#prérequis)
2. [Configuration Supabase](#configuration-supabase)
3. [Configuration Cloudflare](#configuration-cloudflare)
4. [Déploiement via GitHub Actions](#déploiement-via-github-actions)
5. [Déploiement via Wrangler CLI](#déploiement-via-wrangler-cli)
6. [Configuration production](#configuration-production)
7. [Vérification déploiement](#vérification-déploiement)
8. [Dépannage](#dépannage)

---

## ✅ PRÉREQUIS

### Comptes requis

- ✅ Compte GitHub (gratuit)
- ✅ Compte Supabase (gratuit)
- ✅ Compte Cloudflare (gratuit)
- ✅ Compte Resend (gratuit pour 3000 emails/mois)
- ⏳ Compte Google Cloud (optionnel, pour Calendar API)

### Outils locaux

```bash
# Vérifier Node.js (version 18+)
node --version

# Installer Wrangler CLI (Cloudflare)
npm install -g wrangler

# Vérifier Git
git --version
```

---

## 🗄️ CONFIGURATION SUPABASE

### 1. Créer le projet

1. Aller sur [supabase.com](https://supabase.com)
2. Cliquer "New Project"
3. Nom: `santebf-production`
4. Région: Choisir la plus proche (ex: Europe - Frankfurt)
5. Mot de passe base de données: **BIEN NOTER**
6. Cliquer "Create new project"

### 2. Récupérer les clés API

1. Aller dans **Settings** → **API**
2. Copier:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON_KEY`
3. **NE JAMAIS partager** la clé `service_role`

### 3. Exécuter la migration

1. Aller dans **SQL Editor**
2. Cliquer "New query"
3. Copier le contenu de `migration.sql`
4. Cliquer "Run"
5. Vérifier: `✅ Migration terminée avec succès!`

### 4. Activer RLS (Row Level Security)

```sql
-- Activer RLS sur toutes les tables patients
ALTER TABLE patient_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_contacts_urgence ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_ordonnances ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_rendez_vous ENABLE ROW LEVEL SECURITY;

-- Politique: Les patients voient uniquement leur dossier
CREATE POLICY "Patients see own records" 
ON patient_dossiers 
FOR SELECT 
USING (profile_id = auth.uid());

-- Politique: Les médecins voient les patients de leur structure
CREATE POLICY "Medecins see structure patients" 
ON patient_dossiers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM auth_profiles 
    WHERE auth_profiles.id = auth.uid() 
    AND auth_profiles.structure_id = patient_dossiers.structure_id
  )
);
```

### 5. Configurer Storage

1. Aller dans **Storage**
2. Créer les buckets:

```bash
# Bucket: structures (public)
- Nom: structures
- Public: ✅ Oui
- File size limit: 2 MB
- Allowed MIME types: image/png, image/jpeg, image/webp

# Bucket: signatures (public)
- Nom: signatures
- Public: ✅ Oui
- File size limit: 1 MB
- Allowed MIME types: image/png

# Bucket: documents (public)
- Nom: documents
- Public: ✅ Oui
- File size limit: 10 MB
- Allowed MIME types: application/pdf

# Bucket: imagerie (private)
- Nom: imagerie
- Public: ❌ Non
- File size limit: 50 MB
- Allowed MIME types: image/*, application/dicom
```

### 6. Créer compte super admin

```sql
-- Insérer dans SQL Editor
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@santebf.bf',
  crypt('VotreMotDePasseSecurise123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- Récupérer l'ID créé
SELECT id, email FROM auth.users WHERE email = 'admin@santebf.bf';

-- Créer le profil (remplacer {user_id})
INSERT INTO auth_profiles (
  id,
  email,
  nom,
  prenom,
  role,
  structure_id,
  est_actif,
  doit_changer_mdp
) VALUES (
  '{user_id}',
  'admin@santebf.bf',
  'ADMIN',
  'Super',
  'super_admin',
  NULL,
  true,
  true  -- Forcera changement mot de passe à première connexion
);
```

---

## ☁️ CONFIGURATION CLOUDFLARE

### 1. Créer compte Cloudflare

1. Aller sur [cloudflare.com](https://www.cloudflare.com)
2. S'inscrire (gratuit)
3. Vérifier l'email

### 2. Obtenir API Token

1. Aller dans **Profile** → **API Tokens**
2. Cliquer "Create Token"
3. Template: **Edit Cloudflare Workers**
4. Permissions:
   - Account → Cloudflare Pages → Edit
   - Zone → Zone → Read
5. Account Resources: Include → Votre compte
6. Cliquer "Continue to summary"
7. Cliquer "Create Token"
8. **COPIER LE TOKEN** (affiché une seule fois)

### 3. Obtenir Account ID

1. Aller dans **Workers & Pages**
2. Account ID visible en haut à droite
3. Cliquer sur l'icône pour copier

---

## 🤖 DÉPLOIEMENT VIA GITHUB ACTIONS

### 1. Forker le repository

1. Aller sur [github.com/poodasamuelpro/SANTEBF](https://github.com/poodasamuelpro/SANTEBF)
2. Cliquer "Fork"
3. Créer le fork dans votre compte

### 2. Configurer les secrets GitHub

1. Aller dans votre fork → **Settings** → **Secrets and variables** → **Actions**
2. Cliquer "New repository secret"
3. Ajouter:

```
CLOUDFLARE_API_TOKEN={votre_token_cloudflare}
CLOUDFLARE_ACCOUNT_ID={votre_account_id}
```

### 3. Activer GitHub Actions

1. Aller dans **Actions**
2. Cliquer "I understand my workflows, go ahead and enable them"

### 4. Déclencher le déploiement

```bash
# Option A: Push sur main
git add .
git commit -m "Deploy to production"
git push origin main
# → GitHub Actions déploie automatiquement

# Option B: Déclenchement manuel
# Aller dans Actions → Deploy to Cloudflare Pages → Run workflow
```

### 5. Suivre le déploiement

1. Aller dans **Actions**
2. Cliquer sur le workflow en cours
3. Suivre les logs en temps réel
4. Attendre: ✅ Deploy to Cloudflare Pages

### 6. Récupérer l'URL

1. Dans les logs, chercher:
```
✅ Deployment complete!
🌍 https://santebf.pages.dev
```
2. Votre application est en ligne!

---

## 🖥️ DÉPLOIEMENT VIA WRANGLER CLI

### 1. Authentification Wrangler

```bash
# Se connecter à Cloudflare
wrangler login
# → Ouvre navigateur pour autoriser

# Vérifier
wrangler whoami
```

### 2. Configurer wrangler.toml

Vérifier que `wrangler.toml` contient:

```toml
name = "santebf"
compatibility_date = "2024-01-15"
compatibility_flags = [ "nodejs_compat" ]
pages_build_output_dir = "./public"

[env.production]
name = "santebf"
```

### 3. Build le projet

```bash
# Installer dépendances
npm install

# Compiler TypeScript
npm run build

# Vérifier que public/ est créé
ls -la public/
```

### 4. Créer le projet Pages

```bash
wrangler pages project create santebf \
  --production-branch main \
  --compatibility-date 2024-01-15
```

### 5. Configurer les secrets

```bash
# Supabase
wrangler secret put SUPABASE_URL --env production
# → Coller: https://votre-projet.supabase.co

wrangler secret put SUPABASE_ANON_KEY --env production
# → Coller: eyJhbGc...

# Resend (email)
wrangler secret put RESEND_API_KEY --env production
# → Coller: re_...

# Google Calendar (optionnel)
wrangler secret put GOOGLE_CLIENT_ID --env production
wrangler secret put GOOGLE_CLIENT_SECRET --env production
```

### 6. Déployer

```bash
# Déploiement
wrangler pages deploy public --project-name=santebf

# Sortie attendue:
# ✨ Success! Uploaded 45 files (3.21 sec)
# ✅ Deployment complete!
# 🌍 https://santebf.pages.dev
# 🌍 https://abc123.santebf.pages.dev
```

### 7. Vérifier les secrets

```bash
# Lister secrets configurés
wrangler pages secret list --project-name=santebf

# Sortie attendue:
# SUPABASE_URL
# SUPABASE_ANON_KEY
# RESEND_API_KEY
```

---

## ⚙️ CONFIGURATION PRODUCTION

### 1. Configurer domaine personnalisé (optionnel)

```bash
# Ajouter domaine
wrangler pages domain add santebf.bf --project-name=santebf

# Configurer DNS
# Aller dans Cloudflare Dashboard → DNS
# Ajouter CNAME:
# Nom: @ (ou www)
# Cible: santebf.pages.dev
# Proxy: Activé (nuage orange)
```

### 2. Configurer SSL/TLS

1. Cloudflare Dashboard → SSL/TLS
2. Mode: **Full (strict)**
3. Edge Certificates → Always Use HTTPS: ✅ On
4. Minimum TLS Version: **TLS 1.2**

### 3. Configurer rate limiting

```bash
# Dans Cloudflare Dashboard → Security → WAF

# Règle 1: Limiter login attempts
# Nom: Rate Limit Login
# Expression: (http.request.uri.path eq "/auth/login")
# Action: Block
# Durée: 15 minutes
# Requêtes: 10 requests per minute
```

### 4. Configurer cache

```bash
# Dans Cloudflare Dashboard → Caching → Configuration

# Cache Level: Standard
# Browser Cache TTL: 4 hours
# Always Online: On
```

### 5. Activer Analytics

1. Cloudflare Dashboard → Analytics
2. Activer Web Analytics
3. Configurer notifications email

---

## ✅ VÉRIFICATION DÉPLOIEMENT

### Tests manuels

```bash
# 1. Test page d'accueil
curl https://santebf.pages.dev/
# → Redirect 302 vers /auth/login

# 2. Test page login
curl https://santebf.pages.dev/auth/login
# → HTML page login

# 3. Test route publique urgence (avec token valide)
curl https://santebf.pages.dev/public/urgence/{token}
# → HTML page urgence patient

# 4. Test API (nécessite authentification)
curl https://santebf.pages.dev/api/patients
# → Redirect 302 vers /auth/login
```

### Checklist fonctionnelle

- [ ] ✅ Page login accessible
- [ ] ✅ Login avec compte super admin fonctionne
- [ ] ✅ Redirect vers dashboard après login
- [ ] ✅ Navigation entre modules
- [ ] ✅ Création patient
- [ ] ✅ Prise rendez-vous
- [ ] ✅ Nouvelle consultation
- [ ] ✅ Prescription ordonnance
- [ ] ✅ QR code urgence accessible sans login
- [ ] ✅ Download PDF ordonnance
- [ ] ✅ Export CSV patients
- [ ] ✅ Email notifications (si configuré)

### Monitoring

```bash
# Logs en temps réel
wrangler pages deployment tail --project-name=santebf

# Voir liste déploiements
wrangler pages deployment list --project-name=santebf
```

---

## 🔧 DÉPANNAGE

### Erreur: "Invalid API Token"

**Cause**: Token Cloudflare invalide ou expiré

**Solution**:
```bash
# Générer nouveau token
# Cloudflare Dashboard → API Tokens → Create Token

# Mettre à jour GitHub secret
# GitHub repo → Settings → Secrets → Edit CLOUDFLARE_API_TOKEN
```

### Erreur: "Supabase connection failed"

**Cause**: Variables d'environnement incorrectes

**Solution**:
```bash
# Vérifier secrets configurés
wrangler secret list --project-name=santebf

# Re-configurer si manquant
wrangler secret put SUPABASE_URL --env production
wrangler secret put SUPABASE_ANON_KEY --env production
```

### Erreur: "Table does not exist"

**Cause**: Migration SQL pas appliquée

**Solution**:
1. Aller dans Supabase → SQL Editor
2. Exécuter `migration.sql`
3. Vérifier: `SELECT * FROM patient_dossiers LIMIT 1;`

### Page blanche après déploiement

**Cause**: Build TypeScript échoué

**Solution**:
```bash
# Vérifier erreurs TypeScript
npm run build

# Si erreurs, corriger et re-build
npm run build

# Re-déployer
wrangler pages deploy public --project-name=santebf
```

### CORS errors

**Cause**: Configuration CORS manquante

**Solution**: Vérifier dans `src/middleware/auth.ts`:
```typescript
import { cors } from 'hono/cors'

app.use('/*', cors({
  origin: ['https://santebf.pages.dev', 'https://santebf.bf'],
  credentials: true
}))
```

### Rate limit exceeded

**Cause**: Trop de requêtes simultanées

**Solution**: Attendre 1 minute ou utiliser compte payant Cloudflare

---

## 📊 PERFORMANCE

### Métriques attendues

- **First Contentful Paint**: < 1s
- **Time to Interactive**: < 2s
- **Lighthouse Score**: 90+
- **Edge Response Time**: < 50ms

### Optimisations

```bash
# Activer compression Brotli
# Cloudflare Dashboard → Speed → Optimization
# Brotli: On

# Activer HTTP/3
# Cloudflare Dashboard → Network
# HTTP/3: On

# Activer Early Hints
# Cloudflare Dashboard → Speed → Optimization
# Early Hints: On
```

---

## 🔒 SÉCURITÉ PRODUCTION

### Checklist sécurité

- [ ] ✅ RLS Supabase activé
- [ ] ✅ HTTPS obligatoire
- [ ] ✅ Secrets dans Cloudflare (pas dans code)
- [ ] ✅ Rate limiting configuré
- [ ] ✅ WAF activé
- [ ] ✅ DDoS protection activée
- [ ] ✅ Backup base de données planifié
- [ ] ✅ Monitoring erreurs configuré
- [ ] ✅ Logs d'accès activés
- [ ] ✅ 2FA sur comptes admin

### Backup base de données

```bash
# Supabase → Settings → Database → Backups
# Activer: Daily backups (7 jours retention)
```

---

## 📞 SUPPORT

En cas de problème:

1. Vérifier [Issues GitHub](https://github.com/poodasamuelpro/SANTEBF/issues)
2. Consulter documentation Cloudflare: [developers.cloudflare.com/pages](https://developers.cloudflare.com/pages)
3. Support Supabase: [supabase.com/docs](https://supabase.com/docs)
4. Créer issue GitHub avec logs

---

## ✅ CONCLUSION

Votre application SantéBF est maintenant déployée en production sur Cloudflare Pages! 🎉

**URLs importantes**:
- Production: `https://santebf.pages.dev`
- Supabase Dashboard: `https://supabase.com/dashboard/project/{votre-projet}`
- Cloudflare Dashboard: `https://dash.cloudflare.com`
- GitHub Repo: `https://github.com/{votre-user}/SANTEBF`

**Prochaines étapes**:
1. Former les utilisateurs
2. Importer données existantes
3. Configurer monitoring
4. Planifier maintenance
5. Documenter procédures

---

**📅 Date**: 2026-03-15  
**🔖 Version**: 3.0.0  
**👤 Auteur**: SantéBF Team  
**✅ Statut**: Production-Ready
