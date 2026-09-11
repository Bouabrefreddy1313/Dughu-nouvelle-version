import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function CanalInviteRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ id?: string; canalId?: string; canal_id?: string }>
}) {
  const { code } = await params
  const { id, canalId, canal_id } = (await searchParams) || {}
  const targetId = id || canalId || canal_id || ""

  if (targetId && code) {
    redirect(`/canal?id=${encodeURIComponent(targetId)}&code=${encodeURIComponent(code)}`)
  } else if (targetId) {
    redirect(`/canal?id=${encodeURIComponent(targetId)}`)
  } else if (code) {
    redirect(`/canal?code=${encodeURIComponent(code)}`)
  }
  redirect("/canal")
}
