import { NextRequest, NextResponse } from "next/server"
import { sendCustomNotificationServer } from "@/services/notifications/notifications.server"
import { getDughuTokenFromCookies } from "@/lib/dughu-user"
import { userMessage } from "@/lib/api/api-error"

/**
 * POST /api/notifications/send
 *
 * Envoie une notification personnalisée via POST /sendCustomNotification.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const receiverUserId = body.receiverUserId ?? body.receiver_user_id
    const title = String(body.title || "").trim()
    const description = String(body.description || "").trim()
    const typeNotif = String(body.typeNotif || body.type_notif || "custom").trim()
    const url = String(body.url || "/home").trim()

    if (!receiverUserId) {
      return NextResponse.json(
        { success: false, message: "Destinataire non spécifié." },
        { status: 400 }
      )
    }

    if (!title || !description) {
      return NextResponse.json(
        { success: false, message: "Titre et description requis." },
        { status: 400 }
      )
    }

    const authToken = await getDughuTokenFromCookies()

    const result = await sendCustomNotificationServer(
      {
        receiverUserId,
        title,
        description,
        typeNotif,
        url,
      },
      authToken
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("POST /api/notifications/send error:", error)
    return NextResponse.json(
      {
        success: false,
        message: userMessage(error, "Impossible d'envoyer la notification."),
      },
      { status: 500 }
    )
  }
}
