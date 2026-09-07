"use client"

/**
 * Carte de sondage pour le canal (POST /canals/:id/polls & vote).
 */

import { CheckCircle2, Circle } from "lucide-react"
import type { CanalPoll } from "@/types/canal/canal.types"
import { useVotePoll } from "@/hooks/canal/use-canal-polls"

interface CanalPollCardProps {
  poll: CanalPoll
  currentUserId?: string
  canalId: string
}

export default function CanalPollCard({ poll, currentUserId, canalId }: CanalPollCardProps) {
  const voteMutation = useVotePoll(canalId)

  const totalVotes = poll.options.reduce((acc, opt) => acc + opt.voteCount, 0)

  const handleVote = (optionId: string) => {
    if (!currentUserId || poll.isClosed) return
    voteMutation.mutate({
      optionId,
      pollId: poll.id,
      userId: currentUserId,
      canalId,
    })
  }

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#1E293B] p-4 text-gray-200">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-bold text-white text-sm">{poll.question}</h4>
        {poll.isClosed && (
          <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-[10px] text-red-300">
            Fermé
          </span>
        )}
      </div>

      <div className="space-y-2">
        {poll.options.map((opt) => {
          const percent = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0
          return (
            <button
              key={opt.id}
              type="button"
              disabled={poll.isClosed || voteMutation.isPending}
              onClick={() => handleVote(opt.id)}
              className="relative flex w-full items-center justify-between overflow-hidden rounded-xl border border-gray-700/80 bg-gray-800/60 p-2.5 text-xs transition hover:border-[#985810]"
            >
              {/* Barre de progression */}
              <div
                className="absolute inset-y-0 left-0 bg-[#985810]/20 transition-all duration-300"
                style={{ width: `${percent}%` }}
              />

              <span className="relative z-10 flex items-center gap-2 font-medium">
                {opt.isVoted ? (
                  <CheckCircle2 size={15} className="text-[#985810]" />
                ) : (
                  <Circle size={15} className="text-gray-400" />
                )}
                {opt.text}
              </span>

              <span className="relative z-10 font-bold text-gray-400">
                {percent}% ({opt.voteCount})
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
        <span>{totalVotes} vote{totalVotes > 1 ? "s" : ""} au total</span>
        {poll.allowMultiple && <span>Choix multiples autorisés</span>}
      </div>
    </div>
  )
}
