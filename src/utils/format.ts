// Fonctions utilitaires de formatage

// Formater une date en français
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

// Formater un montant en FCFA
export function formatFCFA(montant: number): string {
  return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA'
}

// Calculer l'âge à partir de la date de naissance
export function calculerAge(dateNaissance: string): number {
  const naissance = new Date(dateNaissance)
  const auj = new Date()
  let age = auj.getFullYear() - naissance.getFullYear()
  const m = auj.getMonth() - naissance.getMonth()
  if (m < 0 || (m === 0 && auj.getDate() < naissance.getDate())) age--
  return age
}

// Générer un token aléatoire
export function genererToken(longueur = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < longueur; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Masquer partiellement un email
export function masquerEmail(email: string): string {
  const [user, domain] = email.split('@')
  return user.slice(0, 2) + '***@' + domain
}
