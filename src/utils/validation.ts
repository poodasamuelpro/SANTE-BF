// Fonctions de validation des données formulaires

export function validerEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validerTelephone(tel: string): boolean {
  // Numéros burkinabè : 7x, 6x, 5x (8 chiffres)
  return /^[0-9]{8}$/.test(tel.replace(/\s/g, ''))
}

export function validerMotDePasse(mdp: string): string | null {
  if (mdp.length < 8) return 'Au moins 8 caractères requis'
  if (!/[A-Z]/.test(mdp)) return 'Au moins 1 majuscule requise'
  if (!/[0-9]/.test(mdp)) return 'Au moins 1 chiffre requis'
  if (!/[#@!$%&*]/.test(mdp)) return 'Au moins 1 caractère spécial requis'
  return null
}

export function validerDateNaissance(date: string): boolean {
  const d = new Date(date)
  const auj = new Date()
  return d instanceof Date && !isNaN(d.getTime()) && d < auj
}
