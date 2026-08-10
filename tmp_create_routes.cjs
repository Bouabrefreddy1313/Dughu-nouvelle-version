const fs = require('fs')
const path = require('path')

const dir = 'src/app/api/comments/[id]'
fs.mkdirSync(dir, { recursive: true })

const content = `import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ success: false, message: "userId requis." }, { status: 422 })
    }

    const comment = await prisma.comment.findUnique({ where: { id } })
    if (!comment) {
      return NextResponse.json({ success: false, message: "Commentaire introuvable." }, { status: 404 })
    }

    // Seul l'auteur du commentaire peut le supprimer
    if (comment.userId !== userId) {
      return NextResponse.json({ success: false, message: "Vous ne pouvez supprimer que vos propres commentaires." }, { status: 403 })
    }

    // Supprimer aussi les likes et les réponses associées (cascade)
    await prisma.commentLike.deleteMany({ where: { commentId: id } })
    await prisma.comment.deleteMany({ where: { parentId: id } })
    await prisma.comment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE COMMENT ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
`

fs.writeFileSync(path.join(dir, 'route.ts'), content)
console.log('Delete comment route created successfully')