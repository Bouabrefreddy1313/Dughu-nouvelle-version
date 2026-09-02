"use client"

/**
 * Carte d'un espace (liste / découverte / mes espaces) — avatar, titre,
 * description, catégorie, statistiques et badge vérifié. Lien vers le détail.
 */

import Image from "next/image"
import Link from "next/link"
import { BadgeCheck, ThumbsUp, FileText } from "lucide-react"
import type { DughuPage } from "@/types/pages/pages.types"

interface PageCardProps {
  page: DughuPage
}

export default function PageCard({ page }: PageCardProps) {
  return (
    <Link
      href={`/espaces/${page.pageId}`}
      className="group flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-[#E7D8C4] hover:shadow-md"
    >
      <span className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-[#F0F2F5]">
        <Image
          src={page.avatar || "/images/avatar.png"}
          alt=""
          fill
          sizes="56px"
          className="object-cover"
          unoptimized={page.avatar?.startsWith("http")}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-bold text-[#2D2D2D] group-hover:text-[#A35A2A]">
            {page.pageTitle || page.pageName}
          </span>
          {page.verified && (
            <BadgeCheck size={16} className="shrink-0 text-[#06B6D4]" aria-label="Espace vérifié" />
          )}
        </span>
        <span className="mt-0.5 block truncate text-sm text-[#65676B]">
          {page.pageDescription || page.categoryName || "Espace Dughu"}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8A8D91]">
          {!!page.categoryName && <span className="rounded-full bg-[#F5EFE8] px-2 py-0.5 font-medium text-[#A35A2A]">{page.categoryName}</span>}
          <span className="inline-flex items-center gap-1">
            <ThumbsUp size={13} aria-hidden /> {page.likeCount} {page.likeCount > 1 ? "likes" : "like"}
          </span>
          <span className="inline-flex items-center gap-1">
            <FileText size={13} aria-hidden /> {page.nbrPost} posts
          </span>
        </span>
      </span>
    </Link>
  )
}