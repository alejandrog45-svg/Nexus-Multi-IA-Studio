import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn, ChildProcess } from 'node:child_process';
import { AddressInfo } from 'node:net';

// Integration test: real server.ts against a FAKE Gemini (no network, no real key, no quota).
// Model "fake-a" always answers 429 per-day; "fake-b" answers normally (JSON and SSE).

const calls: string[] = [];
const bodies: string[] = [];
let fake: http.Server;
let app: ChildProcess;
let base = '';

const usage = { promptTokenCount: 11, candidatesTokenCount: 7, totalTokenCount: 18 };
const body = (text: string) => ({ candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP', index: 0 }], usageMetadata: usage });

before(async () => {
  fake = http.createServer((req, res) => {
    const m = /models\/([^:/]+):(\w+)/.exec(req.url || '');
    const model = m?.[1] || '';
    const method = m?.[2] || '';
    calls.push(`${model}:${method}`);
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      bodies.push(data);
      if (model === 'fake-a') {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded for GenerateRequestsPerDayPerProjectPerModel' } }));
        return;
      }
      if (method === 'streamGenerateContent') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.write(`data: ${JSON.stringify(body('Hola '))}\r\n\r\n`);
        res.end(`data: ${JSON.stringify(body('mundo'))}\r\n\r\n`);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body('respuesta falsa')));
    });
  });
  await new Promise<void>((r) => fake.listen(0, '127.0.0.1', r));
  const fakePort = (fake.address() as AddressInfo).port;

  const port = 39000 + Math.floor(Math.random() * 500);
  base = `http://127.0.0.1:${port}`;
  app = spawn(process.execPath, ['--import', 'tsx', 'server.ts', '--prod'], {
    env: { ...process.env, PORT: String(port), GEMINI_API_KEY: 'clave-falsa-de-prueba', GEMINI_BASE_URL: `http://127.0.0.1:${fakePort}`, GEMINI_MODELS: 'fake-a,fake-b' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) return; } catch { /* esperando */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('El servidor de prueba no arranco');
});

after(() => { app?.kill(); fake?.close(); });

const post = (path: string, payload: object) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

test('chat: rota de fake-a (429 diario) a fake-b y devuelve el modelo realmente usado', async () => {
  const r = await post('/api/chat', { prompt: 'pregunta uno' });
  const j: any = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.text, 'respuesta falsa');
  assert.equal(j.modelUsed, 'fake-b');
  assert.equal(j.usageMetadata.totalTokenCount, 18);
});

test('chat: el mismo prompt sale de la cache sin llamar al proveedor', async () => {
  const before = calls.length;
  const r = await post('/api/chat', { prompt: 'pregunta uno' });
  const j: any = await r.json();
  assert.equal(j.cached, true);
  assert.equal(j.modelUsed, 'cache');
  assert.equal(calls.length, before);
});

test('quota: fake-a queda bloqueado (429 diario) y fake-b cuenta 1 uso', async () => {
  const j: any = await (await fetch(`${base}/api/quota`)).json();
  const a = j.models.find((m: any) => m.model === 'fake-a');
  const b = j.models.find((m: any) => m.model === 'fake-b');
  assert.equal(a.blocked, true);
  assert.equal(b.used, 1);
});

test('stream: entrega los trozos SSE, el modelo usado y los tokens reales', async () => {
  const r = await post('/api/stream', { prompt: 'pregunta stream' });
  const raw = await r.text();
  const events = raw.split('\n').filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6)));
  const text = events.filter((e) => e.text).map((e) => e.text).join('');
  const done = events.find((e) => e.done);
  assert.equal(text, 'Hola mundo');
  assert.equal(done.modelUsed, 'fake-b');
  assert.equal(done.usageMetadata.totalTokenCount, 18);
});

test('stream: repetir el prompt usa la cache', async () => {
  const before = calls.length;
  const raw = await (await post('/api/stream', { prompt: 'pregunta stream' })).text();
  assert.match(raw, /"cached":true/);
  assert.equal(calls.length, before);
});

test('archivos sensibles no llegan al proveedor', async () => {
  const secret = 'AIza' + 'z'.repeat(35);
  const r = await post('/api/chat', { prompt: 'con archivo', files: [
    { name: '.env', isText: true, content: `K=${secret}`, includedInContext: true },
    { name: 'notas.txt', isText: true, content: 'contenido normal visible', includedInContext: true },
  ] });
  assert.equal(r.status, 200);
  const sent = bodies[bodies.length - 1];
  assert.ok(sent.includes('contenido normal visible'), 'el archivo normal si debe enviarse');
  assert.ok(!sent.includes(secret), 'el secreto no debe salir del servidor');
});
