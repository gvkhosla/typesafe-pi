import assert from "node:assert/strict";
import test from "node:test";
import { JudgeError, TypeSafeJudge, validateRequest } from "../src/judge.js";

const validRequest = {
  state: { message: "Please refund the duplicate charge." },
  questions: {
    refund: {
      type: "noul",
      instructions: "Does `message` request a refund?",
    },
    team: {
      type: "choice",
      instructions: "Which team should handle `message`?",
      criteria: { billing: "Payment issues", support: "Everything else" },
    },
    urgency: {
      type: "score",
      instructions: "How urgent is `message`?",
      criteria: ["No time pressure", "Time-sensitive", "Immediate harm"],
    },
  },
};

test("validateRequest accepts all three primitives", () => {
  assert.equal(validateRequest(validRequest), validRequest);
});

test("validation errors identify structure without echoing submitted content", () => {
  const secret = "secret-question-text";
  assert.throws(
    () =>
      validateRequest({
        state: "safe",
        questions: { q: { type: "choice", instructions: secret, criteria: { only: null } } },
      }),
    (error: unknown) => {
      assert(error instanceof JudgeError);
      assert.equal(error.code, "validation");
      assert.doesNotMatch(error.message, new RegExp(secret));
      assert.match(error.message, /2–255/);
      return true;
    },
  );
});

test("instructions are required and Score accepts at most ten levels", () => {
  assert.throws(
    () => validateRequest({ state: "x", questions: { q: { type: "noul" } } }),
    /instructions is required/,
  );
  assert.throws(
    () =>
      validateRequest({
        state: "x",
        questions: {
          q: { type: "score", instructions: "Rate it", criteria: Array.from({ length: 11 }, (_, i) => String(i)) },
        },
      }),
    /2–10/,
  );
});

test("serialized requests are bounded", () => {
  assert.throws(() => validateRequest(validRequest, { maxBytes: 20 }), /exceeds 20 bytes/);
});

test("judge sends a default-model request through the official SDK", async () => {
  let sent: unknown;
  const judge = new TypeSafeJudge({
    apiKey: "test-key",
    fetch: async (_input, init) => {
      sent = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          model: "jev-test",
          answers: {
            refund: { type: "noul", noul: 0.97 },
            team: {
              type: "choice",
              choice: "billing",
              confidence: 0.9,
              probabilities: { billing: 0.95, support: 0.05 },
            },
            urgency: {
              type: "score",
              score: 1.1,
              confidence: 0.8,
              probabilities: { "0": 0.05, "1": 0.8, "2": 0.15 },
              legend: { "0": "No time pressure", "1": "Time-sensitive", "2": "Immediate harm" },
            },
          },
          usage: { input_tokens: 100, output_tokens: 20 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });

  const result = await judge.judge(validRequest);
  assert.equal(result.model, "jev-test");
  assert.equal((sent as { model: string }).model, "jev-latest");
  assert.equal(judge.status().attempts, 1);
  assert.equal(judge.status().remaining, 19);
});

test("judge enforces its session request budget", async () => {
  const judge = new TypeSafeJudge({
    apiKey: "test-key",
    maxRequests: 1,
    fetch: async () =>
      new Response(JSON.stringify({ model: "jev-test", answers: {}, usage: { input_tokens: 1, output_tokens: 1 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });

  await judge.judge({ state: "x", questions: { q: { type: "noul", instructions: "Is this x?" } } });
  await assert.rejects(
    () => judge.judge({ state: "x", questions: { q: { type: "noul", instructions: "Is this x?" } } }),
    (error: unknown) => error instanceof JudgeError && error.code === "budget",
  );
});

test("upstream errors are sanitized", async () => {
  const secret = "private-upstream-detail";
  const judge = new TypeSafeJudge({
    apiKey: "test-key",
    fetch: async () =>
      new Response(JSON.stringify({ detail: secret }), {
        status: 422,
        headers: { "content-type": "application/json" },
      }),
    maxRequests: 1,
  });

  await assert.rejects(
    () => judge.judge({ state: "x", questions: { q: { type: "noul", instructions: "Is this x?" } } }),
    (error: unknown) => {
      assert(error instanceof JudgeError);
      assert.equal(error.code, "service");
      assert.doesNotMatch(error.message, new RegExp(secret));
      assert.equal(error.status, 422);
      return true;
    },
  );
});
