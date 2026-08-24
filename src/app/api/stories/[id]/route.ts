import { NextRequest, NextResponse } from "next/server"
import { flashEnabled, deleteStory } from "@/lib/flash-service"

export const dynamic = "force-dynamic"

/**
 * Suppression d'un Flash (action DELETE) — seul l'auteur peut supprimer.
 * Encapsule DELETE /delStory/{storyId} (API Dughu).
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!flashEnabled) {
      return NextResponse.json({ success: false, message: "L'API Dughu n'est pas configurée." }, { status: 500 })
    }
    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, message: "ID du Flash requis." }, { status: 422 })
    }
    const result = await deleteStory(id)
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message || "Erreur suppression (API Dughu)." }, { status: 502 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE STORY ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur lors de la suppression du Flash." }, { status: 500 })
  }
}
