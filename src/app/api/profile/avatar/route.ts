import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, DughuApiError, normalizeUser, pick, resolveMediaUrl } from "@/lib/dughu"
import { resolveDughuUserIdFromLocalId } from "@/lib/dughu-user"

function summarizeRaw(raw: any) {
  if (raw == null) return null
  if (typeof raw === "string") return raw.slice(0, 400)
  if (typeof raw !== "object") return String(raw)
  const source = raw?.result || raw?.user || raw?.data || raw?.profile || raw
  return {
    keys: Object.keys(raw).slice(0, 20),
    success: raw?.success ?? null,
    message: raw?.message ?? null,
    error: raw?.error ?? null,
    sourceKeys: source && typeof source === "object" ? Object.keys(source).slice(0, 20) : null,
  }
}

function extractMediaUrl(raw: any, userObj: Record<string, any> | null, field: "avatar" | "cover") {
  const directKeys =
    field === "avatar"
      ? ["avatar", "image", "profile_image", "profileImage", "profile_picture", "profilePicture", "photo"]
      : ["cover", "background", "cover_image", "coverImage", "banner"]

  const candidates = [
    userObj?.[field],
    pick(raw?.result, ...directKeys),
    pick(raw, ...directKeys),
    pick(raw?.user, ...directKeys),
    pick(raw?.data, ...directKeys),
    pick(raw?.profile, ...directKeys),
  ]

  for (const candidate of candidates) {
    const resolved = resolveMediaUrl(String(candidate || ""))
    if (resolved) return resolved
  }

  return ""
}

function extractApiErrorMessage(data: any) {
  return (
    (Array.isArray(data?.messages) && data.messages.join(" ")) ||
    (Array.isArray(data?.error) && data.error.join(" ")) ||
    (data?.message && String(data.message)) ||
    (typeof data === "string" ? data : null) ||
    null
  )
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const userId = (formData.get("userId") as string) || ""
    const file = formData.get("avatar") as File | null

    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }
    if (!file || !file.size) {
      return NextResponse.json({ success: false, message: "Image requise." }, { status: 422 })
    }

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    let dughuUserId = String(formData.get("dughuUserId") || "")
    if (!dughuUserId) {
      // Fallback serveur : résolution de l'ID Dughu depuis le compte local.
      dughuUserId = await resolveDughuUserIdFromLocalId(userId)
    }
    if (!dughuUserId) {
      return NextResponse.json(
        { success: false, message: "ID Dughu requis." },
        { status: 404 }
      )
    }

    const payload = new FormData()
    payload.append("user_id", String(dughuUserId))
    payload.append("avatar", file)
    console.log("AVATAR UPDATE REQUEST:", { userId, dughuUserId, fileName: file.name, fileType: file.type, fileSize: file.size })
    const raw = await dughuApi.updateProfile(payload)
    const userObj = normalizeUser(raw?.result || raw?.user || raw?.data || raw?.profile || raw)
    const avatar = extractMediaUrl(raw, userObj, "avatar")

    if (!avatar) {
      if (raw && typeof raw === "object" && raw.success === false) {
        const msg = extractApiErrorMessage(raw)
        console.error("AVATAR UPDATE API REJECTED:", summarizeRaw(raw))
        return NextResponse.json(
          { success: false, message: msg ? `Dughu: ${msg}` : "Dughu a refusé la mise à jour de l'avatar.", debug: summarizeRaw(raw) },
          { status: 502 }
        )
      }
      console.error("AVATAR UPDATE INVALID RESPONSE:", summarizeRaw(raw))
      return NextResponse.json({ success: false, message: "Dughu a mis à jour l'avatar mais n'a pas renvoyé d'URL exploitable.", debug: summarizeRaw(raw) }, { status: 502 })
    }

    if (avatar) {
      await prisma.user.update({ where: { id: userId }, data: { avatar, image: avatar } })
    }
    return NextResponse.json({ success: true, avatar, image: avatar, debug: summarizeRaw(raw) })
  } catch (error) {
    console.error("AVATAR UPDATE ERROR:", error)
    if (error instanceof DughuApiError) {
      return NextResponse.json(
        {
          success: false,
          message: `Erreur Dughu (${error.status}) lors de la mise à jour de l'avatar.`,
          debug: summarizeRaw(error.data),
        },
        { status: error.status || 502 }
      )
    }
    return NextResponse.json(
      { success: false, message: "Erreur lors de la mise à jour de l'avatar.", debug: String(error) },
      { status: 500 }
    )
  }
}