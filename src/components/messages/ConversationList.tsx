"use client"

import { useState } from "react"
import {
  CheckCheck,
  Edit,
  MessageCircle,
  MoreHorizontal,
  RefreshCcw,
  Search,
  X,
} from "lucide-react"
import Avatar from "@/components/common/Avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { ChatContact, ChatSummary } from "@/lib/messages"
import { formatMessagePreview, formatRelativeTime } from "./message-formatters"

export type ConversationFilter = "all" | "unread"

interface ConversationListProps {
  chats: ChatSummary[]
  activeTarget: string
  currentUserId: string
  readMessageKeys?: Record<string, string>
  loadingChats: boolean
  onSelectChat: (targetId: string) => void
  onRefreshChats?: () => void
  onMarkAllAsRead?: () => void
  // Recherche globale / filtrage
  search: string
  onSearchChange: (value: string) => void
  // Mode nouveau message / recherche de contact
  composing: boolean
  onStartComposing: () => void
  onCancelComposing: () => void
  contactQuery: string
  onContactQueryChange: (value: string) => void
  contactResults: ChatContact[]
  searchingContacts: boolean
  onOpenPinModal?: () => void
}

export default function ConversationList({
  chats,
  activeTarget,
  currentUserId,
  readMessageKeys = {},
  loadingChats,
  onSelectChat,
  onRefreshChats,
  onMarkAllAsRead,
  search,
  onSearchChange,
  composing,
  onStartComposing,
  onCancelComposing,
  contactQuery,
  onContactQueryChange,
  contactResults,
  searchingContacts,
}: ConversationListProps) {
  const [filter, setFilter] = useState<ConversationFilter>("all")

  // Filtrage selon onglets
  const filteredChats = chats.filter((chat) => {
    // Filtre texte
    const query = search.trim().toLowerCase()
    if (query) {
      const matchName = chat.contact.name?.toLowerCase().includes(query)
      const matchUsername = chat.contact.username?.toLowerCase().includes(query)
      if (!matchName && !matchUsername) return false
    }

    // Filtre onglet
    if (filter === "unread") {
      const isUnread =
        chat.unreadCount > 0 &&
        readMessageKeys[chat.contact.id] !== chat.lastMessageKey
      return isUnread
    }
    return true
  })

  return (
    <div className="flex h-full w-full flex-col bg-white">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="border-b border-[#E5E5E5] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#1C1E21]">
            Discussions
          </h1>
          <div className="flex items-center gap-1.5">
            {/* Menu More "•••" */}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Options des discussions"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0F2F5] text-[#050505] transition hover:bg-[#E4E6EB] active:scale-95 cursor-pointer outline-none"
              >
                <MoreHorizontal size={18} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl">
                <DropdownMenuItem
                  onClick={() => onRefreshChats?.()}
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
                >
                  <RefreshCcw size={16} className={cn(loadingChats && "animate-spin text-[#8B5E34]")} />
                  Actualiser
                </DropdownMenuItem>
                {onMarkAllAsRead && (
                  <DropdownMenuItem
                    onClick={onMarkAllAsRead}
                    className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
                  >
                    <CheckCheck size={16} className="text-[#8B5E34]" />
                    Marquer tout comme lu
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setFilter("unread")}
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
                >
                  Discussions non lues
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bouton Nouveau message / Crayon */}
            <button
              type="button"
              onClick={() => {
                if (composing) onCancelComposing()
                else onStartComposing()
              }}
              aria-label={composing ? "Fermer la recherche" : "Nouveau message"}
              title="Nouveau message"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition active:scale-95",
                composing
                  ? "bg-[#8B5E34] text-white"
                  : "bg-[#F0F2F5] text-[#050505] hover:bg-[#E4E6EB]"
              )}
            >
              {composing ? <X size={18} /> : <Edit size={17} />}
            </button>
          </div>
        </div>

        {/* ── Barre de recherche ────────────────────────────── */}
        {composing ? (
          <div>
            <label className="flex items-center gap-2.5 rounded-full bg-[#FFF7F1] px-3.5 py-2 ring-1.5 ring-[#8B5E34]/40 transition focus-within:ring-[#8B5E34]">
              <Search size={16} className="shrink-0 text-[#8B5E34]" />
              <input
                autoFocus
                value={contactQuery}
                onChange={(e) => onContactQueryChange(e.target.value)}
                placeholder="Rechercher une personne à contacter..."
                className="min-w-0 flex-1 bg-transparent text-sm text-[#1C1E21] placeholder:text-[#65676B] outline-none"
              />
              <button
                type="button"
                onClick={onCancelComposing}
                aria-label="Annuler la recherche"
                className="rounded-full p-0.5 text-[#65676B] hover:bg-black/5"
              >
                <X size={14} />
              </button>
            </label>
            <p className="mt-1.5 px-3 text-[11px] text-[#65676B]">
              Tapez au moins 2 lettres pour trouver un utilisateur.
            </p>
          </div>
        ) : (
          <label className="flex items-center gap-2.5 rounded-full bg-[#F0F2F5] px-3.5 py-2 transition focus-within:bg-[#EBF0F5] focus-within:ring-1 focus-within:ring-[#8B5E34]/30">
            <Search size={16} className="shrink-0 text-[#65676B]" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher dans Messenger"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#1C1E21] placeholder:text-[#65676B] outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Effacer la recherche"
                className="rounded-full p-0.5 text-[#65676B] hover:bg-black/5"
              >
                <X size={14} />
              </button>
            )}
          </label>
        )}

        {/* ── Filtres / Onglets horizontaux ─────────────────── */}
        {!composing && (
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                filter === "all"
                  ? "bg-[#8B5E34]/15 text-[#8B5E34]"
                  : "text-[#65676B] hover:bg-[#F0F2F5] hover:text-[#050505]"
              )}
            >
              Tout
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                filter === "unread"
                  ? "bg-[#8B5E34]/15 text-[#8B5E34]"
                  : "text-[#65676B] hover:bg-[#F0F2F5] hover:text-[#050505]"
              )}
            >
              Non lu
            </button>

            {/* Menu overflow ••• */}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Autres filtres"
                className="rounded-full px-2 py-1.5 text-xs font-semibold text-[#65676B] hover:bg-[#F0F2F5] hover:text-[#050505] cursor-pointer outline-none"
              >
                <MoreHorizontal size={14} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="rounded-xl p-1 shadow-md">
                <DropdownMenuItem
                  onClick={() => setFilter("all")}
                  className="cursor-pointer text-xs"
                >
                  Afficher toutes les discussions
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("unread")}
                  className="cursor-pointer text-xs"
                >
                  Afficher les non lues
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* ── Contenu scrollable : conversations ou recherche de contacts ─ */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:thin] [scrollbar-color:#D7B49A_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D7B49A] [&::-webkit-scrollbar-track]:bg-transparent">
        {composing ? (
          /* Mode Composition / Recherche de nouveau contact */
          searchingContacts ? (
            <div className="space-y-1 p-1" role="status" aria-label="Recherche de contacts">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl p-2.5">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full bg-gray-200" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-32 rounded-full bg-gray-200" />
                    <Skeleton className="h-2.5 w-20 rounded-full bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : contactQuery.trim().length < 2 ? (
            <div className="px-5 py-12 text-center">
              <MessageCircle size={36} className="mx-auto mb-2 text-[#D7B49A]" />
              <p className="text-sm font-medium text-[#1C1E21]">
                Nouvelle discussion
              </p>
              <p className="mt-1 text-xs text-[#65676B]">
                Saisissez au moins 2 caractères pour rechercher un utilisateur Dughu.
              </p>
            </div>
          ) : contactResults.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-[#1C1E21]">Aucun utilisateur trouvé</p>
              <p className="mt-1 text-xs text-[#65676B]">
                Vérifiez l'orthographe du nom ou du pseudonyme.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#65676B]">
                Résultats de recherche
              </p>
              {contactResults.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => onSelectChat(contact.id)}
                  className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-[#F2F2F2] active:bg-[#EBEBEB]"
                >
                  <div className="relative">
                    <Avatar src={contact.avatar} name={contact.name} size="md" />
                    {contact.online && (
                      <span
                        className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#31A24C]"
                        aria-label="En ligne"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1C1E21]">
                      {contact.name}
                    </p>
                    {contact.username && (
                      <p className="truncate text-xs text-[#65676B]">
                        @{contact.username}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )
        ) : loadingChats && chats.length === 0 ? (
          /* Skeletons de chargement */
          <div className="space-y-2 p-1" role="status" aria-label="Chargement des discussions">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl p-2.5">
                <Skeleton className="h-12 w-12 shrink-0 rounded-full bg-gray-200" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-28 rounded-full bg-gray-200" />
                    <Skeleton className="h-2.5 w-8 rounded-full bg-gray-200" />
                  </div>
                  <Skeleton className="h-3 w-40 rounded-full bg-gray-200" />
                </div>
              </div>
            ))}
            <span className="sr-only">Chargement des conversations...</span>
          </div>
        ) : filteredChats.length === 0 ? (
          /* État vide */
          <div className="px-5 py-14 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF1E7] text-[#8B5E34]">
              <MessageCircle size={26} />
            </div>
            <p className="font-semibold text-[#1C1E21]">
              {filter === "unread"
                ? "Aucun message non lu"
                : search
                ? "Aucune discussion trouvée"
                : "Aucune discussion"}
            </p>
            <p className="mt-1 text-xs text-[#65676B]">
              {search
                ? "Essayez une autre recherche."
                : "Envoyez un message à un ami pour commencer."}
            </p>
            <button
              type="button"
              onClick={onStartComposing}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#8B5E34] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#734A26] active:scale-95"
            >
              <Edit size={14} />
              Nouveau message
            </button>
          </div>
        ) : (
          /* Liste des items de discussion */
          <div className="space-y-0.5">
            {filteredChats.map((chat) => {
              const isSelected = activeTarget === chat.contact.id
              const isUnread =
                chat.unreadCount > 0 &&
                readMessageKeys[chat.contact.id] !== chat.lastMessageKey

              // Aperçu : préfixer par "Vous : " si le dernier message est de l'utilisateur
              const isMine =
                (chat as any).lastMessageSenderId === currentUserId ||
                (chat as any).lastMessageIsMine === true
              const previewPrefix = isMine ? "Vous : " : ""
              const relativeTime = formatRelativeTime(chat.updatedAt)

              return (
                <button
                  key={chat.id || chat.contact.id}
                  type="button"
                  onClick={() => onSelectChat(chat.contact.id)}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-all duration-150 cursor-pointer",
                    isSelected
                      ? "bg-[#8B5E34]/10"
                      : "hover:bg-[#F2F2F2] active:bg-[#EAEAEA]"
                  )}
                >
                  {/* Avatar + indicateur en ligne */}
                  <div className="relative shrink-0">
                    <Avatar
                      src={chat.contact.avatar}
                      name={chat.contact.name}
                      size="md"
                    />
                    {chat.contact.online && (
                      <span
                        className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#31A24C]"
                        aria-label="En ligne"
                        title="En ligne"
                      />
                    )}
                  </div>

                  {/* Détails du contact et message */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={cn(
                          "truncate text-sm",
                          isUnread
                            ? "font-bold text-[#050505]"
                            : isSelected
                            ? "font-semibold text-[#1C1E21]"
                            : "font-semibold text-[#1C1E21]"
                        )}
                      >
                        {chat.contact.name}
                      </span>
                      {relativeTime && (
                        <span
                          className={cn(
                            "shrink-0 text-[11px]",
                            isUnread
                              ? "font-bold text-[#8B5E34]"
                              : "text-[#65676B]"
                          )}
                        >
                          {relativeTime}
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "truncate text-xs leading-relaxed",
                          isUnread
                            ? "font-bold text-[#050505]"
                            : "text-[#65676B]"
                        )}
                      >
                        {isMine && (
                          <span className="font-semibold text-[#050505] dark:text-[#F3F4F6]">Vous : </span>
                        )}
                        {formatMessagePreview(chat.lastMessage) || "Aucun message"}
                      </p>

                      {/* Pastille non-lu pleine marron #8B5E34 */}
                      {isUnread && (
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#8B5E34]"
                          aria-label="Message non lu"
                          title="Non lu"
                        />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
