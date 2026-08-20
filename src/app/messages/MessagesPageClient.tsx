"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import type { AxiosError } from "axios"
import {
  FileText,
  ImageIcon,
  LoaderCircle,
  MessageCircle,
  Paperclip,
  Plus,
  RefreshCcw,
  Reply,
  Search,
  Send,
  Video,
  X,
} from "lucide-react"
import { toast } from "sonner"
import MainLayout from "@/components/layout/MainLayout"
import Avatar from "@/components/common/Avatar"
import apiClient from "@/lib/apiClient"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/queries/use-auth"
import type { ChatContact, ChatMessage, ChatSummary } from "@/lib/messages"

const POLL_INTERVAL_MS = 5_000
const MESSAGE_PREVIEW_LENGTH = 280

function MessageText({ text, isMine }: { text: string; isMine: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > MESSAGE_PREVIEW_LENGTH
  const displayedText = isLong && !expanded
    ? `${text.slice(0, MESSAGE_PREVIEW_LENGTH).trimEnd()}…`
    : text

  return (
    <div>
      <p className="whitespace-pre-wrap break-words text-sm">{displayedText}</p>
      {isLong && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className={cn(
            "mt-1 text-xs font-semibold underline-offset-2 hover:underline",
            isMine ? "text-white/90" : "text-[#A35A2A]"
          )}
        >
          {expanded ? "Voir moins" : "Voir plus"}
        </button>
      )}
    </div>
  )
}

function formatMessageDate(value: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function fileLabel(file: File | null) {
  return file ? `${file.name} (${Math.ceil(file.size / 1024)} Ko)` : ""
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
  const [text, setText] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  const [document, setDocument] = useState<File | null>(null)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [loadingChats, setLoadingChats] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const previousMessageCountRef = useRef(0)

  useEffect(() => {
    if (!currentUserId || !activeTarget || /^\d+$/.test(activeTarget)) return
    const correctedTarget = contactIdFromConversationKey(activeTarget, currentUserId)
    if (correctedTarget === activeTarget) return
    // Corrige les anciennes URL créées avec une clé de conversation (ex. 34243-34257).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTarget(correctedTarget)
    router.replace(`/messages?target=${encodeURIComponent(correctedTarget)}`)
  }, [activeTarget, currentUserId, router])

  const loadChats = useCallback(async () => {
    if (!currentUserId) return
    setLoadingChats(true)
    try {
      const { data } = await apiClient.get("/messages/chats", { params: { userId: currentUserId } })
      if (!data?.success) throw new Error(data?.message || "Erreur de chargement")
      setChats(Array.isArray(data.chats) ? data.chats : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger les conversations")
    } finally {
      setLoadingChats(false)
    }
  }, [currentUserId])

  useEffect(() => {
    // Le chargement distant est intentionnellement déclenché au changement d'utilisateur.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadChats()
  }, [loadChats])

  useEffect(() => {
    const query = contactQuery.trim()
    if (!composing || query.length < 2 || !currentUserId) return
    const timer = window.setTimeout(() => {
      setSearchingContacts(true)
      apiClient
        .get("/messages/contacts", { params: { userId: currentUserId, q: query } })
        .then(({ data }) => setContactResults(Array.isArray(data?.contacts) ? data.contacts : []))
        .catch(() => setContactResults([]))
        .finally(() => setSearchingContacts(false))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [composing, contactQuery, currentUserId])

  useEffect(() => {
    if (!activeTarget || chats.some((chat) => chat.contact.id === activeTarget)) {
      return
    }
    let cancelled = false
    apiClient
      .get("/messages/contact", {
        params: { targetUserId: activeTarget, currentUserId },
      })
      .then(({ data }) => {
        if (!cancelled && data?.contact) setStandaloneContact(data.contact)
      })
      .catch(() => {
        if (!cancelled) {
          setStandaloneContact({ id: activeTarget, name: `Utilisateur ${activeTarget}` })
        }
      })
    return () => { cancelled = true }
  }, [activeTarget, chats, currentUserId])

  const loadMessages = useCallback(async (showLoader = false) => {
    if (!currentUserId || !activeTarget) return
    if (showLoader) setLoadingMessages(true)
    try {
      const { data } = await apiClient.get("/messages/conversation", {
        params: { userId: currentUserId, targetUserId: activeTarget },
      })
      if (!data?.success) throw new Error(data?.message || "Erreur de chargement")
      setMessages(Array.isArray(data.messages) ? data.messages : [])
    } catch (error) {
      if (showLoader) {
        toast.error(error instanceof Error ? error.message : "Impossible de charger les messages")
      }
    } finally {
      if (showLoader) setLoadingMessages(false)
    }
  }, [activeTarget, currentUserId])

  useEffect(() => {
    if (!activeTarget || !currentUserId) {
      return
    }
    // Premier chargement, puis polling silencieux de la conversation active.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMessages(true)
    const timer = window.setInterval(() => void loadMessages(false), POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [activeTarget, currentUserId, loadMessages])

  useEffect(() => {
    if (messages.length !== previousMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      previousMessageCountRef.current = messages.length
    }
  }, [messages.length])

  const selectedContact = useMemo(
    () => chats.find((chat) => chat.contact.id === activeTarget)?.contact || standaloneContact,
    [activeTarget, chats, standaloneContact]
  )
  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return chats
    return chats.filter((chat) =>
      `${chat.contact.name} ${chat.contact.username || ""}`.toLowerCase().includes(query)
    )
  }, [chats, search])

  const selectTarget = (target: string) => {
    setMessages([])
    setStandaloneContact(null)
    setActiveTarget(target)
    setReplyTo(null)
    setComposing(false)
    setContactQuery("")
    setContactResults([])
    router.replace(`/messages?target=${encodeURIComponent(target)}`)
  }

  const handleSend = async () => {
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
      const { data } = await apiClient.post("/messages/send", formData, { timeout: 60_000 })
      if (!data?.success) throw new Error(data?.message || "Envoi impossible")
      setText("")
      setImage(null)
      setVideo(null)
      setDocument(null)
      setReplyTo(null)
      await Promise.all([loadMessages(false), loadChats()])
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>
      toast.error(axiosError.response?.data?.message || axiosError.message || "Impossible d’envoyer le message")
    } finally {
      setSending(false)
    }
  }

  if (authLoading) {
    return <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center"><LoaderCircle className="animate-spin text-[#A35A2A]" /></div>
  }

  return (
    <MainLayout user={user} noRightSidebar wide active="messages" workspace>
      <section className="h-[calc(100vh-108px)] min-h-[560px] w-full overflow-hidden rounded-[28px] border border-[#E7E2DE] bg-white shadow-[0_10px_35px_rgba(73,45,24,0.08)]">
        <div className="grid h-full min-h-0 md:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={cn("min-h-0 border-r border-gray-100 flex-col", activeTarget ? "hidden md:flex" : "flex")}>
            <div className="border-b border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-xl font-bold text-[#050505]">Messages</h1>
                <div className="flex items-center gap-1">
                  <button onClick={() => setComposing(true)} className="rounded-full bg-[#A35A2A] p-2 text-white hover:bg-[#8B4A1F]" aria-label="Nouveau message" title="Nouveau message"><Plus size={18} /></button>
                  <button onClick={() => void loadChats()} className="rounded-full p-2 hover:bg-gray-100" aria-label="Actualiser"><RefreshCcw size={18} className={cn(loadingChats && "animate-spin")} /></button>
                </div>
              </div>
              {composing ? (
                <div>
                  <label className="flex items-center gap-2 rounded-full bg-[#FFF7F1] px-3 py-2 ring-1 ring-[#A35A2A]/30">
                    <Search size={16} className="text-[#A35A2A]" />
                    <input autoFocus value={contactQuery} onChange={(event) => setContactQuery(event.target.value)} placeholder="Nom ou identifiant..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                    <button type="button" onClick={() => { setComposing(false); setContactQuery(""); setContactResults([]) }} aria-label="Annuler"><X size={15} /></button>
                  </label>
                  <p className="mt-2 px-2 text-[11px] text-[#65676B]">Recherchez une personne pour commencer.</p>
                </div>
              ) : (
                <label className="flex items-center gap-2 rounded-full bg-[#F0F2F5] px-3 py-2">
                  <Search size={16} className="text-[#65676B]" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une conversation..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                </label>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:thin] [scrollbar-color:#C9A68D_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#C9A68D] [&::-webkit-scrollbar-track]:bg-transparent">
              {composing ? (
                searchingContacts ? (
                  <div className="flex justify-center py-8"><LoaderCircle className="animate-spin text-[#A35A2A]" /></div>
                ) : contactQuery.trim().length < 2 ? (
                  <div className="px-5 py-10 text-center"><MessageCircle size={34} className="mx-auto mb-2 text-[#D7B49A]" /><p className="text-sm text-[#65676B]">Saisissez au moins deux caractères.</p></div>
                ) : contactResults.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-[#65676B]">Aucun utilisateur trouvé.</p>
                ) : contactResults.map((contact) => (
                  <button key={contact.id} onClick={() => selectTarget(contact.id)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-[#FFF7F1]">
                    <Avatar src={contact.avatar} name={contact.name} size="md" />
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{contact.name}</p>{contact.username && <p className="truncate text-xs text-[#65676B]">@{contact.username}</p>}</div>
                  </button>
                ))
              ) : loadingChats && chats.length === 0 ? (
                <div className="flex justify-center py-8"><LoaderCircle className="animate-spin text-[#A35A2A]" /></div>
              ) : filteredChats.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF1E7] text-[#A35A2A]"><MessageCircle size={24} /></div>
                  <p className="font-semibold text-[#2D2D2D]">Aucune conversation</p>
                  <p className="mt-1 text-xs text-[#65676B]">Écrivez à une personne pour commencer.</p>
                  <button onClick={() => setComposing(true)} className="mt-4 rounded-full bg-[#A35A2A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#8B4A1F]">Nouveau message</button>
                </div>
              ) : filteredChats.map((chat) => (
                <button key={chat.id} onClick={() => selectTarget(chat.contact.id)} className={cn("flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-[#F7F8FA]", activeTarget === chat.contact.id && "bg-[#A35A2A]/10")}>
                  <Avatar src={chat.contact.avatar} name={chat.contact.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{chat.contact.name}</span>
                      <span className="text-[10px] text-[#65676B]">{formatMessageDate(chat.updatedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-[#65676B]">{chat.lastMessage || "Nouvelle conversation"}</span>
                      {chat.unreadCount > 0 && <span className="rounded-full bg-[#A35A2A] px-1.5 text-[10px] font-bold text-white">{chat.unreadCount}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <div className={cn("min-h-0 min-w-0 flex-col overflow-hidden", activeTarget ? "flex" : "hidden md:flex")}>
            {!activeTarget ? (
              <div className="flex flex-1 flex-col items-center justify-center text-center text-[#65676B]">
                <MessageCircle size={52} className="mb-3 text-[#A35A2A]/50" />
                <p className="font-semibold text-[#050505]">Sélectionnez une conversation</p>
                <p className="text-sm">Vos messages apparaîtront ici.</p>
                <button onClick={() => setComposing(true)} className="mt-5 rounded-full bg-[#A35A2A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B4A1F]">Démarrer une conversation</button>
              </div>
            ) : (
              <>
                <header className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                  <button onClick={() => { setActiveTarget(""); router.replace("/messages") }} className="md:hidden rounded-full p-2 hover:bg-gray-100" aria-label="Retour">‹</button>
                  <Avatar src={selectedContact?.avatar} name={selectedContact?.name || "Utilisateur"} size="md" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{selectedContact?.name || `Utilisateur ${activeTarget}`}</p>
                    <p className="text-xs text-[#65676B]">{selectedContact?.online ? "En ligne" : "Conversation"}</p>
                  </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F7F8FA] p-3 pr-2 sm:p-5 sm:pr-3 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#B98663_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#B98663] [&::-webkit-scrollbar-thumb:hover]:bg-[#A35A2A] [&::-webkit-scrollbar-track]:bg-transparent">
                  {loadingMessages ? (
                    <div className="flex h-full items-center justify-center"><LoaderCircle className="animate-spin text-[#A35A2A]" /></div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-[#65676B]">
                      <MessageCircle size={42} className="mb-2 text-[#A35A2A]/50" />
                      <p className="font-medium text-[#050505]">Commencez la conversation</p>
                      <p className="text-sm">Envoyez votre premier message.</p>
                    </div>
                  ) : messages.map((message) => (
                    <div key={message.id} className={cn("group mb-3 flex", message.isMine ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[82%] sm:max-w-[70%] rounded-2xl px-3 py-2 shadow-sm", message.isMine ? "rounded-br-md bg-[#A35A2A] text-white" : "rounded-bl-md bg-white text-[#050505]")}>
                        {message.reply && (
                          <div className={cn("mb-2 rounded-lg border-l-2 px-2 py-1 text-xs", message.isMine ? "border-white/60 bg-white/10" : "border-[#A35A2A] bg-gray-50")}>
                            <p className="font-semibold">{message.reply.sender}</p>
                            <p className="truncate opacity-80">{message.reply.text}</p>
                          </div>
                        )}
                        {message.text && <MessageText text={message.text} isMine={message.isMine} />}
                        {message.attachments.map((attachment, index) => (
                          <div key={`${attachment.url}-${index}`} className="mt-2 overflow-hidden rounded-xl">
                            {attachment.type === "image" && <Image src={attachment.url} alt="Image jointe" width={480} height={360} unoptimized className="max-h-80 w-auto object-contain" />}
                            {attachment.type === "video" && <video src={attachment.url} controls className="max-h-80 max-w-full" />}
                            {attachment.type === "document" && <a href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-black/10 p-2 text-sm underline"><FileText size={18} />{attachment.name || "Ouvrir le document"}</a>}
                          </div>
                        ))}
                        <div className="mt-1 flex items-center justify-end gap-2">
                          <button onClick={() => setReplyTo(message)} className="opacity-0 transition group-hover:opacity-70" aria-label="Répondre"><Reply size={13} /></button>
                          <span className={cn("text-[10px]", message.isMine ? "text-white/70" : "text-[#65676B]")}>{formatMessageDate(message.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <footer className="border-t border-gray-100 p-3">
                  {replyTo && (
                    <div className="mb-2 flex items-center justify-between rounded-xl bg-[#F0F2F5] px-3 py-2 text-xs">
                      <div className="min-w-0"><span className="font-semibold">Réponse à {replyTo.isMine ? "vous" : selectedContact?.name}</span><p className="truncate text-[#65676B]">{replyTo.text || "Pièce jointe"}</p></div>
                      <button onClick={() => setReplyTo(null)} className="p-1"><X size={15} /></button>
                    </div>
                  )}
                  {(image || video || document) && (
                    <div className="mb-2 flex flex-wrap gap-2 text-xs">
                      {image && <button onClick={() => setImage(null)} className="rounded-full bg-gray-100 px-3 py-1">{fileLabel(image)} ×</button>}
                      {video && <button onClick={() => setVideo(null)} className="rounded-full bg-gray-100 px-3 py-1">{fileLabel(video)} ×</button>}
                      {document && <button onClick={() => setDocument(null)} className="rounded-full bg-gray-100 px-3 py-1">{fileLabel(document)} ×</button>}
                    </div>
                  )}
                  <div className="flex items-end gap-2 rounded-2xl bg-[#F0F2F5] p-2">
                    <label className="cursor-pointer rounded-full p-2 hover:bg-gray-200" title="Image"><ImageIcon size={18} /><input type="file" accept="image/*" className="hidden" onChange={(event) => setImage(event.target.files?.[0] || null)} /></label>
                    <label className="cursor-pointer rounded-full p-2 hover:bg-gray-200" title="Vidéo"><Video size={18} /><input type="file" accept="video/mp4,video/ogg,video/webm" className="hidden" onChange={(event) => setVideo(event.target.files?.[0] || null)} /></label>
                    <label className="cursor-pointer rounded-full p-2 hover:bg-gray-200" title="Document"><Paperclip size={18} /><input type="file" className="hidden" onChange={(event) => setDocument(event.target.files?.[0] || null)} /></label>
                    <textarea value={text} onChange={(event) => setText(event.target.value.slice(0, 500))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSend() } }} rows={1} placeholder="Écrire un message..." className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none" />
                    <button onClick={() => void handleSend()} disabled={sending || (!text.trim() && !image && !video && !document)} className="rounded-full bg-[#A35A2A] p-2.5 text-white disabled:opacity-40" aria-label="Envoyer">
                      {sending ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </div>
                  <p className="mt-1 text-right text-[10px] text-[#65676B]">{text.length}/500</p>
                </footer>
              </>
            )}
          </div>
        </div>
      </section>
    </MainLayout>
  )
}
