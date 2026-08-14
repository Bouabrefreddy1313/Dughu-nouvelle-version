import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi } from "@/lib/dughu"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, message: "ID du post requis." }, { status: 422 })
    }

    const raw = await dughuApi.deletePost(id)
    if (raw?.success === false) {
      return NextResponse.json(
        { success: false, message: raw?.message || "Erreur suppression (API Dughu)." },
        { status: 502 }
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE POST ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur suppression." }, { status: 500 })
  }
}