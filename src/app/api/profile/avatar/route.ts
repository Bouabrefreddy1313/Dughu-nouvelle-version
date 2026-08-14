import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, normalizeUser, pick } from "@/lib/dughu"

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

    const localUser = await prisma.user.findUnique({ where: { id: userId }, select: { dughuId: true } })
    if (!localUser?.dughuId) {
      return NextResponse.json(
        { success: false, message: "Votre compte n'est pas lié à un compte Dughu." },
        { status: 404 }
      )
    }

    const payload = new FormData()
    payload.append("user_id", String(localUser.dughuId))
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