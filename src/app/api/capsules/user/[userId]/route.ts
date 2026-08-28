import { NextRequest, NextResponse } from "next/server"
import { capsuleEnabled, fetchUserCapsules } from "@/lib/capsule-service"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/**
 * GET /api/capsules/user/[userId] — capsules d'un utilisateur
 * (GET /shortsUser/{user_id} Dughu). Query : viewerId?.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    if (!capsuleEnabled) {
      return NextResponse.json({ success: true, capsules: [] })
    }
    const { userId: targetUserId } = await params
    if (!targetUserId) {
      return NextResponse.json({ success: false, message: "userId requis." }, { status: 422 })
    }
    const { searchParams } = new URL(req.url)
    const viewerId = searchParams.get("viewerId") || (await getDughuUserIdFromCookies()) || undefined
    const capsules = await fetchUserCapsules(targetUserId, viewerId)
    return NextResponse.json({ success: true, capsules })
  } catch (error) {
    console.error("CAPSULES USER ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur lors du chargement des capsules." }, { status: 500 })
  }
}
