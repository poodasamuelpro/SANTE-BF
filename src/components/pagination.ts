// Composant pagination HTML pour listes longues

export function paginationHTML(
  pageActuelle: number,
  totalPages: number,
  baseUrl: string
): string {
  if (totalPages <= 1) return ''

  const pages: string[] = []
  const maxVisible = 7

  // Bouton Précédent
  if (pageActuelle > 1) {
    pages.push(`<a href="${baseUrl}?page=${pageActuelle - 1}" class="pg-btn pg-prev">← Précédent</a>`)
  } else {
    pages.push(`<span class="pg-btn pg-disabled">← Précédent</span>`)
  }

  // Toujours afficher première page
  pages.push(
    pageActuelle === 1
      ? `<span class="pg-num pg-active">1</span>`
      : `<a href="${baseUrl}?page=1" class="pg-num">1</a>`
  )

  // Logique d'ellipse
  let startPage = Math.max(2, pageActuelle - 2)
  let endPage = Math.min(totalPages - 1, pageActuelle + 2)

  if (pageActuelle <= 4) {
    endPage = Math.min(maxVisible - 1, totalPages - 1)
  }
  if (pageActuelle >= totalPages - 3) {
    startPage = Math.max(2, totalPages - maxVisible + 2)
  }

  // Ellipse début
  if (startPage > 2) {
    pages.push(`<span class="pg-ellipsis">...</span>`)
  }

  // Pages du milieu
  for (let i = startPage; i <= endPage; i++) {
    if (i === pageActuelle) {
      pages.push(`<span class="pg-num pg-active">${i}</span>`)
    } else {
      pages.push(`<a href="${baseUrl}?page=${i}" class="pg-num">${i}</a>`)
    }
  }

  // Ellipse fin
  if (endPage < totalPages - 1) {
    pages.push(`<span class="pg-ellipsis">...</span>`)
  }

  // Dernière page
  if (totalPages > 1) {
    pages.push(
      pageActuelle === totalPages
        ? `<span class="pg-num pg-active">${totalPages}</span>`
        : `<a href="${baseUrl}?page=${totalPages}" class="pg-num">${totalPages}</a>`
    )
  }

  // Bouton Suivant
  if (pageActuelle < totalPages) {
    pages.push(`<a href="${baseUrl}?page=${pageActuelle + 1}" class="pg-btn pg-next">Suivant →</a>`)
  } else {
    pages.push(`<span class="pg-btn pg-disabled">Suivant →</span>`)
  }

  return `
<style>
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: 32px 0;
    flex-wrap: wrap;
  }
  .pg-btn, .pg-num {
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    transition: background 0.2s, color 0.2s;
  }
  .pg-btn {
    background: #1A6B3C;
    color: white;
  }
  .pg-btn:hover {
    background: #2E8B57;
  }
  .pg-btn.pg-disabled {
    background: #E5E7EB;
    color: #9CA3AF;
    cursor: not-allowed;
  }
  .pg-num {
    background: white;
    color: #6B7280;
    border: 1px solid #E5E7EB;
    min-width: 40px;
    text-align: center;
  }
  .pg-num:hover {
    background: #F3F4F6;
    border-color: #1A6B3C;
    color: #1A6B3C;
  }
  .pg-num.pg-active {
    background: #1A6B3C;
    color: white;
    border-color: #1A6B3C;
    cursor: default;
  }
  .pg-ellipsis {
    color: #9CA3AF;
    padding: 0 8px;
    font-size: 16px;
  }
</style>
<div class="pagination">
  ${pages.join('\n  ')}
</div>`
}
