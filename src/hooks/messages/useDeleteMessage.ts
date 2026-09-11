"use client"

import { useCallback, useState } from "react"
import { doc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore"
import { db, CONVERSATIONS_COLLECTION } from "@/lib/firebase/client"
import { ensureFirebaseAuth } from "@/lib/firebase/auth-helper"

export function useDeleteMessage(conversationId: string | null | undefined, currentUserId: string) {
  const [deleting, setDeleting] = useState(false)
  const currentUserIdStr = String(currentUserId || "")

  const deleteForMe = useCallback(
    async (messageId: string) => {
      if (!conversationId || !messageId || !currentUserIdStr) return
      setDeleting(true)
      try {
        await ensureFirebaseAuth(currentUserIdStr)
        const msgRef = doc(db, CONVERSATIONS_COLLECTION, conversationId, "messages", messageId)
        await updateDoc(msgRef, {
          deletedFor: arrayUnion(currentUserIdStr),
          [`delete.${currentUserIdStr}`]: true,
        })
      } finally {
        setDeleting(false)
      }
    },
    [conversationId, currentUserIdStr]
  )

  const deleteForAll = useCallback(
    async (messageId: string, targetUserId: string) => {
      if (!conversationId || !messageId || !currentUserIdStr) return
      setDeleting(true)
      try {
        await ensureFirebaseAuth(currentUserIdStr)
        const msgRef = doc(db, CONVERSATIONS_COLLECTION, conversationId, "messages", messageId)
        await updateDoc(msgRef, {
          delete: {
            [currentUserIdStr]: true,
            [String(targetUserId)]: true,
          },
          text: "",
          media: "",
        })
      } finally {
        setDeleting(false)
      }
    },
    [conversationId, currentUserIdStr]
  )

  const deleteConversation = useCallback(
    async (targetConvId?: string) => {
      const targetId = targetConvId || conversationId
      if (!targetId || !currentUserIdStr) return
      setDeleting(true)
      try {
        await ensureFirebaseAuth(currentUserIdStr)
        const convRef = doc(db, CONVERSATIONS_COLLECTION, targetId)
        await updateDoc(convRef, {
          deletedFor: arrayUnion(currentUserIdStr),
          [`deletedAt.${currentUserIdStr}`]: serverTimestamp(),
          [`unread.${currentUserIdStr}`]: 0,
        })
      } finally {
        setDeleting(false)
      }
    },
    [conversationId, currentUserIdStr]
  )

  return {
    deleteForMe,
    deleteForAll,
    deleteConversation,
    deleting,
  }
}
