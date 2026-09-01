"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import MainLayout from "@/components/layout/MainLayout"
import { ProfilePage } from "./ProfilePage"
import { me, logout } from "@/services/auth/auth.service"
import { submitVerification } from "@/services/profile/profile.service"

interface ProfileShellProps {
  self?: boolean
  slug?: string
  userId?: string
}

export function ProfileShell({ self, slug, userId }: ProfileShellProps) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    // Source de vérité : /api/auth/me (cookies Dughu), plus de cache localStorage.
    void me()
      .then((data) => {
        if (data?.success && data.user) {
          setUser(data.user)
        }
      })
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    void logout().finally(() => {
      router.push("/login")
    })
  }

  const handleSubmitVerification = async () => {
    setIsVerifying(true)
    try {
      const formData = new FormData()
      formData.append("dughuUserId", user?.id || "")
      formData.append("email", user?.email || "")
      const data = await submitVerification(formData)
      if (data.success) {
        setUser(data.user || user)
      }
      return data
    } catch (error) {
      console.error("VERIFY SUBMIT ERROR:", error)
      return { success: false, message: "Erreur interne" }
    } finally {
      setIsVerifying(false)
    }
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
    <MainLayout user={user} onLogout={handleLogout} onSearch={handleSearch} wide noRightSidebar reserveLeftSidebar>
      <ProfilePage target={target} onSubmitVerification={handleSubmitVerification} isVerifying={isVerifying} />
    </MainLayout>
  )
}
