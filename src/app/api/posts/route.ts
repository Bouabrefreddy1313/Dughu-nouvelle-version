import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, mapPosts, getPageInfo, mapPost } from "@/lib/dughu"
import { resolveDughuUserIdFromLocalId } from "@/lib/dughu-user"

const POSTS_PER_PAGE = 10

// Fusionne le fil des publications des pages avec les posts de l'utilisateur
// lui-même (créés directement depuis l'API Dughu), sans doublon.
function mergeFeedPosts(pagePosts: any[], userPosts: any[]): any[] {
  const seen = new Set<string>()
  const merged: any[] = []
  for (const p of [...pagePosts, ...userPosts]) {
    if (!p.id || seen.has(p.id)) continue
    seen.add(p.id)
    merged.push(p)
  }
  return merged.sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime())
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1)
    const userId = searchParams.get("userId")
    let dughuUserId = searchParams.get("dughuUserId") || "" // ← ID Dughu fourni par le frontend
    const authorId = searchParams.get("authorId")

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    // Fallback serveur : si le frontend n'a pas fourni l'ID Dughu (ex: cache
    // localStorage perdu), on le résout via l'API Dughu depuis le compte local.
    if (!dughuUserId && userId) {
      dughuUserId = await resolveDughuUserIdFromLocalId(userId)
    }

    if (!dughuUserId) {
      return NextResponse.json(
        { success: false, message: "ID Dughu requis (dughuUserId)." },
        { status: 401 }
      )
    }

    // Résoudre l'utilisateur local pour le nom/avatar (optionnel, juste pour l'affichage)
    const viewer = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, username: true, avatar: true },
        })
      : null

    // ── Mode profil : posts d'un auteur précis ──
    if (authorId) {
      const raw = await dughuApi.getUserPosts(authorId, dughuUserId, page)
      const posts = mapPosts(raw, {
        id: authorId,
        name: "",
        username: "",
        avatar: "",
      })
      const info = getPageInfo(raw)
      const hasMore = info.hasMore
      return NextResponse.json({
        success: true,
        posts,
        pinnedPosts: [],
        boostedPost: null,
        page,
        totalPages: hasMore ? page + 1 : page,
        hasMore,
      })
    }

    // ── Fil d'actualité : endpoint getPostAllRepost (officiel v1/v2) ──
    const raw = await dughuApi.getPostAllRepost(dughuUserId, page)
    console.log("FEED RAW (first 300 chars):", JSON.stringify(raw).slice(0, 300))
    const posts = mapPosts(raw, viewer ? {
      id: viewer.id,
      name: viewer.name,
      username: viewer.username,
      avatar: viewer.avatar,
    } : undefined) as any[]
    const info = getPageInfo(raw)
    // Si getPageInfo ne détecte pas de pagination, on déduit hasMore du nombre de posts reçus
    const hasMore = info.hasMore || posts.length >= POSTS_PER_PAGE
    console.log("FEED: page", page, "| posts:", posts.length, "| hasMore:", hasMore)
    return NextResponse.json({
      success: true,
      posts,
      pinnedPosts: [],
      boostedPost: null,
      page,
      totalPages: hasMore ? page + 1 : page,
      hasMore,
    })
  } catch (error) {
    console.error("FEED ERROR:", error)
    const message = error instanceof Error ? error.message : "Erreur lors du chargement du fil."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const contentType = req.headers.get("content-type") || ""
    const formData = contentType.includes("multipart/form-data") ? await req.formData() : null
    let jsonBody: any = null
    if (!formData) {
      jsonBody = await req.json().catch(() => ({}))
    }
    const userId = String(formData?.get("userId") || jsonBody?.userId || "")

    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }

    let dughuUserId = String(formData?.get("dughuUserId") || jsonBody?.dughuUserId || "")
    // Fallback serveur : résolution de l'ID Dughu depuis le compte local.
    if (!dughuUserId && userId) {
      dughuUserId = await resolveDughuUserIdFromLocalId(userId)
    }
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 401 })
    }

    const dForm = new FormData()
    dForm.append("user_id", String(dughuUserId))

    if (formData) {
      const content = (formData.get("content") as string) || ""
      const color = (formData.get("color") as string) || ""
      const location = (formData.get("location") as string) || ""
      const feeling = (formData.get("feeling") as string) || ""
      const postType = (formData.get("postType") as string) || "post"
      const parentId = (formData.get("parentId") as string) || ""
      if (content.trim()) dForm.append("postText", content.trim())
      if (color) dForm.append("color", color)
      const color_id = (formData.get("color_id") as string) || ""
      const color_1 = (formData.get("color_1") as string) || ""
      const color_2 = (formData.get("color_2") as string) || ""
      const text_color = (formData.get("text_color") as string) || ""
      if (color_id) dForm.append("color_id", color_id)
      if (color_1) dForm.append("color_1", color_1)
      if (color_2) dForm.append("color_2", color_2)
      if (text_color) dForm.append("text_color", text_color)
      if (location) dForm.append("location", location)
      if (feeling) dForm.append("postFeeling", feeling)
      if (postType) dForm.append("postType", postType)
      if (parentId) dForm.append("parent_id", parentId)

      const imageFiles = formData.getAll("images") as File[]
      const videoFiles = formData.getAll("videos") as File[]
      for (const f of imageFiles) dForm.append("fileInputForPost[]", f)
      for (const f of videoFiles) dForm.append("fileInputForPost[]", f)
    } else {
      const body = jsonBody || {}
      const content = body.content || ""
      const parentId = body.parentId || ""
      if (content.trim()) dForm.append("postText", content.trim())
      if (body.color) dForm.append("color", body.color)
      if (body.feeling) dForm.append("postFeeling", body.feeling)
      if (parentId) dForm.append("parent_id", parentId)
    }

    // La création de posts (texte coloré compris) passe par l'endpoint POST /post.
    // L'endpoint GET /colored_posts ne sert pas à la création (voir dughuApi.getColoredPosts).
    const raw = await dughuApi.createPost(dForm)
    if (!raw?.success) {
      return NextResponse.json({ success: false, message: raw?.message || "Erreur de publication (API Dughu)." }, { status: 502 })
    }

    const post = mapPost(raw?.post || raw?.result || raw?.data || raw)
    return NextResponse.json({ success: true, post }, { status: 201 })
  } catch (error) {
    console.error("CREATE POST ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}
