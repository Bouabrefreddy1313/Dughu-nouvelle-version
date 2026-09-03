import { createAkwaProxyRoute } from "@/lib/api/akwa-proxy"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const { GET, POST, PUT, PATCH, DELETE } = createAkwaProxyRoute("/akwa_musiques/report_musique", [])
export { GET, POST, PUT, PATCH, DELETE }
