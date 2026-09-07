import { NextRequest, NextResponse } from "next/server"
import { getAffiliateUsers } from "@/services/affiliate/affiliate.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { userMessage } from "@/lib/api/api-error"

/**
 * GET /api/affiliate/users?userId={userId}&page={page}
 * Récupère les utilisateurs inscrits via le lien d'affiliation
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId") || (await getDughuUserIdFromCookies())
    if (!userId) {
      return NextResponse.json({ success: false, message: "Non connecté." }, { status: 401 })
    }

    const page = Number(searchParams.get("page")) || 1
    const data = await getAffiliateUsers({ userId, page })
    return NextResponse.json({
      success: true,
      users: data.users,
      pagination: data.pagination,
    })
  } catch (error) {
    console.error("AFFILIATE USERS ERROR:", error)
    return NextResponse.json(
      {
        success: false,
        message: userMessage(error, "Impossible de récupérer la liste des utilisateurs inscrits."),
      },
      { status: 500 }
    )
  }
}
