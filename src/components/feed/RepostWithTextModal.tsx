"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { Send, X, Repeat2 } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import Avatar from "@/components/common/Avatar"
import { HashtagText } from "@/components/common/HashtagText"

interface RepostWithTextModalProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onClose: () => void
  onSubmit: (text: string) => void
  parentPost?: {
    id: string
    author: {
      id: string
      name: string | null
      avatar: string | null
      username?: string | null
      verified?: boolean
    }
    content?: string | null
    image?: string | null
    video?: string | null
    color?: string | null
    timeAgo?: string
  }
}

const MAX_LENGTH = 500

function ParentPostCardPreview({
  parentPost,
}: {
  parentPost: NonNullable<RepostWithTextModalProps["parentPost"]>
}) {
  const content = parentPost.content
  let bgColor: string | null = null
  let textColor = "#050505"

  if (parentPost.color) {
    try {
      const parsed =
        typeof parentPost.color === "string"
          ? JSON.parse(parentPost.color)
          : parentPost.color
      if (parsed && typeof parsed === "object") {
        bgColor = parsed.bg || parsed.background || null
        textColor = parsed.text || parsed.textColor || "#FFFFFF"
      } else {
        bgColor = parsed
        textColor = "#FFFFFF"
      }
    } catch {
      bgColor = parentPost.color
      textColor = "#FFFFFF"
    }
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-[#F7F8FA]">
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-1.5">
        <Avatar
          src={parentPost.author.avatar}
          name={parentPost.author.name}
          size="sm"
          verified={parentPost.author.verified}
        />
        <div className="min-w-0 flex-1">
          <a
            href={`/profile/${parentPost.author.username || parentPost.author.id}`}
            className="block truncate text-[13px] font-semibold text-[#050505] hover:underline"
          >
            {parentPost.author.name}
          </a>
          {parentPost.timeAgo ? (
            <p className="text-[11px] text-[#65676B]">{parentPost.timeAgo}</p>
          ) : null}
        </div>
      </div>

      {content ? (
        bgColor ? (
          <div
            className="flex w-full min-h-[120px] items-center justify-center px-4 py-6"
            style={{ background: bgColor, color: textColor }}
          >
            <p className="text-center text-[20px] font-bold leading-relaxed whitespace-pre-wrap">
              <HashtagText text={content} hashtagClassName="text-inherit underline" />
            </p>
          </div>
        ) : (
          <p className="px-4 pb-2.5 pt-1.5 text-[14px] leading-relaxed whitespace-pre-wrap text-[#050505]">
            <HashtagText text={content} />
          </p>
        )
      ) : null}

      {parentPost.image && !parentPost.video && (
        <div className="w-full overflow-hidden">
          <Image
            src={parentPost.image}
            alt=""
            width={600}
            height={300}
            className="max-h-[300px] w-full object-cover"
            sizes="(max-width: 640px) 100vw, 600px"
          />
        </div>
      )}

      {parentPost.video && (
        <div className="w-full overflow-hidden bg-black">
          <video
            src={parentPost.video}
            controls
            muted
            playsInline
            loop
            preload="metadata"
            className="max-h-[300px] w-full object-cover"
          />
        </div>
      )}
    </div>
  )
}

export function RepostWithTextModal({
  isOpen,
  setIsOpen,
  onClose,
  onSubmit,
  parentPost,
}: RepostWithTextModalProps) {
  const [repostText, setRepostText] = useState("")
  const repostTextRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && repostTextRef.current) {
      const t = setTimeout(() => repostTextRef.current?.focus(), 120)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setRepostText("")
    }
  }, [isOpen])

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setRepostText(event.target.value)
  }

  const handleSubmit = () => {
    const text = repostText.trim()
    if (!text) return
    onSubmit(text)
    setIsOpen(false)
    setRepostText("")
  }

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
        setRepostText("")
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, setIsOpen])

  if (!isOpen) return null

  const remaining = MAX_LENGTH - repostText.length
  const isNearLimit = remaining <= 20
  const canSubmit = repostText.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-[scaleIn_0.18s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A35A2B]/10">
              <Repeat2 size={18} className="text-[#A35A2B]" />
            </span>
            <div>
              <h3 className="text-[16px] font-semibold leading-tight text-[#050505]">
                Republier avec un commentaire
              </h3>
              <p className="text-[12px] text-[#65676B]">
                {parentPost?.author.name}
              </p>
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
          <div className="relative">
            <textarea
              ref={repostTextRef}
              value={repostText}
              onChange={handleTextChange}
              placeholder="Ajouter un commentaire..."
              className="w-full min-h-[88px] resize-none rounded-xl px-3.5 py-2.5 text-[14px] leading-relaxed text-[#050505] placeholder-[#65676B] outline-none transition-all ring-1 ring-gray-200 focus:ring-2 focus:ring-[#A35A2B]/40 bg-[#FAFAFA] focus:bg-white"
              maxLength={MAX_LENGTH}
            />
            {repostText.length > 0 && (
              <span
                className={cn(
                  "absolute bottom-2 right-3 text-[11px] font-medium tabular-nums transition-colors",
                  isNearLimit
                    ? remaining <= 0
                      ? "text-red-500"
                      : "text-amber-500"
                    : "text-[#65676B]"
                )}
              >
                {remaining}
              </span>
            )}
          </div>

          {parentPost && <ParentPostCardPreview parentPost={parentPost} />}

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-[13px] font-medium text-[#65676B] transition-colors hover:bg-gray-100"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all",
                canSubmit
                  ? "bg-[#A35A2B] text-white shadow-sm hover:bg-[#8B4A1F] hover:shadow active:scale-95"
                  : "cursor-not-allowed bg-gray-200 text-gray-400"
              )}
            >
              <Send size={13} />
              Publier
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
