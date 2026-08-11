import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, mapComments } from "@/lib/dughu"
import { processHashtags, notifyMentions, createActivity } from "@/lib/feed"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const postId = searchParams.get("postId")
    const currentUserId = searchParams.get("userId")
    if (!postId) {
      return NextResponse.json({ success: false, message: "postId requis." }, { status: 422 })
    }

    // ── Mode Dughu API : les posts Dughu ont un ID numérique ──
    if (dughu.enabled && /^\d+$/.test(String(postId))) {
      try {
        let viewerDughuId = "0"
        if (currentUserId) {
          const viewer = await prisma.user.findUnique({ where: { id: currentUserId }, select: { dughuId: true } })
          viewerDughuId = viewer?.dughuId || "0"
        }
        const raw = await dughuApi.getComments(String(postId), viewerDughuId)
        const comments = mapComments(raw, viewerDughuId || "")
        return NextResponse.json({ success: true, comments })
      } catch (err) {
        if (err instanceof Error && err.message.includes("DUGHU_API_KEY manquant")) throw err
        console.error("DUGHU GET COMMENTS ERROR:", err)
        // fallback sur les commentaires locaux Prisma (probablement vides pour un post Dughu)
      }
    }

    const comments = await prisma.comment.findMany({
      where: { postId, parentId: null },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, username: true, avatar: true } },
        likes: { select: { id: true, userId: true, type: true } },
        replies: {
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, username: true, avatar: true } },
            likes: { select: { id: true, userId: true, type: true } },
          },
        },
      },
    })

    // Enrichir avec le flag "liked", le type de réaction et le compte de likes pour l'utilisateur courant
    const enriched = comments.map((c) => {
      const myLike = currentUserId ? c.likes.find((l) => l.userId === currentUserId) : null
      return {
        ...c,
        liked: !!myLike,
        reactionType: myLike?.type || null,
        likesCount: c.likes.length,
        replies: c.replies.map((r) => {
          const myReplyLike = currentUserId ? r.likes.find((l) => l.userId === currentUserId) : null
          return {
            ...r,
            liked: !!myReplyLike,
            reactionType: myReplyLike?.type || null,
            likesCount: r.likes.length,
          }
        }),
      }
    })

    return NextResponse.json({ success: true, comments: enriched })
  } catch (error) {
    console.error("LOAD COMMENTS ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { postId, userId, content, parentId } = await req.json()

    if (!postId || !userId) {
      return NextResponse.json({ success: false, message: "Paramètres requis." }, { status: 422 })
    }
    if (!content?.trim()) {
      return NextResponse.json({ success: false, message: "Commentaire vide." }, { status: 422 })
    }
    if (content.length > 1000) {
      return NextResponse.json({ success: false, message: "Commentaire trop long (1000 max)." }, { status: 422 })
    }

    // ── Mode Dughu API : les posts Dughu ont un ID numérique ──
    if (dughu.enabled && /^\d+$/.test(String(postId))) {
      const actingUser = await prisma.user.findUnique({ where: { id: userId }, select: { dughuId: true } })
      if (!actingUser?.dughuId) {
        return NextResponse.json({ success: false, message: "Compte Dughu requis." }, { status: 404 })
      }
      try {
        const dForm = new FormData()
        dForm.append("user_id", String(actingUser.dughuId))
        dForm.append("post_id", String(postId))
        dForm.append("text", content.trim())
        if (parentId) dForm.append("comment_id", String(parentId))

        const raw = parentId ? await dughuApi.replyComment(dForm) : await dughuApi.addComment(dForm)
        if (raw?.success) {
          return NextResponse.json({
            success: true,
            comment: {
              id: raw?.result?.id || String(Date.now()),
              content: raw?.result?.text ?? content.trim(),
              userId,
              postId: String(postId),
              parentId: parentId || null,
              createdAt: raw?.result?.created_at || new Date().toISOString(),
              user: { id: userId, name: "", username: "", avatar: "/images/avatar.png" },
              liked: false,
              likesCount: 0,
            },
          }, { status: 201 })
        }
        return NextResponse.json({ success: false, message: raw?.message || "Erreur commentaire (API Dughu)." }, { status: 502 })
      } catch (err) {
        if (err instanceof Error && err.message.includes("DUGHU_API_KEY manquant")) throw err
        console.error("DUGHU ADD COMMENT ERROR:", err)
        return NextResponse.json({ success: false, message: "Erreur commentaire (API Dughu)." }, { status: 502 })
      }
    }

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } })
    if (!post) {
      return NextResponse.json({ success: false, message: "Post introuvable." }, { status: 404 })
    }

    // Si parentId fourni, vérifier que le commentaire parent existe et appartient au même post
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: parentId } })
      if (!parentComment || parentComment.postId !== postId) {
        return NextResponse.json({ success: false, message: "Commentaire parent invalide." }, { status: 422 })
      }
    }

    const comment = await prisma.comment.create({
      data: { content: content.trim(), postId, userId, parentId: parentId || null },
      include: {
        user: { select: { id: true, name: true, username: true, avatar: true } },
        likes: { select: { id: true, userId: true } },
      },
    })

    // Hashtags, mentions et notification à l'auteur (non bloquant)
    try { void processHashtags(content) } catch { /* silent */ }
    try { void notifyMentions(content, userId) } catch { /* silent */ }
    try {
      if (post.authorId !== userId) {
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            type: "comment",
            content: "a commenté votre publication.",
          },
        })
      }
    } catch { /* silent */ }
    // Notifier l'auteur du commentaire parent si c'est une réponse
    if (parentId) {
      try {
        const parent = await prisma.comment.findUnique({ where: { id: parentId }, select: { userId: true } })
        if (parent && parent.userId !== userId) {
          await prisma.notification.create({
            data: {
              userId: parent.userId,
              type: "comment_reply",
              content: "a répondu à votre commentaire.",
            },
          })
        }
      } catch { /* silent */ }
    }
    try { void createActivity(userId, "comment", postId) } catch { /* silent */ }

    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        liked: false,
        likesCount: 0,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("COMMENT ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}