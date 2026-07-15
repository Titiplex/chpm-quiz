import { appConfig } from '@/config/env'
import type { ApiQuestion, ApiQuestionnaire } from '@shared/types/api'

interface PdfLine {
  kind: 'text' | 'line' | 'checkbox' | 'gap'
  text?: string
  x?: number
  y?: number
  width?: number
  size?: number
  bold?: boolean
}

interface PageContent {
  lines: PdfLine[]
}

export interface QuestionnairePdfOptions {
  questionnaire: ApiQuestionnaire
  publicCode?: string | null
  buildingLabel?: string | null
  generatedBy?: string | null
  fileName?: string
}

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_X = 48
const MARGIN_TOP = 56
const MARGIN_BOTTOM = 54
const LINE_HEIGHT = 14
const TEXT_WIDTH = PAGE_WIDTH - MARGIN_X * 2

const winAnsiOverrides = new Map<string, number>([
  ['€', 128],
  ['‚', 130],
  ['ƒ', 131],
  ['„', 132],
  ['…', 133],
  ['†', 134],
  ['‡', 135],
  ['ˆ', 136],
  ['‰', 137],
  ['Š', 138],
  ['‹', 139],
  ['Œ', 140],
  ['Ž', 142],
  ['‘', 145],
  ['’', 146],
  ['“', 147],
  ['”', 148],
  ['•', 149],
  ['–', 150],
  ['—', 151],
  ['˜', 152],
  ['™', 153],
  ['š', 154],
  ['›', 155],
  ['œ', 156],
  ['ž', 158],
  ['Ÿ', 159],
])

export function downloadQuestionnairePdf(options: QuestionnairePdfOptions): void {
  const blob = createQuestionnairePdfBlob(options)
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = options.fileName ?? defaultPdfFileName(options.questionnaire, options.publicCode)
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

export function createQuestionnairePdfBlob(options: QuestionnairePdfOptions): Blob {
  const pages = layoutQuestionnaire(options)
  const pdfBytes = buildPdfBytes(pages)
  const blobBytes = new Uint8Array(pdfBytes.byteLength)
  blobBytes.set(pdfBytes)
  return new Blob([blobBytes.buffer], { type: 'application/pdf' })
}

function defaultPdfFileName(questionnaire: ApiQuestionnaire, publicCode?: string | null): string {
  const code = sanitizeFilePart(questionnaire.code || questionnaire.title || 'questionnaire')
  const suffix = publicCode ? `-${sanitizeFilePart(publicCode)}` : '-vierge'
  return `${code}${suffix}.pdf`
}

function sanitizeFilePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function layoutQuestionnaire(options: QuestionnairePdfOptions): PageContent[] {
  const pages: PageContent[] = [{ lines: [] }]
  let y = PAGE_HEIGHT - MARGIN_TOP

  function currentPage(): PageContent {
    return pages[pages.length - 1]!
  }

  function newPage(): void {
    pages.push({ lines: [] })
    y = PAGE_HEIGHT - MARGIN_TOP
  }

  function ensureSpace(height: number): void {
    if (y - height < MARGIN_BOTTOM) {
      newPage()
    }
  }

  function text(value: string, options: { size?: number; bold?: boolean; indent?: number; gapAfter?: number } = {}): void {
    const size = options.size ?? 10
    const lineHeight = Math.max(LINE_HEIGHT, size + 4)
    const indent = options.indent ?? 0
    const maxWidth = TEXT_WIDTH - indent
    const lines = wrapText(value, maxWidth, size)

    for (const line of lines) {
      ensureSpace(lineHeight)
      currentPage().lines.push({ kind: 'text', text: line, x: MARGIN_X + indent, y, size, bold: options.bold })
      y -= lineHeight
    }

    y -= options.gapAfter ?? 0
  }

  function gap(height = 8): void {
    ensureSpace(height)
    y -= height
  }

  function separator(): void {
    ensureSpace(12)
    currentPage().lines.push({ kind: 'line', x: MARGIN_X, y, width: TEXT_WIDTH })
    y -= 12
  }

  function checkbox(label: string, indent = 0): void {
    ensureSpace(18)
    currentPage().lines.push({ kind: 'checkbox', text: label, x: MARGIN_X + indent, y, size: 10 })
    y -= 18
  }

  text(appConfig.appName, { size: 9, bold: true })
  text(options.questionnaire.title, { size: 18, bold: true, gapAfter: 2 })
  text(`Questionnaire papier - version ${options.questionnaire.versionLabel} - langue ${options.questionnaire.language.toUpperCase()}`, { size: 10 })

  if (options.publicCode) {
    text(`Code public a recopier/verifier lors de la saisie : ${options.publicCode}`, { size: 12, bold: true })
  } else {
    text('Code public : _______________________________', { size: 12, bold: true })
  }

  if (options.buildingLabel) {
    text(`Batiment : ${options.buildingLabel}`, { size: 10 })
  }

  text(`Generation : ${new Date().toLocaleDateString('fr-FR')} ${options.generatedBy ? `- ${options.generatedBy}` : ''}`, { size: 9 })

  if (options.questionnaire.description) {
    gap(4)
    text(options.questionnaire.description, { size: 10 })
  }

  if (options.questionnaire.finality) {
    text(`Finalite : ${options.questionnaire.finality}`, { size: 9 })
  }

  separator()
  text('Consignes papier', { size: 12, bold: true })
  text('Cochez clairement les cases ou inscrivez la reponse sur les lignes prevues. Le moderateur recopiera ensuite les reponses dans linterface. Aucun email ou telephone nest requis pour cette version papier.', { size: 9 })
  separator()

  for (const group of options.questionnaire.groups) {
    ensureSpace(56)
    text(group.title, { size: 14, bold: true })
    if (group.description) {
      text(group.description, { size: 9 })
    }
    gap(2)

    for (const question of group.questions) {
      renderQuestion(question, text, checkbox, separator, gap, ensureSpace)
    }
  }

  return pages
}

function renderQuestion(
  question: ApiQuestion,
  text: (value: string, options?: { size?: number; bold?: boolean; indent?: number; gapAfter?: number }) => void,
  checkbox: (label: string, indent?: number) => void,
  separator: () => void,
  gap: (height?: number) => void,
  ensureSpace: (height: number) => void,
): void {
  const responseType = question.responseType ?? question.type
  ensureSpace(74)
  text(`${question.code} - ${question.label ?? question.title}${question.isRequired ? ' *' : ''}`, { size: 11, bold: true })

  if (question.helperText) {
    text(question.helperText, { size: 9 })
  }

  if (responseType === 'likert' && question.likertScale) {
    const values = likertValues(question.likertScale)
    text(`${question.likertScale.leftAnchor} - ${question.likertScale.rightAnchor}`, { size: 9 })
    for (const value of values) {
      checkbox(`${value} - ${likertLabel(question.likertScale, value)}`, 12)
    }
    if (question.likertScale.allowNotApplicable) {
      checkbox('Non applicable', 12)
    }
  } else if (responseType === 'single_choice') {
    for (const option of question.options ?? []) {
      checkbox(option.label, 12)
    }
  } else if (responseType === 'multiple_choice') {
    text('Plusieurs choix possibles.', { size: 9 })
    for (const option of question.options ?? []) {
      checkbox(option.label, 12)
    }
  } else if (responseType === 'number') {
    text('Reponse numerique : ______________________________________________', { size: 10, indent: 12 })
    gap(4)
  } else if (responseType === 'date') {
    text('Date : ____ / ____ / ________', { size: 10, indent: 12 })
    gap(4)
  } else if (responseType === 'information') {
    text('Information - aucune reponse attendue.', { size: 9, indent: 12 })
  } else {
    for (let line = 0; line < 4; line += 1) {
      text('____________________________________________________________________', { size: 10, indent: 12 })
    }
  }

  separator()
}

function likertValues(scale: { points: number; minValue?: number | null }): number[] {
  const minValue = scale.minValue ?? 1
  return Array.from({ length: scale.points }, (_, index) => minValue + index)
}

function likertLabel(scale: { points: number; minValue?: number | null; leftAnchor?: string | null; rightAnchor?: string | null; neutralLabel?: string | null }, value: number): string {
  const values = likertValues(scale)
  const index = values.indexOf(value)
  const lastIndex = values.length - 1
  const neutralIndex = Math.floor(lastIndex / 2)

  if (index <= 0) return scale.leftAnchor || `Valeur ${value}`
  if (index === lastIndex) return scale.rightAnchor || `Valeur ${value}`
  if (scale.neutralLabel && index === neutralIndex) return scale.neutralLabel

  return `Valeur ${value}`
}

function wrapText(value: string, maxWidth: number, fontSize: number): string[] {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return ['']

  const maxChars = Math.max(18, Math.floor(maxWidth / Math.max(fontSize * 0.48, 4)))
  const words = normalized.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }

    if (current) lines.push(current)
    current = word
  }

  if (current) lines.push(current)
  return lines
}

function buildPdfBytes(pages: PageContent[]): Uint8Array {
  const chunks: Uint8Array[] = []
  const offsets: number[] = [0]

  function push(bytes: Uint8Array): void {
    chunks.push(bytes)
  }

  function byteLength(): number {
    return chunks.reduce((total, chunk) => total + chunk.length, 0)
  }

  function object(id: number, content: Uint8Array): void {
    offsets[id] = byteLength()
    push(ascii(`${id} 0 obj\n`))
    push(content)
    push(ascii('\nendobj\n'))
  }

  push(ascii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'))

  const catalogId = 1
  const pagesId = 2
  const fontRegularId = 3
  const fontBoldId = 4
  const pageObjectIds = pages.map((_, index) => 5 + index * 2)
  const contentObjectIds = pages.map((_, index) => 6 + index * 2)

  object(catalogId, ascii('<< /Type /Catalog /Pages 2 0 R >>'))
  object(pagesId, ascii(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`))
  object(fontRegularId, ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'))
  object(fontBoldId, ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'))

  pages.forEach((page, index) => {
    const contentBytes = renderPageContent(page, index + 1, pages.length)
    const contentId = contentObjectIds[index]!
    const pageId = pageObjectIds[index]!

    object(pageId, ascii(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`))
    object(contentId, concat([ascii(`<< /Length ${contentBytes.length} >>\nstream\n`), contentBytes, ascii('\nendstream')]))
  })

  const xrefOffset = byteLength()
  const objectCount = 4 + pages.length * 2
  push(ascii(`xref\n0 ${objectCount + 1}\n`))
  push(ascii('0000000000 65535 f \n'))
  for (let id = 1; id <= objectCount; id += 1) {
    push(ascii(`${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`))
  }
  push(ascii(`trailer\n<< /Size ${objectCount + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`))

  return concat(chunks)
}

function renderPageContent(page: PageContent, pageNumber: number, pageCount: number): Uint8Array {
  const chunks: Uint8Array[] = []

  for (const line of page.lines) {
    if (line.kind === 'text') {
      chunks.push(textCommand(line.text ?? '', line.x ?? MARGIN_X, line.y ?? 0, line.size ?? 10, line.bold))
    } else if (line.kind === 'line') {
      const y = line.y ?? 0
      chunks.push(ascii(`0.82 w ${line.x ?? MARGIN_X} ${y} m ${(line.x ?? MARGIN_X) + (line.width ?? TEXT_WIDTH)} ${y} l S\n`))
    } else if (line.kind === 'checkbox') {
      const x = line.x ?? MARGIN_X
      const y = line.y ?? 0
      chunks.push(ascii(`0.9 w ${x} ${y - 10} 9 9 re S\n`))
      chunks.push(textCommand(line.text ?? '', x + 16, y - 7, line.size ?? 10, false))
    }
  }

  chunks.push(textCommand(`Page ${pageNumber} / ${pageCount}`, PAGE_WIDTH - MARGIN_X - 64, MARGIN_BOTTOM - 24, 8, false))
  return concat(chunks)
}

function textCommand(value: string, x: number, y: number, size: number, bold?: boolean): Uint8Array {
  return concat([
    ascii(`BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${round(x)} ${round(y)} Tm (`),
    escapePdfText(value),
    ascii(') Tj ET\n'),
  ])
}

function round(value: number): string {
  return value.toFixed(2).replace(/\.00$/, '')
}

function escapePdfText(value: string): Uint8Array {
  const bytes: number[] = []
  for (const char of value) {
    const code = toWinAnsiByte(char)
    if (code === 0x28 || code === 0x29 || code === 0x5c) {
      bytes.push(0x5c, code)
    } else if (code < 32 || code > 126) {
      const octal = code.toString(8).padStart(3, '0')
      bytes.push(0x5c, octal.charCodeAt(0), octal.charCodeAt(1), octal.charCodeAt(2))
    } else {
      bytes.push(code)
    }
  }
  return new Uint8Array(bytes)
}

function toWinAnsiByte(char: string): number {
  const override = winAnsiOverrides.get(char)
  if (override !== undefined) return override

  const code = char.charCodeAt(0)
  if (code >= 32 && code <= 255) return code

  const fallback: Record<string, string> = {
    ' ': ' ',
    '·': '-',
    '☐': '[ ]',
    '✓': 'x',
  }

  const replacement = fallback[char] ?? char.normalize('NFD').replace(/[\u0300-\u036f]/g, '')[0] ?? '?'
  return replacement.charCodeAt(0) <= 255 ? replacement.charCodeAt(0) : 63
}

function ascii(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length)
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff
  }
  return bytes
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const output = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return output
}
