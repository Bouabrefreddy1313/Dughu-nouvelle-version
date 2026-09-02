/**
 * GET /api/canal/documents/[canalId]
 * Liste des documents d'un canal.
 */

import { NextRequest, NextResponse } from "next/server"
import { getCanalDocuments } from "@/services/canal/canal.server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ canalId: string }> }) {
  try {
    const { canalId } = await params
    const documents = await getCanalDocuments(canalId)
    return NextResponse.json({ success: true, documents })
  } catch (error) {
    console.error("CANAL DOCUMENTS ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de charger les documents."
    return NextResponse.json({ success: false, message, documents: [] }, { status: 500 })
  }
}
