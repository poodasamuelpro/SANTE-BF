// Composant alertes (succès, erreur, warning, info)
export function alertHTML(type: 'success'|'error'|'warning'|'info', message: string): string {
  const styles = {
    success: 'background:#E8F5E9;border-color:#1A6B3C;color:#1A6B3C',
    error:   'background:#FFEBEE;border-color:#C62828;color:#C62828',
    warning: 'background:#FFFDE7;border-color:#F9A825;color:#E65100',
    info:    'background:#E3F2FD;border-color:#1565C0;color:#1565C0',
  }
  const icones = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' }
  return `<div style="padding:12px 16px;border-left:4px solid;border-radius:8px;${styles[type]};margin-bottom:16px">
    ${icones[type]} ${message}
  </div>`
}
