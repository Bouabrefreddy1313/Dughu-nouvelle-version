import { NextRequest, NextResponse } from "next/server"
import { flashEnabled, logStoryView, getStoryViewers } from "@/lib/flash-service"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/**
 * Enregistre une vue (POST) et liste les vues d'une story (GET, auteur).
 * Encapsule POST /logView et GET /logView (API Dughu).
 */
export async function GET(req: NextRequest) {
  try {
    if (!flashEnabled) {
      return NextResponse.json({ success: true, viewers: [] })
    }
    const { searchParams } = new URL(req.url)
    const storyId = searchParams.get("storyId") || searchParams.get("story_id") || ""
    let userId = searchParams.get("userId") || searchParams.get("user_id") || ""
    if (!userId) userId = await getDughuUserIdFromCookies()
    if (!storyId) {
      return NextResponse.json({ success: false, message: "storyId requis." }, { status: 422 })
    }
    const viewers = await getStoryViewers(storyId, userId || undefined)
    return NextResponse.json({ success: true, viewers })
  } catch (error) {
    console.error("STORY VIEWERS ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur du chargement des vues." }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!flashEnabled) {
      return NextResponse.json({ success: false, message: "L'API Dughu n'est pas configurée." }, { status: 500 })
    }
    const contentType = req.headers.get("content-type") || ""
    let storyId = ""
    let userId = ""
    if (contentType.includes("multipart/form-data")) {
      const fd = await req.formData()
      storyId = String(fd.get("storyId") || fd.get("story_id") || "")
      userId = String(fd.get("userId") || fd.get("user_id") || "")
    } else {
      const body = await req.json().catch(() => ({}))
      storyId = String(body?.storyId || body?.story_id || "")
      userId = String(body?.userId || body?.user_id || "")
    }
    if (!userId) userId = await getDughuUserIdFromCookies()
    if (!storyId) {
      return NextResponse.json({ success: false, message: "storyId requis." }, { status: 422 })
    }
    if (!userId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }
    const result = await logStoryView(userId, storyId)
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message || "Erreur vue (API Dughu)." }, { status: 502 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("STORY VIEW ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur vue." }, { status: 500 })
  }
}
