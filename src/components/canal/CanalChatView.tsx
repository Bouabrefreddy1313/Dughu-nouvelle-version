"use client"

/**
 * Vue "Chat" du canal (Écran 3 — Thème sombre).
 *
 * Spécifications :
 *  - Overlay plein écran avec bouton fermer ✕ en haut à droite
 *  - Layout 3 colonnes :
 *      1. Colonne gauche : Canaux créés & rejoints + Suggestions
 *      2. Colonne centrale : Messages + Envoi (ou avertissement de permission)
 *      3. Colonne droite : Détails du canal + Médias / Documents
 */

import { useState, useRef, useEffect, useMemo } from "react"
import Image from "next/image"
import {
  X,
  Search,
  Users,
  Paperclip,
  Send,
  Info,
  Globe,
  Lock,
  FileText,
  AlertTriangle,
  Settings,
  Bell,
  Check,
  UserX,
} from "lucide-react"
import type { Canal } from "@/types/canal/canal.types"
import {
  useCanalDetail,
  useCanalDocuments,
  useCanalMedia,
  useJoinedCanals,
  useMyCanals,
  useSuggestCanals,
  useHandleJoinRequest,
} from "@/hooks/canal/use-canals"
import { useReceivedNotifications } from "@/hooks/canal/use-canal-notifications"
import { useCanalMessages, useSendCanalMessage } from "@/hooks/canal/use-canal-messages"
import CanalMessageBubble from "./CanalMessageBubble"
import CanalSettingsModal from "./CanalSettingsModal"

interface CanalChatViewProps {
  initialCanal: Canal
  currentUserId: string
  onClose: () => void
}

export default function CanalChatView({
  initialCanal,
  currentUserId,
  onClose,
}: CanalChatViewProps) {
  const [activeCanalId, setActiveCanalId] = useState(initialCanal?.id || "")
  const [searchQuery, setSearchQuery] = useState("")
  const [messageText, setMessageText] = useState("")
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<"media" | "docs" | "requests">("media")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsInitialTab, setSettingsInitialTab] = useState<"requests" | "members" | "settings">("requests")

  const mediaInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Mettre à jour activeCanalId si initialCanal change
  useEffect(() => {
    if (initialCanal?.id) {
      setActiveCanalId(initialCanal.id)
    }
  }, [initialCanal?.id])

  // Données du canal actif
  const { data: detailData } = useCanalDetail(activeCanalId)
  const activeCanal: Canal = detailData?.canal || initialCanal || ({} as Canal)

  // Messages
  const { data: messagesData, isLoading: messagesLoading } = useCanalMessages(
    activeCanalId,
    currentUserId,
    1,
    !!activeCanalId && !!currentUserId
  )
  const messages = Array.isArray(messagesData?.messages) ? messagesData.messages : []

  // Canaux de l'utilisateur (créés + rejoints) & suggestions
  const { data: joinedData } = useJoinedCanals(currentUserId, { enabled: !!currentUserId })
  const joinedCanals = Array.isArray(joinedData?.canals) ? joinedData.canals : []

  const { data: myData } = useMyCanals(currentUserId, { enabled: !!currentUserId })
  const myCanals = Array.isArray(myData?.canals) ? myData.canals : []

  const { data: suggestData } = useSuggestCanals(currentUserId, { enabled: !!currentUserId })
  const suggestCanals = Array.isArray(suggestData?.canals) ? suggestData.canals : []

  // Fusionner les canaux appartenant à l'utilisateur (créés + rejoints)
  const userCanals = useMemo(() => {
    const map = new Map<string, Canal>()
    if (initialCanal?.id) map.set(String(initialCanal.id), initialCanal)
    for (const c of myCanals) {
      if (c?.id) map.set(String(c.id), c)
    }
    for (const c of joinedCanals) {
      if (c?.id) map.set(String(c.id), c)
    }
    return Array.from(map.values())
  }, [initialCanal, myCanals, joinedCanals])

  // Médias et Documents
  const { data: rawMedia = [] } = useCanalMedia(activeCanalId)
  const mediaList = Array.isArray(rawMedia) ? rawMedia : []

  const { data: rawDocs = [] } = useCanalDocuments(activeCanalId)
  const docList = Array.isArray(rawDocs) ? rawDocs : []

  // Demandes d'adhésion & Notifications
  const handleJoinMutation = useHandleJoinRequest()
  const { data: notifsData } = useReceivedNotifications(currentUserId, activeCanalId)
  const notifications = notifsData?.notifications ?? []
  const pendingRequests = notifications.filter(
    (n) => n.status === null || n.status === "" || n.status === "pending"
  )

  // Envoi de message
  const sendMutation = useSendCanalMessage(activeCanalId)

  // Scroll en bas quand nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  // Permission de poster :
  // RÈGLE : Dans un canal, seul l'administrateur ou le créateur est autorisé à poster !
  const isOwner = Boolean(
    currentUserId &&
      activeCanal?.userId &&
      String(activeCanal.userId) === String(currentUserId)
  )
  const canPost = Boolean(isOwner || activeCanal?.isAdmin)
  const pendingCount = (isOwner || activeCanal?.isAdmin) ? pendingRequests.length : 0

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setMediaFile(file)
      setMediaPreview(URL.createObjectURL(file))
    }
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() && !mediaFile) return

    sendMutation.mutate(
      {
        userId: currentUserId,
        text: messageText.trim() || undefined,
        media: mediaFile,
      },
      {
        onSuccess: () => {
          setMessageText("")
          setMediaFile(null)
          setMediaPreview(null)
        },
      }
    )
  }

  const filteredUserCanals = userCanals.filter((c) =>
    String(c?.name || "").toLowerCase().includes(searchQuery.toLowerCase().trim())
  )

  return (
    <div className="fixed inset-0 z-50 flex bg-[#0B0F17] text-gray-200">
      {/* Bouton Fermer flottant en haut à droite */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer le chat"
        className="absolute right-4 top-4 z-50 flex size-9 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition hover:bg-gray-700 hover:text-white"
      >
        <X size={20} />
      </button>

      {/* ========================================================================= */}
      {/* 1. COLONNE GAUCHE — Canaux suivis & Suggestions */}
      {/* ========================================================================= */}
      <aside className="hidden w-96 flex-col border-r border-gray-800 bg-[#0F172A] p-4 md:flex">
        {/* Compteur membres actifs */}
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{activeCanal?.memberCount || 1} membres actifs</span>
        </div>

        {/* Titre */}
        <h2 className="mt-3 text-sm font-black text-white flex items-center justify-between">
          <span>Mes canaux & rejoints</span>
          <span className="text-xs font-bold text-orange-400 bg-orange-950/40 border border-orange-800/50 px-2 py-0.5 rounded-full">
            {userCanals.length}
          </span>
        </h2>

        {/* Recherche */}
        <div className="relative mt-2.5">
          <Search className="absolute left-3.5 top-3 size-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher parmi mes canaux..."
            className="w-full rounded-2xl bg-gray-800/80 pl-10 pr-3 py-2.5 text-xs text-gray-200 placeholder-gray-500 outline-none border border-gray-700/60 focus:border-[#EA580C] shadow-inner"
          />
        </div>

        {/* Liste des canaux */}
        <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
          {filteredUserCanals.length > 0 ? (
            filteredUserCanals.map((c) => {
              const isActive = c.id === activeCanalId
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCanalId(c.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition border ${
                    isActive
                      ? "bg-gray-800/90 border-[#EA580C]/70 shadow-md text-white ring-1 ring-[#EA580C]/40"
                      : "border-gray-800/60 bg-gray-900/40 text-gray-300 hover:bg-gray-800/60 hover:border-gray-700"
                  }`}
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl bg-gray-700 border border-gray-700/60 shadow-sm">
                    <Image
                      src={c.logo || "/images/avatar.png"}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                      unoptimized={c.logo?.startsWith("http")}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="truncate text-sm font-bold text-gray-100">{c.name || "Canal"}</p>
                      {c.type === "public" ? (
                        <span title="Canal public" className="shrink-0 flex items-center">
                          <Globe size={13} className="text-emerald-400" />
                        </span>
                      ) : (
                        <span title="Canal privé" className="shrink-0 flex items-center">
                          <Lock size={13} className="text-amber-400" />
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-orange-400 bg-orange-950/40 border border-orange-800/40 px-2 py-0.5 rounded-full truncate max-w-[130px]">
                        {c.categoryName || "Général"}
                      </span>
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 shrink-0">
                        <Users size={11} className="text-orange-400" /> {c.memberCount || 0}
                      </p>
                    </div>

                    {c.description && (
                      <p className="mt-1 line-clamp-1 text-[11px] text-gray-400 leading-snug">
                        {c.description}
                      </p>
                    )}
                  </div>
                </button>
              )
            })
          ) : (
            <p className="text-center text-xs text-gray-500 py-6">Aucun canal trouvé</p>
          )}

          {/* Section Suggestions */}
          <div className="pt-4 border-t border-gray-800/80 mt-4">
            <h3 className="text-xs font-black text-gray-400 mb-2.5 uppercase tracking-wider">
              Suggestions pour vous
            </h3>
            <div className="space-y-1.5">
              {suggestCanals.map((c) => (
                <button
                  key={c.id || c.name}
                  type="button"
                  onClick={() => setActiveCanalId(c.id)}
                  className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 transition border border-transparent hover:border-gray-800"
                >
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-gray-700">
                    <Image
                      src={c.logo || "/images/avatar.png"}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized={c.logo?.startsWith("http")}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs font-bold text-gray-300">{c.name || "Canal"}</p>
                      <span className="text-[10px] text-orange-400 font-semibold">{c.categoryName || "Général"}</span>
                    </div>
                    <p className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                      <Users size={10} /> {c.memberCount || 0} membres
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. COLONNE CENTRALE — Chat Zone */}
      {/* ========================================================================= */}
      <main className="flex flex-1 flex-col bg-[#0B0F17]">
        {/* En-tête chat */}
        <header className="flex h-16 items-center justify-between border-b border-gray-800 bg-[#0F172A] px-6">
          <div className="flex items-center gap-3">
            <div className="relative size-10 overflow-hidden rounded-full bg-gray-800 border border-gray-700">
              <Image
                src={activeCanal?.logo || "/images/avatar.png"}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
                unoptimized={activeCanal?.logo?.startsWith("http")}
              />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-1.5">
                {activeCanal?.name || "Canal"}
                {activeCanal?.type === "private" && (
                  <Lock size={12} className="text-gray-400" />
                )}
              </h1>
              <p className="text-[11px] text-gray-400">
                {activeCanal?.memberCount || 0} membres
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pr-12">
            {(isOwner || activeCanal?.isAdmin) && (
              <button
                type="button"
                onClick={() => {
                  setSettingsInitialTab("requests")
                  setIsSettingsOpen(true)
                }}
                className="flex items-center gap-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 px-3 py-1.5 text-xs font-bold text-gray-200 border border-gray-700 transition shadow-sm"
              >
                <Settings size={14} className="text-[#EA580C]" />
                <span className="hidden sm:inline">Gérer le canal</span>
                {pendingCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#EA580C] text-[10px] font-extrabold text-white animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSettingsInitialTab("settings")
                setIsSettingsOpen(true)
              }}
              className="p-2 text-gray-400 hover:text-white transition rounded-xl hover:bg-gray-800"
              aria-label="Informations sur le canal"
            >
              <Info size={18} />
            </button>
          </div>
        </header>

        {/* Zone des messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messagesLoading ? (
            <div className="flex h-full items-center justify-center text-xs text-gray-500">
              Chargement des messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
              <p className="text-sm font-medium">Aucun message</p>
              <p className="mt-1 text-xs text-gray-600">
                Soyez le premier à envoyer un message dans ce canal !
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <CanalMessageBubble
                key={m.id}
                message={m}
                currentUserId={currentUserId}
                canalId={activeCanalId}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Aperçu média avant envoi */}
        {mediaPreview && (
          <div className="relative mx-6 mb-2 flex items-center gap-2 rounded-xl bg-gray-800/80 p-2 border border-gray-700 w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaPreview} alt="" className="size-12 rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => {
                setMediaFile(null)
                setMediaPreview(null)
              }}
              className="rounded-full bg-gray-700 p-1 text-gray-300 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Bandeau inférieur : Champ de saisie ou avertissement de permission */}
        <footer className="border-t border-gray-800 bg-[#0F172A] p-4">
          {!canPost ? (
            <div className="flex items-center justify-center gap-2.5 rounded-2xl bg-gray-800/80 p-3.5 text-xs font-semibold text-gray-300 border border-gray-700/60 shadow-inner">
              <Lock size={15} className="text-[#EA580C] shrink-0" />
              <span>Seul l'administrateur de ce canal est autorisé à publier des messages.</span>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                aria-label="Joindre un fichier média"
                className="rounded-xl p-2.5 text-gray-400 hover:bg-gray-800 hover:text-white transition"
              >
                <Paperclip size={18} />
              </button>
              <input
                ref={mediaInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleMediaChange}
              />

              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Écrivez un message..."
                className="flex-1 rounded-2xl bg-gray-800/80 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none border border-gray-700/60 focus:border-[#EA580C]"
              />

              <button
                type="submit"
                disabled={(!messageText.trim() && !mediaFile) || sendMutation.isPending}
                aria-label="Envoyer"
                className="flex size-10 items-center justify-center rounded-2xl bg-[#EA580C] text-white shadow-md transition hover:bg-[#C2410C] disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </form>
          )}
        </footer>
      </main>

      {/* ========================================================================= */}
      {/* 3. COLONNE DROITE — Détails canal & Médias / Documents */}
      {/* ========================================================================= */}
      <aside className="hidden w-80 flex-col overflow-y-auto border-l border-gray-800 bg-[#0F172A] lg:flex">
        {/* Grande image de Cover */}
        <div className="relative h-32 w-full bg-gray-800">
          <Image
            src={activeCanal?.cover || "/images/cover.jpg"}
            alt=""
            fill
            sizes="320px"
            className="object-cover"
            unoptimized={activeCanal?.cover?.startsWith("http")}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent" />
        </div>

        {/* Avatar centré superposé */}
        <div className="-mt-12 flex flex-col items-center px-4">
          <div className="relative size-20 overflow-hidden rounded-full border-4 border-[#0F172A] bg-gray-800 shadow-xl">
            <Image
              src={activeCanal?.logo || "/images/avatar.png"}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
              unoptimized={activeCanal?.logo?.startsWith("http")}
            />
          </div>

          <h3 className="mt-2 text-center text-sm font-bold text-white">
            {activeCanal?.name || "Canal"}
          </h3>

          <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
            <span>Membres: {activeCanal?.memberCount || 0}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              {activeCanal?.type === "public" ? <Globe size={12} /> : <Lock size={12} />}
              {activeCanal?.type === "public" ? "public" : "privé"}
            </span>
          </div>

          <div className="mt-2 text-center text-xs text-gray-400">
            <span className="font-semibold text-gray-300">Catégorie: </span>
            {activeCanal?.categoryName || "Général"}
          </div>

          {activeCanal?.description && (
            <p className="mt-3 text-center text-xs text-gray-400 leading-relaxed px-2">
              {activeCanal.description}
            </p>
          )}
          {(isOwner || activeCanal?.isAdmin) && (
            <button
              type="button"
              onClick={() => {
                setSettingsInitialTab("requests")
                setIsSettingsOpen(true)
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#EA580C]/15 border border-[#EA580C]/40 p-2.5 text-xs font-bold text-[#EA580C] hover:bg-[#EA580C]/25 transition shadow-sm"
            >
              <Settings size={15} />
              <span>Paramètres & Adhésions</span>
              {pendingCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-[#EA580C] text-[10px] font-extrabold text-white animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Onglets Médias / Documents / Demandes */}
        <div className="mt-5 border-t border-gray-800 px-4 pt-4">
          <div className="flex rounded-xl bg-gray-800/80 p-1">
            <button
              type="button"
              onClick={() => setRightTab("media")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                rightTab === "media"
                  ? "bg-[#EA580C] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Médias
            </button>
            <button
              type="button"
              onClick={() => setRightTab("docs")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                rightTab === "docs"
                  ? "bg-[#EA580C] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Docs
            </button>
            {(isOwner || activeCanal?.isAdmin) && (
              <button
                type="button"
                onClick={() => setRightTab("requests")}
                className={`flex-1 relative rounded-lg py-1.5 text-xs font-bold transition ${
                  rightTab === "requests"
                    ? "bg-[#EA580C] text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <span>Demandes</span>
                {pendingCount > 0 && (
                  <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.2 text-[9px] font-extrabold text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="mt-4">
            {rightTab === "media" ? (
              mediaList.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {mediaList.map((m) => (
                    <div
                      key={m.id}
                      className="relative aspect-square overflow-hidden rounded-lg bg-gray-800 border border-gray-700"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-xs text-gray-500 py-6">Aucun média.</p>
              )
            ) : rightTab === "docs" ? (
              docList.length > 0 ? (
                <div className="space-y-2">
                  {docList.map((d) => (
                    <a
                      key={d.id}
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl bg-gray-800/60 p-2 text-xs text-gray-300 hover:bg-gray-800 transition"
                    >
                      <FileText size={16} className="text-[#EA580C] shrink-0" />
                      <span className="truncate flex-1">{d.name}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-center text-xs text-gray-500 py-6">Aucun document.</p>
              )
            ) : (
              /* Onglet DEMANDES D'ADHÉSION */
              <div className="space-y-2.5">
                {pendingRequests.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-6">
                    Aucune demande d'adhésion en attente.
                  </p>
                ) : (
                  pendingRequests.map((n) => {
                    const reqId = n.requestId || n.id
                    return (
                      <div
                        key={n.id}
                        className="rounded-2xl border border-gray-800 bg-gray-900/80 p-3 space-y-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative size-8 shrink-0 overflow-hidden rounded-full bg-gray-800 border border-gray-700">
                            <Image
                              src={n.senderAvatar || "/images/avatar.png"}
                              alt=""
                              fill
                              sizes="32px"
                              className="object-cover"
                              unoptimized={n.senderAvatar?.startsWith("http")}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-gray-200">
                              {n.senderName || n.content || "Utilisateur"}
                            </p>
                            <p className="text-[10px] text-gray-400">Demande d'adhésion</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleJoinMutation.mutate({
                                requestId: reqId,
                                userId: currentUserId,
                                accept: true,
                              })
                            }
                            disabled={handleJoinMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-emerald-600 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500"
                          >
                            <Check size={13} />
                            Accepter
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleJoinMutation.mutate({
                                requestId: reqId,
                                userId: currentUserId,
                                accept: false,
                              })
                            }
                            disabled={handleJoinMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-red-950/60 border border-red-800/80 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-900/80"
                          >
                            <UserX size={13} />
                            Refuser
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Modale Paramètres et Gestion du canal (créateur / administrateur) */}
      <CanalSettingsModal
        canal={activeCanal}
        currentUserId={currentUserId}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsInitialTab}
      />
    </div>
  )
}
