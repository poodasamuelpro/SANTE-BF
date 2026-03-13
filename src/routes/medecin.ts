// Route : /dashboard/medecin/*
// Rôle  : medecin, infirmier, sage_femme, laborantin, radiologue
// TODO  : Patients, consultations, ordonnances, examens, RDV
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import type { Env } from '../../functions/_middleware'

export const medecinRoutes = new Hono<{ Bindings: Env }>()
medecinRoutes.use('/*', requireAuth, requireRole('medecin','infirmier','sage_femme','laborantin','radiologue'))

medecinRoutes.get('/', (c) => c.text('TODO: Dashboard Médecin'))
// Patients
medecinRoutes.get('/patients', (c) => c.text('TODO: Mes patients autorisés'))
medecinRoutes.get('/patients/:id', (c) => c.text('TODO: Dossier patient complet'))
medecinRoutes.get('/patients/:id/constantes', (c) => c.text('TODO: Courbes constantes'))
// Consultations
medecinRoutes.get('/consultations', (c) => c.text('TODO: Mes consultations'))
medecinRoutes.get('/consultations/nouvelle', (c) => c.text('TODO: Nouvelle consultation'))
medecinRoutes.post('/consultations/nouvelle', (c) => c.text('TODO: Sauvegarder consultation'))
medecinRoutes.get('/consultations/:id', (c) => c.text('TODO: Détail consultation'))
// Ordonnances
medecinRoutes.get('/ordonnances', (c) => c.text('TODO: Mes ordonnances'))
medecinRoutes.get('/ordonnances/nouvelle', (c) => c.text('TODO: Nouvelle ordonnance'))
medecinRoutes.post('/ordonnances/nouvelle', (c) => c.text('TODO: Sauvegarder ordonnance'))
medecinRoutes.get('/ordonnances/:id/pdf', (c) => c.text('TODO: Générer PDF ordonnance'))
// Examens
medecinRoutes.get('/examens', (c) => c.text('TODO: Examens prescrits'))
medecinRoutes.get('/examens/nouveau', (c) => c.text('TODO: Prescrire un examen'))
medecinRoutes.post('/examens/nouveau', (c) => c.text('TODO: Sauvegarder examen'))
medecinRoutes.post('/examens/:id/resultat', (c) => c.text('TODO: Entrer résultat examen'))
// Rendez-vous
medecinRoutes.get('/rdv', (c) => c.text('TODO: Mon planning RDV'))
medecinRoutes.post('/rdv/nouveau', (c) => c.text('TODO: Créer un RDV'))
medecinRoutes.post('/rdv/:id/statut', (c) => c.text('TODO: Changer statut RDV'))
// Hospitalisations
medecinRoutes.get('/hospitalisations', (c) => c.text('TODO: Mes patients hospitalisés'))
medecinRoutes.post('/hospitalisations/nouvelle', (c) => c.text('TODO: Hospitaliser un patient'))
medecinRoutes.post('/hospitalisations/:id/sortie', (c) => c.text('TODO: Sortie patient'))
// Spécialités
medecinRoutes.get('/vaccinations/:patientId', (c) => c.text('TODO: Carnet vaccinations'))
medecinRoutes.get('/grossesses/:patientId', (c) => c.text('TODO: Suivi grossesse'))
medecinRoutes.get('/chronique/:patientId', (c) => c.text('TODO: Maladies chroniques'))
