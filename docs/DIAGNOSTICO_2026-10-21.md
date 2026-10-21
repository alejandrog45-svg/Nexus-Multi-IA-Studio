# Diagnostico 2026-10-21 (hallazgos originales; mejoras #1-#5, #7, #8 ya implementadas: ver CLAUDE.md)

Base: commit `c09d883`. Todo lo marcado VERIFICADO se abrio en esa sesion. Nada se ejecuto contra Gemini (cuota).

## Build
- `npm run lint` (tsc --noEmit): exit 0.
- `npm install` con el package.json tal cual: **falla ERESOLVE** (`esbuild ^0.25` vs peer opcional de vite 8 `^0.27 || ^0.28`). Con `--legacy-peer-deps` instala, pero `npm run build` falla: no se instala `react-is` (peer de recharts; bun lo instala solo). Con `npm i react-is --no-save` el build da exit 0 (782 kB JS, aviso de chunk grande).

## REAL / SIMULADO / DECORATIVO / MUERTO
| Estado | Archivo:lineas | Evidencia literal | Nota |
|---|---|---|---|
| REAL (codigo; sin ejecutar) | server.ts:171-267 | `ai.models.generateContent({ model, contents })` | /api/chat; backoff + fallback de modelo |
| REAL (codigo; NO probado en ejecucion) | server.ts:270-376 | `ai.models.generateContentStream({` | /api/stream SSE; sin verificar |
| REAL | server.ts:21-40, 74-124 | `record.count > 45` / `ConcurrencySemaphore(2)` | limite por IP y semaforo |
| REAL | vite.config.ts:6-21 | (no hay `define` de la clave) | la clave solo la lee server.ts:174 |
| REAL | storage.ts:19-114 | `window.indexedDB.open(DB_NAME, DB_VERSION)` | IndexedDB + respaldo JSON; sin probar en navegador |
| REAL | CodeSandboxModal.tsx:88,204 | `new Function('console','log', event.data.code)` / `sandbox="allow-scripts"` | ejecuta codigo dentro de iframe aislado |
| REAL (parcial) | FileManager.tsx:46 | `showDirectoryPicker({ mode: 'readwrite' })` | solo lee; ver DECORATIVO |
| SIMULADO/aprox. | aiOrchestrator.ts:182-184 | `Math.round(prompt.length / 4)` | tokens del SSE estimados, no reales |
| INEXACTO | aiOrchestrator.ts:181 vs server.ts:127 | `'gemini-3.5-flash (SSE)'` vs `PRIMARY_MODEL = 'gemini-3.1-flash-lite'` | la metrica rotula un modelo distinto al usado |
| SIMULADO (gancho de prueba en prod) | server.ts:185-193, 279-285 | `simulateQuotaError === true \|\| req.headers['x-simulate-quota']` | cualquiera puede forzar un 429 falso |
| DECORATIVO | imageStudioEngine.ts:43-48 | `return { available: false, reason: ... }` | no comprueba nada: valor fijo (honesto, pero no es un chequeo) |
| DECORATIVO | FileManager.tsx:33 | `useState<any>(null)` (`localFolderHandle`) | pide permiso `readwrite`, nunca escribe (sin `createWritable`) |
| DECORATIVO | SubscriberAccountModal.tsx:46 / server.ts:131-139 | `'Verificado ahora via /api/health'` | /health solo mira si hay clave, no llama a Gemini |
| MANUAL (no es integracion) | App.tsx:54-104 | `planName: 'Modo Asistido / Web'` | ChatGPT, Claude y Meta: copiar y pegar a mano |
| MUERTO | aiOrchestrator.ts:124 vs server.ts:183 | `history: previousHistory.slice(-6)` | el servidor no lee `history` |
| MUERTO | aiOrchestrator.ts (cliente) | nunca envia `model` | `model` del servidor siempre = PRIMARY; fallback solo ante error |
| INFRA | server.ts:379-385 | `createViteServer({ server: { middlewareMode: true` | `npm start` siempre corre Vite dev; no sirve `dist/` |

No abierto (no verificado): App.tsx completo (solo greps), demas modales, `test_http_stream.js` (excluido a proposito).

## Riesgos de seguridad
1. Privacidad: `FileManager.tsx:93-94` acepta `.env`, `.sql`, `.sh` por subida manual y `server.ts:212` reenvia hasta 4000 caracteres a Gemini si estan "en contexto".
2. `server.ts:22`: el limite por IP confia en `X-Forwarded-For` (falsificable).
3. `server.ts:43-72`: peticiones sin cabecera Origin pasan el filtro CORS (curl, scripts).
4. Gancho `simulateQuotaError` activo en cualquier entorno.
5. Sandbox: `postMessage(..., '*')` (CodeSandboxModal.tsx:40), listener sin comprobar `event.source`, carga `cdn.tailwindcss.com` y el codigo ejecutado puede hacer `fetch` (sin CSP).
6. Cualquier agente local que ejecute comandos (CLIs) exigiria: token por sesion, validacion de origen, lista blanca de comandos, confirmacion del usuario por accion y bind solo a 127.0.0.1.
7. Repo publico: nunca subir `.env`; `.gitignore` ya lo cubre (`.env*`, `!.env.example`).

## Plan de mejoras propuesto (una funcion por prompt, costo cero; esperan aprobacion)
| # | Mejora | Toca | Riesgo | Esfuerzo | Criterio de aceptacion |
|---|---|---|---|---|---|
| 1 | Instalacion/build reproducible | package.json (+lockfile) | bajo | bajo | `npm ci`, `lint` y `build` exit 0 en limpio; nombre del paquete correcto |
| 2 | Servir `dist/` en produccion | server.ts (rama NODE_ENV), scripts | bajo | bajo | `npm run build && npm start` sirve la app sin Vite dev |
| 3 | Cuota: rotacion de modelos + cache + contador diario | server.ts, aiOrchestrator.ts | medio | medio | mismo prompt 2 veces = 1 sola llamada; al 429 cambia de modelo; contador visible |
| 4 | Verificar /api/stream de verdad (1 sola peticion) y quitar el gancho de prueba | server.ts | bajo | bajo | chunks SSE llegan al cliente; sin `x-simulate-quota` fuera de dev |
| 5 | Metricas exactas y modelo real mostrado | aiOrchestrator.ts | bajo | bajo | modelo mostrado = `modelUsed`; tokens de `usageMetadata` |
| 6 | Proveedor gratis de apoyo (Groq/OpenRouter) rotulado con su nombre real | server.ts, .env.example | medio (claves, terminos) | medio | respuesta de Llama/otro etiquetada con su proveedor; sin clave en cliente |
| 7 | Probar persistencia IndexedDB y File System Access (Playwright de W:) | tests nuevos | bajo | medio | recargar conserva estado; respaldo JSON se restaura |
| 8 | Filtro de archivos sensibles antes de enviar a Gemini | FileManager.tsx, server.ts | bajo | bajo | `.env`/claves nunca llegan a `/api/*` |
| 9 | Ollama local (hoy NO instalado) | instalacion + server.ts | medio (descarga, RAM) | medio | modelo local responde sin internet |
| 10 | Agente local para CLIs (claude/codex) | modulo nuevo, solo 127.0.0.1 | **alto** | alto | cumple las 4 medidas del riesgo 6 |
| 11 | Imagen real | por investigar | depende de cuota | alto | no prometer hasta confirmar un proveedor gratuito |
