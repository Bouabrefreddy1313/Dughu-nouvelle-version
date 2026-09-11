"use client"

import { useCallback, useEffect, useState } from "react"
import { collection, doc, query, orderBy, onSnapshot, type Unsubscribe } from "firebase/firestore"
import { db, CONVERSATIONS_COLLECTION } from "@/lib/firebase/client"
import { ensureFirebaseAuth } from "@/lib/firebase/auth-helper"
import { mapFirestoreMessageToChatMessage } from "@/lib/firebase/firestore-mappers"
import type { ChatMessage } from "@/types/messages/message.types"
import type { FirestoreConversationDoc, FirestoreMessageDoc } from "@/types/messages/firestore.types"

export function useMessages(conversationId: string | null | undefined, currentUserId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadTrigger, setReloadTrigger] = useState(0)

  const refresh = useCallback(() => {
    setReloadTrigger((prev) => prev + 1)
  }, [])

  useEffect(() => {
    if (!conversationId || !currentUserId) {
      setMessages([])
      setLoading(false)
      return
    }

    let unsubscribeMessages: Unsubscribe | null = null
    let unsubscribeConv: Unsubscribe | null = null
    let isCancelled = false

    const setupListener = async () => {
      setLoading(true)
      try {
        await ensureFirebaseAuth(currentUserId)
        if (isCancelled) return

        let deletedAtMs: number | null = null
        let rawMessageDocs: Array<{ id: string; data: FirestoreMessageDoc }> = []

        const applyFilterAndSetMessages = () => {
          const items: ChatMessage[] = []
          for (const docItem of rawMessageDocs) {
            const msg = mapFirestoreMessageToChatMessage(
              docItem.id,
              docItem.data,
              currentUserId,
              deletedAtMs
            )
            if (msg) {
              items.push(msg)
            }
          }
          setMessages(items)
        }

        // 1. Écouter le document parent pour obtenir deletedAt de l'utilisateur courant
        const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId)
        unsubscribeConv = onSnapshot(
          convRef,
          (convSnap) => {
            if (isCancelled || !convSnap.exists()) return
            const convData = convSnap.data() as FirestoreConversationDoc
            const userDeletedAt = convData?.deletedAt?.[currentUserId]
            let newDeletedAtMs: number | null = null
            if (userDeletedAt) {
              if (typeof (userDeletedAt as any)?.toMillis === "function") {
                newDeletedAtMs = (userDeletedAt as any).toMillis()
              } else if (typeof (userDeletedAt as any)?._seconds === "number") {
                newDeletedAtMs = (userDeletedAt as any)._seconds * 1000
              } else if (typeof userDeletedAt === "number") {
                newDeletedAtMs = userDeletedAt < 1e12 ? userDeletedAt * 1000 : userDeletedAt
              }
            }
            if (deletedAtMs !== newDeletedAtMs) {
              deletedAtMs = newDeletedAtMs
              if (rawMessageDocs.length > 0) {
                applyFilterAndSetMessages()
              }
            }
          },
          (convErr) => {
            console.warn("Conversation doc snapshot error:", convErr)
          }
        )

        // 2. Écouter la sous-collection messages
        const messagesCol = collection(db, CONVERSATIONS_COLLECTION, conversationId, "messages")
        const q = query(messagesCol, orderBy("timestamp", "asc"))

        unsubscribeMessages = onSnapshot(
          q,
          (snapshot) => {
            if (isCancelled) return
            rawMessageDocs = []
            snapshot.forEach((docSnap) => {
              rawMessageDocs.push({
                id: docSnap.id,
                data: docSnap.data() as FirestoreMessageDoc,
              })
            })
            applyFilterAndSetMessages()
            setLoading(false)
            setError(null)
          },
          (err) => {
            console.warn("Messages snapshot error (trying fallback):", err)
            // Fallback sans orderBy si l'index est en création
            const fallbackQuery = query(messagesCol)
            unsubscribeMessages = onSnapshot(
              fallbackQuery,
              (fallbackSnap) => {
                if (isCancelled) return
                rawMessageDocs = []
                fallbackSnap.forEach((docSnap) => {
                  rawMessageDocs.push({
                    id: docSnap.id,
                    data: docSnap.data() as FirestoreMessageDoc,
                  })
                })
                const items: ChatMessage[] = []
                for (const docItem of rawMessageDocs) {
                  const msg = mapFirestoreMessageToChatMessage(
                    docItem.id,
                    docItem.data,
                    currentUserId,
                    deletedAtMs
                  )
                  if (msg) {
                    items.push(msg)
                  }
                }
                items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                setMessages(items)
                setLoading(false)
              },
              (fallbackErr) => {
                if (isCancelled) return
                console.error("Messages fallback snapshot error:", fallbackErr)
                setError("Impossible de charger les messages.")
                setLoading(false)
              }
            )
          }
        )
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to initialize messages listener:", err)
          setError("Erreur de connexion aux messages.")
          setLoading(false)
        }
      }
    }

    void setupListener()

    return () => {
      isCancelled = true
      if (unsubscribeMessages) {
        unsubscribeMessages()
      }
      if (unsubscribeConv) {
        unsubscribeConv()
      }
    }
  }, [conversationId, currentUserId, reloadTrigger])

  return {
    messages,
    loading,
    error,
    refresh,
  }
}
