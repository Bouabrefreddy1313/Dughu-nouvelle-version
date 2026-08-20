import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, pick } from "@/lib/dughu"

// Vérification du code email / connexion auto via l'API Dughu.
// Flux : POST /ask_auth_code { email } (envoyé par Dughu) puis POST /loginAuto
// { email, code } qui vérifie le code et renvoie l'utilisateur + token.
export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()

    if (!email || !otp || otp.length !== 4) {
      return NextResponse.json({ success: false, message: "Email et code requis (4 chiffres)." }, { status: 422 })
    }

    if (!dughu.enabled) {
      return NextResponse.json({ success: false, message: "L'API Dughu n'est pas configurée." }, { status: 500 })
    }

    let loginAuto: any = null
    try {
      loginAuto = await dughuApi.loginAuto(email, String(otp))
    } catch (err) {
      console.error("OTP VERIFY DUHU ERROR:", err)
      return NextResponse.json({ success: false, message: "Impossible de joindre l'API Dughu." }, { status: 502 })
    }

    if (!loginAuto?.success) {
      const message =
        (loginAuto?.message && String(loginAuto.message)) ||
        (loginAuto?.messages && Object.values(loginAuto.messages).flat().join(" ")) ||
        "Code invalide ou expiré."
      return NextResponse.json({ success: false, message }, { status: 400 })
    }

    const result = loginAuto.result || loginAuto || {}
    const dughuUserId = String(pick(result, "user_id", "userId", "id", "ID") || "")
    const dughuToken = String(pick(result, "token", "access_token", "api_token") || "")

    const response = NextResponse.json({ success: true, message: "Compte vérifié avec succès.", redirect: "/onboarding/profile" })
    if (dughuUserId) {
      const sessionMaxAge = 30 * 24 * 60 * 60
      response.cookies.set("dughu_user_id", dughuUserId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: sessionMaxAge,
      })
      response.cookies.set("dughu_token", dughuToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: sessionMaxAge,
      })
    }
    return response
  } catch (error) {
    console.error("OTP VERIFY ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}