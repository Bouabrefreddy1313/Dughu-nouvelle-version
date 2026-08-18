import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dughu, dughuApi, DughuApiError, pick } from '@/lib/dughu'
import { slugify, generateOtp } from '@/lib/utils'
import { sendOtpEmail } from '@/lib/mail'

export async function POST(req: NextRequest) {
  try {
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'inscription via Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { first_name, last_name, email, password, gender, phone, country_code, ref } = body

    // 1. Validation de base
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!first_name || !last_name || !email || !phone || !password) {
      return NextResponse.json({ success: false, message: 'Veuillez remplir tous les champs obligatoires.' }, { status: 422 })
    }
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: 'Format email invalide.' }, { status: 422 })
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, message: 'Le mot de passe doit faire au moins 8 caractères.' }, { status: 422 })
    }

    // 2. Inscription obligatoire sur l'API Dughu (source de vérité)
    let remote: any
    try {
      remote = await dughuApi.register({
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
    } catch (err) {
      console.error('DUGHU REGISTER ERROR:', err)
      // Si l'API Dughu a répondu mais avec une erreur métier (ex: email déjà utilisé),
      // on renvoie le message de Dughu plutôt qu'un message générique.
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

    if (!remote?.success) {
      const message =
        (Array.isArray(remote?.messages) && remote.messages.join(' ')) ||
        (remote?.message && String(remote.message)) ||
        'Inscription refusée par Dughu.'
      return NextResponse.json({ success: false, message }, { status: 403 })
    }

    // 3. Récupérer le user_id Dughu via login (register ne renvoie pas l'id)
    let dughuId = ""
    let dughuUsername = ""
    let dughuProfile: Record<string, any> | null = null
    try {
      const auth = await dughuApi.login(email, password)
      if (auth?.success) {
        const result = auth.result || auth || {}
        dughuId = String(pick(result, "user_id", "userId", "id", "ID") || "")
        dughuUsername = String(pick(result, "username", "user_name", "userName", "slug") || "")
        dughuProfile = result
      }
    } catch (err) {
      console.error('DUGHU LOGIN AFTER REGISTER ERROR:', err)
    }

    // 4. Mirror local minimal (nécessaire pour la session/cookies)
    const existingEmail = await prisma.user.findUnique({ where: { email } })
    let localUser = existingEmail

    if (!localUser) {
      const baseUsername = slugify(`${first_name} ${last_name}`) || `user-${dughuId || Date.now()}`
      let username = dughuUsername || baseUsername
      let suffix = 1
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${dughuUsername || baseUsername}${suffix}`
        suffix++
      }

      const pFirstName = String(pick(dughuProfile, "first_name", "firstName", "firstname") || first_name)
      const pLastName = String(pick(dughuProfile, "last_name", "lastName", "lastname") || last_name)
      const pAvatar = String(
        pick(dughuProfile, "avatar", "profile_image", "profile_picture", "profileImage", "photo") || "/images/avatar.png"
      )

      localUser = await prisma.user.create({
        data: {
          firstName: pFirstName,
          lastName: pLastName,
          name: `${pFirstName} ${pLastName}`.trim() || username,
          email,
          username,
          slug: username,
          gender,
          phone,
          countryCode: country_code,
          phoneNumber: `${country_code}${phone}`.replace(/\s/g, ''),
          avatar: pAvatar,
          active: '1',
          emailVerified: dughuId ? new Date() : null,
          acceptTerms: true,
        },
      })
    } else if (dughuId) {
      localUser = await prisma.user.update({
        where: { id: localUser.id },
        data: { emailVerified: new Date(), active: '1' },
      })
    }

    // 5. Réponse : Dughu envoie lui-même l'OTP par email
    const sent = /otp|code/i.test(remote.message || "")

    // Générer un OTP local (mirror minimal) pour valider la session après inscription.
    // L'API Dughu n'expose pas d'endpoint de vérification du code email, le mirror
    // garde donc un moyen de confirmer le compte pour le flux /otp de l'app.
    const otp = generateOtp()
    await prisma.otp.upsert({
      where: { userId: localUser.id },
      update: { otp, expiresAt: new Date(Date.now() + 3 * 60 * 1000), createdAt: new Date() },
      create: { userId: localUser.id, otp, expiresAt: new Date(Date.now() + 3 * 60 * 1000) },
    })
    after(async () => {
      try {
        await sendOtpEmail(email, otp, first_name)
      } catch (err) {
        console.error('SEND OTP EMAIL ERROR:', err)
      }
    })

    return NextResponse.json(
      {
        success: true,
        message: remote.message || 'Inscription réussie.',
        email,
        dughu: dughuId ? { userId: dughuId } : null,
        redirect: `/otp?email=${encodeURIComponent(email)}&sent=1`,
      },
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
