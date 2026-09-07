import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/notifications/read
 *
 * Marque une notification (ou toutes les notifications) comme lue(s).
 * Prévu pour relayer vers l'endpoint backend Dughu dès sa disponibilité.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const notificationId = body.notificationId
    const all = Boolean(body.all)

    // Si le backend Dughu expose un endpoint de marquage dans le futur,
    // l'appel sera placé ici.
    return NextResponse.json({
      success: true,
      notificationId,
      all,
      message: all ? "Toutes les notifications marquées comme lues." : "Notification marquée comme lue.",
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Erreur lors du marquage de la notification." },
      { status: 500 }
    )
  }
}
