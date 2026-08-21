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

    // Garde-fou local : l'API exige image OU texte.
    if (!mediaFile && !text) {
      return NextResponse.json(
        { success: false, message: "Ajoutez un texte ou un média pour publier un Flash." },
        { status: 400 }
      )
    }

    // `duration` toujours au format "MM:SS", jamais en secondes brutes.
    const requestedDurationSeconds = Number(formData.get("durationSeconds") || 15)
    payload.append("duration", formatDuration(requestedDurationSeconds))

    // Le backend Dughu attend l'ID NUMÉRIQUE de la couleur (17, 18, 19, …)
    // et non le code hexadécimal. Le frontend envoie désormais l'ID.
    // Mapping hex → ID pour compatibilité avec les anciens clients.
    const HEX_TO_ID: Record<string, number> = {
      "#98b262": 17, "#000000": 18, "#ffb0ff": 19, "#0000ff": 24,
      "#4e26ff": 25, "#ff0fff": 27, "#ffff00": 30, "#e8670c": 31,
      "#ff3dff": 32, "#91ff3d": 33, "#ccb38d": 34,
    }
    const bgColor = formData.get("bgColor")
    let finalBgColorId = "18" // Fallback robuste : noir (ID 18)

    if (typeof bgColor === "string" && bgColor) {
      const trimmed = bgColor.trim()
      // Cas 1 : l'ID numérique est déjà envoyé (ex. "18")
      if (/^\d+$/.test(trimmed)) {
        finalBgColorId = trimmed
      } else {
        // Cas 2 : un code hexadécimal est envoyé (compatibilité) → mapper vers l'ID
        const hexMatch = trimmed.match(/#[0-9a-fA-F]{3,8}/i)
        if (hexMatch) {
          const hex = hexMatch[0].toLowerCase()
          const mappedId = HEX_TO_ID[hex]
          if (mappedId) finalBgColorId = String(mappedId)
        }
      }
    }
    
    // On envoie toujours un ID de couleur valide pour satisfaire l'API
    payload.append("bg_color", finalBgColorId)

    if (mediaFile && mediaFile.size > 0) {
      // Le backend est pointilleux sur la clé du fichier. Pour être certain
      // qu'il le détecte, on l'envoie sous les clés les plus probables.
      payload.append("file", mediaFile, mediaFile.name)
      payload.append("image", mediaFile, mediaFile.name)
      payload.append("postFile", mediaFile, mediaFile.name)
      payload.append("media", mediaFile, mediaFile.name)
      
      // Si l'API refuse text + media, on omet la description si on a un média
      if (text) {
        payload.append("description", text)
        payload.append("text", text)
      }
    } else {
      // Pour un Flash purement texte, on envoie le texte (ou une valeur par défaut)
      // On l'envoie sous 'description' et 'text' pour satisfaire la validation Laravel
      const finalContent = text || "📷"
      payload.append("description", finalContent)
      payload.append("text", finalContent)
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
      let errorDetails = raw?.message || "Erreur de création (API Dughu)."
      if (raw?.errors) {
        errorDetails += " Details: " + JSON.stringify(raw.errors)
      }
      return NextResponse.json(
        { success: false, message: errorDetails },
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
        let m =
          (detail as any)?.message ||
          (detail as any)?.message_text ||
          (detail as any)?.error?.message ||
          "Erreur Dughu"
        
        if (errors) {
          m += " - " + JSON.stringify(errors)
        }
        message = m
      } else {
        message = error.message || message
      }
    } else if (error instanceof Error) {
      message = error.message
    }
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}