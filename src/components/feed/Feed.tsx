import { FeedHeader } from "./FeedHeader"
import { FeedBody } from "./FeedBody"
import { FeedFooter } from "./FeedFooter"

interface Author {
  id: string
  name: string | null
  avatar: string | null
  verified?: boolean
}

interface FeedProps {
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

export function Feed({
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
}: FeedProps) {
  return (
    <article className={className}>
      <FeedHeader author={author} timeAgo={timeAgo} onMenuClick={onMenuClick} />
      <FeedBody content={content} image={image} />
      <FeedFooter
        likesCount={likesCount}
        commentsCount={commentsCount}
        sharesCount={sharesCount}
        onLike={onLike}
        onComment={onComment}
        onShare={onShare}
      />
    </article>
  )
}