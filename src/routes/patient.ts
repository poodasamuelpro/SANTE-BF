// Route : /dashboard/patient/*
// Rôle  : patient
// TODO  : Dossier personnel, ordonnances, RDV, consentements
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { Env } from '../../functions/_middleware'

export const patientRoutes = new Hono<{ Bindings: Env }>()
patientRoutes.use('/*', requireAuth, requireRole('patient'))

patientRoutes.get('/', (c) => c.text('TODO: Dashboard Patient'))
patientRoutes.get('/dossier', (c) => c.text('TODO: Mon dossier médical'))
patientRoutes.get('/ordonnances', (c) => c.text('TODO: Mes ordonnances'))
patientRoutes.get('/ordonnances/:id', (c) => c.text('TODO: Détail ordonnance'))
patientRoutes.get('/rdv', (c) => c.text('TODO: Mes rendez-vous'))
patientRoutes.get('/examens', (c) => c.text('TODO: Mes résultats examens'))
patientRoutes.get('/consentements', (c) => c.text('TODO: Gérer mes consentements'))
patientRoutes.post('/consentements/accorder', (c) => c.text('TODO: Accorder consentement'))
patientRoutes.post('/consentements/:id/revoquer', (c) => c.text('TODO: Révoquer consentement'))
patientRoutes.get('/vaccinations', (c) => c.text('TODO: Mon carnet de vaccination'))
