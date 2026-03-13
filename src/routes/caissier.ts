// Route : /dashboard/caissier/*
// Rôle  : caissier
// TODO  : Factures, paiements, reçus, rapport de caisse
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { Env } from '../../functions/_middleware'

export const caissierRoutes = new Hono<{ Bindings: Env }>()
caissierRoutes.use('/*', requireAuth, requireRole('caissier'))

caissierRoutes.get('/', (c) => c.text('TODO: Dashboard Caissier'))
caissierRoutes.get('/facture/nouvelle', (c) => c.text('TODO: Créer une facture'))
caissierRoutes.post('/facture/nouvelle', (c) => c.text('TODO: Sauvegarder facture'))
caissierRoutes.get('/factures', (c) => c.text('TODO: Factures du jour'))
caissierRoutes.get('/factures/:id', (c) => c.text('TODO: Détail facture'))
caissierRoutes.post('/factures/:id/payer', (c) => c.text('TODO: Encaisser paiement'))
caissierRoutes.get('/factures/:id/recu', (c) => c.text('TODO: Imprimer reçu'))
caissierRoutes.get('/rapport', (c) => c.text('TODO: Rapport de caisse journalier'))
