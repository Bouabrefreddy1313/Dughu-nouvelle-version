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

    // ── Mode Dughu API ──
    if (dughu.enabled) {
      try {
        const localUser = await prisma.user.findUnique({ where: { id: userId }, select: { dughuId: true } })
        if (localUser?.dughuId) {
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
          const userObj = normalizeUser(raw?.user || raw?.data || raw?.profile || raw)

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
        }
        // Pas de compte Dughu → mise à jour locale
      } catch (err) {
        if (err instanceof Error && err.message.includes("DUGHU_API_KEY manquant")) throw err
        console.error("DUGHU PROFILE UPDATE ERROR:", err)
        // fallback mise à jour locale
      }
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (!existing) {
      return NextResponse.json({ success: false, message: "Utilisateur introuvable." }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (typeof bio === "string") data.bio = bio
    if (typeof firstName === "string") data.firstName = firstName
    if (typeof lastName === "string") data.lastName = lastName
    if (typeof gender === "string") data.gender = gender
    if (typeof birthdate === "string" && birthdate) data.birthdate = new Date(birthdate)
    if (birthdate === "") data.birthdate = null
    if (typeof phone === "string") data.phone = phone

    if (firstName !== undefined || lastName !== undefined) {
      const f = typeof firstName === "string" && firstName ? firstName : existing.firstName || ""
      const l = typeof lastName === "string" && lastName ? lastName : existing.lastName || ""
      data.name = `${f} ${l}`.trim()
    }

    if (typeof username === "string" && username.trim()) {
      const cleanUsername = username.trim().replace(/\s+/g, "_")
      if (cleanUsername !== existing.username) {
        const taken = await prisma.user.findFirst({
          where: { username: cleanUsername, NOT: { id: userId } },
        })
        if (taken) {
          return NextResponse.json({ success: false, message: "Ce nom d'utilisateur est déjà pris." }, { status: 422 })
        }
        data.username = cleanUsername
        data.slug = cleanUsername
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        username: true,
        slug: true,
        bio: true,
        gender: true,
        birthdate: true,
        phone: true,
        avatar: true,
        cover: true,
        email: true,
      },
    })

    return NextResponse.json({ success: true, user: updated })
  } catch (error) {
    console.error("PROFILE UPDATE ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur lors de la mise à jour." }, { status: 500 })
  }
}