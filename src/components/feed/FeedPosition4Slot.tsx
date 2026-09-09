"use client"

import { useState, useMemo, useEffect } from "react"
import CapsuleRail from "@/components/capsule/CapsuleRail"
import SuggestionsGroupesCard from "@/components/feed/SuggestionsGroupesCard"
import SuggestionsEspacesCard from "@/components/feed/SuggestionsEspacesCard"
import type { Capsule } from "@/lib/capsule-service"

export type FeedSlot4Type = "capsules" | "groups" | "spaces"

interface FeedPosition4SlotProps {
  currentUser?: {
    id?: string
    dughu?: { userId?: string | number }
    dughhuUserId?: string | number
    username?: string
  } | null
  capsules: Capsule[]
  capsulesLoading: boolean
  onOpenCapsule: (capsule: Capsule) => void
  className?: string
}

export default function FeedPosition4Slot({
  currentUser,
  capsules,
  capsulesLoading,
  onOpenCapsule,
  className,
}: FeedPosition4SlotProps) {
  // Tirage aléatoire mémoïsé d'un ordre de priorité (ex: ["groups", "capsules", "spaces"])
  // Calculé une seule fois par session/chargement du feed pour éviter tout saut visuel au scroll
  const randomizedOrder = useMemo<FeedSlot4Type[]>(() => {
    const options: FeedSlot4Type[] = ["capsules", "groups", "spaces"]
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = options[i]
      options[i] = options[j]
      options[j] = temp
    }
    return options
  }, [])

  // Index de l'option actuelle parmi les 3 tirées aléatoirement
  const [attemptIndex, setAttemptIndex] = useState(0)

  // Repli automatique si l'option actuelle s'avère vide
  const handleOptionEmpty = () => {
    setAttemptIndex((prev) => prev + 1)
  }

  // Vérification directe pour capsules si chargement terminé et 0 capsules
  useEffect(() => {
    const currentOption = randomizedOrder[attemptIndex]
    if (currentOption === "capsules" && !capsulesLoading && capsules.length === 0) {
      handleOptionEmpty()
    }
  }, [attemptIndex, capsules.length, capsulesLoading, randomizedOrder])

  if (attemptIndex >= randomizedOrder.length) {
    // Si toutes les options ont été épuisées et sont vides, ne rien afficher
    return null
  }

  const selected = randomizedOrder[attemptIndex]

  if (selected === "capsules") {
    // Si des capsules existent ou sont en cours de chargement
    if (capsulesLoading || capsules.length > 0) {
      return (
        <CapsuleRail
          capsules={capsules}
          loading={capsulesLoading}
          onOpen={onOpenCapsule}
        />
      )
    }
    return null
  }

  if (selected === "groups") {
    return (
      <SuggestionsGroupesCard
        currentUser={currentUser}
        className={className}
        onEmpty={handleOptionEmpty}
      />
    )
  }

  if (selected === "spaces") {
    return (
      <SuggestionsEspacesCard
        currentUser={currentUser}
        className={className}
        onEmpty={handleOptionEmpty}
      />
    )
  }

  return null
}
