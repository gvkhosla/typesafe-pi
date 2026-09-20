import {
  APIConnectionError,
  APIError,
  APITimeoutError,
  APIUserAbortError,
  TypeSafeClient,
  TypeSafeError,
  type Fetch,
  type Questions,
  type SystemOneRequest,
  type SystemOneResult,
} from "@typesafe-ai/sdk";

export const DEFAULT_MAX_BYTES = 65_536;
export const DEFAULT_MAX_QUESTIONS = 32;
export const DEFAULT_MAX_REQUESTS = 20;

export type JudgeRequest = SystemOneRequest<Questions>;
export type Judgment = SystemOneResult<Questions> & { elapsedMs: number };

export type JudgeErrorCode =
  | "aborted"
  | "authentication"
  | "budget"
  | "configuration"
  | "network"
  | "rate_limit"
  | "service"
  | "timeout"
  | "validation";

export class JudgeError extends Error {
  constructor(
    readonly code: JudgeErrorCode,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "JudgeError";
  }
}

export interface JudgeOptions {
  apiKey?: string;
  fetch?: Fetch;
  maxBytes?: number;
  maxQuestions?: number;
  maxRequests?: number;
  timeoutMs?: number;
}

export interface JudgeStatus {
  attempts: number;
  maxRequests: number;
  remaining: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function assertJson(value: unknown, path: string, ancestors: Set<object>, depth = 0): void {
  if (depth > 64) throw new JudgeError("validation", `${path} exceeds the maximum nesting depth.`);
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object") {
    throw new JudgeError("validation", `${path} must contain JSON-compatible values.`);
  }
  if (ancestors.has(value)) throw new JudgeError("validation", `${path} must not contain cycles.`);
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new JudgeError("validation", `${path} must contain plain JSON objects.`);
  }

  ancestors.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (Array.isArray(value) && key === "length") continue;
    if (!descriptor.enumerable || descriptor.get || descriptor.set) {
      throw new JudgeError("validation", `${path} must contain plain JSON values.`);
    }
    assertJson(descriptor.value, path, ancestors, depth + 1);
  }
  ancestors.delete(value);
}

function assertEntry(value: unknown, path: string, allowNull: boolean): void {
  if (value === null) {
    if (allowNull) return;
    throw new JudgeError("validation", `${path} is required.`);
  }
  if (typeof value !== "string" && !Array.isArray(value) && !isRecord(value)) {
    throw new JudgeError("validation", `${path} must be a string, object, or array.`);
  }
  assertJson(value, path, new Set());
}

function assertInstructions(question: Record<string, unknown>, path: string): void {
  if (!("instructions" in question)) throw new JudgeError("validation", `${path}.instructions is required.`);
  assertEntry(question.instructions, `${path}.instructions`, false);
}

/** Validate the public interface without echoing submitted state or question text in errors. */
export function validateRequest(
  input: unknown,
  options: Pick<JudgeOptions, "maxBytes" | "maxQuestions"> = {},
): JudgeRequest {
  if (!isRecord(input)) throw new JudgeError("validation", "The request must be a JSON object.");
  assertEntry(input.state, "state", false);
  if (!isRecord(input.questions)) throw new JudgeError("validation", "questions must be an object.");

  const entries = Object.entries(input.questions);
  const maxQuestions = options.maxQuestions ?? DEFAULT_MAX_QUESTIONS;
  if (entries.length < 1 || entries.length > maxQuestions) {
    throw new JudgeError("validation", `questions must contain 1–${maxQuestions} entries.`);
  }

  entries.forEach(([id, raw], index) => {
    const path = `questions[${index}]`;
    if (id.length < 1 || id.length > 100) {
      throw new JudgeError("validation", `${path} must have an id between 1 and 100 characters.`);
    }
    if (!isRecord(raw)) throw new JudgeError("validation", `${path} must be an object.`);
    assertInstructions(raw, path);

    if (raw.type === "noul") {
      if (raw.criteria !== undefined && raw.criteria !== null) {
        if (!isRecord(raw.criteria)) throw new JudgeError("validation", `${path}.criteria must describe true and false.`);
        const keys = Object.keys(raw.criteria);
        if (keys.some((key) => key !== "true" && key !== "false")) {
          throw new JudgeError("validation", `${path}.criteria accepts only true and false.`);
        }
        for (const value of Object.values(raw.criteria)) {
          if (value !== undefined) assertEntry(value, `${path}.criteria`, true);
        }
      }
      return;
    }

    if (raw.type === "choice") {
      if (!isRecord(raw.criteria)) throw new JudgeError("validation", `${path}.criteria must be an option map.`);
      const criteria = Object.entries(raw.criteria);
      if (criteria.length < 2 || criteria.length > 255) {
        throw new JudgeError("validation", `${path}.criteria must contain 2–255 options.`);
      }
      for (const [label, value] of criteria) {
        if (label.length < 1 || label.length > 200) {
          throw new JudgeError("validation", `${path}.criteria labels must be 1–200 characters.`);
        }
        assertEntry(value, `${path}.criteria`, true);
      }
      return;
    }

    if (raw.type === "score") {
      if (!Array.isArray(raw.criteria) || raw.criteria.length < 2 || raw.criteria.length > 10) {
        throw new JudgeError("validation", `${path}.criteria must contain 2–10 ordered levels.`);
      }
      raw.criteria.forEach((value) => assertEntry(value, `${path}.criteria`, true));
      return;
    }

    throw new JudgeError("validation", `${path}.type must be choice, score, or noul.`);
  });

  if (input.model !== undefined && (typeof input.model !== "string" || input.model.length < 1 || input.model.length > 100)) {
    throw new JudgeError("validation", "model must be a non-empty string of at most 100 characters.");
  }

  assertJson(input, "request", new Set());
  const bytes = Buffer.byteLength(JSON.stringify(input), "utf8");
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  if (bytes > maxBytes) throw new JudgeError("validation", `The serialized request exceeds ${maxBytes} bytes.`);
  return input as unknown as JudgeRequest;
}

function safeError(error: unknown): JudgeError {
  if (error instanceof JudgeError) return error;
  if (error instanceof APIUserAbortError) return new JudgeError("aborted", "The TypeSafe request was cancelled.");
  if (error instanceof APITimeoutError) return new JudgeError("timeout", "The TypeSafe request timed out.");
  if (error instanceof APIConnectionError) return new JudgeError("network", "TypeSafe could not be reached.");
  if (error instanceof APIError) {
    if (error.status === 401 || error.status === 403) return new JudgeError("authentication", "TypeSafe rejected the API key.", error.status);
    if (error.status === 429) return new JudgeError("rate_limit", "TypeSafe rate-limited the request.", error.status);
    return new JudgeError("service", `TypeSafe returned HTTP ${error.status}.`, error.status);
  }
  if (error instanceof TypeSafeError) return new JudgeError("configuration", "The TypeSafe client could not run with the current configuration.");
  return new JudgeError("service", "The TypeSafe request failed.");
}

/** Deep module for bounded, validated TypeSafe judgments. */
export class TypeSafeJudge {
  readonly #options: Required<Pick<JudgeOptions, "maxBytes" | "maxQuestions" | "maxRequests" | "timeoutMs">> & JudgeOptions;
  #attempts = 0;
  #client: TypeSafeClient | undefined;

  constructor(options: JudgeOptions = {}) {
    this.#options = {
      ...options,
      maxBytes: options.maxBytes ?? DEFAULT_MAX_BYTES,
      maxQuestions: options.maxQuestions ?? DEFAULT_MAX_QUESTIONS,
      maxRequests: options.maxRequests ?? DEFAULT_MAX_REQUESTS,
      timeoutMs: options.timeoutMs ?? 10_000,
    };
  }

  status(): JudgeStatus {
    return {
      attempts: this.#attempts,
      maxRequests: this.#options.maxRequests,
      remaining: Math.max(0, this.#options.maxRequests - this.#attempts),
    };
  }

  async judge(input: unknown, signal?: AbortSignal): Promise<Judgment> {
    const request = validateRequest(input, this.#options);
    if (this.#attempts >= this.#options.maxRequests) {
      throw new JudgeError("budget", `The session limit of ${this.#options.maxRequests} TypeSafe requests has been reached.`);
    }

    const apiKey = this.#options.apiKey ?? process.env.TYPESAFE_API_KEY?.trim();
    if (!apiKey) throw new JudgeError("configuration", "TYPESAFE_API_KEY is not configured.");
    this.#attempts += 1;

    this.#client ??= new TypeSafeClient({
      apiKey,
      fetch: this.#options.fetch,
      timeout: this.#options.timeoutMs,
      logLevel: "off",
    });

    const started = Date.now();
    try {
      const result = await this.#client.systemOne(request, { signal });
      return { ...result, elapsedMs: Date.now() - started };
    } catch (error) {
      throw safeError(error);
    }
  }
}
