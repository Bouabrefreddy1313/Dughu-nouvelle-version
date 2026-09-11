import type { Timestamp } from "firebase/firestore"
import type { ChatAttachment, ChatContact, ChatMessage, ChatSummary, MessageReceipt } from "@/types/messages/message.types"
import type { FirestoreConversationDoc, FirestoreMessageDoc } from "@/types/messages/firestore.types"
import { isMeaningfulReply } from "@/lib/messages"

function timestampToIso(ts: Timestamp | null | undefined | unknown): string {
  if (!ts) return new Date().toISOString()
  if (typeof ts === "object" && ts !== null && "toDate" in ts && typeof (ts as Timestamp).toDate === "function") {
    return (ts as Timestamp).toDate().toISOString()
  }
  if (typeof ts === "object" && ts !== null && "_seconds" in (ts as Record<string, unknown>)) {
    const sec = (ts as { _seconds: number })._seconds
    return new Date(sec * 1000).toISOString()
  }
  if (typeof ts === "number") {
    const ms = ts < 1e12 ? ts * 1000 : ts
    return new Date(ms).toISOString()
  }
  if (typeof ts === "string") {
    return ts
  }
  return new Date().toISOString()
}

/**
 * Mappe un document Firestore Conversation en ChatSummary métier pour l'UI.
 * Retourne null si la conversation est supprimée pour l'utilisateur courant.
 */
export function mapFirestoreConversationToSummary(
  convId: string,
  data: FirestoreConversationDoc,
  currentUserId: string
): ChatSummary | null {
  const currentId = String(currentUserId)

  // Masquer si dans deletedFor
  if (Array.isArray(data.deletedFor) && data.deletedFor.includes(currentId)) {
    return null
  }

  // Interlocuteur (autre utilisateur)
  const users = Array.isArray(data.users) ? data.users : []
  const otherUser = users.find((u) => String(u.id) !== currentId)
  const otherId = otherUser ? String(otherUser.id) : (Array.isArray(data.participants) ? data.participants.find((id) => String(id) !== currentId) : "") || ""

  if (!otherId) return null

  const contact: ChatContact = {
    id: otherId,
    name: otherUser?.name || "Utilisateur",
    username: otherUser?.username || null,
    avatar: otherUser?.photo_url || null,
    online: false,
    lastSeen: null,
  }

  const unreadCount = Number(data.unread?.[currentId] ?? 0)
  const updatedAt = timestampToIso(data.updated_at || data.created_at)
  const lastMessage = data.lastMessage || ""

  return {
    id: convId,
    contact,
    lastMessage,
    updatedAt,
    unreadCount,
    lastMessageKey: `${convId}:${updatedAt}:${lastMessage}`,
    lastMessageReceipt: null,
    lastMessageIsMine: false,
  }
}

/**
 * Mappe un document Firestore Message en ChatMessage métier pour l'UI.
 * Retourne null si le message est supprimé pour l'utilisateur courant.
 */
export function mapFirestoreMessageToChatMessage(
  msgId: string,
  data: FirestoreMessageDoc,
  currentUserId: string
): ChatMessage | null {
  const currentId = String(currentUserId)

  // Vérifier si supprimé pour l'utilisateur
  if (Array.isArray(data.deletedFor) && data.deletedFor.includes(currentId)) {
    return null
  }
  if (data.delete && data.delete[currentId] === true) {
    return null
  }

  // Si supprimé pour tout le monde
  const isDeletedForAll =
    data.delete &&
    Object.keys(data.delete).length > 0 &&
    Object.values(data.delete).every((v) => v === true)

  const senderId = String(data.from_id || "")
  const receiverId = String(data.to_id || "")
  const isMine = senderId === currentId

  const createdAt = timestampToIso(data.timestamp)

  const attachments: ChatAttachment[] = []
  if (data.media && typeof data.media === "string" && data.media.trim()) {
    const url = data.media.trim()
    const mime = (data.mime_type || "").toLowerCase()
    const fileName = data.file_name || "fichier"
    const ext = fileName.split(".").pop()?.toLowerCase() || ""

    let type: ChatAttachment["type"] = "document"
    if (
      mime.startsWith("image/") ||
      ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext) ||
      url.includes("/image/")
    ) {
      type = "image"
    } else if (
      mime.startsWith("video/") ||
      ["mp4", "webm", "ogg", "mov"].includes(ext) ||
      url.includes("/video/")
    ) {
      type = "video"
    }

    attachments.push({
      type,
      url,
      name: fileName,
    })
  }

  // Accusé de lecture
  const isSeen = data.seen === true || (typeof data.seen === "number" && data.seen > 0)
  const seenAt = isSeen ? (data.seen_at ? timestampToIso(data.seen_at) : createdAt) : null
  const receipt: MessageReceipt | undefined = isMine ? (isSeen ? "read" : "delivered") : undefined

  // Citation (réponse)
  const rawReply = data.reply_doc_id
    ? {
        id: data.reply_doc_id,
        sender: data.reply_sender || null,
        text: data.reply_text || null,
      }
    : null
  const reply = isMeaningfulReply(rawReply) ? rawReply : null

  const text = isDeletedForAll ? "Ce message a été supprimé" : data.text || ""

  return {
    id: msgId,
    senderId,
    receiverId,
    text,
    createdAt,
    isMine,
    attachments: isDeletedForAll ? [] : attachments,
    seenAt,
    receipt,
    reply: isDeletedForAll ? null : reply,
  }
}
