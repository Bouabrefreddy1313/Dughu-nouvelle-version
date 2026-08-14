import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendOtpEmail } from '@/lib/mail'
import { generateOtp } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ success: false, message: 'Utilisateur non trouvé.' }, { status: 404 })
    }

    // Rate limiting : max 3 envois par minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
    const recentOtps = await prisma.otp.count({
      where: {
        userId: user.id,
        createdAt: { gte: oneMinuteAgo }
      }
    })

    if (recentOtps >= 3) {
      return NextResponse.json(
        { success: false, message: 'Trop de tentatives. Réessayez dans une minute.' },
        { status: 429 }
      )
    }

    const otp = generateOtp()
    await prisma.otp.upsert({
      where: { userId: user.id },
      update: { otp, expiresAt: new Date(Date.now() + 3 * 60 * 1000), createdAt: new Date() },
      create: {
        userId: user.id,
        otp,
        expiresAt: new Date(Date.now() + 3 * 60 * 1000)
      }
    })

    // Envoi de l'email OSTP en arrière-plan pour ne pas bloquer la réponse
    void Promise.resolve().then(async () => {
      try {
        await sendOtpEmail(email, otp, user.firstName)
      } catch (err) {
        console.error('SEND OTP EMAIL ERROR:', err)
      }
    })

    return NextResponse.json({ success: true, message: 'Nouveau code envoyé.' })
  } catch (error) {
    console.error('RESEND OTP ERROR:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne.' }, { status: 500 })
  }
}