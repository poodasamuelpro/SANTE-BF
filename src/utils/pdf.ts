// Génération PDF (ordonnances, reçus, comptes-rendus)
// Utilise jsPDF compatible Cloudflare Workers

/**
 * Générer PDF ordonnance
 * Installation: npm install jspdf
 */
export async function genererOrdonnancePDF(ordonnance: any): Promise<Uint8Array> {
  // Import dynamique pour éviter erreurs build
  // const { jsPDF } = await import('jspdf')
  
  // Pour l'instant, retourner un PDF minimal
  // En production, utiliser jsPDF ou API externe (Puppeteer via API)
  
  const pdfContent = `
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 595 842]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj
4 0 obj
<<
/Length 200
>>
stream
BT
/F1 24 Tf
50 800 Td
(ORDONNANCE MEDICALE) Tj
/F1 12 Tf
50 760 Td
(Patient: ${ordonnance.patient_nom || 'N/A'}) Tj
50 740 Td
(Date: ${ordonnance.date || new Date().toLocaleDateString('fr-FR')}) Tj
50 720 Td
(Medecin: Dr. ${ordonnance.medecin_nom || 'N/A'}) Tj
ET
endstream
endobj
5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
0000000524 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
593
%%EOF
  `.trim()
  
  return new TextEncoder().encode(pdfContent)
}

/**
 * Générer reçu de paiement PDF
 */
export async function genererRecuPDF(facture: any): Promise<Uint8Array> {
  const pdfContent = `
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 595 842]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj
4 0 obj
<<
/Length 250
>>
stream
BT
/F1 24 Tf
50 800 Td
(RECU DE PAIEMENT) Tj
/F1 12 Tf
50 760 Td
(Numero: ${facture.numero_facture || 'N/A'}) Tj
50 740 Td
(Patient: ${facture.patient_nom || 'N/A'}) Tj
50 720 Td
(Montant: ${facture.total_ttc || 0} FCFA) Tj
50 700 Td
(Date: ${facture.date || new Date().toLocaleDateString('fr-FR')}) Tj
50 680 Td
(Mode: ${facture.mode_paiement || 'Especes'}) Tj
ET
endstream
endobj
5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
0000000574 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
643
%%EOF
  `.trim()
  
  return new TextEncoder().encode(pdfContent)
}

/**
 * Générer certificat médical PDF
 */
export async function genererCertificatPDF(data: any): Promise<Uint8Array> {
  const pdfContent = `
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 595 842]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj
4 0 obj
<<
/Length 300
>>
stream
BT
/F1 24 Tf
50 800 Td
(CERTIFICAT MEDICAL) Tj
/F1 12 Tf
50 760 Td
(Je soussigne Dr. ${data.medecin_nom || 'N/A'}) Tj
50 740 Td
(certifie avoir examine ce jour:) Tj
50 720 Td
(${data.patient_nom || 'N/A'}) Tj
50 700 Td
(et constate: ${data.constat || 'N/A'}) Tj
50 660 Td
(Fait a ${data.lieu || 'N/A'}, le ${data.date || new Date().toLocaleDateString('fr-FR')}) Tj
50 620 Td
(Signature et cachet du medecin) Tj
ET
endstream
endobj
5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
0000000624 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
693
%%EOF
  `.trim()
  
  return new TextEncoder().encode(pdfContent)
}
