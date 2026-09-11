import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app"
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore"
import { getAuth, type Auth } from "firebase/auth"
import { getStorage, type FirebaseStorage } from "firebase/storage"
import { getMessaging, isSupported, type Messaging } from "firebase/messaging"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dughu-48cd0.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dughu-48cd0",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dughu-48cd0.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "812008509620",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:812008509620:web:b4ba3b0055e621bfa607e1",
}

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export const db: Firestore = (() => {
  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true,
    })
  } catch {
    return getFirestore(app)
  }
})()
export const auth: Auth = getAuth(app)
export const storage: FirebaseStorage = getStorage(app)

let messagingInstance: Messaging | null = null
export async function getClientMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null
  if (messagingInstance) return messagingInstance
  const supported = await isSupported().catch(() => false)
  if (supported) {
    messagingInstance = getMessaging(app)
    return messagingInstance
  }
  return null
}

/**
 * Nom de la collection principale des conversations Firestore.
 * 'conversations' en production, 'conversations_test' en test/recette.
 */
export const CONVERSATIONS_COLLECTION =
  (process.env.NEXT_PUBLIC_FIREBASE_CONVERSATIONS_COLLECTION || "conversations").replace(/^["']|["']$/g, "")

export default app
