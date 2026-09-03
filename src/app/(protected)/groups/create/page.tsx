import type { Metadata } from "next"
import CreateGroupPage from "@/components/groups/CreateGroupPage"

export const metadata: Metadata = { title: "Créer un groupe | Dughu", description: "Créez une nouvelle communauté sur Dughu." }
export default function Page() { return <CreateGroupPage /> }
