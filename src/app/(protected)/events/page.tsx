import type { Metadata } from "next"
import EventListPage from "@/components/events/EventListPage"

export const metadata: Metadata = {
  title: "Événements | Dughu",
  description: "Découvrez, participez et organisez des événements sur Dughu.",
}

export default function Page() {
  return <EventListPage />
}
