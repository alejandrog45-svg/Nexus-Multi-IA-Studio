import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';
import { chromium, Browser } from 'playwright-core';

// E2E del agente local en el navegador, con CLIs FALSAS (no toca Claude Code ni Codex reales).
const EXE = process.env.NEXUS_BROWSER_EXE ||
  'W:\\PROYECTOS CUENTA ALEJANDROG45\\herramientas-portables\\playwright-browsers\\chromium_headless_shell-1223\\chrome-headless-shell-win64\\chrome-headless-shell.exe';
const HAS_BROWSER = fs.existsSync(EXE);
const opts = { skip: HAS_BROWSER ? false : `no hay navegador en ${EXE}` };
const FAKE = path.resolve('test/fixtures/fake-cli.mjs');

let app: ChildProcess;
let browser: Browser;
let base = '';

before(async () => {
  if (!HAS_BROWSER) return;
  const port = 39600 + Math.floor(Math.random() * 300);
  base = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env, PORT: String(port), LOCAL_AGENT: '1', AGENT_ALLOW_TEST_OVERRIDE: '1',
    AGENT_CLAUDE_BIN: process.execPath, AGENT_CLAUDE_BIN_ARGS: JSON.stringify([FAKE, '--fake-agent=claude']),
    AGENT_CODEX_BIN: process.execPath, AGENT_CODEX_BIN_ARGS: JSON.stringify([FAKE, '--fake-agent=codex', '--fake-logged-out']),
  } as NodeJS.ProcessEnv;
  delete env.GEMINI_API_KEY;
  app = spawn(process.execPath, ['--import', 'tsx', 'server.ts', '--prod'], { env, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* esperando */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  browser = await chromium.launch({ executablePath: EXE, headless: true });
});

after(async () => { await browser?.close(); app?.kill(); });

test('tarjeta Claude conectada por CLI local: confirma el comando y muestra la respuesta rotulada; ChatGPT sin sesion sigue asistido', opts, async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(base);
  const claudeInput = page.getByPlaceholder('Instrucción directa a Claude (Anthropic)...');
  await claudeInput.waitFor({ timeout: 10000 });
  // ChatGPT (CLI sin sesion): sigue en modo asistido
  assert.equal(await page.getByPlaceholder('Instrucción directa a ChatGPT (OpenAI)...').count(), 0);

  let dialogText = '';
  page.once('dialog', async (d) => { dialogText = d.message(); await d.accept(); });
  await claudeInput.fill('Dime hola desde la CLI');
  await claudeInput.press('Enter');
  await page.getByText('FAKE claude').first().waitFor({ timeout: 15000 });

  assert.match(dialogText, /Se ejecutará en tu PC/);
  assert.match(dialogText, /--tools/);
  assert.match(dialogText, /sin claves del servidor/);
  assert.ok(await page.getByText('tu suscripción').count() > 0, 'el mensaje indica que es la CLI local con tu suscripción');
  await ctx.close();
});

test('si el usuario cancela el dialogo no se ejecuta nada', opts, async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(base);
  const claudeInput = page.getByPlaceholder('Instrucción directa a Claude (Anthropic)...');
  await claudeInput.waitFor({ timeout: 10000 });
  page.once('dialog', (d) => d.dismiss());
  await claudeInput.fill('No ejecutar esto');
  await claudeInput.press('Enter');
  await page.waitForTimeout(1500);
  assert.equal(await page.getByText('FAKE claude').count(), 0);
  await ctx.close();
});
