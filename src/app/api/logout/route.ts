import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  // Invalider la session en base (si on en trouve une) pour une déconnexion complète
  const token = req.cookies.get("next-auth.session-token")?.value
    || req.cookies.get("__Secure-next-auth.session-token")?.value
  if (token) {
    try {
      await prisma.session.deleteMany({ where: { sessionToken: token } })
    } catch (err) {
      console.error("LOGOUT SESSION DELETE ERROR:", err)
    }
  }

  const response = NextResponse.json({ success: true, message: "Déconnecté" })

  // Supprimer le cookie de session
  response.cookies.set("next-auth.session-token", "", { maxAge: 0 })
  response.cookies.set("__Secure-next-auth.session-token", "", { maxAge: 0 })

  return response
}