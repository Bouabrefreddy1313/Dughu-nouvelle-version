import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const BASE = (process.env.DUGHU_API_BASE_URL || "https://apitest.dughu.com/api").replace(/\/+$/, "")
const API_TOKEN = process.env.DUGHU_API_KEY || ""

export async function POST(req: NextRequest) {
  const dughuToken = req.cookies.get("dughu_token")?.value
  const dughuUserId = req.cookies.get("dughu_user_id")?.value

  // Déconnexion côté Dughu (best-effort : ne bloque jamais la déconnexion locale)
  try {
    await fetch(`${BASE}/logout`, {
      method: "POST",
      headers: { "X-AppApiToken": API_TOKEN, Authorization: `Bearer ${dughuToken || ""}`, Accept: "application/json" },
    }).catch(() => {})
  } catch { /* silencieux */ }

  if (dughuUserId) {
    try {
      const body = new URLSearchParams({ user_id: dughuUserId })
      await fetch(`${BASE}/sessionsDestroy`, {
        method: "POST",
        headers: {
          "X-AppApiToken": API_TOKEN,
          Authorization: `Bearer ${dughuToken || ""}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }).catch(() => {})
    } catch { /* silencieux */ }
  }

  // Session locale héritée (avant migration)
  const legacyToken =
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value
  if (legacyToken) {
    try {
      await prisma.session.deleteMany({ where: { sessionToken: legacyToken } })
    } catch { /* silencieux */ }
  }

  const response = NextResponse.json({ success: true, message: "Déconnecté" })
  response.cookies.set("dughu_token", "", { maxAge: 0, path: "/" })
  response.cookies.set("dughu_user_id", "", { maxAge: 0, path: "/" })
  response.cookies.set("next-auth.session-token", "", { maxAge: 0, path: "/" })
  response.cookies.set("__Secure-next-auth.session-token", "", { maxAge: 0, path: "/" })

  return response
}