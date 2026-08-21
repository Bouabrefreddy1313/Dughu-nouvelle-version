# Dughu Web

Front-end Next.js 16 (App Router) de Dughu. L'application est un client de
l'API Laravel Dughu : **elle ne possède pas de base de données**. La session
utilisateur tient dans deux cookies httpOnly (`dughu_token`, `dughu_user_id`)
posés par `/api/login`, et toutes les données transitent par `src/lib/dughu.ts`.

Conséquence : le service est **entièrement sans état**. Aucun volume, aucune
migration, aucun stockage local à sauvegarder — on peut le redéployer ou le
répliquer sans précaution particulière.

## Prérequis

- Node.js >= 20.9 (l'image Docker utilise Node 22)
- Docker + Docker Compose pour le déploiement
- Un accès à l'API Dughu (`DUGHU_API_KEY`)

## Développement

```bash
npm install
cp .env.example .env      # puis renseigne DUGHU_API_KEY
npm run dev               # http://localhost:3000
```

## Variables d'environnement

Toutes documentées dans [`.env.example`](.env.example). Deux pièges :

- **`DUGHU_API_KEY` est obligatoire.** Sans elle, toutes les routes API
  répondent 500.
- **`NEXT_PUBLIC_GOOGLE_CLIENT_ID` est une variable de *build*.** Next.js
  l'inline dans le bundle client au moment du `next build` : la modifier impose
  de reconstruire l'image, un simple redémarrage n'a aucun effet.

## Déploiement en production

La branche de déploiement est `production`.

### Première installation sur le VPS

```bash
# 1. Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER" && newgrp docker

# 2. Code
sudo mkdir -p /srv && sudo chown "$USER" /srv
git clone -b production https://github.com/Dughu/DUGHU-WEB-3.0.git /srv/dughu
cd /srv/dughu

# 3. Secrets
cp .env.example .env && nano .env && chmod 600 .env

# 4. Démarrage
./deploy/deploy.sh --no-pull

# 5. Nginx + TLS
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx/dughu.conf /etc/nginx/sites-available/dughu
sudo ln -s /etc/nginx/sites-available/dughu /etc/nginx/sites-enabled/dughu
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d dughu.com -d www.dughu.com
```

### Déploiements suivants

```bash
cd /srv/dughu && ./deploy/deploy.sh
```

Le script construit la nouvelle image **avant** d'arrêter l'ancienne, puis
attend que la sonde `/api/health` passe au vert. Si le build échoue ou si le
conteneur reste `unhealthy`, il s'arrête en affichant les logs et le service
précédent continue de tourner.

### Exploitation

```bash
docker compose logs -f app                 # logs en direct
docker compose ps                          # état + santé
curl -s https://dughu.com/api/health       # sonde
docker compose restart app                 # redémarrage simple
git checkout <sha> && ./deploy/deploy.sh --no-pull   # rollback
```

## Architecture de déploiement

```
Internet → Nginx (443, TLS)  →  127.0.0.1:3000  →  conteneur dughu-web
                                                      └── API Dughu (HTTPS, externe)
```

Le conteneur n'écoute qu'en loopback : Nginx est le seul point d'entrée public.

Dimensionnement : 1 vCPU / 2 Go de RAM suffisent (pas de base de données, pas
d'optimisation d'images — `images.unoptimized` est actif).

## Structure

| Chemin | Rôle |
|---|---|
| `src/app/api/` | Routes serveur — proxy et adaptation de l'API Dughu |
| `src/lib/dughu.ts` | Client de l'API Dughu (timeout, retry, normalisation) |
| `src/hooks/queries/` | Hooks TanStack Query côté client |
| `src/proxy.ts` | Garde d'authentification (ex-`middleware.ts`, renommé en Next 16) |
| `deploy/` | Vhost Nginx et script de déploiement |
