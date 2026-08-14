import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi } from "@/lib/dughu"

export async function POST(req: NextRequest) {
  try {
    const { postId, userId } = await req.json()

    if (!postId || !userId) {
      return NextResponse.json({ success: false, message: "Paramètres requis." }, { status: 422 })
    }
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    // Résolution du compte local vers le compte Dughu
    const actingUser = await prisma.user.findUnique({ where: { id: userId }, select: { dughuId: true } })
    if (!actingUser?.dughuId) {
      return NextResponse.json({ success: false, message: "Compte Dughu requis." }, { status: 404 })
    }

    const raw = await dughuApi.savePost(actingUser.dughuId, postId)
    if (raw?.success === false) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Erreur d'enregistrement (API Dughu)." },
        { status: 502 }
      )
    }
    const saved = raw?.saved ?? raw?.is_saved ?? true
    return NextResponse.json({ success: true, saved: !!saved })
  } catch (error) {
    console.error("STORE-SAVE ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur d'enregistrement." }, { status: 500 })
  }
}