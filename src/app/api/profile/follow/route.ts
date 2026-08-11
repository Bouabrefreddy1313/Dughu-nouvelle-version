import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createActivity } from "@/lib/feed"
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

    // ── Mode Dughu API ──
    if (dughu.enabled) {
      try {
        const currentState = await dughuApi
          .getUser(targetId, userId)
          .then((raw) => {
            const u = raw?.user || raw?.data || raw?.profile || raw
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
      } catch (err) {
        if (err instanceof Error && err.message.includes("DUGHU_API_KEY manquant")) throw err
        console.error("DUGHU FOLLOW ERROR:", err)
        return NextResponse.json({ success: false, message: "Erreur interne (API Dughu)." }, { status: 502 })
      }
    }

    // ── Fallback Prisma ──
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
    })

    let following: boolean
    if (existing) {
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId: userId, followingId: targetId } },
      })
      following = false
    } else {
      await prisma.follow.create({
        data: { followerId: userId, followingId: targetId },
      })
      following = true
      void createActivity(userId, "follow", undefined, "a suivi un nouveau profil")
    }

    const followers = await prisma.follow.count({ where: { followingId: targetId } })

    return NextResponse.json({ success: true, following, followers })
  } catch (error) {
    console.error("FOLLOW ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}