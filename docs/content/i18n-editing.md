# Editing interface translations without changing code

Shared frontend text is stored as editable JSON files in `public/content/i18n/`:

- `fr.json` is the required reference/fallback locale;
- `en.json` contains English strings;
- any additional `<language-code>.json` file can provide another locale, for example `de.json`, `es.json`, or `it.json`.

These files cover the application shell and reusable interface text: navigation, login, shared buttons, access messages, and similar content. They do not translate questionnaire/instrument content. Questionnaire languages follow their own reviewed version lifecycle.

At startup, the frontend reads `public/content/i18n/locales.json` to build the global language selector. The manifest is generated from the locale JSON files in the directory.

## Editing rules

1. Keep exactly the same keys in every language.
2. Change values only; never translate keys.
3. Preserve every placeholder in braces, such as `{points}`, `{label}`, or `{level}`.
4. Use valid JSON double quotes. Escape a quote inside text as `\"`.
5. Keep the intended meaning, action, severity, and accessibility context.
6. Do not add personal data, real respondent/patient examples, real email addresses, tokens, credentials, or secrets.
7. Have sensitive, legal, clinical, and research wording reviewed by the responsible subject-matter owner.

Example:

```json
{
  "auth.login": "Sign in",
  "respondent.likert.group": "{points}-point Likert scale for {label}"
}
```

## Validate before delivery

From the repository root:

```powershell
npm run content:i18n:check
```

The validator confirms that:

- `fr.json` exists as the reference locale;
- all locale files except `locales.json` have the same keys as `fr.json`;
- every value is a non-empty string;
- placeholders are preserved across languages.

The check cannot assess translation quality, legal accuracy, readability, tone, or validated-instrument equivalence. Those require human review.

## Add a language

1. Copy the reference locale to a file named with the new language code:

   ```powershell
   Copy-Item public/content/i18n/fr.json public/content/i18n/de.json
   ```

2. Translate values only.
3. Validate the locale set:

   ```powershell
   npm run content:i18n:check
   ```

4. Regenerate the visible-locale manifest:

   ```powershell
   npm run content:i18n:manifest
   ```

The generated manifest resembles:

```json
{
  "locales": [
    { "code": "fr", "label": "French", "nativeLabel": "Français", "direction": "ltr" },
    { "code": "de", "label": "German", "nativeLabel": "Deutsch", "direction": "ltr" }
  ]
}
```

Development and build commands regenerate this manifest automatically. The manual command is useful for reviewing the exact result before commit.

## Review checklist

- Test the language selector before and after authentication.
- Check long labels on narrow screens and at 200% zoom.
- Verify button text still describes the action.
- Confirm errors remain specific and are announced by assistive technology.
- Check placeholders with representative values.
- Confirm the document language changes correctly for screen readers.
- Verify right-to-left layout before adding an RTL locale; manifest direction alone does not prove full RTL support.
