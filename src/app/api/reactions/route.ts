import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { dughu, dughuApi, DughuApiError, mapPostReactionsResponse } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

const REACTION_TYPES = ["like", "love", "haha", "wow", "sad", "angry"]

/** Tire un message lisible depuis la donnée d'erreur upstream (peut être string, objet ou JSON). */
function upstreamMessage(data: unknown, fallback = "Erreur de réaction (API Dughu)."): string {
  if (typeof data === "string" && data.trim()) return data.trim()
  if (data && typeof data === "object") {
    const value = (data as { message?: unknown; error?: unknown }).message
      ?? (data as { message?: unknown; error?: unknown }).error
    if (typeof value === "string" && value.trim()) return value.trim()
    try {
      const parsed = JSON.stringify(data)
      if (parsed && parsed !== "{}") return parsed.length > 200 ? `${parsed.slice(0, 200)}…` : parsed
    } catch {
      /* ignore */
    }
  }
  return fallback
}

/**
 * GET /api/reactions?postId=X&userId=Y — liste des personnes ayant réagi
 * sur une publication (encapsule GET /getPostReactions/{postId}/{userId} de
 * l'API Dughu. `userId` = l'utilisateur qui consulte).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const postId = String(searchParams.get("postId") || "")
    const userIdParam = String(searchParams.get("userId") || "")

    if (!postId) {
      return NextResponse.json({ success: false, message: "Paramètre postId requis." }, { status: 422 })
    }

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    let userId = String(userIdParam || "")
    if (!userId) {
      // Fallback serveur : lecture du cookie de session Dughu
      userId = await getDughuUserIdFromCookies()
    }
    if (!userId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }

    const raw = await dughuApi.getPostReactions(postId, userId)
    const { users, summary } = mapPostReactionsResponse((raw as { result?: unknown })?.result ?? raw)
    return NextResponse.json({ success: true, users, summary })
  } catch (err) {
    if (err instanceof Error && err.message.includes("DUGHU_API_KEY manquant")) throw err
    console.error("DUGHU GET POST REACTIONS ERROR:", err)
    if (err instanceof DughuApiError) {
      const status = err.status === 401 || err.status === 403 ? 502 : err.status
      return NextResponse.json(
        { success: false, message: upstreamMessage(err.data), upstream: err.data, upstreamStatus: err.status },
        { status }
      )
    }
    return NextResponse.json({ success: false, message: "Erreur de chargement des réactions (API Dughu." }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      postId,
      messageId,
      targetUserId,
      userId,
      type = "like",
      dughuUserId: dughuUserIdParam,
    } = await req.json()

    if ((!postId && !messageId) || !userId) {
      return NextResponse.json({ success: false, message: "Paramètres requis." }, { status: 422 })
    }
    const reactionType = REACTION_TYPES.includes(type) ? type : "like"
    const reactionId = REACTION_TYPES.indexOf(reactionType) + 1

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    // ── Mode Dughu API (source de vérité) ──
    let dughuUserId = String(dughuUserIdParam || "")
    if (!dughuUserId) {
      // Fallback serveur : lecture du cookie de session Dughu
      dughuUserId = await getDughuUserIdFromCookies()
    }
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }

    // ── Réaction à un message (messagerie Dughu) ──
    if (messageId) {
      try {
        const authToken = (await cookies()).get("dughu_token")?.value || ""
        const dForm = new FormData()
        dForm.append("user_id", String(dughuUserId))
        dForm.append("reaction", String(reactionId))
        if (targetUserId) dForm.append("target_user_id", String(targetUserId))
        const raw = await dughuApi.reactMessage(messageId, dForm, authToken || undefined)
        if (!raw?.success) {
          return NextResponse.json(
            {
              success: false,
              message: raw?.message || "Erreur de réaction (API Dughu).",
              upstream: raw,
            },
            { status: 502 }
          )
        }
        const reacted = Boolean(raw?.reacted ?? raw?.is_like ?? true)
        const currentReactionId = raw?.reaction?.reaction ?? raw?.reaction_id ?? raw?.reactionId
        const currentType = currentReactionId
          ? REACTION_TYPES[Number(currentReactionId) - 1] || reactionType
          : reactionType
        return NextResponse.json({
          success: true,
          reacted,
          type: reacted ? currentType : null,
        })
      } catch (err) {
        if (err instanceof Error && err.message.includes("DUGHU_API_KEY manquant")) throw err
        console.error("DUGHU TOGGLE MESSAGE REACTION ERROR:", err)
        if (err instanceof DughuApiError) {
          const status = err.status === 401 || err.status === 403 ? 502 : err.status
          return NextResponse.json(
            {
              success: false,
              message: upstreamMessage(err.data),
              upstream: err.data,
              upstreamStatus: err.status,
            },
            { status }
          )
        }
        return NextResponse.json(
          { success: false, message: "Erreur de réaction (API Dughu).", upstreamStatus: 502 },
          { status: 502 }
        )
      }
    }

    // ── Réaction à une publication (comportement existant) ──
    try {
      const dForm = new FormData()
      dForm.append("user_id", String(dughuUserId))
      dForm.append("post_id", String(postId))
      // Même convention que le like de commentaire (toggleLike_comment) : on
      // transmet à la fois `type` (nom lisible) et `reaction` (numéro 1-6).
      // Sans le champ `type`, l'API Dughu ne sait traiter que le like par défaut
      // (reaction=1) et rejette les autres réactions (love, haha…).
      dForm.append("type", reactionType)
      dForm.append("reaction", String(reactionId))
      const raw = await dughuApi.toggleLikePost(dForm)

      // L'API Dughu ne renvoie pas toujours un champ `success` explicite en cas de
      // réussite ({}, {done:true}, {is_like:1}…) : on ne considère l'échec que sur
      // `success === false` explicite (même convention que toggleLikeStory /
      // deleteMessage / points/give).
      if (raw && typeof raw === "object" && raw.success === false) {
        return NextResponse.json(
          { success: false, message: upstreamMessage(raw) },
          { status: 502 }
        )
      }

      // État « aimé » : Dughu peut renvoyer is_like / liked / un booléen brut.
      const rawReaction = raw && typeof raw === "object" ? raw : {}
      const reacted = Boolean(
        rawReaction.is_like === true ||
          rawReaction.liked === true ||
          rawReaction.is_like === 1 ||
          rawReaction.liked === 1 ||
          rawReaction.is_like === "1" ||
          rawReaction.liked === "1"
      )
      const currentReactionId =
        rawReaction?.reaction?.reaction ??
        rawReaction?.reaction_id ??
        rawReaction?.reactionId
      const currentType = currentReactionId
        ? REACTION_TYPES[Number(currentReactionId) - 1] || reactionType
        : reactionType
      return NextResponse.json({
        success: true,
        reacted,
        type: reacted ? currentType : null,
        count: typeof rawReaction?.count === "number" ? rawReaction.count : undefined,
      })
    } catch (err) {
      if (err instanceof Error && err.message.includes("DUGHU_API_KEY manquant")) throw err
      console.error("DUGHU TOGGLE LIKE ERROR:", err)
      // Remonte le détail réel de l'API Dughu (et non un message générique) pour
      // faciliter le diagnostic.
      if (err instanceof DughuApiError) {
        return NextResponse.json(
          { success: false, message: upstreamMessage(err.data), upstream: err.data, upstreamStatus: err.status },
          { status: err.status === 401 || err.status === 403 ? 502 : err.status }
        )
      }
      return NextResponse.json({ success: false, message: "Erreur de réaction (API Dughu)." }, { status: 502 })
    }
  } catch (error) {
    console.error("REACTION ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}