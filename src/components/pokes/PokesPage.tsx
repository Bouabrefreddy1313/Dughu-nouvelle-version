"use client"

/**
 * Page « Pokes » — 3 onglets : Pokes reçus (avec réponse / poke-back),
 * Suggestions de pokes et Pokes envoyés. Accessible depuis le bouton
 * « Pokes » de la sidebar gauche (état actif `active="pokes"`).
 *
 * L'ID Dughu de l'utilisateur connecté est résolu via useAuth côté client ;
 * côté serveur, les routes /api/pokes retombent sur le cookie de session.
 */

import { useState } from "react"
import Image from "next/image"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/auth/use-auth"
import TabNavigation from "@/components/points/TabNavigation"
import ReceivedPokesTab from "./ReceivedPokesTab"
import SuggestionsTab from "./SuggestionsTab"
import SentPokesTab from "./SentPokesTab"
import { usePokes } from "@/hooks/pokes/use-pokes"

type PokesTab = "received" | "suggestions" | "sent"

const TABS: { key: PokesTab; label: string }[] = [
  { key: "received", label: "Pokes reçus" },
  { key: "suggestions", label: "Suggestions" },
  { key: "sent", label: "Pokes envoyés" },
]

export default function PokesPage() {
  const [tab, setTab] = useState<PokesTab>("received")

  const { data: rawUser, isLoading: authLoading } = useAuth()
  // ID Dughu numérique de l'utilisateur connecté (source de vérité session).
  const dughuUserId = String(rawUser?.dughu?.userId || rawUser?.dughuUserId || "") || undefined

  // Les suggestions dérivent des pokes reçus : une seule requête reçus +
  // une requête envoyés alimentent les 3 onglets.
  const receivedQuery = usePokes("received", dughuUserId)
  const sentQuery = usePokes("sent", dughuUserId)

  const receivedPokes = receivedQuery.data ?? []
  const sentPokes = sentQuery.data ?? []

  const loading = authLoading || !dughuUserId || receivedQuery.isLoading || sentQuery.isLoading

  return (
    <MainLayout user={rawUser} noRightSidebar active="pokes" reserveLeftSidebar>
      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-0 sm:py-6">
        <header className="mb-5 flex items-center gap-3 px-1">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[#F5EFE8]">
            <Image
              src="/images/poke.png"
              alt=""
              width={26}
              height={26}
              className="size-[26px] object-contain"
            />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#2D2D2D]">Pokes</h1>
            <p className="mt-0.5 text-sm text-[#65676B]">Tapez vos amis et répondez aux pokes reçus.</p>
          </div>
        </header>

        <TabNavigation
          tabs={TABS}
          active={tab}
          onChange={setTab}
          ariaLabel="Onglets Pokes"
          className="mb-5"
        />

        <div className="min-h-[360px]">
          {tab === "received" && (
            <ReceivedPokesTab
              pokes={receivedPokes}
              loading={loading || receivedQuery.isFetching}
              error={receivedQuery.error}
              onRetry={() => void receivedQuery.refetch()}
              dughuUserId={dughuUserId}
            />
          )}
          {tab === "suggestions" && (
            <SuggestionsTab
              pokes={receivedPokes}
              loading={loading || receivedQuery.isFetching}
              error={receivedQuery.error}
              onRetry={() => void receivedQuery.refetch()}
              dughuUserId={dughuUserId}
            />
          )}
          {tab === "sent" && (
            <SentPokesTab
              pokes={sentPokes}
              loading={loading || sentQuery.isFetching}
              error={sentQuery.error}
              onRetry={() => void sentQuery.refetch()}
              dughuUserId={dughuUserId}
            />
          )}
        </div>
      </div>
    </MainLayout>
  )
}
