import { NextRequest, NextResponse } from "next/server"
import { removeVerification } from "@/services/pages/pages.server"

export const dynamic = "force-dynamic"

/** POST /api/pages/[id]/verify/remove — retirer la vérification (page/removeVerification). */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    if (!pageId) return NextResponse.json({ success: false, message: "Identifiant de page requis." }, { status: 422 })
    const result = await removeVerification(pageId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES VERIFY REMOVE ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible de retirer la vérification." }, { status: 500 })
  }
}