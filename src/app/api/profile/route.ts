import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, normalizeUser, parseCounts, mapPhotos, mapVideos, mapFriends, pick } from "@/lib/dughu"
import { normalizeProfileRelations } from "@/lib/profile-relations"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const slug = searchParams.get("slug")
    const dughuUserId = searchParams.get("dughuUserId")

    if (!userId && !slug) {
      return NextResponse.json({ success: false, message: "Identifiant requis." }, { status: 422 })
    }

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const viewerDughuId = await getDughuUserIdFromCookies() || "0"

    // Résoudre l'identifiant Dughu cible : dughuUserId fourni, sinon slug/username
    // (le profil Dughu est la source de vérité).
    let targetIdentifier: string | undefined
    if (dughuUserId) {
      targetIdentifier = dughuUserId
    } else if (slug) {
      targetIdentifier = slug
    } else if (userId) {
      targetIdentifier = userId
    }
    if (!targetIdentifier) {
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
    const [photos, friends, videos, relationRequests] = await Promise.all([
      // Uniquement les photos publiées par l'utilisateur, via l'endpoint dédié
      // profile/{username}/photos (pas d'images extraites des posts/reposts)
      username ? dughuApi.getUserPhotos(username, 1).then((raw) => {
        console.log("DUGHU PHOTOS RAW:", JSON.stringify(raw).slice(0, 500))
        return mapPhotos(raw)
      }).catch((e) => { console.error("DUGHU PHOTOS ERROR:", e); return [] }) : Promise.resolve([]),
      userObj.id ? dughuApi.getUserFriends(userObj.id).then(mapFriends).catch(() => []) : Promise.resolve([]),
      // Vidéos publiées par l'utilisateur via l'endpoint dédié
      // profile/{username}/videos
      username ? dughuApi.getUserVideos(username, 1).then((raw) => {
        console.log("DUGHU VIDEOS RAW:", JSON.stringify(raw).slice(0, 500))
        return mapVideos(raw)
      }).catch((e) => { console.error("DUGHU VIDEOS ERROR:", e); return [] }) : Promise.resolve([]),
      viewerDughuId !== "0" && String(userObj.id) !== viewerDughuId
        ? Promise.all([
            dughuApi.getRelationRequests(viewerDughuId, userObj.id, "friend")
              .then((response) => ({ type: "friend" as const, response })).catch(() => null),
            dughuApi.getRelationRequests(viewerDughuId, userObj.id, "network")
              .then((response) => ({ type: "network" as const, response })).catch(() => null),
          ]).then((responses) => responses.filter(Boolean))
        : Promise.resolve([]),
    ])

    const allPhotos = photos

    // Les vrais compteurs sont des champs numériques au niveau supérieur de la
    // réponse Dughu (NbrPostsTotal, followersNbr, followingsNbr), pas `details`.
    const pickNbr = (primary: unknown, fallback: number) => {
      const n = Number(primary)
      return Number.isFinite(n) ? n : fallback
    }

    const followValue = pick(raw, "is_following", "isFollowing", "follow_status", "followStatus") ??
      pick(resultObj, "is_following", "isFollowing", "follow_status", "followStatus")
    const isFollowing =
      followValue === true || followValue === 1 || followValue === "1" || followValue === "true" || userObj.isFollowing

    return NextResponse.json({
      success: true,
      user: {
        ...userObj,
        id: String(userObj.id || ""),
        // Toujours exposer l'ID Dughu de la cible : permet au frontend de
        // détecter "mon propre profil" même quand le username local a divergé
        // du username Dughu (renommé côté Dughu), en comparant les ID Dughu
        // plutôt que les id locaux.
        dughu: { userId: String(userObj.id || "") },
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
        countryId: userObj.countryId,
        city: userObj.city,
        postcode: userObj.postcode,
        signature: userObj.signature,
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
      photos: allPhotos,
      videos,
      groups: [],
      pages: { owned: [], liked: [] },
      isFollowing,
      relations: normalizeProfileRelations(raw, relationRequests, String(userObj.id)),
    })
  } catch (error) {
    console.error("PROFILE GET ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur lors du chargement du profil." }, { status: 500 })
  }
}
