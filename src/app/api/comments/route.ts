import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, mapComments, resolveMediaUrl } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

/**
 * Récupère TOUS les commentaires Dughu d'un post.
 * L'API pagine par défaut par 10, on parcourt donc toutes les pages et on
 * déduplique les résultats.
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

  const remainingPages: number[] = []
  for (let p = 2; p <= lastPage; p++) remainingPages.push(p)

  const BATCH_SIZE = 3
  const results: any[][] = [readPage(first)]
  for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
    const batch = remainingPages.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map((p) => dughuApi.getComments(postId, viewerDughuId, p))
    )
    for (const r of batchResults) results.push(readPage(r))
  }

  const all = results.flat()
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
 * n'accepte que l'id d'un COMMENTAIRE racine. Si `parentId` est une réponse,
 * on résout l'id du commentaire racine qui la contient.
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const postId = searchParams.get("postId")
    const currentUserId = searchParams.get("userId")
    if (!postId) {
      return NextResponse.json({ success: false, message: "postId requis." }, { status: 422 })
    }

    // Seule source : l'API Dughu (les posts Dughu ont un ID numérique).
    if (dughu.enabled && /^\d+$/.test(String(postId))) {
      let viewerDughuId = searchParams.get("dughuUserId") || ""
      if (!viewerDughuId) viewerDughuId = await getDughuUserIdFromCookies()
      if (!viewerDughuId) viewerDughuId = "0"
      const rawList = await fetchAllDughuComments(String(postId), viewerDughuId)
      const comments = mapComments({ data: rawList }, viewerDughuId || "")
      return NextResponse.json({ success: true, comments })
    }

    return NextResponse.json({ success: false, message: "Publication introuvable." }, { status: 404 })
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
    let dughuUserIdVar = ""
    let content = ""
    let parentId: string | null = null
    const files: File[] = []

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      postId = String(formData.get("postId") || "")
      userId = String(formData.get("userId") || "")
      dughuUserIdVar = String(formData.get("dughuUserId") || "")
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
      dughuUserIdVar = body.dughuUserId || ""
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

    if (dughu.enabled && /^\d+$/.test(String(postId))) {
      let dughuUserId = dughuUserIdVar
      if (!dughuUserId) {
        dughuUserId = await getDughuUserIdFromCookies()
      }
      if (!dughuUserId) {
        return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
      }
      try {
        const dForm = new FormData()
        dForm.append("user_id", String(dughuUserId))
        dForm.append("post_id", String(postId))
        if (content?.trim()) dForm.append("text", content.trim())
        // Réponses plates sous le commentaire racine (contrainte API Dughu).
        let resolvedParentId = parentId ? String(parentId) : null
        if (parentId) {
          resolvedParentId = await resolveRootCommentId(String(postId), String(parentId), String(dughuUserId))
          dForm.append("comment_id", String(resolvedParentId))
        }
        // Média envoyé directement à Dughu (plus de stockage de fichier local).
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
                id: String(dughuUserId),
                name: String(dughuUserId) || "Utilisateur",
                username: "",
                avatar: "/images/avatar.png",
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

    return NextResponse.json({ success: false, message: "Publication introuvable." }, { status: 404 })
  } catch (error) {
    console.error("COMMENT ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}