import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, pick, DughuApiError, resolveMediaUrl } from "@/lib/dughu"
import { syncLocalUserFromDughu } from "@/lib/dughu-user"

// Connexion Google via l'API Dughu (POST /auth/google { token }).
// Le navigateur obtient un Google ID token (Google Identity Services), l'API
// Dughu le vérifie auprès de Google puis renvoie l'utilisateur Dughu (créé à la
// volée s'il n'existe pas). On résout/crée ensuite le compte local et la session,
// exactement comme /api/login.
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

    // ── 2. Extraction du profil Dughu (formes multiples selon l'API) ──
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
    const dughuProfile: Record<string, any> = result

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    // ── 3. Résolution du compte local par email (plus de dughuId en base) ──
    const pEmail = String(pick(dughuProfile, "email", "mail", "user_email", "emailAddress") || "")
    let user = pEmail && emailRegex.test(pEmail)
      ? await prisma.user.findUnique({ where: { email: pEmail } })
      : null

    // 3b. Aucun compte local → en créer un lié au compte Dughu (pattern /api/login)
    if (!user) {
      const pFirstName = String(pick(dughuProfile, "first_name", "firstName", "firstname", "prenom", "prenoms") || "")
      const pLastName = String(pick(dughuProfile, "last_name", "lastName", "lastname", "nom") || "")
      const pName = String(pick(dughuProfile, "name", "full_name", "fullName", "nickname") || "")
      const pAvatar = String(pick(dughuProfile, "avatar", "profile_image", "profile_picture", "profileImage", "photo", "image") || "")

      const finalEmail =
        pEmail && emailRegex.test(pEmail)
          ? pEmail
          : `${dughuUserId}@dughu.local`

      let localUsername =
        dughuUsername ||
        (pName ? pName.replace(/\s+/g, "-").toLowerCase() : "") ||
        (pFirstName && pLastName ? `${pFirstName}-${pLastName}`.toLowerCase() : "") ||
        `user-${dughuUserId}`
      if (await prisma.user.findUnique({ where: { username: localUsername } })) {
        localUsername = `${localUsername}-${dughuUserId}`
      }

      user = await prisma.user.create({
        data: {
          email: finalEmail,
          username: localUsername,
          slug: localUsername,
          firstName: pFirstName || null,
          lastName: pLastName || null,
          name: pName || `${pFirstName} ${pLastName}`.trim() || localUsername,
          avatar: pAvatar || "/images/avatar.png",
          active: "1",
          emailVerified: new Date(),
        },
      })
      console.log("GOOGLE AUTH: Local user created:", user.id)
    }

    // Mise à jour lastSeen
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeen: new Date(), lastseen: new Date() },
    })

    // ── 3bis. Synchronisation du miroir local depuis Dughu (source de vérité) ──
    // Même logique que /api/login : aligne nom, username, avatar et cover du
    // miroir local sur les données fraîches de Dughu à chaque connexion.
    try {
      const syncedUser = await syncLocalUserFromDughu(user.id, dughuUserId, dughuProfile)
      if (syncedUser) user = syncedUser
    } catch (syncErr) {
      console.error("GOOGLE AUTH SYNC ERROR:", syncErr)
    }
    if (!user) {
      return NextResponse.json({ success: false, message: "Utilisateur introuvable." }, { status: 500 })
    }

    // ── 4. Infos Dughu pour la réponse ──
    const dughuInfo: Record<string, unknown> = {
      userId: dughuUserId,
      token: dughuToken || "",
      username: dughuUsername || user.username || "",
    }

    const [followersCount, followingCount, postsCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
      prisma.post.count({ where: { authorId: user.id } }),
    ])

    const response = NextResponse.json({
      success: true,
      user: {
        id: dughuUserId,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        avatar: resolveMediaUrl(user.avatar || "") || "/images/avatar.png",
        image: resolveMediaUrl(user.image || user.avatar || "") || "/images/avatar.png",
        cover: resolveMediaUrl(user.cover || "") || "/images/group/default-cover.jpg",
        bio: user.bio,
        _count: {
          posts: postsCount,
          followers: followersCount,
          following: followingCount,
        },
        followers: [],
        following: [],
        dughu: dughuInfo,
      },
      redirect: "/home",
    })

    // ── 5. Session : token Dughu en cookie (même mécanisme que /api/login) ──
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

