import { NextRequest, NextResponse } from "next/server"
import { updateSocialLinks } from "@/services/pages/pages.server"

export const dynamic = "force-dynamic"

/** POST /api/pages/[id]/social-links — liens sociaux (POST /socialLinksUpdat). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    const body = await req.json().catch(() => ({}))
    if (!pageId) return NextResponse.json({ success: false, message: "Identifiant de page requis." }, { status: 422 })
    const result = await updateSocialLinks(pageId, {
      facebook: String(body?.facebook || ""),
      instagram: String(body?.instagram || ""),
      twitter: String(body?.twitter || ""),
      linkedin: String(body?.linkedin || ""),
      youtube: String(body?.youtube || ""),
      vk: String(body?.vk || ""),
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES SOCIAL LINKS ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible de mettre à jour les liens sociaux." }, { status: 500 })
  }
}