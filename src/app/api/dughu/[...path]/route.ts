import { NextRequest } from "next/server"

const BASE_URL = (process.env.DUGHU_API_BASE_URL || "https://apitest.dughu.com/api").replace(/\/+$/, "")
const API_TOKEN = process.env.DUGHU_API_KEY || ""
const TIMEOUT_MS = (Number(process.env.DUGHU_API_TIMEOUT) || 15) * 1000

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function proxy(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params
  const segments = path.map((s) => decodeURIComponent(s)).join("/")
  const url = `${BASE_URL}/${segments}${req.nextUrl.search}`

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
    let payload: BodyInit = upstreamText
    const ct = upstream.headers.get("content-type") || ""
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
        : typeof err === "object" &&
          err !== null &&
          "name" in err &&
          (err as { name?: unknown }).name === "AbortError"
    const message = isAbortError ? "Timeout vers l'API Dughu" : "Erreur proxy Dughu"
    return new Response(JSON.stringify({ success: false, message }), {
      status: 502,
      headers: { "content-type": "application/json" },
    })
  } finally {
    clearTimeout(timeout)
  }
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy