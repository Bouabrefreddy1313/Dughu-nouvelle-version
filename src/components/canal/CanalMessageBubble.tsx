"use client"

/**
 * Bulle de message pour le chat d'un canal (Écran 3).
 *
 * Affiche l'auteur, avatar, date, texte, média éventuel et réactions emoji.
 */

import Image from "next/image"
import { Trash2, Smile } from "lucide-react"
import type { CanalMessage } from "@/types/canal/canal.types"
import { useDeleteCanalMessage, useReactCanalMessage } from "@/hooks/canal/use-canal-messages"

interface CanalMessageBubbleProps {
  message: CanalMessage
  currentUserId?: string
  canalId: string
}

const COMMON_REACTIONS = ["👍", "❤️", "🔥", "👏", "😂"]

export default function CanalMessageBubble({
  message,
  currentUserId,
  canalId,
}: CanalMessageBubbleProps) {
  const deleteMutation = useDeleteCanalMessage(message.id, canalId)
  const reactMutation = useReactCanalMessage(canalId, message.id)

  const isOwn = message.isOwn || (currentUserId && message.userId === currentUserId)

  const handleReact = (emoji: string) => {
    if (!currentUserId) return
    reactMutation.mutate({ userId: currentUserId, reaction: emoji })
  }

  const handleDelete = () => {
    if (confirm("Voulez-vous supprimer ce message ?")) {
      deleteMutation.mutate()
    }
  }

  return (
    <div className={`group flex gap-3 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className="relative size-9 shrink-0 overflow-hidden rounded-full border border-gray-700 bg-gray-800">
        <Image
          src={message.authorAvatar || "/images/avatar.png"}
          alt=""
          fill
          sizes="36px"
          className="object-cover"
          unoptimized={message.authorAvatar?.startsWith("http")}
        />
      </div>

      {/* Contenu message */}
      <div className={`flex max-w-[75%] flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {/* Nom & Heure */}
        <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
          <span className="font-semibold text-gray-300">
            {isOwn ? "Moi" : message.authorName || "Membre"}
          </span>
          {message.createdAt && (
            <span className="text-[10px] text-gray-500">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {/* Bulle de texte / Média */}
        <div
          className={`relative rounded-2xl p-3 text-sm leading-relaxed shadow-sm ${
            isOwn
              ? "rounded-tr-none bg-[#EA580C] text-white"
              : "rounded-tl-none bg-[#1E293B] text-gray-200 border border-gray-800"
          }`}
        >
          {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}

          {message.mediaUrl && (
            <div className="mt-2 overflow-hidden rounded-xl border border-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.mediaUrl}
                alt="Média du message"
                className="max-h-72 w-full object-cover"
              />
            </div>
          )}

          {/* Actions au survol : Réactions & Suppression */}
          <div
            className={`absolute top-0 -translate-y-1/2 flex items-center gap-1 rounded-full bg-[#0F172A] border border-gray-700 px-1.5 py-0.5 shadow-lg opacity-0 transition group-hover:opacity-100 ${
              isOwn ? "right-2" : "left-2"
            }`}
          >
            {COMMON_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleReact(emoji)}
                className="p-1 text-xs hover:scale-125 transition"
              >
                {emoji}
              </button>
            ))}

            {isOwn && (
              <button
                type="button"
                onClick={handleDelete}
                aria-label="Supprimer le message"
                className="p-1 text-gray-400 hover:text-red-400 transition"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Réactions affichées sous la bulle */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleReact(r.reaction)}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition ${
                  r.isOwn
                    ? "bg-[#EA580C]/20 text-[#EA580C] border border-[#EA580C]/40"
                    : "bg-[#1E293B] text-gray-300 border border-gray-700"
                }`}
              >
                <span>{r.reaction}</span>
                <span className="text-[10px] font-bold">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
