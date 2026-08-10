import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { processHashtags, notifyMentions, createActivity } from "@/lib/feed"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const POSTS_PER_PAGE = 10

type PostWithRelations = Awaited<ReturnType<typeof fetchPosts>>[number]

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

function enrichPosts(posts: PostWithRelations[], currentUserId: string, state?: { savedIds: Set<string>; hiddenIds: Set<string>; pinnedIds: Set<string> }) {
  return posts.map((p) => ({
    ...p,
    reacted: p.likes.find((l) => l.userId === currentUserId)?.type || null,
    saved: state ? state.savedIds.has(p.id) : false,
    hidden: state ? state.hiddenIds.has(p.id) : false,
    pinned: state ? state.pinnedIds.has(p.id) : false,
  }))
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1)
    const filter = searchParams.get("filter") || "all"
    const userId = searchParams.get("userId")

    const take = POSTS_PER_PAGE
    const skip = (page - 1) * take

    // Exclusions : posts masqués + auteurs bloqués
    const where: Prisma.PostWhereInput = { active: "1" }

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
      if (blockedIds.size) where.authorId = { notIn: [...blockedIds] }
    }

    // Filtre "following" : posts des suivis + les siens
    if (filter === "following" && userId) {
      const follows = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      })
      const followingIds = follows.map((f) => f.followingId)
      where.authorId = { in: [...followingIds, userId] }
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
    let pinnedFull: PostWithRelations[] = []
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
      const imageFiles = formData.getAll("images") as File[]
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
      const videoFiles = formData.getAll("videos") as File[]
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

    return NextResponse.json({ success: true, post }, { status: 201 })
  } catch (error) {
    console.error("CREATE POST ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}
