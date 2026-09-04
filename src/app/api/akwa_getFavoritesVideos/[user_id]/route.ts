import { createAkwaProxyRoute } from "@/lib/api/akwa-proxy"
const handlers = createAkwaProxyRoute("/akwa_getFavoritesVideos", ["user_id"])
export const GET = handlers.GET
