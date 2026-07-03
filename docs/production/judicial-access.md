# Procédure d'accès judiciaire à la table email

## Principe

L'accès email-code n'est pas un droit applicatif ordinaire. Il est interdit dans les usages courants et n'est possible que sur demande formelle, validée, proportionnée et auditée.

## Workflow

1. Réception de l'acte par canal officiel.
2. Vérification juridique de l'authenticité.
3. Analyse de proportionnalité : codes publics visés, période, finalité, destinataire.
4. Validation DPO ou référent protection des données.
5. Création d'une `JudicialAccessRequest` dans l'API.
6. Double validation juridique + DPO.
7. Exécution par rôle habilité, jamais par requête SQL manuelle non tracée.
8. Export minimal des correspondances explicitement demandées.
9. Chiffrement de l'export et transmission sécurisée.
10. Enregistrement de l'empreinte, de l'exécutant, des approbateurs et du compte rendu.
11. Clôture.

## Preuves à conserver

- Référence de la demande.
- Liste stricte des codes publics.
- Identifiants des validateurs.
- Horodatages.
- Empreinte de l'export.
- Journal `identity.vault_audit_logs` et audit applicatif central.
