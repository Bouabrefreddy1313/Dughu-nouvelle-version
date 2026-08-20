import { NextRequest, NextResponse } from "next/server"
import { dughuApi, DughuApiError, normalizeUser } from "@/lib/dughu"
import { normalizeChatContact } from "@/lib/messages"

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const targetUserId = params.get("targetUserId") || params.get("userId") || ""
  const currentUserId = params.get("currentUserId") || "0"
  if (!targetUserId) {
    return NextResponse.json({ success: false, message: "Contact requis." }, { status: 422 })
  }

  try {
    let contact = null

    try {
      const raw = await dughuApi.getChatContact(targetUserId)
      contact = normalizeChatContact(raw)
    } catch (error) {
      // Certains environnements n'exposent pas contactChat pour tous les comptes.
      if (!(error instanceof DughuApiError) || error.status !== 404) throw error
    }

    // contactChat peut confirmer le contact sans renvoyer son identité complète.
    // Le profil public est alors la source fiable pour le nom et l'avatar.
    if (!contact || contact.name === "Utilisateur") {
      const rawProfile = await dughuApi.getUser(targetUserId, currentUserId)
      const profile = normalizeUser(
        rawProfile?.user || rawProfile?.data || rawProfile?.profile || rawProfile?.result || rawProfile
      )
      if (profile) {
        contact = {
          id: String(profile.id || targetUserId),
          name: profile.name || profile.username || "Utilisateur",
          username: profile.username || null,
          avatar: profile.avatar || null,
          online: Boolean(
            profile.online === true || profile.is_online === true ||
            profile.online === 1 || profile.is_online === 1 ||
            profile.online === "1" || profile.is_online === "1"
          ),
          lastSeen: profile.lastSeen || null,
        }
      }
    }

    return NextResponse.json({ success: true, contact })
  } catch (error) {
    console.error("CHAT CONTACT ERROR:", error)
    const status = error instanceof DughuApiError ? error.status : 502
    return NextResponse.json({ success: false, message: "Impossible de charger ce contact." }, { status })
  }
}
