import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()

    if (!email || !otp || otp.length !== 4) {
      return NextResponse.json({ success: false, message: 'Email et OTP requis (4 chiffres).' }, { status: 422 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ success: false, message: 'Utilisateur non trouvé.' }, { status: 404 })
    }

    const otpRecord = await prisma.otp.findFirst({
      where: {
        userId: user.id,
        otp,
        expiresAt: { gt: new Date() }
      }
    })

    if (!otpRecord) {
      return NextResponse.json({ success: false, message: 'Code OTP invalide ou expiré.' }, { status: 400 })
    }

    // Activer le compte
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        active: '1'
      }
    })

    // Supprimer l'OTP
    await prisma.otp.delete({ where: { id: otpRecord.id } })

    // Parrainage : attribution de points
    if (user.referrerId) {
      const config = await prisma.woConfig.findUnique({ where: { name: 'points_affiliation' } })
      const points = config ? parseInt(config.value) : 10
      
      await prisma.historiquePoints.create({
        data: {
          userId: user.referrerId,
          points,
          type: 'parrainage',
          description: `Parrainage de ${user.username}`
        }
      })

      await prisma.notification.create({
        data: {
          userId: user.referrerId,
          type: 'parrainage',
          content: `${user.name} a rejoint Dughu grâce à votre invitation ! +${points} points`
        }
      })
    }

    return NextResponse.json({
      success: true,
      result: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          isAdmin: user.isAdmin
        },
        message: 'Compte vérifié avec succès.'
      }
    })

  } catch (error) {
    console.error('OTP VERIFY ERROR:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne.' }, { status: 500 })
  }
}