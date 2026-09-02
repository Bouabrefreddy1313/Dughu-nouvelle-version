/**
 * GET /api/canal/categories
 * Liste des catégories de canaux disponibles.
 */

import { NextResponse } from "next/server"
import { getPossibleCategories } from "@/services/canal/canal.server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const categories = await getPossibleCategories()
    return NextResponse.json({ success: true, categories })
  } catch (error) {
    console.error("CANAL CATEGORIES ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de charger les catégories."
    return NextResponse.json({ success: false, message, categories: [] }, { status: 500 })
  }
}
