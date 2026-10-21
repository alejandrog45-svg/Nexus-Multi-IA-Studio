// CLI falsa para probar server/localAgent.ts sin tocar Claude Code ni Codex reales.
// Banderas de prueba (van como argumentos previos): --fake-agent=<claude|codex> --fake-logged-out --fake-sleep --fake-big
const all = process.argv.slice(2);
const flags = all.filter((a) => a.startsWith('--fake-'));
const rest = all.filter((a) => !a.startsWith('--fake-'));
const agent = (flags.find((f) => f.startsWith('--fake-agent=')) || '').split('=')[1] || 'claude';
const loggedOut = flags.includes('--fake-logged-out');

if (rest[0] === 'auth') {
  console.log(JSON.stringify({ loggedIn: !loggedOut, authMethod: loggedOut ? 'none' : 'claude.ai' }));
  process.exit(0);
}
if (rest[0] === 'login') {
  console.log(loggedOut ? 'Not logged in' : 'Logged in using ChatGPT');
  process.exit(loggedOut ? 1 : 0);
}

let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { stdin += c; });
process.stdin.on('end', async () => {
  if (flags.includes('--fake-sleep')) await new Promise((r) => setTimeout(r, 10_000));
  if (flags.includes('--fake-big')) { process.stdout.write('x'.repeat(400_000)); return; }
  console.log(`FAKE ${agent}`);
  console.log(`ARGS=${JSON.stringify(rest)}`);
  console.log(`CWD=${process.cwd()}`);
  console.log(`LEAK=${process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY ? 'YES' : 'NO'}`);
  console.log(`STDIN=${stdin}`);
});
