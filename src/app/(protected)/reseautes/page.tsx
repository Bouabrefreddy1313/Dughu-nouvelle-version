import type { Metadata } from "next"
import ReseautesPage from "@/components/reseautes/ReseautesPage"

export const metadata: Metadata = {
  title: "Réseautés | Dughu",
  description: "Découvrez les publications exclusives des professionnels et membres de votre réseau sur Dughu.",
}

export default function Page() {
  return <ReseautesPage />
}
