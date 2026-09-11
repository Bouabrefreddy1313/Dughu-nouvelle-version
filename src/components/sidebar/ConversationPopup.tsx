"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, ImageIcon, Maximize2, MoreVertical, Paperclip, Pencil, Reply, Send, SmilePlus, Trash2, Video, X } from "lucide-react"
import { toast } from "sonner"
import {
  useMessages,
  useSendMessage,
  useTypingIndicator,
  useMarkAsSeen,
  useDeleteMessage,
  useEditMessage,
} from "@/hooks/messages"
import type { ChatMessage, ChatSummary } from "@/lib/messages"
import { isMeaningfulReply, mergeLocalReplies, persistMessageReply, resolveReplyPreview } from "@/lib/messages"
import ReceiptTicks from "@/components/messages/ReceiptTicks"
import { FormattedChatMessage } from "@/components/messages/FormattedChatMessage"
import { formatMessagePreview } from "@/components/messages/message-formatters"
import { cn } from "@/lib/utils"
import Avatar from "@/components/common/Avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { REACTION_ID_TO_TYPE, REACTIONS } from "@/lib/constants"

const POLL_INTERVAL_MS = 5_000
const MESSAGE_MAX_LENGTH = 500
/** Marge de sécurité (px) gardée entre un popover et le bord de l'écran. */
const POPOVER_VIEWPORT_MARGIN = 8

function formatTime(value: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  }
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
}

function formatLastSeen(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function fileLabel(file: File | null) {
  return file ? `${file.name} (${Math.ceil(file.size / 1024)} Ko)` : ""
}


/**
 * Réactions de message stockées localement (l'API Dughu ne dispose pas d'un
 * endpoint de réaction de message — `reactMessage/{id}` renvoie 404).
 * Persistance navigateur (localStorage) : visibles seulement côté utilisateur.
 */
const MESSAGE_REACTIONS_STORAGE_KEY = "dughu:message-reactions"

function readMessageReactions(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const stored = window.localStorage.getItem(MESSAGE_REACTIONS_STORAGE_KEY)
    return stored ? (JSON.parse(stored) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function writeMessageReactions(reactions: Record<string, string>) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(MESSAGE_REACTIONS_STORAGE_KEY, JSON.stringify(reactions))
  } catch {
    /* ignore */
  }
}

/**
 * Extrait un message utilisateur lisible depuis une erreur Axios/fetch.
 * Ne renvoie jamais d'erreur technique brute ("Request failed with status code…").
 */
function getApiErrorMessage(error: unknown, fallback: string): string {
  // Les services lèvent des ApiError dont le message est déjà un libellé
  // français approuvé — on le privilégie.
  if (error instanceof Error && error.name === "ApiError" && error.message.trim()) {
    return error.message
  }
  if (error && typeof error === "object") {
    const response = (error as { response?: { data?: { message?: string } } }).response
    const serverMessage = response?.data?.message
    if (serverMessage && typeof serverMessage === "string" && serverMessage.trim()) {
      return serverMessage
    }
  }
  return fallback
}

/**
 * Calcule un style `position: fixed` pour un popover ancré sur un bouton,
 * afin qu'il s'affiche par-dessus tout (portail vers <body>) et ne soit
 * jamais rogné par le conteneur de messages qui défile (overflow-y-auto).
 *
 * `align` reprend l'alignement d'origine (left-0 / right-0) mais calculé
 * en coordonnées écran, et on garde une marge de sécurité sur les bords.
 */
function getPopoverStyle(rect: DOMRect, align: "left" | "right"): React.CSSProperties {
  const bottom = Math.max(window.innerHeight - rect.top + POPOVER_VIEWPORT_MARGIN, POPOVER_VIEWPORT_MARGIN)
  if (align === "left") {
    const left = Math.min(Math.max(rect.left, POPOVER_VIEWPORT_MARGIN), window.innerWidth - POPOVER_VIEWPORT_MARGIN)
    return { position: "fixed", bottom, left, zIndex: 9999 }
  }
  const right = Math.min(
    Math.max(window.innerWidth - rect.right, POPOVER_VIEWPORT_MARGIN),
    window.innerWidth - POPOVER_VIEWPORT_MARGIN
  )
  return { position: "fixed", bottom, right, zIndex: 9999 }
}

/** Bouton déclencheur du sélecteur d'emojis de réaction (le popover est rendu en portail par le parent). */
function ReactionTriggerButton({
  isOpen,
  onToggle,
}: {
  isOpen: boolean
  onToggle: (event: React.MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      data-reaction-picker
      onClick={onToggle}
      aria-label="Réagir"
      aria-expanded={isOpen}
      title="Réagir"
      className={cn(
        "rounded-full p-1 transition hover:bg-gray-200",
        isOpen ? "bg-gray-200 text-[#A35A2A]" : "text-[#65676B]"
      )}
    >
      <SmilePlus size={15} />
    </button>
  )
}

interface ConversationPopupProps {
  currentUserId: string
  conversation: ChatSummary
  onClose: () => void
  onOpenFull: (targetUserId: string) => void
  /** Nom de l'utilisateur connecté (utilisé dans la citation d'une réponse). */
  myName?: string
}

export default function ConversationPopup({
  currentUserId,
  conversation,
  onClose,
  onOpenFull,
  myName,
}: ConversationPopupProps) {
  const targetUserId = conversation.contact.id

  const [collapsed, setCollapsed] = useState(false)
  const [text, setText] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null)
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null)
  const [deleteMessageTarget, setDeleteMessageTarget] = useState<ChatMessage | null>(null)
  const [deleteConversationOpen, setDeleteConversationOpen] = useState(false)
  const [deletingConversation, setDeletingConversation] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null)
  const [reactionAnchorRect, setReactionAnchorRect] = useState<DOMRect | null>(null)
  const [messageReactions, setMessageReactions] = useState<Record<string, string>>(() => readMessageReactions())

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  const convId = conversation.id
  const { messages, loading, error, refresh: loadMessages } = useMessages(convId, currentUserId)
  const { sendMessage: sendMsg, sending } = useSendMessage()
  const { isOtherTyping, notifyTyping, stopTyping } = useTypingIndicator(convId, currentUserId)
  const { markAsSeen } = useMarkAsSeen(convId, currentUserId)
  const {
    deleteForMe,
    deleteForAll,
    deleteConversation: deleteConv,
    deleting: deletingMessage,
  } = useDeleteMessage(convId, currentUserId)
  const { editMessage: editMsg, editing: updatingMessage } = useEditMessage(convId, currentUserId)

  const closePopovers = useCallback(() => {
    setMenuMessageId(null)
    setMenuAnchorRect(null)
    setReactionPickerFor(null)
    setReactionAnchorRect(null)
  }, [])

  const toggleReactionPicker = useCallback((event: React.MouseEvent<HTMLButtonElement>, messageId: string) => {
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    setReactionPickerFor((curr) => {
      if (curr === messageId) {
        setReactionAnchorRect(null)
        return null
      }
      setReactionAnchorRect(rect)
      setMenuMessageId(null)
      setMenuAnchorRect(null)
      return messageId
    })
  }, [])

  const toggleMessageMenu = useCallback((event: React.MouseEvent<HTMLButtonElement>, messageId: string) => {
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    setMenuMessageId((curr) => {
      if (curr === messageId) {
        setMenuAnchorRect(null)
        return null
      }
      setMenuAnchorRect(rect)
      setReactionPickerFor(null)
      setReactionAnchorRect(null)
      return messageId
    })
  }, [])

  // Marquer comme lu en ouvrant ou quand de nouveaux messages arrivent
  useEffect(() => {
    if (convId && currentUserId) {
      void markAsSeen()
    }
  }, [convId, currentUserId, messages.length, markAsSeen])

  // Défilement automatique vers le dernier message à l'arrivée de nouveaux.
  useEffect(() => {
    if (messages.length !== prevCountRef.current) {
      prevCountRef.current = messages.length
      endRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages.length])

  // Ferme le menu d'action / le sélecteur de réaction au clic extérieur ou via Échap.
  useEffect(() => {
    if (!menuMessageId && !reactionPickerFor) return
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (!(target instanceof Element)) return
      if (target.closest("[data-message-menu]")) return
      if (target.closest("[data-reaction-picker]")) return
      closePopovers()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePopovers()
    }
    globalThis.document.addEventListener("mousedown", onPointerDown)
    globalThis.document.addEventListener("touchstart", onPointerDown)
    globalThis.document.addEventListener("keydown", onKeyDown)
    return () => {
      globalThis.document.removeEventListener("mousedown", onPointerDown)
      globalThis.document.removeEventListener("touchstart", onPointerDown)
      globalThis.document.removeEventListener("keydown", onKeyDown)
    }
  }, [closePopovers, menuMessageId, reactionPickerFor])

  // Un popover ancré en position "fixed" se désynchronise du bouton dès que la
  // liste de messages défile ou que la fenêtre change de taille : on le ferme.
  useEffect(() => {
    if (!menuMessageId && !reactionPickerFor) return
    const container = messagesContainerRef.current
    const handleClose = () => closePopovers()
    container?.addEventListener("scroll", handleClose, { passive: true })
    window.addEventListener("resize", handleClose)
    return () => {
      container?.removeEventListener("scroll", handleClose)
      window.removeEventListener("resize", handleClose)
    }
  }, [closePopovers, menuMessageId, reactionPickerFor])

  // Une fois rabattu puis rouvert, on recentre le bas de la discussion.
  useEffect(() => {
    if (!collapsed) endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [collapsed])

  const handleSend = async () => {
    if (!currentUserId || !targetUserId || sending) return
    const message = text.trim()
    if (!message && !image && !video && !documentFile) {
      toast.error("Ajoutez un message ou un fichier.")
      return
    }
    if (message.length > MESSAGE_MAX_LENGTH) {
      toast.error("Le message ne peut pas dépasser 500 caractères.")
      return
    }
    stopTyping()
    try {
      await sendMsg({
        conversationId: convId,
        targetUserId,
        currentUserId,
        text: message,
        image,
        video,
        document: documentFile,
        replyTo,
        currentUserProfile: {
          name: myName || "Utilisateur",
        },
        targetUserProfile: {
          name: conversation.contact.name,
          username: conversation.contact.username || "",
          avatar: conversation.contact.avatar || "",
        },
      })
      setText("")
      setImage(null)
      setVideo(null)
      setDocumentFile(null)
      setReplyTo(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'envoyer le message.")
    }
  }

  const openFullConversation = () => {
    onClose()
    onOpenFull(targetUserId)
  }

  const startEditMessage = (message: ChatMessage) => {
    setEditingMessageId(message.id)
    setEditDraft(message.text || "")
    closePopovers()
  }

  const cancelEditMessage = () => {
    setEditingMessageId(null)
    setEditDraft("")
  }

  const saveEditMessage = async () => {
    if (!editingMessageId || !currentUserId || updatingMessage) return
    const trimmed = editDraft.trim()
    if (!trimmed) {
      toast.error("Le message ne peut pas être vide.")
      return
    }
    if (trimmed.length > MESSAGE_MAX_LENGTH) {
      toast.error("Le message ne peut pas dépasser 500 caractères.")
      return
    }
    try {
      await editMsg(editingMessageId, trimmed)
      setEditingMessageId(null)
      setEditDraft("")
      toast.success("Message modifié.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de modifier le message.")
    }
  }

  const confirmDeleteMessage = async (deleteType: "me" | "all") => {
    if (!deleteMessageTarget || !currentUserId || deletingMessage) return
    try {
      if (deleteType === "all") {
        await deleteForAll(deleteMessageTarget.id, targetUserId)
      } else {
        await deleteForMe(deleteMessageTarget.id)
      }
      setDeleteMessageTarget(null)
      toast.success(
        deleteType === "all" ? "Message supprimé pour tout le monde." : "Message supprimé pour vous."
      )
    } catch {
      toast.error("Impossible de supprimer le message.")
    }
  }

  const confirmDeleteConversation = async () => {
    if (!currentUserId || deletingConversation) return
    setDeletingConversation(true)
    try {
      await deleteConv(convId)
      setDeleteConversationOpen(false)
      toast.success("Conversation supprimée.")
      onClose()
    } catch {
      toast.error("Impossible de supprimer la conversation.")
    } finally {
      setDeletingConversation(false)
    }
  }

  const handleReaction = (message: ChatMessage, type: string) => {
    if (!currentUserId || !targetUserId) return
    const previous = messageReactions[message.id] || null
    const next = previous === type ? null : type

    // Persistance 100 % locale : l'API Dughu n'expose pas d'endpoint de
    // réaction de message (reactMessage/{id} → 404). Les réactions sont donc
    // stockées côté navigateur et visibles seulement par l'utilisateur.
    const updated = { ...messageReactions }
    if (next) updated[message.id] = next
    else delete updated[message.id]
    setMessageReactions(updated)
    writeMessageReactions(updated)
    closePopovers()
    void previous
  }

  const menuOpenMessage = menuMessageId ? messages.find((item) => item.id === menuMessageId) ?? null : null

  /**
   * Aperçu de citation pour une bulle. Délègue à `resolveReplyPreview`
   * (utilitaire partagé dans `@/lib/messages`) qui renvoie `null` pour les
   * `reply` vides/placeholder : c'est ce qui empêche l'encart fantôme
   * "Message / Pièce jointe" de s'afficher sur un message qui ne répond à rien.
   */
  const resolveReply = useCallback(
    (reply: ChatMessage["reply"]) => resolveReplyPreview(reply, messages, conversation.contact.name),
    [conversation.contact.name, messages]
  )

  const unreadCount = (conversation as { unreadCount?: number }).unreadCount ?? 0

  return (
    <>
      {collapsed ? (
        /* ─────────────────────────────────────────────────────────────
           État rabattu : bulle circulaire flottante (chat head)
           Affiche l'avatar du contact, un point vert si en ligne,
           un badge rouge avec le nombre de messages non lus, et un
           bouton de fermeture. Un clic sur la bulle rouvre la conversation.
           ───────────────────────────────────────────────────────────── */
        <div className="flex w-full items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.2)] ring-1 ring-black/5 transition duration-200 hover:scale-105 hover:shadow-[0_6px_24px_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D26F23]"
            aria-label={`Ouvrir la conversation avec ${conversation.contact.name}`}
          >
            <Avatar
              src={conversation.contact.avatar}
              name={conversation.contact.name}
              className="h-11 w-11 rounded-full"
            />
            {conversation.contact.online && (
              <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            )}
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#E4405F] px-1 text-[11px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            <span className="pointer-events-none absolute right-[calc(100%+10px)] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#050505] px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 sm:block">
              {conversation.contact.name}
            </span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#65676B] shadow-[0_2px_10px_rgba(0,0,0,0.12)] ring-1 ring-black/5 transition hover:bg-gray-50 hover:text-[#050505] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D26F23]"
            aria-label="Fermer la conversation"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
           État déplié : fenêtre de conversation complète
           ───────────────────────────────────────────────────────────── */
        <div className="flex w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.18)] sm:rounded-2xl h-[min(70vh,540px)] sm:h-[440px]">
          {/* En-tête de la fenêtre de conversation */}
          <div className="flex items-center gap-1.5 bg-[#D26F23] px-2 py-2 pl-3">
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 py-0.5 text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label="Replier la conversation"
            >
              <span className="relative shrink-0">
                <Avatar
                  src={conversation.contact.avatar}
                  name={conversation.contact.name}
                  size="sm"
                  className="h-8 w-8"
                />
                {conversation.contact.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#D26F23] bg-green-500" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">
                  {conversation.contact.name}
                </span>
                <span className="block text-[11px] text-white/80">
                  {conversation.contact.online
                    ? "En ligne"
                    : formatLastSeen(conversation.contact.lastSeen)
                      ? `Dernière connexion : ${formatLastSeen(conversation.contact.lastSeen)}`
                      : "Hors ligne"}
                </span>
              </span>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#E4405F] px-1.5 text-[11px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Replier la conversation"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <ChevronDown size={16} />
            </button>
            <button
              type="button"
              onClick={openFullConversation}
              aria-label="Ouvrir la conversation dans la messagerie"
              title="Ouvrir dans la messagerie"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <Maximize2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => setDeleteConversationOpen(true)}
              aria-label="Supprimer la conversation"
              title="Supprimer la conversation"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <Trash2 size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer la conversation"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <X size={17} />
            </button>
          </div>

          {/* Corps de la conversation */}
          <div className="flex min-h-0 flex-1 flex-col bg-[#F7F8FA] dark:bg-[#121212]">
            <div
              ref={messagesContainerRef}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 pr-2 [scrollbar-width:thin] [scrollbar-color:#B98663_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#B98663]"
            >
              {loading ? (
                <div className="space-y-3" role="status" aria-label="Chargement des messages">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}
                    >
                      <Skeleton
                        className={cn(
                          "h-8 rounded-2xl bg-gray-200 dark:bg-white/10",
                          i % 2 === 0 ? "w-32 rounded-bl-sm" : "w-40 rounded-br-sm"
                        )}
                      />
                    </div>
                  ))}
                  <span className="sr-only">Chargement des messages...</span>
                </div>
              ) : error ? (
                <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  <button
                    type="button"
                    onClick={() => void loadMessages()}
                    className="mt-2 text-xs font-semibold text-[#A35A2A] dark:text-[#B46D1C]"
                  >
                    Réessayer
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                  <p className="text-sm text-[#65676B] dark:text-[#A1A1AA]">
                    Aucun message pour le moment.
                  </p>
                  <p className="mt-1 text-xs text-[#65676B] dark:text-[#A1A1AA]">
                    Écrivez le premier message !
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "group mb-2 flex items-end gap-1.5",
                      message.isMine ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Actions — devant (gauche) de mes messages */}
                    {message.isMine && !(editingMessageId === message.id) && (
                      <div className="mb-1 flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            closePopovers()
                            setReplyTo(message)
                          }}
                          aria-label="Répondre"
                          title="Répondre"
                          className="rounded-full p-1 text-[#65676B] dark:text-[#A1A1AA] transition hover:bg-gray-200 dark:hover:bg-[#2A2A2A]"
                        >
                          <Reply size={14} />
                        </button>
                        <ReactionTriggerButton
                          isOpen={reactionPickerFor === message.id}
                          onToggle={(event) => toggleReactionPicker(event, message.id)}
                        />
                        <button
                          type="button"
                          data-message-menu
                          onClick={(event) => toggleMessageMenu(event, message.id)}
                          aria-label="Actions du message"
                          aria-expanded={menuMessageId === message.id}
                          className="rounded-full p-1 text-[#65676B] dark:text-[#A1A1AA] transition hover:bg-gray-200 dark:hover:bg-[#2A2A2A]"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    )}
                    {!message.isMine && (
                      <Avatar
                        src={conversation.contact.avatar}
                        name={conversation.contact.name}
                        size="sm"
                        className="h-7 w-7 shrink-0 self-end"
                      />
                    )}
                    <div
                      className={cn(
                        "relative max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[70%]",
                        message.isMine
                          ? "rounded-br-sm bg-[#A35A2A] text-white"
                          : "rounded-bl-sm border border-gray-100 dark:border-white/10 bg-white dark:bg-[#1E1E1E] text-[#050505] dark:text-[#F3F4F6]"
                      )}
                    >
                      {editingMessageId === message.id ? (
                        <div className="flex flex-col gap-2" data-message-menu>
                          <textarea
                            value={editDraft}
                            onChange={(event) => setEditDraft(event.target.value.slice(0, MESSAGE_MAX_LENGTH))}
                            rows={2}
                            autoFocus
                            className="w-full resize-none rounded-lg bg-white/10 p-2 text-sm text-white outline-none placeholder:text-white/50"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelEditMessage}
                              disabled={updatingMessage}
                              className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/25 disabled:opacity-50"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={() => void saveEditMessage()}
                              disabled={updatingMessage || !editDraft.trim()}
                              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#A35A2A] transition hover:bg-white/90 disabled:opacity-50"
                            >
                              {updatingMessage ? "Enregistrement..." : "Enregistrer"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {isMeaningfulReply(message.reply) &&
                            (() => {
                              const preview = resolveReply(message.reply)
                              if (!preview) return null
                              return (
                                <div
                                  className={cn(
                                    "mb-2 flex items-start gap-1.5 rounded-lg border-l-[3px] px-2 py-1.5 text-xs",
                                    message.isMine
                                      ? "border-white/70 bg-white/15"
                                      : "border-[#A35A2A] bg-gray-50 dark:bg-[#252525]"
                                  )}
                                >
                                  <Reply size={12} className="mt-0.5 shrink-0 opacity-70" />
                                  <div className="min-w-0">
                                    <p className="font-semibold">{preview.sender}</p>
                                    <p className="line-clamp-2 opacity-80">{formatMessagePreview(preview.text)}</p>
                                  </div>
                                </div>
                              )
                            })()}
                          <FormattedChatMessage text={message.text || ""} isMine={message.isMine} />
                          {message.attachments && message.attachments.length > 0 && (
                            <span className="mt-1 block text-xs opacity-80">
                              {message.attachments.length} pièce(s) jointe(s)
                            </span>
                          )}
                        </>
                      )}
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <p
                          className={cn(
                            "text-[10px]",
                            message.isMine ? "text-white/70" : "text-[#65676B] dark:text-[#A1A1AA]"
                          )}
                        >
                          {formatTime(message.createdAt)}
                        {message.isMine && <ReceiptTicks receipt={message.receipt || "sent"} className="mb-0.5" />}
                        </p>
                      </div>
                      {messageReactions[message.id] && (
                        <span
                          className={cn(
                            "absolute -bottom-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full border-2 bg-white dark:bg-[#252525] text-xs",
                            message.isMine ? "-left-2 border-[#A35A2A]" : "-right-2 border-white dark:border-[#1E1E1E] shadow-sm"
                          )}
                          title={`Réaction : ${messageReactions[message.id]}`}
                        >
                          {REACTIONS.find((r) => REACTION_ID_TO_TYPE[r.id] === messageReactions[message.id])?.icon || "👍"}
                        </span>
                      )}
                    </div>
                    {/* Actions — derrière (droite) des messages reçus */}
                    {!message.isMine && !(editingMessageId === message.id) && (
                      <div className="mb-1 flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            closePopovers()
                            setReplyTo(message)
                          }}
                          aria-label="Répondre"
                          title="Répondre"
                          className="rounded-full p-1 text-[#65676B] transition hover:bg-gray-200"
                        >
                          <Reply size={14} />
                        </button>
                        <ReactionTriggerButton
                          isOpen={reactionPickerFor === message.id}
                          onToggle={(event) => toggleReactionPicker(event, message.id)}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
              {isOtherTyping && (
                <div className="flex items-center gap-2 text-xs italic text-[#65676B] dark:text-[#A1A1AA] py-1 px-2">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
                  </span>
                  <span>{conversation.contact.name || "Le contact"} écrit...</span>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <footer className="border-t border-gray-100 dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-2">
              {replyTo && (
                <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-[#F0F2F5] dark:bg-[#2A2A2A] px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-semibold text-[#050505] dark:text-[#F3F4F6]">
                      Réponse à {replyTo.isMine ? "vous" : (conversation.contact.name || "Utilisateur")}
                    </span>
                    <p className="truncate text-[#65676B] dark:text-[#A1A1AA]">{formatMessagePreview(replyTo.text) || "Pièce jointe"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    aria-label="Annuler la réponse"
                    className="shrink-0 rounded-full p-1 text-[#65676B] dark:text-[#A1A1AA] transition hover:bg-gray-200 dark:hover:bg-[#333333]"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
              {(image || video || documentFile) && (
                <div className="mb-2 flex flex-wrap gap-2 text-xs">
                  {image && (
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="flex items-center gap-1 rounded-full bg-gray-100 dark:bg-[#2A2A2A] px-3 py-1 text-[#65676B] dark:text-[#A1A1AA] transition hover:bg-gray-200 dark:hover:bg-[#333333]"
                    >
                      <ImageIcon size={13} />
                      {fileLabel(image)} <span aria-hidden="true">×</span>
                    </button>
                  )}
                  {video && (
                    <button
                      type="button"
                      onClick={() => setVideo(null)}
                      className="flex items-center gap-1 rounded-full bg-gray-100 dark:bg-[#2A2A2A] px-3 py-1 text-[#65676B] dark:text-[#A1A1AA] transition hover:bg-gray-200 dark:hover:bg-[#333333]"
                    >
                      <Video size={13} />
                      {fileLabel(video)} <span aria-hidden="true">×</span>
                    </button>
                  )}
                  {documentFile && (
                    <button
                      type="button"
                      onClick={() => setDocumentFile(null)}
                      className="flex items-center gap-1 rounded-full bg-gray-100 dark:bg-[#2A2A2A] px-3 py-1 text-[#65676B] dark:text-[#A1A1AA] transition hover:bg-gray-200 dark:hover:bg-[#333333]"
                    >
                      <Paperclip size={13} />
                      {fileLabel(documentFile)} <span aria-hidden="true">×</span>
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-0.5 rounded-full bg-[#F0F2F5] dark:bg-[#2A2A2A] py-1 pl-1 pr-1">
                <label className="cursor-pointer rounded-full p-2 text-[#65676B] dark:text-[#A1A1AA] transition hover:bg-gray-200 dark:hover:bg-[#333333]" title="Envoyer une image">
                  <ImageIcon size={17} />
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => setImage(event.target.files?.[0] || null)} />
                </label>
                <label className="cursor-pointer rounded-full p-2 text-[#65676B] dark:text-[#A1A1AA] transition hover:bg-gray-200 dark:hover:bg-[#333333]" title="Envoyer une vidéo">
                  <Video size={17} />
                  <input type="file" accept="video/mp4,video/ogg,video/webm" className="hidden" onChange={(event) => setVideo(event.target.files?.[0] || null)} />
                </label>
                <label className="cursor-pointer rounded-full p-2 text-[#65676B] dark:text-[#A1A1AA] transition hover:bg-gray-200 dark:hover:bg-[#333333]" title="Envoyer un fichier">
                  <Paperclip size={17} />
                  <input type="file" className="hidden" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} />
                </label>
                <input
                  type="text"
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value.slice(0, MESSAGE_MAX_LENGTH))
                    notifyTyping()
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void handleSend()
                    }
                  }}
                  placeholder="Écrire un message..."
                  aria-label="Écrire un message"
                  className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-[#050505] dark:text-[#F3F4F6] outline-none placeholder:text-[#65676B] dark:placeholder:text-[#8E9094]"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || (!text.trim() && !image && !video && !documentFile)}
                  aria-label="Envoyer"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#A35A2A] hover:bg-[#8f4f25] dark:bg-[#B46D1C] dark:hover:bg-[#A35A2A] text-white transition disabled:opacity-40"
                >
                  {sending ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <Send size={15} />
                  )}
                </button>
              </div>
            </footer>
          </div>

          {/* Popover — sélecteur de réactions, rendu en portail pour ne jamais être rogné */}
          {reactionPickerFor &&
            reactionAnchorRect &&
            portalReady &&
            createPortal(
              (() => {
                const isMine = messages.find((item) => item.id === reactionPickerFor)?.isMine ?? true
                return (
                  <div
                    data-reaction-picker
                    style={getPopoverStyle(reactionAnchorRect, isMine ? "left" : "right")}
                    className="flex items-center gap-0.5 rounded-full border border-gray-200 bg-white p-1.5 shadow-2xl"
                  >
                    {REACTIONS.map((reaction) => {
                      const type = REACTION_ID_TO_TYPE[reaction.id] || "like"
                      return (
                        <button
                          key={reaction.id}
                          type="button"
                          onClick={() => {
                            const target = messages.find((item) => item.id === reactionPickerFor)
                            if (target) handleReaction(target, type)
                          }}
                          aria-label={reaction.name}
                          className="rounded-full p-1 text-lg leading-none transition hover:scale-125"
                        >
                          {reaction.icon}
                        </button>
                      )
                    })}
                  </div>
                )
              })(),
              globalThis.document.body
            )}

          {/* Popover — actions du message (Modifier / Supprimer), rendu en portail */}
          {menuMessageId &&
            menuAnchorRect &&
            portalReady &&
            createPortal(
              <div
                data-message-menu
                style={getPopoverStyle(menuAnchorRect, "left")}
                className="w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-2xl"
              >
                <button
                  type="button"
                  onClick={() => menuOpenMessage && startEditMessage(menuOpenMessage)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] font-medium text-gray-900 transition hover:bg-blue-50"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Pencil size={14} />
                  </span>
                  Modifier
                </button>
                <div className="mx-3 my-0.5 h-px bg-gray-100" />
                <button
                  type="button"
                  onClick={() => {
                    if (menuOpenMessage) setDeleteMessageTarget(menuOpenMessage)
                    closePopovers()
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] font-medium text-[#E4405F] transition hover:bg-red-50"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-[#E4405F]">
                    <Trash2 size={14} />
                  </span>
                  Supprimer
                </button>
              </div>,
              globalThis.document.body
            )}
        </div>
      )}

      {/* Confirmation : supprimer un message */}
      <Dialog open={!!deleteMessageTarget} onOpenChange={(open) => !open && setDeleteMessageTarget(null)}>
        <DialogContent showCloseButton className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF3F4] text-[#E4405F]">
                <Trash2 size={16} />
              </span>
              Supprimer le message
            </DialogTitle>
            <DialogDescription>
              Supprimer ce message de la conversation ? Vous pouvez le supprimer pour tout le monde ou uniquement pour vous.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button variant="destructive" onClick={() => void confirmDeleteMessage("all")} disabled={deletingMessage}>
              {deletingMessage ? "Suppression..." : "Supprimer pour tout le monde"}
            </Button>
            <Button variant="outline" onClick={() => void confirmDeleteMessage("me")} disabled={deletingMessage}>
              Supprimer pour moi
            </Button>
            <Button variant="ghost" onClick={() => setDeleteMessageTarget(null)} disabled={deletingMessage}>
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation : supprimer la conversation */}
      <Dialog open={deleteConversationOpen} onOpenChange={setDeleteConversationOpen}>
        <DialogContent showCloseButton className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF3F4] text-[#E4405F]">
                <Trash2 size={16} />
              </span>
              Supprimer la conversation
            </DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment supprimer toute la conversation avec{" "}
              <span className="font-semibold">{conversation.contact.name || "ce contact"}</span> ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteConversationOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => void confirmDeleteConversation()} disabled={deletingConversation}>
              {deletingConversation ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
