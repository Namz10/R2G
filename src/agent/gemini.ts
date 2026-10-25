import { GoogleGenAI } from '@google/genai';
import { getApiKey } from '../lib/apiKey.ts';
import {
  INVESTIGATE_SYSTEM_PROMPT,
  PATCH_SYSTEM_PROMPT,
  buildInvestigateUserPrompt,
  buildPatchUserPrompt,
  StructuredFailure
} from './prompts.ts';
import {
  InvestigationOutputSchema,
  InvestigationOutput,
  PatchOutputSchema,
  PatchOutput
} from './schemas.ts';
import { TestCase } from './types.ts';

// Model ID lives in a single constant per Spec §9.1
export const MODEL_ID = 'gemini-2.5-flash';

/**
 * Executes a call with a 45s timeout and 1 auto-retry on 429/5xx/parse failures with backoff per Spec §7.2 & §9.1.
 */
async function callWithRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  externalSignal?: AbortSignal
): Promise<T> {
  const timeoutMs = 45000;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

    const onExternalAbort = () => {
      timeoutController.abort();
    };

    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timer);
        throw new Error('Operation cancelled by user');
      }
      externalSignal.addEventListener('abort', onExternalAbort);
    }

    try {
      const res = await fn(timeoutController.signal);
      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);

      if (externalSignal?.aborted) {
        throw new Error('Operation cancelled by user');
      }

      const isLast = attempt === 2;
      if (isLast) {
        throw formatApiError(err);
      }

      // Backoff delay: 1000ms for first retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error('Failed after retries');
}

export function formatApiError(err: any): Error {
  const msg = String(err?.message || err || '');
  const status = err?.status || err?.statusCode || 0;

  if (status === 429 || msg.includes('429') || msg.toLowerCase().includes('resource_exhausted') || msg.toLowerCase().includes('quota')) {
    return new Error('Gemini API quota exceeded (429). Please wait a moment or check your account quota in Google AI Studio.');
  }
  if (status === 400 && (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || msg.includes('INVALID_ARGUMENT'))) {
    return new Error('Invalid Gemini API key. Please check the key entered in BYOK settings.');
  }
  if (status === 403 || msg.includes('PERMISSION_DENIED')) {
    return new Error('API key does not have permission or has expired. Please verify in Google AI Studio.');
  }
  if (msg.includes('SyntaxError') || msg.includes('JSON')) {
    return new Error('Gemini returned an invalid JSON response. Please retry.');
  }
  if (msg.includes('aborted') || msg.includes('timeout')) {
    return new Error('Request timed out after 45s. Please check your network connection and retry.');
  }

  return new Error(msg || 'API communication failure');
}

/**
 * Call 1: INVESTIGATE per Spec §9.2
 */
export async function investigate(
  input: { bugReport: string; code: string },
  feedback?: string[] | null,
  signal?: AbortSignal
): Promise<InvestigationOutput> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('No Gemini API key found. Please add your key in the BYOK settings.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const userContent = buildInvestigateUserPrompt(input.bugReport, input.code, feedback);

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: userContent,
      config: {
        systemInstruction: INVESTIGATE_SYSTEM_PROMPT,
        temperature: 0.3,
        responseMimeType: 'application/json'
      }
    });

    const text = response.text?.trim() || '';
    if (!text) {
      throw new Error('Empty response from Gemini API during investigation');
    }

    const rawJson = JSON.parse(text);
    return InvestigationOutputSchema.parse(rawJson);
  }, signal);
}

/**
 * Call 2: PATCH per Spec §9.3
 */
export async function patch(
  input: { bugReport: string; code: string },
  visibleTests: TestCase[], // frozen repro + guard tests (NO holdouts)
  previousAttempt?: {
    attempt: number;
    source: string;
    reasoning?: string;
    failures?: StructuredFailure[];
    rejectedReason?: string;
  } | null,
  signal?: AbortSignal
): Promise<PatchOutput> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('No Gemini API key found. Please add your key in the BYOK settings.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const userContent = buildPatchUserPrompt(input.bugReport, input.code, visibleTests, previousAttempt);

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: userContent,
      config: {
        systemInstruction: PATCH_SYSTEM_PROMPT,
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });

    const text = response.text?.trim() || '';
    if (!text) {
      throw new Error('Empty response from Gemini API during patch generation');
    }

    const rawJson = JSON.parse(text);
    return PatchOutputSchema.parse(rawJson);
  }, signal);
}
