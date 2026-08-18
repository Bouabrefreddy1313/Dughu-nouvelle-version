"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/apiClient"
import { getCachedFollowing, setCachedFollowing } from "@/lib/followCache"

export function SubscribeButton({
  authorId,
  initialFollowing,
  currentUserId,
  onChange,
}: {
  authorId: string
  initialFollowing?: boolean
  currentUserId?: string | null
  onChange?: (following: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [following, setFollowing] = useState<boolean | null>(() => {
    if (typeof initialFollowing === "boolean") return initialFollowing
    return getCachedFollowing(currentUserId, authorId) ?? null
  })

  // If initialFollowing not provided, fetch state from profile endpoint
  useEffect(() => {
    let mounted = true
    if (following !== null) return
    ;(async () => {
      try {
        const qp = `dughuUserId=${encodeURIComponent(authorId)}${currentUserId ? `&currentUserId=${encodeURIComponent(currentUserId)}` : ''}`
        const res = await apiClient.get(`/profile?${qp}`)
        if (!mounted) return
        const isFollowing = res.data?.isFollowing ?? res.data?.user?.isFollowing ?? false
        const nextFollowing = Boolean(isFollowing)
        setCachedFollowing(currentUserId, authorId, nextFollowing)
        setFollowing(nextFollowing)
      } catch (e) {
        console.error('SubscribeButton: failed to fetch initial following', e)
        setCachedFollowing(currentUserId, authorId, false)
        setFollowing(false)
      }
    })()
    return () => { mounted = false }
  }, [authorId, currentUserId, following])

  async function toggle() {
    if (loading) return
    setLoading(true)
    try {
      const nextFollowing = !following
      await apiClient.post('/profile/follow', {
        userId: currentUserId,
        targetId: authorId,
        following: nextFollowing,
      })
      setCachedFollowing(currentUserId, authorId, nextFollowing)
      setFollowing(nextFollowing)
      onChange?.(nextFollowing)
    } catch (err) {
      console.error('SubscribeButton error', err)
    } finally {
      setLoading(false)
    }
  }

  const label = loading ? '…' : following ? 'Abonné' : "S'abonner"
  const cls = `ml-3 whitespace-nowrap rounded-md border px-3 py-1 text-[13px] font-medium ${following ? 'bg-gray-100 text-gray-700' : 'bg-[#9C652F] text-white'}`
  return (
    <button onClick={toggle} disabled={loading || following === null} className={cls}>
      {label}
    </button>
  )
}

export default SubscribeButton
