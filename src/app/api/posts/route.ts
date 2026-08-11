import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { processHashtags, notifyMentions, createActivity } from "@/lib/feed"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { dughu, dughuApi, mapPosts, getPageInfo } from "@/lib/dughu"

const POSTS_PER_PAGE = 10

async function fetchPosts(where: Prisma.PostWhereInput, take: number, skip: number) {
  return prisma.post.findMany({
    where,
    take,
    skip,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, username: true, avatar: true } },
      parent: {
        include: {
          author: { select: { id: true, name: true, username: true, avatar: true } },
        },
      },
      comments: {
        take: 2,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      },
      likes: { select: { id: true, userId: true, type: true } },
      _count: { select: { comments: true, likes: true } },
    },
  })
}

// Type générique de post affichable : enregistrement local Prisma OU distant Dughu
interface FeedPost {
  id: string
  content: string
  createdAt?: Date | string | number | null
  author?: { id?: string; name?: string | null; username?: string | null; avatar?: string | null } | null
  likes?: { userId?: string; type?: string | null }[]
  reacted?: string | null
  saved?: boolean
  hidden?: boolean
  pinned?: boolean
  [key: string]: unknown
}

function enrichPosts(posts: FeedPost[], currentUserId: string, state?: { savedIds: Set<string>; hiddenIds: Set<string>; pinnedIds: Set<string> }) {
  return posts.map((p) => ({
    ...p,
    reacted: p.likes?.find((l) => l.userId === currentUserId)?.type ?? p.reacted ?? null,
    saved: state ? state.savedIds.has(p.id) : false,
    hidden: state ? state.hiddenIds.has(p.id) : false,
    pinned: state ? state.pinnedIds.has(p.id) : false,
  }))
}

// Fusionne les posts locaux (source de vérité : tout post créé via l'app auteur)
// avec les posts de l'API Dughu (historique distant), sans doublon.
// Un post distant est considéré comme un doublon d'un post local si le texte est
// identique et qu'ils ont été créés à moins de 5 minutes d'écart.
function mergeProfilePosts(localPosts: FeedPost[], remotePosts: FeedPost[]): FeedPost[] {
  const merged = [...localPosts]
  for (const rp of remotePosts) {
    const isDup = localPosts.some((lp) => {
      const rContent = String(rp.content || "").trim()
      const lContent = String(lp.content || "").trim()
      if (!rContent || rContent !== lContent) return false
      const rt = new Date(rp.createdAt || "").getTime()
      const lt = new Date(lp.createdAt || "").getTime()
      return !Number.isNaN(rt) && !Number.isNaN(lt) && Math.abs(rt - lt) < 5 * 60 * 1000
    })
    if (!isDup) merged.push(rp)
  }
  return merged.sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime())
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1)
    const filter = searchParams.get("filter") || "all"
    const userId = searchParams.get("userId")
    const authorId = searchParams.get("authorId")

    // ── Mode profil : fusion des posts locaux + posts distants Dughu ──
    // (le bloc de fusion se trouve plus bas, avec la requête Prisma)
    // NB : la lecture seule depuis getUserPosts empêchait d'afficher les posts
    // créés dans l'app lorsque la synchro Dughu échouait.

    // ── Mode Dughu API : fil d'actualité (sans auteur spécifique) ──
    if (!authorId && filter === "all" && userId && dughu.enabled) {
      try {
        const viewer = await prisma.user.findUnique({ where: { id: userId }, select: { dughuId: true } })
        if (viewer?.dughuId) {
          const raw = await dughuApi.getPostPageUser(viewer.dughuId, page)
          const posts = mapPosts(raw)
          const { hasMore, page: currentPage } = getPageInfo(raw)
          return NextResponse.json({
            success: true,
            posts,
            pinnedPosts: [],
            boostedPost: null,
            page: currentPage,
            totalPages: hasMore ? currentPage + 1 : currentPage,
            hasMore,
          })
        }
        // Pas de dughuId → fallback sur les données locales Prisma
      } catch (err) {
        if (err instanceof Error && err.message.includes("DUGHU_API_KEY manquant")) throw err
        console.error("DUGHU FEED ERROR:", err)
        // fallback sur les données locales Prisma
      }
    }

    const take = POSTS_PER_PAGE
    const skip = (page - 1) * take

    // Exclusions : posts masqués + auteurs bloqués
    const where: Prisma.PostWhereInput = { active: "1" }

    // Filtre par auteur (profil d'un utilisateur)
    if (authorId) {
      where.authorId = authorId
    }

    const state = { savedIds: new Set<string>(), hiddenIds: new Set<string>(), pinnedIds: new Set<string>() }
    const excludedIds: string[] = []
    const blockedIds = new Set<string>()

    if (userId) {
      const [hidden, blocked, saved, pinnedByMe] = await Promise.all([
        prisma.hiddenPost.findMany({ where: { userId }, select: { postId: true } }),
        prisma.block.findMany({
          where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
          select: { blockerId: true, blockedId: true },
        }),
        prisma.savedPost.findMany({ where: { userId }, select: { postId: true } }),
        prisma.pinnedPost.findMany({ where: { userId, active: true }, select: { postId: true } }),
      ])
      excludedIds.push(...hidden.map((h) => h.postId))
      for (const b of blocked) {
        blockedIds.add(b.blockerId === userId ? b.blockedId : b.blockerId)
      }
      saved.forEach((s) => state.savedIds.add(s.postId))
      hidden.forEach((h) => state.hiddenIds.add(h.postId))
      pinnedByMe.forEach((p) => state.pinnedIds.add(p.postId))
      if (excludedIds.length) where.id = { notIn: excludedIds }
      if (blockedIds.size) {
        // Ne pas écraser le filtre "auteur précis" (profil) : combiner les deux
        where.authorId = authorId
          ? { equals: authorId, notIn: [...blockedIds] }
          : { notIn: [...blockedIds] }
      }
    }

    // Filtre "following" : posts des suivis + les siens (jamais en mode profil)
    if (!authorId && filter === "following" && userId) {
      const follows = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      })
      const followingIds = follows.map((f) => f.followingId)
      where.authorId = { in: [...followingIds, userId] }
    }

    // Mode profil : retourner les posts d'un auteur précis
    // = posts locaux (base Prisma, source de vérité de l'app) + historique distant Dughu
    if (authorId) {
      let profilePosts: FeedPost[] = await fetchPosts(where, take, skip)
      const profileTotal = await prisma.post.count({ where })
      let profileTotalPages = Math.max(Math.ceil(profileTotal / take), 1)
      let hasMore = page < profileTotalPages

      // Compléter avec l'historique distant Dughu (best-effort).
      // Les posts créés dans l'app sont TOUJOURS renvoyés (ils sont en base locale),
      // même si la synchro vers Dughu a échoué.
      if (dughu.enabled) {
        try {
          const author = await prisma.user.findUnique({
            where: { id: authorId },
            select: { dughuId: true, name: true, username: true, avatar: true },
          })
          if (author?.dughuId) {
            let viewerDughuId = "0"
            if (userId) {
              const viewer = await prisma.user.findUnique({ where: { id: userId }, select: { dughuId: true } })
              viewerDughuId = viewer?.dughuId || "0"
            }
            const raw = await dughuApi.getUserPosts(author.dughuId, viewerDughuId, page)
            const remotePosts = mapPosts(raw, {
              id: author.dughuId,
              name: author.name,
              username: author.username,
              avatar: author.avatar,
            }) as FeedPost[]
            const info = getPageInfo(raw)
            profilePosts = mergeProfilePosts(profilePosts, remotePosts)
            profileTotalPages = Math.max(profileTotalPages, info.page)
            hasMore = hasMore || info.hasMore
          }
        } catch (err) {
          if (err instanceof Error && err.message.includes("DUGHU_API_KEY manquant")) throw err
          console.error("DUGHU USER POSTS ERROR:", err)
          // On conserve uniquement les posts locaux en cas d'erreur distante
        }
      }

      return NextResponse.json({
        success: true,
        posts: enrichPosts(profilePosts, userId || "", state),
        pinnedPosts: [],
        boostedPost: null,
        page,
        totalPages: profileTotalPages,
        hasMore,
      })
    }

    const [total, pinnedPosts, boostedPost, allPinnedIds] = await Promise.all([
      prisma.post.count({ where }),
      page === 1 && userId
        ? prisma.pinnedPost.findMany({
            where: { active: true, userId },
            select: { postId: true },
          })
        : Promise.resolve([]),
      page === 1
        ? prisma.post.findFirst({
            where: { active: "1", boosted: true },
            orderBy: { createdAt: "desc" },
            include: {
              author: { select: { id: true, name: true, username: true, avatar: true } },
              parent: {
                include: { author: { select: { id: true, name: true, username: true, avatar: true } } },
              },
              comments: {
                take: 2,
                orderBy: { createdAt: "desc" },
                include: { user: { select: { id: true, name: true, avatar: true } } },
              },
              likes: { select: { id: true, userId: true, type: true } },
              _count: { select: { comments: true, likes: true } },
            },
          })
        : Promise.resolve(null),
      prisma.pinnedPost.findMany({ where: { active: true }, select: { postId: true } }),
    ])

    // Exclure les posts épinglés et boostés du flux principal
    const pinnedIds = new Set(allPinnedIds.map((p) => p.postId))
    excludedIds.push(...pinnedIds)
    if (boostedPost) excludedIds.push(boostedPost.id)
    if (excludedIds.length) where.id = { notIn: excludedIds }

    // Posts épinglés : charger le contenu complet
    let pinnedFull: FeedPost[] = []
    if (pinnedPosts.length > 0) {
      const pinnedPostsData = await prisma.post.findMany({
        where: { id: { in: pinnedPosts.map((p) => p.postId) }, active: "1" },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true, username: true, avatar: true } },
          parent: {
            include: { author: { select: { id: true, name: true, username: true, avatar: true } } },
          },
          comments: {
            take: 2,
            orderBy: { createdAt: "desc" },
            include: { user: { select: { id: true, name: true, avatar: true } } },
          },
          likes: { select: { id: true, userId: true, type: true } },
          _count: { select: { comments: true, likes: true } },
        },
      })
      pinnedFull = enrichPosts(pinnedPostsData, userId || "", state)
    }

    const posts = await fetchPosts(where, take, skip)
    const totalPages = Math.max(Math.ceil(total / take), 1)

    return NextResponse.json({
      success: true,
      posts: enrichPosts(posts, userId || "", state),
      pinnedPosts: pinnedFull,
      boostedPost: boostedPost ? enrichPosts([boostedPost], userId || "", state)[0] : null,
      page,
      totalPages,
      hasMore: page < totalPages,
    })
  } catch (error) {
    console.error("FEED ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur lors du chargement du fil." }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || ""

    let content = ""
    let userId = ""
    let image: string | null = null
    let video: string | null = null
    let color: string | null = null
    let location: string | null = null
    let feeling: string | null = null
    let postType = "post"
    let parentId: string | null = null
    let imageFiles: File[] = []
    let videoFiles: File[] = []

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      content = (formData.get("content") as string) || ""
      userId = (formData.get("userId") as string) || ""
      color = (formData.get("color") as string) || null
      location = (formData.get("location") as string) || null
      feeling = (formData.get("feeling") as string) || null
      postType = (formData.get("postType") as string) || "post"
      parentId = (formData.get("parentId") as string) || null

      // Upload des images
      imageFiles = formData.getAll("images") as File[]
      if (imageFiles.length > 0) {
        const uploadDir = path.join(process.cwd(), "public", "uploads")
        await mkdir(uploadDir, { recursive: true })
        const fileName = `${Date.now()}-${imageFiles[0].name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
        const filePath = path.join(uploadDir, fileName)
        const buffer = Buffer.from(await imageFiles[0].arrayBuffer())
        await writeFile(filePath, buffer)
        image = `/uploads/${fileName}`
      }

      // Upload des vidéos
      videoFiles = formData.getAll("videos") as File[]
      if (videoFiles.length > 0) {
        const uploadDir = path.join(process.cwd(), "public", "uploads")
        await mkdir(uploadDir, { recursive: true })
        const fileName = `${Date.now()}-${videoFiles[0].name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
        const filePath = path.join(uploadDir, fileName)
        const buffer = Buffer.from(await videoFiles[0].arrayBuffer())
        await writeFile(filePath, buffer)
        video = `/uploads/${fileName}`
      }
    } else {
      const body = await req.json()
      content = body.content || ""
      userId = body.userId || ""
      image = body.image || null
      video = body.video || null
      color = body.color || null
      location = body.location || null
      feeling = body.feeling || null
      postType = body.postType || "post"
      parentId = body.parentId || null
    }

    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }
    if ((!content || !content.trim()) && !image && !video && !parentId) {
      return NextResponse.json({ success: false, message: "Contenu requis." }, { status: 422 })
    }
    if (content && content.length > 63206) {
      return NextResponse.json({ success: false, message: "Contenu trop long." }, { status: 422 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ success: false, message: "Utilisateur introuvable." }, { status: 404 })
    }

    // Repost / partage
    if (parentId) {
      const original = await prisma.post.findUnique({ where: { id: parentId } })
      if (!original) {
        return NextResponse.json({ success: false, message: "Post introuvable." }, { status: 404 })
      }
      await prisma.post.update({ where: { id: parentId }, data: { repostCount: { increment: 1 } } })
    }

    const post = await prisma.post.create({
      data: {
        content: content?.trim() || "",
        image,
        video,
        color,
        location,
        feeling,
        postType: postType || "post",
        authorId: userId,
        parentId: parentId || undefined,
      },
      include: {
        author: { select: { id: true, name: true, username: true, avatar: true } },
        parent: {
          include: { author: { select: { id: true, name: true, username: true, avatar: true } } },
        },
      },
    })

    // Hashtags + mentions + activité (en arrière-plan sans bloquer)
    const text = content || ""
    void processHashtags(text)
    void notifyMentions(text, userId)
    void createActivity(userId, parentId ? "repost" : "post", post.id, parentId ? "a partagé une publication" : "a publié une nouvelle publication")

    // ── Synchronisation vers l'API Dughu (best-effort, ne bloque pas la réponse) ──
    if (dughu.enabled && user.dughuId && !parentId) {
      try {
        const dForm = new FormData()
        dForm.append("user_id", String(user.dughuId))
        if (content?.trim()) dForm.append("postText", content.trim())
        for (const f of imageFiles) dForm.append("fileInputForPost[]", f)
        for (const f of videoFiles) dForm.append("fileInputForPost[]", f)
        const raw = await dughuApi.createPost(dForm)
        if (!raw?.success) console.error("DUGHU CREATE POST FAILED:", raw)
      } catch (err) {
        console.error("DUGHU CREATE POST ERROR:", err)
      }
    }

    return NextResponse.json({ success: true, post }, { status: 201 })
  } catch (error) {
    console.error("CREATE POST ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}
