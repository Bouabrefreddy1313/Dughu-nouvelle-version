import type { Metadata } from "next"
import CanalPage from "@/components/canal/CanalPage"

export const metadata: Metadata = {
  title: "Canal | Dughu",
  description: "Découvrez et rejoignez les canaux thématiques de la communauté Dughu.",
}

export default function Page() {
  return <CanalPage />
}
