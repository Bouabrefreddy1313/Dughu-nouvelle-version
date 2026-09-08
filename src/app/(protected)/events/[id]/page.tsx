import type { Metadata } from "next"
import EventDetailPage from "@/components/events/EventDetailPage"

export const metadata: Metadata = {
  title: "Détail de l'événement | Dughu",
  description: "Informations complètes, participants et publications de l'événement sur Dughu.",
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EventDetailPage eventId={id} />
}
