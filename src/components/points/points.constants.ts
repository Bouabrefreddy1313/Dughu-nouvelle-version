/**
 * Contenus statiques de la page « Points et activités » (barème, usages des
 * points, FAQ, mentions). Aucune donnée dynamique ici : tout ce qui provient
 * de l'API est géré dans les hooks et composants voisins.
 */

import type { LucideIcon } from "lucide-react"
import {
  Newspaper,
  HeartHandshake,
  Zap,
  Users,
  UserPlus,
  AlertTriangle,
  Send,
  Gift,
  Rocket,
  Store,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react"

/** Un bloc du barème « Comment gagner des points ». */
export interface EarnRuleBlock {
  key: string
  icon: LucideIcon
  title: string
  items: string[]
  /** Couleur sémantique : « danger » pour les pénalités (rouge). */
  tone?: "default" | "danger"
}

/** Barème de points (contenu fixe issu de la maquette). */
export const EARN_RULES: EarnRuleBlock[] = [
  {
    key: "publications",
    icon: Newspaper,
    title: "Publications",
    items: [
      "10 pts : 1ère publication du jour",
      "2 pts : 1ère republication",
      "1,5 pt par vue Capsule",
      "1 pt par vue Akwaplay",
    ],
  },
  {
    key: "reactions",
    icon: HeartHandshake,
    title: "Réactions & interactions",
    items: ["2 pts par réaction", "5 pts : 1er commentaire constructif du jour"],
  },
  {
    key: "flash",
    icon: Zap,
    title: "Flash",
    items: ["10 pts pour le 1er Flash du jour"],
  },
  {
    key: "fraterniser",
    icon: Users,
    title: "Adhérer & Fraterniser",
    items: [
      "10 pts pour un espace aimé",
      "3 pts par groupe rejoint",
      "2 pts pour avoir fraternisé",
    ],
  },
  {
    key: "invitations",
    icon: UserPlus,
    title: "Invitations & connexions",
    items: [
      "+100 pts par ami invité qui rejoint",
      "+100 pts pour 15 amis invités en un mois",
    ],
  },
  {
    key: "penalites",
    icon: AlertTriangle,
    title: "Pénalités",
    items: [
      "-20 pts : contenu signalé / non conforme (risque de suspension)",
      "-50 pts : spam / langage inapproprié (risque de suspension)",
    ],
    tone: "danger",
  },
]

/** Un usage des points (onglet « Utilisations »). */
export interface UsageItem {
  key: string
  icon: LucideIcon
  title: string
  description: string
}

/** « À quoi servent vos points ? » (contenu fixe issu de la maquette). */
export const POINT_USAGES: UsageItem[] = [
  {
    key: "envoyer-points",
    icon: Send,
    title: "Envoyer des points à quelqu'un",
    description: "Transfert instantané de points entre utilisateurs Dughu.",
  },
  {
    key: "dixip",
    icon: Gift,
    title: "Envoyer du Dixip à quelqu'un",
    description:
      "Envoi spécial de 100 pts en un coup. Un seul Dixip par publication.",
  },
  {
    key: "booster-post",
    icon: Rocket,
    title: "Booster un post",
    description:
      "Visibilité limitée dans le temps, coût variable selon la durée choisie.",
  },
  {
    key: "booster-espace",
    icon: Store,
    title: "Booster un Espace",
    description:
      "Mise en avant d'un Espace (boutique, association…) auprès de la communauté.",
  },
  {
    key: "certifier-compte",
    icon: ShieldCheck,
    title: "Certifier un compte",
    description:
      "Badge de confiance pour votre profil : les points couvrent les frais d'examen.",
  },
  {
    key: "certifier-espace",
    icon: BadgeCheck,
    title: "Certifier un Espace",
    description:
      "Certification de marque / organisation / média, avec justificatifs possibles.",
  },
]

/** Une entrée de FAQ (accordéon). */
export interface FaqEntry {
  key: string
  question: string
  answer: string
}

/** Questions fréquentes de l'onglet « Utilisations » (contenu fixe). */
export const POINTS_FAQ: FaqEntry[] = [
  {
    key: "disponibilite",
    question: "Toutes les fonctionnalités sont-elles disponibles ?",
    answer:
      "Certains usages (ex. Dixip, certification) peuvent être activés progressivement.",
  },
  {
    key: "tarifs",
    question: "Combien coûte chaque action ?",
    answer:
      "Le coût en points est indiqué avant chaque action. Des paliers ou promotions peuvent s'appliquer.",
  },
  {
    key: "limites",
    question: "Existe-t-il des limites ?",
    answer:
      "Il n'existe pas de limite de points par utilisateur. Un utilisateur peut donner des points aux autres utilisateurs sans limite. Seule la fonction Dixip est limitée à un par publication.",
  },
  {
    key: "remboursement",
    question: "Les points sont-ils remboursables ?",
    answer:
      "Les points consommés ne sont pas remboursables, sauf erreur technique avérée.",
  },
  {
    key: "expiration",
    question: "Mes points expirent-ils ?",
    answer:
      "Sauf mention contraire, vos points n'expirent pas. En cas de changement, une notification vous sera envoyée.",
  },
]

/** Mentions légales (bas de l'onglet « Utilisations »). */
export const LEGAL_NOTICE =
  "Mentions : DUGHU DEALTOO SAS peut adapter à tout moment les règles d'éligibilité, les tarifs en points et les fonctionnalités. Consultez les conditions d'utilisation dans l'App et sur le site."

/** Bandeaux d'introduction des onglets (contenu fixe). */
export const GAINS_BANNER = {
  title: "Barème de points sur Dughu",
  subtitle:
    "Découvrez comment accumuler des points et maximisez votre activité sur la plateforme.",
}

export const USAGES_BANNER =
  "Les Points DUGHU vous permettent de transférer de la valeur, booster votre visibilité et certifier votre identité sur la plateforme."
