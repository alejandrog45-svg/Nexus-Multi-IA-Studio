// Blindaje de secretos: .env.example es publico (repo publico); las claves reales van solo en .env.local (ignorado por git).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

test('.env.example no contiene claves con forma real', () => {
  const t = read('.env.example');
  const patrones = [/gsk_[A-Za-z0-9]{20,}/, /AQ\.Ab8[A-Za-z0-9_-]{20,}/, /AIza[0-9A-Za-z_-]{30,}/, /sk-(or-)?[A-Za-z0-9]{30,}/, /gh[pous]_[A-Za-z0-9]{30,}/, /github_pat_[A-Za-z0-9_]{30,}/, /GOCSPX-[A-Za-z0-9_-]{15,}/];
  for (const p of patrones) assert.doesNotMatch(t, p, `.env.example contiene algo parecido a una clave (${p}); muevela a .env.local`);
});

test('las claves *_API_KEY de .env.example estan vacias o con marcador', () => {
  for (const line of read('.env.example').split('\n')) {
    const m = line.match(/^(GEMINI|GROQ|OPENROUTER)_API_KEY\s*=\s*"?([^"\r\n#]*)"?/);
    if (m) assert.ok(m[2].trim() === '' || /^(MY_|TU_|YOUR_|<)/i.test(m[2].trim()), `${m[1]}_API_KEY de .env.example debe estar vacia o ser un marcador`);
  }
});

test('.gitignore protege .env* pero deja publico .env.example', () => {
  const g = read('.gitignore');
  assert.match(g, /^\.env\*/m);
  assert.match(g, /^!\.env\.example/m);
});