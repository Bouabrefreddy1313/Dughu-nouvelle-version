import { NextResponse } from "next/server"
import { fetchPageCategories } from "@/services/pages/pages.server"

export const dynamic = "force-dynamic"

/** GET /api/pages/categories — catégories des pages (GET /getPageCategories). */
export async function GET() {
  try {
    const categories = await fetchPageCategories()
    return NextResponse.json({ success: true, categories })
  } catch (error) {
    console.error("PAGES CATEGORIES ERROR:", error)
    return NextResponse.json({ success: false, categories: [], message: "Impossible de charger les catégories." }, { status: 500 })
  }
}