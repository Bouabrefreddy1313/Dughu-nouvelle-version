/**
 * POST   /api/canal/messages/[canalId]  — envoyer un message dans un canal (multipart)
 *                                         OU modifier un message existant (si _action = "update")
 * DELETE /api/canal/messages/[canalId]  — supprimer un message (id = messageId)
 *
 * Note : [canalId] sert de canalId pour l'envoi et de messageId pour la
 * suppression/modification (le service frontend transmet le bon identifiant).
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { sendCanalMessage, updateCanalMessage, deleteCanalMessage } from "@/services/canal/canal.server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await getDughuUserIdFromCookies()
    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })
    }

    const formData = await req.formData()
    const action = String(formData.get("_action") || "send")
    formData.set("user_id", userId)

    if (action === "update") {
      // Modifier un message — id = messageId
      const result = await updateCanalMessage(id, formData)
      return NextResponse.json(result)
    }

    // Envoyer un message — id = canalId
    const result = await sendCanalMessage(id, formData)
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL MESSAGE SEND/UPDATE ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible d'envoyer le message."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await getDughuUserIdFromCookies()
    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })
    }

    // id = messageId
    const result = await deleteCanalMessage(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL MESSAGE DELETE ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de supprimer le message."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
