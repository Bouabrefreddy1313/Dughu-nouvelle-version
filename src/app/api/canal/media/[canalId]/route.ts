/**
 * GET /api/canal/media/[canalId]
 * Liste des médias d'un canal.
 */

import { NextRequest, NextResponse } from "next/server"
import { getCanalMedia } from "@/services/canal/canal.server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ canalId: string }> }) {
  try {
    const { canalId } = await params
    const media = await getCanalMedia(canalId)
    return NextResponse.json({ success: true, media })
  } catch (error) {
    console.error("CANAL MEDIA ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de charger les médias."
    return NextResponse.json({ success: false, message, media: [] }, { status: 500 })
  }
}
