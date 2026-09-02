import { NextRequest, NextResponse } from "next/server"
import { capsuleEnabled, trackCapsuleView } from "@/lib/capsule-service"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/** IP du client déduite des en-têtes de proxy (champ `ip` requis par /trackView). */
function clientIpFrom(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  return req.headers.get("x-real-ip")?.trim() || ""
}

/**
 * POST /api/capsules/[id]/view — enregistre une vue (POST /trackView Dughu).
 * Body : { userId? }.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!capsuleEnabled) {
      return NextResponse.json({ success: false, message: "L'API Dughu n'est pas configurée." }, { status: 500 })
    }
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    let userId = String(body?.userId || body?.user_id || "")
    if (!userId) userId = await getDughuUserIdFromCookies()
    if (!id) {
      return NextResponse.json({ success: false, message: "capsuleId requis." }, { status: 422 })
    }
    if (!userId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }
    const result = await trackCapsuleView(id, userId, clientIpFrom(req))
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("CAPSULE VIEW ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur lors de l'enregistrement de la vue." }, { status: 500 })
  }
}
