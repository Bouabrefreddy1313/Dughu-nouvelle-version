"use client"

import { MoreHorizontal } from "lucide-react"
import Image from "next/image"
import Avatar from "@/components/common/Avatar"
import IconButton from "@/components/common/IconButton"

interface Author {
  id: string
  name: string | null
  avatar: string | null
  verified?: boolean
}

interface FeedCardProps {
  author: Author
  timeAgo?: string
  content?: string
  image?: string
  likesCount?: number
  commentsCount?: number
  sharesCount?: number
  onLike?: () => void
  onComment?: () => void
  onShare?: () => void
  onMenuClick?: () => void
  className?: string
}

export function FeedCard({
  author,
  timeAgo,
  content,
  image,
  likesCount = 0,
  commentsCount = 0,
  sharesCount = 0,
  onLike,
  onComment,
  onShare,
  onMenuClick,
  className,
}: FeedCardProps) {
  return (
    <article className={className}>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar src={author.avatar} name={author.name} size="md" />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[15px] text-[#050505]">{author.name}</p>
              {author.verified && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A35A2A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            {timeAgo && <p className="text-[13px] text-[#65676B]">{timeAgo}</p>}
          </div>
        </div>
        {onMenuClick && (
          <IconButton ariaLabel="Menu" size="sm" onClick={onMenuClick}>
            <MoreHorizontal className="w-4 h-4" />
          </IconButton>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pb-3">
        {content && (
          <p className="text-[15px] text-[#050505] whitespace-pre-wrap leading-relaxed break-words mb-3">
            {content}
          </p>
        )}
        {image && (
          <Image
            src={image}
            alt=""
            width={800}
            height={500}
            className="w-full object-cover rounded-2xl max-h-[500px]"
            sizes="(max-width: 640px) 100vw, 800px"
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 flex items-center justify-between border-t border-gray-100">
        <div className="flex items-center gap-1 text-[13px] text-[#65676B]">
          {likesCount > 0 && <span>{likesCount} J'aime</span>}
        </div>
        <div className="flex items-center gap-3 text-[13px] text-[#65676B]">
          <span>{commentsCount} commentaires</span>
          <span>{sharesCount} partages</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mx-4 border-t border-gray-100 flex">
        <button
          onClick={onLike}
          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2.5 text-[13px] sm:text-[15px] font-medium text-[#65676B] transition hover:bg-gray-50 rounded-lg my-1"
        >
          <span>👍</span>
          <span className="hidden sm:inline">J'aime</span>
        </button>
        <button
          onClick={onComment}
          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2.5 text-[13px] sm:text-[15px] font-medium text-[#65676B] transition hover:bg-gray-50 rounded-lg my-1"
        >
          <span>💬</span>
          <span className="hidden sm:inline">Commenter</span>
        </button>
        <button
          onClick={onShare}
          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2.5 text-[13px] sm:text-[15px] font-medium text-[#65676B] transition hover:bg-gray-50 rounded-lg my-1"
        >
          <span>↗️</span>
          <span className="hidden sm:inline">Partager</span>
        </button>
      </div>
    </article>
  )
}