import { NextResponse } from "next/server"

// Sonde de disponibilité pour Docker / Nginx / superviseur.
// Volontairement sans appel à l'API Dughu : elle indique que le processus
// Next.js répond, pas que le backend distant est joignable — sinon une panne
// de l'API Dughu ferait redémarrer en boucle un conteneur pourtant sain.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export function GET() {
  return NextResponse.json(
    { status: "ok", uptime: Math.round(process.uptime()) },
    { headers: { "Cache-Control": "no-store" } },
  )
}
