import assert from "node:assert/strict";
import test from "node:test";
import typesafeExtension, { formatJudgment } from "../src/extension.js";

test("extension registers a schema that preserves structured instruction types", () => {
  const tools: Array<{ name: string; parameters: unknown }> = [];
  typesafeExtension({
    on() {},
    registerEntryRenderer() {},
    registerTool(tool: { name: string; parameters: unknown }) {
      tools.push(tool);
    },
    registerCommand() {},
  } as never);

  assert.equal(tools[0]?.name, "typesafe_judge");
  const schema = JSON.stringify(tools[0]?.parameters);
  assert.match(schema, /"instructions":\{"anyOf":\[\{"type":"string"/);
  assert.doesNotMatch(schema, /"instructions":\{"anyOf":\[\{"type":"object","properties":\{\}\}/);
});

test("formatJudgment keeps the default result compact", () => {
  const probabilities = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`option-${index}`, index / 100]));
  const text = formatJudgment({
    model: "jev-test",
    elapsedMs: 123,
    answers: {
      category: {
        type: "choice",
        choice: "option-11",
        confidence: 0.7,
        probabilities,
      },
    },
    usage: { input_tokens: 10, output_tokens: 2 },
  });

  assert.match(text, /option-11/);
  assert.match(text, /…4 more/);
  assert.doesNotMatch(text, /option-0/);
});

test("formatJudgment exposes complete distributions when expanded", () => {
  const text = formatJudgment(
    {
      model: "jev-test",
      elapsedMs: 10,
      answers: {
        relevant: { type: "noul", noul: 0.75 },
        quality: {
          type: "score",
          score: 1.2,
          confidence: 0.8,
          probabilities: { "0": 0.1, "1": 0.6, "2": 0.3 },
          legend: { "0": "low", "1": "medium", "2": "high" },
        },
      },
      usage: { input_tokens: 20, output_tokens: 4 },
    },
    true,
  );

  assert.match(text, /P\(yes\) 0.750/);
  assert.match(text, /"0":0.1/);
});
