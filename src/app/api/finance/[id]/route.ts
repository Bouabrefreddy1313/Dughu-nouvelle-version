import { NextRequest, NextResponse } from "next/server"
import { getFinanceDetail, deleteFinance } from "@/services/finance/finance.server"
import { ApiError } from "@/lib/api/api-error"

export const dynamic = "force-dynamic"

/**
 * GET /api/finance/[id]
 * Détail d'une demande de financement
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json(
        { success: false, finance: null, message: "Identifiant manquant." },
        { status: 400 }
      )
    }

    const result = await getFinanceDetail(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("FINANCE GET DETAIL ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message = error instanceof Error ? error.message : "Impossible de charger ce financement."
    return NextResponse.json({ success: false, finance: null, message }, { status })
  }
}

/**
 * DELETE /api/finance/[id]
 * Suppression d'une demande de financement
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Identifiant manquant." },
        { status: 400 }
      )
    }

    const result = await deleteFinance(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("FINANCE DELETE ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message = error instanceof Error ? error.message : "Impossible de supprimer ce financement."
    return NextResponse.json({ success: false, message }, { status })
  }
}
