# syntax=docker/dockerfile:1

#############################################
# 1. Base commune
#############################################
FROM node:20-alpine AS base
WORKDIR /app
# Nécessaire pour certains binaires natifs (sharp, etc.) sur Alpine
RUN apk add --no-cache libc6-compat

#############################################
# 2. Installation des dépendances (cache layer)
#############################################
FROM base AS deps
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
if [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm install --frozen-lockfile; \
elif [ -f yarn.lock ]; then corepack enable yarn && yarn install --frozen-lockfile; \
elif [ -f package-lock.json ]; then npm ci; \
else npm install; \
fi

#############################################
# 3. Build de l'application
#############################################
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables publiques nécessaires AU BUILD (Next.js les inline dans le bundle client)
# Passe-les via --build-arg si besoin, elles ne sont jamais secrètes.
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_TELEMETRY_DISABLED=1

RUN \
if [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
elif [ -f yarn.lock ]; then corepack enable yarn && yarn build; \
else npm run build; \
fi

#############################################
# 4. Image finale, minimale (runtime only)
#############################################
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Utilisateur non-root
RUN addgroup --system --gid 1001 nodejs \
&& adduser --system --uid 1001 nextjs

# IMPORTANT : nécessite `output: "standalone"` dans next.config.js/ts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]