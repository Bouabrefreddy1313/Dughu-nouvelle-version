"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import {
  ArrowLeft,
  Check,
  CheckCheck,
  FileText,
  ImageIcon,
  MoreVertical,
  Paperclip,
  Pencil,
  Quote,
  Reply,
  Send,
  Smile,
  ThumbsUp,
  Trash2,
  Video,
  X,
} from "lucide-react"
import { toast } from "sonner"
import Avatar from "@/components/common/Avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { ChatContact, ChatMessage } from "@/lib/messages"
import { isMeaningfulReply, resolveReplyPreview } from "@/lib/messages"
import { formatLastSeen, formatMessageDividerDate, formatMessageTime } from "./message-formatters"

interface ChatWindowProps {
  currentUserId: string
  currentUserName?: string
  contact: ChatContact | null
  activeTarget: string
  messages: ChatMessage[]
  loadingMessages: boolean
  sending: boolean
  isTyping?: boolean
  onTyping?: () => void
  onSendMessage: (content: {
    text: string
    image?: File | null
    video?: File | null
    document?: File | null
    replyTo?: ChatMessage | null
  }) => Promise<void>
  onStartEditMessage: (message: ChatMessage) => void
  onDeleteMessagePrompt: (message: ChatMessage) => void
  // Toggle info sidebar
  isInfoOpen: boolean
  onToggleInfo: () => void
  // Navigation mobile retour
  onBackToList: () => void
  // Edition en cours
  editingMessageId: string | null
  editDraft: string
  onEditDraftChange: (value: string) => void
  onSaveEditMessage: () => Promise<void>
  onCancelEditMessage: () => void
  updatingMessage: boolean
}

function shouldShowDateDivider(currMsg: ChatMessage, prevMsg?: ChatMessage) {
  if (!prevMsg) return true
  const currTime = new Date(currMsg.createdAt).getTime()
  const prevTime = new Date(prevMsg.createdAt).getTime()
  if (Number.isNaN(currTime) || Number.isNaN(prevTime)) return false
  // Afficher si plus de 25 minutes d'écart
  return currTime - prevTime > 25 * 60 * 1000
}

export default function ChatWindow({
  currentUserId,
  currentUserName,
  contact,
  activeTarget,
  messages,
  loadingMessages,
  sending,
  isTyping,
  onTyping,
  onSendMessage,
  onStartEditMessage,
  onDeleteMessagePrompt,
  isInfoOpen,
  onToggleInfo,
  onBackToList,
  editingMessageId,
  editDraft,
  onEditDraftChange,
  onSaveEditMessage,
  onCancelEditMessage,
  updatingMessage,
}: ChatWindowProps) {
  const [text, setText] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  const [document, setDocument] = useState<File | null>(null)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll en bas quand la liste de messages change
  const previousMessageCount = useRef(0)
  useEffect(() => {
    if (messages.length !== previousMessageCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      previousMessageCount.current = messages.length
    }
  }, [messages.length])

  // Scroll initial dès que le chargement se termine
  useEffect(() => {
    if (!loadingMessages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
    }
  }, [loadingMessages, messages.length])

  // Fermer le menu d'un message lors d'un clic extérieur
  useEffect(() => {
    if (!activeMenuMessageId) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (target instanceof Element && target.closest("[data-message-menu]")) return
      setActiveMenuMessageId(null)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveMenuMessageId(null)
    }
    window.addEventListener("mousedown", onPointerDown)
    window.addEventListener("touchstart", onPointerDown)
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("mousedown", onPointerDown)
      window.removeEventListener("touchstart", onPointerDown)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [activeMenuMessageId])

  // Envoi effectif
  const handleSend = async () => {
    if (sending) return
    if (!text.trim() && !image && !video && !document) return

    const toSend = {
      text: text.trim(),
      image,
      video,
      document,
      replyTo,
    }

    // Reset composer
    setText("")
    setImage(null)
    setVideo(null)
    setDocument(null)
    setReplyTo(null)
    setShowEmojiPicker(false)

    await onSendMessage(toSend)
  }

  // Envoi rapide du pouce levé 👍
  const handleSendThumb = async () => {
    if (sending) return
    await onSendMessage({
      text: "👍",
      replyTo,
    })
    setReplyTo(null)
  }

  // Détection du dernier message envoyé par l'utilisateur
  const lastMyMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].isMine) return messages[i]
    }
    return null
  }, [messages])

  const hasAttachments = Boolean(image || video || document)
  const canSend = Boolean(text.trim() || hasAttachments)

  return (
    <div className="flex h-full w-full flex-col bg-white overflow-hidden">
      {/* ── 1. Header Conversation ───────────────────────────── */}
      <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#E5E5E5] px-4 py-2 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          {/* Bouton retour mobile */}
          <button
            type="button"
            onClick={onBackToList}
            aria-label="Retour aux discussions"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#050505] hover:bg-[#F0F2F5] md:hidden"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Avatar avec statut en ligne */}
          <div className="relative shrink-0">
            <Avatar src={contact?.avatar} name={contact?.name || "Contact"} size="md" />
            {contact?.online && (
              <span
                className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#31A24C]"
                aria-label="En ligne"
              />
            )}
          </div>

          {/* Nom & statut en sous-titre */}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-[#050505]">
              {contact?.name || `Utilisateur ${activeTarget}`}
            </h2>
            {contact?.online ? (
              <p className="flex items-center gap-1.5 text-xs font-medium text-[#31A24C]">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#31A24C]" />
                En ligne
              </p>
            ) : (
              <p className="truncate text-xs text-[#65676B]">
                {contact?.lastSeen
                  ? `Vu le ${formatLastSeen(contact.lastSeen)}`
                  : "Hors ligne"}
              </p>
            )}
          </div>
        </div>

        {/* Header vide à droite ou espace réservé */}
        <div className="shrink-0" />
      </header>

      {/* ── 2. Fil de messages ──────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 bg-white [scrollbar-width:thin] [scrollbar-color:#D7B49A_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D7B49A] [&::-webkit-scrollbar-track]:bg-transparent">
        {loadingMessages ? (
          <div className="space-y-4 p-1" role="status" aria-label="Chargement des messages">
            <div className="flex items-end gap-2.5">
              <Skeleton className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
              <Skeleton className="h-10 w-48 rounded-2xl rounded-bl-sm bg-gray-200" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-12 w-64 rounded-2xl rounded-br-sm bg-[#8B5E34]/15" />
            </div>
            <div className="flex items-end gap-2.5">
              <Skeleton className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
              <Skeleton className="h-16 w-56 rounded-2xl rounded-bl-sm bg-gray-200" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-9 w-40 rounded-2xl rounded-br-sm bg-[#8B5E34]/15" />
            </div>
            <div className="flex items-end gap-2.5">
              <Skeleton className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
              <Skeleton className="h-10 w-52 rounded-2xl rounded-bl-sm bg-gray-200" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-4">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#8B5E34]/10 text-[#8B5E34]">
              <Avatar src={contact?.avatar} name={contact?.name || "Dughu"} size="lg" />
            </div>
            <h3 className="text-base font-bold text-[#050505]">
              {contact?.name || "Commencez la discussion"}
            </h3>
            <p className="mt-1 max-w-xs text-xs text-[#65676B]">
              Dites bonjour avec un message ou un emoji pour entamer la conversation.
            </p>
            <button
              type="button"
              onClick={() => void onSendMessage({ text: "👋 Bonjour !" })}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#8B5E34] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#734A26] active:scale-95"
            >
              Dire bonjour 👋
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => {
              const prevMessage = messages[index - 1]
              const nextMessage = messages[index + 1]
              const showDivider = shouldShowDateDivider(message, prevMessage)

              // Regroupement : le message suivant est du même expéditeur ?
              const isSameSenderAsNext =
                nextMessage && nextMessage.isMine === message.isMine
              // L'avatar entrant n'est affiché QUE sur le DERNIER message d'un groupe consécutif
              const showAvatar = !message.isMine && !isSameSenderAsNext

              // Citation / Réponse
              const hasMeaningfulReply = isMeaningfulReply(message.reply)
              const replyPreview = hasMeaningfulReply
                ? resolveReplyPreview(message.reply, messages, contact?.name || "")
                : null

              const isLastSentMine = message.id === lastMyMessage?.id

              return (
                <div key={message.id} className="flex flex-col">
                  {/* Séparateur de date centré */}
                  {showDivider && (
                    <div className="my-4 flex items-center justify-center">
                      <span className="rounded-full bg-[#F0F2F5] px-3 py-1 text-[11px] font-medium text-[#65676B]">
                        {formatMessageDividerDate(message.createdAt)}
                      </span>
                    </div>
                  )}

                  {/* Marqueur de citation au-dessus de la bulle */}
                  {replyPreview && (
                    <div
                      className={cn(
                        "mb-1 flex items-center gap-1 text-[11px] text-[#65676B]",
                        message.isMine ? "justify-end pr-2" : "justify-start pl-11"
                      )}
                    >
                      <Quote size={11} className="rotate-180" />
                      <span>
                        {message.isMine ? "Vous avez répondu" : `${contact?.name || "Le contact"} vous a répondu`}
                      </span>
                    </div>
                  )}

                  {/* Conteneur de message */}
                  <div
                    className={cn(
                      "group relative flex items-end gap-2",
                      message.isMine ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Avatar du contact à gauche (affiché seulement en bas du groupe consécutif) */}
                    {!message.isMine && (
                      <div className="w-8 shrink-0">
                        {showAvatar ? (
                          <Avatar
                            src={contact?.avatar}
                            name={contact?.name}
                            size="sm"
                            className="translate-y-0.5"
                          />
                        ) : (
                          <div className="w-8" />
                        )}
                      </div>
                    )}

                    {/* Actions au survol : Modifier, Répondre, Supprimer */}
                    {message.isMine && (
                      <div
                        data-message-menu
                        className="relative flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                      >
                        <button
                          type="button"
                          onClick={() => setReplyTo(message)}
                          aria-label="Répondre"
                          title="Répondre"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[#65676B] hover:bg-[#F0F2F5] active:scale-95"
                        >
                          <Reply size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuMessageId(
                              activeMenuMessageId === message.id ? null : message.id
                            )
                          }
                          aria-label="Plus d'actions"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[#65676B] hover:bg-[#F0F2F5] active:scale-95"
                        >
                          <MoreVertical size={13} />
                        </button>

                        {/* Menu contextuel Modifier / Supprimer */}
                        {activeMenuMessageId === message.id && (
                          <div className="absolute right-0 bottom-full z-30 mb-1 w-36 overflow-hidden rounded-xl border border-[#E5E5E5] bg-white py-1 shadow-lg">
                            <button
                              type="button"
                              onClick={() => {
                                onStartEditMessage(message)
                                setActiveMenuMessageId(null)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#050505] hover:bg-[#F0F2F5]"
                            >
                              <Pencil size={13} className="text-[#65676B]" /> Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteMessagePrompt(message)
                                setActiveMenuMessageId(null)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#E4405F] hover:bg-[#FFF3F4]"
                            >
                              <Trash2 size={13} /> Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bulle de message */}
                    <div
                      className={cn(
                        "relative max-w-[75%] sm:max-w-[60%] px-4 py-2.5 transition-all text-sm leading-relaxed",
                        message.isMine
                          ? "rounded-[20px] rounded-br-[4px] bg-[#8B5E34] text-white shadow-sm"
                          : "rounded-[20px] rounded-bl-[4px] bg-[#F0F0F0] text-[#050505]"
                      )}
                    >
                      {/* Mode modification de message */}
                      {editingMessageId === message.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editDraft}
                            onChange={(e) => onEditDraftChange(e.target.value)}
                            rows={2}
                            autoFocus
                            className="w-full resize-none rounded-lg bg-black/10 p-2 text-xs text-white outline-none placeholder:text-white/60"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={onCancelEditMessage}
                              disabled={updatingMessage}
                              className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/30"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={onSaveEditMessage}
                              disabled={updatingMessage || !editDraft.trim()}
                              className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#8B5E34] hover:bg-white/90"
                            >
                              {updatingMessage ? "Enregistrement..." : "Enregistrer"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Citation encart à l'intérieur de la bulle */}
                          {replyPreview && (
                            <div
                              className={cn(
                                "mb-2 rounded-xl border-l-3 px-2.5 py-1.5 text-xs",
                                message.isMine
                                  ? "border-white/70 bg-white/15 text-white"
                                  : "border-[#8B5E34] bg-white text-[#050505]"
                              )}
                            >
                              <p className="font-semibold">{replyPreview.sender}</p>
                              <p className="truncate opacity-90">{replyPreview.text}</p>
                            </div>
                          )}

                          {/* Texte du message */}
                          {message.text && (
                            <p className="whitespace-pre-wrap break-words">
                              {message.text}
                            </p>
                          )}

                          {/* Pièces jointes */}
                          {message.attachments?.map((attachment, attIndex) => (
                            <div
                              key={`${attachment.url}-${attIndex}`}
                              className="mt-2 overflow-hidden rounded-xl"
                            >
                              {attachment.type === "image" && (
                                <Image
                                  src={attachment.url}
                                  alt="Image envoyée"
                                  width={400}
                                  height={300}
                                  unoptimized
                                  className="max-h-72 w-auto rounded-xl object-contain"
                                />
                              )}
                              {attachment.type === "video" && (
                                <video
                                  src={attachment.url}
                                  controls
                                  className="max-h-72 max-w-full rounded-xl"
                                />
                              )}
                              {attachment.type === "document" && (
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={cn(
                                    "flex items-center gap-2 rounded-xl p-2.5 text-xs underline font-medium",
                                    message.isMine ? "bg-white/20 text-white" : "bg-white text-[#050505]"
                                  )}
                                >
                                  <FileText size={16} />
                                  {attachment.name || "Télécharger le document"}
                                </a>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>

                    {/* Actions de réponse pour les messages entrants */}
                    {!message.isMine && (
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setReplyTo(message)}
                          aria-label="Répondre"
                          title="Répondre"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[#65676B] hover:bg-[#F0F2F5] active:scale-95"
                        >
                          <Reply size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Statut sous le dernier message envoyé (Envoyé / Vu + avatar miniature) */}
                  {message.isMine && isLastSentMine && (
                    <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-[#65676B] pr-1">
                      {message.receipt === "read" ? (
                        <div className="flex items-center gap-1">
                          <span>Vu</span>
                          <Avatar
                            src={contact?.avatar}
                            name={contact?.name}
                            size="xs"
                            className="h-3.5 w-3.5"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{message.receipt === "delivered" ? "Délivré" : "Envoyé"}</span>
                          <Check size={12} className="text-[#65676B]" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-[#65676B] italic pl-2 py-1 animate-fade-in">
                <Avatar src={contact?.avatar} name={contact?.name} size="xs" className="h-5 w-5" />
                <span className="inline-flex items-center gap-1">
                  {contact?.name || "L'interlocuteur"} est en train d&apos;écrire
                  <span className="inline-flex gap-0.5 ml-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8B5E34] animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8B5E34] animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8B5E34] animate-bounce" />
                  </span>
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── 3. Barre de saisie (fixe en bas) ────────────────── */}
      <footer className="shrink-0 border-t border-[#E5E5E5] bg-white p-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
        {/* Bandeau d'aperçu de citation en cours */}
        {replyTo && (
          <div className="mb-2 flex items-center justify-between rounded-xl bg-[#F0F2F5] px-3.5 py-2 text-xs">
            <div className="min-w-0 pr-2">
              <span className="font-semibold text-[#1C1E21]">
                Répondre à {replyTo.isMine ? "vous-même" : contact?.name}
              </span>
              <p className="truncate text-[#65676B]">
                {replyTo.text || "Pièce jointe"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              aria-label="Annuler la réponse"
              className="rounded-full p-1 text-[#65676B] hover:bg-black/5"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Aperçu des pièces jointes en cours */}
        {hasAttachments && (
          <div className="mb-2 flex flex-wrap gap-2 text-xs">
            {image && (
              <div className="flex items-center gap-1.5 rounded-full bg-[#8B5E34]/10 px-3 py-1 text-[#8B5E34] font-medium">
                <ImageIcon size={13} />
                <span className="truncate max-w-[140px]">{image.name}</span>
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="rounded-full p-0.5 hover:bg-[#8B5E34]/20"
                >
                  <X size={13} />
                </button>
              </div>
            )}
            {video && (
              <div className="flex items-center gap-1.5 rounded-full bg-[#8B5E34]/10 px-3 py-1 text-[#8B5E34] font-medium">
                <Video size={13} />
                <span className="truncate max-w-[140px]">{video.name}</span>
                <button
                  type="button"
                  onClick={() => setVideo(null)}
                  className="rounded-full p-0.5 hover:bg-[#8B5E34]/20"
                >
                  <X size={13} />
                </button>
              </div>
            )}
            {document && (
              <div className="flex items-center gap-1.5 rounded-full bg-[#8B5E34]/10 px-3 py-1 text-[#8B5E34] font-medium">
                <Paperclip size={13} />
                <span className="truncate max-w-[140px]">{document.name}</span>
                <button
                  type="button"
                  onClick={() => setDocument(null)}
                  className="rounded-full p-0.5 hover:bg-[#8B5E34]/20"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Palette d'emojis rapides */}
        {showEmojiPicker && (
          <div className="mb-2 flex items-center gap-2 overflow-x-auto rounded-2xl border border-[#E5E5E5] bg-[#FDF8F4] p-2 no-scrollbar">
            {["😊", "😂", "❤️", "👍", "🔥", "🎉", "😍", "👏", "🙏", "😮", "😢", "🚀"].map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => {
                  setText((prev) => prev + em)
                  setShowEmojiPicker(false)
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-lg hover:bg-white transition"
              >
                {em}
              </button>
            ))}
          </div>
        )}

        {/* Inputs de fichiers cachés */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setImage(e.target.files?.[0] || null)}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/ogg,video/webm"
          className="hidden"
          onChange={(e) => setVideo(e.target.files?.[0] || null)}
        />
        <input
          ref={documentInputRef}
          type="file"
          className="hidden"
          onChange={(e) => setDocument(e.target.files?.[0] || null)}
        />

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Rangée d'icônes à gauche : Photo, Document */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              aria-label="Joindre une image"
              title="Image"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#8B5E34] transition hover:bg-[#8B5E34]/10 active:scale-95"
            >
              <ImageIcon size={18} />
            </button>
            <button
              type="button"
              onClick={() => documentInputRef.current?.click()}
              aria-label="Joindre un fichier"
              title="Fichier"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#8B5E34] transition hover:bg-[#8B5E34]/10 active:scale-95"
            >
              <Paperclip size={18} />
            </button>
          </div>

          {/* Champ de saisie central pill */}
          <div className="relative flex flex-1 items-center rounded-full bg-[#F0F2F5] px-4 py-2 transition focus-within:bg-[#EBF0F5] focus-within:ring-1 focus-within:ring-[#8B5E34]/30">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value.slice(0, 500))
                onTyping?.()
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
              rows={1}
              placeholder="Aa"
              className="max-h-24 min-h-[22px] flex-1 resize-none bg-transparent text-sm text-[#050505] placeholder:text-[#65676B] outline-none"
            />
          </div>

          {/* Icônes à droite : Emoji & Pouce levé ou Bouton Envoyer */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              aria-label="Choisir un emoji"
              title="Emoji"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition active:scale-95",
                showEmojiPicker
                  ? "bg-[#8B5E34]/15 text-[#8B5E34]"
                  : "text-[#8B5E34] hover:bg-[#8B5E34]/10"
              )}
            >
              <Smile size={19} />
            </button>

            {canSend ? (
              /* Bouton Envoyer plein marron #8B5E34 */
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending}
                aria-label="Envoyer le message"
                title="Envoyer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8B5E34] text-white shadow-sm transition hover:bg-[#734A26] active:scale-95 disabled:opacity-50"
              >
                <Send size={16} className={cn("translate-x-0.5", sending && "opacity-50")} />
              </button>
            ) : (
              /* Pouce levé rapide 👍 */
              <button
                type="button"
                onClick={() => void handleSendThumb()}
                disabled={sending}
                aria-label="Envoyer un pouce levé"
                title="Pouce levé"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#8B5E34] transition hover:bg-[#8B5E34]/10 active:scale-95"
              >
                <ThumbsUp size={19} />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
