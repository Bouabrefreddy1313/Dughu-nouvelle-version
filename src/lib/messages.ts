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
  /** Accusé de lecture du dernier message (s'il a été envoyé par moi). */
  lastMessageReceipt?: MessageReceipt | null
}

export interface ChatAttachment {
  type: "image" | "video" | "document"
  url: string
  name?: string | null
}

/**
 * État d'accusé de lecture pour les messages envoyés :
 * - `"sent"` : envoyé, mais pas encore distribué (destinataire hors ligne).
 * - `"delivered"` : distribué (reçu par le destinataire), pas encore lu.
 * - `"read"` : lu par le destinataire.
 */
export type MessageReceipt = "sent" | "delivered" | "read"

export interface ChatMessage {
  id: string
  senderId: string
  receiverId: string
  text: string
  createdAt: string
    isMine: boolean
  attachments: ChatAttachment[]
  /** Timestamp de lecture (`seen`) Dughu, normalisé en ISO — null si le destinataire n'a pas ouvert. */
  seenAt: string | null
  /** Accusé de lecture (uniquement pour mes messages envoyés). */
  receipt?: MessageReceipt | null
  reply?: {
    id?: string | null
    sender?: string | null
    text?: string | null
  } | null
}

/**
 * Détermine si un `reply` reçu du serveur (ou construit localement)
 * correspond à une VRAIE citation, et pas à un objet vide/placeholder
 * (`{ id: "", sender: "", text: "" }`) que l'API peut renvoyer pour les
 * messages qui ne répondent à rien.
 *
 * Sans ce garde-fou, un objet vide reste "truthy" en JS : les tests du
 * type `message.reply && ...` ou `replyInfo ?? sent.reply ?? null`
 * laissent passer l'objet vide, et l'aperçu de citation retombe sur ses
 * valeurs par défaut ("Message" / "Pièce jointe"), faisant apparaître à
 * tort un encart de citation au-dessus d'un message qui n'est pourtant
 * pas une réponse.
 */
export function isMeaningfulReply(
  reply: ChatMessage["reply"] | null | undefined
): reply is NonNullable<ChatMessage["reply"]> {
  if (!reply) return false
  const id = reply.id?.trim() || ""
  const text = reply.text?.trim() || ""
  const sender = reply.sender?.trim() || ""
  // `id === "0"` est la valeur sentinelle Dughu « pas de réponse » : le champ
  // `reply_id` est toujours présent dans un message, à 0 pour un message qui
  // ne répond à rien. Sans ce garde-fou, chaque message normal serait pris
  // pour une citation et afficherait l'encart « Message / Pièce jointe ».
  return Boolean((id && id !== "0") || text || sender)
}

/**
 * Reconstruit un aperçu de citation lisible même quand `reply.sender` /
 * `reply.text` arrivent vides depuis l'API (seul `reply.id` est fiable) :
 * on retrouve alors le message original dans l'historique déjà chargé.
 *
 * Renvoie `null` si `reply` n'est pas une VRAIE citation (voir
 * `isMeaningfulReply`) — c'est ce qui empêche l'encart "Message / Pièce
 * jointe" de s'afficher sur un message qui ne répond à rien.
 */
export function resolveReplyPreview(
  reply: ChatMessage["reply"] | null | undefined,
  messages: ChatMessage[],
  contactName: string
): { sender: string; text: string } | null {
  if (!isMeaningfulReply(reply)) return null
  const original = reply!.id ? messages.find((item) => item.id === reply!.id) : undefined
  const sender =
    reply!.sender || (original ? (original.isMine ? "Vous" : contactName || "Utilisateur") : "") || "Message"
  const text = reply!.text || original?.text || "Pièce jointe"
  return { sender, text }
}

// ── Persistance locale des citations (« réponse à ») ─────────────────────────
// L'API Dughu ne restitue pas la citation d'une réponse dans
// `getConversationMessages` : le champ `reply_id` reste à 0 même pour une vraie
// réponse. On persiste donc côté client (localStorage) la citation de chaque
// message envoyé, pour qu'elle survive au rechargement de la page — au même titre
// que les réactions de message.
const MESSAGE_REPLIES_STORAGE_KEY = "dughu:message-replies"

export function readPersistedReplies(): Record<string, NonNullable<ChatMessage["reply"]>> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(MESSAGE_REPLIES_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, NonNullable<ChatMessage["reply"]>>
    const result: Record<string, NonNullable<ChatMessage["reply"]>> = {}
    for (const [id, reply] of Object.entries(parsed)) {
      if (reply && isMeaningfulReply(reply)) result[id] = reply
    }
    return result
  } catch {
    return {}
  }
}

export function persistMessageReply(messageId: string, reply: ChatMessage["reply"]) {
  if (typeof window === "undefined" || !messageId) return
  const all = readPersistedReplies()
  if (reply && isMeaningfulReply(reply)) {
    all[messageId] = reply
  } else {
    delete all[messageId]
  }
  try {
    window.localStorage.setItem(MESSAGE_REPLIES_STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* localStorage plein ou désactivé : on ignore */
  }
}

/**
 * Fusionne les citations conservées localement avec les messages renvoyés par le
 * serveur : pour chaque message sans citation serveur, on rattache la citation
 * gardée en mémoire (state courant) ou dans le localStorage. C'est ce qui fait
 * réapparaître la « réponse à » après un rechargement de page.
 */
export function mergeLocalReplies(
  serverMessages: ChatMessage[],
  inMemoryReplies?: Map<string, NonNullable<ChatMessage["reply"]>>
): ChatMessage[] {
  const persisted = readPersistedReplies()
  return serverMessages.map((message) => {
    if (isMeaningfulReply(message.reply)) return message
    const local = message.id ? inMemoryReplies?.get(message.id) : undefined
    const reply = local ?? (message.id ? persisted[message.id] : undefined)
    return reply ? { ...message, reply } : message
  })
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

/**
 * Extrait les informations de citation (« réponse à un message ») depuis un
 * message brut Dughu. L'API peut renvoyer ces données sous plusieurs formes :
 *  - champs aplatis : reply_doc_id / reply_text / reply_sender…
 *  - objet imbriqué : reply, reply_to, quoted, parent…
 *  - champs « parent_* » (Firestore / formats alternatifs)
 */
function normalizeReply(item: any): { id: string | null; sender: string | null; text: string | null } | null {
  const readId = (...values: any[]): string | null => {
    const value = first(...values)
    if (value === undefined || value === null) return null
    const str = String(value).trim()
    // Le champ `reply_id` Dughu est toujours présent et vaut 0 pour un message
    // qui ne répond à rien : on neutralise « 0 » pour ne pas créer de citation
    // fantôme (voir isMeaningfulReply).
    if (!str || str === "0") return null
    return str
  }
  const readText = (...values: any[]): string | null => {
    const value = first(...values)
    return value !== undefined && value !== null ? String(value) : null
  }
  const readSender = (...values: any[]): string | null => {
    const value = first(...values)
    return value !== undefined && value !== null ? String(value) : null
  }

  // 1) Objet imbriqué (reply / reply_to / quoted / parent…)
  for (const key of [
    "reply",
    "reply_to",
    "replyTo",
    "quoted",
    "quoted_message",
    "quotedMessage",
    "parent",
    "parent_message",
    "parentMessage",
    "referenced_message",
  ]) {
    const nested = item[key]
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const id = readId(
        nested.id,
        nested.message_id,
        nested.messageId,
        nested.doc_id,
        nested.docId,
        nested._id,
        nested.reply_id,
        nested.replyId
      )
      const text = readText(
        nested.text,
        nested.message,
        nested.content,
        nested.body,
        nested.text_preview,
        nested.textPreview,
        nested.preview
      )
      const sender = readSender(
        nested.sender,
        nested.sender_name,
        nested.senderName,
        nested.sender_username,
        nested.user,
        nested.username,
        nested.name
      )
      if (id || text || sender) {
        return { id, sender, text }
      }
    }
  }

  // 2) Champs aplatis / alternatifs
  const id = readId(
    item.reply_doc_id,
    item.replyDocId,
    item.reply_id,
    item.replyId,
    item.reply_to_id,
    item.replyToId,
    item.parent_id,
    item.parentId,
    item.quoted_message_id,
    item.quotedMessageId,
    item.referenced_message_id,
    item.referencedMessageId
  )
  const text = readText(
    item.reply_text,
    item.replyText,
    item.reply_message,
    item.replyMessage,
    item.reply_content,
    item.replyContent,
    item.parent_text,
    item.parentText,
    item.quoted_text,
    item.quotedText,
    item.referenced_text,
    item.referencedText
  )
  const sender = readSender(
    item.reply_sender,
    item.replySender,
    item.reply_sender_name,
    item.replySenderName,
    item.reply_user,
    item.replyUser,
    item.reply_username,
    item.replyUsername,
    item.parent_sender,
    item.parentSender
  )

  if (id || text || sender) {
    return { id, sender, text }
  }

  return null
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
    // Accusé de lecture du dernier message : on ne le calcule que si ce dernier
    // message a été ENVOYÉ par moi (sinon, rien à afficher côté émetteur).
    const lastSenderId = String(first(last?.from_id, last?.fromId, last?.sender_id, last?.senderId, ""))
    const lastMessageReceipt =
      lastSenderId === String(currentUserId) ? computeMessageReceipt(last, lastSenderId, String(currentUserId)) : null
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
      lastMessageReceipt,
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

// ── Accusé de lecture (« vu ») ──────────────────────────────────────────────
// L'API Dughu porte la lecture du destinataire dans le champ `seen` :
//  - `null` / absent / `0` → le message n'a pas encore été lu par le destinataire
//    (mais il a été délivré au serveur Dughu → « délivré »).
//  - une valeur numérique (timestamp unix) → le destinataire a ouvert → « lu ».
// Le statut `sent` (1 coche) est réservé à l'écho local optimiste, juste après
// l'envoi, avant que le serveur confirme la présence du message — il est donc
// composé côté client au moment de l'envoi (voir handleSend dans les pages), et
// remplacé par `delivered`/`read` dès le rechargement serveur.

/** @returns le timestamp de lecture (>0 = lu) ou `null` (non lu / absent). */
function readSeenTimestamp(item: any): number | null {
  const rawValue = first(item?.seen, item?.seen_at, item?.seenAt, item?.read_at, item?.readAt)
  if (rawValue === undefined || rawValue === null || rawValue === "") return null
  const num = Number(rawValue)
  return Number.isFinite(num) && num > 0 ? num : null
}

/**
 * Calcule le statut d'accusé de lecture d'un message **envoyé par moi**.
 * Ne s'applique qu'aux messages dont je suis l'expéditeur (sinon `undefined`,
 * car on ne montre pas de coches sur les messages reçus).
 *
 * - `seen > 0`   → `"read"`      (le destinataire a ouvert le message)
 * - `seen === 0` → `"delivered"` (déjà présent dans l'historique serveur du
 *   destinataire, donc délivré à l'autre bout mais pas encore lu).
 */
export function computeMessageReceipt(
  item: any,
  senderId: string | undefined,
  currentUserId: string
): MessageReceipt | undefined {
  const seen = readSeenTimestamp(item)
  if (seen) return "read"
  return senderId === currentUserId ? "delivered" : undefined
}

/**
 * Convertit un timestamp de vue (epoch seconds, comme renvoyé par Dughu) en une
 * chaîne ISO exploitable par `formatMessageDate` / `new Date(...)`.
 * Renvoie `null` si le message n'a pas été vu.
 */
export function seenTimestampToIso(seen: string | number | null | undefined): string | null {
  if (!seen) return null
  const num = Number(seen)
  if (!Number.isFinite(num)) return null
  // Dughu envoie un timestamp en secondes Unix.
  const ms = num < 1e12 ? num * 1000 : num
  const d = new Date(ms)
  return Number.isFinite(d.getTime()) ? d.toISOString() : null
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
      /** Timestamp de lecture (`seen`) Dughu, normalisé en ISO (null si jamais lu). */
      seenAt: seenTimestampToIso(first(item.seen, item.seen_at, item.seenAt)),
      receipt: computeMessageReceipt(item, senderId, String(currentUserId)),
      reply: normalizeReply(item),
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
