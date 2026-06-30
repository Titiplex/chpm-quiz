export type FrontLocale = 'fr' | 'en'

type Params = Record<string, string | number | boolean | null | undefined>

const messages = {
  fr: {
    'respondent.notice.title': 'Notice d’information avant démarrage',
    'respondent.notice.consent': 'J’ai lu la notice d’information et je comprends que la soumission finale verrouille mes réponses pseudonymisées.',
    'respondent.actions.previous': 'Précédent',
    'respondent.actions.next': 'Question suivante',
    'respondent.actions.prepareSubmit': 'Préparer la soumission finale',
    'respondent.submit.title': 'Confirmer la soumission définitive',
    'respondent.submit.body': 'Après confirmation, la session sera verrouillée : vous pourrez consulter l’accusé de réception, mais vous ne pourrez plus modifier ni soumettre une deuxième fois.',
    'respondent.submit.confirm': 'Je confirme et je verrouille mes réponses',
    'respondent.submit.back': 'Revenir au questionnaire',
    'respondent.freeText.help': 'Sauvegarde automatique après saisie. Évitez les noms, emails, téléphones et détails directement identifiants.',
    'respondent.likert.group': 'Échelle Likert {points} points pour {label}',
    'respondent.required': 'obligatoire',
  },
  en: {
    'respondent.notice.title': 'Information notice before starting',
    'respondent.notice.consent': 'I have read the information notice and understand that final submission locks my pseudonymized answers.',
    'respondent.actions.previous': 'Previous',
    'respondent.actions.next': 'Next question',
    'respondent.actions.prepareSubmit': 'Prepare final submission',
    'respondent.submit.title': 'Confirm final submission',
    'respondent.submit.body': 'After confirmation, the session will be locked: you may view the receipt, but you cannot edit or submit a second time.',
    'respondent.submit.confirm': 'I confirm and lock my answers',
    'respondent.submit.back': 'Return to questionnaire',
    'respondent.freeText.help': 'Automatic save after typing. Avoid names, emails, phone numbers, and directly identifying details.',
    'respondent.likert.group': '{points}-point Likert scale for {label}',
    'respondent.required': 'required',
  },
} satisfies Record<FrontLocale, Record<string, string>>

export function normalizeLocale(locale: string | undefined | null): FrontLocale {
  return locale?.toLowerCase().startsWith('en') ? 'en' : 'fr'
}

export function t(key: keyof typeof messages.fr, params: Params = {}, locale = navigator.language): string {
  const normalized = normalizeLocale(locale)
  const template = messages[normalized][key] ?? messages.fr[key] ?? key
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name: string) => String(params[name] ?? ''))
}
