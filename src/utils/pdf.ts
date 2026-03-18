/**
 * src/utils/pdf.ts
 * SantéBF — Génération PDF avec pdfmake
 *
 * Compatible Cloudflare Workers :
 *   - Import statique pdfmake (pas de dynamic import au runtime)
 *   - Logo / signature convertis en base64 AVANT appel pdfmake
 *   - QR code via URL externe (pas de plugin qrcode pdfmake)
 *   - Couleurs cohérentes avec le projet : violet #4A148C, vert #1A6B3C
 *
 * Installation :
 *   npm install pdfmake
 *   npm install --save-dev @types/pdfmake
 *
 * Corrections vs version originale :
 *   1. Dynamic imports supprimés → import statique en haut
 *   2. fetchImageAsBase64() pour logo/signature (Workers peuvent fetch)
 *   3. QR code via URL image (pas de plugin qrcode)
 *   4. Couleurs violet #4A148C au lieu de #2563eb
 *   5. pdfMake.vfs = pdfFonts.pdfMake.vfs (chemin corrigé)
 */

// Import statique — OBLIGATOIRE pour Cloudflare Workers
// Le dynamic import 'pdfmake/build/pdfmake' n'est pas supporté au runtime Workers
import pdfMake    from 'pdfmake/build/pdfmake'
import pdfFonts  from 'pdfmake/build/vfs_fonts'
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces'

// Initialiser les fonts une seule fois au démarrage du module
;(pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs ?? (pdfFonts as any).vfs

// ─── Types ────────────────────────────────────────────────

export interface StructurePDF {
  nom:        string
  type:       string
  adresse?:   string
  telephone?: string
  logo_url?:  string  // URL Supabase Storage — sera converti en base64
}

export interface MedecinPDF {
  nom:           string
  prenom:        string
  specialite?:   string
  numero_ordre?: string
  signature_url?: string  // URL depuis auth_medecins.signature_url — converti en base64
}

// ─── Fetch image → base64 (Workers-compatible) ───────────

/**
 * Convertit une URL image en data URI base64.
 * Les Cloudflare Workers peuvent faire fetch() vers des URLs publiques.
 * Si l'URL échoue, retourne null (le PDF sera généré sans l'image).
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const ct  = res.headers.get('content-type') ?? 'image/png'
    const buf = await res.arrayBuffer()
    // Convertir ArrayBuffer en base64 (Workers-compatible, pas de Buffer Node)
    const bytes = new Uint8Array(buf)
    let b64 = ''
    const CHUNK = 8192
    for (let i = 0; i < bytes.length; i += CHUNK) {
      b64 += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
    }
    return `data:${ct};base64,${btoa(b64)}`
  } catch {
    return null
  }
}

// ─── En-tête commun ───────────────────────────────────────

async function buildEntete(
  structure: StructurePDF,
  logoBase64: string | null
): Promise<Content> {
  const cols: any[] = []

  if (logoBase64) {
    cols.push({ image: logoBase64, width: 72, height: 72 })
  }

  cols.push({
    stack: [
      { text: structure.nom,  style: 'structureNom' },
      { text: structure.type, style: 'structureType' },
      structure.adresse   ? { text: structure.adresse,           style: 'structureInfo' } : {},
      structure.telephone ? { text: `T\u00e9l : ${structure.telephone}`, style: 'structureInfo' } : {},
    ],
    alignment: 'right',
  })

  return {
    columns:   cols,
    columnGap: 20,
    margin:    [0, 0, 0, 16] as [number, number, number, number],
  }
}

// ─── Pied de page commun ──────────────────────────────────

function buildFooter(currentPage: number, pageCount: number, dateGen: string): Content {
  return {
    columns: [
      { text: `G\u00e9n\u00e9r\u00e9 le ${dateGen}`, style: 'piedPage' },
      { text: `Page ${currentPage} / ${pageCount}`, style: 'piedPage', alignment: 'right' },
    ],
    margin: [40, 0, 40, 0] as [number, number, number, number],
  }
}

// ─── Styles communs (couleurs projet : violet + vert) ────

const STYLES_COMMUNS = {
  structureNom: { fontSize: 15, bold: true,  color: '#4A148C' },
  structureType:{ fontSize: 11, color: '#6B7280', marginBottom: 4 },
  structureInfo:{ fontSize: 9,  color: '#9E9E9E' },

  titreDocument:{ fontSize: 19, bold: true, alignment: 'center' as const,
                  marginTop: 16, marginBottom: 16, color: '#1A1A2E' },
  sousTitre:    { fontSize: 13, bold: true, marginTop: 12, marginBottom: 8, color: '#4A148C' },
  label:        { fontSize: 10, bold: true, color: '#374151' },
  valeur:       { fontSize: 10, color: '#1A1A2E' },
  tableau:      { fontSize: 10, marginTop: 8, marginBottom: 8 },
  piedPage:     { fontSize: 8,  color: '#9E9E9E' },
  signatureZone:{ marginTop: 28, fontSize: 10 },
  noteConfid:   { fontSize: 9, italics: true, color: '#9E9E9E' },
}

const PAGE_MARGINS: [number, number, number, number] = [40, 55, 40, 55]

// ─── Helper Promise pdfmake ───────────────────────────────

function pdfToBuffer(def: TDocumentDefinitions): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      const gen = (pdfMake as any).createPdf(def)
      gen.getBuffer((buf: Buffer | Uint8Array) => {
        resolve(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
      })
    } catch (e) {
      reject(e)
    }
  })
}

// ═══════════════════════════════════════════════════════════
// ORDONNANCE MÉDICALE
// ═══════════════════════════════════════════════════════════

export async function genererOrdonnancePDF(data: {
  structure:    StructurePDF
  medecin:      MedecinPDF
  patient: {
    nom:             string
    prenom:          string
    date_naissance:  string
    numero_national: string
    age?:            number
    groupe_sanguin?: string
    rhesus?:         string
  }
  ordonnance: {
    numero:          string
    date:            string
    date_expiration: string
    qr_code?:        string
  }
  medicaments: Array<{
    nom:        string
    dosage:     string
    forme:      string
    frequence:  string
    duree:      string
    quantite:   number
    instructions?: string
  }>
}): Promise<Uint8Array> {

  const dateGen   = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  // Charger images en parallèle
  const [logoB64, sigB64] = await Promise.all([
    fetchImageAsBase64(data.structure.logo_url ?? ''),
    fetchImageAsBase64(data.medecin.signature_url ?? ''),
  ])

  const entete = await buildEntete(data.structure, logoB64)

  const medRows = data.medicaments.map((m, i) => [
    { text: `${i + 1}. ${m.nom}\n${m.forme}`, fontSize: 10 },
    { text: m.dosage,                           fontSize: 10 },
    { text: m.frequence,                        fontSize: 10 },
    { text: m.duree,                            fontSize: 10 },
    { text: String(m.quantite), fontSize: 10, alignment: 'center' as const },
    { text: m.instructions ?? '', fontSize: 9, color: '#6B7280' },
  ])

  // QR code via URL image publique (pas de plugin)
  const qrContent: Content = data.ordonnance.qr_code
    ? {
        columns: [
          { width: '*', text: '' },
          {
            width: 90,
            stack: [
              {
                // URL de vérification lisible directement
                text: `V\u00e9rification : santebf.izicardouaga.com/public/ordonnance/${data.ordonnance.qr_code}`,
                fontSize: 8, color: '#6B7280', alignment: 'center' as const,
              },
              {
                text: data.ordonnance.qr_code,
                fontSize: 7, font: 'Courier', alignment: 'center' as const,
                margin: [0, 4, 0, 0] as [number, number, number, number],
                color: '#4A148C',
              },
            ],
          },
          { width: '*', text: '' },
        ],
        margin: [0, 16, 0, 0] as [number, number, number, number],
      }
    : ({ text: '' } as Content)

  const sigStack: Content[] = sigB64
    ? [{ image: sigB64, width: 110, height: 55 }]
    : [{ text: '\n\n', fontSize: 8 }]

  const def: TDocumentDefinitions = {
    content: [
      entete,
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#E0E0E0' }] },
      { text: 'ORDONNANCE M\u00c9DICALE', style: 'titreDocument' },

      // Infos patient + ordonnance
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Patient', style: 'sousTitre' },
              { table: { widths: ['42%', '58%'], body: [
                [{ text: 'Nom / Pr\u00e9nom :', style: 'label' }, { text: `${data.patient.prenom} ${data.patient.nom}`, style: 'valeur' }],
                [{ text: 'N\u00e9(e) le :', style: 'label' }, { text: data.patient.date_naissance, style: 'valeur' }],
                [{ text: '\u00c2ge :', style: 'label' }, { text: `${data.patient.age ?? '—'} ans`, style: 'valeur' }],
                [{ text: 'N\u00b0 National :', style: 'label' }, { text: data.patient.numero_national, style: 'valeur' }],
                [{ text: 'Groupe sanguin :', style: 'label' }, {
                  text: data.patient.groupe_sanguin ? `${data.patient.groupe_sanguin}${data.patient.rhesus ?? ''}` : '—',
                  style: 'valeur', bold: true, color: '#B71C1C',
                }],
              ]}, layout: 'noBorders', style: 'tableau' },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Ordonnance', style: 'sousTitre' },
              { table: { widths: ['42%', '58%'], body: [
                [{ text: 'N\u00b0 :', style: 'label' }, { text: data.ordonnance.numero, style: 'valeur', bold: true, color: '#4A148C' }],
                [{ text: 'Date :', style: 'label' }, { text: data.ordonnance.date, style: 'valeur' }],
                [{ text: 'Expire le :', style: 'label' }, { text: data.ordonnance.date_expiration, style: 'valeur' }],
              ]}, layout: 'noBorders', style: 'tableau' },
            ],
          },
        ],
        columnGap: 20,
        marginBottom: 16,
      },

      // Tableau médicaments
      { text: 'M\u00e9dicaments prescrits', style: 'sousTitre' },
      {
        table: {
          headerRows: 1,
          widths: ['22%', '12%', '22%', '12%', '8%', '24%'],
          body: [
            [
              { text: 'M\u00e9dicament / Forme', style: 'label', fillColor: '#EDE7F6' },
              { text: 'Dosage',     style: 'label', fillColor: '#EDE7F6' },
              { text: 'Fr\u00e9quence', style: 'label', fillColor: '#EDE7F6' },
              { text: 'Dur\u00e9e',     style: 'label', fillColor: '#EDE7F6' },
              { text: 'Qt\u00e9',       style: 'label', fillColor: '#EDE7F6', alignment: 'center' as const },
              { text: 'Instructions', style: 'label', fillColor: '#EDE7F6' },
            ],
            ...medRows,
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#E0E0E0',
          vLineColor: () => '#E0E0E0',
        },
        style: 'tableau',
      },

      qrContent,

      // Signature
      {
        columns: [
          { width: '*', text: '' },
          {
            width: '42%',
            stack: [
              { text: `Fait \u00e0 ${data.structure.nom}`, fontSize: 10, marginBottom: 3 },
              { text: `Le ${data.ordonnance.date}`, fontSize: 10, marginBottom: 16 },
              ...sigStack,
              { text: `Dr. ${data.medecin.prenom} ${data.medecin.nom}`, style: 'label', marginTop: 4 },
              data.medecin.specialite ? { text: data.medecin.specialite, fontSize: 9, color: '#6B7280' } : {},
              data.medecin.numero_ordre ? { text: `Ordre N\u00b0 ${data.medecin.numero_ordre}`, fontSize: 8, color: '#9E9E9E', marginTop: 4 } : {},
              { text: 'Signature et cachet', fontSize: 8, color: '#9E9E9E', marginTop: 8 },
            ],
            alignment: 'center',
          } as any,
        ],
        style: 'signatureZone',
      },
    ],

    footer: (p, n) => buildFooter(p, n, dateGen),
    styles: STYLES_COMMUNS,
    pageSize: 'A4',
    pageMargins: PAGE_MARGINS,
  }

  return pdfToBuffer(def)
}

// ═══════════════════════════════════════════════════════════
// CERTIFICAT MÉDICAL
// ═══════════════════════════════════════════════════════════

export async function genererCertificatPDF(data: {
  structure: StructurePDF
  medecin:   MedecinPDF
  patient: {
    nom:             string
    prenom:          string
    date_naissance:  string
    numero_national: string
    sexe?:           string
  }
  certificat: {
    numero:         string
    date:           string
    type:           'arret_travail' | 'aptitude' | 'inaptitude' | 'constat' | 'hospitalisation' | 'vaccination' | 'deces' | 'autre'
    constat:        string
    duree_arret?:   number   // Jours si arret_travail
    motif?:         string
  }
}): Promise<Uint8Array> {

  const dateGen = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const [logoB64, sigB64] = await Promise.all([
    fetchImageAsBase64(data.structure.logo_url ?? ''),
    fetchImageAsBase64(data.medecin.signature_url ?? ''),
  ])

  const entete = await buildEntete(data.structure, logoB64)

  const typeLabel: Record<string, string> = {
    arret_travail:  "Certificat d'arr\u00eat de travail",
    aptitude:       "Certificat d'aptitude",
    inaptitude:     "Certificat d'inaptitude",
    constat:        'Certificat de constat m\u00e9dical',
    hospitalisation:"Certificat d'hospitalisation",
    vaccination:    'Certificat de vaccination',
    deces:          'Certificat de d\u00e9c\u00e8s',
    autre:          'Certificat m\u00e9dical',
  }

  const sigStack: Content[] = sigB64
    ? [{ image: sigB64, width: 110, height: 55 }]
    : [{ text: '\n\n', fontSize: 8 }]

  const def: TDocumentDefinitions = {
    content: [
      entete,
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#E0E0E0' }] },
      { text: 'CERTIFICAT M\u00c9DICAL', style: 'titreDocument' },
      { text: typeLabel[data.certificat.type] ?? 'Certificat m\u00e9dical',
        fontSize: 13, alignment: 'center', color: '#4A148C', marginBottom: 6 },
      { text: `N\u00b0 ${data.certificat.numero}`,
        fontSize: 11, alignment: 'center', color: '#6B7280', marginBottom: 24 },

      // Corps
      {
        stack: [
          {
            text: [
              { text: 'Je soussign\u00e9(e) ', fontSize: 12 },
              { text: `Dr. ${data.medecin.prenom} ${data.medecin.nom}`, fontSize: 12, bold: true },
              data.medecin.specialite ? { text: `, ${data.medecin.specialite}`, fontSize: 12 } : {} as any,
              data.medecin.numero_ordre ? { text: `, N\u00b0 Ordre ${data.medecin.numero_ordre}`, fontSize: 12 } : {} as any,
              { text: ',', fontSize: 12 },
            ],
            marginBottom: 12,
          },
          { text: 'certifie avoir examin\u00e9 ce jour :', fontSize: 12, marginBottom: 12 },
          {
            table: {
              widths: ['30%', '70%'],
              body: [
                [{ text: 'Nom et Pr\u00e9nom :', style: 'label' }, { text: `${data.patient.prenom} ${data.patient.nom}`, style: 'valeur' }],
                [{ text: 'N\u00e9(e) le :', style: 'label' }, { text: data.patient.date_naissance, style: 'valeur' }],
                [{ text: 'N\u00b0 National :', style: 'label' }, { text: data.patient.numero_national, style: 'valeur' }],
                data.patient.sexe ? [{ text: 'Sexe :', style: 'label' }, { text: data.patient.sexe === 'M' ? 'Masculin' : 'F\u00e9minin', style: 'valeur' }] : [] as any,
              ].filter(r => r.length > 0),
            },
            layout: 'noBorders',
            marginBottom: 16,
          },
          { text: 'et constate :', fontSize: 12, marginBottom: 8 },
          {
            text: data.certificat.constat,
            fontSize: 12,
            margin: [16, 8, 16, 16] as [number, number, number, number],
            italics: true,
            background: '#F9F5FF',
          },

          // Durée arrêt travail
          ...(data.certificat.type === 'arret_travail' && data.certificat.duree_arret
            ? [{
                text: [
                  { text: "Dur\u00e9e d'arr\u00eat de travail : ", fontSize: 12, bold: true },
                  { text: `${data.certificat.duree_arret} jour${data.certificat.duree_arret > 1 ? 's' : ''}`, fontSize: 12, color: '#B71C1C', bold: true },
                ],
                marginTop: 12, marginBottom: 12,
              }]
            : []),

          {
            text: "Certificat \u00e9tabli \u00e0 la demande de l'int\u00e9ress\u00e9(e) pour servir et valoir ce que de droit.",
            fontSize: 10, italics: true, color: '#6B7280', marginTop: 16,
          },
        ],
      },

      // Signature
      {
        columns: [
          { width: '*', text: '' },
          {
            width: '42%',
            stack: [
              { text: `Fait \u00e0 ${data.structure.nom}`, fontSize: 10, marginBottom: 3 },
              { text: `Le ${data.certificat.date}`, fontSize: 10, marginBottom: 16 },
              ...sigStack,
              { text: `Dr. ${data.medecin.prenom} ${data.medecin.nom}`, style: 'label', marginTop: 4 },
              data.medecin.specialite ? { text: data.medecin.specialite, fontSize: 9, color: '#6B7280' } : {},
              { text: 'Signature et cachet', fontSize: 8, color: '#9E9E9E', marginTop: 8 },
            ],
            alignment: 'center',
          } as any,
        ],
        style: 'signatureZone',
      },
    ],

    footer: (p, n) => buildFooter(p, n, dateGen),
    styles: STYLES_COMMUNS,
    pageSize: 'A4',
    pageMargins: PAGE_MARGINS,
  }

  return pdfToBuffer(def)
}

// ═══════════════════════════════════════════════════════════
// REÇU DE PAIEMENT
// ═══════════════════════════════════════════════════════════

export async function genererRecuPDF(data: {
  structure: StructurePDF
  patient: {
    nom:             string
    prenom:          string
    numero_national: string
  }
  facture: {
    numero:               string
    date:                 string
    total_ttc:            number
    montant_patient:      number
    montant_assurance:    number
    mode_paiement:        string
    reference_paiement?:  string
  }
  actes: Array<{
    designation:   string
    quantite:      number
    prix_unitaire: number
    total:         number
  }>
}): Promise<Uint8Array> {

  const dateGen = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const logoB64 = await fetchImageAsBase64(data.structure.logo_url ?? '')
  const entete  = await buildEntete(data.structure, logoB64)

  const fcfa = (n: number) => n.toLocaleString('fr-FR') + ' FCFA'

  const acteRows = data.actes.map(a => [
    { text: a.designation, fontSize: 10 },
    { text: String(a.quantite), fontSize: 10, alignment: 'center' as const },
    { text: fcfa(a.prix_unitaire), fontSize: 10, alignment: 'right' as const },
    { text: fcfa(a.total),         fontSize: 10, alignment: 'right' as const },
  ])

  const def: TDocumentDefinitions = {
    content: [
      entete,
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#E0E0E0' }] },
      { text: 'RE\u00c7U DE PAIEMENT', style: 'titreDocument' },

      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Patient', style: 'sousTitre' },
              { text: `${data.patient.prenom} ${data.patient.nom}`, fontSize: 12, marginBottom: 3 },
              { text: `N\u00b0 ${data.patient.numero_national}`, fontSize: 10, color: '#6B7280' },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Facture', style: 'sousTitre' },
              { text: `N\u00b0 ${data.facture.numero}`, fontSize: 12, marginBottom: 3 },
              { text: `Date : ${data.facture.date}`, fontSize: 10, color: '#6B7280' },
            ],
            alignment: 'right',
          },
        ],
        marginBottom: 20,
      },

      { text: 'D\u00e9tail des prestations', style: 'sousTitre' },
      {
        table: {
          headerRows: 1,
          widths: ['50%', '12%', '20%', '18%'],
          body: [
            [
              { text: 'D\u00e9signation', style: 'label', fillColor: '#EDE7F6' },
              { text: 'Qt\u00e9', style: 'label', fillColor: '#EDE7F6', alignment: 'center' as const },
              { text: 'P.U. (FCFA)', style: 'label', fillColor: '#EDE7F6', alignment: 'right' as const },
              { text: 'Total (FCFA)', style: 'label', fillColor: '#EDE7F6', alignment: 'right' as const },
            ],
            ...acteRows,
            // Totaux
            ['', '', { text: 'Total TTC :', style: 'label', alignment: 'right' as const },
              { text: fcfa(data.facture.total_ttc), style: 'label', alignment: 'right' as const, fillColor: '#EDE7F6' }],
            ['', '', { text: 'Part assurance :', fontSize: 10, alignment: 'right' as const },
              { text: fcfa(data.facture.montant_assurance), fontSize: 10, alignment: 'right' as const }],
            ['', '', { text: 'Part patient :', style: 'label', alignment: 'right' as const },
              { text: fcfa(data.facture.montant_patient), fontSize: 12, bold: true, alignment: 'right' as const, color: '#B71C1C' }],
          ],
        },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          hLineColor: () => '#E0E0E0', vLineColor: () => '#E0E0E0',
        },
        style: 'tableau',
      },

      {
        margin: [0, 16, 0, 0] as [number, number, number, number],
        table: {
          widths: ['40%', '60%'],
          body: [
            [{ text: 'Mode de paiement :', style: 'label' }, { text: data.facture.mode_paiement, style: 'valeur' }],
            ...(data.facture.reference_paiement
              ? [[{ text: 'R\u00e9f\u00e9rence :', style: 'label' }, { text: data.facture.reference_paiement, style: 'valeur' }]]
              : []),
          ],
        },
        layout: 'noBorders',
      },

      {
        text: 'Ce re\u00e7u tient lieu de quittance. \u00c0 conserver pr\u00e9cieusement.',
        fontSize: 10, italics: true, color: '#6B7280', marginTop: 28, alignment: 'center',
      },
    ],

    footer: (p, n) => buildFooter(p, n, dateGen),
    styles: STYLES_COMMUNS,
    pageSize: 'A4',
    pageMargins: PAGE_MARGINS,
  }

  return pdfToBuffer(def)
}

// ═══════════════════════════════════════════════════════════
// BULLETIN D'EXAMEN (Laboratoire / Radiologie)
// ═══════════════════════════════════════════════════════════

export async function genererBulletinExamenPDF(data: {
  structure:            StructurePDF
  medecin_prescripteur: MedecinPDF
  patient: {
    nom:             string
    prenom:          string
    date_naissance:  string
    numero_national: string
  }
  examen: {
    numero:              string
    type:                'laboratoire' | 'radiologie'
    date_prelevement:    string
    date_resultat:       string
    nom_examen:          string   // ← colonne correcte (pas type_examen)
    indication_clinique?: string
  }
  resultats: Array<{
    parametre:        string
    valeur:           string
    unite?:           string
    valeurs_normales?: string
    interpretation?: 'normal' | 'anormal' | 'critique'
  }>
  conclusion?:    string
  technicien_nom?: string
}): Promise<Uint8Array> {

  const dateGen = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const logoB64 = await fetchImageAsBase64(data.structure.logo_url ?? '')
  const entete  = await buildEntete(data.structure, logoB64)

  const resultatRows = data.resultats.map(r => [
    { text: r.parametre, fontSize: 10 },
    {
      text:  r.valeur,
      fontSize: 10, alignment: 'center' as const,
      bold:  r.interpretation === 'anormal' || r.interpretation === 'critique',
      color: r.interpretation === 'critique' ? '#B71C1C'
           : r.interpretation === 'anormal'  ? '#E65100'
           : '#1A1A2E',
    },
    { text: r.unite ?? '—', fontSize: 10, alignment: 'center' as const },
    { text: r.valeurs_normales ?? '—', fontSize: 9, alignment: 'center' as const, color: '#6B7280' },
    {
      text:  r.interpretation === 'critique' ? '!!'
           : r.interpretation === 'anormal'  ? '!'
           : 'OK',
      fontSize: 9, alignment: 'center' as const, bold: true,
      color: r.interpretation === 'critique' ? '#B71C1C'
           : r.interpretation === 'anormal'  ? '#E65100'
           : '#1A6B3C',
    },
  ])

  const def: TDocumentDefinitions = {
    content: [
      entete,
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#E0E0E0' }] },
      {
        text: data.examen.type === 'laboratoire'
          ? "BULLETIN D'ANALYSE BIOLOGIQUE"
          : "COMPTE-RENDU D'IMAGERIE M\u00c9DICALE",
        style: 'titreDocument',
      },
      { text: `N\u00b0 ${data.examen.numero}`, fontSize: 12, alignment: 'center', color: '#6B7280', marginBottom: 16 },

      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Patient', style: 'sousTitre' },
              { table: { widths: ['38%', '62%'], body: [
                [{ text: 'Nom / Pr\u00e9nom :', style: 'label' }, { text: `${data.patient.prenom} ${data.patient.nom}`, style: 'valeur' }],
                [{ text: 'N\u00e9(e) le :', style: 'label' }, { text: data.patient.date_naissance, style: 'valeur' }],
                [{ text: 'N\u00b0 National :', style: 'label' }, { text: data.patient.numero_national, style: 'valeur' }],
              ]}, layout: 'noBorders' },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Prescription', style: 'sousTitre' },
              { table: { widths: ['42%', '58%'], body: [
                [{ text: 'Prescripteur :', style: 'label' }, { text: `Dr. ${data.medecin_prescripteur.nom}`, style: 'valeur' }],
                [{ text: 'Examen :', style: 'label' }, { text: data.examen.nom_examen, style: 'valeur' }],
                [{ text: 'Pr\u00e9l\u00e8vement :', style: 'label' }, { text: data.examen.date_prelevement, style: 'valeur' }],
                [{ text: 'R\u00e9sultat :', style: 'label' }, { text: data.examen.date_resultat, style: 'valeur' }],
              ]}, layout: 'noBorders' },
            ],
          },
        ],
        columnGap: 20,
        marginBottom: 16,
      },

      ...(data.examen.indication_clinique
        ? [{ text: 'Indication clinique', style: 'sousTitre' } as Content,
           { text: data.examen.indication_clinique, fontSize: 11, italics: true, color: '#374151', marginBottom: 12 } as Content]
        : []),

      { text: 'R\u00e9sultats', style: 'sousTitre' },
      {
        table: {
          headerRows: 1,
          widths: ['30%', '18%', '14%', '24%', '14%'],
          body: [
            [
              { text: 'Param\u00e8tre',      style: 'label', fillColor: '#EDE7F6' },
              { text: 'Valeur',           style: 'label', fillColor: '#EDE7F6', alignment: 'center' as const },
              { text: 'Unit\u00e9',         style: 'label', fillColor: '#EDE7F6', alignment: 'center' as const },
              { text: 'Valeurs normales', style: 'label', fillColor: '#EDE7F6', alignment: 'center' as const },
              { text: 'Statut',           style: 'label', fillColor: '#EDE7F6', alignment: 'center' as const },
            ],
            ...resultatRows,
          ],
        },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#E0E0E0', vLineColor: () => '#E0E0E0' },
        style: 'tableau',
      },

      ...(data.conclusion
        ? [
            { text: 'Conclusion', style: 'sousTitre' } as Content,
            { text: data.conclusion, fontSize: 11, italics: true, background: '#FFF9E6', margin: [10, 6, 10, 14] as [number,number,number,number] } as Content,
          ]
        : []),

      ...(data.technicien_nom
        ? [{
            columns: [
              { width: '*', text: '' },
              {
                width: '42%',
                stack: [
                  { text: `Fait \u00e0 ${data.structure.nom}`, fontSize: 10, marginBottom: 3 },
                  { text: `Le ${data.examen.date_resultat}`, fontSize: 10, marginBottom: 16 },
                  { text: '\n', fontSize: 8 },
                  { text: data.technicien_nom, style: 'label', marginTop: 4 },
                  { text: data.examen.type === 'laboratoire' ? 'Biologiste' : 'Radiologue', fontSize: 9, color: '#6B7280' },
                  { text: 'Signature et cachet', fontSize: 8, color: '#9E9E9E', marginTop: 8 },
                ],
                alignment: 'center',
              } as any,
            ],
            style: 'signatureZone',
          } as Content]
        : []),
    ],

    footer: (p, n) => buildFooter(p, n, dateGen),
    styles: STYLES_COMMUNS,
    pageSize: 'A4',
    pageMargins: PAGE_MARGINS,
  }

  return pdfToBuffer(def)
}
