import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, pick, DughuApiError, resolveMediaUrl, isDefaultDughuMedia } from "@/lib/dughu"

export async function POST(req: NextRequest) {
  try {
    const { login, password, remember } = await req.json()

    if (!login || !password) {
      return NextResponse.json({ success: false, message: "Identifiants requis." }, { status: 422 })
    }

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'authentification Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    // ── 1. Authentification via l'API Dughu (source de vérité) ──
    let auth: any = null
    try {
      auth = await dughuApi.login(login, password)
    } catch (err) {
      console.error("DUGHU LOGIN ERROR:", err)
      if (err instanceof DughuApiError) {
        const data = err.data as any
        const msg =
          (Array.isArray(data?.messages) && data.messages.join(" ")) ||
          (data?.message && String(data.message)) ||
          (typeof data === "string" ? data : null) ||
          err.message
        return NextResponse.json(
          { success: false, message: msg },
          { status: err.status || 502 }
        )
      }
      return NextResponse.json(
        { success: false, message: "Impossible de joindre l'API Dughu." },
        { status: 502 }
      )
    }

    if (!auth?.success) {
      const message =
        (auth?.message && String(auth.message)) ||
        (auth?.messages && Object.values(auth.messages).flat().join(" ")) ||
        "Identifiants incorrects."
      return NextResponse.json({ success: false, message }, { status: 401 })
    }

    const result = auth.result || auth || {}
    const dughuUserId = String(pick(result, "user_id", "userId", "id", "ID") || "")
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "Réponse Dughu invalide." }, { status: 502 })
    }

    const dughuUsername = String(pick(result, "username", "user_name", "userName", "slug") || "")
    const dughuToken = String(pick(result, "token", "access_token", "api_token") || "")

    // Profil frais depuis l'API (meilleure source de vérité que la réponse login)
    let profile: any = result
    try {
      const raw = await dughuApi.getUser(dughuUserId, dughuUserId)
      profile = raw?.user || raw?.data || raw?.profile || raw?.result || raw || result
    } catch {
      // reutilise la réponse login
    }

    const pEmail = String(pick(profile, "email", "mail") || "")
    const pFirstName = String(pick(profile, "first_name", "firstName") || "")
    const pLastName = String(pick(profile, "last_name", "lastName") || "")
    const pAvatar = resolveMediaUrl(String(pick(profile, "avatar", "profileImage", "photo") || ""))
    const pCover = resolveMediaUrl(String(pick(profile, "cover", "coverImage") || ""))
    const pName = String(pick(profile, "name", "full_name") || "") || `${pFirstName} ${pLastName}`.trim()

    const avatar = pAvatar || "/images/avatar.png"
    const cover = pCover || "/images/group/default-cover.jpg"
    const onboardingCompleted =
      !!avatar && !isDefaultDughuMedia(avatar) &&
      !!cover && !isDefaultDughuMedia(cover)

    const response = NextResponse.json({
      success: true,
      user: {
        id: dughuUserId,
        email: pEmail,
        name: pName || dughuUsername || "Utilisateur",
        firstName: pFirstName,
        lastName: pLastName,
        username: dughuUsername,
        avatar,
        image: avatar,
        cover,
        bio: String(pick(profile, "bio", "about") || ""),
        _count: { posts: 0, followers: 0, following: 0 },
        followers: [],
        following: [],
        dughu: { userId: dughuUserId, token: dughuToken, username: dughuUsername },
        onboardingCompleted,
      },
      redirect: onboardingCompleted ? "/home" : "/onboarding/profile",
    })

    // Session : token + ID Dughu en cookie (source de vérité)
    const sessionMaxAge = remember ? 365 * 24 * 60 * 60 : 30 * 24 * 60 * 60
    response.cookies.set("dughu_token", dughuToken || "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionMaxAge,
    })
    response.cookies.set("dughu_user_id", dughuUserId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionMaxAge,
    })

    return response
  } catch (error) {
    console.error("LOGIN ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}