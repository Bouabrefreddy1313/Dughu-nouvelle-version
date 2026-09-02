import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

/**
 * DELETE /api/album/{albumId} — suppression d'un album et de tout son contenu
 * (API Dughu : DELETE /album/{album_id}). Action irréversible ; la confirmation
 * est gérée côté interface.
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ albumId?: string }> }) {
  try {
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }
    const { albumId } = await ctx.params
    if (!albumId) {
      return NextResponse.json({ success: false, message: "Identifiant d'album requis." }, { status: 422 })
    }
    // Garde-fou session : on refuse si aucun utilisateur connecté.
    const userId = await getDughuUserIdFromCookies()
    if (!userId) {
      return NextResponse.json({ success: false, message: "Non connecté." }, { status: 401 })
    }

    const raw = await dughuApi.deleteAlbum(albumId)
    if (!raw?.success) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Erreur de suppression de l'album (API Dughu)." },
        { status: 502 }
      )
    }
    return NextResponse.json({ success: true, message: raw?.message || "Album supprimé." })
  } catch (error) {
    console.error("ALBUM DELETE ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}
