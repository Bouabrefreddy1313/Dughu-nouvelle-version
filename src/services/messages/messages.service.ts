/**
 * Service FRONTEND du domaine Messagerie.
 *
 * Seul module frontend autorisé à utiliser l'instance Axios cliente pour ce
 * domaine. Il n'appelle que les routes internes /api/messages, ne connaît pas
 * React, ne déclenche aucun toast, ne fait aucune redirection et transforme
 * les erreurs techniques en ApiError cohérentes (messages français).
 *
 * Avec FormData, Axios construit automatiquement le Content-Type et sa
 * boundary : ne jamais fixer ce header manuellement.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type {
  ChatsResponse,
  ContactsResponse,
  ContactResponse,
  ConversationResponse,
  SendResponse,
  MessageActionResponse,
} from "@/types/messages/message.types"

/** Timeout étendu conservé pour l'envoi (uploads image/vidéo/document). */
const SEND_TIMEOUT_MS = 60_000

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/** Charge la liste des conversations via GET /api/messages/chats. */
export async function fetchChats(
  userId: string,
  options: { signal?: AbortSignal } = {}
): Promise<ChatsResponse> {
  try {
    const res = await apiClient.get<ChatsResponse>("/messages/chats", {
      params: { userId },
      signal: options.signal,
    })
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur de chargement", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur de chargement")
  }
}

/** Recherche des contacts via GET /api/messages/contacts (autocomplétion). */
export async function searchContacts(
  params: { userId: string; q: string },
  options: { signal?: AbortSignal } = {}
): Promise<ContactsResponse> {
  try {
    const res = await apiClient.get<ContactsResponse>("/messages/contacts", {
      params: { userId: params.userId, q: params.q },
      signal: options.signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Recherche impossible")
  }
}

/** Charge la fiche d'un contact via GET /api/messages/contact. */
export async function fetchContact(
  params: { targetUserId: string; currentUserId: string },
  options: { signal?: AbortSignal } = {}
): Promise<ContactResponse> {
  try {
    const res = await apiClient.get<ContactResponse>("/messages/contact", {
      params: { targetUserId: params.targetUserId, currentUserId: params.currentUserId },
      signal: options.signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Contact introuvable")
  }
}

/** Charge l'historique d'une conversation via GET /api/messages/conversation. */
export async function fetchConversation(
  params: { userId: string; targetUserId: string },
  options: { signal?: AbortSignal } = {}
): Promise<ConversationResponse> {
  try {
    const res = await apiClient.get<ConversationResponse>("/messages/conversation", {
      params: { userId: params.userId, targetUserId: params.targetUserId },
      signal: options.signal,
    })
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur de chargement", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur de chargement")
  }
}

/** Envoie un message (texte + pièces jointes) via POST /api/messages/send. */
export async function sendMessage(
  formData: FormData,
  options: { signal?: AbortSignal } = {}
): Promise<SendResponse> {
  try {
    const res = await apiClient.post<SendResponse>("/messages/send", formData, {
      signal: options.signal,
      timeout: SEND_TIMEOUT_MS,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Échec d'envoi du message.")
  }
}

/** Modifie un message via POST /api/messages/update/:id. */
export async function editMessage(
  params: { messageId: string; userId: string; message: string; targetUserId: string },
  options: { signal?: AbortSignal } = {}
): Promise<MessageActionResponse> {
  try {
    const { messageId, ...body } = params
    const res = await apiClient.post<MessageActionResponse>(
      `/messages/update/${encodeURIComponent(messageId)}`,
      body,
      { signal: options.signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de modifier le message.")
  }
}

/** Supprime un message via POST /api/messages/delete/:id. */
export async function deleteMessage(
  params: { messageId: string; userId: string; targetUserId: string; deleteType: "me" | "all" },
  options: { signal?: AbortSignal } = {}
): Promise<MessageActionResponse> {
  try {
    const { messageId, ...body } = params
    const res = await apiClient.post<MessageActionResponse>(
      `/messages/delete/${encodeURIComponent(messageId)}`,
      body,
      { signal: options.signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de supprimer le message.")
  }
}

/** Supprime une conversation via POST /api/messages/delete-conversation/:id. */
export async function deleteConversation(
  params: { conversationId: string; userId: string; targetUserId: string },
  options: { signal?: AbortSignal } = {}
): Promise<MessageActionResponse> {
  try {
    const { conversationId, ...body } = params
    const res = await apiClient.post<MessageActionResponse>(
      `/messages/delete-conversation/${encodeURIComponent(conversationId)}`,
      body,
      { signal: options.signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de supprimer la conversation.")
  }
}

