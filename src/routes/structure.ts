// Route : /dashboard/structure/*
// Rôle  : admin_structure
// TODO  : Gestion personnel, lits, services, stats de la structure
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { Env } from '../../functions/_middleware'

export const structureRoutes = new Hono<{ Bindings: Env }>()
structureRoutes.use('/*', requireAuth, requireRole('admin_structure'))

structureRoutes.get('/', (c) => c.text('TODO: Dashboard Admin Structure'))
structureRoutes.get('/personnel', (c) => c.text('TODO: Liste du personnel'))
structureRoutes.get('/personnel/nouveau', (c) => c.text('TODO: Ajouter un agent'))
structureRoutes.post('/personnel/nouveau', (c) => c.text('TODO: Sauvegarder agent'))
structureRoutes.get('/services', (c) => c.text('TODO: Liste des services'))
structureRoutes.get('/lits', (c) => c.text('TODO: État des lits en temps réel'))
structureRoutes.get('/stats', (c) => c.text('TODO: Statistiques de la structure'))
structureRoutes.get('/facturation', (c) => c.text('TODO: Aperçu facturation'))
