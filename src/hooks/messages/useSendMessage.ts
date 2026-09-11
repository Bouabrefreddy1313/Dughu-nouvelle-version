"use client"

import { useState, useCallback } from "react"
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  increment,
  getDoc,
} from "firebase/firestore"
import { db, auth, CONVERSATIONS_COLLECTION } from "@/lib/firebase/client"
import { ensureFirebaseAuth } from "@/lib/firebase/auth-helper"
import { getOrCreateConversation } from "@/lib/firebase/conversations-helper"
import { uploadChatMedia } from "@/lib/firebase/storage-upload"
import { apiClient } from "@/lib/api/client/axios-instance"
import type { ChatMessage } from "@/types/messages/message.types"

export interface SendMessageParams {
  conversationId?: string | null
  targetUserId: string
  currentUserId: string
  text: string
  image?: File | null
  video?: File | null
  document?: File | null
  replyTo?: ChatMessage | null
  currentUserProfile?: {
    name?: string
    username?: string
    avatar?: string
  }
  targetUserProfile?: {
    name?: string
    username?: string
    avatar?: string
  }
}

export function useSendMessage() {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = useCallback(async (params: SendMessageParams) => {
    const {
      conversationId: existingConvId,
      targetUserId,
      currentUserId,
      text,
      image,
      video,
      document: docFile,
      replyTo,
      currentUserProfile,
      targetUserProfile,
    } = params

    const fromId = String(currentUserId || "").trim()
    const toId = String(targetUserId || "").trim()

    if (!fromId || !toId) {
      const err = new Error("Interlocuteurs requis.")
      setError(err.message)
      throw err
    }

    const trimmedText = text?.trim() || ""
    const file = image || video || docFile

    if (!trimmedText && !file) {
      const err = new Error("Ajoutez un message ou un fichier.")
      setError(err.message)
      throw err
    }

    setSending(true)
    setError(null)

    try {
      // 1. Authentification Firebase Auth requise par Firestore Rules
      await ensureFirebaseAuth(fromId)

      // 2. Résolution de la conversation (existante ou nouvelle)
      let convId = existingConvId?.trim() || ""
      if (!convId) {
        convId = await getOrCreateConversation(fromId, toId, {
          currentUser: {
            id: fromId,
            name: currentUserProfile?.name || "Utilisateur",
            username: currentUserProfile?.username || "",
            photo_url: currentUserProfile?.avatar || "",
          },
          targetUser: {
            id: toId,
            name: targetUserProfile?.name || "Utilisateur",
            username: targetUserProfile?.username || "",
            photo_url: targetUserProfile?.avatar || "",
          },
        })
      }

      if (!convId) {
        throw new Error("Identifiant de conversation introuvable.")
      }

      // 3. Vérifier que le document conversation parent existe bien dans Firestore
      const convRef = doc(db, CONVERSATIONS_COLLECTION, convId)
      const convSnap = await getDoc(convRef)

      if (!convSnap.exists()) {
        // Recréer le document parent si absent avant d'écrire dans messages
        await getOrCreateConversation(fromId, toId, {
          currentUser: {
            id: fromId,
            name: currentUserProfile?.name || "Utilisateur",
            username: currentUserProfile?.username || "",
            photo_url: currentUserProfile?.avatar || "",
          },
          targetUser: {
            id: toId,
            name: targetUserProfile?.name || "Utilisateur",
            username: targetUserProfile?.username || "",
            photo_url: targetUserProfile?.avatar || "",
          },
        })
      }

      // 4. Upload média si présent
      let mediaUrl = ""
      let mediaFileName = ""
      let mimeType = ""
      let fileSize: number | null = null

      if (file) {
        const uploadResult = await uploadChatMedia(file, convId)
        mediaUrl = uploadResult.url || ""
        mediaFileName = uploadResult.fileName || ""
        mimeType = uploadResult.mimeType || ""
        fileSize = uploadResult.fileSize ?? null
      }

      // 5. Aperçu pour lastMessage
      let preview = trimmedText
      if (!preview && file) {
        if (image) preview = "📷 Photo"
        else if (video) preview = "🎥 Vidéo"
        else preview = "📄 Fichier"
      }

      // 6. Préparation du document message
      const messagesCol = collection(db, CONVERSATIONS_COLLECTION, convId, "messages")
      const newMsgRef = doc(messagesCol)

      const messageDocData = {
        id: newMsgRef.id,
        from_id: fromId,
        to_id: toId,
        sender_name: currentUserProfile?.name || "Utilisateur",
        avatar: currentUserProfile?.avatar || "",
        text: trimmedText,
        media: mediaUrl,
        mediafile: mediaFileName,
        file_name: mediaFileName,
        file_size: fileSize,
        mime_type: mimeType,
        seen: false,
        delete: {
          [fromId]: false,
          [toId]: false,
        },
        deletedFor: [],
        reply_doc_id: replyTo?.id ?? null,
        reply_sender: replyTo
          ? replyTo.isMine
            ? "Vous"
            : targetUserProfile?.name || "Utilisateur"
          : null,
        reply_text: replyTo ? replyTo.text || "Fichier joint" : null,
        timestamp: serverTimestamp(),
      }

      // 7. Écriture atomique via Batch write (Message + Mise à jour parent)
      const batch = writeBatch(db)

      batch.set(newMsgRef, messageDocData)

      batch.update(convRef, {
        lastMessage: preview,
        updated_at: serverTimestamp(),
        [`opened.${fromId}`]: true,
        [`opened.${toId}`]: false,
        [`unread.${toId}`]: increment(1),
        [`typing.${fromId}`]: false,
      })

      await batch.commit()

      console.log(`[Firestore] Message envoyé : ${CONVERSATIONS_COLLECTION}/${convId}/messages/${newMsgRef.id}`)

      // 8. Déclenchement de la notification push FCM (asynchrone)
      void apiClient
        .post("/messages/push", {
          recipientId: toId,
          senderName: currentUserProfile?.name || "Un contact",
          text: preview,
          conversationId: convId,
          messageId: newMsgRef.id,
        })
        .catch((e) => {
          console.warn("FCM push trigger failed:", e)
        })

      return {
        success: true,
        conversationId: convId,
        messageId: newMsgRef.id,
      }
    } catch (err: any) {
      console.error("[Firestore Error sendMessage]:", err)
      const code = err?.code || ""
      let msg = "Erreur lors de l'envoi"

      if (code === "permission-denied") {
        msg = "Permission refusée par Firestore (session non connectée à Firebase Auth ou vous n'êtes pas participant)."
      } else if (code === "not-found") {
        msg = "Conversation introuvable dans Firestore."
      } else if (err instanceof Error) {
        msg = err.message
      }

      setError(msg)
      throw err
    } finally {
      setSending(false)
    }
  }, [])

  return {
    sendMessage: send,
    sending,
    error,
  }
}
