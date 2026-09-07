"use client"

import { useState, useEffect } from "react"
import { Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import Avatar from "@/components/common/Avatar"
import { REACTIONS, REACTION_TYPE_TO_ID, getReactionMeta } from "@/lib/constants"
import type { ReactionUserItem } from "@/types/posts/post.types"

export type { ReactionUserItem }

interface ReactionUsersModalProps {
  open: boolean
  onClose: () => void
  reactionsSummary?: { type: string; count: number }[]
  totalCount: number
  users?: ReactionUserItem[]
  currentUserReaction?: string | null
  currentUser?: { id: string; name: string | null; avatar: string | null; username?: string | null } | null
  /** Vrai quand la liste détaillée est en cours de chargement (fetch à la demande). */
  loading?: boolean
  /** Vrai quand le chargement de la liste a échoué (erreur réseau / API). */
  error?: boolean
}

export function ReactionUsersModal({
  open,
  onClose,
  reactionsSummary = [],
  totalCount,
  users = [],
  currentUserReaction,
  currentUser,
  loading = false,
  error = false,
}: ReactionUsersModalProps) {
  const [activeTab, setActiveTab] = useState<string>("all")

  // Verrouiller le défilement du body lors de l'ouverture
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  // Synthétise la liste des utilisateurs à afficher :
  // Si l'utilisateur connecté a réagi et n'est pas déjà dans `users`, on l'ajoute en tête.
  const allUsers: ReactionUserItem[] = [...(Array.isArray(users) ? users : [])]
  if (currentUser?.id && currentUserReaction) {
    const alreadyPresent = allUsers.some((u) => String(u.id) === String(currentUser.id))
    if (!alreadyPresent) {
      allUsers.unshift({
        id: String(currentUser.id),
        name: currentUser.name || "Vous",
        username: currentUser.username || null,
        avatar: currentUser.avatar || null,
        reactionType: currentUserReaction,
      })
    }
  }

  // Filtrage selon l'onglet actif
  const displayedUsers = activeTab === "all"
    ? allUsers
    : allUsers.filter((u) => u.reactionType.toLowerCase() === activeTab.toLowerCase())

  // Détermination des onglets disponibles (uniquement les réactions réellement présentes)
  // `reactionsSummary` peut être null/objetselon l'API : on normalise en tableau vide.

  const summary: { type: string; count: number }[] = Array.isArray(reactionsSummary) ? reactionsSummary : []
  const availableTabs = [
    { id: "all", label: "Toutes", count: totalCount, icon: null },
    ...summary
      .filter((r) => r.count > 0)
      .map((r) => {
        const meta = getReactionMeta(r.type)
        return {
          id: meta?.type || r.type,
          label: meta?.name || r.type,
          count: r.count,
          icon: meta?.icon || "👍",
        }
      }),
  ]

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reaction-users-title"
    >
      <div
        className={cn(
          // Mobile: Bottom Sheet coulissant
          "w-full max-h-[85vh] sm:max-h-[600px] sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden",
          "animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poignée mobile */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden="true">
          <div className="w-10 h-1.5 rounded-full bg-gray-300" />
        </div>

        {/* En-tête */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 id="reaction-users-title" className="text-base sm:text-lg font-bold text-[#050505]">
            Réactions ({totalCount})
{loading && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-[#65676B]">
              <Loader2 size={12} className="animate-spin" />
              Chargement…
            </span>
          )}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-[#65676B] transition"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barre des onglets / filtres par réaction */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto scrollbar-hide">
          {availableTabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition",
                  isActive
                    ? "bg-[#A35A2A] text-white shadow-sm"
                    : "bg-gray-100 text-[#65676B] hover:bg-gray-200"
                )}
              >
                {tab.icon && <span className="text-sm leading-none">{tab.icon}</span>}
                <span>{tab.label}</span>
                <span className={cn("text-[11px] opacity-80", isActive && "text-white")}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Liste des personnes */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-gray-50">
          {displayedUsers.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#65676B]">
              {loading && totalCount > 0 ? (
                <p>Chargement des réactions…</p>
              ) : error ? (
                <p>Impossible de charger la liste des réactions. Veuillez réessayer.</p>
              ) : totalCount > 0 ? (
                <p>La liste des personnes ayant réagi n’est pas disponible pour cette publication.</p>
              ) : (
                <p>Aucune réaction pour l’instant.</p>
              )}
            </div>
          ) : (
            displayedUsers.map((user, idx) => {
              const meta = getReactionMeta(user.reactionType)
              const reactionIcon = meta?.icon || "👍"

              return (
                <div
                  key={`${user.id}-${idx}`}
                  className="flex items-center justify-between py-2.5 px-2 hover:bg-gray-50 rounded-xl transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar src={user.avatar} name={user.name} size="sm" />
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center text-xs">
                        {reactionIcon}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#050505] truncate">
                        {user.name}
                      </p>
                      {user.username && (
                        <p className="text-xs text-[#65676B] truncate">
                          @{user.username}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
