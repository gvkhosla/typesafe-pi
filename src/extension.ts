import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import type { Questions } from "@typesafe-ai/sdk";
import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_QUESTIONS,
  DEFAULT_MAX_REQUESTS,
  JudgeError,
  TypeSafeJudge,
  type Judgment,
} from "./judge.js";

const disclosure =
  "The supplied state and questions will be sent to api.typesafe.ai and may incur charges. Send only relevant data that is permitted to leave this machine. Results are model judgments, not proof or authorization.";

const entry = Type.Union([
  Type.String(),
  Type.Array(Type.Unknown()),
  Type.Record(Type.String(), Type.Unknown()),
]);
const nullableEntry = Type.Union([entry, Type.Null()]);
const instructions = entry;
const question = Type.Union([
  Type.Object(
    {
      type: Type.Literal("noul"),
      instructions,
      criteria: Type.Optional(
        Type.Object(
          {
            true: Type.Optional(nullableEntry),
            false: Type.Optional(nullableEntry),
          },
          { additionalProperties: false },
        ),
      ),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      type: Type.Literal("choice"),
      instructions,
      criteria: Type.Record(Type.String({ minLength: 1, maxLength: 200 }), nullableEntry, {
        minProperties: 2,
        maxProperties: 255,
      }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      type: Type.Literal("score"),
      instructions,
      criteria: Type.Array(nullableEntry, { minItems: 2, maxItems: 10 }),
    },
    { additionalProperties: false },
  ),
]);

const requestSchema = Type.Object(
  {
    state: entry,
    questions: Type.Record(Type.String({ minLength: 1, maxLength: 100 }), question, {
      minProperties: 1,
      maxProperties: DEFAULT_MAX_QUESTIONS,
    }),
    model: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  },
  { additionalProperties: false },
);

function topProbabilities(probabilities: Record<string, number>, limit = 8): string {
  const sorted = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
  const shown = sorted.slice(0, limit).map(([key, value]) => `${JSON.stringify(key)}:${value.toFixed(3)}`);
  if (sorted.length > limit) shown.push(`…${sorted.length - limit} more`);
  return `{${shown.join(", ")}}`;
}

export function formatJudgment(result: Judgment, expanded = false): string {
  const lines = [`TypeSafe · ${result.model} · ${result.elapsedMs} ms`];
  for (const [id, answer] of Object.entries(result.answers)) {
    const name = JSON.stringify(id);
    if (answer.type === "noul") {
      lines.push(`${name}: P(yes) ${answer.noul.toFixed(3)}`);
      continue;
    }
    if (answer.type === "choice") {
      lines.push(`${name}: ${JSON.stringify(answer.choice)} · confidence ${answer.confidence.toFixed(3)}`);
    } else {
      lines.push(`${name}: score ${answer.score.toFixed(3)} · confidence ${answer.confidence.toFixed(3)}`);
    }
    lines.push(`  probabilities ${expanded ? JSON.stringify(answer.probabilities) : topProbabilities(answer.probabilities)}`);
  }
  lines.push(`${result.usage.input_tokens} input / ${result.usage.output_tokens} output tokens`);
  return lines.join("\n");
}

const sample = {
  state: { message: "I was charged twice. Please help today." },
  questions: {
    department: {
      type: "choice",
      instructions: "Which team should handle `message`?",
      criteria: {
        billing: "Charges, invoices, and refunds",
        technical: "Software failures and integrations",
        other: "Neither category fits",
      },
    },
    urgent: {
      type: "noul",
      instructions: "Does `message` explicitly request time-sensitive help?",
    },
  },
} as const;

export default function typesafeExtension(pi: ExtensionAPI): void {
  let enabled = process.env.PI_TYPESAFE_ENABLED === "1";
  let judge = new TypeSafeJudge();

  pi.on("session_start", () => {
    enabled = process.env.PI_TYPESAFE_ENABLED === "1";
    judge = new TypeSafeJudge();
  });

  pi.registerEntryRenderer<Judgment>("typesafe-result", (entry, { expanded }) =>
    new Text(entry.data ? formatJudgment(entry.data, expanded) : "TypeSafe · no result", 0, 0),
  );

  pi.registerTool(
    defineTool({
      name: "typesafe_judge",
      label: "TypeSafe",
      description: `Ask 1–${DEFAULT_MAX_QUESTIONS} independent Choice, Score, or Noul questions about supplied JSON state in one TypeSafe System One request. Batch questions sharing the same state. The compact result includes every answer and up to eight highest probabilities per distribution. Requires /typesafe enable or PI_TYPESAFE_ENABLED=1. Limit ${DEFAULT_MAX_BYTES / 1024} KiB and ${DEFAULT_MAX_REQUESTS} attempts per session. ${disclosure}`,
      promptSnippet: "Run batched structured semantic judgments with TypeSafe (external, consent-gated)",
      promptGuidelines: [
        "Use typesafe_judge for narrow semantic judgments, not calculations, exact lookups, multi-step reasoning, or actions.",
        "Batch independent typesafe_judge questions that share state; ask one coherent judgment per question and name relevant state fields in instructions.",
        "Treat typesafe_judge probabilities as uncertainty signals, never as permission to perform an action.",
      ],
      parameters: requestSchema,
      async execute(_toolCallId, params, signal) {
        if (!enabled) {
          throw new JudgeError(
            "configuration",
            "TypeSafe is disabled. Ask the user to run /typesafe enable; do not change configuration files on their behalf.",
          );
        }
        const result = await judge.judge(params, signal);
        return {
          content: [{ type: "text", text: formatJudgment(result) }],
          details: result,
        };
      },
      renderCall(args) {
        return new Text(`TypeSafe · ${Object.keys(args.questions ?? {}).length} questions · external request`, 0, 0);
      },
      renderResult(result, { expanded, isPartial }) {
        if (isPartial) return new Text("TypeSafe · waiting", 0, 0);
        const details = result.details as Judgment | undefined;
        if (details?.answers) return new Text(formatJudgment(details, expanded), 0, 0);
        const fallback = result.content
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n");
        return new Text(fallback, 0, 0);
      },
    }),
  );

  const actions = ["status", "enable", "disable", "test"];
  pi.registerCommand("typesafe", {
    description: "TypeSafe consent, status, and smoke test",
    getArgumentCompletions(prefix) {
      const matches = actions
        .filter((action) => action.startsWith(prefix))
        .map((action) => ({ value: action, label: action }));
      return matches.length ? matches : null;
    },
    async handler(rawArgs, ctx) {
      const action = rawArgs.trim() || "status";
      const report = (message: string, level: "info" | "warning" | "error" = "info") => {
        if (ctx.hasUI) ctx.ui.notify(message, level);
        else pi.sendMessage({ customType: "typesafe-status", content: message, display: true });
      };

      if (action === "status") {
        const status = judge.status();
        const key = process.env.TYPESAFE_API_KEY?.trim() ? "configured" : "missing";
        report(
          `TypeSafe is ${enabled ? "enabled" : "disabled"}; key ${key}; ${status.attempts}/${status.maxRequests} session attempts used. ${disclosure}`,
          enabled && key === "missing" ? "warning" : "info",
        );
        return;
      }
      if (action === "disable") {
        enabled = false;
        report("TypeSafe disabled for future agent calls in this session.");
        return;
      }
      if (!actions.includes(action)) {
        report(`Usage: /typesafe ${actions.join(" | ")}`, "warning");
        return;
      }
      if (!process.env.TYPESAFE_API_KEY?.trim()) {
        report("Set TYPESAFE_API_KEY before launching Pi, then try again.", "warning");
        return;
      }
      if (!ctx.hasUI) {
        report("Interactive confirmation is unavailable. For headless use, start Pi with PI_TYPESAFE_ENABLED=1.", "warning");
        return;
      }
      if (action === "enable") {
        if (await ctx.ui.confirm("Enable TypeSafe for this session?", disclosure)) {
          enabled = true;
          report(`TypeSafe enabled with a ${DEFAULT_MAX_REQUESTS}-attempt session limit.`);
        }
        return;
      }
      if (!await ctx.ui.confirm("Send a TypeSafe smoke-test request?", disclosure)) return;
      try {
        const result = await judge.judge(sample);
        pi.appendEntry("typesafe-result", result);
      } catch (error) {
        report(error instanceof JudgeError ? error.message : "The TypeSafe smoke test failed.", "error");
      }
    },
  });
}
