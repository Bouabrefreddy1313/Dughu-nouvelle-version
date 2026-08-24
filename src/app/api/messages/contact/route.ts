import { NextRequest, NextResponse } from "next/server"
import { dughuApi, DughuApiError, normalizeUser } from "@/lib/dughu"

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const targetUserId = params.get("targetUserId") || params.get("userId") || ""
  const currentUserId = params.get("currentUserId") || "0"
  if (!targetUserId) {
    return NextResponse.json({ success: false, message: "Contact requis." }, { status: 422 })
  }

  try {
    // contactChat/{userId} renvoie une liste paginée de comptes suivis, pas
    // l'identité d'un interlocuteur précis. On résout celle-ci via son profil.
    const rawProfile = await dughuApi.getUser(targetUserId, currentUserId)
    const profile = normalizeUser(
      rawProfile?.user || rawProfile?.data?.user || rawProfile?.data ||
      rawProfile?.profile || rawProfile?.result?.user || rawProfile?.result || rawProfile
    )
    const contact = profile ? {
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
    } : null

    return NextResponse.json({ success: true, contact })
  } catch (error) {
    console.error("CHAT CONTACT ERROR:", error)
    const upstreamStatus = error instanceof DughuApiError ? error.status : 502
    const status = upstreamStatus === 401 || upstreamStatus === 403 ? 502 : upstreamStatus
    return NextResponse.json({ success: false, message: "Impossible de charger ce contact." }, { status })
  }
}
