# Question design

Use this reference while drafting or reviewing TypeSafe questions.

## Pick by answer meaning

| Code needs | Primitive | Read the answer as |
| --- | --- | --- |
| One member of a defined set | Choice | selected option, distribution, confidence |
| Probability that a condition holds | Noul | probability of yes; there is no separate confidence |
| Position on an ordered rubric | Score | probability-weighted level, distribution, confidence |

Use Choice only when the options compete. Use separate Noul questions when several labels may all apply. Use Score for intensity or degree; a Noul value near 0.5 means yes/no uncertainty, not medium intensity.

## Atomic judgments

A question is atomic when its answer has one stable meaning in code. Split independently useful factors, then compose them in code. Keep a relationship together when splitting would remove the context being judged.

Good: “Does `ticket.message` explicitly request a refund?”

Too broad: “Analyze the ticket and decide what we should do.”

Question IDs are not inference context. Put the complete meaning in `instructions` and point to structured state with backticked paths such as `ticket.messages[0].text`.

## Criteria

- Choice criteria define every candidate and the distinctions between close candidates. Add `other`, `none`, or `unclear` when coverage is not guaranteed.
- Score levels describe concrete situations that stand alone. Avoid bare labels such as low, medium, and high.
- Noul criteria clarify what counts as true and false when the condition could be interpreted more than one way.
- Structured instructions or criteria are useful for definitions, exclusions, contrasts, and examples; simple questions should stay strings.

The model cannot select an omitted source value. Generate or retrieve candidates in code, check coverage, then ask it to select.

## Batching and dependencies

Questions in one request share state, run independently, and cannot see one another's answers. Batch speculative questions when code can ignore unused branches. Make a second request only when an earlier answer is required to fetch evidence, construct new state, or determine later options.

When judging several items, give each item a named state field and ask one question per item per dimension. One question over many items produces a blended answer.

## Uncertainty

Choice and Score confidence summarizes distribution concentration; it does not establish correctness or authority. Several harmless alternatives can lower confidence. Noul uses distance from 0.5 as uncertainty, but action thresholds still depend on consequences.

Keep raw judgments reusable. Put permissions and non-compensating rules in code. Validate thresholds on target-domain examples before automating consequential behavior.
