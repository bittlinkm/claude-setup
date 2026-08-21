---
name: dor-dod-check
description: Use whenever the user asks whether a User Story, ticket, PR, sprint, or release meets this org's Definition of Ready (DoR) or Definition of Done (DoD) — e.g. "ist die Story ready?", "kann ich das Ticket starten?", "ist der PR fertig für den Merge?", "erfüllt das die DoD?", "check das mal gegen unsere Definition of Done", "kann ich die Story schließen?", or any mention of "DoR"/"DoD"/"Definition of Ready"/"Definition of Done"/"Akzeptanzkriterien vollständig" in the context of a story, ticket, or PR. Also use it proactively whenever the user pastes a User Story description and it's ambiguous whether they want a DoR or DoD check — ask which, don't skip the check. Produces a point-by-point ✅/❌/❓ checklist against this org's standard DoR/DoD criteria (User Story, Sprint, and Release level), explicitly flagging items that can't be verified from the given text alone rather than guessing.
---

# DoR/DoD Check

This skill checks a User Story, PR, sprint, or release against this organization's Definition of Ready (before work starts) and Definition of Done (before something counts as finished). The full criteria lists live in `references/` — read the one you need before checking anything, don't rely on memory of the list.

## Why this matters

DoR and DoD exist to catch two different failure modes: starting work on something too vague to build correctly (DoR), and calling something "done" when it's actually still risky to ship (DoD). A checklist that rubber-stamps everything ✅ defeats the purpose — the value is in catching the two or three items that are actually missing, and being honest about what you can't verify from a text description alone. Treat this as a real review, not a formality to get through.

## Step 1: Figure out which check applies

- **DoR** — "is this ready to start?" Use `references/definition-of-ready.md`. Applies to a User Story that hasn't been worked on yet.
- **DoD (User Story)** — "is this ready to be called done / mergeable / closeable?" Use the "DoD — User Story" section of `references/definition-of-done.md`. Applies to a story with actual work behind it (code, PR, tests).
- **DoD (Sprint)** or **DoD (Release)** — only when the user is explicitly asking about closing out a whole sprint or shipping a release, not a single story. Use the matching section of `references/definition-of-done.md`.

If it's not clear which one from context (e.g. the user just pastes a story with no question), ask — checking the wrong list against the wrong lifecycle stage is worse than asking a quick clarifying question.

## Step 2: Gather what you're checking against

Read whatever the user gave you — pasted story text, a file, a PR description/diff. If they reference a ticket by ID/link and you have a tool that can fetch it (e.g. an Azure DevOps or Jira MCP), use it; otherwise ask them to paste the content. For a DoD check, also look at the actual code changes if they're available (a diff, a PR, files in the repo) rather than only the ticket text — code-quality and test criteria can't be judged from a description alone.

## Step 3: Go through the checklist item by item

For every item in the relevant section:

- **✅** — clearly satisfied, based on what you can see. Say briefly why.
- **❌** — clearly missing or unsatisfied. Say specifically what's missing, not just "not done" — e.g. "no acceptance criteria are written" beats "criterion 3 failed."
- **❓ nicht prüfbar** — the item describes something you have no way to verify from the given input (e.g. whether CI is green, whether a review actually happened, whether the branch is merged). Say what would need to be checked and by whom, rather than guessing ✅ or ❌. See the "What Claude can and can't verify" note in `definition-of-done.md` — this distinction matters, don't skip it.
- **N/A** — the item genuinely doesn't apply (e.g. DoR section 4's UX criteria for a pure backend story, DoD's compliance section for something with no security/compliance surface). Say why it doesn't apply rather than silently omitting it — an N/A that isn't explained looks like an oversight.

Group the output by the same numbered sections as the reference file, so it's easy to compare against the source list.

## Step 4: Summarize

End with:
- A one-line verdict: ready to start / not yet ready (DoR), or done / not yet done (DoD).
- The list of ❌ items — these are the actual blockers, call them out clearly since they're what the user needs to act on.
- The list of ❓ items — these need a human (or another tool) to confirm; don't let them get lost among the ✅s.

Keep the tone direct and useful — the point is to save the user from starting work on something half-specified, or closing something that isn't actually shippable, not to produce a wall of green checkmarks that feels good but doesn't tell them anything.
