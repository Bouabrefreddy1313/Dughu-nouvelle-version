import { Suspense } from "react"
import MessagesPageClient from "./MessagesPageClient"

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F8FA]" />}>
      <MessagesPageClient />
    </Suspense>
  )
}
