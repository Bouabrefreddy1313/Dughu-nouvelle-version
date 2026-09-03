"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/queries/use-auth"
import { CreateGroupForm } from "./CreateGroupForm"

export default function CreateGroupPage() {
  const { data: user } = useAuth()
  return <MainLayout user={user} active="groups" wide noRightSidebar><section className="mx-auto w-full max-w-3xl py-2 sm:py-4" aria-labelledby="create-group-title">
    <Link href="/groups" className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-semibold text-[#6B3F1D]"><ArrowLeft size={18} aria-hidden="true" />Retour aux groupes</Link>
    <h1 id="create-group-title" className="mb-5 text-xl font-bold text-[#2D2D2D] sm:text-2xl">Créer un groupe</h1><CreateGroupForm />
  </section></MainLayout>
}
