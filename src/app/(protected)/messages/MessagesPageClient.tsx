"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Edit,
  MessageCircle,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import MainLayout from "@/components/layout/MainLayout"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  deleteConversation,
  deleteMessage,
  editMessage,
  fetchChats,
  fetchContact,
  fetchConversation,
  searchContacts,
  sendMessage,
} from "@/services/messages/messages.service"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/queries/use-auth"
import type { ChatContact, ChatMessage, ChatSummary } from "@/lib/messages"
import {
  isMeaningfulReply,
  mergeLocalReplies,
  persistMessageReply,
} from "@/lib/messages"

import ConversationList from "@/components/messages/ConversationList"
import ChatWindow from "@/components/messages/ChatWindow"
import ConversationInfoPanel from "@/components/messages/ConversationInfoPanel"

const POLL_INTERVAL_MS = 5_000
const READ_CHATS_STORAGE_KEY = "dughu:read-conversations"
const READ_CHATS_EVENT = "dughu:read-conversations-changed"

function getApiErrorMessage(error: unknown, fallback: string): string {
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

function contactIdFromConversationKey(value: string, currentUserId: string) {
  if (/^\d+$/.test(value)) return value
  const participants = value.match(/\d+/g) || []
  return participants.find((id) => id !== currentUserId) || value
}

export default function MessagesPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedTarget = searchParams.get("target") || ""
  const { data: user, isLoading: authLoading } = useAuth()
  const currentUserId = String(user?.dughu?.userId || "")

  const [chats, setChats] = useState<ChatSummary[]>([])
  const [activeTarget, setActiveTarget] = useState(requestedTarget)
  const [standaloneContact, setStandaloneContact] = useState<ChatContact | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [search, setSearch] = useState("")
  const [composing, setComposing] = useState(false)
  const [contactQuery, setContactQuery] = useState("")
  const [contactResults, setContactResults] = useState<ChatContact[]>([])
  const [searchingContacts, setSearchingContacts] = useState(false)
  const [loadingChats, setLoadingChats] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [readMessageKeys, setReadMessageKeys] = useState<Record<string, string>>({})

  // Panneau d'information (colonne droite, visible par défaut)
  const [isInfoOpen, setIsInfoOpen] = useState(true)
  // Navigation sur smartphone (< 768px) : 'list' | 'chat' | 'info'
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false)

  // Édition de message
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const [updatingMessage, setUpdatingMessage] = useState(false)

  // Modale suppression de message
  const [deleteMessageTarget, setDeleteMessageTarget] = useState<ChatMessage | null>(null)
  const [deletingMessage, setDeletingMessage] = useState(false)

  // Modale suppression de conversation
  const [deleteConversationOpen, setDeleteConversationOpen] = useState(false)
  const [deletingConversation, setDeletingConversation] = useState(false)

  // Normalisation d'anciennes URLs
  useEffect(() => {
    if (!currentUserId || !activeTarget || /^\d+$/.test(activeTarget)) return
    const correctedTarget = contactIdFromConversationKey(activeTarget, currentUserId)
    if (correctedTarget === activeTarget) return
    setActiveTarget(correctedTarget)
    router.replace(`/messages?target=${encodeURIComponent(correctedTarget)}`)
  }, [activeTarget, currentUserId, router])

  // Chargement des conversations
  const loadChats = useCallback(async () => {
    if (!currentUserId) return
    setLoadingChats(true)
    try {
      const data = await fetchChats(currentUserId)
      if (!data?.success) throw new Error(data?.message || "Erreur de chargement")
      setChats(Array.isArray(data.chats) ? data.chats : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger les conversations")
    } finally {
      setLoadingChats(false)
    }
  }, [currentUserId])

  useEffect(() => {
    void loadChats()
  }, [loadChats])

  // Synchronisation des clés lues en local
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`${READ_CHATS_STORAGE_KEY}:${currentUserId}`)
      setReadMessageKeys(stored ? JSON.parse(stored) : {})
    } catch {
      setReadMessageKeys({})
    }
  }, [currentUserId])

  // Polling des conversations
  useEffect(() => {
    if (!currentUserId) return
    const timer = window.setInterval(() => void loadChats(), POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [currentUserId, loadChats])

  // Recherche de contacts pour nouveau message
  useEffect(() => {
    const query = contactQuery.trim()
    if (!composing || query.length < 2 || !currentUserId) return
    const timer = window.setTimeout(() => {
      setSearchingContacts(true)
      searchContacts({ userId: currentUserId, q: query })
        .then((data) => setContactResults(Array.isArray(data?.contacts) ? data.contacts : []))
        .catch(() => setContactResults([]))
        .finally(() => setSearchingContacts(false))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [composing, contactQuery, currentUserId])

  // Récupération des infos de contact pour un contact sans fil existant
  useEffect(() => {
    if (!activeTarget || chats.some((chat) => chat.contact.id === activeTarget)) {
      return
    }
    let cancelled = false
    fetchContact({ targetUserId: activeTarget, currentUserId })
      .then((data) => {
        if (!cancelled && data?.contact) setStandaloneContact(data.contact)
      })
      .catch(() => {
        if (!cancelled) {
          setStandaloneContact({ id: activeTarget, name: `Utilisateur ${activeTarget}` })
        }
      })
    return () => {
      cancelled = true
    }
  }, [activeTarget, chats, currentUserId])

  // Chargement des messages de la conversation active
  const loadMessages = useCallback(async (showLoader = false) => {
    if (!currentUserId || !activeTarget) return
    if (showLoader) setLoadingMessages(true)
    try {
      const data = await fetchConversation({ userId: currentUserId, targetUserId: activeTarget })
      if (!data?.success) throw new Error(data?.message || "Erreur de chargement")
      const serverMessages: ChatMessage[] = Array.isArray(data.messages) ? data.messages : []
      setMessages((current) => {
        const localReplies = new Map<string, NonNullable<ChatMessage["reply"]>>()
        for (const message of current) {
          if (isMeaningfulReply(message.reply) && message.id) {
            localReplies.set(message.id, message.reply)
          }
        }
        return mergeLocalReplies(serverMessages, localReplies)
      })
    } catch (error) {
      if (showLoader) {
        toast.error(error instanceof Error ? error.message : "Impossible de charger les messages")
      }
    } finally {
      if (showLoader) setLoadingMessages(false)
    }
  }, [activeTarget, currentUserId])

  useEffect(() => {
    if (!activeTarget || !currentUserId) return
    void loadMessages(true)
    const timer = window.setInterval(() => void loadMessages(false), POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [activeTarget, currentUserId, loadMessages])

  // Contact actif sélectionné
  const selectedContact = useMemo(
    () => chats.find((chat) => chat.contact.id === activeTarget)?.contact || standaloneContact,
    [activeTarget, chats, standaloneContact]
  )

  // Sélection d'une conversation
  const selectTarget = (target: string) => {
    const selectedChat = chats.find((chat) => chat.contact.id === target)
    if (selectedChat?.lastMessageKey) {
      setReadMessageKeys((current) => {
        const next = { ...current, [target]: selectedChat.lastMessageKey }
        window.localStorage.setItem(`${READ_CHATS_STORAGE_KEY}:${currentUserId}`, JSON.stringify(next))
        window.dispatchEvent(
          new CustomEvent(READ_CHATS_EVENT, { detail: { userId: currentUserId, keys: next } })
        )
        return next
      })
    }
    setMessages([])
    setStandaloneContact(null)
    setActiveTarget(target)
    setComposing(false)
    setContactQuery("")
    setContactResults([])
    setMobileInfoOpen(false)
    router.replace(`/messages?target=${encodeURIComponent(target)}`)
  }

  // Marquer toutes les conversations comme lues
  const handleMarkAllAsRead = () => {
    const nextKeys = { ...readMessageKeys }
    for (const chat of chats) {
      if (chat.lastMessageKey) {
        nextKeys[chat.contact.id] = chat.lastMessageKey
      }
    }
    setReadMessageKeys(nextKeys)
    window.localStorage.setItem(`${READ_CHATS_STORAGE_KEY}:${currentUserId}`, JSON.stringify(nextKeys))
    window.dispatchEvent(
      new CustomEvent(READ_CHATS_EVENT, { detail: { userId: currentUserId, keys: nextKeys } })
    )
    toast.success("Toutes les conversations ont été marquées comme lues.")
  }

  // Envoi d'un message (texte, médias, citation)
  const handleSendMessage = async ({
    text,
    image,
    video,
    document,
    replyTo,
  }: {
    text: string
    image?: File | null
    video?: File | null
    document?: File | null
    replyTo?: ChatMessage | null
  }) => {
    if (!currentUserId || !activeTarget || sending) return
    if (!text.trim() && !image && !video && !document) {
      toast.error("Ajoutez un message ou un fichier")
      return
    }
    if (text.trim().length > 500) {
      toast.error("Le message ne peut pas dépasser 500 caractères")
      return
    }

    const formData = new FormData()
    formData.set("user_id", currentUserId)
    formData.set("target_user_id", activeTarget)
    if (text.trim()) formData.set("message", text.trim())
    if (image) formData.set("image", image)
    if (video) formData.set("video", video)
    if (document) formData.set("document", document)
    if (replyTo) {
      formData.set("reply_doc_id", replyTo.id)
      formData.set("reply_sender", replyTo.isMine ? (user?.name || "Moi") : (selectedContact?.name || "Utilisateur"))
      formData.set("reply_text", replyTo.text)
    }

    setSending(true)
    try {
      const data = await sendMessage(formData)
      if (!data?.success) throw new Error(data?.message || "Envoi impossible")
      const replyInfo = replyTo
        ? {
            id: replyTo.id,
            sender: replyTo.isMine ? (user?.name || "Moi") : (selectedContact?.name || "Utilisateur"),
            text: replyTo.text || "Pièce jointe",
          }
        : null

      const sentMessage = data.sentMessage as ChatMessage | null | undefined
      const normalizedSentReply = isMeaningfulReply(sentMessage?.reply) ? sentMessage!.reply : null

      if (sentMessage?.id && replyInfo) persistMessageReply(sentMessage.id, replyInfo)

      if (sentMessage) {
        setMessages((current) =>
          current.some((item) => item.id === sentMessage.id)
            ? current.map((item) =>
                item.id === sentMessage.id ? { ...item, reply: replyInfo ?? normalizedSentReply } : item
              )
            : [...current, { ...sentMessage, reply: replyInfo ?? normalizedSentReply, receipt: "sent" as const }]
        )
      }

      await Promise.all([loadMessages(false), loadChats()])

      if (sentMessage?.id) {
        setMessages((current) =>
          current.map((item) =>
            item.id === sentMessage.id ? { ...item, reply: replyInfo ?? item.reply ?? null } : item
          )
        )
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Impossible d’envoyer le message"))
    } finally {
      setSending(false)
    }
  }

  // Édition de message
  const startEditMessage = (message: ChatMessage) => {
    setEditingMessageId(message.id)
    setEditDraft(message.text || "")
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
    if (trimmed.length > 500) {
      toast.error("Le message ne peut pas dépasser 500 caractères.")
      return
    }
    setUpdatingMessage(true)
    try {
      const data = await editMessage({
        messageId: editingMessageId,
        userId: currentUserId,
        message: trimmed,
        targetUserId: activeTarget,
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
      toast.error(getApiErrorMessage(error, "Impossible de modifier le message."))
    } finally {
      setUpdatingMessage(false)
    }
  }

  // Suppression de message
  const confirmDeleteMessage = async (deleteType: "me" | "all") => {
    if (!deleteMessageTarget || !currentUserId || deletingMessage) return
    setDeletingMessage(true)
    try {
      const data = await deleteMessage({
        messageId: deleteMessageTarget.id,
        userId: currentUserId,
        targetUserId: activeTarget,
        deleteType,
      })
      if (!data?.success) throw new Error(data?.message || "Suppression impossible")
      setMessages((current) => current.filter((item) => item.id !== deleteMessageTarget.id))
      persistMessageReply(deleteMessageTarget.id, null)
      setDeleteMessageTarget(null)
      void loadChats()
      toast.success(
        deleteType === "all" ? "Message supprimé pour tout le monde." : "Message supprimé pour vous."
      )
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Impossible de supprimer le message."))
    } finally {
      setDeletingMessage(false)
    }
  }

  // Suppression de conversation complète
  const confirmDeleteConversation = async () => {
    if (!currentUserId || deletingConversation) return
    const conversationId = chats.find((chat) => chat.contact.id === activeTarget)?.id || activeTarget
    if (!conversationId) return
    setDeletingConversation(true)
    try {
      const data = await deleteConversation({
        conversationId,
        userId: currentUserId,
        targetUserId: activeTarget,
      })
      if (!data?.success) throw new Error(data?.message || "Suppression impossible")
      setDeleteConversationOpen(false)
      setMessages([])
      setStandaloneContact(null)
      setActiveTarget("")
      router.replace("/messages")
      void loadChats()
      toast.success("Conversation supprimée.")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Impossible de supprimer la conversation."))
    } finally {
      setDeletingConversation(false)
    }
  }

  if (authLoading) {
    return (
      <MainLayout noRightSidebar noLeftSidebar wide active="messages" workspace hideBottomNav={Boolean(activeTarget)}>
        <div className="flex h-full w-full border border-[#E5E5E5] bg-white md:rounded-2xl overflow-hidden animate-pulse">
          {/* Skeleton Colonne 1 */}
          <div className="h-full w-full shrink-0 border-r border-[#E5E5E5] md:w-[360px] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-7 w-32 rounded-full bg-gray-200" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9 rounded-full bg-gray-200" />
                <Skeleton className="h-9 w-9 rounded-full bg-gray-200" />
              </div>
            </div>
            <Skeleton className="h-9 w-full rounded-full bg-gray-200" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-14 rounded-full bg-[#8B5E34]/15" />
              <Skeleton className="h-6 w-16 rounded-full bg-gray-200" />
            </div>
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28 rounded-full bg-gray-200" />
                    <Skeleton className="h-3 w-40 rounded-full bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Skeleton Colonne 2 */}
          <div className="hidden md:flex flex-1 flex-col h-full p-4 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#E5E5E5] pb-3">
              <Skeleton className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32 rounded-full bg-gray-200" />
                <Skeleton className="h-2.5 w-16 rounded-full bg-gray-200" />
              </div>
            </div>
            <div className="flex-1 space-y-4 pt-4">
              <div className="flex items-end gap-2">
                <Skeleton className="h-8 w-8 rounded-full bg-gray-200" />
                <Skeleton className="h-10 w-48 rounded-2xl bg-gray-200" />
              </div>
              <div className="flex justify-end">
                <Skeleton className="h-12 w-64 rounded-2xl bg-[#8B5E34]/15" />
              </div>
              <div className="flex items-end gap-2">
                <Skeleton className="h-8 w-8 rounded-full bg-gray-200" />
                <Skeleton className="h-14 w-56 rounded-2xl bg-gray-200" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-full bg-gray-200" />
          </div>
          {/* Skeleton Colonne 3 */}
          <div className="hidden lg:flex w-[320px] shrink-0 border-l border-[#E5E5E5] flex-col items-center p-6 space-y-4">
            <Skeleton className="h-20 w-20 rounded-full bg-gray-200" />
            <Skeleton className="h-4 w-32 rounded-full bg-gray-200" />
            <Skeleton className="h-6 w-40 rounded-full bg-gray-200" />
            <div className="w-full space-y-3 pt-6">
              <Skeleton className="h-10 w-full rounded-xl bg-gray-200" />
              <Skeleton className="h-10 w-full rounded-xl bg-gray-200" />
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout
      user={user}
      noRightSidebar
      noLeftSidebar
      wide
      active="messages"
      workspace
      hideBottomNav={Boolean(activeTarget)}
    >
      {/* ── Conteneur Général 3 Colonnes Fixes ───────────────────────────── */}
      <section className="h-full w-full overflow-hidden border border-[#E5E5E5] bg-white md:rounded-2xl md:shadow-[0_8px_30px_rgba(139,94,52,0.06)] flex flex-col">
        <div className="relative flex h-full w-full min-h-0 flex-1">
          {/* ── Colonne 1 : Liste des discussions (~360px) ───────────────── */}
          <aside
            className={cn(
              "h-full w-full shrink-0 border-r border-[#E5E5E5] md:w-[360px] flex-col",
              activeTarget ? "hidden md:flex" : "flex"
            )}
          >
            <ConversationList
              chats={chats}
              activeTarget={activeTarget}
              currentUserId={currentUserId}
              readMessageKeys={readMessageKeys}
              loadingChats={loadingChats}
              onSelectChat={selectTarget}
              onRefreshChats={loadChats}
              onMarkAllAsRead={handleMarkAllAsRead}
              search={search}
              onSearchChange={setSearch}
              composing={composing}
              onStartComposing={() => setComposing(true)}
              onCancelComposing={() => {
                setComposing(false)
                setContactQuery("")
                setContactResults([])
              }}
              contactQuery={contactQuery}
              onContactQueryChange={setContactQuery}
              contactResults={contactResults}
              searchingContacts={searchingContacts}
            />
          </aside>

          {/* ── Colonne 2 : Fenêtre de conversation active (flex-grow) ────── */}
          <main
            className={cn(
              "h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
              activeTarget
                ? mobileInfoOpen
                  ? "hidden md:flex"
                  : "flex"
                : "hidden md:flex"
            )}
          >
            {!activeTarget ? (
              /* État d'attente desktop : aucune conversation sélectionnée */
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#8B5E34]/10 text-[#8B5E34]">
                  <MessageCircle size={44} />
                </div>
                <h2 className="text-xl font-bold text-[#1C1E21]">
                  Sélectionnez une discussion
                </h2>
                <p className="mt-1.5 max-w-sm text-sm text-[#65676B]">
                  Choisissez une conversation dans la liste de gauche ou commencez un nouveau message.
                </p>
                <button
                  type="button"
                  onClick={() => setComposing(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#8B5E34] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#734A26] active:scale-95"
                >
                  <Edit size={16} />
                  Démarrer une conversation
                </button>
              </div>
            ) : (
              <ChatWindow
                currentUserId={currentUserId}
                currentUserName={user?.name}
                contact={selectedContact}
                activeTarget={activeTarget}
                messages={messages}
                loadingMessages={loadingMessages}
                sending={sending}
                onSendMessage={handleSendMessage}
                onStartEditMessage={startEditMessage}
                onDeleteMessagePrompt={(msg) => setDeleteMessageTarget(msg)}
                isInfoOpen={isInfoOpen || mobileInfoOpen}
                onToggleInfo={() => {
                  // Sur mobile bascule vers la vue info dédiée
                  setMobileInfoOpen((prev) => !prev)
                  // Sur desktop bascule la 3e colonne
                  setIsInfoOpen((prev) => !prev)
                }}
                onBackToList={() => {
                  setActiveTarget("")
                  router.replace("/messages")
                }}
                editingMessageId={editingMessageId}
                editDraft={editDraft}
                onEditDraftChange={setEditDraft}
                onSaveEditMessage={saveEditMessage}
                onCancelEditMessage={cancelEditMessage}
                updatingMessage={updatingMessage}
              />
            )}
          </main>

          {/* ── Colonne 3 : Panneau d'informations discussion (~320px, masquable) ── */}
          <aside
            className={cn(
              "h-full shrink-0 flex-col overflow-hidden md:w-[320px]",
              // Sur mobile : visible si activeTarget et mobileInfoOpen sont vrais
              activeTarget && mobileInfoOpen
                ? "flex w-full absolute inset-0 z-30 bg-white md:relative md:z-auto"
                : "hidden",
              // Sur desktop : toujours visible si isInfoOpen est vrai
              isInfoOpen ? "md:flex" : "md:hidden"
            )}
          >
            {activeTarget ? (
              <ConversationInfoPanel
                contact={selectedContact}
                messages={messages}
                onClose={() => {
                  setIsInfoOpen(false)
                  setMobileInfoOpen(false)
                }}
                onDeleteConversation={() => setDeleteConversationOpen(true)}
              />
            ) : (
              <div className="flex h-full w-full flex-col border-l border-[#E5E5E5] bg-white">
                <div className="flex items-center justify-between border-b border-[#E5E5E5] px-4 py-3 shrink-0">
                  <h2 className="text-sm font-bold text-[#1C1E21]">Infos discussion</h2>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-[#65676B]">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0F2F5] text-[#8B5E34]">
                    <MessageCircle size={24} />
                  </div>
                  <p className="text-xs font-semibold text-[#1C1E21]">Aucune discussion active</p>
                  <p className="mt-1 text-[11px] text-[#65676B]">
                    Sélectionnez une discussion pour afficher le profil, les fichiers partagés et les options.
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* ── Dialog : Confirmation supprimer un message ────────────────────── */}
      <Dialog
        open={!!deleteMessageTarget}
        onOpenChange={(open) => !open && setDeleteMessageTarget(null)}
      >
        <DialogContent showCloseButton className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-[#1C1E21]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF3F4] text-[#E4405F]">
                <Trash2 size={16} />
              </span>
              Supprimer le message
            </DialogTitle>
            <DialogDescription className="text-xs text-[#65676B]">
              Voulez-vous supprimer ce message pour vous uniquement ou pour tous les participants ?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 flex flex-col gap-2">
            <Button
              variant="destructive"
              className="w-full rounded-xl bg-[#E4405F] hover:bg-[#c9324e]"
              onClick={() => void confirmDeleteMessage("all")}
              disabled={deletingMessage}
            >
              {deletingMessage ? "Suppression..." : "Supprimer pour tout le monde"}
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl border-[#E5E5E5] hover:bg-[#F0F2F5]"
              onClick={() => void confirmDeleteMessage("me")}
              disabled={deletingMessage}
            >
              Supprimer pour moi
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-xl"
              onClick={() => setDeleteMessageTarget(null)}
              disabled={deletingMessage}
            >
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : Confirmation supprimer la conversation ───────────────── */}
      <Dialog
        open={deleteConversationOpen}
        onOpenChange={setDeleteConversationOpen}
      >
        <DialogContent showCloseButton className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-[#1C1E21]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF3F4] text-[#E4405F]">
                <Trash2 size={16} />
              </span>
              Supprimer la conversation
            </DialogTitle>
            <DialogDescription className="text-xs text-[#65676B]">
              Voulez-vous vraiment supprimer toute la conversation avec{" "}
              <strong className="text-[#1C1E21]">{selectedContact?.name || "ce contact"}</strong> ?
              Cette action supprimera l'historique complet de manière irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteConversationOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl bg-[#E4405F] hover:bg-[#c9324e]"
              onClick={() => void confirmDeleteConversation()}
              disabled={deletingConversation}
            >
              {deletingConversation ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </MainLayout>
  )
}
