"use client"

import React from "react"
import Link from "next/link"
import { Users, Radio, MessageSquare, ExternalLink, ArrowRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FormattedChatMessageProps {
  text: string
  isMine?: boolean
  className?: string
}

export interface TextToken {
  type: "text" | "markdown_link" | "url"
  raw: string
  label?: string
  url?: string
}

/**
 * Normalise les URLs pour l'application Dughu :
 * - Convertit les URLs absolues du domaine Dughu (ex: https://apitest.dughu.com/group/220) en chemins internes (/groups/220)
 * - Corrige la route singulière /group/:id en /groups/:id
 * - Sécurise contre les protocoles dangereux (javascript:, etc.)
 */
export function normalizeMessageUrl(rawUrl: string): { href: string; isInternal: boolean } {
  const trimmed = rawUrl.trim()

  // Protection contre les protocoles dangereux
  if (/^(javascript|vbscript|data):/i.test(trimmed)) {
    return { href: "#", isInternal: false }
  }

  // 1. URLs relatives internes
  if (trimmed.startsWith("/")) {
    const fixed = trimmed.replace(/^\/group\/([^/?#]+)/, "/groups/$1").replace(/^\/group(?:\/|$)/, "/groups$1")
    return { href: fixed, isInternal: true }
  }

  // 2. URLs absolues du réseau Dughu (apitest.dughu.com, dughu.com, localhost)
  const dughuDomainRegex = /^https?:\/\/(?:(?:[a-zA-Z0-9-]+\.)*dughu\.com|localhost(?::\d+)?)(?:\/.*)?$/i
  if (dughuDomainRegex.test(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      const pathWithSearchAndHash = parsed.pathname + parsed.search + parsed.hash
      const fixedPath = pathWithSearchAndHash
        .replace(/^\/group\/([^/?#]+)/, "/groups/$1")
        .replace(/^\/group(?:\/|$)/, "/groups$1")
      return { href: fixedPath || "/", isInternal: true }
    } catch {
      // Fallback si URL invalide
    }
  }

  return { href: trimmed, isInternal: false }
}

/**
 * Détecte l'icône appropriée pour un lien selon son contenu (groupe, canal, post, externe).
 */
function getLinkIcon(label: string, url: string) {
  const textToScan = `${label} ${url}`.toLowerCase()
  if (textToScan.includes("group")) {
    return Users
  }
  if (textToScan.includes("canal") || textToScan.includes("channel")) {
    return Radio
  }
  if (textToScan.includes("post") || textToScan.includes("/p/")) {
    return MessageSquare
  }
  return ExternalLink
}

/**
 * Découpe le texte brut en jetons : texte, liens markdown [texte](url) et URLs brutes.
 */
export function parseMessageTokens(text: string): TextToken[] {
  if (!text) return []

  const tokens: TextToken[] = []
  // Capture [texte](url) OU https?://...
  const regex = /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s\)]+)\)|(https?:\/\/[^\s<]+)/gi

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        raw: text.slice(lastIndex, match.index),
      })
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      tokens.push({
        type: "markdown_link",
        raw: match[0],
        label: match[1],
        url: match[2],
      })
    } else if (match[3] !== undefined) {
      let rawUrl = match[3]
      let trailingPunct = ""
      const punctMatch = rawUrl.match(/[.,!?;:)]+$/)
      if (punctMatch) {
        trailingPunct = punctMatch[0]
        rawUrl = rawUrl.slice(0, -trailingPunct.length)
      }

      tokens.push({
        type: "url",
        raw: rawUrl,
        label: rawUrl,
        url: rawUrl,
      })

      if (trailingPunct) {
        tokens.push({
          type: "text",
          raw: trailingPunct,
        })
      }
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      raw: text.slice(lastIndex),
    })
  }

  return tokens
}

/**
 * Composant de rendu intelligent du texte de message :
 * - Transforme les liens markdown `[Rejoindre le groupe](...)` en liens cliquables
 * - Affiche une carte/bouton d'action élégante si le message est une invitation ou un lien seul
 * - Affiche des liens fluides et stylisés dans le fil du texte
 * - Adapte le contraste selon le statut de l'expéditeur (`isMine`)
 */
export function FormattedChatMessage({ text, isMine = false, className }: FormattedChatMessageProps) {
  if (!text) return null

  const tokens = parseMessageTokens(text)
  const meaningfulTokens = tokens.filter((t) => t.type !== "text" || t.raw.trim().length > 0)

  // Si le message est uniquement un lien d'action (comme une invitation de groupe)
  const isStandaloneAction =
    meaningfulTokens.length === 1 &&
    (meaningfulTokens[0].type === "markdown_link" ||
      (meaningfulTokens[0].type === "url" && meaningfulTokens[0].url?.includes("group")))

  if (isStandaloneAction) {
    const token = meaningfulTokens[0]
    const rawUrl = token.url || ""
    const label = token.type === "markdown_link" ? token.label || "Voir le lien" : "Accéder au lien"
    const { href, isInternal } = normalizeMessageUrl(rawUrl)
    const Icon = getLinkIcon(label, rawUrl)

    return (
      <div className={cn("my-1", className)}>
        {isInternal ? (
          <Link
            href={href}
            className={cn(
              "group/btn inline-flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all shadow-sm active:scale-[0.98]",
              isMine
                ? "bg-white/20 hover:bg-white/30 text-white border border-white/30"
                : "bg-[#8B5E34]/10 hover:bg-[#8B5E34]/15 text-[#8B5E34] border border-[#8B5E34]/25 dark:bg-white/10 dark:hover:bg-white/15 dark:text-[#E0A96D] dark:border-white/15"
            )}
          >
            <span className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
              isMine ? "bg-white/20 text-white" : "bg-[#8B5E34]/15 text-[#8B5E34] dark:bg-white/15 dark:text-white"
            )}>
              <Icon size={16} />
            </span>
            <span className="font-semibold underline-offset-2 group-hover/btn:underline">{label}</span>
            <ArrowRight size={15} className="shrink-0 transition-transform group-hover/btn:translate-x-0.5" />
          </Link>
        ) : (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group/btn inline-flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all shadow-sm active:scale-[0.98]",
              isMine
                ? "bg-white/20 hover:bg-white/30 text-white border border-white/30"
                : "bg-[#8B5E34]/10 hover:bg-[#8B5E34]/15 text-[#8B5E34] border border-[#8B5E34]/25 dark:bg-white/10 dark:hover:bg-white/15 dark:text-[#E0A96D] dark:border-white/15"
            )}
          >
            <span className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
              isMine ? "bg-white/20 text-white" : "bg-[#8B5E34]/15 text-[#8B5E34] dark:bg-white/15 dark:text-white"
            )}>
              <Icon size={16} />
            </span>
            <span className="font-semibold underline-offset-2 group-hover/btn:underline">{label}</span>
            <ExternalLink size={14} className="shrink-0 opacity-80" />
          </a>
        )}
      </div>
    )
  }

  return (
    <p className={cn("whitespace-pre-wrap break-words leading-relaxed", className)}>
      {tokens.map((token, index) => {
        if (token.type === "markdown_link") {
          const { href, isInternal } = normalizeMessageUrl(token.url || "")
          const label = token.label || token.url || "Lien"

          if (isInternal) {
            return (
              <Link
                key={index}
                href={href}
                className={cn(
                  "font-semibold underline underline-offset-2 transition-opacity inline-flex items-baseline gap-0.5 hover:opacity-85",
                  isMine ? "text-white decoration-white/70" : "text-[#8B5E34] dark:text-[#E0A96D] decoration-[#8B5E34]/60"
                )}
              >
                <span>{label}</span>
                <ArrowUpRight size={13} className="inline self-center shrink-0" />
              </Link>
            )
          }

          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "font-semibold underline underline-offset-2 transition-opacity inline-flex items-baseline gap-0.5 hover:opacity-85",
                isMine ? "text-white decoration-white/70" : "text-[#8B5E34] dark:text-[#E0A96D] decoration-[#8B5E34]/60"
              )}
            >
              <span>{label}</span>
              <ExternalLink size={12} className="inline self-center shrink-0" />
            </a>
          )
        }

        if (token.type === "url") {
          const { href, isInternal } = normalizeMessageUrl(token.url || "")
          const displayUrl = token.label || token.url || ""

          if (isInternal) {
            return (
              <Link
                key={index}
                href={href}
                className={cn(
                  "font-medium underline underline-offset-2 transition-opacity inline-flex items-baseline gap-0.5 hover:opacity-85",
                  isMine ? "text-white decoration-white/70" : "text-[#8B5E34] dark:text-[#E0A96D] decoration-[#8B5E34]/60"
                )}
              >
                <span className="break-all">{displayUrl}</span>
                <ArrowUpRight size={13} className="inline self-center shrink-0" />
              </Link>
            )
          }

          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "font-medium underline underline-offset-2 transition-opacity inline-flex items-baseline gap-0.5 hover:opacity-85",
                isMine ? "text-white decoration-white/70" : "text-[#8B5E34] dark:text-[#E0A96D] decoration-[#8B5E34]/60"
              )}
            >
              <span className="break-all">{displayUrl}</span>
              <ExternalLink size={12} className="inline self-center shrink-0" />
            </a>
          )
        }

        return <span key={index}>{token.raw}</span>
      })}
    </p>
  )
}
