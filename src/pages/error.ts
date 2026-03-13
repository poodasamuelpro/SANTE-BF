// Page erreur 403 / 404 / 500
// TODO: Pages d'erreur stylisées SantéBF
export function errorPage(code: number, message: string): string {
  return `<!DOCTYPE html><html><body>
    <h1>Erreur ${code}</h1>
    <p>${message}</p>
    <a href="/auth/login">Retour à l'accueil</a>
  </body></html>`
}
