import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, mapStories } from "@/lib/dughu"
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
      dughuApi.getUserStories(dughuUserId).catch(() => null),
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

export async function POST(req: NextRequest) {
  try {
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const formData = await req.formData()
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

    // Contrat Dughu (POST /postStory) : user_id + text / image / video (multipart).
    const payload = new FormData()
    payload.append("user_id", dughuUserId)
    const text = formData.get("text")
    if (typeof text === "string" && text) payload.append("text", text)
    const bgColor = formData.get("bgColor")
    if (typeof bgColor === "string" && bgColor) payload.append("bg_color", bgColor)
    const image = formData.get("image")
    if (image instanceof File && image.size > 0) payload.append("image", image)
    const video = formData.get("video")
    if (video instanceof File && video.size > 0) payload.append("video", video)

    const raw = await dughuApi.postStory(payload)
    if (raw?.success === false) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Erreur de création (API Dughu)." },
        { status: 502 }
      )
    }
    const story = mapStories(raw?.story ?? raw)[0] || null
    return NextResponse.json({ success: true, story }, { status: 201 })
  } catch (error) {
    console.error("CREATE STORY ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

