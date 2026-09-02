/**
 * GET  /api/canal/[id] — détail complet d'un canal
 * POST /api/canal/[id] — supprimer un canal (body: { userId, password, _method: "DELETE" })
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { getCanalDetail, deleteCanal } from "@/services/canal/canal.server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, message: "Identifiant canal requis." }, { status: 400 })
    }
    const result = await getCanalDetail(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL DETAIL ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de charger le canal."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const method = String(body?._method || "").toUpperCase()

    if (method !== "DELETE") {
      return NextResponse.json({ success: false, message: "Méthode non supportée." }, { status: 405 })
    }

    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())
    const password = String(body?.password || "")

    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })
    }
    if (!password) {
      return NextResponse.json({ success: false, message: "Mot de passe requis pour supprimer le canal." }, { status: 422 })
    }

    const result = await deleteCanal(id, userId, password)
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL DELETE ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de supprimer le canal."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
