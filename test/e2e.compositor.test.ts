import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { spawn, ChildProcess } from 'node:child_process';
import { chromium, Browser, Page } from 'playwright-core';

// E2E del Compositor de Flyer con imagenes SINTETICAS (no dependen de archivos del usuario).
const EXE = process.env.NEXUS_BROWSER_EXE ||
  'W:\\PROYECTOS CUENTA ALEJANDROG45\\herramientas-portables\\playwright-browsers\\chromium_headless_shell-1223\\chrome-headless-shell-win64\\chrome-headless-shell.exe';
const HAS_BROWSER = fs.existsSync(EXE);
const opts = { skip: HAS_BROWSER ? false : `no hay navegador en ${EXE}` };

// Minimal PNG encoder (RGBA) so the test needs no image library
function crc32(buf: Buffer) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w: number, h: number, paint: (x: number, y: number) => [number, number, number]) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) { const [r, g, b] = paint(x, y); const i = y * (w * 4 + 1) + 1 + x * 4; raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = 255; }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const dims = (b: Buffer) => ({ w: b.readUInt32BE(16), h: b.readUInt32BE(20) });

const CON_FRANJA = png(120, 200, (x, y) => (y < 150 ? [30 + (x % 90), 60 + (y % 120), 180] : [0, 0, 0]));
const SIN_FRANJA = png(120, 100, (x, y) => [200 - (x % 50), 40 + (y % 80), 70]);

let app: ChildProcess;
let browser: Browser;
let base = '';

before(async () => {
  if (!HAS_BROWSER) return;
  const port = 39800 + Math.floor(Math.random() * 90);
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

async function openComposerWith(page: Page, files: { name: string; buffer: Buffer }[]) {
  await page.goto(base);
  await page.getByRole('button', { name: /^Biblioteca/ }).click();
  await page.locator('input[type="file"]').last().setInputFiles(files.map(f => ({ name: f.name, mimeType: 'image/png', buffer: f.buffer })));
  await page.getByText(files[0].name).first().waitFor({ timeout: 8000 });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Compositor/ }).click();
  await page.getByTestId('reporte-originalidad').waitFor({ timeout: 10000 });
}
const download = async (page: Page) => {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Descargar PNG/ }).click()]);
  return fs.readFileSync((await dl.path()) as string);
};

test('con franja libre: la detecta, deja 0 pixeles modificados y exporta un PNG del mismo tamano', opts, async () => {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  await openComposerWith(page, [{ name: 'BASE_SIN_EDITAR_prueba.png', buffer: CON_FRANJA }]);
  assert.equal(await page.getByTestId('pixeles-modificados').innerText(), '0');
  const y = Number((await page.getByTestId('reporte-originalidad').innerText()).match(/desde y=(\d+)/)?.[1]);
  assert.ok(y >= 150 && y <= 153, `la franja debe empezar cerca de 150, fue ${y}`);

  // cambiar el texto y el logo sigue sin tocar la zona original
  await page.getByLabel('Texto del pie').fill('LINEA UNO\nLINEA DOS');
  await page.getByLabel('Contacto instagram').fill('@prueba_demo');
  await page.waitForTimeout(400);
  assert.equal(await page.getByTestId('pixeles-modificados').innerText(), '0');

  const out = await download(page);
  assert.deepEqual(dims(out), { w: 120, h: 200 });
  await ctx.close();
});

test('sin franja libre: agrega una banda abajo y la imagen original sigue intacta', opts, async () => {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  await openComposerWith(page, [{ name: 'sin-franja.png', buffer: SIN_FRANJA }]);
  const txt = await page.getByTestId('reporte-originalidad').innerText();
  assert.match(txt, /se añadió una banda/);
  assert.equal(await page.getByTestId('pixeles-modificados').innerText(), '0');
  const out = await download(page);
  assert.deepEqual(dims(out), { w: 120, h: 114 }); // 100 + 14 %
  await ctx.close();
});
