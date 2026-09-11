"use client"

import { useEffect, useState, useCallback } from "react"
import { collection, query, where, orderBy, onSnapshot, type Unsubscribe } from "firebase/firestore"
import { db, CONVERSATIONS_COLLECTION } from "@/lib/firebase/client"
import { ensureFirebaseAuth } from "@/lib/firebase/auth-helper"
import { mapFirestoreConversationToSummary } from "@/lib/firebase/firestore-mappers"
import type { ChatSummary } from "@/types/messages/message.types"
import type { FirestoreConversationDoc } from "@/types/messages/firestore.types"

export function useConversations(currentUserId: string) {
  const [conversations, setConversations] = useState<ChatSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [reloadTrigger, setReloadTrigger] = useState(0)

  const refresh = useCallback(() => {
    setReloadTrigger((prev) => prev + 1)
  }, [])

  useEffect(() => {
    if (!currentUserId) {
      setConversations([])
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

        const convCol = collection(db, CONVERSATIONS_COLLECTION)
        // Requête principale triée par updated_at décroissant
        const q = query(
          convCol,
          where("participants", "array-contains", String(currentUserId)),
          orderBy("updated_at", "desc")
        )

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            if (isCancelled) return
            const items: ChatSummary[] = []
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as FirestoreConversationDoc
              const summary = mapFirestoreConversationToSummary(docSnap.id, data, currentUserId)
              if (summary) {
                items.push(summary)
              }
            })
            setConversations(items)
            setLoading(false)
            setError(null)
          },
          (err) => {
            console.warn("Firestore conversations snapshot error (retrying with fallback):", err)
            // Fallback sans orderBy si l'index composite est manquant
            const fallbackQuery = query(
              convCol,
              where("participants", "array-contains", String(currentUserId))
            )
            unsubscribe = onSnapshot(
              fallbackQuery,
              (fallbackSnap) => {
                if (isCancelled) return
                const items: ChatSummary[] = []
                fallbackSnap.forEach((docSnap) => {
                  const data = docSnap.data() as FirestoreConversationDoc
                  const summary = mapFirestoreConversationToSummary(docSnap.id, data, currentUserId)
                  if (summary) {
                    items.push(summary)
                  }
                })
                // Tri en mémoire
                items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                setConversations(items)
                setLoading(false)
              },
              (fallbackErr) => {
                if (isCancelled) return
                console.error("Firestore conversations fallback error:", fallbackErr)
                setError("Impossible de charger les conversations.")
                setLoading(false)
              }
            )
          }
        )
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to initialize conversations listener:", err)
          setError("Erreur de connexion à la messagerie.")
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
  }, [currentUserId, reloadTrigger])

  return {
    conversations,
    loading,
    error,
    refresh,
  }
}
