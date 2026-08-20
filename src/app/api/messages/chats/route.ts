import { NextRequest, NextResponse } from "next/server"
import { dughuApi, DughuApiError, normalizeUser } from "@/lib/dughu"
import { normalizeChats, normalizeMessages } from "@/lib/messages"

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("userId") || ""
  if (!userId) {
    return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 422 })
  }

  try {
    const raw = await dughuApi.getUserChats(userId)
    const chats = normalizeChats(raw, userId)
    const enrichedChats = await Promise.all(chats.map(async (chat) => {
      let enrichedChat = chat

      if (chat.contact.name === "Utilisateur" && /^\d+$/.test(chat.contact.id)) {
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
          if (profile) {
            const profileName = profile.name && profile.name !== "Utilisateur"
              ? profile.name
              : profile.username || chat.contact.username || chat.contact.name
            enrichedChat = {
              ...enrichedChat,
              contact: {
                ...enrichedChat.contact,
                name: profileName,
                username: profile.username || enrichedChat.contact.username,
                avatar: profile.avatar || enrichedChat.contact.avatar,
                online: Boolean(profile.online) || enrichedChat.contact.online,
                lastSeen: profile.lastSeen || enrichedChat.contact.lastSeen,
              },
            }
          }
        } catch {
          // Le profil est un enrichissement facultatif de la conversation.
        }
      }

      if (!enrichedChat.lastMessage) {
        try {
          const rawMessages = await dughuApi.getConversationMessages(userId, chat.contact.id)
          const messages = normalizeMessages(rawMessages, userId, chat.contact.id)
          const lastMessage = messages.at(-1)
          if (lastMessage) {
            const attachmentLabel = lastMessage.attachments.some((item) => item.type === "image")
              ? "Photo"
              : lastMessage.attachments.some((item) => item.type === "video")
                ? "Vidéo"
                : lastMessage.attachments.some((item) => item.type === "document")
                  ? "Document"
                  : ""
            const preview = lastMessage.text || attachmentLabel
            enrichedChat = {
              ...enrichedChat,
              lastMessage: preview,
              updatedAt: lastMessage.createdAt || enrichedChat.updatedAt,
              lastMessageKey: lastMessage.id || `${lastMessage.createdAt}:${preview}`,
            }
          }
        } catch {
          // Une conversation reste affichable même si son historique est indisponible.
        }
      }

      return enrichedChat
    }))
    return NextResponse.json({ success: true, chats: enrichedChats })
  } catch (error) {
    console.error("CHATS ERROR:", error)
    const status = error instanceof DughuApiError ? error.status : 502
    return NextResponse.json({ success: false, message: "Impossible de charger les conversations." }, { status })
  }
}
