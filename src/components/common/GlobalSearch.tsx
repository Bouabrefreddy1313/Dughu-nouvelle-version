"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import { FileText, Hash, LoaderCircle, Search, UsersRound } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GlobalSearchResult, GlobalSearchResultType } from "@/types/search/search.types"
import { searchAll } from "@/services/search/search.service"

const TYPE_LABELS: Record<GlobalSearchResultType, string> = {
  user: "Personne",
  post: "Publication",
  page: "Page",
  group: "Groupe",
  hashtag: "Hashtag",
}

interface GlobalSearchProps {
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
  className?: string
  inputClassName?: string
  onNavigate?: () => void
}

export default function GlobalSearch({
  value,
  onChange,
  autoFocus,
  className,
  inputClassName,
  onNavigate,
}: GlobalSearchProps) {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const query = value.trim()

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", closeOnOutsideClick)
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick)
  }, [])

  useEffect(() => {
    if (query.length < 2) return

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setLoading(true)
      setOpen(true)
      try {
        const data = await searchAll(query, controller.signal)
        if (!data?.success) {
          throw new Error(typeof data?.message === "string" ? data.message : "La recherche est indisponible. Veuillez réessayer.")
        }
        setResults(Array.isArray(data.results) ? data.results : [])
      } catch (requestError) {
        // Saisie remplacée ou composant démonté : on ignore l'annulation.
        const code = (requestError as { code?: string })?.code
        if (requestError instanceof Error && (requestError.name === "AbortError" || code === "ERR_CANCELED")) return
        setResults([])
        setError(requestError instanceof Error ? requestError.message : "La recherche est indisponible. Veuillez réessayer.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 350)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  const selectResult = (result: GlobalSearchResult) => {
    if (!result.href) return
    setOpen(false)
    onNavigate?.()
  }

  const handleChange = (nextValue: string) => {
    onChange(nextValue)
    setActiveIndex(-1)
    setError("")
    if (nextValue.trim().length < 2) {
      setResults([])
      setLoading(false)
      setOpen(false)
    }
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false)
      return
    }
    if (!open || results.length === 0) return
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const direction = event.key === "ArrowDown" ? 1 : -1
      setActiveIndex((current) => (current + direction + results.length) % results.length)
    }
    if (event.key === "Enter" && activeIndex >= 0) {
      const result = results[activeIndex]
      if (result?.href) {
        event.preventDefault()
        window.location.assign(result.href)
      }
    }
  }

  const showPanel = open && query.length >= 2

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <div className="flex min-h-10 items-center rounded-full bg-[#F0F2F5] dark:bg-[#2A2A2A] border border-transparent dark:border-white/10 px-3 focus-within:ring-2 focus-within:ring-[#A35A2A]/30">
        {loading ? (
          <LoaderCircle size={17} className="mr-2 shrink-0 animate-spin text-[#A35A2A] dark:text-[#B46D1C]" aria-hidden="true" />
        ) : (
          <Search size={17} className="mr-2 shrink-0 text-[#65676B] dark:text-[#A1A1AA]" aria-hidden="true" />
        )}
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Rechercher sur Dughu..."
          aria-label="Rechercher sur Dughu"
          aria-autocomplete="list"
          aria-controls={showPanel ? listboxId : undefined}
          aria-expanded={showPanel}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          className={cn("min-w-0 flex-1 bg-transparent py-2 text-sm text-[#050505] dark:text-[#F3F4F6] outline-none placeholder:text-[#65676B] dark:placeholder:text-[#8E9094]", inputClassName)}
        />
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[70] max-h-[min(28rem,calc(100vh-6rem))] overflow-y-auto rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-2 shadow-xl dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] sm:min-w-80">
          <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-[#65676B] dark:text-[#A1A1AA]">
            Résultats
          </p>
          {error ? (
            <p role="alert" className="px-3 py-5 text-center text-sm text-red-700 dark:text-red-400">{error}</p>
          ) : loading && results.length === 0 ? (
            <p role="status" className="px-3 py-5 text-center text-sm text-[#65676B] dark:text-[#A1A1AA]">Recherche en cours…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-5 text-center text-sm text-[#65676B] dark:text-[#A1A1AA]">Aucun résultat pour « {query} ».</p>
          ) : (
            <ul id={listboxId} role="listbox" aria-label="Résultats de recherche" className="space-y-1">
              {results.map((result, index) => {
                const content = (
                  <>
                    <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#F0F2F5] dark:bg-[#2A2A2A] text-[#A35A2A] dark:text-[#B46D1C]">
                      {result.image ? (
                        <Image src={result.image} alt="" fill sizes="44px" className="object-cover" />
                      ) : result.type === "hashtag" ? (
                        <Hash size={21} aria-hidden="true" />
                      ) : result.type === "post" ? (
                        <FileText size={20} aria-hidden="true" />
                      ) : (
                        <UsersRound size={20} aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#2D2D2D] dark:text-[#F3F4F6]">{result.title}</span>
                      <span className="block truncate text-xs text-[#65676B] dark:text-[#A1A1AA]">{result.subtitle}</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-semibold uppercase text-[#8B5A2B] dark:text-[#D98A38]">{TYPE_LABELS[result.type]}</span>
                  </>
                )
                const itemClass = cn(
                  "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition",
                  result.href ? "hover:bg-[#F0F2F5] dark:hover:bg-[#2A2A2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A]" : "cursor-default opacity-80",
                  activeIndex === index && "bg-[#F0F2F5] dark:bg-[#2A2A2A]"
                )
                return (
                  <li key={`${result.type}-${result.id}`} id={`${listboxId}-${index}`} role="option" aria-selected={activeIndex === index}>
                    {result.href ? (
                      <Link href={result.href} onClick={() => selectResult(result)} className={itemClass}>{content}</Link>
                    ) : (
                      <div className={itemClass}>{content}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
