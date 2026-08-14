"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import MainLayout from "@/components/layout/MainLayout"
import { ProfilePage } from "./ProfilePage"

interface ProfileShellProps {
  self?: boolean
  slug?: string
  userId?: string
}

export function ProfileShell({ self, slug, userId }: ProfileShellProps) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dughu_user")
      if (stored) {
        try {
          setUser(JSON.parse(stored))
        } catch {
          setUser(null)
        }
      } else {
        fetch("/api/auth/me")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.success && data.user) {
              localStorage.setItem("dughu_user", JSON.stringify(data.user))
              setUser(data.user)
            }
          })
          .catch(() => {})
      }
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("dughu_user")
    fetch("/api/logout", { method: "POST" }).finally(() => {
      router.push("/login")
    })
  }

  const handleSearch = (q: string) => {
    if (!q.trim()) return
    router.push(`/searchPosts?searchTerm=${encodeURIComponent(q)}`)
  }

  const target = self
    ? { userId: user?.id || "" }
    : slug
      ? { slug }
      : { userId: userId || "" }

  return (
    <MainLayout user={user} onLogout={handleLogout} onSearch={handleSearch} wide noRightSidebar>
      <ProfilePage target={target} />
    </MainLayout>
  )
}