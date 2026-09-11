"use client"

/**
 * Page « Espaces » — liste des espaces avec onglets :
 * Actualité / Mes espaces / Aimés / Suggestions / Administrés.
 * L'onglet « Actualité » affiche le fil global des publications des espaces
 * (carte PostCard complète : like, réactions, commentaire, republication,
 * partage). Accessible depuis le bouton « Espaces » de la sidebar gauche
 * (état actif `active="espaces"`).
 */

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Newspaper, Plus, ShieldCheck, Sparkles, ThumbsUp, Users } from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"
import TabNavigation, { type TabItem } from "@/components/points/TabNavigation"
import { useAuth } from "@/hooks/auth/use-auth"
import { usePagesList, type PagesScope } from "@/hooks/pages/use-pages"
import PageCard from "./PageCard"
import PagesFeedTab from "./PagesFeedTab"
import { PageEmpty, PageError, PageSkeleton } from "./PageStates"

type TabKey = Exclude<PagesScope, "feed"> | "news"

const TABS: TabItem<TabKey>[] = [
  { key: "news", label: "Actualité", icon: Newspaper },
  { key: "mine", label: "Mes espaces", icon: Users },
  { key: "liked", label: "Aimés", icon: ThumbsUp },
  { key: "suggestions", label: "Suggestions", icon: Sparkles },
  { key: "administered", label: "Administrés", icon: ShieldCheck },
]

const EMPTY_TEXT: Record<TabKey, { title: string; text: string }> = {
  news: { title: "Aucune publication", text: "Les publications des espaces apparaîtront ici." },
  mine: { title: "Vous n'avez pas encore d'espace", text: "Créez votre premier espace pour partager avec votre communauté." },
  liked: { title: "Aucun espace aimé", text: "Aimez des espaces pour les retrouver ici." },
  suggestions: { title: "Aucune suggestion", text: "De nouvelles suggestions apparaîtront au fil de votre activité." },
  administered: { title: "Aucun espace administré", text: "Les espaces que vous administrez apparaîtront ici." },
}

export default function PagesPage() {
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>("news")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  const { data: rawUser, isLoading: authLoading } = useAuth()
  const dughuUserId = String(rawUser?.dughu?.userId || rawUser?.dughuUserId || rawUser?.id || "") || undefined

  const query = usePagesList(tab as PagesScope, { userId: dughuUserId, q: debouncedSearch, enabled: tab !== "news" })

  // Debounce de la recherche (300 ms) pour limiter les requêtes.
  useEffect(() => {
    if (search === debouncedSearch) return
    const id = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(id)
  }, [search, debouncedSearch])

  const pages = query.data?.pages ?? []
  const loading = authLoading || !dughuUserId || query.isLoading

  return (
    <MainLayout user={rawUser} noRightSidebar active="espaces" reserveLeftSidebar>
      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-0 sm:py-6">
        <header className="mb-5 flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-[#F5EFE8]">
              <Image src="/images/page.png" alt="" width={26} height={26} className="size-[26px] object-contain" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#2D2D2D]">Espaces</h1>
              <p className="mt-0.5 text-sm text-[#65676B]">Découvrez des espaces et gérez les vôtres.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/espaces/creer")}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#A35A2A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8B4A1F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A]"
          >
            <Plus size={16} aria-hidden />
            <span className="hidden sm:inline">Créer un espace</span>
            <span className="sm:hidden">Créer</span>
          </button>
        </header>

        <TabNavigation tabs={TABS} active={tab} onChange={setTab} ariaLabel="Onglets Espaces" className="mb-4" />

        {tab === "news" ? (
          // Onglet « Actualité » : fil des publications des espaces (PostCard
          // complète avec like, réactions, commentaires, republication, partage).
          <PagesFeedTab />
        ) : (
          <>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un espace…"
              aria-label="Rechercher un espace"
              className="mb-4 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#2D2D2D] shadow-sm outline-none transition focus:border-[#A35A2A] focus:ring-2 focus:ring-[#A35A2A]/20"
            />

            <div className="min-h-[360px]">
              {loading && pages.length === 0 && <PageSkeleton />}
              {!loading && query.error && (
                <PageError
                  message={query.error instanceof Error && query.error.message ? query.error.message : "Impossible de charger les espaces."}
                  onRetry={() => void query.refetch()}
                />
              )}
              {!loading && !query.error && pages.length === 0 && (
                <PageEmpty title={EMPTY_TEXT[tab].title} text={EMPTY_TEXT[tab].text} />
              )}
              {pages.length > 0 && <div className="space-y-3">{pages.map((page) => <PageCard key={page.pageId} page={page} />)}</div>}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}