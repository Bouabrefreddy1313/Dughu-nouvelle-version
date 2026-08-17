import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, normalizeUser, parseCounts, mapPhotos, mapFriends, pick } from "@/lib/dughu"

const DEFAULT_COVER = "/images/group/default-cover.jpg"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const slug = searchParams.get("slug")
    const currentUserId = searchParams.get("currentUserId")

    if (!userId && !slug) {
      return NextResponse.json({ success: false, message: "Identifiant requis." }, { status: 422 })
    }

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    // Résoudre l'utilisateur local pour obtenir son dughuId (ou chercher par username via l'API)
    const localUser = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, dughuId: true },
        })
      : await prisma.user.findFirst({
          where: {
            OR: [{ username: slug as string }, { slug: slug as string }],
          },
          select: { id: true, dughuId: true },
        })

    // L'ID du visiteur connecté côté Dughu
    let viewerDughuId = "0"
    if (currentUserId) {
      const viewer = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { dughuId: true },
      })
      viewerDughuId = viewer?.dughuId || "0"
    }

    // Résoudre l'identifiant Dughu cible : dughuId local, sinon username (par slug)
    let targetIdentifier: string | undefined
    if (localUser?.dughuId) {
      targetIdentifier = localUser.dughuId
    } else if (slug) {
      targetIdentifier = slug
    } else if (userId && currentUserId === userId) {
      return NextResponse.json(
        { success: false, message: "Votre compte n'est pas lié à un compte Dughu." },
        { status: 404 }
      )
    } else if (userId) {
      return NextResponse.json(
        { success: false, message: "Cet utilisateur n'a pas de compte Dughu." },
        { status: 404 }
      )
    } else {
      return NextResponse.json(
        { success: false, message: "Profil Dughu introuvable." },
        { status: 404 }
      )
    }

    const raw = await dughuApi.getUser(targetIdentifier, viewerDughuId)
    const userObj = normalizeUser(raw?.user || raw?.data || raw?.profile || raw?.result || raw)
    if (!userObj) {
      throw new Error("Profil Dughu introuvable")
    }

    const resultObj = raw?.result ?? raw
    const details = parseCounts(resultObj?.details ?? raw?.details ?? raw?.user?.details ?? userObj.details)
    const username = userObj.username || userObj.slug || ""
    const [photos, friends] = await Promise.all([
      username ? dughuApi.getUserPhotos(username, 1).then((raw) => {
        console.log("DUGHU PHOTOS RAW:", JSON.stringify(raw).slice(0, 500))
        return mapPhotos(raw)
      }).catch((e) => { console.error("DUGHU PHOTOS ERROR:", e); return [] }) : Promise.resolve([]),
      userObj.id ? dughuApi.getUserFriends(userObj.id).then(mapFriends).catch(() => []) : Promise.resolve([]),
    ])

    // Les vrais compteurs sont des champs numériques au niveau supérieur de la
    // réponse Dughu (NbrPostsTotal, followersNbr, followingsNbr), pas `details`.
    const pickNbr = (primary: any, fallback: number) => {
      const n = Number(primary)
      return Number.isFinite(n) ? n : fallback
    }

    const isFollowing =
      !!pick(raw, "is_following", "isFollowing", "follow_status", "followStatus") ||
      !!userObj.isFollowing

    const targetDughuId = String(localUser?.dughuId || userObj.id || "")

    return NextResponse.json({
      success: true,
      user: {
        ...userObj,
        id: localUser?.id || userObj.id,
        dughuId: targetDughuId,
        name: userObj.name,
        avatar: userObj.avatar,
        cover: userObj.cover,
      },
      info: {
        email: userObj.email,
        phone: userObj.phone,
        phoneNumber: userObj.phone,
        country: null,
        gender: userObj.gender,
        birthdate: userObj.birthdate,
        joined: pick(raw, "createdAt", "created_at", "dateCreation", "joined") || "",
        registered: pick(raw, "createdAt", "created_at", "dateCreation", "registered") || "",
      },
      stats: {
        posts: pickNbr(resultObj?.NbrPostsTotal, details.posts),
        followers: pickNbr(resultObj?.followersNbr, details.followers),
        following: pickNbr(resultObj?.followingsNbr, details.following),
        friends: friends.length || details.friends,
      },
      friends,
      recentFollowers: [],
      photos,
      groups: [],
      pages: { owned: [], liked: [] },
      isFollowing,
    })
  } catch (error) {
    console.error("PROFILE GET ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur lors du chargement du profil." }, { status: 500 })
  }
}