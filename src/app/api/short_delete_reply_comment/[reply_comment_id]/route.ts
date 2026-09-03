import { createAkwaProxyRoute } from "@/lib/api/akwa-proxy"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const { GET, POST, PUT, PATCH, DELETE } = createAkwaProxyRoute("/short_delete_reply_comment", ["reply_comment_id"])
export { GET, POST, PUT, PATCH, DELETE }
