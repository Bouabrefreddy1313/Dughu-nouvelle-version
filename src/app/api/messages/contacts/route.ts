import { NextRequest, NextResponse } from "next/server"
import { dughuApi, DughuApiError } from "@/lib/dughu"
import { normalizeContacts } from "@/lib/messages"

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const userId = params.get("userId") || ""
  const query = (params.get("q") || "").trim()

  if (!userId) {
    return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 422 })
  }
  if (query.length < 2) {
    return NextResponse.json({ success: true, contacts: [] })
  }

  try {
    const raw = await dughuApi.searchChatContacts(query)
    const normalizedQuery = query.toLocaleLowerCase("fr")
    const contacts = normalizeContacts(raw, userId).filter((contact) =>
      `${contact.id} ${contact.name} ${contact.username || ""}`
        .toLocaleLowerCase("fr")
        .includes(normalizedQuery)
    )
    return NextResponse.json({ success: true, contacts })
  } catch (error) {
    console.error("MESSAGE CONTACT SEARCH ERROR:", error)
    const upstreamStatus = error instanceof DughuApiError ? error.status : 502
    const status = upstreamStatus === 401 || upstreamStatus === 403 ? 502 : upstreamStatus
    return NextResponse.json({ success: false, message: "Recherche indisponible." }, { status })
  }
}
