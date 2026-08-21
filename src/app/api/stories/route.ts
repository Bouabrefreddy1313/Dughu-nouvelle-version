import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, mapStories, DughuApiError } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export async function GET(req: NextRequest) {
  try {
    if (!dughu.enabled) {
      return NextResponse.json({ success: true, stories: [] })
    }
    const { searchParams } = new URL(req.url)
    const dughuUserId = searchParams.get("userId") || (await getDughuUserIdFromCookies())

    if (!dughuUserId) {
      return NextResponse.json({ success: true, stories: [] })
    }

    // Stories des amis + mes propres stories (endpoints Dughu).
    const [friendsRaw, mineRaw] = await Promise.all([
      dughuApi.getFriendsStories(dughuUserId).catch(() => null),
      dughuApi.getUserStories(dughuUserId, dughuUserId).catch(() => null),
    ])
    const friendsStories = mapStories(friendsRaw?.stories ?? friendsRaw)
    const authStories = mapStories(friendsRaw?.authStories ?? (mineRaw?.stories ?? mineRaw))
    const stories = [...authStories, ...friendsStories]

    return NextResponse.json({ success: true, stories })
  } catch (error) {
    console.error("STORIES ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

// Formate une durée en secondes vers le format "MM:SS" attendu par Dughu
// (ex. 15 -> "00:15", 180 -> "03:00").
function formatDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.round(totalSeconds) : 15
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export async function POST(req: NextRequest) {
  try {
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    let debugMultipart: Record<string, string | number> = {}
    for (const key of formData.keys()) {
      const val = formData.get(key)
      debugMultipart[key] =
        val instanceof File ? `File(size=${val.size}, name=${val.name}, type=${val.type})` : String(val)
    }
    console.log("[FLASH DEBUG] multipart reçu =>", JSON.stringify(debugMultipart, null, 2))
    const userId = String(formData.get("userId") || "")
    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }
    let dughuUserId = String(formData.get("dughuUserId") || "")
    if (!dughuUserId) {
      // Fallback serveur : lecture du cookie de session Dughu
      dughuUserId = await getDughuUserIdFromCookies()
    }
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }

    // Contrat Dughu (POST /postStory) — form-data :
    //   user_id (text, requis)
    //   description (text, requis)
    //   duration (text, requis — format "MM:SS", ex. "03:00")
    //   image (file, requis si pas de description suffisante)
    //   title (text, optionnel)
    //   bg_color (text, optionnel)
    const payload = new FormData()
    payload.append("user_id", dughuUserId)

    const rawText = formData.get("text")
    const text = typeof rawText === "string" ? rawText.trim() : ""

    const mediaFile = (formData.get("image") as File | null) || (formData.get("video") as File | null)

    // `description` est toujours envoyée non vide : Dughu semble rejeter une
    // chaîne vide (ou un simple espace, probablement "trim" côté API) même
    // pour un Flash purement média. On ne force rien côté utilisateur (le
    // champ reste optionnel dans l'UI) — une valeur par défaut visible est
    // envoyée à l'API quand aucune légende n'a été saisie.
    payload.append("description", text || "📷")

    // `duration` toujours au format "MM:SS", jamais en secondes brutes.
    const requestedDurationSeconds = Number(formData.get("durationSeconds") || 15)
    payload.append("duration", formatDuration(requestedDurationSeconds))

    const bgColor = formData.get("bgColor")
    if (typeof bgColor === "string" && bgColor) {
      // `bg_color` est un texte simple côté API : on envoie une couleur
      // sûre (hex) même si le frontend fournit un dégradé CSS complet.
      const hexMatch = bgColor.match(/#[0-9a-fA-F]{3,8}/)
      if (hexMatch) payload.append("bg_color", hexMatch[0])
    }

    if (mediaFile && mediaFile.size > 0) {
      payload.append("image", mediaFile, mediaFile.name)
    }

    // Garde-fou local avant l'appel réseau : l'API exige image OU texte.
    if (!mediaFile && !text) {
      return NextResponse.json(
        { success: false, message: "Ajoutez un texte ou un média pour publier un Flash." },
        { status: 400 }
      )
    }

    const raw = await dughuApi.postStory(payload)
    if (raw?.success === false) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Erreur de création (API Dughu)." },
        { status: 502 }
      )
    }
    // DEBUG FLASH — renvoie la réponse brute de postStory + le multipart reçu
    // pour identifier le champ exact de l'image depuis l'onglet Réseau.
    const story = mapStories(raw?.story ?? raw)[0] || null
    return NextResponse.json({ success: true, story, debug: raw, debugMultipart }, { status: 201 })
  } catch (error) {
    console.error("CREATE STORY ERROR:", error)
    // Extraire le détail (body 4xx) de l'erreur Dughu quand il existe
    let message = "Erreur création du Flash"
    if (error instanceof DughuApiError) {
      const detail = error.data
      console.error("DUGHU 4xx DETAIL:", JSON.stringify(detail))
      if (detail && typeof detail === "object") {
        const errors = (detail as any)?.errors
        const m =
          (detail as any)?.message ||
          (detail as any)?.message_text ||
          (detail as any)?.error?.message ||
          (errors ? JSON.stringify(errors) : "")
        message = m || error.message
      } else {
        message = error.message || message
      }
    } else if (error instanceof Error) {
      message = error.message
    }
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}