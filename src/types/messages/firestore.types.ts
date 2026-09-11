import type { Timestamp } from "firebase/firestore"

export interface FirestoreUserSummary {
  id: string
  name?: string
  username?: string
  photo_url?: string
}

export interface FirestoreConversationDoc {
  id?: string
  participants: string[]
  users: FirestoreUserSummary[]
  lastMessage?: string
  lastMessageTimestamp?: Timestamp | null
  created_at?: Timestamp | null
  updated_at?: Timestamp | null
  unread?: Record<string, number>
  typing?: Record<string, boolean>
  opened?: Record<string, boolean>
  important?: Record<string, boolean>
  deletedFor?: string[]
  deletedAt?: Record<string, Timestamp>
  folder?: string
}

export interface FirestoreMessageDoc {
  id?: string
  from_id: string
  to_id: string
  sender_name?: string
  text?: string
  avatar?: string
  timestamp?: Timestamp | null
  seen?: boolean | number
  seen_at?: Timestamp | null
  media?: string
  mediafile?: string
  mime_type?: string
  file_name?: string
  file_size?: number | null
  delete?: Record<string, boolean>
  deletedFor?: string[]
  reply_doc_id?: string | null
  reply_sender?: string | null
  reply_text?: string | null
}
