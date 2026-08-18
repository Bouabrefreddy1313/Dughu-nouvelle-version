import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, normalizeUser, pick } from "@/lib/dughu"
import { resolveDughuUserIdFromLocalId } from "@/lib/dughu-user"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const userId = (formData.get("userId") as string) || ""
    const file = formData.get("cover") as File | null

    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }
    if (!file || !file.size) {
      return NextResponse.json({ success: false, message: "Image requise." }, { status: 422 })
    }

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    let dughuUserId = String(formData.get("dughuUserId") || "")
    if (!dughuUserId) {
      // Fallback serveur : résolution de l'ID Dughu depuis le compte local.
      dughuUserId = await resolveDughuUserIdFromLocalId(userId)
    }
    if (!dughuUserId) {
      return NextResponse.json(
        { success: false, message: "ID Dughu requis." },
        { status: 404 }
      )
    }

    const payload = new FormData()
    payload.append("user_id", String(dughuUserId))
    payload.append("background", file)
    const raw = await dughuApi.updateProfile(payload)
    const userObj = normalizeUser(raw?.result || raw?.user || raw?.data || raw?.profile || raw)
    const cover =
      userObj?.cover !== "/images/group/default-cover.jpg" && userObj?.cover
        ? userObj.cover
        : pick(raw?.result, "cover", "background", "cover_image", "coverImage", "banner") ||
          pick(raw, "cover", "background", "cover_image", "coverImage", "banner") ||
          pick(raw?.user, "cover", "background", "cover_image", "coverImage", "banner") ||
          ""
    if (cover) {
      await prisma.user.update({ where: { id: userId }, data: { cover } })
    }
    return NextResponse.json({ success: true, cover })
  } catch (error) {
    console.error("COVER UPDATE ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}