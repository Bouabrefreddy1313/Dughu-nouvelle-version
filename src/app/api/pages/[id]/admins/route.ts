import { NextRequest, NextResponse } from "next/server"
import { addAdmin, removeAdmin } from "@/services/pages/pages.server"

export const dynamic = "force-dynamic"

/** POST /api/pages/[id]/admins { userId } — ajouter un admin (POST /addAdminPage). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    const body = await req.json().catch(() => ({}))
    const memberUserId = String(body?.userId || body?.user_id || "")
    if (!pageId || !memberUserId) return NextResponse.json({ success: false, message: "Page et utilisateur requis." }, { status: 422 })
    const result = await addAdmin(pageId, memberUserId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES ADMIN ADD ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible d'ajouter cet administrateur." }, { status: 500 })
  }
}

/** DELETE /api/pages/[id]/admins?userId= — retirer un admin (POST /addRemovePageAdmin). */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    const memberUserId = String(req.nextUrl.searchParams.get("userId") || "")
    if (!pageId || !memberUserId) return NextResponse.json({ success: false, message: "Page et utilisateur requis." }, { status: 422 })
    const result = await removeAdmin(pageId, memberUserId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES ADMIN REMOVE ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible de retirer cet administrateur." }, { status: 500 })
  }
}