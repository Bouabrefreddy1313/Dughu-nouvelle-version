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

/**
 * L'API Dughu ne supporte qu'un seul niveau de réponses : `storeCommentReplique`
 * n'accepte que l'id d'un COMMENTAIRE racine. Si `parentId` est une réponse
 * (replique), on résout l'id du commentaire racine qui la contient.
 */
async function resolveRootCommentId(postId: string, parentId: string, viewerDughuId: string): Promise<string> {
  try {
    const all = await fetchAllDughuComments(postId, viewerDughuId)
    for (const c of all) {
      const id = String(c?.id ?? "")
      if (id === parentId) return id
      const rawReplies =
        (Array.isArray(c?.reponses) && c?.reponses) ||
        (Array.isArray(c?.replies) && c?.replies) ||
        (Array.isArray(c?.children) && c?.children) ||
        (Array.isArray(c?.answers) && c?.answers)
      if (rawReplies) {
        for (const r of rawReplies) {
          if (String(r?.id ?? "") === parentId) return id
        }
      }
    }
  } catch { /* on retombe sur parentId en fallback */ }
  return parentId
}

/**
 * Ré-imbrique les réponses selon les liens logiques enregistrés (ReplyLink).
 * L'API Dughu renvoie toutes les réponses à plat sous leur commentaire racine ;
 * on reconstruit ici l'arbre réponse→réponse à partir des liens créés au POST.
 */
async function applyReplyLinks(comments: Record<string, any>[], postId: string): Promise<Record<string, any>[]> {
  try {
    const links = await prisma.replyLink.findMany({ where: { postId } })
    if (!links.length) return comments

    const parentOf = new Map<string, string>()
    for (const link of links) parentOf.set(String(link.replyId), String(link.parentReplyId))

    const nest = (flat: Record<string, any>[]): Record<string, any>[] => {
      const byId = new Map<string, Record<string, any>>()
      for (const r of flat) byId.set(String(r.id), r)

      const childrenOf = new Map<string, Record<string, any>[]>()
      const isChild = new Set<string>()
      for (const r of flat) {
        const p = parentOf.get(String(r.id))
        if (p && byId.has(p)) {
          isChild.add(String(r.id))
          childrenOf.set(p, [...(childrenOf.get(p) || []), r])
        }
      }

      const withKids = (r: Record<string, any>): Record<string, any> => ({
        ...r,
        replies: [...(r.replies || []), ...(childrenOf.get(String(r.id)) || []).map(withKids)],
      })

      return flat.filter((r) => !isChild.has(String(r.id))).map(withKids)
    }

    return comments.map((c) => ({
      ...c,
      replies: nest(c.replies || []),
    }))
  } catch { /* silencieux : on garde la structure plate en cas d'erreur */ }
  return comments
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
        const nested = await applyReplyLinks(comments, String(postId))
        return NextResponse.json({ success: true, comments: nested })
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
            replies: {
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
            },
          },
        },
      },
    })

    // Enrichir récursivement avec le flag "liked", le type de réaction et le compte de likes
    const enrichComment = (c: any): any => {
      const myLike = currentUserId ? c.likes.find((l: any) => l.userId === currentUserId) : null
      return {
        ...c,
        isMine: currentUserId ? c.userId === currentUserId : false,
        liked: !!myLike,
        reactionType: myLike?.type || null,
        likesCount: c.likes.length,
        replies: (c.replies || []).map(enrichComment),
      }
    }
    const enriched = comments.map(enrichComment)

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
      const actingUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, dughuId: true, name: true, username: true, avatar: true } })
      if (!actingUser?.dughuId) {
        return NextResponse.json({ success: false, message: "Compte Dughu requis." }, { status: 404 })
      }
      try {
        const dForm = new FormData()
        dForm.append("user_id", String(actingUser.dughuId))
        dForm.append("post_id", String(postId))
        if (content?.trim()) dForm.append("text", content.trim())
        // L'API Dughu n'accepte que les commentaires racines : si on répond à une
        // réponse, on remonte au commentaire racine (les réponses restent plates).
        let resolvedParentId = parentId ? String(parentId) : null
        if (parentId) {
          resolvedParentId = await resolveRootCommentId(String(postId), String(parentId), String(actingUser.dughuId))
          dForm.append("comment_id", String(resolvedParentId))
        }
        if (file) dForm.append("file", file, file.name)

        const raw = parentId ? await dughuApi.replyComment(dForm) : await dughuApi.addComment(dForm)
        if (raw?.success) {
          const r = raw.result || {}
          const rawPath = String(r?.file_path || r?.file || r?.image || r?.c_file || "") || null
          const filePath = rawPath ? resolveMediaUrl(rawPath) : null
          const ft = String(r?.file_type || r?.fileType || "").toLowerCase()
          const isImage = ft.startsWith("image")
          const isVideo = ft.startsWith("video")
          const newReplyId = String(r?.id ?? "")
          // Réponse à une réponse : l'API Dughu la stocke à plat sous le commentaire
          // racine. On enregistre le lien logique pour la ré-imbriquer côté affichage.
          if (parentId && resolvedParentId !== String(parentId) && newReplyId) {
            try {
              await prisma.replyLink.upsert({
                where: { replyId_parentReplyId: { replyId: newReplyId, parentReplyId: String(parentId) } },
                update: {},
                create: { postId: String(postId), replyId: newReplyId, parentReplyId: String(parentId) },
              })
            } catch { /* non bloquant */ }
          }
          return NextResponse.json({
            success: true,
            comment: {
              id: newReplyId || String(Date.now()),
              content: r?.text ?? content.trim(),
              userId,
              postId: String(postId),
              parentId: resolvedParentId || null,
              createdAt: r?.created_at || new Date().toISOString(),
              isMine: true,
              user: { 
                id: actingUser.id, 
                name: actingUser.name || userId, 
                username: actingUser.username || "", 
                avatar: actingUser.avatar || "/images/avatar.png" 
              },
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
        isMine: true,
        liked: false,
        likesCount: 0,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("COMMENT ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}