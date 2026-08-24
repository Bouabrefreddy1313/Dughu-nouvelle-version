import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi } from "@/lib/dughu"

/**
 * Points de l'utilisateur — encapsule GET /pointsToday/{userId} (API Dughu).
 * `userId` est l'ID Dughu numérique (ex. /api/pointsToday/23443).
 * La réponse Dughu contient notamment `total`, `converted`, `points_today`,
 * `gain_today`, `source` et `history` (derniers gains).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ userId?: string }> }) {
  try {
    const { userId } = await ctx.params

    if (!userId) {
      return NextResponse.json({ success: false, message: "ID utilisateur requis." }, { status: 422 })
    }
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const raw = await dughuApi.getPointsToday(userId)
    if (raw?.success === false) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Erreur lors du chargement des points (API Dughu)." },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      total: Number(raw?.total ?? 0),
      converted: Number(raw?.converted ?? 0),
      points_today: Number(raw?.points_today ?? 0),
      gain_today: Number(raw?.gain_today ?? 0),
      source: raw?.source ?? null,
      history: Array.isArray(raw?.history) ? raw.history : [],
    })
  } catch (error) {
    console.error("POINTS TODAY ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur lors du chargement des points." }, { status: 500 })
  }
}