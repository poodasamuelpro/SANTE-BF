# 🏥 SantéBF — Système National de Santé Numérique

## Structure du projet

```
santebf/
├── functions/
│   └── _middleware.ts      ← Point d'entrée Hono (Cloudflare Pages)
├── src/
│   ├── lib/
│   │   └── supabase.ts     ← Client Supabase + types + helpers
│   ├── middleware/
│   │   └── auth.ts         ← Protection des routes (requireAuth, requireRole)
│   ├── pages/
│   │   ├── login.ts        ← Page de connexion HTML
│   │   └── changer-mdp.ts  ← Page changement mot de passe
│   └── routes/
│       ├── auth.ts         ← Routes /auth/* (login, logout, changer-mdp)
│       └── dashboard.ts    ← Routes /dashboard/* (protégées par rôle)
├── package.json
├── tsconfig.json
└── wrangler.toml
```

## Installation

```bash
npm install
```

## Variables d'environnement

Dans Supabase → Settings → API, copie :
- Project URL → `SUPABASE_URL`
- anon public key → `SUPABASE_ANON_KEY`

Pour le développement local, crée un fichier `.dev.vars` :
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
```

Pour la production (Cloudflare Pages) :
```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
```

## Lancer en local

```bash
npm run dev
# → http://localhost:8788
```

## Déployer

```bash
npm run deploy
```

## Flux de connexion

1. `/` → redirige vers `/auth/login`
2. `/auth/login` → formulaire email + mot de passe
3. Supabase vérifie les identifiants
4. Récupère le rôle depuis `auth_profiles`
5. Si `doit_changer_mdp = true` → `/auth/changer-mdp`
6. Sinon → `/dashboard/{role}`

## Rôles et dashboards

| Rôle | Dashboard |
|---|---|
| super_admin | /dashboard/admin |
| admin_structure | /dashboard/structure |
| medecin | /dashboard/medecin |
| infirmier | /dashboard/medecin |
| sage_femme | /dashboard/medecin |
| pharmacien | /dashboard/pharmacien |
| caissier | /dashboard/caissier |
| agent_accueil | /dashboard/accueil |
| patient | /dashboard/patient |
