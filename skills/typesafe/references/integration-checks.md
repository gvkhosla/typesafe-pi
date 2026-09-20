# Integration checks

Use this reference while implementing, debugging, or migrating a TypeSafe integration.

## Before editing

- Read the current page for the chosen SDK or HTTP endpoint.
- Inspect the installed SDK version and types; do not infer method names from examples for another version.
- Check the migration guide for older TypeSafe code.
- Find the nearest current cookbook when the workflow resembles routing, fan-out, extraction, reranking, verification, hierarchical classification, or composite scoring.

## Keep the seam typed

Construct named questions, call System One once for shared state, and consume each typed answer explicitly. Keep answer-to-action policy in ordinary code. Preserve distributions when later tuning, review, or observability may need them.

Make the human review surface obvious: co-locate question definitions, thresholds, weights, and escalation constants in one focused module when the existing architecture permits it. Name constants by consequence rather than generic confidence. Keep execution elsewhere so reviewing policy does not require spelunking through side effects.

Credentials belong in server-side environment or secret storage. Never embed a key in browser code, a repository, fixtures, logs, or error text.

## Test matrix

Cover:

- one representative case per intended branch;
- near-boundary and ambiguous cases;
- no-match or missing-evidence cases;
- multiple acceptable Choice options;
- API authentication, validation, rate-limit, overload, timeout, and cancellation behavior;
- stale state if an answer can arrive after application state changes;
- the actual application action or escalation produced from the answer.

For a bad outcome, classify the failure before changing prompts:

1. missing or malformed state;
2. ambiguous instructions or incomplete criteria;
3. candidate coverage failure;
4. model judgment error;
5. composition or threshold error;
6. application action error;
7. service or transport failure.

Change the layer that failed, then replay the same labeled cases. Record the exact questions, model alias or version, raw answers, and resulting application decisions so prompt or threshold changes can be compared rather than guessed. Typed output guarantees shape, not truth.

## Current documentation entry points

- Index: `https://docs.typesafe.ai/llms.txt`
- Building model: `https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md`
- Primitives: `https://docs.typesafe.ai/primitives.md`
- Confidence: `https://docs.typesafe.ai/confidence.md`
- HTTP: `https://docs.typesafe.ai/api.md`
- JavaScript: `https://docs.typesafe.ai/sdk/javascript.md`
- Python: `https://docs.typesafe.ai/sdk/python.md`
