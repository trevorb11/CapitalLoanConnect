---
name: Stale agent email data
description: Agent email corrections must cover historical application records as well as the shared agent registry.
---

The underwriting submission email CCs the agent email stored on each application, so changing the shared agent registry does not repair older applications that retain a previous address.

**Why:** A corrected registry can coexist with stale production application rows, causing underwriting notifications to continue using the old recipient.

**How to apply:** When an agent email changes, search production application records and other persisted assignment fields for the old address, update affected records through the normal application path, and publish a rebuilt bundle if the old value was present in compiled output.