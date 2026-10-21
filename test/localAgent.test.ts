import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AddressInfo } from 'node:net';
import express from 'express';
import { createAgentRouter, defaultConfig, scrubbedEnv, bundledCodexExe, AgentConfig } from '../server/localAgent';

// Router real en memoria con CLIs falsas. Cubre: opt-in, loopback/mismo origen, token, lista blanca, confirmacion y limites.

const FAKE = path.resolve('test/fixtures/fake-cli.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-agent-test-'));
const servers: http.Server[] = [];
after(() => { servers.forEach((s) => s.close()); fs.rmSync(tmp, { recursive: true, force: true }); });

function cfgWith(env: Record<string, string> = {}, over: Partial<AgentConfig> = {}): AgentConfig {
  const base = defaultConfig({
    LOCAL_AGENT: '1',
    AGENT_ALLOW_TEST_OVERRIDE: '1',
    AGENT_CLAUDE_BIN: process.execPath,
    AGENT_CLAUDE_BIN_ARGS: JSON.stringify([FAKE, '--fake-agent=claude']),
    AGENT_CODEX_BIN: process.execPath,
    AGENT_CODEX_BIN_ARGS: JSON.stringify([FAKE, '--fake-agent=codex']),
    ...env,
  } as NodeJS.ProcessEnv);
  return { ...base, scratchDir: path.join(tmp, 'scratch'), auditLogPath: path.join(tmp, `audit-${Math.random().toString(36).slice(2)}.log`), minIntervalMs: 0, pendingTtlMs: 5000, ...over };
}

async function startApp(cfg: AgentConfig) {
  const app = express();
  app.use(express.json());
  app.use('/api/agent', createAgentRouter(cfg));
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  servers.push(server);
  return (server.address() as AddressInfo).port;
}

interface Opts { method?: string; headers?: Record<string, string>; body?: unknown; host?: string; sameOrigin?: boolean; token?: string }
function call(port: number, p: string, o: Opts = {}): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const payload = o.body === undefined ? null : JSON.stringify(o.body);
    const headers: Record<string, string> = { Host: o.host ?? `127.0.0.1:${port}`, ...(o.sameOrigin === false ? {} : { 'Sec-Fetch-Site': 'same-origin' }), ...(o.token ? { 'X-Agent-Token': o.token } : {}), ...(o.headers || {}) };
    if (payload) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = String(Buffer.byteLength(payload)); }
    const req = http.request({ host: '127.0.0.1', port, path: `/api/agent${p}`, method: o.method || (payload ? 'POST' : 'GET'), headers }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => { let json: any = null; try { json = JSON.parse(data); } catch { /* no json */ } resolve({ status: res.statusCode || 0, json }); });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}
const tokenOf = async (port: number) => (await call(port, '/session')).json.token as string;

test('desactivado por defecto: 404 aunque todo lo demas sea correcto', async () => {
  const port = await startApp(cfgWith({ LOCAL_AGENT: '0' }));
  assert.equal((await call(port, '/session')).status, 404);
});

test('barrera 1: exige navegador del mismo origen, host local y rechaza origenes ajenos', async () => {
  const port = await startApp(cfgWith());
  assert.equal((await call(port, '/session', { sameOrigin: false })).status, 403, 'sin Sec-Fetch-Site');
  assert.equal((await call(port, '/session', { host: 'evil.example.com' })).status, 403, 'Host ajeno (DNS rebinding)');
  assert.equal((await call(port, '/session', { headers: { Origin: 'http://evil.example.com' } })).status, 403, 'Origin ajeno');
  assert.equal((await call(port, '/session', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403, 'cross-site');
  assert.equal((await call(port, '/session')).status, 200);
});

test('barrera 2: sin token o con token falso -> 401', async () => {
  const port = await startApp(cfgWith());
  assert.equal((await call(port, '/status')).status, 401);
  assert.equal((await call(port, '/status', { token: 'falso' })).status, 401);
  assert.equal((await call(port, '/propose', { body: { agent: 'claude', prompt: 'x' } })).status, 401);
});

test('status: reporta instalado y con sesion para ambos agentes', async () => {
  const port = await startApp(cfgWith());
  const j = (await call(port, '/status', { token: await tokenOf(port) })).json;
  assert.deepEqual(j.agents.map((a: any) => [a.id, a.installed, a.loggedIn]), [['claude', true, true], ['codex', true, true]]);
  assert.ok(j.agents[0].command.includes('--tools'));
});

test('barrera 3: solo agentes de la lista blanca; el prompt no puede inyectar comandos', async () => {
  const port = await startApp(cfgWith());
  const token = await tokenOf(port);
  assert.equal((await call(port, '/propose', { token, body: { agent: 'bash', prompt: 'x' } })).status, 400);
  assert.equal((await call(port, '/propose', { token, body: { agent: 'claude', prompt: '' } })).status, 400);
  assert.equal((await call(port, '/propose', { token, body: { agent: 'claude', prompt: 'x'.repeat(20001) } })).status, 400);
});

test('flujo completo: propose -> confirm; prompt solo por stdin, cwd vacio, sin claves, sin archivos sensibles', async () => {
  process.env.GEMINI_API_KEY = 'valor-que-no-debe-filtrarse';
  const port = await startApp(cfgWith());
  const token = await tokenOf(port);
  const secret = 'SUPER_SECRETO_ENV_123';
  const prop = (await call(port, '/propose', { token, body: {
    agent: 'claude', prompt: 'hola agente; rm -rf / && echo hack', context: 'contexto del proyecto',
    files: [
      { name: '.env', isText: true, content: `K=${secret}`, includedInContext: true },
      { name: 'notas.txt', isText: true, content: 'contenido normal', includedInContext: true },
    ] } })).json;
  assert.ok(prop.requestId);
  assert.deepEqual(prop.filesIncluded, ['notas.txt']);

  const run = await call(port, '/confirm', { token, body: { requestId: prop.requestId } });
  assert.equal(run.status, 200);
  const out: string = run.json.text;
  assert.match(out, /FAKE claude/);
  assert.match(out, /LEAK=NO/);
  const argsLine = out.split('\n').find((l) => l.startsWith('ARGS=')) || '';
  assert.deepEqual(JSON.parse(argsLine.slice(5)), ['-p', '--tools', '', '--no-session-persistence', '--output-format', 'text']);
  assert.ok(!argsLine.includes('hola agente'), 'el prompt no va en argumentos');
  assert.ok(out.includes('STDIN=CONTEXTO DEL PROYECTO:'), 'el contexto va por stdin');
  assert.ok(out.includes('hola agente; rm -rf / && echo hack'), 'el prompt llega literal por stdin');
  assert.ok(!out.includes(secret), 'el archivo .env no se envia');
  assert.ok((out.split('\n').find((l) => l.startsWith('CWD=')) || '').endsWith('scratch'), 'carpeta de trabajo vacia');
  delete process.env.GEMINI_API_KEY;

  // barrera 4: la confirmacion es de un solo uso
  assert.equal((await call(port, '/confirm', { token, body: { requestId: prop.requestId } })).status, 404);
  assert.equal((await call(port, '/confirm', { token, body: { requestId: 'inventado' } })).status, 404);
});

test('auditoria: registra agente y tamaño, nunca el contenido del prompt', async () => {
  const cfg = cfgWith();
  const port = await startApp(cfg);
  const token = await tokenOf(port);
  const p = (await call(port, '/propose', { token, body: { agent: 'codex', prompt: 'texto-confidencial-xyz' } })).json;
  assert.equal((await call(port, '/confirm', { token, body: { requestId: p.requestId } })).status, 200);
  const log = fs.readFileSync(cfg.auditLogPath as string, 'utf8');
  assert.match(log, /agent=codex promptChars=\d+ exit=0/);
  assert.ok(!log.includes('texto-confidencial-xyz'));
});

test('sin sesion en la CLI: propose -> 409 (el usuario debe iniciar sesion el mismo)', async () => {
  const port = await startApp(cfgWith({ AGENT_CODEX_BIN_ARGS: JSON.stringify([FAKE, '--fake-agent=codex', '--fake-logged-out']) }));
  const token = await tokenOf(port);
  const r = await call(port, '/propose', { token, body: { agent: 'codex', prompt: 'hola' } });
  assert.equal(r.status, 409);
  assert.match(r.json.error, /no hay sesión/);
});

test('CLI no instalada: propose -> 409', async () => {
  const cfg = cfgWith();
  cfg.agents.claude.bin = null;
  const port = await startApp(cfg);
  const r = await call(port, '/propose', { token: await tokenOf(port), body: { agent: 'claude', prompt: 'hola' } });
  assert.equal(r.status, 409);
  assert.match(r.json.error, /no está instalado/);
});

test('limite de tiempo: mata la CLI y responde 504', async () => {
  const port = await startApp(cfgWith({ AGENT_CLAUDE_BIN_ARGS: JSON.stringify([FAKE, '--fake-agent=claude', '--fake-sleep']), AGENT_TIMEOUT_MS: '700' }));
  const token = await tokenOf(port);
  const p = (await call(port, '/propose', { token, body: { agent: 'claude', prompt: 'lento' } })).json;
  const r = await call(port, '/confirm', { token, body: { requestId: p.requestId } });
  assert.equal(r.status, 504);
});

test('limite de salida: corta en 200 KB y lo indica', async () => {
  const port = await startApp(cfgWith({ AGENT_CLAUDE_BIN_ARGS: JSON.stringify([FAKE, '--fake-agent=claude', '--fake-big']) }));
  const token = await tokenOf(port);
  const p = (await call(port, '/propose', { token, body: { agent: 'claude', prompt: 'grande' } })).json;
  const r = await call(port, '/confirm', { token, body: { requestId: p.requestId } });
  assert.equal(r.status, 200);
  assert.equal(r.json.truncated, true);
  assert.ok(r.json.text.length <= 200_000);
});

test('ritmo: dos ejecuciones seguidas -> la segunda recibe 429', async () => {
  const port = await startApp(cfgWith({}, { minIntervalMs: 60_000 }));
  const token = await tokenOf(port);
  const a = (await call(port, '/propose', { token, body: { agent: 'claude', prompt: 'uno' } })).json;
  const b = (await call(port, '/propose', { token, body: { agent: 'claude', prompt: 'dos' } })).json;
  assert.equal((await call(port, '/confirm', { token, body: { requestId: a.requestId } })).status, 200);
  assert.equal((await call(port, '/confirm', { token, body: { requestId: b.requestId } })).status, 429);
});

test('bundledCodexExe elige el codex.exe mas reciente de la app y defaultConfig lo usa sin node ni shell', () => {
  const local = fs.mkdtempSync(path.join(tmp, 'localappdata-'));
  const bin = path.join(local, 'OpenAI', 'Codex', 'bin');
  const old = path.join(bin, 'aaaa'); const fresh = path.join(bin, 'bbbb');
  fs.mkdirSync(old, { recursive: true }); fs.mkdirSync(fresh, { recursive: true });
  fs.writeFileSync(path.join(old, 'codex.exe'), 'x'); fs.writeFileSync(path.join(fresh, 'codex.exe'), 'y');
  fs.utimesSync(path.join(old, 'codex.exe'), new Date(2026, 0, 1), new Date(2026, 0, 1));
  fs.utimesSync(path.join(fresh, 'codex.exe'), new Date(2026, 9, 1), new Date(2026, 9, 1));
  assert.equal(bundledCodexExe({ LOCALAPPDATA: local } as NodeJS.ProcessEnv), path.join(fresh, 'codex.exe'));
  const cfg = defaultConfig({ LOCAL_AGENT: '1', LOCALAPPDATA: local } as NodeJS.ProcessEnv);
  assert.equal(cfg.agents.codex.bin, path.join(fresh, 'codex.exe'));
  assert.deepEqual(cfg.agents.codex.binPrefixArgs, []);
  assert.equal(bundledCodexExe({ LOCALAPPDATA: path.join(tmp, 'no-existe') } as NodeJS.ProcessEnv), null);
});

test('scrubbedEnv quita claves y tokens pero conserva PATH', () => {
  const env = scrubbedEnv({ PATH: 'p', GEMINI_API_KEY: 'a', GROQ_API_KEY: 'b', ANTHROPIC_API_KEY: 'c', OPENAI_API_KEY: 'd', MY_TOKEN: 'e', CLAUDE_CODE_OAUTH_TOKEN: 'f', USERPROFILE: 'u' } as NodeJS.ProcessEnv);
  assert.deepEqual(Object.keys(env).sort(), ['PATH', 'USERPROFILE']);
});
