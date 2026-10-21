import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QuotaTracker, ResponseCache } from '../server/quotaCache';

test('rota al modelo menos usado', () => {
  const q = new QuotaTracker(['a', 'b'], 20);
  assert.deepEqual(q.order(), ['a', 'b']);
  q.record('a');
  assert.deepEqual(q.order(), ['b', 'a']);
});

test('respeta el tope diario y deja de ofrecer el modelo', () => {
  const q = new QuotaTracker(['a', 'b'], 2);
  q.record('a'); q.record('a');
  assert.deepEqual(q.order(), ['b']);
  q.record('b'); q.record('b');
  assert.deepEqual(q.order(), []);
});

test('el modelo preferido va primero si esta disponible', () => {
  const q = new QuotaTracker(['a', 'b'], 20);
  q.record('b');
  assert.deepEqual(q.order('b'), ['b', 'a']);
  assert.deepEqual(q.order('zzz'), ['a', 'b']);
});

test('429 por minuto bloquea 60 s; por dia bloquea hasta fin del dia', () => {
  let t = Date.UTC(2026, 9, 21, 10, 0, 0);
  const q = new QuotaTracker(['a', 'b'], 20, () => t);
  q.markLimited('a', 'rate limit exceeded');
  assert.deepEqual(q.order(), ['b']);
  t += 61_000;
  assert.deepEqual(q.order(), ['a', 'b']);
  q.markLimited('a', 'Quota exceeded: GenerateRequestsPerDayPerProjectPerModel');
  t += 3 * 3600_000;
  assert.deepEqual(q.order(), ['b']);
});

test('los contadores se reinician al cambiar de dia', () => {
  let t = Date.UTC(2026, 9, 21, 23, 0, 0);
  const q = new QuotaTracker(['a'], 1, () => t);
  q.record('a');
  assert.deepEqual(q.order(), []);
  t += 2 * 3600_000;
  assert.deepEqual(q.order(), ['a']);
  assert.equal(q.stats().models[0].used, 0);
});

test('cache: acierta, expira y respeta el maximo', () => {
  let t = 0;
  const c = new ResponseCache(1000, 2, () => t);
  const k = ResponseCache.key({ p: 'hola' });
  assert.equal(c.get(k), null);
  c.set(k, 'respuesta');
  assert.equal(c.get(k), 'respuesta');
  assert.equal(ResponseCache.key({ p: 'hola' }), k);
  t += 1500;
  assert.equal(c.get(k), null);
  c.set('1', 'a'); c.set('2', 'b'); c.set('3', 'c');
  assert.equal(c.size(), 2);
  assert.equal(c.get('1'), null);
  c.set('vacio', '');
  assert.equal(c.get('vacio'), null);
});
