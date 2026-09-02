import { NextRequest, NextResponse } from "next/server"
import { fetchRetrouvailles, fetchRetrouvaillesContacts } from "@/services/retrouvailles/retrouvailles.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import type { RetrouvaillesResponse } from "@/types/retrouvailles/retrouvailles.types"

export const dynamic = "force-dynamic"

/**
 * GET /api/retrouvailles — module Retrouvailles.
 * Query :
 *   tab=suggestions            → suggestions (groupes d'affinité)
 *   tab=anciens                → anciens (ville, school, promotion_start/fin)
 * L'user_id est lu du cookie de session, ou accepté en query (paramètre
 * explicite du cahier des charges).
 *
 * NB : l'onglet CONTACTS passe par POST (les numéros voyageant dans le body
 * JSON, jamais dans l'URL — les longues query strings sont rejetées en 431
 * par le reverse proxy).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tab = String(searchParams.get("tab") || "suggestions")
    const userId = String(searchParams.get("user_id") || "") || (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json<RetrouvaillesResponse>(
        { success: false, message: "Identifiant utilisateur requis.", tab: "suggestions", groups: [], persons: [] },
        { status: 404 }
      )
    }

    if (tab === "suggestions") {
      const result = await fetchRetrouvailles({ tab: "suggestions", userId })
      return NextResponse.json(result)
    }

    if (tab === "anciens") {
      const result = await fetchRetrouvailles({
        tab: "anciens",
        userId,
        ville: searchParams.get("ville") || undefined,
        school: searchParams.get("school") || undefined,
        promotionStart: searchParams.get("promotion_start") || undefined,
        promotionEnd: searchParams.get("promotion_end") || undefined,
      })
      return NextResponse.json(result)
    }

    return NextResponse.json<RetrouvaillesResponse>(
      { success: false, message: "Onglet inconnu.", tab: "suggestions", groups: [], persons: [] },
      { status: 422 }
    )
  } catch (error) {
    console.error("RETROUVAILLES ERROR:", error)
    return NextResponse.json<RetrouvaillesResponse>(
      { success: false, message: "Impossible de charger les retrouvailles.", tab: "suggestions", groups: [], persons: [] },
      { status: 500 }
    )
  }
}

/**
 * POST /api/retrouvailles — onglet CONTACTS.
 * Body JSON : { tab: "contacts", userId?, phoneNumbers: string[] }
 * Les numéros voyagent dans le BODY (pas dans l'URL) pour éviter le « 431
 * Request Header Fields Too Large » du reverse proxy sur les gros imports VCF.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const tab = String(body?.tab || "contacts")
    let userId = String(body?.userId || body?.user_id || "")
    if (!userId) userId = await getDughuUserIdFromCookies()

    if (!userId) {
      return NextResponse.json<RetrouvaillesResponse>(
        { success: false, message: "Identifiant utilisateur requis.", tab: "contacts", groups: [], persons: [] },
        { status: 404 }
      )
    }

    if (tab !== "contacts") {
      return NextResponse.json<RetrouvaillesResponse>(
        { success: false, message: "Onglet non pris en charge en POST.", tab: "contacts", groups: [], persons: [] },
        { status: 422 }
      )
    }

    const phoneNumbers = Array.isArray(body?.phoneNumbers)
      ? body.phoneNumbers.map(String).filter(Boolean)
      : []

    const result = await fetchRetrouvaillesContacts(userId, phoneNumbers)
    return NextResponse.json(result)
  } catch (error) {
    console.error("RETROUVAILLES CONTACTS ERROR:", error)
    return NextResponse.json<RetrouvaillesResponse>(
      { success: false, message: "Impossible de charger les retrouvailles.", tab: "contacts", groups: [], persons: [] },
      { status: 500 }
    )
  }
}