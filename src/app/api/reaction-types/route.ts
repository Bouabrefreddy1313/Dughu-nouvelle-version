import { NextResponse } from "next/server"
import { dughuApi, DughuApiError } from "@/lib/dughu"

/**
 * GET /api/reaction-types
 * Retourne la liste des types de réactions disponibles depuis l'API Dughu.
 * Les icônes wowonder_icon sont utilisées dans le ReactionPicker.
 */
export async function GET() {
  try {
    const raw = await dughuApi.getReactions()
    return NextResponse.json({ success: true, data: raw?.data ?? raw })
  } catch (err) {
    if (err instanceof Error && err.message.includes("DUGHU_API_KEY manquant")) throw err
    console.error("REACTION TYPES ERROR:", err)
    if (err instanceof DughuApiError) {
      return NextResponse.json(
        { success: false, message: err.message, upstream: err.data },
        { status: err.status === 401 || err.status === 403 ? 502 : err.status }
      )
    }
    return NextResponse.json(
      { success: false, message: "Impossible de charger les types de réactions." },
      { status: 502 }
    )
  }
}
