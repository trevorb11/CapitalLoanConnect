---
name: Application signature PDF dates
description: Application exports should keep header dates separate from signature-area rendering.
---

Application PDFs and the application view must not render a date or time beneath the applicant’s drawn or electronic signature. The submission/header date may remain at the top of the document.

**Why:** Signature-area timestamps were being added independently in browser and server PDF renderers, so removing one renderer alone left other signed, e-sign, redacted, or underwriting variants inconsistent.

**How to apply:** Any future signature-template change must update both the browser ApplicationView renderer and the server underwriting PDF renderer, while preserving only explicitly requested non-signature dates.