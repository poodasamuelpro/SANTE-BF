import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware/auth'
import { getSupabase } from '../lib/supabase'
import type { AuthProfile } from '../lib/supabase'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }

export const medecinRoutes = new Hono<{ Bindings: Bindings }>()

medecinRoutes.use(
  '/*',
  requireAuth,
  requireRole('medecin', 'infirmier', 'sage_femme', 'laborantin', 'radiologue')
)

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// HELPERS GLOBAUX
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
}

function calcAge(ddn: string): number {
  return Math.floor((Date.now() - new Date(ddn).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR')
}

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

// Alerte constantes anormales
function alerteConstante(
  tension_sys?: number | null,
  tension_dia?: number | null,
  temperature?: number | null,
  spo2?: number | null,
  glycemie?: number | null
): string {
  const alertes: string[] = []
  if (tension_sys && tension_sys >= 160) alertes.push('Tension systolique &#x26A0;&#xFE0F; ' + tension_sys + ' mmHg (critique)')
  else if (tension_sys && tension_sys >= 140) alertes.push('Tension syst. &#x26A0;&#xFE0F; ' + tension_sys + ' mmHg (&#xe9;lev&#xe9;e)')
  if (tension_dia && tension_dia >= 100) alertes.push('Tension diast. &#x26A0;&#xFE0F; ' + tension_dia + ' mmHg (&#xe9;lev&#xe9;e)')
  if (temperature && temperature >= 39) alertes.push('Temp&#xe9;rature &#x1F321;&#xFE0F; ' + temperature + ' &#xb0;C (fi&#xe8;vre)')
  if (spo2 && spo2 < 94) alertes.push('SpO2 &#x1F6A8; ' + spo2 + '% (hypox&#xe9;mie)')
  if (glycemie && glycemie >= 2.0) alertes.push('Glyc&#xe9;mie &#x26A0;&#xFE0F; ' + glycemie + ' g/L (hyperglyc&#xe9;mie)')
  if (alertes.length === 0) return ''
  return `<div style="background:#FFF5F5;border-left:4px solid #B71C1C;padding:12px 16px;
    border-radius:8px;margin-bottom:16px;font-size:13px;color:#B71C1C">
    <strong>&#x26A0;&#xFE0F; Constantes anormales :</strong><br>
    ${alertes.join('<br>')}
  </div>`
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// CSS COMMUN
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

const CSS = `<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:#F7F8FA;min-height:100vh}
header{background:#4A148C;padding:0 24px;height:60px;display:flex;align-items:center;
  justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.15)}
.hl{display:flex;align-items:center;gap:12px}
.logo-wrap{display:flex;align-items:center;gap:12px;text-decoration:none}
.logo{width:34px;height:34px;background:white;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px}
.ht{font-family:'DM Serif Display',serif;font-size:18px;color:white}
.ht span{font-family:'DM Sans',sans-serif;font-size:11px;opacity:.7;display:block}
.hr{display:flex;align-items:center;gap:10px}
.ub{background:rgba(255,255,255,.15);border-radius:8px;padding:6px 12px}
.ub strong{display:block;font-size:13px;color:white}
.ub small{font-size:11px;color:rgba(255,255,255,.7)}
.logout{background:rgba(255,255,255,.2);color:white;border:none;padding:8px 14px;border-radius:8px;
  font-size:13px;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif}
.avatar-header{width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.4)}
.container{max-width:1100px;margin:0 auto;padding:28px 20px}
.page-title{font-family:'DM Serif Display',serif;font-size:26px;color:#1A1A2E;margin-bottom:4px}
.breadcrumb{font-size:13px;color:#6B7280;margin-bottom:16px}
.breadcrumb a{color:#4A148C;text-decoration:none}
.alerte-err{background:#FFF5F5;border-left:4px solid #C62828;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#C62828}
.alerte-ok{background:#E8F5E9;border-left:4px solid #1A6B3C;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#1A6B3C}
.btn{background:#4A148C;color:white;padding:10px 20px;border:none;border-radius:8px;
  font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;display:inline-block}
.btn-vert{background:#1A6B3C;color:white;padding:10px 20px;border:none;border-radius:8px;
  font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;display:inline-block}
.btn-bleu{background:#1565C0;color:white;padding:10px 20px;border:none;border-radius:8px;
  font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;display:inline-block}
.btn-grey{background:#F3F4F6;color:#374151;padding:10px 20px;border:none;border-radius:8px;
  font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;display:inline-block}
.btn-red{background:#B71C1C;color:white;padding:8px 14px;border:none;border-radius:8px;
  font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'DM Sans',sans-serif;display:inline-block}
.btn-sm{display:inline-block;background:#4A148C;color:white;padding:5