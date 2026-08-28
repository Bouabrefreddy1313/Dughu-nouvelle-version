"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, BriefcaseBusiness, Check, Grid2X2, Loader2, RefreshCw, UserRoundPlus, UsersRound, X } from "lucide-react"
import { toast } from "sonner"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/queries/use-auth"
import { resolveMediaUrl } from "@/lib/dughu"
import { timeAgo } from "@/lib/helpers"
import type { RelationType } from "@/lib/profile-relations"
import type { IncomingRelationRequest } from "@/lib/relation-requests"
import { cn } from "@/lib/utils"

type Filter = "all" | RelationType

interface RelationRequestsResponse {
  success: boolean
  message?: string
  requests: IncomingRelationRequest[]
  unavailableTypes: RelationType[]
}

interface MutationVariables {
  request: IncomingRelationRequest
  action: "accept" | "decline"
}

const FILTERS = [
  { key: "all" as const, label: "Toutes", icon: Grid2X2 },
  { key: "friend" as const, label: "Fraterniser", icon: UserRoundPlus },
  { key: "network" as const, label: "Réseauter", icon: BriefcaseBusiness },
]

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

async function fetchRelationRequests(): Promise<RelationRequestsResponse> {
  const response = await fetch("/api/profile/relations/requests", { cache: "no-store" })
  const data = await readJson<RelationRequestsResponse>(response)
  if (!response.ok || !data?.success) {
    throw new Error(data?.message || "Impossible de charger vos demandes de relations.")
  }
  return data
}

function requestDate(value: string | null): string | null {
  if (!value || Number.isNaN(new Date(value).getTime())) return null
  return timeAgo(value)
}

function RequestSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4">
      <div className="size-14 shrink-0 rounded-full bg-gray-200" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-36 rounded bg-gray-200" />
        <div className="h-3 w-24 rounded bg-gray-100" />
      </div>
      <div className="hidden gap-2 sm:flex">
        <div className="h-10 w-24 rounded-xl bg-gray-100" />
        <div className="h-10 w-20 rounded-xl bg-gray-100" />
      </div>
    </div>
  )
}

function RequestAvatar({ request }: { request: IncomingRelationRequest }) {
  const [failed, setFailed] = useState(false)
  const source = !failed && request.avatar ? resolveMediaUrl(request.avatar) : "/images/avatar.png"

  return (
    <Image
      src={source}
      alt=""
      fill
      sizes="56px"
      className="object-cover"
      onError={() => setFailed(true)}
    />
  )
}

export function RelationRequestsPage() {
  const [filter, setFilter] = useState<Filter>("all")
  const queryClient = useQueryClient()
  const { data: currentUser, isLoading: authLoading, isError: authError } = useAuth()
  const requestsQuery = useQuery({
    queryKey: ["profile", "relation-requests"],
    queryFn: fetchRelationRequests,
    enabled: Boolean(currentUser),
    retry: 1,
    staleTime: 15_000,
  })

  const mutation = useMutation({
    mutationFn: async ({ request, action }: MutationVariables) => {
      const response = await fetch("/api/profile/relation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: request.userId, type: request.type, action }),
      })
      const data = await readJson<{ success: boolean; message?: string }>(response)
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Impossible de traiter cette demande.")
      }
      return { ...data, request, action }
    },
    onSuccess: ({ message, request, action }) => {
      queryClient.setQueryData<RelationRequestsResponse>(["profile", "relation-requests"], (current) =>
        current ? { ...current, requests: current.requests.filter((item) => !(item.userId === request.userId && item.type === request.type)) } : current
      )
      toast.success(message || (action === "accept" ? "Demande acceptée." : "Demande refusée."))
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Impossible de traiter cette demande.")
    },
  })

  const requests = requestsQuery.data?.requests ?? []
  const filteredRequests = filter === "all" ? requests : requests.filter((request) => request.type === filter)
  const counts = {
    all: requests.length,
    friend: requests.filter((request) => request.type === "friend").length,
    network: requests.filter((request) => request.type === "network").length,
  }
  const unavailableTypes = requestsQuery.data?.unavailableTypes ?? []

  return (
    <MainLayout user={currentUser} wide noRightSidebar active="profile" reserveLeftSidebar>
      <div className="mx-auto w-full max-w-5xl py-3 sm:py-6">
        <header className="mb-5 px-1 sm:mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#2D2D2D] sm:text-3xl">Demandes de relations</h1>
          <p className="mt-1 text-sm text-[#65676B] sm:text-base">Gérez vos demandes de fraternisation et de réseau.</p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)]">
          <div className="grid grid-cols-3 border-b border-gray-200" role="tablist" aria-label="Filtrer les demandes">
            {FILTERS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={cn(
                  "relative flex min-h-14 min-w-0 items-center justify-center gap-1.5 px-2 py-3 text-xs font-semibold transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A35A2A] sm:gap-2 sm:text-sm",
                  filter === key ? "bg-[#F5EFE8] text-[#6B3F1D]" : "text-[#65676B] hover:bg-gray-50"
                )}
              >
                <Icon size={18} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
                {counts[key] > 0 && <span className="rounded-full bg-[#A35A2A] px-1.5 py-0.5 text-[10px] leading-none text-white">{counts[key]}</span>}
                {filter === key && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#A35A2A]" />}
              </button>
            ))}
          </div>

          <div className="min-h-[420px] p-3 sm:p-5">
            {unavailableTypes.length > 0 && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
                <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p>Certaines demandes n’ont pas pu être chargées. Vous pouvez réessayer dans quelques instants.</p>
              </div>
            )}

            {authLoading || requestsQuery.isLoading ? (
              <div className="space-y-3" aria-label="Chargement des demandes">
                {[0, 1, 2].map((item) => <RequestSkeleton key={item} />)}
              </div>
            ) : authError ? (
              <div className="flex min-h-80 flex-col items-center justify-center px-4 text-center">
                <AlertCircle size={38} className="text-[#A35A2A]" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-bold text-[#2D2D2D]">Connexion requise</h2>
                <p className="mt-1 max-w-md text-sm text-[#65676B]">Connectez-vous pour consulter vos demandes de relations.</p>
                <Link href="/login" className="mt-5 rounded-xl bg-[#A35A2A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8B4A1F]">Se connecter</Link>
              </div>
            ) : requestsQuery.isError ? (
              <div className="flex min-h-80 flex-col items-center justify-center px-4 text-center">
                <AlertCircle size={38} className="text-red-500" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-bold text-[#2D2D2D]">Chargement impossible</h2>
                <p className="mt-1 max-w-md text-sm text-[#65676B]">Impossible de charger vos demandes de relations. Veuillez réessayer.</p>
                <button type="button" onClick={() => requestsQuery.refetch()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#A35A2A] px-5 text-sm font-semibold text-white transition hover:bg-[#8B4A1F]">
                  <RefreshCw size={16} aria-hidden="true" /> Réessayer
                </button>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center px-4 text-center">
                <span className="grid size-20 place-items-center rounded-full bg-[#F5EFE8] text-[#A35A2A]">
                  <UsersRound size={38} aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-lg font-bold text-[#2D2D2D]">Aucune demande en attente</h2>
                <p className="mt-1 max-w-md text-sm leading-6 text-[#65676B]">
                  {filter === "all" ? "Vous n’avez aucune demande de fraternisation ou de réseau pour le moment." : filter === "friend" ? "Vous n’avez aucune demande de fraternisation pour le moment." : "Vous n’avez aucune demande de réseau pour le moment."}
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-4 flex items-center gap-2 px-1">
                  <h2 className="font-bold text-[#2D2D2D]">{filter === "all" ? "Toutes les demandes" : filter === "friend" ? "Demandes de fraternisation" : "Demandes de réseau"}</h2>
                  <span className="rounded-full bg-[#A35A2A] px-2 py-0.5 text-xs font-semibold text-white">{filteredRequests.length}</span>
                </div>
                <ul className="space-y-3">
                  {filteredRequests.map((request) => {
                    const pending = mutation.isPending && mutation.variables?.request.userId === request.userId && mutation.variables.request.type === request.type
                    const date = requestDate(request.createdAt)
                    const profileHref = `/profile/${encodeURIComponent(request.username || request.userId)}`

                    return (
                      <li key={`${request.type}:${request.userId}`} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition hover:border-[#A35A2A]/20 sm:p-4">
                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <Link href={profileHref} className="relative size-14 shrink-0 overflow-hidden rounded-full bg-[#F0F2F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A] focus-visible:ring-offset-2" aria-label={`Voir le profil de ${request.name}`}>
                              <RequestAvatar request={request} />
                            </Link>
                            <div className="min-w-0">
                              <Link href={profileHref} className="block truncate font-bold text-[#2D2D2D] hover:text-[#A35A2A] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A]">{request.name}</Link>
                              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#65676B]">
                                {request.type === "friend" ? <UserRoundPlus size={14} className="text-[#A35A2A]" aria-hidden="true" /> : <BriefcaseBusiness size={14} className="text-[#A35A2A]" aria-hidden="true" />}
                                {request.type === "friend" ? "Fraterniser" : "Réseauter"}
                              </p>
                              {date && <p className="mt-1 text-xs text-[#8A8D91]">{date}</p>}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                            <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ request, action: "accept" })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#A35A2A] px-3 text-sm font-semibold text-white transition hover:bg-[#8B4A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4">
                              {pending && mutation.variables?.action === "accept" ? <Loader2 size={17} className="animate-spin" /> : <Check size={18} />} Accepter
                            </button>
                            <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ request, action: "decline" })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#F5A33B] px-3 text-sm font-semibold text-[#A35A2A] transition hover:bg-[#F5EFE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A33B] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4">
                              {pending && mutation.variables?.action === "decline" ? <Loader2 size={17} className="animate-spin" /> : <X size={18} />} Refuser
                            </button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  )
}
