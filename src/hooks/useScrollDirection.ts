"use client"

/**
 * useScrollDirection
 *
 * Hook léger qui détecte la direction du scroll de la fenêtre.
 * Optimisé pour le mobile : utilise requestAnimationFrame + passive listener
 * afin de ne jamais bloquer le thread principal ni ralentir le scroll.
 *
 * Retourne :
 *   - "up"   : l'utilisateur scrolle vers le haut (ou est en haut de la page)
 *   - "down" : l'utilisateur scrolle vers le bas
 *
 * Un seuil (`threshold`) évite le clignotement sur les petits mouvements.
 * L'état React n'est mis à jour que lorsque la direction change réellement,
 * ce qui évite tout re-render inutile.
 *
 * Usage :
 *   const direction = useScrollDirection()
 *   // direction === "down" → masquer la barre
 */

import { useEffect, useRef, useState } from "react"

export type ScrollDirection = "up" | "down"

interface UseScrollDirectionOptions {
  /** Nombre de pixels minimum avant de changer la direction détectée.
   *  Évite le clignotement sur les petits mouvements involontaires. */
  threshold?: number
  /** Position Y au-delà de laquelle le comportement scroll-aware s'active.
   *  En dessous, on considère toujours "up" (barres visibles). */
  offset?: number
}

export function useScrollDirection({
  threshold = 10,
  offset = 60,
}: UseScrollDirectionOptions = {}): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>("up")

  // Utilise des refs pour la logique interne afin d'éviter les closures sur
  // des states obsolètes et de ne pas déclencher de re-render à chaque pixel.
  const lastScrollY = useRef(0)
  const ticking = useRef(false)
  const directionRef = useRef<ScrollDirection>("up")

  useEffect(() => {
    const updateDirection = () => {
      const y = window.scrollY

      // En haut de la page : toujours "up" (barres visibles)
      if (y < offset) {
        if (directionRef.current !== "up") {
          directionRef.current = "up"
          setDirection("up")
        }
        lastScrollY.current = y
        ticking.current = false
        return
      }

      const delta = y - lastScrollY.current

      // Seuil : ignorer les micro-mouvements
      if (Math.abs(delta) > threshold) {
        const newDirection: ScrollDirection = delta > 0 ? "down" : "up"

        if (newDirection !== directionRef.current) {
          directionRef.current = newDirection
          // Mise à jour React uniquement quand la direction change
          setDirection(newDirection)
        }

        lastScrollY.current = y
      }

      ticking.current = false
    }

    const handleScroll = () => {
      if (!ticking.current) {
        // requestAnimationFrame : batch les mises à jour pour la prochaine frame
        window.requestAnimationFrame(updateDirection)
        ticking.current = true
      }
    }

    // passive: true → le navigateur sait qu'on n'appelle pas preventDefault()
    // → scroll plus fluide, surtout sur mobile
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [threshold, offset])

  return direction
}
