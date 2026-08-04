---
name: Application signature PDF dates
description: Application exports should keep header dates separate from signature-area rendering.
---

Application PDFs and the application view must render the applicant’s signature date beneath the drawn or electronic signature in the bottom-right signature area, but must omit the time. The separate submission/header date remains at the top of the document.

**Why:** Signature-area date/time stamps were added independently in browser and server PDF renderers. Removing the whole stamp lost required date information, while leaving the original timestamp formatting exposed the time.

**How to apply:** Any future signature-template change must update both the browser ApplicationView renderer and the server underwriting PDF renderer. Format signature timestamps with date-only locale options; do not include hour or minute fields.