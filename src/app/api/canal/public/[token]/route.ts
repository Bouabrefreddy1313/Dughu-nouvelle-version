/**
 * GET /api/canal/public/[token]
 * Ouvrir / accéder à un canal public via son slug ou token.
 */

import { NextRequest, NextResponse } from "next/server"
import { accessPublicCanal } from "@/services/canal/canal.server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.json({ success: false, message: "Token requis." }, { status: 400 })
    }
    const result = await accessPublicCanal(token)
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL PUBLIC ACCESS ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible d'accéder au canal."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
