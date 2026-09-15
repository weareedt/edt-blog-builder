import type Anthropic from '@anthropic-ai/sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { z } from 'zod';
import { ANTHROPIC_MODEL, getAnthropicClient } from './client';

export class SchemaValidationError extends Error {
  constructor(
    public readonly issues: unknown,
    public readonly stopReason: string | null,
    public readonly outputTokens: number
  ) {
    super('Model output failed schema validation after one retry.');
  }
}

export class ModelRefusalError extends Error {}

// zod-to-json-schema's own type definitions are heavy enough that TS hits
// "Type instantiation is excessively deep and possibly infinite" resolving
// its overloads against a schema with nested discriminated unions (like
// template03Content) — even behind an explicitly-typed wrapper. Cast the
// function itself to a plain signature so TS never attempts to resolve the
// real one; the actual runtime behavior is unaffected.
const zodToJsonSchemaUntyped = zodToJsonSchema as (schema: unknown, opts: unknown) => unknown;

function toJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  // Deliberately NOT { target: 'openApi3' }: that mode represents a
  // nullable field as an OpenAPI-only `nullable: true` sibling flag on the
  // object schema (e.g. featureImage), which isn't real JSON Schema and
  // Claude's tool-use doesn't reliably treat as "or null" — it was observed
  // returning a placeholder string for a nullable object field instead of
  // the literal null. The default target instead emits a standard
  // `anyOf: [{...}, {type: 'null'}]`, which is unambiguous.
  return zodToJsonSchemaUntyped(schema, {}) as Record<string, unknown>;
}

export interface GenerateStructuredContentInput<TSchema extends z.ZodTypeAny> {
  system: string;
  userContent: Anthropic.ContentBlockParam[];
  schema: TSchema;
  toolName: string;
  maxTokens?: number;
  /**
   * Editorial checks on content that already passed the schema (see
   * prompt/editorialReview.ts). Issues get the same single corrective retry
   * a schema failure would — never a second one. Issues that survive it are
   * returned in `reviewIssues`, not thrown: they're quality problems, and a
   * readable article with one stock phrase beats a failed generation.
   */
  review?: (content: z.infer<TSchema>) => string[];
}

export interface GenerateStructuredContentResult<T> {
  content: T;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
  };
  /** Editorial issues still present in the returned content. */
  reviewIssues: string[];
}

/**
 * Gets Claude to return content matching `schema`, via forced tool-use
 * (the schema becomes the tool's input_schema and tool_choice pins the
 * model to it) rather than asking it to emit raw JSON in prose — this is
 * the well-supported, reliable mechanism for structured output on the
 * Messages API. One corrective retry, fed back as a tool_result turn: for
 * a schema failure (a second one throws SchemaValidationError), or for
 * editorial review issues (a retry that comes back worse — invalid, or no
 * tool call — falls back to the valid first attempt).
 */
export async function generateStructuredContent<TSchema extends z.ZodTypeAny>(
  input: GenerateStructuredContentInput<TSchema>
): Promise<GenerateStructuredContentResult<z.infer<TSchema>>> {
  const { system, userContent, schema, toolName, maxTokens = 8000, review } = input;
  const client = getAnthropicClient();

  // zodToJsonSchema wraps top-level objects directly in openApi3 mode —
  // strip $schema/definitions keys Claude's tool input_schema doesn't need.
  const inputSchema = toJsonSchema(schema);
  delete inputSchema.$schema;

  const tools: Anthropic.Tool[] = [
    {
      name: toolName,
      description: `Submit the article content. Must match the required structure exactly.`,
      input_schema: inputSchema as Anthropic.Tool.InputSchema,
    },
  ];

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userContent }];

  const usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

  function accumulateUsage(u: Anthropic.Usage) {
    usage.inputTokens += u.input_tokens ?? 0;
    usage.outputTokens += u.output_tokens ?? 0;
    usage.cacheReadTokens += u.cache_read_input_tokens ?? 0;
    usage.cacheWriteTokens += u.cache_creation_input_tokens ?? 0;
  }

  async function callOnce(): Promise<Anthropic.Message> {
    return client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages,
      tools,
      tool_choice: { type: 'tool', name: toolName },
    });
  }

  function extractToolUse(message: Anthropic.Message): Anthropic.ToolUseBlock | null {
    return (message.content.find((b) => b.type === 'tool_use') as Anthropic.ToolUseBlock) ?? null;
  }

  let message = await callOnce();
  accumulateUsage(message.usage);

  let toolUse = extractToolUse(message);
  if (!toolUse) {
    throw new ModelRefusalError(
      `Claude did not return a tool_use block (stop_reason: ${message.stop_reason}).`
    );
  }

  let parsed = schema.safeParse(toolUse.input);
  let firstValid: z.infer<TSchema> | null = null;
  let firstIssues: string[] = [];
  let correction: string;

  if (parsed.success) {
    firstIssues = review?.(parsed.data) ?? [];
    if (firstIssues.length === 0) return { content: parsed.data, usage, reviewIssues: [] };
    firstValid = parsed.data;
    correction = [
      'The content matches the schema, but an editorial review found these problems. Resubmit the complete content with them fixed, keeping everything else as it was unless a fix requires changing it:',
      ...firstIssues.map((issue) => `- ${issue}`),
    ].join('\n');
  } else {
    correction = JSON.stringify(parsed.error.issues, null, 2);
  }

  // One corrective retry: show the model exactly what was wrong.
  messages.push({ role: 'assistant', content: message.content });
  messages.push({
    role: 'user',
    content: [{ type: 'tool_result', tool_use_id: toolUse.id, is_error: true, content: correction }],
  });

  message = await callOnce();
  accumulateUsage(message.usage);

  toolUse = extractToolUse(message);
  if (!toolUse) {
    if (firstValid) return { content: firstValid, usage, reviewIssues: firstIssues };
    throw new ModelRefusalError(
      `Claude did not return a tool_use block on retry (stop_reason: ${message.stop_reason}).`
    );
  }

  parsed = schema.safeParse(toolUse.input);
  if (!parsed.success) {
    if (firstValid) return { content: firstValid, usage, reviewIssues: firstIssues };
    throw new SchemaValidationError(parsed.error.issues, message.stop_reason, usage.outputTokens);
  }

  return { content: parsed.data, usage, reviewIssues: review?.(parsed.data) ?? [] };
}
