# MOTIF — marketplace tech

Refonte du prototype MOTIF en monorepo TypeScript : storefront Next.js App Router, API NestJS, Prisma ORM et PostgreSQL. L’identité, les illustrations et la direction animée sont conservées; le catalogue local reste clairement signalé comme démonstration.

## Démarrage local

Prérequis : Node.js 22.12+, pnpm et Docker Desktop.

```powershell
Copy-Item .env.example .env
$mfaKey = node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
Add-Content .env "MFA_ENCRYPTION_KEY=$mfaKey"
docker compose up -d postgres mailpit
pnpm install
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

Le site démarre sur `http://localhost:3003`, l’API sur `http://localhost:4000/api` et PostgreSQL est publié sur le port hôte `55432` (modifiable via `POSTGRES_HOST_PORT`). Le port interne du conteneur reste `5432`. En développement, Mailpit capture les e-mails SMTP sur le port `1025`; consultez la boîte de réception sur `http://localhost:8025`. Avant d’exposer quoi que ce soit, remplacer chaque valeur locale et brancher les services externes requis.

## Architecture

- `apps/web` : Next.js App Router, rendu serveur du catalogue via l’API, interface de recherche, filtres, tri, favoris de session et écran de connexion.
- `apps/api` : NestJS, modules catalogue et auth, DTO validés, limitation de débit, sessions serveur PostgreSQL.
- `apps/api/prisma/schema.prisma` : comptes, sessions, jetons de vérification à usage unique et offres.
- `compose.yaml` : PostgreSQL de développement uniquement, lié à l’interface loopback.
- `data/offers.json` : exemples de démonstration réutilisés comme seed; les lignes sont marquées `demo`.

## Authentification

L’API utilise Argon2id, vérification d’adresse à jeton unique, sessions aléatoires persistées sous forme de hash et cookie `HttpOnly`, TOTP avec application d’authentification, codes de récupération hashés à usage unique, validation stricte et limitation de débit renforcée sur connexion/inscription. Après vérification de la session, la connexion redirige directement vers l’accueil. La page `/compte`, accessible depuis le lien de navigation, vérifie l’accès, affiche l’état MFA et permet de rejoindre le catalogue ou la sécurité du compte. Le lien de navigation reflète aussi l’état de la session. Les mutations authentifiées vérifient l’origine et un jeton CSRF associé à la session. L’activation du MFA exige une nouvelle confirmation du mot de passe; il est exigé à la connexion une fois activé. Le secret TOTP est chiffré en AES-256-GCM via `MFA_ENCRYPTION_KEY`. En production, cette clé doit être gérée hors de la base, avec un processus de rotation, et les appels de MFA doivent être protégés par TLS.

À la première inscription, l’API crée un compte non vérifié et envoie un lien à usage unique valable 30 minutes. Si le lien expire, la page de confirmation permet d’en demander un nouveau avec `/api/auth/resend-verification`; l’interface renvoie le même message que le compte existe ou non, et invalide les anciens liens lors d’un renvoi. Le jeton brut n’est ni renvoyé par l’API ni écrit dans les journaux; seule son empreinte est stockée. En développement, Mailpit permet de consulter le message capturé sur `http://localhost:8025`. En production, configurez `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` et `MAIL_FROM` avec les identifiants d’un fournisseur transactionnel, et définissez `WEB_ORIGIN` sur l’origine HTTPS du site. L’inscription échoue proprement si l’e-mail ne peut pas être livré; l’API tente alors de supprimer le compte uniquement s’il est encore non vérifié. Les favoris restent pour le moment dans l’état client et ne sont pas liés aux comptes.

En développement, le client aligne l’hôte de l’API sur celui du site pour garder les cookies de session sur le même site (`localhost` ou `127.0.0.1`). La page de connexion confirme ensuite la session auprès de l’API avant d’annoncer que la connexion a réussi.

## Limites commerciales visibles

Les huit fiches sont des données de démonstration, pas des offres commerciales vérifiées. Aucun paiement, commande, stock fournisseur, lien d’affiliation ou livraison n’est branché. Les boutons de fiche l’indiquent et aucune commande ne peut être passée. Pour vendre réellement, ajouter les adaptateurs partenaires, les conditions de vente, taxes, remboursements, retours et consentement, puis vérifier les flux sur des comptes fournisseurs réels.

## Vérifications

```powershell
npm run build
npm --workspace @motif/api exec prisma validate
```

Le build de production et la validation du schéma exigent d’abord l’installation npm et une variable `DATABASE_URL`. Le projet initial contenait un petit test Node natif; il ne couvre pas encore la nouvelle application et doit être remplacé par des tests API, auth et parcours navigateur avant toute mise en production.
