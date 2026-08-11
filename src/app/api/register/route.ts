import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dughu, dughuApi } from '@/lib/dughu'
import { sendOtpEmail } from '@/lib/mail'
import { generateOtp, slugify, isDisposableEmail, getIpFromRequest, detectCountryFromIp } from '@/lib/utils'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { first_name, last_name, email, password, gender, phone, country_code, country, ref } = body

    // 1. Vérification IP (bannissement)
    const ip = getIpFromRequest(req)
    const banned = await prisma.woBannedIp.findUnique({ where: { ipAddress: ip } })
    if (banned && (!banned.expiresAt || banned.expiresAt > new Date())) {
      return NextResponse.json(
        { success: false, message: 'Cette adresse IP est temporairement bannie.' },
        { status: 403 }
      )
    }

    // 2. Limite de comptes par IP (5 max / 24h)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentAccounts = await prisma.user.count({
      where: { ipAddress: ip, joined: { gte: last24h } }
    })
    if (recentAccounts >= 5) {
      await prisma.woBannedIp.create({
        data: {
          ipAddress: ip,
          reason: 'Trop de comptes créés (5 max / 24h)',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      })
      return NextResponse.json(
        { success: false, message: 'Trop de comptes créés depuis cette IP. Bannissement 24h.' },
        { status: 403 }
      )
    }

    // 3. Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: 'Format email invalide.' }, { status: 422 })
    }

    if (isDisposableEmail(email)) {
      return NextResponse.json({ success: false, message: 'Les emails jetables ne sont pas acceptés.' }, { status: 422 })
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json({ success: false, message: 'Cet email est déjà utilisé.' }, { status: 422 })
    }

    // 4. Validation téléphone
    const phoneRegex = /^[0-9]{8,}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ success: false, message: 'Numéro de téléphone invalide.' }, { status: 422 })
    }

    const phoneNumber = `${country_code}${phone}`.replace(/\s/g, '')
    const existingPhone = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber },
          { phoneNumber: phoneNumber.replace('+', '') }
        ]
      }
    })
    if (existingPhone) {
      return NextResponse.json({ success: false, message: 'Ce numéro est déjà utilisé.' }, { status: 422 })
    }

    // 5. Détection du pays
    let countryId = country ? Number(country) : null
    if (!countryId) {
      const detected = await detectCountryFromIp(ip)
      if (detected) {
        const pays = await prisma.pays.findFirst({ where: { indicatif: detected.indicatif } })
        if (pays) countryId = pays.id
      }
    }

    // 6. Génération username unique
    const baseUsername = slugify(`${first_name} ${last_name}`)
    let username = baseUsername
    let suffix = 1
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${suffix}`
      suffix++
    }

    // 7. Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10)

    // 8. Avatar par défaut
    const avatar = '/images/avatar.png'

    // 9. Vérification parrainage
    let referrerId: string | null = null
    if (ref) {
      const parrain = await prisma.user.findUnique({ where: { username: ref } })
      if (parrain) referrerId = parrain.id
    }

    // 10. Création de l'utilisateur
    const user = await prisma.user.create({
      data: {
        firstName: first_name,
        lastName: last_name,
        name: `${first_name} ${last_name}`,
        email,
        username,
        slug: username,
        gender,
        phone,
        countryCode: country_code,
        phoneNumber,
        countryId: countryId || undefined,
        password: hashedPassword,
        avatar,
        referrerId,
        acceptTerms: true,
        ipAddress: ip,
        registered: new Date().toLocaleDateString('fr-FR', { month: 'numeric', year: 'numeric' }),
      }
    })

    // 11. Génération et envoi OTP
    const otp = generateOtp()
    await prisma.otp.create({
      data: {
        userId: user.id,
        otp,
        expiresAt: new Date(Date.now() + 3 * 60 * 1000) // 3 minutes
      }
    })

    // Envoi de l'email en arrière-plan pour ne pas bloquer la réponse
    after(async () => {
      try {
        await sendOtpEmail(email, otp, first_name)
      } catch (err) {
        console.error('SEND OTP EMAIL ERROR:', err)
      }
    })

    // 12. Inscription vers l'API Dughu (best-effort, ne bloque pas l'inscription locale)
    if (dughu.enabled) {
      after(async () => {
        try {
          const remote = await dughuApi.register({
            first_name,
            last_name,
            email,
            gender,
            password,
            password_confirmation: password,
            phone_number: phone,
            country_code,
            referrer: ref || undefined,
          })
          if (remote?.success) {
            try {
              const auth = await dughuApi.login(email, password)
              const dughuId = auth?.result?.user_id
              if (dughuId) {
                await prisma.user.update({ where: { id: user.id }, data: { dughuId: String(dughuId) } })
              }
            } catch (err) {
              console.error('DUGHU LOGIN AFTER REGISTER ERROR:', err)
            }
          } else {
            console.error('DUGHU REGISTER FAILED:', remote)
          }
        } catch (err) {
          console.error('DUGHU REGISTER ERROR:', err)
        }
      })
    }

    return NextResponse.json(
      { success: true, message: 'Inscription réussie. Vérifiez votre email.', email },
      { status: 201 }
    )

  } catch (error) {
    console.error('REGISTER ERROR:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur.' },
      { status: 500 }
    )
  }
}