import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId || "")
    let dughuUserId = String(body?.dughuUserId || "")

    if (!dughuUserId) {
      // Repli : lecture du cookie de session Dughu
      dughuUserId = await getDughuUserIdFromCookies()
    }

    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const raw = await dughuApi.togglePinStatus(dughuUserId, postId)
    if (raw?.success === false) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Impossible d'épingler (API Dughu)." },
        { status: 403 }
      )
    }
    const pinned = raw?.pinned ?? raw?.is_pinned ?? true
    return NextResponse.json({ success: true, pinned: !!pinned })
  } catch (error) {
    console.error("TOGGLE PIN ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur lors de l'épinglage." }, { status: 500 })
  }
}
