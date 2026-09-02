import { NextRequest, NextResponse } from "next/server"
import { capsuleEnabled, deleteCapsule } from "@/lib/capsule-service"

export const dynamic = "force-dynamic"

/**
 * DELETE /api/capsules/[id] — supprime une capsule (DELETE /capsule/{id} Dughu,
 * réservé à l'auteur côté Dughu).
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!capsuleEnabled) {
      return NextResponse.json({ success: false, message: "L'API Dughu n'est pas configurée." }, { status: 500 })
    }
    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, message: "capsuleId requis." }, { status: 422 })
    }
    const result = await deleteCapsule(id)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("CAPSULE DELETE ERROR:", error)
    const message = error instanceof Error ? error.message : "Erreur lors de la suppression."
    return NextResponse.json({ success: false, message }, { status: 502 })
  }
}
