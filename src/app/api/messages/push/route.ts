import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { adminDb, adminMessaging } from "@/lib/firebase/admin"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const currentUserId = await getDughuUserIdFromCookies()
    if (!currentUserId) {
      return NextResponse.json({ success: false, message: "Non authentifié." }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { recipientId, senderName, text, conversationId, messageId } = body

    if (!recipientId) {
      return NextResponse.json({ success: false, message: "Destinataire requis." }, { status: 422 })
    }

    // Récupération du/des token(s) FCM pour ce destinataire
    const tokens = new Set<string>()

    // 1. Recherche dans users/{recipientId}
    try {
      const userDoc = await adminDb.collection("users").doc(String(recipientId)).get()
      if (userDoc.exists) {
        const uData = userDoc.data()
        const t = uData?.deviceToken || uData?.fcmToken || uData?.fcm_token
        if (typeof t === "string" && t.trim()) tokens.add(t.trim())
      }
    } catch {
      /* ignore */
    }

    // 2. Recherche dans notifications_device_tokens/{recipientId}
    try {
      const deviceDoc = await adminDb.collection("notifications_device_tokens").doc(String(recipientId)).get()
      if (deviceDoc.exists) {
        const dData = deviceDoc.data()
        const t = dData?.token || dData?.deviceToken || dData?.fcm_token
        if (typeof t === "string" && t.trim()) tokens.add(t.trim())
        if (Array.isArray(dData?.tokens)) {
          dData.tokens.forEach((item: unknown) => {
            if (typeof item === "string" && item.trim()) tokens.add(item.trim())
          })
        }
      }
    } catch {
      /* ignore */
    }

    if (tokens.size === 0) {
      // Destinataire sans appareil ou token non enregistré
      return NextResponse.json({ success: true, sent: 0, message: "Aucun token FCM trouvé pour ce destinataire." })
    }

    const title = `Nouveau message de ${senderName || "un utilisateur"}`
    const content = text ? (text.length > 100 ? `${text.slice(0, 97)}…` : text) : "Vous avez reçu un nouveau message."
    const clickUrl = `/messages?target=${encodeURIComponent(String(currentUserId))}`

    const results = await Promise.allSettled(
      Array.from(tokens).map(async (token) => {
        return adminMessaging.send({
          token,
          notification: {
            title,
            body: content,
          },
          data: {
            type_notif: "chat",
            sender_id: String(currentUserId),
            receiver_id: String(recipientId),
            conversation_id: String(conversationId || ""),
            message_id: String(messageId || ""),
            url: clickUrl,
          },
          webpush: {
            fcmOptions: {
              link: clickUrl,
            },
          },
        })
      })
    )

    const sentCount = results.filter((r) => r.status === "fulfilled").length
    return NextResponse.json({ success: true, sent: sentCount })
  } catch (error) {
    console.error("FCM PUSH ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur envoi push FCM." }, { status: 500 })
  }
}
