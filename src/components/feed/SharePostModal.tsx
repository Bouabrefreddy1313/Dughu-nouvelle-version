"use client"

import { useEffect } from "react"
import { X, Link2, MoreHorizontal, Share2 } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import Avatar from "@/components/common/Avatar"

interface SharePostModalProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onClose: () => void
  post?: {
    id: string
    content?: string | null
    image?: string | null
    video?: string | null
    author?: {
      id: string
      name?: string | null
      avatar?: string | null
      username?: string | null
    }
    /** Lien canonique fourni par l'API (sinon on le construit depuis l'origine). */
    shareUrl?: string | null
  } | null
}

interface ShareTarget {
  key: string
  label: string
  monogram: string
  /** Classes de couleurs du rond (fond + texte). */
  circle: string
  /** Retourne l'URL à ouvrir, ou null si un traitement spécial est nécessaire. */
  build?: (text: string, url: string) => string | null
}

/** Très court texte d'accompagnement généré pour Twitter/WhatsApp. */
function buildShareText(post: SharePostModalProps["post"]): string {
  if (!post) return ""
  const content = (post.content || "").replace(/\s+/g, " ").trim()
  return content.slice(0, 220)
}


async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      const el = document.createElement("textarea")
      el.value = text
      el.style.position = "fixed"
      el.style.opacity = "0"
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    }
    return true
  } catch {
    return false
  }
}

export function SharePostModal({
  isOpen,
  setIsOpen,
  onClose,
  post,
}: SharePostModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, setIsOpen])

  if (!isOpen) return null

  const url =
    post?.shareUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/home?post=${encodeURIComponent(post?.id || "")}`
      : "")

  const text = buildShareText(post)
  const enc = encodeURIComponent

  const targets: ShareTarget[] = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      monogram: "WA",
      circle: "bg-[#25D366]/15 text-[#1DA851]",
      build: (t, u) => `https://api.whatsapp.com/send?text=${enc(t ? `${t} ` : "")}${enc(u)}`,
    },
    {
      key: "twitter",
      label: "X (Twitter)",
      monogram: "𝕏",
      circle: "bg-black/10 text-black",
      build: (t, u) =>
        `https://twitter.com/intent/tweet?text=${enc(t)}&url=${enc(u)}`,
    },
    {
      key: "facebook",
      label: "Facebook",
      monogram: "f",
      circle: "bg-[#1877F2]/15 text-[#1877F2]",
      build: (t, u) =>
        `https://www.facebook.com/sharer/sharer.php?u=${enc(u)}&quote=${enc(t)}`,
    },
    {
      key: "instagram",
      label: "Instagram",
      monogram: "IG",
      circle: "bg-gradient-to-tr from-[#F58529]/15 via-[#DD2A7B]/15 to-[#8134AF]/15 text-[#C13584]",
      build: () => null, // pas d'intent web : copie le lien
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      monogram: "in",
      circle: "bg-[#0A66C2]/15 text-[#0A66C2]",
      build: (t, u) =>
        `https://www.linkedin.com/shareArticle?mini=true&url=${enc(u)}&title=${enc(t)}`,
    },
  ]

  const handleShare = async (target: ShareTarget) => {
    if (!url) {
      toast.error("Impossible de générer le lien de partage")
      return
    }
    const built = target.build ? target.build(text, url) : null
    if (target.key === "instagram") {
      // Instagram n'a pas d'intent web : on copie le lien (à coller dans un
      // post/story) et on bascule sur l'app si disponible.
      const ok = await copyToClipboard(url)
      if (ok) {
        toast.success("Lien copié — collez-le dans votre story ou post Instagram")
      } else {
        toast.error("Impossible de copier le lien")
      }
      setIsOpen(false)
      return
    }
    if (built) {
      window.open(built, "_blank", "noopener,noreferrer")
    } else {
      await handleCopyLink()
    }
    setIsOpen(false)
  }

  const handleCopyLink = async () => {
    if (!url) {
      toast.error("Impossible de générer le lien de partage")
      return
    }
    const ok = await copyToClipboard(url)
    toast.success(ok ? "Lien copié !" : "Impossible de copier le lien")
    if (ok) setIsOpen(false)
  }

  const handleNativeShare = async () => {
    if (!url) return
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: document.title || "Dughu",
          text: text || "Regardez cette publication sur Dughu",
          url,
        })
        setIsOpen(false)
        return
      } catch {
        /* partage annulé ou indisponible */
      }
    }
    await handleCopyLink()
  }

  const previewContent = (post?.content || "").trim()


  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-[scaleIn_0.18s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A35A2B]/10">
              <Share2 size={18} className="text-[#A35A2B]" />
            </span>
            <div>
              <h3 className="text-[16px] font-semibold leading-tight text-[#050505]">
                Partager la publication
              </h3>
              <p className="text-[12px] text-[#65676B]">Envoyer vers un réseau social</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#65676B] transition-colors hover:bg-gray-100 hover:text-[#050505]"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-5">
          {/* Aperçu du post */}
          {post && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-gray-100 bg-[#F7F8FA] p-3">
              <Avatar
                src={post.author?.avatar}
                name={post.author?.name}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[#050505]">
                  {(post.author?.name || "Dughu")}
                </p>
                {previewContent ? (
                  <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#050505]">
                    {previewContent}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[13px] text-[#65676B]">
                    {post.image || post.video ? "Photo / vidéo" : "Publication"}
                  </p>
                )}
              </div>
              {post.image && !post.video ? (
                <Image
                  src={post.image}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  sizes="56px"
                />
              ) : null}
            </div>
          )}



          {/* Réseaux sociaux */}
          <div className="grid grid-cols-2 gap-2.5">
            {targets.map((target) => (
              <button
                key={target.key}
                type="button"
                onClick={() => handleShare(target)}
                className="flex items-center gap-2.5 rounded-xl border border-gray-100 px-3 py-2.5 text-left transition hover:border-[#A35A2B]/30 hover:bg-[#A35A2B]/5 active:scale-[0.98]"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${target.circle}`}
                >
                  {target.monogram}
                </span>
                <span className="text-[13px] font-semibold text-[#050505]">
                  {target.label}
                </span>
              </button>
            ))}
          </div>

          {/* Options supplémentaires */}
          <div className="mt-3 flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] font-semibold text-[#050505] transition hover:bg-gray-50 active:scale-[0.98]"
            >
              <Link2 size={15} />
              Copier le lien
            </button>
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] font-semibold text-[#050505] transition hover:bg-gray-50 active:scale-[0.98]"
            >
              <MoreHorizontal size={15} />
              Autres options
            </button>
          </div>

          {url ? (
            <p className="mt-3 truncate rounded-lg bg-[#F7F8FA] px-3 py-2 text-[11px] text-[#65676B]">
              {url}
            </p>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
