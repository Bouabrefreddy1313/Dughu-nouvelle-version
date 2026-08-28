import type { RelationType } from "@/lib/profile-relations"

export interface IncomingRelationRequest {
  id: string
  userId: string
  name: string
  username: string | null
  avatar: string | null
  type: RelationType
  createdAt: string | null
}

type UnknownRecord = Record<string, unknown>

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {}
}

function text(...values: unknown[]): string {
  const value = values.find((candidate) =>
    (typeof candidate === "string" || typeof candidate === "number") && String(candidate).trim()
  )
  return value === undefined ? "" : String(value).trim()
}

function responseSource(payload: unknown): UnknownRecord {
  const root = record(payload)
  return record(root.result ?? root.data ?? root)
}

function incomingItems(payload: unknown): unknown[] {
  const incoming = responseSource(payload).incoming
  return Array.isArray(incoming) ? incoming : []
}

function normalizeItem(item: unknown, fallbackType: RelationType): IncomingRelationRequest | null {
  const source = record(item)
  const relation = record(source.relation)
  const user = record(source.user ?? source.sender ?? source.profile)
  const rawType = text(relation.type, source.type)
  const type: RelationType = rawType === "friend" || rawType === "network" ? rawType : fallbackType
  const userId = text(
    user.user_id,
    user.id,
    source.user_id,
    source.sender_id,
    source.follower_id,
    relation.follower_id,
    relation.sender_id,
    relation.user_id
  )

  if (!userId) return null

  const firstName = text(user.first_name, user.firstname, user.firstName)
  const lastName = text(user.last_name, user.lastname, user.lastName)
  const username = text(user.username, user.slug)
  const name = text(user.name, [firstName, lastName].filter(Boolean).join(" "), username, "Utilisateur Dughu")

  return {
    id: text(relation.id, source.id, `${type}-${userId}`),
    userId,
    name,
    username: username || null,
    avatar: text(user.avatar, user.image, user.profile_photo, user.photo, user.picture) || null,
    type,
    createdAt: text(relation.created_at, relation.createdAt, source.created_at, source.createdAt) || null,
  }
}

export function normalizeIncomingRelationRequests(
  payload: unknown,
  fallbackType: RelationType
): IncomingRelationRequest[] {
  const unique = new Map<string, IncomingRelationRequest>()

  for (const item of incomingItems(payload)) {
    const request = normalizeItem(item, fallbackType)
    if (request) unique.set(`${request.type}:${request.userId}`, request)
  }

  return [...unique.values()]
}

