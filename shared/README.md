# Shared TypeScript contracts

`shared/types` contains framework-independent contracts used by the Vue frontend and by tests that verify backend behavior.

- `api.ts` defines request/response shapes exchanged with the REST API.
- `domain.ts` defines questionnaire, invitation, submission, terminal, and building primitives.
- `rbac.ts` defines roles, permissions, role profiles, and frontend route-access helpers.

These files document the client contract, but they do not enforce backend authorization. Server controllers and services remain authoritative for authentication, RBAC, and scope checks.

## Authority hierarchy

```text
local sensitive-user console
  -> project administrator / researcher (admin)
      -> site manager
          -> moderator
```

Specialized DPO, judicial, technical, analyst, and questionnaire-administrator roles are not part of this delegation chain. They are provisioned and used through their dedicated procedures.

## Change rules

When changing an API payload:

1. Update the backend DTO/service behavior.
2. Update the relevant type in `shared/types/api.ts`.
3. Update `docs/openapi.yaml` and examples.
4. Add or update contract tests.
5. Run `npm run docs:check`, `npm run typecheck`, and the affected test suites.

Prefer TSDoc on exported contracts when a field has security, lifecycle, privacy, or compatibility semantics that its type cannot express. Avoid comments that merely restate the property name.
