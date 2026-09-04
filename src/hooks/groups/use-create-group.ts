"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createGroup, fetchGroupCategories, uploadGroupImage } from "@/services/groups/groups.service"
import type { CreateGroupInput, CreateGroupOutcome, GroupImageElement } from "@/types/groups/create-group.types"

export function useGroupCategories() {
  return useQuery({
    queryKey: ["groups", "categories"],
    queryFn: ({ signal }) => fetchGroupCategories(signal),
    staleTime: 10 * 60_000,
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation<CreateGroupOutcome, Error, CreateGroupInput>({
    retry: 0,
    mutationFn: async ({ avatar, cover, ...fields }) => {
      const created = await createGroup(fields)
      if (!created.success || !created.groupId) throw new Error("Impossible de créer le groupe.")

      const uploads: { element: GroupImageElement; promise: ReturnType<typeof uploadGroupImage> }[] = [
        { element: "avatar", promise: uploadGroupImage(created.groupId, avatar, "avatar") },
        { element: "cover", promise: uploadGroupImage(created.groupId, cover, "cover") },
      ]
      const results = await Promise.allSettled(uploads.map(({ promise }) => promise))
      const failedUploads = results.flatMap((result, index) =>
        result.status === "rejected" || !result.value.success ? [uploads[index].element] : []
      )
      return { groupId: created.groupId, failedUploads }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups", "mine"] })
    },
  })
}
