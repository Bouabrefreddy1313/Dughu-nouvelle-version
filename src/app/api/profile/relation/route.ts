import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { submitRelationAction } from "@/services/relations/relations.server"
import { ApiError, userMessage } from "@/lib/api/api-error"
import type { RelationAction, RelationType } from "@/types/relations/relation.types"

interface RelationBody {
  targetId?: string | number
  type?: RelationType
  action?: RelationAction
}

export async function POST(req: NextRequest) {
  try {
    const authUserId = await getDughuUserIdFromCookies()
    if (!authUserId) {
      return NextResponse.json({ success: false, message: "Non authentifié" }, { status: 401 })
    }

    const { targetId, type, action } = await req.json() as RelationBody
    if (!targetId || !type || !action) {
      return NextResponse.json({ success: false, message: "Paramètres manquants" }, { status: 400 })
    }

    const targetUserId = String(targetId)
    if (
      !/^\d+$/.test(targetUserId) ||
      !["friend", "network"].includes(type) ||
      !["request", "accept", "decline", "remove"].includes(action)
    ) {
      return NextResponse.json({ success: false, message: "Paramètres invalides" }, { status: 400 })
    }
    if (targetUserId === authUserId) {
      return NextResponse.json({ success: false, message: "Relation avec soi-même impossible" }, { status: 400 })
    }

    const result = await submitRelationAction({ authUserId, targetId: targetUserId, type, action })
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message ?? "Erreur backend" }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: result.message ?? "Action effectuée" })
  } catch (error) {
    console.error("PROFILE RELATION ERROR:", error instanceof Error ? error.message : "Erreur inconnue")
    if (error instanceof ApiError) {
      const status = error.status && error.status >= 400 && error.status <= 599 ? error.status : 502
      return NextResponse.json(
        { success: false, message: userMessage(error, "Erreur backend") },
        { status }
      )
    }
    return NextResponse.json({ success: false, message: "Erreur interne" }, { status: 500 })
  }
}
