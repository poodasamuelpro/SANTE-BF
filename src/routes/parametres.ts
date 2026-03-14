/**
 * Routes pour les paramètres utilisateur
 * - Notifications email
 * - Intégration Google Calendar (gratuit via API)
 * - Préférences personnelles
 */

import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import { pageSkeleton } from './dashboard'
import { alertHTML } from '../components/alert'

export const parametresRoutes = new Hono()

// Middleware auth
parametresRoutes.use('*', requireAuth)

/**
 * GET /parametres
 * Page des paramètres utilisateur
 */
parametresRoutes.get('/', async (c) => {
  const profil = c.get('profil')
  const supabase = c.get('supabase')
  
  try {
    // Récupérer les paramètres actuels
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', profil.id)
      .single()
    
    // Si pas de settings, créer avec valeurs par défaut
    let userSettings = settings
    if (error || !settings) {
      const defaultSettings = {
        user_id: profil.id,
        email_notifications: true,
        email_rdv_rappel: true,
        email_resultats: true,
        email_ordonnances: true,
        google_calendar_enabled: false,
        google_calendar_refresh_token: null
      }
      
      const { data: newSettings } = await supabase
        .from('user_settings')
        .insert(defaultSettings)
        .select()
        .single()
      
      userSettings = newSettings || defaultSettings
    }
    
    const html = pageSkeleton(
      profil,
      'Paramètres',
      `
        <div class="max-w-4xl mx-auto">
          <h1 class="text-3xl font-bold mb-8">Paramètres</h1>
          
          <!-- Notifications Email -->
          <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
              <span>📧</span> Notifications par email
            </h2>
            <form method="POST" action="/parametres/email">
              <div class="space-y-4">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" 
                         name="email_notifications" 
                         ${userSettings.email_notifications ? 'checked' : ''}
                         class="w-5 h-5 text-blue-600 rounded">
                  <div>
                    <div class="font-semibold">Activer les notifications email</div>
                    <div class="text-sm text-gray-600">Recevoir des emails pour les événements importants</div>
                  </div>
                </label>
                
                <div class="ml-8 space-y-3 ${userSettings.email_notifications ? '' : 'opacity-50'}">
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" 
                           name="email_rdv_rappel" 
                           ${userSettings.email_rdv_rappel ? 'checked' : ''}
                           ${userSettings.email_notifications ? '' : 'disabled'}
                           class="w-4 h-4 text-blue-600 rounded">
                    <span class="text-sm">Rappels de rendez-vous (1 jour avant)</span>
                  </label>
                  
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" 
                           name="email_resultats" 
                           ${userSettings.email_resultats ? 'checked' : ''}
                           ${userSettings.email_notifications ? '' : 'disabled'}
                           class="w-4 h-4 text-blue-600 rounded">
                    <span class="text-sm">Résultats d'examens disponibles</span>
                  </label>
                  
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" 
                           name="email_ordonnances" 
                           ${userSettings.email_ordonnances ? 'checked' : ''}
                           ${userSettings.email_notifications ? '' : 'disabled'}
                           class="w-4 h-4 text-blue-600 rounded">
                    <span class="text-sm">Nouvelles ordonnances et certificats</span>
                  </label>
                </div>
              </div>
              
              <button type="submit" 
                      class="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                Enregistrer
              </button>
            </form>
          </div>
          
          <!-- Google Calendar -->
          <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
              <span>📅</span> Google Calendar
            </h2>
            
            ${userSettings.google_calendar_enabled ? `
              <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div class="flex items-center gap-2 text-green-800 font-semibold mb-2">
                  <span>✓</span> Connecté à Google Calendar
                </div>
                <p class="text-sm text-green-700">
                  Vos rendez-vous médicaux sont automatiquement ajoutés à votre calendrier Google 
                  avec des rappels 1 jour et 1 heure avant.
                </p>
              </div>
              
              <form method="POST" action="/parametres/google-calendar/disconnect">
                <button type="submit" 
                        class="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700">
                  Déconnecter Google Calendar
                </button>
              </form>
            ` : `
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div class="font-semibold text-blue-900 mb-2">
                  Synchronisez vos rendez-vous avec Google Calendar (Gratuit)
                </div>
                <ul class="text-sm text-blue-800 space-y-2 mb-4">
                  <li class="flex items-start gap-2">
                    <span>✓</span>
                    <span>Ajout automatique des nouveaux RDV</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span>✓</span>
                    <span>Rappels Google (1 jour + 1 heure avant)</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span>✓</span>
                    <span>Mise à jour si RDV modifié/annulé</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span>✓</span>
                    <span>100% gratuit avec votre compte Google</span>
                  </li>
                </ul>
              </div>
              
              <form method="POST" action="/parametres/google-calendar/connect">
                <button type="submit" 
                        class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                  Connecter Google Calendar
                </button>
              </form>
            `}
            
            <div class="mt-4 text-xs text-gray-500">
              <p>
                <strong>Note:</strong> Nous utilisons l'API Google Calendar gratuite. 
                Aucun frais, connexion OAuth2 sécurisée. 
                Vous pouvez révoquer l'accès à tout moment.
              </p>
            </div>
          </div>
          
          <!-- Informations personnelles -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
              <span>👤</span> Informations personnelles
            </h2>
            
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Nom complet:</span>
                <span class="font-semibold">${profil.prenom} ${profil.nom}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Rôle:</span>
                <span class="font-semibold">${profil.role}</span>
              </div>
              ${profil.structure_id ? `
                <div class="flex justify-between">
                  <span class="text-gray-600">Structure:</span>
                  <span class="font-semibold">Structure #${profil.structure_id}</span>
                </div>
              ` : ''}
            </div>
            
            <div class="mt-6">
              <a href="/auth/changer-mdp" 
                 class="text-blue-600 hover:underline text-sm">
                Changer mon mot de passe →
              </a>
            </div>
          </div>
        </div>
      `
    )
    
    return c.html(html)
    
  } catch (error) {
    console.error('Erreur chargement paramètres:', error)
    return c.html(pageSkeleton(
      profil,
      'Erreur',
      alertHTML('error', 'Erreur lors du chargement des paramètres')
    ))
  }
})

/**
 * POST /parametres/email
 * Mise à jour préférences email
 */
parametresRoutes.post('/email', async (c) => {
  const profil = c.get('profil')
  const supabase = c.get('supabase')
  
  try {
    const formData = await c.req.formData()
    
    const settings = {
      email_notifications: formData.get('email_notifications') === 'on',
      email_rdv_rappel: formData.get('email_rdv_rappel') === 'on',
      email_resultats: formData.get('email_resultats') === 'on',
      email_ordonnances: formData.get('email_ordonnances') === 'on'
    }
    
    // Mettre à jour ou insérer
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: profil.id,
        ...settings,
        updated_at: new Date().toISOString()
      })
    
    if (error) throw error
    
    return c.redirect('/parametres?success=email')
    
  } catch (error) {
    console.error('Erreur mise à jour email:', error)
    return c.redirect('/parametres?error=email')
  }
})

/**
 * POST /parametres/google-calendar/connect
 * Initier connexion Google Calendar (OAuth2)
 */
parametresRoutes.post('/google-calendar/connect', async (c) => {
  const profil = c.get('profil')
  
  // URL de redirection OAuth2 Google
  const redirectUri = `${c.req.url.split('/parametres')[0]}/parametres/google-calendar/callback`
  const scopes = 'https://www.googleapis.com/auth/calendar.events'
  
  // Récupérer client_id depuis env (configuré dans .dev.vars)
  const clientId = c.env?.GOOGLE_CLIENT_ID
  
  if (!clientId) {
    return c.redirect('/parametres?error=google_not_configured')
  }
  
  // Construire URL OAuth2
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('state', profil.id) // Pour retrouver l'utilisateur
  
  return c.redirect(authUrl.toString())
})

/**
 * GET /parametres/google-calendar/callback
 * Callback OAuth2 Google
 */
parametresRoutes.get('/google-calendar/callback', async (c) => {
  const supabase = c.get('supabase')
  
  try {
    const code = c.req.query('code')
    const state = c.req.query('state') // user_id
    const error = c.req.query('error')
    
    if (error) {
      return c.redirect('/parametres?error=google_denied')
    }
    
    if (!code || !state) {
      return c.redirect('/parametres?error=google_invalid')
    }
    
    // Échanger code contre refresh_token
    const clientId = c.env?.GOOGLE_CLIENT_ID
    const clientSecret = c.env?.GOOGLE_CLIENT_SECRET
    const redirectUri = `${c.req.url.split('/parametres')[0]}/parametres/google-calendar/callback`
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })
    
    const tokens = await tokenResponse.json()
    
    if (!tokens.refresh_token) {
      return c.redirect('/parametres?error=google_no_token')
    }
    
    // Enregistrer refresh_token dans DB
    const { error: updateError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: state,
        google_calendar_enabled: true,
        google_calendar_refresh_token: tokens.refresh_token,
        updated_at: new Date().toISOString()
      })
    
    if (updateError) throw updateError
    
    return c.redirect('/parametres?success=google_connected')
    
  } catch (error) {
    console.error('Erreur callback Google:', error)
    return c.redirect('/parametres?error=google_error')
  }
})

/**
 * POST /parametres/google-calendar/disconnect
 * Déconnecter Google Calendar
 */
parametresRoutes.post('/google-calendar/disconnect', async (c) => {
  const profil = c.get('profil')
  const supabase = c.get('supabase')
  
  try {
    // Désactiver et supprimer le refresh_token
    const { error } = await supabase
      .from('user_settings')
      .update({
        google_calendar_enabled: false,
        google_calendar_refresh_token: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', profil.id)
    
    if (error) throw error
    
    return c.redirect('/parametres?success=google_disconnected')
    
  } catch (error) {
    console.error('Erreur déconnexion Google:', error)
    return c.redirect('/parametres?error=google_disconnect_error')
  }
})
