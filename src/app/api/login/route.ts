import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dughu, dughuApi } from '@/lib/dughu'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { login, password, remember } = await req.json()

    if (!login || !password) {
      return NextResponse.json({ success: false, message: 'Identifiants requis.' }, { status: 422 })
    }

    // Déterminer le type de login
    let user = null
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^[0-9]{8,}$/

    if (emailRegex.test(login)) {
      user = await prisma.user.findUnique({ where: { email: login } })
    } else if (phoneRegex.test(login.replace(/\s/g, ''))) {
      const cleanPhone = login.replace(/\s/g, '').replace('+', '')
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { phoneNumber: login.replace(/\s/g, '') },
            { phoneNumber: cleanPhone }
          ]
        }
      })
    } else {
      user = await prisma.user.findUnique({ where: { username: login } })
    }

    if (!user || !user.password) {
      return NextResponse.json({ success: false, message: 'Identifiants incorrects.' }, { status: 422 })
    }

    // Vérification mot de passe
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ success: false, message: 'Identifiants incorrects.' }, { status: 422 })
    }

    // Vérification compte actif
    if (user.active === '0' && !user.emailVerified) {
      // Renvoyer OTP automatiquement
      const { generateOtp } = await import('@/lib/utils')
      const { sendOtpEmail } = await import('@/lib/mail')
      
      const otp = generateOtp()
      await prisma.otp.upsert({
        where: { userId: user.id },
        update: { otp, expiresAt: new Date(Date.now() + 3 * 60 * 1000) },
        create: {
          userId: user.id,
          otp,
          expiresAt: new Date(Date.now() + 3 * 60 * 1000)
        }
      })
      
      await sendOtpEmail(user.email, otp, user.firstName)

      return NextResponse.json(
        { success: false, message: 'Compte non vérifié. Un nouveau OTP a été envoyé.', redirect: '/otp?email=' + encodeURIComponent(user.email) },
        { status: 403 }
      )
    }

    if (user.active === '0') {
      return NextResponse.json(
        { success: false, message: 'Ce compte a été désactivé.' },
        { status: 403 }
      )
    }

    // Mise à jour lastSeen
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeen: new Date(), lastseen: new Date() }
    })

    // ── Synchronisation avec l'API Dughu (best-effort) ──
    let dughuInfo: Record<string, unknown> | null = null
    if (dughu.enabled) {
      try {
        const auth = await dughuApi.login(login, password)
        if (auth?.success && auth?.result?.user_id) {
          const dughuId = String(auth.result.user_id)
          await prisma.user.update({ where: { id: user.id }, data: { dughuId } })
          dughuInfo = {
            userId: dughuId,
            token: auth.result.token || "",
            username: auth.result.username || user.username || "",
          }
        } else {
          console.error('DUGHU LOGIN FAILED:', auth)
        }
      } catch (err) {
        console.error('DUGHU LOGIN ERROR:', err)
      }
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