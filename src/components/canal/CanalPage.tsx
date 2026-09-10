"use client"

/**
 * Page "Canal" (Écran 1 — Liste / Découverte, Thème clair).
 *
 * Spécifications :
 *  - En-tête : icône + titre "Canal"
 *  - Onglets horizontaux (style pill) : Explorer (orange plein actif), Mes canaux, Canaux rejoints, Favoris
 *  - Barre de recherche centrée + Bouton "+ Créer un canal" orange à droite
 *  - Section "Canaux populaires" + Filtrage par catégories scrollables (bleu foncé actif)
 *  - Grille responsive de cartes (jusqu'à 6 colonnes desktop)
 *  - Clic carte : ouvre Écran 3 (CanalChatView, thème sombre) en overlay plein écran
 *  - Clic "+ Créer un canal" : ouvre Écran 2 (CreateCanalModal)
 */

import { useState, useMemo } from "react"
import Image from "next/image"
import {
  Compass,
  Home,
  Users,
  Star,
  Plus,
  Search,
  Filter,
} from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/auth/use-auth"
import {
  useCanals,
  useJoinedCanals,
  useMyCanals,
  usePossibleCategories,
} from "@/hooks/canal/use-canals"
import { useCanalFavorites } from "@/hooks/canal/use-canal-favorites"
import type { Canal } from "@/types/canal/canal.types"
import CanalCard from "./CanalCard"
import CreateCanalModal from "./CreateCanalModal"
import CanalChatView from "./CanalChatView"
import CanalSettingsModal from "./CanalSettingsModal"

type TabType = "explorer" | "mine" | "joined" | "favorites"

export default function CanalPage() {
  const { data: rawUser, isLoading: authLoading } = useAuth()
  const userId = String(rawUser?.dughu?.userId || rawUser?.dughuUserId || rawUser?.user_id || rawUser?.id || "")

  const [currentTab, setCurrentTab] = useState<TabType>("explorer")
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // Modale création, Chat plein écran & Gestion canal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedCanalForChat, setSelectedCanalForChat] = useState<Canal | null>(null)
  const [managingCanal, setManagingCanal] = useState<Canal | null>(null)

  // Catégories
  const { data: rawCategories = [] } = usePossibleCategories()

  // Requêtes selon l'onglet actif
  const explorerQuery = useCanals(userId, {
    research: search,
    categoryId: selectedCategory === "all" ? undefined : selectedCategory,
    enabled: currentTab === "explorer" && !!userId,
  })

  const mineQuery = useMyCanals(userId, {
    q: search,
    categoryId: selectedCategory === "all" ? undefined : selectedCategory,
    enabled: currentTab === "mine" && !!userId,
  })

  const joinedQuery = useJoinedCanals(userId, {
    categoryId: selectedCategory === "all" ? undefined : selectedCategory,
    enabled: currentTab === "joined" && !!userId,
  })

  const favoritesQuery = useCanalFavorites(userId, {
    categoryId: selectedCategory === "all" ? undefined : selectedCategory,
    enabled: currentTab === "favorites" && !!userId,
  })

  // Canaux actifs selon l'onglet
  const canals = useMemo(() => {
    switch (currentTab) {
      case "mine":
        return mineQuery.data?.canals ?? []
      case "joined":
        return joinedQuery.data?.canals ?? []
      case "favorites":
        return favoritesQuery.data?.canals ?? []
      default:
        return explorerQuery.data?.canals ?? []
    }
  }, [currentTab, explorerQuery.data, mineQuery.data, joinedQuery.data, favoritesQuery.data])

  const isLoading =
    authLoading ||
    (currentTab === "explorer" && explorerQuery.isLoading) ||
    (currentTab === "mine" && mineQuery.isLoading) ||
    (currentTab === "joined" && joinedQuery.isLoading) ||
    (currentTab === "favorites" && favoritesQuery.isLoading)

  return (
    <MainLayout user={rawUser} noRightSidebar active="canal" reserveLeftSidebar wide>
      <div className="w-full px-4 py-6 sm:px-6">
        {/* ========================================================================= */}
        {/* En-tête : Icône + Titre "Canal" */}
        {/* ========================================================================= */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-[#985810]/10 border border-[#985810]/20 shadow-sm">
              <Image
                src="/images/canal.png"
                alt=""
                width={28}
                height={28}
                className="w-7 h-7 object-contain"
              />
            </span>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Canal</h1>
              <p className="text-xs font-medium text-gray-500">
                Découvrez et rejoignez les canaux thématiques
              </p>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* Barre d'onglets (style pill) */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-4">
          <button
            type="button"
            onClick={() => setCurrentTab("explorer")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition shadow-sm ${
              currentTab === "explorer"
                ? "bg-[#985810] text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Compass size={15} />
            Explorer
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab("mine")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition shadow-sm ${
              currentTab === "mine"
                ? "bg-[#985810] text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Home size={15} />
            Mes canaux
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab("joined")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition shadow-sm ${
              currentTab === "joined"
                ? "bg-[#985810] text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Users size={15} />
            Canaux rejoints
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab("favorites")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition shadow-sm ${
              currentTab === "favorites"
                ? "bg-[#985810] text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Star size={15} />
            Favoris
          </button>
        </div>

        {/* ========================================================================= */}
        {/* Barre de recherche centrée + Bouton "+ Créer un canal" */}
        {/* ========================================================================= */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 size-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un canal..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-gray-900 outline-none transition focus:border-[#985810] focus:ring-1 focus:ring-[#985810] shadow-sm"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#985810] px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#7d480d] active:scale-95"
          >
            <Plus size={16} />
            Créer un canal
          </button>
        </div>

        {/* ========================================================================= */}
        {/* Section "Canaux populaires" + Filtrage catégories */}
        {/* ========================================================================= */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-black text-gray-900">Canaux populaires</span>
            <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 ml-2">
              <Filter size={13} /> Filtrage
            </span>
          </div>

          {/* Tabs catégories scrollables horizontalement */}
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                selectedCategory === "all"
                  ? "bg-[#0F172A] text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              Tous
            </button>

            {rawCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  selectedCategory === cat.id
                    ? "bg-[#0F172A] text-white shadow-sm"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Grille de cartes canaux agrandie */}
        {/* ========================================================================= */}
        <div className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-56 rounded-3xl bg-gray-100 animate-pulse border border-gray-200"
                />
              ))}
            </div>
          ) : canals.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center">
              <p className="text-sm font-bold text-gray-700">Aucun canal trouvé</p>
              <p className="mt-1 text-xs text-gray-500">
                {currentTab === "mine"
                  ? "Vous n'avez pas encore créé de canal."
                  : currentTab === "joined"
                  ? "Vous n'avez encore rejoint aucun canal."
                  : currentTab === "favorites"
                  ? "Vous n'avez aucun canal favori."
                  : "Aucun canal ne correspond à vos critères de recherche."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {canals.map((canal) => (
                <CanalCard
                  key={canal.id}
                  canal={canal}
                  currentUserId={userId}
                  isMine={currentTab === "mine"}
                  isJoinedTab={currentTab === "joined"}
                  onClick={() => setSelectedCanalForChat(canal)}
                  onManage={(c) => setManagingCanal(c)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Écran 2 : Modale "Créer un canal" */}
      {/* ========================================================================= */}
      {isCreateOpen && (
        <CreateCanalModal
          userId={userId}
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* Écran 3 : Vue "Chat" du canal (Overlay plein écran thème sombre) */}
      {/* ========================================================================= */}
      {selectedCanalForChat && (
        <CanalChatView
          initialCanal={selectedCanalForChat}
          currentUserId={userId}
          onClose={() => setSelectedCanalForChat(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* Modale de Gestion et Paramètres du canal (créateur) */}
      {/* ========================================================================= */}
      {managingCanal && (
        <CanalSettingsModal
          canal={managingCanal}
          currentUserId={userId}
          isOpen={!!managingCanal}
          onClose={() => setManagingCanal(null)}
          initialTab="requests"
        />
      )}
    </MainLayout>
  )
}
