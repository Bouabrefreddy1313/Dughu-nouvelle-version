import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produit .next/standalone/server.js : un serveur autonome embarquant
  // uniquement les node_modules réellement utilisés. Requis par le Dockerfile.
  output: "standalone",

  // N'expose pas l'en-tête `X-Powered-By: Next.js`.
  poweredByHeader: false,

  // Compression assurée par Next lui-même. Le vhost Apache ne configure pas
  // mod_deflate (il n'est pas garanti actif sur le serveur) et Cloudflare ne
  // compresse que lorsque le proxy orange est activé : la garder ici assure
  // des réponses compressées dans tous les cas.
  compress: true,

  // Les erreurs de type doivent bloquer le build de production.
  // (valeur par défaut, rendue explicite pour éviter qu'on la désactive
  // par commodité un jour de rush)
  typescript: { ignoreBuildErrors: false },

  images: {
    // Les avatars/couvertures/médias proviennent de nombreux hôtes Dughu/S3
    // (dont certains résolus via NAT64 en adresses jugées privées par
    // l'optimiseur d'images). On sert les images telles quelles pour éviter
    // les rejets "url parameter is not allowed" / "resolved to private ip".
    unoptimized: true,
    remotePatterns: [
      // Hôtes du réseau Dughu
      { protocol: "https", hostname: "dughu.com" },
      { protocol: "https", hostname: "*.dughu.com" },
      // Hôtes S3 / stockage objet
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
      { protocol: "https", hostname: "*.s3*.amazonaws.com" },
      // CDN
      { protocol: "https", hostname: "*.cloudfront.net" },
      // Filet de sécurité : les médias historiques référencent encore des
      // hôtes tiers variés. Sans effet réel tant que `unoptimized` est actif,
      // puisque aucune URL ne transite par l'optimiseur.
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
