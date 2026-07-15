import { appConfig } from './env'

const fallbackDocumentTitle = 'CHPM Survey'
const fallbackDocumentDescription =
  'Plateforme de questionnaires, invitations, passation sécurisée et statistiques pseudonymisées.'

export function resolveDocumentTitle(appName = appConfig.appName): string {
  const normalizedAppName = appName.trim()
  return normalizedAppName || fallbackDocumentTitle
}

export function resolveDocumentDescription(appDescription = appConfig.appDescription): string {
  const normalizedDescription = appDescription.trim()
  return normalizedDescription || fallbackDocumentDescription
}

function updateMetaContent(selector: string, content: string): void {
  const meta = document.querySelector<HTMLMetaElement>(selector)
  if (meta) {
    meta.content = content
  }
}

export function applyDocumentMetadata(
  appName = appConfig.appName,
  appDescription = appConfig.appDescription,
): void {
  if (typeof document === 'undefined') {
    return
  }

  const title = resolveDocumentTitle(appName)
  const description = resolveDocumentDescription(appDescription)
  document.title = title

  updateMetaContent('meta[name="application-name"]', title)
  updateMetaContent('meta[property="og:site_name"]', title)
  updateMetaContent('meta[property="og:title"]', title)
  updateMetaContent('meta[name="description"]', description)
  updateMetaContent('meta[property="og:description"]', description)
}
