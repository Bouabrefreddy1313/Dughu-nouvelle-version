/**
 * Mappeur du domaine Canal — normalisation défensive des réponses brutes de
 * l'API Dughu vers les modèles métier (src/types/canal/canal.types.ts).
 *
 * ⚠️ Seuls les champs affichables sont conservés : tokens et réglages privés
 * présents dans les objets `user` imbriqués ne sortent jamais du serveur.
 *
 * Pattern identique à pages.mapper.ts.
 */

import type {
  Canal,
  CanalsListResponse,
  CanalCategory,
  CanalDocument,
  CanalMedia,
  CanalMember,
  CanalMessage,
  CanalNotification,
  CanalPoll,
  CanalPollOption,
  CanalReaction,
} from "@/types/canal/canal.types"

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ─────────────────────────────── Primitives ────────────────────────────── */

function bool(value: any, defaultValue = false): boolean {
  return value === true || value === 1 || value === "1" || value === "true"
    ? true
    : value === undefined
    ? defaultValue
    : false
}

function num(value: any): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function str(value: any, fallback = ""): string {
  return value === undefined || value === null ? fallback : String(value)
}

function toIso(value: any): string {
  if (typeof value !== "string" || !value) return ""
  const iso = value.includes("T") ? value : value.replace(" ", "T")
  const date = new Date(iso.endsWith("Z") ? iso : `${iso}Z`)
  if (!Number.isNaN(date.getTime())) return date.toISOString()
  const fallback = new Date(value)
  return Number.isNaN(fallback.getTime()) ? "" : fallback.toISOString()
}

function pick(source: any, keys: string[]): any {
  for (const key of keys) {
    const value = source?.[key]
    if (value !== undefined && value !== null && value !== "") return value
  }
  return undefined
}

function normalizeCanalMediaUrl(url?: string | null): string {
  if (!url) return ""
  let clean = String(url).trim()
  if (clean.includes("apitest.dughu.com/storage/")) {
    clean = clean.replace(/https?:\/\/apitest\.dughu\.com\/storage\//g, "https://dughuprod.s3.amazonaws.com/storage/")
  }
  return clean
}

/* ─────────────────────────────── Canal ─────────────────────────────────── */

export function mapCanal(raw: any): Canal {
  if (!raw || typeof raw !== "object") {
    return {
      id: "",
      name: "",
      description: "",
      logo: "/images/avatar.png",
      cover: "/images/cover.jpg",
      type: "public",
      isActive: true,
      categoryId: "",
      categoryName: "",
      memberCount: 0,
      isAdmin: false,
      isJoined: false,
      isFavorite: false,
      createdAt: "",
      userId: "",
    }
  }

  // 1. Déballage de canal imbriqué (fréquent dans les réponses de /getJoinedCanals où chaque ligne est { id, user_id, canal: { ... } })
  const nestedCanal =
    raw?.canal && typeof raw.canal === "object" && !Array.isArray(raw.canal)
      ? raw.canal
      : raw?.channel && typeof raw.channel === "object" && !Array.isArray(raw.channel)
      ? raw.channel
      : raw?.canal_info && typeof raw.canal_info === "object" && !Array.isArray(raw.canal_info)
      ? raw.canal_info
      : raw?.canal_details && typeof raw.canal_details === "object" && !Array.isArray(raw.canal_details)
      ? raw.canal_details
      : raw?.details && typeof raw.details === "object" && !Array.isArray(raw.details) && (raw.details.name || raw.details.id)
      ? raw.details
      : raw?.result && typeof raw.result === "object" && !Array.isArray(raw.result) && (raw.result.name || raw.result.id)
      ? raw.result
      : null

  const primary = nestedCanal || raw
  const secondary = nestedCanal ? raw : null

  // 2. Identifiant du canal (en priorité le canal_id ou l'id du canal imbriqué, pas l'id de la ligne d'adhésion)
  const canalId = nestedCanal
    ? str(pick(nestedCanal, ["id", "canal_id", "canalId"])) || str(pick(secondary, ["canal_id", "canalId", "id"]))
    : str(pick(primary, ["canal_id", "canalId", "id"]))

  // 3. Nom
  const name =
    str(pick(primary, ["name", "canal_name", "title", "channel_name"])) ||
    (secondary ? str(pick(secondary, ["name", "canal_name", "title", "channel_name"])) : "")

  // 4. Description
  const description =
    str(pick(primary, ["description", "about", "bio", "desc"])) ||
    (secondary ? str(pick(secondary, ["description", "about", "bio", "desc"])) : "")

  // 5. Médias : Logo (avatar) et Couverture
  const rawLogo =
    pick(primary, ["logo_url", "logo", "avatar", "photo", "image", "canal_logo"]) ||
    (secondary ? pick(secondary, ["logo_url", "logo", "avatar", "photo", "image", "canal_logo"]) : undefined)

  const rawCover =
    pick(primary, ["cover_url", "cover", "cover_image", "banner", "canal_cover"]) ||
    (secondary ? pick(secondary, ["cover_url", "cover", "cover_image", "banner", "canal_cover"]) : undefined)

  // 6. Nombre de membres
  const rawMemberCount =
    pick(primary, ["user_count", "member_count", "memberCount", "members_count", "membersCount", "adherents_count", "users_count"]) ??
    (secondary ? pick(secondary, ["user_count", "member_count", "memberCount", "members_count", "membersCount", "adherents_count", "users_count"]) : undefined)

  // 7. Auteur / Créateur du canal (autor_id / author_id / owner_id / creator_id)
  // ⚠️ TRÈS IMPORTANT : Dans un enregistrement d'adhésion, `raw.user_id` correspond à l'utilisateur qui a REJOINT,
  // pas au créateur du canal ! On cherche donc d'abord l'auteur dans `primary` (le canal).
  const canalAuthorId =
    pick(primary, ["autor_id", "author_id", "owner_id", "creator_id", "created_by"]) ||
    (nestedCanal ? undefined : pick(primary, ["user_id", "userId"])) ||
    (secondary ? pick(secondary, ["autor_id", "author_id", "owner_id", "creator_id"]) : undefined)

  const rawType = pick(primary, ["type", "canal_type", "privacy"]) || (secondary ? pick(secondary, ["type", "canal_type", "privacy"]) : undefined)

  const rawCatId = pick(primary, ["category_id", "categoryId", "categorie"]) || (secondary ? pick(secondary, ["category_id", "categoryId", "categorie"]) : undefined)

  const rawCatName =
    primary?.category?.name ||
    primary?.category_name ||
    primary?.categoryName ||
    (secondary ? secondary?.category?.name || secondary?.category_name || secondary?.categoryName : undefined)

  const inviteCode =
    primary?.invite_code ||
    (secondary ? secondary?.invite_code : undefined) ||
    primary?.invite_link ||
    (secondary ? secondary?.invite_link : undefined)

  const rawInviteLink = primary?.invite_link || (secondary ? secondary?.invite_link : undefined)

  const isJoined = nestedCanal
    ? true
    : bool(pick(primary, ["isRejoind", "is_joined", "isJoined", "joined"])) ||
      (secondary ? bool(pick(secondary, ["isRejoind", "is_joined", "isJoined", "joined"])) : false)

  return {
    id: canalId,
    name,
    description,
    logo: normalizeCanalMediaUrl(rawLogo ? str(rawLogo) : "") || "/images/avatar.png",
    cover: normalizeCanalMediaUrl(rawCover ? str(rawCover) : "") || "/images/cover.jpg",
    type: rawType === "public" ? "public" : "private",
    isActive: bool(primary?.is_active ?? primary?.isActive ?? secondary?.is_active ?? secondary?.isActive, true),
    categoryId: str(rawCatId),
    categoryName: str(rawCatName),
    memberCount: num(rawMemberCount),
    isAdmin: bool(primary?.is_admin ?? primary?.isAdmin ?? secondary?.is_admin ?? secondary?.isAdmin),
    isJoined,
    isFavorite: bool(primary?.isFavorite ?? primary?.is_favorite ?? primary?.favorite ?? secondary?.isFavorite ?? secondary?.is_favorite),
    inviteCode: inviteCode
      ? (str(inviteCode).includes("/p/")
          ? str(inviteCode).split("/p/").pop()?.split(/[?#]/)[0]
          : str(inviteCode))
      : undefined,
    inviteLink: rawInviteLink ? str(rawInviteLink) : undefined,
    publicToken: primary?.public_token || primary?.unique_identifier || secondary?.public_token || secondary?.unique_identifier
      ? str(primary?.public_token || primary?.unique_identifier || secondary?.public_token || secondary?.unique_identifier)
      : undefined,
    createdAt: toIso(primary?.created_at ?? primary?.createdAt ?? secondary?.created_at ?? secondary?.createdAt),
    userId: str(canalAuthorId),
  }
}

/** Normalise une liste de canaux avec meta de pagination. */
export function mapCanalList(raw: any, page = 1): CanalsListResponse {
  const container = raw?.result ?? raw
  const items: any[] = Array.isArray(container?.data)
    ? container.data
    : Array.isArray(raw?.canals)
    ? raw.canals
    : Array.isArray(container?.canals)
    ? container.canals
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(container)
    ? container
    : Array.isArray(raw)
    ? raw
    : []

  const hasMore =
    bool(container?.has_more ?? container?.hasMore ?? raw?.has_more ?? raw?.hasMore) ||
    (typeof container?.next_page_url === "string" && !!container.next_page_url) ||
    (typeof raw?.next_page_url === "string" && !!raw.next_page_url)

  return {
    success: bool(raw?.success, true),
    message: raw?.message ? str(raw.message) : undefined,
    canals: items.map(mapCanal),
    hasMore,
    page,
  }
}

/* ─────────────────────────────── Catégories ────────────────────────────── */

/** Normalise une catégorie de canal. */
export function mapCanalCategory(raw: any): CanalCategory {
  return {
    id: str(pick(raw, ["id", "category_id"])),
    name: str(raw?.name || raw?.category_name),
    langKey: raw?.lang_key ? str(raw.lang_key) : undefined,
  }
}

export function mapCanalCategories(raw: any): CanalCategory[] {
  const container = raw?.result ?? raw
  const items: any[] = Array.isArray(container)
    ? container
    : Array.isArray(container?.data)
    ? container.data
    : Array.isArray(raw?.categories)
    ? raw.categories
    : Array.isArray(container?.categories)
    ? container.categories
    : Array.isArray(raw?.data)
    ? raw.data
    : []
  return items.map(mapCanalCategory)
}

/* ─────────────────────────────── Membres ───────────────────────────────── */

/** Normalise un membre d'un canal. */
export function mapCanalMember(raw: any): CanalMember {
  const name =
    raw?.name ||
    raw?.full_name ||
    (raw?.first_name ? `${raw.first_name} ${raw.last_name || ""}`.trim() : "") ||
    raw?.username ||
    "Membre"

  return {
    id: str(pick(raw, ["id", "member_id", "user_id"])),
    userId: str(pick(raw, ["user_id", "userId"])),
    canalId: str(pick(raw, ["canal_id", "canalId"])),
    name: str(name),
    username: str(raw?.username),
    avatar: normalizeCanalMediaUrl(str(raw?.avatar)) || "/images/avatar.png",
    isAdmin: bool(raw?.is_admin ?? raw?.isAdmin),
    joinedAt: toIso(raw?.subscribed_at ?? raw?.joined_at ?? raw?.createdAt ?? raw?.created_at),
  }
}

export function mapCanalMembers(raw: any): CanalMember[] {
  const container = raw?.result ?? raw
  const items: any[] = Array.isArray(container?.data)
    ? container.data
    : Array.isArray(container)
    ? container
    : Array.isArray(raw?.members)
    ? raw.members
    : Array.isArray(raw?.adherents)
    ? raw.adherents
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw)
    ? raw
    : []
  return items.map(mapCanalMember)
}

/* ─────────────────────────────── Messages ──────────────────────────────── */

/** Normalise une réaction sur un message. */
export function mapCanalReaction(raw: any): CanalReaction {
  return {
    reaction: str(raw?.reaction || raw?.emoji),
    count: num(raw?.count ?? raw?.total),
    isOwn: bool(raw?.is_own ?? raw?.isOwn),
  }
}

/** Normalise un message de canal. */
export function mapCanalMessage(raw: any, currentUserId?: string): CanalMessage {
  const reactions: any[] = Array.isArray(raw?.reactions) ? raw.reactions : []
  const authorId = str(pick(raw, ["user_id", "userId", "sender_id"]))
  return {
    id: str(pick(raw, ["id", "message_id"])),
    canalId: str(pick(raw, ["canal_id", "canalId"])),
    userId: authorId,
    authorName: str(raw?.user_name ?? raw?.author_name ?? raw?.name),
    authorAvatar: normalizeCanalMediaUrl(str(raw?.user_avatar ?? raw?.author_avatar ?? raw?.avatar)) || "/images/avatar.png",
    text: str(raw?.text ?? raw?.content ?? raw?.message),
    mediaUrl: raw?.media ? normalizeCanalMediaUrl(str(raw.media)) : undefined,
    mediaType: raw?.media_type ? str(raw.media_type) : undefined,
    reactions: reactions.map(mapCanalReaction),
    createdAt: toIso(raw?.created_at ?? raw?.createdAt),
    updatedAt: raw?.updated_at ? toIso(raw.updated_at) : undefined,
    isOwn: currentUserId ? authorId === currentUserId : bool(raw?.is_own),
  }
}

export function mapCanalMessages(raw: any, page = 1, currentUserId?: string) {
  const container = raw?.result ?? raw
  const items: any[] = Array.isArray(container?.data)
    ? container.data
    : Array.isArray(container)
    ? container
    : Array.isArray(raw?.messages)
    ? raw.messages
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw)
    ? raw
    : []
  const hasMore =
    bool(container?.has_more ?? container?.hasMore ?? raw?.has_more ?? raw?.hasMore) ||
    (typeof container?.next_page_url === "string" && !!container.next_page_url) ||
    (typeof raw?.next_page_url === "string" && !!raw.next_page_url)
  return {
    success: bool(raw?.success, true),
    messages: items.map((m) => mapCanalMessage(m, currentUserId)),
    hasMore,
    page,
  }
}

/* ─────────────────────────────── Sondages ──────────────────────────────── */

/** Normalise une option de sondage. */
export function mapCanalPollOption(raw: any): CanalPollOption {
  return {
    id: str(pick(raw, ["id", "option_id"])),
    pollId: str(pick(raw, ["poll_id", "pollId"])),
    text: str(raw?.text ?? raw?.option),
    voteCount: num(raw?.vote_count ?? raw?.votes ?? raw?.count),
    isVoted: bool(raw?.is_voted ?? raw?.isVoted ?? raw?.voted),
  }
}

/** Normalise un sondage. */
export function mapCanalPoll(raw: any): CanalPoll {
  const options: any[] = Array.isArray(raw?.options) ? raw.options : []
  return {
    id: str(pick(raw, ["id", "poll_id"])),
    canalId: str(pick(raw, ["canal_id", "canalId"])),
    userId: str(pick(raw, ["user_id", "userId"])),
    question: str(raw?.question),
    options: options.map(mapCanalPollOption),
    allowMultiple: bool(raw?.allow_multiple ?? raw?.allowMultiple),
    closesAt: raw?.closes_at ? toIso(raw.closes_at) : undefined,
    isClosed: bool(raw?.is_closed ?? raw?.isClosed),
    createdAt: toIso(raw?.created_at ?? raw?.createdAt),
  }
}

/* ─────────────────────────────── Médias & Docs ─────────────────────────── */

/** Normalise un média de canal. */
export function mapCanalMedia(raw: any): CanalMedia {
  return {
    id: str(pick(raw, ["id", "media_id"])),
    canalId: str(pick(raw, ["canal_id", "canalId"])),
    url: str(raw?.url ?? raw?.media_url ?? raw?.file_url),
    type: str(raw?.type ?? raw?.media_type ?? "image"),
    createdAt: toIso(raw?.created_at ?? raw?.createdAt),
  }
}

export function mapCanalMediaList(raw: any): CanalMedia[] {
  const container = raw?.result ?? raw
  const items: any[] = Array.isArray(container?.data)
    ? container.data
    : Array.isArray(container?.media)
    ? container.media
    : Array.isArray(container?.medias)
    ? container.medias
    : Array.isArray(raw?.media)
    ? raw.media
    : Array.isArray(raw?.medias)
    ? raw.medias
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(container)
    ? container
    : Array.isArray(raw)
    ? raw
    : []
  return items.map(mapCanalMedia)
}

/** Normalise un document de canal. */
export function mapCanalDocument(raw: any): CanalDocument {
  return {
    id: str(pick(raw, ["id", "doc_id", "document_id"])),
    canalId: str(pick(raw, ["canal_id", "canalId"])),
    name: str(raw?.name ?? raw?.file_name ?? raw?.document_name ?? "Fichier"),
    url: str(raw?.url ?? raw?.file_url),
    size: raw?.size !== undefined ? num(raw.size) : undefined,
    createdAt: toIso(raw?.created_at ?? raw?.createdAt),
  }
}

export function mapCanalDocumentList(raw: any): CanalDocument[] {
  const container = raw?.result ?? raw
  const items: any[] = Array.isArray(container?.data)
    ? container.data
    : Array.isArray(container?.documents)
    ? container.documents
    : Array.isArray(raw?.documents)
    ? raw.documents
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(container)
    ? container
    : Array.isArray(raw)
    ? raw
    : []
  return items.map(mapCanalDocument)
}

/* ─────────────────────────────── Notifications ─────────────────────────── */

/** Normalise une notification de canal. */
export function mapCanalNotification(raw: any): CanalNotification {
  const senderName = str(
    raw?.notifier?.username ??
      raw?.notifier?.name ??
      raw?.notifier?.fullName ??
      raw?.sender_name ??
      raw?.user_name ??
      raw?.user?.name ??
      raw?.name ??
      raw?.fullName ??
      ""
  )
  const rawAvatar = str(
    raw?.notifier?.avatar ??
      raw?.sender_avatar ??
      raw?.user_avatar ??
      raw?.user?.avatar ??
      raw?.avatar ??
      raw?.photo ??
      ""
  )
  const senderAvatar = rawAvatar ? normalizeCanalMediaUrl(rawAvatar) : undefined
  const notifId = str(pick(raw, ["id", "notification_id", "request_id", "requestId"]))

  const targetUserId = str(
    raw?.notifier?.user_id ??
      raw?.notifier?.id ??
      raw?.notifier_id ??
      raw?.notifierId ??
      raw?.sender_id ??
      raw?.senderId ??
      raw?.applicant_id ??
      raw?.applicantId ??
      raw?.user?.id ??
      raw?.user?.user_id ??
      raw?.member_id ??
      raw?.memberId ??
      raw?.user_id ??
      raw?.userId ??
      ""
  )

  const rawStatus =
    raw?.statut_canal_join_request ??
    raw?.status_canal_join_request ??
    raw?.status ??
    raw?.statut ??
    raw?.state ??
    raw?.status_text

  return {
    id: notifId,
    userId: str(pick(raw, ["recipient_id", "user_id", "userId"]) || raw?.notifier?.user_id),
    canalId: str(pick(raw, ["canal_id", "canalId"])),
    type: str(raw?.type ?? raw?.notification_type ?? "canal_join_request"),
    content: str(raw?.text ?? raw?.content ?? raw?.message ?? raw?.body),
    status: rawStatus !== undefined && rawStatus !== null ? str(rawStatus) : null,
    createdAt: toIso(raw?.created_at ?? raw?.createdAt),
    senderName: senderName || undefined,
    senderAvatar: senderAvatar || undefined,
    requestId: notifId || undefined,
    targetUserId: targetUserId || undefined,
  }
}

export function mapCanalNotifications(raw: any, page = 1) {
  const container =
    raw?.receivedNotifications ??
    raw?.processedNotifications ??
    raw?.result?.receivedNotifications ??
    raw?.result?.processedNotifications ??
    raw?.result ??
    raw

  const items: any[] = Array.isArray(container?.data)
    ? container.data
    : Array.isArray(container)
    ? container
    : Array.isArray(raw?.notifications)
    ? raw.notifications
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.receivedNotifications)
    ? raw.receivedNotifications
    : Array.isArray(raw?.processedNotifications)
    ? raw.processedNotifications
    : []

  const hasMore =
    (typeof container?.current_page === "number" &&
      typeof container?.last_page === "number" &&
      container.current_page < container.last_page) ||
    bool(container?.has_more ?? container?.hasMore ?? raw?.has_more ?? raw?.hasMore) ||
    (typeof container?.next_page_url === "string" && !!container.next_page_url) ||
    (typeof raw?.next_page_url === "string" && !!raw.next_page_url)

  return {
    success: bool(raw?.success, true),
    notifications: items.map(mapCanalNotification),
    hasMore,
    page: Number(container?.current_page ?? page),
  }
}
