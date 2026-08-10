import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Déconnecté" })
  
  // Supprimer le cookie de session
  response.cookies.set("next-auth.session-token", "", { maxAge: 0 })
  response.cookies.set("__Secure-next-auth.session-token", "", { maxAge: 0 })
  
  return response
}