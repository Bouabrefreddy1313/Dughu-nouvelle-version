import type { Metadata } from "next"
import CapsulesPage from "@/components/capsule/CapsulesPage"

export const metadata: Metadata = {
  title: "Capsules | Dughu",
  description: "Regardez les capsules vidéo de la communauté Dughu.",
}

export default function Page() {
  return <CapsulesPage />
}
