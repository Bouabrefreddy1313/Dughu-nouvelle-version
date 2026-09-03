import { createAkwaProxyRoute } from "@/lib/api/akwa-proxy"
const handlers = createAkwaProxyRoute("/akwa_musiques/store")
export const POST = handlers.POST
