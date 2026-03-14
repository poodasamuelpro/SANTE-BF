// Composant tableau HTML réutilisable avec tri et recherche

export function tableHTML(
  colonnes: Array<{ label: string; key: string }>,
  lignes: any[],
  options?: {
    triable?: boolean
    recherchable?: boolean
    actions?: (row: any) => string
    emptyMessage?: string
  }
): string {
  const { triable = false, recherchable = false, actions, emptyMessage = 'Aucune donnée disponible' } = options ?? {}

  const tableId = `table_${Math.random().toString(36).substring(7)}`
  const searchId = `search_${tableId}`

  return `
<style>
  .table-container {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
    margin: 20px 0;
  }
  ${recherchable ? `
  .table-search {
    padding: 16px 20px;
    border-bottom: 1px solid #E5E7EB;
  }
  .table-search input {
    width: 100%;
    max-width: 400px;
    padding: 10px 14px 10px 38px;
    border: 1.5px solid #E5E7EB;
    border-radius: 8px;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.2s;
    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="gray"><path d="M11.5 10.5l3 3m-7-2a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"/></svg>') no-repeat 12px center;
  }
  .table-search input:focus {
    border-color: #1A6B3C;
  }
  ` : ''}
  .table-wrapper {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  thead tr {
    background: #F9FAFB;
  }
  thead th {
    padding: 14px 16px;
    text-align: left;
    font-size: 12px;
    font-weight: 700;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #E5E7EB;
  }
  ${triable ? `
  thead th.sortable {
    cursor: pointer;
    user-select: none;
    position: relative;
    padding-right: 28px;
  }
  thead th.sortable:hover {
    background: #F3F4F6;
  }
  thead th.sortable::after {
    content: '⇅';
    position: absolute;
    right: 10px;
    opacity: 0.3;
  }
  thead th.sortable.sorted-asc::after {
    content: '↑';
    opacity: 1;
  }
  thead th.sortable.sorted-desc::after {
    content: '↓';
    opacity: 1;
  }
  ` : ''}
  tbody tr {
    border-bottom: 1px solid #E5E7EB;
    transition: background 0.15s;
  }
  tbody tr:hover {
    background: #F9FAFB;
  }
  tbody tr:last-child {
    border-bottom: none;
  }
  tbody td {
    padding: 14px 16px;
    font-size: 14px;
    color: #1A1A2E;
  }
  tbody td.empty-state {
    text-align: center;
    padding: 48px 20px;
    color: #9CA3AF;
    font-style: italic;
  }
  .table-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .btn-table {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    transition: transform 0.1s;
  }
  .btn-table:hover {
    transform: scale(1.05);
  }
  .btn-table.primary {
    background: #1A6B3C;
    color: white;
  }
  .btn-table.secondary {
    background: #E5E7EB;
    color: #6B7280;
  }
  .btn-table.danger {
    background: #FEE2E2;
    color: #B71C1C;
  }
</style>

<div class="table-container">
  ${recherchable ? `
  <div class="table-search">
    <input
      type="text"
      id="${searchId}"
      placeholder="🔍 Rechercher dans le tableau..."
      onkeyup="filterTable${tableId}()"
    >
  </div>
  ` : ''}
  
  <div class="table-wrapper">
    <table id="${tableId}">
      <thead>
        <tr>
          ${colonnes.map(col => `<th ${triable ? `class="sortable" onclick="sortTable${tableId}('${col.key}')"` : ''}>${col.label}</th>`).join('\n          ')}
          ${actions ? '<th>Actions</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${lignes.length === 0
          ? `<tr><td class="empty-state" colspan="${colonnes.length + (actions ? 1 : 0)}">${emptyMessage}</td></tr>`
          : lignes.map(row => `
          <tr>
            ${colonnes.map(col => `<td>${row[col.key] ?? '—'}</td>`).join('\n            ')}
            ${actions ? `<td><div class="table-actions">${actions(row)}</div></td>` : ''}
          </tr>`).join('\n        ')
        }
      </tbody>
    </table>
  </div>
</div>

${recherchable ? `
<script>
function filterTable${tableId}() {
  const input = document.getElementById('${searchId}')
  const filter = input.value.toLowerCase()
  const table = document.getElementById('${tableId}')
  const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr')
  
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].getElementsByTagName('td')
    let found = false
    for (let j = 0; j < cells.length; j++) {
      const text = cells[j].textContent || cells[j].innerText
      if (text.toLowerCase().indexOf(filter) > -1) {
        found = true
        break
      }
    }
    rows[i].style.display = found ? '' : 'none'
  }
}
</script>
` : ''}

${triable ? `
<script>
let sortDirection${tableId} = {}
function sortTable${tableId}(key) {
  const table = document.getElementById('${tableId}')
  const tbody = table.getElementsByTagName('tbody')[0]
  const rows = Array.from(tbody.getElementsByTagName('tr'))
  
  const direction = sortDirection${tableId}[key] === 'asc' ? 'desc' : 'asc'
  sortDirection${tableId} = { [key]: direction }
  
  const colIndex = ${JSON.stringify(colonnes)}.findIndex(c => c.key === key)
  
  rows.sort((a, b) => {
    const aText = a.getElementsByTagName('td')[colIndex].textContent.trim()
    const bText = b.getElementsByTagName('td')[colIndex].textContent.trim()
    
    const aNum = parseFloat(aText.replace(/[^0-9.-]/g, ''))
    const bNum = parseFloat(bText.replace(/[^0-9.-]/g, ''))
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return direction === 'asc' ? aNum - bNum : bNum - aNum
    }
    
    return direction === 'asc'
      ? aText.localeCompare(bText, 'fr')
      : bText.localeCompare(aText, 'fr')
  })
  
  rows.forEach(row => tbody.appendChild(row))
  
  const headers = table.querySelectorAll('th.sortable')
  headers.forEach(h => {
    h.classList.remove('sorted-asc', 'sorted-desc')
  })
  headers[colIndex].classList.add(direction === 'asc' ? 'sorted-asc' : 'sorted-desc')
}
</script>
` : ''}
  `.trim()
}
