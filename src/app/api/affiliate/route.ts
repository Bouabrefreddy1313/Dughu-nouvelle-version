import { NextRequest, NextResponse } from "next/server"
import { getAffiliateDetails } from "@/services/affiliate/affiliate.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { userMessage } from "@/lib/api/api-error"

/**
 * GET /api/affiliate?userId={userId}
 * Récupère les infos d'affiliation et le lien de parrainage via GET /getSpecificUser/{userId}/{userId}
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId") || (await getDughuUserIdFromCookies())
    if (!userId) {
      return NextResponse.json({ success: false, message: "Non connecté." }, { status: 401 })
    }

    const details = await getAffiliateDetails(userId)
    return NextResponse.json({ success: true, details })
  } catch (error) {
    console.error("AFFILIATE INFO ERROR:", error)
    return NextResponse.json(
      {
        success: false,
        message: userMessage(error, "Impossible de récupérer votre lien d'affiliation."),
      },
      { status: 500 }
    )
  }
}
