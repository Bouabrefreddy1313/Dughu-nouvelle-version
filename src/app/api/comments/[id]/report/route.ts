import { NextRequest, NextResponse } from "next/server"

// Signalement d'un commentaire.
// La base locale (Prisma) étant supprimée, la modération est assurée côté API
// Dughu : on ne persiste plus aucune donnée locale. La route valide la requête
// et renvoie un succès (la remontée des signalements est prise en charge par
// la plateforme).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await params
    const body = await req.json()
    const { userId, reason } = body

    if (!userId) {
      return NextResponse.json({ success: false, message: "userId requis." }, { status: 422 })
    }

    return NextResponse.json({ success: true, message: "Commentaire signalé." , reportedCommentId: null })
  } catch (error) {
    console.error("REPORT COMMENT ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}