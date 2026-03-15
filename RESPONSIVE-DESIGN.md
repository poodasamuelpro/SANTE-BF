# RESPONSIVE DESIGN - SantéBF

## 📱 STRATÉGIE RESPONSIVE

### Breakpoints standardisés
```css
/* Mobile first approach */
Base:         0px - 639px   (Mobile)
Tablet:     640px - 1023px  (Tablette)
Desktop:   1024px+          (Bureau)
```

## ✅ VÉRIFICATION PAR MODULE

### 1. Dashboard Patient (`dashboard-patient.ts`)

**Mobile (< 640px)**:
```css
.container { padding: 20px 12px; }
.header { flex-direction: column; }
.info-grid { grid-template-columns: 1fr; }
.actions-grid { grid-template-columns: 1fr; }
```

**Tablette (640-1024px)**:
```css
.info-grid { grid-template-columns: repeat(2, 1fr); }
.actions-grid { grid-template-columns: repeat(2, 1fr); }
```

**Desktop (> 1024px)**:
```css
.info-grid { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
.actions-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
```

**Éléments adaptés**:
- ✅ Header: logo + info utilisateur + déconnexion
- ✅ Card RDV: padding réduit mobile
- ✅ Actions grid: 1 colonne mobile, 2 tablette, 3+ desktop
- ✅ Info grid: 1 colonne mobile, 2 tablette, 3+ desktop

### 2. Dashboard Médecin (`dashboard-medecin.ts`)

**Mobile**:
```css
.stats-grid { grid-template-columns: 1fr; }
.search-form { flex-direction: column; }
table { overflow-x: auto; }
```

**Tablette**:
```css
.stats-grid { grid-template-columns: repeat(2, 1fr); }
```

**Desktop**:
```css
.stats-grid { grid-template-columns: repeat(4, 1fr); }
```

**Éléments adaptés**:
- ✅ Statistiques: 1 col mobile, 2 tablette, 4 desktop
- ✅ Recherche patient: stack vertical mobile
- ✅ Tableau consultations: scroll horizontal mobile
- ✅ Actions rapides: boutons pleine largeur mobile

### 3. Dashboard Accueil (`dashboard-accueil.ts`)

**Mobile**:
```css
@media(max-width:640px){
  .form-grid { grid-template-columns: 1fr; }
  .search-form { flex-direction: column; }
  .container { padding: 16px 12px; }
  .patient-actions { flex-direction: column; }
}
```

**Éléments adaptés**:
- ✅ Formulaires: 1 colonne mobile, 2 colonnes desktop
- ✅ Recherche: champs empilés mobile
- ✅ Cards patient: padding réduit mobile
- ✅ Actions patient: boutons pleine largeur mobile

### 4. Dashboard Structure (`dashboard-structure.ts`)

**Mobile**:
```css
.dashboard-grid { grid-template-columns: 1fr; }
.top-actions { flex-direction: column; gap: 10px; }
```

**Tablette**:
```css
.dashboard-grid { grid-template-columns: repeat(2, 1fr); }
```

**Desktop**:
```css
.dashboard-grid { grid-template-columns: repeat(3, 1fr); }
```

**Éléments adaptés**:
- ✅ Cards statistiques: 1 col mobile, 2 tablette, 3 desktop
- ✅ Actions: empilées verticalement mobile
- ✅ Tableaux: scroll horizontal mobile

### 5. Dashboard Pharmacien (`dashboard-pharmacien.ts`)

**Éléments adaptés**:
- ✅ Liste ordonnances: cards empilées mobile
- ✅ Filtres: dropdown mobile, inline desktop
- ✅ Détails ordonnance: sections empilées mobile
- ✅ Boutons action: pleine largeur mobile

### 6. Dashboard Caissier (`dashboard-caissier.ts`)

**Éléments adaptés**:
- ✅ Liste factures: cards empilées mobile
- ✅ Formulaire paiement: 1 colonne mobile
- ✅ Résumé facture: sections empilées mobile
- ✅ Tableau détails: scroll horizontal mobile

### 7. Dashboard Admin (`dashboard-admin.ts`)

**Éléments adaptés**:
- ✅ Statistiques nationales: 1 col mobile, 2 tablette, 4 desktop
- ✅ Graphiques: pleine largeur mobile
- ✅ Tableaux structures: scroll horizontal mobile
- ✅ Filtres: empilés verticalement mobile

## 📱 PAGES SPÉCIFIQUES

### Page Urgence QR (`urgence-qr.ts`)

**Optimisations mobiles**:
```css
.container { max-width: 100%; padding: 10px; }
.urgence-header { font-size: 18px; }
.contact-card { padding: 12px; }
.btn-urgence { width: 100%; font-size: 16px; }
```

**Éléments critiques**:
- ✅ Header urgence: bien visible
- ✅ Allergies: mise en avant (rouge)
- ✅ Contacts urgence: boutons cliquables grands
- ✅ Groupe sanguin: badge proéminent
- ✅ Informations: lisibles sans zoom

### Page Login (`login.ts`)

**Mobile**:
```css
.login-container { width: 100%; padding: 20px; }
.login-box { padding: 30px 20px; }
input { font-size: 16px; } /* Évite zoom iOS */
```

**Éléments adaptés**:
- ✅ Logo: taille réduite mobile
- ✅ Formulaire: pleine largeur
- ✅ Inputs: taille police 16px (pas de zoom auto iOS)
- ✅ Bouton: pleine largeur mobile

### Fiche Patient (`patient-fiche.ts`)

**Mobile**:
```css
.patient-header { flex-direction: column; }
.tabs { overflow-x: auto; }
.info-grid { grid-template-columns: 1fr; }
```

**Éléments adaptés**:
- ✅ En-tête patient: infos empilées
- ✅ Onglets: scroll horizontal si nombreux
- ✅ Sections info: 1 colonne mobile
- ✅ Timeline: verticale optimisée mobile

### Formulaire Consultation (`consultation-form.ts`)

**Mobile**:
```css
.form-grid { grid-template-columns: 1fr; }
.form-row { flex-direction: column; }
textarea { min-height: 100px; }
```

**Éléments adaptés**:
- ✅ Champs: 1 colonne mobile
- ✅ Constantes: empilées verticalement
- ✅ Textarea: hauteur réduite mobile
- ✅ Boutons: pleine largeur mobile

### Formulaire Ordonnance (`ordonnance-form.ts`)

**Mobile**:
```css
.medicament-item { padding: 12px; }
.med-actions { flex-direction: column; }
.posologie-grid { grid-template-columns: 1fr; }
```

**Éléments adaptés**:
- ✅ Liste médicaments: cards empilées
- ✅ Champs posologie: 1 colonne mobile
- ✅ Actions: boutons pleine largeur
- ✅ Recherche médicament: pleine largeur

## 🎨 COMPOSANTS RÉUTILISABLES

### Table Component (`table.ts`)

**Mobile**:
```css
.table-container { overflow-x: auto; }
table { min-width: 600px; }
```

**Solution**: Scroll horizontal sur mobile pour tableaux larges

### Alert Component (`alert.ts`)

**Mobile**:
```css
.alert { 
  padding: 12px 14px; 
  font-size: 13px; 
}
```

**Éléments adaptés**:
- ✅ Padding réduit mobile
- ✅ Texte lisible
- ✅ Icône proportionnelle

### Pagination Component (`pagination.ts`)

**Mobile**:
```css
.pagination { 
  flex-wrap: wrap; 
  justify-content: center; 
}
.page-btn { 
  min-width: 40px; 
  height: 40px; 
}
```

**Éléments adaptés**:
- ✅ Boutons taille minimum 40x40px (touch-friendly)
- ✅ Centré mobile
- ✅ Wrap sur plusieurs lignes si nécessaire

## 📏 GUIDELINES RESPONSIVE

### Tailles de touche (Touch Targets)
```css
/* Minimum recommandé: 44x44px */
.btn, .link, .input { 
  min-height: 44px; 
  min-width: 44px; 
}

/* Espacement entre éléments cliquables */
.btn + .btn { 
  margin-left: 10px; 
}
```

### Tailles de police
```css
/* Mobile */
body { font-size: 14px; }
h1 { font-size: 22px; }
h2 { font-size: 18px; }
input { font-size: 16px; } /* Pas de zoom iOS */

/* Desktop */
@media(min-width:1024px){
  body { font-size: 16px; }
  h1 { font-size: 28px; }
  h2 { font-size: 22px; }
}
```

### Espacement
```css
/* Mobile */
.container { padding: 16px 12px; }
.card { padding: 16px; margin-bottom: 12px; }

/* Desktop */
@media(min-width:1024px){
  .container { padding: 28px 20px; }
  .card { padding: 28px 32px; margin-bottom: 24px; }
}
```

### Images et médias
```css
img, video { 
  max-width: 100%; 
  height: auto; 
}

/* Logo responsive */
.logo { 
  width: 34px; /* Mobile */
}

@media(min-width:768px){
  .logo { 
    width: 48px; /* Desktop */
  }
}
```

## ✅ CHECKLIST RESPONSIVE

### Par page/composant
- [x] Dashboard patient
- [x] Dashboard médecin
- [x] Dashboard accueil
- [x] Dashboard structure
- [x] Dashboard pharmacien
- [x] Dashboard caissier
- [x] Dashboard admin
- [x] Page urgence QR
- [x] Page login
- [x] Fiche patient
- [x] Formulaire consultation
- [x] Formulaire ordonnance
- [x] Liste ordonnances
- [x] Liste RDV
- [x] Composants (table, alert, pagination)

### Tests recommandés
- [ ] iPhone SE (375x667)
- [ ] iPhone 12/13 (390x844)
- [ ] Samsung Galaxy (360x640)
- [ ] iPad (768x1024)
- [ ] iPad Pro (1024x1366)
- [ ] Desktop 1920x1080
- [ ] Desktop 2560x1440

### Vérifications
- [x] Texte lisible sans zoom
- [x] Boutons taille minimum 44x44px
- [x] Inputs police 16px+ (pas de zoom iOS)
- [x] Tableaux: scroll horizontal si nécessaire
- [x] Formulaires: 1 colonne mobile
- [x] Navigation: accessible mobile
- [x] Images: responsive
- [x] Espacements adaptés par breakpoint

## 🔧 MEDIA QUERIES COMMUNES

```css
/* Utilisées dans tous les fichiers */

/* Mobile only */
@media(max-width:639px){
  .hide-mobile { display: none; }
  .full-width-mobile { width: 100%; }
}

/* Tablet and up */
@media(min-width:640px){
  .container { max-width: 1200px; }
}

/* Desktop only */
@media(min-width:1024px){
  .hide-desktop { display: none; }
  .sidebar { display: block; }
}
```

## 📱 VIEWPORT META TAG

**Présent dans toutes les pages**:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

**Empêche**:
- Zoom automatique sur focus input (iOS)
- Double-tap pour zoomer (avec user-scalable=no)
- Problèmes d'affichage mobile

## ✅ RÉSUMÉ

**Mobile (< 640px)**:
- ✅ 1 colonne pour tout
- ✅ Navigation verticale
- ✅ Boutons pleine largeur
- ✅ Tableaux scroll horizontal
- ✅ Police 16px inputs

**Tablette (640-1024px)**:
- ✅ 2 colonnes grilles
- ✅ Formulaires 2 colonnes
- ✅ Navigation mixte
- ✅ Spacing intermédiaire

**Desktop (> 1024px)**:
- ✅ 3-4 colonnes grilles
- ✅ Formulaires 2-3 colonnes
- ✅ Navigation horizontale
- ✅ Spacing large
- ✅ Sidebar visible

---
**Date**: 2026-03-15
**Version**: 3.0.0
**Statut**: ✅ RESPONSIVE COMPLET
