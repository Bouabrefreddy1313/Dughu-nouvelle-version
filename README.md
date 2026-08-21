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

### Le serveur cible est mutualisé — à lire avant toute commande

`testing.dughu.com` est déployé sur `203.161.53.131`, un serveur qui héberge
**déjà** d'autres sites en production : `help.dughu.com`, `kibana.dughu.com`,
`admintesting.dughu.com`. Ils sont servis par **Apache**.

Trois règles en découlent :

- **Ne pas installer nginx.** Il réclamerait le port 80 que détient Apache, et
  ferait tomber les sites existants. Le reverse proxy utilisé ici est l'Apache
  déjà en place, auquel on ajoute un vhost.
- **Ne pas activer ufw** (ni toucher au pare-feu). Le port 443 du serveur est
  déjà filtré pour n'accepter que les plages Cloudflare ; poser un jeu de
  règles par-dessus risquerait de couper les autres sites, voire l'accès SSH.
- **`reload`, jamais `restart`.** Un reload d'Apache ne coupe aucune connexion
  et est refusé si la configuration est invalide. Un restart couperait tous les
  sites du serveur.

Le port `3000` est libre : le conteneur s'y installe sans rien déranger.

### Prérequis DNS

Un enregistrement **A** `testing` → IP du serveur doit exister dans la zone
Cloudflare de `dughu.com`, en **DNS only** (nuage gris) le temps d'obtenir le
certificat. Attention, un wildcard `*.dughu.com` existe : sans enregistrement
explicite, `testing` résout vers la mauvaise cible.

```bash
dig +short testing.dughu.com    # doit renvoyer l'IP du serveur, pas Cloudflare
```

Une fois le site en ligne en HTTPS, repasser l'enregistrement en **Proxied**
(nuage orange) comme les autres sous-domaines. Cloudflare signale d'ailleurs
l'exposition de l'IP d'origine tant que le nuage est gris — c'est attendu,
et cela disparaît à ce moment-là.

### Première installation

```bash
# 1. Docker (sauter si déjà présent : docker --version)
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

# 5. Vhost Apache
sudo a2enmod proxy proxy_http headers rewrite ssl
sudo cp deploy/apache/testing.dughu.com.conf \
        /etc/apache2/sites-available/testing.dughu.com.conf
sudo a2ensite testing.dughu.com
sudo apache2ctl configtest        # DOIT afficher "Syntax OK" avant de continuer
sudo systemctl reload apache2

# 6. Certificat — certbot crée le vhost :443 et la redirection HTTP -> HTTPS
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d testing.dughu.com
```

Le détail de chaque étape, et le bloc `mod_remoteip` à activer une fois le
proxy Cloudflare en place, sont documentés dans
[`deploy/apache/testing.dughu.com.conf`](deploy/apache/testing.dughu.com.conf).

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
Cloudflare → Apache (443, TLS) → 127.0.0.1:3000 → conteneur dughu-web
   (proxy)      déjà en place                          └── apitest.dughu.com
```

Le conteneur n'écoute qu'en loopback : Apache est le seul point d'entrée, et
il sert aussi les autres sites du serveur. Le vhost ajouté est isolé des leurs.

Besoins de l'application : ~1 vCPU et ~2 Go de RAM (pas de base de données,
pas d'optimisation d'images — `images.unoptimized` est actif). À prévoir en
**plus** de ce que consomment déjà les autres sites du serveur.

## Structure

| Chemin | Rôle |
|---|---|
| `src/app/api/` | Routes serveur — proxy et adaptation de l'API Dughu |
| `src/lib/dughu.ts` | Client de l'API Dughu (timeout, retry, normalisation) |
| `src/hooks/queries/` | Hooks TanStack Query côté client |
| `src/proxy.ts` | Garde d'authentification (ex-`middleware.ts`, renommé en Next 16) |
| `deploy/apache/` | Vhost Apache — **la configuration réellement utilisée** |
| `deploy/nginx/` | Équivalent nginx, conservé pour un futur serveur dédié |
| `deploy/deploy.sh` | Script de déploiement (build, bascule, sonde de santé) |
