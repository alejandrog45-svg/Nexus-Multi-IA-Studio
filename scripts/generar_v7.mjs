// Genera V7_diseno_completo_fotos_borradores: el DISENO COMPLETO de V5 (encabezado, 10%, iconos, direccion, marcas, redes)
// intacto, cambiando SOLO la zona de la foto por fotos reales de BORRADORES/VARIANTES_FONDO_2025. Sin IA.
// Requisitos: Chromium (Playwright). No necesita la app corriendo. Uso: node scripts/generar_v7.mjs
import { chromium } from 'playwright-core';
import { createHash } from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const EXE = process.env.NEXUS_BROWSER_EXE ||
  'W:\\PROYECTOS CUENTA ALEJANDROG45\\herramientas-portables\\playwright-browsers\\chromium_headless_shell-1223\\chrome-headless-shell-win64\\chrome-headless-shell.exe';
const EV = path.resolve('src/assets/images/entregas_vigentes');
const BOR = path.resolve('src/assets/images/BORRADORES');
const VERSION = 'V7_diseno_completo_fotos_borradores';
const OUT = path.join(EV, VERSION);
const sha = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const dimsPng = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

// Plantillas: diseno completo de V5. Zona de foto en filas [y0, y1] (historia medida por diferencia A/B; feed por inspeccion).
const PLANTILLAS = {
  historia: { carpeta: 'historia_1080x1920', archivo: 'V5_fondos_nuevos_fachada/historia_1080x1920/V5_A_fachada_logo_historia.png', zona: [211, 814] },
  feed: { carpeta: 'feed_1080x1350', archivo: 'V5_fondos_nuevos_fachada/feed_1080x1350/V5_A_fachada_logo_feed.png', zona: [211, 659] },
};
// Fotos: cada par comparte plantilla y solo cambia la foto, asi que las filas que difieren son la zona de foto exacta.
const FF = 'VARIANTES_FONDO_2025/';
const P = (n) => `${FF}${n}`;
const H1 = P('VARIANTE_2025_1_HISTORIA_9x16_B_FONDO_ANIVERSARIO_2025_DESPACHO_1080x1920.png');
const H2 = P('VARIANTE_2025_2_HISTORIA_9x16_B_FONDO_ANIVERSARIO_2025_ALFOMBRA_1080x1920.png');
const F3 = P('VARIANTE_2025_3_FEED_4x5_B_FONDO_ANIVERSARIO_2025_ARCO_1080x1350.png');
const F4 = P('VARIANTE_2025_4_FEED_4x5_B_FONDO_ANIVERSARIO_2025_EVENTO_1080x1350.png');
// Cada foto solo se usa donde no hay que AMPLIARLA (sin perder nitidez): las de historia sirven en ambos formatos; las de feed, solo en feed.
const FOTOS = [
  { id: 'despacho', fuente: H1, par: H2, formatos: ['historia', 'feed'] }, { id: 'alfombra', fuente: H2, par: H1, formatos: ['historia', 'feed'] },
  { id: 'arco', fuente: F3, par: F4, formatos: ['feed'] }, { id: 'evento', fuente: F4, par: F3, formatos: ['feed'] },
];

const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const roots = { '/ev/': EV, '/bor/': BOR };
  for (const [k, r] of Object.entries(roots)) if (u.startsWith(k)) { const f = path.join(r, u.slice(k.length)); if (fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'Content-Type': /\.png$/i.test(f) ? 'image/png' : 'image/jpeg' }); return fs.createReadStream(f).pipe(res); } }
  res.writeHead(404); res.end();
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const page = await (await browser.newContext()).newPage();
await page.goto(`${base}/ev/README.md`);

// 1) zona de cada foto de BORRADORES = filas que difieren entre el par
const zonas = {};
for (const f of FOTOS) {
  zonas[f.id] = await page.evaluate(async ({ a, b }) => {
    const L = (u) => new Promise((s, j) => { const i = new Image(); i.onload = () => s(i); i.onerror = j; i.src = u; });
    const [A, B] = await Promise.all([L(a), L(b)]); const w = A.naturalWidth, h = A.naturalHeight;
    const g = (i) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(i, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const da = g(A), db = g(B); let y0 = -1, y1 = -1;
    for (let y = 0; y < h; y++) { let n = 0; for (let x = 0; x < w; x++) { const k = (y * w + x) * 4; if (da[k] !== db[k] || da[k + 1] !== db[k + 1] || da[k + 2] !== db[k + 2]) n++; } if (n / w > 0.15) { if (y0 < 0) y0 = y; y1 = y; } }
    // Recorta justo antes de la banda roja saturada del "10%" de ese diseno (no es parte de la foto).
    for (let y = y0 + 40; y <= y1; y++) { let r = 0, t = 0; for (let x = 0; x < w; x += 2) { const k = (y * w + x) * 4; t++; if (da[k] > 200 && da[k + 1] < 60 && da[k + 2] < 60) r++; } if (r / t > 0.3) { y1 = y - 8; break; } }
    return [y0, y1, w, h];
  }, { a: `${base}/bor/${f.fuente}`, b: `${base}/bor/${f.par}` });
  console.log(`zona de foto ${f.id}: filas ${zonas[f.id][0]}-${zonas[f.id][1]} de ${zonas[f.id][3]}`);
}

// 2) componer: plantilla intacta + foto en su zona (recorte tipo cover, sin deformar)
const piezas = [];
for (const [fmt, t] of Object.entries(PLANTILLAS)) {
  for (const f of FOTOS.filter((x) => x.formatos.includes(fmt))) {
    const [sy0, sy1] = zonas[f.id]; const [ty0, ty1] = t.zona;
    const b64 = await page.evaluate(async ({ tu, su, sy0, sy1, ty0, ty1 }) => {
      const L = (u) => new Promise((s, j) => { const i = new Image(); i.onload = () => s(i); i.onerror = j; i.src = u; });
      const [T, S] = await Promise.all([L(tu), L(su)]); const w = T.naturalWidth, h = T.naturalHeight;
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(T, 0, 0);
      const zw = w, zh = ty1 - ty0 + 1, sw0 = S.naturalWidth, sh0 = sy1 - sy0 + 1;
      const k = Math.max(zw / sw0, zh / sh0); const sw = zw / k, sh = zh / k;
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(S, (sw0 - sw) / 2, sy0 + (sh0 - sh) / 2, sw, sh, 0, ty0, zw, zh);
      return c.toDataURL('image/png').split(',')[1];
    }, { tu: `${base}/ev/${t.archivo}`, su: `${base}/bor/${f.fuente}`, sy0, sy1, ty0, ty1 });
    const nombre = `FERIA_FERRETERA_2026_V7_${f.id}_${fmt}.png`;
    fs.mkdirSync(path.join(OUT, t.carpeta), { recursive: true });
    const destino = path.join(OUT, t.carpeta, nombre);
    fs.writeFileSync(destino, Buffer.from(b64, 'base64'));
    piezas.push({ fmt, t, f, destino, nombre, sy0, sy1, ty0, ty1 });
  }
}

// 3) prueba independiente sobre los archivos guardados: fuera de la zona de foto debe ser identico a la plantilla
for (const p of piezas) {
  p.diff = await page.evaluate(async ({ a, b, y0, y1 }) => {
    const L = (u) => new Promise((s, j) => { const i = new Image(); i.onload = () => s(i); i.onerror = j; i.src = u; });
    const [A, B] = await Promise.all([L(a), L(b)]); const w = A.naturalWidth, h = A.naturalHeight;
    const g = (i) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(i, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const da = g(A), db = g(B); let n = 0;
    for (let y = 0; y < h; y++) { if (y >= y0 && y <= y1) continue; for (let x = 0; x < w; x++) { const k = (y * w + x) * 4; if (da[k] !== db[k] || da[k + 1] !== db[k + 1] || da[k + 2] !== db[k + 2]) n++; } }
    return n;
  }, { a: `${base}/ev/${p.t.archivo}`, b: `${base}/ev/${VERSION}/${p.t.carpeta}/${p.nombre}`, y0: p.ty0, y1: p.ty1 });
  console.log(`${p.nombre.padEnd(52)} px distintos fuera de la zona de foto: ${p.diff}`);
}
await browser.close(); srv.close();

// 4) manifiesto y README con la misma estructura que V1-V6
const man = {
  version: VERSION,
  estado: 'BORRADOR_SIN_APROBAR',
  descripcion: 'Diseno completo de V5 INTACTO con fotos nuevas tomadas de BORRADORES/VARIANTES_FONDO_2025. Solo cambia la zona de la foto.',
  generado_con: 'scripts/generar_v7.mjs (recorte y composicion en canvas, sin IA)',
  piezas: piezas.map((p) => ({
    archivo: `${p.t.carpeta}/${p.nombre}`,
    dimensiones: dimsPng(p.destino),
    original_intacto: path.basename(p.t.archivo),
    sha256: sha(p.destino),
    pixeles_modificados_fuera_de_zona_foto: p.diff,
    recursos: [
      { role: 'plantilla_diseno_completo', source: p.t.archivo, sha256: sha(path.join(EV, p.t.archivo)), transform: 'sin_cambios', zona_foto: [0, p.ty0, dimsPng(p.destino)[0], p.ty1] },
      { role: 'foto_nueva', source: `src/assets/images/BORRADORES/${p.f.fuente}`, sha256: sha(path.join(BOR, p.f.fuente)), transform: 'recorte_cover_de_la_zona_de_foto_sin_deformar', filas_origen: [p.sy0, p.sy1] },
    ],
  })),
};
fs.writeFileSync(path.join(OUT, 'MANIFIESTO.json'), JSON.stringify(man, null, 2).replace(/\n/g, '\r\n'), 'utf8');
fs.writeFileSync(path.join(OUT, 'README.md'), [
  `# ${VERSION}`, '',
  '- Qué contiene: 6 variantes (feed 1080x1350 con 4 fotos e historia 1080x1920 con 2; cada foto solo donde no hay que ampliarla) con el DISEÑO COMPLETO de V5 (encabezado, 10%, íconos, dirección y web, marcas confirmadas y redes) sin cambios; solo cambia la foto, tomada de las variantes de fondo 2025 de BORRADORES. Manifiesto con hashes y con la comprobación de 0 píxeles modificados fuera de la zona de foto.',
  '- Quién la usa: el dueño, para revisar. BORRADOR.',
  '- Se regenera con `node scripts/generar_v7.mjs`. Las versiones V1 a V6 no se tocan.', '',
].join('\r\n'), 'utf8');
const malos = piezas.filter((p) => p.diff !== 0);
console.log(malos.length ? `ATENCION: ${malos.length} pieza(s) con diferencias fuera de la zona` : `OK: ${piezas.length} piezas, 0 pixeles modificados fuera de la zona de foto`);
process.exit(malos.length ? 1 : 0);
