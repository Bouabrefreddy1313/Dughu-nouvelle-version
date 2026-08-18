import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, normalizeUser, pick } from "@/lib/dughu"
import { resolveDughuUserIdFromLocalId } from "@/lib/dughu-user"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const userId = (formData.get("userId") as string) || ""
    const file = formData.get("avatar") as File | null

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
    payload.append("avatar", file)
    const raw = await dughuApi.updateProfile(payload)
    const userObj = normalizeUser(raw?.result || raw?.user || raw?.data || raw?.profile || raw)
    const avatar =
      userObj?.avatar ||
      pick(raw?.result, "avatar", "image", "profile_image", "profileImage", "profile_picture") ||
      pick(raw, "avatar", "image", "profile_image", "profileImage", "profile_picture") ||
      pick(raw?.user, "avatar", "image", "profile_image", "profileImage", "profile_picture") ||
      ""
    if (avatar) {
      await prisma.user.update({ where: { id: userId }, data: { avatar } })
    }
    return NextResponse.json({ success: true, avatar })
  } catch (error) {
    console.error("AVATAR UPDATE ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}