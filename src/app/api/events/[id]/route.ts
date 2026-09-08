import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { getEventDetail, deleteEvent, updateEvent } from "@/services/events/events.server"
import { ApiError } from "@/lib/api/api-error"

export const dynamic = "force-dynamic"

/**
 * GET /api/events/[id]
 * Détail d'un événement
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json(
        { success: false, event: null, message: "Identifiant manquant." },
        { status: 400 }
      )
    }

    const sessionUserId = await getDughuUserIdFromCookies()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id") || sessionUserId || "0"

    const result = await getEventDetail(id, userId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("EVENT GET DETAIL ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message = error instanceof Error ? error.message : "Impossible de charger cet événement."
    return NextResponse.json({ success: false, event: null, message }, { status })
  }
}

/**
 * POST /api/events/[id]
 * Mise à jour d'un événement (multipart/form-data)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ success: false, message: "Identifiant manquant." }, { status: 400 })
    }

    const sessionUserId = await getDughuUserIdFromCookies()
    const incomingData = await request.formData()

    const name = String(incomingData.get("event-name") || incomingData.get("name") || "").trim()
    const location = String(incomingData.get("event-locat") || incomingData.get("location") || "").trim()
    const description = String(incomingData.get("event-description") || incomingData.get("description") || "").trim()
    const startDate = String(incomingData.get("event-start-date") || incomingData.get("start_date") || "").trim()
    const startTime = String(incomingData.get("event-start-time") || incomingData.get("start_time") || "").trim()
    const endDate = String(incomingData.get("event-end-date") || incomingData.get("end_date") || "").trim()
    const endTime = String(incomingData.get("event-end-time") || incomingData.get("end_time") || "").trim()

    let userId = String(incomingData.get("user_id") || "").trim()
    if (!userId && sessionUserId) {
      userId = sessionUserId
    }

    const forwardedData = new FormData()
    if (name) forwardedData.set("event-name", name)
    if (location) forwardedData.set("event-locat", location)
    if (description) forwardedData.set("event-description", description)
    if (startDate) forwardedData.set("event-start-date", startDate)
    if (startTime) forwardedData.set("event-start-time", startTime)
    if (endDate) forwardedData.set("event-end-date", endDate)
    if (endTime) forwardedData.set("event-end-time", endTime)
    if (userId) forwardedData.set("user_id", userId)

    const cover = incomingData.get("cover")
    if (cover && cover instanceof File && cover.size > 0) {
      forwardedData.set("cover", cover)
    }

    const result = await updateEvent(id, forwardedData)
    return NextResponse.json(result)
  } catch (error) {
    console.error("EVENT UPDATE ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message = error instanceof Error ? error.message : "Impossible de modifier cet événement."
    return NextResponse.json({ success: false, message }, { status })
  }
}

/**
 * DELETE /api/events/[id]
 * Suppression d'un événement
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ success: false, message: "Identifiant manquant." }, { status: 400 })
    }

    const sessionUserId = await getDughuUserIdFromCookies()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id") || sessionUserId || "0"

    const result = await deleteEvent(id, userId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("EVENT DELETE ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message = error instanceof Error ? error.message : "Impossible de supprimer cet événement."
    return NextResponse.json({ success: false, message }, { status })
  }
}
