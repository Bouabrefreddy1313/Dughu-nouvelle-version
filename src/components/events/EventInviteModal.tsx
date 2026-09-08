"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { Search, UserPlus, X, Loader2, Check } from "lucide-react"
import { toast } from "sonner"
import {
  useInviteUserToEventMutation,
  useInvitedUsers,
} from "@/hooks/queries/use-events"
import { fetchInvitableFriends } from "@/services/pages/pages.service"
import type { InvitableUser } from "@/types/pages/pages.types"

interface EventInviteModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  userId: string
  eventTitle?: string
}

export default function EventInviteModal({
  isOpen,
  onClose,
  eventId,
  userId,
  eventTitle,
}: EventInviteModalProps) {
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [friends, setFriends] = useState<InvitableUser[]>([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())

  const inviteMutation = useInviteUserToEventMutation()
  const { data: invitedData, isLoading: loadingInvited } = useInvitedUsers(eventId, userId)

  // Debounce sur la recherche (~400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase())
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Charger les amis à l'ouverture
  useEffect(() => {
    if (!isOpen || !userId) return

    let isMounted = true
    setLoadingFriends(true)

    fetchInvitableFriends("0")
      .then((list) => {
        if (isMounted) {
          setFriends(list || [])
        }
      })
      .catch((err) => {
        console.error("Erreur chargement amis:", err)
      })
      .finally(() => {
        if (isMounted) setLoadingFriends(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, userId])

  // Synchroniser les personnes déjà invitées depuis l'API
  useEffect(() => {
    if (invitedData?.invitedUsers) {
      const alreadySet = new Set<string>()
      invitedData.invitedUsers.forEach((u) => {
        if (u.id) alreadySet.add(String(u.id))
      })
      setInvitedIds((prev) => {
        const merged = new Set(prev)
        alreadySet.forEach((id) => merged.add(id))
        return merged
      })
    }
  }, [invitedData])

  // Filtrage des amis
  const filteredFriends = useMemo(() => {
    if (!debouncedSearch) return friends
    return friends.filter((f) => {
      const name = (f.name || "").toLowerCase()
      const username = (f.username || "").toLowerCase()
      return name.includes(debouncedSearch) || username.includes(debouncedSearch)
    })
  }, [friends, debouncedSearch])

  if (!isOpen) return null

  const handleInvite = async (friendId: string) => {
    if (invitedIds.has(friendId) || inviteMutation.isPending) return

    // Optimistic UI : marquer immédiatement comme invité
    setInvitedIds((prev) => new Set(prev).add(friendId))

    try {
      const res = await inviteMutation.mutateAsync({
        eventId,
        userId,
        userInviteId: friendId,
      })

      if (res.success) {
        toast.success("Invitation envoyée avec succès !")
      } else {
        toast.error(res.message || "Impossible d'envoyer l'invitation.")
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'envoi de l'invitation.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* En-tête */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Inviter des amis
              </h2>
              {eventTitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[280px] sm:max-w-sm">
                  {eventTitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher un ami..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
            />
          </div>
        </div>

        {/* Liste des amis */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
          {loadingFriends || loadingInvited ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <p className="text-xs">Chargement de vos amis...</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 dark:text-gray-400">
              <p className="text-sm font-medium">Aucun ami trouvé.</p>
              <p className="text-xs mt-1">
                {debouncedSearch
                  ? "Essayez un autre terme de recherche."
                  : "Vous n'avez pas encore d'amis à inviter."}
              </p>
            </div>
          ) : (
            filteredFriends.map((friend) => {
              const isInvited = invitedIds.has(String(friend.id))

              return (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-zinc-850 hover:bg-gray-50 dark:hover:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-700 shrink-0">
                      <Image
                        src={friend.avatar || "/images/avatar.png"}
                        alt={friend.name || "Ami"}
                        fill
                        className="object-cover"
                        sizes="40px"
                        unoptimized={Boolean(friend.avatar?.startsWith("http"))}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        {friend.name}
                      </p>
                      {friend.username && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          @{friend.username}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isInvited || inviteMutation.isPending}
                    onClick={() => handleInvite(String(friend.id))}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isInvited
                        ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    }`}
                  >
                    {isInvited ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Invité</span>
                      </>
                    ) : (
                      <span>Inviter</span>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Pied de page : Bouton Fermer (gris) */}
        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end bg-gray-50/50 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 font-bold text-sm transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
