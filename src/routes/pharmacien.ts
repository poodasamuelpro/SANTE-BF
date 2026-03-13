// Route : /dashboard/pharmacien/*
// Rôle  : pharmacien
// TODO  : Scanner ordonnance QR, délivrer médicaments, stock
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { Env } from '../../functions/_middleware'

export const pharmacienRoutes = new Hono<{ Bindings: Env }>()
pharmacienRoutes.use('/*', requireAuth, requireRole('pharmacien'))

pharmacienRoutes.get('/', (c) => c.text('TODO: Dashboard Pharmacien'))
pharmacienRoutes.get('/scanner', (c) => c.text('TODO: Scanner QR ordonnance'))
pharmacienRoutes.get('/ordonnances', (c) => c.text('TODO: Ordonnances actives de ma structure'))
pharmacienRoutes.get('/ordonnances/:qr', (c) => c.text('TODO: Vérifier ordonnance par QR code'))
pharmacienRoutes.post('/ordonnances/:id/delivrer', (c) => c.text('TODO: Délivrer médicaments'))
pharmacienRoutes.post('/ordonnances/:id/ligne/:ligneId', (c) => c.text('TODO: Délivrer une ligne'))
pharmacienRoutes.get('/stock', (c) => c.text('TODO: Gestion stock médicaments'))
