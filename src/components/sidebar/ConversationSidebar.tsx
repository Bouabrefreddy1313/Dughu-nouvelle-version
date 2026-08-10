"use client"

import { useState } from "react"
import { Settings, X, MessageCircle, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import Card from "@/components/common/Card"
import Avatar from "@/components/common/Avatar"
import SearchBar from "@/components/common/SearchBar"
import IconButton from "@/components/common/IconButton"

interface ConversationSidebarProps {
  open?: boolean
  onClose?: () => void
}

interface Conversation {
  id: number
  name: string
  lastMessage: string
  time: string
  online?: boolean
  unread?: number
  active?: boolean
}

const CONVERSATIONS: Conversation[] = [
  { id: 1, name: "Grace Ehounoud", lastMessage: "Salut ! Ça va ?", time: "2h", online: true, unread: 2, active: true },
  { id: 2, name: "Jean Mea", lastMessage: "Tu as vu le post ?", time: "3h", online: true },
  { id: 3, name: "Marie K", lastMessage: "On se voit demain ?", time: "hier", online: true },
  { id: 4, name: "Paul Assi", lastMessage: "Merci beaucoup !", time: "hier" },
  { id: 5, name: "Awa Koné", lastMessage: "Bien reçu 👍", time: "2j", unread: 1 },
  { id: 6, name: "Koffi N'Guessan", lastMessage: "On se rappelle plus tard", time: "3j" },
  { id: 7, name: "Fatou Diallo", lastMessage: "C'est noté !", time: "4j" },
  { id: 8, name: "Yao Kouassi", lastMessage: "Merci pour l'invitation", time: "5j" },
]

export default function ConversationSidebar({ open, onClose }: ConversationSidebarProps) {
  const [tab, setTab] = useState<"chats" | "groups">("chats")
  const [search, setSearch] = useState("")

  const filtered = CONVERSATIONS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <aside
      className={cn(
        "fixed right-0 top-[72px] bottom-0 w-[300px] z-40 flex flex-col transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      <Card className="flex-1 flex flex-col rounded-[24px] rounded-r-none overflow-hidden shadow-[-8px_0_24px_rgba(0,0,0,0.06)]">
        {/* En-tête */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#ececec]">
          <h4 className="font-bold text-[16px] text-[#2D2D2D]">Messagerie</h4>
          <div className="flex items-center gap-1.5">
            <IconButton size="sm" ariaLabel="Paramètres" className="w-9 h-9 rounded-full bg-[#F0F2F5] text-[#65676B] hover:bg-[#E4E6EB]">
              <Settings size={18} />
            </IconButton>
            <IconButton onClick={onClose} size="sm" ariaLabel="Fermer" className="w-9 h-9 rounded-full bg-[#F0F2F5] text-[#65676B] hover:bg-[#E4E6EB]">
              <X size={18} />
            </IconButton>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 px-4 pt-3">
          <button
            onClick={() => setTab("chats")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[13px] font-medium transition-all",
              tab === "chats"
                ? "bg-[#A35A2A]/10 text-[#A35A2A] font-semibold"
                : "text-[#65676B] hover:bg-[#F0F2F5]"
            )}
          >
            <MessageCircle size={15} />
            Chats
          </button>
          <button
            onClick={() => setTab("groups")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[13px] font-medium transition-all",
              tab === "groups"
                ? "bg-[#A35A2A]/10 text-[#A35A2A] font-semibold"
                : "text-[#65676B] hover:bg-[#F0F2F5]"
            )}
          >
            <Users size={15} />
            Groupes
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="px-4 py-3">
          <SearchBar
            placeholder="Rechercher une conversation..."
            value={search}
            onChange={setSearch}
            className="bg-[#F0F2F5] rounded-full"
          />
        </div>

        {/* Liste des conversations */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-2 pb-4">
          {filtered.map((conv) => (
            <button
              key={conv.id}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all duration-200 text-left",
                conv.active
                  ? "bg-[#A35A2A]/8"
                  : "hover:bg-[#F0F2F5]"
              )}
            >
              <div className="relative shrink-0">
                <Avatar name={conv.name} size="md" className="w-11 h-11" />
                {conv.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    "text-[14px] truncate",
                    conv.active ? "font-semibold text-[#2D2D2D]" : "font-medium text-[#2D2D2D]"
                  )}>
                    {conv.name}
                  </p>
                  <span className="text-[11px] text-[#65676B] shrink-0">{conv.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] text-[#65676B] truncate">{conv.lastMessage}</p>
                  {conv.unread && (
                    <span className="bg-[#A35A2A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </aside>
  )
}