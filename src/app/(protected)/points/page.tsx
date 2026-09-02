import type { Metadata } from "next"
import PointsPage from "@/components/points/PointsPage"

export const metadata: Metadata = {
  title: "Points et activités | Dughu",
  description:
    "Suivez vos gains de points, débloquez des badges et découvrez à quoi servent vos Points Dughu.",
}

export default function Page() {
  return <PointsPage />
}
