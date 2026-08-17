import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, DughuApiError } from "@/lib/dughu"

export async function POST(req: NextRequest) {
  try {
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const { email, otp, password, password_confirmation } = await req.json()

    if (!email || !otp || !password || !password_confirmation) {
      return NextResponse.json(
        { success: false, message: "Tous les champs sont requis." },
        { status: 422 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Le mot de passe doit faire au moins 8 caractères." },
        { status: 422 }
      )
    }

    if (password !== password_confirmation) {
      return NextResponse.json(
        { success: false, message: "Les mots de passe ne correspondent pas." },
        { status: 422 }
      )
    }

    try {
      const result = await dughuApi.resetPassword({
        email,
        otp,
        password,
        password_confirmation,
      })
      return NextResponse.json(result)
    } catch (err) {
      console.error("PASSWORD RESET ERROR:", err)
      if (err instanceof DughuApiError) {
        const data = err.data as any
        const msg =
          (Array.isArray(data?.messages) && data.messages.join(" ")) ||
          (data?.message && String(data.message)) ||
          (typeof data === "string" ? data : null) ||
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
  } catch (error) {
    console.error("PASSWORD RESET ERROR:", error)
    return NextResponse.json(
      { success: false, message: "Erreur interne du serveur." },
      { status: 500 }
    )
  }
}