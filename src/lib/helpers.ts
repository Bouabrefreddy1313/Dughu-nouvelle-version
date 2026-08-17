// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS PARTAGÉS — DUGHU
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule l'écart entre une date et maintenant en texte français.
 * Exemples : "à l'instant", "il y a 5 min", "il y a 3h", "il y a 2j",
 *            "il y a 1 mois", "il y a 2 an(s)"
 */
export function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `il y a ${d}j`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `il y a ${mo} mois`
  return `il y a ${Math.floor(mo / 12)} an(s)`
}

/**
 * Formate un nombre en notation compacte avec suffixes k / M.
 * Exemples : 1250 → "1.2k", 2_500_000 → "2.5M", 42 → "42"
 */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k"
  return String(n)
}
