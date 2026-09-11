import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db, CONVERSATIONS_COLLECTION } from "./client"
import type { FirestoreUserSummary } from "@/types/messages/firestore.types"

/**
 * Recherche une conversation existante entre deux participants ou en crée une nouvelle.
 * Les participants sont toujours triés pour garantir l'unicité du fil.
 */
export async function getOrCreateConversation(
  currentUserId: string,
  targetUserId: string,
  usersInfo?: {
    currentUser?: Partial<FirestoreUserSummary>
    targetUser?: Partial<FirestoreUserSummary>
  }
): Promise<string> {
  const p0 = String(currentUserId)
  const p1 = String(targetUserId)
  const participants = [p0, p1].sort()
  const folderA = `${p0}_${p1}`
  const folderB = `${p1}_${p0}`

  const convCol = collection(db, CONVERSATIONS_COLLECTION)

  // 1. Recherche par folder (bidirectionnel A_B ou B_A)
  try {
    const q = query(convCol, where("folder", "in", [folderA, folderB]))
    const snap = await getDocs(q)
    if (!snap.empty) {
      return snap.docs[0]!.id
    }
  } catch {
    /* fallback si clause in non supportée */
  }

  // 2. Recherche robuste par participants (cherche les conversations de p0 et vérifie la présence de p1)
  try {
    const qParticipants = query(convCol, where("participants", "array-contains", p0))
    const snapPart = await getDocs(qParticipants)
    const existingDoc = snapPart.docs.find((d) => {
      const parts = d.data().participants
      return Array.isArray(parts) && parts.map(String).includes(p1)
    })
    if (existingDoc) {
      return existingDoc.id
    }
  } catch {
    /* fallback */
  }

  // 3. Création du nouveau document conversation
  const users: FirestoreUserSummary[] = [
    {
      id: p0,
      name: usersInfo?.currentUser?.name || "Utilisateur",
      username: usersInfo?.currentUser?.username || "",
      photo_url: usersInfo?.currentUser?.photo_url || "",
    },
    {
      id: p1,
      name: usersInfo?.targetUser?.name || "Utilisateur",
      username: usersInfo?.targetUser?.username || "",
      photo_url: usersInfo?.targetUser?.photo_url || "",
    },
  ]

  const canonicalFolder = `${participants[0]}_${participants[1]}`

  const newDocRef = await addDoc(convCol, {
    participants,
    folder: canonicalFolder,
    users,
    unread: {
      [p0]: 0,
      [p1]: 0,
    },
    typing: {
      [p0]: false,
      [p1]: false,
    },
    opened: {
      [p0]: true,
      [p1]: false,
    },
    important: {
      [p0]: false,
      [p1]: false,
    },
    deletedFor: [],
    deletedAt: {},
    lastMessage: "",
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  })

  return newDocRef.id
}
