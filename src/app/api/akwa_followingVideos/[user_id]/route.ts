import { createAkwaProxyRoute } from "@/lib/api/akwa-proxy"
const handlers = createAkwaProxyRoute("/akwa_followingVideos", ["user_id"])
export const GET = handlers.GET
