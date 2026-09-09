"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Bell,
  BellOff,
  ChevronDown,
  FileText,
  Lock,
  Search,
  User,
  X,
} from "lucide-react"
import { toast } from "sonner"
import Avatar from "@/components/common/Avatar"
import { cn } from "@/lib/utils"
import type { ChatContact, ChatMessage } from "@/lib/messages"
import { formatLastSeen } from "./message-formatters"

interface ConversationInfoPanelProps {
  contact: ChatContact | null
  messages: ChatMessage[]
  onClose: () => void
  onDeleteConversation?: () => void
}

type AccordionSection = "info" | "media"

export default function ConversationInfoPanel({
  contact,
  messages,
  onClose,
}: ConversationInfoPanelProps) {
  const router = useRouter()
  const [openSections, setOpenSections] = useState<Record<AccordionSection, boolean>>({
    info: false,
    media: true, // Ouvert par défaut pour voir directement les photos/vidéos
  })
  const [isMuted, setIsMuted] = useState(false)

  const toggleSection = (section: AccordionSection) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Extraction des médias partagés dans cette conversation
  const sharedMedia = useMemo(() => {
    const images: string[] = []
    const videos: string[] = []
    const files: Array<{ name: string; url: string }> = []

    for (const msg of messages) {
      if (msg.attachments && Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          if (att.type === "image") images.push(att.url)
          else if (att.type === "video") videos.push(att.url)
          else if (att.type === "document") {
            files.push({ name: att.name || "Document", url: att.url })
          }
        }
      }
    }
    return { images, videos, files }
  }, [messages])

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev
      if (next) {
        toast.success(`Notifications mises en sourdine pour ${contact?.name || "ce contact"}.`)
      } else {
        toast.info(`Notifications réactivées pour ${contact?.name || "ce contact"}.`)
      }
      return next
    })
  }

  const handleGoProfile = () => {
    if (contact?.id) {
      router.push(`/profile/${contact.id}`)
    }
  }

  return (
    <div className="flex h-full w-full flex-col border-l border-[#E5E5E5] bg-white overflow-hidden">
      {/* ── Header du panneau ──────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[#E5E5E5] px-4 py-3 shrink-0">
        <h2 className="text-sm font-bold text-[#1C1E21]">Infos discussion</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le panneau"
          title="Fermer"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#65676B] transition hover:bg-[#F0F2F5]"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Contenu scrollable du panneau ──────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:#D7B49A_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D7B49A] [&::-webkit-scrollbar-track]:bg-transparent">
        {/* En-tête centré : Avatar XL + Nom + Badge chiffré */}
        <div className="flex flex-col items-center text-center pb-5 pt-2">
          <Avatar
            src={contact?.avatar}
            name={contact?.name || "Contact"}
            size="xl"
            className="shadow-sm"
          />
          <h3 className="mt-3 text-lg font-bold text-[#1C1E21]">
            {contact?.name || "Discussion"}
          </h3>
          {contact?.username && (
            <p className="text-xs text-[#65676B]">@{contact.username}</p>
          )}

          {/* Badge pill centré : Chiffré de bout en bout */}
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#F0F2F5] px-3 py-1 text-xs font-medium text-[#65676B]">
            <Lock size={12} className="text-[#8B5E34]" />
            <span>Chiffré de bout en bout</span>
          </div>
        </div>

        {/* Rangée de 3 raccourcis circulaires */}
        <div className="flex items-center justify-center gap-6 border-y border-[#E5E5E5] py-4">
          {/* Profil */}
          <button
            type="button"
            onClick={handleGoProfile}
            className="flex flex-col items-center gap-1.5 transition active:scale-95 group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0F2F5] text-[#050505] transition group-hover:bg-[#E4E6EB]">
              <User size={18} />
            </div>
            <span className="text-xs font-medium text-[#050505]">Profil</span>
          </button>

          {/* Sourdine */}
          <button
            type="button"
            onClick={handleToggleMute}
            className="flex flex-col items-center gap-1.5 transition active:scale-95 group"
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition group-hover:bg-[#E4E6EB]",
                isMuted
                  ? "bg-[#8B5E34]/15 text-[#8B5E34]"
                  : "bg-[#F0F2F5] text-[#050505]"
              )}
            >
              {isMuted ? <BellOff size={18} /> : <Bell size={18} />}
            </div>
            <span className="text-xs font-medium text-[#050505]">
              {isMuted ? "Activé" : "Sourdine"}
            </span>
          </button>

          {/* Rechercher */}
          <button
            type="button"
            onClick={() => toast.info("Recherche dans la discussion bientôt disponible.")}
            className="flex flex-col items-center gap-1.5 transition active:scale-95 group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0F2F5] text-[#050505] transition group-hover:bg-[#E4E6EB]">
              <Search size={18} />
            </div>
            <span className="text-xs font-medium text-[#050505]">Rechercher</span>
          </button>
        </div>

        {/* ── Sections Accordéons ─────────────────────────────── */}
        <div className="divide-y divide-[#E5E5E5]">
          {/* 1. Informations sur la discussion */}
          <div className="py-2">
            <button
              type="button"
              onClick={() => toggleSection("info")}
              className="flex w-full items-center justify-between py-2 text-left text-sm font-bold text-[#1C1E21] hover:text-[#8B5E34] transition"
            >
              <span>Informations sur la discussion</span>
              <ChevronDown
                size={16}
                className={cn(
                  "text-[#65676B] transition-transform duration-200",
                  openSections.info && "rotate-180"
                )}
              />
            </button>
            {openSections.info && (
              <div className="space-y-2.5 pb-2 pt-1 text-xs text-[#65676B]">
                <div className="flex items-center justify-between">
                  <span>Statut</span>
                  <span className={cn("font-medium", contact?.online ? "text-[#31A24C]" : "text-[#65676B]")}>
                    {contact?.online ? "En ligne" : "Hors ligne"}
                  </span>
                </div>
                {contact?.lastSeen && (
                  <div className="flex items-center justify-between">
                    <span>Dernière connexion</span>
                    <span className="font-medium text-[#1C1E21]">
                      {formatLastSeen(contact.lastSeen)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>Identifiant</span>
                  <span className="font-mono text-[11px] text-[#1C1E21]">
                    #{contact?.id || "N/A"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Fichiers et contenus multimédias */}
          <div className="py-2">
            <button
              type="button"
              onClick={() => toggleSection("media")}
              className="flex w-full items-center justify-between py-2 text-left text-sm font-bold text-[#1C1E21] hover:text-[#8B5E34] transition"
            >
              <span>Fichiers et contenus multimédias</span>
              <ChevronDown
                size={16}
                className={cn(
                  "text-[#65676B] transition-transform duration-200",
                  openSections.media && "rotate-180"
                )}
              />
            </button>
            {openSections.media && (
              <div className="space-y-3 pb-2 pt-1">
                {/* Galerie Photos / Vidéos */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-[#1C1E21] mb-2">
                    <span>Médias partagés</span>
                    <span className="text-[11px] font-normal text-[#65676B]">
                      {sharedMedia.images.length + sharedMedia.videos.length}
                    </span>
                  </div>

                  {sharedMedia.images.length === 0 && sharedMedia.videos.length === 0 ? (
                    <p className="text-xs text-[#65676B] italic">
                      Aucune photo ou vidéo partagée pour le moment.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {sharedMedia.images.slice(0, 6).map((img, i) => (
                        <div
                          key={`img-${i}`}
                          className="relative aspect-square overflow-hidden rounded-lg bg-gray-100"
                        >
                          <Image
                            src={img}
                            alt="Média"
                            fill
                            unoptimized
                            className="object-cover hover:scale-105 transition"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Documents */}
                {sharedMedia.files.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-[#1C1E21] block mb-1.5">
                      Documents récents
                    </span>
                    <div className="space-y-1">
                      {sharedMedia.files.map((file, idx) => (
                        <a
                          key={idx}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-lg p-1.5 text-xs text-[#1C1E21] hover:bg-[#F0F2F5] transition"
                        >
                          <FileText size={14} className="text-[#8B5E34]" />
                          <span className="truncate flex-1">{file.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
