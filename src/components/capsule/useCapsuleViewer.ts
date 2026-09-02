"use client"

// ── useCapsuleViewer — état partagé d'ouverture de la visionneuse Capsules ──

import { useState } from "react"
import type { Capsule } from "@/lib/capsule-service"

export default function useCapsuleViewer() {
  const [viewerCapsules, setViewerCapsules] = useState<Capsule[] | null>(null)
  const [viewerIndex, setViewerIndex] = useState(0)

  const openViewer = (capsules: Capsule[], index = 0) => {
    setViewerCapsules(capsules)
    setViewerIndex(index)
  }

  const openSingle = (capsule: Capsule) => openViewer([capsule], 0)

  const closeViewer = () => setViewerCapsules(null)

  return {
    viewerCapsules,
    viewerIndex,
    openViewer,
    openSingle,
    closeViewer,
  }
}
