import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, pick, DughuApiError } from "@/lib/dughu"
import { resolveDughuUserIdFromLocalId } from "@/lib/dughu-user"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, targetId } = body

    if (!userId || !targetId) {
      return NextResponse.json({ success: false, message: "Utilisateurs requis." }, { status: 422 })
    }
    if (userId === targetId) {
      return NextResponse.json({ success: false, message: "Impossible de se suivre soi-même." }, { status: 422 })
    }

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    // Résoudre les identifiants locaux (Prisma) vers les IDs numériques Dughu si nécessaire
    let actorDughuId = String(userId || "")
    let targetDughuId = String(targetId || "")

    const looksNumeric = (s: string) => /^[0-9]+$/.test(String(s || ""))
    if (!looksNumeric(actorDughuId)) {
      const resolved = await resolveDughuUserIdFromLocalId(actorDughuId)
      if (resolved) actorDughuId = resolved
    }
    if (!looksNumeric(targetDughuId)) {
      const resolved = await resolveDughuUserIdFromLocalId(targetDughuId)
      if (resolved) targetDughuId = resolved
    }

    if (!actorDughuId || !targetDughuId) {
      return NextResponse.json({ success: false, message: "Impossible de résoudre les IDs Dughu requis." }, { status: 422 })
    }

    // ── Mode Dughu API (source de vérité) ──
    // viewer = actorDughuId, identifier = targetDughuId
    const currentState = await dughuApi
      .getUser(targetDughuId, actorDughuId)
      .then((raw) => {
        const u = raw?.user || raw?.data || raw?.profile || raw?.result || raw
        return !!(pick(u, "is_following", "isFollowing", "follow_status", "followStatus") === true ||
          pick(u, "is_following", "isFollowing", "follow_status") === "1")
      })
      .catch(() => false)

    const following = !currentState
    if (following) {
      await dughuApi.follow(actorDughuId, targetDughuId)
    } else {
      await dughuApi.unfollow(actorDughuId, targetDughuId)
    }

    // Taille de la liste des abonnés pour le compteur
    let followers = 0
    try {
      const list = await dughuApi.getFollowers(targetId, userId)
      const arr = Array.isArray(list) ? list : list?.data || list?.users || list?.followers || []
      if (Array.isArray(arr)) followers = arr.length
    } catch {}

    return NextResponse.json({ success: true, following, followers })
  } catch (error) {
    console.error("FOLLOW ERROR:", error)
    // Si l'erreur vient de l'API Dughu, renvoyer des détails utiles pour le debug
    if (error instanceof DughuApiError) {
      return NextResponse.json(
        { success: false, message: "Erreur upstream (API Dughu)", upstreamStatus: error.status, upstreamData: error.data },
        { status: 502 }
      )
    }
    return NextResponse.json({ success: false, message: "Erreur interne (API Dughu)." }, { status: 502 })
  }
}