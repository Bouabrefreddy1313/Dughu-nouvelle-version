/**
 * Hooks TanStack Query pour le domaine Événements de Dughu.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchEventsList,
  fetchEventDetail,
  submitCreateEvent,
  submitUpdateEvent,
  deleteEvent,
  toggleEventInscription,
  toggleEventInterest,
  fetchEventPosts,
  inviteUserToEvent,
  fetchInvitedUsers,
} from "@/services/events/events.service"
import type {
  EventsQueryParams,
  CreateEventInput,
  EventInviteInput,
} from "@/types/events/events.types"

export const EVENTS_KEYS = {
  all: ["events"] as const,
  lists: () => [...EVENTS_KEYS.all, "list"] as const,
  list: (params: EventsQueryParams) => [...EVENTS_KEYS.lists(), params] as const,
  details: () => [...EVENTS_KEYS.all, "detail"] as const,
  detail: (id: string, userId?: string) => [...EVENTS_KEYS.details(), id, userId || "0"] as const,
  posts: (id: string) => [...EVENTS_KEYS.all, "posts", id] as const,
  invited: (eventId: string) => [...EVENTS_KEYS.all, "invited", eventId] as const,
}

/**
 * Hook de récupération de la liste des événements.
 */
export function useEventsList(params: EventsQueryParams = {}) {
  return useQuery({
    queryKey: EVENTS_KEYS.list(params),
    queryFn: ({ signal }) => fetchEventsList(params, signal),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook de récupération des détails d'un événement.
 */
export function useEventDetail(id: string, userId?: string) {
  return useQuery({
    queryKey: EVENTS_KEYS.detail(id, userId),
    queryFn: ({ signal }) => fetchEventDetail(id, userId, signal),
    enabled: Boolean(id),
    staleTime: 1000 * 30, // 30 secondes
  })
}

/**
 * Mutation de création d'événement.
 */
export function useCreateEventMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateEventInput) => submitCreateEvent(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EVENTS_KEYS.lists() })
    },
  })
}

/**
 * Mutation de modification d'événement.
 */
export function useUpdateEventMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateEventInput> }) =>
      submitUpdateEvent(id, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: EVENTS_KEYS.lists() })
      void queryClient.invalidateQueries({ queryKey: EVENTS_KEYS.detail(variables.id) })
    },
  })
}

/**
 * Mutation de suppression d'événement.
 */
export function useDeleteEventMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId?: string }) => deleteEvent(id, userId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: EVENTS_KEYS.lists() })
      void queryClient.removeQueries({ queryKey: EVENTS_KEYS.detail(variables.id) })
    },
  })
}

/**
 * Mutation pour basculer l'inscription / adhésion.
 */
export function useToggleEventInscriptionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      toggleEventInscription(id, userId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: EVENTS_KEYS.detail(variables.id) })
      void queryClient.invalidateQueries({ queryKey: EVENTS_KEYS.lists() })
    },
  })
}

/**
 * Mutation pour basculer l'intérêt.
 */
export function useToggleEventInterestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      toggleEventInterest(id, userId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: EVENTS_KEYS.detail(variables.id) })
      void queryClient.invalidateQueries({ queryKey: EVENTS_KEYS.lists() })
    },
  })
}

/**
 * Hook de récupération des publications d'un événement.
 */
export function useEventPosts(id: string, userId?: string) {
  return useQuery({
    queryKey: EVENTS_KEYS.posts(id),
    queryFn: ({ signal }) => fetchEventPosts(id, userId, signal),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  })
}

/**
 * Mutation pour inviter un ami à un événement.
 */
export function useInviteUserToEventMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: EventInviteInput) => inviteUserToEvent(input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: EVENTS_KEYS.invited(variables.eventId),
      })
    },
  })
}

/**
 * Hook de récupération des personnes déjà invitées.
 */
export function useInvitedUsers(eventId: string, userId?: string) {
  return useQuery({
    queryKey: EVENTS_KEYS.invited(eventId),
    queryFn: ({ signal }) => fetchInvitedUsers(eventId, userId, signal),
    enabled: Boolean(eventId),
    staleTime: 1000 * 60,
  })
}
