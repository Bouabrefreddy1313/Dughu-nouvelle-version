/**
 * Fabrique de Route Handler BFF du module Akwaplay (Vidéos).
 *
 * Chaque endpoint Dughu `/akwa_*` (et `/fetchCommentReplies`) est exposé
 * côté frontend via une route interne `/api/akwa_*` qui fait transiter les
 * appels par l'instance serveur (token `X-AppApiToken` côté serveur
 * uniquement, jamais exposé au navigateur). Cette fabrique centralise le
 * comportement proxy identique au proxy générique `/api/dughu/[...path]`
 * (même base URL, mêmes en-têtes, forwarding de la méthode, du corps
 * et du content-type) pour éviter 24 fichiers quasi identiques.
 *
 * ⚠️ IMPORTANT : à importer UNIQUEMENT dans les Route Handlers, jamais
 * dans un composant client, un hook ou un service frontend.
 */

import { type NextRequest } from "next/server"

const BASE_URL = (process.env.DUGHU_API_BASE_URL || "https://apitest.dughu.com/api").replace(/\/+$/, "")
const API_TOKEN = process.env.DUGHU_API_KEY || ""
const TIMEOUT_MS = (Number(process.env.DUGHU_API_TIMEOUT) || 15) * 1000

export type AkwaProxyRoute = (req: NextRequest, ctx: { params: Promise<Record<string, string | string[]>> }) => Promise<Response>

/**
 * Crée les handlers GET/POST/PUT/PATCH/DELETE d'un endpoint Akwaplay.
 *
 * @param basePath  chemin statique de l'endpoint (ex. "/akwa_getCategories").
 * @param segmentParams noms des paramètres dynamiques dans l'ordre du chemin
 *                      (ex. ["user_id"] pour /akwa_getAllVideos/{user_id}).
 */
export function createAkwaProxyRoute(
  basePath: string,
  segmentParams: string[] = []
): { GET: AkwaProxyRoute; POST: AkwaProxyRoute; PUT: AkwaProxyRoute; PATCH: AkwaProxyRoute; DELETE: AkwaProxyRoute } {
  async function proxy(req: NextRequest, ctx: { params: Promise<Record<string, string | string[]>> }) {
    if (!API_TOKEN) {
      return new Response(JSON.stringify({ success: false, message: "DUGHU_API_KEY manquant dans .env" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      })
    }

    try {
      const params = await ctx.params
      const values = segmentParams.flatMap((name) => {
        const value = params?.[name]
        return Array.isArray(value) ? value : [String(value || "")]
      })
      const dynamicSegments = values.map((v) => decodeURIComponent(v)).filter((v) => v !== "")

      const upstreamPath = `${basePath}${dynamicSegments.length ? `/${dynamicSegments.join("/")}` : ""}`
      const url = `${BASE_URL}${upstreamPath}${req.nextUrl.search}`

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

      try {
        const headers = new Headers()
        headers.set("X-AppApiToken", API_TOKEN)
        headers.set("Accept", "application/json")

        const contentType = req.headers.get("content-type")
        if (contentType) headers.set("content-type", contentType)

        let body: BodyInit | null = null
        if (req.method !== "GET" && req.method !== "HEAD") {
          body = await req.arrayBuffer()
        }

        const upstream = await fetch(url, {
          method: req.method,
          headers,
          body,
          signal: controller.signal,
          cache: "no-store",
        })

        const upstreamText = await upstream.text()
        const headersOut = new Headers(upstream.headers)
        // Supprime les en-têtes d'encodage/compression : le corps a déjà été décompressé par le runtime
        headersOut.delete("content-encoding")
        headersOut.delete("content-length")
        headersOut.delete("transfer-encoding")

        const ct = upstream.headers.get("content-type") || ""
        let payload: BodyInit = upstreamText
        if (ct.includes("application/json") && upstreamText) {
          payload = upstreamText
        }
        headersOut.set("content-type", ct || "application/json")

        return new Response(payload as BodyInit, {
          status: upstream.status,
          headers: headersOut,
        })
      } catch (err) {
        const isAbortError =
          err instanceof Error
            ? err.name === "AbortError"
            : typeof err === "object" && err !== null && "name" in err && (err as { name?: unknown }).name === "AbortError"
        const message = isAbortError ? "Timeout vers l'API Dughu" : "Erreur proxy Dughu"
        return new Response(JSON.stringify({ success: false, message }), {
          status: 502,
          headers: { "content-type": "application/json" },
        })
      } finally {
        clearTimeout(timeout)
      }
    } catch {
      return new Response(JSON.stringify({ success: false, message: "Paramètres de route invalides." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }
  }

  return { GET: proxy, POST: proxy, PUT: proxy, PATCH: proxy, DELETE: proxy }
}