// Genera V6_pie_original_compositor con el Compositor de Flyer de la app (sin IA), respetando la estructura de V1-V5.
// Requisitos: la app corriendo (npm start) y un navegador Chromium. Uso: node scripts/generar_v6.mjs
// Variables: NEXUS_URL (por defecto http://127.0.0.1:3950/), NEXUS_BROWSER_EXE (ruta al chrome-headless-shell).
import { chromium } from 'playwright-core';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.NEXUS_URL || 'http://127.0.0.1:3950/';
const EXE = process.env.NEXUS_BROWSER_EXE ||
  'W:\\PROYECTOS CUENTA ALEJANDROG45\\herramientas-portables\\playwright-browsers\\chromium_headless_shell-1223\\chrome-headless-shell-win64\\chrome-headless-shell.exe';
const ROOT = path.resolve('src/assets/images/entregas_vigentes');
const SRC = path.join(ROOT, '01_OVIEDO_FORMATOS');
const VERSION = 'V6_pie_original_compositor';
const OUT = path.join(ROOT, VERSION);

const sha = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const dims = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

// Texto que YA aparece en el flyer original (A) y en V3 (www.oviedo.cl, B). No se inventa nada.
const LINEAS_A = ['SUCURSAL OVIEDO FERRETERÍAS EL MANZANO', 'Carretera H66 KM 60 S/N', '6 DE NOVIEMBRE · HORARIO CONTINUADO'];
const LINEAS_B = ['FERIA FERRETERA EL MANZANO 2026', '¡TE ESPERAMOS!  ·  6 DE NOVIEMBRE', 'www.oviedo.cl'];
// Recorte exacto del logo del flyer (porcentajes de la imagen). Cada formato lo tiene en otra posicion.
const LOGO_FEED = { x: 37.8, y: 1.3, w: 24.5, h: 7.7 };
const LOGO_HIST = { x: 32.5, y: 1.2, w: 35.5, h: 8.2 };

const PIEZAS = [
  { variante: 'A', formato: 'feed', carpeta: 'feed_1080x1350', original: '01_flyer_oviedo_instagram_feed_4x5.jpg', nombre: 'FERIA_FERRETERA_2026_V6_A_logo_original_feed.png', lineas: LINEAS_A, logo: LOGO_FEED },
  { variante: 'A', formato: 'historia', carpeta: 'historia_1080x1920', original: '02_flyer_oviedo_instagram_historia_9x16.jpg', nombre: 'FERIA_FERRETERA_2026_V6_A_logo_original_historia.png', lineas: LINEAS_A, logo: LOGO_HIST },
  { variante: 'B', formato: 'feed', carpeta: 'feed_1080x1350', original: '01_flyer_oviedo_instagram_feed_4x5.jpg', nombre: 'FERIA_FERRETERA_2026_V6_B_titular_web_feed.png', lineas: LINEAS_B, logo: null },
  { variante: 'B', formato: 'historia', carpeta: 'historia_1080x1920', original: '02_flyer_oviedo_instagram_historia_9x16.jpg', nombre: 'FERIA_FERRETERA_2026_V6_B_titular_web_historia.png', lineas: LINEAS_B, logo: null },
];

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE_URL);
await page.getByRole('button', { name: /^Biblioteca/ }).click();
const originales = [...new Set(PIEZAS.map((p) => p.original))];
await page.locator('input[type="file"]').last().setInputFiles(originales.map((o) => path.join(SRC, o)));
await page.getByText(originales[0]).first().waitFor({ timeout: 20000 });
await page.keyboard.press('Escape');
await page.getByRole('button', { name: /Compositor/ }).click();
await page.getByTestId('reporte-originalidad').waitFor({ timeout: 20000 });

const resultado = [];
for (const p of PIEZAS) {
  await page.getByLabel('Imagen base').selectOption({ label: p.original });
  await page.waitForTimeout(1200);
  await page.getByLabel('Texto del pie').fill(p.lineas.join('\n'));
  const chk = page.getByRole('checkbox', { name: /Reusar el logo/ });
  await chk.setChecked(!!p.logo);
  if (p.logo) for (const k of ['x', 'y', 'w', 'h']) await page.getByLabel(`Logo ${k}`, { exact: true }).fill(String(p.logo[k]));
  await page.waitForTimeout(1200);
  const rep = (await page.getByTestId('reporte-originalidad').innerText()).replace(/\n/g, ' ');
  const diff = Number(rep.match(/zona original: (\d+)/)[1]);
  const franjaDesde = Number(rep.match(/desde y=(\d+)/)[1]);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Descargar PNG/ }).click()]);
  fs.mkdirSync(path.join(OUT, p.carpeta), { recursive: true });
  const destino = path.join(OUT, p.carpeta, p.nombre);
  await dl.saveAs(destino);
  resultado.push({ ...p, destino, diff, franjaDesde });
  console.log(`${p.variante} ${p.formato.padEnd(8)} franja desde y=${franjaDesde}  px modificados (en la app)=${diff}  -> ${p.nombre}`);
}

// Prueba INDEPENDIENTE sobre los archivos ya guardados: compara la zona original del PNG exportado con el flyer original.
const verif = await ctx.newPage();
await verif.goto('about:blank');
for (const r of resultado) {
  const b64 = (f) => fs.readFileSync(f).toString('base64');
  const mime = (f) => (/\.jpe?g$/i.test(f) ? 'image/jpeg' : 'image/png');
  r.diffArchivo = await verif.evaluate(async ({ a, am, b, bm, rows }) => {
    const load = (d, m) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = `data:${m};base64,${d}`; });
    const [ia, ib] = await Promise.all([load(a, am), load(b, bm)]);
    const w = ia.naturalWidth;
    const get = (img) => { const c = document.createElement('canvas'); c.width = w; c.height = img.naturalHeight; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, rows).data; };
    const da = get(ia), db = get(ib);
    let n = 0; for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) n++;
    return n;
  }, { a: b64(path.join(SRC, r.original)), am: mime(r.original), b: b64(r.destino), bm: mime(r.destino), rows: r.franjaDesde });
  console.log(`verificacion en el archivo guardado: ${r.nombre} -> ${r.diffArchivo} px distintos en la zona original`);
}
await browser.close();

// Manifiesto y README con la misma estructura que V1-V5
const piezas = resultado.map((r) => ({
  archivo: `${r.carpeta}/${r.nombre}`,
  dimensiones: dims(r.destino),
  original_intacto: r.original,
  sha256: sha(r.destino),
  pixeles_modificados_zona_original: r.diffArchivo,
  recursos: [
    { role: 'flyer_original', source: r.original, sha256: sha(path.join(SRC, r.original)), transform: 'sin_cambios', content_box: [0, 0, dims(r.destino)[0], r.franjaDesde] },
    ...(r.logo ? [{ role: 'logo_original', source: r.original, transform: 'recorte_exacto_del_flyer_sin_escalar_de_forma_distinta', rect_porcentaje: r.logo }] : []),
    { role: 'texto_pie', lineas: r.lineas, transform: 'texto_dibujado_en_franja_libre' },
  ],
}));
const manifiesto = {
  version: VERSION,
  estado: 'BORRADOR_SIN_APROBAR',
  descripcion: 'Variantes A y B: flyer ORIGINAL intacto + pie en la franja negra libre, hechas con el Compositor de Flyer (sin IA).',
  generado_con: 'Compositor de Flyer de la app Nexus (scripts/generar_v6.mjs)',
  piezas,
};
fs.writeFileSync(path.join(OUT, 'MANIFIESTO.json'), JSON.stringify(manifiesto, null, 2).replace(/\n/g, '\r\n'), 'utf8');
const readme = [
  `# ${VERSION}`,
  '',
  '- Qué contiene: 4 variantes nuevas (A: pie con el recorte exacto del logo y los datos del flyer; B: pie con titular, fecha y www.oviedo.cl) en feed 1080x1350 e historia 1080x1920. El flyer ORIGINAL queda intacto píxel a píxel; solo se rellena la franja negra libre. Manifiesto con hashes y con la comprobación de 0 píxeles modificados.',
  '- Quién la usa: el dueño, para revisar. BORRADOR.',
  '- Se regenera con `node scripts/generar_v6.mjs` (app corriendo con `npm start`). Las versiones V1 a V5 no se tocan.',
  '',
].join('\r\n');
fs.writeFileSync(path.join(OUT, 'README.md'), readme, 'utf8');
const malos = resultado.filter((r) => r.diff !== 0 || r.diffArchivo !== 0);
console.log(malos.length ? `ATENCION: ${malos.length} pieza(s) con pixeles modificados` : `OK: ${resultado.length} piezas, 0 pixeles modificados en la zona original (app y archivo guardado)`);
process.exit(malos.length ? 1 : 0);
