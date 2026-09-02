import { NextRequest, NextResponse } from "next/server"
import { uploadPageImage } from "@/services/pages/pages.server"

export const dynamic = "force-dynamic"

/**
 * POST /api/pages/[id]/upload-image — upload avatar/cover (multipart).
 * Champs du FormData : `image` (fichier), `element` (avatar | cover).
 * Encapsule POST /page/uploadImage { page_id, image, element }.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    const formData = await req.formData()
    const rawImage = formData.get("image") as unknown
    const elementRaw = String(formData.get("element") || "avatar")
    const element = elementRaw === "cover" ? "cover" : "avatar"

    if (!pageId) return NextResponse.json({ success: false, message: "Identifiant de page requis." }, { status: 422 })
    if (!rawImage || typeof rawImage === "string") {
      return NextResponse.json({ success: false, message: "Fichier image requis." }, { status: 422 })
    }

    const result = await uploadPageImage(pageId, rawImage as Blob, element)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES UPLOAD ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible d'envoyer l'image." }, { status: 500 })
  }
}