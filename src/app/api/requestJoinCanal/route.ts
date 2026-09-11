/**
 * POST /api/requestJoinCanal
 * Alias direct miroir pour la collection Postman :
 * POST {{local_dughu}}/requestJoinCanal
 * Body: { user_id, canal_id } (JSON ou form-urlencoded)
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { requestJoinCanal } from "@/services/canal/canal.server"
import { ApiError } from "@/lib/api/api-error"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || ""
    let userId = ""
    let canalId = ""

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text()
      const params = new URLSearchParams(text)
      userId = params.get("user_id") || params.get("userId") || ""
      canalId = params.get("canal_id") || params.get("canalId") || ""
    } else {
      const body = await req.json().catch(() => ({}))
      userId = String(body?.user_id || body?.userId || "")
      canalId = String(body?.canal_id || body?.canalId || "")
    }

    if (!userId) {
      userId = await getDughuUserIdFromCookies()
    }

    if (!userId || !canalId) {
      return NextResponse.json(
        { success: false, message: "user_id et canal_id sont requis." },
        { status: 422 }
      )
    }

    const result = await requestJoinCanal(userId, canalId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("API ALIAS REQUEST JOIN CANAL ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message =
      error instanceof Error && error.message ? error.message : "Impossible d'envoyer la demande d'adhésion."
    return NextResponse.json({ success: false, message }, { status })
  }
}
