import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { dughu, dughuApi, normalizeUser, pick } from "@/lib/dughu"

async function saveImage(file: File, folder: string): Promise<string | null> {
  if (!file || !file.size) return null
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder)
  await mkdir(uploadDir, { recursive: true })
  const cleanName = (file.name || "image").replace(/[^a-zA-Z0-9.-]/g, "_")
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cleanName}`
  const filePath = path.join(uploadDir, fileName)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)
  return `/uploads/${folder}/${fileName}`
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const userId = (formData.get("userId") as string) || ""
    const file = formData.get("avatar") as File | null

    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }
    if (!file || !file.size) {
      return NextResponse.json({ success: false, message: "Image requise." }, { status: 422 })
    }

    // ── Mode Dughu API ──
    if (dughu.enabled) {
      try {
        const localUser = await prisma.user.findUnique({ where: { id: userId }, select: { dughuId: true } })
        if (localUser?.dughuId) {
          const payload = new FormData()
          payload.append("user_id", String(localUser.dughuId))
          payload.append("avatar", file)
          const raw = await dughuApi.updateProfile(payload)
          const userObj = normalizeUser(raw?.result || raw?.user || raw?.data || raw?.profile || raw)
          const avatar =
            userObj?.avatar ||
            pick(raw?.result, "avatar", "image", "profile_image", "profileImage", "profile_picture") ||
            pick(raw, "avatar", "image", "profile_image", "profileImage", "profile_picture") ||
            pick(raw?.user, "avatar", "image", "profile_image", "profileImage", "profile_picture") ||
            ""
          if (avatar) {
            await prisma.user.update({ where: { id: userId }, data: { avatar } })
          }
          return NextResponse.json({ success: true, avatar })
        }
        // Pas de compte Dughu → upload local
      } catch (err) {
        if (err instanceof Error && err.message.includes("DUGHU_API_KEY manquant")) throw err
        console.error("DUGHU AVATAR UPDATE ERROR:", err)
        // fallback upload local
      }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ success: false, message: "Utilisateur introuvable." }, { status: 404 })
    }

    const avatar = await saveImage(file, "avatars")
    if (!avatar) {
      return NextResponse.json({ success: false, message: "Échec de l'upload." }, { status: 500 })
    }

    await prisma.user.update({ where: { id: userId }, data: { avatar } })

    return NextResponse.json({ success: true, avatar })
  } catch (error) {
    console.error("AVATAR UPDATE ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}