import { createAkwaProxyRoute } from "@/lib/api/akwa-proxy"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const { GET, POST, PUT, PATCH, DELETE } = createAkwaProxyRoute("/short_fetch_comments", ["short_id", "user_id"])
export { GET, POST, PUT, PATCH, DELETE }
