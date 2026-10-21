import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listProviders, providerConfig, isProviderId } from '../server/providers';

test('sin claves: ningun proveedor figura como configurado y se usan modelos por defecto', () => {
  const list = listProviders({} as NodeJS.ProcessEnv);
  assert.deepEqual(list.map((p) => [p.id, p.configured]), [['groq', false], ['openrouter', false]]);
  assert.equal(providerConfig('groq', {} as NodeJS.ProcessEnv).model, 'llama-3.3-70b-versatile');
});

test('con claves: configured=true, el modelo se puede cambiar y la clave nunca aparece en la lista publica', () => {
  const env = { GROQ_API_KEY: 'clave-secreta-falsa', GROQ_MODEL: 'otro-modelo', OPENROUTER_API_KEY: ' ' } as unknown as NodeJS.ProcessEnv;
  const list = listProviders(env);
  assert.equal(list[0].configured, true);
  assert.equal(list[0].model, 'otro-modelo');
  assert.equal(list[1].configured, false); // solo espacios = sin clave
  assert.ok(!JSON.stringify(list).includes('clave-secreta-falsa'));
});

test('isProviderId solo acepta ids conocidos', () => {
  assert.equal(isProviderId('groq'), true);
  assert.equal(isProviderId('openrouter'), true);
  assert.equal(isProviderId('openai'), false);
  assert.equal(isProviderId(undefined), false);
});
