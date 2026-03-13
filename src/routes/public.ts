// Routes publiques — accessibles SANS connexion
// Utilisées pour : QR code patient (urgence), vérification ordonnance pharmacien
import { Hono } from 'hono'
import type { Env } from '../../functions/_middleware'

export const publicRoutes = new Hono<{ Bindings: Env }>()

// QR code bracelet patient — affiche infos urgence sans login
publicRoutes.get('/urgence/:qr_token', (c) => c.text('TODO: Page urgence QR code patient'))

// Vérification ordonnance par pharmacien externe
publicRoutes.get('/ordonnance/:qr_code', (c) => c.text('TODO: Vérifier ordonnance QR'))

// Reset mot de passe
publicRoutes.get('/reset-password', (c) => c.text('TODO: Page reset mot de passe'))
publicRoutes.post('/reset-password', (c) => c.text('TODO: Envoyer email reset'))
publicRoutes.get('/reset-password/confirm', (c) => c.text('TODO: Formulaire nouveau mdp'))
publicRoutes.post('/reset-password/confirm', (c) => c.text('TODO: Sauvegarder nouveau mdp'))
