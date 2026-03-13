// Route : /dashboard/admin/*
// Rôle  : super_admin
// TODO  : Gestion structures, comptes, stats nationales, carte épidémique
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { Env } from '../../functions/_middleware'

export const adminRoutes = new Hono<{ Bindings: Env }>()
adminRoutes.use('/*', requireAuth, requireRole('super_admin'))

adminRoutes.get('/', (c) => c.text('TODO: Dashboard Super Admin'))
adminRoutes.get('/structures', (c) => c.text('TODO: Liste des structures'))
adminRoutes.get('/structures/nouvelle', (c) => c.text('TODO: Créer une structure'))
adminRoutes.post('/structures/nouvelle', (c) => c.text('TODO: Sauvegarder structure'))
adminRoutes.get('/structures/:id', (c) => c.text('TODO: Détail structure'))
adminRoutes.get('/comptes', (c) => c.text('TODO: Liste des comptes utilisateurs'))
adminRoutes.get('/comptes/nouveau', (c) => c.text('TODO: Créer un compte'))
adminRoutes.post('/comptes/nouveau', (c) => c.text('TODO: Sauvegarder compte'))
adminRoutes.get('/comptes/:id', (c) => c.text('TODO: Détail compte'))
adminRoutes.get('/stats', (c) => c.text('TODO: Statistiques nationales'))
adminRoutes.get('/carte', (c) => c.text('TODO: Carte épidémique'))
adminRoutes.get('/seed-geo', (c) => c.text('TODO: Insérer données géographiques'))
