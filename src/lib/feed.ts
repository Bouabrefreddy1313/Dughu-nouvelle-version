import { prisma } from "@/lib/prisma"

const HASHTAG_REGEX = /(^|\s)#([a-zA-Z0-9_]{1,50})/g
const MENTION_REGEX = /(^|\s)@([a-zA-Z0-9_.]{1,30})/g

// Extrait les hashtags (#tag) d'un texte
export function extractHashtags(text: string): string[] {
  const tags: string[] = []
  const matches = text.matchAll(HASHTAG_REGEX)
  for (const m of matches) {
    if (m[2] && !tags.includes(m[2].toLowerCase())) tags.push(m[2].toLowerCase())
  }
  return tags
}

// Enregistre les hashtags : crée s'il n'existe pas, incrémente trendUseNum
export async function processHashtags(text: string) {
  const tags = extractHashtags(text)
  for (const tag of tags) {
    const existing = await prisma.hashtag.findUnique({ where: { tag } })
    if (existing) {
      await prisma.hashtag.update({
        where: { tag },
        data: { trendUseNum: { increment: 1 }, lastTrendTime: new Date() },
      })
    } else {
      await prisma.hashtag.create({
        data: { tag, trendUseNum: 1, lastTrendTime: new Date() },
      })
    }
  }
  return tags
}

// Extrait les mentions (@username)
export function extractMentions(text: string): string[] {
  const mentions: string[] = []
  const matches = text.matchAll(MENTION_REGEX)
  for (const m of matches) {
    if (m[2] && !mentions.includes(m[2].toLowerCase())) mentions.push(m[2].toLowerCase())
  }
  return mentions
}

// Notifie les utilisateurs mentionnés dans un post
export async function notifyMentions(text: string, actorId: string) {
  const mentions = extractMentions(text)
  if (mentions.length === 0) return

  const users = await prisma.user.findMany({
    where: {
      OR: mentions.map((username) => ({ username: { equals: username, mode: "insensitive" as const } })),
    },
    select: { id: true },
  })

  for (const u of users) {
    if (u.id === actorId) continue
    await prisma.notification.create({
      data: {
        userId: u.id,
        type: "mention",
        content: `Vous avez été mentionné dans une publication.`,
        // la relation post n'existe pas sur Notification, on stocke le lien dans content
      },
    })
  }
}

// Enregistre une activité utilisateur
export async function createActivity(userId: string, activityType: string, postId?: string, description?: string) {
  return prisma.activity.create({
    data: {
      userId,
      activityType,
      postId,
      description,
    },
  })
}

// Marque le contenu d'un post avec les liens hashtags (rendu côté serveur)
export function renderPostContent(content: string): string {
  return content
    .replace(HASHTAG_REGEX, (_m, space, tag) => `${space}<a class="hash" href="/hashtag/${encodeURIComponent(tag)}">#${tag}</a>`)
    .replace(MENTION_REGEX, (_m, space, user) => `${space}<a class="mention" href="/profile/${encodeURIComponent(user)}">@${user}</a>`)
}
