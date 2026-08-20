import { NextRequest, NextResponse } from "next/server"
import { dughuApi, DughuApiError, normalizeUser } from "@/lib/dughu"
import { normalizeChats } from "@/lib/messages"

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("userId") || ""
  if (!userId) {
    return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 422 })
  }

  try {
    const raw = await dughuApi.getUserChats(userId)
    const chats = normalizeChats(raw, userId)
    const enrichedChats = await Promise.all(chats.map(async (chat) => {
      if (chat.contact.name !== "Utilisateur" || !/^\d+$/.test(chat.contact.id)) return chat

      try {
        const rawProfile = await dughuApi.getUser(chat.contact.id, userId)
        const profile = normalizeUser(
          rawProfile?.user ||
          rawProfile?.data?.user ||
          rawProfile?.data ||
          rawProfile?.profile ||
          rawProfile?.result?.user ||
          rawProfile?.result ||
          rawProfile
        )
        if (!profile) return chat
        const profileName = profile.name && profile.name !== "Utilisateur"
          ? profile.name
          : profile.username || chat.contact.username || chat.contact.name
        return {
          ...chat,
          contact: {
            ...chat.contact,
            name: profileName,
            username: profile.username || chat.contact.username,
            avatar: profile.avatar || chat.contact.avatar,
          },
        }
      } catch {
        return chat
      }
    }))
    return NextResponse.json({ success: true, chats: enrichedChats })
  } catch (error) {
    console.error("CHATS ERROR:", error)
    const status = error instanceof DughuApiError ? error.status : 502
    return NextResponse.json({ success: false, message: "Impossible de charger les conversations." }, { status })
  }
}
