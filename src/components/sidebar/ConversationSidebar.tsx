"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Settings, X } from "lucide-react"   
import apiClient from "@/lib/apiClient"
import type { ChatSummary } from "@/lib/messages"
import { cn } from "@/lib/utils"
import Card from "@/components/common/Card"
import Avatar from "@/components/common/Avatar"
import SearchBar from "@/components/common/SearchBar"
import IconButton from "@/components/common/IconButton"

interface ConversationSidebarProps {
  user?: {
    dughu?: {
      userId?: string | number
    } | null
  } | null
  open?: boolean
  onClose?: () => void
}

const POLL_INTERVAL_MS = 5_000

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

export default function ConversationSidebar({ user, open, onClose }: ConversationSidebarProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [conversations, setConversations] = useState<ChatSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const currentUserId = String(user?.dughu?.userId || "")

  const loadConversations = useCallback(async (showLoader = false) => {
    if (!currentUserId) return
    if (showLoader) setLoading(true)
    try {
      const { data } = await apiClient.get("/messages/chats", { params: { userId: currentUserId } })
      if (!data?.success) throw new Error(data?.message || "Chargement impossible")
      setConversations(Array.isArray(data.chats) ? data.chats : [])
      setError("")
    } catch {
      setError("Impossible de charger les conversations.")
    } finally {
      if (showLoader) setLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    if (!open || !currentUserId) return
    // Le chargement distant est déclenché à l'ouverture de la fenêtre.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadConversations(true)
    const timer = window.setInterval(() => void loadConversations(false), POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [currentUserId, loadConversations, open])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter((conversation) =>
      `${conversation.contact.name} ${conversation.contact.username || ""}`.toLowerCase().includes(query)
    )
  }, [conversations, search])

  const openConversation = (targetUserId: string) => {
    onClose?.()
    router.push(`/messages?target=${encodeURIComponent(targetUserId)}`)
  }

  return (
    <aside className={cn("fixed right-0 top-[72px] bottom-0 w-[300px] z-40 flex flex-col transition-transform duration-300 ease-in-out", open ? "translate-x-0" : "translate-x-full")}>
      <Card className="flex-1 flex flex-col rounded-[24px] rounded-r-none overflow-hidden shadow-[-8px_0_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#ececec]">
          <h4 className="font-bold text-[16px] text-[#2D2D2D]">Messagerie</h4>
          <div className="flex items-center gap-1.5">
            <IconButton size="sm" ariaLabel="Paramètres" className="w-9 h-9 rounded-full bg-[#F0F2F5] text-[#65676B] hover:bg-[#E4E6EB]"><Settings size={18} /></IconButton>
            <IconButton onClick={onClose} size="sm" ariaLabel="Fermer" className="w-9 h-9 rounded-full bg-[#F0F2F5] text-[#65676B] hover:bg-[#E4E6EB]"><X size={18} /></IconButton>
          </div>
        </div>

        <div className="px-4 py-3">
          <SearchBar placeholder="Rechercher une conversation..." value={search} onChange={setSearch} className="bg-[#F0F2F5] rounded-full" />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-2 pb-4">
          {loading ? (
            <div className="flex justify-center py-10"><LoaderCircle className="animate-spin text-[#A35A2A]" /></div>
          ) : error ? (
            <div className="px-5 py-10 text-center"><p className="text-sm text-red-600">{error}</p><button onClick={() => void loadConversations(true)} className="mt-3 text-xs font-semibold text-[#A35A2A]">Réessayer</button></div>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[#65676B]">Aucune conversation.</p>
          ) : filtered.map((conversation) => (
            <button key={conversation.id} onClick={() => openConversation(conversation.contact.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all duration-200 text-left hover:bg-[#F0F2F5]">
              <div className="relative shrink-0">
                <Avatar src={conversation.contact.avatar} name={conversation.contact.name} size="md" className="w-11 h-11" />
                {conversation.contact.online && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2"><p className="text-[14px] truncate font-medium text-[#2D2D2D]">{conversation.contact.name}</p><span className="text-[11px] text-[#65676B] shrink-0">{formatChatDate(conversation.updatedAt)}</span></div>
                <div className="flex items-center justify-between gap-2"><p className="text-[12px] text-[#65676B] truncate">{conversation.lastMessage || "Aucun message"}</p>{conversation.unreadCount > 0 && <span className="bg-[#A35A2A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shrink-0">{conversation.unreadCount}</span>}</div>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </aside>
  )
}
