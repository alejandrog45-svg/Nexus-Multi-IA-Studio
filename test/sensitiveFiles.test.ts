import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSensitiveFile, isSensitiveFileName, hasSensitiveContent } from '../src/services/sensitiveFiles';

test('bloquea nombres tipicos de secretos', () => {
  for (const n of ['.env', '.env.local', 'C:\\x\\.env.production', 'id_rsa', 'server.pem', 'api.key', 'credentials.json', 'secrets.yaml', '.npmrc']) {
    assert.equal(isSensitiveFileName(n), true, n);
  }
});

test('permite archivos normales', () => {
  for (const n of ['App.tsx', 'README.md', 'package.json', 'environment.ts', 'keyboard.ts', 'monkey.js', 'notas.txt']) {
    assert.equal(isSensitiveFileName(n), false, n);
  }
});

test('detecta claves y tokens en el contenido (valores falsos armados por concatenacion)', () => {
  const googleKey = 'AIza' + 'x'.repeat(35);
  const pem = '-----BEGIN ' + 'RSA PRIVATE KEY-----';
  const ghToken = 'ghp' + '_' + 'a'.repeat(30);
  assert.equal(hasSensitiveContent(`const k = "${googleKey}"`), true);
  assert.equal(hasSensitiveContent(pem), true);
  assert.equal(hasSensitiveContent(ghToken), true);
  assert.equal(hasSensitiveContent('const saludo = "hola mundo";'), false);
  assert.equal(hasSensitiveContent(''), false);
});

test('isSensitiveFile combina nombre y contenido', () => {
  assert.equal(isSensitiveFile('.env', 'A=1'), true);
  assert.equal(isSensitiveFile('notas.txt', 'AIza' + 'y'.repeat(35)), true);
  assert.equal(isSensitiveFile('notas.txt', 'texto inocente'), false);
});
