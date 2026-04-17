import { CircuitBreaker } from "@/lib/circuit-breaker";
import { withRetry } from "@/lib/retry";

const REQUEST_TIMEOUT_MS = 60_000;

function baseUrl(): string {
  return process.env.MARITACA_BASE_URL ?? "https://chat.maritaca.ai/api";
}

function apiKey(): string {
  const key = process.env.MARITACA_API_KEY;
  if (!key) {
    throw new MaritacaError(
      0,
      "MARITACA_API_KEY não configurada. Defina no .env."
    );
  }
  return key;
}

export function modelDefault(): string {
  return process.env.MARITACA_MODEL ?? "sabia-3.1";
}

export function modelFilter(): string {
  return process.env.MARITACA_MODEL_FILTER ?? modelDefault();
}

export function modelWriter(): string {
  return process.env.MARITACA_MODEL_WRITER ?? modelDefault();
}

export class MaritacaError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "MaritacaError";
  }
}

const breaker = new CircuitBreaker({
  threshold: 3,
  windowMs: 60_000,
  openMs: 120_000,
});

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatResult {
  text: string;
  model: string;
  usage: ChatUsage;
  raw: unknown;
}

export interface CallMaritacaOptions {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json_object";
}

interface OpenAiCompatibleResponse {
  model?: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export async function callMaritaca(
  opts: CallMaritacaOptions
): Promise<ChatResult> {
  breaker.assertClosed();

  const body: Record<string, unknown> = {
    model: opts.model ?? modelDefault(),
    messages: opts.messages,
  };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.maxTokens !== undefined) body.max_tokens = opts.maxTokens;
  if (opts.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }

  return withRetry<ChatResult>(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS
      );
      try {
        const response = await fetch(`${baseUrl()}/chat/completions`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${apiKey()}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => "");
          const err = new MaritacaError(
            response.status,
            `Maritaca API retornou ${response.status}: ${errBody.slice(0, 200)}`
          );
          if (response.status >= 500) breaker.recordFailure();
          throw err;
        }

        const json = (await response.json()) as OpenAiCompatibleResponse;
        breaker.recordSuccess();
        const text = json.choices?.[0]?.message?.content ?? "";
        return {
          text,
          model: json.model ?? (opts.model ?? modelDefault()),
          usage: {
            inputTokens: json.usage?.prompt_tokens ?? 0,
            outputTokens: json.usage?.completion_tokens ?? 0,
          },
          raw: json,
        };
      } catch (error) {
        if (!(error instanceof MaritacaError)) {
          breaker.recordFailure();
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
    { maxAttempts: 3, baseDelayMs: 800, maxDelayMs: 6000 }
  );
}

export const _internal = { breaker };
