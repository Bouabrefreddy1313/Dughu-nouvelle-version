import { createAkwaProxyRoute } from "@/lib/api/akwa-proxy"
const handlers = createAkwaProxyRoute("/akwa_musiques")
export const GET = handlers.GET
export const POST = handlers.POST
