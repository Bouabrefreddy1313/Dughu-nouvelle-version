"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, ImageIcon, Maximize2, MoreVertical, Paperclip, Pencil, Reply, Send, SmilePlus, Trash2, Video, X } from "lucide-react"
import { toast } from "sonner"
import {
  deleteConversation,
  deleteMessage,
  editMessage,
  fetchConversation,
  sendMessage,
} from "@/services/messages/messages.service"
import type { ChatMessage, ChatSummary } from "@/lib/messages"
import { isMeaningfulReply, mergeLocalReplies, persistMessageReply, resolveReplyPreview } from "@/lib/messages"
import ReceiptTicks from "@/components/messages/ReceiptTicks"
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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [image, setImage] = useState<File | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  // ⚠️ Renommé en `documentFile` (au lieu de `document`) : la variable
  // précédente masquait l'objet global `document` du navigateur dans tout
  // le composant, ce qui cassait `document.body` utilisé par createPortal
  // (le menu du message et le sélecteur de réaction plantaient au clic).
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const [updatingMessage, setUpdatingMessage] = useState(false)
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null)
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null)
  const [deleteMessageTarget, setDeleteMessageTarget] = useState<ChatMessage | null>(null)
  const [deletingMessage, setDeletingMessage] = useState(false)
  const [deleteConversationOpen, setDeleteConversationOpen] = useState(false)
  const [deletingConversation, setDeletingConversation] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null)
  const [reactionAnchorRect, setReactionAnchorRect] = useState<DOMRect | null>(null)
  const [messageReactions, setMessageReactions] = useState<Record<string, string>>(() => readMessageReactions())
  const endRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)
  // Les portails (menu message / réactions) ne doivent être rendus qu'une fois
  // le composant réellement monté dans le navigateur : sur certains pipelines
  // SSR/Next.js, `typeof document !== "undefined"` peut être vrai alors que
  // `document` est un stub incomplet (ex. `document.body` vaut null), ce qui
  // faisait planter `createPortal`. Un flag posé dans un useEffect garantit
  // qu'on est bien côté client, après hydratation complète.
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => {
    // Différé au frame suivant : évite un setState synchrone dans l'effet
    // tout en garantissant que le portal est monté après le premier rendu.
    const frame = requestAnimationFrame(() => setPortalReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const closePopovers = useCallback(() => {
    setMenuMessageId(null)
    setMenuAnchorRect(null)
    setReactionPickerFor(null)
    setReactionAnchorRect(null)
  }, [])

  const toggleMessageMenu = (event: React.MouseEvent<HTMLButtonElement>, messageId: string) => {
    if (menuMessageId === messageId) {
      closePopovers()
      return
    }
    setReactionPickerFor(null)
    setReactionAnchorRect(null)
    setMenuAnchorRect(event.currentTarget.getBoundingClientRect())
    setMenuMessageId(messageId)
  }

  const toggleReactionPicker = (event: React.MouseEvent<HTMLButtonElement>, messageId: string) => {
    if (reactionPickerFor === messageId) {
      closePopovers()
      return
    }
    setMenuMessageId(null)
    setMenuAnchorRect(null)
    setReactionAnchorRect(event.currentTarget.getBoundingClientRect())
    setReactionPickerFor(messageId)
  }

  const loadMessages = useCallback(
    async (showLoader = false) => {
      if (!currentUserId || !targetUserId) return
      if (showLoader) setLoading(true)
      try {
        const data = await fetchConversation({ userId: currentUserId, targetUserId })
        if (!data?.success) throw new Error(data?.message || "Erreur de chargement")
        const serverMessages: ChatMessage[] = Array.isArray(data.messages) ? data.messages : []
        // Préserve les citations locales (reply) que le serveur ne renvoie pas
        // (l'API peut omettre la citation après un envoi/réponse), pour qu'elle
        // ne disparaisse pas au prochain rafraîchissement.
        setMessages((current) => {
          const localReplies = new Map<string, NonNullable<ChatMessage["reply"]>>()
          for (const message of current) {
            // On ne préserve que les VRAIES citations (voir isMeaningfulReply) :
            // sinon un objet reply vide fini par se figer dans le state et
            // continue d'afficher l'encart fantôme après chaque polling.
            if (isMeaningfulReply(message.reply) && message.id) localReplies.set(message.id, message.reply)
          }
          return mergeLocalReplies(serverMessages, localReplies)
        })
        setError("")
      } catch {
        if (showLoader) setError("Impossible de charger les messages.")
      } finally {
        if (showLoader) setLoading(false)
      }
    },
    [currentUserId, targetUserId]
  )

  useEffect(() => {
    if (!currentUserId || !targetUserId) return
    // Chargement initial puis rafraîchissement périodique comme la page messages.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMessages(true)
    const timer = window.setInterval(() => void loadMessages(false), POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [currentUserId, loadMessages, targetUserId])

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
    // On capture la réponse ciblée AVANT l'envoi : `replyTo` sera réinitialisé
    // après un envoi réussi, donc si on ne le capture pas ici, un message
    // envoyé sans réponse pourrait se voir attribuer par erreur la citation
    // d'un envoi précédent encore présent en mémoire.
    const activeReply = replyTo
    const formData = new FormData()
    formData.set("user_id", currentUserId)
    formData.set("target_user_id", targetUserId)
    if (message) formData.set("message", message)
    if (image) formData.set("image", image)
    if (video) formData.set("video", video)
    if (documentFile) formData.set("document", documentFile)
    if (activeReply) {
      formData.set("reply_doc_id", activeReply.id)
      formData.set(
        "reply_sender",
        activeReply.isMine ? (myName || "Moi") : (conversation.contact.name || "Utilisateur")
      )
      formData.set("reply_text", activeReply.text || "Pièce jointe")
    }
    setSending(true)
    try {
      const data = await sendMessage(formData)
      if (!data?.success) throw new Error(data?.message || "Envoi impossible")
      const replyInfo = activeReply
        ? {
            id: activeReply.id,
            sender: activeReply.isMine ? (myName || "Moi") : (conversation.contact.name || "Utilisateur"),
            text: activeReply.text || "Pièce jointe",
          }
        : null
      setText("")
      setImage(null)
      setVideo(null)
      setDocumentFile(null)
      setReplyTo(null)
      const sent = data.sentMessage as ChatMessage | null | undefined
      // Le serveur peut renvoyer un `reply` vide ({ id:"", sender:"", text:"" })
      // même pour un message qui n'est pas une réponse : on le neutralise ici
      // avant de le stocker, sinon l'encart fantôme réapparaît.
      const normalizedSentReply = isMeaningfulReply(sent?.reply) ? sent!.reply : null
      // Persiste la citation localement : l'API Dughu ne la restitue pas au
      // prochain rechargement (reply_id reste à 0), on la restaure côté client.
      if (sent?.id && replyInfo) persistMessageReply(sent.id, replyInfo)
      // Écho local : on attache la citation au message envoyé même si la réponse
      // de l'API ne la renvoie pas, pour que la bulle l'affiche immédiatement.
      // On force `reply: replyInfo ?? normalizedSentReply` (et pas
      // `sent.reply ?? replyInfo`) pour ne jamais hériter d'une citation
      // vide ou erronée renvoyée par le serveur sur un message qui n'est pas
      // réellement une réponse.
      if (sent) {
        setMessages((current) =>
          current.some((item) => item.id === sent.id)
            ? current.map((item) =>
                item.id === sent.id ? { ...item, reply: replyInfo ?? normalizedSentReply } : item
              )
                        : [...current, { ...sent, reply: replyInfo ?? normalizedSentReply, receipt: "sent" as const }]
        )
      }
      await loadMessages(false)
      // Après rechargement serveur, on ré-attache (ou on retire) la citation
      // uniquement pour CE message précis, identifié par son id.
      if (sent?.id) {
        setMessages((current) =>
          current.map((item) =>
            item.id === sent.id ? { ...item, reply: replyInfo ?? item.reply ?? null } : item
          )
        )
      }
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Impossible d'envoyer le message.")
      )
    } finally {
      setSending(false)
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
    setUpdatingMessage(true)
    try {
      const data = await editMessage({
        messageId: editingMessageId,
        userId: currentUserId,
        message: trimmed,
        targetUserId,
      })
      if (!data?.success) throw new Error(data?.message || "Modification impossible")
      setMessages((current) =>
        current.map((item) =>
          item.id === editingMessageId ? { ...item, text: trimmed } : item
        )
      )
      setEditingMessageId(null)
      setEditDraft("")
      toast.success("Message modifié.")
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Impossible de modifier le message.")
      )
    } finally {
      setUpdatingMessage(false)
    }
  }

  const confirmDeleteMessage = async (deleteType: "me" | "all") => {
    if (!deleteMessageTarget || !currentUserId || deletingMessage) return
    setDeletingMessage(true)
    try {
      const data = await deleteMessage({
        messageId: deleteMessageTarget.id,
        userId: currentUserId,
        targetUserId,
        deleteType,
      })
      if (!data?.success) throw new Error(data?.message || "Suppression impossible")
      setMessages((current) => current.filter((item) => item.id !== deleteMessageTarget.id))
      persistMessageReply(deleteMessageTarget.id, null)
      setDeleteMessageTarget(null)
      toast.success(
        deleteType === "all" ? "Message supprimé pour tout le monde." : "Message supprimé pour vous."
      )
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Impossible de supprimer le message.")
      )
    } finally {
      setDeletingMessage(false)
    }
  }

  const confirmDeleteConversation = async () => {
    if (!currentUserId || deletingConversation) return
    const conversationId = conversation.id
    if (!conversationId) return
    setDeletingConversation(true)
    try {
      const data = await deleteConversation({
        conversationId,
        userId: currentUserId,
        targetUserId,
      })
      if (!data?.success) throw new Error(data?.message || "Suppression impossible")
      setDeleteConversationOpen(false)
      toast.success("Conversation supprimée.")
      onClose()
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Impossible de supprimer la conversation.")
      )
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
          <div className="flex min-h-0 flex-1 flex-col bg-[#F7F8FA]">
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
                          "h-8 rounded-2xl bg-gray-200",
                          i % 2 === 0 ? "w-32 rounded-bl-sm" : "w-40 rounded-br-sm"
                        )}
                      />
                    </div>
                  ))}
                  <span className="sr-only">Chargement des messages...</span>
                </div>
              ) : error ? (
                <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                  <p className="text-sm text-red-600">{error}</p>
                  <button
                    type="button"
                    onClick={() => void loadMessages(true)}
                    className="mt-2 text-xs font-semibold text-[#A35A2A]"
                  >
                    Réessayer
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                  <p className="text-sm text-[#65676B]">
                    Aucun message pour le moment.
                  </p>
                  <p className="mt-1 text-xs text-[#65676B]">
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
                          className="rounded-full p-1 text-[#65676B] transition hover:bg-gray-200"
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
                          className="rounded-full p-1 text-[#65676B] transition hover:bg-gray-200"
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
                          : "rounded-bl-sm border border-gray-100 bg-white text-[#050505]"
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
                                      : "border-[#A35A2A] bg-gray-50"
                                  )}
                                >
                                  <Reply size={12} className="mt-0.5 shrink-0 opacity-70" />
                                  <div className="min-w-0">
                                    <p className="font-semibold">{preview.sender}</p>
                                    <p className="line-clamp-2 opacity-80">{preview.text}</p>
                                  </div>
                                </div>
                              )
                            })()}
                          <p className="whitespace-pre-wrap break-words">{message.text || ""}</p>
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
                            message.isMine ? "text-white/70" : "text-[#65676B]"
                          )}
                        >
                          {formatTime(message.createdAt)}
                        {message.isMine && <ReceiptTicks receipt={message.receipt || "sent"} className="mb-0.5" />}
                        </p>
                      </div>
                      {messageReactions[message.id] && (
                        <span
                          className={cn(
                            "absolute -bottom-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full border-2 bg-white text-xs",
                            message.isMine ? "-left-2 border-[#A35A2A]" : "-right-2 border-white shadow-sm"
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
              <div ref={endRef} />
            </div>

            <footer className="border-t border-gray-100 bg-white p-2">
              {replyTo && (
                <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-[#F0F2F5] px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-semibold">
                      Réponse à {replyTo.isMine ? "vous" : (conversation.contact.name || "Utilisateur")}
                    </span>
                    <p className="truncate text-[#65676B]">{replyTo.text || "Pièce jointe"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    aria-label="Annuler la réponse"
                    className="shrink-0 rounded-full p-1 text-[#65676B] transition hover:bg-gray-200"
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
                      className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-[#65676B] transition hover:bg-gray-200"
                    >
                      <ImageIcon size={13} />
                      {fileLabel(image)} <span aria-hidden="true">×</span>
                    </button>
                  )}
                  {video && (
                    <button
                      type="button"
                      onClick={() => setVideo(null)}
                      className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-[#65676B] transition hover:bg-gray-200"
                    >
                      <Video size={13} />
                      {fileLabel(video)} <span aria-hidden="true">×</span>
                    </button>
                  )}
                  {documentFile && (
                    <button
                      type="button"
                      onClick={() => setDocumentFile(null)}
                      className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-[#65676B] transition hover:bg-gray-200"
                    >
                      <Paperclip size={13} />
                      {fileLabel(documentFile)} <span aria-hidden="true">×</span>
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-0.5 rounded-full bg-[#F0F2F5] py-1 pl-1 pr-1">
                <label className="cursor-pointer rounded-full p-2 text-[#65676B] transition hover:bg-gray-200" title="Envoyer une image">
                  <ImageIcon size={17} />
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => setImage(event.target.files?.[0] || null)} />
                </label>
                <label className="cursor-pointer rounded-full p-2 text-[#65676B] transition hover:bg-gray-200" title="Envoyer une vidéo">
                  <Video size={17} />
                  <input type="file" accept="video/mp4,video/ogg,video/webm" className="hidden" onChange={(event) => setVideo(event.target.files?.[0] || null)} />
                </label>
                <label className="cursor-pointer rounded-full p-2 text-[#65676B] transition hover:bg-gray-200" title="Envoyer un fichier">
                  <Paperclip size={17} />
                  <input type="file" className="hidden" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} />
                </label>
                <input
                  type="text"
                  value={text}
                  onChange={(event) => setText(event.target.value.slice(0, MESSAGE_MAX_LENGTH))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void handleSend()
                    }
                  }}
                  placeholder="Écrire un message..."
                  aria-label="Écrire un message"
                  className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-[#050505] outline-none placeholder:text-[#65676B]"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || (!text.trim() && !image && !video && !documentFile)}
                  aria-label="Envoyer"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#A35A2A] text-white transition hover:bg-[#8f4f25] disabled:opacity-40"
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
