"use client"

/**
 * Tableau « Historique des points » Akwaplay (thème sombre).
 * Colonnes : Date · Type · Description · Points.
 * Consomme uniquement les entrées déjà normalisées par le service Points
 * (`/pointsHistory/{userId}/akwaplay`) — aucune logique de mapping ici.
 */

import type { PointsHistoryEntry } from "@/types/points/points.types"

/** Formate une date (ISO ou texte brut) en date lisible française. */
function formatDate(raw: string | null): string {
  if (!raw || raw.trim() === "") return "—"
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface AkwaplayPointsTableProps {
  entries: PointsHistoryEntry[]
}

export default function AkwaplayPointsTable({ entries }: AkwaplayPointsTableProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid #2a2a2a", backgroundColor: "#1a1a1a" }}
    >
      <table className="w-full text-left text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid #2a2a2a", backgroundColor: "#1f1f1f" }}>
            <th className="px-4 py-3 text-[11px] uppercase tracking-wide text-[#9a9a9a]">Date</th>
            <th className="px-4 py-3 text-[11px] uppercase tracking-wide text-[#9a9a9a]">Type</th>
            <th className="px-4 py-3 text-[11px] uppercase tracking-wide text-[#9a9a9a]">Description</th>
            <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wide text-[#9a9a9a]">Points</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-white/5" style={{ borderBottom: "1px solid #262626" }}>
              <td className="px-4 py-2.5 text-[#e4e4e4] whitespace-nowrap">{formatDate(entry.date)}</td>
              <td className="px-4 py-2.5">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={
                    entry.type === "gain"
                      ? { backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e" }
                      : { backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }
                  }
                >
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: entry.type === "gain" ? "#22c55e" : "#ef4444" }}
                  />
                  {entry.type === "gain" ? "Gain" : "Perte"}
                </span>
              </td>
              <td className="px-4 py-2.5 text-[#e4e4e4]">{entry.description}</td>
              <td
                className="px-4 py-2.5 text-right font-semibold whitespace-nowrap"
                style={{ color: entry.type === "gain" ? "#22c55e" : "#ef4444" }}
              >
                {entry.type === "gain" ? "+" : "-"}
                {entry.points.toLocaleString("fr-FR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}