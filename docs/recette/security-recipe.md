# Recette sécurité

| Test | Attendu | Preuve |
| --- | --- | --- |
| CORS depuis origine non autorisée | Rejet navigateur / absence header CORS | capture requête |
| Cookie session | `HttpOnly; Secure; SameSite=strict/lax` selon env | DevTools |
| Jeton répondant invalide | 401/403 et métrique invalidTokenAttempts | réponse API + `/metrics` |
| Autosave sans token | rejet, aucune réponse écrite | réponse API + DB |
| Modérateur sur route admin | 403 côté API | test contractuel |
| Export pseudonymisé | audit log + aucune donnée email | export + audit |
| Accès identité hors service dédié | exception `Accès refusé` | test service |
| TLS | TLS 1.2+ ou 1.3, HSTS | test SSL externe |
| Headers sécurité | nosniff, referrer no-referrer, permissions policy | curl -I |
| Rate limit | 429 après seuil | script répétitif |
| Logs | JSON sans corps/email, corrélation présente | extrait logs |
| Backup | archive chiffrée + sha256 | fichiers backup |
| Restore | restauration sur base test OK | log restore_test |

Aucun test de sécurité ne doit utiliser de données patient réelles.
