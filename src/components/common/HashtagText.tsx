"use client"

import { cn } from "@/lib/utils"

interface HashtagTextProps {
  text: string
  /** Classes Additionnelles pour les liens hashtag (ex. sur fond coloré). */
  hashtagClassName?: string
}

// Détecte #mot (lettres/chiffres/underscore Unicode). Un `#` directement
// collé à un caractère (ex. fragment d'URL `a#b`) n'est pas un hashtag.
const HASHTAG_RE = /(?<![A-Za-z0-9])(#[\p{L}\p{N}_]+)/gu

/** Affiche un texte en rendant les hashtags (#tag) cliquables. */
export function HashtagText({ text, hashtagClassName }: HashtagTextProps) {
  if (!text) return null
  const parts = text.split(HASHTAG_RE)
  return (
    <>
      {parts.map((part, i) => {
        // Les segments aux indices impairs sont les groupes de capture (hashtags).
        if (i % 2 === 1) {
          return (
            <a
              key={i}
              href={`/hashtags/${encodeURIComponent(part.slice(1))}`}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "font-medium break-words hover:underline",
                hashtagClassName ?? "text-[#A35A2A]"
              )}
            >
              {part}
            </a>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
