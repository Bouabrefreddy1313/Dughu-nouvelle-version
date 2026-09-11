"use client"

import { useCallback, useEffect, useState } from "react"
import { collection, query, orderBy, onSnapshot, type Unsubscribe } from "firebase/firestore"
import { db, CONVERSATIONS_COLLECTION } from "@/lib/firebase/client"
import { ensureFirebaseAuth } from "@/lib/firebase/auth-helper"
import { mapFirestoreMessageToChatMessage } from "@/lib/firebase/firestore-mappers"
import type { ChatMessage } from "@/types/messages/message.types"
import type { FirestoreMessageDoc } from "@/types/messages/firestore.types"

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

    let unsubscribe: Unsubscribe | null = null
    let isCancelled = false

    const setupListener = async () => {
      setLoading(true)
      try {
        await ensureFirebaseAuth(currentUserId)
        if (isCancelled) return

        const messagesCol = collection(db, CONVERSATIONS_COLLECTION, conversationId, "messages")
        const q = query(messagesCol, orderBy("timestamp", "asc"))

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            if (isCancelled) return
            const items: ChatMessage[] = []
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as FirestoreMessageDoc
              const msg = mapFirestoreMessageToChatMessage(docSnap.id, data, currentUserId)
              if (msg) {
                items.push(msg)
              }
            })
            setMessages(items)
            setLoading(false)
            setError(null)
          },
          (err) => {
            console.warn("Messages snapshot error (trying fallback):", err)
            // Fallback sans orderBy si l'index est en création
            const fallbackQuery = query(messagesCol)
            unsubscribe = onSnapshot(
              fallbackQuery,
              (fallbackSnap) => {
                if (isCancelled) return
                const items: ChatMessage[] = []
                fallbackSnap.forEach((docSnap) => {
                  const data = docSnap.data() as FirestoreMessageDoc
                  const msg = mapFirestoreMessageToChatMessage(docSnap.id, data, currentUserId)
                  if (msg) {
                    items.push(msg)
                  }
                })
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
      if (unsubscribe) {
        unsubscribe()
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
