"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { doc, onSnapshot, updateDoc } from "firebase/firestore"
import { db, CONVERSATIONS_COLLECTION } from "@/lib/firebase/client"
import { ensureFirebaseAuth } from "@/lib/firebase/auth-helper"

export function useTypingIndicator(conversationId: string | null | undefined, currentUserId: string) {
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentUserIdStr = String(currentUserId || "")

  // Écoute de l'indicateur de frappe de l'autre participant
  useEffect(() => {
    if (!conversationId || !currentUserIdStr) {
      setIsOtherTyping(false)
      return
    }

    const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId)
    const unsubscribe = onSnapshot(convRef, (snap) => {
      if (!snap.exists()) {
        setIsOtherTyping(false)
        return
      }
      const data = snap.data()
      const typingMap = data?.typing || {}
      // Vérifier si quelqu'un d'autre que currentUserId est en train d'écrire
      let someoneElseTyping = false
      for (const [uid, typing] of Object.entries(typingMap)) {
        if (uid !== currentUserIdStr && typing === true) {
          someoneElseTyping = true
          break
        }
      }
      setIsOtherTyping(someoneElseTyping)
    })

    return () => {
      unsubscribe()
    }
  }, [conversationId, currentUserIdStr])

  // Déclencher le statut de frappe côté utilisateur courant
  const notifyTyping = useCallback(() => {
    if (!conversationId || !currentUserIdStr) return

    void (async () => {
      await ensureFirebaseAuth(currentUserIdStr)
      const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId)
      await updateDoc(convRef, {
        [`typing.${currentUserIdStr}`]: true,
      }).catch(() => {})
    })()

    // Annule le timer précédent s'il existe
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Réinitialise le statut à false après 3 secondes d'inactivité
    typingTimeoutRef.current = setTimeout(() => {
      if (!conversationId || !currentUserIdStr) return
      const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId)
      void updateDoc(convRef, {
        [`typing.${currentUserIdStr}`]: false,
      }).catch(() => {})
    }, 3000)
  }, [conversationId, currentUserIdStr])

  // Réinitialiser immédiatement (ex: au moment de l'envoi)
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    if (!conversationId || !currentUserIdStr) return
    const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId)
    void updateDoc(convRef, {
      [`typing.${currentUserIdStr}`]: false,
    }).catch(() => {})
  }, [conversationId, currentUserIdStr])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return {
    isOtherTyping,
    notifyTyping,
    stopTyping,
  }
}
