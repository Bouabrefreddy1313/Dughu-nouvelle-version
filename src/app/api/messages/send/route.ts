import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { dughuApi, DughuApiError } from "@/lib/dughu"
import { normalizeMessages } from "@/lib/messages"

const MAX_IMAGE_SIZE = 2 * 1024 * 1024
const MAX_FILE_SIZE = 20 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const incoming = await req.formData()
    const userId = String(incoming.get("user_id") || "")
    const targetUserId = String(incoming.get("target_user_id") || "")
    const authToken = (await cookies()).get("dughu_token")?.value || ""
    const message = String(incoming.get("message") || "").trim()
    const image = incoming.get("image")
    const video = incoming.get("video")
    const document = incoming.get("document")

    if (!userId || !targetUserId) {
      return NextResponse.json({ success: false, message: "Interlocuteurs requis." }, { status: 422 })
    }
    if (!authToken) {
      return NextResponse.json({ success: false, message: "Session Dughu expirée." }, { status: 401 })
    }
    if (userId === targetUserId) {
      return NextResponse.json({ success: false, message: "Vous ne pouvez pas vous écrire à vous-même." }, { status: 422 })
    }
    if (message.length > 500) {
      return NextResponse.json({ success: false, message: "Le message ne peut pas dépasser 500 caractères." }, { status: 422 })
    }
    const files = [image, video, document].filter((value): value is File => value instanceof File && value.size > 0)
    if (!message && files.length === 0) {
      return NextResponse.json({ success: false, message: "Ajoutez un message ou un fichier." }, { status: 422 })
    }
    if (image instanceof File && image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ success: false, message: "L’image dépasse 2 Mo." }, { status: 422 })
    }
    if (video instanceof File && video.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: "La vidéo dépasse 20 Mo." }, { status: 422 })
    }
    if (video instanceof File && !["video/mp4", "video/ogg", "video/webm"].includes(video.type)) {
      return NextResponse.json({ success: false, message: "Format vidéo non pris en charge." }, { status: 422 })
    }
    if (document instanceof File && document.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: "Le document dépasse 20 Mo." }, { status: 422 })
    }

    const upstream = new FormData()
    upstream.set("user_id", userId)
    upstream.set("target_user_id", targetUserId)
    if (message) upstream.set("message", message)
    for (const field of ["image", "video", "document", "reply_doc_id", "reply_sender", "reply_text"] as const) {
      const value = incoming.get(field)
      if (value === null || value === "") continue
      if (value instanceof File && value.size === 0) continue
      upstream.set(field, value)
    }

    const upstreamResponse = await dughuApi.sendMessage(upstream, authToken || undefined)
    if (!upstreamResponse?.success) {
      return NextResponse.json(
        {
          success: false,
          message: upstreamResponse?.message || "L’API Dughu a refusé le message.",
        },
        { status: 502 }
      )
    }

    const sentMessage = normalizeMessages(
      { messages: upstreamResponse.result ? [upstreamResponse.result] : [] },
      userId,
      targetUserId
    )[0] || null

    return NextResponse.json({
      success: true,
      message: upstreamResponse.message || "Message envoyé avec succès.",
      sentMessage,
    })
  } catch (error) {
    console.error("SEND MESSAGE ERROR:", error)
    if (error instanceof DughuApiError) {
      const status = error.status === 401 || error.status === 403 ? 502 : error.status
      return NextResponse.json(
        { success: false, message: "L’API Dughu a refusé le message.", upstream: error.data },
        { status }
      )
    }
    return NextResponse.json({ success: false, message: "Impossible d’envoyer le message." }, { status: 502 })
  }
}
