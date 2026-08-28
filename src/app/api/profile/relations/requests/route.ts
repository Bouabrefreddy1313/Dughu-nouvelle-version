import { NextResponse } from "next/server"
import { dughu, dughuApi } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { normalizeIncomingRelationRequests } from "@/lib/relation-requests"
import type { RelationType } from "@/lib/profile-relations"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const authUserId = await getDughuUserIdFromCookies()
    if (!authUserId) {
      return NextResponse.json(
        { success: false, message: "Vous devez être connecté pour consulter vos demandes." },
        { status: 401 }
      )
    }

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "Impossible de charger les demandes pour le moment." },
        { status: 503 }
      )
    }

    const types: RelationType[] = ["friend", "network"]
    const results = await Promise.allSettled(
      types.map((type) => dughuApi.getRelationRequests(authUserId, authUserId, type))
    )
    const unavailableTypes: RelationType[] = []
    const requests = results.flatMap((result, index) => {
      const type = types[index]
      if (result.status === "rejected" || result.value?.success === false) {
        unavailableTypes.push(type)
        return []
      }
      return normalizeIncomingRelationRequests(result.value, type)
    })

    if (unavailableTypes.length === types.length) {
      return NextResponse.json(
        { success: false, message: "Impossible de charger vos demandes de relations." },
        { status: 502 }
      )
    }

    const uniqueRequests = [...new Map(
      requests.map((request) => [`${request.type}:${request.userId}`, request])
    ).values()]

    return NextResponse.json({ success: true, requests: uniqueRequests, unavailableTypes })
  } catch (error) {
    console.error("RELATION REQUESTS ERROR:", error instanceof Error ? error.message : "Erreur inconnue")
    return NextResponse.json(
      { success: false, message: "Impossible de charger vos demandes de relations." },
      { status: 500 }
    )
  }
}
