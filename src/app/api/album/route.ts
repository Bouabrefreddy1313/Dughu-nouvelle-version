import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, mapAlbums } from "@/lib/dughu"
import { resolveDughuUserIdFromLocalId } from "@/lib/dughu-user"

export async function POST(req: NextRequest) {
  try {
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const contentType = req.headers.get("content-type") || ""
    const formData = contentType.includes("multipart/form-data") ? await req.formData() : null
    let jsonBody: Record<string, unknown> | null = null
    if (!formData) {
      jsonBody = await req.json().catch(() => ({}))
    }
    const userId = String(formData?.get("userId") || formData?.get("user_id") || jsonBody?.userId || jsonBody?.user_id || "")

    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }

    let dughuUserId = String(formData?.get("dughuUserId") || jsonBody?.dughuUserId || "")
    // Fallback serveur : résolution de l'ID Dughu depuis le compte local.
    if (!dughuUserId && userId) {
      dughuUserId = await resolveDughuUserIdFromLocalId(userId)
    }
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 401 })
    }

    const raw = await dughuApi.getAlbums(dughuUserId)
    if (!raw?.success) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Erreur de récupération des albums (API Dughu)." },
        { status: 502 }
      )
    }

    const albums = mapAlbums(raw)
    return NextResponse.json({ success: true, albums })
  } catch (error) {
    console.error("ALBUMS ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}