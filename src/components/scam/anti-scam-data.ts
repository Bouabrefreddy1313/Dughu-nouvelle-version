/**
 * Contenu statique de la page « Stop aux arnaques » — 20 mesures anti-arnaque
 * DUGHU. Données codées en dur côté front (aucun appel API) : la page est
 * purement informative.
 */

export interface AntiScamTip {
  title: string
  description: string
}

export const ANTI_SCAM_TIPS: AntiScamTip[] = [
  {
    title: "Vérifiez le badge, mais gardez toujours votre vigilance",
    description:
      "Le badge de vérification (✓) indique qu'un compte a été authentifié par Dughu. Toutefois, un compte vérifié peut être compromis ou malveillant : ne partagez jamais d'informations sensibles et surveillez tout comportement inhabituel.",
  },
  {
    title: "Contrôlez attentivement le profil avant toute interaction",
    description:
      "Avant d'accepter une demande d'amitié ou de traiter avec un vendeur, parcourez l'historique du compte : publications, photos, interactions et date de création. Méfiez-vous des profils vides ou trop récents.",
  },
  {
    title: "Ne partagez jamais vos informations personnelles",
    description:
      "Aucune personne ni aucun service Dughu ne vous demandera votre mot de passe, vos codes bancaires ou vos coordonnées complètes en message privé. Protégez ces données comme vous protégeriez votre argent.",
  },
  {
    title: "Utilisez un mot de passe fort et unique",
    description:
      "Créez un mot de passe long et complexe (lettres, chiffres, symboles) et n'utilisez pas le même mot de passe sur plusieurs sites. Pensez à renouveler régulièrement et à utiliser un gestionnaire de mots de passe si besoin.",
  },
  {
    title: "Activez la double authentification (2FA)",
    description:
      "Activez la 2FA pour renforcer la sécurité de votre compte. Même si votre mot de passe est dévoilé, le code secondaire rendra la connexion non autorisée beaucoup plus difficile.",
  },
  {
    title: "Ne cliquez pas sur les liens extérieurs suspects",
    description:
      "Les arnaqueurs partagent souvent des faux liens (ex. « Connectez-vous pour récupérer un gain »). Vérifiez toujours l'URL, assurez-vous qu'elle commence par « www.dughu.co » avant de saisir vos identifiants.",
  },
  {
    title: "Méfiez-vous des messages inattendus",
    description:
      "Si un contact vous demande de l'argent ou des informations sensibles, contactez-le par un autre canal (appel, message séparé) pour authentifier : les comptes piratés reçoivent souvent de fausses demandes d'aide.",
  },
  {
    title: "Signalez toute activité suspecte",
    description:
      "Utilisez le bouton « Signaler » dès que vous constatez un comportement anormal : cela aide l'équipe de sécurité à enquêter et à protéger la communauté.",
  },
  {
    title: "Ne payez jamais en dehors de Dughu",
    description:
      "Toutes les transactions doivent passer par les outils de paiement officiels (ex. Dughu Pay). Les paiements directs par mobile money, WhatsApp ou en personne ne sont pas couverts par la plateforme.",
  },
  {
    title: "Lisez toujours les avis avant un achat",
    description:
      "Consultez les commentaires, les photos et l'historique du vendeur. Un bon vendeur a des avis cohérents et des échanges publics vérifiables ; méfiez-vous des profils sans aucun avis.",
  },
  {
    title: "Ne croyez pas aux offres irréalistes",
    description:
      "Si une offre paraît trop belle pour être vraie (ex. smartphone haut de gamme à un prix dérisoire ou promesse d'emploi sans entretien), c'est probablement une arnaque. Prenez du recul et vérifiez.",
  },
  {
    title: "Ne partagez jamais les codes reçus par SMS",
    description:
      "Les codes de vérification (SMS, e-mail) sont strictement personnels. Ne les communiquez à personne, même si la demande semble provenir du support Dughu.",
  },
  {
    title: "Bloquez sans hésiter les utilisateurs suspects",
    description:
      "Si un utilisateur vous demande de l'argent ou vos informations, bloquez-le immédiatement pour couper tout contact ultérieur et protéger votre réseau.",
  },
  {
    title: "Conservez toutes les preuves de vos échanges",
    description:
      "Gardez captures d'écran, messages et reçus de paiement : ces éléments sont essentiels pour les signalements, les enquêtes et les éventuelles démarches auprès des autorités.",
  },
  {
    title: "Refusez toute pression ou urgence",
    description:
      "Les escrocs jouent souvent sur l'urgence (« offre limitée », « payez maintenant »). Ne vous laissez pas pousser : prenez le temps de vérifier avant d'agir.",
  },
  {
    title: "Restez sur la messagerie Dughu",
    description:
      "Privilégiez la messagerie interne Dughu pour vos échanges commerciaux : elle offre une traçabilité et des protections supplémentaires par rapport aux conversations externes (WhatsApp, SMS).",
  },
  {
    title: "Vérifiez les concours et promotions",
    description:
      "Les concours officiels sont publiés uniquement sur le compte Dughu officiel (vérifié). Méfiez-vous des faux concours partagés par des comptes non officiels.",
  },
  {
    title: "Ne créez qu'un seul compte par personne",
    description:
      "Multiplier les comptes fragilise la sécurité et la confiance. Un seul compte bien protégé est préférable et simplifie le suivi des activités.",
  },
  {
    title: "Suivez les alertes officielles Dughu",
    description:
      "Consultez régulièrement les communications de sécurité publiées par Dughu pour rester informé des nouvelles techniques d'arnaque et des recommandations.",
  },
  {
    title: "En cas d'arnaque : agissez vite",
    description:
      "Si vous êtes victime ou témoin d'une tentative d'arnaque, bloquez le compte immédiatement, rassemblez les preuves (captures, messages, reçus) et contactez le Service Sécurité Dughu pour déposer une plainte et bénéficier d'assistance.",
  },
]
