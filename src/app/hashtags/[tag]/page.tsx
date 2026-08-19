"use client"

import { useParams } from "next/navigation"
import { HashtagPage } from "@/components/hashtags/HashtagPage"

export default function HashtagRoute() {
  const params = useParams<{ tag: string }>()
  return <HashtagPage tag={decodeURIComponent(params.tag || "")} />
}