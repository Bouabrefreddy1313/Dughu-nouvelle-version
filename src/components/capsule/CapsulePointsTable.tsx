"use client"

import { useState, useMemo } from "react"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Coins,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react"
import type { PointsHistoryEntry } from "@/types/points/points.types"

interface CapsulePointsTableProps {
  entries: PointsHistoryEntry[]
  loading?: boolean
}

/** Formate une date en format français lisible */
function formatDate(raw: string | null): { dateStr: string; timeStr: string } {
  if (!raw || raw.trim() === "") return { dateStr: "—", timeStr: "" }
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return { dateStr: raw, timeStr: "" }

  const dateStr = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  const timeStr = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return { dateStr, timeStr }
}

const ITEMS_PER_PAGE = 10

export default function CapsulePointsTable({ entries, loading = false }: CapsulePointsTableProps) {
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Filtrage par terme de recherche
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((e) => {
      const desc = (e.description || "").toLowerCase()
      const type = (e.type || "").toLowerCase()
      const pts = String(e.points)
      const date = (e.date || "").toLowerCase()
      return desc.includes(q) || type.includes(q) || pts.includes(q) || date.includes(q)
    })
  }, [entries, search])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, currentPage])

  const handlePageChange = (p: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, p)))
  }

  return (
    <div className="space-y-3">
      {/* ── Barre de recherche rapide & compteur ── */}
      {entries.length > 5 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-1">
          <div className="relative w-full sm:w-72">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#985810]/70"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Rechercher une transaction..."
              className="w-full rounded-full border border-gray-200 dark:border-white/10 bg-[#FBFBFB] dark:bg-[#252525] py-2 pl-9 pr-3 text-xs text-[#2D2D2D] dark:text-white placeholder:text-[#9A9A9A] focus:border-[#985810] focus:bg-white dark:focus:bg-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#985810]/20 transition"
            />
          </div>

          <span className="text-[11px] text-[#65676B] dark:text-zinc-400 self-end sm:self-auto font-medium">
            {filtered.length} transaction{filtered.length > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* ── Tableau élégant ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-[#1E1E1E] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-200/80 dark:border-white/10 bg-[#FAF7F2]/80 dark:bg-[#252525] text-[11px] font-bold uppercase tracking-wider text-[#65676B] dark:text-zinc-400">
                <th scope="col" className="px-4 sm:px-6 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-[#985810]" />
                    <span>Date</span>
                  </div>
                </th>
                <th scope="col" className="px-3 sm:px-4 py-3.5">
                  Type
                </th>
                <th scope="col" className="px-4 sm:px-6 py-3.5">
                  Description
                </th>
                <th scope="col" className="px-4 sm:px-6 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Coins size={13} className="text-[#985810]" />
                    <span>Point</span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-normal">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 sm:px-6 py-3.5">
                      <div className="h-4 w-24 rounded bg-gray-100 dark:bg-[#2A2A2A]" />
                    </td>
                    <td className="px-3 sm:px-4 py-3.5">
                      <div className="h-6 w-16 rounded-full bg-gray-100 dark:bg-[#2A2A2A]" />
                    </td>
                    <td className="px-4 sm:px-6 py-3.5">
                      <div className="h-4 w-40 rounded bg-gray-100 dark:bg-[#2A2A2A]" />
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-right">
                      <div className="ml-auto h-4 w-12 rounded bg-gray-100 dark:bg-[#2A2A2A]" />
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-[#65676B] dark:text-zinc-400">
                    Aucune transaction ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                paginated.map((entry) => {
                  const { dateStr, timeStr } = formatDate(entry.date)
                  const isGain = entry.type === "gain"

                  return (
                    <tr
                      key={entry.id}
                      className="transition-colors hover:bg-[#FAF8F5]/80 dark:hover:bg-[#252525]"
                    >
                      {/* 1. Date */}
                      <td className="whitespace-nowrap px-4 sm:px-6 py-3.5 text-[#2D2D2D] dark:text-white">
                        <div className="font-semibold text-xs text-[#2D2D2D] dark:text-white">{dateStr}</div>
                        {timeStr && (
                          <div className="text-[10px] text-[#888888]">{timeStr}</div>
                        )}
                      </td>

                      {/* 2. Type */}
                      <td className="whitespace-nowrap px-3 sm:px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                            isGain
                              ? "border-emerald-200/70 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                              : "border-rose-200/70 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {isGain ? (
                            <ArrowUpRight size={12} className="text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowDownLeft size={12} className="text-rose-600 dark:text-rose-400" />
                          )}
                          <span>{isGain ? "Gain" : "Perte"}</span>
                        </span>
                      </td>

                      {/* 3. Description */}
                      <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm text-[#333333] dark:text-zinc-200 font-medium leading-relaxed max-w-xs sm:max-w-md">
                        {entry.description || "Activité sur les capsules"}
                      </td>

                      {/* 4. Point */}
                      <td className="whitespace-nowrap px-4 sm:px-6 py-3.5 text-right">
                        <span
                          className={`inline-flex items-center gap-1 font-extrabold text-sm sm:text-base ${
                            isGain ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          <span>{isGain ? "+" : "-"}</span>
                          <span>{entry.points.toLocaleString("fr-FR")}</span>
                          <span className="text-[11px] font-semibold text-[#888888]">pts</span>
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pied de pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/10 bg-[#FAFAFA] dark:bg-[#252525] px-4 py-3 text-xs text-[#65676B] dark:text-zinc-400">
            <span>
              Page {currentPage} sur {totalPages}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-[#2D2D2D] transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Page précédente"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-[#2D2D2D] transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Page suivante"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
