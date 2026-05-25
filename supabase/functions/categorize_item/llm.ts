// Wrapper seam around the LLM provider. Today: Gemini 2.5 Flash via the
// @google/genai SDK on the free tier. Swapping providers (Haiku, GPT-mini,
// etc.) is a one-file change as long as the classify() signature stays put.
//
// We constrain the model with responseSchema (Gemini's structured-output
// feature) so it can only return one of the allowed category strings — no
// regex parsing, no retry-on-malformed.
//
// 'Other' is deliberately NOT in the LLM's allowed set. 'Other' means "we
// couldn't figure it out"; if the model has to fall back, we want it surfaced
// as null so the caller can record the miss explicitly rather than caching a
// dead-end 'Other' globally.

import { GoogleGenAI } from 'npm:@google/genai@^1.0.0'

export const LLM_CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat',
  'Bakery',
  'Pantry',
  'Frozen',
  'Beverages',
  'Household',
  'Personal Care',
  'Snacks',
  'Condiments & Sauces',
  'Baby',
  'Pet',
] as const

export type LLMCategory = (typeof LLM_CATEGORIES)[number]

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly kind: 'config' | 'rate_limit' | 'malformed' | 'network',
  ) {
    super(message)
    this.name = 'LLMError'
  }
}

const SYSTEM_INSTRUCTION =
  'You categorise grocery shopping list items for an Australian household app. ' +
  'Consider Australian shopping conventions (e.g. capsicum, coriander, mince). ' +
  'Respond with exactly one category from the provided enum. ' +
  "If the item could fit multiple, pick the most specific (e.g. 'tomato sauce' is Condiments & Sauces, not Pantry)."

export async function classify(name: string): Promise<{ category: LLMCategory }> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    throw new LLMError('GEMINI_API_KEY not set', 'config')
  }

  const ai = new GoogleGenAI({ apiKey })

  let response
  try {
    response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Item: "${name}"`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            category: {
              type: 'STRING',
              enum: [...LLM_CATEGORIES],
            },
          },
          required: ['category'],
        },
        // Deterministic enough — we want the same item to land in the same
        // category for cache-friendliness.
        temperature: 0,
      },
    })
  } catch (err) {
    // Free-tier 429 surfaces as an SDK error with a status. Anything else is
    // network or transient — bubble up as 'network' so the caller can decide
    // whether to retry or fall through.
    const status = (err as { status?: number; statusCode?: number })?.status
    const code = status ?? (err as { statusCode?: number })?.statusCode ?? undefined
    if (code === 429) {
      throw new LLMError('Gemini rate-limited (429)', 'rate_limit')
    }
    throw new LLMError(`Gemini request failed: ${(err as Error)?.message ?? 'unknown'}`, 'network')
  }

  const text = response?.text
  if (typeof text !== 'string' || text.length === 0) {
    throw new LLMError('Gemini returned empty response', 'malformed')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new LLMError(`Gemini returned non-JSON: ${text.slice(0, 80)}`, 'malformed')
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as { category?: unknown }).category !== 'string'
  ) {
    throw new LLMError('Gemini response missing category field', 'malformed')
  }

  const candidate = (parsed as { category: string }).category
  if (!LLM_CATEGORIES.includes(candidate as LLMCategory)) {
    throw new LLMError(`Gemini returned out-of-enum value: ${candidate}`, 'malformed')
  }

  return { category: candidate as LLMCategory }
}
