import { createAkwaProxyRoute } from "@/lib/api/akwa-proxy"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const { GET, POST, PUT, PATCH, DELETE } = createAkwaProxyRoute("/akwa_musiques/delete", ["music_id"])
export { GET, POST, PUT, PATCH, DELETE }
