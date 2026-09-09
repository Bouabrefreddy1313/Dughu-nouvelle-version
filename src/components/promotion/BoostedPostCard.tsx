import { Eye } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Badge from "@/components/common/Badge"
import Avatar from "@/components/common/Avatar"

interface BoostedPostCardProps {
  postId?: string | number | null
  image?: string | null
  authorName?: string | null
  authorAvatar?: string | null
  title?: string
  views?: number | null
  rawPost?: any
  onClick?: () => void
}

export default function BoostedPostCard({
  postId,
  image,
  authorName = "Utilisateur",
  authorAvatar,
  title = "Publication",
  views = 0,
  rawPost,
  onClick,
}: BoostedPostCardProps) {
  const router = useRouter()
  const viewCount = views ?? 0

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (postId) {
      if (typeof window !== "undefined") {
        try {
          const postToStore = rawPost
            ? {
                id: String(rawPost.id || postId),
                content: rawPost.content || title || "",
                image: rawPost.image || image || null,
                images: (rawPost.image || image) ? [{ url: rawPost.image || image, id: String(postId) }] : [],
                video: rawPost.video || null,
                author: rawPost.author || {
                  id: "",
                  name: authorName || "Utilisateur",
                  avatar: authorAvatar || null,
                },
                likesCount: rawPost._count?.likes || 0,
                _count: rawPost._count || { views: viewCount, likes: 0, comments: 0 },
              }
            : {
                id: String(postId),
                content: title || "",
                image: image || null,
                images: image ? [{ url: image, id: String(postId) }] : [],
                author: {
                  id: "",
                  name: authorName || "Utilisateur",
                  avatar: authorAvatar || null,
                },
                likesCount: 0,
                _count: { views: viewCount, likes: 0, comments: 0 },
              }
          sessionStorage.setItem(`dughu_post_${postId}`, JSON.stringify(postToStore))
        } catch {
          /* ignore */
        }
      }
      router.push(`/post/${postId}`)
    }
  }

  return (
    <div
      role={postId || onClick ? "link" : undefined}
      tabIndex={postId || onClick ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && (postId || onClick)) {
          e.preventDefault()
          handleClick()
        }
      }}
      className="relative bg-white dark:bg-[#252525] rounded-[16px] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-gray-100 dark:border-white/10 group cursor-pointer transition hover:shadow-md active:scale-[0.99]"
    >
      {/* Badge Boosté */}
      <Badge variant="yellow" className="absolute top-2 left-2 z-10 text-[9px] px-1.5 py-0.5">
        Boosté
      </Badge>

      {/* Photo du post */}
      <div className="w-full h-28 bg-gray-100 overflow-hidden relative">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, 300px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#A35A2A] to-[#8B5A2B]">
            <span className="text-white text-opacity-70 text-sm font-medium">📸</span>
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="p-2.5">
        {/* Auteur : avatar + nom */}
        <div className="flex items-center gap-2 mb-1.5">
          <Avatar
            src={authorAvatar}
            name={authorName}
            size="xs"
            className="w-6 h-6 border border-gray-200"
          />
          <p className="text-[11px] font-medium text-[#65676B] truncate">{authorName}</p>
        </div>

        {/* Titre du post */}
        <p className="text-[13px] font-semibold text-[#050505] leading-snug line-clamp-2">
          {title}
        </p>

        {/* Vues */}
        {viewCount > 0 && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[#65676B]">
            <Eye size={11} />
            <span>{viewCount} vues</span>
          </div>
        )}
      </div>
    </div>
  )
}