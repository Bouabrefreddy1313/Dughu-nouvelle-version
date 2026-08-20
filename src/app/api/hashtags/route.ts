import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi } from "@/lib/dughu"

export async function GET(req: NextRequest) {
  try {
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""

    const raw = await dughuApi.getHashtags(q)
    // La réponse Dughu est un tableau de chaînes (avec des éléments vides).
    const arr = Array.isArray(raw)
      ? raw
      : raw?.result?.data || raw?.result || raw?.data || raw?.hashtags || []
    const tags = (Array.isArray(arr) ? arr : [])
      .map((t: unknown) => String(t || "").trim().replace(/^#/, ""))
      .filter(Boolean)
      // Filtre côté client (l'API renvoie une liste fixe même sans q).
      .filter((t: string) => !q || t.toLocaleLowerCase().includes(q.toLocaleLowerCase()))

    const unique = Array.from(new Set(tags)).slice(0, 8)

    return NextResponse.json({
      success: true,
      tags: unique.map((tag) => ({ tag: `#${tag}`, label: tag })),
    })
  } catch (error) {
    console.error("HASHTAGS ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}
