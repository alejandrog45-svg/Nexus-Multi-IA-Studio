// Free-tier support providers with an OpenAI-compatible /chat/completions API.
// Keys are read ONLY from server environment variables (GROQ_API_KEY, OPENROUTER_API_KEY) and never sent to the client.

export type ProviderId = 'groq' | 'openrouter';

interface ProviderDef {
  label: string;
  keyEnv: string;
  modelEnv: string;
  baseEnv: string;
  defaultModel: string;
  defaultBase: string;
}

const DEFS: Record<ProviderId, ProviderDef> = {
  groq: {
    label: 'Groq',
    keyEnv: 'GROQ_API_KEY',
    modelEnv: 'GROQ_MODEL',
    baseEnv: 'GROQ_BASE_URL',
    defaultModel: 'llama-3.3-70b-versatile', // Llama (Meta) served by Groq; override with GROQ_MODEL
    defaultBase: 'https://api.groq.com/openai/v1',
  },
  openrouter: {
    label: 'OpenRouter',
    keyEnv: 'OPENROUTER_API_KEY',
    modelEnv: 'OPENROUTER_MODEL',
    baseEnv: 'OPENROUTER_BASE_URL',
    defaultModel: 'google/gemma-4-31b-it:free', // listed as free on 2026-10-21; override with OPENROUTER_MODEL
    defaultBase: 'https://openrouter.ai/api/v1',
  },
};

export const PROVIDER_IDS = Object.keys(DEFS) as ProviderId[];

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  model: string;
  baseUrl: string;
  apiKey: string | null;
  configured: boolean;
}

export function providerConfig(id: ProviderId, env: NodeJS.ProcessEnv = process.env): ProviderConfig {
  const d = DEFS[id];
  const apiKey = (env[d.keyEnv] || '').trim() || null;
  return {
    id,
    label: d.label,
    model: (env[d.modelEnv] || '').trim() || d.defaultModel,
    baseUrl: ((env[d.baseEnv] || '').trim() || d.defaultBase).replace(/\/+$/, ''),
    apiKey,
    configured: !!apiKey,
  };
}

/** Public info only: never includes the key. */
export function listProviders(env: NodeJS.ProcessEnv = process.env) {
  return PROVIDER_IDS.map((id) => {
    const c = providerConfig(id, env);
    return { id: c.id, label: c.label, model: c.model, configured: c.configured };
  });
}

export function isProviderId(x: unknown): x is ProviderId {
  return typeof x === 'string' && (PROVIDER_IDS as string[]).includes(x);
}

export class ProviderError extends Error {
  constructor(message: string, readonly status: number, readonly quota: boolean) {
    super(message);
  }
}

export interface ProviderAnswer {
  text: string;
  model: string;
  usageMetadata: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number } | null;
}

export async function chatCompletion(
  cfg: ProviderConfig,
  system: string,
  userText: string,
  timeoutMs = 60_000
): Promise<ProviderAnswer> {
  if (!cfg.apiKey) throw new ProviderError(`${cfg.label}: clave no configurada en el servidor.`, 500, false);

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
        'X-Title': 'Nexus Multi-IA Studio',
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userText },
        ],
        stream: false,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e: any) {
    throw new ProviderError(`${cfg.label}: sin conexion o tiempo agotado.`, 504, false);
  }

  let data: any = null;
  try { data = await res.json(); } catch { /* cuerpo no JSON */ }

  if (!res.ok) {
    const detail = String(data?.error?.message || data?.error || res.statusText || '').slice(0, 200);
    if (res.status === 401 || res.status === 403) {
      throw new ProviderError(`${cfg.label}: la clave fue rechazada (revisa ${DEFS[cfg.id].keyEnv}).`, 502, false);
    }
    throw new ProviderError(`${cfg.label}: ${detail || `error ${res.status}`}`, res.status === 429 ? 429 : 502, res.status === 429);
  }

  const text = String(data?.choices?.[0]?.message?.content ?? '');
  if (!text) throw new ProviderError(`${cfg.label}: respuesta vacia.`, 502, false);
  const u = data?.usage;
  return {
    text,
    model: String(data?.model || cfg.model),
    usageMetadata: u
      ? {
          promptTokenCount: u.prompt_tokens || 0,
          candidatesTokenCount: u.completion_tokens || 0,
          totalTokenCount: u.total_tokens || (u.prompt_tokens || 0) + (u.completion_tokens || 0),
        }
      : null,
  };
}
