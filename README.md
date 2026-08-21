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

## Déploiement

La branche de déploiement est `production`. L'environnement cible est
**`testing.dughu.com`**, adossé à l'API de recette `apitest.dughu.com`.

### Le serveur à provisionner

L'application est déployée sur un **VPS dédié**. Le serveur principal Dughu
(`203.161.53.131`) a été écarté : il héberge 17 sites en production et il ne
lui reste que ~676 Mo de RAM disponibles, sans swap. Un `next build` y aurait
déclenché l'OOM killer sur `mysqld` ou Elasticsearch.

Caractéristiques à prévoir :

| | |
|---|---|
| CPU | 2 vCPU |
| RAM | **4 Go** — l'exécution en demande ~1 Go, mais `next build` monte à ~2 Go |
| Disque | 20 Go |
| OS | Ubuntu 22.04 ou 24.04 |

4 Go est le point important : avec 2 Go, il faut ajouter du swap pour que le
build passe.

### Prérequis DNS

Un enregistrement **A** `testing` → IP du VPS doit exister dans la zone
Cloudflare de `dughu.com`, en **DNS only** (nuage gris) le temps d'obtenir le
certificat. Attention, un wildcard `*.dughu.com` existe : sans enregistrement
explicite, `testing` résout vers la mauvaise cible.

```bash
dig +short testing.dughu.com    # doit renvoyer l'IP du VPS, pas Cloudflare
```

Une fois le site en ligne en HTTPS, repasser l'enregistrement en **Proxied**
(nuage orange) comme les autres sous-domaines. Cloudflare signale l'exposition
de l'IP d'origine tant que le nuage est gris — c'est attendu, et cela
disparaît à ce moment-là.

### Première installation

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

# 4. Démarrage du conteneur (écoute sur 127.0.0.1:3000)
./deploy/deploy.sh --no-pull
curl -s http://127.0.0.1:3000/api/health     # doit renvoyer {"status":"ok",...}

# 5. Nginx + TLS
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx/dughu.conf /etc/nginx/sites-available/dughu
sudo ln -s /etc/nginx/sites-available/dughu /etc/nginx/sites-enabled/dughu
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d testing.dughu.com

# 6. Pare-feu. Sur le serveur principal Dughu, 80/443 n'acceptent que les
#    plages Cloudflare — même approche recommandée ici une fois le nuage
#    repassé en orange :
#      for ip in $(curl -s https://www.cloudflare.com/ips-v4); do
#        sudo ufw allow proto tcp from $ip to any port 80,443
#      done
#    En attendant le certificat, ouvrir simplement :
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

> Si l'application devait un jour cohabiter avec des sites déjà servis par
> Apache, ne pas installer nginx : utiliser
> [`deploy/apache/testing.dughu.com.conf`](deploy/apache/testing.dughu.com.conf)
> à la place.

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
curl -s https://testing.dughu.com/api/health       # sonde
docker compose restart app                 # redémarrage simple
git checkout <sha> && ./deploy/deploy.sh --no-pull   # rollback
```

## Architecture de déploiement

```
Cloudflare → Nginx (443, TLS) → 127.0.0.1:3000 → conteneur dughu-web
   (proxy)       VPS dédié                          └── apitest.dughu.com
```

Le conteneur n'écoute qu'en loopback : Nginx est le seul point d'entrée public.

Pas de base de données, pas d'optimisation d'images (`images.unoptimized` est
actif) : l'exécution est légère. C'est le build qui dimensionne le serveur.

## Structure

| Chemin | Rôle |
|---|---|
| `src/app/api/` | Routes serveur — proxy et adaptation de l'API Dughu |
| `src/lib/dughu.ts` | Client de l'API Dughu (timeout, retry, normalisation) |
| `src/hooks/queries/` | Hooks TanStack Query côté client |
| `src/proxy.ts` | Garde d'authentification (ex-`middleware.ts`, renommé en Next 16) |
| `deploy/nginx/` | Vhost Nginx — **la configuration de référence** |
| `deploy/apache/` | Variante Apache, pour un serveur mutualisé |
| `deploy/deploy.sh` | Script de déploiement (build, bascule, sonde de santé) |
