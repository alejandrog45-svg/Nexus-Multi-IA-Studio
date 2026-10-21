import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn, ChildProcess } from 'node:child_process';
import { AddressInfo } from 'node:net';

// Servidor real contra proveedores FALSOS (Gemini siempre 429 diario; Groq y OpenRouter OpenAI-compatibles). Sin red real, sin claves reales.
const KEY_GROQ = 'clave-groq-falsa-123';
const KEY_OR = 'clave-or-falsa-456';

const hits: { path: string; auth: string; body: string }[] = [];
let geminiFake: http.Server, groqFake: http.Server, orFake: http.Server;
let app: ChildProcess;
let base = '';

function fakeOpenAI(tag: string) {
  return http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      hits.push({ path: `${tag}${req.url}`, auth: String(req.headers.authorization || ''), body });
      if (body.includes('forzar-401')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: `Invalid API key ${KEY_GROQ}` } }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ model: `${tag}-modelo`, choices: [{ message: { role: 'assistant', content: `respuesta de ${tag}` } }], usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 } }));
    });
  });
}

const listen = (s: http.Server) => new Promise<number>((r) => s.listen(0, '127.0.0.1', () => r((s.address() as AddressInfo).port)));

before(async () => {
  geminiFake = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded: GenerateRequestsPerDayPerProjectPerModel' } }));
    });
  });
  groqFake = fakeOpenAI('groq');
  orFake = fakeOpenAI('openrouter');
  const [gp, qp, op] = [await listen(geminiFake), await listen(groqFake), await listen(orFake)];

  const port = 39900 + Math.floor(Math.random() * 90);
  base = `http://127.0.0.1:${port}`;
  app = spawn(process.execPath, ['--import', 'tsx', 'server.ts', '--prod'], {
    env: {
      ...process.env,
      PORT: String(port),
      GEMINI_API_KEY: 'gemini-falsa', GEMINI_BASE_URL: `http://127.0.0.1:${gp}`, GEMINI_MODELS: 'solo-uno',
      GROQ_API_KEY: KEY_GROQ, GROQ_BASE_URL: `http://127.0.0.1:${qp}`,
      OPENROUTER_API_KEY: KEY_OR, OPENROUTER_BASE_URL: `http://127.0.0.1:${op}`,
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) return; } catch { /* esperando */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('El servidor de prueba no arranco');
});

after(() => { app?.kill(); geminiFake?.close(); groqFake?.close(); orFake?.close(); });

const post = (path: string, payload: object) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

test('GET /api/providers lista ambos como configurados y no revela claves', async () => {
  const raw = await (await fetch(`${base}/api/providers`)).text();
  const j = JSON.parse(raw);
  assert.deepEqual(j.providers.map((p: any) => [p.id, p.configured]), [['groq', true], ['openrouter', true]]);
  assert.ok(!raw.includes(KEY_GROQ) && !raw.includes(KEY_OR));
});

test('Groq: responde, envia la clave solo en la cabecera Authorization y devuelve tokens', async () => {
  const r = await post('/api/provider/chat', { provider: 'groq', prompt: 'hola llama' });
  const j: any = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.text, 'respuesta de groq');
  assert.equal(j.provider, 'groq');
  assert.equal(j.usageMetadata.totalTokenCount, 8);
  const hit = hits.find((h) => h.path === 'groq/chat/completions');
  assert.equal(hit?.auth, `Bearer ${KEY_GROQ}`);
  assert.ok(!hit?.body.includes(KEY_GROQ));
});

test('Groq: el mismo prompt sale de la cache sin nueva llamada', async () => {
  const before = hits.length;
  const j: any = await (await post('/api/provider/chat', { provider: 'groq', prompt: 'hola llama' })).json();
  assert.equal(j.cached, true);
  assert.equal(hits.length, before);
});

test('proveedor invalido o prompt vacio -> 400', async () => {
  assert.equal((await post('/api/provider/chat', { provider: 'openai', prompt: 'x' })).status, 400);
  assert.equal((await post('/api/provider/chat', { provider: 'groq', prompt: '' })).status, 400);
});

test('clave rechazada (401): mensaje claro sin filtrar la clave', async () => {
  const r = await post('/api/provider/chat', { provider: 'groq', prompt: 'forzar-401 prueba' });
  const raw = await r.text();
  assert.equal(r.status, 502);
  assert.match(raw, /rechazada/);
  assert.ok(!raw.includes(KEY_GROQ));
});

test('Gemini sin cuota (429 diario): /api/chat responde con respaldo OpenRouter, rotulado', async () => {
  const r = await post('/api/chat', { prompt: 'pregunta para gemini agotado' });
  const j: any = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.fallback, true);
  assert.match(j.modelUsed, /^openrouter:/);
  assert.equal(j.text, 'respuesta de openrouter');
});

test('Gemini sin cuota: /api/stream entrega el respaldo con su modelo real', async () => {
  const raw = await (await post('/api/stream', { prompt: 'otro prompt distinto para el stream' })).text();
  const events = raw.split('\n').filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6)));
  assert.equal(events.filter((e) => e.text).map((e) => e.text).join(''), 'respuesta de openrouter');
  const done = events.find((e) => e.done);
  assert.equal(done.fallback, true);
  assert.match(done.modelUsed, /^openrouter:/);
});
