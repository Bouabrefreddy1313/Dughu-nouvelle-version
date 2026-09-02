"use client"

/**
 * Tableau « Historique des points » : filtres par période, recherche client,
 * colonnes triables, sélecteur d'entrées par page et pagination numérotée.
 * Couleurs sémantiques : vert = gain, rouge = perte.
 *
 * Le filtrage / la pagination sont gérés côté client (l'API Dughu ne garantit
 * pas ces capacités) : la liste complète normalisée est passée en props.
 */

import { useMemo, useState } from "react"
import { ArrowUpDown, ChevronLeft, ChevronRight, Info, Search } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { PointsHistoryEntry, PointsPeriod } from "@/types/points/points.types"
import { cn } from "@/lib/utils"

interface PointsHistoryTableProps {
  entries: PointsHistoryEntry[]
  loading?: boolean
  className?: string
}

type SortColumn = "date" | "type" | "description" | "points"
type SortDirection = "asc" | "desc"

const PERIOD_TABS: { key: PointsPeriod; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois-ci" },
  { key: "year", label: "Cette année" },
]

const PAGE_SIZES = [5, 10, 25, 50]

const COLUMNS: { key: SortColumn; label: string; className?: string }[] = [
  { key: "date", label: "Date", className: "w-40" },
  { key: "type", label: "Type", className: "w-24" },
  { key: "description", label: "Description" },
  { key: "points", label: "Points", className: "w-24 text-right" },
]

/** Formate une entrée de date (ISO ou texte brut) en date lisible française. */
function formatEntryDate(raw: string | null): string {
  if (!raw) return "—"
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

/** Vrai si la date d'une entrée tombe dans la période choisie. */
function isInPeriod(entry: PointsHistoryEntry, period: PointsPeriod, now: Date): boolean {
  if (period === "all") return true
  if (!entry.date) return false
  const date = new Date(entry.date)
  if (Number.isNaN(date.getTime())) return false
  switch (period) {
    case "today":
      return date.toDateString() === now.toDateString()
    case "week": {
      const start = new Date(now)
      start.setDate(now.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      return date >= start && date <= now
    }
    case "month":
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    case "year":
      return date.getFullYear() === now.getFullYear()
  }
}

export default function PointsHistoryTable({ entries, loading = false, className }: PointsHistoryTableProps) {
  const [period, setPeriod] = useState<PointsPeriod>("all")
  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<SortColumn>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const now = useMemo(() => new Date(), [])

  // Filtres période + recherche (insensible à la casse, description et type).
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return entries.filter((entry) => {
      if (!isInPeriod(entry, period, now)) return false
      if (!query) return true
      return (
        entry.description.toLowerCase().includes(query) ||
        (entry.type === "gain" ? "gain" : "perte").includes(query)
      )
    })
  }, [entries, period, search, now])

  // Tri (date la plus récente / points décroissants par défaut).
  const sorted = useMemo(() => {
    const factor = sortDirection === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortColumn) {
        case "date": {
          const ta = a.date ? new Date(a.date).getTime() || 0 : 0
          const tb = b.date ? new Date(b.date).getTime() || 0 : 0
          return (ta - tb) * factor
        }
        case "points":
          return (a.points - b.points) * factor
        case "type":
          return a.type.localeCompare(b.type) * factor
        case "description":
          return a.description.localeCompare(b.description, "fr") * factor
      }
    })
  }, [filtered, sortColumn, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))

  // Reviens à la page 1 quand les filtres changent (ajustement d'état pendant
  // le rendu — pattern React recommandé, sans effet).
  const [lastFilters, setLastFilters] = useState({ period, search, pageSize })
  if (
    lastFilters.period !== period ||
    lastFilters.search !== search ||
    lastFilters.pageSize !== pageSize
  ) {
    setLastFilters({ period, search, pageSize })
    setPage(1)
  }

  // Borne la page courante au nombre de pages réel (état dérivé, sans effet).
  const currentPage = Math.min(page, totalPages)

  const pageEntries = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const toggleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(column)
      setSortDirection(column === "description" ? "asc" : "desc")
    }
  }

  return (
    <section className={cn("rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[#2D2D2D]">Historique des points</h2>
        <a
          href="#bareme-points"
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#A35A2A] transition hover:bg-[#F5EFE8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A]"
        >
          <Info size={14} aria-hidden />
          Plus d&apos;informations
        </a>
      </div>

      {/* Filtres par période */}
      <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Filtrer par période">
        {PERIOD_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={period === key}
            onClick={() => setPeriod(key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A]",
              period === key ? "bg-[#A35A2A] text-white" : "bg-gray-100 text-[#65676B] hover:bg-[#F5EFE8]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Recherche + entrées par page */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative flex-1 sm:max-w-xs">
          <span className="sr-only">Rechercher dans l&apos;historique</span>
          <Search size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#65676B]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pr-3 pl-9 text-sm text-[#2D2D2D] placeholder:text-[#8A8D91] focus:border-[#A35A2A] focus:bg-white focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-[#65676B]">
          Afficher
          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-[#2D2D2D] focus:border-[#A35A2A] focus:outline-none"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          entrées par page
        </label>
      </div>

      {/* Tableau (défilement horizontal sur mobile) */}
      {loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {COLUMNS.map(({ key, label, className }) => (
                  <th key={key} scope="col" className={cn("pb-2 font-semibold text-[#65676B]", className)}>
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      aria-label={`Trier par ${label.toLowerCase()}`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded transition hover:text-[#2D2D2D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A]",
                        sortColumn === key && "text-[#A35A2A]"
                      )}
                    >
                      {label}
                      <ArrowUpDown size={13} aria-hidden className={cn(sortColumn !== key && "opacity-40")} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-[#65676B]">
                    Aucun mouvement de points trouvé pour cette période.
                  </td>
                </tr>
              ) : (
                pageEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 last:border-0 hover:bg-[#F5EFE8]/40">
                    <td className="py-2.5 pr-3 whitespace-nowrap text-[#65676B]">{formatEntryDate(entry.date)}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                          entry.type === "gain" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn("size-1.5 rounded-full", entry.type === "gain" ? "bg-emerald-500" : "bg-red-500")}
                        />
                        {entry.type === "gain" ? "Gain" : "Perte"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-[#2D2D2D]">{entry.description}</td>
                    <td
                      className={cn(
                        "py-2.5 text-right font-semibold whitespace-nowrap",
                        entry.type === "gain" ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {entry.type === "gain" ? "+" : "-"}
                      {entry.points.toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination numérotée */}
      {!loading && sorted.length > 0 && (
        <nav className="mt-4 flex flex-wrap items-center justify-between gap-2" aria-label="Pagination de l'historique">
          <p className="text-xs text-[#65676B]">
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sorted.length)} sur {sorted.length} entrées
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-[#65676B] transition hover:bg-[#F5EFE8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} aria-hidden />
              Précédent
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter((n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
              .map((n, index, visible) => (
                <span key={n} className="flex items-center">
                  {index > 0 && n - visible[index - 1] > 1 && (
                    <span className="px-1 text-xs text-[#65676B]" aria-hidden>
                      …
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setPage(n)}
                    aria-current={n === currentPage ? "page" : undefined}
                    className={cn(
                      "size-8 rounded-lg text-xs font-semibold transition",
                      n === currentPage ? "bg-[#A35A2A] text-white" : "border border-gray-200 text-[#65676B] hover:bg-[#F5EFE8]"
                    )}
                  >
                    {n}
                  </button>
                </span>
              ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-[#65676B] transition hover:bg-[#F5EFE8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Suivant
              <ChevronRight size={14} aria-hidden />
            </button>
          </div>
        </nav>
      )}
    </section>
  )
}
