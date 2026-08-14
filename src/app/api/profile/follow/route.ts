import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, pick } from "@/lib/dughu"

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

    // ── Mode Dughu API (source de vérité) ──
    const currentState = await dughuApi
      .getUser(targetId, userId)
      .then((raw) => {
        const u = raw?.user || raw?.data || raw?.profile || raw?.result || raw
        return !!(pick(u, "is_following", "isFollowing", "follow_status", "followStatus") === true ||
          pick(u, "is_following", "isFollowing", "follow_status") === "1")
      })
      .catch(() => false)

    const following = !currentState
    if (following) {
      await dughuApi.follow(userId, targetId)
    } else {
      await dughuApi.unfollow(userId, targetId)
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
    return NextResponse.json({ success: false, message: "Erreur interne (API Dughu)." }, { status: 502 })
  }
}