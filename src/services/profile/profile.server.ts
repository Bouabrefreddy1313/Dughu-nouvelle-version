import { ApiError } from "@/lib/api/api-error"
import { dughuServerGet, dughuServerJson } from "@/lib/api/server/dughu-instance"
import type {
  ConfirmFollowers,
  FollowPrivacy,
  PostPrivacy,
  PrivacyAudience,
  PrivacySettings,
} from "@/types/profile/profile.types"

type UnknownRecord = Record<string, unknown>

const FOLLOW_VALUES = new Set<FollowPrivacy>(["0", "1"])
const AUDIENCE_VALUES = new Set<PrivacyAudience>(["0", "1", "2"])
const POST_VALUES = new Set<PostPrivacy>(["everyone", "ifollow", "nobody"])
const CONFIRM_VALUES = new Set<ConfirmFollowers>(["0", "1"])

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {}
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : ""
}

export function parsePrivacySettings(value: unknown): PrivacySettings | null {
  const source = record(value)
  const followPrivacy = stringValue(source.follow_privacy) as FollowPrivacy
  const messagePrivacy = stringValue(source.message_privacy) as PrivacyAudience
  const friendPrivacy = stringValue(source.friend_privacy) as PrivacyAudience
  const postPrivacy = stringValue(source.post_privacy) as PostPrivacy
  const birthPrivacy = stringValue(source.birth_privacy) as PrivacyAudience
  const confirmFollowers = stringValue(source.confirm_followers) as ConfirmFollowers

  if (
    !FOLLOW_VALUES.has(followPrivacy) ||
    !AUDIENCE_VALUES.has(messagePrivacy) ||
    !AUDIENCE_VALUES.has(friendPrivacy) ||
    !POST_VALUES.has(postPrivacy) ||
    !AUDIENCE_VALUES.has(birthPrivacy) ||
    !CONFIRM_VALUES.has(confirmFollowers)
  ) return null

  return { followPrivacy, messagePrivacy, friendPrivacy, postPrivacy, birthPrivacy, confirmFollowers }
}

export function isPrivacySettings(value: unknown): value is PrivacySettings {
  const source = record(value)
  return (
    FOLLOW_VALUES.has(source.followPrivacy as FollowPrivacy) &&
    AUDIENCE_VALUES.has(source.messagePrivacy as PrivacyAudience) &&
    AUDIENCE_VALUES.has(source.friendPrivacy as PrivacyAudience) &&
    POST_VALUES.has(source.postPrivacy as PostPrivacy) &&
    AUDIENCE_VALUES.has(source.birthPrivacy as PrivacyAudience) &&
    CONFIRM_VALUES.has(source.confirmFollowers as ConfirmFollowers)
  )
}

export async function getPrivacySettings(userId: string): Promise<PrivacySettings> {
  const raw = await dughuServerGet<unknown>(
    `/getSpecificUser/${encodeURIComponent(userId)}/${encodeURIComponent(userId)}`,
    undefined,
    { retry: true }
  )
  const root = record(raw)
  const settings = parsePrivacySettings(root.result)
  if (!settings) throw new ApiError("Réponse de confidentialité invalide", { status: 502 })
  return settings
}

export async function savePrivacySettings(userId: string, settings: PrivacySettings): Promise<PrivacySettings> {
  const raw = await dughuServerJson<unknown>("/updatePrivacySettings", {
    user_id: Number(userId),
    follow_privacy: settings.followPrivacy,
    message_privacy: settings.messagePrivacy,
    friend_privacy: settings.friendPrivacy,
    post_privacy: settings.postPrivacy,
    birth_privacy: settings.birthPrivacy,
    confirm_followers: settings.confirmFollowers,
  })
  const root = record(raw)
  if (root.status !== "success") {
    throw new ApiError("Mise à jour de la confidentialité refusée", { status: 422 })
  }
  const saved = parsePrivacySettings(root.data)
  if (!saved) throw new ApiError("Réponse de confidentialité invalide", { status: 502 })
  return saved
}
