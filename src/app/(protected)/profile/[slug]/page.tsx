"use client"

import { useParams } from "next/navigation"
import { ProfileShell } from "@/components/profile/ProfileShell"

export default function ProfileSlugPage() {
  const params = useParams<{ slug: string }>()
  return <ProfileShell slug={params.slug} />
}