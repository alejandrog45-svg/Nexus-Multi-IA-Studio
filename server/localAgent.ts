// Local agent: lets the app ask the OFFICIAL CLIs (Claude Code, Codex) logged in with the user's own subscription.
// Opt-in (LOCAL_AGENT=1). Four barriers: loopback + same-origin browser only, per-session token,
// fixed command allow-list (prompt goes by stdin, never as arguments), and an explicit confirmation step per run.
// The CLIs run chat-only (no tools / read-only sandbox) in an empty scratch folder with secrets scrubbed from their environment.

import { Router, Request, Response, NextFunction } from 'express';
import { spawn } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isSensitiveFile } from '../src/services/sensitiveFiles';

export type AgentId = 'claude' | 'codex';

export interface AgentDef {
  id: AgentId;
  label: string;
  /** Absolute path of the executable (never resolved through a shell). */
  bin: string | null;
  /** Fixed arguments placed before the allow-listed ones (used by the tests to run a fake CLI through node). */
  binPrefixArgs: string[];
  statusArgs: string[];
  /** Fixed chat arguments. The prompt is written to stdin. */
  chatArgs: string[];
  isLoggedIn: (exitCode: number, output: string) => boolean;
}

export interface AgentConfig {
  enabled: boolean;
  agents: Record<AgentId, AgentDef>;
  scratchDir: string;
  auditLogPath: string | null;
  timeoutMs: number;
  maxOutputBytes: number;
  maxPromptChars: number;
  minIntervalMs: number;
  pendingTtlMs: number;
}

const SECRET_ENV = /KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTH|ANTHROPIC|OPENAI|GEMINI|GROQ|OPENROUTER|CLAUDE_CODE|^GIT_ASKPASS$/i;

/** Environment for the child CLI: no API keys or tokens from this server. The CLI reads its own login files. */
export function scrubbedEnv(src: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(src)) {
    if (v !== undefined && !SECRET_ENV.test(k)) out[k] = v;
  }
  return out;
}

export function defaultConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  const home = os.homedir();
  const allowTestOverride = env.AGENT_ALLOW_TEST_OVERRIDE === '1';
  const prefix = (name: string): string[] => {
    if (!allowTestOverride || !env[name]) return [];
    try { return JSON.parse(env[name] as string); } catch { return []; }
  };
  const first = (...c: (string | undefined)[]) => c.find((p) => p && fs.existsSync(p)) || null;

  const claudeBin = allowTestOverride && env.AGENT_CLAUDE_BIN
    ? env.AGENT_CLAUDE_BIN
    : first(env.AGENT_CLAUDE_EXE, path.join(home, '.local', 'bin', 'claude.exe'), path.join(home, '.local', 'bin', 'claude'));

  // Codex ships as a node script; run it with the current node (no .cmd shim, no shell).
  const codexJs = first(
    env.AGENT_CODEX_JS,
    path.resolve(process.cwd(), '..', 'herramientas-portables', 'npm-global', 'node_modules', '@openai', 'codex', 'bin', 'codex.js')
  );
  const codexBin = allowTestOverride && env.AGENT_CODEX_BIN ? env.AGENT_CODEX_BIN : codexJs ? process.execPath : null;
  const codexPrefix = allowTestOverride && env.AGENT_CODEX_BIN ? prefix('AGENT_CODEX_BIN_ARGS') : codexJs ? [codexJs] : [];

  return {
    enabled: env.LOCAL_AGENT === '1',
    scratchDir: path.resolve(process.cwd(), '.local', 'agent-scratch'),
    auditLogPath: path.resolve(process.cwd(), '.local', 'agent-audit.log'),
    timeoutMs: Number(env.AGENT_TIMEOUT_MS) || 120_000,
    maxOutputBytes: 200_000,
    maxPromptChars: 20_000,
    minIntervalMs: 3_000,
    pendingTtlMs: 120_000,
    agents: {
      claude: {
        id: 'claude',
        label: 'Claude Code (CLI local)',
        bin: claudeBin,
        binPrefixArgs: prefix('AGENT_CLAUDE_BIN_ARGS'),
        statusArgs: ['auth', 'status'],
        chatArgs: ['-p', '--tools', '', '--no-session-persistence', '--output-format', 'text'],
        isLoggedIn: (_c, out) => { try { return JSON.parse(out).loggedIn === true; } catch { return false; } },
      },
      codex: {
        id: 'codex',
        label: 'Codex (CLI local)',
        bin: codexBin,
        binPrefixArgs: codexPrefix,
        statusArgs: ['login', 'status'],
        // Read-only sandbox, ephemeral; prompt via stdin ("-"). Flags to re-verify once Codex is repaired.
        chatArgs: ['exec', '--sandbox', 'read-only', '--skip-git-repo-check', '--ephemeral', '-'],
        isLoggedIn: (code, out) => code === 0 && /logged in/i.test(out),
      },
    },
  };
}

interface RunResult { exitCode: number | null; output: string; timedOut: boolean; truncated: boolean; durationMs: number }

function runCli(cfg: AgentConfig, def: AgentDef, args: string[], stdin: string | null, timeoutMs: number): Promise<RunResult> {
  return new Promise((resolve) => {
    if (!def.bin) return resolve({ exitCode: null, output: '', timedOut: false, truncated: false, durationMs: 0 });
    fs.mkdirSync(cfg.scratchDir, { recursive: true });
    const started = Date.now();
    const child = spawn(def.bin, [...def.binPrefixArgs, ...args], {
      shell: false,
      cwd: cfg.scratchDir,
      env: scrubbedEnv(),
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let out = '';
    let bytes = 0;
    let truncated = false;
    let timedOut = false;
    const onData = (b: Buffer) => {
      if (truncated) return;
      bytes += b.length;
      if (bytes > cfg.maxOutputBytes) { truncated = true; child.kill(); return; }
      out += b.toString('utf8');
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (b: Buffer) => { if (!truncated && out.length < 2000) out += b.toString('utf8'); });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    child.on('error', () => { clearTimeout(timer); resolve({ exitCode: null, output: out, timedOut, truncated, durationMs: Date.now() - started }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ exitCode: code, output: out, timedOut, truncated, durationMs: Date.now() - started }); });
    child.stdin.on('error', () => { /* child may exit early */ });
    if (stdin !== null) child.stdin.end(stdin); else child.stdin.end();
  });
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function previewCommand(def: AgentDef): string {
  const name = path.basename(def.bin || def.id);
  const args = def.chatArgs.map((a) => (a === '' ? '""' : a)).join(' ');
  return `${name} ${args}  (el texto va por stdin, carpeta de trabajo vacía, sin claves del servidor)`;
}

export function createAgentRouter(cfg: AgentConfig = defaultConfig()): Router {
  const router = Router();
  const token = randomBytes(24).toString('hex');
  const pending = new Map<string, { agent: AgentId; text: string; expiresAt: number }>();
  let busy = false;
  let lastRunAt = 0;
  const statusCache = new Map<AgentId, { at: number; value: any }>();

  // Barrier 0: opt-in. Barrier 1: loopback + real browser same-origin (Sec-Fetch-Site cannot be forged by page scripts).
  router.use((req: Request, res: Response, next: NextFunction) => {
    if (!cfg.enabled) return res.status(404).json({ error: 'El agente local está desactivado (LOCAL_AGENT=1 para activarlo).' });
    const remote = req.socket.remoteAddress || '';
    const hostName = String(req.headers.host || '').replace(/:\d+$/, '');
    if (!LOOPBACK.has(remote) || !LOCAL_HOSTS.has(hostName)) return res.status(403).json({ error: 'Solo se permite desde esta misma máquina.' });
    if (req.headers['sec-fetch-site'] !== 'same-origin') return res.status(403).json({ error: 'Solo se permite desde la propia aplicación (mismo origen).' });
    const origin = req.headers.origin;
    if (origin && new URL(String(origin)).host !== req.headers.host) return res.status(403).json({ error: 'Origen no permitido.' });
    next();
  });

  router.get('/session', (_req, res) => res.json({ token }));

  // Barrier 2: per-session token on everything else.
  router.use((req: Request, res: Response, next: NextFunction) => {
    const given = String(req.headers['x-agent-token'] || '');
    if (!given || !safeEqual(given, token)) return res.status(401).json({ error: 'Token de sesión inválido. Recarga la aplicación.' });
    next();
  });

  async function statusOf(id: AgentId) {
    const cached = statusCache.get(id);
    if (cached && Date.now() - cached.at < 30_000) return cached.value;
    const def = cfg.agents[id];
    let value: any = { id, label: def.label, installed: !!def.bin, loggedIn: false, command: previewCommand(def) };
    if (def.bin) {
      const r = await runCli(cfg, def, def.statusArgs, null, 15_000);
      value = { ...value, loggedIn: def.isLoggedIn(r.exitCode ?? -1, r.output) };
    }
    statusCache.set(id, { at: Date.now(), value });
    return value;
  }

  router.get('/status', async (_req, res) => {
    res.json({ agents: [await statusOf('claude'), await statusOf('codex')] });
  });

  // Step 1: validate and build the exact text; nothing runs yet.
  router.post('/propose', async (req: Request, res: Response) => {
    const { agent: rawAgent, prompt, context, files, crossContext } = req.body || {};
    if (rawAgent !== 'claude' && rawAgent !== 'codex') return res.status(400).json({ error: 'Agente no permitido.' });
    const agent: AgentId = rawAgent;
    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'El campo "prompt" es requerido.' });
    if (prompt.length > cfg.maxPromptChars) return res.status(400).json({ error: `El prompt excede ${cfg.maxPromptChars} caracteres.` });

    const st = await statusOf(agent);
    if (!st.installed) return res.status(409).json({ error: `${cfg.agents[agent].label}: no está instalado o no se encontró.` });
    if (!st.loggedIn) return res.status(409).json({ error: `${cfg.agents[agent].label}: no hay sesión iniciada. Inicia sesión tú en esa CLI.` });

    const included: string[] = [];
    const fileText = (Array.isArray(files) ? files : [])
      .filter((f: any) => f && f.includedInContext && !isSensitiveFile(String(f.name || ''), f.isText ? String(f.content || '') : ''))
      .map((f: any) => { included.push(String(f.name || 'documento')); return `[Archivo: ${String(f.name || 'documento')}]\n${f.isText ? String(f.content || '').slice(0, 4000) : '[Binario]'}`; })
      .join('\n\n');
    const text = `${context ? `CONTEXTO DEL PROYECTO:\n${String(context).slice(0, 6000)}\n\n` : ''}${fileText ? `ARCHIVOS:\n${fileText}\n\n` : ''}${crossContext ? `APORTES DE OTROS AGENTES:\n${String(crossContext).slice(0, 4000)}\n\n` : ''}SOLICITUD:\n${prompt}`;

    for (const [k, v] of pending) if (v.expiresAt < Date.now()) pending.delete(k);
    const requestId = randomBytes(12).toString('hex');
    pending.set(requestId, { agent, text, expiresAt: Date.now() + cfg.pendingTtlMs });
    res.json({ requestId, agent, label: cfg.agents[agent].label, command: previewCommand(cfg.agents[agent]), promptChars: text.length, filesIncluded: included, expiresInSec: Math.round(cfg.pendingTtlMs / 1000) });
  });

  // Step 2 (barrier 4): runs only what was proposed, once, after the user's explicit confirmation in the UI.
  router.post('/confirm', async (req: Request, res: Response) => {
    const { requestId } = req.body || {};
    const item = typeof requestId === 'string' ? pending.get(requestId) : undefined;
    if (!item || item.expiresAt < Date.now()) { pending.delete(String(requestId)); return res.status(404).json({ error: 'Solicitud no encontrada o vencida. Vuelve a proponerla.' }); }
    if (busy) return res.status(409).json({ error: 'Ya hay una ejecución en curso.' });
    if (Date.now() - lastRunAt < cfg.minIntervalMs) return res.status(429).json({ error: 'Demasiado rápido: espera unos segundos.' });
    pending.delete(requestId);

    busy = true;
    lastRunAt = Date.now();
    const def = cfg.agents[item.agent];
    try {
      const r = await runCli(cfg, def, def.chatArgs, item.text, cfg.timeoutMs);
      if (cfg.auditLogPath) {
        try {
          fs.mkdirSync(path.dirname(cfg.auditLogPath), { recursive: true });
          fs.appendFileSync(cfg.auditLogPath, `${new Date().toISOString()} agent=${item.agent} promptChars=${item.text.length} exit=${r.exitCode} ms=${r.durationMs} timedOut=${r.timedOut}\n`);
        } catch { /* audit is best effort */ }
      }
      if (r.timedOut) return res.status(504).json({ error: `${def.label}: tiempo agotado (${Math.round(cfg.timeoutMs / 1000)} s).` });
      if (r.exitCode !== 0 && !r.truncated) return res.status(502).json({ error: `${def.label}: terminó con error (código ${r.exitCode}).`, detail: r.output.slice(0, 300) });
      res.json({ agent: item.agent, label: def.label, text: r.output.trim(), truncated: r.truncated, durationMs: r.durationMs });
    } finally {
      busy = false;
    }
  });

  return router;
}
