import { NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { adminAuth } from "@/lib/firebase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const userId = await getDughuUserIdFromCookies()
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Non authentifié" },
        { status: 401 }
      )
    }

    // Génération d'un Custom Token Firebase avec l'UID correspondant à l'ID utilisateur Dughu
    const customToken = await adminAuth.createCustomToken(String(userId))

    return NextResponse.json({
      success: true,
      token: customToken,
      userId: String(userId),
    })
  } catch (error) {
    console.error("FIREBASE CUSTOM TOKEN ERROR:", error)
    return NextResponse.json(
      { success: false, message: "Impossible de générer le jeton Firebase." },
      { status: 500 }
    )
  }
}
