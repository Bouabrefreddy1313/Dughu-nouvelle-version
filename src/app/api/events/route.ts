import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { getEventsList, createEvent } from "@/services/events/events.server"
import { ApiError } from "@/lib/api/api-error"

export const dynamic = "force-dynamic"

/**
 * GET /api/events
 * Liste paginée des événements
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || undefined
    const q = searchParams.get("q") || undefined
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined

    const result = await getEventsList({ category, q, page })
    return NextResponse.json(result)
  } catch (error) {
    console.error("EVENTS GET LIST ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message = error instanceof Error ? error.message : "Erreur lors du chargement des événements."
    return NextResponse.json({ success: false, events: [], total: 0, currentPage: 1, lastPage: 1, message }, { status })
  }
}

/**
 * POST /api/events
 * Création d'un événement (multipart/form-data)
 */
export async function POST(request: NextRequest) {
  try {
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

    if (!name) {
      return NextResponse.json({ success: false, message: "Le nom de l'événement est obligatoire." }, { status: 422 })
    }
    if (!location) {
      return NextResponse.json({ success: false, message: "Le lieu est obligatoire." }, { status: 422 })
    }
    if (!description) {
      return NextResponse.json({ success: false, message: "La description est obligatoire." }, { status: 422 })
    }
    if (!startDate || !startTime) {
      return NextResponse.json({ success: false, message: "La date et l'heure de début sont obligatoires." }, { status: 422 })
    }
    if (!endDate || !endTime) {
      return NextResponse.json({ success: false, message: "La date et l'heure de fin sont obligatoires." }, { status: 422 })
    }

    const forwardedData = new FormData()
    forwardedData.set("event-name", name)
    forwardedData.set("event-locat", location)
    forwardedData.set("event-description", description)
    forwardedData.set("event-start-date", startDate)
    forwardedData.set("event-start-time", startTime)
    forwardedData.set("event-end-date", endDate)
    forwardedData.set("event-end-time", endTime)
    if (userId) forwardedData.set("user_id", userId)

    const cover = incomingData.get("cover")
    if (cover && cover instanceof File && cover.size > 0) {
      forwardedData.set("cover", cover)
    }

    const result = await createEvent(forwardedData)
    return NextResponse.json(result)
  } catch (error) {
    console.error("EVENTS CREATE ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message = error instanceof Error ? error.message : "Impossible de créer l'événement."
    return NextResponse.json({ success: false, message }, { status })
  }
}
