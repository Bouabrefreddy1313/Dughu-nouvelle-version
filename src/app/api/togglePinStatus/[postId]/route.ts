import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi } from "@/lib/dughu"
import { resolveDughuUserIdFromLocalId } from "@/lib/dughu-user"

export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId || "")
    let dughuUserId = String(body?.dughuUserId || "")

    if (!dughuUserId && userId) {
      dughuUserId = await resolveDughuUserIdFromLocalId(userId)
    }
    if (!dughuUserId) {
      // Repli : résolution via la session cookie (aucun body envoyé par le client).
      const cookiesModule = await import("next/headers")
      const cookies = await cookiesModule.cookies()
      const token =
        cookies.get("next-auth.session-token")?.value ||
        cookies.get("__Secure-next-auth.session-token")?.value
      if (token) {
        const session = await prisma.session.findUnique({ where: { sessionToken: token } }).catch(() => null)
        if (session) dughuUserId = await resolveDughuUserIdFromLocalId(session.userId)
      }
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
