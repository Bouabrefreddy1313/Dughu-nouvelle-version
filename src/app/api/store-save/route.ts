import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export async function POST(req: NextRequest) {
  try {
    const { postId, userId, dughuUserId: dughuUserIdParam } = await req.json()

    if (!postId || !userId) {
      return NextResponse.json({ success: false, message: "Paramètres requis." }, { status: 422 })
    }
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }
    let dughuUserId = String(dughuUserIdParam || "")
    if (!dughuUserId) {
      // Fallback serveur : lecture du cookie de session Dughu
      dughuUserId = await getDughuUserIdFromCookies()
    }
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }

    const raw = await dughuApi.savePost(dughuUserId, postId)
    if (raw?.success === false) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Erreur d'enregistrement (API Dughu)." },
        { status: 502 }
      )
    }
    const saved = raw?.saved ?? raw?.is_saved ?? true
    return NextResponse.json({ success: true, saved: !!saved })
  } catch (error) {
    console.error("STORE-SAVE ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur d'enregistrement." }, { status: 500 })
  }
}