import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, mapComments, resolveMediaUrl } from "@/lib/dughu"
import { processHashtags, notifyMentions, createActivity } from "@/lib/feed"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

/**
 * Récupère TOUS les commentaires Dughu d'un post.
 * L'API pagine par défaut par 10 (per_page fixe, les paramètres per_page/limit sont ignorés),
 * on parcourt donc toutes les pages et on regroupe les résultats (avec déduplication).
 */
async function fetchAllDughuComments(postId: string, viewerDughuId: string) {
  const readPage = (pag: any): any[] => {
    const unwrapped = pag?.comments && typeof pag.comments === "object" && !Array.isArray(pag.comments)
      ? pag.comments
      : pag?.result && typeof pag.result === "object" && !Array.isArray(pag.result)
        ? pag.result
        : pag
    return Array.isArray(unwrapped) ? unwrapped : unwrapped?.data || []
  }

  const first = await dughuApi.getComments(postId, viewerDughuId, 1)
  const firstUnwrapped = first?.comments && typeof first.comments === "object" && !Array.isArray(first.comments)
    ? first.comments
    : first
  const lastPage = Number(firstUnwrapped?.last_page || 1) || 1

  let all: any[] = readPage(first)
  for (let p = 2; p <= lastPage; p++) {
    const pageRaw = await dughuApi.getComments(postId, viewerDughuId, p)
    all = all.concat(readPage(pageRaw))
  }

  // Déduplication par id (au cas où l'API renverrait un chevauchement entre pages)
  const seen = new Set<string>()
  return all.filter((c: any) => {
    const id = String(c?.id ?? "")
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

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
        const rawList = await fetchAllDughuComments(String(postId), viewerDughuId)
        const comments = mapComments({ data: rawList }, viewerDughuId || "")
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
    // Parser multipart (avec pièces jointes) ou JSON
    const contentType = req.headers.get("content-type") || ""
    let postId = ""
    let userId = ""
    let content = ""
    let parentId: string | null = null
    const files: File[] = []

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      postId = String(formData.get("postId") || "")
      userId = String(formData.get("userId") || "")
      content = String(formData.get("content") || "")
      const rawParent = formData.get("parentId")
      parentId = rawParent ? String(rawParent) : null
      const isFile = (v: FormDataEntryValue | null): v is File =>
        !!v && typeof v !== "string" && "arrayBuffer" in v
      for (const v of formData.getAll("files")) if (isFile(v)) files.push(v)
      for (const v of ["images", "videos"] as const) {
        for (const f of formData.getAll(v)) if (isFile(f)) files.push(f)
      }
    } else {
      const body = await req.json()
      postId = body.postId || ""
      userId = body.userId || ""
      content = body.content || ""
      parentId = body.parentId || null
    }

    const file = files[0] || null

    if (!postId || !userId) {
      return NextResponse.json({ success: false, message: "Paramètres requis." }, { status: 422 })
    }
    if (!content?.trim() && !file) {
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
        if (content?.trim()) dForm.append("text", content.trim())
        if (parentId) dForm.append("comment_id", String(parentId))
        if (file) dForm.append("file", file, file.name)

        const raw = parentId ? await dughuApi.replyComment(dForm) : await dughuApi.addComment(dForm)
        if (raw?.success) {
          const r = raw.result || {}
          const rawPath = String(r?.file_path || r?.file || r?.image || r?.c_file || "") || null
          const filePath = rawPath ? resolveMediaUrl(rawPath) : null
          const ft = String(r?.file_type || r?.fileType || "").toLowerCase()
          const isImage = ft.startsWith("image")
          const isVideo = ft.startsWith("video")
          return NextResponse.json({
            success: true,
            comment: {
              id: r?.id || String(Date.now()),
              content: r?.text ?? content.trim(),
              userId,
              postId: String(postId),
              parentId: parentId || null,
              createdAt: r?.created_at || new Date().toISOString(),
              user: { id: userId, name: "", username: "", avatar: "/images/avatar.png" },
              liked: false,
              likesCount: 0,
              image: isImage ? filePath : null,
              video: isVideo ? filePath : null,
              file: !isImage && !isVideo && filePath ? filePath : null,
              fileType: ft || null,
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

    // Sauvegarde locale de la pièce jointe
    let finalContent = content?.trim() || ""
    let imagePath: string | null = null
    let videoPath: string | null = null
    let fileType: string | null = null

    if (file) {
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads")
        await mkdir(uploadDir, { recursive: true })
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
        const fileName = `${Date.now()}-${safeName}`
        const filePath = path.join(uploadDir, fileName)
        await writeFile(filePath, Buffer.from(await file.arrayBuffer()))
        const publicPath = `/uploads/${fileName}`
        
        // Déterminer le type de fichier
        const mimeType = file.type
        if (mimeType.startsWith("image/")) {
          imagePath = publicPath
          fileType = "image"
        } else if (mimeType.startsWith("video/")) {
          videoPath = publicPath
          fileType = "video"
        } else {
          fileType = "file"
        }
        
        // Pour les fichiers génériques (non image/vidéo), on garde le chemin dans
        // le contenu car il n'existe pas de colonne dédiée dans le modèle Comment.
        // Les images et vidéos sont stockées dans leurs champs respectifs
        // (image / video) et n'ont pas besoin d'être dupliquées dans le texte.
        if (fileType === "file") {
          finalContent = finalContent ? `${finalContent}\n${publicPath}` : publicPath
        }
      } catch (err) {
        console.error("COMMENT FILE SAVE ERROR:", err)
      }
    }

    const comment = await prisma.comment.create({
      data: { 
        content: finalContent, 
        postId, 
        userId, 
        parentId: parentId || null,
        image: imagePath,
        video: videoPath,
        fileType,
      },
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