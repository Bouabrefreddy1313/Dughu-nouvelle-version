"use client"

/**
 * Panneaux « Inviter » et « Statistiques » d'un espace.
 *  - InvitePanel : amis invitables (POST /invitePageList) + invitation
 *    (POST /page/inviteFriend) — réservé aux admins.
 *  - StatsPanel : statistiques (GET /page/{id}/statistic/{user_id}) — l'API
 *    renvoie 403 si l'utilisateur n'est pas admin (propagé au composant).
 */

import { useState } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useInvitableFriends, useInviteFriend, usePageStats } from "@/hooks/pages/use-pages"
import { PageEmpty, PageError, PageSkeleton } from "./PageStates"

/* ─────────────────────────── PANEL INVITER ─────────────────────────── */

interface InvitePanelProps {
  pageId: string
}

export function InvitePanel({ pageId }: InvitePanelProps) {
  const [enabled, setEnabled] = useState(false)
  const invitesQuery = useInvitableFriends(pageId, enabled)
  const inviteMutation = useInviteFriend(pageId)
  const [invitedIds, setInvitedIds] = useState<Set<string>>(() => new Set())

  const friends = invitesQuery.data ?? []
  const sender = async (friendId: string) => {
    try {
      const result = await inviteMutation.mutateAsync(friendId)
      if (result.success === false) {
        toast.error(result.message || "Impossible d'envoyer l'invitation.")
        return
      }
      setInvitedIds((prev) => new Set(prev).add(friendId))
      toast.success("Invitation envoyée !")
    } catch {
      toast.error("Impossible d'envoyer l'invitation.")
    }
  }

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm font-medium text-[#2D2D2D]">Invitez vos amis à aimer cet espace.</p>
        <Button onClick={() => setEnabled(true)} className="mt-3 rounded-full bg-[#A35A2A] text-white hover:bg-[#8B4A1F]">
          <Send size={15} aria-hidden className="mr-1.5" /> Voir mes amis invitables
        </Button>
      </div>
    )
  }

  if (invitesQuery.isLoading) return <PageSkeleton rows={3} />
  if (invitesQuery.error) {
    return (
      <PageError
        message={invitesQuery.error instanceof Error && invitesQuery.error.message ? invitesQuery.error.message : "Impossible de charger vos amis."}
      />
    )
  }

  return (
    <div>
      {friends.length === 0 ? (
        <PageEmpty title="Aucun ami invitable" text="Les amis que vous pouvez inviter à cet espace apparaîtront ici." />
      ) : (
        <ul className="space-y-2">
          {friends.map((friend) => {
            const invited = invitedIds.has(friend.id)
            return (
              <li key={friend.id} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3">
                <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-[#F0F2F5]">
                  <Image src={friend.avatar || "/images/avatar.png"} alt="" fill sizes="40px" className="object-cover" unoptimized={friend.avatar?.startsWith("http")} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#2D2D2D]">{friend.name}</p>
                  {friend.username && <p className="truncate text-xs text-[#65676B]">@{friend.username}</p>}
                </div>
                <Button
                  disabled={invited || inviteMutation.isPending}
                  onClick={() => void sender(friend.id)}
                  className="shrink-0 rounded-full bg-[#A35A2A] text-white hover:bg-[#8B4A1F] disabled:bg-transparent disabled:text-[#8A8D91]"
                >
                  {invited ? "Invité ✓" : "Inviter"}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ─────────────────────────── PANEL STATS ─────────────────────────── */

interface StatsPanelProps {
  pageId: string
  userId: string
}

export function StatsPanel({ pageId, userId }: StatsPanelProps) {
  const statsQuery = usePageStats(pageId, userId, true)

  if (statsQuery.isLoading) return <PageSkeleton rows={4} />
  if (statsQuery.isError) {
    return (
      <PageError
        message={statsQuery.error instanceof Error && statsQuery.error.message ? statsQuery.error.message : "Statistiques réservées aux administrateurs de l'espace."}
      />
    )
  }

  const stats = statsQuery.data ?? {}
  const entries = Object.entries(stats).filter(([, value]) => typeof value === "number" || typeof value === "string")
  if (entries.length === 0) return <PageEmpty title="Aucune statistique" text="Les statistiques de cet espace apparaîtront ici." />

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {entries.map(([key, value]) => (
        <li key={key} className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
          <p className="truncate text-xl font-extrabold text-[#A35A2A]">{String(value)}</p>
          <p className="mt-0.5 truncate text-xs capitalize text-[#65676B]">{key.replace(/_/g, " ")}</p>
        </li>
      ))}
    </ul>
  )
}