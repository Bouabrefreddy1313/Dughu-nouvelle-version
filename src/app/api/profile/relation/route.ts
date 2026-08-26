import { NextRequest, NextResponse } from "next/server"
import { dughu, DughuApiError } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import type { RelationAction, RelationType } from "@/lib/profile-relations"

const ENDPOINTS = {
  request: "relation/request",
  accept: "relation/accept",
  decline: "relation/decline",
  remove: "relation/remove",
} as const

interface RelationBody {
  targetId?: string | number
  type?: RelationType
  action?: RelationAction
}

function messageFrom(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object" || !("message" in data)) return fallback
  const message = (data as { message?: unknown }).message
  return typeof message === "string" && message ? message : fallback
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
    if (!dughu.enabled) {
      return NextResponse.json({ success: false, message: "API Dughu non configurée" }, { status: 500 })
    }

    const formData = new FormData()
    formData.append("auth_user_id", authUserId)
    formData.append("user_id", targetUserId)
    formData.append("type", type)

    const data = await dughu.multipart(ENDPOINTS[action], formData)
    if (data?.success === false) {
      return NextResponse.json(
        { success: false, message: messageFrom(data, "Impossible de mettre à jour cette relation.") },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, message: messageFrom(data, "Action effectuée") })
  } catch (error) {
    console.error("PROFILE RELATION ERROR:", error)
    if (error instanceof DughuApiError) {
      return NextResponse.json(
        { success: false, message: messageFrom(error.data, "Impossible de mettre à jour cette relation.") },
        { status: error.status >= 400 && error.status <= 599 ? error.status : 502 }
      )
    }
    return NextResponse.json(
      { success: false, message: "Une erreur est survenue. Veuillez réessayer." },
      { status: 500 }
    )
  }
}
