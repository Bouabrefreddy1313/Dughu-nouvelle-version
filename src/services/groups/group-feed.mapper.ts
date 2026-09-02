import type {
  GroupFeedMedia,
  GroupFeedPost,
  GroupFeedResponse,
} from "@/types/groups/group-feed.types"

type UnknownRecord = Record<string, unknown>

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {}
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""
}

function number(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function boolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true"
}

function absoluteUrl(value: unknown): string | null {
  const url = text(value)
  return /^https?:\/\//i.test(url) ? url : null
}

function mediaType(url: string, explicitType = ""): GroupFeedMedia["type"] {
  const type = explicitType.toLowerCase()
  if (type.startsWith("video") || /\.(mp4|webm|mov|m4v|m3u8)(?:\?|$)/i.test(url)) return "video"
  if (type.startsWith("audio") || /\.(mp3|wav|ogg|m4a|aac)(?:\?|$)/i.test(url)) return "audio"
  return "image"
}

function normalizeMedia(post: UnknownRecord): GroupFeedMedia[] {
  const media: GroupFeedMedia[] = []
  const seen = new Set<string>()
  const add = (urlValue: unknown, idValue: unknown, typeValue?: unknown, thumbnailValue?: unknown) => {
    const url = absoluteUrl(urlValue)
    if (!url || seen.has(url)) return
    seen.add(url)
    media.push({
      id: text(idValue) || `${text(post.id || post.post_id)}-${media.length + 1}`,
      url,
      type: mediaType(url, text(typeValue)),
      thumbnail: absoluteUrl(thumbnailValue),
    })
  }

  add(post.hls_playlist || post.postFile || post.postPhoto, post.post_id || post.id, post.file_type, post.postFileThumb)

  const album = Array.isArray(post.album) ? post.album : []
  for (const item of album) {
    const entry = record(item)
    add(
      entry.url || entry.image || entry.file || entry.postFile || entry.photo,
      entry.id || entry.media_id,
      entry.type || entry.file_type,
      entry.thumbnail || entry.thumb
    )
  }

  return media
}

function interactionCount(post: UnknownRecord, type: string, fallback: unknown): number {
  const interactions = Array.isArray(post.interactions) ? post.interactions : []
  const match = interactions.find((item) => text(record(item).type) === type)
  return match ? number(record(match).count) : number(fallback)
}

const REACTION_NAMES: Record<string, string> = {
  "1": "like",
  "2": "love",
  "3": "haha",
  "4": "wow",
  "5": "sad",
  "6": "angry",
}

function normalizePost(value: unknown): GroupFeedPost | null {
  const post = record(value)
  const group = record(post.groupe || post.group)
  const user = record(post.user || post.author)
  const formattedText = record(post.postTextFormat)
  const color = record(post.color)
  const id = text(post.post_id || post.id)
  const groupId = text(group.id || post.group_id)

  if (!id || !groupId || text(post.postType) !== "group") return null
  if (text(group.privacy) !== "1" || text(group.active || "1") !== "1") return null

  const firstName = text(user.first_name)
  const lastName = text(user.last_name)
  const name = `${firstName} ${lastName}`.trim() || text(user.name || user.username) || "Utilisateur"
  const primaryColor = text(color.color_1)
  const secondaryColor = text(color.color_2) || primaryColor

  return {
    id,
    content: text(formattedText.content) || text(post.postText || post.content),
    createdAt: text(post.created_at) || new Date(number(post.time) * 1000).toISOString(),
    privacy: text(post.postPrivacy),
    shareUrl: absoluteUrl(post.shareLink || post.post_url),
    media: normalizeMedia(post),
    color: primaryColor ? {
      background: primaryColor,
      backgroundSecondary: secondaryColor,
      text: text(color.text_color) || "#ffffff",
    } : null,
    author: {
      id: text(user.user_id || post.user_id),
      name,
      username: text(user.username),
      avatar: absoluteUrl(user.avatar || user.profile_photo_url),
      verified: boolean(user.verified),
      isFollowing: boolean(user.is_following),
      interactionsCount: number(user.getTotalInteractions || post.getTotalInteractions),
    },
    group: {
      id: groupId,
      slug: text(group.group_name),
      name: text(group.group_title || group.group_name) || "Groupe",
      avatar: absoluteUrl(group.avatar),
      cover: absoluteUrl(group.cover),
      privacy: text(group.privacy),
      isMember: boolean(group.is_member),
    },
    likesCount: interactionCount(post, "likes", post.count_likes || post.reaction_count),
    commentsCount: interactionCount(post, "comments", post.comment_count),
    sharesCount: interactionCount(post, "shares", post.share_count),
    repostsCount: interactionCount(post, "reposts", post.repost_count),
    viewsCount: interactionCount(post, "views", post.views_count),
    interactionsCount: interactionCount(post, "total", post.getTotalInteractions),
    reactions: (Array.isArray(post.reaction) ? post.reaction : [])
      .map((item) => {
        const reaction = record(item)
        const type = REACTION_NAMES[text(reaction.reaction)]
        const count = number(reaction.count)
        return type && count > 0 ? { type, count } : null
      })
      .filter((reaction): reaction is { type: string; count: number } => reaction !== null),
    isLiked: boolean(post.is_like),
    reactionType: REACTION_NAMES[text(record(post.reactionUser).reaction || post.typeLike)] || null,
    isSaved: boolean(post.is_saved),
    isPinned: boolean(post.is_pinned),
  }
}

export function normalizeGroupFeed(raw: unknown): GroupFeedResponse {
  const root = record(raw)
  const postsContainer = record(root.posts)
  const rawPosts = Array.isArray(postsContainer.data) ? postsContainer.data : []
  const pagination = record(postsContainer.pagination)
  const currentPage = Math.max(1, number(pagination.current_page) || 1)
  const lastPage = Math.max(currentPage, number(pagination.last_page) || currentPage)

  return {
    success: root.success !== false,
    message: text(root.message) || undefined,
    posts: rawPosts.map(normalizePost).filter((post): post is GroupFeedPost => post !== null),
    pagination: {
      currentPage,
      perPage: number(pagination.per_page) || rawPosts.length,
      total: number(pagination.total),
      lastPage,
      hasMore: boolean(pagination.has_more) || currentPage < lastPage,
    },
  }
}