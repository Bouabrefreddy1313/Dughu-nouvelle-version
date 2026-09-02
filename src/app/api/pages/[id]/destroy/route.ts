import { NextRequest, NextResponse } from "next/server"
import { destroyPage } from "@/services/pages/pages.server"

export const dynamic = "force-dynamic"

/**
 * POST /api/pages/[id]/destroy — supprimer une page (POST /destroyPage/{id}).
 * PRÉ-REQUIS : le frontend doit avoir demandé et vérifié le MOT DE PASSE avant
 * d'appeler cette route (confirmation obligatoire côté UI).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    const body = await req.json().catch(() => ({}))
    const password = String(body?.password || "")
    if (!pageId) return NextResponse.json({ success: false, message: "Identifiant de page requis." }, { status: 422 })
    if (!password) return NextResponse.json({ success: false, message: "Mot de passe requis pour supprimer l'espace." }, { status: 422 })

    const result = await destroyPage(pageId, password)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES DESTROY ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible de supprimer l'espace." }, { status: 500 })
  }
}