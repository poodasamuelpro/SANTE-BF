// JavaScript global SantéBF
// Fonctions utilitaires côté client

console.log('🏥 SanteBF v1.0 — Système National de Santé Numérique')

// Confirmation avant suppression
function confirmerSuppression(message) {
  return confirm(message || 'Êtes-vous sûr de vouloir supprimer cet élément ?')
}

// Spinner sur soumission formulaires
document.addEventListener('DOMContentLoaded', () => {
  // Auto-focus premier champ de formulaire
  const firstInput = document.querySelector('form input:not([type="hidden"]), form select, form textarea')
  if (firstInput) {
    firstInput.focus()
  }

  // Spinner sur boutons submit
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
      const submitBtn = form.querySelector('button[type="submit"]')
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.disabled = true
        const originalText = submitBtn.textContent
        submitBtn.innerHTML = '<span style="display:inline-block;animation:spin 0.7s linear infinite">⏳</span> Traitement...'
        
        // Restaurer après 10s si pas de réponse
        setTimeout(() => {
          if (submitBtn.disabled) {
            submitBtn.disabled = false
            submitBtn.textContent = originalText
          }
        }, 10000)
      }
    })
  })
})

// Animation spin
const style = document.createElement('style')
style.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`
document.head.appendChild(style)

// Formatage des nombres
function formatFCFA(montant) {
  return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA'
}

// Copier dans le presse-papier
async function copierTexte(texte) {
  try {
    await navigator.clipboard.writeText(texte)
    alert('✅ Copié dans le presse-papier')
  } catch (err) {
    // Fallback pour anciens navigateurs
    const textarea = document.createElement('textarea')
    textarea.value = texte
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    alert('✅ Copié')
  }
}

// Imprimer la page
function imprimerPage() {
  window.print()
}
