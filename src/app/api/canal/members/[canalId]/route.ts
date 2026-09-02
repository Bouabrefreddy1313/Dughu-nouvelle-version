/**
 * GET  /api/canal/members/[canalId] — liste des membres d'un canal
 * POST /api/canal/members/[canalId] — accepter/refuser une demande d'adhésion (id = requestId)
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { getAdherents, handleJoinRequest } from "@/services/canal/canal.server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ canalId: string }> }) {
  try {
    const { canalId } = await params
    const members = await getAdherents(canalId)
    return NextResponse.json({ success: true, members })
  } catch (error) {
    console.error("CANAL MEMBERS ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de charger les membres."
    return NextResponse.json({ success: false, message, members: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ canalId: string }> }) {
  try {
    const { canalId: requestId } = await params
    const body = await req.json().catch(() => ({}))
    const accept = Boolean(body?.accept)
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })
    }

    const result = await handleJoinRequest(requestId, userId, accept)
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL HANDLE JOIN REQUEST ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de traiter la demande."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
