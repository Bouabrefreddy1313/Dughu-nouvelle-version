import { NextResponse } from "next/server"
import { dughuApi, normalizeUser, isDefaultDughuMedia } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

const DEFAULT_COVER = "/images/group/default-cover.jpg"

export async function GET() {
  try {
    // Session portée exclusivement par le cookie dughu_user_id
    const dughuUserId = await getDughuUserIdFromCookies()
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "Non connecté." }, { status: 401 })
    }

    const userObj = await dughuApi
      .getUser(dughuUserId, dughuUserId)
      .then((raw: any) => normalizeUser(raw?.user || raw?.data || raw?.profile || raw?.result || raw))
      .catch(() => null)
    if (!userObj) {
      return NextResponse.json({ success: false, message: "Session invalide." }, { status: 401 })
    }

    const username = userObj.username || ""
    const avatar = userObj.avatar || "/images/avatar.png"
    const cover = userObj.cover || DEFAULT_COVER

    return NextResponse.json({
      success: true,
      user: {
        id: dughuUserId,
        email: userObj.email || "",
        name: userObj.name || username || "Utilisateur",
        firstName: userObj.firstName || "",
        lastName: userObj.lastName || "",
        username,
        avatar,
        image: avatar,
        cover,
        bio: userObj.bio || "",
        _count: { posts: 0, followers: 0, following: 0 },
        followers: [],
        following: [],
        onboardingCompleted:
          !!avatar && !isDefaultDughuMedia(avatar) &&
          !!cover && !isDefaultDughuMedia(cover),
        dughu: { userId: dughuUserId, username },
      },
    })
  } catch (error) {
    console.error("AUTH ME ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}