# Workflow patterns

Use this reference when brainstorming TypeSafe opportunities or choosing an architecture. Start from the product behavior, not from a primitive. Recommend the smallest pattern that creates useful behavior; combine patterns only when the workflow requires it.

## Route and fill

Select a known handler and its typed arguments from natural language. Ask branch-specific questions speculatively in one request, then consume only the answers for the selected branch.

Current starting points: [intent routing](https://docs.typesafe.ai/patterns/intent-routing.md), [function calling](https://docs.typesafe.ai/cookbooks/function_calling.md), and [speculative fan-out](https://docs.typesafe.ai/patterns/fan-out.md).

## Select instead of generate

Generate or retrieve candidate values and source spans in code. Use TypeSafe to select the intended candidate, then copy, normalize, or format it deterministically. This preserves source fidelity and prevents invented values.

Current starting points: [pre-parsed value extraction](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md), [date extraction](https://docs.typesafe.ai/cookbooks/date_extraction_cookbook.md), and [structure recovery](https://docs.typesafe.ai/cookbooks/autoformat.md).

## Find and judge evidence

Retrieve candidates cheaply, ask focused relevance or support questions, then let code retain, rank, reject, or flag them. A second request is justified when the first result determines which richer evidence to fetch.

Current starting points: [re-ranking](https://docs.typesafe.ai/cookbooks/rerank_typesafe.md), [semantic find](https://docs.typesafe.ai/cookbooks/semantic_find.md), [RAG passage classification](https://docs.typesafe.ai/cookbooks/classifying_rag_passages.md), and [hierarchical classification](https://docs.typesafe.ai/cookbooks/hierarchical_classification.md).

## Build reusable signals

Score stable dimensions once and preserve their raw distributions. Code or user controls can then change weights, thresholds, rankings, and views without rerunning inference when the evidence and question meaning are unchanged.

Current starting points: [composite scoring](https://docs.typesafe.ai/patterns/composite-scoring.md) and [feature discovery](https://docs.typesafe.ai/cookbooks/autoresearch_feature_discovery.md).

## Verify and escalate

Judge a specific claim, field, or generated result against its evidence. Route uncertain or failing cases to a person or a more capable reasoning model. Keep authorization and irreversible actions outside the judgment.

Current starting points: [confidence-gated routing](https://docs.typesafe.ai/patterns/confidence-routing.md), [citation checks](https://docs.typesafe.ai/cookbooks/citation_check.md), [LLM guardrails](https://docs.typesafe.ai/cookbooks/llm_guardrails.md), and [extraction cascades](https://docs.typesafe.ai/cookbooks/sde_cascade.md).

## Respond to changing state

Retain goals and observed facts in code while fresh, bounded judgments guide the next step. Keep inferred state distinct from observations, attach results to the state version they judged, and check freshness before applying them.

## Opportunity scan

When reviewing an existing product or codebase, look for:

- prompt-and-parse code recovering enums, booleans, or scores from prose;
- brittle regexes or heuristics trying to interpret meaning rather than syntax;
- one expensive model handling both simple routing and hard reasoning;
- manual queues where uncertainty could prioritize review;
- generated values that could instead be selected from source-backed candidates;
- fixed rankings that would benefit from reusable semantic dimensions.

Return only the few opportunities with the clearest user value. For each, name the state, typed questions, code-owned policy, uncertainty path, and a cheap experiment that could disprove the idea.