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
          <span><span className="sm:hidden">{commentsCount}</span><span className="hidden sm:inline">{commentsCount} commentaires</span></span>
          <span><span className="sm:hidden">{sharesCount}</span><span className="hidden sm:inline">{sharesCount} partages</span></span>
        </div>
      </div>
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
    </div>
  )
}