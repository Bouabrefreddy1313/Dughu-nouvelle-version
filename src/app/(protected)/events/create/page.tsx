import type { Metadata } from "next"
import EventFormPage from "@/components/events/EventFormPage"

export const metadata: Metadata = {
  title: "Créer un événement | Dughu",
  description: "Organisez un nouvel événement et invitez votre communauté sur Dughu.",
}

export default function Page() {
  return <EventFormPage isEdit={false} />
}
