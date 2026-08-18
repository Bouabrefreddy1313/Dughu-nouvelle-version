import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import AppleProvider from "next-auth/providers/apple"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, pick, DughuApiError } from "@/lib/dughu"

// Obtient (ou crée) un compte Dughu pour un email de connexion sociale, et
// renvoie son dughuId. Utilisé dans le callback signIn pour garantir qu'un
// utilisateur Google/Facebook a toujours un compte côté API Dughu.
async function ensureDughuAccount(email: string, names: { first?: string; last?: string }) {
  if (!dughu.enabled) return ""
  try {
    // 1. Tenter un login direct (compte déjà existant sur Dughu)
    // Note : le mot de passe des comptes sociaux Dughu est généré et stocké uniquement
    // côté API, on tente d'abord la résolution par email via getSpecificUser.
    const existing = await dughuApi
      .getUser(email, email)
      .then((r) => r?.result ?? r?.user ?? r?.data ?? r)
      .catch(() => {
        // 404 → compte inexistant, on passe à la création
        return null
      })
    const existingId = String(pick(existing, "user_id", "userId", "id", "ID") || "")
    if (existingId) return existingId

    // 2. Créer le compte Dughu
    const randomPassword = `Dgh${Date.now()}${Math.floor(Math.random() * 1e6)}!`
    const reg = await dughuApi.register({
      first_name: names.first || "Utilisateur",
      last_name: names.last || "Social",
      email,
      gender: "Autre",
      password: randomPassword,
      password_confirmation: randomPassword,
      phone_number: `00${Math.floor(10000000 + Math.random() * 89999999)}`,
      country_code: "+225",
    })
    if (!reg?.success) return ""

    // 3. Login pour récupérer le user_id
    const auth = await dughuApi.login(email, randomPassword)
    if (!auth?.success) return ""
    const result = auth.result || auth || {}
    return String(pick(result, "user_id", "userId", "id", "ID") || "")
  } catch (err) {
    if (err instanceof DughuApiError && err.status === 500 && String(err.message).includes("DUGHU_API_KEY manquant")) throw err
    console.error("ENSURE DUGHU ACCOUNT ERROR:", err)
    return ""
  }
}

const handler = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_PRIVATE_KEY!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if ((account?.provider === "google" || account?.provider === "facebook") && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        })

        // Créer l'utilisateur social local s'il n'existe pas
        const names = (user.name || "").split(" ").filter(Boolean)
        const first = names[0] || "Utilisateur"
        const last = names.slice(1).join(" ") || "Social"

        let localUser = existingUser
        if (!localUser) {
          const base = user.email!.split("@")[0].replace(/[^a-zA-Z0-9_.]/g, "_")
          let username = `${base}_${Math.floor(Math.random() * 10000)}`
          let suffix = 1
          while (await prisma.user.findUnique({ where: { username } })) {
            username = `${base}_${suffix}`
            suffix++
          }
          localUser = await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name || `${first} ${last}`.trim(),
              firstName: first,
              lastName: last,
              username,
              slug: username,
              avatar: user.image || "/images/avatar.png",
              active: "1",
              emailVerified: new Date(),
              [`${account.provider}Id`]: account.providerAccountId,
            } as any,
          })
        }

        // Assurer un compte Dughu (création sur l'API si nécessaire)
        // L'ID Dughu est disponible via la réponse login, pas stocké en base.
        await ensureDughuAccount(user.email, { first, last })
      }
      return true
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})

export { handler as GET, handler as POST }