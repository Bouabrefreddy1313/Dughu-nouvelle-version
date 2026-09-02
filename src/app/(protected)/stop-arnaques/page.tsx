import type { Metadata } from "next"
import ScamPage from "@/components/scam/ScamPage"

export const metadata: Metadata = {
  title: "Stop aux arnaques | Dughu",
  description:
    "20 mesures anti-arnaque DUGHU : les réflexes essentiels pour protéger votre compte, votre argent et votre réseau sur Dughu.",
}

export default function Page() {
  return <ScamPage />
}
