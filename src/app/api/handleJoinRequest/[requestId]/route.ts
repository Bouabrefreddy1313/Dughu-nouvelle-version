/**
 * POST /api/handleJoinRequest/[requestId]
 * Alias direct miroir pour la collection Postman :
 * POST {{local_dughu}}/handleJoinRequest/:requestId
 * Body: { user_id, canal_id, accept } (JSON ou form-urlencoded)
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { handleJoinRequest } from "@/services/canal/canal.server"
import { ApiError } from "@/lib/api/api-error"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params
    const contentType = req.headers.get("content-type") || ""
    let userId = ""
    let canalId = ""
    let accept = true

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text()
      const search = new URLSearchParams(text)
      userId = search.get("user_id") || search.get("userId") || ""
      canalId = search.get("canal_id") || search.get("canalId") || ""
      const rawAccepte = search.get("accepte")
      const rawAccept = search.get("accept")
      if (rawAccepte !== null) {
        accept = rawAccepte === "1" || rawAccepte === "true"
      } else if (rawAccept !== null) {
        accept = rawAccept === "0" || rawAccept === "false" ? false : true
      }
    } else {
      const body = await req.json().catch(() => ({}))
      userId = String(body?.user_id || body?.userId || "")
      canalId = String(body?.canal_id || body?.canalId || "")
      if (body?.accept !== undefined) {
        accept = Boolean(body.accept) && body.accept !== "false" && body.accept !== "0" && body.accept !== 0
      } else if (body?.accepte !== undefined) {
        accept = Boolean(body.accepte) && body.accepte !== "false" && body.accepte !== "0" && body.accepte !== 0
      }
    }

    if (!userId) {
      userId = await getDughuUserIdFromCookies()
    }

    if (!userId || !requestId) {
      return NextResponse.json(
        { success: false, message: "user_id et requestId sont requis." },
        { status: 422 }
      )
    }

    const result = await handleJoinRequest(requestId, userId, accept)
    return NextResponse.json(result)
  } catch (error) {
    console.error("API ALIAS HANDLE JOIN REQUEST ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message =
      error instanceof Error && error.message ? error.message : "Impossible de traiter la demande d'adhésion."
    return NextResponse.json({ success: false, message }, { status })
  }
}
