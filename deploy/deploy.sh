#!/usr/bin/env bash
#
# Déploiement de Dughu Web sur le VPS.
#
#   ./deploy/deploy.sh              # pull + build + restart
#   ./deploy/deploy.sh --no-pull    # rebuild sans récupérer le code distant
#
# Prérequis sur l'hôte : git, docker, docker compose, un fichier .env rempli.
#
set -euo pipefail

cd "$(dirname "$0")/.."

BRANCH="${DEPLOY_BRANCH:-production}"
PULL=1
[[ "${1:-}" == "--no-pull" ]] && PULL=0

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31mErreur:\033[0m %s\n' "$*" >&2; exit 1; }

# Sur les serveurs où l'utilisateur n'appartient pas au groupe `docker`, le
# démon n'est joignable qu'en root. On préfixe alors par sudo plutôt que
# d'ajouter l'utilisateur au groupe docker, ce qui équivaut à lui donner root.
if docker info >/dev/null 2>&1; then
  DOCKER="docker"
elif sudo -n docker info >/dev/null 2>&1; then
  DOCKER="sudo docker"
else
  fail "Le démon Docker est injoignable, y compris via sudo."
fi

# --- Vérifications préalables ------------------------------------------------
[[ -f .env ]] || fail "Fichier .env absent. Copie .env.example et remplis-le."

# Toute variable listée ici doit être présente ET non vide dans .env.
REQUIRED=(DUGHU_API_BASE_URL DUGHU_API_KEY)
for key in "${REQUIRED[@]}"; do
  value="$(grep -E "^${key}=" .env | tail -n1 | cut -d= -f2- || true)"
  [[ -n "${value}" ]] || fail "${key} est vide dans .env — l'application répondrait 500 sur toutes ses routes."
done

# NEXT_PUBLIC_GOOGLE_CLIENT_ID est inlinée dans le bundle client au moment du
# build : elle doit être passée en --build-arg, pas seulement via env_file.
GOOGLE_CLIENT_ID="$(grep -E '^NEXT_PUBLIC_GOOGLE_CLIENT_ID=' .env | tail -n1 | cut -d= -f2- || true)"
if [[ -z "${GOOGLE_CLIENT_ID}" ]]; then
  log "Avertissement : NEXT_PUBLIC_GOOGLE_CLIENT_ID est vide — la connexion Google sera désactivée."
fi
export NEXT_PUBLIC_GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}"

# --- Récupération du code ----------------------------------------------------
if [[ "${PULL}" -eq 1 ]]; then
  log "Récupération de la branche ${BRANCH}"
  git fetch --prune origin
  git checkout "${BRANCH}"
  git reset --hard "origin/${BRANCH}"
fi
log "Révision déployée : $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

# --- Build -------------------------------------------------------------------
# Construit la nouvelle image AVANT d'arrêter l'ancienne : si le build échoue,
# le service en cours continue de tourner.
log "Construction de l'image"
$DOCKER compose build

log "Redémarrage du service"
$DOCKER compose up -d --remove-orphans

# --- Vérification ------------------------------------------------------------
log "Attente de la sonde de santé"
for i in $(seq 1 30); do
  status="$($DOCKER inspect --format '{{.State.Health.Status}}' dughu-web 2>/dev/null || echo unknown)"
  if [[ "${status}" == "healthy" ]]; then
    log "Service sain après ${i}0s. Déploiement terminé."
    $DOCKER image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  if [[ "${status}" == "unhealthy" ]]; then
    $DOCKER compose logs --tail=50 app
    fail "Le conteneur est unhealthy. Déploiement interrompu."
  fi
  sleep 10
done

$DOCKER compose logs --tail=50 app
fail "La sonde de santé n'a pas répondu en 5 minutes."
