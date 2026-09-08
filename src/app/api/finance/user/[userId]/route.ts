import { NextRequest, NextResponse } from "next/server"
import { getUserFinanceList } from "@/services/finance/finance.server"
import { ApiError } from "@/lib/api/api-error"

export const dynamic = "force-dynamic"

/**
 * GET /api/finance/user/[userId]
 * Liste des campagnes de l'utilisateur (onglet "Mes demandes")
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params
    if (!userId) {
      return NextResponse.json(
        { success: false, finances: [], message: "Identifiant utilisateur manquant." },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || undefined
    const q = searchParams.get("q") || undefined
    const sort_by = searchParams.get("sort_by") || undefined
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined

    const result = await getUserFinanceList(userId, { category, q, sort_by, page })
    return NextResponse.json(result)
  } catch (error) {
    console.error("FINANCE GET USER LIST ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message = error instanceof Error ? error.message : "Erreur lors du chargement de vos demandes."
    return NextResponse.json({ success: false, finances: [], message }, { status })
  }
}
