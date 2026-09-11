"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Settings, X } from "lucide-react"   
import { useConversations } from "@/hooks/messages"
import type { ChatSummary } from "@/lib/messages"
import { cn } from "@/lib/utils"
import ReceiptTicks from "@/components/messages/ReceiptTicks"
import Card from "@/components/common/Card"
import Avatar from "@/components/common/Avatar"
import SearchBar from "@/components/common/SearchBar"
import IconButton from "@/components/common/IconButton"
import { Skeleton } from "@/components/ui/skeleton"

interface ConversationSidebarProps {
  user?: {
    dughu?: {
      userId?: string | number
    } | null
  } | null
  open?: boolean
  onClose?: () => void
  onOpenConversation?: (conversation: ChatSummary) => void
  /** Remonte le total de messages non lus (utilisé pour le badge de l'icône messagerie du header). */
  onUnreadCountChange?: (count: number) => void
}

function formatChatDate(value: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  }
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
}

export default function ConversationSidebar({ user, open, onClose, onOpenConversation, onUnreadCountChange }: ConversationSidebarProps) {
  const [search, setSearch] = useState("")
  const currentUserId = String(user?.dughu?.userId || "")
  const { conversations, loading, error: convError, refresh } = useConversations(currentUserId)
  const error = convError || ""

  const isUnread = useCallback(
    (conversation: ChatSummary) => (conversation.unreadCount || 0) > 0,
    []
  )

  // Total de messages non lus remonté au header pour le badge de l'icône messagerie.
  useEffect(() => {
    if (!onUnreadCountChange) return
    const total = conversations.reduce(
      (sum, conversation) => sum + (conversation.unreadCount || 0),
      0
    )
    onUnreadCountChange(total)
  }, [conversations, onUnreadCountChange])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter((conversation) =>
      `${conversation.contact.name} ${conversation.contact.username || ""}`.toLowerCase().includes(query)
    )
  }, [conversations, search])

  const openConversation = (conversation: ChatSummary) => {
    onClose?.()
    onOpenConversation?.(conversation)
  }

  return (
    <aside className={cn("fixed right-0 top-[72px] bottom-0 w-[300px] z-40 flex flex-col transition-transform duration-300 ease-in-out", open ? "translate-x-0" : "translate-x-full")}>
      <Card className="flex-1 flex flex-col rounded-[24px] rounded-r-none overflow-hidden shadow-[-8px_0_24px_rgba(0,0,0,0.06)] dark:shadow-[-8px_0_24px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#ececec] dark:border-white/10">
          <h4 className="font-bold text-[16px] text-[#2D2D2D] dark:text-[#F3F4F6]">Messagerie</h4>
          <div className="flex items-center gap-1.5">
            <IconButton size="sm" ariaLabel="Paramètres" className="w-9 h-9 rounded-full bg-[#F0F2F5] dark:bg-[#2A2A2A] text-[#65676B] dark:text-[#A1A1AA] hover:bg-[#E4E6EB] dark:hover:bg-[#333333]"><Settings size={18} /></IconButton>
            <IconButton onClick={onClose} size="sm" ariaLabel="Fermer" className="w-9 h-9 rounded-full bg-[#F0F2F5] dark:bg-[#2A2A2A] text-[#65676B] dark:text-[#A1A1AA] hover:bg-[#E4E6EB] dark:hover:bg-[#333333]"><X size={18} /></IconButton>
          </div>
        </div>

        <div className="px-4 py-3">
          <SearchBar placeholder="Rechercher une conversation..." value={search} onChange={setSearch} className="bg-[#F0F2F5] dark:bg-[#2A2A2A] rounded-full" />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-2 pb-4">
          {loading ? (
            <div className="space-y-1 px-2" role="status" aria-label="Chargement des conversations">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <Skeleton className="h-11 w-11 shrink-0 rounded-full bg-gray-200 dark:bg-white/10" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-3.5 w-28 max-w-full rounded-full bg-gray-200 dark:bg-white/10" />
                      <Skeleton className="h-2.5 w-9 shrink-0 rounded-full bg-gray-200 dark:bg-white/10" />
                    </div>
                    <Skeleton className="h-3 w-40 max-w-full rounded-full bg-gray-200 dark:bg-white/10" />
                  </div>
                </div>
              ))}
              <span className="sr-only">Chargement des conversations...</span>
            </div>
          ) : error ? (
            <div className="px-5 py-10 text-center"><p className="text-sm text-red-600 dark:text-red-400">{error}</p><button onClick={() => void refresh()} className="mt-3 text-xs font-semibold text-[#A35A2A] dark:text-[#B46D1C]">Réessayer</button></div>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[#65676B] dark:text-[#A1A1AA]">Aucune conversation.</p>
          ) : filtered.map((conversation) => {
            const unread = isUnread(conversation)
            return (
              <button key={conversation.id} onClick={() => openConversation(conversation)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all duration-200 text-left hover:bg-[#F0F2F5] dark:hover:bg-[#2A2A2A]", unread && "bg-[#FFF7F0] dark:bg-[#985810]/15 hover:bg-[#FDEFE2] dark:hover:bg-[#985810]/25")} aria-label={unread ? `Conversation non lue avec ${conversation.contact.name}` : `Conversation avec ${conversation.contact.name}`}>
                <div className="relative shrink-0">
                  <Avatar src={conversation.contact.avatar} name={conversation.contact.name} size="md" className="w-11 h-11" />
                  {conversation.contact.online && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-[#1E1E1E]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2"><p className={cn("text-[14px] truncate", unread ? "font-bold text-[#2D2D2D] dark:text-[#F3F4F6]" : "font-medium text-[#2D2D2D] dark:text-[#F3F4F6]")}>{conversation.contact.name}</p><span className="text-[11px] text-[#65676B] dark:text-[#A1A1AA] shrink-0">{formatChatDate(conversation.updatedAt)}</span></div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-[12px] truncate", unread ? "font-semibold text-[#2D2D2D] dark:text-[#F3F4F6]" : "text-[#65676B] dark:text-[#A1A1AA]")}>
                      {conversation.lastMessageIsMine ? "Vous : " : ""}
                      {conversation.lastMessage || "Aucun message"}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      {unread && (
                        <span className="bg-[#A35A2A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                          {conversation.unreadCount}
                        </span>
                      )}
                      {conversation.lastMessageIsMine && <ReceiptTicks receipt={conversation.lastMessageReceipt || null} />}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </Card>
    </aside>
  )
}
