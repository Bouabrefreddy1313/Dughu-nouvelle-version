import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, pick, DughuApiError, resolveMediaUrl, isDefaultDughuMedia } from "@/lib/dughu"

// Connexion Google via l'API Dughu (POST /auth/google { token }).
// Le navigateur obtient un Google ID token (Google Identity Services), l'API
// Dughu le vérifie auprès de Google puis renvoie l'utilisateur Dughu (créé à la
// volée s'il n'existe pas). La session est ensuite portée par les cookies Dughu.
export async function POST(req: NextRequest) {
  try {
    let token = ""
    try {
      const body = await req.json()
      token = typeof body?.token === "string" ? body.token : ""
    } catch {
      return NextResponse.json(
        { success: false, message: "Requête invalide (JSON attendu)." },
        { status: 400 }
      )
    }

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token Google requis." },
        { status: 422 }
      )
    }

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'authentification Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    // ── 1. Authentification via l'API Dughu (vérification du JWT Google) ──
    let auth: any = null
    try {
      auth = await dughuApi.googleAuth(token)
    } catch (err) {
      console.error("DUGHU GOOGLE AUTH ERROR:", err)
      if (err instanceof DughuApiError) {
        const data = err.data as any
        const msg =
          (Array.isArray(data?.messages) && data.messages.join(" ")) ||
          (Array.isArray(data?.error) && data.error.join(" ")) ||
          (data?.message && String(data.message)) ||
          (data?.error && typeof data.error === "string" && data.error) ||
          (typeof data === "string" ? data : null) ||
          err.message
        return NextResponse.json(
          { success: false, message: `Connexion Google impossible : ${msg}` },
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
        (auth?.error && String(auth.error)) ||
        "Connexion Google refusée par Dughu."
      return NextResponse.json({ success: false, message }, { status: 401 })
    }

    // ── 2. Extraction du profil Dughu ──
    const result = auth.result || auth.user || auth.data || auth
    const dughuUserId = String(pick(result, "user_id", "userId", "id", "ID") || "")
    if (!dughuUserId) {
      return NextResponse.json(
        { success: false, message: "Réponse Dughu invalide (ID utilisateur manquant)." },
        { status: 502 }
      )
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
    const onboardingCompleted = !!avatar && !isDefaultDughuMedia(avatar) && !!cover && !isDefaultDughuMedia(cover)

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

    // Session : token + ID Dughu en cookie (même mécanisme que /api/login)
    const sessionMaxAge = 30 * 24 * 60 * 60 // 30 jours
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
    console.error("GOOGLE LOGIN ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}