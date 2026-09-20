# AGENTS.md

## Scope

This repository is a Pi package containing one extension and one skill for TypeSafe System One.

## Commands

- `npm install` installs dependencies.
- `npm run typecheck` checks TypeScript.
- `npm test` runs offline tests.
- `npm run check` runs both.

## Architecture

- `src/judge.ts` is the deep module: validation, request limits, API invocation, safe errors, and session budget live behind `judge(request, signal)`.
- `src/extension.ts` is the Pi adapter. Keep consent and rendering here; keep transport logic out.
- `skills/typesafe/SKILL.md` routes TypeSafe design and implementation tasks. Branch-specific detail belongs under `skills/typesafe/references/`.

## Safety

- External calls remain disabled until `/typesafe enable`, unless `PI_TYPESAFE_ENABLED=1` was explicitly set before Pi starts.
- Never include submitted state, questions, credentials, response bodies, or headers in errors.
- Keep tests offline by injecting `fetch`.
