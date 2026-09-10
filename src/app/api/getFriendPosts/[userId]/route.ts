import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, mapPosts, getPageInfo } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const page = Math.max(parseInt(req.nextUrl.searchParams.get("page") || "1"), 1)

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    // L'ID utilisateur peut être fourni dans l'URL ou l'on utilise celui de la session
    const dughuUserId = userId || (await getDughuUserIdFromCookies()) || "31262"

    const raw = await dughuApi.getFriendPosts(dughuUserId, page)
    const posts = mapPosts(raw)
    const info = getPageInfo(raw)
    const hasMore = info.hasMore || posts.length >= 10

    console.log("GET /getFriendPosts/", dughuUserId, "| page:", page, "| posts:", posts.length, "| hasMore:", hasMore)

    return NextResponse.json({
      success: true,
      posts,
      hasMore,
      page,
      totalPages: hasMore ? page + 1 : page,
    })
  } catch (error) {
    console.error("GET /getFriendPosts error:", error)
    return NextResponse.json(
      { success: false, message: "Impossible de charger les publications des amis fraternisés." },
      { status: 500 }
    )
  }
}