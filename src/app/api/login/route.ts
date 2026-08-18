import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dughu, dughuApi, pick, DughuApiError, resolveMediaUrl } from '@/lib/dughu'
import { syncLocalUserFromDughu } from '@/lib/dughu-user'

export async function POST(req: NextRequest) {
  try {
    const { login, password, remember } = await req.json()

    if (!login || !password) {
      return NextResponse.json({ success: false, message: 'Identifiants requis.' }, { status: 422 })
    }

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: 'L\'authentification Dughu n\'est pas configurée.' },
        { status: 500 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^[0-9]{8,}$/

    // ── 1. Authentification obligatoire via l'API Dughu ──
    let auth: any = null
    try {
      auth = await dughuApi.login(login, password)
    } catch (err) {
      console.error('DUGHU LOGIN ERROR:', err)
      // Si l'API Dughu répond avec une erreur métier (ex: mauvais mot de passe),
      // on renvoie le vrai message au lieu d'un message générique.
      if (err instanceof DughuApiError) {
        const data = err.data as any
        const msg =
          (Array.isArray(data?.messages) && data.messages.join(' ')) ||
          (data?.message && String(data.message)) ||
          (typeof data === 'string' ? data : null) ||
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
        (auth?.messages && Object.values(auth.messages).flat().join(' ')) ||
        'Identifiants incorrects.'
      return NextResponse.json({ success: false, message }, { status: 401 })
    }

    const result = auth.result || auth || {}
    const dughuUserId = String(pick(result, "user_id", "userId", "id", "ID") || "")
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: 'Réponse Dughu invalide.' }, { status: 502 })
    }

    const dughuUsername = String(pick(result, "username", "user_name", "userName", "slug") || "")
    const dughuToken = String(pick(result, "token", "access_token", "api_token") || "")
    const dughuProfile: Record<string, any> = result

    // ── 2. Résolution du compte local lié à l'email/username (plus de dughuId en base) ──
    let user = null

    if (emailRegex.test(login)) {
      user = await prisma.user.findUnique({ where: { email: login } })
      console.log("LOGIN: looking by login email:", login, "| found:", !!user)
    }
    if (!user && dughuProfile) {
      const pEmail = String(pick(dughuProfile, "email", "mail", "user_email", "emailAddress") || "")
      if (pEmail && emailRegex.test(pEmail)) {
        user = await prisma.user.findUnique({ where: { email: pEmail } })
        console.log("LOGIN: looking by profile email:", pEmail, "| found:", !!user)
      }
    }
    if (!user && !phoneRegex.test(login.replace(/\s/g, ''))) {
      user = await prisma.user.findUnique({ where: { username: login } })
      console.log("LOGIN: looking by username login:", login, "| found:", !!user)
    }
    if (!user && dughuUsername) {
      user = await prisma.user.findUnique({ where: { username: dughuUsername } })
      console.log("LOGIN: looking by dughuUsername:", dughuUsername, "| found:", !!user)
    }

    // 2b. Aucun compte local → créer un compte local lié au compte Dughu
    if (!user) {
      console.log("LOGIN: No local user found, creating one for dughuUserId:", dughuUserId)
      const pEmail = String(pick(dughuProfile, "email", "mail", "user_email", "emailAddress") || "")
      const pFirstName = String(pick(dughuProfile, "first_name", "firstName", "firstname", "prenom", "prenoms") || "")
      const pLastName = String(pick(dughuProfile, "last_name", "lastName", "lastname", "nom") || "")
      const pName = String(pick(dughuProfile, "name", "full_name", "fullName", "nickname") || "")
      const pAvatar = String(pick(dughuProfile, "avatar", "profile_image", "profile_picture", "profileImage", "photo", "image") || "")

      const finalEmail =
        pEmail && emailRegex.test(pEmail)
          ? pEmail
          : emailRegex.test(login)
            ? login
            : `${dughuUserId}@dughu.local`

      let localUsername = dughuUsername || login
      if (!phoneRegex.test(localUsername.replace(/\s/g, '')) && emailRegex.test(localUsername)) {
        localUsername = pName || (pFirstName && pLastName ? `${pFirstName}-${pLastName}` : "") || `user-${dughuUserId}`
      }
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
          avatar: pAvatar || '/images/avatar.png',
          active: '1',
          emailVerified: new Date(),
        },
      })
      console.log("LOGIN: Local user created:", user.id)
    }

    // Mise à jour lastSeen
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeen: new Date(), lastseen: new Date() }
    })

    // ── 2bis. Synchronisation du miroir local depuis Dughu (source de vérité) ──
    // Dughu alimente les pages profil : on aligne le miroir local (accueil,
    // sidebars) sur ses données à chaque connexion (nom, username, avatar,
    // cover) pour éviter les divergences entre l'accueil et le profil.
    try {
      const syncedUser = await syncLocalUserFromDughu(user.id, dughuUserId, dughuProfile)
      if (syncedUser) user = syncedUser
    } catch (syncErr) {
      console.error('LOGIN SYNC ERROR:', syncErr)
    }
    if (!user) {
      return NextResponse.json({ success: false, message: 'Utilisateur introuvable.' }, { status: 500 })
    }

    // ── 3. Infos Dughu pour la réponse ──
    const dughuInfo: Record<string, unknown> = {
      userId: dughuUserId,
      token: dughuToken || "",
      username: dughuUsername || user.username || "",
    }

    // Compter followers et following
    const [followersCount, followingCount, postsCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
      prisma.post.count({ where: { authorId: user.id } })
    ])

    // Retourner l'utilisateur avec toutes les données nécessaires
    const response = NextResponse.json({
      success: true,
      user: {
        id: dughuUserId,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        avatar: resolveMediaUrl(user.avatar || '') || '/images/avatar.png',
        image: resolveMediaUrl(user.image || user.avatar || '') || '/images/avatar.png',
        cover: resolveMediaUrl(user.cover || '') || '/images/group/default-cover.jpg',
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
      redirect: '/home'
    })

    // ── Session : token Dughu en cookie (source de vérité) ──
    // Plus de session locale requise : le cookie transporte le token Dughu et
    // l'ID utilisateur. /api/auth/me lit ces cookies puis interroge l'API Dughu.
    const sessionMaxAge = remember ? 365 * 24 * 60 * 60 : 30 * 24 * 60 * 60 // 1 an si "se souvenir", sinon 30 jours
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
    console.error('LOGIN ERROR:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne.' }, { status: 500 })
  }
}
