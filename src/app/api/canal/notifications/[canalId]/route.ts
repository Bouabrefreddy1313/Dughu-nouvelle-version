/**
 * DELETE /api/canal/notifications/[canalId]
 * Supprimer une notification de canal (canalId = notificationId).
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { deleteNotification } from "@/services/canal/canal.server"

export const dynamic = "force-dynamic"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ canalId: string }> }) {
  try {
    const { canalId: notificationId } = await params
    const { searchParams } = new URL(req.url)
    const userId = String(searchParams.get("userId") || "") || (await getDughuUserIdFromCookies())
    const canalId = String(searchParams.get("canalId") || "")

    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })
    }

    const result = await deleteNotification(notificationId, { userId, canalId })
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL DELETE NOTIFICATION ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de supprimer la notification."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
