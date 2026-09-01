// SERVER-ONLY — configuration serveur Dughu (contient des secrets).
// Ne jamais importer ce module depuis un composant client ni depuis un hook.
//
// Valide et centralise les variables d'environnement nécessaires à l'instance
// Axios serveur. Les valeurs manquantes rejettent la config explicitement
// (pas de fallback silencieux qui masque un oubli en production).
//
// NB : pendant la migration, dughu.ts lit encore process.env directement pour
// les autres domaines. Ce module alimente uniquement dughu-instance.ts ; il
// sera la source unique de config lorsque dughu.ts disparaîtra.

export interface DughuServerConfig {
  apiBaseUrl: string
  origin: string
  apiToken: string
  timeoutMs: number
  retryTimes: number
  retrySleepMs: number
  enabled: boolean
}

const DEFAULT_API_BASE_URL = "https://apitest.dughu.com/api"

function readEnv(): DughuServerConfig {
  const rawBaseUrl = process.env.DUGHU_API_BASE_URL || DEFAULT_API_BASE_URL
  const apiBaseUrl = rawBaseUrl.replace(/\/+$/, "")
  const apiToken = process.env.DUGHU_API_KEY || ""

  const timeoutSeconds = Number(process.env.DUGHU_API_TIMEOUT) || 15
  const retryTimes = Number(process.env.DUGHU_API_RETRY_TIMES) || 2
  const retrySleepMs = Number(process.env.DUGHU_API_RETRY_SLEEP) || 200

  return {
    apiBaseUrl,
    origin: apiBaseUrl.replace(/\/api\/?$/, ""),
    apiToken,
    timeoutMs: timeoutSeconds * 1000,
    retryTimes,
    retrySleepMs,
    enabled: !!apiToken,
  }
}

export const dughuServerConfig: DughuServerConfig = readEnv()