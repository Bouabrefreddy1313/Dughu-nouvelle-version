import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { getFinanceList, saveFinance } from "@/services/finance/finance.server"
import { ApiError } from "@/lib/api/api-error"

export const dynamic = "force-dynamic"

/**
 * GET /api/finance
 * Liste des campagnes de financement globales (onglet "Parcourir")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || undefined
    const q = searchParams.get("q") || undefined
    const sort_by = searchParams.get("sort_by") || undefined
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined

    const result = await getFinanceList({ category, q, sort_by, page })
    return NextResponse.json(result)
  } catch (error) {
    console.error("FINANCE GET LIST ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message = error instanceof Error ? error.message : "Erreur lors du chargement des financements."
    return NextResponse.json({ success: false, finances: [], message }, { status })
  }
}

/**
 * POST /api/finance
 * Création ou mise à jour d'une demande de financement (multipart/form-data)
 */
export async function POST(request: NextRequest) {
  try {
    const sessionUserId = await getDughuUserIdFromCookies()
    const incomingData = await request.formData()

    // Champs obligatoires selon la spécification : title, description, amount
    const title = String(incomingData.get("title") || "").trim()
    const description = String(incomingData.get("description") || "").trim()
    const amount = String(incomingData.get("amount") || "").trim()
    const financeId = incomingData.get("finance_id")
      ? String(incomingData.get("finance_id")).trim()
      : undefined

    let userId = String(incomingData.get("user_id") || "").trim()
    if (!userId && sessionUserId) {
      userId = sessionUserId
    }

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Le titre est obligatoire." },
        { status: 422 }
      )
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, message: "Veuillez entrer un nombre de points valide." },
        { status: 422 }
      )
    }

    if (!description) {
      return NextResponse.json(
        { success: false, message: "La description est obligatoire." },
        { status: 422 }
      )
    }

    // Préparer le FormData final pour l'API Dughu
    const forwardedData = new FormData()
    forwardedData.set("title", title)
    forwardedData.set("description", description)
    forwardedData.set("amount", amount)
    if (userId) forwardedData.set("user_id", userId)
    if (financeId) forwardedData.set("finance_id", financeId)

    const rawImage = incomingData.get("image")
    if (rawImage && rawImage instanceof File && rawImage.size > 0) {
      forwardedData.set("image", rawImage)
    }

    const result = await saveFinance(forwardedData)
    return NextResponse.json(result)
  } catch (error) {
    console.error("FINANCE SAVE ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message = error instanceof Error ? error.message : "Impossible d'enregistrer la demande."
    return NextResponse.json({ success: false, message }, { status })
  }
}
