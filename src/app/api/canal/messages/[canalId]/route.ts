/**
 * POST   /api/canal/messages/[canalId]  — envoyer un message dans un canal (multipart)
 *                                         OU modifier un message existant (si _action = "update")
 * DELETE /api/canal/messages/[canalId]  — supprimer un message (canalId sert de messageId ici)
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { sendCanalMessage, updateCanalMessage, deleteCanalMessage } from "@/services/canal/canal.server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: Promise<{ canalId: string }> }) {
  try {
    const { canalId } = await params
    const userId = await getDughuUserIdFromCookies()
    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })
    }

    const formData = await req.formData()
    const action = String(formData.get("_action") || "send")
    formData.set("user_id", userId)

    if (action === "update") {
      // Modifier un message — canalId = messageId
      const result = await updateCanalMessage(canalId, formData)
      return NextResponse.json(result)
    }

    // Envoyer un message — canalId = identifiant du canal
    const result = await sendCanalMessage(canalId, formData)
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL MESSAGE SEND/UPDATE ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible d'envoyer le message."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ canalId: string }> }) {
  try {
    const { canalId } = await params
    const userId = await getDughuUserIdFromCookies()
    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })
    }

    // canalId = messageId pour la suppression
    const result = await deleteCanalMessage(canalId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL MESSAGE DELETE ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de supprimer le message."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
