/**
 * Mapper du domaine Recherche : normalisation défensive de la réponse
 * brute (unknown) de l'API externe Dughu vers le modèle métier
 * GlobalSearchResult. Toute l'incertitude du contrat externe est confinée
 * ici — les couches supérieures ne voient que des types sûrs.
 */

import { normalizeUser, pick, resolveMediaUrl } from "@/lib/dughu"
import type { GlobalSearchResult, GlobalSearchResultType } from "@/types/search/search.types"

const TYPE_KEYS: Record<GlobalSearchResultType, string[]> = {
  user: ["users", "user", "people", "utilisateurs"],
  post: ["posts", "post", "publications", "contents", "content"],
  page: ["pages", "page"],
  group: ["groups", "groupes", "group", "groupe"],
  hashtag: ["hashtags", "tags", "hashtag"],
}

function arraysForType(raw: unknown, type: GlobalSearchResultType): unknown[] {
  const root = raw && typeof raw === "object" ? raw as Record<string, unknown> : {}
  const containers = [root, root.result, root.data]
    .filter((value): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value))

  for (const container of containers) {
    for (const key of TYPE_KEYS[type]) {
      const value = container[key]
      if (Array.isArray(value)) return value
      if (value && typeof value === "object" && Array.isArray((value as Record<string, unknown>).data)) {
        return (value as { data: unknown[] }).data
      }
    }
  }

  return []
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : ""
}

function mapUser(value: unknown): GlobalSearchResult | null {
  const user = normalizeUser(value)
  if (!user) return null
  const username = text(user.username || user.slug)
  return {
    id: String(user.id),
    type: "user",
    title: text(user.name) || "Utilisateur",
    subtitle: username ? `@${username.replace(/^@/, "")}` : "Profil Dughu",
    image: text(user.avatar) || "/images/avatar.png",
    href: `/profile/${encodeURIComponent(username || String(user.id))}`,
  }
}

function mapPost(value: unknown): GlobalSearchResult | null {
  if (!value || typeof value !== "object") return null
  const post = value as Record<string, unknown>
  const id = text(pick(post, ["id", "post_id", "postId"], ""))
  if (!id) return null
  const authorRaw = post.user || post.author || post.utilisateur
  const author = normalizeUser(authorRaw)
  const formattedContent = post.postTextFormat && typeof post.postTextFormat === "object"
    ? text((post.postTextFormat as Record<string, unknown>).content)
    : ""
  const content = text(pick(post, ["postText", "content", "text", "body", "description", "post_text"], "")) || formattedContent
  const authorName = text(author?.name) || "Publication"
  const authorTarget = text(author?.username || author?.slug || author?.id)
  const rawImage = text(pick(post, ["postFileThumb", "thumbnail", "image", "postFile", "photo"], ""))
  return {
    id,
    type: "post",
    title: authorName,
    subtitle: content || "Voir cette publication",
    image: rawImage ? resolveMediaUrl(rawImage) : text(author?.avatar) || null,
    href: authorTarget ? `/profile/${encodeURIComponent(authorTarget)}` : null,
  }
}

function mapEntity(value: unknown, type: "page" | "group"): GlobalSearchResult | null {
  if (!value || typeof value !== "object") return null
  const entity = value as Record<string, unknown>
  const id = text(pick(entity, type === "page" ? ["page_id", "id"] : ["group_id", "id"], ""))
  if (!id) return null
  const title = text(pick(entity, type === "page"
    ? ["page_title", "page_name", "name", "title"]
    : ["group_title", "group_name", "name", "title"], ""))
  const description = text(pick(entity, ["description", "about", "category", "page_category"], ""))
  const avatar = text(pick(entity, ["avatar", "image", "photo", "profile_image"], ""))
  return {
    id,
    type,
    title: title || (type === "page" ? "Page" : "Groupe"),
    subtitle: description || (type === "page" ? "Page Dughu" : "Groupe Dughu"),
    image: avatar ? resolveMediaUrl(avatar) : null,
    href: null,
  }
}

function mapHashtag(value: unknown): GlobalSearchResult | null {
  const rawTag = typeof value === "object" && value
    ? pick(value as Record<string, unknown>, ["tag", "hashtag", "name", "title"], "")
    : value
  const tag = text(rawTag).replace(/^#/, "")
  if (!tag) return null
  return {
    id: tag.toLocaleLowerCase(),
    type: "hashtag",
    title: `#${tag}`,
    subtitle: "Hashtag",
    image: null,
    href: `/hashtags/${encodeURIComponent(tag)}`,
  }
}

export function normalizeGlobalSearch(raw: unknown, limit = 20): GlobalSearchResult[] {
  const mapped = [
    ...arraysForType(raw, "user").map(mapUser),
    ...arraysForType(raw, "post").map(mapPost),
    ...arraysForType(raw, "page").map((value) => mapEntity(value, "page")),
    ...arraysForType(raw, "group").map((value) => mapEntity(value, "group")),
    ...arraysForType(raw, "hashtag").map(mapHashtag),
  ].filter((result): result is GlobalSearchResult => result !== null)

  const seen = new Set<string>()
  return mapped.filter((result) => {
    const key = `${result.type}:${result.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, limit)
}
