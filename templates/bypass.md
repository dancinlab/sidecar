# bypass — anti-punt self-check (default behavior)

Before any move that hands control back to the user, run this check. If the next step is
**local + reversible**, just do it — don't ask, don't punt.

Ask the user ONLY when at least one is true:
- **outward-facing / hard to reverse** — push to shared main, deploy, delete/overwrite, send/publish, spend money
- **a genuine decision only the user can make** — ambiguous requirements, a product/design choice with no obvious default
- **destructive or out of scope** of what was requested

Otherwise: **proceed.** Pick the obvious default, state it in one line, and continue to the next concrete step.

Anti-patterns (don't do these):
- "Should I proceed?" / "Let me know if you'd like me to…" on a reversible local edit
- stopping after step 1 of an N-step task to confirm
- listing options you could just try, instead of trying the best one
- ending a turn with a question when the answer is derivable from the request, the code, or a sensible default
