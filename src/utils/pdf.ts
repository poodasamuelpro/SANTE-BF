/**
 * Service de génération PDF professionnel
 * Utilise pdfmake (compatible Cloudflare Workers)
 * 
 * Installation: npm install pdfmake
 * 
 * Fonctionnalités:
 * - Logo hôpital personnalisé par structure
 * - Signature médecin
 * - QR code pour vérification
 * - En-tête/pied de page automatique
 */

import type { TDocumentDefinitions } from 'pdfmake/interfaces'

/**
 * Interface structure sanitaire (pour en-tête PDF)
 */
interface StructurePDF {
  nom: string
  type: string
  adresse?: string
  telephone?: string
  logo_url?: string  // URL du logo (Cloudflare R2)
}

/**
 * Interface médecin (pour signature)
 */
interface MedecinPDF {
  nom: string
  prenom: string
  specialite?: string
  ordre_numero?: string  // Numéro ordre des médecins
  signature_url?: string  // URL signature numérique
}

/**
 * Générer en-tête standard pour tous les PDF
 */
function genererEntete(structure: StructurePDF): any {
  const colonnes: any[] = []
  
  // Logo si disponible
  if (structure.logo_url) {
    colonnes.push({
      image: structure.logo_url,
      width: 80,
      height: 80
    })
  }
  
  // Infos structure
  colonnes.push({
    stack: [
      { text: structure.nom, style: 'structureNom' },
      { text: structure.type, style: 'structureType' },
      structure.adresse ? { text: structure.adresse, style: 'structureInfo' } : {},
      structure.telephone ? { text: `Tél: ${structure.telephone}`, style: 'structureInfo' } : {}
    ],
    alignment: 'right'
  })
  
  return {
    columns: colonnes,
    columnGap: 20,
    margin: [0, 0, 0, 20]
  }
}

/**
 * Générer pied de page standard
 */
function genererPiedPage(currentPage: number, pageCount: number, dateGeneration: string): any {
  return {
    columns: [
      { text: `Généré le ${dateGeneration}`, style: 'piedPage' },
      { text: `Page ${currentPage} / ${pageCount}`, style: 'piedPage', alignment: 'right' }
    ],
    margin: [40, 0, 40, 0]
  }
}

/**
 * Styles par défaut pour tous les PDF
 */
const stylesCommuns = {
  structureNom: {
    fontSize: 16,
    bold: true,
    color: '#2563eb'
  },
  structureType: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 5
  },
  structureInfo: {
    fontSize: 9,
    color: '#94a3b8'
  },
  titreDocument: {
    fontSize: 20,
    bold: true,
    alignment: 'center',
    marginTop: 20,
    marginBottom: 20,
    color: '#1e293b'
  },
  sousTitre: {
    fontSize: 14,
    bold: true,
    marginTop: 15,
    marginBottom: 10,
    color: '#334155'
  },
  label: {
    fontSize: 11,
    bold: true,
    color: '#475569'
  },
  valeur: {
    fontSize: 11,
    color: '#1e293b'
  },
  tableau: {
    fontSize: 10,
    marginTop: 10,
    marginBottom: 10
  },
  piedPage: {
    fontSize: 8,
    color: '#94a3b8'
  },
  signatureZone: {
    marginTop: 30,
    fontSize: 11
  }
}

/**
 * ORDONNANCE MÉDICALE
 */
export async function genererOrdonnancePDF(data: {
  structure: StructurePDF
  medecin: MedecinPDF
  patient: {
    nom: string
    prenom: string
    date_naissance: string
    numero_national: string
    age?: number
  }
  ordonnance: {
    numero: string
    date: string
    date_expiration: string
    qr_code?: string  // QR code pour vérification
  }
  medicaments: Array<{
    nom: string
    dosage: string
    forme: string
    posologie: string
    duree: string
    quantite: number
  }>
  instructions?: string
}): Promise<Uint8Array> {
  
  const dateGeneration = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  // Construction du document PDF
  const docDefinition: TDocumentDefinitions = {
    content: [
      // En-tête structure
      genererEntete(data.structure),
      
      // Ligne séparatrice
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' }] },
      
      // Titre
      { text: 'ORDONNANCE MÉDICALE', style: 'titreDocument' },
      
      // Informations ordonnance
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Informations Patient', style: 'sousTitre' },
              {
                table: {
                  widths: ['40%', '60%'],
                  body: [
                    [{ text: 'Nom:', style: 'label' }, { text: `${data.patient.nom} ${data.patient.prenom}`, style: 'valeur' }],
                    [{ text: 'Date naissance:', style: 'label' }, { text: data.patient.date_naissance, style: 'valeur' }],
                    [{ text: 'Âge:', style: 'label' }, { text: `${data.patient.age || '—'} ans`, style: 'valeur' }],
                    [{ text: 'N° National:', style: 'label' }, { text: data.patient.numero_national, style: 'valeur' }]
                  ]
                },
                layout: 'noBorders',
                style: 'tableau'
              }
            ]
          },
          {
            width: '50%',
            stack: [
              { text: 'Informations Ordonnance', style: 'sousTitre' },
              {
                table: {
                  widths: ['40%', '60%'],
                  body: [
                    [{ text: 'N° Ordonnance:', style: 'label' }, { text: data.ordonnance.numero, style: 'valeur' }],
                    [{ text: 'Date:', style: 'label' }, { text: data.ordonnance.date, style: 'valeur' }],
                    [{ text: 'Valable jusqu\'au:', style: 'label' }, { text: data.ordonnance.date_expiration, style: 'valeur' }]
                  ]
                },
                layout: 'noBorders',
                style: 'tableau'
              }
            ]
          }
        ],
        columnGap: 20,
        marginBottom: 20
      },
      
      // Médicaments prescrits
      { text: 'Médicaments prescrits', style: 'sousTitre' },
      {
        table: {
          headerRows: 1,
          widths: ['25%', '15%', '30%', '15%', '15%'],
          body: [
            [
              { text: 'Médicament', style: 'label', fillColor: '#f1f5f9' },
              { text: 'Dosage', style: 'label', fillColor: '#f1f5f9' },
              { text: 'Posologie', style: 'label', fillColor: '#f1f5f9' },
              { text: 'Durée', style: 'label', fillColor: '#f1f5f9' },
              { text: 'Qté', style: 'label', fillColor: '#f1f5f9' }
            ],
            ...data.medicaments.map(med => [
              { text: `${med.nom}\n${med.forme}`, fontSize: 10 },
              { text: med.dosage, fontSize: 10 },
              { text: med.posologie, fontSize: 10 },
              { text: med.duree, fontSize: 10 },
              { text: med.quantite.toString(), fontSize: 10, alignment: 'center' }
            ])
          ]
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#e2e8f0',
          vLineColor: () => '#e2e8f0'
        },
        style: 'tableau'
      },
      
      // Instructions particulières
      data.instructions ? {
        stack: [
          { text: 'Instructions particulières', style: 'sousTitre' },
          {
            text: data.instructions,
            fontSize: 11,
            margin: [0, 5, 0, 20],
            italics: true,
            color: '#475569'
          }
        ]
      } : {},
      
      // QR Code si disponible
      data.ordonnance.qr_code ? {
        columns: [
          { width: '*', text: '' },
          {
            width: 100,
            stack: [
              { qr: data.ordonnance.qr_code, fit: 100 },
              { text: 'Vérification ordonnance', fontSize: 8, alignment: 'center', marginTop: 5, color: '#64748b' }
            ]
          },
          { width: '*', text: '' }
        ],
        marginTop: 20
      } : {},
      
      // Signature médecin
      {
        columns: [
          { width: '*', text: '' },
          {
            width: '40%',
            stack: [
              { text: `Fait à ${data.structure.nom}`, fontSize: 11, marginBottom: 5 },
              { text: `Le ${data.ordonnance.date}`, fontSize: 11, marginBottom: 20 },
              data.medecin.signature_url ? {
                image: data.medecin.signature_url,
                width: 120,
                height: 60
              } : {},
              { text: `Dr. ${data.medecin.nom} ${data.medecin.prenom}`, style: 'label' },
              data.medecin.specialite ? { text: data.medecin.specialite, fontSize: 10, color: '#64748b' } : {},
              data.medecin.ordre_numero ? { text: `Ordre N° ${data.medecin.ordre_numero}`, fontSize: 9, color: '#94a3b8', marginTop: 5 } : {},
              { text: 'Signature et cachet', fontSize: 9, color: '#94a3b8', marginTop: 10 }
            ],
            alignment: 'center'
          }
        ],
        style: 'signatureZone'
      }
    ],
    
    footer: (currentPage, pageCount) => 
      genererPiedPage(currentPage, pageCount, dateGeneration),
    
    styles: stylesCommuns,
    
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60]
  }
  
  // Générer le PDF avec pdfmake
  // Note: En production, utiliser pdfmake en mode serveur
  // Pour Cloudflare Workers, utiliser une API externe ou pdfmake/build/pdfmake.min.js
  
  // Import dynamique pour éviter erreurs build
  const pdfMake = await import('pdfmake/build/pdfmake')
  const pdfFonts = await import('pdfmake/build/vfs_fonts')
  pdfMake.default.vfs = pdfFonts.default.pdfMake.vfs
  
  return new Promise((resolve, reject) => {
    const pdfDocGenerator = pdfMake.default.createPdf(docDefinition)
    pdfDocGenerator.getBuffer((buffer: Buffer) => {
      resolve(new Uint8Array(buffer))
    })
  })
}

/**
 * CERTIFICAT MÉDICAL
 */
export async function genererCertificatPDF(data: {
  structure: StructurePDF
  medecin: MedecinPDF
  patient: {
    nom: string
    prenom: string
    date_naissance: string
    numero_national: string
  }
  certificat: {
    numero: string
    date: string
    type: 'arret_travail' | 'aptitude' | 'constat' | 'autre'
    motif: string
    duree_arret?: number  // Jours (si arret travail)
    constat: string
  }
}): Promise<Uint8Array> {
  
  const dateGeneration = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  const docDefinition: TDocumentDefinitions = {
    content: [
      genererEntete(data.structure),
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' }] },
      
      { text: 'CERTIFICAT MÉDICAL', style: 'titreDocument' },
      { text: `N° ${data.certificat.numero}`, fontSize: 12, alignment: 'center', color: '#64748b', marginBottom: 30 },
      
      // Corps du certificat
      {
        stack: [
          {
            text: [
              { text: 'Je soussigné(e) ', fontSize: 12 },
              { text: `Dr. ${data.medecin.nom} ${data.medecin.prenom}`, fontSize: 12, bold: true },
              data.medecin.specialite ? { text: `, ${data.medecin.specialite}`, fontSize: 12 } : {},
              data.medecin.ordre_numero ? { text: `, N° Ordre ${data.medecin.ordre_numero}`, fontSize: 12 } : {},
              { text: ',', fontSize: 12 }
            ],
            marginBottom: 15
          },
          
          {
            text: 'certifie avoir examiné ce jour :',
            fontSize: 12,
            marginBottom: 15
          },
          
          {
            table: {
              widths: ['30%', '70%'],
              body: [
                [{ text: 'Nom et Prénom:', style: 'label' }, { text: `${data.patient.nom} ${data.patient.prenom}`, style: 'valeur' }],
                [{ text: 'Né(e) le:', style: 'label' }, { text: data.patient.date_naissance, style: 'valeur' }],
                [{ text: 'N° National:', style: 'label' }, { text: data.patient.numero_national, style: 'valeur' }]
              ]
            },
            layout: 'noBorders',
            marginBottom: 20
          },
          
          {
            text: 'et constate :',
            fontSize: 12,
            marginBottom: 10
          },
          
          {
            text: data.certificat.constat,
            fontSize: 12,
            margin: [20, 10, 20, 20],
            italics: true,
            background: '#f8fafc',
            border: [true, true, true, true],
            borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0']
          },
          
          // Si arrêt de travail
          data.certificat.type === 'arret_travail' && data.certificat.duree_arret ? {
            text: [
              { text: 'Durée d\'arrêt de travail : ', fontSize: 12, bold: true },
              { text: `${data.certificat.duree_arret} jours`, fontSize: 12, color: '#dc2626' }
            ],
            marginTop: 15,
            marginBottom: 15
          } : {},
          
          {
            text: `Certificat établi à la demande de l'intéressé(e) pour servir et valoir ce que de droit.`,
            fontSize: 11,
            italics: true,
            color: '#64748b',
            marginTop: 20
          }
        ]
      },
      
      // Signature
      {
        columns: [
          { width: '*', text: '' },
          {
            width: '40%',
            stack: [
              { text: `Fait à ${data.structure.nom}`, fontSize: 11, marginBottom: 5 },
              { text: `Le ${data.certificat.date}`, fontSize: 11, marginBottom: 20 },
              data.medecin.signature_url ? {
                image: data.medecin.signature_url,
                width: 120,
                height: 60
              } : {},
              { text: `Dr. ${data.medecin.nom} ${data.medecin.prenom}`, style: 'label' },
              { text: 'Signature et cachet', fontSize: 9, color: '#94a3b8', marginTop: 10 }
            ],
            alignment: 'center'
          }
        ],
        style: 'signatureZone'
      }
    ],
    
    footer: (currentPage, pageCount) => 
      genererPiedPage(currentPage, pageCount, dateGeneration),
    
    styles: stylesCommuns,
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60]
  }
  
  const pdfMake = await import('pdfmake/build/pdfmake')
  const pdfFonts = await import('pdfmake/build/vfs_fonts')
  pdfMake.default.vfs = pdfFonts.default.pdfMake.vfs
  
  return new Promise((resolve, reject) => {
    const pdfDocGenerator = pdfMake.default.createPdf(docDefinition)
    pdfDocGenerator.getBuffer((buffer: Buffer) => {
      resolve(new Uint8Array(buffer))
    })
  })
}

/**
 * REÇU DE PAIEMENT
 */
export async function genererRecuPDF(data: {
  structure: StructurePDF
  patient: {
    nom: string
    prenom: string
    numero_national: string
  }
  facture: {
    numero: string
    date: string
    total_ttc: number
    montant_patient: number
    montant_assurance: number
    mode_paiement: string
    reference_paiement?: string
  }
  actes: Array<{
    designation: string
    quantite: number
    prix_unitaire: number
    total: number
  }>
}): Promise<Uint8Array> {
  
  const dateGeneration = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  const docDefinition: TDocumentDefinitions = {
    content: [
      genererEntete(data.structure),
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' }] },
      
      { text: 'REÇU DE PAIEMENT', style: 'titreDocument' },
      
      // Infos patient et facture
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Patient', style: 'sousTitre' },
              { text: `${data.patient.nom} ${data.patient.prenom}`, fontSize: 12, marginBottom: 5 },
              { text: `N° ${data.patient.numero_national}`, fontSize: 10, color: '#64748b' }
            ]
          },
          {
            width: '50%',
            stack: [
              { text: 'Facture', style: 'sousTitre' },
              { text: `N° ${data.facture.numero}`, fontSize: 12, marginBottom: 5 },
              { text: `Date: ${data.facture.date}`, fontSize: 10, color: '#64748b' }
            ],
            alignment: 'right'
          }
        ],
        marginBottom: 30
      },
      
      // Détail actes
      { text: 'Détail des prestations', style: 'sousTitre' },
      {
        table: {
          headerRows: 1,
          widths: ['50%', '15%', '20%', '15%'],
          body: [
            [
              { text: 'Désignation', style: 'label', fillColor: '#f1f5f9' },
              { text: 'Qté', style: 'label', fillColor: '#f1f5f9', alignment: 'center' },
              { text: 'P.U. (FCFA)', style: 'label', fillColor: '#f1f5f9', alignment: 'right' },
              { text: 'Total (FCFA)', style: 'label', fillColor: '#f1f5f9', alignment: 'right' }
            ],
            ...data.actes.map(acte => [
              { text: acte.designation, fontSize: 10 },
              { text: acte.quantite.toString(), fontSize: 10, alignment: 'center' },
              { text: acte.prix_unitaire.toLocaleString('fr-FR'), fontSize: 10, alignment: 'right' },
              { text: acte.total.toLocaleString('fr-FR'), fontSize: 10, alignment: 'right' }
            ]),
            ['', '', { text: 'Total TTC:', style: 'label', alignment: 'right' }, { text: data.facture.total_ttc.toLocaleString('fr-FR'), style: 'label', alignment: 'right', fillColor: '#f1f5f9' }],
            ['', '', { text: 'Part assurance:', fontSize: 10, alignment: 'right' }, { text: data.facture.montant_assurance.toLocaleString('fr-FR'), fontSize: 10, alignment: 'right' }],
            ['', '', { text: 'Part patient:', style: 'label', alignment: 'right' }, { text: data.facture.montant_patient.toLocaleString('fr-FR'), fontSize: 12, bold: true, alignment: 'right', color: '#dc2626' }]
          ]
        },
        layout: {
          hLineWidth: (i, node) => i === 0 || i === node.table.body.length - 3 ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#e2e8f0',
          vLineColor: () => '#e2e8f0'
        },
        style: 'tableau'
      },
      
      // Mode de paiement
      {
        margin: [0, 20, 0, 0],
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              { text: 'Mode de paiement:', style: 'label' },
              { text: data.facture.mode_paiement, style: 'valeur' }
            ],
            data.facture.reference_paiement ? [
              { text: 'Référence:', style: 'label' },
              { text: data.facture.reference_paiement, style: 'valeur' }
            ] : []
          ].filter(row => row.length > 0)
        },
        layout: 'noBorders'
      },
      
      // Mention légale
      {
        text: 'Ce reçu tient lieu de quittance. À conserver précieusement.',
        fontSize: 10,
        italics: true,
        color: '#64748b',
        marginTop: 30,
        alignment: 'center'
      }
    ],
    
    footer: (currentPage, pageCount) => 
      genererPiedPage(currentPage, pageCount, dateGeneration),
    
    styles: stylesCommuns,
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60]
  }
  
  const pdfMake = await import('pdfmake/build/pdfmake')
  const pdfFonts = await import('pdfmake/build/vfs_fonts')
  pdfMake.default.vfs = pdfFonts.default.pdfMake.vfs
  
  return new Promise((resolve, reject) => {
    const pdfDocGenerator = pdfMake.default.createPdf(docDefinition)
    pdfDocGenerator.getBuffer((buffer: Buffer) => {
      resolve(new Uint8Array(buffer))
    })
  })
}

/**
 * BULLETIN D'EXAMEN (Laboratoire / Radiologie)
 */
export async function genererBulletinExamenPDF(data: {
  structure: StructurePDF
  medecin_prescripteur: MedecinPDF
  patient: {
    nom: string
    prenom: string
    date_naissance: string
    numero_national: string
  }
  examen: {
    numero: string
    type: 'laboratoire' | 'radiologie'
    date_prelevement: string
    date_resultat: string
    type_examen: string
    indication_clinique?: string
  }
  resultats: Array<{
    parametre: string
    valeur: string
    unite?: string
    valeurs_normales?: string
    interpretation?: 'normal' | 'anormal' | 'critique'
  }>
  conclusion?: string
  technicien_nom?: string
}): Promise<Uint8Array> {
  
  const dateGeneration = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  const docDefinition: TDocumentDefinitions = {
    content: [
      genererEntete(data.structure),
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' }] },
      
      { text: data.examen.type === 'laboratoire' ? 'BULLETIN D\'ANALYSE' : 'COMPTE-RENDU D\'IMAGERIE', style: 'titreDocument' },
      { text: `N° ${data.examen.numero}`, fontSize: 12, alignment: 'center', color: '#64748b', marginBottom: 20 },
      
      // Infos patient et prescription
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Patient', style: 'sousTitre' },
              {
                table: {
                  widths: ['40%', '60%'],
                  body: [
                    [{ text: 'Nom:', style: 'label' }, { text: `${data.patient.nom} ${data.patient.prenom}`, style: 'valeur' }],
                    [{ text: 'Né(e) le:', style: 'label' }, { text: data.patient.date_naissance, style: 'valeur' }],
                    [{ text: 'N° National:', style: 'label' }, { text: data.patient.numero_national, style: 'valeur' }]
                  ]
                },
                layout: 'noBorders'
              }
            ]
          },
          {
            width: '50%',
            stack: [
              { text: 'Prescription', style: 'sousTitre' },
              {
                table: {
                  widths: ['45%', '55%'],
                  body: [
                    [{ text: 'Prescripteur:', style: 'label' }, { text: `Dr. ${data.medecin_prescripteur.nom}`, style: 'valeur' }],
                    [{ text: 'Examen:', style: 'label' }, { text: data.examen.type_examen, style: 'valeur' }],
                    [{ text: 'Prélèvement:', style: 'label' }, { text: data.examen.date_prelevement, style: 'valeur' }],
                    [{ text: 'Résultat:', style: 'label' }, { text: data.examen.date_resultat, style: 'valeur' }]
                  ]
                },
                layout: 'noBorders'
              }
            ]
          }
        ],
        columnGap: 20,
        marginBottom: 20
      },
      
      // Indication clinique si présente
      data.examen.indication_clinique ? {
        stack: [
          { text: 'Indication clinique', style: 'sousTitre' },
          { text: data.examen.indication_clinique, fontSize: 11, italics: true, color: '#475569', marginBottom: 15 }
        ]
      } : {},
      
      // Résultats
      { text: 'Résultats', style: 'sousTitre' },
      {
        table: {
          headerRows: 1,
          widths: ['35%', '20%', '15%', '20%', '10%'],
          body: [
            [
              { text: 'Paramètre', style: 'label', fillColor: '#f1f5f9' },
              { text: 'Valeur', style: 'label', fillColor: '#f1f5f9', alignment: 'center' },
              { text: 'Unité', style: 'label', fillColor: '#f1f5f9', alignment: 'center' },
              { text: 'Valeurs normales', style: 'label', fillColor: '#f1f5f9', alignment: 'center' },
              { text: '', style: 'label', fillColor: '#f1f5f9' }
            ],
            ...data.resultats.map(res => [
              { text: res.parametre, fontSize: 10 },
              { 
                text: res.valeur, 
                fontSize: 10, 
                alignment: 'center',
                bold: res.interpretation === 'anormal' || res.interpretation === 'critique',
                color: res.interpretation === 'critique' ? '#dc2626' : res.interpretation === 'anormal' ? '#f59e0b' : '#1e293b'
              },
              { text: res.unite || '—', fontSize: 10, alignment: 'center' },
              { text: res.valeurs_normales || '—', fontSize: 9, alignment: 'center', color: '#64748b' },
              { 
                text: res.interpretation === 'critique' ? '⚠' : res.interpretation === 'anormal' ? '!' : '✓',
                fontSize: 12,
                alignment: 'center',
                color: res.interpretation === 'critique' ? '#dc2626' : res.interpretation === 'anormal' ? '#f59e0b' : '#10b981'
              }
            ])
          ]
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#e2e8f0',
          vLineColor: () => '#e2e8f0'
        },
        style: 'tableau'
      },
      
      // Conclusion si présente
      data.conclusion ? {
        stack: [
          { text: 'Conclusion', style: 'sousTitre' },
          {
            text: data.conclusion,
            fontSize: 11,
            margin: [10, 5, 10, 15],
            background: '#fef3c7',
            border: [true, true, true, true]
          }
        ]
      } : {},
      
      // Signature technicien
      data.technicien_nom ? {
        columns: [
          { width: '*', text: '' },
          {
            width: '40%',
            stack: [
              { text: `Fait à ${data.structure.nom}`, fontSize: 11, marginBottom: 5 },
              { text: `Le ${data.examen.date_resultat}`, fontSize: 11, marginBottom: 20 },
              { text: data.technicien_nom, style: 'label' },
              { text: data.examen.type === 'laboratoire' ? 'Biologiste' : 'Radiologue', fontSize: 10, color: '#64748b' },
              { text: 'Signature et cachet', fontSize: 9, color: '#94a3b8', marginTop: 10 }
            ],
            alignment: 'center'
          }
        ],
        style: 'signatureZone'
      } : {}
    ],
    
    footer: (currentPage, pageCount) => 
      genererPiedPage(currentPage, pageCount, dateGeneration),
    
    styles: stylesCommuns,
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60]
  }
  
  const pdfMake = await import('pdfmake/build/pdfmake')
  const pdfFonts = await import('pdfmake/build/vfs_fonts')
  pdfMake.default.vfs = pdfFonts.default.pdfMake.vfs
  
  return new Promise((resolve, reject) => {
    const pdfDocGenerator = pdfMake.default.createPdf(docDefinition)
    pdfDocGenerator.getBuffer((buffer: Buffer) => {
      resolve(new Uint8Array(buffer))
    })
  })
}
