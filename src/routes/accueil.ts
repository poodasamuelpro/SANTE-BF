// Route : /dashboard/accueil/*
// Rôle  : agent_accueil
// TODO  : Créer patient, recherche, RDV, carte QR
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { Env } from '../../functions/_middleware'

export const accueilRoutes = new Hono<{ Bindings: Env }>()
accueilRoutes.use('/*', requireAuth, requireRole('agent_accueil'))

accueilRoutes.get('/', (c) => c.text('TODO: Dashboard Agent Accueil'))
accueilRoutes.get('/nouveau-patient', (c) => c.text('TODO: Formulaire nouveau patient'))
accueilRoutes.post('/nouveau-patient', (c) => c.text('TODO: Créer dossier patient'))
accueilRoutes.get('/recherche', (c) => c.text('TODO: Recherche patient'))
accueilRoutes.get('/patient/:id', (c) => c.text('TODO: Fiche résumé patient'))
accueilRoutes.get('/patient/:id/qr', (c) => c.text('TODO: Imprimer carte QR patient'))
accueilRoutes.get('/rdv', (c) => c.text('TODO: Planning rendez-vous du jour'))
accueilRoutes.post('/rdv/nouveau', (c) => c.text('TODO: Créer rendez-vous'))
accueilRoutes.post('/rdv/:id/annuler', (c) => c.text('TODO: Annuler rendez-vous'))
