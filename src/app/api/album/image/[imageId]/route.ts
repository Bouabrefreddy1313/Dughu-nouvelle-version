import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

/**
 * DELETE /api/album/image/{imageId} — suppression d'une image d'un album
 * (API Dughu : DELETE /destroyOneImage/{image_id}).
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ imageId?: string }> }) {
  try {
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }
    const { imageId } = await ctx.params
    if (!imageId) {
      return NextResponse.json({ success: false, message: "Identifiant d'image requis." }, { status: 422 })
    }
    // Garde-fou session : on refuse si aucun utilisateur connecté.
    const userId = await getDughuUserIdFromCookies()
    if (!userId) {
      return NextResponse.json({ success: false, message: "Non connecté." }, { status: 401 })
    }

    const raw = await dughuApi.destroyOneImage(imageId)
    if (!raw?.success) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Erreur de suppression de l'image (API Dughu)." },
        { status: 502 }
      )
    }
    return NextResponse.json({ success: true, message: raw?.message || "Image supprimée." })
  } catch (error) {
    console.error("ALBUM IMAGE DELETE ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}
