import { NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { getOutgoingRequestUserIds } from "@/services/relations/relations.server"

export const dynamic = "force-dynamic"

/**
 * IDs des destinataires des demandes de relations SORTANTES (envoyées par
 * l'utilisateur connecté). Sert à pré-remplir l'état « Demande envoyée » du
 * bouton Fraterniser dans les Retrouvailles après un rechargement de page.
 */
export async function GET() {
  try {
    const authUserId = await getDughuUserIdFromCookies()
    if (!authUserId) {
      return NextResponse.json(
        { success: false, message: "Vous devez être connecté.", userIds: [] },
        { status: 401 }
      )
    }

    const userIds = await getOutgoingRequestUserIds(authUserId)
    return NextResponse.json({ success: true, userIds })
  } catch (error) {
    console.error("RELATION OUTGOING ERROR:", error instanceof Error ? error.message : "Erreur inconnue")
    return NextResponse.json({ success: false, message: "Impossible de charger vos demandes envoyées.", userIds: [] }, { status: 500 })
  }
}
