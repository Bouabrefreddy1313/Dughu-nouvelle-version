import { NextRequest, NextResponse } from "next/server"
import { updateAdminPrivileges } from "@/services/pages/pages.server"

export const dynamic = "force-dynamic"

/**
 * POST /api/pages/[id]/admins/privileges { adminId, privileges } — privilèges
 * détaillés d'un admin (POST /updatePageAdminPrivileges/{adminId}).
 * Body : adminId (id de la ligne admin retournée par show/pages) +
 * privileges : [general, info, social, avatar, design, admins, analytics,
 * delete_page] (booleans, ordre fixe).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const adminId = String(body?.adminId || body?.admin_id || "")
    const privileges = Array.isArray(body?.privileges) ? body.privileges.map(Boolean).slice(0, 8) : [true, true, true, true, true, true, true, true]
    if (!adminId) return NextResponse.json({ success: false, message: "Administrateur requis." }, { status: 422 })

    const result = await updateAdminPrivileges(adminId, privileges)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES ADMIN PRIVILEGES ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible de mettre à jour les privilèges." }, { status: 500 })
  }
}