# Nexus Multi-IA Studio

Estudio multi-IA en espanol (React 19 + Vite + Tailwind 4 + Express + `@google/genai`). Origen: app de Google AI Studio.
Leer `CLAUDE.md` (reglas y estado) y `docs/DIAGNOSTICO_2026-10-21.md` (plan de mejoras).

## Requisitos
Node 22+ (en este equipo: el portable de `W:\PROYECTOS CUENTA ALEJANDROG45\herramientas-portables\nodejs-portable`).

## Uso
```
npm ci
copy .env.example .env.local     # y poner GEMINI_API_KEY (solo en el servidor; .env* esta ignorado por git)
npm run dev                      # desarrollo (Vite + servidor)
npm run build && npm start       # produccion: sirve dist/
npm run lint                     # tsc --noEmit
npm test                         # unitarias + integracion (Gemini falso) + E2E (Chromium headless)
```
En W: usar `npm ... --cache "W:\PROYECTOS CUENTA ALEJANDROG45\herramientas-portables\npm-cache-nexus"` (el npm portable apunta por defecto a `E:\npm-cache`).

## Agente local (Claude Code y Codex con tu propia suscripcion)
Apagado por defecto. Para activarlo: `LOCAL_AGENT=1 npm start` y haber iniciado sesion TU en cada CLI (`claude auth login`, `codex login`). La tarjeta de Claude o ChatGPT solo aparece conectada si la CLI esta instalada y con sesion.
- Barreras: solo desde esta maquina y la propia app (mismo origen), token por sesion, comandos fijos (`claude -p --tools ""`, `codex exec --sandbox read-only`), el texto va por stdin, carpeta de trabajo vacia (`.local/agent-scratch`), sin claves del servidor en el entorno de la CLI, y una confirmacion con el comando exacto antes de CADA ejecucion.
- Limites: 1 a la vez, 3 s entre ejecuciones, 120 s, 200 KB. Auditoria sin contenido en `.local/agent-audit.log`.
- Terminos: uso personal y manual. Anthropic no permite ofrecer el login de Claude.ai a terceros ni enrutar credenciales de suscripcion; este agente solo invoca tu CLI oficial sin modificarla y no guarda ni reenvia tokens.

## Cuota gratuita de Gemini
~20 solicitudes/dia por modelo. El servidor rota entre `GEMINI_MODELS`, cuenta el uso diario (`GET /api/quota`), bloquea modelos con 429 y cachea respuestas identicas.

## Estructura
`src/` interfaz y servicios del cliente · `server.ts` API + estatico · `server/` logica de cuota y cache · `test/` pruebas · `docs/` diagnostico y estado · `obsoletos/` (al cerrar) lo que ya no es parte del flujo.
