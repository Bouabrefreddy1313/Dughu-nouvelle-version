import { MoreHorizontal } from "lucide-react"
import Avatar from "@/components/common/Avatar"
import IconButton from "@/components/common/IconButton"

interface Author {
  id: string
  name: string | null
  avatar: string | null
  verified?: boolean
}

interface FeedHeaderProps {
  author: Author
  timeAgo?: string
  onMenuClick?: () => void
}

export function FeedHeader({ author, timeAgo, onMenuClick }: FeedHeaderProps) {
  return (
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
  )
}