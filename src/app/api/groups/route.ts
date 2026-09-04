import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { createGroup } from "@/services/groups/groups.server"
import { validateCreateGroupFields } from "@/services/groups/create-group.mapper"
import type { CreateGroupFields } from "@/types/groups/create-group.types"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const userId = await getDughuUserIdFromCookies()
    if (!userId) return NextResponse.json({ success: false, groupId: "", message: "Votre session a expiré. Veuillez vous reconnecter." }, { status: 401 })

    const body = await request.json().catch(() => ({})) as Partial<CreateGroupFields>
    const fields: CreateGroupFields = {
      groupTitle: typeof body.groupTitle === "string" ? body.groupTitle : "",
      about: typeof body.about === "string" ? body.about : "",
      category: typeof body.category === "string" ? body.category : "",
      privacy: body.privacy === "2" ? "2" : "1",
      joinPrivacy: body.joinPrivacy === "1" ? "1" : "0",
    }
    const errors = validateCreateGroupFields(fields)
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, groupId: "", message: "Vérifiez les informations du groupe.", errors }, { status: 422 })
    }
    return NextResponse.json(await createGroup(userId, fields))
  } catch (error) {
    console.error("GROUP CREATE ERROR:", error)
    return NextResponse.json({ success: false, groupId: "", message: "Impossible de créer le groupe." }, { status: 500 })
  }
}
