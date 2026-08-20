import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi } from "@/lib/dughu"

// Renvoyer le code de vérification par email via l'API Dughu.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ success: false, message: "Email requis." }, { status: 422 })
    }
    if (!dughu.enabled) {
      return NextResponse.json({ success: false, message: "L'API Dughu n'est pas configurée." }, { status: 500 })
    }

    let result: { success?: boolean; message?: unknown } | null = null
    try {
      result = await dughuApi.askAuthCode(email)
    } catch (err) {
      console.error("OTP RESEND ERROR:", err)
      return NextResponse.json({ success: false, message: "Impossible de joindre l'API Dughu." }, { status: 502 })
    }

    if (result?.success === false) {
      return NextResponse.json(
        { success: false, message: result?.message || "Envoi du code impossible." },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result?.message ? String(result.message) : "Nouveau code envoyé.",
    })
  } catch (error) {
    console.error("OTP RESEND ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}
