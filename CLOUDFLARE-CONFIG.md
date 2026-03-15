# Configuration Cloudflare Pages pour SantéBF

## ⚠️ CRITIQUE : Variables d'environnement requises

Le site **NE FONCTIONNERA PAS** sans ces variables d'environnement configurées dans Cloudflare Pages.

### 1. Accéder aux paramètres Cloudflare Pages

1. Aller sur https://dash.cloudflare.com/
2. Sélectionner **Pages** dans le menu
3. Cliquer sur le projet **sante-bf**
4. Aller dans **Settings** > **Environment variables**

### 2. Ajouter les variables requises

Ajouter ces 3 variables pour **Production** ET **Preview** :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `SUPABASE_URL` | URL de votre projet Supabase | `https://abcdefgh.supabase.co` |
| `SUPABASE_ANON_KEY` | Clé publique anonyme Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI...` |
| `RESEND_API_KEY` | Clé API Resend pour emails | `re_123abc...` |

### 3. Obtenir les valeurs Supabase

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Aller dans **Settings** > **API**
4. Copier :
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

### 4. Obtenir la clé Resend (optionnel pour emails)

1. Aller sur https://resend.com/api-keys
2. Créer une nouvelle clé API
3. Copier la clé → `RESEND_API_KEY`

### 5. Redéployer après configuration

Une fois les variables ajoutées dans Cloudflare Pages :

1. **Option A - Via Dashboard** : Cliquer sur **Deployments** > **Retry deployment**
2. **Option B - Via Git** : Faire un nouveau commit et push

```bash
git commit --allow-empty -m "trigger redeploy"
git push origin main
```

### 6. Vérifier que ça fonctionne

Après redéploiement, tester :

1. Aller sur https://sante-bf.pages.dev/auth/login
2. Essayer de se connecter
3. Si erreur "Configuration du serveur incomplète" → Variables manquantes
4. Si erreur "Email ou mot de passe incorrect" → Configuration OK, vérifier identifiants

---

## 🔧 Configuration Supabase requise

Avant de déployer, assurez-vous que votre base Supabase est configurée :

1. **Exécuter migration.sql** (28 tables)
2. **Créer un compte test** dans `auth.users`
3. **Créer le profil** dans `auth_profiles` avec le même UUID

Exemple SQL pour créer un utilisateur admin :

```sql
-- 1. Créer l'utilisateur dans auth.users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  gen_random_uuid(),
  'admin@santebf.bf',
  crypt('Admin1234!', gen_salt('bf')),
  now()
);

-- 2. Créer le profil (remplacer USER_ID par l'UUID ci-dessus)
INSERT INTO auth_profiles (id, nom, prenom, role, est_actif, doit_changer_mdp)
VALUES (
  'USER_ID',
  'Admin',
  'SantéBF',
  'super_admin',
  true,
  false
);
```

---

## 📝 Checklist de déploiement

- [ ] Variables Cloudflare configurées (SUPABASE_URL, SUPABASE_ANON_KEY, RESEND_API_KEY)
- [ ] Base Supabase migrée (migration.sql exécuté)
- [ ] Utilisateur test créé
- [ ] Déploiement redéclenché
- [ ] Login testé et fonctionnel

---

**Documentation complète** : Voir GUIDE-DEPLOIEMENT.md
