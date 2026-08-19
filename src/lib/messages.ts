/* eslint-disable @typescript-eslint/no-explicit-any -- Réponses Dughu non documentées, normalisées défensivement. */
import { resolveMediaUrl } from "@/lib/dughu"

export interface ChatContact {
  id: string
  name: string
  username?: string | null
  avatar?: string | null
  online?: boolean
}

export interface ChatSummary {
  id: string
  contact: ChatContact
  lastMessage: string
  updatedAt: string
  unreadCount: number
}

export interface ChatAttachment {
  type: "image" | "video" | "document"
  url: string
  name?: string | null
}

export interface ChatMessage {
  id: string
  senderId: string
  receiverId: string
  text: string
  createdAt: string
  isMine: boolean
  attachments: ChatAttachment[]
  reply?: {
    id?: string | null
    sender?: string | null
    text?: string | null
  } | null
}

function first<T>(...values: T[]): T | undefined {
  return values.find((value) => value !== undefined && value !== null && value !== "")
}

function findArray(raw: any, keys: string[]): any[] {
  if (Array.isArray(raw)) return raw
  if (!raw || typeof raw !== "object") return []
  for (const key of keys) {
    if (Array.isArray(raw[key])) return raw[key]
  }
  for (const wrapper of ["result", "data", "payload"]) {
    const nested = raw[wrapper]
    if (nested && nested !== raw) {
      const found = findArray(nested, keys)
      if (found.length) return found
    }
  }
  return []
}

function normalizeContact(raw: any, currentUserId?: string): ChatContact | null {
  if (!raw || typeof raw !== "object") return null
  const participants = Array.isArray(raw.participants) ? raw.participants : []
  const participant = participants.find((item: any) =>
    String(first(item?.id, item?.user_id, item?.userId) || "") !== String(currentUserId || "")
  )
  const user = first(
    raw.contact,
    raw.target_user,
    raw.targetUser,
    raw.receiver,
    raw.other_user,
    raw.otherUser,
    participant,
    raw.user
  ) as any || raw
  const id = first(
    user?.id,
    user?.user_id,
    user?.userId,
    raw.target_user_id,
    raw.targetUserId,
    raw.receiver_id,
    raw.receiverId
  )
  if (id === undefined) return null
  return {
    id: String(id),
    name: String(first(user?.name, user?.full_name, user?.fullName, user?.username, raw.name) || "Utilisateur"),
    username: first(user?.username, user?.user_name, user?.slug) as string | undefined,
    avatar: resolveMediaUrl(String(first(
      user?.avatar,
      user?.profile_image,
      user?.profileImage,
      user?.photo,
      raw.avatar
    ) || "")) || null,
    online: Boolean(first(user?.is_online, user?.isOnline, user?.online, false)),
  }
}

export function normalizeChats(raw: any, currentUserId: string): ChatSummary[] {
  const items = findArray(raw, ["chats", "conversations", "contacts", "users", "items"])
  return items.flatMap((item, index) => {
    const contact = normalizeContact(item, currentUserId)
    if (!contact || contact.id === String(currentUserId)) return []
    const last = first(item.last_message, item.lastMessage, item.message, item.latest_message) as any
    return [{
      id: String(first(item.id, item.chat_id, item.conversation_id, `${contact.id}-${index}`)),
      contact,
      lastMessage: String(
        typeof last === "object"
          ? first(last?.message, last?.content, last?.text, "")
          : last || ""
      ),
      updatedAt: String(first(
        item.updated_at,
        item.updatedAt,
        last?.created_at,
        last?.createdAt,
        item.created_at,
        ""
      )),
      unreadCount: Number(first(item.unread_count, item.unreadCount, item.unread, 0)) || 0,
    }]
  })
}

export function normalizeChatContact(raw: any): ChatContact | null {
  const payload = first(raw?.result, raw?.data, raw?.contact, raw)
  if (Array.isArray(payload)) return normalizeContact(payload[0])
  return normalizeContact(payload)
}

export function normalizeContacts(raw: any, currentUserId: string): ChatContact[] {
  const items = findArray(raw, ["users", "contacts", "results", "items"])
  const seen = new Set<string>()
  return items.flatMap((item) => {
    const contact = normalizeContact(item, currentUserId)
    if (!contact || contact.id === String(currentUserId) || seen.has(contact.id)) return []
    seen.add(contact.id)
    return [contact]
  })
}

export function normalizeMessages(raw: any, currentUserId: string): ChatMessage[] {
  const items = findArray(raw, ["messages", "conversation", "items", "chats"])
  return items.map((item, index) => {
    const senderId = String(first(
      item.sender_id,
      item.senderId,
      item.user_id,
      item.userId,
      item.sender?.id,
      ""
    ))
    const receiverId = String(first(
      item.receiver_id,
      item.receiverId,
      item.target_user_id,
      item.targetUserId,
      item.receiver?.id,
      ""
    ))
    const attachments: ChatAttachment[] = []
    const addAttachment = (type: ChatAttachment["type"], value: any) => {
      const url = typeof value === "object" ? first(value?.url, value?.path, value?.file) : value
      if (!url) return
      attachments.push({
        type,
        url: resolveMediaUrl(String(url)),
        name: typeof value === "object" ? first(value?.name, value?.filename) as string : null,
      })
    }
    addAttachment("image", first(item.image, item.image_url, item.imageUrl))
    addAttachment("video", first(item.video, item.video_url, item.videoUrl))
    addAttachment("document", first(item.document, item.document_url, item.documentUrl, item.file))
    return {
      id: String(first(item.id, item.doc_id, item.message_id, `${senderId}-${index}`)),
      senderId,
      receiverId,
      text: String(first(item.message, item.content, item.text, "")),
      createdAt: String(first(item.created_at, item.createdAt, item.date, item.timestamp, "")),
      isMine: senderId === String(currentUserId),
      attachments,
      reply: first(item.reply_doc_id, item.reply_text)
        ? {
            id: first(item.reply_doc_id, item.replyDocId) as string | null,
            sender: first(item.reply_sender, item.replySender) as string | null,
            text: first(item.reply_text, item.replyText) as string | null,
          }
        : null,
    }
  }).sort((a, b) => {
    const left = new Date(a.createdAt).getTime()
    const right = new Date(b.createdAt).getTime()
    return (Number.isFinite(left) ? left : 0) - (Number.isFinite(right) ? right : 0)
  })
}
