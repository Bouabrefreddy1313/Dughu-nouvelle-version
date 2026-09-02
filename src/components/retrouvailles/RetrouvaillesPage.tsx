"use client"

import { useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { HandHeart } from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/queries/use-auth"
import { useRetrouvailles } from "@/hooks/retrouvailles/use-retrouvailles"
import { useOutgoingRequestUserIds } from "@/hooks/relations/useRelationRequests"
import RetrouvaillePersonCard from "./RetrouvaillePersonCard"
import RetrouvaillesContactsTab from "./RetrouvaillesContactsTab"
import RetrouvaillesAnciensTab from "./RetrouvaillesAnciensTab"
import { RetrouvaillesSkeletons, RetrouvaillesEmpty, RetrouvaillesError } from "./RetrouvaillesStates"
import type { RetrouvaillesTab } from "@/types/retrouvailles/retrouvailles.types"
import { cn } from "@/lib/utils"

const TABS: { key: RetrouvaillesTab; label: string }[] = [
  { key: "suggestions", label: "Suggestions" },
  { key: "contacts", label: "Contacts" },
  { key: "anciens", label: "Anciens" },
]

function isTab(value: string | null): value is RetrouvaillesTab {
  return value === "suggestions" || value === "contacts" || value === "anciens"
}

export default function RetrouvaillesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: rawUser } = useAuth()
  const userId = String(rawUser?.dughu?.userId || rawUser?.dughuUserId || rawUser?.id || "")

  const tabParam = searchParams.get("tab")
  const tab: RetrouvaillesTab = isTab(tabParam) ? tabParam : "suggestions"

  const suggestionsQuery = useRetrouvailles("suggestions", { userId, enabled: tab === "suggestions" && !!userId })

  // Demandes sortantes (envoyées par l'utilisateur) : pré-remplit l'état
  // « Demande envoyée » du bouton Fraterniser après un rechargement de page.
  const outgoingQuery = useOutgoingRequestUserIds(!!userId)
  const sentIds = useMemo(() => new Set(outgoingQuery.data ?? []), [outgoingQuery.data])

  const selectTab = (next: RetrouvaillesTab) => {
    router.replace(next === "suggestions" ? "/retrouvailles" : `/retrouvailles?tab=${next}`)
  }

  const isLoading = suggestionsQuery.isLoading || suggestionsQuery.isFetching
  const isError = suggestionsQuery.isError
  const errorMessage = suggestionsQuery.error instanceof Error ? suggestionsQuery.error.message : "Impossible de charger les retrouvailles."

  return (
    <MainLayout user={rawUser} noRightSidebar active="retrouvailles" reserveLeftSidebar>
      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-0 sm:py-6">
        <header className="mb-5 flex items-center gap-3 px-1">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[#F5EFE8] text-[#A35A2A]">
            <HandHeart size={22} aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#2D2D2D]">Retrouvailles</h1>
            <p className="mt-0.5 text-sm text-[#65676B]">Retrouvez ceux qui ont marqué votre vie.</p>
          </div>
        </header>

        <div
          className="mb-5 flex gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          role="tablist"
          aria-label="Onglets Retrouvailles"
        >
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => selectTab(key)}
              className={cn(
                "flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition",
                tab === key ? "bg-[#A35A2A] text-white shadow-sm" : "text-[#65676B] hover:bg-[#F5EFE8]"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-[420px]">
          {tab === "suggestions" && (
            <div className="space-y-5">
              {isLoading ? (
                <RetrouvaillesSkeletons />
              ) : isError ? (
                <RetrouvaillesError message={errorMessage} onRetry={() => void suggestionsQuery.refetch()} />
              ) : (suggestionsQuery.data?.groups?.length ?? 0) === 0 ? (
                <RetrouvaillesEmpty label="Aucune suggestion pour le moment. Revenez bientôt !" />
              ) : (
                suggestionsQuery.data?.groups?.map((group) => (
                  <section key={group.label}>
                    <h2 className="mb-2 px-1 text-[16px] font-bold text-[#2D2D2D]">{group.label}</h2>
                    <ul className="space-y-2.5">
                      {group.persons.map((person) => (
                        <RetrouvaillePersonCard key={person.id} person={person} authUserId={userId} sentIds={sentIds} />
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>
          )}

          {tab === "anciens" && <RetrouvaillesAnciensTab userId={userId} />}

          {tab === "contacts" && <RetrouvaillesContactsTab userId={userId} />}
        </div>
      </div>
    </MainLayout>
  )
}