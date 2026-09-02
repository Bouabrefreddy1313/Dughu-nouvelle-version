import type { UserGroup, UserGroupsResponse } from "@/types/groups/user-groups.types"

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

function normalizeUserGroup(value: unknown): UserGroup | null {
  const group = record(value)
  const id = text(group.id || group.group_id)
  if (!id || text(group.active || "1") !== "1" || !boolean(group.is_member)) return null

  return {
    id,
    ownerId: text(group.user_id),
    slug: text(group.group_name),
    name: text(group.group_title || group.group_name) || "Groupe",
    avatar: absoluteUrl(group.avatar),
    cover: absoluteUrl(group.cover),
    description: text(group.about),
    categoryId: text(group.category),
    category: text(group.category_name) || "Autre",
    membersCount: number(group.members_count),
    privacy: text(group.privacy) === "2" ? "private" : "public",
    joinPrivacy: text(group.join_privacy),
    isMember: true,
  }
}

export function normalizeUserGroups(raw: unknown): UserGroupsResponse {
  const root = record(raw)
  const result = record(root.result)
  const rawGroups = Array.isArray(result.data) ? result.data : []
  const currentPage = Math.max(1, number(result.current_page) || 1)
  const lastPage = Math.max(currentPage, number(result.last_page) || currentPage)

  return {
    success: root.success !== false,
    message: text(root.message) || undefined,
    groups: rawGroups
      .map(normalizeUserGroup)
      .filter((group): group is UserGroup => group !== null),
    pagination: {
      currentPage,
      perPage: number(result.per_page) || rawGroups.length,
      total: number(result.total),
      lastPage,
      hasMore: Boolean(result.next_page_url) || currentPage < lastPage,
    },
  }
}