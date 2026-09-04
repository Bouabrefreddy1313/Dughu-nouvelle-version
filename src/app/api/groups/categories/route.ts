import { NextResponse } from "next/server"
import { fetchGroupCategories } from "@/services/groups/groups.server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    return NextResponse.json({ success: true, categories: await fetchGroupCategories() })
  } catch (error) {
    console.error("GROUP CATEGORIES ERROR:", error)
    return NextResponse.json(
      { success: false, categories: [], message: "Impossible de charger les catégories de groupes." },
      { status: 500 }
    )
  }
}
