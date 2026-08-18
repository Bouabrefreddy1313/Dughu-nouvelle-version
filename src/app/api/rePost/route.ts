import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, mapPost } from "@/lib/dughu"
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
    const userId = String(formData?.get("user_id") || (await req.json().then((b: {user_id: string}) => b.user_id).catch(() => "") ) || "")

    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }

    const user = formData
      ? { dughuUserId: String(formData.get("dughuUserId") || "") }
      : { dughuUserId: await req.json().then((b: { dughuUserId?: string }) => b.dughuUserId || "").catch(() => "") }
    let dughuUserId = user?.dughuUserId || ""
    if (!dughuUserId) {
      // Fallback serveur : résolution de l'ID Dughu depuis le compte local.
      dughuUserId = await resolveDughuUserIdFromLocalId(userId)
    }
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }

    const dForm = new FormData()
    dForm.append("user_id", String(dughuUserId))

    const postText = (formData?.get("postText") as string) || ""
    if (postText.trim()) dForm.append("postText", postText.trim())

    const parentId = (formData?.get("parentId") as string) || (formData?.get("parent_id") as string) || ""
    if (parentId) dForm.append("parent_id", parentId)

    const raw = await dughuApi.createPost(dForm)
    if (!raw?.success) {
      return NextResponse.json({ success: false, message: raw?.message || "Erreur de republication (API Dughu)." }, { status: 502 })
    }

    const post = mapPost(raw?.post || raw?.result || raw?.data || raw)
    return NextResponse.json({ success: true, post }, { status: 201 })
  } catch (error) {
    console.error("REPOST ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}