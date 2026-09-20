---
name: typesafe
description: Design, implement, debug, or migrate TypeSafe System One integrations, and run narrow structured judgments with Jev from Pi. Use when a feature needs typed semantic decisions, probabilities, routing, ranking, extraction, verification, uncertainty handling, or when prompt-and-parse logic should become Choice, Score, or Noul questions.
license: MIT
compatibility: Pi package typesafe-pi; direct judgments require TYPESAFE_API_KEY and operator consent.
---

# TypeSafe

TypeSafe supplies fast semantic judgments as typed answers and probabilities. Code owns workflow, policy, exact calculations, and actions.

## Choose the path

- **Judge existing state now:** use `typesafe_judge` when available. Send only relevant permitted data. Batch every independent question that shares the state. If the tool is disabled, ask the user to run `/typesafe enable`; treat declining as completion, not a reason to find a bypass.
- **Build or change software:** follow the workflow below. Do not call `typesafe_judge` merely to simulate the integration being built.

## Build workflow

1. **Read current docs.** Fetch `https://docs.typesafe.ai/llms.txt`, then only the relevant current concept, primitive, SDK/API, migration, and cookbook pages. Markdown is available by adding `.md` to documentation paths. The live docs and installed SDK types decide version-dependent details.
2. **Find the judgments.** Start from what the application must show, select, change, or escalate. Keep deterministic rules and execution in code. A complete decomposition accounts for every semantic decision the behavior needs.
3. **Shape each question.** Choose Choice, Score, or Noul by the meaning consumed in code. Ask one narrow judgment per question, include the necessary state, define concrete criteria, and batch independent questions over shared state. Read [question design](references/question-design.md) when shaping or reviewing questions.
4. **Compose uncertainty.** Put thresholds, weights, escalation, and permissions in explicit code. Calibrate thresholds against representative labeled cases and consequences; cookbook numbers are examples.
5. **Implement in the existing stack.** Read the current SDK page and installed types before editing. Preserve project conventions and keep credentials server-side. Read [integration checks](references/integration-checks.md) while coding or debugging.
6. **Verify end to end.** Test representative, edge, uncertain, no-match, and service-failure cases. Inspect state, questions, answers, and composition separately. Completion means the typed interface, application behavior, uncertainty path, and failure path are all exercised.

For open-ended ideation, present the few TypeSafe patterns that best fit the user's product behavior and recommend one starting point. For a concrete task, build directly.
