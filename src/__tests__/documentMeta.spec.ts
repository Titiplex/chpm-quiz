import { describe, expect, it } from 'vitest'

import {
  applyDocumentMetadata,
  resolveDocumentDescription,
  resolveDocumentTitle,
} from '@/config/documentMeta'

describe('document metadata', () => {
  it('uses the configured application name as document title', () => {
    expect(resolveDocumentTitle('Projet libre')).toBe('Projet libre')
    expect(resolveDocumentTitle('  Projet libre  ')).toBe('Projet libre')
    expect(resolveDocumentTitle('   ')).toBe('CHPM Survey')
  })

  it('uses the configured application description for metadata', () => {
    expect(resolveDocumentDescription('Démo institutionnelle')).toBe('Démo institutionnelle')
    expect(resolveDocumentDescription('   ')).toBe(
      'Plateforme de questionnaires, invitations, passation sécurisée et statistiques pseudonymisées.',
    )
  })

  it('updates browser metadata from the configured application metadata', () => {
    document.head.innerHTML = `
      <meta name="application-name" content="Old title">
      <meta property="og:site_name" content="Old title">
      <meta property="og:title" content="Old title">
      <meta name="description" content="Old description">
      <meta property="og:description" content="Old description">
    `

    applyDocumentMetadata('Questionnaires Open Source', 'Application de passation ouverte')

    expect(document.title).toBe('Questionnaires Open Source')
    expect(document.querySelector('meta[name="application-name"]')?.getAttribute('content')).toBe(
      'Questionnaires Open Source',
    )
    expect(document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')).toBe(
      'Questionnaires Open Source',
    )
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      'Questionnaires Open Source',
    )
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Application de passation ouverte',
    )
    expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe(
      'Application de passation ouverte',
    )
  })
})
