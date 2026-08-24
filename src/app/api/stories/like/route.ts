import { NextRequest, NextResponse } from "next/server"
import { flashEnabled, toggleStoryLike } from "@/lib/flash-service"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/**
 * « J'aime » / « je n'aime plus » une story Flash.
 * Encapsule POST /toggleLikeStory (API Dughu).
 */
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

    if (!userId) {
      userId = await getDughuUserIdFromCookies()
    }
    if (!storyId) {
      return NextResponse.json({ success: false, message: "storyId requis." }, { status: 422 })
    }
    if (!userId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }

    const result = await toggleStoryLike(userId, storyId)
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message || "Erreur réaction (API Dughu)." }, { status: 502 })
    }
    return NextResponse.json({ success: true, liked: result.liked })
  } catch (error) {
    console.error("STORY LIKE ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur de réaction." }, { status: 500 })
  }
}
