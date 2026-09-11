"use client"

import { useCallback } from "react"
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore"
import { db, CONVERSATIONS_COLLECTION } from "@/lib/firebase/client"
import { ensureFirebaseAuth } from "@/lib/firebase/auth-helper"

export function useMarkAsSeen(conversationId: string | null | undefined, currentUserId: string) {
  const currentUserIdStr = String(currentUserId || "")

  const markAsSeen = useCallback(async () => {
    if (!conversationId || !currentUserIdStr) return

    try {
      await ensureFirebaseAuth(currentUserIdStr)

      // 1. Remise à zéro du compteur non lus dans la conversation
      const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId)
      await updateDoc(convRef, {
        [`unread.${currentUserIdStr}`]: 0,
        [`opened.${currentUserIdStr}`]: true,
      }).catch((err) => {
        console.warn("Could not reset conversation unread:", err)
      })

      // 2. Marquer les messages entrants non lus comme "seen"
      const messagesCol = collection(db, CONVERSATIONS_COLLECTION, conversationId, "messages")
      const q = query(
        messagesCol,
        where("to_id", "==", currentUserIdStr),
        where("seen", "==", false)
      )

      const snap = await getDocs(q).catch(() => null)
      if (snap && !snap.empty) {
        const batch = writeBatch(db)
        snap.docs.forEach((docSnap) => {
          batch.update(docSnap.ref, {
            seen: true,
            seen_at: serverTimestamp(),
          })
        })
        await batch.commit().catch((err) => {
          console.warn("Batch mark as seen failed:", err)
        })
      }
    } catch (err) {
      console.warn("markAsSeen error:", err)
    }
  }, [conversationId, currentUserIdStr])

  return { markAsSeen }
}
