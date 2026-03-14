/**
 * Service Google Calendar
 * Synchronisation automatique des rendez-vous médicaux
 * API Google Calendar v3 (Gratuit)
 */

/**
 * Interface événement Google Calendar
 */
interface GoogleCalendarEvent {
  summary: string
  description?: string
  location?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  reminders: {
    useDefault: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
}

/**
 * Obtenir access_token depuis refresh_token
 */
async function getAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token'
    })
  })
  
  const data = await response.json()
  
  if (!data.access_token) {
    throw new Error('Impossible d\'obtenir access_token Google')
  }
  
  return data.access_token
}

/**
 * Ajouter un événement dans Google Calendar
 */
export async function ajouterRdvGoogleCalendar(data: {
  refreshToken: string
  clientId: string
  clientSecret: string
  rdv: {
    titre: string
    description?: string
    lieu?: string
    dateDebut: string  // ISO 8601
    dateFin: string    // ISO 8601
  }
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    // Obtenir access_token
    const accessToken = await getAccessToken(
      data.refreshToken,
      data.clientId,
      data.clientSecret
    )
    
    // Construire événement
    const event: GoogleCalendarEvent = {
      summary: data.rdv.titre,
      description: data.rdv.description,
      location: data.rdv.lieu,
      start: {
        dateTime: data.rdv.dateDebut,
        timeZone: 'Africa/Ouagadougou'
      },
      end: {
        dateTime: data.rdv.dateFin,
        timeZone: 'Africa/Ouagadougou'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },  // 1 jour avant
          { method: 'popup', minutes: 60 }         // 1 heure avant
        ]
      }
    }
    
    // Appel API Google Calendar
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      }
    )
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('Erreur Google Calendar API:', errorData)
      return {
        success: false,
        error: errorData.error?.message || 'Erreur inconnue'
      }
    }
    
    const result = await response.json()
    
    return {
      success: true,
      eventId: result.id
    }
    
  } catch (error) {
    console.error('Erreur ajout RDV Google Calendar:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Mettre à jour un événement dans Google Calendar
 */
export async function mettreAJourRdvGoogleCalendar(data: {
  refreshToken: string
  clientId: string
  clientSecret: string
  eventId: string
  rdv: {
    titre: string
    description?: string
    lieu?: string
    dateDebut: string
    dateFin: string
  }
}): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getAccessToken(
      data.refreshToken,
      data.clientId,
      data.clientSecret
    )
    
    const event: GoogleCalendarEvent = {
      summary: data.rdv.titre,
      description: data.rdv.description,
      location: data.rdv.lieu,
      start: {
        dateTime: data.rdv.dateDebut,
        timeZone: 'Africa/Ouagadougou'
      },
      end: {
        dateTime: data.rdv.dateFin,
        timeZone: 'Africa/Ouagadougou'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 }
        ]
      }
    }
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${data.eventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      }
    )
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('Erreur mise à jour Google Calendar:', errorData)
      return {
        success: false,
        error: errorData.error?.message || 'Erreur mise à jour'
      }
    }
    
    return { success: true }
    
  } catch (error) {
    console.error('Erreur mise à jour RDV:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Supprimer un événement de Google Calendar
 */
export async function supprimerRdvGoogleCalendar(data: {
  refreshToken: string
  clientId: string
  clientSecret: string
  eventId: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getAccessToken(
      data.refreshToken,
      data.clientId,
      data.clientSecret
    )
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${data.eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )
    
    if (!response.ok && response.status !== 410) {  // 410 = déjà supprimé
      const errorData = await response.json()
      console.error('Erreur suppression Google Calendar:', errorData)
      return {
        success: false,
        error: errorData.error?.message || 'Erreur suppression'
      }
    }
    
    return { success: true }
    
  } catch (error) {
    console.error('Erreur suppression RDV:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Helper: Synchroniser RDV vers Google Calendar si activé
 * À appeler après création/modification/suppression de RDV
 */
export async function syncRdvGoogleCalendar(
  supabase: any,
  patientId: string,
  rdvId: string,
  action: 'create' | 'update' | 'delete',
  clientId: string,
  clientSecret: string
): Promise<void> {
  try {
    // Vérifier si patient a Google Calendar activé
    const { data: settings } = await supabase
      .from('user_settings')
      .select('google_calendar_enabled, google_calendar_refresh_token')
      .eq('user_id', patientId)
      .single()
    
    if (!settings?.google_calendar_enabled || !settings.google_calendar_refresh_token) {
      // Patient n'a pas activé Google Calendar
      return
    }
    
    // Récupérer détails RDV
    const { data: rdv } = await supabase
      .from('medical_rendez_vous')
      .select(`
        id,
        date_heure,
        duree_minutes,
        motif,
        google_calendar_event_id,
        medecin:medecin_id (nom, prenom, specialite),
        structure:structure_id (nom, adresse)
      `)
      .eq('id', rdvId)
      .single()
    
    if (!rdv) return
    
    const dateDebut = new Date(rdv.date_heure)
    const dateFin = new Date(dateDebut.getTime() + (rdv.duree_minutes || 30) * 60000)
    
    const titre = `RDV ${rdv.medecin?.specialite || 'Médecin'} - ${rdv.motif || 'Consultation'}`
    const description = `Rendez-vous avec Dr. ${rdv.medecin?.nom || ''}
Motif: ${rdv.motif || 'Consultation'}
Structure: ${rdv.structure?.nom || ''}`
    const lieu = rdv.structure?.adresse || rdv.structure?.nom || ''
    
    if (action === 'create') {
      // Créer événement
      const result = await ajouterRdvGoogleCalendar({
        refreshToken: settings.google_calendar_refresh_token,
        clientId,
        clientSecret,
        rdv: {
          titre,
          description,
          lieu,
          dateDebut: dateDebut.toISOString(),
          dateFin: dateFin.toISOString()
        }
      })
      
      if (result.success && result.eventId) {
        // Enregistrer event_id dans DB pour mise à jour future
        await supabase
          .from('medical_rendez_vous')
          .update({ google_calendar_event_id: result.eventId })
          .eq('id', rdvId)
      }
      
    } else if (action === 'update' && rdv.google_calendar_event_id) {
      // Mettre à jour événement
      await mettreAJourRdvGoogleCalendar({
        refreshToken: settings.google_calendar_refresh_token,
        clientId,
        clientSecret,
        eventId: rdv.google_calendar_event_id,
        rdv: {
          titre,
          description,
          lieu,
          dateDebut: dateDebut.toISOString(),
          dateFin: dateFin.toISOString()
        }
      })
      
    } else if (action === 'delete' && rdv.google_calendar_event_id) {
      // Supprimer événement
      await supprimerRdvGoogleCalendar({
        refreshToken: settings.google_calendar_refresh_token,
        clientId,
        clientSecret,
        eventId: rdv.google_calendar_event_id
      })
    }
    
  } catch (error) {
    // Ne pas bloquer l'opération principale si sync échoue
    console.error('Erreur sync Google Calendar:', error)
  }
}
