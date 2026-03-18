/**
 * src/utils/format.ts
 * SantéBF — Fonctions utilitaires de formatage
 * (aucune modification — fichier déjà correct)
 */

// Formater une date en français
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

// Formater date + heure
export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Formater un montant en FCFA
export function formatFCFA(montant: number): string {
  return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA'
}

// Calculer l'âge à partir de la date de naissance
export function calculerAge(dateNaissance: string): number {
  const n = new Date(dateNaissance)
  const a = new Date()
  let age = a.getFullYear() - n.getFullYear()
  const m = a.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && a.getDate() < n.getDate())) age--
  return age
}

// Générer un token aléatoire (côté serveur Workers — pas de crypto.randomBytes Node)
export function genererToken(longueur = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const arr   = new Uint8Array(longueur)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => chars[b % chars.length]).join('')
}

// Masquer partiellement un email
export function masquerEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!user || !domain) return email
  return user.slice(0, 2) + '***@' + domain
}

// Formater un statut en badge couleur CSS class
export function badgeStatut(statut: string): string {
  const map: Record<string, string> = {
    active:     'badge-vert',
    confirme:   'badge-vert',
    planifie:   'badge-violet',
    prescrit:   'badge-violet',
    en_cours:   'badge-bleu',
    expiree:    'badge-gris',
    passe:      'badge-gris',
    annule:     'badge-rouge',
    annulee:    'badge-rouge',
    delivree:   'badge-bleu',
    grave:      'badge-orange',
    critique:   'badge-rouge',
    stable:     'badge-vert',
  }
  return map[statut] ?? 'badge-gris'
}
