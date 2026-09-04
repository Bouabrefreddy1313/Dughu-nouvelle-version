import { createAkwaProxyRoute } from "@/lib/api/akwa-proxy"
const handlers = createAkwaProxyRoute("/akwa_musiques/user_favorites", ["user_id"])
export const GET = handlers.GET
