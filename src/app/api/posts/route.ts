import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, mapPosts, mapAlbums, getPageInfo, mapPost, DughuApiError } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

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

    // Fallback serveur : si le frontend n'a pas fourni l'ID Dughu, on le lit
    // depuis le cookie de session.
    if (!dughuUserId) {
      dughuUserId = await getDughuUserIdFromCookies()
    }

    if (!dughuUserId) {
      return NextResponse.json(
        { success: false, message: "ID Dughu requis (dughuUserId)." },
        { status: 401 }
      )
    }

    // ── Mode profil : posts d'un auteur précis ──
    if (authorId) {
      // L'endpoint Dughu `userPost` attend l'ID (ou username) Dughu de l'auteur
      // dans `user_id`. Le frontend fournit désormais un identifiant Dughu
      // numérique ou un username ; aucun mapping local n'existe plus.
      let targetDughuId = authorId
      if (!/^\d+$/.test(String(authorId))) {
        targetDughuId = authorId
      }
      const raw = await dughuApi.getUserPosts(targetDughuId, dughuUserId, page)
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

    // ── Fil d'actualité : getPostAllRepost (complet) et getPostAll (rapide) en
    // parallèle — la première réponse gagne. Évite le timeout client (~6s à >30s
    // pour getPostAllRepost quand l'API Dughu est chargée) en repliant sur la
    // variante getPostAll qui répond en ~1-2s.
    //
    // En parallèle, on récupère les albums de l'utilisateur : les posts multi-
    // images vivent souvent dans un album (postType="postAlbum"), et selon
    // l'endpoint gagnant le tableau `album` n'est pas toujours inclus dans le
    // fil. On enrichit donc les posts avec les médias de l'album (correspondance
    // par post_id) quand ils n'ont aucune image.
    const albumsPromise = dughuApi
      .getAlbums(dughuUserId)
      .then((raw: any) => mapAlbums(raw))
      .catch((e: unknown) => {
        console.error("FEED getAlbums ERROR:", e)
        return []
      })

    const raw = await Promise.race([
      dughuApi.getPostAllRepost(dughuUserId, page).catch((e: unknown) => {
        console.error("FEED getPostAllRepost ERROR:", e)
        return null
      }),
      dughuApi.getPostAll(dughuUserId, page).catch((e: unknown) => {
        console.error("FEED getPostAll ERROR:", e)
        return null
      }),
    ])
    if (!raw) {
      throw new Error("Le fil Dughu est injoignable.")
    }
    const posts = mapPosts(raw, undefined) as any[]

    // Enrichit les posts multi-images avec les médias de l'album du viewer
    // lorsque le fil ne les a pas inclus.
    const albums = await albumsPromise
    if (albums.length) {
      const mediaByPostId = new Map<string, { url: string }[]>()
      for (const album of albums) {
        for (const m of album.media || []) {
          if (!m.postId) continue
          const arr = mediaByPostId.get(String(m.postId)) || []
          arr.push({ url: m.url })
          mediaByPostId.set(String(m.postId), arr)
        }
      }
      for (const post of posts) {
        if (!post.images?.length && mediaByPostId.has(post.id)) {
          post.images = mediaByPostId.get(post.id)!
          post.image = post.images[0]?.url || null
        }
      }
    }

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
    // Fallback serveur : lecture du cookie de session Dughu
    if (!dughuUserId) {
      dughuUserId = await getDughuUserIdFromCookies()
    }
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 401 })
    }

    const dForm = new FormData()
    dForm.append("user_id", String(dughuUserId))

    // Confidentialité du post : l'app utilise une base 0 (règle métier Dughu) :
    //   0 = Public, 1 = Followers/Abonnés, 2 = Réseau, 3 = Amis stricts.
    // On accepte la valeur telle quelle si elle est dans [0-3], sinon défaut 0.
    const rawPrivacy =
      formData?.get("privacy") ??
      formData?.get("postPrivacy") ??
      jsonBody?.privacy ??
      jsonBody?.postPrivacy

    let privacyInt = 0
    if (rawPrivacy !== null && rawPrivacy !== undefined && rawPrivacy !== "") {
      const asNum = Number(rawPrivacy)
      if (Number.isFinite(asNum) && asNum >= 0 && asNum <= 3) {
        privacyInt = asNum
      }
    }
    // L'API Dughu (POST /post) attend postPrivacy en base 1 :
    //   1 = Public, 2 = Abonnés, 3 = Réseau, 4 = Amis.
    // L'app utilise une base 0 (0=Public, 1=Abonnés, 2=Réseau, 3=Amis).
    // On envoie donc privacyInt + 1.
    dForm.append("postPrivacy", String(privacyInt + 1))

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
      const audioFiles = formData.getAll("audios") as File[]
      for (const f of imageFiles) dForm.append("fileInputForPost[]", f)
      for (const f of videoFiles) dForm.append("fileInputForPost[]", f)
      for (const f of audioFiles) dForm.append("fileInputForPost[]", f)
    } else {
      const body = jsonBody || {}
      const content = body.content || ""
      const parentId = body.parentId || ""
      if (content.trim()) dForm.append("postText", content.trim())
      if (body.color) dForm.append("color", body.color)
      if (body.feeling) dForm.append("postFeeling", body.feeling)
      if (parentId) dForm.append("parent_id", parentId)
    }

    const raw = await dughuApi.createPost(dForm)
    if (!raw?.success) {
      return NextResponse.json({ success: false, message: raw?.message || "Erreur de publication (API Dughu)." }, { status: 502 })
    }

    const post = mapPost(raw?.post || raw?.result || raw?.data || raw)
    return NextResponse.json({ success: true, post }, { status: 201 })
  } catch (error) {
    console.error("CREATE POST ERROR:", error)
    if (error instanceof DughuApiError) {
      const apiMsg =
        (error.data as any)?.message ||
        (error.data as any)?.error ||
        error.message ||
        "Erreur de l'API Dughu."
      return NextResponse.json(
        { success: false, message: apiMsg },
        { status: error.status || 502 }
      )
    }
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}
