import { NextRequest, NextResponse } from "next/server"
import { createOrUpdatePage, fetchPages, type PagesScope } from "@/services/pages/pages.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import type { PagesListResponse } from "@/types/pages/pages.types"

export const dynamic = "force-dynamic"

const SCOPES: PagesScope[] = ["feed", "mine", "liked", "suggestions", "administered"]

/**
 * GET /api/pages?scope=feed|mine|liked|suggestions|administered&page=N&q=
 * Liste des pages selon la portée (encapsule les endpoints Dughu associés).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const scopeParam = String(searchParams.get("scope") || "feed")
    const scope: PagesScope = SCOPES.includes(scopeParam as PagesScope) ? (scopeParam as PagesScope) : "feed"
    const page = Math.max(1, Number(searchParams.get("page")) || 1)
    const q = String(searchParams.get("q") || "")
    const userId = String(searchParams.get("user_id") || "") || (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json<PagesListResponse>(
        { success: false, message: "Identifiant utilisateur requis.", pages: [], hasMore: false, page: 1 },
        { status: 401 }
      )
    }

    const result = await fetchPages(scope, userId, page, q)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES LIST ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de charger les espaces."
    return NextResponse.json<PagesListResponse>({ success: false, message, pages: [], hasMore: false, page: 1 }, { status: 500 })
  }
}

/**
 * POST /api/pages — créer (ou mettre à jour si `pageId` fourni) une page.
 * Body JSON : pageName, pageTitle, pageDescription, pageCategory, website,
 * phone, address, usersPost, pageId?.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())
    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise pour créer un espace." }, { status: 401 })
    }
    if (!String(body?.pageName || "").trim() || !String(body?.pageTitle || "").trim()) {
      return NextResponse.json({ success: false, message: "Le nom et le titre de l'espace sont requis." }, { status: 422 })
    }

    const result = await createOrUpdatePage(userId, {
      pageId: body?.pageId ? String(body.pageId) : undefined,
      pageName: String(body.pageName || ""),
      pageTitle: String(body.pageTitle || ""),
      pageDescription: String(body.pageDescription || ""),
      pageCategory: String(body.pageCategory || ""),
      website: String(body.website || ""),
      phone: String(body.phone || ""),
      address: String(body.address || ""),
      usersPost: Boolean(body.usersPost),
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES CREATE ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible d'enregistrer l'espace."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}