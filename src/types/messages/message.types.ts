/**
 * Types du domaine Messagerie — modèle métier utilisé par l'interface.
 *
 * Déplacés depuis src/lib/messages.ts (lot 8) : les normaliseurs/mappers
 * restent dans lib/messages.ts, seules les définitions de types vivent ici.
 */

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
  /** Le dernier message du fil a été envoyé par l'utilisateur courant. */
  lastMessageIsMine?: boolean
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

// ─── Réponses des routes internes /api/messages/* ───

export interface ChatsResponse {
  success?: boolean
  message?: string
  chats?: ChatSummary[]
}

export interface ContactsResponse {
  contacts?: ChatContact[]
}

export interface ContactResponse {
  contact?: ChatContact
}

export interface ConversationResponse {
  success?: boolean
  message?: string
  messages?: ChatMessage[]
}

export interface SendResponse {
  success?: boolean
  message?: string
  sentMessage?: ChatMessage | null
}

export interface MessageActionResponse {
  success?: boolean
  message?: string
}
