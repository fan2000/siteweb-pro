# MOTIF — marketplace tech

Refonte du prototype MOTIF en monorepo TypeScript : storefront Next.js App Router, API NestJS, Prisma ORM et PostgreSQL. L’identité, les illustrations et la direction animée sont conservées; le catalogue local reste clairement signalé comme démonstration.

## Démarrage local

Prérequis : Node.js 22.12+, pnpm et Docker Desktop.

```powershell
Copy-Item .env.example .env
$mfaKey = node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
Add-Content .env "MFA_ENCRYPTION_KEY=$mfaKey"
docker compose up -d postgres
pnpm install
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

Le site démarre sur `http://localhost:3000`, l’API sur `http://localhost:4000/api` et PostgreSQL est publié sur le port hôte `55432` (modifiable via `POSTGRES_HOST_PORT`). Le port interne du conteneur reste `5432`. Avant d’exposer quoi que ce soit, remplacer chaque valeur locale et brancher les services externes requis.

## Architecture

- `apps/web` : Next.js App Router, rendu serveur du catalogue via l’API, interface de recherche, filtres, tri, favoris de session et écran de connexion.
- `apps/api` : NestJS, modules catalogue et auth, DTO validés, limitation de débit, sessions serveur PostgreSQL.
- `apps/api/prisma/schema.prisma` : comptes, sessions, jetons de vérification à usage unique et offres.
- `compose.yaml` : PostgreSQL de développement uniquement, lié à l’interface loopback.
- `data/offers.json` : exemples de démonstration réutilisés comme seed; les lignes sont marquées `demo`.

## Authentification

L’API utilise Argon2id, vérification d’adresse à jeton unique, sessions aléatoires persistées sous forme de hash et cookie `HttpOnly`, TOTP avec application d’authentification, codes de récupération hashés à usage unique, validation stricte et limitation de débit renforcée sur connexion/inscription. Les mutations authentifiées vérifient l’origine et un jeton CSRF associé à la session. L’activation du MFA exige une nouvelle confirmation du mot de passe; il est exigé à la connexion une fois activé. Le secret TOTP est chiffré en AES-256-GCM via `MFA_ENCRYPTION_KEY`. En production, cette clé doit être gérée hors de la base, avec un processus de rotation, et les appels de MFA doivent être protégés par TLS.

La livraison d’e-mails transactionnels n’est pas configurée ici. En développement seulement, le lien de vérification apparaît dans le journal de l’API. En production, ajouter un fournisseur mail, des limites dédiées par IP/compte, monitoring, révocation de toutes les sessions, récupération de compte et politique de déploiement TLS avant d’activer l’inscription. Les favoris restent pour le moment dans l’état client et ne sont pas liés aux comptes.

## Limites commerciales visibles

Les huit fiches sont des données de démonstration, pas des offres commerciales vérifiées. Aucun paiement, commande, stock fournisseur, lien d’affiliation ou livraison n’est branché. Les boutons de fiche l’indiquent et aucune commande ne peut être passée. Pour vendre réellement, ajouter les adaptateurs partenaires, les conditions de vente, taxes, remboursements, retours et consentement, puis vérifier les flux sur des comptes fournisseurs réels.

## Vérifications

```powershell
npm run build
npm --workspace @motif/api exec prisma validate
```

Le build de production et la validation du schéma exigent d’abord l’installation npm et une variable `DATABASE_URL`. Le projet initial contenait un petit test Node natif; il ne couvre pas encore la nouvelle application et doit être remplacé par des tests API, auth et parcours navigateur avant toute mise en production.
