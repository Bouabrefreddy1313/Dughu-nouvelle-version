import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, normalizeUser, pick } from "@/lib/dughu"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, bio, firstName, lastName, username, gender, birthdate, phone } = body

    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
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

    const formData = new FormData()
    formData.append("user_id", String(localUser.dughuId))
    if (typeof firstName === "string") formData.append("first_name", firstName)
    if (typeof lastName === "string") formData.append("last_name", lastName)
    if (typeof bio === "string") formData.append("bio", bio)
    if (typeof bio === "string") formData.append("about", bio)
    if (typeof gender === "string") formData.append("gender", gender)
    if (typeof birthdate === "string") formData.append("birthday", birthdate)
    if (typeof phone === "string") formData.append("phone", phone)

    const raw = await dughuApi.updateProfile(formData)
    const userObj = normalizeUser(raw?.user || raw?.data || raw?.profile || raw?.result || raw)

    return NextResponse.json({
      success: true,
      user: {
        id: String(userId),
        firstName,
        lastName,
        name: [firstName, lastName].filter(Boolean).join(" ").trim() || pick(raw, "name", "full_name") || "",
        username: username ?? pick(raw, "username", "user_name") ?? "",
        bio: bio ?? pick(raw, "bio", "about") ?? "",
        gender: gender ?? pick(raw, "gender") ?? "",
        birthdate: birthdate || null,
        phone: phone ?? pick(raw, "phone") ?? "",
        ...(userObj || {}),
      },
      raw,
    })
  } catch (error) {
    console.error("PROFILE UPDATE ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur lors de la mise à jour." }, { status: 500 })
  }
}