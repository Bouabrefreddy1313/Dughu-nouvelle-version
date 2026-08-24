import { NextResponse } from "next/server"
import { dughu, dughuApi, DughuApiError } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { normalizeMutationRelation, type RelationState, type RelationType } from "@/lib/profile-relations"

type RelationAction = "request" | "accept" | "decline"

export async function POST(req: Request) {
  try {
    const actorId = await getDughuUserIdFromCookies()
    const body = await req.json()
    const targetId = String(body?.targetId ?? "")
    const type = body?.type as RelationType
    const action = body?.action as RelationAction

    if (!actorId) {
      return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })
    }
    if (!/^\d+$/.test(targetId) || !["friend", "network"].includes(type)) {
      return NextResponse.json({ success: false, message: "Relation invalide." }, { status: 422 })
    }
    if (actorId === targetId) {
      return NextResponse.json({ success: false, message: "Relation avec soi-même impossible." }, { status: 422 })
    }
    if (!dughu.enabled) {
      return NextResponse.json({ success: false, message: "L'API Dughu n'est pas configurée." }, { status: 500 })
    }

    let raw: Awaited<ReturnType<typeof dughuApi.requestRelation>>
    if (action === "request") raw = await dughuApi.requestRelation(actorId, targetId, type)
    else if (action === "accept") raw = await dughuApi.acceptRelation(actorId, targetId, type)
    else if (action === "decline") raw = await dughuApi.declineRelation(actorId, targetId, type)
    else return NextResponse.json({ success: false, message: "Action invalide." }, { status: 422 })

    const relation = raw?.relation ?? raw?.data?.relation ?? raw?.result?.relation
    const relations = relation ? normalizeMutationRelation(relation) : undefined
    const state: RelationState = action === "decline"
      ? "none"
      : relations?.[type] === "accepted"
        ? "accepted"
        : action === "accept"
          ? "accepted"
          : "outgoing_pending"

    return NextResponse.json({
      success: raw?.success !== false,
      message: String(raw?.message ?? "Relation mise à jour."),
      state,
    })
  } catch (error) {
    console.error("PROFILE RELATION ERROR:", error)
    if (error instanceof DughuApiError) {
      return NextResponse.json(
        { success: false, message: "Erreur upstream (API Dughu)", upstreamStatus: error.status },
        { status: 502 }
      )
    }
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}
