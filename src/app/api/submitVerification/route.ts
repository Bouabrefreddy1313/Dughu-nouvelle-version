import { NextRequest, NextResponse } from "next/server"
import { dughuApi } from "@/lib/dughu"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const result = await dughuApi.submitVerification(formData)

    if (!result || typeof result !== "object" || !("success" in result)) {
      return NextResponse.json(
        { success: false, message: "Réponse invalide de l'API Dughu." },
        { status: 500 }
      )
    }

    return NextResponse.json(result as any)
  } catch (error) {
    console.error("SUBMIT_VERIFICATION ERROR:", error)
    return NextResponse.json(
      { success: false, message: "Erreur interne du serveur." },
      { status: 500 }
    )
  }
}