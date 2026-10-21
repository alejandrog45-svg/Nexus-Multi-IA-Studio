import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

// Portón de acceso: con ACCESS_CODE todo exige contraseña salvo /api/health; sin ACCESS_CODE queda abierto.
const port = 39600 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${port}`;
const app = spawn(process.execPath, ['--import', 'tsx', 'server.ts', '--prod'], {
  env: { ...process.env, PORT: String(port), GEMINI_API_KEY: 'clave-falsa-de-prueba', ACCESS_CODE: 'secreto-123' },
  stdio: 'ignore',
});
after(() => { app.kill(); });

const basic = (pw: string) => ({ Authorization: `Basic ${Buffer.from(`user:${pw}`).toString('base64')}` });

test('portón de acceso con ACCESS_CODE', async () => {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* esperando */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  const sin = await fetch(`${base}/api/quota`);
  assert.equal(sin.status, 401);
  assert.match(sin.headers.get('www-authenticate') || '', /Basic/);
  assert.equal((await fetch(`${base}/api/quota`, { headers: basic('mala') })).status, 401);
  assert.equal((await fetch(`${base}/api/quota`, { headers: basic('secreto-123') })).status, 200);
});
