# Diagnostic et résolution erreur 500 — Login SantéBF

**Date**: 2026-03-15  
**Site**: https://sante-bf.pages.dev  
**Erreur**: Internal Server Error 500 sur POST /auth/login  
**Status**: ✅ **RÉSOLU**

---

## 🔍 Diagnostic

### Symptômes observés
```
Console browser:
POST https://sante-bf.pages.dev/auth/login 500 (Internal Server Error)
```

### Cause identifiée

**Variables d'environnement Cloudflare manquantes**

Le code essayait d'accéder à `c.env.SUPABASE_URL` et `c.env.SUPABASE_ANON_KEY` qui étaient `undefined`, causant :

1. Erreur lors de la création du client Supabase
2. Crash non géré dans le handler POST /auth/login
3. Réponse HTTP 500 sans message d'erreur explicite

### Code problématique (avant)

```typescript
// ❌ Pas de validation des variables d'environnement
authRoutes.post('/login', async (c) => {
  const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  // ... suite du code
})
```

---

## ✅ Corrections appliquées

### 1. Validation des variables d'environnement

**Fichier**: `src/routes/auth.ts`

```typescript
// ✅ Validation ajoutée
authRoutes.post('/login', async (c) => {
  try {
    // Vérifier que les variables sont configurées
    if (!c.env.SUPABASE_URL || !c.env.SUPABASE_ANON_KEY) {
      console.error('❌ Variables d\'environnement Cloudflare manquantes')
      return c.html(loginPage('⚠️ Configuration du serveur incomplète. Contactez l\'administrateur.'))
    }
    
    const sb = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
    // ... suite du code
  } catch (err) {
    console.error('❌ Erreur critique login:', err)
    const message = err instanceof Error ? err.message : 'Erreur serveur inconnue'
    return c.html(loginPage(`❌ Erreur serveur: ${message}`))
  }
})
```

### 2. Validation dans getSupabase()

**Fichier**: `src/lib/supabase.ts`

```typescript
// ✅ Validation des paramètres
export function getSupabase(url: string | undefined, anonKey: string | undefined) {
  if (!url || !anonKey) {
    throw new Error('Variables d\'environnement Supabase manquantes. Configurez SUPABASE_URL et SUPABASE_ANON_KEY dans Cloudflare Pages.')
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}
```

### 3. Guide de configuration

**Nouveau fichier**: `CLOUDFLARE-CONFIG.md`

Guide détaillé pour configurer les variables d'environnement dans Cloudflare Pages Dashboard.

---

## 📋 Checklist configuration Cloudflare

Pour que le site fonctionne, **VOUS DEVEZ** configurer ces variables dans Cloudflare Pages :

### Étapes à suivre

1. **Aller sur Cloudflare Dashboard**
   - https://dash.cloudflare.com/
   - Pages > sante-bf > Settings > Environment variables

2. **Ajouter ces 3 variables** (Production ET Preview) :

   | Variable | Où l'obtenir |
   |----------|--------------|
   | `SUPABASE_URL` | https://supabase.com → votre projet → Settings → API → Project URL |
   | `SUPABASE_ANON_KEY` | https://supabase.com → votre projet → Settings → API → anon public key |
   | `RESEND_API_KEY` | https://resend.com/api-keys (optionnel pour emails) |

3. **Redéployer le site**
   - Option A : Cloudflare Dashboard > Deployments > Retry deployment
   - Option B : Faire un commit Git vide : `git commit --allow-empty -m "redeploy" && git push`

4. **Tester le login**
   - Aller sur https://sante-bf.pages.dev/auth/login
   - Si erreur "Configuration incomplète" → Variables manquantes
   - Si erreur "Email/mot de passe incorrect" → Configuration OK !

---

## 🧪 Tests de validation

### Test 1 : GET /auth/login
```bash
curl -I https://sante-bf.pages.dev/auth/login
# Résultat attendu : HTTP/2 200 ✅
```

### Test 2 : POST /auth/login (sans variables)
```bash
curl -X POST https://sante-bf.pages.dev/auth/login \
  -d "email=test@example.com&password=Test123!"
# Résultat attendu : HTML avec message "Configuration du serveur incomplète"
```

### Test 3 : POST /auth/login (avec variables configurées)
```bash
# Après configuration des variables Cloudflare
curl -X POST https://sante-bf.pages.dev/auth/login \
  -d "email=admin@santebf.bf&password=VotreMotDePasse"
# Résultat attendu : Redirect 302 vers /dashboard/admin
```

---

## 📦 Commits déployés

```
922528e fix: gestion erreur 500 login + validation env vars + guide config Cloudflare
c2372d1 docs: rapport corrections v3.1.2 complet
3b1b059 fix: correction exports dashboard, erreurs TypeScript, build check
```

**Dépôt GitHub**: https://github.com/poodasamuelpro/SANTE-BF  
**Branche**: main

---

## 🎯 Prochaines étapes

1. ✅ Code corrigé et poussé sur GitHub
2. ⏳ **VOUS** : Configurer les variables Cloudflare (voir ci-dessus)
3. ⏳ Redéployer le site
4. ⏳ Tester le login avec un compte valide
5. ⏳ Créer un utilisateur admin via Supabase SQL Editor (voir CLOUDFLARE-CONFIG.md)

---

## 💡 Messages d'erreur après correction

Avec la nouvelle gestion d'erreur, vous verrez maintenant :

- ❌ **"Configuration du serveur incomplète"** → Variables Cloudflare manquantes
- ❌ **"Email ou mot de passe incorrect"** → Identifiants invalides (configuration OK)
- ❌ **"Compte non confirmé"** → Email non vérifié dans Supabase
- ❌ **"Compte désactivé"** → `est_actif = false` dans auth_profiles
- ❌ **"Profil introuvable"** → Pas d'entrée dans auth_profiles pour cet utilisateur
- ❌ **"Trop de tentatives"** → Rate limit Supabase dépassé

---

## 📚 Documentation complète

- **Guide config** : `CLOUDFLARE-CONFIG.md`
- **Guide déploiement** : `GUIDE-DEPLOIEMENT.md`
- **Architecture** : `MAPPING-ARCHITECTURE.md`
- **Routes API** : `LISTE-ROUTES-COMPLETE.md`

---

**Développeur** : Samuel POODA (@poodasamuelpro)  
**Projet** : SantéBF  
**Version** : 3.1.3 (ERROR HANDLING FIX)
