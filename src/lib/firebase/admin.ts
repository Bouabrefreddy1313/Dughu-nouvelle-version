import "server-only"
import { getApps, initializeApp, cert, type App } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getMessaging, type Messaging } from "firebase-admin/messaging"

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dughu-48cd0"
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

  if (privateKey) {
    // Normalisation des sauts de ligne pour les clés privées PEM
    privateKey = privateKey.replace(/\\n/g, "\n")
  }

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    })
  }

  // Fallback si initialisé dans un environnement cloud GCP avec Default Application Credentials
  return initializeApp({ projectId })
}

const adminApp = getAdminApp()

export const adminDb: Firestore = getFirestore(adminApp)
export const adminAuth: Auth = getAuth(adminApp)
export const adminMessaging: Messaging = getMessaging(adminApp)

export const ADMIN_CONVERSATIONS_COLLECTION =
  (process.env.NEXT_PUBLIC_FIREBASE_CONVERSATIONS_COLLECTION || "conversations").replace(/^["']|["']$/g, "")
