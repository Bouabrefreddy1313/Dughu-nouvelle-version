import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, normalizeUser, pick } from "@/lib/dughu"
import { resolveDughuUserIdFromLocalId } from "@/lib/dughu-user"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, dughuUserId: dughuUserIdParam, bio, firstName, lastName, username, gender, birthdate, phone } = body

    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }
    let dughuUserId = String(dughuUserIdParam || "")
    if (!dughuUserId) {
      // Fallback serveur : résolution de l'ID Dughu depuis le compte local.
      dughuUserId = await resolveDughuUserIdFromLocalId(userId)
    }
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const formData = new FormData()
    formData.append("user_id", String(dughuUserId))
    if (typeof firstName === "string") formData.append("first_name", firstName)
    if (typeof lastName === "string") formData.append("last_name", lastName)
    if (typeof bio === "string") formData.append("bio", bio)
    if (typeof bio === "string") formData.append("about", bio)
    if (typeof gender === "string") formData.append("gender", gender)
    if (typeof birthdate === "string") formData.append("birthday", birthdate)
    if (typeof phone === "string") formData.append("phone", phone)

    const raw = await dughuApi.updateProfile(formData)
    const userObj = normalizeUser(raw?.user || raw?.data || raw?.profile || raw?.result || raw)

    // ── Miroir local : répercuter les champs poussés vers Dughu sur le compte
    // local, sinon l'accueil (alimenté par le miroir Prisma) diverge du profil
    // jusqu'à la prochaine synchronisation de connexion.
    try {
      const localUser = await prisma.user.findUnique({ where: { id: String(userId) } })
      const patch: Record<string, any> = {}
      if (typeof firstName === "string") patch.firstName = firstName || null
      if (typeof lastName === "string") patch.lastName = lastName || null
      const newName =
        [firstName, lastName].filter(Boolean).join(" ").trim() ||
        pick(raw?.user ?? raw, "name", "full_name") || ""
      if (newName && localUser?.name !== newName) patch.name = newName
      if (typeof bio === "string") patch.bio = bio || null
      if (typeof gender === "string") patch.gender = gender || null
      if (typeof phone === "string") patch.phone = phone || null
      if (typeof birthdate === "string" && birthdate) {
        const d = new Date(birthdate)
        if (!Number.isNaN(d.getTime())) patch.birthdate = d
      }
      // username/avatar/cover si Dughu les renvoie dans sa réponse
      if (userObj?.username && localUser?.username !== userObj.username) {
        const owner = await prisma.user.findUnique({ where: { username: userObj.username } })
        const slugOwner = await prisma.user.findUnique({ where: { slug: userObj.username } })
        if ((!owner || owner.id === String(userId)) && (!slugOwner || slugOwner.id === String(userId))) {
          patch.username = userObj.username
          patch.slug = userObj.username
        }
      }
      if (userObj?.avatar && userObj.avatar !== "/images/avatar.png" && localUser?.avatar !== userObj.avatar) {
        patch.avatar = userObj.avatar
      }
      if (userObj?.cover && userObj.cover !== "/images/group/default-cover.jpg" && localUser?.cover !== userObj.cover) {
        patch.cover = userObj.cover
      }
      if (localUser && Object.keys(patch).length > 0) {
        await prisma.user.update({ where: { id: String(userId) }, data: patch })
      }
    } catch (mirrorErr) {
      console.error("PROFILE UPDATE LOCAL MIRROR ERROR:", mirrorErr)
    }

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