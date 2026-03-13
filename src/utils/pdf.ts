// Génération PDF (ordonnances, reçus, comptes-rendus)
// TODO: Utiliser une librairie PDF compatible Cloudflare Workers
// Options : jsPDF, PDFKit, ou appel à une API externe

export async function genererOrdonnancePDF(ordonnance: any): Promise<Uint8Array> {
  // TODO: Générer le PDF de l'ordonnance avec :
  // - En-tête structure médicale
  // - Infos médecin + numéro ordre
  // - Infos patient
  // - Liste médicaments avec dosages
  // - QR code de vérification
  // - Signature médecin
  throw new Error('TODO: Implémenter génération PDF ordonnance')
}

export async function genererRecuPDF(facture: any): Promise<Uint8Array> {
  // TODO: Générer le reçu de paiement
  throw new Error('TODO: Implémenter génération PDF reçu')
}
