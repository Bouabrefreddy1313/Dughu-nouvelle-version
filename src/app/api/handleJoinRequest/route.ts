/**
 * POST /api/handleJoinRequest
 * Accepter ou refuser une demande d'adhésion avec requestId dans le body ou les query params.
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { handleJoinRequest } from "@/services/canal/canal.server"
import { ApiError } from "@/lib/api/api-error"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const contentType = req.headers.get("content-type") || ""
    let requestId = searchParams.get("requestId") || searchParams.get("request_id") || ""
    let userId = searchParams.get("userId") || searchParams.get("user_id") || ""
    let canalId = searchParams.get("canalId") || searchParams.get("canal_id") || ""
    let accept = true

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text()
      const search = new URLSearchParams(text)
      requestId = requestId || search.get("requestId") || search.get("request_id") || search.get("id") || ""
      userId = userId || search.get("user_id") || search.get("userId") || ""
      canalId = canalId || search.get("canal_id") || search.get("canalId") || ""
      const rawAccept = search.get("accept")
      if (rawAccept !== null) {
        accept = rawAccept === "0" || rawAccept === "false" ? false : true
      }
    } else {
      const body = await req.json().catch(() => ({}))
      requestId = requestId || String(body?.requestId || body?.request_id || body?.id || "")
      userId = userId || String(body?.user_id || body?.userId || "")
      canalId = canalId || String(body?.canal_id || body?.canalId || "")
      if (body?.accept !== undefined) {
        accept = body.accept === 0 || body.accept === false ? false : true
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

    const result = await handleJoinRequest(requestId, userId, accept, canalId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("API ALIAS HANDLE JOIN REQUEST ROOT ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message =
      error instanceof Error && error.message ? error.message : "Impossible de traiter la demande d'adhésion."
    return NextResponse.json({ success: false, message }, { status })
  }
}
