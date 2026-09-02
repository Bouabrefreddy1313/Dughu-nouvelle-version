import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, mapPosts } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

/**
 * Posts sauvegardés de l'utilisateur — encapsule GET /get-post-save/{user_id}
 * (API Dughu). `userId` est l'ID Dughu numérique de l'utilisateur connecté
 * (ex. /api/get-post-save/23443).
 *
 * Réponse : { success, posts, hasMore, page } — même forme que GET /api/posts,
 * les posts passent par mapPosts (mêmes champs que le fil d'actualité) et
 * sont marqués `isSaved: true` pour la page « Mes sauvegardes ».
 *
 * Pagination : l'API Dughu renvoie 10 posts par page
 * (data.pagination = { total, per_page, current_page, last_page }) —
 * `?page=N` est transmis et `hasMore` est déduit de cette pagination.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ userId?: string }> }) {
  try {
    const { userId } = await ctx.params

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    // Pagination : l'API Dughu renvoie 10 posts par page (data.pagination).
    const pageParam = Number(req.nextUrl.searchParams.get("page") || 1)
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1

    // ID Dughu cible : celui de l'URL, sinon le cookie de session (fallback
    // serveur, même mécanique que les autres routes du domaine posts).
    let dughuUserId = String(userId || "")
    if (!dughuUserId) {
      dughuUserId = await getDughuUserIdFromCookies()
    }
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 401 })
    }

    const raw = await dughuApi.getSavedPosts(dughuUserId, page)
    if (raw?.success === false) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Erreur lors du chargement des sauvegardes (API Dughu)." },
        { status: 502 }
      )
    }

    // ⚠️ Forme de l'API Dughu : { success, data: { posts: [...], pagination,
    // has_posts } } — les posts sont enveloppés dans `data.posts`. On tolère
    // aussi les formes aplaties ({ posts: [...] } / tableau brut) par sécurité.
    const rawPosts = raw?.data?.posts ?? raw?.posts ?? raw?.data ?? raw

    const posts = (mapPosts(rawPosts) as Record<string, unknown>[]).map((post) => ({
      ...post,
      // Post présent dans la liste des sauvegardes : signet activé par défaut.
      isSaved: true,
    }))

    // hasMore déduit de la pagination renvoyée par l'API Dughu.
    const pagination = raw?.data?.pagination
    const currentPage = Number(pagination?.current_page ?? page) || page
    const lastPage = Number(pagination?.last_page ?? currentPage) || currentPage
    const hasMore = currentPage < lastPage

    return NextResponse.json({
      success: true,
      posts,
      hasMore,
      page: currentPage,
    })
  } catch (error) {
    console.error("GET-POST-SAVE ERROR:", error)
    const message = error instanceof Error ? error.message : "Erreur lors du chargement des sauvegardes."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
