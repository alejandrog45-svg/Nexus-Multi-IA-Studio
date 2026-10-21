import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn, ChildProcess } from 'node:child_process';
import { chromium, Browser, Page } from 'playwright-core';

// E2E con navegador headless real contra el servidor en modo produccion (sin clave, sin red).
// Navegador: NEXUS_BROWSER_EXE o el headless-shell de herramientas-portables de W:. Si no existe, se omite.
const EXE = process.env.NEXUS_BROWSER_EXE ||
  'W:\\PROYECTOS CUENTA ALEJANDROG45\\herramientas-portables\\playwright-browsers\\chromium_headless_shell-1223\\chrome-headless-shell-win64\\chrome-headless-shell.exe';
const HAS_BROWSER = fs.existsSync(EXE);
const opts = { skip: HAS_BROWSER ? false : `no hay navegador en ${EXE}` };

let app: ChildProcess;
let browser: Browser;
let base = '';
const MARCA = `contexto-de-prueba-${Date.now()}`;

before(async () => {
  if (!HAS_BROWSER) return;
  const port = 39500 + Math.floor(Math.random() * 400);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port) } as NodeJS.ProcessEnv;
  delete env.GEMINI_API_KEY;
  app = spawn(process.execPath, ['--import', 'tsx', 'server.ts', '--prod'], { env, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* esperando */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  browser = await chromium.launch({ executablePath: EXE, headless: true });
});

after(async () => { await browser?.close(); app?.kill(); });

const contextBox = (p: Page) => p.locator('textarea').first();

test('el contexto se guarda en IndexedDB y sobrevive a recargar', opts, async () => {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(base);
  await contextBox(page).waitFor();
  await contextBox(page).fill(MARCA);
  await page.waitForTimeout(1500); // autoguardado con retardo de 800 ms
  await page.reload();
  await contextBox(page).waitFor();
  await page.waitForFunction((m) => (document.querySelector('textarea') as HTMLTextAreaElement)?.value === m, MARCA, { timeout: 8000 });
  assert.equal(await contextBox(page).inputValue(), MARCA);
  await ctx.close();
});

test('el respaldo JSON descargable contiene el contexto guardado', opts, async () => {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(base);
  await contextBox(page).waitFor();
  await contextBox(page).fill(MARCA + '-respaldo');
  await page.waitForTimeout(1500);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('button[title^="Respaldar"]').click(),
  ]);
  const path = await download.path();
  const json = JSON.parse(fs.readFileSync(path, 'utf8'));
  assert.equal(json.projectContext, MARCA + '-respaldo');
  assert.ok(Array.isArray(json.messages) && Array.isArray(json.files));
  await ctx.close();
});

test('carpeta local: carga archivos normales y omite .env y .pem; persiste tras recargar', opts, async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  // Script como texto: si fuera una funcion, tsx le inyectaria helpers (__name) que no existen en el navegador.
  await page.addInitScript(`
    const mk = (name, text) => ({ kind: 'file', name, getFile: async () => new File([text], name, { type: 'text/plain' }) });
    window.showDirectoryPicker = async () => ({
      name: 'carpeta-demo',
      kind: 'directory',
      async *values() {
        yield mk('.env', 'CLAVE=secreta');
        yield mk('llave.pem', 'contenido');
        yield mk('credentials.json', '{}');
        yield mk('bueno-demo.ts', 'export const a = 1;');
      },
    });
  `);
  await page.goto(base);
  await contextBox(page).waitFor();
  await page.getByRole('button', { name: /Archivos Adjuntos/ }).click();
  await page.getByRole('button', { name: /Abrir Carpeta/ }).click();
  await page.getByText('bueno-demo.ts').first().waitFor({ timeout: 8000 });
  assert.equal(await page.getByText('llave.pem').count(), 0);
  assert.equal(await page.getByText('credentials.json').count(), 0);
  assert.equal(await page.getByText(/^\.env$/).count(), 0);
  await page.waitForTimeout(1500);
  await page.reload();
  await page.getByRole('button', { name: /Archivos Adjuntos/ }).click();
  await page.getByText('bueno-demo.ts').first().waitFor({ timeout: 8000 });
  await ctx.close();
});
