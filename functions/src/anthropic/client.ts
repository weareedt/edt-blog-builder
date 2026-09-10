import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

/**
 * Lazily constructed so a missing API key only errors when generation is
 * actually attempted, not at module load / emulator boot.
 */
export function getAnthropicClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Copy functions/.env.local.example to functions/.env.local and fill it in.'
    );
  }
  client = new Anthropic({ apiKey });
  return client;
}

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';
