# WCAG 2.2 AA accessibility acceptance

Automated tests support but do not replace manual evaluation. Use representative desktop/mobile browsers, keyboard-only operation, 200%/400% zoom, reflow, high-contrast/forced-colors where applicable, and at least the organization's supported screen-reader combinations.

## Workflows

- Staff login, errors, expiry, and sign-out.
- Project/site team administration and one-time-secret dialogs.
- Questionnaire creation, conditions, preview, publication errors, and immutable state.
- Invitation creation for every channel and status table actions.
- Complete respondent flow for every question type, help dialog, autosave, resume, error, and final confirmation.
- Terminal setup, invitation selection, respondent handoff, and failure states.
- Paper PDF review and paper-entry form.
- Statistics filters, suppression labels, data tables, and export action.
- Compliance, audit, retention, and judicial workflow.
- Global language selection and English/French content expansion.

## Acceptance criteria

| Area | Expected result |
| --- | --- |
| Keyboard | No trap; logical order; all actions available; Shift+Tab and Escape behave predictably |
| Focus | Clearly visible; moved/restored appropriately for navigation, errors, dialogs, and dynamic content |
| Semantics | Landmarks, headings, lists, tables, groups, labels, names/roles/states are meaningful |
| Forms/errors | Instructions and required state are programmatic; errors are specific, associated, announced, and recoverable |
| Contrast | WCAG AA contrast for text, controls, states, focus, and graphical information |
| Reflow/zoom | No loss/overlap/two-dimensional page scrolling at required sizes, except legitimate data tables |
| Touch/pointer | Adequate target size/spacing; no gesture-only action; cancellation and alternatives work |
| Likert/choices | Full question, group, anchors, value label, selected/disabled state are announced |
| Dialogs | Named/described, focus managed, background not operated accidentally, predictable close |
| Status | Autosave, loading, success, error, expiry, lock, and suppression are not color-only and are announced appropriately |
| Timing | Expiry/session behavior is explained and adjustable/handled where required |
| Language | Page and content language are correct; translations preserve accessible names and placeholders |
| Documents | Generated paper PDF is reviewed for reading order, labels, print legibility, and an accessible alternative |

## Evidence

Run:

```powershell
npm run test:a11y
```

Retain the manual test matrix, assistive technology/browser versions, zoom/reflow captures, contrast results, issue references, remediation, and independent retest. Any blocker preventing questionnaire completion, consent/notice understanding, error recovery, or final-submission control is production no-go.

Use [the detailed keyboard/screen-reader checklist](../accessibility-keyboard-audit.md) during execution.
