import type { Metadata } from "next"
import GroupsPage from "@/components/groups/GroupsPage"

export const metadata: Metadata = {
  title: "Groupes | Dughu",
  description: "Retrouvez vos groupes et découvrez de nouvelles communautés sur Dughu.",
}

export default function Page() {
  return <GroupsPage />
}