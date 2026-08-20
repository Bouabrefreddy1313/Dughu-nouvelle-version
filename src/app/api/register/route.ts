import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, DughuApiError } from "@/lib/dughu"

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
      return NextResponse.json({ success: false, message: "Veuillez remplir tous les champs obligatoires." }, { status: 422 })
    }
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: "Format email invalide." }, { status: 422 })
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, message: "Le mot de passe doit faire au moins 8 caractères." }, { status: 422 })
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
      console.error("DUGHU REGISTER ERROR:", err)
      if (err instanceof DughuApiError) {
        const data = err.data as any
        const msg =
          (Array.isArray(data?.messages) && data.messages.join(" ")) ||
          (data?.message && String(data.message)) ||
          (typeof data === "string" ? data : null) ||
          err.message
        return NextResponse.json({ success: false, message: msg }, { status: err.status || 502 })
      }
      return NextResponse.json(
        { success: false, message: "Impossible de joindre l'API Dughu." },
        { status: 502 }
      )
    }

    if (!remote?.success) {
      const message =
        (Array.isArray(remote?.messages) && remote.messages.join(" ")) ||
        (remote?.message && String(remote.message)) ||
        "Inscription refusée par Dughu."
      return NextResponse.json({ success: false, message }, { status: 403 })
    }

    // 3. Dughu envoie lui-même le code par email. On déclenche le flux
    // ask_auth_code pour que /otp puisse confirmer le compte.
    try {
      await dughuApi.askAuthCode(email).catch(() => {})
    } catch { /* best-effort : Dughu envoie déjà l'OTP lors de l'inscription */ }

    return NextResponse.json(
      {
        success: true,
        message: remote.message || "Inscription réussie.",
        email,
        redirect: `/otp?email=${encodeURIComponent(email)}&sent=1`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("REGISTER ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne du serveur." }, { status: 500 })
  }
}