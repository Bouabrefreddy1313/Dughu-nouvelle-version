import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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

    // Compter followers et following
    const [followersCount, followingCount, postsCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
      prisma.post.count({ where: { authorId: user.id } })
    ])

    // Retourner l'utilisateur avec toutes les données nécessaires
    return NextResponse.json({
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
        cover: '/images/group/default-cover.jpg',
        bio: user.bio,
        _count: {
          posts: postsCount,
          followers: followersCount,
          following: followingCount,
        },
        followers: [],
        following: [],
      },
      redirect: '/home'
    })

  } catch (error) {
    console.error('LOGIN ERROR:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne.' }, { status: 500 })
  }
}