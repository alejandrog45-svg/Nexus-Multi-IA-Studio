import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectFreeStrip, countDifferentPixels, originalSharePercent, contactLine } from '../src/services/flyerComposer';

function image(w: number, h: number, paint: (x: number, y: number) => [number, number, number]) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = paint(x, y); const i = (y * w + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
  return d;
}

test('detecta la franja negra inferior y respeta el contenido', () => {
  const d = image(90, 100, (_x, y) => (y < 70 ? [200, 30, 30] : [0, 0, 0]));
  const y = detectFreeStrip(d, 90, 100);
  assert.ok(y >= 70 && y <= 73, `esperaba ~70-73, obtuve ${y}`);
});

test('sin franja libre devuelve la altura completa', () => {
  const d = image(60, 40, () => [120, 120, 120]);
  assert.equal(detectFreeStrip(d, 60, 40), 40);
});

test('un detalle claro dentro de la franja la acorta (no pisa contenido)', () => {
  const d = image(90, 100, (x, y) => (y < 60 ? [200, 30, 30] : x === 3 && y === 85 ? [255, 255, 255] : [0, 0, 0]));
  const y = detectFreeStrip(d, 90, 100);
  assert.ok(y >= 85, `la franja debe empezar bajo el detalle, obtuve ${y}`);
});

test('countDifferentPixels: 0 si son iguales y cuenta solo las filas pedidas', () => {
  const a = image(10, 10, () => [10, 20, 30]);
  const b = new Uint8ClampedArray(a);
  assert.equal(countDifferentPixels(a, b, 10, 10), 0);
  b[(9 * 10 + 4) * 4] = 99; // cambia un pixel en la fila 9
  assert.equal(countDifferentPixels(a, b, 10, 10), 1);
  assert.equal(countDifferentPixels(a, b, 10, 5), 0); // fuera de las filas comparadas
});

test('originalSharePercent: porcentaje de lienzo que es original', () => {
  assert.equal(originalSharePercent(864, 1536, 1536, 1215), 79.1);
  assert.equal(originalSharePercent(100, 100, 120, 100), 83.3);
});

test('contactLine solo usa lo que el usuario escribio', () => {
  assert.equal(contactLine({ instagram: '', facebook: '', whatsapp: '' }), '');
  assert.equal(contactLine({ instagram: '@a', facebook: '', whatsapp: '+56 9 0000 0000' }), 'Instagram @a  ·  WhatsApp +56 9 0000 0000');
});
