# Déploiement bêta HDS en France

> Revue technique datée du 27 juillet 2026. Les certificats, périmètres de services et tarifs doivent être revérifiés au moment de la commande.

## 1. Décision préalable obligatoire

Le choix d'infrastructure dépend des données réellement utilisées :

| Bêta | Exigence minimale |
| --- | --- |
| Données entièrement synthétiques, aucune donnée de patient et aucun contact réel | Hébergement UE avec accord du DPO, contrat de sous-traitance RGPD et mêmes contrôles de sécurité que la production |
| Invitations envoyées à des patients ou réponses pouvant révéler leur santé | Prestations et contrat HDS couvrant précisément le calcul, le stockage, l'administration et la sauvegarde utilisés |

La pseudonymisation ne retire pas le caractère personnel des données tant qu'une ré-identification reste possible. Une bêta avec de vrais patients doit donc être traitée comme un traitement de données de santé.

Avant toute collecte réelle, le responsable de traitement et le DPO doivent valider :

- la base légale et l'exception applicable aux données de santé ;
- l'information des personnes, les durées de conservation et la procédure d'exercice des droits ;
- l'AIPD et les risques résiduels ;
- la convention HDS, le périmètre exact du certificat et la matrice de responsabilités ;
- les sous-traitants email/SMS, leurs DPA, leurs sous-traitants ultérieurs et leurs durées de conservation ;
- le protocole d'incident, de restauration et de fin de bêta.

## 2. Choix d'hébergement recommandé

### Option recommandée pour la bêta : Scaleway dans un projet HDS dédié

Cette option correspond le mieux au dépôt actuel : la production est déjà empaquetée dans un `docker-compose.production.yml` et peut être exécutée sur une machine virtuelle x86 sans refonte applicative.

Le contrat et le projet doivent être explicitement activés pour HDS. Il ne suffit pas que l'entreprise soit certifiée : chaque service et région employés doivent figurer dans le périmètre contractuel et dans le certificat en vigueur. Scaleway impose en outre un plan de support Business ou Enterprise pour ce périmètre. Le prix public de l'instance ne constitue donc qu'un plancher technique : il faut demander un devis HDS tout compris avant la décision d'achat.

Topologie bêta proposée :

- une instance x86 en région Paris, **2 vCPU / 4 Go de RAM minimum** si l'OIDC est fourni par l'établissement ;
- **8 Go de RAM** si un fournisseur d'identité est auto-hébergé sur la même machine, ce qui reste déconseillé ;
- un volume bloc chiffré de 60 à 80 Go ;
- PostgreSQL, backend, frontend et reverse proxy sur le réseau Docker interne ;
- seuls les ports 80/443 exposés publiquement ; SSH limité au VPN ou aux adresses d'administration ;
- sauvegardes chiffrées copiées dans un bucket Object Storage HDS distinct en région Paris ;
- supervision technique sans données personnelles dans les métriques ou alertes.

Cette topologie est volontairement mono-nœud. Elle convient à une bêta de petite taille avec une fenêtre d'interruption acceptée, mais elle ne fournit pas une haute disponibilité complète. Une production pérenne devra séparer la base, ajouter de la redondance et formaliser les objectifs RPO/RTO.

### Alternatives

- **Clever Cloud HDS** : moins d'administration système, bases PostgreSQL managées et sauvegardes intégrées. Le contrat HDS est sur devis. L'application devra être découpée en application Docker, base managée et tâches ponctuelles ; c'est plus simple à exploiter ensuite, mais moins direct pour ce dépôt.
- **OVHcloud HDS** : techniquement compatible avec la même architecture VM, mais l'activation HDS impose un contrat spécifique et un niveau de support Business ou Enterprise. Pour une petite bêta, ce coût fixe rend généralement l'offre moins économique.

## 3. Compatibilité du projet

Le dépôt est adapté à une installation HDS sur machine virtuelle, sous les réserves opérationnelles ci-dessous.

Éléments déjà présents :

- images Docker séparées et réseau interne ;
- rôles PostgreSQL distincts pour migrations, exploitation, coffre d'identité et accès DPO ;
- chiffrement AES-256-GCM des coordonnées et hachage avec poivre ;
- authentification OIDC et exigence MFA en production ;
- files durables pour email et SMS ;
- limitation de débit, cookies sécurisés, journal d'audit et politique de rétention ;
- sauvegarde PostgreSQL chiffrée avec somme SHA-256 ;
- contrôles de configuration de production.

Réserves à accepter ou corriger avant la bêta réelle :

- la sauvegarde créée par `npm run prod:backup` est locale tant qu'elle n'est pas copiée hors de l'instance ;
- le déploiement mono-nœud reste un point unique de panne ;
- les images doivent être épinglées par digest, pas seulement par tag ;
- les certificats TLS, secrets et clés de sauvegarde doivent venir d'un coffre ou d'une procédure équivalente ;
- l'OIDC de l'établissement doit imposer le MFA ;
- les fournisseurs de messagerie ne doivent recevoir que les coordonnées et un texte générique, sans titre de questionnaire, code pseudonymisé ou identifiant interne.

Les derniers points de minimisation des messages sont appliqués par le commit associé à cette livraison.

## 4. Préparation contractuelle et organisationnelle

1. Désigner le responsable de traitement, le DPO, le responsable opérationnel et les personnes d'astreinte.
2. Faire valider l'AIPD et le registre de traitement à partir des modèles de `docs/production`.
3. Demander au fournisseur : certificat HDS complet, représentation des garanties, services couverts, régions, sous-traitants, accès depuis des pays tiers, réversibilité, destruction et engagements de support.
4. Signer le DPA et le contrat HDS avant de créer ou migrer des données réelles.
5. Créer un projet cloud exclusivement HDS. Ne pas mélanger ses ressources avec un projet cloud standard.
6. Définir par écrit les objectifs de reprise de la bêta, par exemple RPO 24 h et RTO 4 h, puis vérifier qu'ils sont réalistes.

## 5. Provisionnement de l'infrastructure

1. Créer l'instance en région Paris dans le projet HDS.
2. Choisir Ubuntu 24.04 LTS x86_64 ou une distribution supportée équivalente.
3. Activer le chiffrement requis pour le volume et conserver les clés selon la matrice HDS.
4. Créer un compte administrateur nominatif ; interdire la connexion SSH par mot de passe et l'accès direct de `root`.
5. Configurer le pare-feu :
   - TCP 80/443 depuis Internet ;
   - TCP 22 uniquement depuis le VPN ou les adresses d'administration ;
   - aucun port PostgreSQL public.
6. Activer MFA et journalisation sur le compte cloud.
7. Installer Docker Engine, le plugin Compose, Git et les outils de sauvegarde approuvés.
8. Créer les répertoires protégés :

```bash
sudo install -d -m 0750 -o root -g docker /srv/chpm
sudo install -d -m 0700 -o root -g root /srv/chpm/tls /srv/chpm/backups
```

## 6. DNS et TLS

1. Utiliser de préférence un sous-domaine de l'établissement, par exemple `questionnaires.example.fr`.
2. Pointer l'enregistrement DNS vers l'adresse publique de l'instance.
3. Émettre le certificat TLS via la PKI de l'établissement ou Let's Encrypt.
4. Déposer `fullchain.pem` et `privkey.pem` dans `TLS_CERT_DIR`, permissions root uniquement.
5. Vérifier la chaîne TLS, le renouvellement automatique et l'absence d'ancien protocole.

## 7. OIDC et comptes

1. Créer un client confidentiel dans l'IdP institutionnel.
2. Déclarer exactement l'URI de retour :

```text
https://questionnaires.example.fr/api/auth/oidc/callback
```

3. Autoriser `openid email profile` et imposer une preuve MFA via `AUTH_OIDC_REQUIRED_AMR` ou `AUTH_OIDC_REQUIRED_ACR`.
4. Restreindre le client aux groupes autorisés.
5. Pré-créer les comptes et rôles applicatifs ; ne pas utiliser l'authentification locale en production.

## 8. Configuration et déploiement

Depuis la racine du dépôt :

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Remplacer tous les secrets et domaines. Pour la bêta :

```dotenv
NODE_ENV=production
AUTH_PROVIDER=oidc
ALLOW_LOCAL_AUTH_IN_PRODUCTION=false
AUTH_OIDC_REQUIRED_AMR=mfa
RESPONDENT_TOKEN_TTL_DAYS=7
VITE_DEFAULT_LOCALE=fr
EMAIL_PROVIDER=brevo
SMS_PROVIDER=disabled
EXPOSE_RESPONDENT_DEV_LINKS=false
EMAIL_IDENTITY_DISABLED_FOR_APP=true
```

Générer les secrets avec une source cryptographique, par exemple :

```bash
openssl rand -base64 32
openssl rand -hex 32
```

Épingler `POSTGRES_IMAGE`, `NGINX_IMAGE` et `NODE_IMAGE` avec leurs digests SHA-256, puis lancer :

```bash
npm ci
npm run check
npm run build
npm run prod:config
npm run prod:build
npm run prod:up
npm run prod:bootstrap
```

Le bootstrap ne doit être exécuté qu'une fois. Le mot de passe temporaire doit ensuite être supprimé du fichier d'environnement et révoqué selon la procédure locale.

Pour charger le questionnaire client ITQ + LEC-5 :

```bash
docker compose -f docker-compose.production.yml --env-file .env.production \
  --profile client-seed run --rm client-questionnaire-seed
```

## 9. Email transactionnel

### Choix recommandé : Brevo, plan gratuit pour la bêta

Le code possède déjà l'adaptateur Brevo. Au 27 juillet 2026, l'offre gratuite annoncée comprend 5 000 emails par mois sans limite quotidienne ; ce quota doit être revérifié au moment de l'ouverture du compte.

Configuration :

1. Créer un compte au nom de l'établissement, pas au nom personnel d'un développeur.
2. Accepter le DPA et enregistrer le fournisseur au registre des sous-traitants.
3. Vérifier le domaine d'envoi et publier SPF, DKIM et DMARC.
4. Créer une clé API limitée au service transactionnel et la placer dans le coffre de secrets.
5. Désactiver le suivi d'ouverture et de clic quand il n'est pas strictement nécessaire.
6. Définir une rétention minimale des journaux côté fournisseur.
7. Envoyer uniquement les messages génériques générés par le code corrigé.
8. Tester rebonds, adresses invalides, réessais et révocation de clé.

Alternative : Mailjet, déjà intégré, avec une limite gratuite quotidienne plus faible. SendGrid ne doit être retenu qu'après validation juridique spécifique des transferts et sous-traitants.

Un email ne doit jamais contenir les réponses, le titre clinique du questionnaire, le code pseudonymisé, un diagnostic ou une information de prise en charge. Le lien à jeton reste un secret d'accès : il ne doit pas être transféré.

## 10. SMS

L'option la moins chère et la plus protectrice est de commencer la bêta avec :

```dotenv
SMS_PROVIDER=disabled
```

Activer le SMS seulement si l'étude démontre qu'il est nécessaire à l'accessibilité ou au taux de réponse.

- **Brevo SMS** : mise en route la plus rapide car l'adaptateur existe déjà ; comparer le prix réel affiché dans le compte avant achat.
- **OVHcloud SMS** : tarif français généralement compétitif, mais aucun adaptateur n'est présent dans le dépôt. Son ajout doit faire l'objet d'un ticket séparé avec tests et revue DPO.
- **Twilio** : adaptateur existant, mais moins favorable en coût et en gouvernance pour cette bêta française.

Chaque SMS est facturé par segment. Garder le texte ASCII/Unicode aussi court que possible, ne jamais inclure le nom du questionnaire ni le code public, et vérifier le nombre de segments avec le fournisseur avant envoi massif.

## 11. Sauvegarde hors site et restauration

Créer un bucket Object Storage dans le même projet HDS et en région Paris. Employer uniquement une classe de stockage couverte par le périmètre HDS ; ne pas supposer que les classes d'archivage ou les règles de cycle de vie le sont.

Créer la sauvegarde locale :

```bash
npm run prod:backup
```

Copier ensuite **les deux fichiers** vers le bucket :

```bash
rclone copy /srv/chpm/backups scw-hds:chpm-beta-backups \
  --include 'chpm-backup-*.tar.enc' \
  --include 'chpm-backup-*.tar.enc.sha256' \
  --exclude '*' \
  --checksum
```

Ne pas employer `rclone sync`, qui peut propager une suppression. La configuration `rclone`, la clé API et la phrase de chiffrement doivent avoir des détenteurs et emplacements distincts.

Planifier :

- une sauvegarde chiffrée quotidienne ;
- une copie hors instance immédiatement après la sauvegarde ;
- une alerte si aucun nouvel objet n'est reçu ;
- un test de restauration isolé avant la bêta, puis au moins mensuel ;
- une vérification des sommes SHA-256 avant chaque restauration.

Le document `backup-restore.md` détaille la restauration applicative.

## 12. Recette avant ouverture

La bêta ne doit pas accepter de données réelles tant que les contrôles suivants ne sont pas tous validés :

- `GET /healthz` et l'état de disponibilité backend sont verts ;
- connexion OIDC, MFA et déconnexion testés ;
- chaque rôle a été testé avec un compte dédié, y compris les refus d'accès ;
- aucune coordonnée ou réponse n'apparaît dans les logs, métriques ou erreurs ;
- les emails et SMS ne contiennent aucun titre de questionnaire, code ou identifiant interne ;
- invitation, relance, expiration, refus et soumission ont été testés ;
- les statistiques masquent les groupes sous le seuil configuré ;
- la sauvegarde hors site a été restaurée dans un environnement isolé ;
- les clés API peuvent être révoquées et renouvelées ;
- l'incident de sécurité et la fin de bêta ont un responsable identifié ;
- le DPO et le responsable de traitement ont signé le go/no-go.

## 13. Exploitation et fin de bêta

Pendant la bêta :

- commencer par des données synthétiques, puis un petit groupe explicitement autorisé ;
- surveiller disponibilité, espace disque, âge de la dernière sauvegarde et profondeur des files ;
- ne pas envoyer les corps de logs à une plateforme non couverte contractuellement ;
- appliquer les correctifs de sécurité, avec sauvegarde et procédure de retour arrière ;
- documenter chaque incident et chaque accès exceptionnel.

À la fin :

1. arrêter les nouvelles invitations ;
2. exporter uniquement ce qui est juridiquement autorisé ;
3. purger selon la politique approuvée ;
4. révoquer les clés API, secrets OIDC et comptes temporaires ;
5. obtenir les preuves de destruction/restitution prévues au contrat ;
6. archiver le bilan de bêta, la recette et la décision de passage en production.
