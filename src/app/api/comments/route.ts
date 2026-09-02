import { NextRequest, NextResponse } from "next/server"
import { listCommentsForPost, addCommentToDughu } from "@/services/posts/comments.server"

/**
 * Route Handler /api/comments â€” volontairement lÃ©ger :
 *  1. lire la requÃªte ; 2. valider les paramÃ¨tres ;
 *  3. appeler le service serveur ; 4. convertir en NextResponse.
 * La logique Dughu (pagination, rÃ©solution de parent, normalisation) vit dans
 * src/services/posts/comments.server.ts.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const postId = searchParams.get("postId")
    const userId = searchParams.get("userId")
    if (!postId) {
      return NextResponse.json({ success: false, message: "postId requis." }, { status: 422 })
    }

    const result = await listCommentsForPost(String(postId), userId || "")
    return NextResponse.json(
      { success: result.success, message: result.message, comments: result.comments },
      { status: result.status || (result.success ? 200 : 500) }
    )
  } catch (error) {
    console.error("LOAD COMMENTS ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Parser multipart (avec piÃ¨ces jointes) ou JSON
    const contentType = req.headers.get("content-type") || ""
    let postId = ""
    let userId = ""
    let dughuUserIdVar = ""
    let content = ""
    let parentId: string | null = null
    const files: File[] = []

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      postId = String(formData.get("postId") || "")
      userId = String(formData.get("userId") || "")
      dughuUserIdVar = String(formData.get("dughuUserId") || "")
      content = String(formData.get("content") || "")
      const rawParent = formData.get("parentId")
      parentId = rawParent ? String(rawParent) : null
      const isFile = (v: FormDataEntryValue | null): v is File =>
        !!v && typeof v !== "string" && "arrayBuffer" in v
      for (const v of formData.getAll("files")) if (isFile(v)) files.push(v)
      for (const v of ["images", "videos"] as const) {
        for (const f of formData.getAll(v)) if (isFile(f)) files.push(f)
      }
    } else {
      const body = await req.json()
      postId = body.postId || ""
      userId = body.userId || ""
      dughuUserIdVar = body.dughuUserId || ""
      content = body.content || ""
      parentId = body.parentId || null
    }

    const file = files[0] || null

    if (!postId || !userId) {
      return NextResponse.json({ success: false, message: "ParamÃ¨tres requis." }, { status: 422 })
    }
    if (!content?.trim() && !file) {
      return NextResponse.json({ success: false, message: "Commentaire vide." }, { status: 422 })
    }
    if (content.length > 1000) {
      return NextResponse.json({ success: false, message: "Commentaire trop long (1000 max)." }, { status: 422 })
    }

    const result = await addCommentToDughu({ postId, userId, dughuUserId: dughuUserIdVar, content, parentId, file })
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status || 502 }
      )
    }
    return NextResponse.json({ success: true, comment: result.comment }, { status: result.status || 201 })
  } catch (error) {
    console.error("COMMENT ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
