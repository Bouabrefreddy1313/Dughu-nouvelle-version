"use client"

import { useCallback, useState } from "react"
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db, CONVERSATIONS_COLLECTION } from "@/lib/firebase/client"
import { ensureFirebaseAuth } from "@/lib/firebase/auth-helper"

export function useEditMessage(conversationId: string | null | undefined, currentUserId: string) {
  const [editing, setEditing] = useState(false)
  const currentUserIdStr = String(currentUserId || "")

  const editMessage = useCallback(
    async (messageId: string, newText: string) => {
      if (!conversationId || !messageId || !currentUserIdStr) return
      const trimmed = newText.trim()
      if (!trimmed) throw new Error("Le message ne peut pas être vide.")
      if (trimmed.length > 500) throw new Error("Le message ne peut pas dépasser 500 caractères.")

      setEditing(true)
      try {
        await ensureFirebaseAuth(currentUserIdStr)
        const msgRef = doc(db, CONVERSATIONS_COLLECTION, conversationId, "messages", messageId)
        await updateDoc(msgRef, {
          text: trimmed,
          edited_at: serverTimestamp(),
        })

        // Mise à jour éventuelle du lastMessage sur la conversation
        const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId)
        await updateDoc(convRef, {
          lastMessage: trimmed,
          updated_at: serverTimestamp(),
        }).catch(() => {})
      } finally {
        setEditing(false)
      }
    },
    [conversationId, currentUserIdStr]
  )

  return {
    editMessage,
    editing,
  }
}
