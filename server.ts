import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { isSensitiveFile } from './src/services/sensitiveFiles';
import { QuotaTracker, ResponseCache } from './server/quotaCache';
import { PROVIDER_IDS, ProviderError, ProviderId, chatCompletion, isProviderId, listProviders, providerConfig } from './server/providers';

// .env.local takes precedence over .env (both ignored by git)
dotenv.config({ path: ['.env.local', '.env'], quiet: true });

const app = express();
const PORT = Number(process.env.PORT) || 3000;
// Production mode: `npm start` (--prod) or NODE_ENV=production. Test hooks are disabled in production.
const IS_PROD = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';

// Body size limit: 2MB max
app.use(express.json({ limit: '2mb' }));

// 1. IP Rate Limiting (In-memory sliding window: 45 req / minute per IP)
interface IPRateRecord {
  count: number;
  resetAt: number;
}
const ipRateMap = new Map<string, IPRateRecord>();

app.use('/api', (req, res, next) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;

  const record = ipRateMap.get(ip);
  if (!record || now > record.resetAt) {
    ipRateMap.set(ip, { count: 1, resetAt: now + windowMs });
    return next();
  }

  record.count++;
  if (record.count > 45) {
    return res.status(429).json({
      error: 'Límite de peticiones por IP excedido (máximo 45 por minuto). Espera un momento.',
      code: 'RATE_LIMIT_IP',
    });
  }
  next();
});

// 2. Strict CORS: Only allow same-origin requests or allowed app domains
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  const host = req.headers.host;

  if (origin) {
    // Check if origin matches host or is localhost / run.app
    try {
      const url = new URL(origin);
      const isAllowed = 
        url.host === host ||
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname.endsWith('.run.app');

      if (!isAllowed) {
        return res.status(403).json({ error: 'Acceso CORS no autorizado.' });
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    } catch {
      return res.status(403).json({ error: 'Origen inválido.' });
    }
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// 3. Concurrency Semaphore (Max 2 concurrent calls to Gemini to protect rate limits)
class ConcurrencySemaphore {
  private active = 0;
  private readonly maxConcurrent: number;
  private queue: (() => void)[] = [];

  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
  }

  async acquire(): Promise<() => void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      let released = false;
      return () => {
        if (!released) {
          released = true;
          this.active--;
          this.dispatchNext();
        }
      };
    }

    return new Promise((resolve) => {
      this.queue.push(() => {
        this.active++;
        let released = false;
        resolve(() => {
          if (!released) {
            released = true;
            this.active--;
            this.dispatchNext();
          }
        });
      });
    });
  }

  private dispatchNext() {
    if (this.queue.length > 0 && this.active < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) next();
    }
  }

  getStats() {
    return { active: this.active, queued: this.queue.length };
  }
}

const geminiSemaphore = new ConcurrencySemaphore(2);

// Model definitions: primary and fallback (models confirmed live with active free quota)
const PRIMARY_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

// Quota protection (free tier ~20 req/day per model): model pool, daily counters and answer cache.
// GEMINI_MODELS="m1,m2,m3" overrides the pool; GEMINI_DAILY_LIMIT overrides the per-model daily cap.
const MODEL_POOL = (process.env.GEMINI_MODELS || `${PRIMARY_MODEL},${FALLBACK_MODEL}`)
  .split(',').map((m) => m.trim()).filter(Boolean);
const quota = new QuotaTracker(MODEL_POOL, Number(process.env.GEMINI_DAILY_LIMIT) || 20);
const answerCache = new ResponseCache();

// GEMINI_BASE_URL is only meant for automated tests (fake Gemini server); leave unset in real use.
const makeAI = (apiKey: string) =>
  new GoogleGenAI(process.env.GEMINI_BASE_URL ? { apiKey, httpOptions: { baseUrl: process.env.GEMINI_BASE_URL } } : { apiKey });

const isQuotaErr = (err: any) =>
  err?.status === 429 || /429|quota|RESOURCE_EXHAUSTED/i.test(String(err?.message || ''));
const isTransientErr = (err: any) =>
  err?.status === 503 || /503|high demand|UNAVAILABLE/i.test(String(err?.message || ''));
const NO_QUOTA_MSG =
  'Se agotó la cuota gratuita local de todos los modelos configurados por hoy. Reintenta más tarde o amplía GEMINI_MODELS.';

// GET /api/health - Safe, minimal health endpoint
app.get('/api/health', (req, res) => {
  const hasKey = !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);
  res.json({
    status: 'ok',
    keyConfigured: hasKey,
    primaryModel: PRIMARY_MODEL,
    fallbackModel: FALLBACK_MODEL,
    concurrency: geminiSemaphore.getStats(),
  });
});

// GET /api/quota - Local view of today's usage per model (counts only what this server sent)
app.get('/api/quota', (_req, res) => {
  res.json({ ...quota.stats(), cachedAnswers: answerCache.size(), providers: providerQuota.stats() });
});

// --- Free support providers (Groq, OpenRouter): keys live only in server env vars ---
const providerQuota = new QuotaTracker(PROVIDER_IDS, Number(process.env.PROVIDER_DAILY_LIMIT) || 200);
const providerSemaphore = new ConcurrencySemaphore(2);

function summarizeFiles(files: any): string {
  if (!Array.isArray(files)) return '';
  return files
    .filter((f: any) => f && f.includedInContext && !isSensitiveFile(String(f.name || ''), f.isText ? String(f.content || '') : ''))
    .map((f: any) => `[Archivo: ${String(f.name || 'documento')}]\n${f.isText ? String(f.content || '').slice(0, 4000) : '[Binario]'}`)
    .join('\n\n');
}

function providerSystem(who: string, context: any, fileSummaries: string, crossContext: any): string {
  return `Eres ${who}, participante del estudio Nexus Multi-IA.
${context ? `CONTEXTO DEL PROYECTO:\n${String(context).slice(0, 6000)}\n` : ''}
${fileSummaries ? `ARCHIVOS:\n${fileSummaries}\n` : ''}
${crossContext ? `APORTES DE OTROS AGENTES:\n${String(crossContext).slice(0, 4000)}\n` : ''}
Responde en español de forma rigurosa y técnica.`;
}

async function askProvider(id: ProviderId, system: string, userText: string) {
  const cfg = providerConfig(id);
  if (!cfg.configured) throw new ProviderError(`${cfg.label}: clave no configurada en el servidor.`, 503, false);
  if (!providerQuota.order().includes(id)) throw new ProviderError(`${cfg.label}: límite local de uso alcanzado por ahora.`, 429, true);
  const release = await providerSemaphore.acquire();
  try {
    const answer = await chatCompletion(cfg, system, userText);
    providerQuota.record(id);
    return answer;
  } catch (e: any) {
    if (e instanceof ProviderError && e.quota) providerQuota.markLimited(id, e.message);
    throw e;
  } finally {
    release();
  }
}

/** Automatic backup for Gemini when its quota is exhausted: Gemma via OpenRouter, clearly labeled. Null if unavailable. */
async function openRouterFallback(prompt: string, context: any, fileSummaries: string, crossContext: any) {
  if (!providerConfig('openrouter').configured) return null;
  try {
    return await askProvider('openrouter', providerSystem('un asistente de respaldo (modelo gratuito vía OpenRouter)', context, fileSummaries, crossContext), prompt);
  } catch {
    return null;
  }
}

// GET /api/providers - which support providers are configured (never returns keys)
app.get('/api/providers', (_req, res) => {
  res.json({ providers: listProviders() });
});

// POST /api/provider/chat - one question to Groq or OpenRouter
app.post('/api/provider/chat', async (req, res) => {
  const startTime = Date.now();
  const { provider, prompt, context, files, crossContext } = req.body || {};
  if (!isProviderId(provider)) return res.status(400).json({ error: 'Proveedor no válido.' });
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'El campo "prompt" es requerido y debe ser texto.' });
  if (prompt.length > 50000) return res.status(400).json({ error: 'El prompt excede el límite máximo permitido (50,000 caracteres).' });

  const fileSummaries = summarizeFiles(files);
  const cfg = providerConfig(provider);
  const cacheKey = ResponseCache.key({ kind: `provider:${provider}:${cfg.model}`, prompt, context: String(context || ''), fileSummaries, crossContext: String(crossContext || '') });
  const cached = answerCache.get(cacheKey);
  if (cached !== null) {
    return res.json({ text: cached, usageMetadata: null, latencyMs: Date.now() - startTime, modelUsed: 'cache', provider, cached: true });
  }

  try {
    const who = provider === 'groq' ? 'Llama (Meta AI), servido por Groq' : 'un modelo gratuito servido por OpenRouter';
    const answer = await askProvider(provider, providerSystem(who, context, fileSummaries, crossContext), prompt);
    answerCache.set(cacheKey, answer.text);
    return res.json({ text: answer.text, usageMetadata: answer.usageMetadata, latencyMs: Date.now() - startTime, modelUsed: answer.model, provider });
  } catch (e: any) {
    const status = e instanceof ProviderError ? e.status : 500;
    return res.status(status).json({
      error: e?.message || 'Error al comunicar con el proveedor.',
      code: e instanceof ProviderError && e.quota ? 'QUOTA_EXCEEDED' : 'PROVIDER_ERROR',
      latencyMs: Date.now() - startTime,
    });
  }
});

// Helper for backoff calls
async function callGeminiWithBackoff(ai: GoogleGenAI, model: string, contents: string, maxRetries = 2) {
  let attempt = 0;
  let delay = 1000;

  while (attempt <= maxRetries) {
    try {
      const response = await ai.models.generateContent({ model, contents });
      return response;
    } catch (err: any) {
      attempt++;
      const isTransient = 
        err?.status === 429 || 
        err?.message?.includes('429') ||
        err?.status === 503 ||
        err?.message?.includes('503') ||
        err?.message?.includes('high demand');

      if (isTransient && attempt <= maxRetries) {
        console.warn(`[Gemini Semaphore] Retry ${attempt}/${maxRetries} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

// POST /api/chat - Standard JSON response
app.post('/api/chat', async (req, res) => {
  const startTime = Date.now();
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY no configurada en el servidor backend.',
      code: 'MISSING_API_KEY',
    });
  }

  const { prompt, context, files, model, crossContext, simulateQuotaError } = req.body;

  // Test trigger for forced 429
  if (!IS_PROD && (simulateQuotaError === true || req.headers['x-simulate-quota'] === 'true')) {
    return res.status(429).json({
      error: 'Se superó el límite de cuota por minuto/día de la API de Gemini. Espera unos momentos antes de reintentar.',
      code: 'QUOTA_EXCEEDED',
      simulated: true,
      latencyMs: Date.now() - startTime,
    });
  }

  // Strict prompt validation
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'El campo "prompt" es requerido y debe ser texto.' });
  }

  if (prompt.length > 50000) {
    return res.status(400).json({ error: 'El prompt excede el límite máximo permitido (50,000 caracteres).' });
  }

  const release = await geminiSemaphore.acquire();
  try {
    const ai = makeAI(apiKey);

    let fileSummaries = '';
    if (Array.isArray(files) && files.length > 0) {
      fileSummaries = files
        .filter((f: any) => f && f.includedInContext && !isSensitiveFile(String(f.name || ''), f.isText ? String(f.content || '') : ''))
        .map((f: any) => `[Archivo: ${String(f.name || 'documento')} (${String(f.type || 'text')})]\n${f.isText ? String(f.content || '').slice(0, 4000) : '[Binario]'}`)
        .join('\n\n');
    }

    const systemInstruction = `Eres Gemini (Google AI), motor del estudio Nexus Multi-IA.
${context ? `CONTEXTO DEL PROYECTO:\n${String(context).slice(0, 6000)}\n` : ''}
${fileSummaries ? `ARCHIVOS:\n${fileSummaries}\n` : ''}
${crossContext ? `APORTES DE OTROS AGENTES:\n${String(crossContext).slice(0, 4000)}\n` : ''}
Responde en español de forma rigurosa y técnica.`;

    const fullPrompt = `${systemInstruction}\n\nSOLICITUD:\n${prompt}`;

    const cacheKey = ResponseCache.key({ kind: 'chat', prompt, context: String(context || ''), fileSummaries, crossContext: String(crossContext || '') });
    const cached = answerCache.get(cacheKey);
    if (cached !== null) {
      return res.json({ text: cached, usageMetadata: null, latencyMs: Date.now() - startTime, modelUsed: 'cache', cached: true });
    }

    const candidates = quota.order(typeof model === 'string' ? model : undefined);
    const chatFallback = async () => {
      const fb = await openRouterFallback(prompt, context, fileSummaries, crossContext);
      if (!fb) return null;
      answerCache.set(cacheKey, fb.text);
      return res.json({ text: fb.text, usageMetadata: fb.usageMetadata, latencyMs: Date.now() - startTime, modelUsed: `openrouter:${fb.model}`, fallback: true });
    };
    if (candidates.length === 0) {
      return (await chatFallback()) || res.status(429).json({ error: NO_QUOTA_MSG, code: 'QUOTA_EXCEEDED_LOCAL', latencyMs: Date.now() - startTime });
    }

    let geminiResponse: any = null;
    let modelUsed = '';
    let lastErr: any = null;
    for (const m of candidates) {
      try {
        geminiResponse = await ai.models.generateContent({ model: m, contents: fullPrompt });
        quota.record(m);
        modelUsed = m;
        break;
      } catch (e: any) {
        lastErr = e;
        if (isQuotaErr(e)) {
          quota.markLimited(m, String(e?.message || ''));
        } else if (!isTransientErr(e)) {
          throw e;
        }
        console.warn(`[Rotation] ${m} failed (${isQuotaErr(e) ? 'quota' : 'transient'}); trying next model...`);
      }
    }

    if (!geminiResponse) {
      if (lastErr && isQuotaErr(lastErr)) {
        const sent = await chatFallback();
        if (sent) return sent;
      }
      throw lastErr || new Error('No se recibió respuesta válida del modelo Gemini.');
    }

    answerCache.set(cacheKey, geminiResponse.text || '');
    const latencyMs = Date.now() - startTime;
    return res.json({
      text: geminiResponse.text || '',
      usageMetadata: geminiResponse.usageMetadata || null,
      latencyMs,
      modelUsed,
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const isQuota = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota');
    const isDemand = err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('high demand');

    const errorMsg = isQuota
      ? 'Se superó el límite de cuota por minuto/día de la API de Gemini. Espera unos momentos antes de reintentar.'
      : isDemand
      ? 'El servicio de Gemini experimenta alta demanda en estos momentos. Intenta de nuevo en unos segundos.'
      : err?.message || 'Error al comunicar con Gemini.';

    return res.status(err?.status || 500).json({
      error: errorMsg,
      code: isQuota ? 'QUOTA_EXCEEDED' : isDemand ? 'HIGH_DEMAND' : 'API_ERROR',
      latencyMs,
    });
  } finally {
    release();
  }
});

// POST /api/stream - Real Server-Sent Events (SSE) streaming endpoint
app.post('/api/stream', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY no configurada.', code: 'MISSING_API_KEY' });
  }

  const { prompt, context, files, model, crossContext, simulateQuotaError } = req.body;

  if (!IS_PROD && (simulateQuotaError === true || req.headers['x-simulate-quota'] === 'true')) {
    return res.status(429).json({
      error: 'Se superó el límite de cuota por minuto/día de la API de Gemini. Espera unos momentos antes de reintentar.',
      code: 'QUOTA_EXCEEDED',
      simulated: true,
    });
  }

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'El campo "prompt" es requerido.' });
  }

  if (prompt.length > 50000) {
    return res.status(400).json({ error: 'El prompt excede los 50,000 caracteres.' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Listen on `res`: in modern Node `req` emits 'close' as soon as the request body is read,
  // which would wrongly look like a client disconnect and cut the stream.
  let clientDisconnected = false;
  res.on('close', () => {
    if (!res.writableFinished) clientDisconnected = true;
  });

  const release = await geminiSemaphore.acquire();
  try {
    const ai = makeAI(apiKey);

    let fileSummaries = '';
    if (Array.isArray(files) && files.length > 0) {
      fileSummaries = files
        .filter((f: any) => f && f.includedInContext && !isSensitiveFile(String(f.name || ''), f.isText ? String(f.content || '') : ''))
        .map((f: any) => `[Archivo: ${String(f.name || 'documento')}]\n${f.isText ? String(f.content || '').slice(0, 4000) : '[Binario]'}`)
        .join('\n\n');
    }

    const systemInstruction = `Eres Gemini (Google AI), motor de razonamiento del estudio Nexus Multi-IA.
${context ? `CONTEXTO DEL PROYECTO:\n${String(context).slice(0, 6000)}\n` : ''}
${fileSummaries ? `ARCHIVOS:\n${fileSummaries}\n` : ''}
${crossContext ? `APORTES DE OTROS AGENTES:\n${String(crossContext).slice(0, 4000)}\n` : ''}
Responde en español con código limpio y explicaciones concisas.`;

    const fullPrompt = `${systemInstruction}\n\nSOLICITUD:\n${prompt}`;

    const cacheKey = ResponseCache.key({ kind: 'stream', prompt, context: String(context || ''), fileSummaries, crossContext: String(crossContext || '') });
    const cached = answerCache.get(cacheKey);
    if (cached !== null) {
      res.write(`data: ${JSON.stringify({ text: cached })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, modelUsed: 'cache', usageMetadata: null, cached: true })}\n\n`);
      res.end();
      return;
    }

    const candidates = quota.order(typeof model === 'string' ? model : undefined);
    const streamFallback = async (): Promise<boolean> => {
      const fb = await openRouterFallback(prompt, context, fileSummaries, crossContext);
      if (!fb) return false;
      answerCache.set(cacheKey, fb.text);
      res.write(`data: ${JSON.stringify({ text: fb.text })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, modelUsed: `openrouter:${fb.model}`, usageMetadata: fb.usageMetadata, fallback: true })}\n\n`);
      res.end();
      return true;
    };
    if (candidates.length === 0) {
      if (await streamFallback()) return;
      res.write(`data: ${JSON.stringify({ error: NO_QUOTA_MSG, code: 'QUOTA_EXCEEDED_LOCAL' })}\n\n`);
      res.end();
      return;
    }

    let usageMetadata: any = null;
    let modelUsed = '';
    let fullText = '';
    let wroteText = false;
    let succeeded = false;
    let lastErr: any = null;

    for (const m of candidates) {
      try {
        const streamResult = await ai.models.generateContentStream({ model: m, contents: fullPrompt });
        for await (const chunk of streamResult) {
          if (clientDisconnected) {
            console.log('[SSE Stream] Client aborted request.');
            break;
          }
          if (chunk.usageMetadata) usageMetadata = chunk.usageMetadata;
          const chunkText = chunk.text || '';
          if (chunkText) {
            wroteText = true;
            fullText += chunkText;
            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
          }
        }
        quota.record(m);
        modelUsed = m;
        succeeded = true;
        break;
      } catch (e: any) {
        lastErr = e;
        // Only rotate if nothing was sent to the client yet (never mix two models in one answer)
        if (!wroteText && (isQuotaErr(e) || isTransientErr(e))) {
          if (isQuotaErr(e)) quota.markLimited(m, String(e?.message || ''));
          console.warn(`[SSE Rotation] ${m} failed; trying next model...`);
          continue;
        }
        throw e;
      }
    }

    if (!succeeded && !clientDisconnected) {
      if (!wroteText && lastErr && isQuotaErr(lastErr) && (await streamFallback())) return;
      throw lastErr || new Error('No se recibió respuesta del modelo.');
    }
    if (succeeded && !clientDisconnected) answerCache.set(cacheKey, fullText);

    if (!clientDisconnected) {
      res.write(`data: ${JSON.stringify({ done: true, modelUsed, usageMetadata })}\n\n`);
      res.end();
    }
  } catch (err: any) {
    if (!clientDisconnected) {
      const isQuota = err?.status === 429 || err?.message?.includes('429');
      const errorMsg = isQuota
        ? 'Se superó el límite de cuota por minuto/día de la API de Gemini.'
        : err?.message || 'Error en el flujo de streaming.';

      res.write(`data: ${JSON.stringify({ error: errorMsg, code: isQuota ? 'QUOTA_EXCEEDED' : 'STREAM_ERROR' })}\n\n`);
      res.end();
    }
  } finally {
    release();
  }
});

// Mount Vite SPA
async function startServer() {
  if (IS_PROD) {
    // Production: serve the built SPA from dist/ (run `npm run build` first)
    const distDir = path.join(process.cwd(), 'dist');
    app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint no encontrado.' }));
    app.use(express.static(distDir));
    app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Nexus Server] Running at http://0.0.0.0:${PORT}`);
    console.log(`[Nexus Server] Endpoints: GET /api/health, GET /api/quota, POST /api/chat, POST /api/stream`);
  });
}

startServer().catch((err) => {
  console.error('[Nexus Server Start Failed]:', err);
  process.exit(1);
});
