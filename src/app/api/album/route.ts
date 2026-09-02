import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, mapAlbums, getPageInfo } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

/**
 * GET /api/album?user_id={id}&page={page}
 * Liste des albums de l'utilisateur (chaque album embarque ses médias).
 * `user_id` est l'ID Dughu ; à défaut, il est lu depuis le cookie de session.
 */
export async function GET(req: NextRequest) {
  try {
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("user_id") || searchParams.get("userId") || (await getDughuUserIdFromCookies())
    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }

    const page = Number(searchParams.get("page")) || 1
    const raw = await dughuApi.getAlbums(userId, page)
    if (!raw?.success) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Erreur de récupération des albums (API Dughu)." },
        { status: 502 }
      )
    }

    const albums = mapAlbums(raw)
    const pageInfo = getPageInfo(raw)
    return NextResponse.json({
      success: true,
      albums,
      page: pageInfo.page,
      hasMore: pageInfo.hasMore,
    })
  } catch (error) {
    console.error("ALBUMS ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}

/**
 * POST /api/album — création d'un album en multipart/form-data :
 * album_name (requis), type (public|private, requis), albumarray[] (fichiers),
 * user_id résolu depuis le formulaire ou le cookie de session.
 */
export async function POST(req: NextRequest) {
  try {
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const contentType = req.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, message: "Requête multipart/form-data attendue." },
        { status: 415 }
      )
    }
    const formData = await req.formData()

    const albumName = String(formData.get("album_name") || "").trim()
    // Contrat API Dughu (vérifié en réel) : le type doit valoir « public » ou
    // « prive » SANS accent. Le client peut envoyer « private » ou « privé »,
    // on normalise avant validation.
    const rawType = String(formData.get("type") || "").trim().toLowerCase()
    const type =
      rawType === "private" || rawType === "privé"
        ? "prive"
        : rawType === "public"
          ? "public"
          : rawType
    // Le client peut envoyer les fichiers sous « albumarray » ou « albumArray[] ».
    const files = [
      ...formData.getAll("albumarray"),
      ...formData.getAll("albumArray[]"),
      ...formData.getAll("albumArray"),
    ].filter((f): f is File => f instanceof File)

    // Validation avant envoi
    if (!albumName) {
      return NextResponse.json({ success: false, message: "Le nom de l'album est requis." }, { status: 422 })
    }
    if (type !== "public" && type !== "prive") {
      return NextResponse.json(
        { success: false, message: "La visibilité de l'album est requise (public ou prive)." },
        { status: 422 }
      )
    }
    if (files.length === 0) {
      return NextResponse.json(
        { success: false, message: "Ajoutez au moins une photo ou vidéo à l'album." },
        { status: 422 }
      )
    }

    const userId = String(formData.get("user_id") || formData.get("userId") || "") || (await getDughuUserIdFromCookies())
    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }

    // Reconstruction du FormData serveur (contrat API Dughu vérifié en réel :
    // album_name, type, user_id et les fichiers sous « albumArray[] » —
    // camelCase + crochet, sinon l'API renvoie 422 « au moins un fichier »).
    // Jamais de secret exposé au client.
    const payload = new FormData()
    payload.set("user_id", userId)
    payload.set("album_name", albumName)
    payload.set("type", type)
    for (const file of files) {
      payload.append("albumArray[]", file, file.name)
    }

    const raw = await dughuApi.createAlbum(payload)
    if (!raw?.success) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Erreur de création de l'album (API Dughu)." },
        { status: 502 }
      )
    }
    return NextResponse.json({ success: true, message: raw?.message || "Album créé avec succès." })
  } catch (error) {
    console.error("ALBUM CREATE ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}