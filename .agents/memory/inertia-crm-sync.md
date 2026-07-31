---
name: Inertia Funding CRM sync
description: External Inertia Funding submissions arrive as dashboard applications and may be marked by the source name rather than a referrer URL.
---

Inertia Funding's external intake has identified itself in dashboard records with an agent/source label rather than a reliable browser referrer. Treat source labels, referrer/domain fields, and tracking fields together when routing external submissions to CRM systems.

**Why:** External form providers can omit referrer URLs and may submit incomplete application records before the applicant finishes the form.

**How to apply:** When adding another external intake provider, inspect a real dashboard record first and ensure incomplete applications, completed applications, and separately uploaded bank statements all reach the intended CRM workflows.