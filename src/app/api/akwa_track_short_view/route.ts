import { createAkwaProxyRoute } from "@/lib/api/akwa-proxy"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Note: l'URL backend contient un double slash (/akwa_track_short_view) — le proxy gère le basePath tel quel
const { GET, POST, PUT, PATCH, DELETE } = createAkwaProxyRoute("/akwa_track_short_view", [])
export { GET, POST, PUT, PATCH, DELETE }
