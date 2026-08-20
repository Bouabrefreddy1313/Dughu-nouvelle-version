import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, mapPosts, getPageInfo } from "@/lib/dughu"

export async function GET(req: NextRequest) {
  try {
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(req.url)
    const rawTag = searchParams.get("tag") || searchParams.get("hashtag") || ""
    const tag = rawTag.replace(/^#/, "").trim()
    if (!tag) {
      return NextResponse.json(
        { success: false, message: "Hashtag requis." },
        { status: 400 }
      )
    }

    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1)

    const raw = await dughuApi.getPostByHashtags(tag, page)
    if (!raw?.success) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Erreur de récupération des posts (API Dughu)." },
        { status: 502 }
      )
    }

    // La réponse est { success, posts: { current_page, data: [...], last_page, ... } } :
    // on passe le wrapper paginé à mapPosts/getPageInfo.
    const postsRaw = raw?.posts ?? raw
    const posts = mapPosts(postsRaw)
    const info = getPageInfo(postsRaw)

    return NextResponse.json({
      success: true,
      tag: `#${tag}`,
      posts,
      page,
      total: Number(postsRaw?.total ?? 0) || undefined,
      hasMore: info.hasMore,
    })
  } catch (error) {
    console.error("HASHTAG POSTS ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}