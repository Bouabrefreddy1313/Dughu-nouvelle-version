import { NextRequest, NextResponse } from "next/server"
import { dughuApi } from "@/lib/dughu"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "ID utilisateur requis." },
        { status: 422 }
      )
    }

    const result = await dughuApi.getVerificationRequests(userId)

    if (!result || typeof result !== "object" || !("success" in result)) {
      return NextResponse.json(
        { success: false, message: "Réponse invalide de l'API Dughu." },
        { status: 500 }
      )
    }

    return NextResponse.json(result as any)
  } catch (error) {
    console.error("GET_VERIFICATION_REQUESTS ERROR:", error)
    return NextResponse.json(
      { success: false, message: "Erreur interne du serveur." },
      { status: 500 }
    )
  }
}