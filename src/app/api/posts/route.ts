import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, mapPosts, getPageInfo, mapPost } from "@/lib/dughu"

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
    const authorId = searchParams.get("authorId")

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Utilisateur requis." },
        { status: 401 }
      )
    }

    const viewer = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, avatar: true, dughuId: true },
    })
    if (!viewer?.dughuId) {
      return NextResponse.json(
        { success: false, message: "Aucun compte Dughu associé à cet utilisateur." },
        { status: 500 }
      )
    }

    // ── Mode profil : posts d'un auteur précis (userPost), y compris pour soi-même ──
    if (authorId) {
      const localAuthor = await prisma.user.findUnique({
        where: { id: authorId },
        select: { id: true, dughuId: true, name: true, username: true, avatar: true },
      })
      // L'authorId peut aussi être un dughuId (profil consulté via l'API Dughu,
      // sans compte local correspondant)
      const author =
        localAuthor ||
        (await prisma.user.findFirst({
          where: { dughuId: authorId },
          select: { id: true, dughuId: true, name: true, username: true, avatar: true },
        }))

      const postsAuthor = author
        ? { id: author.id, dughuId: author.dughuId, name: author.name, username: author.username, avatar: author.avatar }
        : { id: authorId, dughuId: authorId, name: "", username: "", avatar: "" }
      const raw = await dughuApi.getUserPosts(postsAuthor.dughuId || authorId, viewer.dughuId, page)
      const posts = mapPosts(raw, {
        id: postsAuthor.id,
        name: postsAuthor.name,
        username: postsAuthor.username,
        avatar: postsAuthor.avatar,
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
    const raw = await dughuApi.getPostAllRepost(viewer.dughuId, page)
    const posts = mapPosts(raw, {
      id: viewer.id,
      name: viewer.name,
      username: viewer.username,
      avatar: viewer.avatar,
    }) as any[]
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
    const userId = String(formData?.get("userId") || (await req.json().then((b) => b.userId).catch(() => "")) || "")

    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { dughuId: true } })
    if (!user?.dughuId) {
      return NextResponse.json({ success: false, message: "Compte Dughu requis." }, { status: 404 })
    }

    const dForm = new FormData()
    dForm.append("user_id", String(user.dughuId))

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
      const body = await req.json()
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
