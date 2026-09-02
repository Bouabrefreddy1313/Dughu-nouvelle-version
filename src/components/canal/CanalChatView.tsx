"use client"

/**
 * Vue "Chat" du canal (Écran 3 — Thème sombre).
 *
 * Spécifications :
 *  - Overlay plein écran avec bouton fermer ✕ en haut à droite
 *  - Layout 3 colonnes :
 *      1. Colonne gauche : Canaux suivis + Suggestions
 *      2. Colonne centrale : Messages + Envoi (ou avertissement de permission)
 *      3. Colonne droite : Détails du canal + Médias / Documents
 */

import { useState, useRef, useEffect } from "react"
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
} from "lucide-react"
import type { Canal } from "@/types/canal/canal.types"
import {
  useCanalDetail,
  useCanalDocuments,
  useCanalMedia,
  useJoinedCanals,
  useSuggestCanals,
} from "@/hooks/canal/use-canals"
import { useCanalMessages, useSendCanalMessage } from "@/hooks/canal/use-canal-messages"
import CanalMessageBubble from "./CanalMessageBubble"

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
  const [activeCanalId, setActiveCanalId] = useState(initialCanal.id)
  const [searchQuery, setSearchQuery] = useState("")
  const [messageText, setMessageText] = useState("")
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<"media" | "docs">("media")

  const mediaInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Données du canal actif
  const { data: detailData } = useCanalDetail(activeCanalId)
  const activeCanal: Canal = detailData?.canal || initialCanal

  // Messages
  const { data: messagesData, isLoading: messagesLoading } = useCanalMessages(
    activeCanalId,
    currentUserId,
    1
  )
  const messages = messagesData?.messages ?? []

  // Canaux suivis & suggestions
  const { data: joinedData } = useJoinedCanals(currentUserId)
  const joinedCanals = joinedData?.canals ?? []

  const { data: suggestData } = useSuggestCanals(currentUserId)
  const suggestCanals = suggestData?.canals ?? []

  // Médias et Documents
  const { data: mediaList = [] } = useCanalMedia(activeCanalId)
  const { data: docList = [] } = useCanalDocuments(activeCanalId)

  // Envoi de message
  const sendMutation = useSendCanalMessage(activeCanalId)

  // Scroll en bas quand nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  // Permission de poster :
  // Si canal privé et l'utilisateur n'est pas admin, restreint.
  const canPost = activeCanal.type === "public" || activeCanal.isAdmin

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

  const filteredJoined = joinedCanals.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
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
      <aside className="hidden w-80 flex-col border-r border-gray-800 bg-[#0F172A] p-4 md:flex">
        {/* Compteur membres actifs */}
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{activeCanal.memberCount || 1} membres actifs</span>
        </div>

        {/* Titre */}
        <h2 className="mt-3 text-sm font-bold text-white">
          Liste des canaux suivis ({joinedCanals.length})
        </h2>

        {/* Recherche */}
        <div className="relative mt-2.5">
          <Search className="absolute left-3 top-2.5 size-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un canal"
            className="w-full rounded-xl bg-gray-800/80 pl-9 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none border border-gray-700/60 focus:border-[#EA580C]"
          />
        </div>

        {/* Liste des canaux suivis */}
        <div className="mt-4 flex-1 space-y-1 overflow-y-auto pr-1">
          {filteredJoined.length > 0 ? (
            filteredJoined.map((c) => {
              const isActive = c.id === activeCanalId
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCanalId(c.id)}
                  className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition ${
                    isActive
                      ? "bg-gray-800 text-white font-semibold"
                      : "text-gray-300 hover:bg-gray-800/50"
                  }`}
                >
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-gray-700">
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
                    <p className="truncate text-xs font-medium text-gray-200">{c.name}</p>
                    <p className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Users size={11} /> {c.memberCount || 0}
                    </p>
                  </div>
                </button>
              )
            })
          ) : (
            <p className="text-center text-xs text-gray-500 py-4">Aucun canal suivi</p>
          )}

          {/* Section Suggestions */}
          <div className="pt-4 border-t border-gray-800 mt-4">
            <h3 className="text-xs font-bold text-gray-400 mb-2">Suggestions</h3>
            <div className="space-y-1">
              {suggestCanals.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCanalId(c.id)}
                  className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 transition"
                >
                  <div className="relative size-8 shrink-0 overflow-hidden rounded-full bg-gray-700">
                    <Image
                      src={c.logo || "/images/avatar.png"}
                      alt=""
                      fill
                      sizes="32px"
                      className="object-cover"
                      unoptimized={c.logo?.startsWith("http")}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-300">{c.name}</p>
                    <p className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Users size={10} /> {c.memberCount || 0}
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
                src={activeCanal.logo || "/images/avatar.png"}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
                unoptimized={activeCanal.logo?.startsWith("http")}
              />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-1.5">
                {activeCanal.name}
                {activeCanal.type === "private" && (
                  <Lock size={12} className="text-gray-400" />
                )}
              </h1>
              <p className="text-[11px] text-gray-400">
                {activeCanal.memberCount || 0} membres
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-12">
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-white transition"
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
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-red-950/40 p-3 text-xs font-semibold text-red-400 border border-red-900/50">
              <AlertTriangle size={16} className="shrink-0" />
              <span>
                Vous ne pouvez pas poster de message sans l'autorisation de l'administrateur
              </span>
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
            src={activeCanal.cover || "/images/cover.jpg"}
            alt=""
            fill
            sizes="320px"
            className="object-cover"
            unoptimized={activeCanal.cover?.startsWith("http")}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent" />
        </div>

        {/* Avatar centré superposé */}
        <div className="-mt-12 flex flex-col items-center px-4">
          <div className="relative size-20 overflow-hidden rounded-full border-4 border-[#0F172A] bg-gray-800 shadow-xl">
            <Image
              src={activeCanal.logo || "/images/avatar.png"}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
              unoptimized={activeCanal.logo?.startsWith("http")}
            />
          </div>

          <h3 className="mt-2 text-center text-sm font-bold text-white">
            {activeCanal.name}
          </h3>

          <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
            <span>Membres: {activeCanal.memberCount || 0}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              {activeCanal.type === "public" ? <Globe size={12} /> : <Lock size={12} />}
              {activeCanal.type === "public" ? "public" : "privé"}
            </span>
          </div>

          <div className="mt-2 text-center text-xs text-gray-400">
            <span className="font-semibold text-gray-300">Catégorie: </span>
            {activeCanal.categoryName || "Général"}
          </div>

          {activeCanal.description && (
            <p className="mt-3 text-center text-xs text-gray-400 leading-relaxed px-2">
              {activeCanal.description}
            </p>
          )}
        </div>

        {/* Onglets Médias / Documents */}
        <div className="mt-6 border-t border-gray-800 px-4 pt-4">
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
              Documents
            </button>
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
            ) : docList.length > 0 ? (
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
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
