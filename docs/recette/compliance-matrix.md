# Matrice de conformité CDC - passes 8 et 9

| Exigence CDC / production | Statut | Preuve technique | Reste à faire avant production |
| --- | --- | --- | --- |
| Déploiement containerisé | Oui préprod | `backend/Dockerfile`, `Dockerfile.frontend`, `docker-compose.preprod.yml` | Valider image registry et scan CVE |
| TLS en transit | Oui préprod | `ops/nginx/reverse-proxy.conf` force HTTPS/TLS 1.2+ et HSTS | Certificat réel et renouvellement automatique |
| Chiffrement au repos email | Oui applicatif | `EmailCryptoService` AES-256-GCM ; env stricte `EMAIL_ENCRYPTION_KEY_B64` | Rotation contrôlée des clés |
| Chiffrement sauvegardes | Oui script | `ops/scripts/backup_encrypted.sh` | Exécuter et archiver un test réel |
| Secrets hors front | Oui | Front n'utilise que `VITE_*`; backend reçoit env/secrets serveur | Injection vault en infra cible |
| Rotation secrets | Partiel | Procédure `docs/production/installation.md` | Implémenter double-secret pour rotation token sans invalidation brutale |
| Sauvegardes testées | Partiel | `restore_test.sh` fourni | Lancer mensuellement et conserver preuve |
| Observabilité | Oui MVP | `/api/health/*`, `/api/metrics`, logs JSON, correlation ID | Brancher Prometheus/alertmanager réel |
| Alertes erreurs/latence/autosave/tokens/exports | Oui base métrique | `ObservabilityService` | Déployer règles d'alerte dans supervision |
| CORS production strict | Oui | `main.ts` + `env.validation.ts` refusent wildcard/non-HTTPS production-like | Vérifier domaines définitifs |
| Cookies Secure/HttpOnly/SameSite | Oui | `AuthService.cookieOptions()` + validation env | Vérifier attributs navigateur en recette |
| Variables d'environnement strictes | Oui | `backend/src/config/env.validation.ts` | Ajouter validation provider email selon choix final |
| OpenAPI | Oui statique | `docs/openapi.yaml` | Génération automatique Swagger possible plus tard |
| Matrice permissions finale | Oui préprod | `docs/recette/permissions-matrix.md` | Validation métier/DPO |
| Procédure incident | Oui | `docs/production/incident-response.md` | Tester tabletop incident |
| Procédure accès judiciaire | Oui | `docs/production/judicial-access.md` | Valider avec juridique réel |
| Procédure purge/conservation | Oui | `docs/production/retention-purge.md` | Signer les durées finales |
| Notice répondant | Oui brouillon | `docs/production/respondent-notice.md` | Adapter vocabulaire métier final |
| Registre RGPD | Oui brouillon finalisable | `docs/production/rgpd-register.md` | Base légale à arbitrer |
| Checklist AIPD | Oui | `docs/production/aipd-checklist.md` | Décision DPO obligatoire |
| Accessibilité WCAG 2.2 AA | Partiel | `docs/accessibility-keyboard-audit.md`, tests statiques existants | Audit manuel complet et corrections restantes |
| OIDC/SAML utilisateurs internes | Non | Variables prévues seulement | Implémentation réelle ou validation exception locale impossible pour production stricte |

## Go / no-go

- Go préproduction technique : oui si secrets, TLS et provider email sont fournis.
- Go production réelle : non sans validation DPO, recette sécurité, restauration testée, décision AIPD et authentification interne conforme à la politique de l'établissement.
