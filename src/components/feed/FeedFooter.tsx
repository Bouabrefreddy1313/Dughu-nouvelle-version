"use client"

interface FeedFooterProps {
  likesCount?: number
  commentsCount?: number
  sharesCount?: number
  onLike?: () => void
  onComment?: () => void
  onShare?: () => void
  className?: string
}

export function FeedFooter({
  likesCount = 0,
  commentsCount = 0,
  sharesCount = 0,
  onLike,
  onComment,
  onShare,
  className,
}: FeedFooterProps) {
  return (
    <div className={className}>
      <div className="px-4 py-2 flex items-center justify-between border-t border-gray-100">
        <div className="flex items-center gap-1 text-[13px] text-[#65676B]">
          {likesCount > 0 && <span>{likesCount} J'aime</span>}
        </div>
        <div className="flex items-center gap-3 text-[13px] text-[#65676B]">
          <span>{commentsCount} commentaires</span>
          <span>{sharesCount} partages</span>
        </div>
      </div>
      <div className="mx-4 border-t border-gray-100 flex">
        <button
          onClick={onLike}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[15px] font-medium text-[#65676B] transition hover:bg-gray-50 rounded-lg my-1"
        >
          <span>👍</span>
          J'aime
        </button>
        <button
          onClick={onComment}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[15px] font-medium text-[#65676B] transition hover:bg-gray-50 rounded-lg my-1"
        >
          💬 Commenter
        </button>
        <button
          onClick={onShare}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[15px] font-medium text-[#65676B] transition hover:bg-gray-50 rounded-lg my-1"
        >
          ↗️ Partager
        </button>
      </div>
    </div>
  )
}