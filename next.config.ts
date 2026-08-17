import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Les avatars/couvertures/médias proviennent de nombreux hôtes Dughu/S3
    // (dont certains résolus via NAT64 en adresses jugées privées par
    // l'optimiseur d'images). On sert les images telles quelles pour éviter
    // les rejets "url parameter is not allowed" / "resolved to private ip".
    unoptimized: true,
    remotePatterns: [
      // Hôtes du réseau Dughu
      {
        protocol: "https",
        hostname: "apitest.dughu.com",
      },
      {
        protocol: "https",
        hostname: "dughu.com",
      },
      {
        protocol: "https",
        hostname: "www.dughu.com",
      },
      {
        protocol: "https",
        hostname: "*.dughu.com",
      },
      // Hôtes S3 / stockage objet
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3*.amazonaws.com",
      },
      // CDN
      {
        protocol: "https",
        hostname: "*.cloudfront.net",
      },
      // Changement : on autorise aussi les URLs relatives /locales et tout hôte https
      // pour garantir que les avatars/couvertures provenant d'autres domaines s'affichent.
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
