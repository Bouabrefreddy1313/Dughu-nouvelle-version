import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { uploadGroupImage } from "@/services/groups/groups.server"
import { validateGroupImageFile } from "@/services/groups/create-group.mapper"
import type { GroupImageElement } from "@/types/groups/create-group.types"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    if (!(await getDughuUserIdFromCookies())) {
      return NextResponse.json({ success: false, message: "Votre session a expiré. Veuillez vous reconnecter." }, { status: 401 })
    }
    const formData = await request.formData()
    const pageId = String(formData.get("page_id") || "").trim()
    const rawImage = formData.get("image")
    const rawElement = String(formData.get("element") || "")
    const element: GroupImageElement | null = rawElement === "avatar" || rawElement === "cover" ? rawElement : null
    const image = rawImage instanceof File ? rawImage : null
    if (!pageId || !/^\d+$/.test(pageId)) return NextResponse.json({ success: false, message: "Identifiant de groupe invalide." }, { status: 422 })
    if (!element) return NextResponse.json({ success: false, message: "Type d’image invalide." }, { status: 422 })
    const imageError = await validateGroupImageFile(image)
    if (imageError || !image) return NextResponse.json({ success: false, message: imageError || "Image invalide." }, { status: 422 })
    return NextResponse.json(await uploadGroupImage(pageId, image, element))
  } catch (error) {
    console.error("GROUP IMAGE UPLOAD ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible d’envoyer l’image du groupe." }, { status: 500 })
  }
}
