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

    const { email } = await req.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, message: "Email requis." },
        { status: 422 }
      )
    }

    try {
      const result = await dughuApi.sendResetLink(email)
      return NextResponse.json(result)
    } catch (err) {
      console.error("PASSWORD FORGOT ERROR:", err)
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
    console.error("PASSWORD FORGOT ERROR:", error)
    return NextResponse.json(
      { success: false, message: "Erreur interne du serveur." },
      { status: 500 }
    )
  }
}