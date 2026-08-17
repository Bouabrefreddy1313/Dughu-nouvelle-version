import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dughu, dughuApi, pick, DughuApiError } from '@/lib/dughu'
import { randomBytes } from 'crypto'

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

    // ── 2. Résolution du compte local lié au compte Dughu ──
    let user = await prisma.user.findUnique({ where: { dughuId: dughuUserId } })
    console.log("LOGIN: dughuUserId =", dughuUserId, "| found by dughuId:", !!user)

    if (!user && emailRegex.test(login)) {
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
          dughuId: dughuUserId,
          active: '1',
          emailVerified: new Date(),
        },
      })
      console.log("LOGIN: Local user created:", user.id, "with dughuId:", user.dughuId)
    }

    // 2c. Lier le dughuId si le compte local n'en avait pas
    if (!user.dughuId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { dughuId: dughuUserId },
      })
    }

    // Mise à jour lastSeen
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeen: new Date(), lastseen: new Date() }
    })

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
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        avatar: user.avatar || '/images/avatar.png',
        image: user.image || '/images/avatar.png',
        cover: user.cover || '/images/group/default-cover.jpg',
        bio: user.bio,
        dughuId: user.dughuId || dughuUserId,
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

    // ── Session persistante ──
    // Créer une session en base et poser un cookie à longue durée pour que
    // l'utilisateur ne soit pas redemandé à se connecter à chaque retour sur
    // Dughu (sauf s'il se déconnecte lui-même). Le middleware lit ce cookie.
    try {
      const sessionToken = randomBytes(32).toString('hex')
      const sessionMaxAge = remember ? 365 * 24 * 60 * 60 : 30 * 24 * 60 * 60 // 1 an si "se souvenir", sinon 30 jours
      const expires = new Date(Date.now() + sessionMaxAge * 1000)

      await prisma.session.create({
        data: { sessionToken, userId: user.id, expires },
      })

      response.cookies.set("next-auth.session-token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: sessionMaxAge,
      })
    } catch (err) {
      console.error("SESSION CREATE ERROR:", err)
    }

    return response

  } catch (error) {
    console.error('LOGIN ERROR:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne.' }, { status: 500 })
  }
}
