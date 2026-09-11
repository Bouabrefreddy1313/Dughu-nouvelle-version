/**
 * Service SERVEUR du domaine Canal — utilisé UNIQUEMENT par les Route Handlers
 * /api/canal. Il appelle l'API Dughu avec l'instance Axios serveur (token
 * X-AppApiToken côté serveur uniquement), normalise les réponses via le
 * mappeur et ne retourne que des modèles métier.
 *
 * ⚠️ NE JAMAIS importer ce module dans un composant client ou un hook.
 *
 * Correspondance endpoints backend Dughu → fonctions :
 *  POST /handlePrivateCanal        → accessPrivateCanal
 *  POST /toggleFavorite            → toggleFavoriteCanal
 *  POST /listFavorites             → listFavoriteCanals
 *  POST /getAllCanals               → getAllCanals
 *  GET  /handlePublicCanal/:token  → accessPublicCanal
 *  GET  /getPossibleCategories     → getPossibleCategories
 *  GET  /getCanalsByCategory/:id   → getCanalsByCategory
 *  GET  /getMyCanals/:user_id      → getMyCanals
 *  GET  /getSuggestCanals          → getSuggestCanals
 *  GET  /getJoinedCanals/:user_id  → getJoinedCanals
 *  POST /showCanalMessages         → showCanalMessages
 *  POST /sendCanalMessage/:id      → sendCanalMessage
 *  POST /updateCanalMessage/:id    → updateCanalMessage
 *  POST /reactCanalMessage/:c/:m   → reactCanalMessage
 *  DELETE /deleteCanalMessage/:id  → deleteCanalMessage
 *  POST /joinCanal                 → joinCanal
 *  GET  /canal/:id                 → getCanalDetail
 *  POST /canal                     → createOrUpdateCanal
 *  POST /delete/canal/:id          → deleteCanal
 *  GET  /adherents/:id             → getAdherents
 *  POST /handleJoinRequest/:id     → handleJoinRequest
 *  POST /requestJoinCanal          → requestJoinCanal
 *  POST /updateStatus              → updateCanalStatus
 *  POST /canals/:id/polls          → createPoll
 *  POST /canals/polls/vote         → votePoll
 *  GET  /getMedia/:id              → getCanalMedia
 *  GET  /getDocuments/:id          → getCanalDocuments
 *  GET  /receivedNotifications     → getReceivedNotifications
 *  DELETE /delecteNotifications/:id→ deleteNotification  (typo backend conservée)
 *  GET  /processedNotifications    → getProcessedNotifications
 *  POST /leaveCanal                → leaveCanal
 *  POST /canal/report              → reportCanal
 */

import { dughuServerForm, dughuServerGet, dughuServerMultipart } from "@/lib/api/server/dughu-instance"
import { ApiError } from "@/lib/api/api-error"
import {
  mapCanal,
  mapCanalCategories,
  mapCanalDocumentList,
  mapCanalList,
  mapCanalMediaList,
  mapCanalMembers,
  mapCanalMessages,
  mapCanalNotification,
  mapCanalNotifications,
} from "./canal.mapper"
import type {
  Canal,
  CanalCategory,
  CanalDocument,
  CanalMedia,
  CanalMember,
  CanalMessagesResponse,
  CanalMutationResponse,
  CanalNotificationsResponse,
  CanalPollPayload,
  CanalReportPayload,
  CanalVotePayload,
  CanalsListResponse,
} from "@/types/canal/canal.types"

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ─────────────────────────────── Wrappers internes ─────────────────────── */

async function requestGet<T = unknown>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  try {
    return await dughuServerGet<T>(path, params, { retry: true })
  } catch (error) {
    throw new ApiError("Impossible de contacter l'API Dughu.", { cause: error, status: 500 })
  }
}

async function requestForm<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined>
): Promise<T> {
  try {
    return await dughuServerForm<T>(path, params)
  } catch (error) {
    if (error instanceof ApiError && error.status !== undefined && error.status >= 400 && error.status < 500) {
      throw error
    }
    throw new ApiError("Impossible de contacter l'API Dughu.", { cause: error, status: 500 })
  }
}

async function requestMultipart<T = unknown>(path: string, formData: FormData): Promise<T> {
  try {
    return await dughuServerMultipart<T>(path, formData)
  } catch (error) {
    if (error instanceof ApiError && error.status !== undefined && error.status >= 400 && error.status < 500) {
      throw error
    }
    throw new ApiError("Impossible de contacter l'API Dughu.", { cause: error, status: 500 })
  }
}

/* ─────────────────────────────── Accès canal ───────────────────────────── */

/** POST /handlePrivateCanal — accéder à un canal privé via code d'invitation. */
export async function accessPrivateCanal(
  userId: string,
  inviteCode: string
): Promise<CanalMutationResponse> {
  const cleanCode = inviteCode.includes("/p/")
    ? inviteCode.split("/p/").pop()?.split(/[?#]/)[0] || inviteCode
    : inviteCode
  const raw = await requestForm<any>("/handlePrivateCanal", {
    user_id: userId,
    invite_code: cleanCode.trim(),
  })
  return { success: raw?.success ?? true, message: raw?.message, result: raw }
}

/** GET /handlePublicCanal/:token — ouvrir un canal public via code/slug/token. */
export async function accessPublicCanal(token: string): Promise<{ success: boolean; canal?: Canal; message?: string }> {
  const raw = await requestGet<any>(`/handlePublicCanal/${encodeURIComponent(token)}`)
  const canalRaw = raw?.result ?? raw?.canal ?? raw?.data ?? raw
  return {
    success: raw?.success ?? true,
    message: raw?.message,
    canal: canalRaw && typeof canalRaw === "object" && canalRaw.id ? mapCanal(canalRaw) : undefined,
  }
}

/* ─────────────────────────────── Liste / Découverte ────────────────────── */

/** POST /getAllCanals — liste globale des canaux avec recherche/filtre. */
export async function getAllCanals(
  userId: string,
  options: { research?: string; categoryId?: string; page?: number } = {}
): Promise<CanalsListResponse> {
  const page = Math.max(1, options.page ?? 1)
  const path = page > 1 ? `/getAllCanals?page=${page}` : "/getAllCanals"
  const raw = await requestForm<any>(path, {
    user_id: userId,
    research: options.research || "",
    category_id: options.categoryId || "",
    page,
  })
  return mapCanalList(raw, page)
}

/** GET /getPossibleCategories — catégories disponibles. */
export async function getPossibleCategories(): Promise<CanalCategory[]> {
  const raw = await requestGet<any>("/getPossibleCategories")
  return mapCanalCategories(raw)
}

/** GET /getCanalsByCategory/:id — canaux d'une catégorie paginés. */
export async function getCanalsByCategory(
  categoryId: string,
  userId: string,
  page = 1
): Promise<CanalsListResponse> {
  const raw = await requestGet<any>(`/getCanalsByCategory/${encodeURIComponent(categoryId)}`, {
    user_id: userId,
    page,
  })
  return mapCanalList(raw, page)
}

/** GET /getMyCanals/:user_id — canaux créés/possédés par l'utilisateur. */
export async function getMyCanals(
  userId: string,
  options: { page?: number; categoryId?: string; q?: string; sortBy?: string } = {}
): Promise<CanalsListResponse> {
  const page = Math.max(1, options.page ?? 1)
  const raw = await requestGet<any>(`/getMyCanals/${encodeURIComponent(userId)}`, {
    page,
    category_id: options.categoryId || undefined,
    category: options.categoryId || undefined,
    q: options.q || undefined,
    sort_by: options.sortBy || undefined,
  })
  return mapCanalList(raw, page)
}

/** GET /getSuggestCanals — suggestions de canaux. */
export async function getSuggestCanals(
  userId: string,
  options: { page?: number; categoryId?: string } = {}
): Promise<CanalsListResponse> {
  const page = Math.max(1, options.page ?? 1)
  const raw = await requestGet<any>("/getSuggestCanals", {
    user_id: userId,
    page,
    category_id: options.categoryId || undefined,
  })
  return mapCanalList(raw, page)
}

/** GET /getJoinedCanals/:user_id — canaux rejoints. */
export async function getJoinedCanals(
  userId: string,
  options: { page?: number; categoryId?: string } = {}
): Promise<CanalsListResponse> {
  const page = Math.max(1, options.page ?? 1)
  const raw = await requestGet<any>(`/getJoinedCanals/${encodeURIComponent(userId)}`, {
    page,
    category_id: options.categoryId || undefined,
  })
  return mapCanalList(raw, page)
}

/* ─────────────────────────────── Détail canal ──────────────────────────── */

/** GET /canal/:canal_id — détail complet d'un canal. */
export async function getCanalDetail(canalId: string): Promise<{ success: boolean; canal?: Canal; message?: string }> {
  const raw = await requestGet<any>(`/canal/${encodeURIComponent(canalId)}`)
  const canalRaw = raw?.result ?? raw?.canal ?? raw?.data ?? raw
  return {
    success: raw?.success ?? true,
    message: raw?.message,
    canal: canalRaw && typeof canalRaw === "object" ? mapCanal(canalRaw) : undefined,
  }
}

/* ─────────────────────────────── Adhésion ──────────────────────────────── */

/** POST /joinCanal — rejoindre directement un canal (public). */
export async function joinCanal(userId: string, canalId: string): Promise<CanalMutationResponse> {
  const raw = await requestForm<any>("/joinCanal", { user_id: userId, canal_id: canalId })
  return { success: raw?.success ?? true, message: raw?.message, result: raw }
}

/** POST /requestJoinCanal — créer une demande pour rejoindre un canal (privé). */
export async function requestJoinCanal(userId: string, canalId: string): Promise<CanalMutationResponse> {
  const raw = await requestForm<any>("/requestJoinCanal", { user_id: userId, canal_id: canalId })
  return { success: raw?.success ?? true, message: raw?.message, result: raw }
}

/** POST /leaveCanal — quitter un canal. */
export async function leaveCanal(userId: string, canalId: string): Promise<CanalMutationResponse> {
  const raw = await requestForm<any>("/leaveCanal", { user_id: userId, canal_id: canalId })
  return { success: raw?.success ?? true, message: raw?.message, result: raw }
}

/* ─────────────────────────────── CRUD canal ────────────────────────────── */

/** POST /canal — créer ou mettre à jour un canal (multipart/form-data). */
export async function createOrUpdateCanal(formData: FormData): Promise<CanalMutationResponse> {
  const raw = await requestMultipart<any>("/canal", formData)
  return { success: raw?.success ?? true, message: raw?.message, result: raw }
}

/** POST /delete/canal/:canal_id — supprimer un canal (confirmation par mot de passe). */
export async function deleteCanal(canalId: string, userId: string, password: string): Promise<CanalMutationResponse> {
  const raw = await requestForm<any>(`/delete/canal/${encodeURIComponent(canalId)}`, {
    user_id: userId,
    password,
  })
  return { success: raw?.success ?? true, message: raw?.message, result: raw }
}

/** POST /updateStatus — activer/désactiver un canal (raw JSON). */
export async function updateCanalStatus(
  userId: string,
  canalId: string,
  isActive: boolean
): Promise<CanalMutationResponse> {
  // TODO: l'endpoint attend du raw JSON — dughuServerForm envoie form-urlencoded ;
  // si l'API rejette, utiliser dughuServer.post directement avec `data` JSON.
  const raw = await requestForm<any>("/updateStatus", {
    user_id: userId,
    canal_id: canalId,
    is_active: isActive ? 1 : 0,
  })
  return { success: raw?.success ?? true, message: raw?.message, result: raw }
}

/* ─────────────────────────────── Membres ───────────────────────────────── */

/** GET /adherents/:canal_id — liste des membres. */
export async function getAdherents(canalId: string): Promise<CanalMember[]> {
  const raw = await requestGet<any>(`/adherents/${encodeURIComponent(canalId)}`)
  return mapCanalMembers(raw)
}

/**
 * POST /handleJoinRequest/:notification_id — accepter ou refuser une adhésion à un canal privé.
 * Endpoint Dughu : /handleJoinRequest/:notificationId (ID de la notification JoinRequestNotification.id)
 * Headers : Content-Type: application/json, Accept: application/json
 * Body JSON : { user_id: adminUserId, accept: boolean }
 */
export async function handleJoinRequest(
  notificationId: string,
  userId: string,
  accept: boolean
): Promise<CanalMutationResponse> {
  const { dughuServer } = await import("@/lib/api/server/dughu-instance")

  const adminUserId = Number(userId) || userId
  const payload = {
    user_id: adminUserId,
    accept: Boolean(accept),
  }

  // 1. Envoi JSON conforme à la spécification backend
  try {
    const res = await dughuServer.post<any>(
      `/handleJoinRequest/${encodeURIComponent(notificationId)}`,
      payload
    )

    if (res.data && res.data.success === false) {
      throw new Error(res.data.message || "Erreur lors du traitement de la demande d'adhésion.")
    }

    return {
      success: true,
      message: res.data?.message ?? (accept ? "Demande d'adhésion acceptée avec succès." : "Demande d'adhésion refusée."),
      result: res.data,
    }
  } catch (error: any) {
    // 2. Repli de précaution en form-urlencoded si le serveur externe attend du form
    try {
      const raw = await requestForm<any>(`/handleJoinRequest/${encodeURIComponent(notificationId)}`, {
        user_id: String(adminUserId),
        accept: accept ? "1" : "0",
      })

      if (raw && raw.success === false) {
        throw new Error(raw.message || "Erreur lors du traitement de la demande d'adhésion.")
      }

      return {
        success: true,
        message: raw?.message ?? (accept ? "Demande d'adhésion acceptée avec succès." : "Demande d'adhésion refusée."),
        result: raw,
      }
    } catch (formError: any) {
      const backendMessage =
        formError?.response?.data?.message ||
        formError?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Une erreur est survenue lors du traitement de la demande."

      console.error("handleJoinRequest error from backend:", backendMessage, { error, formError })
      throw new Error(backendMessage)
    }
  }
}

/* ─────────────────────────────── Favoris ───────────────────────────────── */

/** POST /toggleFavorite — ajouter/retirer un canal des favoris. */
export async function toggleFavoriteCanal(
  userId: string,
  canalId: string,
  action: "add" | "remove"
): Promise<CanalMutationResponse> {
  const raw = await requestForm<any>("/toggleFavorite", {
    user_id: userId,
    canal_id: canalId,
    action,
  })
  return { success: raw?.success ?? true, message: raw?.message, result: raw }
}

/** POST /listFavorites — liste paginée des canaux favoris. */
export async function listFavoriteCanals(
  userId: string,
  options: { page?: number; categoryId?: string } = {}
): Promise<CanalsListResponse> {
  const page = Math.max(1, options.page ?? 1)
  // TODO: endpoint POST avec query params — vérifier si le serveur accepte aussi
  // les params dans le body ou uniquement en query string.
  const raw = await requestForm<any>("/listFavorites", {
    user_id: userId,
    page,
    category_id: options.categoryId || undefined,
  })
  return mapCanalList(raw, page)
}

/* ─────────────────────────────── Messages ──────────────────────────────── */

/** POST /showCanalMessages — messages paginés d'un canal. */
export async function showCanalMessages(
  canalId: string,
  userId: string,
  page = 1
): Promise<CanalMessagesResponse> {
  const raw = await requestForm<any>("/showCanalMessages", {
    canal_id: canalId,
    user_id: userId,
    page,
  })
  return mapCanalMessages(raw, page, userId) as CanalMessagesResponse
}

/** POST /sendCanalMessage/:canal_id — envoyer un message (multipart). */
export async function sendCanalMessage(canalId: string, formData: FormData): Promise<CanalMutationResponse> {
  const raw = await requestMultipart<any>(`/sendCanalMessage/${encodeURIComponent(canalId)}`, formData)
  return { success: raw?.success ?? true, message: raw?.message, result: raw }
}

/** POST /updateCanalMessage/:message_id — modifier un message (multipart). */
export async function updateCanalMessage(messageId: string, formData: FormData): Promise<CanalMutationResponse> {
  const raw = await requestMultipart<any>(`/updateCanalMessage/${encodeURIComponent(messageId)}`, formData)
  return { success: raw?.success ?? true, message: raw?.message, result: raw }
}

/** DELETE /deleteCanalMessage/:message_id — supprimer un message. */
export async function deleteCanalMessage(messageId: string): Promise<CanalMutationResponse> {
  // L'instance serveur expose uniquement GET et POST — on passe par execute directement.
  // TODO: si dughuServer ne supporte pas DELETE nativement, exposer dughuServerDelete.
  try {
    const { dughuServer } = await import("@/lib/api/server/dughu-instance")
    const res = await dughuServer.delete(`/deleteCanalMessage/${encodeURIComponent(messageId)}`)
    return { success: res.data?.success ?? true, message: res.data?.message, result: res.data }
  } catch (error) {
    throw new ApiError("Impossible de supprimer le message.", { cause: error, status: 500 })
  }
}

/** POST /reactCanalMessage/:canal_id/:message_id — ajouter/mettre à jour une réaction. */
export async function reactCanalMessage(
  canalId: string,
  messageId: string,
  userId: string,
  reaction: string
): Promise<CanalMutationResponse> {
  const raw = await requestForm<any>(
    `/reactCanalMessage/${encodeURIComponent(canalId)}/${encodeURIComponent(messageId)}`,
    { user_id: userId, reaction }
  )
  return { success: raw?.success ?? true, message: raw?.message, result: raw }
}

/* ─────────────────────────────── Sondages ──────────────────────────────── */

/** POST /canals/:canal_id/polls — créer un sondage. */
export async function createPoll(canalId: string, payload: CanalPollPayload): Promise<CanalMutationResponse> {
  // TODO: l'API attend options[] (tableau) — dughuServerForm n'encode pas les
  // tableaux PHP-style. À surveiller ; si rejeté, utiliser dughuServer.post JSON.
  const raw = await requestForm<any>(`/canals/${encodeURIComponent(canalId)}/polls`, {
    question: payload.question,
    allow_multiple: payload.allowMultiple ? 1 : 0,
    closes_at: payload.closesAt || "",
    user_id: payload.userId,
    // Les options sont envoyées en JSON sur cet endpoint (corps JSON attendu)
  })
  return { success: raw?.success ?? true, message: raw?.message, result: raw }
}

/** POST /canals/polls/vote — enregistrer le vote d'un utilisateur. */
export async function votePoll(payload: CanalVotePayload): Promise<CanalMutationResponse> {
  const raw = await requestForm<any>("/canals/polls/vote", {
    option_id: payload.optionId,
    poll_id: payload.pollId,
    user_id: payload.userId,
    canal_id: payload.canalId,
  })
  return { success: raw?.success ?? true, message: raw?.message, result: raw }
}

/* ─────────────────────────────── Médias & Docs ─────────────────────────── */

/** GET /getMedia/:canal_id — médias d'un canal. */
export async function getCanalMedia(canalId: string): Promise<CanalMedia[]> {
  const raw = await requestGet<any>(`/getMedia/${encodeURIComponent(canalId)}`)
  return mapCanalMediaList(raw)
}

/** GET /getDocuments/:canal_id — documents d'un canal. */
export async function getCanalDocuments(canalId: string): Promise<CanalDocument[]> {
  const raw = await requestGet<any>(`/getDocuments/${encodeURIComponent(canalId)}`)
  return mapCanalDocumentList(raw)
}

/* ─────────────────────────────── Notifications ─────────────────────────── */

function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

/** GET /receivedNotifications — notifications en attente. */
export async function getReceivedNotifications(
  userId: string,
  canalId?: string,
  page = 1
): Promise<CanalNotificationsResponse> {
  let mappedResult: CanalNotificationsResponse = {
    success: true,
    notifications: [],
    hasMore: false,
    page,
  }

  try {
    const params: Record<string, string | number | undefined> = {
      user_id: userId,
      canal_id: canalId || undefined,
      page,
    }
    const raw = await requestGet<any>("/receivedNotifications", params)
    mappedResult = mapCanalNotifications(raw, page) as CanalNotificationsResponse
  } catch {
    // Si l'endpoint dédié retourne une erreur, on bascule gracieusement sur le fallback
  }

  // Fallback robuste : si la liste est vide, chercher les notifications de type "canal_join_request"
  // créées pour ce canal dans les notifications utilisateur (GET /getNotifications/:userId).
  if (mappedResult.notifications.length === 0 && userId) {
    try {
      // 1. Récupérer les identifiants du canal (slug / nom) pour filtrer si canalId fourni
      let canalSlug = ""
      let canalName = ""
      if (canalId) {
        try {
          const canalDetail = await requestGet<any>(`/canal/${encodeURIComponent(canalId)}`)
          const c = canalDetail?.result ?? canalDetail?.canal ?? canalDetail
          canalSlug = String(c?.unique_identifier || "").toLowerCase().trim()
          canalName = String(c?.name || "").trim()
        } catch {
          // En cas d'échec du détail, on continuera sans filtre restrictif
        }
      }

      // 2. Parcourir les notifications de l'utilisateur
      const userNotifsRaw = await requestGet<any>(`/getNotifications/${encodeURIComponent(userId)}`, {
        page,
        filter: "all",
      })
      const notifList: any[] = Array.isArray(userNotifsRaw?.result?.data)
        ? userNotifsRaw.result.data
        : Array.isArray(userNotifsRaw?.data)
        ? userNotifsRaw.data
        : []

      const canalNameNorm = canalName ? normalizeText(canalName) : ""

      const fallbackRequests = notifList
        .filter((n) => {
          const isJoinType =
            n?.type === "canal_join_request" ||
            String(n?.text || "").toLowerCase().includes("souhaite rejoindre le canal")
          if (!isJoinType) return false

          if (!canalId) return true

          const url = String(n?.url || "").toLowerCase()
          const text = String(n?.text || "")
          const textNorm = normalizeText(text)

          const matchesSlug = canalSlug
            ? url.includes(`/${canalSlug}/`) || url.includes(`/${canalSlug}`)
            : false

          // Extraction précise du nom du canal dans le texte : "...souhaite rejoindre le canal {nom}."
          const extractedMatch = text.match(/souhaite rejoindre le canal\s+([^.]+)\.?/i)
          const extractedNameNorm = extractedMatch ? normalizeText(extractedMatch[1]) : ""

          const matchesName =
            canalNameNorm &&
            (extractedNameNorm
              ? extractedNameNorm === canalNameNorm
              : textNorm.includes(canalNameNorm))

          // Correspondance par slug ou par nom normalisé du canal
          return matchesSlug || matchesName || (!canalSlug && !canalNameNorm)
        })
        .map((n) => {
          const mapped = mapCanalNotification(n)
          return {
            ...mapped,
            canalId: mapped.canalId || canalId || "",
            requestId: mapped.requestId || mapped.id,
          }
        })

      if (fallbackRequests.length > 0) {
        return {
          success: true,
          notifications: fallbackRequests,
          hasMore: Boolean(userNotifsRaw?.result?.has_more ?? userNotifsRaw?.has_more),
          page,
        }
      }
    } catch {
      // Ignorer l'erreur fallback et renvoyer le résultat initial
    }
  }

  // Garantir que canalId est renseigné sur les notifications renvoyées
  if (canalId && mappedResult.notifications.length > 0) {
    mappedResult.notifications = mappedResult.notifications.map((n) => ({
      ...n,
      canalId: n.canalId || canalId,
      requestId: n.requestId || n.id,
    }))
  }

  return mappedResult
}

/** GET /processedNotifications — notifications traitées. */
export async function getProcessedNotifications(
  userId: string,
  canalId?: string,
  page = 1
): Promise<CanalNotificationsResponse> {
  try {
    const raw = await requestGet<any>("/processedNotifications", {
      user_id: userId,
      canal_id: canalId || undefined,
      page,
    })
    const mapped = mapCanalNotifications(raw, page) as CanalNotificationsResponse
    if (canalId && mapped.notifications.length > 0) {
      mapped.notifications = mapped.notifications.map((n) => ({
        ...n,
        canalId: n.canalId || canalId,
        requestId: n.requestId || n.id,
      }))
    }
    return mapped
  } catch {
    return {
      success: true,
      notifications: [],
      hasMore: false,
      page,
    }
  }
}

/**
 * DELETE /delecteNotifications/:notification_id — supprimer une notification.
 * ⚠️ Typo backend conservée intentionnellement : "delecte" au lieu de "delete".
 */
export async function deleteNotification(
  notificationId: string,
  options: { userId?: string; canalId?: string } = {}
): Promise<CanalMutationResponse> {
  try {
    const { dughuServer } = await import("@/lib/api/server/dughu-instance")
    const res = await dughuServer.delete(`/delecteNotifications/${encodeURIComponent(notificationId)}`, {
      params: { user_id: options.userId || undefined, canal_id: options.canalId || undefined },
    })
    return { success: res.data?.success ?? true, message: res.data?.message, result: res.data }
  } catch (error) {
    throw new ApiError("Impossible de supprimer la notification.", { cause: error, status: 500 })
  }
}

/* ─────────────────────────────── Signalement ───────────────────────────── */

/** POST /canal/report — signaler un canal. */
export async function reportCanal(payload: CanalReportPayload): Promise<CanalMutationResponse> {
  const raw = await requestForm<any>("/canal/report", {
    canal_id: payload.canalId,
    reason: payload.reason,
    reason_id: payload.reasonId,
    text: payload.text || "",
    user_id: payload.userId,
  })
  return { success: raw?.success ?? true, message: raw?.message, result: raw }
}
