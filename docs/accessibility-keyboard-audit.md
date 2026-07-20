# Keyboard and screen-reader audit checklist

**Target:** complete before production release and after material UI changes.

**Critical scope:** respondent route `/r/:token`, invitation creation, statistics, compliance, and terminal workflows.
**Standard:** WCAG 2.2 AA as the acceptance target; this checklist is not a certification.

Record the date, build/commit, browser, operating system, assistive technology/version, tester, result, and issue reference for every run.

## Respondent workflow

- Tab reaches the notice, consent/acknowledgement control when present, every help trigger, every answer, Previous/Next, review, and final confirmation.
- Shift+Tab reverses direction without a keyboard trap.
- Enter/Space activates buttons, choices, checkboxes, and dialog controls as expected.
- Focus remains visible on light, dark, and colored surfaces at 200% zoom.
- The screen reader announces the page/question title, instructions, required state, full option/Likert labels, errors, save status, and locked state.
- Help dialogs receive focus, have an accessible name/description, keep focus appropriately, close with Escape where applicable, and restore focus to the trigger.
- Final confirmation is announced as a dialog and explains that submission is irreversible.
- Validation errors are associated with their fields and focus moves to a useful error summary/first error.
- Progress and autosave updates do not create excessive announcements.

## Moderation and invitations

- Email, phone, building, questionnaire, terminal, delivery mode, assistance, expiry, and notification controls have visible labels and programmatic names.
- Conditional fields appear in a logical focus position.
- Invitation errors use an assertive/appropriate live region and remain visible as text.
- Status, channel, and action are not conveyed by color alone.
- Full respondent/terminal tokens are never shown in production dashboards.

## Questionnaire builder

- Group/question reordering has an accessible alternative to drag-and-drop.
- Question type, options, Likert anchors, required state, and conditional-rule inputs are labelled.
- Preview is reachable and clearly distinguished from a live respondent session.
- Publication errors are summarized and linked to the relevant configuration.

## Statistics and compliance

- Tables have captions/headers and remain understandable in linear screen-reader reading order.
- Suppressed/insufficient values are conveyed in text, not only by styling.
- Filters announce names, current values, and result updates.
- Maintenance actions have clear confirmation and result feedback.
- Export fingerprints, secure-document status, DPO/legal validation, and closure reports are readable without color.
- No judicial API response renders direct contact data or ciphertext.

## Terminals and responsive layout

- Touch targets for primary controls are at least 44 by 44 CSS pixels unless an allowed exception applies.
- Likert and choice layouts reflow without horizontal page scrolling at narrow widths.
- Data tables use contained horizontal scrolling without trapping keyboard focus.
- At 320 CSS-pixel width and 400% zoom, no action or content is lost.
- Terminal handoff clears or hides the prior respondent's content before the next session.

## Evidence and decision

Run `npm run test:a11y`, but treat automated checks as supporting evidence only. Production approval requires manual keyboard, screen-reader, zoom/reflow, contrast, error, dialog, and mobile/touch testing. File every failure with severity, owner, remediation, and retest result.
