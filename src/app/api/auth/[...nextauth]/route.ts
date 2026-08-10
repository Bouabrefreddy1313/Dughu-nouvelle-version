import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import AppleProvider from "next-auth/providers/apple"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

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
      if (account?.provider === "google" || account?.provider === "facebook") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! }
        })
        
        if (!existingUser) {
          // Créer l'utilisateur social
          const names = user.name?.split(" ") || ["", ""]
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name,
              firstName: names[0],
              lastName: names.slice(1).join(" ") || names[0],
              username: user.email!.split("@")[0] + Math.floor(Math.random() * 1000),
              slug: user.email!.split("@")[0] + Math.floor(Math.random() * 1000),
              avatar: user.image,
              active: "1",
              emailVerified: new Date(),
              [`${account.provider}Id`]: account.providerAccountId,
            } as any
          })
        }
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