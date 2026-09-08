"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Search, Plus, Loader2, Sparkles, Inbox } from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/queries/use-auth"
import { useEventsList } from "@/hooks/queries/use-events"
import EventCard from "./EventCard"
import { Skeleton } from "@/components/ui/skeleton"
import type { DughuEvent } from "@/types/events/events.types"

type TabType = "all" | "upcoming" | "mine" | "passed"

export default function EventListPage() {
  const router = useRouter()
  const { data: rawUser } = useAuth()
  const userId = String(rawUser?.dughu?.userId || rawUser?.id || "")

  const [activeTab, setActiveTab] = useState<TabType>("all")
  const [searchInput, setSearchInput] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  // Debounce ~400ms sur la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim())
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, isError, refetch } = useEventsList({
    q: debouncedQuery || undefined,
  })

  const rawEvents = data?.events || []

  // Filtrage et tri prioritaire selon l'onglet actif
  const filteredEvents = useMemo(() => {
    const list = rawEvents.filter((ev: DughuEvent) => {
      if (activeTab === "mine") {
        return ev.posterId === userId || ev.organizer?.id === userId
      }
      if (activeTab === "upcoming") {
        return !ev.isPassed
      }
      if (activeTab === "passed") {
        return ev.isPassed
      }
      return true
    })

    // Tri : Prioriser l'affichage des événements à venir (!isPassed) en premier
    return [...list].sort((a, b) => {
      // 1. Les événements à venir passent avant les événements passés
      if (!a.isPassed && b.isPassed) return -1
      if (a.isPassed && !b.isPassed) return 1

      // 2. Pour les événements à venir : les plus proches chronologiquement d'abord
      if (!a.isPassed && !b.isPassed) {
        const timeA = new Date(`${a.startDate}T${a.startTime || "00:00:00"}`).getTime() || 0
        const timeB = new Date(`${b.startDate}T${b.startTime || "00:00:00"}`).getTime() || 0
        return timeA - timeB
      }

      // 3. Pour les événements passés : les plus récents d'abord
      const timeA = new Date(`${a.startDate}T${a.startTime || "00:00:00"}`).getTime() || 0
      const timeB = new Date(`${b.startDate}T${b.startTime || "00:00:00"}`).getTime() || 0
      return timeB - timeA
    })
  }, [rawEvents, activeTab, userId])

  return (
    <MainLayout user={rawUser} wide noRightSidebar active="events">
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#121212] py-6 sm:py-8 px-3 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header : Icône Calendrier + Titre à gauche | Barre de recherche à droite */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#8B5E34]/10 text-[#8B5E34] flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                  Événements
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Découvrez, participez et partagez des événements inoubliables
                </p>
              </div>
            </div>

            {/* Barre de recherche avec debounce ~400ms */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cherchez un événement..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15 transition"
              />
            </div>
          </div>

          {/* Barre d'onglets + Bouton + CRÉER UN ÉVÉNEMENT */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-gray-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {[
                { key: "all", label: "Tous" },
                { key: "upcoming", label: "À venir" },
                { key: "mine", label: "Mes événements" },
                { key: "passed", label: "Passés" },
              ].map((tab) => {
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as TabType)}
                    className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-[#8B5E34] text-white shadow-xs"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => router.push("/events/create")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#8B5E34] hover:bg-[#724b28] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ CRÉER UN ÉVÉNEMENT</span>
            </button>
          </div>

          {/* Contenu de la liste */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-gray-100 dark:border-zinc-800 space-y-3"
                >
                  <Skeleton className="aspect-16/9 w-full rounded-2xl" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-red-100 dark:border-red-950/40 text-center space-y-3">
              <p className="text-red-600 dark:text-red-400 font-bold">
                Impossible de charger les événements pour l'instant.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 text-sm font-semibold transition cursor-pointer"
              >
                Réessayer
              </button>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 p-12 rounded-3xl border border-gray-100 dark:border-zinc-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#8B5E34]/10 text-[#8B5E34] flex items-center justify-center mx-auto">
                <Inbox className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {debouncedQuery
                    ? "Aucun événement correspondant"
                    : activeTab === "upcoming"
                    ? "Aucun événement à venir pour le moment"
                    : activeTab === "mine"
                    ? "Vous n'avez pas encore créé d'événement"
                    : "Aucun événement disponible"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  {debouncedQuery
                    ? "Essayez d'ajuster votre recherche avec d'autres mots-clés."
                    : activeTab === "upcoming"
                    ? "Tous les événements actuels sont passés. Découvrez les événements passés ou soyez le premier à organiser le prochain événement !"
                    : "Soyez le premier à organiser et faire rayonner un événement sur Dughu !"}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {activeTab === "upcoming" && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 text-sm font-bold transition cursor-pointer"
                  >
                    <span>Explorer tous les événements</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => router.push("/events/create")}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#8B5E34] hover:bg-[#724b28] text-white text-sm font-bold shadow-md transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Créer mon événement</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
