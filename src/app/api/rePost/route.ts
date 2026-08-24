import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, mapPost, DughuApiError } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

interface RepostBody {
  userId?: string
  user_id?: string
  dughuUserId?: string
  postText?: string
  content?: string
  parentId?: string
  parent_id?: string
}

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
    let jsonBody: RepostBody | null = null
    if (!formData) {
      jsonBody = await req.json().catch(() => ({}))
    }
    const userId = String(
      formData?.get("userId") ||
        formData?.get("user_id") ||
        jsonBody?.userId ||
        jsonBody?.user_id ||
        ""
    )

    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }

    let dughuUserId =
      String(formData?.get("dughuUserId") || jsonBody?.dughuUserId || "")
    if (!dughuUserId) {
      // Fallback serveur : lecture du cookie de session Dughu
      dughuUserId = await getDughuUserIdFromCookies()
    }
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }

    const dForm = new FormData()
    dForm.append("user_id", String(dughuUserId))

    const postText =
      String(formData?.get("postText") || jsonBody?.postText || jsonBody?.content || "")
    if (postText.trim()) dForm.append("postText", postText.trim())

    const parentId =
      String(
        formData?.get("parentId") ||
          formData?.get("parent_id") ||
          jsonBody?.parentId ||
          jsonBody?.parent_id ||
          ""
      )
    if (parentId) dForm.append("parent_id", parentId)

    const raw = await dughuApi.createPost(dForm)
    if (!raw?.success) {
      return NextResponse.json({ success: false, message: raw?.message || "Erreur de republication (API Dughu)." }, { status: 502 })
    }

    const post = mapPost(raw?.post || raw?.result || raw?.data || raw)
    return NextResponse.json({ success: true, post }, { status: 201 })
  } catch (error) {
    console.error("REPOST ERROR:", error)
    if (error instanceof DughuApiError) {
      const apiMsg =
        (error.data as any)?.message ||
        (error.data as any)?.error ||
        error.message ||
        "Erreur de l'API Dughu."
      return NextResponse.json(
        { success: false, message: apiMsg },
        { status: error.status || 502 }
      )
    }
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}