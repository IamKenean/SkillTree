import { z } from 'zod';

const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(z.object({ text: z.string().optional() })),
        }),
      }),
    )
    .optional(),
});

function buildPrompt(input: { title: string; experienceLevel: string; weeklyHours: number; interests: string }) {
  return [
    'You are helping generate a skill tree. Extract 5-8 short interest tags.',
    'Return ONLY a comma-separated list of tags (no bullets, no extra words).',
    'Tags should be lowercase, 1-3 words each, no quotes.',
    '',
    `goal: ${input.title}`,
    `experience level: ${input.experienceLevel}`,
    `weekly hours: ${input.weeklyHours}`,
    `user interests (raw): ${input.interests}`,
  ].join('\n');
}

export async function suggestInterestsViaGemini(
  input: { title: string; experienceLevel: string; weeklyHours: number; interests: string },
  options: { apiKey: string; model?: string; timeoutMs?: number } = { apiKey: '' },
): Promise<string> {
  const model = options.model ?? 'gemini-1.5-flash';
  const timeoutMs = options.timeoutMs ?? 12_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      options.apiKey,
    )}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 80 },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Gemini request failed (${response.status}): ${text || response.statusText}`);
    }

    const json = geminiResponseSchema.parse(await response.json());
    const text =
      json.candidates?.[0]?.content.parts
        .map((part) => part.text ?? '')
        .join('\n')
        .trim() ?? '';
    if (!text) {
      throw new Error('Gemini returned an empty response.');
    }
    return text;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Gemini request timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

