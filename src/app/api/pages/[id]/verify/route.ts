import { NextRequest, NextResponse } from "next/server"
import { requestVerification } from "@/services/pages/pages.server"

export const dynamic = "force-dynamic"

/** POST /api/pages/[id]/verify — demander la vérification (page/requestVerification). */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    if (!pageId) return NextResponse.json({ success: false, message: "Identifiant de page requis." }, { status: 422 })
    const result = await requestVerification(pageId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES VERIFY ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible d'envoyer la demande de vérification." }, { status: 500 })
  }
}