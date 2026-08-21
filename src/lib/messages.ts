/* eslint-disable @typescript-eslint/no-explicit-any -- Réponses Dughu non documentées, normalisées défensivement. */
import { resolveMediaUrl } from "@/lib/dughu"

export interface ChatContact {
  id: string
  name: string
  username?: string | null
  avatar?: string | null
  online?: boolean
  lastSeen?: string | null
}

export interface ChatSummary {
  id: string
  contact: ChatContact
  lastMessage: string
  updatedAt: string
  unreadCount: number
  lastMessageKey: string
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

function readBoolean(value: any): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value === 1
  return ["1", "true", "online", "active"].includes(String(value ?? "").toLowerCase())
}

function readDate(item: any): string {
  const value = first(item.created_at, item.createdAt, item.date, item.timestamp)
  if (value !== undefined) return String(value)
  const unixTime = Number(item.time)
  return Number.isFinite(unixTime) && unixTime > 0
    ? new Date(unixTime * 1000).toISOString()
    : ""
}

function findArray(raw: any, keys: string[]): any[] {
  if (Array.isArray(raw)) return raw
  if (!raw || typeof raw !== "object") return []
  for (const key of keys) {
    if (Array.isArray(raw[key])) return raw[key]
    if (raw[key] && typeof raw[key] === "object") {
      const nested = findArray(raw[key], keys)
      if (nested.length) return nested

      // Les conversations et messages issus de Firestore peuvent être indexés
      // par identifiant au lieu d'être renvoyés dans un tableau JSON.
      const entries = Object.entries(raw[key]).filter(([, value]) => value && typeof value === "object")
      if (entries.length) {
        return entries.map(([collectionKey, value]) => ({
          ...(value as Record<string, unknown>),
          _collectionKey: collectionKey,
        }))
      }
    }
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
    raw.interlocutor,
    raw.interlocuteur,
    participant,
    raw.user
  ) as any || raw
  const conversationParticipants = String(raw._collectionKey || "").match(/\d+/g) || []
  const idFromConversationKey = conversationParticipants.find(
    (value) => value !== String(currentUserId || "") && value !== "0"
  )
  const idFromMessage = [raw.from_id, raw.to_id]
    .map((value) => String(value ?? ""))
    .find((value) => value && value !== "0" && value !== String(currentUserId || ""))
  const id = first(
    user?.id,
    user?.user_id,
    user?.userId,
    raw.target_user_id,
    raw.targetUserId,
    raw.receiver_id,
    raw.receiverId,
    raw.contact_id,
    raw.contactId,
    raw.friend_id,
    raw.friendId,
    raw.other_user_id,
    raw.otherUserId,
    raw.interlocutor_id,
    raw.interlocutorId,
    idFromConversationKey,
    idFromMessage
  )
  if (id === undefined) return null
  const firstName = first(user?.first_name, user?.firstName, user?.firstname)
  const lastName = first(user?.last_name, user?.lastName, user?.lastname)
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim()
  return {
    id: String(id),
    name: String(first(
      user?.name,
      user?.full_name,
      user?.fullName,
      user?.display_name,
      user?.displayName,
      user?.fullname,
      user?.user_name,
      user?.userName,
      fullName,
      user?.username,
      raw.name
    ) || "Utilisateur"),
    username: first(user?.username, user?.user_name, user?.slug) as string | undefined,
    avatar: resolveMediaUrl(String(first(
      user?.avatar,
      user?.profile_image,
      user?.profileImage,
      user?.photo,
      raw.avatar
    ) || "")) || null,
    online: readBoolean(first(user?.is_online, user?.isOnline, user?.online, false)),
    lastSeen: String(first(user?.last_seen, user?.lastSeen, user?.last_activity, user?.lastActivity, "") || "") || null,
  }
}

export function normalizeChats(raw: any, currentUserId: string): ChatSummary[] {
  const rawChats = raw?.chats ?? raw?.result?.chats ?? raw?.data?.chats
  const items = rawChats && !Array.isArray(rawChats) && typeof rawChats === "object"
    ? Object.entries(rawChats).flatMap(([collectionKey, messages]) => {
        if (!Array.isArray(messages) || messages.length === 0) return []
        const ordered = [...messages].sort((left, right) => {
          const leftTime = Number(left?.time) || new Date(left?.updated_at || left?.created_at || 0).getTime() / 1000
          const rightTime = Number(right?.time) || new Date(right?.updated_at || right?.created_at || 0).getTime() / 1000
          return leftTime - rightTime
        })
        const last = ordered.at(-1)
        return [{ ...last, _collectionKey: collectionKey, last_message: last }]
      })
    : findArray(raw, ["chats", "conversations", "contacts", "users", "items"])
  return items.flatMap((item, index) => {
    // Dans la réponse réelle, `id` est l'ID du dernier message. L'identité de
    // l'interlocuteur vient de la clé de conversation (ex. `2642-8603`).
    const contactSource = item._collectionKey
      ? { ...item, id: undefined, user_id: undefined, userId: undefined }
      : item
    const contact = normalizeContact(contactSource, currentUserId)
    if (!contact || contact.id === String(currentUserId)) return []
    const last = first(item.last_message, item.lastMessage, item.message, item.latest_message) as any
    const lastText = String(
      typeof last === "object"
        ? first(last?.message, last?.content, last?.text, "")
        : last || ""
    )
    const lastMessage = lastText || (
      first(last?.image, last?.image_url, item.image, item.image_url)
        ? "Photo"
        : first(last?.video, last?.video_url, item.video, item.video_url)
          ? "Vidéo"
          : first(last?.document, last?.document_url, last?.file, item.document, item.document_url)
            ? "Document"
            : ""
    )
    const updatedAt = String(first(
      item.updated_at,
      item.updatedAt,
      last?.created_at,
      last?.createdAt,
      item.created_at,
      readDate(last || item),
      ""
    ) || "")
    const lastId = String(first(last?.id, last?.doc_id, last?.message_id, item.last_message_id, "") || "")
    return [{
      id: String(first(
        item.id,
        item.chat_id,
        item.chatId,
        item.conversation_id,
        item.conversationId,
        item._collectionKey,
        `${contact.id}-${index}`
      )),
      contact,
      lastMessage,
      updatedAt,
      unreadCount: Number(first(item.unread_count, item.unreadCount, item.unread, 0)) || 0,
      lastMessageKey: lastId || `${updatedAt}:${lastMessage}`,
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

function readUserId(value: any): string {
  if (value === undefined || value === null || value === "") return ""
  if (typeof value !== "object") return String(value)
  return String(first(
    value.id,
    value.user_id,
    value.userId,
    value.sender_id,
    value.senderId,
    value.receiver_id,
    value.receiverId,
    ""
  ))
}

function readMineFlag(item: any): boolean | undefined {
  const value = first(
    item.isMine,
    item.is_mine,
    item.sent_by_me,
    item.sentByMe,
    item.is_sender,
    item.isSender
  )
  if (typeof value === "boolean") return value
  if (value === 1 || value === "1" || value === "true") return true
  if (value === 0 || value === "0" || value === "false") return false

  const direction = String(first(item.direction, item.message_direction, item.messageDirection, "")).toLowerCase()
  if (["outgoing", "outbound", "sent", "send"].includes(direction)) return true
  if (["incoming", "inbound", "received", "receive"].includes(direction)) return false
  return undefined
}

export function normalizeMessages(raw: any, currentUserId: string, targetUserId?: string): ChatMessage[] {
  const items = findArray(raw, ["messages", "conversation", "items", "chats"])
  return items.map((item, index) => {
    const senderId = readUserId(first(
      item.sender_id,
      item.senderId,
      item.from_user_id,
      item.fromUserId,
      item.from_id,
      item.fromId,
      item.from,
      item.user_id,
      item.userId,
      item.sender,
      ""
    ))
    const receiverId = readUserId(first(
      item.receiver_id,
      item.receiverId,
      item.recipient_id,
      item.recipientId,
      item.to_user_id,
      item.toUserId,
      item.to_id,
      item.toId,
      item.to,
      item.target_user_id,
      item.targetUserId,
      item.receiver,
      item.recipient,
      ""
    ))
    const explicitMine = readMineFlag(item)
    const currentId = String(currentUserId)
    const targetId = String(targetUserId || "")
    const isMine = explicitMine ?? (
      senderId
        ? senderId === currentId
        : Boolean(receiverId && targetId && receiverId === targetId)
    )
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
    const media = first(item.media, item.media_path, item.mediaPath)
    if (media && attachments.length === 0) {
      const mediaName = String(first(item.mediaFileName, item.media_file_name, media) || "")
      const extension = mediaName.split(".").pop()?.toLowerCase()
      const type: ChatAttachment["type"] = ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(extension || "")
        ? "image"
        : ["mp4", "webm", "ogg", "mov"].includes(extension || "")
          ? "video"
          : "document"
      addAttachment(type, { url: media, name: mediaName })
    }
    return {
      id: String(first(item.id, item.doc_id, item.message_id, `${senderId}-${index}`)),
      senderId,
      receiverId,
      text: String(first(item.message, item.content, item.text, "")),
      createdAt: readDate(item),
      isMine,
      attachments,
      reply: first(item.reply_doc_id, item.reply_text)
        ? {
            id: first(item.reply_doc_id, item.replyDocId) as string | null,
            sender: first(item.reply_sender, item.replySender) as string | null,
            text: first(item.reply_text, item.replyText) as string | null,
          }
        : null,
    }
  }).filter((message) => {
    if (!targetUserId) return true
    const currentId = String(currentUserId)
    const targetId = String(targetUserId)
    return (
      (message.senderId === currentId && message.receiverId === targetId) ||
      (message.senderId === targetId && message.receiverId === currentId)
    )
  }).sort((a, b) => {
    const left = new Date(a.createdAt).getTime()
    const right = new Date(b.createdAt).getTime()
    return (Number.isFinite(left) ? left : 0) - (Number.isFinite(right) ? right : 0)
  })
}
