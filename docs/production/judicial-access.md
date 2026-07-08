# Procédure d'accès exceptionnel à la table email

## Principe

L'accès code-email n'est pas un droit applicatif ordinaire. Il est interdit dans les usages courants et n'est possible que sur demande formelle, validée, proportionnée et auditée. Les administrateurs projet / chercheurs, responsables de site, modérateurs, analystes et administrateurs techniques ne doivent jamais pouvoir reconstruire seuls la correspondance email-réponses.

## Séparation applicative

- La SPA Vue principale ne doit pas exposer de page identity vault, correspondance code-email ou export confidentiel.
- L'API métier principale ne doit pas retourner d'email répondant ni exécuter d'export identity vault.
- Le DPO n'est pas un super-admin métier et ne gère pas les sites, questionnaires ou modérateurs par défaut.
- L'accès DPO se fait via la commande serveur dédiée :

```sh
npm --prefix backend run dpo:console
# alias accepté : npm --prefix backend run identity-vault:console
```

## Workflow opérationnel

1. Réception de la demande par canal officiel.
2. Vérification juridique de l'authenticité.
3. Analyse de proportionnalité : codes publics visés, période, finalité, destinataire.
4. Validation DPO ou référent protection des données hors frontend métier.
5. Connexion nominative du DPO dans la console dédiée.
6. Saisie obligatoire d'une justification et d'une référence légale/procédure.
7. Saisie d'une liste explicite de codes publics. La recherche libre par email est interdite.
8. Export minimal code-email uniquement pour les codes demandés.
9. Chiffrement de l'export fichier, génération d'une empreinte SHA-256 et conservation courte selon procédure.
10. Journalisation dans l'audit applicatif et dans l'audit identity vault.
11. Transmission sécurisée et clôture documentaire.

## Preuves à conserver

- Référence de la demande.
- Justification DPO.
- Liste stricte des codes publics.
- Identifiant du compte DPO ayant exécuté la console.
- Horodatages.
- Chemin contrôlé de l'export si fichier produit.
- Empreinte de l'export.
- Journal `identity.vault_audit_logs` et audit applicatif central.
